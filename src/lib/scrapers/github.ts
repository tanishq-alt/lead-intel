import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, FALLBACK_QUERIES } from "./queries";

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

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 5)
      : FALLBACK_QUERIES.slice(0, 4);

  const fetches = queries.map(async (q) => {
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
          tags: issue.labels.map((l) => l.name),
        });
      }
    } catch {
      // skip
    }
  });

  await Promise.allSettled(fetches);
  return signals;
}
