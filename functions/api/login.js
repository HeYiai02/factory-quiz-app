// functions/api/login.js
export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const empId = url.searchParams.get('empId');

    if (!empId) {
        return new Response(JSON.stringify({ error: '请提供工号' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        // 由 Cloudflare 后台节点直接向 Supabase 发送 REST 查询
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseKey = env.SUPABASE_ANON_KEY;

        const response = await fetch(`${supabaseUrl}/rest/v1/users?emp_id=eq.${empId}&select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            return new Response(JSON.stringify({ error: '数据库查询异常' }), {
                status: response.status,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 查无此工号
        if (!data || data.length === 0) {
            return new Response(JSON.stringify({ error: 'NOT_FOUND' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 返回匹配到的第一个用户信息
        return new Response(JSON.stringify({ user: data[0] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}