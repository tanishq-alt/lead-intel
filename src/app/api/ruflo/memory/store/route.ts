import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PatternType } from "@/generated/prisma";
import { rufloMemoryStore } from "@/lib/ruflo";

const VALID_PATTERN_TYPES = Object.values(PatternType) as [PatternType, ...PatternType[]];

const MemoryStoreSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  patternType: z.enum(VALID_PATTERN_TYPES),
  data: z.record(z.string(), z.unknown()),
  score: z.number().min(0).max(1).default(0.5),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = MemoryStoreSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, patternType, data, score } = result.data;

    // Persist in database — data is stored as JSON (Prisma Json field)
    const memoryPattern = await prisma.memoryPattern.create({
      data: {
        projectId,
        patternType: patternType as PatternType,
        data: data as Parameters<typeof prisma.memoryPattern.create>[0]["data"]["data"],
        score,
      },
    });

    // Also persist via Ruflo MCP memory layer (best-effort)
    const rufloResult = await rufloMemoryStore({
      projectId,
      patternType,
      data,
      score,
    });

    return Response.json(
      {
        memoryPattern,
        ruflo: rufloResult,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/ruflo/memory/store]", error);
    return Response.json(
      { error: "Failed to store memory pattern" },
      { status: 500 }
    );
  }
}
