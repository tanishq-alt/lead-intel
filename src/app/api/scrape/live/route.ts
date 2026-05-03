import { NextRequest } from "next/server";
import { z } from "zod";
import { runScrapers } from "@/lib/scrapers/index";
import { signalToLead } from "@/lib/intent";
import type { ScraperChannel } from "@/lib/scrapers/types";

export const maxDuration = 60;

const VALID_CHANNELS: ScraperChannel[] = [
  "REDDIT", "HACKER_NEWS", "GITHUB_ISSUES", "STACKOVERFLOW",
  "YOUTUBE", "TWITTER", "JOBS", "DEV_TO", "PRODUCT_HUNT", "ALL",
];

const Schema = z.object({
  channels: z.array(z.enum(VALID_CHANNELS as [ScraperChannel, ...ScraperChannel[]])).optional().default(["ALL"]),
  keywords: z.array(z.string().max(80)).max(20).optional().default([]),
  competitors: z.array(z.string().max(80)).max(20).optional().default([]),
  minScore: z.coerce.number().int().min(0).max(10).optional().default(0),
  limit: z.coerce.number().int().min(1).max(250).optional().default(120),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const { channels, keywords, competitors, minScore, limit } = parsed.data;

    if (!keywords.length && !competitors.length) {
      return Response.json(
        { error: "Provide at least one keyword or competitor to search for targeted results." },
        { status: 400 }
      );
    }

    const signals = await runScrapers({
      channels,
      keywords,
      competitors,
      maxResults: limit,
    });

    const leads = signals
      .map((signal) => {
        const lead = signalToLead(signal, "live");
        return {
          id: signal.id,
          platform: signal.channel,
          platformUrl: signal.url,
          subreddit: signal.subreddit ?? null,
          postedAt: signal.createdAt,
          author: signal.author,
          authorUrl: signal.authorUrl ?? null,
          name: lead.name,
          designation: lead.designation,
          company: lead.company,
          industry: lead.industry,
          techStack: lead.techStackDetected,
          intentScore: lead.intentScore,
          confidenceScore: lead.confidenceScore,
          intentSignals: lead.intentSignal,
          painPoint: lead.painPoint,
          competitorMentioned: lead.competitorMentioned,
          keywords: lead.keywordsMatched,
          outreachAngle: lead.recommendedOutreachAngle,
          title: signal.title,
          bodyPreview: signal.body.slice(0, 300),
          fullBody: signal.body,
          score: signal.score ?? 0,
          comments: signal.commentCount ?? 0,
          tags: signal.tags ?? [],
        };
      })
      .filter((l) => l.intentScore >= minScore)
      .sort((a, b) => b.intentScore - a.intentScore);

    return Response.json({
      leads,
      meta: {
        total: leads.length,
        rawSignals: signals.length,
        channels: [...new Set(signals.map((s) => s.channel))],
        scrapedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/scrape/live]", error);
    return Response.json({ error: "Scrape failed", detail: String(error) }, { status: 500 });
  }
}
