import type { RawSignal } from "./types";
import { searchDDG } from "./duckduckgo";

export interface CompetitorTarget {
  name: string;
  domain?: string;
  linkedinSlug?: string;
  twitterHandle?: string;
  youtubeChannelId?: string;
  g2Slug?: string;
}

export interface CompetitorSignal {
  competitorName: string;
  competitorDomain: string | undefined;
  channel: string;
  url: string;
  title: string;
  body: string;
  publishedAt: Date | null;
  engagementScore: number;
  updateType: string;
  leadMagnetType: string | null;
}

export function detectLeadMagnet(text: string): {
  isLeadMagnet: boolean;
  leadMagnetType: string | null;
} {
  const lower = text.toLowerCase();

  const patterns: { type: string; phrases: string[] }[] = [
    {
      type: "EBOOK",
      phrases: ["free ebook", "download ebook", "free book", "get the guide", "free guide", "download our guide"],
    },
    {
      type: "WEBINAR",
      phrases: ["free webinar", "join our webinar", "register for webinar", "upcoming webinar", "live webinar"],
    },
    {
      type: "TEMPLATE",
      phrases: ["free template", "download template", "free toolkit", "get the template"],
    },
    {
      type: "FREE_TRIAL",
      phrases: ["free trial", "try for free", "start for free", "14-day free", "30-day free"],
    },
    {
      type: "CHECKLIST",
      phrases: ["free checklist", "download checklist", "get the checklist"],
    },
    {
      type: "GUIDE",
      phrases: ["free guide", "step-by-step guide", "ultimate guide", "complete guide"],
    },
    {
      type: "DEMO",
      phrases: ["book a demo", "request a demo", "schedule a demo", "get a demo", "watch a demo"],
    },
  ];

  for (const { type, phrases } of patterns) {
    if (phrases.some((p) => lower.includes(p))) {
      return { isLeadMagnet: true, leadMagnetType: type };
    }
  }

  return { isLeadMagnet: false, leadMagnetType: null };
}

