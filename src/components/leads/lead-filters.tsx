"use client";

import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export interface LeadFilterState {
  search: string;
  minScore: number;
  channel: string;
  status: string;
  industry: string;
  // Apollo-style filters
  techStack: string;
  competitorMentioned: string;
  intentType: string;
  dateRange: string;
  hasCompany: string;
  hasDesignation: string;
  hasPainPoint: string;
  keyword: string;
  sortBy: string;
  sortDir: string;
}

export const DEFAULT_FILTERS: LeadFilterState = {
  search: "",
  minScore: 0,
  channel: "",
  status: "",
  industry: "",
  techStack: "",
  competitorMentioned: "",
  intentType: "",
  dateRange: "all",
  hasCompany: "",
  hasDesignation: "",
  hasPainPoint: "",
  keyword: "",
  sortBy: "intentScore",
  sortDir: "desc",
};

interface LeadFiltersProps {
  filters: LeadFilterState;
  onChange: (filters: LeadFilterState) => void;
}

const CHANNELS = [
  { label: "All Channels", value: "" },
  { label: "Reddit", value: "REDDIT" },
  { label: "Hacker News", value: "HACKER_NEWS" },
  { label: "GitHub Issues", value: "GITHUB_ISSUES" },
  { label: "StackOverflow", value: "STACKOVERFLOW" },
  { label: "LinkedIn", value: "LINKEDIN_POSTS" },
  { label: "Twitter/X", value: "TWITTER" },
  { label: "Product Hunt", value: "PRODUCT_HUNT" },
  { label: "G2", value: "G2" },
  { label: "Capterra", value: "CAPTERRA" },
];

const STATUSES = [
  { label: "All", value: "" },
  { label: "New", value: "NEW" },
  { label: "Saved", value: "SAVED" },
  { label: "Contacted", value: "CONTACTED" },
  { label: "Exported", value: "EXPORTED" },
  { label: "Rejected", value: "REJECTED" },
];

const INDUSTRIES = [
  { label: "All Industries", value: "" },
  { label: "SaaS", value: "SaaS" },
  { label: "E-commerce", value: "E-commerce" },
  { label: "FinTech", value: "FinTech" },
  { label: "HR Tech", value: "HR Tech" },
  { label: "Marketing", value: "Marketing" },
  { label: "DevTools", value: "DevTools" },
  { label: "Healthcare", value: "Healthcare" },
  { label: "EdTech", value: "EdTech" },
  { label: "PropTech", value: "PropTech" },
  { label: "LegalTech", value: "LegalTech" },
];

const INTENT_TYPES = [
  { label: "All Intent Types", value: "" },
  { label: "Actively Searching", value: "actively-searching" },
  { label: "Complaint / Pain", value: "complaint" },
  { label: "Competitor Trigger", value: "competitor-trigger" },
  { label: "Urgent", value: "urgent" },
  { label: "General Interest", value: "general-interest" },
];

const DATE_RANGES = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
];

const SORT_OPTIONS = [
  { label: "Intent Score", value: "intentScore" },
  { label: "Confidence Score", value: "confidenceScore" },
  { label: "Date Found", value: "createdAt" },
];

const TECH_STACKS = [
  "React", "Next.js", "Node.js", "Python", "PostgreSQL",
  "MySQL", "MongoDB", "Redis", "Kubernetes", "Docker",
  "AWS", "Stripe", "Twilio", "Shopify",
];

const KNOWN_COMPETITORS = [
  "HubSpot", "Salesforce", "Marketo", "Zendesk", "Intercom",
  "Workday", "BambooHR", "Gusto", "QuickBooks", "NetSuite",
  "Shopify", "AWS", "Notion", "Jira", "Linear", "Asana",
  "Segment", "Mixpanel", "Stripe", "Twilio", "Datadog",
  "GitHub", "Snowflake", "Databricks",
];

