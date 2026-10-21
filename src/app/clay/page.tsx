"use client";

import { useState, useCallback, useRef } from "react";
import {
  Play, Download, X, Filter, Loader2, AlertCircle,
  ExternalLink, Eye, Zap, ChevronDown, ChevronUp,
  Search, Sparkles, Settings2, Calendar, Globe, Cpu,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface TechProfile {
  domain: string;
  technologies: string[];
  cms: string | null;
  framework: string | null;
  analytics: string[];
  crm: string | null;
  marketing: string[];
  hosting: string | null;
  adtech: string[];
  ecommerce: string | null;
  chatSupport: string | null;
}

// ─── Source definitions ───────────────────────────────────────────────────────

const SOURCES = [
  { id: "REDDIT",         label: "Reddit",          icon: "🟠", desc: "r/entrepreneur, r/SaaS, industry subs" },
  { id: "HACKER_NEWS",    label: "Hacker News",     icon: "🔶", desc: "Stories, Ask HN, comments" },
  { id: "LINKEDIN",       label: "LinkedIn",        icon: "🔵", desc: "Posts, articles, pulse, company pages" },
  { id: "TWITTER",        label: "Twitter / X",     icon: "🐦", desc: "Complaints, asks, comparisons" },
  { id: "YOUTUBE",        label: "YouTube",         icon: "🔴", desc: "Reviews, comparisons, tutorials" },
  { id: "FACEBOOK_GROUPS",label: "FB Groups",       icon: "📘", desc: "Facebook group discussions" },
  { id: "QUORA",          label: "Quora",           icon: "🔴", desc: "Questions about tools & alternatives" },
  { id: "G2",             label: "G2 / Capterra",   icon: "⭐", desc: "Software reviews, complaints, praise" },
  { id: "MEDIUM",         label: "Medium",          icon: "✍️", desc: "Articles, opinions, comparisons" },
  { id: "GITHUB_ISSUES",  label: "GitHub",          icon: "⚫", desc: "Open issues, feature requests" },
  { id: "STACKOVERFLOW",  label: "Stack Overflow",  icon: "🟡", desc: "Questions about tools & migration" },
  { id: "DEV_TO",         label: "Dev.to",          icon: "🟣", desc: "Technical articles & discussions" },
  { id: "PRODUCT_HUNT",   label: "Product Hunt",    icon: "🟤", desc: "Launches, comments, upvotes" },
  { id: "JOBS",           label: "Job Boards",      icon: "💼", desc: "RemoteOK, Indeed, HN Hiring signals" },
];

const DEFAULT_SOURCES = [
  "REDDIT", "HACKER_NEWS", "LINKEDIN", "TWITTER", "YOUTUBE",
  "QUORA", "G2", "MEDIUM", "GITHUB_ISSUES", "DEV_TO", "JOBS",
];

const PLATFORM_COLORS: Record<string, string> = {
  REDDIT:         "bg-orange-900/40 text-orange-300 border-orange-800/40",
  HACKER_NEWS:    "bg-amber-900/40 text-amber-300 border-amber-800/40",
  LINKEDIN:       "bg-blue-900/40 text-blue-300 border-blue-800/40",
  TWITTER:        "bg-sky-900/40 text-sky-300 border-sky-800/40",
  YOUTUBE:        "bg-red-900/40 text-red-300 border-red-800/40",
  FACEBOOK_GROUPS:"bg-indigo-900/40 text-indigo-300 border-indigo-800/40",
  QUORA:          "bg-rose-900/40 text-rose-300 border-rose-800/40",
  G2:             "bg-yellow-900/40 text-yellow-300 border-yellow-800/40",
  MEDIUM:         "bg-teal-900/40 text-teal-300 border-teal-800/40",
  GITHUB_ISSUES:  "bg-gray-800 text-gray-200 border-gray-700",
  STACKOVERFLOW:  "bg-orange-900/30 text-orange-200 border-orange-800/30",
  DEV_TO:         "bg-purple-900/40 text-purple-300 border-purple-800/40",
  PRODUCT_HUNT:   "bg-rose-900/40 text-rose-300 border-rose-800/40",
  JOBS:           "bg-emerald-900/40 text-emerald-300 border-emerald-800/40",
  CUSTOM:         "bg-cyan-900/40 text-cyan-300 border-cyan-800/40",
};

const SHORT_NAME: Record<string, string> = {
  REDDIT: "Reddit", HACKER_NEWS: "HN", LINKEDIN: "LinkedIn",
  TWITTER: "Twitter", YOUTUBE: "YouTube", FACEBOOK_GROUPS: "FB Groups",
  QUORA: "Quora", G2: "G2", MEDIUM: "Medium",
  GITHUB_ISSUES: "GitHub", STACKOVERFLOW: "SO", DEV_TO: "Dev.to",
  PRODUCT_HUNT: "PH", JOBS: "Jobs", CUSTOM: "Custom",
};

const SCORE_COLOR = (s: number) =>
  s >= 8 ? "text-emerald-400 bg-emerald-900/40 border-emerald-800/50"
  : s >= 6 ? "text-violet-400 bg-violet-900/40 border-violet-800/50"
  : s >= 4 ? "text-amber-400 bg-amber-900/40 border-amber-800/50"
  : "text-gray-500 bg-gray-800 border-gray-700";

const NICHE_PRESETS = [
  { label: "CRM / Sales",     keywords: "CRM, sales software",            competitors: "HubSpot, Salesforce, Pipedrive" },
  { label: "HR / Payroll",    keywords: "HR software, payroll, HRIS",     competitors: "Workday, BambooHR, Gusto, Rippling" },
  { label: "DevOps / Infra",  keywords: "DevOps, CI/CD, infrastructure",  competitors: "AWS, Datadog, GitHub Actions" },
  { label: "Project Mgmt",   keywords: "project management, task tracker", competitors: "Jira, Asana, Notion, Linear" },
  { label: "Marketing",       keywords: "email marketing, automation",     competitors: "HubSpot, Mailchimp, Marketo" },
  { label: "E-commerce",      keywords: "ecommerce platform, online store",competitors: "Shopify, WooCommerce, BigCommerce" },
  { label: "Analytics",       keywords: "product analytics, tracking",     competitors: "Mixpanel, Amplitude, Segment" },
  { label: "Support",         keywords: "customer support, helpdesk",      competitors: "Zendesk, Intercom, Freshdesk" },
];

const DATE_RANGES = [
  { id: "today", label: "Today" },
  { id: "7d",    label: "7 days" },
  { id: "30d",   label: "30 days" },
  { id: "90d",   label: "90 days" },
  { id: "all",   label: "All time" },
] as const;

type DateRange = typeof DATE_RANGES[number]["id"];

// ─── Components ───────────────────────────────────────────────────────────────

function SourceToggle({
  source, active, onClick,
}: {
  source: typeof SOURCES[0]; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
        active
          ? "bg-violet-600/20 border-violet-500/60 text-white"
          : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:border-gray-600"
      }`}
    >
      <span className="text-base mt-0.5">{source.icon}</span>
      <div className="min-w-0">
        <div className={`text-xs font-semibold ${active ? "text-white" : "text-gray-300"}`}>
          {source.label}
        </div>
        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{source.desc}</div>
      </div>
      <div className={`w-2 h-2 rounded-full mt-1 ml-auto flex-shrink-0 ${active ? "bg-violet-400" : "bg-gray-700"}`} />
    </button>
  );
}

function TechLookupButton({ company }: { company: string | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [profile, setProfile] = useState<TechProfile | null>(null);
  const [open, setOpen] = useState(false);

  if (!company) return <span className="text-xs text-gray-700">—</span>;

  const lookup = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/techdetect?domain=${encodeURIComponent(company)}`);
      if (!res.ok) throw new Error("failed");
      const data: TechProfile = await res.json();
      setProfile(data);
      setStatus("done");
      setOpen(true);
    } catch {
      setStatus("error");
    }
  };

  if (status === "idle" || status === "error") {
    return (
      <button onClick={lookup}
        className="flex items-center gap-1 text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors">
        <Cpu className="w-3 h-3" />
        {status === "error" ? "Retry" : "Detect"}
      </button>
    );
  }

  if (status === "loading") {
    return <Loader2 className="w-3 h-3 text-cyan-500 animate-spin" />;
  }

  if (status === "done" && profile) {
    const tech = profile.technologies.slice(0, 3).join(", ") || "—";
    return (
      <div className="relative">
        <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 truncate max-w-[100px] block" title={tech}>
          {tech}
        </button>
        {open && (
          <div className="absolute z-50 top-5 left-0 bg-gray-900 border border-gray-700 rounded-xl p-3 w-64 shadow-xl text-xs"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-white">{profile.domain}</span>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white"><X className="w-3 h-3" /></button>
            </div>
            {[
              ["CMS", profile.cms],
              ["Framework", profile.framework],
              ["Hosting", profile.hosting],
              ["CRM", profile.crm],
              ["E-commerce", profile.ecommerce],
              ["Chat", profile.chatSupport],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-0.5">
                <span className="text-gray-500">{k}</span>
                <span className="text-white">{v as string}</span>
              </div>
            ))}
            {profile.analytics.length > 0 && (
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Analytics</span>
                <span className="text-white">{profile.analytics.slice(0,2).join(", ")}</span>
              </div>
            )}
            {profile.adtech.length > 0 && (
              <div className="flex justify-between py-0.5">
                <span className="text-gray-500">Ad Tech</span>
                <span className="text-white">{profile.adtech.slice(0,2).join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
}

function ExpandedRow({ lead, onClose }: { lead: LiveLead; onClose: () => void }) {
  return (
    <tr className="bg-gray-900/80 border-b border-gray-800">
      <td colSpan={14} className="px-5 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Original Post</p>
              <p className="text-sm font-semibold text-white">{lead.title}</p>
              <div className="mt-2 bg-gray-800/60 rounded-lg p-3 text-xs text-gray-300 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                {lead.fullBody.slice(0, 1200)}{lead.fullBody.length > 1200 ? "…" : ""}
              </div>
            </div>
            {lead.outreachAngle && (
              <div className="bg-violet-900/20 border border-violet-800/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-violet-400 flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3" /> Outreach Angle
                </p>
                <p className="text-xs text-gray-200 leading-relaxed">{lead.outreachAngle}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { l: "Intent", v: `${lead.intentScore}/10`, hi: true },
                { l: "Confidence", v: `${lead.confidenceScore}%`, hi: false },
                { l: "Upvotes", v: String(lead.score) },
                { l: "Comments", v: String(lead.comments) },
              ].map((s) => (
                <div key={s.l} className="bg-gray-800/60 rounded-lg p-2 text-center">
                  <div className={`text-sm font-bold ${s.hi ? "text-violet-400" : "text-white"}`}>{s.v}</div>
                  <div className="text-[10px] text-gray-500">{s.l}</div>
                </div>
              ))}
            </div>
            {lead.keywords.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-500 mb-1">Keywords matched</p>
                <div className="flex flex-wrap gap-1">
                  {lead.keywords.map((k) => (
                    <span key={k} className="text-[10px] bg-violet-900/30 text-violet-300 border border-violet-800/40 px-1.5 py-0.5 rounded">{k}</span>
                  ))}
                </div>
              </div>
            )}
            {lead.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {lead.tags.slice(0, 8).map((t) => (
                  <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <a href={lead.platformUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300">
                <ExternalLink className="w-3 h-3" /> View original post
              </a>
              {lead.authorUrl && (
                <a href={lead.authorUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300">
                  <ExternalLink className="w-3 h-3" /> Author profile
                </a>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="mt-3 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1">
          <X className="w-3 h-3" /> Collapse
        </button>
      </td>
    </tr>
  );
}

function LeadRow({ lead, index }: { lead: LiveLead; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const daysAgo = Math.floor((Date.now() - new Date(lead.postedAt).getTime()) / 86400000);

  return (
    <>
      <tr className="border-b border-gray-800/60 hover:bg-gray-800/25 transition-colors group cursor-pointer"
        onClick={() => setExpanded((v) => !v)}>
        <td className="px-2 py-2.5 text-[10px] text-gray-700 tabular-nums text-right select-none w-7">{index + 1}</td>
        <td className="px-3 py-2.5">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${PLATFORM_COLORS[lead.platform] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
            {SHORT_NAME[lead.platform] ?? lead.platform}
          </span>
          {lead.subreddit && <div className="text-[10px] text-gray-600 mt-0.5">r/{lead.subreddit}</div>}
        </td>
        <td className="px-3 py-2.5 max-w-[130px]">
          <div className="text-xs text-white font-medium truncate">{lead.author}</div>
          {lead.designation && <div className="text-[10px] text-violet-400/70 truncate">{lead.designation}</div>}
        </td>
        <td className="px-3 py-2.5 max-w-[110px]">
          {lead.company
            ? <span className="text-xs text-gray-200 truncate block">{lead.company}</span>
            : <span className="text-xs text-gray-700">—</span>}
          {lead.industry && <div className="text-[10px] text-gray-500 truncate">{lead.industry}</div>}
        </td>
        <td className="px-3 py-2.5 max-w-[240px]">
          <div className="text-xs text-gray-200 truncate leading-snug">{lead.title}</div>
          <div className="text-[10px] text-gray-500 truncate mt-0.5">{lead.bodyPreview}</div>
        </td>
        <td className="px-3 py-2.5 max-w-[160px] hidden xl:table-cell">
          {lead.painPoint
            ? <span className="text-[10px] text-rose-300/70 block truncate leading-snug">{lead.painPoint}</span>
            : <span className="text-xs text-gray-700">—</span>}
        </td>
        <td className="px-3 py-2.5 hidden lg:table-cell">
          {lead.competitorMentioned
            ? <span className="text-[10px] text-red-300 bg-red-900/20 border border-red-900/30 px-1.5 py-0.5 rounded">{lead.competitorMentioned}</span>
            : <span className="text-xs text-gray-700">—</span>}
        </td>
        <td className="px-3 py-2.5 hidden xl:table-cell" onClick={(e) => e.stopPropagation()}>
          <TechLookupButton company={lead.company} />
        </td>
        <td className="px-3 py-2.5 text-center">
          <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold border ${SCORE_COLOR(lead.intentScore)}`}>
            {lead.intentScore}
          </span>
        </td>
        <td className="px-3 py-2.5 hidden lg:table-cell">
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-violet-600 rounded-full" style={{ width: `${lead.confidenceScore}%` }} />
            </div>
            <span className="text-[10px] text-gray-500 tabular-nums">{lead.confidenceScore}%</span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-[10px] text-gray-500 whitespace-nowrap hidden lg:table-cell">
          {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo}d ago`}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-white transition-colors" title="Expand">
              <Eye className="w-3.5 h-3.5" />
            </button>
            <a href={lead.platformUrl} target="_blank" rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-violet-400 transition-colors" title="Open source">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </td>
      </tr>
      {expanded && <ExpandedRow lead={lead} onClose={() => setExpanded(false)} />}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ClayPage() {
  const [niche, setNiche] = useState("");
  const [keywords, setKeywords] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [customUrls, setCustomUrls] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [selectedSources, setSelectedSources] = useState<string[]>(DEFAULT_SOURCES);
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(true);
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string | null>(null);

  const [leads, setLeads] = useState<LiveLead[]>([]);
  const [meta, setMeta] = useState<ScrapeResult["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const toggleSource = (id: string) => {
    setSelectedSources((p) => p.includes(id) ? p.filter((s) => s !== id) : [...p, id]);
  };

  const applyPreset = (preset: typeof NICHE_PRESETS[0]) => {
    setNiche(preset.label);
    setKeywords(preset.keywords);
    setCompetitors(preset.competitors);
  };

  const buildKeywordList = (): string[] => {
    const all: string[] = [];
    if (niche) all.push(niche);
    keywords.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => all.push(k));
    return [...new Set(all)];
  };

  const buildCustomUrlList = (): string[] =>
    customUrls.split(/[\n,]+/).map((u) => u.trim()).filter((u) => u.length > 4);

  const runScrape = useCallback(async () => {
    const kwList = buildKeywordList();
    const urlList = buildCustomUrlList();
    if (!kwList.length && !urlList.length) {
      setError("Enter a niche, keywords, or custom URLs to scrape.");
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);
    setProgress([]);
    setShowSettings(false);
    setFilterPlatform(null);

    const compList = competitors.split(",").map((c) => c.trim()).filter(Boolean);

    const msgs = [
      "Searching " + selectedSources.slice(0, 4).map((s) => SHORT_NAME[s]).join(", ") + "…",
      "Detecting intent signals…",
      "Scoring and ranking leads…",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < msgs.length) setProgress((p) => [...p.slice(-2), msgs[i++]]);
    }, 5000);

    try {
      const body = {
        channels: selectedSources.length === SOURCES.length ? ["ALL"] : selectedSources,
        keywords: kwList,
        competitors: compList,
        minScore,
        limit: 150,
        dateRange,
        customUrls: urlList,
      };

      const res = await fetch("/api/scrape/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      clearInterval(interval);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }

      const data: ScrapeResult = await res.json();
      setLeads(data.leads);
      setMeta(data.meta);
      setProgress([]);
    } catch (err) {
      clearInterval(interval);
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Scrape failed");
        setShowSettings(true);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, keywords, competitors, customUrls, selectedSources, minScore, dateRange]);

  const filtered = leads.filter((l) => {
    if (filterPlatform && l.platform !== filterPlatform) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [l.author, l.title, l.company, l.painPoint, l.competitorMentioned, l.techStack, l.bodyPreview, l.platform]
      .some((v) => v?.toLowerCase().includes(q));
  });

  const exportCsv = () => {
    if (!filtered.length) return;
    const cols = ["#","Platform","Author","Designation","Company","Industry","Title","Body Preview","Pain Point","Competitor","Tech Stack","Intent Score","Confidence","Intent Signals","Keywords","Date","URL","Outreach Angle"];
    const rows = filtered.map((l, i) => [
      i+1, l.platform, l.author, l.designation ?? "", l.company ?? "", l.industry ?? "",
      l.title.replace(/"/g,'""'), l.bodyPreview.replace(/"/g,'""'),
      (l.painPoint ?? "").replace(/"/g,'""'), l.competitorMentioned ?? "",
      l.techStack ?? "", l.intentScore, l.confidenceScore, l.intentSignals,
      l.keywords.join("; "), new Date(l.postedAt).toISOString(), l.platformUrl,
      (l.outreachAngle ?? "").replace(/"/g,'""'),
    ]);
    const csv = [cols, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `leads-${niche.replace(/\s+/g,"_")}-${new Date().toISOString().split("T")[0]}.csv`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const highIntent = filtered.filter((l) => l.intentScore >= 7).length;
  const platformCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.platform] = (acc[l.platform] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-950">

      {/* ── Top bar ── */}
      <div className="flex-shrink-0 border-b border-gray-800 px-5 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            Live Lead Scraper
          </h1>
          <p className="text-xs text-gray-500">
            LinkedIn · Reddit · Twitter · YouTube · G2 · Medium · Quora · GitHub · Jobs · +more
          </p>
        </div>

        <div className="flex items-center gap-2">
          {leads.length > 0 && (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter results…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 w-36"
                />
              </div>
              <button onClick={() => setShowFilterBar((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${showFilterBar ? "bg-violet-600 border-violet-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"}`}>
                <Filter className="w-3 h-3" /> Filter
              </button>
              <button onClick={exportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-200 text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button onClick={() => setShowSettings((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600 transition-colors">
                <Settings2 className="w-3 h-3" />
                {showSettings ? "Hide" : "Edit"} Setup
              </button>
            </>
          )}
          <button onClick={runScrape} disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60 min-w-[120px] justify-center">
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scraping…</>
              : <><Play className="w-3.5 h-3.5" />{leads.length > 0 ? "Re-scrape" : "Scrape Now"}</>}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex-shrink-0 mx-4 mt-3 bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── Setup panel ── */}
      {showSettings && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/50 px-5 py-5 overflow-y-auto max-h-[70vh]">
          <div className="max-w-5xl space-y-5">

            {/* Niche input + presets */}
            <div>
              <label className="text-xs font-semibold text-white uppercase tracking-wider block mb-2">
                What are you selling? / Your niche
              </label>
              <div className="flex gap-2 flex-wrap mb-2">
                {NICHE_PRESETS.map((p) => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      niche === p.label
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="e.g. CRM software, HR payroll tool, DevOps platform…"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Keywords */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Extra keywords <span className="text-gray-600 normal-case font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="alternative, pricing, migration, frustrated…"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              {/* Competitors */}
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Competitors to monitor <span className="text-gray-600 normal-case font-normal">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="HubSpot, Salesforce, Zendesk…"
                  value={competitors}
                  onChange={(e) => setCompetitors(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5" /> Date range
              </label>
              <div className="flex gap-2">
                {DATE_RANGES.map((d) => (
                  <button key={d.id} onClick={() => setDateRange(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      dateRange === d.id
                        ? "bg-violet-600 border-violet-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white"
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URLs */}
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <Globe className="w-3.5 h-3.5" /> Custom websites to scrape
                <span className="text-gray-600 normal-case font-normal">(one per line or comma-separated)</span>
              </label>
              <textarea
                placeholder="https://example.com/blog&#10;https://news.ycombinator.com&#10;https://company.io/changelog"
                value={customUrls}
                onChange={(e) => setCustomUrls(e.target.value)}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono"
              />
            </div>

            {/* Sources */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Sources <span className="text-gray-600 normal-case font-normal">({selectedSources.length}/{SOURCES.length} selected)</span>
                </label>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setSelectedSources(SOURCES.map((s) => s.id))} className="text-violet-400 hover:text-violet-300">All</button>
                  <span className="text-gray-700">·</span>
                  <button onClick={() => setSelectedSources([])} className="text-gray-500 hover:text-gray-400">None</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2">
                {SOURCES.map((s) => (
                  <SourceToggle key={s.id} source={s} active={selectedSources.includes(s.id)} onClick={() => toggleSource(s.id)} />
                ))}
              </div>
            </div>

            {/* Min score */}
            <div className="flex items-end gap-6">
              <div className="flex-1 max-w-xs">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Min intent score: <span className="text-white">{minScore === 0 ? "All" : minScore}</span>
                </label>
                <input type="range" min={0} max={8} step={1} value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer" />
                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                  <span>0 · Show all</span><span>4 · Mid</span><span>8 · Hot</span>
                </div>
              </div>

              {buildKeywordList().length > 0 && (
                <div className="flex-1 text-xs text-gray-500 pb-1">
                  <span className="text-gray-400 font-medium">Will search: </span>
                  {buildKeywordList().slice(0, 2).map((k) => (
                    <span key={k} className="mr-1">&ldquo;{k} alternative&rdquo;,</span>
                  ))}
                  {competitors.split(",")[0]?.trim() && (
                    <span>&ldquo;switching from {competitors.split(",")[0].trim()}&rdquo;</span>
                  )}
                  <span className="text-gray-600"> + {8 + (buildKeywordList().length * 5)} more queries</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Filter bar (post-scrape) ── */}
      {showFilterBar && leads.length > 0 && (
        <div className="flex-shrink-0 border-b border-gray-800 bg-gray-900/30 px-5 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Score ≥</span>
          <input type="range" min={0} max={9} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-20 accent-violet-600" />
          <span className="text-xs text-white w-3">{minScore}</span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-500">Platform:</span>
          <button onClick={() => setFilterPlatform(null)}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              !filterPlatform ? "bg-violet-600 border-violet-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400"
            }`}>
            All
          </button>
          {Object.entries(platformCounts).sort((a, b) => b[1] - a[1]).map(([p, count]) => (
            <button key={p} onClick={() => setFilterPlatform(filterPlatform === p ? null : p)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                filterPlatform === p ? "bg-violet-600 border-violet-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"
              }`}>
              {SHORT_NAME[p] ?? p} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Stats bar ── */}
      {meta && !loading && (
        <div className="flex-shrink-0 border-b border-gray-800/50 bg-gray-900/20 px-5 py-2 flex items-center gap-5 text-xs text-gray-500 flex-wrap">
          <span className="text-white font-semibold">{filtered.length}</span> leads
          {(search || filterPlatform) && " (filtered)"}
          <span>·</span>
          <span className="text-violet-400 font-medium">{highIntent}</span> high-intent ≥7
          <span>·</span>
          <span>{meta.rawSignals} raw signals</span>
          <span>·</span>
          <span>{meta.channels.length} sources</span>
          <span className="ml-auto">{new Date(meta.scrapedAt).toLocaleTimeString()}</span>
          <button onClick={() => setShowSettings((v) => !v)} className="flex items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors">
            {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showSettings ? "Hide" : "Show"} setup
          </button>
        </div>
      )}

      {/* ── Loading state ── */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="relative w-14 h-14">
            <div className="w-14 h-14 rounded-full border-2 border-violet-600/20 animate-ping absolute" />
            <div className="w-14 h-14 rounded-full border-2 border-violet-600/50 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-white">
              Scraping {selectedSources.length} sources for &ldquo;{niche || keywords}&rdquo;
            </p>
            <p className="text-xs text-gray-500 mt-1">This takes 20–50 seconds · Do not close the tab</p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {selectedSources.map((id) => {
              const s = SOURCES.find((x) => x.id === id);
              return s ? (
                <span key={id} className="flex items-center gap-1 text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded-full animate-pulse">
                  {s.icon} {s.label}
                </span>
              ) : null;
            })}
          </div>
          {progress.length > 0 && (
            <p className="text-xs text-violet-400/70">{progress[progress.length - 1]}</p>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && leads.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <Play className="w-7 h-7 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white mb-1">Set your niche and hit Scrape</h2>
            <p className="text-xs text-gray-500 max-w-sm">
              Pick a preset (CRM, HR, DevOps…) or type your niche. The scraper searches
              LinkedIn, Reddit, Twitter, G2 reviews, YouTube, Quora, Medium and more for people
              actively asking about tools, alternatives, and pain points in your space.
            </p>
          </div>
        </div>
      )}

      {/* ── Results table ── */}
      {!loading && filtered.length > 0 && (
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800">
              <tr>
                {[
                  { label: "#",         cls: "w-7 text-right" },
                  { label: "Platform" },
                  { label: "Author" },
                  { label: "Company" },
                  { label: "Signal / Post", cls: "max-w-[240px]" },
                  { label: "Pain Point",  cls: "hidden xl:table-cell" },
                  { label: "Competitor",  cls: "hidden lg:table-cell" },
                  { label: "Tech Stack",  cls: "hidden xl:table-cell" },
                  { label: "Score",       cls: "text-center" },
                  { label: "Confidence",  cls: "hidden lg:table-cell" },
                  { label: "Date",        cls: "hidden lg:table-cell" },
                  { label: "",            cls: "w-16" },
                ].map((col) => (
                  <th key={col.label} className={`px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider ${col.cls ?? ""}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => <LeadRow key={lead.id} lead={lead} index={i} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* ── No results after filter ── */}
      {!loading && leads.length > 0 && filtered.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <Search className="w-7 h-7 text-gray-600" />
          <p className="text-sm text-gray-400">No leads match current filters</p>
          <button onClick={() => { setSearch(""); setFilterPlatform(null); }}
            className="text-xs text-violet-400 hover:text-violet-300">Clear filters</button>
        </div>
      )}
    </div>
  );
}
