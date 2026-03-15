import { openDB, type IDBPDatabase } from "idb";
import type {
  LocalIncidentReport,
  LocalPhotoAsset,
  RelayEnvelope,
  GatewayReceivedRelay,
} from "../types/incident";

// ---------------------------------------------------------------------------
// Database name and version
// ---------------------------------------------------------------------------

const DB_NAME = "resq-offline";
const DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Store names (exported for use by individual store modules)
// ---------------------------------------------------------------------------

export const INCIDENTS_STORE = "incidents";
export const PHOTOS_STORE = "photos";
export const PHOTO_BLOBS_STORE = "photo_blobs";
export const RELAY_QUEUE_STORE = "relay_queue";
export const GATEWAY_INBOX_STORE = "gateway_inbox";
export const GEOCODE_CACHE_STORE = "geocode_cache";
export const SYNC_METADATA_STORE = "sync_metadata";
export const RESPONDER_UPDATES_STORE = "responder_updates";

// ---------------------------------------------------------------------------
// Types for stores that don't have their own dedicated type
// ---------------------------------------------------------------------------

export type CachedGeocode = {
  cacheKey: string;
  label: string;
  parish: string | null;
  source: "nominatim" | "fallback";
  resolvedAt: string;
  lat: number;
  lng: number;
};

export type SyncMetadataEntry = {
  key: string;
  value: string;
};

export type ResponderUpdate = {
  id: string;
  reportId: string;
  type: "acknowledge" | "status_change" | "field_note" | "progression_update";
  payload: Record<string, unknown>;
  createdAt: string;
  syncedAt: string | null;
};

// ---------------------------------------------------------------------------
// Database schema definition
// ---------------------------------------------------------------------------

export type ResQDB = {
  [INCIDENTS_STORE]: {
    key: string;
    value: LocalIncidentReport;
    indexes: {
      "by-syncStatus": string;
      "by-relayStatus": string;
      "by-reportStatus": string;
      "by-createdAt": string;
      "by-sourceChannel": string;
    };
  };
  [PHOTOS_STORE]: {
    key: string;
    value: LocalPhotoAsset;
    indexes: {
      "by-reportId": string;
      "by-createdAt": string;
    };
  };
  [PHOTO_BLOBS_STORE]: {
    key: string;
    value: { id: string; blob: Blob };
  };
  [RELAY_QUEUE_STORE]: {
    key: string;
    value: RelayEnvelope;
    indexes: {
      "by-ttlExpiresAt": string;
      "by-deliveryStatus": string;
    };
  };
  [GATEWAY_INBOX_STORE]: {
    key: string;
    value: GatewayReceivedRelay;
    indexes: {
      "by-forwardedToBackend": string;
    };
  };
  [GEOCODE_CACHE_STORE]: {
    key: string;
    value: CachedGeocode;
    indexes: {
      "by-resolvedAt": string;
    };
  };
  [SYNC_METADATA_STORE]: {
    key: string;
    value: SyncMetadataEntry;
  };
  [RESPONDER_UPDATES_STORE]: {
    key: string;
    value: ResponderUpdate;
    indexes: {
      "by-reportId": string;
      "by-syncedAt": string;
    };
  };
};

// ---------------------------------------------------------------------------
// Singleton database instance
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase<ResQDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<ResQDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ResQDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Incidents store
        if (!db.objectStoreNames.contains(INCIDENTS_STORE)) {
          const incidentStore = db.createObjectStore(INCIDENTS_STORE, { keyPath: "id" });
          incidentStore.createIndex("by-syncStatus", "syncStatus");
          incidentStore.createIndex("by-relayStatus", "relayStatus");
          incidentStore.createIndex("by-reportStatus", "reportStatus");
          incidentStore.createIndex("by-createdAt", "createdAt");
          incidentStore.createIndex("by-sourceChannel", "sourceChannel");
        }

        // Photos metadata store
        if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
          const photoStore = db.createObjectStore(PHOTOS_STORE, { keyPath: "id" });
          photoStore.createIndex("by-reportId", "reportId");
          photoStore.createIndex("by-createdAt", "createdAt");
        }

        // Photo blobs store (raw binary)
        if (!db.objectStoreNames.contains(PHOTO_BLOBS_STORE)) {
          db.createObjectStore(PHOTO_BLOBS_STORE, { keyPath: "id" });
        }

        // Relay queue store
        if (!db.objectStoreNames.contains(RELAY_QUEUE_STORE)) {
          const relayStore = db.createObjectStore(RELAY_QUEUE_STORE, { keyPath: "id" });
          relayStore.createIndex("by-ttlExpiresAt", "ttlExpiresAt");
          relayStore.createIndex("by-deliveryStatus", "deliveryStatus");
        }

        // Gateway inbox store
        if (!db.objectStoreNames.contains(GATEWAY_INBOX_STORE)) {
          const gatewayStore = db.createObjectStore(GATEWAY_INBOX_STORE, { keyPath: "gatewayReceiptId" });
          gatewayStore.createIndex("by-forwardedToBackend", "forwardedToBackend");
        }

        // Geocode cache store
        if (!db.objectStoreNames.contains(GEOCODE_CACHE_STORE)) {
          const geocodeStore = db.createObjectStore(GEOCODE_CACHE_STORE, { keyPath: "cacheKey" });
          geocodeStore.createIndex("by-resolvedAt", "resolvedAt");
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(SYNC_METADATA_STORE)) {
          db.createObjectStore(SYNC_METADATA_STORE, { keyPath: "key" });
        }

        // Responder updates store
        if (!db.objectStoreNames.contains(RESPONDER_UPDATES_STORE)) {
          const responderStore = db.createObjectStore(RESPONDER_UPDATES_STORE, { keyPath: "id" });
          responderStore.createIndex("by-reportId", "reportId");
          responderStore.createIndex("by-syncedAt", "syncedAt");
        }
      },
    });
  }

  return dbPromise;
}

