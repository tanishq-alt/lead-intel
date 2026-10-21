import { NextRequest } from "next/server";
import { enrichDomain } from "@/lib/enrichment/index";

export const maxDuration = 45;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return Response.json({ error: "domain query param required" }, { status: 400 });
  }
  const clean = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
  if (!clean || clean.length < 3 || !clean.includes(".")) {
    return Response.json({ error: "Invalid domain" }, { status: 400 });
  }
  try {
    const result = await enrichDomain(clean);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: "Enrichment failed", detail: String(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({})) as { domains?: string[] };
    const domains: string[] = (body.domains ?? [])
      .slice(0, 20)
      .map((d: string) => d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase())
      .filter((d: string) => d.length > 3 && d.includes("."));

    if (!domains.length) {
      return Response.json({ error: "Provide at least one domain" }, { status: 400 });
    }

    const results = await Promise.allSettled(domains.map((d) => enrichDomain(d)));
    const enriched = results.map((r, i) =>
      r.status === "fulfilled" ? r.value : { domain: domains[i], enrichError: "Failed", enrichedAt: new Date().toISOString() }
    );

    return Response.json({ enriched, meta: { total: enriched.length, enrichedAt: new Date().toISOString() } });
  } catch (err) {
    return Response.json({ error: "Batch enrichment failed", detail: String(err) }, { status: 500 });
  }
}
