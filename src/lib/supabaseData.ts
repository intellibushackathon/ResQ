import type { AppRole } from "./supabase";
import { supabase } from "./supabase";
import { reverseGeocode } from "./geocoding";
import {
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_LOCATION_LABEL,
  type AdminAuditEntry,
  type AdminSettings,
  type AlertState,
  type DepartmentFilter,
  type DisasterReport,
  type FlexibleAuditLogRow,
  type FlexibleSystemSettingRow,
  type QueuedReportDraft,
  type ReportAIAnalysis,
  type ReportSubmissionInput,
  createOfflineReportFromDraft,
  fromDbDamageType,
  fromDbDepartmentFilter,
  fromDbReportStatus,
  fromDbSeverity,
  resolveSubmittedDamageType,
  sortReportsByPriority,
  toDbDamageType,
  toDbDepartmentFilter,
  toDbReportStatus,
  toDbSeverity,
} from "./reporting";

const REPORTS_TABLE = "reports";
const REPORT_AI_TABLE = "report_ai_analyses";
const SETTINGS_TABLE = "system_settings";
const AUDIT_LOGS_TABLE = "audit_logs";
const REPORT_IMAGES_BUCKET = "report-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const SIGNED_URL_CACHE_TTL_MS = 45 * 60 * 1000;

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

type ReportRow = Record<string, unknown>;
type AnalysisRow = Record<string, unknown>;

type CreateReportPayload = {
  submission: ReportSubmissionInput;
  analysis: ReportAIAnalysis;
  reportedAt?: string;
};

function ensureSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  return supabase;
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function getNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim());
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim());
      }
    } catch {
      return [];
    }
  }

  return [];
}

function sanitizePathSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function inferFileExtension(fileName: string, mimeType: string) {
  const directExtension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "";
  if (directExtension) return directExtension;

  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function createStoragePath(fileName: string, mimeType: string, userId?: string | null) {
  const owner = sanitizePathSegment(userId || "public");
  const extension = inferFileExtension(fileName, mimeType);
  const baseName = sanitizePathSegment(fileName.replace(/\.[^.]+$/, "")) || "incident-report";
  const stamp =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return `${owner}/${baseName}-${stamp}.${extension}`;
}

async function createSignedUrl(path: string) {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const client = ensureSupabaseClient();
  const { data, error } = await client.storage.from(REPORT_IMAGES_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    throw error ?? new Error("Unable to create a signed URL for the report image.");
  }

  signedUrlCache.set(path, {
    url: data.signedUrl,
    expiresAt: Date.now() + SIGNED_URL_CACHE_TTL_MS,
  });

  return data.signedUrl;
}

async function uploadReportImage(file: File | Blob, fileName: string, mimeType: string, userId?: string | null) {
  const client = ensureSupabaseClient();
  const path = createStoragePath(fileName, mimeType, userId);

  const { error } = await client.storage.from(REPORT_IMAGES_BUCKET).upload(path, file, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const url = await createSignedUrl(path);

  return {
    path,
    url,
  };
}

function extractAnalysisFromReportRow(row: ReportRow): ReportAIAnalysis | undefined {
  const damageType = fromDbDamageType(getString(row.damage_type) ?? getString(row.ai_damage_type) ?? undefined);
  const severity = fromDbSeverity(getString(row.severity) ?? getString(row.ai_severity) ?? undefined);
  const confidence = getNumber(row.ai_confidence);
  const summary = getNullableString(row.ai_summary);
  const rationale = getNullableString(row.ai_rationale);
  const suggestedDepartment = fromDbDepartmentFilter(
    getString(row.ai_suggested_department) ?? getString(row.department_routing) ?? undefined,
  );
  const hazards = getStringArray(row.ai_hazards);
  const suggestedActions = getStringArray(row.ai_suggested_actions);

  if (!damageType || !severity || confidence == null || !summary || !rationale || !suggestedDepartment) {
    return undefined;
  }

  return {
    damageType,
    severity,
    confidence,
    summary,
    rationale,
    hazards,
    suggestedDepartment,
    suggestedActions,
    provider: getString(row.ai_provider) === "proxy" ? "proxy" : getString(row.ai_provider) === "openrouter" ? "openrouter" : "simulation",
    model: getString(row.ai_model) ?? "database",
    analyzedAt: getString(row.ai_analyzed_at) ?? getString(row.updated_at) ?? new Date().toISOString(),
    rawError: getNullableString(row.ai_raw_error),
  };
}

function mapAnalysisRow(row: AnalysisRow): ReportAIAnalysis | undefined {
  const damageType = fromDbDamageType(getString(row.damage_type) ?? undefined);
  const severity = fromDbSeverity(getString(row.severity) ?? undefined);

  return {
    damageType: damageType ?? "Other",
    severity: severity ?? "Medium",
    confidence: getNumber(row.confidence) ?? 0.81,
    summary: getString(row.summary) ?? "AI analysis loaded from backend storage.",
    rationale: getString(row.rationale) ?? "No rationale was stored for this analysis.",
    hazards: getStringArray(row.hazards),
    suggestedDepartment:
      fromDbDepartmentFilter(getString(row.suggested_department) ?? getString(row.department_routing) ?? undefined) ?? "None",
    suggestedActions: getStringArray(row.suggested_actions),
    provider:
      getString(row.provider) === "proxy" ? "proxy" : getString(row.provider) === "openrouter" ? "openrouter" : "simulation",
    model: getString(row.model) ?? "unknown",
    analyzedAt: getString(row.analyzed_at) ?? getString(row.created_at) ?? new Date().toISOString(),
    rawError: getNullableString(row.raw_error),
  };
}

async function fetchAiAnalysisMap(reportIds: string[]) {
  if (reportIds.length === 0) {
    return new Map<string, ReportAIAnalysis>();
  }

  const client = ensureSupabaseClient();
  const { data, error } = await client.from(REPORT_AI_TABLE).select("*").in("report_id", reportIds);

  if (error || !data) {
    console.warn("Unable to load report AI analyses; continuing without a joined AI payload.", error);
    return new Map<string, ReportAIAnalysis>();
  }

  const map = new Map<string, ReportAIAnalysis>();
  for (const row of data as AnalysisRow[]) {
    const reportId = getString(row.report_id);
    const analysis = mapAnalysisRow(row);
    if (reportId && analysis) {
      map.set(reportId, analysis);
    }
  }

  return map;
}

function deriveAlertState(dbStatus: string | null): AlertState {
  if (dbStatus === "resolved") return "resolved";
  if (dbStatus === "verified") return "acknowledged";
  return "new";
}

async function enrichReportRow(row: ReportRow, analysisMap: Map<string, ReportAIAnalysis>): Promise<DisasterReport> {
  const id = getString(row.id) ?? `${Date.now()}`;
  const photoPath = getNullableString(row.photo_path);
  const existingPhotoUrl = getNullableString(row.photo_url) ?? getNullableString(row.public_url);
  let photoUrl = existingPhotoUrl ?? "";

  if (!photoUrl && photoPath) {
    try {
      photoUrl = await createSignedUrl(photoPath);
    } catch (error) {
      console.warn("Unable to sign a report image URL.", error);
    }
  }

  const locationNameFromRow =
    getNullableString(row.location_name) ?? getNullableString(row.location_label) ?? getNullableString(row.location);
  const lat = getNumber(row.lat) ?? 0;
  const lng = getNumber(row.lng) ?? 0;
  const resolvedLocation =
    locationNameFromRow || (!Number.isFinite(lat) || !Number.isFinite(lng))
      ? null
      : await reverseGeocode(lat, lng);

  const analysis = analysisMap.get(id) ?? extractAnalysisFromReportRow(row);

  return {
    id,
    photoUrl,
    photoPath,
    damageType: fromDbDamageType(getString(row.damage_type) ?? undefined) ?? analysis?.damageType,
    severity: fromDbSeverity(getString(row.severity) ?? undefined) ?? analysis?.severity,
    description: getString(row.description) ?? "",
    lat,
    lng,
    locationName: locationNameFromRow ?? resolvedLocation?.label ?? DEFAULT_LOCATION_LABEL,
    timestamp:
      getString(row.reported_at) ?? getString(row.created_at) ?? getString(row.updated_at) ?? new Date().toISOString(),
    status: fromDbReportStatus(getString(row.status) ?? undefined),
    departmentFilter:
      fromDbDepartmentFilter(getString(row.department_routing) ?? undefined) ?? analysis?.suggestedDepartment,
    ai: analysis,
    submittedBy: getNullableString(row.submitted_by),
    // alert_state, acknowledged_at, and dispatched_at are not schema columns.
    // Derive alertState from status so the UI reflects the correct workflow stage.
    alertState: deriveAlertState(getString(row.status)),
    acknowledgedAt: null,
    dispatchedAt: null,
    resolvedAt: getNullableString(row.resolved_at),
    verifiedBy: getNullableString(row.verified_by),
  };
}

async function fetchReportsByQuery(runQuery: () => PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await runQuery();
  if (error) {
    throw new Error(error.message);
  }

  return (data as ReportRow[]) ?? [];
}

function uniqueIds(rows: ReportRow[]) {
  return Array.from(new Set(rows.map((row) => getString(row.id)).filter((value): value is string => Boolean(value))));
}

async function hydrateReports(rows: ReportRow[]) {
  const ids = uniqueIds(rows);
  const analysisMap = await fetchAiAnalysisMap(ids);
  const reports = await Promise.all(rows.map((row) => enrichReportRow(row, analysisMap)));
  return sortReportsByPriority(reports);
}

function mergeRowsById(...collections: ReportRow[][]) {
  const map = new Map<string, ReportRow>();
  for (const collection of collections) {
    for (const row of collection) {
      const id = getString(row.id);
      if (id) {
        map.set(id, row);
      }
    }
  }

  return Array.from(map.values());
}

export async function fetchReportsForViewer(viewerId: string | null, role: AppRole) {
  const client = ensureSupabaseClient();

  if (role === "staff" || role === "admin") {
    const rows = await fetchReportsByQuery(async () =>
      client
        .from(REPORTS_TABLE)
        .select("*")
        .order("reported_at", { ascending: false })
        .order("created_at", { ascending: false }),
    );
    return hydrateReports(rows);
  }

  const criticalAlertRowsPromise = fetchReportsByQuery(async () =>
    client
      .from(REPORTS_TABLE)
      .select("*")
      .eq("severity", "critical")
      .neq("status", "resolved")
      .order("reported_at", { ascending: false })
      .order("created_at", { ascending: false }),
  );

  const ownRowsPromise = viewerId
    ? fetchReportsByQuery(async () =>
        client
          .from(REPORTS_TABLE)
          .select("*")
          .eq("submitted_by", viewerId)
          .order("reported_at", { ascending: false })
          .order("created_at", { ascending: false }),
      )
    : Promise.resolve([]);

  const [criticalRows, ownRows] = await Promise.all([criticalAlertRowsPromise, ownRowsPromise]);
  return hydrateReports(mergeRowsById(ownRows, criticalRows));
}

export async function persistReportAnalysis(reportId: string, analysis: ReportAIAnalysis) {
  const client = ensureSupabaseClient();

  const { error } = await client.from(REPORT_AI_TABLE).upsert(
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
    {
      onConflict: "report_id",
    },
  );

  if (error) {
    console.warn("Unable to persist the report AI analysis.", error);
  }
}

export async function createReport(payload: CreateReportPayload) {
  const client = ensureSupabaseClient();
  const { submission, analysis } = payload;
  const reportedAt = payload.reportedAt ?? new Date().toISOString();
  const resolvedDamageType = resolveSubmittedDamageType(submission.damageType, analysis);
  const uploadedImage = await uploadReportImage(
    submission.photoFile,
    submission.photoFile.name,
    submission.photoFile.type || "image/jpeg",
    submission.submittedBy,
  );

  const insertPayload = {
    submitted_by: submission.submittedBy ?? null,
    photo_path: uploadedImage.path,
    damage_type: toDbDamageType(resolvedDamageType),
    severity: toDbSeverity(analysis.severity),
    description: submission.description.trim(),
    lat: Number(submission.lat.toFixed(6)),
    lng: Number(submission.lng.toFixed(6)),
    reported_at: reportedAt,
    status: toDbReportStatus("Pending Validation"),
    department_routing: toDbDepartmentFilter(analysis.suggestedDepartment),
  };

  const { data, error } = await client.from(REPORTS_TABLE).insert(insertPayload).select("*").single();
  if (error || !data) {
    throw error ?? new Error("Unable to create the report record.");
  }

  await persistReportAnalysis(getString((data as ReportRow).id) ?? "", analysis);

  const hydrated = await enrichReportRow(
    {
      ...(data as ReportRow),
      photo_url: uploadedImage.url,
      location_name: submission.locationName,
    },
    new Map([[getString((data as ReportRow).id) ?? "", analysis]]),
  );

  return hydrated;
}

function dataUrlToBlob(dataUrl: string, mimeType: string) {
  const [metadata, base64] = dataUrl.split(",");
  if (!metadata || !base64) {
    throw new Error("Invalid data URL.");
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], {
    type: mimeType,
  });
}

export async function createReportFromQueuedDraft(draft: QueuedReportDraft) {
  const blob = draft.imageDataUrl ? dataUrlToBlob(draft.imageDataUrl, draft.imageType) : null;
  if (!blob) {
    throw new Error("Queued report is missing an image payload.");
  }

  const submission: ReportSubmissionInput = {
    photoFile: new File([blob], draft.imageName, { type: draft.imageType }),
    damageType: draft.damageType,
    description: draft.description,
    lat: draft.lat,
    lng: draft.lng,
    locationName: draft.locationName,
    urgentAssist: draft.urgentAssist,
    submittedBy: draft.submittedBy ?? null,
  };

  return createReport({
    submission,
    analysis: draft.ai,
    reportedAt: draft.timestamp,
  });
}

async function updateReportRow(reportId: string, values: Record<string, unknown>) {
  const client = ensureSupabaseClient();
  const sanitizedValues = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
  const { data, error } = await client
    .from(REPORTS_TABLE)
    .update(sanitizedValues)
    .eq("id", reportId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update the report.");
  }

  return data as ReportRow;
}

async function refreshReportRow(row: ReportRow) {
  const reportId = getString(row.id) ?? "";
  const analysisMap = await fetchAiAnalysisMap(reportId ? [reportId] : []);
  return enrichReportRow(row, analysisMap);
}

export async function verifyReportInDatabase(
  reportId: string,
  updates: {
    severity?: ReportAIAnalysis["severity"] | null;
    department?: DepartmentFilter | null;
    verifiedBy?: string | null;
  },
) {
  // Only write columns that exist in the live schema.
  // alert_state and acknowledged_at are not schema columns — they are derived client-side.
  const row = await updateReportRow(reportId, {
    status: toDbReportStatus("Verified"),
    severity: updates.severity ? toDbSeverity(updates.severity) : undefined,
    department_routing: updates.department ? toDbDepartmentFilter(updates.department) : undefined,
    verified_by: updates.verifiedBy ?? null,
  });

  return refreshReportRow(row);
}

export async function dispatchReportInDatabase(reportId: string) {
  // The live schema has no dispatch column. We fetch the current row and patch
  // alertState client-side so the UI reflects the dispatched state for the
  // duration of the session. After a page reload the report will show as
  // "acknowledged" (derived from status=verified) — documented as a known gap.
  const client = ensureSupabaseClient();
  const { data, error } = await client
    .from(REPORTS_TABLE)
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to fetch the report for dispatch.");
  }

  const report = await refreshReportRow(data as ReportRow);
  return {
    ...report,
    alertState: "dispatched" as AlertState,
    dispatchedAt: new Date().toISOString(),
  };
}

