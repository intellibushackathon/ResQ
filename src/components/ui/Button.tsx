import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

type ButtonVariant = "default" | "danger" | "outline" | "ghost";
type ButtonSize = "sm" | "default" | "lg" | "icon";

const buttonVariants: Record<ButtonVariant, string> = {
  default:
    "bg-brand-500 text-white shadow-[0_18px_36px_rgba(36,145,255,0.28)] hover:bg-brand-400 focus-visible:ring-brand-300/60",
  danger:
    "bg-danger-500 text-white shadow-[0_18px_36px_rgba(255,91,115,0.24)] hover:bg-danger-400 focus-visible:ring-danger-400/60",
  outline:
    "border border-white/15 bg-white/5 text-slate-100 hover:border-brand-400/40 hover:bg-brand-500/10 focus-visible:ring-brand-300/50",
  ghost:
    "bg-transparent text-slate-200 hover:bg-white/8 hover:text-white focus-visible:ring-white/30",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-4 text-sm",
  default: "h-11 rounded-2xl px-5 text-sm",
  lg: "h-12 rounded-2xl px-6 text-base",
  icon: "h-11 w-11 rounded-2xl p-0",
};

export type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const MotionButton = motion.create("button");

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", type = "button", ...props },
  ref,
) {
  return (
    <MotionButton
      ref={ref}
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[0.01em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
});
