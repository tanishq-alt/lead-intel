import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

interface HNHit {
  objectID: string;
  title?: string;
  story_title?: string;
  comment_text?: string;
  story_text?: string;
  author: string;
  url?: string;
  story_url?: string;
  points?: number;
  num_comments?: number;
  created_at: string;
  _tags?: string[];
}

interface HNSearchResponse {
  hits: HNHit[];
}

export async function scrapeHackerNews(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 50;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 6)
      : FALLBACK_QUERIES.slice(0, 5);

  const fetches = queries.map(async (q) => {
    try {
      // Stories
      const storyUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=15`;
      const storyRes = await fetch(storyUrl, { signal: AbortSignal.timeout(8000) });
      if (storyRes.ok) {
        const data: HNSearchResponse = await storyRes.json();
        for (const hit of data.hits) {
          if (seen.has(hit.objectID) || signals.length >= maxResults) continue;
          seen.add(hit.objectID);
          const title = hit.title ?? hit.story_title ?? "";
          if (!title) continue;
          signals.push({
            id: `hn_${hit.objectID}`,
            title,
            body: hit.story_text ?? hit.comment_text ?? title,
            author: hit.author,
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            channel: "HACKER_NEWS",
            score: hit.points ?? 0,
            commentCount: hit.num_comments ?? 0,
            createdAt: new Date(hit.created_at),
          });
        }
      }

      // Comments
      const commentUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=comment&hitsPerPage=15`;
      const commentRes = await fetch(commentUrl, { signal: AbortSignal.timeout(8000) });
      if (commentRes.ok) {
        const data: HNSearchResponse = await commentRes.json();
        for (const hit of data.hits) {
          if (seen.has(hit.objectID) || signals.length >= maxResults) continue;
          const body = hit.comment_text ?? "";
          if (!body || body.length < 30) continue;
          seen.add(hit.objectID);
          signals.push({
            id: `hn_${hit.objectID}`,
            title: hit.story_title ?? "HN Comment",
            body,
            author: hit.author,
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            channel: "HACKER_NEWS",
            score: hit.points ?? 0,
            createdAt: new Date(hit.created_at),
          });
        }
      }
    } catch {
      // skip
    }
  });

  await Promise.allSettled(fetches);
  return signals;
}
