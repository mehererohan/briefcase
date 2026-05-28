export async function searchExa(query, numResults = 5) {
  const apiKey = import.meta.env.VITE_EXA_API_KEY;

  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      num_results: numResults,
      use_autoprompt: true,
      type: 'neural',
      contents: { text: { max_characters: 1000 } },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Exa API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (!Array.isArray(data.results)) {
    throw new Error('Exa returned unexpected response shape');
  }

  return data.results;
}
