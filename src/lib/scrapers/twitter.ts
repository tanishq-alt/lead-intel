import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

// Public Nitter instances — tried in order until one works
const NITTER_INSTANCES = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.1d4.us",
  "https://nitter.kavin.rocks",
];

interface NitterTweet {
  text: string;
  author: string;
  authorUrl: string;
  url: string;
  date: string;
  stats: { replies: number; retweets: number; likes: number };
}

function parseTweetsFromHtml(html: string, instanceBase: string): NitterTweet[] {
  const tweets: NitterTweet[] = [];
  // Each tweet lives in a <div class="timeline-item">
  const itemRegex = /<div class="timeline-item[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(html)) !== null) {
    const block = match[1];

    const permalinkMatch = block.match(/href="([^"]+\/status\/[^"]+)"/);
    if (!permalinkMatch) continue;
    const path = permalinkMatch[1];
    const url = `https://twitter.com${path}`;

    const authorMatch = block.match(/class="username"[^>]*>@?([^<]+)</);
    const author = authorMatch?.[1]?.trim() ?? "unknown";

    const textMatch = block.match(/<div class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    let text = textMatch?.[1] ?? "";
    // Strip HTML tags from tweet text
    text = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!text || text.length < 10) continue;

    const dateMatch = block.match(/datetime="([^"]+)"/);
    const date = dateMatch?.[1] ?? new Date().toISOString();

    const likesMatch = block.match(/class="icon-heart"[^>]*>[\s\S]*?<span[^>]*>([^<]*)</);
    const likes = parseInt(likesMatch?.[1]?.replace(/,/g, "") ?? "0") || 0;

    tweets.push({
      text,
      author,
      authorUrl: `${instanceBase}/${author}`,
      url,
      date,
      stats: { replies: 0, retweets: 0, likes },
    });
  }

  return tweets;
}

async function fetchFromNitter(query: string): Promise<NitterTweet[]> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&f=tweets`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const tweets = parseTweetsFromHtml(html, instance);
      if (tweets.length > 0) return tweets;
    } catch {
      // try next instance
    }
  }
  return [];
}

export async function scrapeTwitter(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 40;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 5)
      : FALLBACK_QUERIES.slice(0, 4);

  for (const query of queries.slice(0, 5)) {
    if (signals.length >= maxResults) break;
    try {
      const tweets = await fetchFromNitter(query);
      for (const tweet of tweets) {
        if (seen.has(tweet.url) || signals.length >= maxResults) continue;
        seen.add(tweet.url);
        signals.push({
          id: `tw_${Buffer.from(tweet.url).toString("base64").slice(0, 20)}`,
          title: tweet.text.slice(0, 120),
          body: tweet.text,
          author: tweet.author,
          authorUrl: `https://twitter.com/${tweet.author}`,
          url: tweet.url,
          channel: "TWITTER",
          score: tweet.stats.likes,
          commentCount: tweet.stats.replies,
          createdAt: new Date(tweet.date),
        });
      }
    } catch {
      // skip
    }
  }

  return signals;
}
