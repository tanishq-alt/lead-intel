import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CompanySize, LeadStatus } from "@/generated/prisma";
import { rufloSwarm, rufloAgentSpawn } from "@/lib/ruflo";

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ScrapeRunSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  channelIds: z.array(z.string()).min(1, "At least one channel must be selected"),
});

// ---------------------------------------------------------------------------
// Mock lead data pools
// ---------------------------------------------------------------------------

const INDUSTRIES = ["SaaS", "HR Tech", "FinTech", "E-commerce", "Marketing"] as const;
type Industry = (typeof INDUSTRIES)[number];

const COMPANY_SIZES: CompanySize[] = [
  CompanySize.STARTUP,
  CompanySize.SMB,
  CompanySize.MID_MARKET,
  CompanySize.ENTERPRISE,
];

const LOCATIONS = [
  "San Francisco, CA",
  "New York, NY",
  "Austin, TX",
  "Seattle, WA",
  "Boston, MA",
  "Chicago, IL",
  "Denver, CO",
  "Atlanta, GA",
  "London, UK",
  "Toronto, Canada",
];

const DESIGNATIONS: Record<Industry, string[]> = {
  SaaS: [
    "VP of Engineering",
    "Head of Product",
    "CTO",
    "Director of Engineering",
    "Software Architect",
  ],
  "HR Tech": [
    "Chief People Officer",
    "VP of HR",
    "Head of Talent Acquisition",
    "Director of People Operations",
    "HR Business Partner",
  ],
  FinTech: [
    "CFO",
    "VP of Finance",
    "Head of Compliance",
    "Director of Risk Management",
    "Treasury Manager",
  ],
  "E-commerce": [
    "Director of E-commerce",
    "VP of Digital",
    "Head of Growth",
    "CMO",
    "Director of Merchandising",
  ],
  Marketing: [
    "VP of Marketing",
    "Head of Demand Generation",
    "Director of Brand",
    "CMO",
    "Growth Lead",
  ],
};

const COMPANIES: Record<Industry, string[]> = {
  SaaS: [
    "Notion Labs",
    "Linear Technologies",
    "Vercel Inc",
    "Supabase Ltd",
    "Retool Systems",
    "Clerk Dev",
    "Resend Inc",
    "PlanetScale",
    "Neon Technologies",
    "Railway Corp",
  ],
  "HR Tech": [
    "Rippling",
    "Deel Inc",
    "Lattice HQ",
    "Leapsome",
    "Personio GmbH",
    "ChartHop",
    "Pave Inc",
    "Compa Inc",
    "Kona Inc",
    "Circa Inc",
  ],
  FinTech: [
    "Brex Inc",
    "Mercury Bank",
    "Ramp Financial",
    "Pilot.com",
    "Heron Data",
    "Parafin Inc",
    "Stord Inc",
    "Jeeves Inc",
    "Arc Technologies",
    "Capchase",
  ],
  "E-commerce": [
    "Gorgias Inc",
    "Yotpo Ltd",
    "Klaviyo",
    "Okendo Inc",
    "LoyaltyLion",
    "Rebuy Engine",
    "Triple Whale",
    "Northbeam",
    "Daasity Inc",
    "Fairing Inc",
  ],
  Marketing: [
    "Metadata.io",
    "Mutiny HQ",
    "Bombora Inc",
    "6sense Inc",
    "Demandbase",
    "Clearbit",
    "Rollworks Inc",
    "Metadata Inc",
    "Smartly.io",
    "Stirista LLC",
  ],
};

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Morgan",
  "Taylor",
  "Casey",
  "Riley",
  "Avery",
  "Blake",
  "Cameron",
  "Dakota",
  "Drew",
  "Finley",
  "Hayden",
  "Jamie",
  "Kendall",
  "Logan",
  "Mackenzie",
  "Parker",
  "Quinn",
  "Reese",
  "Sage",
  "Skylar",
  "Tatum",
  "Emerson",
  "Peyton",
];

const LAST_NAMES = [
  "Chen",
  "Williams",
  "Johnson",
  "Martinez",
  "Thompson",
  "Garcia",
  "Anderson",
  "Taylor",
  "Moore",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Lee",
  "Perez",
  "Thomas",
  "Wilson",
  "Roberts",
  "Lewis",
  "Robinson",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "Hernandez",
];

