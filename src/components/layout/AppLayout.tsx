import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Navigation } from "./Navigation";
import { getRouteMeta, publicNavItems } from "./layout-data";
import { useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

export function AppLayout() {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname, "public");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const authReady = useAuthStore((state) => state.isReady);
  const session = useAuthStore((state) => state.session);
  const sessionUid = session?.uid ?? null;
  const sessionRole = session?.role ?? "public";
  const initializeReports = useReportStore((state) => state.initializeReports);
  const syncOfflineQueue = useReportStore((state) => state.syncOfflineQueue);
  const queueCount = useReportStore((state) => state.offlineQueue.length);
  const isSyncingOfflineQueue = useReportStore((state) => state.isSyncingOfflineQueue);
  const syncStatusMessage = useReportStore((state) => state.syncStatusMessage);

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
    if (!authReady) {
      return;
    }

    void initializeReports(sessionUid ? { uid: sessionUid, role: sessionRole } : null);
  }, [authReady, initializeReports, sessionRole, sessionUid]);

  useEffect(() => {
    const handleOnline = () => {
      void syncOfflineQueue(sessionUid ? { uid: sessionUid, role: sessionRole } : null);
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [sessionRole, sessionUid, syncOfflineQueue]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1480px] gap-6">
        <Navigation
          items={publicNavItems}
          open={mobileNavOpen}
          onToggle={() => setMobileNavOpen((value) => !value)}
        />

        <main className="min-w-0 flex-1">
          <div className="glass-panel min-h-[calc(100vh-2rem)] rounded-[36px] border border-white/10 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-8 sm:py-8">
            <header className="mb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-label">{routeMeta.eyebrow}</p>
                  <h1 className="mt-2 font-display text-4xl tracking-[-0.05em] text-white sm:text-5xl">
                    {routeMeta.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                    {routeMeta.subtitle}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={isOnline ? "success" : "warning"}>
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? "bg-success-400" : "bg-warning-400"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </span>
                  </Badge>
                  <Button variant="outline" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
                    Menu
                  </Button>
                </div>
              </div>
            </header>

            <section className="space-y-6">
              <Outlet />
            </section>

            <footer className="mt-8 text-center text-xs text-slate-500">
              ResQ &mdash; Disaster Intelligence
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
