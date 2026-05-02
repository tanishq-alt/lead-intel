import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ChannelType, Frequency } from "@/generated/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return Response.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    const channels = await prisma.channel.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({ channels });
  } catch (error) {
    console.error("[GET /api/channels]", error);
    return Response.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
}

const VALID_CHANNEL_TYPES = Object.values(ChannelType);
const VALID_FREQUENCIES = Object.values(Frequency);

const ChannelUpsertSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  name: z.enum(VALID_CHANNEL_TYPES as [string, ...string[]]),
  url: z.string().url().optional(),
  isEnabled: z.boolean().optional(),
  frequency: z.enum(VALID_FREQUENCIES as [string, ...string[]]).optional(),
  maxPages: z.number().int().min(1).max(500).optional(),
  geoFilter: z.string().optional(),
  nicheFilter: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = ChannelUpsertSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, name, url, isEnabled, frequency, maxPages, geoFilter, nicheFilter } =
      result.data;

    const channelName = name as ChannelType;

    // Each project can have at most one channel of each ChannelType.
    // We upsert to allow re-configuring an existing channel.
    const existing = await prisma.channel.findFirst({
      where: { projectId, name: channelName },
    });

    let channel;
    if (existing) {
      channel = await prisma.channel.update({
        where: { id: existing.id },
        data: {
          url: url ?? existing.url,
          isEnabled: isEnabled ?? existing.isEnabled,
          frequency: (frequency as Frequency) ?? existing.frequency,
          maxPages: maxPages ?? existing.maxPages,
          geoFilter: geoFilter ?? existing.geoFilter,
          nicheFilter: nicheFilter ?? existing.nicheFilter,
        },
      });
    } else {
      channel = await prisma.channel.create({
        data: {
          projectId,
          name: channelName,
          url: url ?? null,
          isEnabled: isEnabled ?? true,
          frequency: (frequency as Frequency) ?? Frequency.DAILY,
          maxPages: maxPages ?? 10,
          geoFilter: geoFilter ?? null,
          nicheFilter: nicheFilter ?? null,
        },
      });
    }

    return Response.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/channels]", error);
    return Response.json(
      { error: "Failed to create/update channel" },
      { status: 500 }
    );
  }
}
