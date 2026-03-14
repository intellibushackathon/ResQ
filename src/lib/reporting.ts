export type DamageType = "Flooding" | "Roof Collapse" | "Debris/Tree" | "Utility Damage" | "Other";

export type DamageTypeOption = DamageType | "Auto/AI";

export type Severity = "Critical" | "High" | "Medium" | "Low";

export type ReportStatus = "Pending Validation" | "Verified" | "Resolved";

export type AlertState = "new" | "acknowledged" | "dispatched" | "resolved";

export type DepartmentFilter = "NWA" | "JPS" | "ODPEM" | "None";

export type AIProvider = "openrouter" | "proxy" | "simulation";

export type AdminSettingKey =
  | "privacyMode"
  | "autoConfirm"
  | "smsAlerts"
  | "rateLimit"
  | "lockdownMode";

export type AuditLogLevel = "info" | "warning" | "error";

export type ReportAIAnalysis = {
  damageType: DamageType;
  severity: Severity;
  confidence: number;
  summary: string;
  rationale: string;
  hazards: string[];
  suggestedDepartment: DepartmentFilter;
  suggestedActions: string[];
  provider: AIProvider;
  model: string;
  analyzedAt: string;
  rawError?: string | null;
};

export type DisasterReport = {
  id: string;
  photoUrl: string;
  photoPath?: string | null;
  damageType?: DamageType;
  severity?: Severity;
  description: string;
  lat: number;
  lng: number;
  locationName?: string;
  timestamp: string;
  status: ReportStatus;
  departmentFilter?: DepartmentFilter;
  ai?: ReportAIAnalysis;
  isOfflineQueued?: boolean;
  submittedBy?: string | null;
  alertState?: AlertState;
  acknowledgedAt?: string | null;
  dispatchedAt?: string | null;
  resolvedAt?: string | null;
  verifiedBy?: string | null;
};

export type ReportSubmissionInput = {
  photoFile: File;
  damageType: DamageTypeOption;
  description: string;
  lat: number;
  lng: number;
  locationName?: string;
  urgentAssist: boolean;
  submittedBy?: string | null;
};

export type QueuedReportDraft = {
  id: string;
  imageDataUrl: string | null;
  imageName: string;
  imageType: string;
  damageType: DamageTypeOption;
  description: string;
  lat: number;
  lng: number;
  locationName: string;
  urgentAssist: boolean;
  timestamp: string;
  submittedBy?: string | null;
  ai: ReportAIAnalysis;
};

export type ReportSubmissionResult = {
  id: string;
  queued: boolean;
  report: DisasterReport;
};

export type AdminSettings = {
  privacyMode: boolean;
  autoConfirm: boolean;
  smsAlerts: boolean;
  rateLimit: number;
  lockdownMode: boolean;
};

export type FlexibleSystemSettingRow = Record<string, unknown>;

export type FlexibleAuditLogRow = Record<string, unknown>;

export type AdminAuditEntry = {
  id: string;
  title: string;
  detail: string;
  level: AuditLogLevel;
  createdAt: string;
};

export const DAMAGE_TYPES: DamageTypeOption[] = [
  "Flooding",
  "Roof Collapse",
  "Debris/Tree",
  "Utility Damage",
  "Other",
  "Auto/AI",
];

export const STORABLE_DAMAGE_TYPES: DamageType[] = [
  "Flooding",
  "Roof Collapse",
  "Debris/Tree",
  "Utility Damage",
  "Other",
];

export const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];

export const REPORT_STATUS_STAGES: ReportStatus[] = ["Pending Validation", "Verified", "Resolved"];

export const ALERT_STATE_ORDER: AlertState[] = ["new", "acknowledged", "dispatched", "resolved"];

export const DEPARTMENT_ORDER: DepartmentFilter[] = ["NWA", "JPS", "ODPEM", "None"];

export const DEFAULT_LOCATION_LABEL = "Pinned Incident Location";

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  privacyMode: false,
  autoConfirm: false,
  smsAlerts: false,
  rateLimit: 72,
  lockdownMode: false,
};

export const AUTO_CONFIRM_CONFIDENCE_THRESHOLD = 0.95;

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const DAMAGE_TYPE_TO_DB: Record<DamageType, string> = {
  Flooding: "flooding",
  "Roof Collapse": "roof_collapse",
  "Debris/Tree": "debris_tree",
  "Utility Damage": "utility_damage",
  Other: "other",
};

const DAMAGE_TYPE_FROM_DB: Record<string, DamageType> = {
  flooding: "Flooding",
  roof_collapse: "Roof Collapse",
  debris_tree: "Debris/Tree",
  utility_damage: "Utility Damage",
  other: "Other",
};

const SEVERITY_TO_DB: Record<Severity, string> = {
  Critical: "critical",
  High: "high",
  Medium: "medium",
  Low: "low",
};

const SEVERITY_FROM_DB: Record<string, Severity> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const STATUS_TO_DB: Record<ReportStatus, string> = {
  "Pending Validation": "pending_validation",
  Verified: "verified",
  Resolved: "resolved",
};

const STATUS_FROM_DB: Record<string, ReportStatus> = {
  pending_validation: "Pending Validation",
  verified: "Verified",
  resolved: "Resolved",
};

