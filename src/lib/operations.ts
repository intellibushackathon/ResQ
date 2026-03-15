import {
  AUTO_CONFIRM_CONFIDENCE_THRESHOLD,
  SEVERITY_WEIGHT,
  type AdminAuditEntry,
  type DisasterReport,
} from "./reporting";

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

export function severityWeight(severity: string | undefined): number {
  if (severity === "Critical") return SEVERITY_WEIGHT.Critical;
  if (severity === "High") return SEVERITY_WEIGHT.High;
  if (severity === "Medium") return SEVERITY_WEIGHT.Medium;
  if (severity === "Low") return SEVERITY_WEIGHT.Low;
  return 0;
}

// ---------------------------------------------------------------------------
// Report filter helpers
// ---------------------------------------------------------------------------

export function sortReportsByPriority(reports: DisasterReport[]): DisasterReport[] {
  return [...reports].sort((a, b) => {
    const weightDiff = severityWeight(b.severity) - severityWeight(a.severity);
    if (weightDiff !== 0) return weightDiff;
    return Date.parse(b.timestamp) - Date.parse(a.timestamp);
  });
}

export function getActiveReports(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter((r) => r.status !== "Resolved");
}

export function getPendingReports(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter((r) => r.status === "Pending Validation");
}

export function getVerifiedReports(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter((r) => r.status === "Verified");
}

export function getResolvedReports(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter((r) => r.status === "Resolved");
}

// ---------------------------------------------------------------------------
// Auto-confirm helper
// ---------------------------------------------------------------------------

export function shouldAutoConfirm(report: DisasterReport, autoConfirmEnabled: boolean): boolean {
  return autoConfirmEnabled && (report.ai?.confidence ?? 0) >= AUTO_CONFIRM_CONFIDENCE_THRESHOLD;
}

/**
 * Alias used by AdminModeration — identical semantics to shouldAutoConfirm.
 */
export function isAutoConfirmEligible(report: DisasterReport, autoConfirmEnabled: boolean): boolean {
  return shouldAutoConfirm(report, autoConfirmEnabled);
}

// ---------------------------------------------------------------------------
// Queue helpers used by Dashboard and AdminModeration
// ---------------------------------------------------------------------------

/** All non-resolved reports, sorted by severity then newest timestamp. */
export function getActiveResponderQueue(reports: DisasterReport[]): DisasterReport[] {
  return sortReportsByPriority(getActiveReports(reports));
}

/** Pending-only queue used by the moderation surface. */
export function getPendingValidationQueue(reports: DisasterReport[]): DisasterReport[] {
  return sortReportsByPriority(getPendingReports(reports));
}

/** Critical-severity non-resolved reports. */
export function getCriticalActiveReports(reports: DisasterReport[]): DisasterReport[] {
  return getActiveReports(reports).filter((r) => r.severity === "Critical");
}

/** Reports currently in dispatched alert state. */
export function getDispatchedReports(reports: DisasterReport[]): DisasterReport[] {
  return reports.filter((r) => r.alertState === "dispatched");
}

// ---------------------------------------------------------------------------
// Badge variant helpers
// ---------------------------------------------------------------------------

export function severityBadgeVariant(
  severity: string | undefined,
): "danger" | "warning" | "default" | "outline" {
  if (severity === "Critical") return "danger";
  if (severity === "High") return "warning";
  if (severity === "Medium") return "default";
  return "outline";
}

export function alertStateBadgeVariant(
  alertState: string | undefined | null,
): "success" | "warning" | "default" | "outline" {
  if (alertState === "dispatched") return "success";
  if (alertState === "acknowledged") return "warning";
  if (alertState === "resolved") return "outline";
  return "default";
}

export function auditLevelBadgeVariant(
  level: AdminAuditEntry["level"],
): "danger" | "warning" | "outline" {
  if (level === "error") return "danger";
  if (level === "warning") return "warning";
  return "outline";
}

// ---------------------------------------------------------------------------
// Timestamp formatting
// ---------------------------------------------------------------------------

export function formatAbsoluteTimestamp(iso: string | null | undefined): string {
  if (!iso) return "—";

  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// Operations team roster (hardcoded — used by AdminTeam)
// ---------------------------------------------------------------------------

export type TeamMember = {
  id: string;
  name: string;
  title: string;
  org: string;
  status: "On duty" | "Standby" | "Off duty";
  shift: string;
  specialty: string;
  channel: string;
  base: string;
};

export const OPERATIONS_TEAM: TeamMember[] = [
  {
    id: "ops-001",
    name: "Marcia Campbell",
    title: "Incident Commander",
    org: "ODPEM",
    status: "On duty",
    shift: "Day shift (0600–1800)",
    specialty: "Mass casualty coordination",
    channel: "UHF Channel 4",
    base: "Kingston EOC",
  },
  {
    id: "ops-002",
    name: "Devon Richards",
    title: "Field Coordinator",
    org: "JPS",
    status: "On duty",
    shift: "Day shift (0600–1800)",
    specialty: "Utility restoration",
    channel: "UHF Channel 6",
    base: "Spanish Town Depot",
  },
  {
    id: "ops-003",
    name: "Tanya Morrison",
    title: "Communications Officer",
    org: "NWA",
    status: "Standby",
    shift: "Night shift (1800–0600)",
    specialty: "Road and infrastructure triage",
    channel: "VHF Channel 9",
    base: "May Pen District Office",
  },
  {
    id: "ops-004",
    name: "Andre Thompson",
    title: "Logistics Lead",
    org: "ODPEM",
    status: "Standby",
    shift: "Night shift (1800–0600)",
    specialty: "Resource allocation and supply",
    channel: "UHF Channel 4",
    base: "Kingston EOC",
  },
  {
    id: "ops-005",
    name: "Simone Clarke",
    title: "Medical Response Lead",
    org: "Ministry of Health",
    status: "Off duty",
    shift: "Rotating (72-hour cycle)",
    specialty: "Medical triage and evacuation",
    channel: "VHF Channel 16",
    base: "Kingston Public Hospital",
  },
];
