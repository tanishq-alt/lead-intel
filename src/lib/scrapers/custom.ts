import type { RawSignal, ScrapeConfig } from "./types";

interface CustomScrapeConfig extends ScrapeConfig {
  urls?: string[];
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string, fallback: string): string {
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? fallback;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function scoredSnippet(text: string, keywords: string[]): string {
  if (!keywords.length) return text.slice(0, 600);

  // Find the sentence with the most keyword matches
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const scored = sentences.map((s) => {
    const lower = s.toLowerCase();
    const hits = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
    return { sentence: s, hits };
  });

  scored.sort((a, b) => b.hits - a.hits);

  return scored
    .slice(0, 4)
    .map((s) => s.sentence)
    .join(" … ")
    .slice(0, 800);
}

export async function scrapeCustomUrls(
  config: CustomScrapeConfig = {}
): Promise<RawSignal[]> {
  const urls = config.urls ?? [];
  if (!urls.length) return [];

  const keywords = config.keywords ?? [];
  const signals: RawSignal[] = [];

  const fetches = urls.slice(0, 20).map(async (rawUrl) => {
    let url = rawUrl.trim();
    if (!url.startsWith("http")) url = `https://${url}`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; LeadIntel/1.0; +https://lead-intel.vercel.app)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) return;
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("html") && !contentType.includes("text")) return;

      const html = await res.text();
      const title = extractTitle(html, url);
      const text = extractTextFromHtml(html);
      const body = scoredSnippet(text, keywords);
      const domain = extractDomain(url);

      signals.push({
        id: `custom_${Buffer.from(url).toString("base64url").slice(0, 24)}`,
        title,
        body,
        author: domain,
        url,
        channel: "CUSTOM",
        score: 0,
        commentCount: 0,
        createdAt: new Date(),
        tags: [domain],
      });
    } catch {
      // skip unreachable URLs
    }
  });

  await Promise.allSettled(fetches);
  return signals;
}