const INTENT_SIGNALS = [
  "Posted about scaling infrastructure challenges",
  "Commented on competitor thread asking for alternatives",
  "Liked multiple posts about team efficiency tools",
  "Replied to job post highlighting pain with current stack",
  "Published article on cost reduction in tech operations",
  "Shared case study about failed vendor migration",
  "Asked for recommendations in a LinkedIn group",
  "Posted about team growth challenges and onboarding friction",
  "Engaged with pricing-related content multiple times",
  "Shared frustration about manual reporting workflows",
  "Joined multiple SaaS evaluation discussion threads",
  "Posted about compliance requirements and tooling gaps",
];

const PAIN_POINTS: Record<Industry, string[]> = {
  SaaS: [
    "Engineering team spending 40%+ of time on infra instead of product",
    "Deployment pipelines taking hours and blocking releases",
    "Database scaling costing 3x budget projections",
    "Lack of observability across microservices causing P1 incidents",
    "Developer onboarding taking weeks due to environment complexity",
  ],
  "HR Tech": [
    "Manual onboarding process taking 2-3 weeks per new hire",
    "No single source of truth for employee data across tools",
    "Performance review cycles consuming entire quarters",
    "High attrition due to lack of structured career development",
    "Payroll errors and compliance gaps in multi-country hiring",
  ],
  FinTech: [
    "Month-end close taking 2 weeks due to manual reconciliation",
    "Audit prep requiring full team for 6 weeks annually",
    "Fraud detection system generating 60% false positives",
    "Cross-border payment failures costing 15% of transactions",
    "Regulatory reporting causing consistent SLA breaches",
  ],
  "E-commerce": [
    "Cart abandonment rate at 78% with no attribution clarity",
    "Post-purchase customer support overwhelmed with WISMO tickets",
    "Inventory sync lag causing overselling on peak days",
    "Return rate at 35% with no insight into root causes",
    "Email revenue declining 30% YoY with no clear segmentation strategy",
  ],
  Marketing: [
    "70% of ad spend going to channels with unmeasurable ROI",
    "Sales blaming marketing for unqualified pipeline constantly",
    "Content team producing assets that never get used in outreach",
    "Account-based campaigns lacking intent data to prioritize targets",
    "Attribution model breaking down across six-touch buyer journeys",
  ],
};

const COMPETITORS: Record<Industry, string[]> = {
  SaaS: ["AWS", "Heroku", "Render", "Fly.io", "Digital Ocean"],
  "HR Tech": ["Workday", "BambooHR", "HiBob", "Gusto", "ADP"],
  FinTech: ["QuickBooks", "NetSuite", "Xero", "SAP", "Sage"],
  "E-commerce": ["Shopify", "BigCommerce", "WooCommerce", "Magento", "Squarespace"],
  Marketing: ["HubSpot", "Marketo", "Pardot", "Eloqua", "Salesforce"],
};

const OUTREACH_ANGLES: Record<Industry, string[]> = {
  SaaS: [
    "Lead with infrastructure cost reduction ROI — they're scaling fast and burning cash",
    "Position as the developer-first platform to win hearts before budget approval",
    "Use the onboarding speed angle: 'deploy in minutes not weeks'",
    "Reference a similar-stage company that reduced P1 incidents by 80%",
    "Tie the pitch to their recent engineering blog post on reliability",
  ],
  "HR Tech": [
    "Lead with time-to-productivity for new hires — measurable within 30 days",
    "Reference compliance risks in their known expansion markets",
    "Use a people-ops efficiency story from a peer company in their space",
    "Emphasize manager time saved vs current review cycle length",
    "Connect to their culture initiatives mentioned on company LinkedIn",
  ],
  FinTech: [
    "Open with audit trail completeness — their compliance team will champion this",
    "Quantify the cost of their current month-end close in hours and headcount",
    "Reference a recent regulatory update relevant to their operating region",
    "Lead with fraud reduction stats from a named reference customer",
    "Tie to their CFO's recent public comments about operational efficiency",
  ],
  "E-commerce": [
    "Lead with average order value lift from better post-purchase experience",
    "Use the WISMO reduction angle — support team will push this internally",
    "Reference peak season preparedness — Black Friday risk is top of mind",
    "Tie to their Trustpilot score and what drives negative reviews",
    "Connect to their recent funding and scaling trajectory",
  ],
  Marketing: [
    "Lead with pipeline quality over pipeline volume — sales teams are the champion",
    "Reference their tech stack and show where intent data plugs in natively",
    "Use a story about a CMO who cut spend 20% and improved conversion 40%",
    "Tie to their upcoming fiscal year planning if timing aligns",
    "Open with their competitor's success using your platform as social proof",
  ],
};

