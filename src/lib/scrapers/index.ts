import type { RawSignal, ScrapeConfig, ScraperChannel } from "./types";
import { scrapeReddit } from "./reddit";
import { scrapeHackerNews } from "./hackernews";
import { scrapeGitHubIssues, scrapeGitHubCompetitorReleases } from "./github";
import { scrapeStackOverflow } from "./stackoverflow";
import { scrapeYouTube, scrapeYouTubeChannel } from "./youtube";
import { scrapeTwitter, scrapeTwitterProfile } from "./twitter";
import { scrapeJobs } from "./jobs";
import { scrapeDevTo } from "./devto";
import { scrapeProductHunt } from "./producthunt";
import { scrapeLinkedIn, scrapeLinkedInCompany } from "./linkedin";
import { scrapeFacebook } from "./facebook";
import { scrapeQuora } from "./quora";
import { scrapeG2 } from "./g2";
import { scrapeMedium } from "./medium";
import { scrapeCustomUrls } from "./custom";
import { scrapeCompetitorBlog, scrapeRSSFeed, detectRSSFeed } from "./changelog";

export type { ScraperChannel };

export interface OrchestratorConfig extends ScrapeConfig {
  channels?: ScraperChannel[];
}

async function scrapeChangelogFromConfig(config: ScrapeConfig): Promise<RawSignal[]> {
  const competitors = config.competitors ?? [];
  if (!competitors.length) return [];
  const results = await Promise.allSettled(
    competitors.slice(0, 10).map((name) => {
      // Try to guess domain from competitor name
      const guess = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
      return scrapeCompetitorBlog(guess, name);
    }),
  );
  const out: RawSignal[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") out.push(...r.value);
  }
  return out;
}

const SCRAPER_MAP: Record<
  Exclude<ScraperChannel, "ALL">,
  (config: ScrapeConfig) => Promise<RawSignal[]>
> = {
  REDDIT: scrapeReddit,
  HACKER_NEWS: scrapeHackerNews,
  GITHUB_ISSUES: scrapeGitHubIssues,
  STACKOVERFLOW: scrapeStackOverflow,
  YOUTUBE: scrapeYouTube,
  TWITTER: scrapeTwitter,
  JOBS: scrapeJobs,
  DEV_TO: scrapeDevTo,
  PRODUCT_HUNT: scrapeProductHunt,
  LINKEDIN: scrapeLinkedIn,
  FACEBOOK_GROUPS: scrapeFacebook,
  QUORA: scrapeQuora,
  G2: scrapeG2,
  MEDIUM: scrapeMedium,
  CHANGELOG: scrapeChangelogFromConfig,
  CUSTOM: scrapeCustomUrls,
};

export const ALL_CHANNELS: Exclude<ScraperChannel, "ALL">[] = [
  "REDDIT",
  "HACKER_NEWS",
  "GITHUB_ISSUES",
  "STACKOVERFLOW",
  "YOUTUBE",
  "TWITTER",
  "DEV_TO",
  "PRODUCT_HUNT",
  "JOBS",
  "LINKEDIN",
  "FACEBOOK_GROUPS",
  "QUORA",
  "G2",
  "MEDIUM",
  "CHANGELOG",
];

export async function runScrapers(config: OrchestratorConfig = {}): Promise<RawSignal[]> {
  const channels = config.channels ?? ["ALL"];
  const runAll = channels.includes("ALL");
  const activeChannels = runAll
    ? ALL_CHANNELS
    : (channels.filter((c) => c !== "ALL") as Exclude<ScraperChannel, "ALL">[]);

  // Auto-include CHANGELOG when competitors provided
  if (config.competitors?.length && !activeChannels.includes("CHANGELOG")) {
    activeChannels.push("CHANGELOG");
  }

  const scraperConfig: ScrapeConfig = {
    keywords: config.keywords,
    competitors: config.competitors,
    industries: config.industries,
    maxResults: config.maxResults
      ? Math.ceil(config.maxResults / activeChannels.length)
      : 20,
    geo: config.geo,
    dateRange: config.dateRange,
    customUrls: config.customUrls,
  };

  const tasks = activeChannels.map((ch) =>
    SCRAPER_MAP[ch](scraperConfig).catch(() => [] as RawSignal[]),
  );

  if (config.customUrls?.length && !activeChannels.includes("CUSTOM")) {
    tasks.push(scrapeCustomUrls(scraperConfig).catch(() => []));
  }

  const results = await Promise.allSettled(tasks);
  const allSignals: RawSignal[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const signal of result.value) {
        if (!seen.has(signal.id)) {
          seen.add(signal.id);
          allSignals.push(signal);
        }
      }
    }
  }

  allSignals.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return allSignals;
}

export {
  scrapeReddit,
  scrapeHackerNews,
  scrapeGitHubIssues,
  scrapeGitHubCompetitorReleases,
  scrapeStackOverflow,
  scrapeYouTube,
  scrapeYouTubeChannel,
  scrapeTwitter,
  scrapeTwitterProfile,
  scrapeJobs,
  scrapeDevTo,
  scrapeProductHunt,
  scrapeLinkedIn,
  scrapeLinkedInCompany,
  scrapeFacebook,
  scrapeQuora,
  scrapeG2,
  scrapeMedium,
  scrapeCustomUrls,
  scrapeCompetitorBlog,
  scrapeRSSFeed,
  detectRSSFeed,
};
export type { RawSignal, ScrapeConfig } from "./types";
