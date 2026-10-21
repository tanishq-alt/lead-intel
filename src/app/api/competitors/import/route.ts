import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CompetitorRowSchema = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  relationship: z.string().optional(),
});

const ImportSchema = z.object({
  projectId: z.string().min(1),
  competitors: z.array(CompetitorRowSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const result = ImportSchema.safeParse(body);

    if (!result.success) {
      return Response.json({ error: "Validation failed", issues: result.error.issues }, { status: 400 });
    }

    const { projectId, competitors } = result.data;
    let created = 0;
    let updated = 0;

    for (const row of competitors) {
      const matchKey = row.domain
        ? { projectId, domain: row.domain }
        : { projectId, name: row.name };

      const existing = await prisma.competitor.findFirst({ where: matchKey });

      if (existing) {
        await prisma.competitor.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            domain: row.domain,
            priority: row.priority,
            category: row.category,
            relationship: row.relationship,
          },
        });
        updated++;
      } else {
        await prisma.competitor.create({
          data: { projectId, ...row },
        });
        created++;
      }
    }

    return Response.json({ created, updated });
  } catch (error) {
    console.error("[POST /api/competitors/import]", error);
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
