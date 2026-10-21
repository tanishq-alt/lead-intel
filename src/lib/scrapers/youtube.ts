import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

interface YTVideoRenderer {
  videoId: string;
  title?: { runs?: { text: string }[] };
  descriptionSnippet?: { runs?: { text: string }[] };
  ownerText?: { runs?: { text: string }[] };
  publishedTimeText?: { simpleText: string };
  viewCountText?: { simpleText: string };
  lengthText?: { simpleText: string };
  shortBylineText?: { runs?: { text: string; navigationEndpoint?: { browseEndpoint?: { browseId: string } } }[] };
}

function extractText(obj?: { runs?: { text: string }[] }): string {
  return obj?.runs?.map((r) => r.text).join("") ?? "";
}

function parseVideoRenderers(json: unknown): YTVideoRenderer[] {
  const results: YTVideoRenderer[] = [];
  const traverse = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(traverse);
      return;
    }
    const obj = node as Record<string, unknown>;
    if ("videoRenderer" in obj && obj.videoRenderer) {
      results.push(obj.videoRenderer as YTVideoRenderer);
      return;
    }
    Object.values(obj).forEach(traverse);
  };
  traverse(json);
  return results;
}

function parseRelativeDate(text: string): Date {
  if (!text) return new Date();
  const m = text.toLowerCase().match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/);
  if (!m) return new Date();
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const now = Date.now();
  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  return new Date(now - n * (multipliers[unit] ?? 0));
}

interface YTAPISearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    publishedAt: string;
    channelId?: string;
  };
}

interface YTAPISearchResponse {
  items?: YTAPISearchItem[];
}

async function searchYouTubeAPI(
  query: string,
  apiKey: string,
  publishedAfter?: string,
): Promise<RawSignal[]> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    order: "date",
    maxResults: "20",
    key: apiKey,
  });
  if (publishedAfter) params.set("publishedAfter", publishedAfter);
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = (await res.json()) as YTAPISearchResponse;
    return (data.items ?? [])
      .filter((i) => i.id.videoId)
      .map((i) => ({
        id: `yt_${i.id.videoId}`,
        title: i.snippet.title,
        body: i.snippet.description || i.snippet.title,
        author: i.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
        channel: "YOUTUBE",
        score: 0,
        commentCount: 0,
        createdAt: new Date(i.snippet.publishedAt),
        tags: [],
      }));
  } catch {
    return [];
  }
}

async function searchInnertube(query: string): Promise<RawSignal[]> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
      },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en", gl: "US" },
        },
        query,
        params: "EgIQAQ==",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const videos = parseVideoRenderers(data);
    const signals: RawSignal[] = [];
    const seen = new Set<string>();
    for (const v of videos) {
      if (!v.videoId || seen.has(v.videoId)) continue;
      const title = extractText(v.title);
      if (!title) continue;
      seen.add(v.videoId);
      const channelName = extractText(v.ownerText ?? v.shortBylineText);
      const description = extractText(v.descriptionSnippet);
      const relText = v.publishedTimeText?.simpleText ?? "";
      signals.push({
        id: `yt_${v.videoId}`,
        title,
        body: description || title,
        author: channelName || "Unknown",
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        channel: "YOUTUBE",
        score: 0,
        commentCount: 0,
        createdAt: parseRelativeDate(relText),
        tags: [],
      });
    }
    return signals;
  } catch {
    return [];
  }
}

export async function scrapeYouTubeChannel(
  channelId: string,
  config: ScrapeConfig = {},
): Promise<RawSignal[]> {
  const maxResults = config.maxResults ?? 20;
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        part: "snippet",
        channelId,
        type: "video",
        order: "date",
        maxResults: String(maxResults),
        key: apiKey,
      });
      const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const data = (await res.json()) as YTAPISearchResponse;
        return (data.items ?? [])
          .filter((i) => i.id.videoId)
          .map((i) => ({
            id: `yt_${i.id.videoId}`,
            title: i.snippet.title,
            body: i.snippet.description || i.snippet.title,
            author: i.snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
            channel: "YOUTUBE",
            score: 0,
            commentCount: 0,
            createdAt: new Date(i.snippet.publishedAt),
            tags: [],
          }));
      }
    } catch {
      // fall through
    }
  }

  // Innertube browse endpoint
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/browse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-YouTube-Client-Name": "1",
        "X-YouTube-Client-Version": "2.20240101.00.00",
      },
      body: JSON.stringify({
        context: {
          client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en", gl: "US" },
        },
        browseId: channelId,
        params: "EgZ2aWRlb3PyBgQKAjoA",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const videos = parseVideoRenderers(data);
    const signals: RawSignal[] = [];
    const seen = new Set<string>();
    for (const v of videos) {
      if (!v.videoId || seen.has(v.videoId) || signals.length >= maxResults) continue;
      const title = extractText(v.title);
      if (!title) continue;
      seen.add(v.videoId);
      const channelName = extractText(v.ownerText ?? v.shortBylineText);
      const relText = v.publishedTimeText?.simpleText ?? "";
      signals.push({
        id: `yt_${v.videoId}`,
        title,
        body: extractText(v.descriptionSnippet) || title,
        author: channelName || "Unknown",
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        channel: "YOUTUBE",
        score: 0,
        commentCount: 0,
        createdAt: parseRelativeDate(relText),
        tags: [],
      });
    }
    return signals;
  } catch {
    return [];
  }
}

export async function scrapeYouTube(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;
  const apiKey = process.env.YOUTUBE_API_KEY;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 4)
      : FALLBACK_QUERIES.slice(0, 3);

  const publishedAfter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const query of queries) {
    if (signals.length >= maxResults) break;
    const videos = apiKey
      ? await searchYouTubeAPI(query, apiKey, publishedAfter)
      : await searchInnertube(query);
    for (const v of videos) {
      if (seen.has(v.id) || signals.length >= maxResults) continue;
      seen.add(v.id);
      signals.push(v);
    }
  }

  return signals;
}
