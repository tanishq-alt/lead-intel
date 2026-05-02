import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@/generated/prisma";

const UpdateLeadSchema = z.object({
  status: z.enum([
    LeadStatus.NEW,
    LeadStatus.SAVED,
    LeadStatus.REJECTED,
    LeadStatus.EXPORTED,
    LeadStatus.CONTACTED,
  ]),
});

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        leadSources: true,
      },
    });

    if (!lead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    return Response.json({ lead });
  } catch (error) {
    console.error("[GET /api/leads/[id]]", error);
    return Response.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const body = await request.json();

    const result = UpdateLeadSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: { status: result.data.status },
    });

    return Response.json({ lead: updated });
  } catch (error) {
    console.error("[PATCH /api/leads/[id]]", error);
    return Response.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
