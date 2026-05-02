import { Header } from "@/components/layout/header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Bookmark,
  X,
  Download,
  ExternalLink,
  Building2,
  MapPin,
  Users as UsersIcon,
  Layers,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface LeadDetail {
  id: string;
  name: string;
  title: string;
  company: string;
  status: "new" | "saved" | "rejected" | "exported";

  // Intent Analysis
  intentScore: number;
  confidence: number;
  signals: string[];
  keywordsMatched: string[];

  // Pain Point
  painPoint: string;
  competitorMentioned?: string;
  triggerEvent?: string;

  // Source Evidence
  evidenceText: string;
  sourceUrl: string;
  channel: string;
  capturedAt: string;

  // Company Context
  industry?: string;
  companySize?: string;
  location?: string;
  techStack?: string[];

  // Outreach
  emailSubject?: string;
  emailBody?: string;
  linkedinMessage?: string;
}

async function getLead(id: string): Promise<LeadDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/leads/${id}`,
      { cache: "no-store" }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

const statusVariants: Record<string, "info" | "success" | "error" | "outline"> = {
  new: "info",
  saved: "success",
  rejected: "error",
  exported: "outline",
};

function ScoreRing({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;
  const color =
    score >= 9 ? "#10b981" : score >= 7 ? "#7c3aed" : score >= 5 ? "#f59e0b" : "#6b7280";

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg width="80" height="80" className="-rotate-90">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#1f2937" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white leading-none">{score}</span>
        <span className="text-[10px] text-gray-500">/10</span>
      </div>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    notFound();
  }

  const emailSubject =
    lead.emailSubject ??
    `${lead.company}'s ${lead.painPoint ?? "challenge"} — Quick Question`;

  const emailBody =
    lead.emailBody ??
    `Hi ${lead.name.split(" ")[0]},

I came across your post about ${lead.painPoint ?? "the challenges you're facing"} and wanted to reach out.

At [Your Company], we help teams like ${lead.company} ${lead.painPoint ? `solve "${lead.painPoint}"` : "streamline their workflow"} — without the headaches of ${lead.competitorMentioned ? `${lead.competitorMentioned} or similar tools` : "legacy solutions"}.

Would it be worth a 15-minute call to see if we could help?

Best,
[Your Name]`;

  const linkedinMessage =
    lead.linkedinMessage ??
    `Hi ${lead.name.split(" ")[0]}, saw your post about ${lead.painPoint ?? "the problem you mentioned"} — we might have a solution that fits. Open to a quick chat?`;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`${lead.name} — ${lead.company}`}
        subtitle={lead.title}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/leads"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </Link>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors">
              <Bookmark className="w-3.5 h-3.5" />
              Save
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800/60 text-rose-300 text-xs font-medium rounded-lg border border-rose-800/60 transition-colors">
              <X className="w-3.5 h-3.5" />
              Reject
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-medium rounded-lg border border-gray-700 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {/* Status banner */}
        <div className="flex items-center gap-3">
          <Badge variant={statusVariants[lead.status] ?? "outline"}>
            {lead.status}
          </Badge>
          <span className="text-xs text-gray-500">
            Captured from {lead.channel} ·{" "}
            {new Date(lead.capturedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Left column — 2/3 */}
          <div className="xl:col-span-2 space-y-4">
            {/* Intent Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Intent Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <ScoreRing score={lead.intentScore} />

                  <div className="flex-1 space-y-3">
                    {/* Confidence */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Confidence</span>
                        <span className="text-xs font-medium text-white">
                          {lead.confidence}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full transition-all"
                          style={{ width: `${lead.confidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Signals */}
                    {lead.signals.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1.5">
                          Signals Detected
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.signals.map((signal, i) => (
                            <span
                              key={i}
                              className="text-xs bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Keywords */}
                    {lead.keywordsMatched.length > 0 && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1.5">
                          Keywords Matched
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {lead.keywordsMatched.map((kw, i) => (
                            <span
                              key={i}
                              className="text-xs bg-violet-900/30 text-violet-300 border border-violet-800/50 px-2 py-0.5 rounded font-mono"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pain Point & Context */}
            <Card>
              <CardHeader>
                <CardTitle>Pain Point & Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-medium text-gray-400 mb-1">
                    Pain Point
                  </div>
                  <p className="text-sm text-white bg-gray-800/60 rounded-lg px-3 py-2.5">
                    {lead.painPoint}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {lead.competitorMentioned && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">
                        Competitor Mentioned
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm text-rose-300 bg-rose-900/30 border border-rose-800/50 px-3 py-1.5 rounded-lg">
                        {lead.competitorMentioned}
                      </span>
                    </div>
                  )}

                  {lead.triggerEvent && (
                    <div>
                      <div className="text-xs font-medium text-gray-400 mb-1">
                        Trigger Event
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-sm text-amber-300 bg-amber-900/30 border border-amber-800/50 px-3 py-1.5 rounded-lg">
                        {lead.triggerEvent}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Source Evidence */}
            <Card>
              <CardHeader>
                <CardTitle>Source Evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="bg-gray-800 px-2 py-1 rounded">
                    {lead.channel}
                  </span>
                  <a
                    href={lead.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors truncate"
                  >
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{lead.sourceUrl}</span>
                  </a>
                </div>

                <blockquote className="border-l-2 border-violet-600 pl-4 py-1">
                  <p className="text-sm text-gray-300 leading-relaxed italic">
                    &ldquo;{lead.evidenceText}&rdquo;
                  </p>
                </blockquote>
              </CardContent>
            </Card>

            {/* Outreach Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Outreach Templates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <OutreachTabs
                  emailSubject={emailSubject}
                  emailBody={emailBody}
                  linkedinMessage={linkedinMessage}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right column — 1/3 */}
          <div className="space-y-4">
            {/* Company Context */}
            <Card>
              <CardHeader>
                <CardTitle>Company Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.industry && (
                  <div className="flex items-start gap-3">
                    <Layers className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Industry</div>
                      <div className="text-sm text-white">{lead.industry}</div>
                    </div>
                  </div>
                )}

                {lead.companySize && (
                  <div className="flex items-start gap-3">
                    <UsersIcon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Company Size</div>
                      <div className="text-sm text-white">{lead.companySize}</div>
                    </div>
                  </div>
                )}

                {lead.location && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Location</div>
                      <div className="text-sm text-white">{lead.location}</div>
                    </div>
                  </div>
                )}

                {lead.techStack && lead.techStack.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">
                        Tech Stack
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {lead.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {!lead.industry &&
                  !lead.companySize &&
                  !lead.location &&
                  (!lead.techStack || lead.techStack.length === 0) && (
                    <p className="text-xs text-gray-500">
                      No company context available for this lead.
                    </p>
                  )}
              </CardContent>
            </Card>

            {/* Quick actions reminder */}
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-white font-medium">Tip:</span> Use the
                  email template above and personalize with the pain point and
                  company context before sending.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Client component for tabs — extracted inline for SSR compat
function OutreachTabs({
  emailSubject,
  emailBody,
  linkedinMessage,
}: {
  emailSubject: string;
  emailBody: string;
  linkedinMessage: string;
}) {
  // Static tabs rendered as server-compatible UI with CSS
  return (
    <div>
      <div className="flex border-b border-gray-800 px-5">
        <button className="px-1 py-3 mr-4 text-xs font-medium text-violet-400 border-b-2 border-violet-500 -mb-px">
          Email
        </button>
        <button className="px-1 py-3 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors border-b-2 border-transparent">
          LinkedIn
        </button>
      </div>

      {/* Email Tab */}
      <div className="px-5 py-4 space-y-3">
        <div>
          <div className="text-xs font-medium text-gray-400 mb-1">Subject</div>
          <div className="bg-gray-800 rounded-lg px-3 py-2 text-sm text-white font-medium">
            {emailSubject}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-gray-400 mb-1">Body</div>
          <pre className="bg-gray-800 rounded-lg px-3 py-3 text-xs text-gray-200 whitespace-pre-wrap leading-relaxed font-sans overflow-auto max-h-56">
            {emailBody}
          </pre>
        </div>
        <div className="border-t border-gray-800 pt-3 text-xs text-gray-500">
          LinkedIn version:{" "}
          <span className="text-gray-300">{linkedinMessage}</span>
        </div>
      </div>
    </div>
  );
}
