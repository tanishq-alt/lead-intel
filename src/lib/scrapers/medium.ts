import type { RawSignal, ScrapeConfig } from "./types";
import { parseFeedXml } from "./changelog";

const UA = "Mozilla/5.0 (compatible; LeadIntel/1.0)";

async function fetchMediumFeed(url: string): Promise<RawSignal[]> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseFeedXml(xml);
    return items.map((item) => ({
      id: `med_${Buffer.from(item.link || item.title).toString("base64url").slice(0, 24)}`,
      title: item.title,
      body: item.description || item.title,
      author: item.author || "Medium Author",
      url: item.link,
      channel: "MEDIUM",
      score: 0,
      commentCount: 0,
      createdAt: item.pubDate ?? new Date(),
      tags: [],
    }));
  } catch {
    return [];
  }
}

export async function scrapeMedium(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 25;

  const tags = (config.keywords ?? [])
    .flatMap((kw) => kw.toLowerCase().split(/[\s,]+/))
    .filter((t) => t.length > 2)
    .map((t) => t.replace(/[^a-z0-9-]/g, ""))
    .slice(0, 5);

  const competitorHandles = (config.competitors ?? [])
    .map((c) => c.toLowerCase().replace(/\s+/g, ""))
    .slice(0, 3);

  const fallbackTags = ["hr", "saas", "startup", "productivity"];
  const tagsToUse = tags.length > 0 ? tags : fallbackTags;

  const feeds: string[] = [
    ...tagsToUse.slice(0, 5).map((t) => `https://medium.com/feed/tag/${encodeURIComponent(t)}`),
    ...competitorHandles.map((h) => `https://medium.com/feed/@${encodeURIComponent(h)}`),
  ];

  const results = await Promise.allSettled(feeds.map((f) => fetchMediumFeed(f)));

  const competitors = config.competitors ?? [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status !== "fulfilled") continue;
    const isCompetitorFeed = i >= tagsToUse.slice(0, 5).length;
    const competitorName = isCompetitorFeed
      ? competitors[i - tagsToUse.slice(0, 5).length]
      : undefined;
    for (const sig of r.value) {
      if (seen.has(sig.url) || signals.length >= maxResults) continue;
      seen.add(sig.url);
      signals.push({ ...sig, competitorName, tags: competitorName ? [competitorName] : sig.tags });
    }
  }

  return signals;
}
