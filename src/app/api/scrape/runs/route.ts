import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
        include: {
          _count: {
            select: { leads: true },
          },
        },
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
    return Response.json(
      { error: "Failed to fetch scrape runs" },
      { status: 500 }
    );
  }
}
