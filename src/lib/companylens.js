export async function enrichCompany(domain) {
  try {
    const url = new URL('https://companylens.p.rapidapi.com/v1/enrich/company');
    url.searchParams.set('domain', domain);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'companylens.p.rapidapi.com',
        'x-rapidapi-key': import.meta.env.VITE_RAPIDAPI_KEY,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data || null;
  } catch {
    return null;
  }
}
