import type { RawSignal, DetectedLead } from "./scrapers/types";

// ─── Intent Signal Patterns ────────────────────────────────────────────────

const ACTIVELY_SEARCHING = [
  /looking for (a |an )?(alternative|replacement|tool|solution|software|platform)/i,
  /recommend(ation)?s? (for|on|about)/i,
  /what('s| is) the best (tool|software|platform|solution|way)/i,
  /alternatives? to \w/i,
  /comparing \w+ (vs?\.?|versus|and|with) \w/i,
  /which (tool|software|platform|solution) (should|do) (i|we|you)/i,
  /anyone (using|tried|recommend)/i,
  /help me (choose|pick|decide|find)/i,
  /evaluating (options|tools|vendors|solutions)/i,
  /vendor (evaluation|selection|comparison)/i,
  /switching to/i,
  /migrating (away )?from/i,
  /replacing \w/i,
  /moved (away )?from/i,
  /left \w+ for/i,
  /ditched \w/i,
];

const COMPLAINING = [
  /frustrated with/i,
  /hate(s)? (that|how|when|the)/i,
  /(terrible|awful|horrible|useless|garbage|trash) (ux|ui|support|product|service|api|docs?)/i,
  /so (bad|slow|broken|buggy|painful)/i,
  /doesn'?t (work|support|integrate)/i,
  /can'?t (do|handle|support|integrate)/i,
  /keep(s)? (breaking|crashing|failing)/i,
  /bug(s)? in/i,
  /not working (with|for|in)/i,
  /major (issue|problem|bug|flaw)/i,
  /this (tool|software|platform|product|service) (sucks|is broken|is terrible)/i,
  /completely (useless|broken|unreliable)/i,
  /overpriced|way too expensive|pricing (is|has) (insane|ridiculous|absurd)/i,
];

const URGENT = [
  /urgent(ly)?/i,
  /asap|as soon as possible/i,
  /need(s)? (this )?(immediately|now|today|tonight|this week)/i,
  /deadline (is|coming up|approaching)/i,
  /running out of time/i,
  /critical (issue|bug|problem|deadline)/i,
  /emergency/i,
  /launching (soon|this week|this month)/i,
];

const COMPETITOR_TRIGGERS = [
  /alternative to (\w[\w\s]{1,30})/i,
  /switching from (\w[\w\s]{1,30})/i,
  /replacing (\w[\w\s]{1,30})/i,
  /moved? away from (\w[\w\s]{1,30})/i,
  /migrating? from (\w[\w\s]{1,30})/i,
  /(\w[\w\s]{1,30}) (is|was) (too expensive|too slow|broken|unreliable)/i,
  /left (\w[\w\s]{1,30}) (for|because)/i,
  /(\w[\w\s]{1,30}) doesn't? (work|scale|support)/i,
];

const KNOWN_COMPETITORS = [
  "hubspot", "salesforce", "marketo", "pardot", "pipedrive",
  "zendesk", "intercom", "freshdesk", "drift",
  "workday", "bamboohr", "hibob", "gusto", "adp", "rippling", "deel",
  "quickbooks", "netsuite", "xero", "sage", "sap",
  "shopify", "bigcommerce", "woocommerce", "magento",
  "aws", "gcp", "azure", "heroku", "render", "fly.io",
  "notion", "confluence", "jira", "linear", "asana", "monday",
  "segment", "mixpanel", "amplitude", "heap",
  "stripe", "braintree", "paypal",
  "twilio", "sendgrid", "mailchimp", "klaviyo",
  "datadog", "new relic", "pagerduty",
  "github", "gitlab", "bitbucket",
  "snowflake", "databricks", "fivetran", "dbt",
];

const INTENT_KEYWORDS = [
  "alternative", "switch", "migrate", "replace", "competitor",
  "recommend", "compare", "evaluate", "choose", "pick", "select",
  "frustrated", "problem", "issue", "broken", "bug", "painful",
  "expensive", "overpriced", "cost", "pricing",
  "integration", "api", "scalability", "performance",
  "onboarding", "implementation", "setup",
  "vendor", "contract", "renewal", "cancelling", "churning",
];

const TECH_KEYWORDS: Record<string, string[]> = {
  "React": ["react", "reactjs", "react.js"],
  "Next.js": ["next.js", "nextjs"],
  "Node.js": ["node.js", "nodejs", "node"],
  "Python": ["python", "django", "flask", "fastapi"],
  "PostgreSQL": ["postgres", "postgresql"],
  "MySQL": ["mysql"],
  "MongoDB": ["mongodb", "mongo"],
  "Redis": ["redis"],
  "Kubernetes": ["k8s", "kubernetes"],
  "Docker": ["docker", "containers"],
  "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda"],
  "Stripe": ["stripe"],
  "Twilio": ["twilio"],
  "Shopify": ["shopify"],
};

