import { getDb, SYNC_METADATA_STORE } from "../storage/db";
import { generateId } from "../types/incident";

const DEVICE_ID_KEY = "device-id";

let cachedDeviceId: string | null = null;

/**
 * Get or create a persistent device ID.
 * Generated once via crypto.randomUUID() and stored permanently in IndexedDB.
 * Falls back to a timestamp-based ID if crypto.randomUUID is unavailable.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cachedDeviceId) {
    return cachedDeviceId;
  }

  const db = await getDb();
  const existing = await db.get(SYNC_METADATA_STORE, DEVICE_ID_KEY);

  if (existing?.value) {
    cachedDeviceId = existing.value;
    return existing.value;
  }

  const newId = `device-${generateId()}`;
  await db.put(SYNC_METADATA_STORE, { key: DEVICE_ID_KEY, value: newId });
  cachedDeviceId = newId;

  return newId;
}

/**
 * Get the current device ID without creating one.
 * Returns null if no device ID has been generated yet.
 */
export async function getDeviceId(): Promise<string | null> {
  if (cachedDeviceId) return cachedDeviceId;

  const db = await getDb();
  const existing = await db.get(SYNC_METADATA_STORE, DEVICE_ID_KEY);
  if (existing?.value) {
    cachedDeviceId = existing.value;
    return existing.value;
  }

  return null;
}
