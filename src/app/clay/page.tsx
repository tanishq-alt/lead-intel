"use client";

import { useState, useCallback, useRef } from "react";
import {
  Play, Download, RefreshCw, ExternalLink, ChevronDown,
  Search, X, Filter, Loader2, AlertCircle, CheckCircle2,
  Globe, GitBranch, MessageSquare, Code2, Zap, Eye,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveLead {
  id: string;
  platform: string;
  platformUrl: string;
  subreddit: string | null;
  postedAt: string;
  author: string;
  authorUrl: string | null;
  name: string | null;
  designation: string | null;
  company: string | null;
  industry: string | null;
  techStack: string | null;
  intentScore: number;
  confidenceScore: number;
  intentSignals: string;
  painPoint: string | null;
  competitorMentioned: string | null;
  keywords: string[];
  outreachAngle: string | null;
  title: string;
  bodyPreview: string;
  fullBody: string;
  score: number;
  comments: number;
  tags: string[];
}

interface ScrapeResult {
  leads: LiveLead[];
  meta: {
    total: number;
    rawSignals: number;
    channels: string[];
    scrapedAt: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CHANNEL_OPTIONS = [
  { id: "REDDIT", label: "Reddit", icon: "🟠" },
  { id: "HACKER_NEWS", label: "Hacker News", icon: "🔶" },
  { id: "GITHUB_ISSUES", label: "GitHub Issues", icon: "⚫" },
  { id: "STACKOVERFLOW", label: "Stack Overflow", icon: "🟡" },
];

const PLATFORM_COLORS: Record<string, string> = {
  REDDIT: "bg-orange-900/40 text-orange-300 border-orange-800/50",
  HACKER_NEWS: "bg-amber-900/40 text-amber-300 border-amber-800/50",
  GITHUB_ISSUES: "bg-gray-800 text-gray-300 border-gray-700",
  STACKOVERFLOW: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50",
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  REDDIT: <Globe className="w-3 h-3" />,
  HACKER_NEWS: <MessageSquare className="w-3 h-3" />,
  GITHUB_ISSUES: <GitBranch className="w-3 h-3" />,
  STACKOVERFLOW: <Code2 className="w-3 h-3" />,
};

const SCORE_COLORS = (s: number) =>
  s >= 8 ? "text-emerald-400 bg-emerald-900/40 border-emerald-800/50"
  : s >= 6 ? "text-violet-400 bg-violet-900/40 border-violet-800/50"
  : s >= 4 ? "text-amber-400 bg-amber-900/40 border-amber-800/50"
  : "text-gray-400 bg-gray-800 border-gray-700";

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const short: Record<string, string> = {
    REDDIT: "Reddit", HACKER_NEWS: "HN", GITHUB_ISSUES: "GitHub", STACKOVERFLOW: "SO"
  };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${PLATFORM_COLORS[platform] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {PLATFORM_ICONS[platform]}
      {short[platform] ?? platform}
    </span>
  );
}

function ScoreCell({ score }: { score: number }) {
  return (
    <div className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${SCORE_COLORS(score)}`}>
      {score}
    </div>
  );
}

function ExpandedRow({ lead, onClose }: { lead: LiveLead; onClose: () => void }) {
  return (
    <tr className="bg-gray-900/60 border-b border-gray-800">
      <td colSpan={12} className="px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Signal text */}
          <div className="lg:col-span-2 space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Original Signal
              </div>
              <div className="text-xs font-medium text-white mb-1">{lead.title}</div>
              <p className="text-xs text-gray-400 leading-relaxed bg-gray-800/60 rounded-lg p-3 max-h-36 overflow-y-auto whitespace-pre-wrap">
                {lead.fullBody.slice(0, 800)}{lead.fullBody.length > 800 ? "…" : ""}
              </p>
            </div>
            {lead.outreachAngle && (
              <div>
                <div className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> AI Outreach Angle
                </div>
                <p className="text-xs text-gray-300 bg-violet-900/20 border border-violet-800/30 rounded-lg p-3 leading-relaxed">
                  {lead.outreachAngle}
                </p>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Intent Score" value={String(lead.intentScore) + "/10"} highlight />
              <Stat label="Confidence" value={lead.confidenceScore + "%"} />
              <Stat label="Upvotes" value={String(lead.score)} />
              <Stat label="Comments" value={String(lead.comments)} />
            </div>
            {lead.keywords.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Keywords matched</div>
                <div className="flex flex-wrap gap-1">
                  {lead.keywords.map((k) => (
                    <span key={k} className="text-[10px] bg-violet-900/30 text-violet-300 border border-violet-800/40 px-1.5 py-0.5 rounded">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lead.tags.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {lead.tags.slice(0, 6).map((t) => (
                    <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <a
                href={lead.platformUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                View original post
              </a>
              {lead.authorUrl && (
                <a
                  href={lead.authorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View author profile
                </a>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-3 text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Collapse
        </button>
      </td>
    </tr>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-2 py-2 text-center">
      <div className={`text-sm font-bold ${highlight ? "text-violet-400" : "text-white"}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}

function LeadRow({ lead, index }: { lead: LiveLead; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(lead.postedAt);
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);

  return (
    <>
      <tr
        className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors group cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Row # */}
        <td className="px-3 py-2.5 text-xs text-gray-600 text-right tabular-nums select-none w-8">
          {index + 1}
        </td>

        {/* Platform */}
        <td className="px-3 py-2.5 whitespace-nowrap">
          <PlatformBadge platform={lead.platform} />
          {lead.subreddit && (
            <div className="text-[10px] text-gray-600 mt-0.5">r/{lead.subreddit}</div>
          )}
        </td>

        {/* Author / Handle */}
        <td className="px-3 py-2.5 max-w-[140px]">
          <div className="text-sm text-white font-medium truncate">{lead.author}</div>
          {lead.designation && (
            <div className="text-[10px] text-violet-400/80 truncate">{lead.designation}</div>
          )}
        </td>

        {/* Company */}
        <td className="px-3 py-2.5 max-w-[120px]">
          {lead.company ? (
            <span className="text-xs text-gray-200 font-medium truncate block">{lead.company}</span>
          ) : (
            <span className="text-xs text-gray-700">—</span>
          )}
          {lead.industry && (
            <div className="text-[10px] text-gray-500 truncate">{lead.industry}</div>
          )}
        </td>

        {/* Signal / Title */}
        <td className="px-3 py-2.5 max-w-[260px]">
          <div className="text-xs text-gray-200 truncate">{lead.title}</div>
          <div className="text-[10px] text-gray-500 truncate mt-0.5">{lead.bodyPreview}</div>
        </td>

        {/* Pain Point */}
        <td className="px-3 py-2.5 max-w-[160px] hidden xl:table-cell">
          {lead.painPoint ? (
            <span className="text-[10px] text-rose-300/80 leading-tight block truncate">
              {lead.painPoint}
            </span>
          ) : (
            <span className="text-xs text-gray-700">—</span>
          )}
        </td>

        {/* Competitor */}
        <td className="px-3 py-2.5 whitespace-nowrap hidden lg:table-cell">
          {lead.competitorMentioned ? (
            <span className="text-[10px] text-red-300 bg-red-900/20 border border-red-900/30 px-1.5 py-0.5 rounded">
              {lead.competitorMentioned}
            </span>
          ) : (
            <span className="text-xs text-gray-700">—</span>
          )}
        </td>

        {/* Tech Stack */}
        <td className="px-3 py-2.5 hidden xl:table-cell">
          {lead.techStack ? (
            <span className="text-[10px] text-cyan-400/80">{lead.techStack}</span>
          ) : (
            <span className="text-xs text-gray-700">—</span>
          )}
        </td>

        {/* Intent Score */}
        <td className="px-3 py-2.5 text-center">
          <ScoreCell score={lead.intentScore} />
        </td>

        {/* Confidence */}
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full"
                style={{ width: `${lead.confidenceScore}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500 tabular-nums">{lead.confidenceScore}%</span>
          </div>
        </td>

        {/* Date */}
        <td className="px-3 py-2.5 text-[10px] text-gray-500 whitespace-nowrap hidden lg:table-cell">
          {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
              title="Expand"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <a
              href={lead.platformUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors"
              title="Open source"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </td>
      </tr>
      {expanded && <ExpandedRow lead={lead} onClose={() => setExpanded(false)} />}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClayPage() {
  const [leads, setLeads] = useState<LiveLead[]>([]);
  const [meta, setMeta] = useState<ScrapeResult["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["REDDIT", "HACKER_NEWS", "GITHUB_ISSUES", "STACKOVERFLOW"]);
  const [keywords, setKeywords] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [filterPanel, setFilterPanel] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const runScrape = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const body = {
        channels: selectedChannels.length === 4 ? ["ALL"] : selectedChannels,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        competitors: competitors.split(",").map((c) => c.trim()).filter(Boolean),
        minScore,
        limit: 120,
      };

      const res = await fetch("/api/scrape/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const data: ScrapeResult = await res.json();
      setLeads(data.leads);
      setMeta(data.meta);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Scrape failed");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedChannels, keywords, competitors, minScore]);

  const exportCsv = () => {
    if (!filtered.length) return;
    const cols = [
      "Platform", "Author", "Company", "Designation", "Industry",
      "Title", "Pain Point", "Competitor Mentioned", "Tech Stack",
      "Intent Score", "Confidence", "Intent Signals", "Keywords",
      "Posted At", "URL", "Outreach Angle",
    ];
    const rows = filtered.map((l) => [
      l.platform, l.author, l.company ?? "", l.designation ?? "", l.industry ?? "",
      l.title.replace(/"/g, '""'), (l.painPoint ?? "").replace(/"/g, '""'),
      l.competitorMentioned ?? "", l.techStack ?? "",
      l.intentScore, l.confidenceScore, l.intentSignals,
      l.keywords.join("; "),
      new Date(l.postedAt).toISOString(), l.platformUrl,
      (l.outreachAngle ?? "").replace(/"/g, '""'),
    ]);
    const csv = [cols, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.author.toLowerCase().includes(q) ||
      l.title.toLowerCase().includes(q) ||
      (l.company?.toLowerCase().includes(q) ?? false) ||
      (l.painPoint?.toLowerCase().includes(q) ?? false) ||
      (l.competitorMentioned?.toLowerCase().includes(q) ?? false) ||
      (l.techStack?.toLowerCase().includes(q) ?? false) ||
      l.bodyPreview.toLowerCase().includes(q)
    );
  });

  const highIntent = filtered.filter((l) => l.intentScore >= 7).length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex-shrink-0 border-b border-gray-800 bg-gray-950 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-bold text-white">Lead Scraper</h1>
            <p className="text-xs text-gray-500">Live intent signals from Reddit · HN · GitHub · Stack Overflow</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-500 hover:text-white" />
              </button>
            )}
          </div>
          <button
            onClick={() => setFilterPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              filterPanel
                ? "bg-violet-600 border-violet-500 text-white"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>

        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          )}
          <button
            onClick={runScrape}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Scraping…
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                {leads.length > 0 ? "Refresh" : "Scrape Now"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterPanel && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/60 px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Channels */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Sources
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CHANNEL_OPTIONS.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => toggleChannel(ch.id)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border ${
                    selectedChannels.includes(ch.id)
                      ? "bg-violet-600 border-violet-500 text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
                  }`}
                >
                  <span>{ch.icon}</span>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              placeholder="alternative to, frustrated with, migration..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Competitors */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Competitors to track
            </label>
            <input
              type="text"
              placeholder="HubSpot, Salesforce, Workday..."
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Min Score */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Min intent score: <span className="text-white">{minScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={9}
              step={1}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full accent-violet-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>0 (all)</span>
              <span>5</span>
              <span>9 (top)</span>
            </div>
          </div>
        </div>
      )}

      {/* Stats bar */}
      {meta && (
        <div className="flex-shrink-0 border-b border-gray-800/60 bg-gray-900/30 px-5 py-2 flex items-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-semibold">{filtered.length}</span> leads
            {search && ` (filtered from ${leads.length})`}
          </span>
          <span>
            <span className="text-violet-400 font-semibold">{highIntent}</span> high-intent (≥7)
          </span>
          <span>{meta.rawSignals} raw signals scraped</span>
          <span>from {meta.channels.join(", ")}</span>
          <span className="ml-auto">
            {new Date(meta.scrapedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-3 bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {loading && leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-2 border-violet-600/30 animate-ping absolute" />
              <div className="w-16 h-16 rounded-full border-2 border-violet-600/60 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Scraping live data…</p>
              <p className="text-xs text-gray-500 mt-1">
                Fetching Reddit, Hacker News, GitHub Issues, Stack Overflow · ~20–40 seconds
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              {CHANNEL_OPTIONS.filter((c) => selectedChannels.includes(c.id)).map((ch) => (
                <span key={ch.id} className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded animate-pulse">
                  {ch.icon} {ch.label}
                </span>
              ))}
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-4">
            <div className="w-20 h-20 rounded-full bg-gray-800/60 flex items-center justify-center">
              <Play className="w-8 h-8 text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Scrape live intent signals</h2>
              <p className="text-sm text-gray-400 max-w-md">
                Click <strong className="text-white">Scrape Now</strong> to pull real posts and discussions from Reddit, Hacker News, GitHub Issues, and Stack Overflow where people are actively looking for tools, complaining about competitors, or evaluating solutions.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-lg">
              {CHANNEL_OPTIONS.map((ch) => (
                <div key={ch.id} className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">{ch.icon}</div>
                  <div className="text-xs font-medium text-gray-300">{ch.label}</div>
                  <div className="text-[10px] text-gray-600 mt-0.5">Free API</div>
                </div>
              ))}
            </div>
            <button
              onClick={runScrape}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Play className="w-4 h-4" />
              Scrape Now — No API Key Needed
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Search className="w-8 h-8 text-gray-600" />
            <p className="text-sm text-gray-400">No leads match &ldquo;{search}&rdquo;</p>
            <button onClick={() => setSearch("")} className="text-xs text-violet-400 hover:text-violet-300">
              Clear search
            </button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800">
              <tr>
                <th className="w-8 px-3 py-2.5 text-[10px] font-medium text-gray-600 text-right">#</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Platform</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Author</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider max-w-[260px]">Signal</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Pain Point</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Competitor</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Tech Stack</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Score</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Confidence</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                <th className="w-16 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <LeadRow key={lead.id} lead={lead} index={i} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
