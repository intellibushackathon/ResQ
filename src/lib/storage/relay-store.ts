import { getDb, RELAY_QUEUE_STORE, GATEWAY_INBOX_STORE } from "./db";
import type { RelayEnvelope, GatewayReceivedRelay } from "../types/incident";

// ---------------------------------------------------------------------------
// Relay queue operations
// ---------------------------------------------------------------------------

export async function enqueueRelay(envelope: RelayEnvelope): Promise<void> {
  const db = await getDb();
  await db.put(RELAY_QUEUE_STORE, envelope);
}

export async function getRelayEnvelope(id: string): Promise<RelayEnvelope | undefined> {
  const db = await getDb();
  return db.get(RELAY_QUEUE_STORE, id);
}

export async function getAllRelayEnvelopes(): Promise<RelayEnvelope[]> {
  const db = await getDb();
  return db.getAll(RELAY_QUEUE_STORE);
}

export async function deleteRelayEnvelope(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(RELAY_QUEUE_STORE, id);
}

/**
 * Dequeue a batch of envelopes that are still queued and not expired.
 */
export async function dequeueRelayBatch(limit: number): Promise<RelayEnvelope[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex(RELAY_QUEUE_STORE, "by-deliveryStatus", "queued");
  const now = new Date().toISOString();

  const valid = all.filter(
    (env) => env.ttlExpiresAt > now && env.hopCount < env.maxHops,
  );

  return valid.slice(0, limit);
}

/**
 * Mark a relay envelope as delivered to a peer or gateway.
 */
export async function markRelayDelivered(
  id: string,
  status: "sent" | "received" | "forwarded" = "sent",
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(RELAY_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(RELAY_QUEUE_STORE);
  const envelope = await store.get(id);

  if (envelope) {
    const updated: RelayEnvelope = {
      ...envelope,
      deliveryStatus: status,
    };
    await store.put(updated);
  }

  await tx.done;
}

/**
 * Mark a relay envelope as failed.
 */
export async function markRelayFailed(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(RELAY_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(RELAY_QUEUE_STORE);
  const envelope = await store.get(id);

  if (envelope) {
    const updated: RelayEnvelope = {
      ...envelope,
      deliveryStatus: "failed",
    };
    await store.put(updated);
  }

  await tx.done;
}

/**
 * Remove expired relay envelopes from the queue.
 * Returns the number of pruned envelopes.
 */
export async function pruneExpiredRelays(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll(RELAY_QUEUE_STORE);
  const now = new Date().toISOString();
  let pruned = 0;

  const tx = db.transaction(RELAY_QUEUE_STORE, "readwrite");
  const store = tx.objectStore(RELAY_QUEUE_STORE);

  for (const envelope of all) {
    if (envelope.ttlExpiresAt <= now) {
      await store.delete(envelope.id);
      pruned++;
    }
  }

  await tx.done;
  return pruned;
}

/**
 * Check if a relay envelope with the given ID already exists (duplicate suppression).
 */
export async function isDuplicateRelay(envelopeId: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.get(RELAY_QUEUE_STORE, envelopeId);
  if (existing) return true;

  // Also check gateway inbox
  const receipt = await db.get(GATEWAY_INBOX_STORE, envelopeId);
  return Boolean(receipt);
}

// ---------------------------------------------------------------------------
// Gateway inbox operations
// ---------------------------------------------------------------------------

export async function addGatewayReceipt(receipt: GatewayReceivedRelay): Promise<void> {
  const db = await getDb();
  await db.put(GATEWAY_INBOX_STORE, receipt);
}

export async function getGatewayReceipt(id: string): Promise<GatewayReceivedRelay | undefined> {
  const db = await getDb();
  return db.get(GATEWAY_INBOX_STORE, id);
}

export async function getAllGatewayReceipts(): Promise<GatewayReceivedRelay[]> {
  const db = await getDb();
  return db.getAll(GATEWAY_INBOX_STORE);
}

/**
 * Get receipts that haven't been forwarded to the backend yet.
 */
export async function getUnforwardedReceipts(): Promise<GatewayReceivedRelay[]> {
  const db = await getDb();
  const all = await db.getAll(GATEWAY_INBOX_STORE);
  return all.filter((receipt) => !receipt.forwardedToBackend);
}

/**
 * Mark a gateway receipt as forwarded to the backend.
 */
export async function markReceiptForwarded(
  gatewayReceiptId: string,
  forwardedAt: string = new Date().toISOString(),
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(GATEWAY_INBOX_STORE, "readwrite");
  const store = tx.objectStore(GATEWAY_INBOX_STORE);
  const receipt = await store.get(gatewayReceiptId);

  if (receipt) {
    const updated: GatewayReceivedRelay = {
      ...receipt,
      forwardedToBackend: true,
      forwardedAt,
      forwardError: null,
    };
    await store.put(updated);
  }

  await tx.done;
}

/**
 * Mark a gateway receipt forward as failed.
 */
export async function markReceiptForwardFailed(
  gatewayReceiptId: string,
  error: string,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(GATEWAY_INBOX_STORE, "readwrite");
  const store = tx.objectStore(GATEWAY_INBOX_STORE);
  const receipt = await store.get(gatewayReceiptId);

  if (receipt) {
    const updated: GatewayReceivedRelay = {
      ...receipt,
      forwardError: error,
    };
    await store.put(updated);
  }

  await tx.done;
}
