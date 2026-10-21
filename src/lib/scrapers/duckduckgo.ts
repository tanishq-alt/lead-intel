/**
 * Search utility using SearXNG (open-source meta-search, returns JSON).
 * Falls back to DuckDuckGo lite HTML if SearXNG instances are unavailable.
 *
 * Why SearXNG over DDG HTML: DDG's HTML endpoint aggressively rate-limits
 * server-side fetch requests, causing near-zero results. SearXNG instances
 * return stable JSON from the same underlying sources.
 */

export interface DDGResult {
  title: string;
  url: string;
  snippet: string;
}

// Public SearXNG instances with JSON support
const SEARXNG_INSTANCES = [
  "https://searx.be",
  "https://search.ononoki.org",
  "https://searxng.site",
  "https://search.mdosch.de",
];

interface SearXNGResult {
  title: string;
  url: string;
  content?: string;
}

interface SearXNGResponse {
  results: SearXNGResult[];
}

async function searchSearXNG(query: string, maxResults: number): Promise<DDGResult[]> {
  for (const base of SEARXNG_INSTANCES) {
    try {
      const url = `${base}/search?q=${encodeURIComponent(query)}&categories=general&format=json&language=en&time_range=&safesearch=0`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LeadIntel/1.0)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data: SearXNGResponse = await res.json();
      if (!data.results?.length) continue;
      return data.results
        .filter((r) => r.url && r.title)
        .slice(0, maxResults)
        .map((r) => ({
          title: r.title.trim(),
          url: r.url.trim(),
          snippet: (r.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
        }));
    } catch {
      // try next instance
    }
  }
  return [];
}

async function searchDDGLite(query: string, maxResults: number): Promise<DDGResult[]> {
  try {
    const body = new URLSearchParams({ q: query, kl: "us-en" }).toString();
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body,
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseDDGLiteHtml(html).slice(0, maxResults);
  } catch {
    return [];
  }
}

function parseDDGLiteHtml(html: string): DDGResult[] {
  const results: DDGResult[] = [];

  // DDG lite uses table rows with class "result-link" for titles and "result-snippet" for snippets
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*class="result-link"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetPattern = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

  const links: { url: string; title: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = linkPattern.exec(html)) !== null) {
    let url = m[1].trim();
    const title = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!url || !title) continue;
    // Decode DDG redirect
    if (url.includes("uddg=")) {
      try { url = decodeURIComponent(url.split("uddg=")[1].split("&")[0]); } catch { continue; }
    }
    if (url.startsWith("/") || url.includes("duckduckgo.com")) continue;
    links.push({ url, title });
  }

  const snippets: string[] = [];
  while ((m = snippetPattern.exec(html)) !== null) {
    snippets.push(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] ?? "",
    });
  }
  return results;
}

export async function searchDDG(query: string, maxResults = 10): Promise<DDGResult[]> {
  // Try SearXNG JSON first (most reliable, no HTML parsing)
  const searxResults = await searchSearXNG(query, maxResults);
  if (searxResults.length > 0) return searxResults;

  // Fallback: DDG lite HTML
  const liteResults = await searchDDGLite(query, maxResults);
  if (liteResults.length > 0) return liteResults;

  return [];
}