export function detectUpdateType(
  text: string,
): "LEAD_MAGNET" | "PRODUCT_UPDATE" | "FEATURE_LAUNCH" | "ANNOUNCEMENT" | "SOCIAL_POST" {
  const { isLeadMagnet } = detectLeadMagnet(text);
  if (isLeadMagnet) return "LEAD_MAGNET";

  const lower = text.toLowerCase();

  const productUpdatePhrases = [
    "product update",
    "release notes",
    "changelog",
    "what's new",
    "new in",
    "v2",
    "version 2",
    "2.0",
  ];
  if (productUpdatePhrases.some((p) => lower.includes(p))) return "PRODUCT_UPDATE";

  const featureLaunchPhrases = [
    "new feature",
    "just launched",
    "introducing",
    "announcing",
    "now available",
    "rolling out",
    "we shipped",
  ];
  if (featureLaunchPhrases.some((p) => lower.includes(p))) return "FEATURE_LAUNCH";

  const announcementPhrases = [
    "excited to announce",
    "proud to announce",
    "big news",
    "major update",
    "press release",
  ];
  if (announcementPhrases.some((p) => lower.includes(p))) return "ANNOUNCEMENT";

  return "SOCIAL_POST";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function signalToCompetitorSignal(
  s: RawSignal,
  target: CompetitorTarget,
  channel: string,
): CompetitorSignal {
  const combined = `${s.title} ${s.body}`;
  const { leadMagnetType } = detectLeadMagnet(combined);
  const updateType = detectUpdateType(combined);
  return {
    competitorName: target.name,
    competitorDomain: target.domain,
    channel,
    url: s.url,
    title: s.title,
    body: s.body,
    publishedAt: s.createdAt instanceof Date ? s.createdAt : null,
    engagementScore: (s.score ?? 0) + (s.commentCount ?? 0),
    updateType,
    leadMagnetType,
  };
}

// Rate-limit queue: max 5 competitors in parallel
let activeCount = 0;
const queue: (() => void)[] = [];
const MAX_PARALLEL = 5;

function acquireSlot(): Promise<void> {
  return new Promise((resolve) => {
    if (activeCount < MAX_PARALLEL) {
      activeCount++;
      resolve();
    } else {
      queue.push(() => {
        activeCount++;
        resolve();
      });
    }
  });
}

function releaseSlot(): void {
  activeCount--;
  const next = queue.shift();
  if (next) next();
}

export async function scrapeCompetitor(
  target: CompetitorTarget,
): Promise<CompetitorSignal[]> {
  await acquireSlot();
  try {
    const { scrapeCompetitorBlog } = await import("./changelog");
    const { scrapeLinkedInCompany } = await import("./linkedin");
    const { scrapeTwitter, scrapeTwitterProfile } = await import("./twitter");
    const { scrapeYouTube, scrapeYouTubeChannel } = await import("./youtube");
    const { scrapeProductHunt } = await import("./producthunt");
    const { scrapeG2 } = await import("./g2");

    const linkedinSlug = target.linkedinSlug ?? slugify(target.name);

    const { scrapeGitHubCompetitorReleases, scrapeGitHubIssues } = await import("./github");

    const tasks: Promise<{ signals: RawSignal[]; channel: string }>[] = [
      target.domain
        ? scrapeCompetitorBlog(target.domain, target.name).then((signals) => ({
            signals,
            channel: "CHANGELOG",
          }))
        : Promise.resolve({ signals: [], channel: "CHANGELOG" }),
      scrapeProductHunt({ competitors: [target.name], maxResults: 10 }).then((signals) => ({
        signals,
        channel: "PRODUCT_HUNT",
      })),
      scrapeLinkedInCompany(linkedinSlug, { maxResults: 15 }).then((signals) => ({
        signals,
        channel: "LINKEDIN",
      })),
      (target.twitterHandle
        ? scrapeTwitterProfile(target.twitterHandle, 15)
        : scrapeTwitter({ competitors: [target.name], maxResults: 15 })
      ).then((signals) => ({ signals, channel: "TWITTER" })),
      (target.youtubeChannelId
        ? scrapeYouTubeChannel(target.youtubeChannelId, { maxResults: 10 })
        : scrapeYouTube({ competitors: [target.name], maxResults: 10 })
      ).then((signals) => ({ signals, channel: "YOUTUBE" })),
      scrapeG2({ competitors: [target.g2Slug ?? target.name], maxResults: 10 }).then((signals) => ({
        signals,
        channel: "G2",
      })),
      // GitHub: releases + issues/discussions for this competitor
      scrapeGitHubCompetitorReleases(target.name, 15).then((signals) => ({
        signals,
        channel: "GITHUB_ISSUES",
      })),
      scrapeGitHubIssues({ competitors: [target.name], maxResults: 20 }).then((signals) => ({
        signals,
        channel: "GITHUB_ISSUES",
      })),
    ];

    // Also try PH via DDG
    const phDdg: Promise<{ signals: RawSignal[]; channel: string }> = searchDDG(
      `site:producthunt.com "${target.name}"`,
      5,
    )
      .then((results) => ({
        signals: results.map((r) => ({
          id: `ph_${Buffer.from(r.url).toString("base64url").slice(0, 24)}`,
          title: r.title,
          body: r.snippet,
          author: target.name,
          url: r.url,
          channel: "PRODUCT_HUNT",
          score: 0,
          commentCount: 0,
          createdAt: new Date(),
          tags: [target.name],
          competitorName: target.name,
        })),
        channel: "PRODUCT_HUNT",
      }))
      .catch(() => ({ signals: [] as RawSignal[], channel: "PRODUCT_HUNT" }));
    tasks.push(phDdg);

    const results = await Promise.allSettled(tasks);
    const signals: CompetitorSignal[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (r.status !== "fulfilled") continue;
      for (const s of r.value.signals) {
        if (seen.has(s.url)) continue;
        seen.add(s.url);
        signals.push(signalToCompetitorSignal(s, target, r.value.channel));
      }
    }
    return signals;
  } finally {
    releaseSlot();
  }
}