const SOURCE_URLS_BY_TYPE: Record<string, string[]> = {
  linkedin: [
    "https://linkedin.com/feed/activity/7234567890123456789",
    "https://linkedin.com/posts/johndoe_saas-scaling-activity-7234567890",
    "https://linkedin.com/groups/12345678/",
    "https://linkedin.com/pulse/article-id-12345",
    "https://linkedin.com/feed/activity/9876543210987654321",
  ],
  reddit: [
    "https://reddit.com/r/SaaS/comments/abc123/looking_for_alternatives",
    "https://reddit.com/r/devops/comments/def456/scaling_pain",
    "https://reddit.com/r/entrepreneur/comments/ghi789/tool_recommendation",
    "https://reddit.com/r/startups/comments/jkl012/hiring_challenges",
    "https://reddit.com/r/fintech/comments/mno345/compliance_tools",
  ],
  twitter: [
    "https://twitter.com/handle/status/1234567890123456789",
    "https://twitter.com/handle/status/9876543210987654321",
    "https://twitter.com/handle/status/1122334455667788990",
    "https://twitter.com/handle/status/9988776655443322110",
    "https://twitter.com/handle/status/5544332211009988776",
  ],
  producthunt: [
    "https://producthunt.com/posts/product-name/comments",
    "https://producthunt.com/discussions/looking-for-alternative",
    "https://producthunt.com/posts/competitor-name/reviews",
    "https://producthunt.com/stories/scaling-saas",
    "https://producthunt.com/posts/new-tool/comments",
  ],
  hackernews: [
    "https://news.ycombinator.com/item?id=12345678",
    "https://news.ycombinator.com/item?id=87654321",
    "https://news.ycombinator.com/item?id=11223344",
    "https://news.ycombinator.com/item?id=44332211",
    "https://news.ycombinator.com/item?id=55667788",
  ],
  default: [
    "https://example.com/discussion/thread-123",
    "https://community.example.com/post/456",
    "https://forum.example.com/topic/789",
    "https://discuss.example.com/t/thread-012",
    "https://community.example.com/post/345",
  ],
};

