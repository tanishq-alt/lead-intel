import type { RawSignal, ScrapeConfig } from "./types";

interface RemoteOKJob {
  id: string;
  position: string;
  company: string;
  company_logo?: string;
  url: string;
  date: string;
  description: string;
  tags: string[];
  salary_min?: number;
  salary_max?: number;
  location?: string;
}

interface HNHit {
  objectID: string;
  author: string;
  comment_text?: string;
  story_title?: string;
  created_at: string;
  story_id?: number;
}

function buildJobQueries(keywords: string[], competitors: string[]): string[] {
  const tags: string[] = [];
  for (const kw of keywords) {
    tags.push(kw.toLowerCase().replace(/\s+/g, "-"));
  }
  for (const comp of competitors) {
    tags.push(comp.toLowerCase().replace(/\s+/g, "-"));
  }
  return [...new Set(tags)].slice(0, 5);
}

async function scrapeRemoteOK(tags: string[], maxResults: number): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();

  for (const tag of tags) {
    if (signals.length >= maxResults) break;
    try {
      const url = `https://remoteok.com/api?tag=${encodeURIComponent(tag)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "LeadIntel/1.0",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data: (RemoteOKJob | { legal?: string })[] = await res.json();

      for (const item of data) {
        if (!("id" in item) || !item.id) continue;
        const job = item as RemoteOKJob;
        if (seen.has(job.id) || signals.length >= maxResults) continue;
        seen.add(job.id);

        signals.push({
          id: `remoteok_${job.id}`,
          title: `[JOB] ${job.position} at ${job.company}`,
          body: `${job.description ?? job.position}\n\nTags: ${job.tags?.join(", ") ?? ""}${job.salary_min ? `\nSalary: $${job.salary_min}–$${job.salary_max}` : ""}`,
          author: job.company,
          url: job.url,
          channel: "JOBS",
          score: 0,
          commentCount: 0,
          createdAt: new Date(job.date),
          tags: job.tags ?? [],
        });
      }
    } catch {
      // skip
    }
  }
  return signals;
}

async function scrapeHNJobs(keywords: string[], maxResults: number): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();

  // HN "Who is hiring" monthly thread - search for relevant jobs
  for (const kw of keywords.slice(0, 3)) {
    if (signals.length >= maxResults) break;
    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(kw)}&tags=comment,story_33818048&hitsPerPage=20`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data: { hits: HNHit[] } = await res.json();

      for (const hit of data.hits) {
        if (seen.has(hit.objectID) || signals.length >= maxResults) continue;
        const body = hit.comment_text ?? "";
        if (!body || body.length < 30) continue;
        seen.add(hit.objectID);

        signals.push({
          id: `hnjob_${hit.objectID}`,
          title: `[HN Jobs] ${kw} — ${hit.author}`,
          body: body.replace(/<[^>]+>/g, " ").trim(),
          author: hit.author,
          url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          channel: "JOBS",
          score: 0,
          commentCount: 0,
          createdAt: new Date(hit.created_at),
        });
      }
    } catch {
      // skip
    }
  }
  return signals;
}

// Indeed RSS scrape — returns job listings related to keywords
async function scrapeIndeedRSS(keywords: string[], maxResults: number): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();

  for (const kw of keywords.slice(0, 3)) {
    if (signals.length >= maxResults) break;
    try {
      const q = encodeURIComponent(kw);
      const url = `https://www.indeed.com/rss?q=${q}&sort=date&limit=20`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; LeadIntel/1.0)",
          "Accept": "application/rss+xml, application/xml",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const xml = await res.text();

      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
      for (const item of items) {
        const titleMatch = item.match(/<title><!\[CDATA\[([^\]]+)\]\]><\/title>/);
        const linkMatch = item.match(/<link>([^<]+)<\/link>/);
        const descMatch = item.match(/<description><!\[CDATA\[([^\]]+)\]\]><\/description>/);
        const pubMatch = item.match(/<pubDate>([^<]+)<\/pubDate>/);

        const title = titleMatch?.[1]?.trim();
        const link = linkMatch?.[1]?.trim();
        if (!title || !link) continue;
        if (seen.has(link) || signals.length >= maxResults) continue;
        seen.add(link);

        const desc = descMatch?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? "";
        const company = desc.match(/^([^-–]+)[-–]/)?.[1]?.trim() ?? "Unknown Company";

        signals.push({
          id: `indeed_${Buffer.from(link).toString("base64").slice(0, 24)}`,
          title: `[Job] ${title}`,
          body: desc || title,
          author: company,
          url: link,
          channel: "JOBS",
          score: 0,
          commentCount: 0,
          createdAt: pubMatch?.[1] ? new Date(pubMatch[1]) : new Date(),
        });
      }
    } catch {
      // skip — Indeed often blocks
    }
  }
  return signals;
}

export async function scrapeJobs(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const maxResults = config.maxResults ?? 40;
  const keywords = config.keywords ?? [];
  const competitors = config.competitors ?? [];

  if (!keywords.length && !competitors.length) return [];

  const tags = buildJobQueries(keywords, competitors);
  const allKeywords = [...keywords, ...competitors];

  const [remoteOkJobs, hnJobs, indeedJobs] = await Promise.allSettled([
    scrapeRemoteOK(tags, Math.ceil(maxResults / 2)),
    scrapeHNJobs(allKeywords, Math.ceil(maxResults / 3)),
    scrapeIndeedRSS(allKeywords, Math.ceil(maxResults / 3)),
  ]);

  const seen = new Set<string>();
  const combined: RawSignal[] = [];

  for (const result of [remoteOkJobs, hnJobs, indeedJobs]) {
    if (result.status === "fulfilled") {
      for (const s of result.value) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          combined.push(s);
        }
      }
    }
  }

  return combined.slice(0, maxResults);
}
