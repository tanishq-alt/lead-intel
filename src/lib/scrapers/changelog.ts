import type { RawSignal } from "./types";
import { detectUpdateType } from "./competitor-tracker";
import { searchDDG } from "./duckduckgo";

export interface ParsedFeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date | null;
  author: string;
}

const FEED_CANDIDATE_PATHS = [
  "/feed",
  "/feed.xml",
  "/rss",
  "/rss.xml",
  "/blog/feed",
  "/blog/rss.xml",
  "/blog/feed.xml",
  "/changelog/rss.xml",
  "/changelog/feed",
  "/releases.rss",
  "/news/feed",
  "/updates/feed",
];

const UA = "Mozilla/5.0 (compatible; LeadIntel/1.0)";

async function tryFetchFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    const lower = text.slice(0, 500).toLowerCase();
    if (lower.includes("<rss") || lower.includes("<feed") || lower.includes("<?xml")) {
      return url;
    }
    return null;
  } catch {
    return null;
  }
}

async function parseHomepageForFeedLink(domain: string): Promise<string | null> {
  try {
    const res = await fetch(`https://${domain}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const linkRegex = /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*>/gi;
    const match = html.match(linkRegex);
    if (!match) return null;
    for (const tag of match) {
      const href = tag.match(/href=["']([^"']+)["']/i);
      if (href?.[1]) {
        let url = href[1];
        if (url.startsWith("//")) url = `https:${url}`;
        else if (url.startsWith("/")) url = `https://${domain}${url}`;
        else if (!url.startsWith("http")) url = `https://${domain}/${url}`;
        return url;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function detectRSSFeed(domain: string): Promise<string | null> {
  const normalized = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const candidates = FEED_CANDIDATE_PATHS.map((p) => `https://${normalized}${p}`);

  const attempts: Promise<string>[] = candidates.map(
    (u) =>
      new Promise<string>((resolve, reject) => {
        tryFetchFeed(u).then((r) => (r ? resolve(r) : reject(new Error("miss"))));
      }),
  );
  attempts.push(
    new Promise<string>((resolve, reject) => {
      parseHomepageForFeedLink(normalized).then((r) => (r ? resolve(r) : reject(new Error("miss"))));
    }),
  );

  try {
    return await Promise.any(attempts);
  } catch {
    return null;
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

function stripCdata(s: string): string {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  return decodeXmlEntities(stripCdata(m[1])).trim();
}

function extractAtomLink(block: string): string | null {
  const m = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  return m?.[1] ?? null;
}

function safeDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function parseFeedXml(xml: string): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];
  const isAtom = /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);

  if (!isAtom) {
    const itemRegex = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
    let m: RegExpExecArray | null;
    while ((m = itemRegex.exec(xml)) !== null) {
      const block = m[1];
      const title = extractTag(block, "title") ?? "";
      const link = extractTag(block, "link") ?? "";
      const desc = extractTag(block, "description") ?? extractTag(block, "content:encoded") ?? "";
      const pub = extractTag(block, "pubDate") ?? extractTag(block, "dc:date") ?? null;
      const author = extractTag(block, "dc:creator") ?? extractTag(block, "author") ?? "";
      if (!title && !link) continue;
      items.push({
        title: stripHtml(title),
        link: link.trim(),
        description: stripHtml(desc).slice(0, 800),
        pubDate: safeDate(pub),
        author: stripHtml(author),
      });
    }
  } else {
    const entryRegex = /<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi;
    let m: RegExpExecArray | null;
    while ((m = entryRegex.exec(xml)) !== null) {
      const block = m[1];
      const title = extractTag(block, "title") ?? "";
      const link = extractAtomLink(block) ?? extractTag(block, "id") ?? "";
      const desc = extractTag(block, "summary") ?? extractTag(block, "content") ?? "";
      const pub = extractTag(block, "published") ?? extractTag(block, "updated") ?? null;
      const authorBlock = block.match(/<author(?:\s[^>]*)?>([\s\S]*?)<\/author>/i)?.[1] ?? "";
      const author = extractTag(authorBlock, "name") ?? "";
      if (!title && !link) continue;
      items.push({
        title: stripHtml(title),
        link: link.trim(),
        description: stripHtml(desc).slice(0, 800),
        pubDate: safeDate(pub),
        author: stripHtml(author),
      });
    }
  }

  return items;
}

export async function scrapeRSSFeed(feedUrl: string, maxItems = 20): Promise<RawSignal[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseFeedXml(xml).slice(0, maxItems);
    return items.map((item) => {
      const combined = `${item.title} ${item.description}`;
      const tags: string[] = [];
      const updateType = detectUpdateType(combined);
      tags.push(updateType);
      return {
        id: `cl_${Buffer.from(item.link || item.title).toString("base64url").slice(0, 32)}`,
        title: item.title || "Untitled",
        body: item.description || item.title,
        author: item.author || "Changelog",
        url: item.link,
        channel: "CHANGELOG",
        score: 0,
        commentCount: 0,
        createdAt: item.pubDate ?? new Date(),
        tags,
      };
    });
  } catch {
    return [];
  }
}

export async function scrapeCompetitorBlog(
  domain: string,
  competitorName: string,
): Promise<RawSignal[]> {
  if (!domain) return [];
  try {
    const feedUrl = await detectRSSFeed(domain);
    if (feedUrl) {
      const signals = await scrapeRSSFeed(feedUrl, 15);
      return signals.map((s) => ({ ...s, competitorName, tags: [...(s.tags ?? []), competitorName] }));
    }
  } catch {
    // fall through to DDG
  }

  try {
    const results = await searchDDG(
      `site:${domain} new feature OR product update OR changelog OR release`,
      10,
    );
    return results.slice(0, 10).map((r) => ({
      id: `cl_${Buffer.from(r.url).toString("base64url").slice(0, 32)}`,
      title: r.title,
      body: r.snippet,
      author: competitorName,
      url: r.url,
      channel: "CHANGELOG",
      score: 0,
      commentCount: 0,
      createdAt: new Date(),
      tags: [competitorName],
      competitorName,
    }));
  } catch {
    return [];
  }
}
