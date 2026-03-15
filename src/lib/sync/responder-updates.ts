import { getDb, RESPONDER_UPDATES_STORE, type ResponderUpdate } from "../storage/db";
import { generateId } from "../types/incident";
import type { IncidentProgression } from "../types/incident";
import { supabase } from "../supabase";
import { isOnline } from "./connectivity";

// ---------------------------------------------------------------------------
// Create and queue responder updates
// ---------------------------------------------------------------------------

export async function queueResponderUpdate(
  update: Omit<ResponderUpdate, "id" | "createdAt" | "syncedAt">,
): Promise<ResponderUpdate> {
  const full: ResponderUpdate = {
    ...update,
    id: generateId(),
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };

  const db = await getDb();
  await db.put(RESPONDER_UPDATES_STORE, full);

  // Attempt immediate sync if online
  if (isOnline()) {
    try {
      await syncSingleUpdate(full);
    } catch {
      // Will be retried later
    }
  }

  return full;
}

// ---------------------------------------------------------------------------
// Convenience creators
// ---------------------------------------------------------------------------

export function createAcknowledgeUpdate(reportId: string): Omit<ResponderUpdate, "id" | "createdAt" | "syncedAt"> {
  return {
    reportId,
    type: "acknowledge",
    payload: { acknowledgedAt: new Date().toISOString() },
  };
}

export function createStatusChangeUpdate(
  reportId: string,
  alertState: string,
): Omit<ResponderUpdate, "id" | "createdAt" | "syncedAt"> {
  return {
    reportId,
    type: "status_change",
    payload: { alertState, changedAt: new Date().toISOString() },
  };
}

export function createProgressionUpdate(
  reportId: string,
  progression: IncidentProgression,
): Omit<ResponderUpdate, "id" | "createdAt" | "syncedAt"> {
  return {
    reportId,
    type: "progression_update",
    payload: { progression, updatedAt: new Date().toISOString() },
  };
}

export function createFieldNoteUpdate(
  reportId: string,
  note: string,
): Omit<ResponderUpdate, "id" | "createdAt" | "syncedAt"> {
  return {
    reportId,
    type: "field_note",
    payload: { note, createdAt: new Date().toISOString() },
  };
}

// ---------------------------------------------------------------------------
// Sync responder updates to backend
// ---------------------------------------------------------------------------

export async function syncResponderUpdates(): Promise<{
  synced: number;
  failed: number;
}> {
  if (!isOnline()) return { synced: 0, failed: 0 };

  const db = await getDb();
  const all = await db.getAll(RESPONDER_UPDATES_STORE);
  const pending = all.filter((u) => !u.syncedAt);

  let synced = 0;
  let failed = 0;

  for (const update of pending) {
    try {
      await syncSingleUpdate(update);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

async function syncSingleUpdate(update: ResponderUpdate): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured.");

  const REPORTS_TABLE = "reports";

  switch (update.type) {
    case "acknowledge": {
      const { error } = await supabase
        .from(REPORTS_TABLE)
        .update({
          alert_state: "acknowledged",
          acknowledged_at: (update.payload as { acknowledgedAt: string }).acknowledgedAt,
        })
        .eq("id", update.reportId);
      if (error) throw error;
      break;
    }

    case "status_change": {
      const { alertState, changedAt } = update.payload as { alertState: string; changedAt: string };
      const updatePayload: Record<string, unknown> = { alert_state: alertState };
      if (alertState === "dispatched") updatePayload.dispatched_at = changedAt;
      if (alertState === "resolved") {
        updatePayload.resolved_at = changedAt;
        updatePayload.status = "resolved";
      }
      const { error } = await supabase
        .from(REPORTS_TABLE)
        .update(updatePayload)
        .eq("id", update.reportId);
      if (error) throw error;
      break;
    }

    case "progression_update": {
      // Progression is tracked locally for now; backend mapping can be extended
      break;
    }

    case "field_note": {
      // Field notes could be stored in a separate table; for now track locally
      break;
    }
  }

  // Mark as synced
  const db = await getDb();
  const tx = db.transaction(RESPONDER_UPDATES_STORE, "readwrite");
  const store = tx.objectStore(RESPONDER_UPDATES_STORE);
  const existing = await store.get(update.id);
  if (existing) {
    await store.put({ ...existing, syncedAt: new Date().toISOString() });
  }
  await tx.done;
}

// ---------------------------------------------------------------------------
// Get pending updates count
// ---------------------------------------------------------------------------

export async function getPendingUpdateCount(): Promise<number> {
  const db = await getDb();
  const all = await db.getAll(RESPONDER_UPDATES_STORE);
  return all.filter((u) => !u.syncedAt).length;
}
