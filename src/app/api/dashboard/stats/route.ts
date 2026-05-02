import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const StatsQuerySchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const result = StatsQuerySchema.safeParse({
      projectId: searchParams.get("projectId"),
    });

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId } = result.data;

    const [
      totalLeads,
      highIntentLeads,
      conversionReadyLeads,
      allLeadsForAvg,
      latestRuns,
      failedRunsCount,
      recentLeads,
      leadsByChannelRaw,
      leadsByIndustryRaw,
    ] = await Promise.all([
      // Total leads in project
      prisma.lead.count({ where: { projectId } }),

      // High intent leads (score >= 8)
      prisma.lead.count({
        where: { projectId, intentScore: { gte: 8 } },
      }),

      // Conversion-ready leads (score >= 9)
      prisma.lead.count({
        where: { projectId, intentScore: { gte: 9 } },
      }),

      // All intent scores for average calculation
      prisma.lead.findMany({
        where: { projectId },
        select: { intentScore: true },
      }),

      // Latest 3 scrape runs
      prisma.scrapRun.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          _count: { select: { leads: true } },
        },
      }),

      // Failed runs count
      prisma.scrapRun.count({
        where: { projectId, status: "FAILED" },
      }),

      // Recent 5 leads
      prisma.lead.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          company: true,
          designation: true,
          industry: true,
          intentScore: true,
          sourceChannel: true,
          status: true,
          createdAt: true,
        },
      }),

      // Leads grouped by channel
      prisma.lead.groupBy({
        by: ["sourceChannel"],
        where: { projectId },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),

      // Leads grouped by industry
      prisma.lead.groupBy({
        by: ["industry"],
        where: { projectId },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    // Compute average intent score
    const avgIntentScore =
      allLeadsForAvg.length > 0
        ? Math.round(
            (allLeadsForAvg.reduce((sum: number, l: { intentScore: number }) => sum + l.intentScore, 0) /
              allLeadsForAvg.length) *
              10
          ) / 10
        : 0;

    // Determine best channel (by lead count)
    const bestChannel =
      leadsByChannelRaw.length > 0
        ? leadsByChannelRaw[0].sourceChannel
        : null;

    // Shape runs for output
    const latestRunsShaped = latestRuns.map((run) => ({
      id: run.id,
      status: run.status,
      channelsUsed: run.channelsUsed,
      leadsFound: run.leadsFound,
      leadCount: run._count.leads,
      createdAt: run.createdAt,
      completedAt: run.completedAt,
    }));

    const leadsByChannel = leadsByChannelRaw.map((row) => ({
      channel: row.sourceChannel,
      count: row._count.id,
    }));

    const leadsByIndustry = leadsByIndustryRaw.map((row) => ({
      industry: row.industry,
      count: row._count.id,
    }));

    return Response.json({
      totalLeads,
      highIntentLeads,
      avgIntentScore,
      bestChannel,
      conversionReadyLeads,
      failedRuns: failedRunsCount,
      latestRuns: latestRunsShaped,
      leadsByChannel,
      leadsByIndustry,
      recentLeads,
    });
  } catch (error) {
    console.error("[GET /api/dashboard/stats]", error);
    return Response.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
