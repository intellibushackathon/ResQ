import type { DamageType, DamageTypeOption, Severity, DepartmentFilter, AlertState, ReportAIAnalysis } from "../reporting";

// ---------------------------------------------------------------------------
// Report lifecycle status enums
// ---------------------------------------------------------------------------

export type ReportStatus = "draft" | "submitted" | "queued" | "relayed" | "synced" | "failed";

export type SyncStatus = "local_only" | "pending_relay" | "pending_cloud" | "synced" | "sync_failed";

export type RelayStatus = "not_attempted" | "queued" | "relayed" | "relay_failed";

export type CreatedByRole = "citizen" | "responder" | "admin" | "guest";

export type SourceChannel = "online_direct" | "offline_sync" | "mesh_gateway";

export type IncidentProgression =
  | "unassigned"
  | "assigned"
  | "en_route"
  | "on_scene"
  | "resolved"
  | "cancelled"
  | "failed"
  | "escalated";

export type RelayDeliveryStatus = "queued" | "sent" | "received" | "forwarded" | "failed";

export type RelayTransport = "mesh" | "bluetooth" | "manual_import";

export type IncidentRecordStatus = "new" | "under_review" | "verified" | "dispatched" | "resolved";

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export type IncidentLocation = {
  lat: number | null;
  lng: number | null;
  addressText: string | null;
  parish: string | null;
  landmark: string | null;
  isGpsCaptured: boolean;
};

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

export type Reporter = {
  name: string | null;
  phone: string | null;
  organization: string | null;
  isAnonymous: boolean;
};

// ---------------------------------------------------------------------------
// Dashboard flags
// ---------------------------------------------------------------------------

export type DashboardFlags = {
  isDuplicateCandidate: boolean;
  requiresReview: boolean;
  isEscalated: boolean;
};

// ---------------------------------------------------------------------------
// Incident block (nested in LocalIncidentReport)
// ---------------------------------------------------------------------------

export type IncidentDetail = {
  type: string;
  subtype: string | null;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  occurredAt: string | null;
};

// ---------------------------------------------------------------------------
// LocalPhotoAsset
// ---------------------------------------------------------------------------

export type LocalPhotoAsset = {
  id: string;
  reportId: string;
  localKey: string;
  mimeType: string;
  fileName: string | null;
  originalSizeBytes: number | null;
  compressedSizeBytes: number | null;
  thumbnailKey: string | null;
  previewKey: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// LocalIncidentReport – the primary offline-first report model
// ---------------------------------------------------------------------------

export type LocalIncidentReport = {
  id: string;
  createdAt: string;
  updatedAt: string;

  originDeviceId: string;
  createdByUserId: string | null;
  createdByRole: CreatedByRole;

  reportStatus: ReportStatus;
  syncStatus: SyncStatus;
  relayStatus: RelayStatus;

  retryCount: number;
  lastRelayAttemptAt: string | null;
  lastSyncAttemptAt: string | null;
  lastErrorMessage: string | null;

  incident: IncidentDetail;

  location: IncidentLocation;

  reporter: Reporter;

  media: {
    photos: LocalPhotoAsset[];
    hasPhoto: boolean;
  };

  tags: string[];

  dashboardFlags: DashboardFlags;

  // Legacy compatibility / workflow fields
  ai: ReportAIAnalysis | null;
  departmentFilter: DepartmentFilter;
  alertState: AlertState;
  acknowledgedAt: string | null;
  dispatchedAt: string | null;
  resolvedAt: string | null;
  verifiedBy: string | null;
  assignedResponderId: string | null;
  assignedAgency: string | null;
  sourceChannel: SourceChannel;
};

// ---------------------------------------------------------------------------
// CompactRelayPayload – lightweight data for mesh relay
// ---------------------------------------------------------------------------

export type CompactRelayPayload = {
  version: 1;
  payloadType: "incident-relay";

  relayId: string;
  reportId: string;
  createdAt: string;
  originDeviceId: string;

  incidentType: string;
  severity: "low" | "medium" | "high" | "critical";

  title: string;
  summary: string;

  lat: number | undefined;
  lng: number | undefined;
  parish: string | null;

  hasPhoto: boolean;
  photoPreviewAvailable: boolean;

  checksum: string | null;
};

// ---------------------------------------------------------------------------
// RelayEnvelope – wraps a CompactRelayPayload for transport
// ---------------------------------------------------------------------------

export type RelayEnvelope = {
  id: string;
  payloadType: "incident-relay";
  payloadVersion: 1;

  sourceDeviceId: string;
  destinationType: "mesh" | "gateway" | "internet";

  createdAt: string;
  ttl: number;

  deliveryStatus: RelayDeliveryStatus;

  payload: CompactRelayPayload;

  hopCount: number;
  maxHops: number;
  ttlExpiresAt: string;
  visitedDeviceIds: string[];
  deliveredToGatewayAt: string | null;
};

// ---------------------------------------------------------------------------
// GatewayReceivedRelay – received at a gateway node
// ---------------------------------------------------------------------------

export type GatewayReceivedRelay = {
  gatewayReceiptId: string;
  receivedAt: string;
  gatewayDeviceId: string;

  transport: RelayTransport;
  rawPayload: CompactRelayPayload;

  forwardedToBackend: boolean;
  forwardedAt: string | null;
  forwardError: string | null;
};

// ---------------------------------------------------------------------------
// IncidentRecord – backend-facing normalized record for Supabase
// ---------------------------------------------------------------------------

export type IncidentRecord = {
  id: string;
  sourceReportId: string;
  sourceDeviceId: string;

  createdAt: string;
  receivedAt: string;
  updatedAt: string;

  incidentType: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string | null;

  status: IncidentRecordStatus;

  location: {
    lat: number | null;
    lng: number | null;
    parish: string | null;
    addressText: string | null;
  };

  hasPhoto: boolean;
  sourceChannel: SourceChannel;

  assignedResponderId: string | null;
  assignedAgency: string | null;

  duplicateOf: string | null;
  notes: string | null;
};

// ---------------------------------------------------------------------------
// DashboardIncidentView – read-optimized projection for UI
// ---------------------------------------------------------------------------

export type DashboardIncidentView = {
  id: string;
  title: string;
  incidentType: string;
  severity: "low" | "medium" | "high" | "critical";
  status: IncidentRecordStatus;

  createdAt: string;
  receivedAt: string;

  parish: string | null;
  lat: number | null;
  lng: number | null;

  hasPhoto: boolean;
  sourceChannel: SourceChannel;

  assignedAgency: string | null;
  assignedResponderName: string | null;
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export type ValidationError = { field: string; message: string };

export function validateLocalReport(report: LocalIncidentReport): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!report.incident.type) {
    errors.push({ field: "incident.type", message: "Incident type is required" });
  }
  if (!report.incident.severity) {
    errors.push({ field: "incident.severity", message: "Severity is required" });
  }
  if (!report.incident.title.trim()) {
    errors.push({ field: "incident.title", message: "Title is required" });
  }
  if (!report.incident.description.trim()) {
    errors.push({ field: "incident.description", message: "Description is required" });
  }
  if (!report.createdAt) {
    errors.push({ field: "createdAt", message: "Created timestamp is required" });
  }
  if (!report.originDeviceId) {
    errors.push({ field: "originDeviceId", message: "Origin device ID is required" });
  }

  return errors;
}

