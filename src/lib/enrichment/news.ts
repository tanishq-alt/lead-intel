import { searchDDG } from "../scrapers/duckduckgo";

export interface NewsItem {
  title: string;
  url: string;
  snippet: string;
  isPositive: boolean; // funding, launch, partnership, award
  isFunding: boolean;
}

const FUNDING_SIGNALS = [
  /raised?\s+\$[\d.]+[mb]/i,
  /series\s+[a-f]\b/i,
  /seed\s+round/i,
  /\$[\d.]+[mb]\s+(?:in\s+)?funding/i,
  /secured?\s+\$[\d.]+/i,
  /valuation/i,
  /ipo|spac|public listing/i,
];

const POSITIVE_SIGNALS = [
  /launch(ed|es|ing)/i,
  /partnership|partnered/i,
  /award|recogni[sz]ed/i,
  /expan(d|ding|sion)/i,
  /acqui[rs](ed|ition)/i,
  /raise[sd]/i,
  /grow[sth]/i,
  /milestone/i,
];

export async function fetchCompanyNews(
  companyName: string,
  domain: string
): Promise<NewsItem[]> {
  const results: NewsItem[] = [];
  const seen = new Set<string>();

  // Query 1: funding news
  // Query 2: general news
  const queries = [
    `"${companyName}" raised funding 2024 OR 2025`,
    `"${companyName}" news announcement 2025`,
    `"${domain}" OR "${companyName}" launch partnership`,
  ];

  const fetches = queries.map((q) =>
    searchDDG(q, 5).then((items) => {
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        const text = `${item.title} ${item.snippet}`;
        const isFunding = FUNDING_SIGNALS.some((p) => p.test(text));
        const isPositive = isFunding || POSITIVE_SIGNALS.some((p) => p.test(text));
        results.push({ title: item.title, url: item.url, snippet: item.snippet, isPositive, isFunding });
      }
    }).catch(() => {})
  );

  await Promise.allSettled(fetches);

  // Sort: funding first, then positive, then rest
  results.sort((a, b) => {
    if (a.isFunding && !b.isFunding) return -1;
    if (!a.isFunding && b.isFunding) return 1;
    if (a.isPositive && !b.isPositive) return -1;
    return 0;
  });

  return results.slice(0, 5);
}

export function detectFundingStage(newsItems: NewsItem[]): string | null {
  for (const item of newsItems) {
    const text = `${item.title} ${item.snippet}`;
    const seriesM = text.match(/series\s+([a-f])\b/i);
    if (seriesM) return `Series ${seriesM[1].toUpperCase()}`;
    if (/seed\s+round|pre.seed/i.test(text)) return "Seed";
    if (/series\s+[a-f]/i.test(text)) return "Series";
    if (/ipo|public/i.test(text)) return "Public";
    if (/bootstrapped|self.funded/i.test(text)) return "Bootstrapped";
  }
  return null;
}
