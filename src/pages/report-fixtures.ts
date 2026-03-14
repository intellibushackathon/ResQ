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

export type AIAnalysis = {
  damageType: DamageType;
  severity: Severity;
  confidence: number;
  summary: string;
  rationale: string;
  hazards: string[];
  suggestedActions: string[];
  suggestedDepartment: DepartmentFilter;
};

export type DisasterReport = {
  id: string;
  photoUrl: string;
  damageType: DamageType;
  severity: Severity;
  description: string;
  lat: number;
  lng: number;
  locationName: string;
  timestamp: string;
  status: ReportStatus;
  departmentFilter: DepartmentFilter;
  ai: AIAnalysis;
  alertState: "None" | "Watch" | "Emergency";
};

export const reportFixtures: DisasterReport[] = [
  {
    id: "RQ-10482",
    photoUrl: "https://images.unsplash.com/photo-1470290378698-263fa7ca9d32?auto=format&fit=crop&w=600&q=60",
    damageType: "Flooding",
    severity: "Critical",
    description: "Water level rising quickly near the Half-Way Tree transport corridor.",
    lat: 18.0107,
    lng: -76.7992,
    locationName: "Half-Way Tree, Kingston",
    timestamp: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    status: "Pending Validation",
    departmentFilter: "ODPEM",
    ai: {
      damageType: "Flooding",
      severity: "Critical",
      confidence: 0.91,
      summary: "Urban flood channel overflow with active road-level inundation.",
      rationale: "Depth indicators and debris drift suggest rapid flow and poor drainage.",
      hazards: ["Road impassable", "Vehicle stall risk", "Electrical panel exposure"],
      suggestedActions: ["Issue traffic diversion", "Deploy pump crew", "Alert nearby shelters"],
      suggestedDepartment: "ODPEM",
    },
    alertState: "Emergency",
  },
  {
    id: "RQ-10461",
    photoUrl: "https://images.unsplash.com/photo-1523897056079-5553b57112f4?auto=format&fit=crop&w=600&q=60",
    damageType: "Roof Collapse",
    severity: "High",
    description: "Partial roof failure after sustained winds in Portmore sector.",
    lat: 17.9674,
    lng: -76.874,
    locationName: "Portmore, St. Catherine",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    status: "Verified",
    departmentFilter: "NWA",
    ai: {
      damageType: "Roof Collapse",
      severity: "High",
      confidence: 0.84,
      summary: "Structural roof compromise affecting one dwelling unit.",
      rationale: "Visible truss shift and exposed interior indicate urgent stabilization need.",
      hazards: ["Falling debris", "Rain ingress", "Live wiring exposure"],
      suggestedActions: ["Secure perimeter", "Cover exposed section", "Dispatch structural inspection"],
      suggestedDepartment: "NWA",
    },
    alertState: "Watch",
  },
  {
    id: "RQ-10399",
    photoUrl: "https://images.unsplash.com/photo-1604731688061-59595f19f9c3?auto=format&fit=crop&w=600&q=60",
    damageType: "Debris/Tree",
    severity: "Critical",
    description: "Large downed tree blocking both lanes near Spanish Town bypass.",
    lat: 17.9927,
    lng: -76.9569,
    locationName: "Spanish Town Bypass",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: "Verified",
    departmentFilter: "JPS",
    ai: {
      damageType: "Debris/Tree",
      severity: "Critical",
      confidence: 0.89,
      summary: "Major roadway blockage with probable line-contact risk.",
      rationale: "Canopy and trunk placement suggest lane closure and utility interruption.",
      hazards: ["Blocked emergency access", "Potential line strike", "Secondary collisions"],
      suggestedActions: ["Close segment", "Send cutting crew", "Coordinate utility safety check"],
      suggestedDepartment: "JPS",
    },
    alertState: "Emergency",
  },
  {
    id: "RQ-10310",
    photoUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=600&q=60",
    damageType: "Utility Damage",
    severity: "Medium",
    description: "Damaged utility pole secured and power restored after local outage.",
    lat: 18.0043,
    lng: -76.7682,
    locationName: "Harbour View, Kingston",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    status: "Resolved",
    departmentFilter: "JPS",
    ai: {
      damageType: "Utility Damage",
      severity: "Medium",
      confidence: 0.76,
      summary: "Pole impact event completed with temporary stabilization.",
      rationale: "Repair indicators and crew marks show closure with low residual risk.",
      hazards: ["Residual cable sag"],
      suggestedActions: ["Schedule permanent replacement"],
      suggestedDepartment: "JPS",
    },
    alertState: "None",
  },
];

