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
    if (Array.isArray(node)) { node.forEach(traverse); return; }
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

export async function scrapeYouTube(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 4)
      : FALLBACK_QUERIES.slice(0, 3);

  for (const query of queries) {
    if (signals.length >= maxResults) break;
    try {
      const res = await fetch("https://www.youtube.com/youtubei/v1/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          "X-YouTube-Client-Name": "1",
          "X-YouTube-Client-Version": "2.20240101.00.00",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00",
              hl: "en",
              gl: "US",
            },
          },
          query,
          params: "EgIQAQ==", // videos only
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const videos = parseVideoRenderers(data);

      for (const v of videos) {
        if (!v.videoId || seen.has(v.videoId) || signals.length >= maxResults) continue;
        const title = extractText(v.title);
        if (!title) continue;
        seen.add(v.videoId);

        const channel = extractText(v.ownerText ?? v.shortBylineText);
        const description = extractText(v.descriptionSnippet);

        signals.push({
          id: `yt_${v.videoId}`,
          title,
          body: description || title,
          author: channel || "Unknown",
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          channel: "YOUTUBE",
          score: 0,
          commentCount: 0,
          createdAt: new Date(), // YT innertube doesn't reliably return dates
          tags: [],
        });
      }
    } catch {
      // skip
    }
  }

  return signals;
}
