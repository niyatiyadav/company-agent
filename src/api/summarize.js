// Client-side wrapper. Calls our own Vercel serverless function instead of
// hitting the Anthropic API directly — the Anthropic key stays server-side.

export async function summarizeCompany(data) {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || 'Could not generate summary');
  }

  return body.summary;
}
