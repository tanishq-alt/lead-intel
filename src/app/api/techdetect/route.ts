import { NextRequest } from "next/server";
import { detectTechStack } from "@/lib/scrapers/techdetect";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return Response.json({ error: "domain query param required" }, { status: 400 });
  }
  const clean = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
  if (!clean || clean.length < 3) {
    return Response.json({ error: "Invalid domain" }, { status: 400 });
  }
  try {
    const profile = await detectTechStack(clean);
    return Response.json(profile);
  } catch (err) {
    return Response.json({ error: "Detection failed", detail: String(err) }, { status: 500 });
  }
}