function FilterSection({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-800 pt-3">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2"
      >
        {label}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ChipGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            value === o.value
              ? "bg-violet-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TriStateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 flex-1">{label}</span>
      <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
        {[{ l: "Any", v: "" }, { l: "Yes", v: "true" }, { l: "No", v: "false" }].map((opt) => (
          <button
            key={opt.v}
            onClick={() => onChange(opt.v)}
            className={`px-2.5 py-1 transition-colors ${
              value === opt.v
                ? "bg-violet-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LeadFilters({ filters, onChange }: LeadFiltersProps) {
  const update = <K extends keyof LeadFilterState>(key: K, value: LeadFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const activeCount = [
    filters.search,
    filters.channel,
    filters.status,
    filters.industry,
    filters.techStack,
    filters.competitorMentioned,
    filters.intentType,
    filters.dateRange !== "all" ? filters.dateRange : "",
    filters.hasCompany,
    filters.hasDesignation,
    filters.hasPainPoint,
    filters.keyword,
    filters.minScore > 0 ? String(filters.minScore) : "",
  ].filter(Boolean).length;

  const reset = () => onChange(DEFAULT_FILTERS);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          Filters
          {activeCount > 0 && (
            <span className="bg-violet-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text"
          placeholder="Search name, company, signal..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
      </div>

      {/* Min Intent Score */}
      <FilterSection label="Intent Score" defaultOpen>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Min score</span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={filters.minScore}
            onChange={(e) => update("minScore", Number(e.target.value))}
            className="flex-1 accent-violet-600 cursor-pointer"
          />
          <span className="text-sm font-semibold text-white w-6 text-right">
            {filters.minScore}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-600 px-0.5">
          {[0, 2, 4, 6, 8, 10].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>
      </FilterSection>

      {/* Intent Type */}
      <FilterSection label="Intent Type" defaultOpen>
        <ChipGroup
          value={filters.intentType}
          onChange={(v) => update("intentType", v)}
          options={INTENT_TYPES}
        />
      </FilterSection>

      {/* Date Range */}
      <FilterSection label="Date Range" defaultOpen>
        <ChipGroup
          value={filters.dateRange}
          onChange={(v) => update("dateRange", v)}
          options={DATE_RANGES}
        />
      </FilterSection>

      {/* Channel */}
      <FilterSection label="Source Channel" defaultOpen>
        <SelectField
          value={filters.channel}
          onChange={(v) => update("channel", v)}
          options={CHANNELS}
        />
      </FilterSection>

      {/* Status */}
      <FilterSection label="Lead Status" defaultOpen>
        <ChipGroup
          value={filters.status}
          onChange={(v) => update("status", v)}
          options={STATUSES}
        />
      </FilterSection>

      {/* Industry */}
      <FilterSection label="Industry">
        <SelectField
          value={filters.industry}
          onChange={(v) => update("industry", v)}
          options={INDUSTRIES}
        />
      </FilterSection>

      {/* Tech Stack */}
      <FilterSection label="Tech Stack">
        <div className="relative">
          <input
            type="text"
            placeholder="React, AWS, Postgres..."
            value={filters.techStack}
            onChange={(e) => update("techStack", e.target.value)}
            list="tech-stack-options"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <datalist id="tech-stack-options">
            {TECH_STACKS.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>
        {filters.techStack && (
          <div className="flex flex-wrap gap-1 mt-1">
            {TECH_STACKS.filter((t) =>
              t.toLowerCase().includes(filters.techStack.toLowerCase())
            )
              .slice(0, 6)
              .map((t) => (
                <button
                  key={t}
                  onClick={() => update("techStack", t)}
                  className="px-2 py-0.5 rounded bg-gray-800 text-xs text-gray-300 hover:bg-violet-900/40 hover:text-violet-300 transition-colors"
                >
                  {t}
                </button>
              ))}
          </div>
        )}
      </FilterSection>

      {/* Competitor Mentioned */}
      <FilterSection label="Competitor Mentioned">
        <div>
          <input
            type="text"
            placeholder="HubSpot, Salesforce..."
            value={filters.competitorMentioned}
            onChange={(e) => update("competitorMentioned", e.target.value)}
            list="competitor-options"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <datalist id="competitor-options">
            {KNOWN_COMPETITORS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {["HubSpot", "Salesforce", "Workday", "Jira", "AWS", "Stripe"].map((c) => (
            <button
              key={c}
              onClick={() =>
                update("competitorMentioned", filters.competitorMentioned === c ? "" : c)
              }
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                filters.competitorMentioned === c
                  ? "bg-red-900/40 text-red-300 border border-red-800"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Keyword Match */}
      <FilterSection label="Keyword Match">
        <input
          type="text"
          placeholder="migration, pricing, api..."
          value={filters.keyword}
          onChange={(e) => update("keyword", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </FilterSection>

      {/* Data Completeness */}
      <FilterSection label="Data Completeness">
        <div className="space-y-2">
          <TriStateFilter
            label="Has Company"
            value={filters.hasCompany}
            onChange={(v) => update("hasCompany", v)}
          />
          <TriStateFilter
            label="Has Designation"
            value={filters.hasDesignation}
            onChange={(v) => update("hasDesignation", v)}
          />
          <TriStateFilter
            label="Has Pain Point"
            value={filters.hasPainPoint}
            onChange={(v) => update("hasPainPoint", v)}
          />
        </div>
      </FilterSection>

      {/* Sort */}
      <FilterSection label="Sort By">
        <div className="flex gap-2">
          <SelectField
            value={filters.sortBy}
            onChange={(v) => update("sortBy", v)}
            options={SORT_OPTIONS}
          />
          <button
            onClick={() => update("sortDir", filters.sortDir === "desc" ? "asc" : "desc")}
            className="flex-shrink-0 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 hover:text-white hover:border-violet-500 transition-colors"
          >
            {filters.sortDir === "desc" ? "↓ Desc" : "↑ Asc"}
          </button>
        </div>
      </FilterSection>
    </div>
  );
}
