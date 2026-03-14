import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AccessGate } from "./components/auth/AccessGate";
import { Badge } from "./components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/Card";

const AppLayout = lazy(() =>
  import("./components/layout/AppLayout").then((module) => ({ default: module.AppLayout })),
);
const AdminLayout = lazy(() =>
  import("./components/layout/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const Alerts = lazy(() => import("./pages/Alerts").then((module) => ({ default: module.Alerts })));
const Login = lazy(() => import("./pages/Login").then((module) => ({ default: module.Login })));
const MyReports = lazy(() => import("./pages/MyReports").then((module) => ({ default: module.MyReports })));
const SafeZones = lazy(() => import("./pages/SafeZones").then((module) => ({ default: module.SafeZones })));
const SubmitReport = lazy(() =>
  import("./pages/SubmitReport").then((module) => ({ default: module.SubmitReport })),
);

type RouteDefinition = {
  path: string;
  title: string;
  subtitle: string;
  category: string;
  status: string;
};

const responderRoutes: RouteDefinition[] = [
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "Protected responder control center for verification, dispatch, and resolution workflows.",
    category: "Responder operations",
    status: "Restricted to responder and admin roles",
  },
];

const adminRoutes: RouteDefinition[] = [
  {
    path: "/admin",
    title: "Admin Dashboard",
    subtitle: "Operations center overview with metrics, queue summaries, and audit signals.",
    category: "Operations",
    status: "Restricted to admin role",
  },
  {
    path: "/admin/moderation",
    title: "Admin Moderation",
    subtitle: "Verification queue, severity overrides, and routing controls.",
    category: "Operations",
    status: "Restricted to admin role",
  },
  {
    path: "/admin/audit-logs",
    title: "Admin Audit Logs",
    subtitle: "Searchable activity timeline for operations and compliance review.",
    category: "Operations",
    status: "Restricted to admin role",
  },
  {
    path: "/admin/system-controls",
    title: "Admin System Controls",
    subtitle: "Feature toggles, privacy mode, lockdown controls, and operational switches.",
    category: "Operations",
    status: "Restricted to admin role",
  },
  {
    path: "/admin/team",
    title: "Admin Team",
    subtitle: "Operational roster and staff-status view.",
    category: "Operations",
    status: "Restricted to admin role",
  },
  {
    path: "/admin/settings",
    title: "Admin Settings",
    subtitle: "AI, messaging, geolocation, and server configuration surfaces.",
    category: "Operations",
    status: "Restricted to admin role",
  },
];

type PlaceholderSceneProps = {
  route: RouteDefinition;
  section: "public" | "admin";
};

function PlaceholderScene({ route, section }: PlaceholderSceneProps) {
  const accentBadge = section === "admin" ? "danger" : "default";
  const secondaryBadge = section === "admin" ? "warning" : "success";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={accentBadge}>{route.category}</Badge>
            <Badge variant="outline">{route.status}</Badge>
            <Badge variant={secondaryBadge}>
              {section === "admin" ? "Operations access" : "Responder access"}
            </Badge>
          </div>
          <CardTitle className="text-3xl sm:text-[2rem]">{route.title}</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">{route.subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <p className="section-label mb-3">Experience intent</p>
            <p className="text-sm leading-7 text-slate-300">
              This route is protected and ready to receive operational workflow components in its dedicated scope.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
            <p className="section-label mb-3">Access model</p>
            <p className="text-sm leading-7 text-slate-300">
              Role gating is active now, so only the correct session types can reach this shell.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-brand-500/60 px-5 py-3 text-sm font-semibold text-white opacity-70"
          >
            Protected action surface
          </button>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 opacity-70"
          >
            Review module
          </button>
        </CardFooter>
      </Card>

      <Card className="p-6">
        <CardHeader>
          <Badge variant="outline" className="w-fit">
            Route instrumentation
          </Badge>
          <CardTitle>Protected module shell</CardTitle>
          <CardDescription>
            This screen is now behind role-aware access control and ready for workflow-specific implementation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm text-slate-400">Access posture</p>
            <p className="mt-2 text-lg font-semibold text-white">{route.status}</p>
          </div>
          <div className="rounded-[22px] border border-dashed border-white/10 bg-transparent p-4 text-sm leading-7 text-slate-300">
            The route shell remains available for future responder and admin feature work without changing the guard pattern.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Card className="p-6 sm:p-7">
        <CardHeader>
          <Badge variant="outline">Loading route</Badge>
          <CardTitle className="text-3xl sm:text-[2rem]">Preparing the next view</CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            This route is being loaded on demand to keep the initial bundle smaller.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm leading-7 text-slate-300">
            The page code is split by route, so only the parts needed for the current screen are loaded first.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RouteBoundary({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RouteBoundary>
              <AppLayout />
            </RouteBoundary>
          }
        >
          <Route
            index
            element={
              <RouteBoundary>
                <SubmitReport />
              </RouteBoundary>
            }
          />
          <Route
            path="my-reports"
            element={
              <RouteBoundary>
                <MyReports />
              </RouteBoundary>
            }
          />
          <Route
            path="alerts"
            element={
              <RouteBoundary>
                <Alerts />
              </RouteBoundary>
            }
          />
          <Route
            path="safe-zones"
            element={
              <RouteBoundary>
                <SafeZones />
              </RouteBoundary>
            }
          />
          <Route
            path="login"
            element={
              <RouteBoundary>
                <Login />
              </RouteBoundary>
            }
          />
          {responderRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path.slice(1)}
              element={
                <AccessGate minimumRole="staff">
                  <PlaceholderScene route={route} section="public" />
                </AccessGate>
              }
            />
          ))}
        </Route>

        <Route
          path="/admin"
          element={
            <AccessGate minimumRole="admin">
              <RouteBoundary>
                <AdminLayout />
              </RouteBoundary>
            </AccessGate>
          }
        >
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
