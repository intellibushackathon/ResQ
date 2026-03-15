import { useEffect, useRef, useState } from "react";
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

function AccountMenu({ onAction }: { onAction?: () => void }) {
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = session && !session.isAnonymous;
  const displayName = session?.displayName ?? "Guest";
  const currentRole = session?.role ?? "public";
  const roleLabel = roleDisplayLabel(currentRole);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    onAction?.();
    await signOut();
    navigate("/login", { replace: true });
  }

  function handleLogin() {
    setMenuOpen(false);
    onAction?.();
    navigate("/login");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm transition-colors hover:bg-white/[0.08]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-slate-400">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </div>
        <span className="hidden text-slate-200 sm:inline">{displayName}</span>
        <svg
          className={cn("h-3.5 w-3.5 text-slate-500 transition-transform duration-200", menuOpen && "rotate-180")}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {menuOpen ? (
          <motion.div
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-panel-900/95 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          >
            <div className="mb-2 border-b border-white/10 px-1 pb-2">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="text-xs text-slate-400">{isLoggedIn ? (session.email ?? roleLabel) : roleLabel}</p>
            </div>
            {isLoggedIn ? (
              <Button variant="danger" size="sm" className="w-full" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            ) : (
              <Button size="sm" className="w-full" onClick={handleLogin}>
                Login
              </Button>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const visibleNavItems = (items: NavItem[]) =>
  items.filter((item) => item.to !== "/login" && item.to !== "/dashboard");

export function Navigation({ items, open, onToggle }: NavigationProps) {
  const filtered = visibleNavItems(items);

  return (
    <>
      {/* Top navbar - desktop */}
      <nav className="hidden lg:flex items-center gap-0.5">
        {filtered.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "px-2.5 py-1.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-brand-300"
                  : "text-slate-400 hover:text-white",
              )
            }
          >
            {item.shortLabel}
          </NavLink>
        ))}
      </nav>

      {/* Mobile nav drawer */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 bg-[rgba(3,8,16,0.8)] backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
          >
            <motion.div
              className="absolute inset-x-0 top-0 max-h-[80vh] overflow-y-auto rounded-b-3xl border-b border-white/10 bg-panel-950/98 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.48)]"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <BrandMark className="h-auto w-[120px]" />
                <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={onToggle}>
                  X
                </Button>
              </div>
              <div className="space-y-1">
                {filtered.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onToggle}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-2xl px-4 py-3 transition-all duration-200",
                        isActive
                          ? "border border-brand-400/25 bg-brand-500/12"
                          : "border border-transparent hover:bg-white/[0.04]",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <p className={cn("text-sm font-semibold", isActive ? "text-white" : "text-slate-200")}>
                        {item.label}
                      </p>
                    )}
                  </NavLink>
                ))}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <AccountMenu onAction={onToggle} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export { AccountMenu };
