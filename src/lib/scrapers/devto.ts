import type { RawSignal, ScrapeConfig } from "./types";

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  body_markdown?: string;
  user: { username: string; name: string; profile_image?: string };
  organization?: { username?: string; name?: string };
  url: string;
  published_at: string;
  public_reactions_count: number;
  comments_count: number;
  tags: string[];
  tag_list?: string[];
  reading_time_minutes: number;
}

const UA = "LeadIntel/1.0";

async function fetchByTag(tag: string, perPage = 20): Promise<DevToArticle[]> {
  const url = `https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=${perPage}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return (await res.json()) as DevToArticle[];
  } catch {
    return [];
  }
}

async function fetchByUsername(username: string, perPage = 20): Promise<DevToArticle[]> {
  const url = `https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=${perPage}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    return (await res.json()) as DevToArticle[];
  } catch {
    return [];
  }
}

function matchesKeyword(article: DevToArticle, keyword: string): boolean {
  const k = keyword.toLowerCase();
  return (
    article.title.toLowerCase().includes(k) ||
    (article.description ?? "").toLowerCase().includes(k) ||
    (article.tag_list ?? article.tags ?? []).some((t) => t.toLowerCase().includes(k))
  );
}

export async function scrapeDevTo(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;

  const keywords = config.keywords ?? [];
  const competitors = config.competitors ?? [];

  const keywordTags = keywords
    .flatMap((kw) => kw.toLowerCase().split(/\s+/))
    .filter((t) => t.length > 2)
    .slice(0, 5);

  const competitorTags = competitors
    .map((c) => c.toLowerCase().replace(/\s+/g, ""))
    .slice(0, 3);

  const fallbackTags = ["hr", "saas", "startup", "productivity", "devops"];
  const tagsToSearch = keywordTags.length > 0 ? keywordTags : fallbackTags;
  const allTags = [...new Set([...tagsToSearch, ...competitorTags])];

  const tagFetches = allTags.map((tag) => fetchByTag(tag, 20).catch(() => [] as DevToArticle[]));
  const competitorUsernameFetches = competitors.map((c) =>
    fetchByUsername(c.toLowerCase().replace(/\s+/g, ""), 10).catch(() => [] as DevToArticle[]),
  );

  const [tagResults, competitorResults] = await Promise.all([
    Promise.allSettled(tagFetches),
    Promise.allSettled(competitorUsernameFetches),
  ]);

  const allArticles: { article: DevToArticle; competitorName?: string }[] = [];
  for (const r of tagResults) {
    if (r.status !== "fulfilled") continue;
    for (const a of r.value) allArticles.push({ article: a });
  }
  for (let i = 0; i < competitorResults.length; i++) {
    const r = competitorResults[i];
    if (r.status !== "fulfilled") continue;
    for (const a of r.value) allArticles.push({ article: a, competitorName: competitors[i] });
  }

  const needsFilter = keywords.length > 0 || competitors.length > 0;
  const kwForFilter = [...keywords, ...competitors];

  for (const { article, competitorName } of allArticles) {
    const key = String(article.id);
    if (seen.has(key) || signals.length >= maxResults) continue;
    if (needsFilter && !kwForFilter.some((kw) => matchesKeyword(article, kw)) && !competitorName) continue;
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
      tags: article.tag_list ?? article.tags ?? [],
      competitorName,
    });
  }

  return signals;
}
