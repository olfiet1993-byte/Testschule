import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "brand";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white shadow-sm hover:shadow-md",
  brand:
    "bg-brand-grad text-white shadow-md hover:shadow-lg hover:brightness-110 active:brightness-95",
  secondary:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-700 dark:text-slate-100 dark:border-slate-700",
  ghost:
    "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-200",
  danger:
    "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-sm hover:shadow-md",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
