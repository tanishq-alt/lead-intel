import type { RawSignal, ScrapeConfig, ScraperChannel } from "./types";
import { scrapeReddit } from "./reddit";
import { scrapeHackerNews } from "./hackernews";
import { scrapeGitHubIssues } from "./github";
import { scrapeStackOverflow } from "./stackoverflow";
import { scrapeYouTube } from "./youtube";
import { scrapeTwitter } from "./twitter";
import { scrapeJobs } from "./jobs";
import { scrapeDevTo } from "./devto";
import { scrapeProductHunt } from "./producthunt";

export type { ScraperChannel };

export interface OrchestratorConfig extends ScrapeConfig {
  channels?: ScraperChannel[];
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
];

export async function runScrapers(config: OrchestratorConfig = {}): Promise<RawSignal[]> {
  const channels = config.channels ?? ["ALL"];
  const runAll = channels.includes("ALL");
  const activeChannels = runAll
    ? ALL_CHANNELS
    : (channels.filter((c) => c !== "ALL") as Exclude<ScraperChannel, "ALL">[]);

  const scraperConfig: ScrapeConfig = {
    keywords: config.keywords,
    competitors: config.competitors,
    industries: config.industries,
    maxResults: config.maxResults
      ? Math.ceil(config.maxResults / activeChannels.length)
      : 20,
    geo: config.geo,
  };

  const tasks = activeChannels.map((ch) =>
    SCRAPER_MAP[ch](scraperConfig).catch(() => [] as RawSignal[])
  );

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
  scrapeReddit, scrapeHackerNews, scrapeGitHubIssues, scrapeStackOverflow,
  scrapeYouTube, scrapeTwitter, scrapeJobs, scrapeDevTo, scrapeProductHunt,
};
export type { RawSignal, ScrapeConfig } from "./types";
