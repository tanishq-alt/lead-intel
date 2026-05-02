import { Header } from "@/components/layout/header";
import { ChannelCard, ChannelConfig } from "@/components/channels/channel-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Play, Plus } from "lucide-react";

const defaultChannels: ChannelConfig[] = [
  // High-Intent
  {
    id: "google",
    name: "Google",
    description:
      'Monitors Google search queries like "looking for [competitor] alternative" and pain-point searches in real time.',
    category: "high-intent",
    enabled: true,
    icon: "🔍",
  },
  {
    id: "reddit",
    name: "Reddit",
    description:
      'Watches subreddits like r/entrepreneur, r/saas, and r/startups for "recommend me a tool" and complaint threads.',
    category: "high-intent",
    enabled: true,
    icon: "🟠",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description:
      "Scans job postings and company updates that signal buying intent — new hires in roles that use your product.",
    category: "high-intent",
    enabled: true,
    icon: "💼",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    description:
      "Tracks tweets expressing frustration with competitors or actively seeking tool recommendations.",
    category: "high-intent",
    enabled: false,
    icon: "🐦",
  },
  {
    id: "g2",
    name: "G2",
    description:
      "Monitors reviews and comparisons on G2 where prospects are actively evaluating solutions in your category.",
    category: "high-intent",
    enabled: true,
    icon: "⭐",
  },
  {
    id: "capterra",
    name: "Capterra",
    description:
      "Tracks software evaluation activity on Capterra — users comparing you and your competitors.",
    category: "high-intent",
    enabled: true,
    icon: "📊",
  },
  // Mid-Intent
  {
    id: "indeed",
    name: "Indeed",
    description:
      "Flags job postings that mention technologies or roles indicating a company is scaling into your market.",
    category: "mid-intent",
    enabled: true,
    icon: "👔",
  },
  {
    id: "crunchbase",
    name: "Crunchbase",
    description:
      "Monitors recent funding rounds and company growth signals that predict buying readiness.",
    category: "mid-intent",
    enabled: false,
    icon: "🚀",
  },
  {
    id: "hackernews",
    name: "Hacker News",
    description:
      'Watches "Ask HN" posts and threads where founders discuss tooling problems and actively seek recommendations.',
    category: "mid-intent",
    enabled: true,
    icon: "🟧",
  },
  // Advanced
  {
    id: "github",
    name: "GitHub Issues",
    description:
      "Parses open issues on competitor repos that indicate pain points your product could solve.",
    category: "advanced",
    enabled: false,
    icon: "🐙",
  },
  {
    id: "stackoverflow",
    name: "StackOverflow",
    description:
      "Detects questions about implementing features that your product handles out of the box.",
    category: "advanced",
    enabled: false,
    icon: "📚",
  },
  {
    id: "rfp",
    name: "RFP Portals",
    description:
      "Scans public RFP and procurement portals for government and enterprise opportunities.",
    category: "advanced",
    enabled: false,
    icon: "📋",
  },
];

async function getChannels(): Promise<ChannelConfig[]> {
  const projectId = process.env.PROJECT_ID ?? "demo";
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/channels?projectId=${projectId}`,
      { cache: "no-store" }
    );
    if (!res.ok) return defaultChannels;
    const data = await res.json();
    return data.channels ?? defaultChannels;
  } catch {
    return defaultChannels;
  }
}

export default async function ChannelsPage() {
  const channels = await getChannels();

  const highIntent = channels.filter((c) => c.category === "high-intent");
  const midIntent = channels.filter((c) => c.category === "mid-intent");
  const advanced = channels.filter((c) => c.category === "advanced");

  const enabledCount = channels.filter((c) => c.enabled).length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Channels"
        subtitle={`${enabledCount} of ${channels.length} channels enabled`}
        actions={
          <button className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition-colors">
            <Play className="w-3.5 h-3.5" />
            Run Scan Now
          </button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Add Custom Source */}
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Source</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-400 mb-3">
              Enter any URL to add a custom scraping source. Ruflo will analyze the
              page and extract high-intent signals automatically.
            </p>
            <form className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/forum or RSS feed URL..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </form>
          </CardContent>
        </Card>

        {/* High-Intent Channels */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-white">
              High-Intent Channels
            </h2>
            <span className="text-xs text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded">
              {highIntent.filter((c) => c.enabled).length}/{highIntent.length}{" "}
              active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {highIntent.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        </section>

        {/* Mid-Intent Channels */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-white">
              Mid-Intent Channels
            </h2>
            <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">
              {midIntent.filter((c) => c.enabled).length}/{midIntent.length}{" "}
              active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {midIntent.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        </section>

        {/* Advanced Channels */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-white">
              Advanced Channels
            </h2>
            <span className="text-xs text-violet-400 bg-violet-900/30 px-2 py-0.5 rounded">
              {advanced.filter((c) => c.enabled).length}/{advanced.length}{" "}
              active
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {advanced.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
