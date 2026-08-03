import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-gray-100 text-gray-700 ring-gray-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-success-50 text-success-700 ring-green-200",
  warning: "bg-warning-50 text-warning-700 ring-amber-200",
  danger: "bg-danger-50 text-danger-700 ring-red-200",
  info: "bg-info-50 text-info-700 ring-blue-200",
};

const dotClasses: Record<BadgeVariant, string> = {
  neutral: "bg-gray-400",
  brand: "bg-brand-600",
  success: "bg-success-600",
  warning: "bg-warning-600",
  danger: "bg-danger-600",
  info: "bg-info-600",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, variant = "neutral", dot = false, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variantClasses[variant],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", dotClasses[variant])} aria-hidden="true" />}
      {children}
    </span>
  );
}
