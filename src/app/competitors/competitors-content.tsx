"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  Building2,
  Globe,
  Flame,
  Share2,
  Video,
  Network,
} from "lucide-react";

interface Competitor {
  id: string;
  name: string;
  domain: string | null;
}

interface CompetitorUpdate {
  id: string;
  competitorId: string;
  channel: string;
  url: string;
  title: string;
  summary: string;
  updateType: string;
  leadMagnetType: string | null;
  engagementScore: number;
  scrapedAt: string;
  publishedAt: string | null;
  competitor: Competitor;
}

interface StatsData {
  total: number;
  thisWeek: number;
  leadMagnets: number;
  productLaunches: number;
}

const UPDATE_TYPE_STYLES: Record<string, { label: string; className: string }> = {
  LEAD_MAGNET:     { label: "Lead Magnet",    className: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
  PRODUCT_UPDATE:  { label: "Product Update", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  FEATURE_LAUNCH:  { label: "Feature Launch", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  ANNOUNCEMENT:    { label: "Announcement",   className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  SOCIAL_POST:     { label: "Social Post",    className: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  LinkedIn:    <Network className="w-3.5 h-3.5" />,
  Twitter:     <Share2 className="w-3.5 h-3.5" />,
  ProductHunt: <Flame className="w-3.5 h-3.5" />,
  YouTube:     <Video className="w-3.5 h-3.5" />,
  Medium:      <Globe className="w-3.5 h-3.5" />,
  DevTo:       <Globe className="w-3.5 h-3.5" />,
};

const UPDATE_TYPE_OPTIONS = ["All", "PRODUCT_UPDATE", "LEAD_MAGNET", "FEATURE_LAUNCH", "ANNOUNCEMENT", "SOCIAL_POST"];
const CHANNEL_OPTIONS = ["All", "LinkedIn", "Twitter", "ProductHunt", "YouTube", "Medium", "DevTo"];

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function CompetitorsContent() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<CompetitorUpdate[]>([]);
  const [stats, setStats] = useState<StatsData>({ total: 0, thisWeek: 0, leadMagnets: 0, productLaunches: 0 });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [updateTypeFilter, setUpdateTypeFilter] = useState("All");
  const [channelFilter, setChannelFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => {
        const id = d.projects?.[0]?.id ?? d.project?.id ?? null;
        setProjectId(id);
      })
      .catch(() => setProjectId(null));
  }, []);

  const fetchUpdates = useCallback(async (pid: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ projectId: pid, limit: "100" });
      if (updateTypeFilter !== "All") params.set("updateType", updateTypeFilter);
      if (channelFilter !== "All") params.set("channel", channelFilter);

      const [updatesRes, competitorsRes] = await Promise.all([
        fetch(`/api/competitors/updates?${params}`),
        fetch(`/api/competitors?projectId=${pid}`),
      ]);

      const updatesData = await updatesRes.json();
      const competitorsData = await competitorsRes.json();

      const allUpdates: CompetitorUpdate[] = updatesData.updates ?? [];
      const allCompetitors = competitorsData.competitors ?? [];

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setStats({
        total: allCompetitors.length,
        thisWeek: allUpdates.filter((u) => new Date(u.scrapedAt).getTime() > oneWeekAgo).length,
        leadMagnets: allUpdates.filter((u) => u.updateType === "LEAD_MAGNET").length,
        productLaunches: allUpdates.filter((u) => u.updateType === "FEATURE_LAUNCH" || u.updateType === "PRODUCT_UPDATE").length,
      });

      setUpdates(allUpdates);
    } catch {
      setError("Failed to load competitor data.");
    } finally {
      setLoading(false);
    }
  }, [updateTypeFilter, channelFilter]);

  useEffect(() => {
    if (projectId) fetchUpdates(projectId);
  }, [projectId, fetchUpdates]);

  const handleScan = async () => {
    if (!projectId || scanning) return;
    setScanning(true);
    try {
      await fetch("/api/competitors/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      await fetchUpdates(projectId);
    } catch {
      setError("Scan failed.");
    } finally {
      setScanning(false);
    }
  };

  const filteredUpdates = updates.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.competitor.name.toLowerCase().includes(q) ||
      u.title.toLowerCase().includes(q) ||
      u.summary.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div />
        <Button
          onClick={handleScan}
          disabled={scanning || !projectId}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm h-8 px-3 gap-1.5"
        >
          {scanning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {scanning ? "Scanning..." : "Scan Now"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Competitors Tracked", value: stats.total, icon: <Building2 className="w-4 h-4 text-gray-400" /> },
          { label: "Updates This Week",   value: stats.thisWeek, icon: <RefreshCw className="w-4 h-4 text-blue-400" /> },
          { label: "Lead Magnets Found",  value: stats.leadMagnets, icon: <Flame className="w-4 h-4 text-violet-400" /> },
          { label: "Product Launches",    value: stats.productLaunches, icon: <Loader2 className="w-4 h-4 text-emerald-400" /> },
        ].map(({ label, value, icon }) => (
          <Card key={label} className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{label}</span>
                {icon}
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search competitor or keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-gray-800 border-gray-700 text-white placeholder-gray-500 text-sm h-8 w-64"
        />
        <div className="flex items-center gap-1.5">
          {UPDATE_TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setUpdateTypeFilter(t)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                updateTypeFilter === t
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
              }`}
            >
              {t === "All" ? "All Types" : (UPDATE_TYPE_STYLES[t]?.label ?? t)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {CHANNEL_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setChannelFilter(c)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                channelFilter === c
                  ? "bg-violet-600/20 text-violet-300 border-violet-500/40"
                  : "bg-gray-800 text-gray-400 border-gray-700 hover:text-gray-200"
              }`}
            >
              {c === "All" ? "All Channels" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20 text-red-400 text-sm">{error}</div>
      ) : filteredUpdates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Building2 className="w-10 h-10 text-gray-600" />
          <p className="text-gray-400 text-sm">No competitor updates yet.</p>
          <p className="text-gray-500 text-xs">Click &quot;Scan Now&quot; to pull latest activity from all channels.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUpdates.map((update) => {
            const typeStyle = UPDATE_TYPE_STYLES[update.updateType] ?? UPDATE_TYPE_STYLES.SOCIAL_POST;
            const channelIcon = CHANNEL_ICONS[update.channel] ?? <Globe className="w-3.5 h-3.5" />;

            return (
              <Card key={update.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-white">{update.competitor.name}</span>
                        {update.competitor.domain && (
                          <span className="text-[10px] text-gray-500 bg-gray-700/60 px-1.5 py-0.5 rounded">
                            {update.competitor.domain}
                          </span>
                        )}
                        <Badge className={`text-[10px] border ${typeStyle.className}`}>
                          {typeStyle.label}
                        </Badge>
                        {update.leadMagnetType && (
                          <Badge className="text-[10px] border bg-violet-500/10 text-violet-400 border-violet-500/20">
                            {update.leadMagnetType}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-gray-500">
                          {channelIcon}
                          {update.channel}
                        </span>
                      </div>

                      <p className="text-sm text-gray-100 font-medium leading-snug line-clamp-1">
                        {update.title}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {update.summary}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-[10px] text-gray-500">
                        {relativeDate(update.scrapedAt)}
                      </span>
                      <a
                        href={update.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        View Source
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