const DEPARTMENT_TO_DB: Record<DepartmentFilter, string> = {
  NWA: "nwa",
  JPS: "jps",
  ODPEM: "odpem",
  None: "none",
};

const DEPARTMENT_FROM_DB: Record<string, DepartmentFilter> = {
  nwa: "NWA",
  jps: "JPS",
  odpem: "ODPEM",
  none: "None",
};

export function isDamageTypeOption(value: unknown): value is DamageTypeOption {
  return typeof value === "string" && DAMAGE_TYPES.includes(value as DamageTypeOption);
}

export function isDamageType(value: unknown): value is DamageType {
  return typeof value === "string" && STORABLE_DAMAGE_TYPES.includes(value as DamageType);
}

export function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && SEVERITY_ORDER.includes(value as Severity);
}

export function isReportStatus(value: unknown): value is ReportStatus {
  return typeof value === "string" && REPORT_STATUS_STAGES.includes(value as ReportStatus);
}

export function isDepartmentFilter(value: unknown): value is DepartmentFilter {
  return typeof value === "string" && DEPARTMENT_ORDER.includes(value as DepartmentFilter);
}

export function toDbDamageType(value: DamageType) {
  return DAMAGE_TYPE_TO_DB[value];
}

export function fromDbDamageType(value: string | null | undefined): DamageType | undefined {
  if (!value) return undefined;
  return DAMAGE_TYPE_FROM_DB[value] ?? undefined;
}

export function toDbSeverity(value: Severity) {
  return SEVERITY_TO_DB[value];
}

export function fromDbSeverity(value: string | null | undefined): Severity | undefined {
  if (!value) return undefined;
  return SEVERITY_FROM_DB[value] ?? undefined;
}

export function toDbReportStatus(value: ReportStatus) {
  return STATUS_TO_DB[value];
}

export function fromDbReportStatus(value: string | null | undefined): ReportStatus {
  if (!value) return "Pending Validation";
  return STATUS_FROM_DB[value] ?? "Pending Validation";
}

export function toDbDepartmentFilter(value: DepartmentFilter) {
  return DEPARTMENT_TO_DB[value];
}

export function fromDbDepartmentFilter(value: string | null | undefined): DepartmentFilter | undefined {
  if (!value) return undefined;
  return DEPARTMENT_FROM_DB[value] ?? undefined;
}

export function resolveSubmittedDamageType(
  selectedDamageType: DamageTypeOption,
  aiAnalysis: Pick<ReportAIAnalysis, "damageType">,
) {
  return selectedDamageType === "Auto/AI" ? aiAnalysis.damageType : selectedDamageType;
}

export function getReportTimestampValue(report: Pick<DisasterReport, "timestamp">) {
  const value = Date.parse(report.timestamp);
  return Number.isFinite(value) ? value : 0;
}

export function sortReportsByPriority(reports: DisasterReport[]) {
  return [...reports].sort((left, right) => {
    const leftSeverity = left.severity ? SEVERITY_WEIGHT[left.severity] : 0;
    const rightSeverity = right.severity ? SEVERITY_WEIGHT[right.severity] : 0;
    if (rightSeverity !== leftSeverity) {
      return rightSeverity - leftSeverity;
    }

    return getReportTimestampValue(right) - getReportTimestampValue(left);
  });
}

export function getProgressPercent(status: ReportStatus) {
  const idx = REPORT_STATUS_STAGES.indexOf(status);
  return ((idx + 1) / REPORT_STATUS_STAGES.length) * 100;
}

export function formatTimeAgo(iso: string) {
  const value = Date.parse(iso);
  if (!Number.isFinite(value)) return "—";

  const diffMs = Date.now() - value;
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function toDisplayCoordinate(value: number) {
  return value.toFixed(6);
}

export function createClientReportId(prefix = "resq") {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${suffix}`;
}

export function createOfflineReportFromDraft(draft: QueuedReportDraft): DisasterReport {
  const damageType = resolveSubmittedDamageType(draft.damageType, draft.ai);

  return {
    id: draft.id,
    photoUrl: draft.imageDataUrl ?? "",
    damageType,
    severity: draft.ai.severity,
    description: draft.description,
    lat: draft.lat,
    lng: draft.lng,
    locationName: draft.locationName,
    timestamp: draft.timestamp,
    status: "Pending Validation",
    departmentFilter: draft.ai.suggestedDepartment,
    ai: draft.ai,
    isOfflineQueued: true,
    submittedBy: draft.submittedBy ?? null,
    alertState: "new",
    acknowledgedAt: null,
    dispatchedAt: null,
    resolvedAt: null,
    verifiedBy: null,
  };
}

export function mergeReportsById(...collections: DisasterReport[][]) {
  const map = new Map<string, DisasterReport>();

  for (const collection of collections) {
    for (const report of collection) {
      const existing = map.get(report.id);
      map.set(report.id, existing ? { ...existing, ...report } : report);
    }
  }

  return Array.from(map.values());
}

export function statusBadgeVariant(status: ReportStatus): "warning" | "default" | "success" {
  if (status === "Pending Validation") return "warning";
  if (status === "Resolved") return "success";
  return "default";
}