const RAW_EVIDENCE_TEMPLATES = [
  `Posted: "We've been evaluating alternatives to {{competitor}} for the past 6 weeks. The pricing has become untenable at our current scale and we're actively looking. Anyone have experience migrating away?" — 47 likes, 23 comments`,
  `Comment on a competitor review thread: "We ran into the same issue at {{company}}. Our {{designation}} spent 3 months trying to get a custom integration working. We eventually had to build it in-house which cost us 2 engineer-months." — 31 upvotes`,
  `LinkedIn update: "Excited to be leading the evaluation of a new {{industry}} platform at {{company}}. If you've made a switch recently, I'd love to connect and learn from your experience. #{{industry}} #{{painKeyword}}"`,
  `Job posting comment: "Seeing a lot of these {{designation}} roles requiring experience with infrastructure tools. At {{company}} we're struggling with the same problems described in this JD. Considering whether to hire or buy." — 18 likes`,
  `Tweet thread: "A few things I've learned after 18 months of trying to scale our {{industry}} stack without the right tooling: 1/ It will cost you more than the tool itself 2/ Your best engineers will leave 3/ Technical debt compounds faster than interest" — 312 retweets`,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pick<T>(arr: readonly T[] | T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildRawEvidence(
  template: string,
  ctx: {
    competitor: string;
    company: string;
    designation: string;
    industry: string;
  }
): string {
  return template
    .replace(/{{competitor}}/g, ctx.competitor)
    .replace(/{{company}}/g, ctx.company)
    .replace(/{{designation}}/g, ctx.designation)
    .replace(/{{industry}}/g, ctx.industry)
    .replace(/{{painKeyword}}/g, ctx.industry.toLowerCase().replace(" ", ""));
}

function generateMockLead(channelName: string, channelType: string, projectId: string) {
  const industry = pick([...INDUSTRIES]);
  const company = pick(COMPANIES[industry]);
  const designation = pick(DESIGNATIONS[industry]);
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const companySize = pick([...COMPANY_SIZES]);
  const location = pick(LOCATIONS);
  const intentScore = randInt(7, 10);
  const confidenceScore = randInt(70, 95);
  const intentSignal = pick(INTENT_SIGNALS);
  const painPoint = pick(PAIN_POINTS[industry]);
  const competitor = pick(COMPETITORS[industry]);
  const outreachAngle = pick(OUTREACH_ANGLES[industry]);

  const urlPool =
    SOURCE_URLS_BY_TYPE[channelType] ?? SOURCE_URLS_BY_TYPE.default;
  const sourceUrl = pick(urlPool);

  const evidenceTemplate = pick(RAW_EVIDENCE_TEMPLATES);
  const rawEvidence = buildRawEvidence(evidenceTemplate, {
    competitor,
    company,
    designation,
    industry,
  });

  return {
    name,
    designation,
    company,
    industry,
    companySize,
    location,
    sourceChannel: channelName,
    sourceUrl,
    intentSignal,
    intentScore,
    confidenceScore,
    painPoint,
    competitorMentioned: competitor,
    recommendedOutreachAngle: outreachAngle,
    rawEvidence,
    status: LeadStatus.NEW,
    projectId,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = ScrapeRunSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 }
      );
    }

    const { projectId, channelIds } = result.data;

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch the requested channels
    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds }, projectId },
    });

    if (channels.length === 0) {
      return Response.json(
        { error: "No valid channels found for this project" },
        { status: 400 }
      );
    }

    // Create the ScrapRun record
    const scrapRun = await prisma.scrapRun.create({
      data: {
        projectId,
        status: "RUNNING",
        channelsUsed: channels.map((c) => c.name),
        leadsFound: 0,
      },
    });

    // Initialise a Ruflo swarm
    const swarm = await rufloSwarm({
      projectId,
      runId: scrapRun.id,
      channels: channels.map((c) => c.name),
    });

    // Spawn an agent per channel
    await Promise.all(
      channels.map((channel) =>
        rufloAgentSpawn({
          swarmId: swarm.swarmId,
          channel: channel.name,
          runId: scrapRun.id,
          projectId,
        })
      )
    );

    // Generate 5 mock leads per channel
    const LEADS_PER_CHANNEL = 5;
    const leadsToCreate: ReturnType<typeof generateMockLead>[] = [];

    for (const channel of channels) {
      // Lowercase enum name is a good-enough key into SOURCE_URLS_BY_TYPE
      const channelTypeKey = channel.name.toLowerCase();

      for (let i = 0; i < LEADS_PER_CHANNEL; i++) {
        leadsToCreate.push(
          generateMockLead(channel.name, channelTypeKey, projectId)
        );
      }
    }

    // Persist leads + their source records
    const createdLeads = await Promise.all(
      leadsToCreate.map((leadData) =>
        prisma.lead.create({
          data: {
            name: leadData.name,
            designation: leadData.designation,
            company: leadData.company,
            industry: leadData.industry,
            companySize: leadData.companySize,
            location: leadData.location,
            sourceChannel: leadData.sourceChannel,
            sourceUrl: leadData.sourceUrl,
            intentSignal: leadData.intentSignal,
            intentScore: leadData.intentScore,
            confidenceScore: leadData.confidenceScore,
            painPoint: leadData.painPoint,
            competitorMentioned: leadData.competitorMentioned,
            recommendedOutreachAngle: leadData.recommendedOutreachAngle,
            rawEvidence: leadData.rawEvidence,
            status: leadData.status,
            projectId: leadData.projectId,
            scrapRunId: scrapRun.id,
            leadSources: {
              create: [
                {
                  url: leadData.sourceUrl,
                  channel: leadData.sourceChannel,
                  snippet: leadData.rawEvidence.slice(0, 500),
                  foundAt: new Date(),
                },
              ],
            },
          },
        })
      )
    );

    // Mark run as COMPLETED
    const updatedRun = await prisma.scrapRun.update({
      where: { id: scrapRun.id },
      data: {
        status: "COMPLETED",
        leadsFound: createdLeads.length,
        completedAt: new Date(),
      },
    });

    return Response.json({
      runId: updatedRun.id,
      leadsCreated: createdLeads.length,
      status: updatedRun.status,
      swarmId: swarm.swarmId,
    });
  } catch (error) {
    console.error("[POST /api/scrape/run]", error);
    return Response.json(
      { error: "Failed to start scrape run" },
      { status: 500 }
    );
  }
}
