import { cn } from "@/lib/utils";

interface IntentScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

function getColorClass(score: number): string {
  if (score === 10) return "bg-purple-900/60 text-purple-300 border-purple-600 ring-purple-500/30";
  if (score >= 8) return "bg-emerald-900/60 text-emerald-300 border-emerald-600 ring-emerald-500/30";
  if (score >= 6) return "bg-amber-900/60 text-amber-300 border-amber-600 ring-amber-500/30";
  return "bg-rose-900/60 text-rose-300 border-rose-600 ring-rose-500/30";
}

export function IntentScoreBadge({ score, size = "md" }: IntentScoreBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border font-bold ring-2",
        sizeClasses[size],
        getColorClass(score)
      )}
    >
      {score}
    </span>
  );
}
