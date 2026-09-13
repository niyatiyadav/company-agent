# Company Research Agent

Type a company name or ticker and get back a clean summary — description,
sector, revenue, EBITDA, market price, market cap, and P/E — pulled from
live financial data.

## How it works

```
User Input (ticker/name)
        ↓
[1] Data Layer — Financial Modeling Prep (FMP) API
    → resolves name to ticker, fetches profile + financials + quote
        ↓
[2] Presentation Layer — React (Vite) frontend
    → input box, loading state, formatted result card
```

No numbers are guessed or invented — everything shown (price, market cap,
revenue, EBITDA, P/E, and the company description) comes straight from FMP.

**The FMP call runs server-side**, in a Vercel serverless function at
[`api/financial-data.js`](api/financial-data.js), so the FMP API key is
never sent to the browser or visible in page source. The frontend
([`src/api/financialData.js`](src/api/financialData.js)) only calls that
one endpoint on our own domain.

> **Optional: AI-written summary.** The original build guide this project
> is based on adds a second layer — sending the fetched data to Claude
> (Anthropic API) to write an analyst-style prose summary instead of showing
> the raw FMP description. That step is not wired up here (it needs a paid
> Anthropic API key), but the app is fully functional without it. To add it
> back: create `api/summarize.js` (a serverless function that POSTs the
> company data to `https://api.anthropic.com/v1/messages` using
> `process.env.VITE_ANTHROPIC_API_KEY`) and a matching
> `src/api/summarize.js` client wrapper, then call it from `handleSearch` in
> `src/App.jsx` alongside `fetchCompanyData`.

## Local setup

```bash
npm install
cp .env.example .env   # then paste in your real FMP key
```

Get a key from financialmodelingprep.com → Dashboard → API key (free tier:
250 calls/day, plenty for this).

### Running locally

```bash
npm run dev
```

This starts the Vite frontend only, at `http://localhost:5173`. It's the
fastest way to confirm the app builds and boots, but calls to `/api/*` will
404 here because Vite's dev server doesn't run serverless functions.

To test the full app (frontend + serverless function) locally the same way
it will run on Vercel:

```bash
npm run dev:full
```

This runs `vercel dev`, which serves the React app and executes the `/api`
function locally, reading the key from your `.env` file. The first run will
ask you to log in to Vercel and link/create a project — safe to do, it does
not deploy anything.

## Deploying

1. Push this repo to GitHub.
2. On vercel.com, "Import Project" and select the repo (Vercel auto-detects
   the Vite frontend and the `/api` serverless function — no config needed).
3. In the Vercel project's Settings → Environment Variables, add
   `VITE_FMP_API_KEY` with your real FMP key.
4. Deploy. Vercel gives you a live URL (e.g. `company-agent.vercel.app`).

## Notes

- FMP's free tier caps at 250 calls/day; `/api/financial-data` returns a
  JSON `{ error }` body with a non-2xx status if a call fails, so the UI
  can fail gracefully instead of crashing.
- **US-listed companies only on the free plan.** FMP's free/Basic tier
  covers NYSE/NASDAQ/AMEX; international exchanges are paid-tier only — UK
  and Canada need the $59/mo Premium plan, and full global coverage
  (including NSE/BSE-listed Indian companies) needs the $149/mo Ultimate
  plan. Searching a non-US company returns a clear "not available on the
  free plan" message rather than a confusing raw error.
- The `VITE_` prefix on the env var name is kept only for continuity with
  the original build guide. The value is read via `process.env` inside the
  `/api` function (server-side, Node), never via `import.meta.env` in any
  file under `src/` — so it is never bundled into the browser build.
