import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { Navigation } from "./Navigation";
import { getRouteMeta, publicNavItems } from "./layout-data";
import { useAuthStore } from "../../store/useAuthStore";

export function AppLayout() {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname, "public");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

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
            <header className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(36,145,255,0.22),rgba(9,24,43,0.7)_50%,rgba(22,199,132,0.08))] p-0">
                <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent" />
                <div className="p-6 sm:p-8">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <Badge>{routeMeta.category}</Badge>
                    <Badge variant={isOnline ? "success" : "warning"}>
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                    <Badge variant="outline">Connectivity aware</Badge>
                  </div>
                  <p className="section-label">{routeMeta.eyebrow}</p>
                  <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-3xl">
                      <h1 className="font-display text-4xl tracking-[-0.05em] text-white sm:text-5xl">
                        {routeMeta.title}
                      </h1>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                        {routeMeta.subtitle}
                      </p>
                    </div>
                    <Button variant="outline" className="lg:hidden" onClick={() => setMobileNavOpen(true)}>
                      Open navigation
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <CardHeader className="mb-4 gap-2">
                  <Badge variant="outline" className="w-fit">
                    Status strip
                  </Badge>
                  <CardTitle>Field readiness</CardTitle>
                  <CardDescription>
                    Shared shell indicators for connectivity, queue state, and route posture.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300">Network status</span>
                    <span className="font-semibold text-white">{isOnline ? "Stable" : "Reconnecting"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-slate-300">Report pipeline</span>
                    <span className="font-semibold text-white">Awaiting live data</span>
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

            <footer className="mt-8 flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-success-500 shadow-[0_0_18px_rgba(22,199,132,0.75)]" />
                <span>Public shell online. Citizen reporting, alerts, and route-aware access are available.</span>
              </div>
              <span className="text-slate-400">ResQ public coordination layer</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
