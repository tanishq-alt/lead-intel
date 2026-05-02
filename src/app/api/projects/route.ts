import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const DEFAULT_USER_EMAIL = "demo@lead-intel.app";
const DEFAULT_USER_NAME = "Demo User";

async function getOrCreateDemoUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_USER_EMAIL },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: DEFAULT_USER_EMAIL,
      name: DEFAULT_USER_NAME,
    },
  });
}

export async function GET() {
  try {
    const user = await getOrCreateDemoUser();

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { leads: true, scrapRuns: true },
        },
      },
    });

    return Response.json({ projects, userId: user.id });
  } catch (error) {
    console.error("[GET /api/projects]", error);
    return Response.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CreateProjectSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { name, description } = result.data;
    const user = await getOrCreateDemoUser();

    const project = await prisma.project.create({
      data: {
        name,
        description: description ?? null,
        userId: user.id,
      },
    });

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/projects]", error);
    return Response.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
