"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  ChevronDown,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface ScrapeRun {
  id: string;
  channelsUsed: string[];
  startedAt: string;
  completedAt?: string;
  status: "COMPLETED" | "RUNNING" | "FAILED" | "PENDING";
  leadsFound: number;
  errors?: string[];
  costEstimate?: number;
  blockedSources?: string[];
  agentDecisions?: Record<string, unknown>;
  leadCount: number;
}

interface RunsResponse {
  runs: ScrapeRun[];
  pagination: { total: number };
}

const statusConfig = {
  COMPLETED: { variant: "success" as const, icon: CheckCircle2 },
  RUNNING: { variant: "info" as const, icon: Loader2 },
  FAILED: { variant: "error" as const, icon: AlertTriangle },
  PENDING: { variant: "warning" as const, icon: Clock },
};

function RunRow({ run }: { run: ScrapeRun }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[run.status] ?? statusConfig.PENDING;
  const StatusIcon = cfg.icon;

  const duration =
    run.completedAt && run.startedAt
      ? Math.round(
          (new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000
        )
      : null;

  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <td className="px-3 py-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </td>
        <td className="px-3 py-3">
          <span className="font-mono text-xs text-gray-300">{run.id.slice(0, 8)}…</span>
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {run.channelsUsed.slice(0, 4).map((ch) => (
              <span key={ch} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">
                {ch}
              </span>
            ))}
            {run.channelsUsed.length > 4 && (
              <span className="text-[10px] text-gray-500">+{run.channelsUsed.length - 4}</span>
            )}
          </div>
        </td>
        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
          {format(new Date(run.startedAt), "MMM d, HH:mm")}
        </td>
        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
          {run.completedAt
            ? formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })
            : run.status === "RUNNING"
              ? "In progress…"
              : "—"}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <StatusIcon
              className={`w-3.5 h-3.5 ${run.status === "RUNNING" ? "animate-spin" : ""} ${
                cfg.variant === "success"
                  ? "text-emerald-400"
                  : cfg.variant === "error"
                    ? "text-rose-400"
                    : cfg.variant === "info"
                      ? "text-sky-400"
                      : "text-amber-400"
              }`}
            />
            <Badge variant={cfg.variant}>{run.status}</Badge>
          </div>
        </td>
        <td className="px-3 py-3">
          <span className="text-sm font-semibold text-white">{run.leadsFound}</span>
        </td>
        <td className="px-3 py-3">
          {run.errors && run.errors.length > 0 ? (
            <span className="text-xs text-rose-400 font-medium">{run.errors.length}</span>
          ) : (
            <span className="text-xs text-gray-600">0</span>
          )}
        </td>
        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
          {duration != null && (
            <span>{duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}</span>
          )}
          {run.costEstimate != null && (
            <span className="ml-2 text-gray-600">${run.costEstimate.toFixed(4)}</span>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-800 bg-gray-900/50">
          <td colSpan={9} className="px-5 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <h4 className="text-xs font-semibold text-gray-300 mb-2">Channels Scraped</h4>
                <div className="flex flex-wrap gap-2">
                  {run.channelsUsed.map((ch) => (
                    <span
                      key={ch}
                      className="text-xs bg-violet-900/30 text-violet-300 border border-violet-800/40 px-2 py-1 rounded"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
                {run.errors && run.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-rose-300 mb-1">Errors</h4>
                    {run.errors.slice(0, 5).map((e, i) => (
                      <div key={i} className="text-xs text-rose-400/80 bg-rose-900/20 rounded px-2 py-1 mb-1">
                        {e}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {run.blockedSources && run.blockedSources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-300 mb-1">
                      Blocked Sources ({run.blockedSources.length})
                    </h4>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {run.blockedSources.map((src, i) => (
                        <div
                          key={i}
                          className="text-xs text-rose-300 bg-rose-900/20 border border-rose-800/40 rounded px-2 py-1 truncate"
                        >
                          {src}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-semibold text-gray-300 mb-2">Run Summary</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800 rounded-lg px-2 py-2 text-center">
                      <div className="text-sm font-bold text-white">{run.leadsFound}</div>
                      <div className="text-[10px] text-gray-500">leads saved</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg px-2 py-2 text-center">
                      <div className="text-sm font-bold text-white">{run.channelsUsed.length}</div>
                      <div className="text-[10px] text-gray-500">channels</div>
                    </div>
                    {duration != null && (
                      <div className="bg-gray-800 rounded-lg px-2 py-2 text-center col-span-2">
                        <div className="text-sm font-bold text-white">
                          {duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}
                        </div>
                        <div className="text-[10px] text-gray-500">duration</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function RunsPage() {
  const [data, setData] = useState<RunsResponse>({ runs: [], pagination: { total: 0 } });
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjectId(d.projects?.[0]?.id ?? null))
      .catch(() => setProjectId(null));
  }, []);

  const fetchRuns = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/scrape/runs?projectId=${projectId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RunsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) fetchRuns();
  }, [projectId, fetchRuns]);

  const handleNewRun = async () => {
    setTriggering(true);
    setRunError(null);
    try {
      const res = await fetch("/api/scrape/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId ? { projectId } : {}),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const result = await res.json();
      setRunError(null);
      // Immediately refresh to show the completed run
      await fetchRuns();
      return result;
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setTriggering(false);
    }
  };

  const total = data.pagination?.total ?? 0;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Scraper Run Logs"
        subtitle={`${total} total run${total !== 1 ? "s" : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRuns}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleNewRun}
              disabled={triggering}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {triggering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Scraping live data…
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  New Run
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6">
        {error && (
          <div className="mb-4 bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {runError && (
          <div className="mb-4 bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300">
            Run failed: {runError}
          </div>
        )}

        {triggering && (
          <div className="mb-4 bg-violet-900/20 border border-violet-800/40 rounded-xl px-4 py-3 text-sm text-violet-300 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Scraping Reddit, Hacker News, GitHub, and StackOverflow for live intent signals… this takes ~20–40 seconds.
          </div>
        )}

        <Card className="overflow-hidden">
          {loading && data.runs.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                <span className="text-sm text-gray-400">Loading run logs…</span>
              </div>
            </div>
          ) : data.runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                <Play className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-400">No scrape runs yet</p>
              <p className="text-xs text-gray-600 max-w-xs text-center">
                Click "New Run" to start scraping Reddit, Hacker News, GitHub Issues, and StackOverflow for live intent signals.
              </p>
              <button
                onClick={handleNewRun}
                disabled={triggering}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Start First Run
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="w-8 px-3 py-3" />
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">Run ID</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">Channels</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Started</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Completed</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">Status</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">Leads</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">Errors</th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runs.map((run) => (
                    <RunRow key={run.id} run={run} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-4 bg-gray-900/40 border border-gray-800/60 rounded-xl p-4 text-xs text-gray-500">
          <div className="flex items-center gap-2 mb-1 text-gray-400 font-medium">
            <ExternalLink className="w-3.5 h-3.5" />
            Live data sources
          </div>
          Reddit (public JSON API) · Hacker News (Algolia API) · GitHub Issues (REST API) · Stack Exchange API
          — no authentication required. Add a <code className="text-violet-400">GITHUB_TOKEN</code> env var for higher GitHub rate limits.
        </div>
      </div>
    </div>
  );
}
