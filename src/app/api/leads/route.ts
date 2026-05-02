import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CompanySize, LeadStatus, Prisma } from "@/generated/prisma";

const VALID_COMPANY_SIZES = Object.values(CompanySize);
const VALID_LEAD_STATUSES = Object.values(LeadStatus);

const VALID_INTENT_TYPES = [
  "actively-searching",
  "complaint",
  "competitor-trigger",
  "urgent",
  "general-interest",
] as const;

const DATE_RANGES = ["today", "7d", "30d", "90d", "all"] as const;

const LeadsQuerySchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  // Basic filters
  intentScore: z.coerce.number().int().min(0).max(10).optional(),
  channel: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.enum(VALID_COMPANY_SIZES as [string, ...string[]]).optional(),
  status: z.enum(VALID_LEAD_STATUSES as [string, ...string[]]).optional(),
  search: z.string().optional(),
  // Apollo-style filters
  techStack: z.string().optional(),
  competitorMentioned: z.string().optional(),
  intentType: z.enum(VALID_INTENT_TYPES).optional(),
  dateRange: z.enum(DATE_RANGES).optional().default("all"),
  hasCompany: z.enum(["true", "false"]).optional(),
  hasDesignation: z.enum(["true", "false"]).optional(),
  hasPainPoint: z.enum(["true", "false"]).optional(),
  keyword: z.string().optional(),
  sortBy: z.enum(["intentScore", "confidenceScore", "createdAt"]).optional().default("intentScore"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

function getDateCutoff(range: string): Date | null {
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

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
      techStack: searchParams.get("techStack"),
      competitorMentioned: searchParams.get("competitorMentioned"),
      intentType: searchParams.get("intentType") || undefined,
      dateRange: searchParams.get("dateRange") || undefined,
      hasCompany: searchParams.get("hasCompany") || undefined,
      hasDesignation: searchParams.get("hasDesignation") || undefined,
      hasPainPoint: searchParams.get("hasPainPoint") || undefined,
      keyword: searchParams.get("keyword"),
      sortBy: searchParams.get("sortBy") || undefined,
      sortDir: searchParams.get("sortDir") || undefined,
    });

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const {
      projectId, page, limit,
      intentScore, channel, industry, companySize, status, search,
      techStack, competitorMentioned, intentType, dateRange,
      hasCompany, hasDesignation, hasPainPoint, keyword,
      sortBy, sortDir,
    } = result.data;

    const dateCutoff = getDateCutoff(dateRange);

    const where: Prisma.LeadWhereInput = {
      projectId,
      ...(intentScore !== undefined && { intentScore: { gte: intentScore } }),
      ...(channel && { sourceChannel: { equals: channel, mode: "insensitive" } }),
      ...(industry && { industry: { equals: industry, mode: "insensitive" } }),
      ...(companySize && { companySize: companySize as CompanySize }),
      ...(status && { status: status as LeadStatus }),
      ...(techStack && { techStackDetected: { contains: techStack, mode: "insensitive" } }),
      ...(competitorMentioned && {
        competitorMentioned: { contains: competitorMentioned, mode: "insensitive" },
      }),
      ...(intentType && { intentSignal: { contains: intentType, mode: "insensitive" } }),
      ...(dateCutoff && { createdAt: { gte: dateCutoff } }),
      ...(hasCompany === "true" && { company: { not: null } }),
      ...(hasCompany === "false" && { company: null }),
      ...(hasDesignation === "true" && { designation: { not: null } }),
      ...(hasDesignation === "false" && { designation: null }),
      ...(hasPainPoint === "true" && { painPoint: { not: null } }),
      ...(hasPainPoint === "false" && { painPoint: null }),
      ...(keyword && {
        OR: [
          { keywordsMatched: { has: keyword } },
          { rawEvidence: { contains: keyword, mode: "insensitive" } },
          { intentSignal: { contains: keyword, mode: "insensitive" } },
        ],
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { designation: { contains: search, mode: "insensitive" } },
          { painPoint: { contains: search, mode: "insensitive" } },
          { intentSignal: { contains: search, mode: "insensitive" } },
          { competitorMentioned: { contains: search, mode: "insensitive" } },
          { techStackDetected: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
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
