/**
 * Builds targeted search queries by combining niche keywords with
 * buying-intent templates. This ensures searches return posts where
 * people are LOOKING for solutions in the user's niche, not just
 * any post mentioning the keyword.
 */

const INTENT_TEMPLATES = [
  "{k} alternative",
  "alternatives to {k}",
  "switching from {k}",
  "replace {k}",
  "best {k} tool",
  "recommend {k} software",
  "frustrated with {k}",
  "{k} too expensive",
  "looking for {k}",
  "migrating from {k}",
  "{k} vs",
  "best alternative to {k}",
  "moved away from {k}",
  "{k} recommendation",
];

const COMPETITOR_TEMPLATES = [
  "alternative to {c}",
  "switching from {c}",
  "migrating from {c}",
  "{c} alternatives",
  "{c} too expensive",
  "replace {c}",
  "moved away from {c}",
  "left {c} for",
  "{c} vs",
];

export function buildQueriesFromNiche(
  keywords: string[],
  competitors: string[] = [],
  maxQueries = 8
): string[] {
  const queries: string[] = [];

  for (const kw of keywords) {
    const k = kw.trim().toLowerCase();
    if (!k) continue;
    for (const tmpl of INTENT_TEMPLATES) {
      queries.push(tmpl.replace("{k}", k));
    }
  }

  for (const comp of competitors) {
    const c = comp.trim().toLowerCase();
    if (!c) continue;
    for (const tmpl of COMPETITOR_TEMPLATES) {
      queries.push(tmpl.replace("{c}", c));
    }
  }

  // Deduplicate and cap
  return [...new Set(queries)].slice(0, maxQueries);
}

// If no keywords or competitors provided, these generic queries are used as fallback
export const FALLBACK_QUERIES = [
  "looking for software alternative",
  "recommend a tool for",
  "alternatives to",
  "switching from",
  "frustrated with",
  "too expensive alternative",
  "what tool do you use for",
  "best SaaS for",
];
