import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CustomChannelSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  url: z.string().url("url must be a valid URL"),
  name: z.string().min(1, "name is required").max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = CustomChannelSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, url, name } = result.data;

    const channel = await prisma.channel.create({
      data: {
        projectId,
        name: "CUSTOM",
        url,
        isEnabled: true,
        frequency: "DAILY",
        maxPages: 10,
        nicheFilter: name,
      },
    });

    return Response.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/channels/custom]", error);
    return Response.json(
      { error: "Failed to add custom channel" },
      { status: 500 }
    );
  }
}
