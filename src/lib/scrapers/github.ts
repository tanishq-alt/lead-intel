import type { RawSignal, ScrapeConfig } from "./types";

interface GHIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  user: { login: string; html_url: string };
  html_url: string;
  created_at: string;
  labels: { name: string }[];
  comments: number;
  reactions?: { total_count: number };
}

interface GHSearchResponse {
  items: GHIssue[];
}

const GITHUB_QUERIES = [
  "alternative to",
  "switch from",
  "migrate from",
  "better alternative",
  "replace with",
  "comparison",
  "benchmark vs",
  "pricing too expensive",
  "feature request alternative",
];

export async function scrapeGitHubIssues(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 40;
  const token = process.env.GITHUB_TOKEN;

  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "LeadIntel/1.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const queries = config.keywords?.length
    ? config.keywords
    : GITHUB_QUERIES;

  if (config.competitors?.length) {
    for (const c of config.competitors.slice(0, 3)) {
      queries.push(`migrate from ${c}`);
    }
  }

  const fetches = queries.slice(0, 5).map(async (q) => {
    try {
      const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}+type:issue+state:open&sort=updated&per_page=10`;
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (!res.ok) return;
      const data: GHSearchResponse = await res.json();

      for (const issue of data.items) {
        const key = String(issue.id);
        if (seen.has(key) || signals.length >= maxResults) continue;
        if (!issue.body || issue.body.length < 20) continue;
        seen.add(key);
        signals.push({
          id: `gh_${issue.id}`,
          title: issue.title,
          body: issue.body,
          author: issue.user.login,
          authorUrl: issue.user.html_url,
          url: issue.html_url,
          channel: "GITHUB_ISSUES",
          score: issue.reactions?.total_count ?? 0,
          commentCount: issue.comments,
          createdAt: new Date(issue.created_at),
          tags: issue.labels.map(l => l.name),
        });
      }
    } catch {
      // skip
    }
  });

  await Promise.allSettled(fetches);
  return signals;
}
