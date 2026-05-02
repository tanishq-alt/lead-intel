import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { rufloMemorySearch } from "@/lib/ruflo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");
    const query = searchParams.get("query") ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

    if (!projectId) {
      return Response.json({ error: "projectId required" }, { status: 400 });
    }

    const [dbPatterns, rufloPatterns] = await Promise.all([
      prisma.memoryPattern.findMany({
        where: { projectId },
        orderBy: [{ score: "desc" }, { usageCount: "desc" }],
        take: limit,
      }),
      rufloMemorySearch({ projectId, query, limit }),
    ]);

    return Response.json({
      patterns: dbPatterns,
      rufloMemory: rufloPatterns,
      total: dbPatterns.length,
    });
  } catch (error) {
    console.error("[GET /api/ruflo/memory/search]", error);
    return Response.json({ error: "Failed to search memory" }, { status: 500 });
  }
}
