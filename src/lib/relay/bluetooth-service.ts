import type { RelayEnvelope } from "../types/incident";

// ---------------------------------------------------------------------------
// GATT Service and Characteristic UUIDs for ResQ relay
// ---------------------------------------------------------------------------

// Custom UUIDs generated for ResQ (RFC 4122 v4)
export const RESQ_SERVICE_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
export const RESQ_RELAY_CHAR_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567891";
export const RESQ_DISCOVERY_CHAR_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567892";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type BluetoothRelayState =
  | "idle"
  | "scanning"
  | "connecting"
  | "transferring"
  | "listening"
  | "error"
  | "unsupported";

let currentState: BluetoothRelayState = "idle";
const stateListeners = new Set<(state: BluetoothRelayState) => void>();

function setState(next: BluetoothRelayState) {
  currentState = next;
  for (const listener of stateListeners) {
    listener(next);
  }
}

export function getBluetoothState(): BluetoothRelayState {
  return currentState;
}

export function onBluetoothStateChange(
  callback: (state: BluetoothRelayState) => void,
): () => void {
  stateListeners.add(callback);
  return () => stateListeners.delete(callback);
}

// ---------------------------------------------------------------------------
// Feature detection
// ---------------------------------------------------------------------------

export function isBluetoothSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "bluetooth" in navigator &&
    typeof navigator.bluetooth?.requestDevice === "function"
  );
}

/**
 * Check if the Web Bluetooth API is available and permissions are not denied.
 */
export async function isBluetoothAvailable(): Promise<boolean> {
  if (!isBluetoothSupported()) return false;

  try {
    const available = await navigator.bluetooth!.getAvailability();
    return available;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Scan for nearby ResQ peers
// ---------------------------------------------------------------------------

export async function scanForPeers(): Promise<BluetoothDevice[]> {
  if (!isBluetoothSupported()) {
    setState("unsupported");
    return [];
  }

  setState("scanning");

  try {
    // Web Bluetooth requires user gesture to call requestDevice.
    // In a real implementation, this would be triggered by a UI button.
    const device = await navigator.bluetooth!.requestDevice({
      filters: [{ services: [RESQ_SERVICE_UUID] }],
      optionalServices: [RESQ_SERVICE_UUID],
    });

    setState("idle");
    return device ? [device] : [];
  } catch (err) {
    console.warn("Bluetooth scan failed:", err);
    setState("error");
    return [];
  }
}

// ---------------------------------------------------------------------------
// Send a relay envelope to a connected peer
// ---------------------------------------------------------------------------

export async function sendEnvelope(
  device: BluetoothDevice,
  envelope: RelayEnvelope,
): Promise<boolean> {
  if (!device.gatt) {
    console.warn("Device has no GATT server.");
    return false;
  }

  setState("connecting");

  try {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(RESQ_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(RESQ_RELAY_CHAR_UUID);

    setState("transferring");

    // Serialize the envelope to JSON and encode as UTF-8
    const payload = JSON.stringify(envelope);
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // Web Bluetooth has a 512 byte MTU limit per write.
    // For larger payloads, we need to chunk the data.
    const chunkSize = 512;
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      const chunk = data.slice(offset, offset + chunkSize);
      await characteristic.writeValueWithResponse(chunk);
    }

    setState("idle");
    return true;
  } catch (err) {
    console.warn("Failed to send envelope via Bluetooth:", err);
    setState("error");
    return false;
  } finally {
    try {
      device.gatt?.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}

// ---------------------------------------------------------------------------
// Listen for incoming relay envelopes
// ---------------------------------------------------------------------------

let listeningAbortController: AbortController | null = null;

export async function startListening(
  onReceive: (envelope: RelayEnvelope) => void,
): Promise<void> {
  if (!isBluetoothSupported()) {
    setState("unsupported");
    return;
  }

  // Note: Web Bluetooth does not support acting as a peripheral/server
  // in most browsers. This is a forward-looking implementation that would
  // work with the Web Bluetooth Scanning API or a native companion app.
  //
  // For now, this provides the interface contract. In production, receiving
  // would be handled via:
  // 1. A native companion app that acts as a BLE peripheral
  // 2. Manual QR code / NFC transfer
  // 3. WiFi Direct or WebRTC as fallback

  setState("listening");
  listeningAbortController = new AbortController();

  console.info(
    "ResQ Bluetooth relay listener started. " +
    "Note: Full peripheral mode requires native companion app support.",
  );

  // Simulate listening state - in production this would use
  // navigator.bluetooth.addEventListener or a native bridge
}

export function stopListening(): void {
  if (listeningAbortController) {
    listeningAbortController.abort();
    listeningAbortController = null;
  }
  setState("idle");
}

// ---------------------------------------------------------------------------
// Disconnect all
// ---------------------------------------------------------------------------

export function disconnectAll(): void {
  stopListening();
  setState("idle");
}
