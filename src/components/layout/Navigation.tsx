import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { cn } from "../../lib/utils";
import { BrandMark } from "./BrandMark";
import type { NavItem } from "./layout-data";
import { roleDisplayLabel, useAuthStore } from "../../store/useAuthStore";
import { useReportStore } from "../../store/useReportStore";
import type { BadgeVariant } from "../ui/Badge";

type NavigationProps = {
  items: NavItem[];
  open: boolean;
  onToggle: () => void;
};

type NavigationContentProps = Pick<NavigationProps, "items" | "onToggle"> & {
  roleLabel: string;
  accountName: string;
  accountMode: string;
  backendLabel: string;
  accountDescription: string;
  roleVariant: BadgeVariant;
  showSignOut: boolean;
  onSignOut: () => Promise<void>;
  onSignIn: () => void;
};

function NavigationContent({
  items,
  onToggle,
  roleLabel,
  accountName,
  accountMode,
  backendLabel,
  accountDescription,
  roleVariant,
  showSignOut,
  onSignOut,
  onSignIn,
}: NavigationContentProps) {
  const queueCount = useReportStore((state) => state.offlineQueue.length);
  const isSyncingOfflineQueue = useReportStore((state) => state.isSyncingOfflineQueue);
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex justify-center">
        <BrandMark className="h-auto w-[300px] max-w-full drop-shadow-[0_10px_30px_rgba(36,145,255,0.18)]" />
      </div>

      <Card className="rounded-[24px] border-brand-400/20 bg-brand-500/10 p-4">
        <CardHeader className="mb-3 gap-1">
          <Badge className="w-fit">Live shell</Badge>
          <CardTitle className="text-lg">Public coordination</CardTitle>
          <CardDescription>
            Shared navigation and route framing for citizens and responders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-200">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span>Connectivity</span>
            <Badge variant={isOnline ? "success" : "warning"}>{isOnline ? "Online" : "Offline"}</Badge>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span>Report pipeline</span>
            <span className="text-sm font-semibold text-white">
              {isSyncingOfflineQueue
                ? "Syncing queued reports"
                : queueCount > 0
                  ? `${queueCount} queued for sync`
                  : "Live pipeline ready"}
            </span>
          </div>
        </CardContent>
      </Card>

      <nav className="flex-1 space-y-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onToggle}
            className={({ isActive }) =>
              cn(
                "group block rounded-[22px] border px-4 py-3 transition-all duration-200",
                isActive
                  ? "border-brand-400/35 bg-brand-500/16 shadow-[0_16px_34px_rgba(36,145,255,0.14)]"
                  : "border-white/8 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]",
              )
            }
          >
            {({ isActive }) => (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className={cn("font-semibold", isActive ? "text-white" : "text-slate-100")}>
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] uppercase tracking-[0.24em]",
                      isActive ? "text-brand-100" : "text-slate-500",
                    )}
                  >
                    {item.shortLabel}
                  </span>
                </div>
                <p className="text-sm leading-6 text-slate-400">{item.description}</p>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <Card className="rounded-[24px] p-4">
        <CardHeader className="mb-3 gap-1">
          <Badge variant="outline" className="w-fit">
            Account panel
          </Badge>
          <CardTitle className="text-lg">{accountName}</CardTitle>
          <CardDescription>{accountDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="flex flex-wrap gap-2">
            <Badge variant={roleVariant}>{roleLabel}</Badge>
            <Badge variant="outline">{accountMode}</Badge>
            <Badge variant="outline">{backendLabel}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Access state</span>
            <span className="font-semibold text-white">{showSignOut ? "Authenticated" : "Public session"}</span>
          </div>
          {showSignOut ? (
            <Button variant="outline" className="w-full" onClick={() => void onSignOut()}>
              Sign out
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={onSignIn}>
              Sign in
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function Navigation({ items, open, onToggle }: NavigationProps) {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);

  const currentRole = session?.role ?? "public";
  const roleLabel = roleDisplayLabel(currentRole);
  const roleVariant: BadgeVariant =
    currentRole === "admin" ? "danger" : currentRole === "staff" ? "warning" : "default";
  const accountName = session?.displayName ?? "Public access";
  const accountMode = session ? "Signed in" : "Not signed in";
  const backendLabel = "Supabase";
  const accountDescription = !session
    ? "Public routes remain available while protected routes require responder or admin sign-in."
    : "Route access is determined by your active role and backend session.";
  const showSignOut = Boolean(session);

  async function handleSignOut() {
    await signOut();
    onToggle();
    navigate("/login", { replace: true });
  }

  function handleSignIn() {
    onToggle();
    navigate("/login");
  }

  return (
    <>
      <aside className="hidden w-[320px] shrink-0 lg:block">
        <div className="sticky top-6 h-[calc(100vh-3rem)] rounded-[32px] border border-white/10 bg-panel-900/72 p-5 shadow-panel backdrop-blur-2xl">
          <NavigationContent
            accountDescription={accountDescription}
            accountMode={accountMode}
            accountName={accountName}
            backendLabel={backendLabel}
            items={items}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            onToggle={onToggle}
            roleLabel={roleLabel}
            roleVariant={roleVariant}
            showSignOut={showSignOut}
          />
        </div>
      </aside>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 bg-[rgba(3,8,16,0.72)] px-4 py-4 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="flex h-full max-h-full flex-col rounded-[32px] border border-white/10 bg-panel-950/96 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
              initial={{ x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -24, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Navigation
                </p>
                <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={onToggle}>
                  X
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <NavigationContent
                  accountDescription={accountDescription}
                  accountMode={accountMode}
                  accountName={accountName}
                  backendLabel={backendLabel}
                  items={items}
                  onSignIn={handleSignIn}
                  onSignOut={handleSignOut}
                  onToggle={onToggle}
                  roleLabel={roleLabel}
                  roleVariant={roleVariant}
                  showSignOut={showSignOut}
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
