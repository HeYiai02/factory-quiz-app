export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const empId = url.searchParams.get('empId');

    if (!empId) {
        return new Response(JSON.stringify({ error: '请提供工号' }), { status: 400 });
    }

    try {
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/users?emp_id=eq.${encodeURIComponent(empId)}&select=*`, {
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
            }
        });

        const data = await res.json();
        if (!res.ok) return new Response(JSON.stringify({ error: '数据库查询失败' }), { status: 500 });
        if (!data || data.length === 0) return new Response(JSON.stringify({ error: 'PGRST116' }), { status: 404 });

        return new Response(JSON.stringify(data[0]), { 
            headers: { 'Content-Type': 'application/json;charset=UTF-8' } 
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}