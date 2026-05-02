"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";

export interface LeadFilterState {
  search: string;
  minScore: number;
  maxScore: number;
  channel: string;
  status: string;
  industry: string;
}

interface LeadFiltersProps {
  filters: LeadFilterState;
  onChange: (filters: LeadFilterState) => void;
}

const channels = [
  "All Channels",
  "Google",
  "Reddit",
  "LinkedIn",
  "Twitter",
  "G2",
  "Capterra",
  "Indeed",
  "Crunchbase",
  "Hacker News",
  "GitHub Issues",
  "StackOverflow",
];

const statuses = ["All Status", "new", "saved", "rejected", "exported"];

const industries = [
  "All Industries",
  "SaaS",
  "E-commerce",
  "FinTech",
  "HealthTech",
  "EdTech",
  "Enterprise",
  "Startup",
  "Agency",
];

export function LeadFilters({ filters, onChange }: LeadFiltersProps) {
  const update = <K extends keyof LeadFilterState>(
    key: K,
    value: LeadFilterState[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search ||
    filters.channel !== "All Channels" ||
    filters.status !== "All Status" ||
    filters.industry !== "All Industries" ||
    filters.minScore > 0 ||
    filters.maxScore < 10;

  const reset = () => {
    onChange({
      search: "",
      minScore: 0,
      maxScore: 10,
      channel: "All Channels",
      status: "All Status",
      industry: "All Industries",
    });
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <SlidersHorizontal className="w-4 h-4 text-gray-400" />
          Filters
        </div>
        {hasActiveFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Search
        </label>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Name, company, keyword..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Intent Score Range */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Intent Score Range
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={10}
            value={filters.minScore}
            onChange={(e) =>
              update("minScore", Math.min(Number(e.target.value), filters.maxScore))
            }
            className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-violet-500 transition-colors"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input
            type="number"
            min={0}
            max={10}
            value={filters.maxScore}
            onChange={(e) =>
              update("maxScore", Math.max(Number(e.target.value), filters.minScore))
            }
            className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        {/* Visual range bar */}
        <div className="mt-2 h-1 bg-gray-800 rounded-full relative">
          <div
            className="absolute h-full bg-violet-600 rounded-full"
            style={{
              left: `${(filters.minScore / 10) * 100}%`,
              width: `${((filters.maxScore - filters.minScore) / 10) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Channel */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Channel
        </label>
        <select
          value={filters.channel}
          onChange={(e) => update("channel", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Status
        </label>
        <div className="flex flex-wrap gap-1.5">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => update("status", s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors capitalize ${
                filters.status === s
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
              }`}
            >
              {s === "All Status" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <label className="text-xs font-medium text-gray-400 block mb-1.5">
          Industry
        </label>
        <select
          value={filters.industry}
          onChange={(e) => update("industry", e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors appearance-none cursor-pointer"
        >
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
