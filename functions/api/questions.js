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
        // 1. 查询全量题库
        if (request.method === 'GET') {
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/questions?select=*`, { headers });
            const data = await res.json();
            return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
        }

        // 2. 新增/修改题目
        if (request.method === 'POST') {
            const payload = await request.json();
            let targetUrl = `${env.SUPABASE_URL}/rest/v1/questions`;
            let method = 'POST';

            if (payload.id) {
                targetUrl += `?id=eq.${payload.id}`;
                method = 'PATCH';
                delete payload.id;
            }

            const res = await fetch(targetUrl, { method, headers, body: JSON.stringify(payload) });
            const result = await res.json();
            return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
        }

        // 3. 删除题目
        if (request.method === 'DELETE') {
            const id = url.searchParams.get('id');
            const res = await fetch(`${env.SUPABASE_URL}/rest/v1/questions?id=eq.${id}`, { method: 'DELETE', headers });
            return new Response(JSON.stringify({ success: res.ok }), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}