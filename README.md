# Briefcase
### GTM intelligence for modern sales teams

Briefcase is an AI-powered sales intelligence platform that helps GTM teams research prospects, generate tailored briefings, and draft outreach — before every call. It combines web research, company enrichment, compliance data, and large language models to turn a prospect's name and company into a fully structured briefing in under a minute.

## Modules

| Module | Description |
|--------|-------------|
| **Module 1 — Prospect Briefing Generator** | Researches a prospect across the web, enriches company data, checks breach history, and generates a tailored GTM briefing with outreach copy |
| **Module 2 — ICP Scoring Engine** | Scores inbound leads against your ideal customer profile using enriched firmographic and technographic signals |
| **Module 3 — Outreach Sequencer** | Generates multi-step email and LinkedIn sequences personalized to each prospect's role, company, and pain points |
| **Module 4 — Call Intelligence** | Summarizes sales calls, extracts action items, and maps conversation themes to product value props |
| **Module 5 — Pipeline Dashboard** | Tracks prospect status, outreach activity, and briefing history with CRM-style views and Sheets sync |

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **AI:** Gemini 2.5 Flash (Google Generative Language API)
- **Research:** Tavily Search API, Exa Neural Search
- **Enrichment:** CompanyLens (RapidAPI)
- **Compliance Data:** Supabase (HHS breach records)
- **CRM Integration:** Google Sheets API (OAuth 2.0)
- **Deployment:** Vercel

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-username/briefcase.git
cd briefcase

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
```

Add the following keys to `.env.local`:

```
VITE_GEMINI_API_KEY=         # Google AI Studio
VITE_TAVILY_API_KEY=         # Tavily Search
VITE_EXA_API_KEY=            # Exa Neural Search
VITE_RAPIDAPI_KEY=           # RapidAPI (CompanyLens)
VITE_SUPABASE_URL=           # Supabase project URL
VITE_SUPABASE_ANON_KEY=      # Supabase anon key
VITE_GOOGLE_CLIENT_ID=       # Google OAuth 2.0 client ID
VITE_GOOGLE_SHEETS_ID=       # Target Google Sheet ID
VITE_APOLLO_API_KEY=         # Apollo.io (upcoming)
```

```bash
# 4. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Status

| Module | Status |
|--------|--------|
| Module 1 — Prospect Briefing Generator | Complete |
| Module 2 — ICP Scoring Engine | In progress |
| Module 3 — Outreach Sequencer | In progress |
| Module 4 — Call Intelligence | In progress |
| Module 5 — Pipeline Dashboard | In progress |
