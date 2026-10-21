import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { scrapeCompetitor, CompetitorTarget } from "@/lib/scrapers/competitor-tracker";

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const body: { projectId?: string } = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }

    const activeCompetitors = await prisma.competitor.findMany({
      where: { projectId, isActive: true },
    });

    if (activeCompetitors.length === 0) {
      return Response.json({ updated: 0, newUpdates: 0, competitors: 0 });
    }

    const batches = chunkArray(activeCompetitors, 10);
    let totalNew = 0;

    for (const batch of batches) {
      const targets: CompetitorTarget[] = batch.map((c) => ({
        name: c.name,
        domain: c.domain ?? undefined,
        linkedinSlug: c.linkedinSlug ?? undefined,
        twitterHandle: c.twitterHandle ?? undefined,
      }));

      const batchResults = await Promise.allSettled(
        targets.map((t, i) =>
          scrapeCompetitor(t).then((signals) =>
            signals.map((s) => ({ ...s, competitorId: batch[i].id }))
          )
        )
      );

      for (const result of batchResults) {
        if (result.status !== "fulfilled") continue;

        for (const signal of result.value) {
          if (!signal.url) continue;

          const existing = await prisma.competitorUpdate.findFirst({
            where: { url: signal.url, projectId },
          });

          if (!existing) {
            await prisma.competitorUpdate.create({
              data: {
                competitorId: signal.competitorId,
                projectId,
                channel: signal.channel,
                url: signal.url,
                title: signal.title,
                summary: signal.body,
                updateType: signal.updateType,
                leadMagnetType: signal.leadMagnetType,
                engagementScore: signal.engagementScore,
                publishedAt: signal.publishedAt,
              },
            });
            totalNew++;
          }
        }
      }
    }

    return Response.json({
      updated: activeCompetitors.length,
      newUpdates: totalNew,
      competitors: activeCompetitors.length,
    });
  } catch (error) {
    console.error("[POST /api/competitors/scrape]", error);
    return Response.json({ error: "Scrape failed" }, { status: 500 });
  }
}
