// 切换背题/刷题模式
function setReviewMode(m) { 
    window.reviewMode = m; 

    const btnRecite = document.getElementById('btnRecite');
    const btnQuiz = document.getElementById('btnQuiz');
    if (btnRecite && btnQuiz) {
        btnRecite.className = m === 'recite' 
            ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white' 
            : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600';
        btnQuiz.className = m === 'self' 
            ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white' 
            : 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600';
    }

    renderReviewQuestions(); 
}

// 渲染题库复习列表
function renderReviewQuestions() {
    const searchInput = document.getElementById('reviewSearch');
    const kw = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const container = document.getElementById('reviewContainer');

    if (!container) return;

    const list = (window.allQuestions || []).filter(q => 
        (q.question || '').toLowerCase().includes(kw) || 
        (q.answer || '').toLowerCase().includes(kw)
    );

    if (list.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">没有找到符合条件的题目</div>`;
        return;
    }

    container.innerHTML = list.map((q, idx) => `
        <div class="bg-white p-4 rounded-xl border border-slate-200">
            <div class="flex items-center gap-2 mb-1">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                <span class="text-xs text-indigo-600 font-semibold">[${q.source}]</span>
            </div>
            <div class="font-medium text-sm text-slate-800 leading-snug">${idx+1}. ${q.question}</div>
            
            ${q.image_url ? `<div class="my-2"><img src="${q.image_url}" class="max-h-60 rounded-lg border border-slate-200 object-contain bg-slate-50"></div>` : ''}

            ${window.reviewMode === 'recite' ? 
                `<div class="mt-2 p-2.5 bg-amber-50 text-amber-900 rounded-xl text-xs border border-amber-200/80 font-medium whitespace-pre-line">标答：${q.answer}</div>` : 
                `<details class="mt-2 text-xs text-slate-400"><summary class="cursor-pointer text-indigo-600 font-medium">点击查看答案</summary><div class="mt-1 text-slate-700 whitespace-pre-line p-2 bg-slate-50 rounded-lg">${q.answer}</div></details>`}
        </div>
    `).join('');
}

// 随机自测抽题
function generateRandomQuiz() {
    const shuffled = [...window.allQuestions].sort(() => 0.5 - Math.random()).slice(0, 10);
    const container = document.getElementById('quizContainer');
    
    if (shuffled.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">暂无题目，无法抽取</div>`;
        return;
    }

    container.innerHTML = shuffled.map((q, idx) => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <div class="flex items-center gap-2 mb-1">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                <span class="font-medium text-sm text-slate-800">#${idx+1} ${q.question}</span>
            </div>
            
            ${q.image_url ? `<div class="my-2"><img src="${q.image_url}" class="max-h-60 rounded-lg border border-slate-200 object-contain bg-slate-50"></div>` : ''}

            <textarea placeholder="在此填写你的答案..." class="w-full border border-slate-200 p-2.5 rounded-xl text-xs h-20 outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            <details class="text-xs text-slate-400">
                <summary class="cursor-pointer text-indigo-600 font-medium">对照标准答案</summary>
                <div class="mt-1 text-emerald-800 font-medium whitespace-pre-line p-2 bg-emerald-50 rounded-lg border border-emerald-100">${q.answer}</div>
            </details>
        </div>
    `).join('');
}