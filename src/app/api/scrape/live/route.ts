import { NextRequest } from "next/server";
import { z } from "zod";
import { runScrapers } from "@/lib/scrapers/index";
import { signalToLead } from "@/lib/intent";

export const maxDuration = 60;

const Schema = z.object({
  channels: z.array(z.enum(["REDDIT", "HACKER_NEWS", "GITHUB_ISSUES", "STACKOVERFLOW", "ALL"])).optional().default(["ALL"]),
  keywords: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  minScore: z.coerce.number().int().min(0).max(10).optional().default(0),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
    }

    const { channels, keywords, competitors, minScore, limit } = parsed.data;

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
          // Source info
          platform: signal.channel,
          platformUrl: signal.url,
          subreddit: signal.subreddit ?? null,
          postedAt: signal.createdAt,
          // Author
          author: signal.author,
          authorUrl: signal.authorUrl ?? null,
          // Detected info
          name: lead.name,
          designation: lead.designation,
          company: lead.company,
          industry: lead.industry,
          techStack: lead.techStackDetected,
          // Intent
          intentScore: lead.intentScore,
          confidenceScore: lead.confidenceScore,
          intentSignals: lead.intentSignal,
          painPoint: lead.painPoint,
          competitorMentioned: lead.competitorMentioned,
          keywords: lead.keywordsMatched,
          outreachAngle: lead.recommendedOutreachAngle,
          // Raw
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
        channels: channels,
        scrapedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/scrape/live]", error);
    return Response.json({ error: "Scrape failed", detail: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const body: Record<string, unknown> = {};
  const ch = searchParams.get("channels");
  if (ch) body.channels = ch.split(",");
  const kw = searchParams.get("keywords");
  if (kw) body.keywords = kw.split(",");
  const minScore = searchParams.get("minScore");
  if (minScore) body.minScore = Number(minScore);

  const fakeReq = new Request(request.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(new NextRequest(fakeReq));
}
