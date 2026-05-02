import type { RawSignal, ScrapeConfig } from "./types";
import { scrapeReddit } from "./reddit";
import { scrapeHackerNews } from "./hackernews";
import { scrapeGitHubIssues } from "./github";
import { scrapeStackOverflow } from "./stackoverflow";

export type ScraperChannel = "REDDIT" | "HACKER_NEWS" | "GITHUB_ISSUES" | "STACKOVERFLOW" | "ALL";

export interface OrchestratorConfig extends ScrapeConfig {
  channels?: ScraperChannel[];
  projectKeywords?: string[];
  competitorNames?: string[];
}

export async function runScrapers(config: OrchestratorConfig = {}): Promise<RawSignal[]> {
  const channels = config.channels ?? ["ALL"];
  const runAll = channels.includes("ALL");

  const scraperConfig: ScrapeConfig = {
    keywords: config.keywords ?? config.projectKeywords,
    competitors: config.competitors ?? config.competitorNames,
    industries: config.industries,
    maxResults: config.maxResults,
    geo: config.geo,
  };

  const tasks: Promise<RawSignal[]>[] = [];

  if (runAll || channels.includes("REDDIT")) {
    tasks.push(scrapeReddit(scraperConfig).catch(() => []));
  }
  if (runAll || channels.includes("HACKER_NEWS")) {
    tasks.push(scrapeHackerNews(scraperConfig).catch(() => []));
  }
  if (runAll || channels.includes("GITHUB_ISSUES")) {
    tasks.push(scrapeGitHubIssues(scraperConfig).catch(() => []));
  }
  if (runAll || channels.includes("STACKOVERFLOW")) {
    tasks.push(scrapeStackOverflow(scraperConfig).catch(() => []));
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

  // Sort by score descending
  allSignals.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return allSignals;
}

export { scrapeReddit, scrapeHackerNews, scrapeGitHubIssues, scrapeStackOverflow };
export type { RawSignal, ScrapeConfig } from "./types";
