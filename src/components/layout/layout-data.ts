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
    to: "/safe-zones",
    label: "Safe Zones",
    shortLabel: "Safe zones",
    description: "Surface shelters, assembly points, and fallback locations.",
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
    label: "Overview",
    shortLabel: "Overview",
    description: "Command center summary for leaders and coordinators.",
  },
  {
    to: "/admin/moderation",
    label: "Moderation",
    shortLabel: "Moderation",
    description: "Verify and route incoming incident reports.",
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
    path: "/safe-zones",
    title: "Safe zone directory",
    subtitle:
      "A navigation shell for shelter directories, assembly points, and fallback locations with room for route-specific safety content later.",
    eyebrow: "Public safety",
    category: "Public safety",
    status: "Shelter directory active",
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
    title: "Operations overview",
    subtitle: "Monitor incident volume, triage status, and dispatch field teams.",
    eyebrow: "Admin",
    category: "Operations",
    status: "Protected operations route",
  },
  {
    path: "/admin/moderation",
    title: "Moderation",
    subtitle: "Review pending reports, override AI classifications, and verify incidents.",
    eyebrow: "Admin",
    category: "Operations",
    status: "Protected operations route",
  },
];

export function getRouteMeta(pathname: string, section: ShellSection) {
  const routes = section === "public" ? publicRouteMeta : adminRouteMeta;
  return routes.find((route) => route.path === pathname) ?? routes[0];
}
