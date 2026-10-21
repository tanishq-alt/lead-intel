# Lead Intel

Live competitor intelligence + B2B lead generation across 15+ platforms. Tracks product updates, feature launches, lead magnets, and buying-intent signals from Reddit, LinkedIn, Twitter, YouTube, GitHub, ProductHunt, G2, HackerNews, Medium, DevTo, Quora, and competitor RSS/changelog feeds.

Built for HR Cloud to monitor 128 HR tech competitors (BambooHR, Rippling, Deel, Workday, etc.) and surface high-intent prospects in real time.

## What it does

- **Competitor tracker** — monitors every competitor across 8 social platforms, auto-detects lead magnets (ebooks, webinars, templates, free trials) and classifies posts (`PRODUCT_UPDATE` / `FEATURE_LAUNCH` / `LEAD_MAGNET` / `ANNOUNCEMENT` / `SOCIAL_POST`)
- **Live lead scraper** — Clay-style interface, hits all platforms simultaneously, scores intent 0-10 with pattern-matched signals (actively-searching, complaint, urgency, competitor-mention)
- **RSS/changelog auto-detection** — tries 12 common feed URLs per competitor domain, parses homepage `<link rel=alternate>` tags
- **Enrichment pipeline** — company data + tech detection + email finder
- **Memory layer** — pattern storage so the system learns what converts

## Quick start

```bash
# 1. Install
npm install

# 2. Database (Postgres required)
createdb lead_intel
cp .env.example .env   # then edit DATABASE_URL
npx prisma db push

# 3. Run
npm run dev
# → http://localhost:3000
```

## Environment variables

Required:
```
DATABASE_URL="postgresql://user@localhost:5432/lead_intel?schema=public"
```

Optional (dramatically improves data quality):
```
GITHUB_TOKEN=ghp_...              # 60/hr → 5000/hr, unlocks GraphQL Discussions
LINKEDIN_COOKIE=                   # li_at cookie from linkedin.com → enables Voyager API
TWITTER_BEARER_TOKEN=              # falls back to public guest token if empty
YOUTUBE_API_KEY=                   # YouTube Data API v3 for better search + dates
```

## Seeding competitors

Load the 128 HR tech competitors from the master roster:

```bash
# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"HR Cloud Intel"}'

# Seed competitors
curl -X POST http://localhost:3000/api/competitors/seed \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"<project-id-from-above>"}'

# Fire the full scan
curl -X POST http://localhost:3000/api/competitors/scrape \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"<project-id>"}'
```

Then open **http://localhost:3000/competitors** to browse the feed.

## Platform-specific notes

| Platform | Method | Needs auth? |
|----------|--------|-------------|
| Reddit | reddit.com `.json` endpoints | No |
| HackerNews | Algolia search API | No |
| GitHub | REST + GraphQL (Discussions) | Optional (rate limits) |
| ProductHunt | Public GraphQL frontend endpoint | No |
| Twitter | Guest token flow + syndication timeline | Optional |
| LinkedIn | Voyager `updatesV2` API | Yes (li_at cookie) |
| YouTube | Innertube + Data API v3 | Optional (better dates) |
| Medium | Direct RSS feeds | No |
| G2/Capterra | `/products/{slug}/reviews.json` + HTML | No |
| Changelog/RSS | Auto-detect 12 common paths + `<link>` tag | No |

## Architecture

```
src/
├── app/
│   ├── competitors/      # Competitor intel dashboard
│   ├── clay/             # Live lead scraper (no DB)
│   ├── leads/            # Saved leads with filters
│   ├── enrich/           # Company enrichment
│   └── api/
│       ├── competitors/  # /seed /scrape /updates /import
│       ├── scrape/live   # On-demand scraping
│       └── enrich/       # Enrichment endpoints
├── lib/
│   ├── scrapers/         # 15+ platform scrapers
│   │   ├── competitor-tracker.ts   # Fans out across all channels per competitor
│   │   ├── changelog.ts            # RSS/Atom auto-detect
│   │   └── index.ts                # Orchestrator
│   ├── intent.ts         # Pattern-based intent scoring (0-10)
│   └── enrichment/       # Company/jobs/news enrichment
└── prisma/schema.prisma  # Lead, Competitor, CompetitorUpdate, etc.
```

## Database

Postgres via Prisma. Core models:
- `Project` — scoping container
- `Competitor` + `CompetitorUpdate` — tracked companies and their updates
- `Lead` + `LeadSource` — intent-scored prospects
- `ScrapRun` + `AgentLog` — observability
- `MemoryPattern` — learned patterns for routing

## License

Private project — not for external distribution.