const DESIGNATION_PATTERNS = [
  { pattern: /\b(cto|chief technology officer)\b/i, role: "CTO" },
  { pattern: /\b(ceo|chief executive officer|founder|co-founder)\b/i, role: "Founder/CEO" },
  { pattern: /\b(cpo|chief product officer|vp of product|head of product)\b/i, role: "Head of Product" },
  { pattern: /\b(vp of engineering|head of engineering|engineering manager|em)\b/i, role: "VP Engineering" },
  { pattern: /\b(cmo|chief marketing officer|vp of marketing|head of marketing)\b/i, role: "Head of Marketing" },
  { pattern: /\b(cfo|chief financial officer|vp of finance|head of finance)\b/i, role: "CFO" },
  { pattern: /\b(coo|chief operating officer|vp of operations)\b/i, role: "COO" },
  { pattern: /\b(director of (engineering|product|marketing|sales|hr|finance))\b/i, role: "Director" },
  { pattern: /\b(senior (software |backend |frontend |full.?stack )?engineer)\b/i, role: "Senior Engineer" },
  { pattern: /\b(product manager|pm)\b/i, role: "Product Manager" },
  { pattern: /\b(devops|sre|site reliability|platform engineer)\b/i, role: "DevOps/SRE" },
  { pattern: /\b(data (scientist|engineer|analyst))\b/i, role: "Data Engineer" },
];

const COMPANY_PATTERNS = [
  /(?:at|@|for|from|work(?:ing)? (?:at|for)) ([A-Z][A-Za-z0-9\s&\-\.]{2,40}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?)?)/,
  /([A-Z][A-Za-z0-9\s&\-\.]{2,40}(?:Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?)) (?:is|are|has|uses|needs)/,
];

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  "SaaS": ["saas", "software as a service", "b2b software", "product-led", "plg"],
  "E-commerce": ["ecommerce", "e-commerce", "shopify", "woocommerce", "online store", "dtc", "direct to consumer"],
  "FinTech": ["fintech", "payments", "banking", "lending", "insurtech", "crypto", "defi", "accounting"],
  "HR Tech": ["hrtech", "hr tech", "hris", "payroll", "recruiting", "talent", "people ops", "workforce"],
  "Marketing": ["martech", "marketing tech", "demand generation", "growth", "seo", "paid ads", "campaigns"],
  "DevTools": ["developer tools", "devtools", "cli", "sdk", "api", "infrastructure", "platform"],
  "Healthcare": ["healthtech", "health tech", "medical", "clinical", "ehr", "hipaa"],
  "EdTech": ["edtech", "education", "lms", "learning management", "e-learning"],
  "PropTech": ["proptech", "real estate", "property", "mortgage"],
  "LegalTech": ["legaltech", "legal tech", "law firm", "compliance", "contracts"],
};

// ─── Scoring Engine ────────────────────────────────────────────────────────

export function scoreSignal(text: string): {
  score: number;
  signals: string[];
  keywordsMatched: string[];
  competitorMentioned: string | null;
  painPoint: string | null;
  isUrgent: boolean;
} {
  const lower = text.toLowerCase();
  let score = 0;
  const signals: string[] = [];
  const keywordsMatched: string[] = [];
  let competitorMentioned: string | null = null;
  let painPoint: string | null = null;
  let isUrgent = false;

  // +3 for explicit search intent
  if (ACTIVELY_SEARCHING.some(p => p.test(text))) {
    score += 3;
    signals.push("actively-searching");
  }

  // +2 for complaint
  if (COMPLAINING.some(p => p.test(text))) {
    score += 2;
    signals.push("complaint");
    // Extract pain point
    const match = text.match(/((?:frustrated|hate|can't|doesn't work|broken|bug|terrible|awful)[^.!?\n]{10,80})/i);
    if (match) painPoint = match[1].trim();
  }

  // +2 for competitor mention
  for (const comp of KNOWN_COMPETITORS) {
    if (lower.includes(comp)) {
      score += 2;
      competitorMentioned = comp;
      signals.push("competitor-trigger");
      break;
    }
  }

  // Also try regex-based competitor extraction
  if (!competitorMentioned) {
    for (const pattern of COMPETITOR_TRIGGERS) {
      const m = text.match(pattern);
      if (m) {
        const candidate = m[1]?.trim().toLowerCase();
        if (candidate && candidate.length > 2 && candidate.length < 30) {
          competitorMentioned = m[1].trim();
          score += 2;
          signals.push("competitor-trigger");
          break;
        }
      }
    }
  }

  // +2 for urgency
  if (URGENT.some(p => p.test(text))) {
    score += 2;
    isUrgent = true;
    signals.push("urgent");
  }

  // Match intent keywords
  for (const kw of INTENT_KEYWORDS) {
    if (lower.includes(kw)) {
      keywordsMatched.push(kw);
    }
  }
  if (keywordsMatched.length > 0) score += 1;

  return {
    score: Math.min(score, 10),
    signals,
    keywordsMatched: [...new Set(keywordsMatched)],
    competitorMentioned,
    painPoint,
    isUrgent,
  };
}

