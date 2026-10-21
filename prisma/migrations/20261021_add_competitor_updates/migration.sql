-- AlterTable Competitor: add new fields
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "domain" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "relationship" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "linkedinSlug" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "twitterHandle" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "productHuntSlug" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "youtubeHandle" TEXT;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Competitor" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable CompetitorUpdate
CREATE TABLE IF NOT EXISTS "CompetitorUpdate" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "updateType" TEXT NOT NULL,
    "leadMagnetType" TEXT,
    "engagementScore" INTEGER NOT NULL DEFAULT 0,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "CompetitorUpdate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey CompetitorUpdate -> Competitor
ALTER TABLE "CompetitorUpdate" ADD CONSTRAINT "CompetitorUpdate_competitorId_fkey"
    FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey CompetitorUpdate -> Project
ALTER TABLE "CompetitorUpdate" ADD CONSTRAINT "CompetitorUpdate_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CompetitorUpdate_competitorId_idx" ON "CompetitorUpdate"("competitorId");
CREATE INDEX IF NOT EXISTS "CompetitorUpdate_projectId_idx" ON "CompetitorUpdate"("projectId");
CREATE INDEX IF NOT EXISTS "CompetitorUpdate_updateType_idx" ON "CompetitorUpdate"("updateType");
CREATE INDEX IF NOT EXISTS "CompetitorUpdate_scrapedAt_idx" ON "CompetitorUpdate"("scrapedAt");
