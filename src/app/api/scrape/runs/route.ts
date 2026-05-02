import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@/generated/prisma";
import { rufloSwarm, rufloAgentSpawn } from "@/lib/ruflo";
import { runScrapers } from "@/lib/scrapers/index";
import { signalToLead } from "@/lib/intent";

const QuerySchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const result = QuerySchema.safeParse({
      projectId: searchParams.get("projectId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, page, limit } = result.data;
    const skip = (page - 1) * limit;

    const [runs, total] = await Promise.all([
      prisma.scrapRun.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { _count: { select: { leads: true } } },
      }),
      prisma.scrapRun.count({ where: { projectId } }),
    ]);

    return Response.json({
      runs: runs.map((run) => ({
        ...run,
        leadCount: run._count.leads,
        _count: undefined,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/scrape/runs]", error);
    return Response.json({ error: "Failed to fetch scrape runs" }, { status: 500 });
  }
}

// Convenience POST: no body needed — uses first project + enabled channels
export async function POST(request: NextRequest) {
  try {
    let projectId: string | undefined;
    let extraKeywords: string[] | undefined;
    let extraCompetitors: string[] | undefined;

    try {
      const body = await request.json();
      projectId = body.projectId;
      extraKeywords = body.keywords;
      extraCompetitors = body.competitors;
    } catch {
      // Body is optional
    }

    // Auto-resolve project
    if (!projectId) {
      const project = await prisma.project.findFirst({ orderBy: { createdAt: "asc" } });
      if (!project) {
        return Response.json({ error: "No project found. Create a project first." }, { status: 404 });
      }
      projectId = project.id;
    }

    const channels = await prisma.channel.findMany({
      where: { projectId, isEnabled: true },
    });

    const channelList = channels.length > 0 ? channels : [];
    const channelNames = channelList.map((c) => c.name);

    const scrapRun = await prisma.scrapRun.create({
      data: {
        projectId,
        status: "RUNNING",
        channelsUsed: channelNames.length > 0 ? channelNames : ["REDDIT", "HACKER_NEWS"],
        leadsFound: 0,
      },
    });

    const swarm = await rufloSwarm({ projectId, runId: scrapRun.id, channels: channelNames });

    await Promise.allSettled(
      channelList.map((ch) =>
        rufloAgentSpawn({ swarmId: swarm.swarmId, channel: ch.name, runId: scrapRun.id, projectId: projectId! })
      )
    );

    // Map to scraper channels
    const scraperChannels = channelList.flatMap((c) => {
      const n = c.name.toUpperCase();
      if (n.includes("REDDIT")) return ["REDDIT" as const];
      if (n.includes("HACKER") || n === "HACKER_NEWS") return ["HACKER_NEWS" as const];
      if (n.includes("GITHUB")) return ["GITHUB_ISSUES" as const];
      if (n.includes("STACK") || n === "STACKOVERFLOW") return ["STACKOVERFLOW" as const];
      return [];
    });

    const projectKeywords = extraKeywords ?? channelList
      .map((c) => c.nicheFilter)
      .filter((k): k is string => Boolean(k));

    const signals = await runScrapers({
      channels: scraperChannels.length > 0 ? scraperChannels : ["ALL"],
      keywords: projectKeywords.length > 0 ? projectKeywords : undefined,
      competitors: extraCompetitors ?? [],
      maxResults: 60,
    });

    const leadPayloads = signals.map((signal) => signalToLead(signal, projectId!));
    const qualifiedLeads = leadPayloads.filter((l) => l.intentScore >= 2);

    const existingUrls = new Set(
      (
        await prisma.lead.findMany({
          where: { projectId, sourceUrl: { in: qualifiedLeads.map((l) => l.sourceUrl) } },
          select: { sourceUrl: true },
        })
      ).map((l) => l.sourceUrl)
    );

    const newLeads = qualifiedLeads.filter((l) => !existingUrls.has(l.sourceUrl));

    const createdLeads = await Promise.all(
      newLeads.map((lead) =>
        prisma.lead.create({
          data: {
            name: lead.name,
            designation: lead.designation,
            company: lead.company,
            industry: lead.industry,
            location: lead.location,
            sourceChannel: lead.sourceChannel,
            sourceUrl: lead.sourceUrl,
            intentSignal: lead.intentSignal,
            intentScore: lead.intentScore,
            confidenceScore: lead.confidenceScore,
            painPoint: lead.painPoint,
            competitorMentioned: lead.competitorMentioned,
            recommendedOutreachAngle: lead.recommendedOutreachAngle,
            rawEvidence: lead.rawEvidence,
            techStackDetected: lead.techStackDetected,
            triggerEvent: lead.triggerEvent,
            keywordsMatched: lead.keywordsMatched,
            status: LeadStatus.NEW,
            projectId,
            scrapRunId: scrapRun.id,
            leadSources: {
              create: [{
                url: lead.sourceUrl,
                channel: lead.sourceChannel,
                snippet: (lead.rawEvidence ?? "").slice(0, 500),
                foundAt: new Date(),
              }],
            },
          },
        }).catch(() => null)
      )
    );

    const saved = createdLeads.filter(Boolean).length;

    const updatedRun = await prisma.scrapRun.update({
      where: { id: scrapRun.id },
      data: { status: "COMPLETED", leadsFound: saved, completedAt: new Date() },
    });

    return Response.json({
      runId: updatedRun.id,
      leadsCreated: saved,
      signalsScraped: signals.length,
      status: updatedRun.status,
      swarmId: swarm.swarmId,
    });
  } catch (error) {
    console.error("[POST /api/scrape/runs]", error);
    return Response.json({ error: "Failed to start scrape run" }, { status: 500 });
  }
}