export async function resolveReportInDatabase(reportId: string) {
  // alert_state is not a schema column — alertState is derived from status client-side.
  const row = await updateReportRow(reportId, {
    status: toDbReportStatus("Resolved"),
    resolved_at: new Date().toISOString(),
  });

  return refreshReportRow(row);
}

function extractSettingKey(row: FlexibleSystemSettingRow) {
  return getString(row.key) ?? getString(row.setting_key) ?? null;
}

function extractSettingValue(row: FlexibleSystemSettingRow) {
  if (typeof row.value === "boolean" || typeof row.value === "number" || typeof row.value === "string") {
    return row.value;
  }

  return row.boolean_value ?? row.numeric_value ?? row.text_value ?? row.setting_value ?? row.json_value ?? null;
}

export function parseAdminSettings(rows: FlexibleSystemSettingRow[]) {
  const next = { ...DEFAULT_ADMIN_SETTINGS };

  for (const row of rows) {
    // Direct-column format (live schema: system_settings has named columns, not key-value rows)
    if (row.privacy_mode !== undefined) next.privacyMode = Boolean(row.privacy_mode);
    if (row.auto_confirm !== undefined) next.autoConfirm = Boolean(row.auto_confirm);
    if (row.sms_alerts !== undefined) next.smsAlerts = Boolean(row.sms_alerts);
    if (row.lockdown_mode !== undefined) next.lockdownMode = Boolean(row.lockdown_mode);
    if (row.rate_limit !== undefined) {
      const parsed = getNumber(row.rate_limit);
      if (parsed != null) next.rateLimit = parsed;
    }

    // Legacy key-value format (kept for backwards compatibility)
    const key = extractSettingKey(row);
    const rawValue = extractSettingValue(row);

    if (!key) continue;

    if (["privacy_mode", "geo_privacy", "mask_coordinates"].includes(key)) {
      next.privacyMode = Boolean(rawValue);
    }

    if (["auto_confirm", "ai_auto_confirm"].includes(key)) {
      next.autoConfirm = Boolean(rawValue);
    }

    if (["sms_alerts", "emergency_sms_alerts"].includes(key)) {
      next.smsAlerts = Boolean(rawValue);
    }

    if (["rate_limit", "api_rate_limit"].includes(key)) {
      const parsed = getNumber(rawValue);
      if (parsed != null) {
        next.rateLimit = parsed;
      }
    }

    if (["lockdown_mode", "system_lockdown"].includes(key)) {
      next.lockdownMode = Boolean(rawValue);
    }
  }

  return next;
}

