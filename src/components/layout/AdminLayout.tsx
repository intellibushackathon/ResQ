import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { BrandMark } from "./BrandMark";
import { getRouteMeta, adminNavItems } from "./layout-data";
import { cn } from "../../lib/utils";
import { roleDisplayLabel, useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname, "admin");
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const loadAdminData = useReportStore((state) => state.loadAdminData);
  const reports = useReportStore((state) => state.reports);
  const isAdminDataLoading = useReportStore((state) => state.isAdminDataLoading);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(255,91,115,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(36,145,255,0.14),transparent_32%),linear-gradient(180deg,#07101d_0%,#081423_45%,#050c16_100%)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto grid max-w-[1500px] gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-[32px] border border-danger-400/10 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.34)]">
          <div className="flex justify-center">
            <BrandMark className="h-auto w-[240px] max-w-full drop-shadow-[0_10px_30px_rgba(36,145,255,0.16)]" />
          </div>
          <p className="mt-3 text-xs uppercase tracking-[0.26em] text-danger-100/75">Administrative shell</p>

          <Card className="mt-6 border-danger-400/15 bg-danger-500/8 p-4">
            <CardHeader className="mb-3 gap-1">
              <Badge variant="danger" className="w-fit">
                Elevated context
              </Badge>
              <CardTitle className="text-lg">Operations posture</CardTitle>
              <CardDescription>
                Separate visual tone for command, moderation, and system control routes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-slate-300">Total reports</span>
                <span className="font-semibold text-white">{reports.length}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span className="text-slate-300">Admin data</span>
                <span className="font-semibold text-white">
                  {isAdminDataLoading ? "Loading..." : "Ready"}
                </span>
              </div>
            </CardContent>
          </Card>

          <nav className="mt-6 space-y-2">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "block rounded-[22px] border px-4 py-3 transition-all duration-200",
                    isActive
                      ? "border-danger-400/30 bg-danger-500/10 shadow-[0_16px_34px_rgba(255,91,115,0.12)]"
                      : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]",
                  )
                }
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-white">{item.label}</span>
                    <span className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                      {item.shortLabel}
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-400">{item.description}</p>
                </div>
              </NavLink>
            ))}
          </nav>

          <Card className="mt-6 p-4">
            <CardHeader className="mb-3 gap-1">
              <Badge variant="outline" className="w-fit">
                Admin status
              </Badge>
              <CardTitle className="text-lg">{session?.displayName ?? "Admin session"}</CardTitle>
              <CardDescription>
                {session
                  ? `${roleDisplayLabel(session.role)} access on the Supabase backend.`
                  : "Administrative access is active for this route tree."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Role</span>
                <span className="font-semibold text-white">{roleDisplayLabel(session?.role ?? "admin")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Backend</span>
                <span className="font-semibold text-white">Supabase</span>
              </div>
              <Button variant="ghost" className="w-full justify-center border border-white/10" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </CardContent>
          </Card>
        </aside>

        <main className="min-w-0">
          <div className="glass-panel min-h-[calc(100vh-2rem)] rounded-[36px] border border-white/10 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8">
            <header className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="overflow-hidden border-danger-400/12 bg-[linear-gradient(135deg,rgba(255,91,115,0.14),rgba(9,24,43,0.8)_45%,rgba(36,145,255,0.08))] p-0">
                <div className="p-6 sm:p-8">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <Badge variant="danger">{routeMeta.category}</Badge>
                    <Badge variant={isOnline ? "success" : "warning"}>
                      {isOnline ? "Network stable" : "Offline mode"}
                    </Badge>
                  </div>
                  <p className="section-label text-danger-100/60">{routeMeta.eyebrow}</p>
                  <h1 className="mt-3 font-display text-4xl tracking-[-0.05em] text-white sm:text-5xl">
                    {routeMeta.title}
                  </h1>
                  <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
                    {routeMeta.subtitle}
                  </p>
                </div>
              </Card>

              <Card className="p-5">
                <CardHeader className="mb-4 gap-2">
                  <Badge variant="outline" className="w-fit">
                    Operational strip
                  </Badge>
                  <CardTitle>Command indicators</CardTitle>
                  <CardDescription>Distinct shell telemetry for operations-facing routes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300">Network</span>
                    <span className="font-semibold text-white">
                      {isOnline ? "Stable" : "Offline"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300">Reports loaded</span>
                    <span className="font-semibold text-white">{reports.length}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300">Shell status</span>
                    <span className="font-semibold text-white">{routeMeta.status}</span>
                  </div>
                </CardContent>
              </Card>
            </header>

            <section className="space-y-6">
              <Outlet />
            </section>

            <footer className="mt-8 flex flex-col gap-3 rounded-[28px] border border-danger-400/10 bg-danger-500/[0.05] px-5 py-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-danger-500 shadow-[0_0_18px_rgba(255,91,115,0.75)]" />
                <span>Admin shell remains isolated from the public experience and protected by role gating.</span>
              </div>
              <span className="text-slate-400">Operations layout | Protected route tree</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
