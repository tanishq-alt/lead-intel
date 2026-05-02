export enum ChannelType {
  GOOGLE = "GOOGLE",
  REDDIT = "REDDIT",
  LINKEDIN_POSTS = "LINKEDIN_POSTS",
  LINKEDIN_JOBS = "LINKEDIN_JOBS",
  TWITTER = "TWITTER",
  PRODUCT_HUNT = "PRODUCT_HUNT",
  G2 = "G2",
  CAPTERRA = "CAPTERRA",
  INDEED = "INDEED",
  GLASSDOOR = "GLASSDOOR",
  CRUNCHBASE = "CRUNCHBASE",
  HACKER_NEWS = "HACKER_NEWS",
  GITHUB_ISSUES = "GITHUB_ISSUES",
  STACKOVERFLOW = "STACKOVERFLOW",
  QUORA = "QUORA",
  YOUTUBE = "YOUTUBE",
  NEWS = "NEWS",
  RFP = "RFP",
  CUSTOM = "CUSTOM",
}

export enum AgentRole {
  QUEEN_COORDINATOR = "queen-coordinator",
  CHANNEL_RESEARCHER = "channel-researcher",
  SIGNAL_HUNTER = "signal-hunter",
  DATA_EXTRACTOR = "data-extractor",
  LEAD_QUALIFIER = "lead-qualifier",
  ENRICHMENT_AGENT = "enrichment-agent",
  MEMORY_SPECIALIST = "memory-specialist",
}

export type CompanySize = "STARTUP" | "SMB" | "MID_MARKET" | "ENTERPRISE";
export type LeadStatus = "NEW" | "SAVED" | "REJECTED" | "EXPORTED" | "CONTACTED";
export type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type Frequency = "HOURLY" | "DAILY" | "WEEKLY";
export type PatternType =
  | "CHANNEL_PERFORMANCE"
  | "KEYWORD_CONVERSION"
  | "COMPETITOR_TRIGGER"
  | "PAIN_POINT"
  | "FALSE_POSITIVE"
  | "INTENT_SCORING";
export type ExportFormat = "CSV" | "JSON";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Channel {
  id: string;
  projectId: string;
  name: ChannelType;
  url?: string | null;
  isEnabled: boolean;
  frequency: Frequency;
  maxPages: number;
  geoFilter?: string | null;
  nicheFilter?: string | null;
  createdAt: Date;
}

export interface ScrapRun {
  id: string;
  projectId: string;
  status: RunStatus;
  channelsUsed: string[];
  startedAt: Date;
  completedAt?: Date | null;
  leadsFound: number;
  errors: string[];
  blockedSources: string[];
  costEstimate?: number | null;
  agentDecisions: Record<string, unknown>;
  createdAt: Date;
}

export interface Lead {
  id: string;
  projectId: string;
  scrapRunId?: string | null;
  name?: string | null;
  designation?: string | null;
  company?: string | null;
  industry?: string | null;
  companySize?: CompanySize | null;
  location?: string | null;
  country?: string | null;
  city?: string | null;
  sourceChannel: string;
  sourceUrl: string;
  intentSignal: string;
  intentScore: number;
  confidenceScore: number;
  painPoint?: string | null;
  competitorMentioned?: string | null;
  recommendedOutreachAngle?: string | null;
  rawEvidence: string;
  techStackDetected?: string | null;
  triggerEvent?: string | null;
  keywordsMatched: string[];
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
  leadSources?: LeadSource[];
}

export interface LeadSource {
  id: string;
  leadId: string;
  channel: string;
  url: string;
  snippet: string;
  foundAt: Date;
}

export interface MemoryPattern {
  id: string;
  projectId: string;
  patternType: PatternType;
  data: Record<string, unknown>;
  score: number;
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadFilters {
  search?: string;
  industry?: string[];
  companySize?: CompanySize[];
  country?: string;
  city?: string;
  jobTitle?: string;
  seniority?: string;
  department?: string;
  intentScore?: number;
  confidenceScore?: number;
  sourceChannel?: string;
  competitorMentioned?: string;
  painPoint?: string;
  techStackDetected?: string;
  status?: LeadStatus;
  dateRange?: "7d" | "30d" | "all";
  fundingSignal?: boolean;
  hiringSignal?: boolean;
  expansionSignal?: boolean;
  rfpSignal?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SwarmConfig {
  topology: "hierarchical" | "mesh" | "ring";
  maxAgents: number;
  strategy: "specialized" | "generalist";
  consensus?: "weighted" | "majority";
}

export interface DashboardStats {
  totalLeads: number;
  highIntentLeads: number;
  avgIntentScore: number;
  bestChannel: string;
  latestRuns: ScrapRun[];
  conversionReadyLeads: number;
  failedRuns: number;
  leadsByChannel: { channel: string; count: number }[];
  leadsByIndustry: { industry: string; count: number }[];
  recentLeads: Lead[];
}

export interface IntentScoreWeights {
  explicitSearch: number;
  complaint: number;
  competitorMention: number;
  urgency: number;
  roleRelevance: number;
}
