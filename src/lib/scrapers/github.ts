import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche, buildCompetitorMonitorQueries, FALLBACK_QUERIES } from "./queries";

// GitHub REST API v3 + GraphQL — uses token when available (5000 req/hr vs 60 unauthed)
// With token: search issues/PRs/code/commits/releases/discussions — all endpoints
// Without token: same endpoints, 60 req/hr shared across all scrapers

interface GHHeaders extends Record<string, string> {
  Accept: string;
  "User-Agent": string;
}

function makeHeaders(): GHHeaders {
  const token = process.env.GITHUB_TOKEN;
  const h: GHHeaders = {
    Accept: "application/vnd.github+json",
    "User-Agent": "LeadIntel/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ── Shared fetch with rate-limit awareness ──────────────────────────────────

async function ghFetch(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: makeHeaders(),
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 403 || res.status === 429) return null; // rate limited
    if (!res.ok) return null;
    return res;
  } catch {
    return null;
  }
}

// ── Issues + Pull Requests ──────────────────────────────────────────────────

interface GHIssue {
  id: number;
  title: string;
  body: string | null;
  user: { login: string; html_url: string };
  html_url: string;
  created_at: string;
  labels: { name: string }[];
  comments: number;
  pull_request?: object;
  reactions?: { total_count: number };
}

async function searchIssues(query: string, perPage = 15): Promise<GHIssue[]> {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${perPage}`;
  const res = await ghFetch(url);
  if (!res) return [];
  const data = await res.json().catch(() => ({ items: [] }));
  return data.items ?? [];
}

// ── Releases ───────────────────────────────────────────────────────────────

interface GHRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  author: { login: string; html_url: string };
  published_at: string;
  prerelease: boolean;
  draft: boolean;
}

async function fetchRepoReleases(owner: string, repo: string, perPage = 10): Promise<GHRelease[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=${perPage}`;
  const res = await ghFetch(url);
  if (!res) return [];
  return res.json().catch(() => []);
}

