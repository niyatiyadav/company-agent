// Vercel serverless function.
// Runs server-side only — the Anthropic key never reaches the browser.
//
// POST /api/summarize   body: { data: <company data object from /api/financial-data> }
// -> 200 { summary: "<plain text analyst summary>" }

const ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY;
// Cheap + fast is plenty for reformatting numbers you already fetched;
// swap to 'claude-sonnet-5' if you want richer prose.
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

function buildPrompt(data) {
  return `You are a financial analyst assistant. Given this raw company data, write a clean,
scannable summary. Use short paragraphs and a simple metrics table. Do not invent
any numbers not present in the data. If a field is missing, omit it rather than guessing.

Data:
${JSON.stringify(data, null, 2)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: 'Server is missing VITE_ANTHROPIC_API_KEY' });
  }

  const { data } = req.body || {};
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Missing "data" (company data object)' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        messages: [{ role: 'user', content: buildPrompt(data) }]
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic request failed (${response.status}): ${errBody}`);
    }

    const json = await response.json();
    const summary = json?.content?.[0]?.text || '';
    return res.status(200).json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(502).json({ error: message });
  }
}
