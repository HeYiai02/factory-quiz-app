export async function onRequest(context) {
    // 从 Cloudflare 环境中读取变量
    const config = {
        SUPABASE_URL: context.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: context.env.SUPABASE_ANON_KEY
    };

    return new Response(JSON.stringify(config), {
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
        },
    });
}
