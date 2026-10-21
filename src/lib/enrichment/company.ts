export interface CompanyInfo {
  name: string | null;
  description: string | null;
  tagline: string | null;
  industry: string | null;
  location: string | null;
  employeeRange: string | null;
  founded: string | null;
  emailPattern: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  facebookUrl: string | null;
  youtubeUrl: string | null;
  githubUrl: string | null;
  blogUrl: string | null;
  logoUrl: string | null;
}

function extractMeta(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1].trim().replace(/&amp;/g, "&").replace(/&#039;/g, "'");
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim().replace(/\s*[|\-–—]\s*.+$/, "").trim() ?? null;
}

function extractSocialLinks(html: string, domain: string): Partial<CompanyInfo> {
  const result: Partial<CompanyInfo> = {};
  const lower = html.toLowerCase();

  const liM = html.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/);
  if (liM) result.linkedinUrl = `https://www.linkedin.com/company/${liM[1]}`;

  const twM = html.match(/https?:\/\/(?:www\.)?(?:twitter|x)\.com\/([a-zA-Z0-9_]{1,15})(?:["\/\s]|$)/);
  if (twM && !["share", "intent", "home"].includes(twM[1].toLowerCase())) {
    result.twitterHandle = twM[1];
  }

  const fbM = html.match(/https?:\/\/(?:www\.)?facebook\.com\/([a-zA-Z0-9.\-_]+)(?:["\/\s]|$)/);
  if (fbM && !["sharer", "share", "plugins", "tr"].includes(fbM[1])) {
    result.facebookUrl = `https://www.facebook.com/${fbM[1]}`;
  }

  const ytM = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(?:c\/|channel\/|@)([a-zA-Z0-9\-_]+)/);
  if (ytM) result.youtubeUrl = `https://www.youtube.com/${ytM[1]}`;

  const ghM = html.match(/https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9\-]+)(?:["\/\s]|$)/);
  if (ghM && ghM[1] !== domain.split(".")[0]) result.githubUrl = `https://github.com/${ghM[1]}`;

  // Blog detection
  if (lower.includes(`${domain}/blog`)) result.blogUrl = `https://${domain}/blog`;
  else if (lower.includes("blog.")) {
    const bM = html.match(/(https?:\/\/blog\.[^\s"'<>]+)/);
    if (bM) result.blogUrl = bM[1].split(/['"<>]/)[0];
  }

  return result;
}

function guessEmailPattern(html: string, domain: string): string | null {
  // Look for visible emails
  const emailM = html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g);
  if (emailM) {
    const companyEmails = emailM.filter((e) => e.endsWith(`@${domain}`) && !e.startsWith("noreply"));
    if (companyEmails.length > 0) return companyEmails[0];
  }
  // Common patterns
  return `[first]@${domain}`;
}

function extractEmployeeRange(html: string): string | null {
  const patterns = [
    /(\d[\d,]+)\+?\s*(?:employees|team members|people)/i,
    /team of (\d[\d,]+)/i,
    /(1-10|11-50|51-200|201-500|501-1000|1001-5000|5000\+)\s*employees/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const n = parseInt(m[1].replace(/,/g, ""), 10);
      if (!isNaN(n)) {
        if (n < 10) return "1–10";
        if (n < 50) return "11–50";
        if (n < 200) return "51–200";
        if (n < 500) return "201–500";
        if (n < 1000) return "501–1,000";
        if (n < 5000) return "1,000–5,000";
        return "5,000+";
      }
      return m[1];
    }
  }
  return null;
}

function extractFounded(html: string): string | null {
  const m = html.match(/(?:founded|established|since|est\.?)\s*(?:in\s*)?(\d{4})/i);
  return m?.[1] ?? null;
}

function extractLocation(html: string): string | null {
  const m = extractMeta(html, "geo.placename") ??
    html.match(/(?:headquartered|based|located)\s+in\s+([A-Z][A-Za-z\s,]{3,40})/i)?.[1] ?? null;
  return m?.trim().slice(0, 50) ?? null;
}

const INDUSTRY_SIGNALS: [RegExp, string][] = [
  [/saas|software as a service|b2b software|product.led/i, "SaaS"],
  [/ecommerce|e-commerce|online store|shopify|woocommerce/i, "E-commerce"],
  [/fintech|payments|banking|lending|crypto|defi/i, "FinTech"],
  [/hrtech|hr tech|hris|payroll|recruiting|talent|workforce/i, "HR Tech"],
  [/martech|marketing tech|demand gen|seo|paid ads|advertising/i, "Marketing Tech"],
  [/devtools|developer tools|api platform|sdk|infrastructure/i, "Dev Tools"],
  [/healthtech|health tech|medical|clinical|ehr|hipaa/i, "HealthTech"],
  [/edtech|education|lms|learning management/i, "EdTech"],
  [/proptech|real estate|property|mortgage/i, "PropTech"],
  [/legaltech|law firm|compliance|contracts/i, "LegalTech"],
  [/logistics|supply chain|warehouse|shipping|freight/i, "Logistics"],
  [/cybersecurity|security|threat detection|zero trust/i, "Cybersecurity"],
  [/analytics|data platform|business intelligence|bi tool/i, "Analytics"],
  [/ai|machine learning|llm|generative ai|nlp/i, "AI / ML"],
];

function detectIndustry(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [pattern, label] of INDUSTRY_SIGNALS) {
    if (pattern.test(lower)) return label;
  }
  return null;
}

export async function scrapeCompanyInfo(domain: string): Promise<CompanyInfo> {
  const blank: CompanyInfo = {
    name: null, description: null, tagline: null, industry: null,
    location: null, employeeRange: null, founded: null,
    emailPattern: null, linkedinUrl: null, twitterHandle: null,
    facebookUrl: null, youtubeUrl: null, githubUrl: null,
    blogUrl: null, logoUrl: null,
  };

  try {
    const res = await fetch(`https://${domain}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return blank;
    const html = await res.text();
    const text = `${extractMeta(html, "og:title") ?? ""} ${extractTitle(html) ?? ""} ${extractMeta(html, "description") ?? ""} ${extractMeta(html, "og:description") ?? ""}`;

    const name =
      extractMeta(html, "og:site_name") ??
      extractMeta(html, "application-name") ??
      extractTitle(html);

    const description =
      extractMeta(html, "og:description") ??
      extractMeta(html, "description") ??
      extractMeta(html, "twitter:description");

    const tagline =
      extractMeta(html, "og:title") !== name
        ? extractMeta(html, "og:title")
        : null;

    const logoUrl =
      extractMeta(html, "og:image") ??
      extractMeta(html, "twitter:image") ?? null;

    const social = extractSocialLinks(html, domain);

    return {
      name: name?.slice(0, 100) ?? null,
      description: description?.slice(0, 300) ?? null,
      tagline: tagline?.slice(0, 150) ?? null,
      industry: detectIndustry(text + " " + (html.slice(0, 5000))),
      location: extractLocation(html),
      employeeRange: extractEmployeeRange(html),
      founded: extractFounded(html),
      emailPattern: guessEmailPattern(html, domain),
      logoUrl: logoUrl ?? null,
      linkedinUrl: social.linkedinUrl ?? null,
      twitterHandle: social.twitterHandle ?? null,
      facebookUrl: social.facebookUrl ?? null,
      youtubeUrl: social.youtubeUrl ?? null,
      githubUrl: social.githubUrl ?? null,
      blogUrl: social.blogUrl ?? null,
    };
  } catch {
    return blank;
  }
}
