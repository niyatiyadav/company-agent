// Client-side wrapper. Calls our own Vercel serverless function instead of
// hitting Financial Modeling Prep directly — the FMP key stays server-side.

// Resolves a ticker/name AND fetches profile + quote + income statement in
// one round trip (the serverless function does both steps).
export async function fetchCompanyData(query) {
  const response = await fetch('/api/financial-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || 'Could not fetch company data');
  }

  return body;
}
