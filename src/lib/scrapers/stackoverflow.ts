import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

interface SOQuestion {
  question_id: number;
  title: string;
  body?: string;
  owner: { display_name: string; link?: string };
  link: string;
  score: number;
  answer_count: number;
  creation_date: number;
  tags: string[];
  body_markdown?: string;
}

interface SOResponse {
  items: SOQuestion[];
}

export async function scrapeStackOverflow(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 4)
      : FALLBACK_QUERIES.slice(0, 4);

  const fetches = queries.map(async (q) => {
    try {
      const url = `https://api.stackexchange.com/2.3/search/advanced?q=${encodeURIComponent(q)}&site=stackoverflow&order=desc&sort=activity&pagesize=10&filter=withbody`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return;
      const data: SOResponse = await res.json();

      for (const q of data.items) {
        const key = String(q.question_id);
        if (seen.has(key) || signals.length >= maxResults) continue;
        seen.add(key);
        signals.push({
          id: `so_${q.question_id}`,
          title: q.title,
          body: q.body_markdown ?? q.body ?? q.title,
          author: q.owner.display_name,
          authorUrl: q.owner.link,
          url: q.link,
          channel: "STACKOVERFLOW",
          score: q.score,
          commentCount: q.answer_count,
          createdAt: new Date(q.creation_date * 1000),
          tags: q.tags,
        });
      }
    } catch {
      // skip
    }
  });

  await Promise.allSettled(fetches);
  return signals;
}
