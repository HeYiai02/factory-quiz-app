export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const headers = {
        'apikey': env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };

    try {
        if (request.method === 'GET') {
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/exams?select=*&order=created_at.desc`, { headers });
            const data = await res.json();
            return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
        }

        if (request.method === 'POST') {
            const payload = await request.json();
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/exams`, { method: 'POST', headers, body: JSON.stringify(payload) });
            const result = await res.json();
            return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
        }

        if (request.method === 'DELETE') {
            const id = url.searchParams.get('id');
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/exams?id=eq.${id}`, { method: 'DELETE', headers });
            return new Response(JSON.stringify({ success: res.ok }), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}