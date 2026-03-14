export type ReportStatus = "Pending Validation" | "Verified" | "Resolved";

export type Severity = "Critical" | "High" | "Medium" | "Low";

export type DepartmentFilter = "NWA" | "JPS" | "ODPEM" | "None";

export type DamageType =
  | "Flooding"
  | "Roof Collapse"
  | "Debris/Tree"
  | "Utility Damage"
  | "Other"
  | "Auto/AI";

export const REPORT_STATUS_STAGES: ReportStatus[] = ["Pending Validation", "Verified", "Resolved"];

export const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];

export const DEPARTMENT_ORDER: DepartmentFilter[] = ["NWA", "JPS", "ODPEM", "None"];

export const DAMAGE_TYPES: DamageType[] = [
  "Flooding",
  "Roof Collapse",
  "Debris/Tree",
  "Utility Damage",
  "Other",
  "Auto/AI",
];
