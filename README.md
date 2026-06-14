# Briefcase
### GTM intelligence for modern sales teams

Briefcase is an AI-powered sales intelligence platform that helps GTM teams research prospects, generate tailored briefings, and draft outreach — before every call. It combines web research, company enrichment, compliance data, and large language models to turn a prospect's name and company into a fully structured briefing in under a minute.

## Modules

| Module | Description |
|--------|-------------|
| **Module 1 — Prospect Briefing Generator** | Researches a prospect via Tavily, Exa, CompanyLens, and HHS breach data, then generates a 9-section GTM briefing with LinkedIn note, cold email, and discovery questions |
| **Module 2 — Persona-Based Pitch Builder** | Generates tailored talking points, objection handling, and a language guide for a specific role (CISO, CFO, IT Admin, etc.) at a target company |
| **Module 3 — Discovery Call Debrief** | Paste raw call notes and get structured pain points, buying signals, objections, next steps, and a CRM-ready summary |
| **Module 4 — Champion Tracker** | Lightweight CRM view of active prospects and champions, with status tracking, last touchpoint, AI-suggested next actions, and HubSpot integration |
| **Module 5 — Customer Feedback Analyzer** | Analyzes B2C user feedback to surface themes, feature requests, and champions worth nurturing for B2C2B conversion |

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
| Module 1 — Prospect Briefing Generator | ✅ Complete |
| Module 2 — Persona-Based Pitch Builder | ✅ Complete |
| Module 3 — Discovery Call Debrief | ✅ Complete |
| Module 4 — Champion Tracker | 🔄 In progress |
| Module 5 — Customer Feedback Analyzer | 🔄 In progress |
