import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export type BadgeVariant = "default" | "danger" | "warning" | "success" | "outline";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-brand-400/30 bg-brand-500/15 text-brand-100",
  danger: "border-danger-400/25 bg-danger-500/12 text-danger-100",
  warning: "border-warning-400/30 bg-warning-500/14 text-warning-100",
  success: "border-success-400/30 bg-success-500/14 text-success-100",
  outline: "border-white/15 bg-white/5 text-slate-200",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
