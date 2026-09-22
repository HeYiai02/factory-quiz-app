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

// 动态填充试卷来源下拉菜单
function populateReviewSources() {
    const sourceSelect = document.getElementById('reviewSourceSelect');
    if (!sourceSelect || !window.allQuestions) return;

    // 获取当前保存选中的来源，以便刷新后保持
    const currentVal = sourceSelect.value;

    // 提取所有不重复的 source 列表
    const sources = Array.from(new Set(window.allQuestions.map(q => q.source).filter(Boolean)));

    sourceSelect.innerHTML = `<option value="all">所有试卷来源 (全部 ${window.allQuestions.length} 题)</option>` +
        sources.map(s => `<option value="${s}">${s}</option>`).join('');

    if (sources.includes(currentVal)) {
        sourceSelect.value = currentVal;
    }
}

// 渲染题库复习列表（三维联动筛选：来源 + 题型 + 搜索词）
function renderReviewQuestions() {
    populateReviewSources(); // 确保下拉列表始终同步最新库

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