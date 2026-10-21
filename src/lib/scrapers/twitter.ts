import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";
import { searchDDG } from "./duckduckgo";

// Twitter's public bearer token (embedded in their web app, used for guest token flow)
const PUBLIC_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I4xL1g38Q3aQ%3D3D5h";

interface GuestTokenCache {
  token: string;
  expiresAt: number;
}

let guestTokenCache: GuestTokenCache | null = null;

function getBearer(): string {
  return process.env.TWITTER_BEARER_TOKEN || PUBLIC_BEARER;
}

async function getGuestToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && guestTokenCache && Date.now() < guestTokenCache.expiresAt) {
    return guestTokenCache.token;
  }
  try {
    const res = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PUBLIC_BEARER}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { guest_token?: string };
    if (!data.guest_token) return null;
    guestTokenCache = {
      token: data.guest_token,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    return data.guest_token;
  } catch {
    return null;
  }
}

interface TwitterSearchTweet {
  id_str: string;
  full_text?: string;
  text?: string;
  created_at: string;
  favorite_count?: number;
  retweet_count?: number;
  user?: {
    screen_name: string;
    name: string;
  };
  entities?: {
    urls?: { expanded_url: string }[];
  };
}

interface TwitterSearchResponse {
  statuses?: TwitterSearchTweet[];
}

async function searchTwitterApi(query: string): Promise<TwitterSearchTweet[]> {
  const bearer = getBearer();
  const useUserToken = bearer !== PUBLIC_BEARER;

  let guestToken: string | null = null;
  if (!useUserToken) {
    guestToken = await getGuestToken();
    if (!guestToken) return [];
  }

  const url = `https://api.twitter.com/1.1/search/tweets.json?q=${encodeURIComponent(
    query,
  )}&result_type=recent&count=20&tweet_mode=extended`;

  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${bearer}`,
    };
    if (guestToken) headers["x-guest-token"] = guestToken;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (res.status === 403 && !useUserToken) {
      guestTokenCache = null;
      const refreshed = await getGuestToken(true);
      if (!refreshed) return [];
      const retry = await fetch(url, {
        headers: { Authorization: `Bearer ${bearer}`, "x-guest-token": refreshed },
        signal: AbortSignal.timeout(10000),
      });
      if (!retry.ok) return [];
      const data = (await retry.json()) as TwitterSearchResponse;
      return data.statuses ?? [];
    }
    if (!res.ok) return [];
    const data = (await res.json()) as TwitterSearchResponse;
    return data.statuses ?? [];
  } catch {
    return [];
  }
}

interface SyndicationTweet {
  id_str: string;
  full_text?: string;
  text?: string;
  created_at: string;
  favorite_count?: number;
  retweet_count?: number;
  user?: { screen_name: string; name: string };
}

async function fetchSyndicationTimeline(handle: string): Promise<SyndicationTweet[]> {
  const clean = handle.replace(/^@/, "");
  const url = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${encodeURIComponent(
    clean,
  )}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Syndication endpoint returns an HTML shell with a JSON blob in __NEXT_DATA__ or similar
    const nextDataMatch = html.match(
      /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/,
    );
    if (!nextDataMatch) return [];
    try {
      const json = JSON.parse(nextDataMatch[1]);
      const entries =
        json?.props?.pageProps?.timeline?.entries ??
        json?.props?.pageProps?.contextProvider?.initialState?.timeline ??
        [];
      const tweets: SyndicationTweet[] = [];
      const traverse = (node: unknown): void => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(traverse);
          return;
        }
        const o = node as Record<string, unknown>;
        if (typeof o.id_str === "string" && (typeof o.full_text === "string" || typeof o.text === "string")) {
          tweets.push(o as unknown as SyndicationTweet);
        }
        Object.values(o).forEach(traverse);
      };
      traverse(entries);
      // Also crawl the whole JSON
      if (tweets.length === 0) traverse(json);
      return tweets;
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

function tweetToSignal(
  t: TwitterSearchTweet | SyndicationTweet,
  competitorName?: string,
): RawSignal | null {
  if (!t.id_str) return null;
  const text = t.full_text ?? t.text ?? "";
  if (!text) return null;
  const screenName = t.user?.screen_name ?? "unknown";
  const url = `https://twitter.com/${screenName}/status/${t.id_str}`;
  const created = new Date(t.created_at);
  return {
    id: `tw_${t.id_str}`,
    title: text.slice(0, 120),
    body: text,
    author: screenName,
    authorUrl: `https://twitter.com/${screenName}`,
    url,
    channel: "TWITTER",
    score: t.favorite_count ?? 0,
    commentCount: t.retweet_count ?? 0,
    createdAt: isNaN(created.getTime()) ? new Date() : created,
    tags: competitorName ? [competitorName] : [],
    competitorName,
  };
}

