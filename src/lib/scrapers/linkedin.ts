import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche } from "./queries";
import { searchDDG } from "./duckduckgo";

function extractLinkedInAuthor(url: string, title: string): string {
  const profileMatch = url.match(/linkedin\.com\/in\/([^/?]+)/);
  if (profileMatch) return profileMatch[1].replace(/-/g, " ");
  const companyMatch = url.match(/linkedin\.com\/company\/([^/?]+)/);
  if (companyMatch) return companyMatch[1].replace(/-/g, " ") + " (company)";
  return title.split(" ").slice(0, 3).join(" ");
}

function extractLinkedInCompany(url: string): string | null {
  const m = url.match(/linkedin\.com\/company\/([^/?]+)/);
  return m ? m[1].replace(/-/g, " ") : null;
}

interface VoyagerFeedUpdate {
  updateMetadata?: { urn?: string };
  commentary?: { text?: { text?: string } };
  actor?: { name?: { text?: string }; subDescription?: { text?: string } };
  socialDetail?: { totalSocialActivityCounts?: { numLikes?: number; numComments?: number } };
}

interface VoyagerFeedResponse {
  elements?: VoyagerFeedUpdate[];
}

export async function scrapeLinkedInCompany(
  slug: string,
  config: ScrapeConfig = {},
): Promise<RawSignal[]> {
  const maxResults = config.maxResults ?? 20;
  const cookie = process.env.LINKEDIN_COOKIE;

  if (cookie) {
    try {
      const url = `https://www.linkedin.com/voyager/api/feed/updatesV2?companyUniversalName=${encodeURIComponent(
        slug,
      )}&count=20&moduleKey=ORGANIZATION_MEMBER_FEED_UPDATES`;
      const res = await fetch(url, {
        headers: {
          "csrf-token": "ajax:0",
          "x-restli-protocol-version": "2.0.0",
          "x-li-lang": "en_US",
          Cookie: `li_at=${cookie}; JSESSIONID="ajax:0"`,
          Accept: "application/vnd.linkedin.normalized+json+2.1",
          "User-Agent": "Mozilla/5.0 (compatible; LeadIntel/1.0)",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = (await res.json()) as VoyagerFeedResponse;
        const signals: RawSignal[] = [];
        for (const el of data.elements ?? []) {
          if (signals.length >= maxResults) break;
          const text = el.commentary?.text?.text ?? "";
          if (!text) continue;
          const urn = el.updateMetadata?.urn ?? "";
          const idPart = urn.split(":").pop() ?? Buffer.from(text.slice(0, 60)).toString("base64url");
          const authorName = el.actor?.name?.text ?? slug;
          signals.push({
            id: `li_${idPart}`,
            title: text.slice(0, 120),
            body: text,
            author: authorName,
            authorUrl: `https://www.linkedin.com/company/${slug}`,
            url: `https://www.linkedin.com/feed/update/${urn}`,
            channel: "LINKEDIN",
            score: el.socialDetail?.totalSocialActivityCounts?.numLikes ?? 0,
            commentCount: el.socialDetail?.totalSocialActivityCounts?.numComments ?? 0,
            createdAt: new Date(),
            tags: [slug],
            competitorName: slug,
          });
        }
        if (signals.length > 0) return signals;
      }
    } catch {
      // fall through
    }
  }

  // Fallback: SearXNG
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  try {
    const results = await searchDDG(`site:linkedin.com/company/${slug} posts`, 10);
    for (const r of results) {
      if (seen.has(r.url) || signals.length >= maxResults) continue;
      seen.add(r.url);
      signals.push({
        id: `li_${Buffer.from(r.url).toString("base64url").slice(0, 24)}`,
        title: r.title,
        body: r.snippet,
        author: slug,
        authorUrl: r.url,
        url: r.url,
        channel: "LINKEDIN",
        score: 0,
        commentCount: 0,
        createdAt: new Date(),
        tags: [slug],
        competitorName: slug,
      });
    }
  } catch {
    // ignore
  }
  return signals;
}

export async function scrapeLinkedIn(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;

  const intentQueries = buildQueriesFromNiche(
    config.keywords ?? [],
    config.competitors ?? [],
    6,
  );

  const searchTypes = [
    "site:linkedin.com/posts",
    "site:linkedin.com/pulse",
    "site:linkedin.com/in",
  ];

  const competitorQueries = (config.competitors ?? []).slice(0, 3).map(
    (c) =>
      `"${c}" switching alternative new feature announcement site:linkedin.com`,
  );

  const allQueries = [
    ...intentQueries.slice(0, 5).flatMap((q) => searchTypes.slice(0, 2).map((s) => `${s} "${q}"`)),
    ...competitorQueries,
  ];

  const fetches = allQueries.map((q) =>
    searchDDG(q, 8)
      .then((results) => {
        for (const r of results) {
          if (seen.has(r.url) || signals.length >= maxResults) continue;
          if (!r.snippet || r.snippet.length < 20) continue;
          seen.add(r.url);

          const author = extractLinkedInAuthor(r.url, r.title);
          const company = extractLinkedInCompany(r.url);

          signals.push({
            id: `li_${Buffer.from(r.url).toString("base64url").slice(0, 24)}`,
            title: r.title,
            body: r.snippet,
            author,
            authorUrl: r.url,
            url: r.url,
            channel: "LINKEDIN",
            score: 0,
            commentCount: 0,
            createdAt: new Date(),
            tags: company ? [company] : [],
          });
        }
      })
      .catch(() => {}),
  );

  await Promise.allSettled(fetches);
  return signals;
}
