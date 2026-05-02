"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeadFilters, LeadFilterState, DEFAULT_FILTERS } from "@/components/leads/lead-filters";
import { LeadTable, Lead } from "@/components/leads/lead-table";
import { Download, Loader2 } from "lucide-react";

const PAGE_SIZE = 25;

interface PaginatedLeads {
  leads: Lead[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

function buildParams(
  filters: LeadFilterState,
  page: number,
  projectId: string
): URLSearchParams {
  const p = new URLSearchParams();
  p.set("projectId", projectId);
  p.set("page", String(page));
  p.set("limit", String(PAGE_SIZE));
  if (filters.search) p.set("search", filters.search);
  if (filters.channel) p.set("channel", filters.channel);
  if (filters.status) p.set("status", filters.status);
  if (filters.industry) p.set("industry", filters.industry);
  if (filters.minScore > 0) p.set("intentScore", String(filters.minScore));
  if (filters.techStack) p.set("techStack", filters.techStack);
  if (filters.competitorMentioned) p.set("competitorMentioned", filters.competitorMentioned);
  if (filters.intentType) p.set("intentType", filters.intentType);
  if (filters.dateRange && filters.dateRange !== "all") p.set("dateRange", filters.dateRange);
  if (filters.hasCompany) p.set("hasCompany", filters.hasCompany);
  if (filters.hasDesignation) p.set("hasDesignation", filters.hasDesignation);
  if (filters.hasPainPoint) p.set("hasPainPoint", filters.hasPainPoint);
  if (filters.keyword) p.set("keyword", filters.keyword);
  if (filters.sortBy) p.set("sortBy", filters.sortBy);
  if (filters.sortDir) p.set("sortDir", filters.sortDir);
  return p;
}

export function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Restore filter state from URL on mount
  const [filters, setFilters] = useState<LeadFilterState>({
    ...DEFAULT_FILTERS,
    search: searchParams.get("search") ?? "",
    channel: searchParams.get("channel") ?? "",
    status: searchParams.get("status") ?? "",
    industry: searchParams.get("industry") ?? "",
    minScore: Number(searchParams.get("intentScore") ?? 0),
    techStack: searchParams.get("techStack") ?? "",
    competitorMentioned: searchParams.get("competitorMentioned") ?? "",
    intentType: searchParams.get("intentType") ?? "",
    dateRange: searchParams.get("dateRange") ?? "all",
    hasCompany: searchParams.get("hasCompany") ?? "",
    hasDesignation: searchParams.get("hasDesignation") ?? "",
    hasPainPoint: searchParams.get("hasPainPoint") ?? "",
    keyword: searchParams.get("keyword") ?? "",
    sortBy: searchParams.get("sortBy") ?? "intentScore",
    sortDir: (searchParams.get("sortDir") as "asc" | "desc") ?? "desc",
  });

  const [page, setPage] = useState(Number(searchParams.get("page") ?? 1));
  const [projectId, setProjectId] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedLeads | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load project ID once
  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjectId(d.projects?.[0]?.id ?? null))
      .catch(() => setProjectId(null));
  }, []);

  const fetchLeads = useCallback(
    async (currentFilters: LeadFilterState, currentPage: number, pid: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = buildParams(currentFilters, currentPage, pid);
        const res = await fetch(`/api/leads?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: PaginatedLeads = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leads");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!projectId) return;
    fetchLeads(filters, page, projectId);
  }, [filters, page, projectId, fetchLeads]);

  // Sync filters to URL
  useEffect(() => {
    if (!projectId) return;
    const params = buildParams(filters, page, projectId);
    // Strip projectId from URL (it's an implementation detail)
    params.delete("projectId");
    params.delete("limit");
    if (page === 1) params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : "/leads", { scroll: false });
  }, [filters, page, projectId, router]);

  const handleFilterChange = (f: LeadFilterState) => {
    setFilters(f);
    setPage(1);
  };

  const handleExportCsv = async () => {
    if (!projectId) return;
    try {
      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  };

  const total = data?.pagination.total ?? 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <span className="text-sm text-gray-400">
          {loading
            ? "Loading..."
            : `${total.toLocaleString()} lead${total !== 1 ? "s" : ""} found`}
        </span>
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      <div className="flex-1 flex gap-4 p-6 min-h-0">
        {/* Sidebar filters */}
        <div className="w-72 flex-shrink-0 overflow-y-auto">
          <LeadFilters filters={filters} onChange={handleFilterChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {error && (
            <div className="bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {!projectId && !loading && (
            <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-4 py-3 text-sm text-yellow-300">
              No project found. Run a scrape first to generate leads.
            </div>
          )}

          {loading ? (
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center min-h-[300px]">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : (
            <LeadTable
              leads={data?.leads ?? []}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
