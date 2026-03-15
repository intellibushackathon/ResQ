import { useEffect, useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { Button } from "../ui/Button";
import { cn } from "../../lib/utils";
import { BrandMark } from "./BrandMark";
import type { NavItem } from "./layout-data";
import { roleDisplayLabel, useAuthStore } from "../../store/useAuthStore";

type NavigationProps = {
  items: NavItem[];
  open: boolean;
  onToggle: () => void;
};

const NAV_ICONS: Record<string, ReactElement> = {
  "/": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  "/my-reports": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  ),
  "/alerts": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
    </svg>
  ),
  "/safe-zones": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  ),
  "/login": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  ),
  "/dashboard": (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  ),
};

function NavigationContent({
  items,
  onToggle,
}: {
  items: NavItem[];
  onToggle: () => void;
}) {
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();

  const displayName = session?.displayName ?? "Citizen Test";
  const currentRole = session?.role ?? "public";
  const roleLabel = roleDisplayLabel(currentRole);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex justify-center">
        <BrandMark className="h-auto w-[180px] max-w-full drop-shadow-[0_10px_30px_rgba(36,145,255,0.18)]" />
      </div>

      <nav className="flex-1 space-y-1">
        {items.filter((item) => item.to !== "/login" && item.to !== "/dashboard").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onToggle}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                isActive
                  ? "border border-brand-400/25 bg-brand-500/12"
                  : "border border-transparent hover:bg-white/[0.04]",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn("shrink-0", isActive ? "text-brand-300" : "text-slate-500")}>
                  {NAV_ICONS[item.to] ?? null}
                </span>
                <div>
                  <p className={cn("text-sm font-semibold", isActive ? "text-white" : "text-slate-200")}>
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Account panel */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
          <p className="text-xs text-slate-500">{roleLabel}</p>
        </div>
      </div>
    </div>
  );
}

export function Navigation({ items, open, onToggle }: NavigationProps) {
  return (
    <>
      <aside className="hidden w-[280px] shrink-0 lg:block">
        <div className="sticky top-6 h-[calc(100vh-3rem)] rounded-xl border border-white/10 bg-panel-900/72 p-5 shadow-panel backdrop-blur-2xl">
          <NavigationContent items={items} onToggle={() => {}} />
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
              className="flex h-full max-h-full flex-col rounded-xl border border-white/10 bg-panel-950/96 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
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
                <NavigationContent items={items} onToggle={onToggle} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
