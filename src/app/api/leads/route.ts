import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CompanySize, LeadStatus, Prisma } from "@/generated/prisma";

const VALID_COMPANY_SIZES = Object.values(CompanySize);
const VALID_LEAD_STATUSES = Object.values(LeadStatus);

const LeadsQuerySchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  intentScore: z.coerce.number().int().min(1).max(10).optional(),
  channel: z.string().optional(),
  industry: z.string().optional(),
  companySize: z
    .enum(VALID_COMPANY_SIZES as [string, ...string[]])
    .optional(),
  status: z
    .enum(VALID_LEAD_STATUSES as [string, ...string[]])
    .optional(),
  search: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const result = LeadsQuerySchema.safeParse({
      projectId: searchParams.get("projectId"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      intentScore: searchParams.get("intentScore"),
      channel: searchParams.get("channel"),
      industry: searchParams.get("industry"),
      companySize: searchParams.get("companySize") || undefined,
      status: searchParams.get("status") || undefined,
      search: searchParams.get("search"),
    });

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const {
      projectId,
      page,
      limit,
      intentScore,
      channel,
      industry,
      companySize,
      status,
      search,
    } = result.data;

    const where: Prisma.LeadWhereInput = {
      projectId,
      ...(intentScore !== undefined && {
        intentScore: { gte: intentScore },
      }),
      ...(channel && {
        sourceChannel: { equals: channel, mode: "insensitive" },
      }),
      ...(industry && {
        industry: { equals: industry, mode: "insensitive" },
      }),
      ...(companySize && { companySize: companySize as CompanySize }),
      ...(status && { status: status as LeadStatus }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { designation: { contains: search, mode: "insensitive" } },
          { painPoint: { contains: search, mode: "insensitive" } },
          { intentSignal: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { intentScore: "desc" },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return Response.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[GET /api/leads]", error);
    return Response.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}
