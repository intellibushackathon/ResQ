import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { BrandMark } from "./BrandMark";
import { getRouteMeta, adminNavItems } from "./layout-data";
import { cn } from "../../lib/utils";
import { roleDisplayLabel, useAuthStore } from "../../store/useAuthStore";
import { getActiveReports, getPendingReports } from "../../lib/operations";
import { useReportStore } from "../../store/useReportStore";

/* ------------------------------------------------------------------ */
/*  Nav icons                                                          */
/* ------------------------------------------------------------------ */

const NAV_ICONS: Record<string, string> = {
  "/admin":
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
  "/admin/moderation":
    "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname, "admin");

  const [mobileOpen, setMobileOpen] = useState(false);

  const session = useAuthStore((s) => s.session);
  const authReady = useAuthStore((s) => s.isReady);
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const signOut = useAuthStore((s) => s.signOut);
  const reports = useReportStore((s) => s.reports);
  const initializeReports = useReportStore((s) => s.initializeReports);

  const activeCount = useMemo(() => getActiveReports(reports).length, [reports]);
  const pendingCount = useMemo(() => getPendingReports(reports).length, [reports]);

  // Ensure auth is initialized (admin may navigate directly to /admin)
  useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  const sessionUid = session?.uid ?? null;
  const sessionRole = session?.role ?? "public";

  // Load reports + admin data once auth is ready
  useEffect(() => {
    if (!authReady) return;
    void initializeReports(
      sessionUid ? { uid: sessionUid, role: sessionRole } : null,
    );
  }, [authReady, initializeReports, sessionUid, sessionRole]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  /* ---- shared sidebar content ---- */

  function SidebarContent() {
    return (
      <>
        {/* Brand + label */}
        <div className="flex items-center gap-3 px-1">
          <BrandMark className="h-auto w-[100px] shrink-0 drop-shadow-[0_4px_12px_rgba(36,145,255,0.15)]" />
          <Badge variant="danger" className="text-[9px]">Admin</Badge>
        </div>

        {/* Navigation */}
        <nav className="mt-6 space-y-0.5">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "border border-danger-400/20 bg-danger-500/10 text-white"
                    : "border border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200",
                )
              }
            >
              <svg
                className="h-[18px] w-[18px] shrink-0 opacity-60 group-hover:opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={NAV_ICONS[item.to] ?? "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Quick stats */}
        <div className="mt-6 space-y-2">
          <p className="px-1 text-[10px] uppercase tracking-widest text-slate-500">System Status</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-success-400" />
                <span className="text-xs text-slate-400">Active Incidents</span>
              </div>
              <span className="text-xs font-semibold tabular-nums text-white">{activeCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-warning-400" />
                <span className="text-xs text-slate-400">Pending Review</span>
              </div>
              <span className="text-xs font-semibold tabular-nums text-warning-300">{pendingCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs text-slate-400">AI Engine</span>
              </div>
              <span className="text-xs font-semibold text-success-300">Online</span>
            </div>
          </div>
        </div>

        {/* Session + sign out */}
        <div className="mt-auto pt-6">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-500/15 text-xs font-bold text-danger-300">
              {(session?.displayName ?? "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {session?.displayName ?? "Admin"}
              </p>
              <p className="text-[11px] text-slate-500">
                {roleDisplayLabel(session?.role ?? "admin")}
              </p>
            </div>
            <button
              onClick={() => void handleSignOut()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
              title="Sign out"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ---- render ---- */

  return (
    <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(255,91,115,0.06),transparent_50%),linear-gradient(180deg,#07101d_0%,#081423_45%,#050c16_100%)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-white/[0.06] bg-[#070f1b]/90 px-4 py-5 backdrop-blur-xl xl:flex">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#070f1b]/90 px-4 backdrop-blur-xl xl:hidden">
        <div className="flex items-center gap-3">
          <BrandMark className="h-auto w-[80px] shrink-0" />
          <Badge variant="danger" className="text-[9px]">Admin</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => setMobileOpen(true)}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </Button>
      </header>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.06] bg-[#070f1b] px-4 py-5 xl:hidden"
            >
              <div className="mb-4 flex items-center justify-end">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="xl:pl-[240px]">
        <div className="mx-auto max-w-[1100px] px-4 py-5 sm:px-6 sm:py-6">
          {/* Page header */}
          <header className="mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {routeMeta.title}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-slate-400">{routeMeta.subtitle}</p>
          </header>

          <Outlet />

          <footer className="mt-10 border-t border-white/[0.04] pt-4 text-[11px] text-slate-600">
            Protected admin route
          </footer>
        </div>
      </div>
    </div>
  );
}
