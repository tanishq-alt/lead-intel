"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Brain, RefreshCw, Loader2, TrendingUp } from "lucide-react";

interface ChannelScore {
  channel: string;
  score: number;
  leads: number;
}

interface Keyword {
  keyword: string;
  frequency: number;
  conversionRate: number;
}

interface CompetitorPattern {
  competitor: string;
  triggerPhrase: string;
  frequency: number;
  avgScore: number;
}

interface PainPoint {
  topic: string;
  frequency: number;
}

interface FalsePositive {
  pattern: string;
  reason: string;
  count: number;
}

interface ScoreImprovement {
  date: string;
  avgScore: number;
  highIntentPct: number;
}

interface MemoryData {
  bestChannels: ChannelScore[];
  bestKeywords: Keyword[];
  competitorPatterns: CompetitorPattern[];
  commonPainPoints: PainPoint[];
  rejectedFalsePositives: FalsePositive[];
  scoreImprovements: ScoreImprovement[];
  lastRetrained?: string;
  totalMemoryEntries: number;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="text-gray-300 font-medium mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function MemoryPage() {
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ruflo/memory/search?query=all");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MemoryData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load memory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await fetch("/api/ruflo/memory/store", { method: "POST" });
      await fetchMemory();
    } catch {
      // Silent fail
    } finally {
      setRetraining(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Memory & Learning"
        subtitle={
          data
            ? `${data.totalMemoryEntries.toLocaleString()} memory entries`
            : "Ruflo learning system"
        }
        actions={
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 border border-emerald-800/60 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-300">
                Ruflo Learning Loop: ACTIVE
              </span>
            </div>

            <button
              onClick={handleRetrain}
              disabled={retraining || loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {retraining ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Brain className="w-3.5 h-3.5" />
              )}
              Retrain Memory
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {error && (
          <div className="bg-rose-900/30 border border-rose-800/60 rounded-xl px-4 py-3 text-sm text-rose-300 flex items-center gap-2">
            Failed to load memory data: {error}
            <button
              onClick={fetchMemory}
              className="ml-auto flex items-center gap-1 text-xs text-rose-300 hover:text-white"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <span className="text-sm text-gray-400">Loading memory data…</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* 1. Best Performing Channels */}
            <Card>
              <CardHeader>
                <CardTitle>Best Performing Channels</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!data?.bestChannels?.length ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No channel data yet
                  </p>
                ) : (
                  data.bestChannels.map((ch, i) => (
                    <div key={ch.channel} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-4 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white truncate">
                            {ch.channel}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {ch.leads} leads
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-600 rounded-full"
                            style={{ width: `${ch.score * 10}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-bold text-violet-300 w-8 text-right flex-shrink-0">
                        {ch.score.toFixed(1)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* 2. Best Converting Keywords */}
            <Card>
              <CardHeader>
                <CardTitle>Best Converting Keywords</CardTitle>
              </CardHeader>
              <CardContent>
                {!data?.bestKeywords?.length ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No keyword data yet
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {data.bestKeywords.map((kw) => {
                      const sizeClass =
                        kw.frequency > 20
                          ? "text-base"
                          : kw.frequency > 10
                            ? "text-sm"
                            : "text-xs";
                      const opacity =
                        kw.conversionRate > 0.7
                          ? "opacity-100"
                          : kw.conversionRate > 0.4
                            ? "opacity-75"
                            : "opacity-50";
                      return (
                        <span
                          key={kw.keyword}
                          className={`${sizeClass} ${opacity} bg-violet-900/30 text-violet-300 border border-violet-800/50 px-2.5 py-1 rounded-lg font-medium cursor-default`}
                          title={`Frequency: ${kw.frequency} · Conversion: ${(kw.conversionRate * 100).toFixed(0)}%`}
                        >
                          {kw.keyword}
                        </span>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Competitor Trigger Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Competitor Trigger Patterns</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!data?.competitorPatterns?.length ? (
                  <p className="text-sm text-gray-500 py-6 px-5 text-center">
                    No competitor patterns detected yet
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                            Competitor
                          </th>
                          <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                            Trigger Phrase
                          </th>
                          <th className="text-right px-4 py-2.5 text-gray-400 font-medium">
                            Freq
                          </th>
                          <th className="text-right px-4 py-2.5 text-gray-400 font-medium">
                            Avg Score
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {data.competitorPatterns.map((p, i) => (
                          <tr key={i} className="hover:bg-gray-800/40">
                            <td className="px-4 py-2.5 font-medium text-rose-300">
                              {p.competitor}
                            </td>
                            <td className="px-4 py-2.5 text-gray-300 font-mono">
                              &ldquo;{p.triggerPhrase}&rdquo;
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-400">
                              {p.frequency}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-violet-300">
                              {p.avgScore.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Common Pain Points */}
            <Card>
              <CardHeader>
                <CardTitle>Common Pain Points</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                {!data?.commonPainPoints?.length ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    No pain point data yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={data.commonPainPoints}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1f2937"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        width={110}
                        tick={{ fill: "#9ca3af", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="frequency" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* 5. Rejected False Positives */}
            <Card>
              <CardHeader>
                <CardTitle>Rejected False Positives</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!data?.rejectedFalsePositives?.length ? (
                  <p className="text-sm text-gray-500 py-6 px-5 text-center">
                    No false positives recorded yet — great signal quality!
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-800">
                          <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                            Pattern
                          </th>
                          <th className="text-left px-4 py-2.5 text-gray-400 font-medium">
                            Rejection Reason
                          </th>
                          <th className="text-right px-4 py-2.5 text-gray-400 font-medium">
                            Times Filtered
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {data.rejectedFalsePositives.map((fp, i) => (
                          <tr key={i} className="hover:bg-gray-800/40">
                            <td className="px-4 py-2.5 font-mono text-gray-300">
                              {fp.pattern}
                            </td>
                            <td className="px-4 py-2.5 text-gray-400">
                              {fp.reason}
                            </td>
                            <td className="px-4 py-2.5 text-right text-rose-300 font-medium">
                              {fp.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 6. Intent Score Improvements */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Intent Score Improvements Over Time</CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </CardHeader>
              <CardContent className="pt-2">
                {!data?.scoreImprovements?.length ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Not enough data yet — run more scans to see trends
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={data.scoreImprovements}
                      margin={{ top: 4, right: 16, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1f2937"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#6b7280", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        domain={[0, 10]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="avgScore"
                        name="Avg Score"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        dot={{ fill: "#7c3aed", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="highIntentPct"
                        name="High-Intent %"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={{ fill: "#10b981", r: 3 }}
                        activeDot={{ r: 5 }}
                        strokeDasharray="4 2"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {data?.lastRetrained && (
          <p className="text-xs text-gray-600 text-center pb-2">
            Last retrained:{" "}
            {new Date(data.lastRetrained).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
