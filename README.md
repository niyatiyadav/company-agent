# Company Research Agent

Type a company name or ticker and get back a clean, analyst-style summary —
description, sector, revenue, EBITDA, market price, market cap, and P/E —
pulled from live financial data and formatted by Claude.

## How it works

```
User Input (ticker/name)
        ↓
[1] Data Layer — Financial Modeling Prep (FMP) API
    → resolves name to ticker, fetches profile + financials + quote
        ↓
[2] Intelligence Layer — Anthropic API (Claude)
    → takes the raw JSON and writes a clean, readable summary
        ↓
[3] Presentation Layer — React (Vite) frontend
    → input box, loading state, formatted result card
```

Claude never guesses financial numbers — it only formats numbers fetched
from FMP, which is what makes the output trustworthy rather than a
hallucination risk.

**Both external API calls run server-side**, in Vercel serverless functions
under [`/api`](api), so the FMP and Anthropic API keys are never sent to the
browser or visible in page source:

- [`api/financial-data.js`](api/financial-data.js) — resolves the ticker and fetches profile/quote/income data from FMP
- [`api/summarize.js`](api/summarize.js) — sends that data to Claude for formatting

The frontend (`src/api/financialData.js`, `src/api/summarize.js`) only calls
these two endpoints on our own domain.

## Local setup

```bash
npm install
cp .env.example .env   # then paste in your real keys
```

Get keys from:
- FMP: financialmodelingprep.com → Dashboard → API key (free tier: 250 calls/day)
- Anthropic: console.anthropic.com → Settings → API Keys

### Running locally

```bash
npm run dev
```

This starts the Vite frontend only, at `http://localhost:5173`. It's the
fastest way to confirm the app builds and boots, but calls to `/api/*` will
404 here because Vite's dev server doesn't run serverless functions.

To test the full app (frontend + serverless functions) locally the same way
it will run on Vercel:

```bash
npm run dev:full
```

This runs `vercel dev`, which serves the React app and executes the `/api`
functions locally, reading keys from your `.env` file. The first run will
ask you to log in to Vercel and link/create a project — safe to do, it does
not deploy anything.

## Deploying

1. Push this repo to GitHub.
2. On vercel.com, "Import Project" and select the repo (Vercel auto-detects
   the Vite frontend and the `/api` serverless functions — no config needed).
3. In the Vercel project's Settings → Environment Variables, add:
   - `VITE_FMP_API_KEY`
   - `VITE_ANTHROPIC_API_KEY`
4. Deploy. Vercel gives you a live URL (e.g. `company-agent.vercel.app`).

## Notes

- FMP's free tier caps at 250 calls/day; both `/api` routes return a JSON
  `{ error }` body with a non-2xx status if a call fails, so the UI can fail
  gracefully instead of crashing.
- The `VITE_` prefix on the env var names is kept only for continuity with
  the original build guide. These values are read via `process.env` inside
  `/api` functions (server-side, Node), never via `import.meta.env` in any
  file under `src/` — so they are never bundled into the browser build.
