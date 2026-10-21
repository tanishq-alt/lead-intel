import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche } from "./queries";
import { searchDDG } from "./duckduckgo";

export async function scrapeFacebook(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 25;

  const queries = buildQueriesFromNiche(
    config.keywords ?? [],
    config.competitors ?? [],
    5
  );

  // Search Facebook Groups content indexed by search engines
  const fetches = queries.slice(0, 4).map((q) =>
    searchDDG(`site:facebook.com/groups "${q}"`, 8)
      .then((results) => {
        for (const r of results) {
          if (seen.has(r.url) || signals.length >= maxResults) continue;
          if (!r.snippet || r.snippet.length < 20) continue;
          seen.add(r.url);

          const groupMatch = r.url.match(/facebook\.com\/groups\/([^/?]+)/);
          const group = groupMatch?.[1]?.replace(/-/g, " ") ?? "Facebook Group";

          signals.push({
            id: `fb_${Buffer.from(r.url).toString("base64url").slice(0, 24)}`,
            title: r.title,
            body: r.snippet,
            author: "Facebook Group Member",
            url: r.url,
            channel: "FACEBOOK_GROUPS",
            score: 0,
            commentCount: 0,
            createdAt: new Date(),
            tags: [group],
          });
        }
      })
      .catch(() => {})
  );

  await Promise.allSettled(fetches);
  return signals;
}
