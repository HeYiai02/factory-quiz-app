export async function onRequest(context) {
    const { request, env } = context;
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) return new Response(JSON.stringify({ error: '没有提供文件' }), { status: 400 });

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `questions/${fileName}`;

        const uploadRes = await fetch(`${env.SUPABASE_URL}/storage/v1/object/question-images/${filePath}`, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
                'Content-Type': file.type || 'application/octet-stream'
            },
            body: await file.arrayBuffer()
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            return new Response(JSON.stringify({ error: '图片上传失败: ' + errText }), { status: 500 });
        }

        const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/question-images/${filePath}`;
        return new Response(JSON.stringify({ publicUrl }), { headers: { 'Content-Type': 'application/json;charset=UTF-8' } });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}