// ---------------------------------------------------------------------------
// Migration from localStorage → IndexedDB
// ---------------------------------------------------------------------------

export async function migrateFromLocalStorage(): Promise<{ migratedCount: number }> {
  const LEGACY_STORE_KEY = "resq-report-store";
  const raw = localStorage.getItem(LEGACY_STORE_KEY);

  if (!raw) {
    return { migratedCount: 0 };
  }

  let parsed: { state?: { offlineQueue?: unknown[] } } | null = null;
  try {
    parsed = JSON.parse(raw) as { state?: { offlineQueue?: unknown[] } };
  } catch {
    return { migratedCount: 0 };
  }

  const queue = parsed?.state?.offlineQueue;
  if (!Array.isArray(queue) || queue.length === 0) {
    return { migratedCount: 0 };
  }

  // Dynamically import the migration adapter to avoid circular deps
  const { legacyDraftToLocal } = await import("../types/migration");
  const { getOrCreateDeviceId } = await import("../relay/device-identity");
  const deviceId = await getOrCreateDeviceId();

  const db = await getDb();
  const tx = db.transaction([INCIDENTS_STORE, PHOTO_BLOBS_STORE], "readwrite");
  const incidentStore = tx.objectStore(INCIDENTS_STORE);
  const blobStore = tx.objectStore(PHOTO_BLOBS_STORE);

  let migratedCount = 0;

  for (const draft of queue) {
    try {
      const typedDraft = draft as {
        id: string;
        imageDataUrl?: string | null;
        imageName?: string;
        imageType?: string;
        damageType: string;
        description: string;
        lat: number;
        lng: number;
        locationName: string;
        urgentAssist: boolean;
        timestamp: string;
        submittedBy?: string | null;
        ai: unknown;
      };

      const report = legacyDraftToLocal(typedDraft as Parameters<typeof legacyDraftToLocal>[0], deviceId);

      // Migrate image data URL to blob storage
      if (typedDraft.imageDataUrl && typedDraft.imageDataUrl.startsWith("data:")) {
        const blobKey = `legacy-photo-${report.id}`;
        const blob = dataUrlToBlob(typedDraft.imageDataUrl, typedDraft.imageType || "image/jpeg");
        await blobStore.put({ id: blobKey, blob });

        report.media = {
          photos: [
            {
              id: `photo-${report.id}`,
              reportId: report.id,
              localKey: blobKey,
              mimeType: typedDraft.imageType || "image/jpeg",
              fileName: typedDraft.imageName || null,
              originalSizeBytes: blob.size,
              compressedSizeBytes: null,
              thumbnailKey: null,
              previewKey: null,
              width: null,
              height: null,
              createdAt: report.createdAt,
            },
          ],
          hasPhoto: true,
        };
      }

      await incidentStore.put(report);
      migratedCount++;
    } catch (err) {
      console.warn("Failed to migrate legacy draft to IndexedDB:", err);
    }
  }

  await tx.done;

  // Clear the offline queue from localStorage after successful migration
  // Keep adminSettings intact
  if (migratedCount > 0) {
    try {
      const currentData = JSON.parse(raw) as { state?: { offlineQueue?: unknown[]; adminSettings?: unknown } };
      if (currentData?.state) {
        currentData.state.offlineQueue = [];
        localStorage.setItem(LEGACY_STORE_KEY, JSON.stringify(currentData));
      }
    } catch {
      // If we can't update localStorage, that's okay - the data is in IDB now
    }
  }

  return { migratedCount };
}

// ---------------------------------------------------------------------------
// Utility: convert data URL to Blob
// ---------------------------------------------------------------------------

function dataUrlToBlob(dataUrl: string, mimeType: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length < 2) {
    return new Blob([], { type: mimeType });
  }

  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

// ---------------------------------------------------------------------------
// Close / reset (for testing)
// ---------------------------------------------------------------------------

export async function closeDb(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
}
