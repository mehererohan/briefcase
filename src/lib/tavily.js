export async function searchWeb(query, numResults = 5) {
  const apiKey = import.meta.env.VITE_TAVILY_API_KEY;

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      num_results: numResults,
      include_answer: false,
      search_depth: 'basic',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  if (!Array.isArray(data.results)) {
    throw new Error('Tavily returned unexpected response shape');
  }

  return data.results;
}