async function searchReleases(query: string): Promise<RawSignal[]> {
  // GitHub doesn't have a /search/releases endpoint — search repos matching the query
  // then fetch releases from top results
  const repoUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=8`;
  const res = await ghFetch(repoUrl);
  if (!res) return [];
  const data = await res.json().catch(() => ({ items: [] }));
  const repos: { full_name: string; html_url: string }[] = data.items ?? [];

  const signals: RawSignal[] = [];
  await Promise.allSettled(
    repos.slice(0, 5).map(async (repo) => {
      const [owner, name] = repo.full_name.split("/");
      const releases = await fetchRepoReleases(owner, name, 3);
      for (const r of releases) {
        if (r.draft || r.prerelease) continue;
        if (!r.body || r.body.length < 20) continue;
        signals.push({
          id: `ghr_${r.id}`,
          title: `[${repo.full_name}] ${r.name ?? r.tag_name}`,
          body: r.body.slice(0, 1000),
          author: r.author.login,
          authorUrl: r.author.html_url,
          url: r.html_url,
          channel: "GITHUB_ISSUES",
          score: 0,
          commentCount: 0,
          createdAt: new Date(r.published_at),
          tags: ["release", r.tag_name],
        });
      }
    })
  );
  return signals;
}

// ── Discussions ────────────────────────────────────────────────────────────

interface GHDiscussion {
  id: string;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  author: { login: string; url: string } | null;
  upvoteCount: number;
  comments: { totalCount: number };
  repository: { nameWithOwner: string };
}

async function searchDiscussions(query: string): Promise<GHDiscussion[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return []; // GraphQL requires auth

  const gql = `
    query($q: String!) {
      search(query: $q, type: DISCUSSION, first: 15) {
        nodes {
          ... on Discussion {
            id title body url createdAt upvoteCount
            author { login url }
            comments { totalCount }
            repository { nameWithOwner }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        ...makeHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: gql, variables: { q: query } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.search?.nodes ?? []).filter(Boolean) as GHDiscussion[];
  } catch {
    return [];
  }
}

// ── Competitor repo releases (for competitor tracking) ─────────────────────

export async function scrapeGitHubCompetitorReleases(
  competitorName: string,
  maxResults = 20
): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();

  // Search for org/repos matching this competitor
  const query = `org:${competitorName.toLowerCase().replace(/\s+/g, "-")} OR user:${competitorName.toLowerCase().replace(/\s+/g, "-")}`;
  const repoUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(competitorName)}&sort=stars&per_page=5`;
  const res = await ghFetch(repoUrl);
  if (!res) return [];

  const data = await res.json().catch(() => ({ items: [] }));
  const repos: { full_name: string }[] = data.items ?? [];

  await Promise.allSettled(
    repos.slice(0, 4).map(async (repo) => {
      const [owner, name] = repo.full_name.split("/");
      const releases = await fetchRepoReleases(owner, name, 5);
      for (const r of releases) {
        if (r.draft || seen.has(String(r.id)) || signals.length >= maxResults) continue;
        seen.add(String(r.id));
        signals.push({
          id: `ghr_${r.id}`,
          title: `${competitorName} released ${r.name ?? r.tag_name}`,
          body: (r.body ?? r.tag_name).slice(0, 1000),
          author: r.author.login,
          authorUrl: r.author.html_url,
          url: r.html_url,
          channel: "GITHUB_ISSUES",
          score: 0,
          commentCount: 0,
          createdAt: new Date(r.published_at),
          tags: ["release", "product-update", competitorName],
          competitorName,
        });
      }
    })
  );

  return signals;
}

// ── Main scraper ───────────────────────────────────────────────────────────

export async function scrapeGitHubIssues(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 80;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 8)
      : FALLBACK_QUERIES.slice(0, 5);

  // Also build competitor monitor queries to catch feature launches + product updates
  const monitorQueries = (config.competitors ?? [])
    .flatMap((c) => buildCompetitorMonitorQueries(c).slice(0, 3))
    .slice(0, 10);

  const allQueries = [...new Set([...queries, ...monitorQueries])];

  const tasks: Promise<void>[] = [];

  // 1. Issues + PRs across all query types
  for (const q of allQueries.slice(0, 10)) {
    tasks.push(
      searchIssues(`${q} type:issue`, 15).then((items) => {
        for (const issue of items) {
          if (seen.has(String(issue.id)) || signals.length >= maxResults) return;
          if (!issue.body || issue.body.length < 20) continue;
          seen.add(String(issue.id));
          signals.push({
            id: `gh_${issue.id}`,
            title: issue.title,
            body: issue.body.slice(0, 800),
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
      })
    );

    // PRs can surface competitive migration work
    tasks.push(
      searchIssues(`${q} type:pr`, 10).then((items) => {
        for (const pr of items) {
          if (seen.has(`pr_${pr.id}`) || signals.length >= maxResults) return;
          if (!pr.body || pr.body.length < 30) continue;
          seen.add(`pr_${pr.id}`);
          signals.push({
            id: `ghpr_${pr.id}`,
            title: pr.title,
            body: pr.body.slice(0, 800),
            author: pr.user.login,
            authorUrl: pr.user.html_url,
            url: pr.html_url,
            channel: "GITHUB_ISSUES",
            score: pr.reactions?.total_count ?? 0,
            commentCount: pr.comments,
            createdAt: new Date(pr.created_at),
            tags: [...pr.labels.map((l) => l.name), "pull-request"],
          });
        }
      })
    );
  }

  // 2. Releases from repos matching the queries
  for (const q of queries.slice(0, 5)) {
    tasks.push(
      searchReleases(q).then((items) => {
        for (const s of items) {
          if (!seen.has(s.id)) { seen.add(s.id); signals.push(s); }
        }
      })
    );
  }

  // 3. Discussions (requires token — no-ops gracefully without one)
  for (const q of allQueries.slice(0, 5)) {
    tasks.push(
      searchDiscussions(q).then((items) => {
        for (const d of items) {
          if (seen.has(d.id) || signals.length >= maxResults) return;
          if (!d.body || d.body.length < 20) continue;
          seen.add(d.id);
          signals.push({
            id: `ghd_${d.id}`,
            title: `[${d.repository.nameWithOwner}] ${d.title}`,
            body: d.body.slice(0, 800),
            author: d.author?.login ?? "github-user",
            authorUrl: d.author?.url ?? "https://github.com",
            url: d.url,
            channel: "GITHUB_ISSUES",
            score: d.upvoteCount,
            commentCount: d.comments.totalCount,
            createdAt: new Date(d.createdAt),
            tags: ["discussion"],
          });
        }
      })
    );
  }

  // 4. Competitor-specific release tracking
  for (const competitor of (config.competitors ?? []).slice(0, 5)) {
    tasks.push(
      scrapeGitHubCompetitorReleases(competitor, 10).then((items) => {
        for (const s of items) {
          if (!seen.has(s.id)) { seen.add(s.id); signals.push(s); }
        }
      })
    );
  }

  await Promise.allSettled(tasks);

  signals.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return signals.slice(0, maxResults);
}