export async function scrapeTwitterProfile(
  handle: string,
  maxResults = 20,
): Promise<RawSignal[]> {
  const clean = handle.replace(/^@/, "");
  const tweets = await fetchSyndicationTimeline(clean);
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  for (const t of tweets) {
    if (signals.length >= maxResults) break;
    const sig = tweetToSignal(t, clean);
    if (!sig || seen.has(sig.id)) continue;
    seen.add(sig.id);
    signals.push(sig);
  }
  if (signals.length > 0) return signals;

  // Fallback: API search for from:handle
  const apiTweets = await searchTwitterApi(`from:${clean}`);
  for (const t of apiTweets) {
    if (signals.length >= maxResults) break;
    const sig = tweetToSignal(t, clean);
    if (!sig || seen.has(sig.id)) continue;
    seen.add(sig.id);
    signals.push(sig);
  }
  if (signals.length > 0) return signals;

  // Last resort: SearXNG
  try {
    const ddg = await searchDDG(`site:twitter.com/${clean}`, 10);
    for (const r of ddg) {
      if (signals.length >= maxResults) break;
      if (!r.url.includes("/status/")) continue;
      const idMatch = r.url.match(/status\/(\d+)/);
      if (!idMatch) continue;
      const id = idMatch[1];
      if (seen.has(`tw_${id}`)) continue;
      seen.add(`tw_${id}`);
      signals.push({
        id: `tw_${id}`,
        title: r.title.slice(0, 120),
        body: r.snippet || r.title,
        author: clean,
        authorUrl: `https://twitter.com/${clean}`,
        url: r.url,
        channel: "TWITTER",
        score: 0,
        commentCount: 0,
        createdAt: new Date(),
        tags: [clean],
        competitorName: clean,
      });
    }
  } catch {
    // ignore
  }
  return signals;
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
      const tweets = await searchTwitterApi(query);
      for (const t of tweets) {
        if (signals.length >= maxResults) break;
        const sig = tweetToSignal(t);
        if (!sig || seen.has(sig.id)) continue;
        seen.add(sig.id);
        signals.push(sig);
      }
    } catch {
      // skip
    }
  }

  // Fallback via SearXNG if API fully failed
  if (signals.length === 0) {
    for (const query of queries.slice(0, 3)) {
      try {
        const ddg = await searchDDG(`site:twitter.com ${query}`, 10);
        for (const r of ddg) {
          if (signals.length >= maxResults) break;
          if (!r.url.includes("/status/")) continue;
          const idMatch = r.url.match(/status\/(\d+)/);
          if (!idMatch) continue;
          const id = idMatch[1];
          const key = `tw_${id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const handleMatch = r.url.match(/twitter\.com\/([^/]+)\/status/);
          const screenName = handleMatch?.[1] ?? "unknown";
          signals.push({
            id: key,
            title: r.title.slice(0, 120),
            body: r.snippet || r.title,
            author: screenName,
            authorUrl: `https://twitter.com/${screenName}`,
            url: r.url,
            channel: "TWITTER",
            score: 0,
            commentCount: 0,
            createdAt: new Date(),
            tags: [],
          });
        }
      } catch {
        // skip
      }
    }
  }

  return signals;
}
