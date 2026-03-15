import type { LocalIncidentReport, IncidentRecord, SourceChannel } from "../types/incident";
import { toLegacySeverity, incidentTypeToDamageType } from "../types/incident";
import { localReportToLegacy } from "../types/migration";
import { getPhotoAssetsForReport, getPhotoBlob } from "../storage/photo-store";
import { supabase } from "../supabase";
import {
  toDbDamageType,
  toDbSeverity,
  toDbReportStatus,
  toDbDepartmentFilter,
  DEFAULT_LOCATION_LABEL,
} from "../reporting";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORTS_TABLE = "reports";
const REPORT_AI_TABLE = "report_ai_analyses";
const REPORT_IMAGES_BUCKET = "report-images";

// ---------------------------------------------------------------------------
// Upload a LocalIncidentReport to Supabase
// ---------------------------------------------------------------------------

export async function uploadReportToCloud(
  report: LocalIncidentReport,
): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const damageType = incidentTypeToDamageType(report.incident.type);
  const severity = toLegacySeverity(report.incident.severity);

  // Upload first photo if available
  let photoPath: string | null = null;
  if (report.media.photos.length > 0) {
    const firstPhoto = report.media.photos[0];
    const blob = await getPhotoBlob(firstPhoto.localKey);
    if (blob) {
      const uploadResult = await uploadImageBlob(
        blob,
        firstPhoto.mimeType,
        firstPhoto.fileName ?? "incident-photo",
        report.createdByUserId,
      );
      photoPath = uploadResult.path;
    }
  }

  const insertPayload = {
    submitted_by: report.createdByUserId ?? null,
    photo_path: photoPath,
    damage_type: toDbDamageType(damageType),
    severity: toDbSeverity(severity),
    description: report.incident.description.trim(),
    lat: report.location.lat != null ? Number(report.location.lat.toFixed(6)) : null,
    lng: report.location.lng != null ? Number(report.location.lng.toFixed(6)) : null,
    location_name: report.location.addressText ?? DEFAULT_LOCATION_LABEL,
    reported_at: report.createdAt,
    status: toDbReportStatus("Pending Validation"),
    department_routing: toDbDepartmentFilter(report.departmentFilter),
    alert_state: "new",
    source_channel: report.sourceChannel,
  };

  const { data, error } = await supabase
    .from(REPORTS_TABLE)
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to insert report into Supabase.");
  }

  // Persist AI analysis if available
  if (report.ai) {
    const reportId = (data as { id: string }).id;
    await persistReportAnalysis(reportId, report.ai);
  }
}

// ---------------------------------------------------------------------------
// Upload pending photos for a report
// ---------------------------------------------------------------------------

export async function uploadPendingPhotos(reportId: string): Promise<void> {
  if (!supabase) return;

  const assets = await getPhotoAssetsForReport(reportId);

  for (const asset of assets) {
    // Skip if already uploaded (checking for a marker in the localKey)
    const blob = await getPhotoBlob(asset.localKey);
    if (!blob) continue;

    try {
      await uploadImageBlob(
        blob,
        asset.mimeType,
        asset.fileName ?? "incident-photo",
        null,
      );
    } catch (err) {
      console.warn(`Failed to upload photo ${asset.id}:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Pull remote reports (for merge during init)
// ---------------------------------------------------------------------------

export async function pullRemoteReports(
  since: string | null = null,
): Promise<LocalIncidentReport[]> {
  if (!supabase) return [];

  const { legacyReportToLocal } = await import("../types/migration");
  const { getOrCreateDeviceId } = await import("../relay/device-identity");

  let query = supabase
    .from(REPORTS_TABLE)
    .select("*")
    .order("reported_at", { ascending: false });

  if (since) {
    query = query.gte("updated_at", since);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw error ?? new Error("Failed to fetch remote reports.");
  }

  const deviceId = await getOrCreateDeviceId();
  const reports: LocalIncidentReport[] = [];

  for (const row of data as Array<Record<string, unknown>>) {
    try {
      // Create a minimal DisasterReport-like object for the adapter
      const legacyReport = {
        id: String(row.id ?? ""),
        photoUrl: "",
        description: String(row.description ?? ""),
        lat: Number(row.lat ?? 0),
        lng: Number(row.lng ?? 0),
        locationName: row.location_name ? String(row.location_name) : undefined,
        timestamp: String(row.reported_at ?? row.created_at ?? new Date().toISOString()),
        status: mapDbStatus(String(row.status ?? "pending_validation")),
        submittedBy: row.submitted_by ? String(row.submitted_by) : null,
        alertState: (row.alert_state as string) ?? "new",
        acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : null,
        dispatchedAt: row.dispatched_at ? String(row.dispatched_at) : null,
        resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
        verifiedBy: row.verified_by ? String(row.verified_by) : null,
      };

      const localReport = legacyReportToLocal(legacyReport as Parameters<typeof legacyReportToLocal>[0], deviceId);
      localReport.syncStatus = "synced";
      localReport.reportStatus = "synced";
      reports.push(localReport);
    } catch {
      // Skip malformed rows
    }
  }

  return reports;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapDbStatus(dbStatus: string): "Pending Validation" | "Verified" | "Resolved" {
  if (dbStatus === "verified") return "Verified";
  if (dbStatus === "resolved") return "Resolved";
  return "Pending Validation";
}

async function uploadImageBlob(
  blob: Blob,
  mimeType: string,
  fileName: string,
  userId: string | null,
): Promise<{ path: string }> {
  if (!supabase) throw new Error("Supabase not configured.");

  const owner = sanitizePathSegment(userId || "public");
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const baseName = sanitizePathSegment(fileName.replace(/\.[^.]+$/, "")) || "incident-photo";
  const stamp = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const path = `${owner}/${baseName}-${stamp}.${extension}`;

  const { error } = await supabase.storage
    .from(REPORT_IMAGES_BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: false });

  if (error) throw error;

  return { path };
}

function sanitizePathSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function persistReportAnalysis(
  reportId: string,
  analysis: NonNullable<LocalIncidentReport["ai"]>,
): Promise<void> {
  if (!supabase) return;

  const { toDbDamageType, toDbSeverity, toDbDepartmentFilter } = await import("../reporting");

  const { error } = await supabase.from(REPORT_AI_TABLE).upsert(
    {
      report_id: reportId,
      damage_type: toDbDamageType(analysis.damageType),
      severity: toDbSeverity(analysis.severity),
      confidence: analysis.confidence,
      summary: analysis.summary,
      rationale: analysis.rationale,
      hazards: analysis.hazards,
      suggested_department: toDbDepartmentFilter(analysis.suggestedDepartment),
      suggested_actions: analysis.suggestedActions,
      provider: analysis.provider,
      model: analysis.model,
      analyzed_at: analysis.analyzedAt,
      raw_error: analysis.rawError ?? null,
    },
    { onConflict: "report_id" },
  );

  if (error) {
    console.warn("Failed to persist AI analysis:", error);
  }
}
