// Vercel serverless function.
// Runs server-side only — the FMP key never reaches the browser.
//
// POST /api/financial-data   body: { query: "AAPL" | "Apple" | "Microsoft" }
// -> 200 { name, ticker, description, sector, industry, ceo, employees,
//          marketPrice, marketCap, pe, dayRange, revenue, ebitda,
//          netIncome, fiscalYear }
//
// Uses FMP's current "stable" API (financialmodelingprep.com/stable/...).
// The older /api/v3/... endpoints this was originally written against were
// retired for accounts created after Aug 31, 2025 (see FMP's "Legacy
// Endpoints" docs) — the stable API uses query-param symbols (?symbol=X
// instead of /profile/X) and moved the P/E ratio out of /quote and into a
// separate /ratios endpoint (priceToEarningsRatio).
//
// Coverage note: the free/Basic FMP plan only covers US-listed companies
// (NYSE/NASDAQ/AMEX). International exchanges are paid-tier only (UK/
// Canada on Premium, full global — including NSE/BSE-listed Indian stocks
// like Reliance — only on the $149/mo Ultimate plan). A query for a non-US
// company returns a 403 with a clear message rather than a raw 402 from FMP.

const FMP_KEY = process.env.VITE_FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

async function fmpGet(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('apikey', FMP_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 402) {
      // FMP's free/Basic plan only covers US exchanges (NYSE/NASDAQ/AMEX).
      // UK/Canada need the Premium plan; full global coverage (incl. NSE/
      // BSE-listed Indian stocks) needs the Ultimate plan.
      const err = new Error(
        "That company isn't available on the free FMP plan (only US-listed stocks are covered). Try a US ticker like AAPL or MSFT."
      );
      err.planRestricted = true;
      throw err;
    }
    throw new Error(`FMP request failed (${res.status}) for ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Prefer the primary US listing when a name search turns up several
// matches (foreign duplicate listings, OTC entries, etc. are often outside
// the free plan and cause a 402 later when fetching quote/profile data).
const PREFERRED_EXCHANGES = new Set(['NASDAQ', 'NYSE']);

function pickBestMatch(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  return results.find((r) => PREFERRED_EXCHANGES.has(r.exchange)) || results[0];
}

async function resolveTicker(query) {
  // /search-symbol matches on ticker (e.g. "AAPL"); /search-name matches on
  // company name (e.g. "Microsoft"). Try symbol first since it's the more
  // exact match, then fall back to name search. Fetch a few candidates
  // (not just 1) so we can prefer a primary NASDAQ/NYSE listing.
  let results = await fmpGet('/search-symbol', { query, limit: 5 });
  let match = pickBestMatch(results);
  if (!match) {
    results = await fmpGet('/search-name', { query, limit: 10 });
    match = pickBestMatch(results);
  }
  if (!match) {
    throw new Error('No matching company found');
  }
  return match.symbol;
}

async function fetchCompanyData(ticker) {
  const [profileRes, quoteRes, ratiosRes, incomeRes] = await Promise.all([
    fmpGet('/profile', { symbol: ticker }),
    fmpGet('/quote', { symbol: ticker }),
    fmpGet('/ratios', { symbol: ticker, limit: 1 }),
    fmpGet('/income-statement', { symbol: ticker, limit: 1 })
  ]);

  const profile = profileRes?.[0];
  const quote = quoteRes?.[0];
  const ratios = ratiosRes?.[0];
  const income = incomeRes?.[0];

  if (!profile) {
    throw new Error('No profile data found for that ticker');
  }

  // EBITDA isn't always a direct field — derive it if missing.
  const ebitda =
    income?.ebitda ??
    (income?.operatingIncome != null && income?.depreciationAndAmortization != null
      ? income.operatingIncome + income.depreciationAndAmortization
      : undefined);

  return {
    name: profile?.companyName,
    ticker: profile?.symbol,
    description: profile?.description,
    sector: profile?.sector,
    industry: profile?.industry,
    ceo: profile?.ceo,
    employees: profile?.fullTimeEmployees,
    marketPrice: quote?.price ?? profile?.price,
    marketCap: quote?.marketCap ?? profile?.marketCap,
    pe: ratios?.priceToEarningsRatio,
    dayRange:
      quote?.dayLow != null && quote?.dayHigh != null
        ? `${quote.dayLow} - ${quote.dayHigh}`
        : undefined,
    revenue: income?.revenue,
    ebitda,
    netIncome: income?.netIncome,
    fiscalYear: income?.fiscalYear
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!FMP_KEY) {
    return res.status(500).json({ error: 'Server is missing VITE_FMP_API_KEY' });
  }

  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Missing "query" (company name or ticker)' });
  }

  try {
    const ticker = await resolveTicker(query.trim());
    const data = await fetchCompanyData(ticker);
    return res.status(200).json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = err?.planRestricted ? 403 : 502;
    return res.status(status).json({ error: message });
  }
}
