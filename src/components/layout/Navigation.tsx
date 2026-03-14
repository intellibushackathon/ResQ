import { AnimatePresence, motion } from "framer-motion";
import { NavLink } from "react-router-dom";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card";
import { cn } from "../../lib/utils";
import { BrandMark } from "./BrandMark";
import type { NavItem } from "./layout-data";

type NavigationProps = {
  items: NavItem[];
  open: boolean;
  onToggle: () => void;
};

function NavigationContent({ items, onToggle }: Pick<NavigationProps, "items" | "onToggle">) {
  return (
    <div className="flex h-full flex-col gap-6">
      <div className="flex items-center gap-3">
        <BrandMark className="h-auto w-[156px] drop-shadow-[0_10px_30px_rgba(36,145,255,0.18)]" />
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
            <Badge variant="success">Online-ready</Badge>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <span>Sync queue</span>
            <span className="text-sm font-semibold text-white">3 queued for sync</span>
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
          <CardTitle className="text-lg">Guest operator</CardTitle>
          <CardDescription>Preview role context without enabling real auth logic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>Mode</span>
            <span className="font-semibold text-white">Observation</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Preparedness</span>
            <span className="font-semibold text-white">Nominal</span>
          </div>
          <Button variant="outline" className="w-full">
            Review access surface
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function Navigation({ items, open, onToggle }: NavigationProps) {
  return (
    <>
      <aside className="hidden w-[320px] shrink-0 lg:block">
        <div className="sticky top-6 h-[calc(100vh-3rem)] rounded-[32px] border border-white/10 bg-panel-900/72 p-5 shadow-panel backdrop-blur-2xl">
          <NavigationContent items={items} onToggle={onToggle} />
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
                <NavigationContent items={items} onToggle={onToggle} />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
