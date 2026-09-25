// 全局状态变量
window.currentUser = null;
window.allQuestions = [];
window.reviewMode = 'recite';

// 全局 Toast 提示消息函数
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-600 text-white' : 
                    type === 'error' ? 'bg-rose-600 text-white' : 
                    type === 'warning' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-white';
    
    toast.className = `${bgClass} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 pointer-events-auto transition-all duration-300 opacity-0 translate-y-[-10px]`;
    
    const icon = type === 'success' ? 'fa-circle-check' : 
                 type === 'error' ? 'fa-circle-exclamation' : 
                 type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
                 
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => { toast.classList.remove('opacity-0', 'translate-y-[-10px]'); });
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

window.showToast = showToast;

// 全局来源下拉菜单同步更新辅助函数
function populateAllSourceDropdowns() {
    if (!window.allQuestions) return;
    const sources = Array.from(new Set(window.allQuestions.map(q => q.source).filter(Boolean)));
    const sourceLatestMap = {};
    window.allQuestions.forEach(q => {
        if (!q.source) return;
        const timeKey = q.created_at ? new Date(q.created_at).getTime() : (q.id || 0);
        if (!sourceLatestMap[q.source] || timeKey > sourceLatestMap[q.source]) {
            sourceLatestMap[q.source] = timeKey;
        }
    });
    const sortedSources = sources.sort((a, b) => (sourceLatestMap[b] || 0) - (sourceLatestMap[a] || 0));

    const reviewSelect = document.getElementById('reviewSourceSelect');
    if (reviewSelect) {
        const curVal = reviewSelect.value;
        reviewSelect.innerHTML = `<option value="all">所有试卷来源 (全部 ${window.allQuestions.length} 题)</option>` +
            sortedSources.map(s => `<option value="${s}">${s}</option>`).join('');
        if (sortedSources.includes(curVal)) reviewSelect.value = curVal;
    }

    const adminManageSelect = document.getElementById('adminManageSourceSelect');
    if (adminManageSelect) {
        const curVal = adminManageSelect.value;
        adminManageSelect.innerHTML = `<option value="all">所有试卷来源</option>` + sortedSources.map(s => `<option value="${s}">${s}</option>`).join('');
        if (sortedSources.includes(curVal)) adminManageSelect.value = curVal;
    }

    const adminBuildSelect = document.getElementById('adminSourceSelect');
    if (adminBuildSelect) {
        const curVal = adminBuildSelect.value;
        adminBuildSelect.innerHTML = `<option value="all">所有试卷来源</option>` + sortedSources.map(s => `<option value="${s}">${s}</option>`).join('');
        if (sortedSources.includes(curVal)) adminBuildSelect.value = curVal;
    }

    const datalist = document.getElementById('sourceDatalist');
    if (datalist) datalist.innerHTML = sortedSources.map(s => `<option value="${s}"></option>`).join('');
}

window.populateAllSourceDropdowns = populateAllSourceDropdowns;

// 从边缘接口加载全量题库
async function loadQuestions() {
    try {
        const res = await fetch('/api/questions');
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        
        window.allQuestions = await res.json();
        populateAllSourceDropdowns();

        if (typeof renderReviewQuestions === 'function') renderReviewQuestions();
        if (typeof renderAdminManageList === 'function') renderAdminManageList();
        if (typeof renderAdminSelect === 'function') renderAdminSelect();
        if (typeof loadExamList === 'function') loadExamList();
    } catch (err) {
        console.error("加载题库失败:", err);
        showToast("加载题库失败：" + err.message, "error");
    }
}

window.loadQuestions = loadQuestions;

function getTypeBadgeClass(type) {
    switch(type) {
        case '填空题': return 'bg-blue-100 text-blue-700';
        case '选择题': return 'bg-purple-100 text-purple-700';
        case '判断题': return 'bg-emerald-100 text-emerald-700';
        case '简答题': return 'bg-orange-100 text-orange-700';
        default: return 'bg-slate-100 text-slate-600';
    }
}

window.getTypeBadgeClass = getTypeBadgeClass;

function previewImage(src) {
    if (!src) return;
    const modal = document.getElementById('imagePreviewModal');
    const targetImg = document.getElementById('imagePreviewTarget');
    if (modal && targetImg) {
        targetImg.src = src;
        modal.classList.remove('hidden');
    }
}

function closeImagePreview() {
    const modal = document.getElementById('imagePreviewModal');
    if (modal) modal.classList.add('hidden');
}

window.previewImage = previewImage;
window.closeImagePreview = closeImagePreview;