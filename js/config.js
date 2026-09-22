// 全局状态变量
window.db = null;
window.currentUser = null;
window.allQuestions = [];
window.reviewMode = 'recite';

// 初始化 Supabase 数据库
async function initSystem() {
    try {
        const response = await fetch('/api/config');
        if (!response.ok) {
            throw new Error(`配置接口响应异常: ${response.status}`);
        }
        const config = await response.json();
        window.db = supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
        console.log("✅ Supabase 初始化成功");
    } catch (error) {
        console.error("❌ 初始化失败:", error);
        alert("系统配置加载失败，请检查 Cloudflare 环境变量或网络配置！");
    }
}

// 页面 DOM 就绪后运行初始化
window.addEventListener('DOMContentLoaded', initSystem);

// 从数据库加载全量题库，并通知各个模块渲染
async function loadQuestions() {
    try {
        const { data, error } = await window.db.from('questions').select('*');
        if (error) throw error;
        
        window.allQuestions = data || [];

        // 核心修复：加载数据后同步刷新各个界面的列表[cite: 5]
        if (typeof renderReviewQuestions === 'function') renderReviewQuestions();
        if (typeof renderAdminManageList === 'function') renderAdminManageList();
        if (typeof renderAdminSelect === 'function') renderAdminSelect();
        if (typeof loadExamList === 'function') loadExamList();
    } catch (err) {
        console.error("加载题库失败:", err);
    }
}

// 题型 Badge 样式辅助函数
function getTypeBadgeClass(type) {
    switch(type) {
        case '填空题': return 'bg-blue-100 text-blue-700';
        case '选择题': return 'bg-purple-100 text-purple-700';
        case '判断题': return 'bg-emerald-100 text-emerald-700';
        case '简答题': return 'bg-orange-100 text-orange-700';
        default: return 'bg-slate-100 text-slate-600';
    }
}