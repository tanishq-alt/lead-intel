import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  body_markdown?: string;
  user: { username: string; name: string; profile_image?: string };
  url: string;
  published_at: string;
  public_reactions_count: number;
  comments_count: number;
  tags: string[];
  reading_time_minutes: number;
}

// Dev.to search - uses their free public API
async function searchDevTo(query: string, perPage = 10): Promise<DevToArticle[]> {
  const url = `https://dev.to/api/articles?per_page=${perPage}&top=30&state=all`;
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "LeadIntel/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function searchDevToByTag(tag: string, perPage = 10): Promise<DevToArticle[]> {
  const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=${perPage}&top=30`;
  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "LeadIntel/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function scrapeDevTo(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;

  // Build tag list from keywords
  const tags = (config.keywords ?? [])
    .flatMap((kw) => kw.toLowerCase().split(/\s+/))
    .filter((t) => t.length > 2)
    .slice(0, 5);

  const fallbackTags = ["discuss", "career", "tools", "productivity", "devops"];
  const tagsToSearch = tags.length > 0 ? tags : fallbackTags;

  // Also add competitor names as tags
  const competitorTags = (config.competitors ?? [])
    .map((c) => c.toLowerCase().replace(/\s+/g, ""))
    .slice(0, 3);

  const allTags = [...tagsToSearch, ...competitorTags];

  const fetches = allTags.map((tag) =>
    searchDevToByTag(tag, 15).catch(() => [] as DevToArticle[])
  );

  const results = await Promise.allSettled(fetches);

  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const article of result.value) {
      const key = String(article.id);
      if (seen.has(key) || signals.length >= maxResults) continue;
      seen.add(key);

      signals.push({
        id: `devto_${article.id}`,
        title: article.title,
        body: article.description || article.title,
        author: article.user.username,
        authorUrl: `https://dev.to/${article.user.username}`,
        url: article.url,
        channel: "DEV_TO",
        score: article.public_reactions_count,
        commentCount: article.comments_count,
        createdAt: new Date(article.published_at),
        tags: article.tags,
      });
    }
  }

  return signals;
}
