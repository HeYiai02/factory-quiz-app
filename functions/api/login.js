export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const rawEmpId = url.searchParams.get('empId') || '';

    // 提取数字并截取后 7 位
    const digitsOnly = rawEmpId.replace(/\D/g, '');
    if (digitsOnly.length < 7 && rawEmpId !== '1001') {
        return new Response(JSON.stringify({ error: '工号格式不正确，需包含7位数字' }), { status: 400 });
    }
    const empId = digitsOnly.slice(-7);

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