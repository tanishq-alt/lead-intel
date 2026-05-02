import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@/generated/prisma";
import { rufloSwarm, rufloAgentSpawn } from "@/lib/ruflo";
import { runScrapers } from "@/lib/scrapers/index";
import { signalToLead } from "@/lib/intent";

const ScrapeRunSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  channelIds: z.array(z.string()).min(1, "At least one channel must be selected"),
  keywords: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = ScrapeRunSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, channelIds, keywords, competitors } = result.data;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds }, projectId },
    });

    if (channels.length === 0) {
      return Response.json(
        { error: "No valid channels found for this project" },
        { status: 400 }
      );
    }

    const scrapRun = await prisma.scrapRun.create({
      data: {
        projectId,
        status: "RUNNING",
        channelsUsed: channels.map((c) => c.name),
        leadsFound: 0,
      },
    });

    // Initialise Ruflo swarm + agents (best-effort, non-blocking)
    const swarm = await rufloSwarm({
      projectId,
      runId: scrapRun.id,
      channels: channels.map((c) => c.name),
    });

    await Promise.allSettled(
      channels.map((channel) =>
        rufloAgentSpawn({
          swarmId: swarm.swarmId,
          channel: channel.name,
          runId: scrapRun.id,
          projectId,
        })
      )
    );

    // Map channel names to scraper channel keys
    const scraperChannels = channels.flatMap((c) => {
      const n = c.name.toUpperCase();
      if (n.includes("REDDIT")) return ["REDDIT" as const];
      if (n.includes("HACKER") || n === "HACKER_NEWS") return ["HACKER_NEWS" as const];
      if (n.includes("GITHUB")) return ["GITHUB_ISSUES" as const];
      if (n.includes("STACK") || n === "STACKOVERFLOW") return ["STACKOVERFLOW" as const];
      return [];
    });

    // Derive keywords from project niche filters if not provided
    const projectKeywords = keywords ?? channels
      .map((c) => c.nicheFilter)
      .filter((k): k is string => Boolean(k));

    // Run live scrapers
    const signals = await runScrapers({
      channels: scraperChannels.length > 0 ? scraperChannels : ["ALL"],
      keywords: projectKeywords.length > 0 ? projectKeywords : undefined,
      competitors: competitors ?? [],
      maxResults: 60,
    });

    if (signals.length === 0) {
      await prisma.scrapRun.update({
        where: { id: scrapRun.id },
        data: { status: "COMPLETED", leadsFound: 0, completedAt: new Date() },
      });
      return Response.json({
        runId: scrapRun.id,
        leadsCreated: 0,
        status: "COMPLETED",
        swarmId: swarm.swarmId,
        message: "No signals found matching current filters — try broadening keywords",
      });
    }

    // Convert raw signals to lead records via intent engine
    const leadPayloads = signals.map((signal) => signalToLead(signal, projectId));

    // Filter to meaningful signals only (intent score >= 2)
    const qualifiedLeads = leadPayloads.filter((l) => l.intentScore >= 2);

    // Deduplicate by sourceUrl against existing leads
    const existingUrls = new Set(
      (
        await prisma.lead.findMany({
          where: { projectId, sourceUrl: { in: qualifiedLeads.map((l) => l.sourceUrl) } },
          select: { sourceUrl: true },
        })
      ).map((l) => l.sourceUrl)
    );

    const newLeads = qualifiedLeads.filter((l) => !existingUrls.has(l.sourceUrl));

    // Persist new leads
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
              create: [
                {
                  url: lead.sourceUrl,
                  channel: lead.sourceChannel,
                  snippet: (lead.rawEvidence ?? "").slice(0, 500),
                  foundAt: new Date(),
                },
              ],
            },
          },
        }).catch(() => null)
      )
    );

    const saved = createdLeads.filter(Boolean);

    const updatedRun = await prisma.scrapRun.update({
      where: { id: scrapRun.id },
      data: {
        status: "COMPLETED",
        leadsFound: saved.length,
        completedAt: new Date(),
      },
    });

    return Response.json({
      runId: updatedRun.id,
      leadsCreated: saved.length,
      signalsScraped: signals.length,
      qualifiedSignals: qualifiedLeads.length,
      deduplicatedOut: qualifiedLeads.length - newLeads.length,
      status: updatedRun.status,
      swarmId: swarm.swarmId,
    });
  } catch (error) {
    console.error("[POST /api/scrape/run]", error);
    return Response.json(
      { error: "Failed to start scrape run" },
      { status: 500 }
    );
  }
}
