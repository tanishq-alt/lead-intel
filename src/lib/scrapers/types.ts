export interface RawSignal {
  id: string;
  title: string;
  body: string;
  author: string;
  authorUrl?: string;
  url: string;
  channel: string;
  subreddit?: string;
  score?: number;
  commentCount?: number;
  createdAt: Date;
  tags?: string[];
  competitorName?: string;
}

export interface DetectedLead {
  name: string | null;
  designation: string | null;
  company: string | null;
  industry: string | null;
  location: string | null;
  sourceChannel: string;
  sourceUrl: string;
  intentSignal: string;
  intentScore: number;
  confidenceScore: number;
  painPoint: string | null;
  competitorMentioned: string | null;
  recommendedOutreachAngle: string | null;
  rawEvidence: string;
  techStackDetected: string | null;
  triggerEvent: string | null;
  keywordsMatched: string[];
}

export interface ScrapeConfig {
  keywords?: string[];
  competitors?: string[];
  industries?: string[];
  maxResults?: number;
  geo?: string;
  dateRange?: "today" | "7d" | "30d" | "90d" | "all";
  customUrls?: string[];
}

export type ScraperChannel =
  | "REDDIT"
  | "HACKER_NEWS"
  | "GITHUB_ISSUES"
  | "STACKOVERFLOW"
  | "YOUTUBE"
  | "TWITTER"
  | "JOBS"
  | "DEV_TO"
  | "PRODUCT_HUNT"
  | "LINKEDIN"
  | "FACEBOOK_GROUPS"
  | "QUORA"
  | "G2"
  | "MEDIUM"
  | "CHANGELOG"
  | "CUSTOM"
  | "ALL";
