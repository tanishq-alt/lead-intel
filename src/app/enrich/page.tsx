"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload, Download, Play, X, Loader2, AlertCircle, ExternalLink,
  Sparkles, CheckCircle2, Clock, ChevronDown, ChevronUp, Search,
  Building2, Cpu, Briefcase, Newspaper, Zap, Globe, Filter,
} from "lucide-react";
import type { EnrichedCompany } from "@/lib/enrichment/index";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowStatus = "pending" | "loading" | "done" | "error";

interface EnrichRow {
  domain: string;
  status: RowStatus;
  data: EnrichedCompany | null;
  error: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EXAMPLE_DOMAINS = [
  "notion.so",
  "linear.app",
  "vercel.com",
  "stripe.com",
  "intercom.com",
  "hubspot.com",
  "airtable.com",
  "figma.com",
];

const SCORE_COLOR = (s: number) =>
  s >= 7 ? "text-emerald-400 bg-emerald-900/30 border-emerald-800/50"
  : s >= 4 ? "text-amber-400 bg-amber-900/30 border-amber-800/50"
  : "text-gray-500 bg-gray-800/50 border-gray-700";

// ─── Column cell components ───────────────────────────────────────────────────

function TechChip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded border ${color} mr-1 mb-0.5`}>
      {label}
    </span>
  );
}

function NewsPopover({ items }: { items: EnrichedCompany["recentNews"] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return <span className="text-xs text-gray-700">—</span>;
  const funding = items.filter((n) => n.isFunding);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
        <Newspaper className="w-3 h-3" />
        {items.length} {funding.length > 0 && <span className="text-emerald-400 font-bold">💰</span>}
      </button>
      {open && (
        <div className="absolute z-50 top-6 left-0 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Recent news</span>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                className="block hover:bg-gray-800 rounded p-1.5 transition-colors">
                {n.isFunding && <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-800/50 px-1 py-0.5 rounded mr-1">FUNDING</span>}
                <div className="text-xs text-gray-200 leading-snug">{n.title}</div>
                <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.snippet}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpandedDetail({ row, onClose }: { row: EnrichRow; onClose: () => void }) {
  const d = row.data!;
  return (
    <tr className="bg-gray-900/80 border-b border-gray-800">
      <td colSpan={14} className="px-5 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Company */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3" /> Company
            </p>
            {d.logoUrl && (
              <img src={d.logoUrl} alt="" className="h-8 object-contain rounded" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <p className="text-sm font-semibold text-white">{d.companyName ?? d.domain}</p>
            {d.tagline && <p className="text-xs text-violet-300/80 italic">{d.tagline}</p>}
            {d.description && <p className="text-xs text-gray-400 leading-relaxed">{d.description}</p>}
            <div className="space-y-1 text-xs">
              {d.industry && <div><span className="text-gray-500">Industry: </span><span className="text-white">{d.industry}</span></div>}
              {d.location && <div><span className="text-gray-500">Location: </span><span className="text-white">{d.location}</span></div>}
              {d.employeeRange && <div><span className="text-gray-500">Employees: </span><span className="text-white">{d.employeeRange}</span></div>}
              {d.founded && <div><span className="text-gray-500">Founded: </span><span className="text-white">{d.founded}</span></div>}
              {d.emailPattern && <div><span className="text-gray-500">Email: </span><span className="text-cyan-400 font-mono text-[10px]">{d.emailPattern}</span></div>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {d.linkedinUrl && <a href={d.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />LinkedIn</a>}
              {d.twitterHandle && <a href={`https://twitter.com/${d.twitterHandle}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />@{d.twitterHandle}</a>}
              {d.githubUrl && <a href={d.githubUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-gray-400 hover:text-white flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />GitHub</a>}
            </div>
          </div>

          {/* Tech Stack */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Cpu className="w-3 h-3" /> Tech Stack
            </p>
            {[
              ["CMS", d.cms, "bg-blue-900/30 text-blue-300 border-blue-800/40"],
              ["Framework", d.framework, "bg-violet-900/30 text-violet-300 border-violet-800/40"],
              ["Hosting", d.hosting, "bg-gray-800 text-gray-300 border-gray-700"],
              ["CRM", d.crm, "bg-orange-900/30 text-orange-300 border-orange-800/40"],
              ["E-commerce", d.ecommerce, "bg-emerald-900/30 text-emerald-300 border-emerald-800/40"],
              ["Chat", d.chatSupport, "bg-purple-900/30 text-purple-300 border-purple-800/40"],
            ].filter(([, v]) => v).map(([k, v, c]) => (
              <div key={k as string} className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500">{k}</span>
                <TechChip label={v as string} color={c as string} />
              </div>
            ))}
            {d.analytics.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Analytics</p>
                <div className="flex flex-wrap">{d.analytics.map((a) => <TechChip key={a} label={a} color="bg-teal-900/30 text-teal-300 border-teal-800/40" />)}</div>
              </div>
            )}
            {d.adtech.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Ad Tech</p>
                <div className="flex flex-wrap">{d.adtech.map((a) => <TechChip key={a} label={a} color="bg-red-900/30 text-red-300 border-red-800/40" />)}</div>
              </div>
            )}
            {d.marketing.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Marketing</p>
                <div className="flex flex-wrap">{d.marketing.map((a) => <TechChip key={a} label={a} color="bg-pink-900/30 text-pink-300 border-pink-800/40" />)}</div>
              </div>
            )}
          </div>

          {/* Jobs */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> Hiring Signals
            </p>
            <div className="text-2xl font-bold text-white">{d.jobCount} <span className="text-xs text-gray-500 font-normal">open roles</span></div>
            {d.hiringRoles.length > 0 && (
              <div className="space-y-1">
                {d.hiringRoles.map((r) => (
                  <div key={r} className="text-[10px] text-gray-300 bg-gray-800 rounded px-2 py-1 truncate">{r}</div>
                ))}
              </div>
            )}
            {d.growthSignals.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-500 mb-1">Growth signals</p>
                {d.growthSignals.map((g) => (
                  <div key={g} className="text-[10px] text-amber-300 bg-amber-900/20 border border-amber-800/30 rounded px-2 py-1 mb-1">{g}</div>
                ))}
              </div>
            )}
            {d.toolsSignaled.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-500 mb-1">Tools detected from job posts</p>
                {d.toolsSignaled.map((t) => (
                  <div key={t} className="text-[10px] text-gray-300 bg-gray-800/60 rounded px-2 py-1 mb-1">{t}</div>
                ))}
              </div>
            )}
          </div>

          {/* Buy signals + news */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> Buy Signals
            </p>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border text-lg font-black ${SCORE_COLOR(d.intentScore)}`}>
              {d.intentScore}
            </div>
            {d.buySignals.map((s) => (
              <div key={s} className="text-[10px] text-gray-200 bg-violet-900/20 border border-violet-800/30 rounded px-2 py-1">{s}</div>
            ))}
            {d.fundingStage && (
              <div className="text-[10px] text-emerald-300 bg-emerald-900/20 border border-emerald-800/30 rounded px-2 py-1 font-semibold">
                💰 {d.fundingStage} funded
              </div>
            )}
            {d.recentNews.length > 0 && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-500 mb-1">Recent news</p>
                {d.recentNews.slice(0, 3).map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                    className="block text-[10px] text-blue-400 hover:text-blue-300 truncate mb-1">
                    {n.isFunding && "💰 "}{n.title.slice(0, 60)}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
        <button onClick={onClose} className="mt-4 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1">
          <X className="w-3 h-3" /> Collapse
        </button>
      </td>
    </tr>
  );
}

function EnrichTableRow({ row, index }: { row: EnrichRow; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const d = row.data;

  return (
    <>
      <tr
        className={`border-b border-gray-800/60 transition-colors ${
          row.status === "done" ? "hover:bg-gray-800/20 cursor-pointer" : ""
        }`}
        onClick={() => row.status === "done" && setExpanded((v) => !v)}
      >
        {/* # */}
        <td className="px-2 py-2.5 text-[10px] text-gray-700 tabular-nums text-right w-7">{index + 1}</td>

        {/* Status */}
        <td className="px-3 py-2.5 w-8">
          {row.status === "pending" && <Clock className="w-3.5 h-3.5 text-gray-600" />}
          {row.status === "loading" && <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />}
          {row.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          {row.status === "error" && <AlertCircle className="w-3.5 h-3.5 text-rose-400" aria-label={row.error ?? ""} />}
        </td>

        {/* Domain */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            {d?.logoUrl && (
              <img src={d.logoUrl} alt="" className="w-4 h-4 rounded object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <a href={`https://${row.domain}`} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-violet-400 hover:text-violet-300 font-mono">
              {row.domain}
            </a>
          </div>
        </td>

        {/* Company */}
        <td className="px-3 py-2.5 max-w-[120px]">
          <div className="text-xs text-white font-medium truncate">{d?.companyName ?? (row.status === "loading" ? "…" : "—")}</div>
          {d?.industry && <div className="text-[10px] text-gray-500 truncate">{d.industry}</div>}
        </td>

        {/* Description */}
        <td className="px-3 py-2.5 max-w-[200px] hidden lg:table-cell">
          <div className="text-[10px] text-gray-400 line-clamp-2 leading-snug">{d?.description ?? ""}</div>
        </td>

        {/* Tech Stack */}
        <td className="px-3 py-2.5">
          {d ? (
            <div className="flex flex-wrap gap-0.5">
              {d.framework && <TechChip label={d.framework} color="bg-violet-900/30 text-violet-300 border-violet-800/40" />}
              {d.cms && <TechChip label={d.cms} color="bg-blue-900/30 text-blue-300 border-blue-800/40" />}
              {d.hosting && <TechChip label={d.hosting} color="bg-gray-800 text-gray-300 border-gray-700" />}
              {d.allTech.filter((t) => t !== d.framework && t !== d.cms && t !== d.hosting).slice(0, 2).map((t) => (
                <TechChip key={t} label={t} color="bg-gray-800/60 text-gray-400 border-gray-700/60" />
              ))}
            </div>
          ) : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* CRM */}
        <td className="px-3 py-2.5 hidden xl:table-cell">
          {d?.crm
            ? <TechChip label={d.crm} color="bg-orange-900/30 text-orange-300 border-orange-800/40" />
            : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* Analytics (top 1) */}
        <td className="px-3 py-2.5 hidden xl:table-cell">
          {d?.analytics[0]
            ? <TechChip label={d.analytics[0]} color="bg-teal-900/30 text-teal-300 border-teal-800/40" />
            : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* Jobs */}
        <td className="px-3 py-2.5 text-center hidden lg:table-cell">
          {d && d.jobCount > 0
            ? <span className="text-xs text-white font-semibold">{d.jobCount}</span>
            : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* Funding */}
        <td className="px-3 py-2.5 hidden xl:table-cell">
          {d?.fundingStage
            ? <span className="text-[10px] text-emerald-400 font-semibold">💰 {d.fundingStage}</span>
            : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* News */}
        <td className="px-3 py-2.5 hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
          {d ? <NewsPopover items={d.recentNews} /> : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* Buy signals */}
        <td className="px-3 py-2.5 max-w-[140px] hidden xl:table-cell">
          <div className="flex flex-wrap gap-0.5">
            {d?.buySignals.slice(0, 2).map((s) => (
              <span key={s} className="text-[10px] text-violet-300/80 bg-violet-900/20 border border-violet-800/30 px-1 py-0.5 rounded truncate max-w-[130px]" title={s}>{s}</span>
            ))}
          </div>
        </td>

        {/* Intent score */}
        <td className="px-3 py-2.5 text-center">
          {d != null
            ? <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${SCORE_COLOR(d.intentScore)}`}>{d.intentScore}</span>
            : <span className="text-xs text-gray-700">—</span>}
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5 w-12">
          {row.status === "done" && (
            <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </td>
      </tr>
      {expanded && row.data && <ExpandedDetail row={row} onClose={() => setExpanded(false)} />}
    </>
  );
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function parseDomainsFromText(text: string): string[] {
  return text
    .split(/[\n,;]+/)
    .map((line) =>
      line
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
        .toLowerCase()
    )
    .filter((d) => d.length > 3 && d.includes(".") && !d.startsWith("#"));
}

function parseDomainsFromCsv(csv: string): string[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  const domains: string[] = [];
  for (const line of lines.slice(0, 200)) {
    const cols = line.split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
    for (const col of cols) {
      const d = col.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
      if (d.includes(".") && d.length > 3 && !d.startsWith("#")) {
        domains.push(d);
        break; // take first valid domain-like value per row
      }
    }
  }
  return [...new Set(domains)].slice(0, 50);
}

function exportEnrichedCsv(rows: EnrichRow[]) {
  const done = rows.filter((r) => r.status === "done" && r.data);
  if (!done.length) return;
  const cols = [
    "Domain", "Company", "Description", "Industry", "Location", "Employees",
    "Founded", "Email Pattern", "LinkedIn", "Twitter", "GitHub",
    "Framework", "CMS", "Hosting", "CRM", "E-commerce", "Chat Support",
    "Analytics", "Ad Tech", "Marketing Tools", "All Tech",
    "Jobs Count", "Hiring Roles", "Tools from Jobs", "Growth Signals",
    "Funding Stage", "Recent News", "Buy Signals", "Intent Score", "Enriched At",
  ];
  const rows2 = done.map((r) => {
    const d = r.data!;
    return [
      d.domain, d.companyName ?? "", (d.description ?? "").replace(/"/g, '""'),
      d.industry ?? "", d.location ?? "", d.employeeRange ?? "", d.founded ?? "",
      d.emailPattern ?? "", d.linkedinUrl ?? "", d.twitterHandle ? `@${d.twitterHandle}` : "", d.githubUrl ?? "",
      d.framework ?? "", d.cms ?? "", d.hosting ?? "", d.crm ?? "", d.ecommerce ?? "", d.chatSupport ?? "",
      d.analytics.join("; "), d.adtech.join("; "), d.marketing.join("; "), d.allTech.join("; "),
      d.jobCount, d.hiringRoles.join("; "), d.toolsSignaled.join("; "), d.growthSignals.join("; "),
      d.fundingStage ?? "", d.recentNews.map((n) => n.title).join(" | ").replace(/"/g, '""'),
      d.buySignals.join("; ").replace(/"/g, '""'), d.intentScore, d.enrichedAt,
    ];
  });
  const csv = [cols, ...rows2].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `enriched-companies-${new Date().toISOString().split("T")[0]}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

interface TechFilters {
  crm: string | null;
  framework: string | null;
  analytics: string | null;
  hosting: string | null;
  nocrm: boolean;
  funded: boolean;
  highIntent: boolean;
  search: string;
}

const EMPTY_FILTERS: TechFilters = {
  crm: null, framework: null, analytics: null, hosting: null,
  nocrm: false, funded: false, highIntent: false, search: "",
};

function countBy(rows: EnrichRow[], key: (d: EnrichedCompany) => string | null): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "done" || !row.data) continue;
    const v = key(row.data);
    if (v) m.set(v, (m.get(v) ?? 0) + 1);
  }
  return m;
}

