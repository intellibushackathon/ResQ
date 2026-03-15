import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { AccountMenu, Navigation } from "./Navigation";
import { BrandMark } from "./BrandMark";
import { publicNavItems } from "./layout-data";
import { useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

export function AppLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const authReady = useAuthStore((state) => state.isReady);
  const session = useAuthStore((state) => state.session);
  const sessionUid = session?.uid ?? null;
  const sessionRole = session?.role ?? "public";
  const initializeReports = useReportStore((state) => state.initializeReports);
  const syncOfflineQueue = useReportStore((state) => state.syncOfflineQueue);

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
    void initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!authReady) return;
    void initializeReports(sessionUid ? { uid: sessionUid, role: sessionRole } : null);
  }, [authReady, initializeReports, sessionRole, sessionUid]);

  useEffect(() => {
    const handleOnline = () => {
      void syncOfflineQueue(sessionUid ? { uid: sessionUid, role: sessionRole } : null);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [sessionRole, sessionUid, syncOfflineQueue]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Top navbar */}
      <header className="sticky top-0 z-40 border-b border-white/8 bg-panel-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: brand */}
          <BrandMark className="h-auto w-[110px] shrink-0 drop-shadow-[0_4px_12px_rgba(36,145,255,0.15)]" />

          {/* Center: nav links (desktop) */}
          <Navigation
            items={publicNavItems}
            open={mobileNavOpen}
            onToggle={() => setMobileNavOpen((v) => !v)}
          />

          {/* Right: status + account + mobile toggle */}
          <div className="flex items-center gap-2">
            <Badge variant={isOnline ? "success" : "warning"} className="hidden sm:flex">
              <span className="flex items-center gap-1.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${isOnline ? "bg-success-400" : "bg-warning-400"}`} />
                {isOnline ? "Online" : "Offline"}
              </span>
            </Badge>
            <div className="hidden lg:block">
              <AccountMenu />
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-[960px] px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
