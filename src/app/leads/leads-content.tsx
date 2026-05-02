"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeadFilters, LeadFilterState } from "@/components/leads/lead-filters";
import { LeadTable, Lead } from "@/components/leads/lead-table";
import { Download, Loader2 } from "lucide-react";

const PAGE_SIZE = 25;

const defaultFilters: LeadFilterState = {
  search: "",
  minScore: 0,
  maxScore: 10,
  channel: "All Channels",
  status: "All Status",
  industry: "All Industries",
};

interface LeadsResponse {
  leads: Lead[];
  total: number;
}

export function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<LeadFilterState>({
    ...defaultFilters,
    search: searchParams.get("search") ?? "",
    channel: searchParams.get("channel") ?? "All Channels",
    status: searchParams.get("status") ?? "All Status",
    minScore: Number(searchParams.get("minScore") ?? 0),
    maxScore: Number(searchParams.get("maxScore") ?? 10),
  });
  const [page, setPage] = useState(Number(searchParams.get("page") ?? 1));
  const [data, setData] = useState<LeadsResponse>({ leads: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(
    async (currentFilters: LeadFilterState, currentPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(currentPage));
        params.set("limit", String(PAGE_SIZE));
        if (currentFilters.search) params.set("search", currentFilters.search);
        if (currentFilters.channel !== "All Channels")
          params.set("channel", currentFilters.channel);
        if (currentFilters.status !== "All Status")
          params.set("status", currentFilters.status);
        if (currentFilters.industry !== "All Industries")
          params.set("industry", currentFilters.industry);
        if (currentFilters.minScore > 0)
          params.set("intentScore", String(currentFilters.minScore));

        const res = await fetch(`/api/leads?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData({ leads: json.leads ?? [], total: json.pagination?.total ?? 0 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leads");
        setData({ leads: [], total: 0 });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchLeads(filters, page);
  }, [filters, page, fetchLeads]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (filters.search) params.set("search", filters.search);
    if (filters.channel !== "All Channels") params.set("channel", filters.channel);
    if (filters.status !== "All Status") params.set("status", filters.status);
    if (filters.minScore > 0) params.set("minScore", String(filters.minScore));
    const qs = params.toString();
    router.replace(qs ? `/leads?${qs}` : "/leads", { scroll: false });
  }, [filters, page, router]);

  const handleExportCsv = async () => {
    try {
      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: "demo" }),
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

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800">
        <span className="text-sm text-gray-400">
          {loading ? "Loading..." : `${data.total.toLocaleString()} leads found`}
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
        <div className="w-64 flex-shrink-0">
          <LeadFilters filters={filters} onChange={(f) => { setFilters(f); setPage(1); }} />
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {error && (
            <div className="bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : (
            <LeadTable
              leads={data.leads}
              total={data.total}
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
