import { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantClasses = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  warning: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  info: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
};

export function Badge({ variant = "default", className = "", children, ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
