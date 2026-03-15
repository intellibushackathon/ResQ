import type { RelayEnvelope, GatewayReceivedRelay } from "../types/incident";
import { generateId } from "../types/incident";
import {
  dequeueRelayBatch,
  enqueueRelay,
  isDuplicateRelay,
  markRelayDelivered,
  markRelayFailed,
  pruneExpiredRelays,
  addGatewayReceipt,
} from "../storage/relay-store";
import { updateIncidentFields } from "../storage/incident-store";
import { getOrCreateDeviceId } from "./device-identity";
import {
  isBluetoothSupported,
  scanForPeers,
  sendEnvelope,
} from "./bluetooth-service";
import {
  incrementHop,
  isEnvelopeExpired,
  hasReachedMaxHops,
  hasVisitedDevice,
  markDeliveredToGateway,
} from "./payload";
import { isOnline } from "../sync/connectivity";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RELAY_BATCH_SIZE = 10;
const RELAY_INTERVAL_MS = 30000; // 30 seconds between relay attempts

// ---------------------------------------------------------------------------
// Relay lifecycle manager
// ---------------------------------------------------------------------------

let relayIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the periodic relay manager.
 * Scans for peers and attempts to forward queued envelopes.
 */
export function startRelayManager(): void {
  if (relayIntervalId) return;

  relayIntervalId = setInterval(() => {
    void attemptRelay();
  }, RELAY_INTERVAL_MS);

  // Run immediately on start
  void attemptRelay();
}

export function stopRelayManager(): void {
  if (relayIntervalId) {
    clearInterval(relayIntervalId);
    relayIntervalId = null;
  }
}

/**
 * Attempt to relay queued envelopes to nearby peers.
 *
 * Lifecycle:
 * 1. Prune expired envelopes
 * 2. Dequeue a batch of valid envelopes
 * 3. If this device is a gateway (online), forward to backend
 * 4. Otherwise, scan for peers and transfer
 */
export async function attemptRelay(): Promise<{
  pruned: number;
  relayed: number;
  failed: number;
  gatewayForwarded: number;
}> {
  let pruned = 0;
  let relayed = 0;
  let failed = 0;
  let gatewayForwarded = 0;

  try {
    // Step 1: Prune expired envelopes
    pruned = await pruneExpiredRelays();

    // Step 2: Dequeue batch
    const batch = await dequeueRelayBatch(RELAY_BATCH_SIZE);
    if (batch.length === 0) {
      return { pruned, relayed, failed, gatewayForwarded };
    }

    // Step 3: Check if this device is a gateway
    if (isGateway()) {
      for (const envelope of batch) {
        try {
          await forwardToGatewayInbox(envelope);
          await markRelayDelivered(envelope.id, "forwarded");
          gatewayForwarded++;
        } catch {
          await markRelayFailed(envelope.id);
          failed++;
        }
      }
      return { pruned, relayed, failed, gatewayForwarded };
    }

    // Step 4: Try Bluetooth relay
    if (!isBluetoothSupported()) {
      // No Bluetooth available, envelopes stay queued for later
      return { pruned, relayed, failed, gatewayForwarded };
    }

    const peers = await scanForPeers();
    if (peers.length === 0) {
      return { pruned, relayed, failed, gatewayForwarded };
    }

    const deviceId = await getOrCreateDeviceId();

    for (const envelope of batch) {
      if (isEnvelopeExpired(envelope) || hasReachedMaxHops(envelope)) {
        await markRelayFailed(envelope.id);
        failed++;
        continue;
      }

      for (const peer of peers) {
        try {
          const hopped = incrementHop(envelope, deviceId);
          const success = await sendEnvelope(peer, hopped);

          if (success) {
            await markRelayDelivered(envelope.id, "sent");
            relayed++;

            // Update the report's relay status
            await updateIncidentFields(envelope.payload.reportId, {
              relayStatus: "relayed",
              lastRelayAttemptAt: new Date().toISOString(),
            });

            break; // Successfully sent to one peer, move to next envelope
          }
        } catch {
          // Try next peer
        }
      }
    }
  } catch (err) {
    console.warn("Relay attempt error:", err);
  }

  return { pruned, relayed, failed, gatewayForwarded };
}

/**
 * Handle a received relay envelope.
 *
 * Lifecycle:
 * 1. Check for duplicates (by envelope ID)
 * 2. If this device is a gateway: add to gateway inbox for backend forwarding
 * 3. If not a gateway: add to relay queue for further forwarding
 */
export async function receiveRelay(envelope: RelayEnvelope): Promise<{
  accepted: boolean;
  reason?: string;
}> {
  // Duplicate suppression
  const isDuplicate = await isDuplicateRelay(envelope.id);
  if (isDuplicate) {
    return { accepted: false, reason: "duplicate" };
  }

  // Check expiry
  if (isEnvelopeExpired(envelope)) {
    return { accepted: false, reason: "expired" };
  }

  // Check max hops
  if (hasReachedMaxHops(envelope)) {
    return { accepted: false, reason: "max_hops_reached" };
  }

  // Check if already visited this device
  const deviceId = await getOrCreateDeviceId();
  if (hasVisitedDevice(envelope, deviceId)) {
    return { accepted: false, reason: "already_visited" };
  }

  // Increment hop for this device
  const hopped = incrementHop(envelope, deviceId);

  if (isGateway()) {
    // This device has internet — forward to gateway inbox
    await forwardToGatewayInbox(hopped);
  } else {
    // No internet — queue for further relay
    await enqueueRelay({
      ...hopped,
      deliveryStatus: "queued",
    });
  }

  return { accepted: true };
}

/**
 * A device is a gateway if it has internet connectivity.
 * Gateways auto-forward received relays to the backend.
 */
export function isGateway(): boolean {
  return isOnline();
}

// ---------------------------------------------------------------------------
// Gateway inbox helper
// ---------------------------------------------------------------------------

async function forwardToGatewayInbox(envelope: RelayEnvelope): Promise<void> {
  const deviceId = await getOrCreateDeviceId();

  const receipt: GatewayReceivedRelay = {
    gatewayReceiptId: generateId(),
    receivedAt: new Date().toISOString(),
    gatewayDeviceId: deviceId,
    transport: "bluetooth",
    rawPayload: envelope.payload,
    forwardedToBackend: false,
    forwardedAt: null,
    forwardError: null,
  };

  await addGatewayReceipt(receipt);

  // Mark envelope as forwarded
  const forwarded = markDeliveredToGateway(envelope);
  await enqueueRelay(forwarded);
}

// ---------------------------------------------------------------------------
// Relay stats
// ---------------------------------------------------------------------------

export async function getRelayStats(): Promise<{
  queuedCount: number;
  gatewayInboxCount: number;
}> {
  const { getAllRelayEnvelopes } = await import("../storage/relay-store");
  const { getAllGatewayReceipts } = await import("../storage/relay-store");

  const envelopes = await getAllRelayEnvelopes();
  const receipts = await getAllGatewayReceipts();

  return {
    queuedCount: envelopes.filter((e) => e.deliveryStatus === "queued").length,
    gatewayInboxCount: receipts.filter((r) => !r.forwardedToBackend).length,
  };
}
