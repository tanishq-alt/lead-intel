export const dynamic = "force-dynamic";

import { Header } from "@/components/layout/header";
import { StatCard } from "@/components/ui/stat-card";
import {
  LeadsByChannelChart,
  IntentScoreDistributionChart,
} from "@/components/dashboard/charts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, TrendingUp, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface DashboardStats {
  totalLeads: number;
  highIntentLeads: number;
  avgIntentScore: number;
  conversionReady: number;
  leadsThisWeek: number;
  trends: {
    totalLeads: number;
    highIntentLeads: number;
    avgIntentScore: number;
    conversionReady: number;
  };
  channelBreakdown: { channel: string; leads: number }[];
  scoreDistribution: { range: string; count: number }[];
  recentRuns: {
    id: string;
    status: "completed" | "running" | "failed" | "pending";
    leadsFound: number;
    channels: string[];
    startedAt: string;
    completedAt?: string;
  }[];
  topLeads: {
    id: string;
    name: string;
    company: string;
    title: string;
    intentScore: number;
    channel: string;
    painPoint: string;
  }[];
}

async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const projectsRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/projects`,
      { cache: "no-store" }
    );
    if (!projectsRes.ok) return null;
    const projectsData = await projectsRes.json();
    const projectId = projectsData.projects?.[0]?.id;
    if (!projectId) return null;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/dashboard/stats?projectId=${projectId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const raw = await res.json();

    return {
      totalLeads: raw.totalLeads ?? 0,
      highIntentLeads: raw.highIntentLeads ?? 0,
      avgIntentScore: raw.avgIntentScore ?? 0,
      conversionReady: raw.conversionReadyLeads ?? 0,
      leadsThisWeek: 0,
      trends: { totalLeads: 0, highIntentLeads: 0, avgIntentScore: 0, conversionReady: 0 },
      channelBreakdown: (raw.leadsByChannel ?? []).map((c: { channel: string; count: number }) => ({
        channel: c.channel,
        leads: c.count,
      })),
      scoreDistribution: (raw.leadsByIndustry ?? []).map((c: { industry: string; count: number }) => ({
        range: c.industry ?? "Unknown",
        count: c.count,
      })),
      recentRuns: (raw.latestRuns ?? []).map((r: Record<string, unknown>) => ({
        id: r.id,
        status: ((r.status as string) ?? "pending").toLowerCase() as "completed" | "running" | "failed" | "pending",
        leadsFound: (r.leadsFound as number) ?? 0,
        channels: Array.isArray(r.channelsUsed) ? r.channelsUsed : [],
        startedAt: r.createdAt as string,
        completedAt: r.completedAt as string | undefined,
      })),
      topLeads: (raw.recentLeads ?? []).map((l: Record<string, unknown>) => ({
        id: l.id as string,
        name: (l.name as string) ?? "Unknown",
        company: (l.company as string) ?? "",
        title: (l.designation as string) ?? "",
        intentScore: (l.intentScore as number) ?? 0,
        channel: (l.sourceChannel as string) ?? "",
        painPoint: "",
      })),
    };
  } catch {
    return null;
  }
}

const runStatusVariants: Record<string, "success" | "info" | "error" | "warning"> = {
  completed: "success",
  running: "info",
  failed: "error",
  pending: "warning",
};

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle="Lead intelligence overview"
        actions={
          <Link
            href="/runs"
            className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            New Run
          </Link>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={stats?.totalLeads ?? 0}
            subtitle="All captured leads"
            trend={
              stats?.trends.totalLeads !== undefined
                ? { value: stats.trends.totalLeads, label: "vs last week" }
                : undefined
            }
            icon={<Users className="w-4 h-4" />}
            accentColor="violet"
          />
          <StatCard
            title="High-Intent Leads"
            value={stats?.highIntentLeads ?? 0}
            subtitle="Score ≥ 8"
            trend={
              stats?.trends.highIntentLeads !== undefined
                ? { value: stats.trends.highIntentLeads, label: "vs last week" }
                : undefined
            }
            icon={<TrendingUp className="w-4 h-4" />}
            accentColor="emerald"
          />
          <StatCard
            title="Avg Intent Score"
            value={
              stats?.avgIntentScore !== undefined
                ? stats.avgIntentScore.toFixed(1)
                : "—"
            }
            subtitle="Out of 10"
            trend={
              stats?.trends.avgIntentScore !== undefined
                ? { value: stats.trends.avgIntentScore, label: "vs last week" }
                : undefined
            }
            icon={<Zap className="w-4 h-4" />}
            accentColor="amber"
          />
          <StatCard
            title="Conversion-Ready"
            value={stats?.conversionReady ?? 0}
            subtitle="Score ≥ 9 — act now"
            trend={
              stats?.trends.conversionReady !== undefined
                ? { value: stats.trends.conversionReady, label: "vs last week" }
                : undefined
            }
            icon={<Award className="w-4 h-4" />}
            accentColor="sky"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Leads by Channel</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <LeadsByChannelChart data={stats?.channelBreakdown ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Intent Score Distribution</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <IntentScoreDistributionChart data={stats?.scoreDistribution ?? []} />
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Latest Scrape Runs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Latest Scrape Runs</CardTitle>
              <Link
                href="/runs"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all
              </Link>
            </CardHeader>
            {!stats || stats.recentRuns.length === 0 ? (
              <CardContent>
                <p className="text-sm text-gray-500 py-4 text-center">
                  No scrape runs yet
                </p>
              </CardContent>
            ) : (
              <div className="divide-y divide-gray-800">
                {stats.recentRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="px-5 py-3 flex items-center gap-3">
                    <Badge
                      variant={runStatusVariants[run.status] ?? "outline"}
                    >
                      {run.status}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono truncate">
                          {run.id.slice(0, 8)}…
                        </span>
                        <div className="flex gap-1 flex-wrap">
                          {run.channels.slice(0, 3).map((ch) => (
                            <span
                              key={ch}
                              className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded"
                            >
                              {ch}
                            </span>
                          ))}
                          {run.channels.length > 3 && (
                            <span className="text-[10px] text-gray-500">
                              +{run.channels.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {formatDistanceToNow(new Date(run.startedAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-white">
                        {run.leadsFound}
                      </div>
                      <div className="text-[10px] text-gray-500">leads</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Top Leads This Week */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Top Leads This Week</CardTitle>
              <Link
                href="/leads"
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                View all
              </Link>
            </CardHeader>
            {!stats || stats.topLeads.length === 0 ? (
              <CardContent>
                <p className="text-sm text-gray-500 py-4 text-center">
                  No leads found yet
                </p>
              </CardContent>
            ) : (
              <div className="divide-y divide-gray-800">
                {stats.topLeads.slice(0, 5).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-gray-800/50 transition-colors group"
                  >
                    {/* Score */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        lead.intentScore >= 9
                          ? "bg-emerald-900/60 text-emerald-300"
                          : lead.intentScore >= 7
                            ? "bg-violet-900/60 text-violet-300"
                            : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {lead.intentScore}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {lead.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {lead.title} · {lead.company}
                      </div>
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">
                        {lead.painPoint}
                      </div>
                    </div>

                    {/* Channel */}
                    <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-1 rounded flex-shrink-0">
                      {lead.channel}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
