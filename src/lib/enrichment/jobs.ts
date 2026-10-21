import { searchDDG } from "../scrapers/duckduckgo";

export interface JobSignal {
  title: string;
  url: string;
  snippet: string;
}

// Roles that signal what tools a company uses
const TOOL_SIGNAL_ROLES: [RegExp, string][] = [
  [/salesforce\s+admin|sfdc|salesforce\s+developer/i, "Uses Salesforce"],
  [/hubspot/i, "Uses HubSpot"],
  [/zendesk/i, "Uses Zendesk"],
  [/workday/i, "Uses Workday"],
  [/sap\b/i, "Uses SAP"],
  [/netsuite/i, "Uses NetSuite"],
  [/marketo/i, "Uses Marketo"],
  [/jira|confluence|atlassian/i, "Uses Atlassian"],
  [/snowflake/i, "Uses Snowflake"],
  [/databricks/i, "Uses Databricks"],
  [/aws\s+cloud|aws\s+architect/i, "Uses AWS"],
  [/gcp|google\s+cloud/i, "Uses GCP"],
  [/azure/i, "Uses Azure"],
  [/shopify/i, "Uses Shopify"],
  [/stripe/i, "Uses Stripe"],
  [/intercom/i, "Uses Intercom"],
];

// Roles that signal growth / buying intent
const GROWTH_SIGNAL_ROLES = [
  /head of sales|vp of sales|chief revenue/i,
  /revenue operations|revops/i,
  /demand generation|growth (hacker|engineer|marketer)/i,
  /chief marketing|vp of marketing/i,
  /partnerships manager/i,
  /customer success manager/i,
  /solutions engineer|sales engineer/i,
  /head of product|vp of product/i,
];

export interface JobsEnrichment {
  jobCount: number;
  hiringRoles: string[];
  toolsSignaled: string[];
  growthSignals: string[];
  topJobTitles: string[];
}

export async function fetchCompanyJobs(
  companyName: string,
  domain: string
): Promise<JobsEnrichment> {
  const jobSignals: JobSignal[] = [];
  const seen = new Set<string>();

  const queries = [
    `site:linkedin.com/jobs "${companyName}" hiring`,
    `"${companyName}" jobs hiring site:greenhouse.io OR site:lever.co OR site:ashbyhq.com`,
    `"${companyName}" OR "${domain}" jobs 2025`,
  ];

  const fetches = queries.map((q) =>
    searchDDG(q, 8).then((items) => {
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        jobSignals.push({ title: item.title, url: item.url, snippet: item.snippet });
      }
    }).catch(() => {})
  );

  // Also try RemoteOK
  fetches.push(
    fetch(`https://remoteok.com/api?tag=${encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, "-"))}`, {
      headers: { Accept: "application/json", "User-Agent": "LeadIntel/1.0" },
      signal: AbortSignal.timeout(6000),
    })
      .then((r) => r.json())
      .then((data: Array<{ position?: string; company?: string; description?: string; url?: string }>) => {
        if (!Array.isArray(data)) return;
        for (const job of data.slice(1, 6)) {
          if (!job.url || !job.position) continue;
          if (!job.company?.toLowerCase().includes(companyName.toLowerCase().slice(0, 5))) continue;
          const url = String(job.url);
          if (seen.has(url)) continue;
          seen.add(url);
          jobSignals.push({ title: job.position, url, snippet: job.description?.slice(0, 200) ?? "" });
        }
      })
      .catch(() => {})
  );

  await Promise.allSettled(fetches);

  const toolsSignaled = new Set<string>();
  const growthSignals: string[] = [];
  const topJobTitles: string[] = [];

  for (const job of jobSignals) {
    const text = `${job.title} ${job.snippet}`;

    for (const [pattern, signal] of TOOL_SIGNAL_ROLES) {
      if (pattern.test(text)) toolsSignaled.add(signal);
    }

    for (const pattern of GROWTH_SIGNAL_ROLES) {
      if (pattern.test(text)) {
        const m = text.match(pattern);
        if (m) growthSignals.push(m[0]);
      }
    }

    if (job.title && topJobTitles.length < 5) topJobTitles.push(job.title);
  }

  const hiringRoles = [...new Set([...topJobTitles])].slice(0, 5);

  return {
    jobCount: jobSignals.length,
    hiringRoles,
    toolsSignaled: [...toolsSignaled],
    growthSignals: [...new Set(growthSignals)].slice(0, 3),
    topJobTitles,
  };
}
