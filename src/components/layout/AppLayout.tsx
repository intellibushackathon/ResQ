import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { BottomNav } from "./BottomNav";
import { useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";

export function AppLayout() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const authReady = useAuthStore((state) => state.isReady);
  const session = useAuthStore((state) => state.session);
  const sessionUid = session?.uid ?? null;
  const sessionRole = session?.role ?? "public";
  const initializeReports = useReportStore((state) => state.initializeReports);
  const syncOfflineQueue = useReportStore((state) => state.syncOfflineQueue);

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

  return (
    <div className="min-h-screen flex flex-col bg-panel-950">
      <PublicHeader />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
