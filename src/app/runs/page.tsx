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
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface AgentDecision {
  timestamp: string;
  action: string;
  reasoning: string;
  result: string;
}

interface ScrapeRun {
  id: string;
  channels: string[];
  startedAt: string;
  completedAt?: string;
  status: "completed" | "running" | "failed" | "pending";
  leadsFound: number;
  errorsCount: number;
  costEstimate?: number;
  blockedSources?: string[];
  agentDecisions?: AgentDecision[];
}

interface RunsResponse {
  runs: ScrapeRun[];
  total: number;
}

const statusConfig: Record<
  ScrapeRun["status"],
  {
    variant: "success" | "info" | "error" | "warning";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  completed: { variant: "success", icon: CheckCircle2 },
  running: { variant: "info", icon: Loader2 },
  failed: { variant: "error", icon: AlertTriangle },
  pending: { variant: "warning", icon: Clock },
};

function RunRow({ run }: { run: ScrapeRun }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = statusConfig[run.status];
  const StatusIcon = cfg.icon;

  const duration =
    run.completedAt && run.startedAt
      ? Math.round(
          (new Date(run.completedAt).getTime() -
            new Date(run.startedAt).getTime()) /
            1000
        )
      : null;

  return (
    <>
      <tr
        className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Expand icon */}
        <td className="px-3 py-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </td>

        {/* Run ID */}
        <td className="px-3 py-3">
          <span className="font-mono text-xs text-gray-300">
            {run.id.slice(0, 8)}…
          </span>
        </td>

        {/* Channels */}
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {run.channels.slice(0, 4).map((ch) => (
              <span
                key={ch}
                className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"
              >
                {ch}
              </span>
            ))}
            {run.channels.length > 4 && (
              <span className="text-[10px] text-gray-500">
                +{run.channels.length - 4}
              </span>
            )}
          </div>
        </td>

        {/* Started */}
        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
          {format(new Date(run.startedAt), "MMM d, HH:mm")}
        </td>

        {/* Completed */}
        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
          {run.completedAt
            ? formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })
            : run.status === "running"
              ? "In progress…"
              : "—"}
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-1.5">
            <StatusIcon
              className={`w-3.5 h-3.5 ${run.status === "running" ? "animate-spin" : ""} ${
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

        {/* Leads Found */}
        <td className="px-3 py-3">
          <span className="text-sm font-semibold text-white">
            {run.leadsFound}
          </span>
        </td>

        {/* Errors */}
        <td className="px-3 py-3">
          {run.errorsCount > 0 ? (
            <span className="text-xs text-rose-400 font-medium">
              {run.errorsCount}
            </span>
          ) : (
            <span className="text-xs text-gray-600">0</span>
          )}
        </td>

        {/* Duration / Cost */}
        <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
          {duration != null && (
            <span>{duration < 60 ? `${duration}s` : `${Math.floor(duration / 60)}m ${duration % 60}s`}</span>
          )}
          {run.costEstimate != null && (
            <span className="ml-2 text-gray-600">
              ${run.costEstimate.toFixed(4)}
            </span>
          )}
        </td>
      </tr>

      {/* Expanded details row */}
      {expanded && (
        <tr className="border-b border-gray-800 bg-gray-900/50">
          <td colSpan={9} className="px-5 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Agent Decisions */}
              <div className="lg:col-span-2">
                <h4 className="text-xs font-semibold text-gray-300 mb-2">
                  Agent Decisions Log
                </h4>
                {run.agentDecisions && run.agentDecisions.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {run.agentDecisions.map((decision, i) => (
                      <div
                        key={i}
                        className="bg-gray-800 rounded-lg px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-gray-500 font-mono">
                            {format(new Date(decision.timestamp), "HH:mm:ss")}
                          </span>
                          <span className="text-violet-300 font-medium">
                            {decision.action}
                          </span>
                          <Badge
                            variant={
                              decision.result === "success" ? "success" : "error"
                            }
                          >
                            {decision.result}
                          </Badge>
                        </div>
                        <p className="text-gray-400">{decision.reasoning}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    No decision log available for this run.
                  </p>
                )}
              </div>

              {/* Blocked Sources + Cost */}
              <div className="space-y-4">
                {run.blockedSources && run.blockedSources.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-300 mb-2">
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
                  <h4 className="text-xs font-semibold text-gray-300 mb-2">
                    Run Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-800 rounded-lg px-2 py-2 text-center">
                      <div className="text-sm font-bold text-white">
                        {run.leadsFound}
                      </div>
                      <div className="text-[10px] text-gray-500">leads</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg px-2 py-2 text-center">
                      <div className="text-sm font-bold text-white">
                        {run.channels.length}
                      </div>
                      <div className="text-[10px] text-gray-500">channels</div>
                    </div>
                    {run.costEstimate != null && (
                      <div className="bg-gray-800 rounded-lg px-2 py-2 text-center col-span-2">
                        <div className="text-sm font-bold text-white">
                          ${run.costEstimate.toFixed(4)}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          est. cost
                        </div>
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
  const [data, setData] = useState<RunsResponse>({ runs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scrape/runs");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: RunsResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleNewRun = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/scrape/runs", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchRuns();
    } catch {
      // Silent fail — user can retry
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Scraper Run Logs"
        subtitle={`${data.total} total runs`}
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
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              New Run
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6">
        {error && (
          <div className="mb-4 bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300">
            Failed to load runs: {error}
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
              <button
                onClick={handleNewRun}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Start First Run
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="w-8 px-3 py-3" />
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">
                      Run ID
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">
                      Channels
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                      Started
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                      Completed
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">
                      Status
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400 whitespace-nowrap">
                      Leads
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">
                      Errors
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-medium text-gray-400">
                      Duration
                    </th>
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
      </div>
    </div>
  );
}
