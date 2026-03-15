import type { DisasterReport, QueuedReportDraft, DamageType, Severity, AlertState, DepartmentFilter } from "../reporting";
import type { AppRole } from "../supabase";
import {
  type LocalIncidentReport,
  type CreatedByRole,
  type SourceChannel,
  createBlankIncidentReport,
  toNewSeverity,
  toLegacySeverity,
  damageTypeToIncidentType,
  incidentTypeToDamageType,
} from "./incident";

// ---------------------------------------------------------------------------
// Role mapping
// ---------------------------------------------------------------------------

function appRoleToCreatedByRole(role: AppRole | undefined): CreatedByRole {
  if (role === "admin") return "admin";
  if (role === "staff") return "responder";
  return "citizen";
}

function createdByRoleToAppRole(role: CreatedByRole): AppRole {
  if (role === "admin") return "admin";
  if (role === "responder") return "staff";
  return "public";
}

// ---------------------------------------------------------------------------
// Legacy DisasterReport → LocalIncidentReport
// ---------------------------------------------------------------------------

export function legacyReportToLocal(
  report: DisasterReport,
  originDeviceId: string = "unknown-device",
): LocalIncidentReport {
  const now = new Date().toISOString();
  const isOffline = report.isOfflineQueued === true;

  return {
    id: report.id,
    createdAt: report.timestamp,
    updatedAt: now,
    originDeviceId,
    createdByUserId: report.submittedBy ?? null,
    createdByRole: "citizen",

    reportStatus: isOffline ? "queued" : report.status === "Resolved" ? "synced" : "submitted",
    syncStatus: isOffline ? "local_only" : "synced",
    relayStatus: "not_attempted",

    retryCount: 0,
    lastRelayAttemptAt: null,
    lastSyncAttemptAt: null,
    lastErrorMessage: null,

    incident: {
      type: report.damageType ? damageTypeToIncidentType(report.damageType) : "other",
      subtype: null,
      severity: report.severity ? toNewSeverity(report.severity) : "medium",
      title: report.damageType ?? "Incident Report",
      description: report.description,
      occurredAt: report.timestamp,
    },

    location: {
      lat: report.lat,
      lng: report.lng,
      addressText: report.locationName ?? null,
      parish: null,
      landmark: null,
      isGpsCaptured: true,
    },

    reporter: {
      name: null,
      phone: null,
      organization: null,
      isAnonymous: !report.submittedBy,
    },

    media: {
      photos: [],
      hasPhoto: Boolean(report.photoUrl),
    },

    tags: [],

    dashboardFlags: {
      isDuplicateCandidate: false,
      requiresReview: report.status === "Pending Validation",
      isEscalated: false,
    },

    ai: report.ai ?? null,
    departmentFilter: report.departmentFilter ?? "None",
    alertState: report.alertState ?? "new",
    acknowledgedAt: report.acknowledgedAt ?? null,
    dispatchedAt: report.dispatchedAt ?? null,
    resolvedAt: report.resolvedAt ?? null,
    verifiedBy: report.verifiedBy ?? null,
    assignedResponderId: null,
    assignedAgency: null,
    sourceChannel: isOffline ? "offline_sync" : "online_direct",
  };
}

// ---------------------------------------------------------------------------
// LocalIncidentReport → Legacy DisasterReport
// ---------------------------------------------------------------------------

export function localReportToLegacy(report: LocalIncidentReport): DisasterReport {
  const damageType = incidentTypeToDamageType(report.incident.type);
  const severity = toLegacySeverity(report.incident.severity);

  let status: DisasterReport["status"];
  if (report.alertState === "resolved" || report.reportStatus === "synced") {
    status = "Resolved";
  } else if (report.alertState === "acknowledged" || report.alertState === "dispatched") {
    status = "Verified";
  } else {
    status = "Pending Validation";
  }

  return {
    id: report.id,
    photoUrl: "",
    damageType,
    severity,
    description: report.incident.description,
    lat: report.location.lat ?? 0,
    lng: report.location.lng ?? 0,
    locationName: report.location.addressText ?? undefined,
    timestamp: report.createdAt,
    status,
    departmentFilter: report.departmentFilter,
    ai: report.ai ?? undefined,
    isOfflineQueued: report.syncStatus === "local_only",
    submittedBy: report.createdByUserId,
    alertState: report.alertState,
    acknowledgedAt: report.acknowledgedAt,
    dispatchedAt: report.dispatchedAt,
    resolvedAt: report.resolvedAt,
    verifiedBy: report.verifiedBy,
  };
}

// ---------------------------------------------------------------------------
// Legacy QueuedReportDraft → LocalIncidentReport
// ---------------------------------------------------------------------------

export function legacyDraftToLocal(
  draft: QueuedReportDraft,
  originDeviceId: string = "unknown-device",
): LocalIncidentReport {
  const resolvedDamageType =
    draft.damageType === "Auto/AI" && draft.ai ? draft.ai.damageType : draft.damageType === "Auto/AI" ? "Other" : draft.damageType;

  return {
    id: draft.id,
    createdAt: draft.timestamp,
    updatedAt: draft.timestamp,
    originDeviceId,
    createdByUserId: draft.submittedBy ?? null,
    createdByRole: "citizen",

    reportStatus: "queued",
    syncStatus: "local_only",
    relayStatus: "not_attempted",

    retryCount: 0,
    lastRelayAttemptAt: null,
    lastSyncAttemptAt: null,
    lastErrorMessage: null,

    incident: {
      type: damageTypeToIncidentType(resolvedDamageType as DamageType),
      subtype: null,
      severity: draft.ai ? toNewSeverity(draft.ai.severity) : "medium",
      title: resolvedDamageType,
      description: draft.description,
      occurredAt: draft.timestamp,
    },

    location: {
      lat: draft.lat,
      lng: draft.lng,
      addressText: draft.locationName || null,
      parish: null,
      landmark: null,
      isGpsCaptured: true,
    },

    reporter: {
      name: null,
      phone: null,
      organization: null,
      isAnonymous: !draft.submittedBy,
    },

    media: {
      photos: [],
      hasPhoto: Boolean(draft.imageDataUrl),
    },

    tags: [],

    dashboardFlags: {
      isDuplicateCandidate: false,
      requiresReview: true,
      isEscalated: false,
    },

    ai: draft.ai ?? null,
    departmentFilter: draft.ai?.suggestedDepartment ?? "None",
    alertState: "new",
    acknowledgedAt: null,
    dispatchedAt: null,
    resolvedAt: null,
    verifiedBy: null,
    assignedResponderId: null,
    assignedAgency: null,
    sourceChannel: "offline_sync",
  };
}
