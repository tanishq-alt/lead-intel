import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
  };
  icon?: ReactNode;
  accentColor?: "violet" | "emerald" | "amber" | "sky" | "rose";
}

const accentMap = {
  violet: "text-violet-400 bg-violet-900/30",
  emerald: "text-emerald-400 bg-emerald-900/30",
  amber: "text-amber-400 bg-amber-900/30",
  sky: "text-sky-400 bg-sky-900/30",
  rose: "text-rose-400 bg-rose-900/30",
};

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentColor = "violet",
}: StatCardProps) {
  const accent = accentMap[accentColor];

  const TrendIcon =
    trend && trend.value > 0
      ? TrendingUp
      : trend && trend.value < 0
        ? TrendingDown
        : Minus;

  const trendColor =
    trend && trend.value > 0
      ? "text-emerald-400"
      : trend && trend.value < 0
        ? "text-rose-400"
        : "text-gray-500";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {title}
        </span>
        {icon && (
          <span className={`p-1.5 rounded-lg ${accent}`}>{icon}</span>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
        )}
      </div>

      {trend && (
        <div className={`flex items-center gap-1.5 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>
            {Math.abs(trend.value)}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}
