import { format, subDays } from "date-fns";

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy HH:mm");
}

export function intentScoreColor(score: number): string {
  if (score >= 9) return "text-purple-400 bg-purple-900/30 border-purple-700";
  if (score >= 8) return "text-green-400 bg-green-900/30 border-green-700";
  if (score >= 6) return "text-yellow-400 bg-yellow-900/30 border-yellow-700";
  return "text-red-400 bg-red-900/30 border-red-700";
}

export function confidenceScoreColor(score: number): string {
  if (score >= 85) return "text-green-400";
  if (score >= 70) return "text-yellow-400";
  return "text-red-400";
}

export function formatCompanySize(size: string): string {
  const map: Record<string, string> = {
    STARTUP: "Startup (1-50)",
    SMB: "SMB (51-200)",
    MID_MARKET: "Mid-Market (201-1000)",
    ENTERPRISE: "Enterprise (1000+)",
  };
  return map[size] ?? size;
}

export function calculateIntentScore(signals: {
  explicit: boolean;
  complaint: boolean;
  competitorMention: boolean;
  urgency: boolean;
  roleRelevant: boolean;
}): number {
  let score = 0;
  if (signals.explicit) score += 3;
  if (signals.complaint) score += 2;
  if (signals.competitorMention) score += 2;
  if (signals.urgency) score += 2;
  if (signals.roleRelevant) score += 1;
  return Math.min(score, 10);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function getDateRangeFilter(range: "7d" | "30d" | "all"): Date | undefined {
  if (range === "7d") return subDays(new Date(), 7);
  if (range === "30d") return subDays(new Date(), 30);
  return undefined;
}

export function statusBadgeVariant(status: string): string {
  const map: Record<string, string> = {
    NEW: "bg-blue-900/40 text-blue-300 border-blue-700",
    SAVED: "bg-green-900/40 text-green-300 border-green-700",
    REJECTED: "bg-red-900/40 text-red-300 border-red-700",
    EXPORTED: "bg-purple-900/40 text-purple-300 border-purple-700",
    CONTACTED: "bg-teal-900/40 text-teal-300 border-teal-700",
  };
  return map[status] ?? "bg-gray-800 text-gray-300 border-gray-600";
}

export function runStatusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: "text-green-400 bg-green-900/30",
    RUNNING: "text-blue-400 bg-blue-900/30",
    PENDING: "text-yellow-400 bg-yellow-900/30",
    FAILED: "text-red-400 bg-red-900/30",
  };
  return map[status] ?? "text-gray-400 bg-gray-800";
}
