import { detectTechStack } from "../scrapers/techdetect";
import { scrapeCompanyInfo } from "./company";
import { fetchCompanyNews, detectFundingStage } from "./news";
import { fetchCompanyJobs } from "./jobs";

export interface EnrichedCompany {
  domain: string;

  // Company basics
  companyName: string | null;
  description: string | null;
  tagline: string | null;
  industry: string | null;
  location: string | null;
  employeeRange: string | null;
  founded: string | null;
  logoUrl: string | null;

  // Contact
  emailPattern: string | null;
  linkedinUrl: string | null;
  twitterHandle: string | null;
  githubUrl: string | null;

  // Tech stack
  cms: string | null;
  framework: string | null;
  analytics: string[];
  crm: string | null;
  marketing: string[];
  hosting: string | null;
  adtech: string[];
  ecommerce: string | null;
  chatSupport: string | null;
  allTech: string[];

  // Jobs
  jobCount: number;
  hiringRoles: string[];
  toolsSignaled: string[];
  growthSignals: string[];

  // News
  recentNews: { title: string; url: string; snippet: string; isFunding: boolean }[];
  fundingStage: string | null;
  isFundingSignal: boolean;

  // Derived buy signals
  buySignals: string[];
  intentScore: number; // 0–10

  enrichedAt: string;
  enrichError: string | null;
}

function computeBuySignals(data: Partial<EnrichedCompany>): { signals: string[]; score: number } {
  const signals: string[] = [];
  let score = 0;

  if (data.isFundingSignal) { signals.push("Recently funded"); score += 3; }
  if (data.fundingStage && ["Seed", "Series A", "Series B"].includes(data.fundingStage)) {
    signals.push(`${data.fundingStage} stage`);
    score += 2;
  }
  if (data.growthSignals && data.growthSignals.length > 0) {
    signals.push("Hiring senior GTM roles");
    score += 2;
  }
  if (data.jobCount && data.jobCount > 5) {
    signals.push(`Actively hiring (${data.jobCount} open roles)`);
    score += 1;
  }
  if (data.toolsSignaled && data.toolsSignaled.length > 0) {
    signals.push(...data.toolsSignaled.slice(0, 2));
  }
  if (data.crm) { signals.push(`CRM: ${data.crm}`); }
  if (data.ecommerce) { signals.push(`E-com: ${data.ecommerce}`); score += 1; }
  if (data.chatSupport) { signals.push(`Chat: ${data.chatSupport}`); }

  // Stack recency signals
  if (data.framework && ["Next.js", "Nuxt.js", "Svelte"].includes(data.framework)) {
    signals.push("Modern tech stack");
    score += 1;
  }

  return { signals: [...new Set(signals)], score: Math.min(score, 10) };
}

export async function enrichDomain(domain: string): Promise<EnrichedCompany> {
  const clean = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();

  const blank: EnrichedCompany = {
    domain: clean, companyName: null, description: null, tagline: null,
    industry: null, location: null, employeeRange: null, founded: null,
    logoUrl: null, emailPattern: null, linkedinUrl: null, twitterHandle: null,
    githubUrl: null, cms: null, framework: null, analytics: [], crm: null,
    marketing: [], hosting: null, adtech: [], ecommerce: null, chatSupport: null,
    allTech: [], jobCount: 0, hiringRoles: [], toolsSignaled: [], growthSignals: [],
    recentNews: [], fundingStage: null, isFundingSignal: false,
    buySignals: [], intentScore: 0, enrichedAt: new Date().toISOString(), enrichError: null,
  };

  try {
    // Run all enrichment in parallel
    const [tech, company, news, jobs] = await Promise.allSettled([
      detectTechStack(clean),
      scrapeCompanyInfo(clean),
      (async () => {
        // Need company name first for good news queries — use domain as fallback
        const fallbackName = clean.split(".")[0];
        return fetchCompanyNews(fallbackName, clean);
      })(),
      fetchCompanyJobs(clean.split(".")[0], clean),
    ]);

    const techData = tech.status === "fulfilled" ? tech.value : null;
    const companyData = company.status === "fulfilled" ? company.value : null;
    const newsData = news.status === "fulfilled" ? news.value : [];
    const jobsData = jobs.status === "fulfilled" ? jobs.value : { jobCount: 0, hiringRoles: [], toolsSignaled: [], growthSignals: [], topJobTitles: [] };

    // If we got a company name, re-fetch news with the real name
    let betterNews = newsData;
    if (companyData?.name && companyData.name !== clean.split(".")[0]) {
      try {
        betterNews = await fetchCompanyNews(companyData.name, clean);
      } catch {
        // keep original
      }
    }

    const isFundingSignal = betterNews.some((n) => n.isFunding);
    const fundingStage = detectFundingStage(betterNews);
    const industryFinal = companyData?.industry ?? null;

    const partial: Partial<EnrichedCompany> = {
      isFundingSignal,
      fundingStage,
      growthSignals: jobsData.growthSignals,
      jobCount: jobsData.jobCount,
      toolsSignaled: jobsData.toolsSignaled,
      crm: techData?.crm ?? null,
      ecommerce: techData?.ecommerce ?? null,
      chatSupport: techData?.chatSupport ?? null,
      framework: techData?.framework ?? null,
    };

    const { signals, score } = computeBuySignals(partial);

    return {
      ...blank,
      domain: clean,

      // Company
      companyName: companyData?.name ?? null,
      description: companyData?.description ?? null,
      tagline: companyData?.tagline ?? null,
      industry: industryFinal,
      location: companyData?.location ?? null,
      employeeRange: companyData?.employeeRange ?? null,
      founded: companyData?.founded ?? null,
      logoUrl: companyData?.logoUrl ?? null,

      // Contact
      emailPattern: companyData?.emailPattern ?? null,
      linkedinUrl: companyData?.linkedinUrl ?? null,
      twitterHandle: companyData?.twitterHandle ?? null,
      githubUrl: companyData?.githubUrl ?? null,

      // Tech
      cms: techData?.cms ?? null,
      framework: techData?.framework ?? null,
      analytics: techData?.analytics ?? [],
      crm: techData?.crm ?? null,
      marketing: techData?.marketing ?? [],
      hosting: techData?.hosting ?? null,
      adtech: techData?.adtech ?? [],
      ecommerce: techData?.ecommerce ?? null,
      chatSupport: techData?.chatSupport ?? null,
      allTech: techData?.technologies ?? [],

      // Jobs
      jobCount: jobsData.jobCount,
      hiringRoles: jobsData.hiringRoles,
      toolsSignaled: jobsData.toolsSignaled,
      growthSignals: jobsData.growthSignals,

      // News
      recentNews: betterNews.map((n) => ({ title: n.title, url: n.url, snippet: n.snippet, isFunding: n.isFunding })),
      fundingStage,
      isFundingSignal,

      // Derived
      buySignals: signals,
      intentScore: score,

      enrichedAt: new Date().toISOString(),
      enrichError: null,
    };
  } catch (err) {
    return { ...blank, enrichError: String(err) };
  }
}