function countByArray(rows: EnrichRow[], key: (d: EnrichedCompany) => string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "done" || !row.data) continue;
    for (const v of key(row.data)) {
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
  }
  return m;
}

function topEntries(m: Map<string, number>, limit = 6): [string, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function FilterChip({
  label, count, active, onClick,
}: {
  label: string; count?: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
        active
          ? "bg-violet-600 border-violet-500 text-white"
          : "bg-gray-800/60 border-gray-700/60 text-gray-400 hover:border-gray-500 hover:text-gray-200"
      }`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[9px] ${active ? "text-violet-200" : "text-gray-600"}`}>{count}</span>
      )}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EnrichPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<EnrichRow[]>([]);
  const [running, setRunning] = useState(false);
  const [filters, setFilters] = useState<TechFilters>(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setFilter = <K extends keyof TechFilters>(key: K, val: TechFilters[K]) =>
    setFilters((f) => ({ ...f, [key]: f[key] === val ? (typeof val === "boolean" ? false : null) as TechFilters[K] : val }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const activeFilterCount = Object.values(filters).filter((v) => v !== null && v !== false && v !== "").length;

  const updateRow = useCallback((domain: string, patch: Partial<EnrichRow>) => {
    setRows((prev) => prev.map((r) => r.domain === domain ? { ...r, ...patch } : r));
  }, []);

  const startEnrichment = useCallback(async (domains: string[]) => {
    if (!domains.length || running) return;
    const deduped = [...new Set(domains)].slice(0, 50);
    setRows(deduped.map((d) => ({ domain: d, status: "pending", data: null, error: null })));
    setFilters(EMPTY_FILTERS);
    setRunning(true);

    const batchSize = 5;
    for (let i = 0; i < deduped.length; i += batchSize) {
      const batch = deduped.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (domain) => {
          updateRow(domain, { status: "loading" });
          try {
            const res = await fetch(`/api/enrich?domain=${encodeURIComponent(domain)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: EnrichedCompany = await res.json();
            updateRow(domain, { status: "done", data });
          } catch (err) {
            updateRow(domain, { status: "error", error: String(err) });
          }
        })
      );
    }
    setRunning(false);
  }, [running, updateRow]);

  const handleRun = () => {
    const domains = parseDomainsFromText(input);
    if (!domains.length) return;
    startEnrichment(domains);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const domains = parseDomainsFromCsv(ev.target?.result as string);
      setInput(domains.join("\n"));
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Derived filter counts (from enriched rows only) ───────────────────────
  const doneRows = rows.filter((r) => r.status === "done" && r.data);
  const crmCounts     = countBy(doneRows, (d) => d.crm);
  const frameworkCounts = countBy(doneRows, (d) => d.framework);
  const analyticsCounts = countByArray(doneRows, (d) => d.analytics);
  const hostingCounts = countBy(doneRows, (d) => d.hosting);
  const noCrmCount    = doneRows.filter((r) => !r.data?.crm).length;
  const fundedCount   = doneRows.filter((r) => r.data?.isFundingSignal).length;
  const highIntentCount = doneRows.filter((r) => (r.data?.intentScore ?? 0) >= 6).length;

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = rows.filter((r) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const hit = [r.domain, r.data?.companyName, r.data?.industry, r.data?.crm, r.data?.framework, r.data?.hosting, ...(r.data?.analytics ?? []), ...(r.data?.allTech ?? [])]
        .some((v) => v?.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (filters.crm && r.data?.crm !== filters.crm) return false;
    if (filters.framework && r.data?.framework !== filters.framework) return false;
    if (filters.analytics && !r.data?.analytics.includes(filters.analytics)) return false;
    if (filters.hosting && r.data?.hosting !== filters.hosting) return false;
    if (filters.nocrm && r.data?.crm) return false;
    if (filters.funded && !r.data?.isFundingSignal) return false;
    if (filters.highIntent && (r.data?.intentScore ?? 0) < 6) return false;
    return true;
  });

  const doneCount = rows.filter((r) => r.status === "done").length;

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-950">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 border-b border-gray-800 px-5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Company Enrichment
          </h1>
          <p className="text-xs text-gray-500">
            Paste domains → tech stack, CRM, analytics, jobs, funding, buy signals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {doneCount > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Search…"
                  className="bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 w-32"
                />
              </div>
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
                }`}
              >
                <Filter className="w-3 h-3" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-[9px] flex items-center justify-center font-bold">{activeFilterCount}</span>
                )}
              </button>
              <button onClick={() => exportEnrichedCsv(rows)} disabled={!doneCount}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Structured filter panel ── */}
      {showFilters && doneCount > 0 && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/60 px-5 py-3 space-y-3">

          {/* Quick filters row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-20">Quick</span>
            <FilterChip label="High intent ≥6" count={highIntentCount} active={filters.highIntent} onClick={() => setFilter("highIntent", !filters.highIntent)} />
            {fundedCount > 0 && <FilterChip label="💰 Funded" count={fundedCount} active={filters.funded} onClick={() => setFilter("funded", !filters.funded)} />}
            {noCrmCount > 0 && <FilterChip label="No CRM" count={noCrmCount} active={filters.nocrm} onClick={() => setFilter("nocrm", !filters.nocrm)} />}
          </div>

          {/* CRM row */}
          {crmCounts.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-20">CRM</span>
              {topEntries(crmCounts).map(([v, n]) => (
                <FilterChip key={v} label={v} count={n} active={filters.crm === v} onClick={() => setFilter("crm", v)} />
              ))}
            </div>
          )}

          {/* Framework row */}
          {frameworkCounts.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-20">Framework</span>
              {topEntries(frameworkCounts).map(([v, n]) => (
                <FilterChip key={v} label={v} count={n} active={filters.framework === v} onClick={() => setFilter("framework", v)} />
              ))}
            </div>
          )}

          {/* Analytics row */}
          {analyticsCounts.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-20">Analytics</span>
              {topEntries(analyticsCounts).map(([v, n]) => (
                <FilterChip key={v} label={v} count={n} active={filters.analytics === v} onClick={() => setFilter("analytics", v)} />
              ))}
            </div>
          )}

          {/* Hosting row */}
          {hostingCounts.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider w-20">Hosting</span>
              {topEntries(hostingCounts).map(([v, n]) => (
                <FilterChip key={v} label={v} count={n} active={filters.hosting === v} onClick={() => setFilter("hosting", v)} />
              ))}
            </div>
          )}

          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Stats bar ── */}
      {rows.length > 0 && (
        <div className="flex-shrink-0 border-b border-gray-800/50 bg-gray-900/20 px-5 py-2 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
          <span className="text-white font-semibold">{doneCount}/{rows.length}</span> enriched
          {running && <Loader2 className="w-3 h-3 animate-spin text-violet-400" />}
          {activeFilterCount > 0 && (
            <span className="text-violet-400">→ {filtered.length} shown after filters</span>
          )}
          <span>·</span>
          <span className="text-violet-400 font-medium">{highIntentCount}</span> high-intent
          {fundedCount > 0 && <><span>·</span><span className="text-emerald-400">💰 {fundedCount} funded</span></>}
          {crmCounts.size > 0 && (
            <><span>·</span><span>{crmCounts.size} CRM{crmCounts.size > 1 ? "s" : ""} detected</span></>
          )}
          <span className="ml-auto">
            <button onClick={() => { setRows([]); setInput(""); setFilters(EMPTY_FILTERS); }}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-3 h-3" /> Clear
            </button>
          </span>
        </div>
      )}

      {/* ── Input area ── */}
      {rows.length === 0 && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/40 px-5 py-6">
          <div className="max-w-2xl space-y-4">
            <div>
              <label className="text-xs font-semibold text-white uppercase tracking-wider block mb-2">
                Domains to enrich <span className="text-gray-600 font-normal normal-case">(one per line, or upload CSV)</span>
              </label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"notion.so\nlinear.app\nvercel.com\nhubspot.com"}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 font-mono resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleRun} disabled={!input.trim() || running}
                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors">
                <Play className="w-4 h-4" /> Enrich {parseDomainsFromText(input).length > 0 ? `${parseDomainsFromText(input).length} domains` : ""}
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-xl hover:bg-gray-700 transition-colors">
                <Upload className="w-4 h-4" /> Upload CSV
              </button>
              <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              <button onClick={() => setInput(EXAMPLE_DOMAINS.join("\n"))}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Load examples
              </button>
            </div>
            {input.trim() && (
              <p className="text-xs text-gray-500">
                <Globe className="w-3 h-3 inline mr-1" />
                {parseDomainsFromText(input).length} domains · Each gets: tech stack, CRM, analytics, jobs, news, buy signals
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      {rows.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800">
              <tr>
                {[
                  { label: "#",           cls: "w-7 text-right" },
                  { label: "",            cls: "w-8" },
                  { label: "Domain" },
                  { label: "Company" },
                  { label: "Description", cls: "hidden lg:table-cell max-w-[200px]" },
                  { label: "Tech Stack" },
                  { label: "CRM",         cls: "hidden xl:table-cell" },
                  { label: "Analytics",   cls: "hidden xl:table-cell" },
                  { label: "Jobs",        cls: "hidden lg:table-cell text-center" },
                  { label: "Funding",     cls: "hidden xl:table-cell" },
                  { label: "News",        cls: "hidden lg:table-cell" },
                  { label: "Buy Signals", cls: "hidden xl:table-cell" },
                  { label: "Score",       cls: "text-center" },
                  { label: "",            cls: "w-12" },
                ].map((col, i) => (
                  <th key={i} className={`px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider ${col.cls ?? ""}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <EnrichTableRow key={row.domain} row={row} index={i} />
              ))}
              {filtered.length === 0 && doneCount > 0 && (
                <tr>
                  <td colSpan={14} className="px-5 py-10 text-center text-sm text-gray-500">
                    No companies match current filters.
                    <button onClick={clearFilters} className="ml-2 text-violet-400 hover:text-violet-300">Clear filters</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Empty state ── */}
      {rows.length === 0 && !input && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">Paste domains, get Clay-style enrichment</h2>
            <p className="text-xs text-gray-500 max-w-md">
              Drop in a list of company domains. Detects their actual tech stack from live HTML + headers —
              CRM, analytics, ad tech, frameworks. Filter by any detected technology to find your target segment.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-600">
            {["CRM detection", "Analytics stack", "Ad tech", "Framework", "Funding signals", "Job-based tool signals"].map((f) => (
              <span key={f} className="bg-gray-800 border border-gray-700 px-2.5 py-1 rounded-lg">{f}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
