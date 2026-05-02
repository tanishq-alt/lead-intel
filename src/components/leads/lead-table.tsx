"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export interface Lead {
  id: string;
  name: string | null;
  designation: string | null;
  company: string | null;
  sourceChannel: string;
  sourceUrl: string;
  intentScore: number;
  confidenceScore: number;
  status: string;
  painPoint: string | null;
  competitorMentioned: string | null;
  techStackDetected: string | null;
  intentSignal: string;
  industry: string | null;
  keywordsMatched: string[];
  createdAt: string;
}

interface LeadTableProps {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const statusColor: Record<string, string> = {
  NEW: "bg-blue-900/50 text-blue-300 border border-blue-800/50",
  SAVED: "bg-emerald-900/50 text-emerald-300 border border-emerald-800/50",
  CONTACTED: "bg-violet-900/50 text-violet-300 border border-violet-800/50",
  EXPORTED: "bg-gray-800 text-gray-400 border border-gray-700",
  REJECTED: "bg-rose-900/50 text-rose-300 border border-rose-800/50",
};

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 9
      ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800/60"
      : score >= 7
        ? "bg-violet-900/60 text-violet-300 border border-violet-800/60"
        : score >= 5
          ? "bg-amber-900/60 text-amber-300 border border-amber-800/60"
          : "bg-gray-800 text-gray-400 border border-gray-700";

  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${color}`}
    >
      {score}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const shortName: Record<string, string> = {
    REDDIT: "Reddit",
    HACKER_NEWS: "HN",
    GITHUB_ISSUES: "GitHub",
    STACKOVERFLOW: "SO",
    LINKEDIN_POSTS: "LinkedIn",
    TWITTER: "Twitter",
    PRODUCT_HUNT: "PH",
    G2: "G2",
    CAPTERRA: "Capterra",
  };
  return (
    <span className="text-xs text-gray-300 bg-gray-800/80 px-2 py-1 rounded border border-gray-700/50">
      {shortName[channel] ?? channel}
    </span>
  );
}

export function LeadTable({
  leads,
  total,
  page,
  pageSize,
  onPageChange,
}: LeadTableProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (leads.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg">
          🔍
        </div>
        <p className="text-sm text-gray-400">No leads match your filters</p>
        <p className="text-xs text-gray-600">
          Run a scrape to fetch live signals, or try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/80">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                Lead
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                Score
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                Channel
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap hidden lg:table-cell">
                Intent / Pain
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap hidden xl:table-cell">
                Competitor
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 whitespace-nowrap hidden xl:table-cell">
                Found
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-800/50 transition-colors group">
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-white text-sm">
                      {lead.name ?? "Anonymous"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {[lead.designation, lead.company].filter(Boolean).join(" · ") || (
                        <span className="italic text-gray-600">No profile info</span>
                      )}
                    </div>
                    {lead.techStackDetected && (
                      <div className="text-xs text-cyan-500/80 mt-0.5">
                        {lead.techStackDetected}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <ScorePill score={lead.intentScore} />
                    <span className="text-xs text-gray-600">{lead.confidenceScore}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ChannelBadge channel={lead.sourceChannel} />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell max-w-[220px]">
                  <div className="space-y-0.5">
                    {lead.intentSignal && (
                      <div className="text-xs text-violet-400/80 truncate">
                        {lead.intentSignal}
                      </div>
                    )}
                    {lead.painPoint && (
                      <div className="text-xs text-gray-400 truncate">
                        {lead.painPoint}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  {lead.competitorMentioned ? (
                    <span className="text-xs text-red-400/80 bg-red-900/20 px-2 py-0.5 rounded border border-red-900/30">
                      {lead.competitorMentioned}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-700">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      statusColor[lead.status] ?? statusColor.NEW
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3 hidden xl:table-cell">
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                      title="View lead detail"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    {lead.sourceUrl && (
                      <a
                        href={lead.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                        title="View source"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <span className="text-xs text-gray-500">
            {start}–{end} of {total.toLocaleString()} leads
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum =
                totalPages <= 5
                  ? i + 1
                  : page <= 3
                    ? i + 1
                    : page >= totalPages - 2
                      ? totalPages - 4 + i
                      : page - 2 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                    pageNum === page
                      ? "bg-violet-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
