export type ShellSection = "public" | "admin";

export type RouteMeta = {
  path: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  category: string;
  status: string;
};

export type NavItem = {
  to: string;
  label: string;
  shortLabel: string;
  description: string;
};

export const publicNavItems: NavItem[] = [
  {
    to: "/",
    label: "Submit Report",
    shortLabel: "Report",
    description: "Incident intake with offline-ready submission guidance.",
  },
  {
    to: "/my-reports",
    label: "My Reports",
    shortLabel: "My reports",
    description: "Track citizen submissions and response progress.",
  },
  {
    to: "/alerts",
    label: "Alerts",
    shortLabel: "Alerts",
    description: "Monitor live warnings and urgent public advisories.",
  },
  {
    to: "/safe-zones",
    label: "Safe Zones",
    shortLabel: "Safe zones",
    description: "Surface shelters, assembly points, and fallback locations.",
  },
  {
    to: "/login",
    label: "Login",
    shortLabel: "Login",
    description: "Secure account access and responder sign-in flows.",
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    shortLabel: "Dashboard",
    description: "Enter the responder workspace for coordination and dispatch.",
  },
];

export const adminNavItems: NavItem[] = [
  {
    to: "/admin",
    label: "Operations Overview",
    shortLabel: "Overview",
    description: "Command center summary for leaders and coordinators.",
  },
  {
    to: "/admin/moderation",
    label: "Moderation",
    shortLabel: "Moderation",
    description: "Triage queue tuning, verification, and escalation review.",
  },
  {
    to: "/admin/audit-logs",
    label: "Audit Logs",
    shortLabel: "Audit logs",
    description: "Review operator actions, routing, and system events.",
  },
  {
    to: "/admin/system-controls",
    label: "System Controls",
    shortLabel: "Controls",
    description: "Monitor operational safeguards and critical toggles.",
  },
  {
    to: "/admin/team",
    label: "Team",
    shortLabel: "Team",
    description: "Inspect staffing posture and duty readiness.",
  },
  {
    to: "/admin/settings",
    label: "Settings",
    shortLabel: "Settings",
    description: "Configure integrations, policy defaults, and thresholds.",
  },
  {
    to: "/admin/incident-map",
    label: "Incident Map",
    shortLabel: "Map",
    description: "Spatial heatmap view of incident distribution and severity.",
  },
  {
    to: "/admin/collaboration",
    label: "Collaboration",
    shortLabel: "Collab",
    description: "Cross-agency visibility and department coordination.",
  },
  {
    to: "/admin/resources",
    label: "Resources",
    shortLabel: "Resources",
    description: "Responder allocation, workload, and progression tracking.",
  },
];

export const publicRouteMeta: RouteMeta[] = [
  {
    path: "/",
    title: "Submit Incident Report",
    subtitle:
      "Collect visual evidence, lock the location, and push structured alerts into the response queue.",
    eyebrow: "Field capture",
    category: "Field capture",
    status: "Citizen access enabled",
  },
  {
    path: "/my-reports",
    title: "My reports timeline",
    subtitle:
      "A route-aware shell for reviewing previous submissions, monitoring report status, and surfacing follow-up actions when case logic arrives.",
    eyebrow: "Public reporting history",
    category: "Citizen reporting",
    status: "Report history available",
  },
  {
    path: "/alerts",
    title: "Critical alerts center",
    subtitle:
      "An intentional alert-reading environment for residents and field teams to scan urgent notices, priority zones, and public safety directives.",
    eyebrow: "Public alerts",
    category: "Public alerts",
    status: "Critical feed active",
  },
  {
    path: "/safe-zones",
    title: "Safe zone directory",
    subtitle:
      "A navigation shell for shelter directories, assembly points, and fallback locations with room for route-specific safety content later.",
    eyebrow: "Public safety",
    category: "Public safety",
    status: "Shelter directory active",
  },
  {
    path: "/login",
    title: "Secure access entry",
    subtitle:
      "A composed account entry surface for citizens, responders, and operators across the live Supabase-backed session flow.",
    eyebrow: "Access control",
    category: "Access control",
    status: "Authentication active",
  },
  {
    path: "/dashboard",
    title: "Responder dashboard shell",
    subtitle:
      "A mission-ready responder shell that can host verification, dispatch, and coordination tools once operational workflows are implemented.",
    eyebrow: "Responder operations",
    category: "Responder operations",
    status: "Protected responder route",
  },
];

export const adminRouteMeta: RouteMeta[] = [
  {
    path: "/admin",
    title: "Operations command shell",
    subtitle:
      "A distinct operations-focused shell for supervisors and incident leads, tuned for monitoring platform health, queue pressure, and readiness.",
    eyebrow: "Admin application tree",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/moderation",
    title: "Moderation control room",
    subtitle:
      "A high-signal review space for verification queues, severity overrides, and triage routing without introducing the workflow logic yet.",
    eyebrow: "Admin moderation",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/audit-logs",
    title: "Operational audit logs",
    subtitle:
      "A structured shell for action history, compliance review, and operator traceability across the administration workspace.",
    eyebrow: "Admin audit logs",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/system-controls",
    title: "System safeguards and controls",
    subtitle:
      "A distinct control surface for feature toggles, policy states, and operational safeguards with room for future critical actions.",
    eyebrow: "Admin system controls",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/team",
    title: "Team readiness board",
    subtitle:
      "A staffing and readiness shell for duty rotations, team status, and coordination signals across emergency operations.",
    eyebrow: "Admin team",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/settings",
    title: "Administrative settings shell",
    subtitle:
      "A polished administration settings route for platform-level configuration, thresholds, and integration setup.",
    eyebrow: "Admin settings",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/incident-map",
    title: "Incident distribution heatmap",
    subtitle:
      "Spatial visualization of incident density, severity concentration, and geographic distribution patterns across reporting zones.",
    eyebrow: "Admin spatial view",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/collaboration",
    title: "Cross-agency collaboration",
    subtitle:
      "Organization-to-organization visibility with department-level incident grouping and cross-agency coordination support.",
    eyebrow: "Admin collaboration",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/resources",
    title: "Resource allocation dashboard",
    subtitle:
      "Human resource allocation, responder workload distribution, and end-to-end incident progression tracking.",
    eyebrow: "Admin resources",
    category: "Operations",
    status: "Protected operations route",
  },
];

export function getRouteMeta(pathname: string, section: ShellSection) {
  const routes = section === "public" ? publicRouteMeta : adminRouteMeta;
  return routes.find((route) => route.path === pathname) ?? routes[0];
}
