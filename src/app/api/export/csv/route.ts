import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@/generated/prisma";

const ExportCSVSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  leadIds: z.array(z.string()).optional(),
});

const CSV_COLUMNS = [
  "name",
  "designation",
  "company",
  "industry",
  "companySize",
  "location",
  "sourceChannel",
  "sourceUrl",
  "intentSignal",
  "intentScore",
  "confidenceScore",
  "painPoint",
  "competitorMentioned",
  "recommendedOutreachAngle",
] as const;

type CsvColumn = (typeof CSV_COLUMNS)[number];

function escapeCsvCell(
  value: string | number | null | undefined
): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in double quotes if value contains comma, newline, or double-quote
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(
  lead: Record<string, unknown>,
  columns: readonly CsvColumn[]
): string {
  return columns
    .map((col) =>
      escapeCsvCell(lead[col] as string | number | null | undefined)
    )
    .join(",");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = ExportCSVSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, leadIds } = result.data;

    const leads = await prisma.lead.findMany({
      where: {
        projectId,
        ...(leadIds && leadIds.length > 0
          ? { id: { in: leadIds } }
          : { status: LeadStatus.SAVED }),
      },
      orderBy: { intentScore: "desc" },
      select: {
        name: true,
        designation: true,
        company: true,
        industry: true,
        companySize: true,
        location: true,
        sourceChannel: true,
        sourceUrl: true,
        intentSignal: true,
        intentScore: true,
        confidenceScore: true,
        painPoint: true,
        competitorMentioned: true,
        recommendedOutreachAngle: true,
      },
    });

    const header = CSV_COLUMNS.join(",");
    const rows = leads.map((lead) =>
      buildCsvRow(lead as Record<string, unknown>, CSV_COLUMNS)
    );
    const csv = [header, ...rows].join("\n");

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `leads_export_${projectId}_${timestamp}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Total-Leads": String(leads.length),
      },
    });
  } catch (error) {
    console.error("[POST /api/export/csv]", error);
    return Response.json({ error: "Failed to export leads" }, { status: 500 });
  }
}
