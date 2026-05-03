import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

const SUBREDDITS = [
  "SaaS", "entrepreneur", "startups", "smallbusiness",
  "webdev", "devops", "ExperiencedDevs", "programming",
  "marketing", "sales", "businessintelligence",
  "humanresources", "fintech", "ecommerce",
  "software", "ProductManagement", "Accounting", "techsupport",
];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    author: string;
    permalink: string;
    subreddit: string;
    score: number;
    num_comments: number;
    created_utc: number;
    url: string;
  };
}

interface RedditSearchResponse {
  data: { children: RedditPost[] };
}

export async function scrapeReddit(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const maxResults = config.maxResults ?? 50;
  const seen = new Set<string>();

  // Build targeted queries from the user's niche
  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 8)
      : FALLBACK_QUERIES.slice(0, 6);

  const fetches: Promise<void>[] = [];

  // Per-subreddit search (top 3 subreddits × top 3 queries)
  for (const query of queries.slice(0, 3)) {
    for (const sub of SUBREDDITS.slice(0, 4)) {
      fetches.push(
        (async () => {
          try {
            const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(query)}&restrict_sr=true&sort=new&limit=10&t=month`;
            const res = await fetch(url, {
              headers: {
                "User-Agent": "LeadIntel/1.0 (lead intelligence aggregator)",
                "Accept": "application/json",
              },
              signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) return;
            const data: RedditSearchResponse = await res.json();

            for (const post of data.data.children) {
              if (seen.has(post.data.id)) continue;
              if (post.data.author === "AutoModerator" || post.data.author === "[deleted]") continue;
              if (post.data.selftext === "[removed]" || post.data.selftext === "[deleted]") continue;
              if (signals.length >= maxResults) return;

              seen.add(post.data.id);
              signals.push({
                id: `reddit_${post.data.id}`,
                title: post.data.title,
                body: post.data.selftext || post.data.title,
                author: post.data.author,
                authorUrl: `https://reddit.com/u/${post.data.author}`,
                url: `https://reddit.com${post.data.permalink}`,
                channel: "REDDIT",
                subreddit: post.data.subreddit,
                score: post.data.score,
                commentCount: post.data.num_comments,
                createdAt: new Date(post.data.created_utc * 1000),
              });
            }
          } catch {
            // skip failed requests
          }
        })()
      );
    }
  }

  // Global Reddit search for remaining queries
  for (const query of queries.slice(0, 5)) {
    fetches.push(
      (async () => {
        try {
          const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=15&t=month`;
          const res = await fetch(url, {
            headers: {
              "User-Agent": "LeadIntel/1.0 (lead intelligence aggregator)",
              "Accept": "application/json",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const data: RedditSearchResponse = await res.json();

          for (const post of data.data.children) {
            if (seen.has(post.data.id)) continue;
            if (post.data.author === "AutoModerator" || post.data.author === "[deleted]") continue;
            if (signals.length >= maxResults) return;
            seen.add(post.data.id);
            signals.push({
              id: `reddit_${post.data.id}`,
              title: post.data.title,
              body: post.data.selftext || post.data.title,
              author: post.data.author,
              authorUrl: `https://reddit.com/u/${post.data.author}`,
              url: `https://reddit.com${post.data.permalink}`,
              channel: "REDDIT",
              subreddit: post.data.subreddit,
              score: post.data.score,
              commentCount: post.data.num_comments,
              createdAt: new Date(post.data.created_utc * 1000),
            });
          }
        } catch {
          // skip
        }
      })()
    );
  }

  await Promise.allSettled(fetches);
  return signals;
}
