import { getDb, INCIDENTS_STORE } from "./db";
import type {
  LocalIncidentReport,
  ReportStatus,
  SyncStatus,
  RelayStatus,
  SourceChannel,
} from "../types/incident";

// ---------------------------------------------------------------------------
// CRUD operations for incidents in IndexedDB
// ---------------------------------------------------------------------------

export async function putIncident(report: LocalIncidentReport): Promise<void> {
  const db = await getDb();
  await db.put(INCIDENTS_STORE, report);
}

export async function getIncident(id: string): Promise<LocalIncidentReport | undefined> {
  const db = await getDb();
  return db.get(INCIDENTS_STORE, id);
}

export async function getAllIncidents(): Promise<LocalIncidentReport[]> {
  const db = await getDb();
  return db.getAll(INCIDENTS_STORE);
}

export async function deleteIncident(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(INCIDENTS_STORE, id);
}

// ---------------------------------------------------------------------------
// Index-based queries
// ---------------------------------------------------------------------------

export async function getIncidentsBySyncStatus(status: SyncStatus): Promise<LocalIncidentReport[]> {
  const db = await getDb();
  return db.getAllFromIndex(INCIDENTS_STORE, "by-syncStatus", status);
}

export async function getIncidentsByRelayStatus(status: RelayStatus): Promise<LocalIncidentReport[]> {
  const db = await getDb();
  return db.getAllFromIndex(INCIDENTS_STORE, "by-relayStatus", status);
}

export async function getIncidentsByReportStatus(status: ReportStatus): Promise<LocalIncidentReport[]> {
  const db = await getDb();
  return db.getAllFromIndex(INCIDENTS_STORE, "by-reportStatus", status);
}

export async function getIncidentsBySourceChannel(channel: SourceChannel): Promise<LocalIncidentReport[]> {
  const db = await getDb();
  return db.getAllFromIndex(INCIDENTS_STORE, "by-sourceChannel", channel);
}

// ---------------------------------------------------------------------------
// Partial update helper
// ---------------------------------------------------------------------------

export async function updateIncidentFields(
  id: string,
  fields: Partial<LocalIncidentReport>,
): Promise<LocalIncidentReport | undefined> {
  const db = await getDb();
  const tx = db.transaction(INCIDENTS_STORE, "readwrite");
  const store = tx.objectStore(INCIDENTS_STORE);

  const existing = await store.get(id);
  if (!existing) {
    await tx.done;
    return undefined;
  }

  const updated: LocalIncidentReport = {
    ...existing,
    ...fields,
    id: existing.id, // Never overwrite the primary key
    updatedAt: new Date().toISOString(),
  };

  await store.put(updated);
  await tx.done;

  return updated;
}

// ---------------------------------------------------------------------------
// Bulk operations
// ---------------------------------------------------------------------------

export async function putIncidents(reports: LocalIncidentReport[]): Promise<void> {
  if (reports.length === 0) return;

  const db = await getDb();
  const tx = db.transaction(INCIDENTS_STORE, "readwrite");
  const store = tx.objectStore(INCIDENTS_STORE);

  for (const report of reports) {
    await store.put(report);
  }

  await tx.done;
}

export async function getIncidentCount(): Promise<number> {
  const db = await getDb();
  return db.count(INCIDENTS_STORE);
}

// ---------------------------------------------------------------------------
// Convenience queries for sync engine
// ---------------------------------------------------------------------------

export async function getLocalOnlyIncidents(): Promise<LocalIncidentReport[]> {
  return getIncidentsBySyncStatus("local_only");
}

export async function getPendingCloudIncidents(): Promise<LocalIncidentReport[]> {
  return getIncidentsBySyncStatus("pending_cloud");
}

export async function getSyncFailedIncidents(): Promise<LocalIncidentReport[]> {
  return getIncidentsBySyncStatus("sync_failed");
}

export async function getPendingRelayIncidents(): Promise<LocalIncidentReport[]> {
  return getIncidentsBySyncStatus("pending_relay");
}

export async function getRelayFailedIncidents(): Promise<LocalIncidentReport[]> {
  return getIncidentsByRelayStatus("relay_failed");
}
