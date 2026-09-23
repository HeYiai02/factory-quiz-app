// 全局背题/刷题模式状态 ('recite' | 'self')
window.reviewMode = 'recite';

// 切换背题/刷题模式
function setReviewMode(m) { 
    window.reviewMode = m; 

    const btnRecite = document.getElementById('btnRecite');
    const btnQuiz = document.getElementById('btnQuiz');
    if (btnRecite && btnQuiz) {
        btnRecite.className = m === 'recite' 
            ? 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm transition' 
            : 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
        btnQuiz.className = m === 'self' 
            ? 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-sm transition' 
            : 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition';
    }

    renderReviewQuestions(); 
}

// 渲染题库复习列表（三维联动筛选：来源 + 题型 + 搜索词）
function renderReviewQuestions() {
    if (typeof window.populateAllSourceDropdowns === 'function') {
        window.populateAllSourceDropdowns();
    }

    const sourceFilter = document.getElementById('reviewSourceSelect')?.value || 'all';
    const typeFilter = document.getElementById('reviewTypeSelect')?.value || 'all';
    const kw = (document.getElementById('reviewSearch')?.value || '').toLowerCase().trim();
    const container = document.getElementById('reviewContainer');

    if (!container) return;

    // 筛选逻辑
    const list = (window.allQuestions || []).filter(q => {
        const matchSource = (sourceFilter === 'all') || (q.source === sourceFilter);
        const matchType = (typeFilter === 'all') || (q.type === typeFilter);
        const matchKw = !kw || 
            (q.question || '').toLowerCase().includes(kw) || 
            (q.answer || '').toLowerCase().includes(kw);

        return matchSource && matchType && matchKw;
    });

    // 更新数量统计
    const countEl = document.getElementById('reviewCount');
    if (countEl) countEl.innerText = list.length;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                <i class="fa-solid fa-filter-circle-xmark text-2xl mb-2 text-slate-300"></i>
                <p>未找到符合当前筛选条件的题目</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map((q, idx) => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                <span class="text-xs text-indigo-600 font-semibold">[${q.source}]</span>
            </div>
            
            <div class="font-medium text-sm text-slate-800 leading-snug">${idx+1}. ${q.question}</div>
            
            ${q.image_url ? `
                <div class="my-2">
                    <img src="${q.image_url}" onclick="previewImage('${q.image_url}')" title="点击查看大图" class="max-h-60 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer hover:opacity-90 transition shadow-sm">
                </div>
            ` : ''}

            ${q.type === '选择题' && Array.isArray(q.options) && q.options.length > 0 ? `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 my-2">
                    ${q.options.map(opt => `<div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-700">${opt}</div>`).join('')}
                </div>
            ` : ''}

            ${window.reviewMode === 'recite' ? 
                `<div class="mt-2 p-2.5 bg-amber-50 text-amber-900 rounded-xl text-xs border border-amber-200/80 font-medium whitespace-pre-line">标答：${q.answer}</div>` : 
                `<details class="mt-2 text-xs text-slate-400"><summary class="cursor-pointer text-indigo-600 font-medium">点击查看标答</summary><div class="mt-1 text-slate-700 whitespace-pre-line p-2.5 bg-slate-50 border border-slate-100 rounded-lg">${q.answer}</div></details>`}
        </div>
    `).join('');
}

// 随机自测抽题功能（带按钮 Loading 与成功 Toast 反馈）
function generateRandomQuiz(btnEl = null) {
    if (!window.allQuestions || window.allQuestions.length === 0) {
        showToast("题库为空，无法随机抽题！", "warning");
        return;
    }

    // 按钮反馈交互
    if (btnEl) {
        btnEl.disabled = true;
        const originalHtml = btnEl.innerHTML;
        btnEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 抽题中...`;
        setTimeout(() => {
            btnEl.disabled = false;
            btnEl.innerHTML = originalHtml;
        }, 400);
    }

    const shuffled = [...window.allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
    const container = document.getElementById('quizContainer');
    
    if (!container) return;

    container.innerHTML = shuffled.map((q, idx) => {
        let interactiveHtml = '';

        if (q.type === '选择题') {
            if (Array.isArray(q.options) && q.options.length > 0) {
                interactiveHtml = `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 my-2.5">
                        ${q.options.map(opt => `
                            <label class="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition">
                                <input type="checkbox" name="quiz_q_${q.id}" value="${opt}" class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500">
                                <span class="text-xs text-slate-700 leading-snug">${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                `;
            } else {
                interactiveHtml = `<input type="text" placeholder="填写选择选项（例如：A 或 B,C）..." class="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500">`;
            }
        } else if (q.type === '判断题') {
            interactiveHtml = `
                <div class="flex gap-4 my-2.5">
                    <label class="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition flex-1">
                        <input type="radio" name="quiz_q_${q.id}" value="正确" class="text-indigo-600 focus:ring-indigo-500">
                        <span class="text-xs text-slate-700 font-semibold">正确 (对)</span>
                    </label>
                    <label class="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition flex-1">
                        <input type="radio" name="quiz_q_${q.id}" value="错误" class="text-indigo-600 focus:ring-indigo-500">
                        <span class="text-xs text-slate-700 font-semibold">错误 (错)</span>
                    </label>
                </div>
            `;
        } else if (q.type === '填空题') {
            interactiveHtml = `
                <input type="text" placeholder="在此填写填空答案..." class="w-full border border-slate-200 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 my-1">
            `;
        } else {
            interactiveHtml = `
                <textarea placeholder="在此填写简答回答..." class="w-full border border-slate-200 p-2.5 rounded-xl text-xs h-20 outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed my-1"></textarea>
            `;
        }

        return `
            <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-sm">
                <div class="flex items-center justify-between mb-1">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                        <span class="font-medium text-sm text-slate-800">#${idx+1} ${q.question}</span>
                    </div>
                    <span class="text-[10px] text-slate-400">[${q.source}]</span>
                </div>
                
                ${q.image_url ? `<div class="my-2"><img src="${q.image_url}" onclick="previewImage('${q.image_url}')" class="max-h-60 rounded-lg border border-slate-200 object-contain bg-slate-50 cursor-pointer"></div>` : ''}

                ${interactiveHtml}

                <details class="text-xs text-slate-400 pt-1">
                    <summary class="cursor-pointer text-indigo-600 font-medium hover:underline">对照标准答案</summary>
                    <div class="mt-1 text-emerald-800 font-medium whitespace-pre-line p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">${q.answer}</div>
                </details>
            </div>
        `;
    }).join('');

    if (typeof showToast === 'function') {
        showToast("🎲 已为您随机生成 10 道测试题！", "success");
    }
}

// 导出至全局 window
window.setReviewMode = setReviewMode;
window.renderReviewQuestions = renderReviewQuestions;
window.generateRandomQuiz = generateRandomQuiz;