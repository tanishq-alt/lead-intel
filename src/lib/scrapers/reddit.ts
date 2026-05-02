import type { RawSignal, ScrapeConfig } from "./types";

const SUBREDDITS = [
  "SaaS", "entrepreneur", "startups", "smallbusiness",
  "webdev", "devops", "ExperiencedDevs", "programming",
  "marketing", "sales", "businessintelligence",
  "humanresources", "fintech", "ecommerce",
  "software", "ProductManagement", "Accounting",
];

const BASE_QUERIES = [
  "alternative to",
  "alternatives to",
  "switching from",
  "replacing",
  "frustrated with",
  "anyone recommend",
  "best tool for",
  "looking for a",
  "migrating from",
  "moved away from",
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
  data: {
    children: RedditPost[];
  };
}

export async function scrapeReddit(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const maxResults = config.maxResults ?? 50;
  const seen = new Set<string>();

  const searchTerms = config.keywords?.length
    ? config.keywords
    : BASE_QUERIES;

  const searchTargets = config.competitors?.length
    ? [...searchTerms, ...config.competitors.map(c => `alternative to ${c}`)]
    : searchTerms;

  const fetches: Promise<void>[] = [];

  for (const query of searchTargets.slice(0, 4)) {
    for (const sub of SUBREDDITS.slice(0, 3)) {
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

  // Also search global Reddit
  for (const query of searchTargets.slice(0, 3)) {
    fetches.push(
      (async () => {
        try {
          const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=10&t=month`;
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