export function validateRelayPayload(payload: CompactRelayPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!payload.reportId) {
    errors.push({ field: "reportId", message: "Report ID is required" });
  }
  if (!payload.incidentType) {
    errors.push({ field: "incidentType", message: "Incident type is required" });
  }
  if (!payload.severity) {
    errors.push({ field: "severity", message: "Severity is required" });
  }
  if (!payload.title.trim()) {
    errors.push({ field: "title", message: "Title is required" });
  }
  if (!payload.summary.trim()) {
    errors.push({ field: "summary", message: "Summary is required" });
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlankIncidentReport(
  originDeviceId: string,
  createdByRole: CreatedByRole = "citizen",
  createdByUserId: string | null = null,
): LocalIncidentReport {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    originDeviceId,
    createdByUserId,
    createdByRole,
    reportStatus: "draft",
    syncStatus: "local_only",
    relayStatus: "not_attempted",
    retryCount: 0,
    lastRelayAttemptAt: null,
    lastSyncAttemptAt: null,
    lastErrorMessage: null,
    incident: {
      type: "",
      subtype: null,
      severity: "medium",
      title: "",
      description: "",
      occurredAt: null,
    },
    location: {
      lat: null,
      lng: null,
      addressText: null,
      parish: null,
      landmark: null,
      isGpsCaptured: false,
    },
    reporter: {
      name: null,
      phone: null,
      organization: null,
      isAnonymous: true,
    },
    media: {
      photos: [],
      hasPhoto: false,
    },
    tags: [],
    dashboardFlags: {
      isDuplicateCandidate: false,
      requiresReview: true,
      isEscalated: false,
    },
    ai: null,
    departmentFilter: "None",
    alertState: "new",
    acknowledgedAt: null,
    dispatchedAt: null,
    resolvedAt: null,
    verifiedBy: null,
    assignedResponderId: null,
    assignedAgency: null,
    sourceChannel: "online_direct",
  };
}

export function createPhotoAsset(
  reportId: string,
  localKey: string,
  mimeType: string,
  fileName: string | null = null,
): LocalPhotoAsset {
  return {
    id: generateId(),
    reportId,
    localKey,
    mimeType,
    fileName,
    originalSizeBytes: null,
    compressedSizeBytes: null,
    thumbnailKey: null,
    previewKey: null,
    width: null,
    height: null,
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Severity mapping helpers (new lowercase ↔ legacy capitalized)
// ---------------------------------------------------------------------------

const SEVERITY_TO_NEW: Record<string, "low" | "medium" | "high" | "critical"> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

const SEVERITY_TO_LEGACY: Record<string, Severity> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function toNewSeverity(severity: string | Severity): "low" | "medium" | "high" | "critical" {
  return SEVERITY_TO_NEW[severity] ?? "medium";
}

export function toLegacySeverity(severity: "low" | "medium" | "high" | "critical"): Severity {
  return SEVERITY_TO_LEGACY[severity] ?? "Medium";
}

// ---------------------------------------------------------------------------
// Damage type mapping for incident.type field
// ---------------------------------------------------------------------------

const DAMAGE_TYPE_TO_INCIDENT_TYPE: Record<string, string> = {
  Flooding: "flooding",
  "Roof Collapse": "roof_collapse",
  "Debris/Tree": "debris_tree",
  "Utility Damage": "utility_damage",
  Other: "other",
};

const INCIDENT_TYPE_TO_DAMAGE_TYPE: Record<string, DamageType> = {
  flooding: "Flooding",
  roof_collapse: "Roof Collapse",
  debris_tree: "Debris/Tree",
  utility_damage: "Utility Damage",
  other: "Other",
};

export function damageTypeToIncidentType(dt: DamageType | DamageTypeOption): string {
  if (dt === "Auto/AI") return "auto_ai";
  return DAMAGE_TYPE_TO_INCIDENT_TYPE[dt] ?? "other";
}

export function incidentTypeToDamageType(it: string): DamageType {
  return INCIDENT_TYPE_TO_DAMAGE_TYPE[it] ?? "Other";
}
