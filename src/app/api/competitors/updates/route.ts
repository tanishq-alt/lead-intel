import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }

    const updateType = searchParams.get("updateType") ?? undefined;
    const channel = searchParams.get("channel") ?? undefined;
    const competitorId = searchParams.get("competitorId") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 50)));
    const skip = (page - 1) * limit;

    const where = {
      projectId,
      ...(updateType && { updateType }),
      ...(channel && { channel }),
      ...(competitorId && { competitorId }),
    };

    const [updates, total] = await Promise.all([
      prisma.competitorUpdate.findMany({
        where,
        include: {
          competitor: {
            select: { name: true, domain: true },
          },
        },
        orderBy: { scrapedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.competitorUpdate.count({ where }),
    ]);

    return Response.json({
      updates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/competitors/updates]", error);
    return Response.json({ error: "Failed to fetch updates" }, { status: 500 });
  }
}
