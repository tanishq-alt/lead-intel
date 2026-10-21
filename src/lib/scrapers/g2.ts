import type { RawSignal, ScrapeConfig } from "./types";
import { searchDDG } from "./duckduckgo";

interface G2Review {
  id?: number | string;
  slug?: string;
  title?: string;
  comment?: string;
  love?: string;
  hate?: string;
  content?: string;
  reviewer?: {
    name?: string;
    professional_title?: string;
    company_size?: string;
  };
  user_name?: string;
  user_professional_title?: string;
  published_at?: string;
  created_at?: string;
  url?: string;
}

interface G2ReviewsJsonResponse {
  reviews?: G2Review[];
}

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchG2ReviewsBySlug(slug: string, maxItems = 10): Promise<RawSignal[]> {
  try {
    const url = `https://www.g2.com/products/${slug}/reviews.json?filters[is_published]=true&order=helpfulness&per_page=${maxItems}`;
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as G2ReviewsJsonResponse;
    const reviews = data.reviews ?? [];
    return reviews.map((r, idx) => {
      const body =
        r.content ??
        [r.title, r.love, r.hate, r.comment].filter(Boolean).join(" — ") ??
        "";
      const reviewer = r.reviewer?.name ?? r.user_name ?? "G2 Reviewer";
      const title = r.reviewer?.professional_title ?? r.user_professional_title ?? "";
      const created = r.published_at ?? r.created_at ?? new Date().toISOString();
      const url2 = r.url ?? `https://www.g2.com/products/${slug}/reviews`;
      return {
        id: `g2_${slug}_${r.id ?? idx}`,
        title: r.title ?? `${slug} review`,
        body: body || "G2 review",
        author: reviewer,
        url: url2,
        channel: "G2",
        score: 0,
        commentCount: 0,
        createdAt: new Date(created),
        tags: [slug, "review", title].filter(Boolean) as string[],
        competitorName: slug,
      };
    });
  } catch {
    return [];
  }
}

async function fetchG2ProductPage(slug: string, maxItems = 10): Promise<RawSignal[]> {
  try {
    const url = `https://www.g2.com/products/${slug}/reviews`;
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const signals: RawSignal[] = [];
    const reviewRegex = /<article[^>]*itemprop=["']review["'][\s\S]*?<\/article>/gi;
    const matches = html.match(reviewRegex) ?? [];
    for (let i = 0; i < Math.min(matches.length, maxItems); i++) {
      const block = matches[i];
      const name = block.match(/itemprop=["']author["'][^>]*>([\s\S]*?)</i)?.[1]?.trim() ?? "G2 Reviewer";
      const titleM = block.match(/itemprop=["']name["'][^>]*>([\s\S]*?)</i)?.[1]?.trim() ?? "G2 review";
      const bodyRaw = block.match(/itemprop=["']reviewBody["'][^>]*>([\s\S]*?)</i)?.[1] ?? "";
      const body = bodyRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const dateM = block.match(/itemprop=["']datePublished["'][^>]*content=["']([^"']+)["']/i)?.[1];
      signals.push({
        id: `g2_${slug}_html_${i}`,
        title: titleM,
        body: body || titleM,
        author: name,
        url,
        channel: "G2",
        score: 0,
        commentCount: 0,
        createdAt: dateM ? new Date(dateM) : new Date(),
        tags: [slug, "review"],
        competitorName: slug,
      });
    }
    return signals;
  } catch {
    return [];
  }
}

async function findG2Slug(name: string): Promise<string | null> {
  const guess = slugify(name);
  // Quick check
  try {
    const res = await fetch(`https://www.g2.com/products/${guess}/reviews`, {
      method: "HEAD",
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return guess;
  } catch {
    // ignore
  }
  // DDG lookup
  try {
    const results = await searchDDG(`site:g2.com/products/ ${name}`, 5);
    for (const r of results) {
      const m = r.url.match(/g2\.com\/products\/([^/]+)/);
      if (m) return m[1];
    }
  } catch {
    // ignore
  }
  return null;
}

export async function scrapeG2(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 20;

  const targets = [...(config.competitors ?? []), ...(config.keywords ?? [])].slice(0, 6);
  if (!targets.length) return [];

  const perTarget = Math.max(3, Math.ceil(maxResults / targets.length));

  const tasks = targets.map(async (target) => {
    const slug = await findG2Slug(target);
    if (!slug) return [] as RawSignal[];
    let out = await fetchG2ReviewsBySlug(slug, perTarget);
    if (out.length === 0) out = await fetchG2ProductPage(slug, perTarget);
    return out;
  });

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const s of r.value) {
      if (seen.has(s.id) || signals.length >= maxResults) continue;
      seen.add(s.id);
      signals.push(s);
    }
  }

  // Capterra DDG fallback
  if (signals.length < maxResults) {
    const capFetches = targets.map((target) =>
      searchDDG(`site:capterra.com/reviews "${target}"`, 6)
        .then((results2) => {
          for (const r of results2) {
            if (seen.has(r.url) || signals.length >= maxResults) continue;
            if (!r.snippet || r.snippet.length < 30) continue;
            seen.add(r.url);
            signals.push({
              id: `cap_${Buffer.from(r.url).toString("base64url").slice(0, 24)}`,
              title: r.title,
              body: r.snippet,
              author: "Capterra Reviewer",
              url: r.url,
              channel: "G2",
              score: 0,
              commentCount: 0,
              createdAt: new Date(),
              tags: [target, "review", "capterra"],
            });
          }
        })
        .catch(() => {}),
    );
    await Promise.allSettled(capFetches);
  }

  return signals;
}
