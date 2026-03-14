import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/layout/AdminLayout";
import { AppLayout } from "./components/layout/AppLayout";
import { Badge } from "./components/ui/Badge";
import { Button } from "./components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/Card";

type RouteDefinition = {
  path: string;
  title: string;
  subtitle: string;
  category: string;
  status: string;
};

const publicRoutes: RouteDefinition[] = [
  {
    path: "/",
    title: "Submit Report",
    subtitle: "Citizen incident submission with media, GPS, offline queue, and AI triage hooks.",
    category: "Citizen reporting",
    status: "Ready for UI feature build-out",
  },
  {
    path: "/my-reports",
    title: "My Reports",
    subtitle: "Citizen incident history with status-based browsing and incident detail affordances.",
    category: "Citizen reporting",
    status: "Prepared for case history components",
  },
  {
    path: "/alerts",
    title: "Alerts",
    subtitle: "Critical unresolved incident feed for citizens and field responders.",
    category: "Public alerts",
    status: "Prepared for live advisory feeds",
  },
  {
    path: "/safe-zones",
    title: "Safe Zones",
    subtitle: "Static shelter and fallback-location directory for disaster response.",
    category: "Public safety",
    status: "Prepared for location cards and filters",
  },
  {
    path: "/login",
    title: "Login",
    subtitle: "Preview-mode and Supabase auth bridge for citizens, staff, and admin users.",
    category: "Access control",
    status: "Prepared for auth-facing components",
  },
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "Protected responder control center for verification, dispatch, and resolution workflows.",
    category: "Responder operations",
    status: "Prepared for responder tooling",
  },
];

const adminRoutes: RouteDefinition[] = [
  {
    path: "/admin",
    title: "Admin Dashboard",
    subtitle: "Operations center overview with metrics, queue preview, and audit summaries.",
    category: "Operations",
    status: "Prepared for operations dashboards",
  },
  {
    path: "/admin/moderation",
    title: "Admin Moderation",
    subtitle: "Verification queue, severity overrides, and routing controls.",
    category: "Operations",
    status: "Prepared for moderation queues",
  },
  {
    path: "/admin/audit-logs",
    title: "Admin Audit Logs",
    subtitle: "Searchable activity timeline for operations and compliance review.",
    category: "Operations",
    status: "Prepared for audit timelines",
  },
  {
    path: "/admin/system-controls",
    title: "Admin System Controls",
    subtitle: "Feature toggles, privacy mode, lockdown controls, and operational switches.",
    category: "Operations",
    status: "Prepared for system control modules",
  },
  {
    path: "/admin/team",
    title: "Admin Team",
    subtitle: "Operational roster and staff-status view.",
    category: "Operations",
    status: "Prepared for roster and staffing modules",
  },
  {
    path: "/admin/settings",
    title: "Admin Settings",
    subtitle: "AI, messaging, geolocation, and server configuration surfaces.",
    category: "Operations",
    status: "Prepared for platform configuration",
  },
];

type PlaceholderSceneProps = {
  route: RouteDefinition;
  section: "public" | "admin";
};

function PlaceholderScene({ route, section }: PlaceholderSceneProps) {
  const accentBadge = section === "admin" ? "danger" : "default";
  const secondaryBadge = section === "admin" ? "warning" : "success";
  const firstMetric = section === "admin" ? "17 review items" : "3 queued for sync";
  const secondMetric = section === "admin" ? "4 active operators" : "12 public alerts indexed";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={accentBadge}>{route.category}</Badge>
            <Badge variant="outline">{route.status}</Badge>
            <Badge variant={secondaryBadge}>
              {section === "admin" ? "Operations-only shell" : "Public-ready shell"}
            </Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">{route.title}</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">{route.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <p className="section-label mb-3">Experience intent</p>
            <p className="text-sm leading-7 text-slate-300">
              This route now lives inside the shared shell system, with navigation, route-aware framing,
              reusable panels, and clear visual hierarchy ready for real feature work.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <p className="section-label mb-3">Phase guardrails</p>
            <p className="text-sm leading-7 text-slate-300">
              The implementation intentionally avoids auth, data fetching, mapping, and workflow logic to
              stay inside `INTELL-02`.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Primary action shell</Button>
          <Button variant="outline">Secondary review</Button>
        </CardFooter>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Placeholder route content
          </Badge>
          <CardTitle>Route instrumentation</CardTitle>
          <CardDescription>
            Intentional placeholder modules that preview how this screen can host future production features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-400">Active signal</p>
            <p className="mt-2 text-lg font-semibold text-white">{firstMetric}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-400">Supporting metric</p>
            <p className="mt-2 text-lg font-semibold text-white">{secondMetric}</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/10 bg-transparent p-4 text-sm leading-7 text-slate-300">
            Additional route components can land here next without changing the shell architecture.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          {publicRoutes.map((route) => (
            <Route
              key={route.path}
              index={route.path === "/"}
              path={route.path === "/" ? undefined : route.path.slice(1)}
              element={<PlaceholderScene route={route} section="public" />}
            />
          ))}
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          {adminRoutes.map((route) => (
            <Route
              key={route.path}
              index={route.path === "/admin"}
              path={route.path === "/admin" ? undefined : route.path.replace("/admin/", "")}
              element={<PlaceholderScene route={route} section="admin" />}
            />
          ))}
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
