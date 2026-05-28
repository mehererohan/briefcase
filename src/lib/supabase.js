export async function checkBreachHistory(companyName) {
  try {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const url = new URL(`${base}/rest/v1/hhs_breaches`);
    url.searchParams.set('select', 'name_of_covered_entity,breach_submission_date,individuals_affected,type_of_breach');
    url.searchParams.set('name_of_covered_entity', `ilike.*${encodeURIComponent(companyName)}*`);

    const res = await fetch(url.toString(), {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation',
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
