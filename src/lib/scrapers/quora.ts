import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche } from "./queries";
import { searchDDG } from "./duckduckgo";

export async function scrapeQuora(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 20;

  const queries = buildQueriesFromNiche(
    config.keywords ?? [],
    config.competitors ?? [],
    5
  );

  const fetches = queries.slice(0, 5).map((q) =>
    searchDDG(`site:quora.com "${q}"`, 8)
      .then((results) => {
        for (const r of results) {
          if (seen.has(r.url) || signals.length >= maxResults) continue;
          if (!r.snippet || r.snippet.length < 30) continue;
          seen.add(r.url);

          signals.push({
            id: `qr_${Buffer.from(r.url).toString("base64url").slice(0, 24)}`,
            title: r.title,
            body: r.snippet,
            author: "Quora User",
            url: r.url,
            channel: "QUORA",
            score: 0,
            commentCount: 0,
            createdAt: new Date(),
          });
        }
      })
      .catch(() => {})
  );

  await Promise.allSettled(fetches);
  return signals;
}
