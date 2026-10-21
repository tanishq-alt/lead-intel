import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CompetitorCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  domain: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  relationship: z.string().optional(),
  linkedinSlug: z.string().optional(),
  twitterHandle: z.string().optional(),
  productHuntSlug: z.string().optional(),
  youtubeHandle: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return Response.json({ error: "projectId is required" }, { status: 400 });
    }

    const competitors = await prisma.competitor.findMany({
      where: { projectId, isActive: true },
      include: { _count: { select: { updates: true } } },
      orderBy: [{ priority: "asc" }, { name: "asc" }],
    });

    return Response.json({ competitors });
  } catch (error) {
    console.error("[GET /api/competitors]", error);
    return Response.json({ error: "Failed to fetch competitors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const result = CompetitorCreateSchema.safeParse(body);

    if (!result.success) {
      return Response.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 });
    }

    const { projectId, ...data } = result.data;

    const competitor = await prisma.competitor.create({
      data: { projectId, ...data },
    });

    return Response.json({ competitor }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/competitors]", error);
    return Response.json({ error: "Failed to create competitor" }, { status: 500 });
  }
}
