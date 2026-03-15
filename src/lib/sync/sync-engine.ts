import {
  getLocalOnlyIncidents,
  getPendingCloudIncidents,
  getSyncFailedIncidents,
  updateIncidentFields,
} from "../storage/incident-store";
import { isOnline } from "./connectivity";
import { uploadReportToCloud, uploadPendingPhotos } from "./cloud-sync";
import { reverseGeocodeWithRetry } from "../geocoding";
import type { LocalIncidentReport, SyncStatus } from "../types/incident";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_RETRY_COUNT = 5;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60000;

// ---------------------------------------------------------------------------
// State machine transitions:
//
// local_only ──→ pending_cloud ──→ synced           (online path)
// local_only ──→ pending_relay ──→ relayed
//                                  ──→ pending_cloud ──→ synced   (relay path)
// pending_relay ──→ relay_failed   (retry on next opportunity)
// pending_cloud ──→ sync_failed    (retry with exponential backoff)
// ---------------------------------------------------------------------------

function calculateBackoff(retryCount: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** retryCount, MAX_BACKOFF_MS);
}

/**
 * Process reports that are local_only and attempt to sync them.
 * If online: route directly to cloud sync (pending_cloud → synced).
 * If offline: mark as pending_relay for mesh forwarding.
 */
export async function processLocalOnlyReports(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const reports = await getLocalOnlyIncidents();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const report of reports) {
    if (report.reportStatus === "draft") continue; // Don't sync drafts

    processed++;

    if (isOnline()) {
      // Route to cloud sync
      await updateIncidentFields(report.id, {
        syncStatus: "pending_cloud" as SyncStatus,
        lastSyncAttemptAt: new Date().toISOString(),
      });

      try {
        // Resolve location if not yet resolved
        const resolvedReport = await resolveLocationIfNeeded(report);
        await uploadReportToCloud(resolvedReport);
        await uploadPendingPhotos(report.id);

        await updateIncidentFields(report.id, {
          syncStatus: "synced" as SyncStatus,
          reportStatus: "synced",
          lastSyncAttemptAt: new Date().toISOString(),
          lastErrorMessage: null,
        });

        succeeded++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Cloud sync failed";
        await updateIncidentFields(report.id, {
          syncStatus: "sync_failed" as SyncStatus,
          reportStatus: "failed",
          retryCount: report.retryCount + 1,
          lastSyncAttemptAt: new Date().toISOString(),
          lastErrorMessage: errorMsg,
        });
        failed++;
      }
    } else {
      // Offline: mark for relay
      await updateIncidentFields(report.id, {
        syncStatus: "pending_relay" as SyncStatus,
        relayStatus: "queued",
        reportStatus: "queued",
      });
    }
  }

  return { processed, succeeded, failed };
}

/**
 * Process reports that are pending cloud sync.
 */
export async function processPendingCloudReports(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (!isOnline()) return { processed: 0, succeeded: 0, failed: 0 };

  const reports = await getPendingCloudIncidents();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const report of reports) {
    processed++;

    try {
      const resolvedReport = await resolveLocationIfNeeded(report);
      await uploadReportToCloud(resolvedReport);
      await uploadPendingPhotos(report.id);

      await updateIncidentFields(report.id, {
        syncStatus: "synced" as SyncStatus,
        reportStatus: "synced",
        lastSyncAttemptAt: new Date().toISOString(),
        lastErrorMessage: null,
      });

      succeeded++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Cloud sync failed";
      await updateIncidentFields(report.id, {
        syncStatus: "sync_failed" as SyncStatus,
        retryCount: report.retryCount + 1,
        lastSyncAttemptAt: new Date().toISOString(),
        lastErrorMessage: errorMsg,
      });
      failed++;
    }
  }

  return { processed, succeeded, failed };
}

/**
 * Retry failed syncs with exponential backoff.
 */
export async function retryFailedSyncs(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  if (!isOnline()) return { retried: 0, succeeded: 0, failed: 0 };

  const reports = await getSyncFailedIncidents();
  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  for (const report of reports) {
    // Skip if exceeded max retries
    if (report.retryCount >= MAX_RETRY_COUNT) continue;

    // Check if enough time has passed since last attempt
    if (report.lastSyncAttemptAt) {
      const lastAttempt = Date.parse(report.lastSyncAttemptAt);
      const backoff = calculateBackoff(report.retryCount);
      if (Date.now() - lastAttempt < backoff) continue;
    }

    retried++;

    try {
      const resolvedReport = await resolveLocationIfNeeded(report);
      await uploadReportToCloud(resolvedReport);
      await uploadPendingPhotos(report.id);

      await updateIncidentFields(report.id, {
        syncStatus: "synced" as SyncStatus,
        reportStatus: "synced",
        lastSyncAttemptAt: new Date().toISOString(),
        lastErrorMessage: null,
      });

      succeeded++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Retry sync failed";
      await updateIncidentFields(report.id, {
        retryCount: report.retryCount + 1,
        lastSyncAttemptAt: new Date().toISOString(),
        lastErrorMessage: errorMsg,
      });
      failed++;
    }
  }

  return { retried, succeeded, failed };
}

/**
 * Sync a single report by ID.
 */
export async function syncSingleReport(id: string): Promise<boolean> {
  if (!isOnline()) return false;

  const { getIncident } = await import("../storage/incident-store");
  const report = await getIncident(id);
  if (!report) return false;

  try {
    const resolvedReport = await resolveLocationIfNeeded(report);
    await uploadReportToCloud(resolvedReport);
    await uploadPendingPhotos(id);

    await updateIncidentFields(id, {
      syncStatus: "synced" as SyncStatus,
      reportStatus: "synced",
      lastSyncAttemptAt: new Date().toISOString(),
      lastErrorMessage: null,
    });

    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Sync failed";
    await updateIncidentFields(id, {
      syncStatus: "sync_failed" as SyncStatus,
      retryCount: report.retryCount + 1,
      lastSyncAttemptAt: new Date().toISOString(),
      lastErrorMessage: errorMsg,
    });
    return false;
  }
}

/**
 * Run a full sync cycle: process local-only, pending cloud, and retry failed.
 */
export async function runFullSyncCycle(): Promise<{
  localOnly: { processed: number; succeeded: number; failed: number };
  pendingCloud: { processed: number; succeeded: number; failed: number };
  retries: { retried: number; succeeded: number; failed: number };
}> {
  const localOnly = await processLocalOnlyReports();
  const pendingCloud = await processPendingCloudReports();
  const retries = await retryFailedSyncs();

  return { localOnly, pendingCloud, retries };
}

// ---------------------------------------------------------------------------
// Resolve location if addressText is still null (deferred geocoding)
// ---------------------------------------------------------------------------

async function resolveLocationIfNeeded(
  report: LocalIncidentReport,
): Promise<LocalIncidentReport> {
  if (
    report.location.addressText ||
    report.location.lat == null ||
    report.location.lng == null
  ) {
    return report;
  }

  try {
    const resolved = await reverseGeocodeWithRetry(
      report.location.lat,
      report.location.lng,
      2, // fewer retries during sync to avoid blocking
    );

    const updated = {
      ...report,
      location: {
        ...report.location,
        addressText: resolved.label,
        parish: resolved.parish ?? report.location.parish,
      },
    };

    // Persist the resolved location
    await updateIncidentFields(report.id, {
      location: updated.location,
    });

    return updated;
  } catch {
    // Geocoding failed, continue with unresolved location
    return report;
  }
}
