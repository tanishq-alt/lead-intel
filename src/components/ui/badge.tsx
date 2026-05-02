import { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "purple"
  | "outline";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantMap: Record<BadgeVariant, string> = {
  default: "bg-gray-800 text-gray-300",
  success: "bg-emerald-900/50 text-emerald-300 border border-emerald-800/60",
  warning: "bg-amber-900/50 text-amber-300 border border-amber-800/60",
  error: "bg-rose-900/50 text-rose-300 border border-rose-800/60",
  info: "bg-sky-900/50 text-sky-300 border border-sky-800/60",
  purple: "bg-violet-900/50 text-violet-300 border border-violet-800/60",
  outline: "border border-gray-700 text-gray-400",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantMap[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
