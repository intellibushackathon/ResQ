import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AccessGate } from "./components/auth/AccessGate";
import { Badge } from "./components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/Card";

const AppLayout = lazy(() =>
  import("./components/layout/AppLayout").then((module) => ({ default: module.AppLayout })),
);
const AdminLayout = lazy(() =>
  import("./components/layout/AdminLayout").then((module) => ({ default: module.AdminLayout })),
);
const Login = lazy(() => import("./pages/Login").then((module) => ({ default: module.Login })));
const MyReports = lazy(() =>
  import("./pages/MyReports").then((module) => ({ default: module.MyReports })),
);
const SafeZones = lazy(() =>
  import("./pages/SafeZones").then((module) => ({ default: module.SafeZones })),
);
const SubmitReport = lazy(() =>
  import("./pages/SubmitReport").then((module) => ({ default: module.SubmitReport })),
);
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((module) => ({ default: module.Dashboard })),
);
const AdminDashboard = lazy(() =>
  import("./pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })),
);
const AdminModeration = lazy(() =>
  import("./pages/admin/AdminModeration").then((module) => ({ default: module.AdminModeration })),
);
const ScanReport = lazy(() =>
  import("./pages/ScanReport").then((module) => ({ default: module.ScanReport })),
);


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
            The page code is split by route, so only the parts needed for the current screen are
            loaded first.
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
          <Route
            path="scan"
            element={
              <RouteBoundary>
                <ScanReport />
              </RouteBoundary>
            }
          />
          <Route
            path="dashboard"
            element={
              <AccessGate minimumRole="staff">
                <RouteBoundary>
                  <Dashboard />
                </RouteBoundary>
              </AccessGate>
            }
          />
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
          <Route
            index
            element={
              <RouteBoundary>
                <AdminDashboard />
              </RouteBoundary>
            }
          />
          <Route
            path="moderation"
            element={
              <RouteBoundary>
                <AdminModeration />
              </RouteBoundary>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