function mapAuditLevel(value: unknown): AdminAuditEntry["level"] {
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  if (normalized === "error") return "error";
  if (normalized === "warning" || normalized === "warn") return "warning";
  return "info";
}

export function getFallbackAuditEntriesForReports(reports: DisasterReport[]): AdminAuditEntry[] {
  const entries: AdminAuditEntry[] = [];

  for (const report of reports) {
    entries.push({
      id: `${report.id}-created`,
      title: "Report received",
      detail: `${report.damageType ?? "Incident"} submitted for review.`,
      level: "info",
      createdAt: report.timestamp,
    });

    if (report.status === "Verified" || report.alertState === "acknowledged" || report.alertState === "dispatched") {
      entries.push({
        id: `${report.id}-verified`,
        title: "Report verified",
        detail: `${report.id} moved into the verified workflow.`,
        level: "warning",
        createdAt: report.acknowledgedAt ?? report.timestamp,
      });
    }

    if (report.alertState === "dispatched") {
      entries.push({
        id: `${report.id}-dispatched`,
        title: "Teams dispatched",
        detail: `${report.id} was dispatched to field teams.`,
        level: "warning",
        createdAt: report.dispatchedAt ?? report.timestamp,
      });
    }

    if (report.status === "Resolved" || report.alertState === "resolved") {
      entries.push({
        id: `${report.id}-resolved`,
        title: "Incident resolved",
        detail: `${report.id} has been marked resolved.`,
        level: "info",
        createdAt: report.resolvedAt ?? report.timestamp,
      });
    }
  }

  return entries.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export async function loadAdminSupportData(reportsForFallback: DisasterReport[]) {
  const client = ensureSupabaseClient();

  const [settingsResult, auditResult] = await Promise.all([
    client.from(SETTINGS_TABLE).select("*"),
    client.from(AUDIT_LOGS_TABLE).select("*"),
  ]);

  const settingsRows = (settingsResult.data as FlexibleSystemSettingRow[] | null) ?? [];
  const auditRows = (auditResult.data as FlexibleAuditLogRow[] | null) ?? [];

  const warning =
    settingsResult.error || auditResult.error
      ? "One or more admin support tables could not be fully loaded; using flexible fallbacks where possible."
      : null;

  const auditLogs =
    auditResult.error || auditRows.length === 0
      ? getFallbackAuditEntriesForReports(reportsForFallback)
      : auditRows
          .map((row) => ({
            id: getString(row.id) ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            title: getString(row.title) ?? getString(row.action) ?? getString(row.event) ?? "System event",
            // Live schema stores details as jsonb; stringify it for display.
            detail:
              getString(row.detail) ??
              getString(row.message) ??
              getString(row.description) ??
              (row.details !== null && row.details !== undefined
                ? typeof row.details === "string"
                  ? row.details
                  : JSON.stringify(row.details)
                : null) ??
              "No detail provided.",
            level: mapAuditLevel(row.level ?? row.severity),
            createdAt:
              getString(row.created_at) ?? getString(row.timestamp) ?? getString(row.logged_at) ?? new Date().toISOString(),
          }))
          .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  return {
    adminSettings: parseAdminSettings(settingsRows),
    adminSettingsRows: settingsRows,
    auditLogs,
    warning,
  };
}

export async function updateSystemSetting(
  rows: FlexibleSystemSettingRow[],
  key: keyof AdminSettings,
  value: boolean | number,
) {
  const client = ensureSupabaseClient();

  // Live schema uses a single-row table with direct column names (id=1 enforced by CHECK constraint).
  const directColumnMap: Record<keyof AdminSettings, string> = {
    privacyMode: "privacy_mode",
    autoConfirm: "auto_confirm",
    smsAlerts: "sms_alerts",
    rateLimit: "rate_limit",
    lockdownMode: "lockdown_mode",
  };

  const { error } = await client
    .from(SETTINGS_TABLE)
    .update({ [directColumnMap[key]]: value })
    .eq("id", 1);

  if (error) {
    throw error;
  }

  return {
    ...parseAdminSettings(rows),
    [key]: value,
  } as AdminSettings;
}

export function mergeLiveAndQueuedReports(liveReports: DisasterReport[], drafts: QueuedReportDraft[]) {
  return sortReportsByPriority([...drafts.map(createOfflineReportFromDraft), ...liveReports]);
}

export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
}

/** Alias used by AdminSystemControls. */
export function clearReportImageUrlCache(): void {
  clearSignedUrlCache();
}