export function detectTechStack(text: string): string | null {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const [name, keywords] of Object.entries(TECH_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) found.push(name);
  }
  return found.length > 0 ? found.slice(0, 3).join(", ") : null;
}

export function detectIndustry(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) return industry;
  }
  return null;
}

export function extractDesignation(text: string): string | null {
  for (const { pattern, role } of DESIGNATION_PATTERNS) {
    if (pattern.test(text)) return role;
  }
  return null;
}

export function extractCompany(text: string): string | null {
  for (const pattern of COMPANY_PATTERNS) {
    const m = text.match(pattern);
    if (m?.[1]) {
      const company = m[1].trim().replace(/[.,;]+$/, "");
      if (company.length > 2 && company.length < 50) return company;
    }
  }
  return null;
}

export function buildOutreachAngle(
  painPoint: string | null,
  competitorMentioned: string | null,
  industry: string | null,
  signals: string[]
): string {
  if (signals.includes("switching") && competitorMentioned) {
    return `They're actively moving away from ${competitorMentioned} — lead with migration speed and zero downtime. Reference a case study from a similar company.`;
  }
  if (signals.includes("complaint") && painPoint) {
    return `Pain point detected: "${painPoint.slice(0, 80)}". Open with a direct solution to this specific problem — don't pitch features, pitch relief.`;
  }
  if (signals.includes("actively-searching")) {
    return `They're in active evaluation mode. Move fast — send a comparison that positions you favorably vs. what they're evaluating. Offer a live demo this week.`;
  }
  if (competitorMentioned) {
    return `${competitorMentioned} was mentioned in context. Use a battle card angle — lead with 3 specific advantages over ${competitorMentioned} relevant to their use case.`;
  }
  if (industry) {
    return `Tailor the pitch to ${industry} pain points. Reference a peer company in their space that solved the same problem.`;
  }
  return "Personalize outreach based on the raw signal — reference their exact post/comment to show you did your homework.";
}

// ─── Main conversion function ────────────────────────────────────────────

export function signalToLead(signal: RawSignal, projectId: string): DetectedLead & { projectId: string } {
  const fullText = `${signal.title}\n${signal.body}`;
  const { score, signals, keywordsMatched, competitorMentioned, painPoint } = scoreSignal(fullText);
  const tech = detectTechStack(fullText);
  const industry = detectIndustry(fullText);
  const designation = extractDesignation(fullText);
  const company = extractCompany(fullText);

  const outreachAngle = buildOutreachAngle(painPoint, competitorMentioned, industry, signals);

  const confidence = Math.min(
    100,
    40 +
      (score * 5) +
      (company ? 10 : 0) +
      (designation ? 5 : 0) +
      (tech ? 5 : 0) +
      (industry ? 5 : 0)
  );

  return {
    projectId,
    name: signal.author !== "[deleted]" && signal.author !== "AutoModerator" ? signal.author : null,
    designation,
    company,
    industry,
    location: null,
    sourceChannel: signal.channel,
    sourceUrl: signal.url,
    intentSignal: signals.join(", ") || "general-interest",
    intentScore: score,
    confidenceScore: confidence,
    painPoint,
    competitorMentioned,
    recommendedOutreachAngle: outreachAngle,
    rawEvidence: `[${signal.channel}] ${signal.title}\n\n${signal.body.slice(0, 600)}${signal.body.length > 600 ? "..." : ""}`,
    techStackDetected: tech,
    triggerEvent: signal.subreddit ? `Posted in r/${signal.subreddit}` : signal.channel,
    keywordsMatched,
  };
}
