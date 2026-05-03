import type { RawSignal, ScrapeConfig } from "./types";
import { buildQueriesFromNiche } from "./queries";

interface PHPost {
  id: string;
  name: string;
  tagline: string;
  description?: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  topics?: { name: string }[];
  user?: { username: string; profileUrl?: string };
}

interface PHSearchResult {
  posts: { edges: { node: PHPost }[] };
}

// Product Hunt has an unofficial search endpoint used by their web app
async function fetchPHSearch(query: string): Promise<PHPost[]> {
  try {
    // PH GraphQL API — the `api_key` below is PH's own public client key embedded in their web app
    const body = JSON.stringify({
      operationName: "SearchPostsQuery",
      variables: { query, first: 10, order: "NEWEST" },
      query: `query SearchPostsQuery($query: String!, $first: Int, $order: PostsOrder) {
        posts(query: $query, first: $first, order: $order) {
          edges {
            node {
              id name tagline description url votesCount commentsCount createdAt
              topics(first: 3) { edges { node { name } } }
              user { username profileUrl }
            }
          }
        }
      }`,
    });

    const res = await fetch("https://www.producthunt.com/frontend/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; LeadIntel/1.0)",
        "Origin": "https://www.producthunt.com",
        "Referer": "https://www.producthunt.com/",
      },
      body,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.posts?.edges ?? []).map((e: { node: PHPost }) => ({
      ...e.node,
      topics: (e.node as { topics?: { edges?: { node: { name: string } }[] } }).topics?.edges?.map((te: { node: { name: string } }) => ({ name: te.node.name })) ?? [],
    }));
  } catch {
    return [];
  }
}

export async function scrapeProductHunt(config: ScrapeConfig = {}): Promise<RawSignal[]> {
  const signals: RawSignal[] = [];
  const seen = new Set<string>();
  const maxResults = config.maxResults ?? 30;

  const queries =
    config.keywords?.length || config.competitors?.length
      ? buildQueriesFromNiche(config.keywords ?? [], config.competitors ?? [], 4)
      : ["alternative", "productivity tool", "SaaS", "developer tool"];

  for (const q of queries.slice(0, 4)) {
    if (signals.length >= maxResults) break;
    const posts = await fetchPHSearch(q);

    for (const post of posts) {
      if (seen.has(post.id) || signals.length >= maxResults) continue;
      seen.add(post.id);

      signals.push({
        id: `ph_${post.id}`,
        title: `${post.name} — ${post.tagline}`,
        body: post.description ?? post.tagline,
        author: post.user?.username ?? "producthunt",
        authorUrl: post.user?.profileUrl ?? "https://producthunt.com",
        url: post.url,
        channel: "PRODUCT_HUNT",
        score: post.votesCount,
        commentCount: post.commentsCount,
        createdAt: new Date(post.createdAt),
        tags: post.topics?.map((t) => t.name) ?? [],
      });
    }
  }

  return signals;
}
