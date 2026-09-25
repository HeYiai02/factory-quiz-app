window.selectedExamQIds = new Set();
let isAdminPreviewOpen = true;

// 1. 切换管理二级 Tab (题目 CRUD vs 试卷组卷)
function switchAdminSubTab(subTab) {
    const manageView = document.getElementById('adminSubView-manage');
    const buildView = document.getElementById('adminSubView-build');
    const manageBtn = document.getElementById('adminTab-manage');
    const buildBtn = document.getElementById('adminTab-build');

    if (subTab === 'manage') {
        manageView.classList.remove('hidden');
        buildView.classList.add('hidden');
        manageBtn.className = "font-bold text-sm text-amber-700 border-b-2 border-amber-600 pb-2";
        buildBtn.className = "font-medium text-sm text-slate-500 hover:text-amber-700 pb-2";
        renderAdminManageList();
    } else {
        manageView.classList.add('hidden');
        buildView.classList.remove('hidden');
        buildBtn.className = "font-bold text-sm text-amber-700 border-b-2 border-amber-600 pb-2";
        manageBtn.className = "font-medium text-sm text-slate-500 hover:text-amber-700 pb-2";
        renderAdminSelect();
    }
}

// 2. 渲染题目管理列表
function renderAdminManageList() {
    if (typeof window.populateAllSourceDropdowns === 'function') {
        window.populateAllSourceDropdowns();
    }

    const source = document.getElementById('adminManageSourceSelect')?.value || 'all';
    const type = document.getElementById('adminManageTypeSelect')?.value || 'all';
    const kw = (document.getElementById('adminManageSearch')?.value || '').toLowerCase().trim();
    const container = document.getElementById('adminManageList');
    if (!container) return;

    const list = (window.allQuestions || []).filter(q => {
        const matchSrc = source === 'all' || q.source === source;
        const matchType = type === 'all' || q.type === type;
        const matchKw = !kw || (q.question || '').toLowerCase().includes(kw) || (q.answer || '').toLowerCase().includes(kw);
        return matchSrc && matchType && matchKw;
    });

    if (list.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">没有找到相关题目</div>`;
        return;
    }

    container.innerHTML = list.map(q => `
        <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-start gap-4 hover:border-indigo-200 transition shadow-sm">
            <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                    <span class="text-xs text-slate-400 truncate">[${q.source}]</span>
                    ${q.image_url ? '<span class="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold"><i class="fa-solid fa-image"></i> 含图片</span>' : ''}
                </div>
                <div class="font-medium text-xs text-slate-800 break-all leading-snug">${q.question}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="openQuestionModal(${q.id})" class="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium transition active:scale-95">编辑</button>
                <button onclick="deleteQuestion(${q.id})" class="text-xs px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium transition active:scale-95">删除</button>
            </div>
        </div>
    `).join('');
}

// 3. 动态选项输入行逻辑
function renderOptionInputs(optionsArray = []) {
    const listContainer = document.getElementById('formOptionsList');
    if (!listContainer) return;

    const opts = optionsArray.length > 0 ? optionsArray : ['', '', '', ''];
    listContainer.innerHTML = '';
    opts.forEach(optVal => addOptionInputRow(optVal));
}

// 别名，确保 renderFormOptions 双向兼容调用
function renderFormOptions(optionsArray = []) {
    renderOptionInputs(optionsArray);
}

function addOptionInputRow(val = '') {
    const listContainer = document.getElementById('formOptionsList');
    if (!listContainer) return;

    const cleanVal = val.replace(/^[A-Z]\.\s*/, '');

    const div = document.createElement('div');
    div.className = 'flex items-center gap-2 option-row';
    div.innerHTML = `
        <span class="option-prefix font-bold text-slate-400 text-xs w-4"></span>
        <input type="text" value="${cleanVal.replace(/"/g, '&quot;')}" placeholder="输入选项内容..." class="option-input flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
        <button type="button" onclick="removeOptionInputRow(this)" class="text-rose-400 hover:text-rose-600 text-xs p-1" title="删除该选项">
            <i class="fa-solid fa-trash-can"></i>
        </button>
    `;
    listContainer.appendChild(div);
    updateOptionPrefixes();
}

function removeOptionInputRow(btn) {
    const row = btn.closest('.option-row');
    if (row) {
        row.remove();
        updateOptionPrefixes();
    }
}

function updateOptionPrefixes() {
    const rows = document.querySelectorAll('#formOptionsList .option-row');
    rows.forEach((row, idx) => {
        const prefixSpan = row.querySelector('.option-prefix');
        if (prefixSpan) prefixSpan.innerText = `${String.fromCharCode(65 + idx)}.`;
    });
}

function getCollectedOptionValues() {
    const rows = document.querySelectorAll('#formOptionsList .option-row');
    const result = [];
    rows.forEach((row, idx) => {
        const input = row.querySelector('.option-input');
        const val = input ? input.value.trim() : '';
        if (val) {
            result.push(`${String.fromCharCode(65 + idx)}. ${val}`);
        }
    });
    return result;
}

function toggleFormOptions() {
    const type = document.getElementById('formType').value;
    const optArea = document.getElementById('formOptionsArea');
    const answerTextarea = document.getElementById('formAnswer');
    const answerJudgmentArea = document.getElementById('formAnswerJudgmentArea');

    if (!optArea || !answerTextarea || !answerJudgmentArea) return;

    if (type === '选择题') {
        optArea.classList.remove('hidden');
    } else {
        optArea.classList.add('hidden');
    }

    if (type === '判断题') {
        answerTextarea.classList.add('hidden');
        answerJudgmentArea.classList.remove('hidden');
        answerJudgmentArea.classList.add('flex');
    } else {
        answerTextarea.classList.remove('hidden');
        answerJudgmentArea.classList.add('hidden');
        answerJudgmentArea.classList.remove('flex');
    }
}

// 4. 打开与关闭题目 Modal
function openQuestionModal(editQ = null) {
    const modal = document.getElementById('questionModal');
    if (!modal) return;

    // 关键容错：如果是数字/字符串 ID 传进来，自动匹配全局 window.allQuestions 对象
    if (editQ !== null && typeof editQ !== 'object') {
        const found = (window.allQuestions || []).find(item => item.id == editQ);
        if (found) editQ = found;
    }

    if (typeof window.populateAllSourceDropdowns === 'function') {
        window.populateAllSourceDropdowns();
    }

    const titleEl = document.getElementById('modalTitle');
    const editIdEl = document.getElementById('editQId');
    const sourceInput = document.getElementById('formSource');
    const typeSelect = document.getElementById('formType');
    const questionInput = document.getElementById('formQuestion');
    const answerInput = document.getElementById('formAnswer');
    const imageFileInput = document.getElementById('formImageFile');
    const currentImagePreview = document.getElementById('currentImagePreview');
    const previewImgSrc = document.getElementById('previewImgSrc');

    if (imageFileInput) imageFileInput.value = '';

    if (editQ && typeof editQ === 'object') {
        if (titleEl) titleEl.innerText = '编辑题目';
        if (editIdEl) editIdEl.value = editQ.id;
        if (sourceInput) sourceInput.value = editQ.source || '';
        if (typeSelect) typeSelect.value = editQ.type || '填空题';
        if (questionInput) questionInput.value = editQ.question || '';
        if (answerInput) answerInput.value = editQ.answer || '';
        
        if (editQ.type === '判断题') {
            const isWrong = editQ.answer && (editQ.answer.includes('错') || editQ.answer.includes('错误'));
            const radios = document.getElementsByName('judgmentAnswerRadio');
            if (radios.length >= 2) {
                radios[0].checked = !isWrong;
                radios[1].checked = isWrong;
            }
        }

        if (editQ.type === '选择题' && Array.isArray(editQ.options)) {
            renderFormOptions(editQ.options);
        } else {
            renderFormOptions([]);
        }

        if (editQ.image_url && currentImagePreview && previewImgSrc) {
            previewImgSrc.src = editQ.image_url;
            currentImagePreview.classList.remove('hidden');
        } else if (currentImagePreview) {
            currentImagePreview.classList.add('hidden');
        }
    } else {
        if (titleEl) titleEl.innerText = '新增题目';
        if (editIdEl) editIdEl.value = '';
        if (sourceInput) sourceInput.value = '';
        if (typeSelect) typeSelect.value = '填空题';
        if (questionInput) questionInput.value = '';
        if (answerInput) answerInput.value = '';
        
        const radios = document.getElementsByName('judgmentAnswerRadio');
        if (radios.length >= 1) radios[0].checked = true;

        renderFormOptions(['', '', '', '']);

        if (currentImagePreview) currentImagePreview.classList.add('hidden');
    }

    toggleFormOptions();
    modal.classList.remove('hidden');
}

function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    if (modal) modal.classList.add('hidden');
}

// 图片上传辅助函数
async function uploadImageToStorage(file) {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '图片上传失败');
    return data.publicUrl;
}

// 保存题目提交
async function saveQuestionSubmit() {
    const qId = document.getElementById('editQId').value;
    const source = document.getElementById('formSource').value.trim();
    const type = document.getElementById('formType').value;
    const question = document.getElementById('formQuestion').value.trim();
    const imageFile = document.getElementById('formImageFile').files[0];

    let answer = '';
    if (type === '判断题') {
        const checkedRadio = document.querySelector('input[name="judgmentAnswerRadio"]:checked');
        answer = checkedRadio ? checkedRadio.value : '正确';
    } else {
        answer = document.getElementById('formAnswer').value.trim();
    }

    if (!source || !question || !answer) {
        showToast('请填写完整的内容（所属模块、题目描述、标准答案）！', 'warning');
        return;
    }

    const options = type === '选择题' ? getCollectedOptionValues() : [];

    if (type === '选择题' && options.length === 0) {
        showToast('选择题请至少填写一个有效选项！', 'warning');
        return;
    }

    const saveBtn = document.getElementById('btnSaveQ');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 正在保存...`;

    try {
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImageToStorage(imageFile);
        } else if (qId) {
            const existingQ = window.allQuestions.find(item => item.id === parseInt(qId));
            if (existingQ) imageUrl = existingQ.image_url;
        }

        const payload = { source, type, question, answer, options, image_url: imageUrl };
        if (qId) payload.id = parseInt(qId);


        const res = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('保存失败');

        showToast('🎉 题目保存成功！', 'success');
        closeQuestionModal();
        await loadQuestions();
    } catch (err) {
        showToast("保存题目失败：" + err.message, "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = '保存题目';
    }
}

// 删除题目
async function deleteQuestion(qId) {
    if (!confirm('确定要彻底删除这道题目吗？')) return;
    try {
        const res = await fetch(`/api/questions?id=${qId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('删除失败');
        showToast('🗑️ 题目已成功删除！', 'success');
        await loadQuestions();
    } catch (err) {
        showToast("删除题目失败：" + err.message, 'error');
    }
}

// 5. 管理组卷发布逻辑
function toggleAdminPreview() {
    const previewCol = document.getElementById('adminPreviewCol');
    const selectorCol = document.getElementById('adminSelectorCol');
    const btnText = document.getElementById('btnPreviewText');

    isAdminPreviewOpen = !isAdminPreviewOpen;
    if (isAdminPreviewOpen) {
        previewCol.classList.remove('hidden');
        selectorCol.className = "lg:col-span-7 space-y-3";
        btnText.innerText = "隐藏预览";
    } else {
        previewCol.classList.add('hidden');
        selectorCol.className = "lg:col-span-12 space-y-3";
        btnText.innerText = "显示预览";
    }
}

function renderAdminSelect() {
    if (typeof window.populateAllSourceDropdowns === 'function') {
        window.populateAllSourceDropdowns();
    }

    const source = document.getElementById('adminSourceSelect')?.value || 'all';
    const type = document.getElementById('adminTypeSelect')?.value || 'all';
    const kw = (document.getElementById('adminSearchKw')?.value || '').toLowerCase().trim();

    const container = document.getElementById('adminQuestionSelect');
    if (!container) return;

    const filtered = (window.allQuestions || []).filter(q => {
        const matchSrc = source === 'all' || q.source === source;
        const matchType = type === 'all' || q.type === type;
        const matchKw = !kw || (q.question || '').toLowerCase().includes(kw) || (q.answer || '').toLowerCase().includes(kw);
        return matchSrc && matchType && matchKw;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="text-center py-8 text-slate-400 text-xs">没有匹配的题目</div>`;
        return;
    }

    container.innerHTML = filtered.map(q => {
        const isChecked = window.selectedExamQIds.has(q.id);
        return `
            <label class="flex items-start gap-2 text-xs bg-slate-50 hover:bg-indigo-50/50 p-2.5 rounded-lg border border-slate-200 cursor-pointer transition">
                <input type="checkbox" value="${q.id}" ${isChecked ? 'checked' : ''} onchange="toggleQuestionSelect(${q.id}, this.checked)" class="mt-0.5 rounded text-amber-600 focus:ring-amber-500">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                        <span class="text-slate-400 truncate text-[10px]">${q.source}</span>
                    </div>
                    <div class="text-slate-800 font-medium leading-snug break-all">${q.question}</div>
                </div>
            </label>
        `;
    }).join('');

    updateAdminStats();
    renderAdminPreview();
}

function toggleQuestionSelect(qId, isChecked) {
    if (isChecked) {
        window.selectedExamQIds.add(qId);
    } else {
        window.selectedExamQIds.delete(qId);
    }
    updateAdminStats();
    renderAdminPreview();
}

function selectAllFiltered(check = true) {
    const source = document.getElementById('adminSourceSelect')?.value || 'all';
    const type = document.getElementById('adminTypeSelect')?.value || 'all';
    const kw = (document.getElementById('adminSearchKw')?.value || '').toLowerCase().trim();

    (window.allQuestions || []).forEach(q => {
        const matchSrc = source === 'all' || q.source === source;
        const matchType = type === 'all' || q.type === type;
        const matchKw = !kw || (q.question || '').toLowerCase().includes(kw) || (q.answer || '').toLowerCase().includes(kw);

        if (matchSrc && matchType && matchKw) {
            if (check) window.selectedExamQIds.add(q.id);
            else window.selectedExamQIds.delete(q.id);
        }
    });

    renderAdminSelect();
}

function clearAllSelected() {
    window.selectedExamQIds.clear();
    renderAdminSelect();
}

function removeFromExam(qId) {
    window.selectedExamQIds.delete(qId);
    renderAdminSelect();
}

function updateAdminStats() {
    const total = window.selectedExamQIds.size;
    const countEl = document.getElementById('adminSelectedCount');
    if (countEl) countEl.innerText = total;

    const selectedQs = (window.allQuestions || []).filter(q => window.selectedExamQIds.has(q.id));
    const fillCount = selectedQs.filter(q => q.type === '填空题').length;
    const choiceCount = selectedQs.filter(q => q.type === '选择题').length;
    const saqCount = selectedQs.filter(q => q.type === '简答题').length;

    const detailEl = document.getElementById('adminSelectedDetail');
    if (detailEl) detailEl.innerText = `(填空 ${fillCount} | 选择 ${choiceCount} | 简答 ${saqCount})`;
}

function renderAdminPreview() {
    const container = document.getElementById('adminPreviewContainer');
    if (!container) return;

    if (window.selectedExamQIds.size === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-slate-400 text-xs">
                <i class="fa-solid fa-list-check text-2xl mb-2 text-slate-300"></i>
                <p>暂未选择任何题目</p>
                <p class="text-[10px] mt-1 text-slate-300">在左侧勾选题目即可实时预览组卷结构</p>
            </div>
        `;
        return;
    }

    const selectedQs = (window.allQuestions || []).filter(q => window.selectedExamQIds.has(q.id));

    container.innerHTML = selectedQs.map((q, idx) => `
        <div class="bg-white p-3 rounded-lg border border-amber-200/80 shadow-sm relative group">
            <button onclick="removeFromExam(${q.id})" class="absolute right-2 top-2 text-slate-300 hover:text-rose-500 text-xs transition" title="移除此题">
                <i class="fa-solid fa-circle-xmark"></i>
            </button>
            <div class="flex items-center gap-1.5 mb-1">
                <span class="text-xs font-bold text-amber-700">#${idx+1}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
            </div>
            <div class="text-xs font-medium text-slate-800 pr-5 leading-relaxed">${q.question}</div>
        </div>
    `).join('');
}

async function createExam() {
    const title = document.getElementById('newExamTitle').value.trim();
    const startTimeVal = document.getElementById('newExamStart').value;
    const endTimeVal = document.getElementById('newExamEnd').value;
    const qIds = Array.from(window.selectedExamQIds);

    if (!title) return showToast('请输入试卷名称！', 'warning');
    if (!startTimeVal || !endTimeVal) return showToast('请设置完整的考试开始时间与结束时间！', 'warning');
    
    const startTime = new Date(startTimeVal);
    const endTime = new Date(endTimeVal);
    if (startTime >= endTime) return showToast('考试结束时间必须晚于开始时间！', 'warning');
    if (qIds.length === 0) return showToast('请至少选择一道题目！', 'warning');

    try {
        const res = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                question_ids: qIds,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString()
            })
        });
        if (!res.ok) throw new Error('发布失败');

        showToast('🎉 试卷发布成功！', 'success');
        document.getElementById('newExamTitle').value = '';
        document.getElementById('newExamStart').value = '';
        document.getElementById('newExamEnd').value = '';
        clearAllSelected();
        await loadExamList();
        switchTab('exam');
    } catch (err) {
        showToast("发布试卷失败：" + err.message, "error");
    }
}

// 导出全局 Window
window.switchAdminSubTab = switchAdminSubTab;
window.renderAdminManageList = renderAdminManageList;
window.renderOptionInputs = renderOptionInputs;
window.renderFormOptions = renderFormOptions;
window.addOptionInputRow = addOptionInputRow;
window.removeOptionInputRow = removeOptionInputRow;
window.toggleFormOptions = toggleFormOptions;
window.openQuestionModal = openQuestionModal;
window.closeQuestionModal = closeQuestionModal;
window.saveQuestionSubmit = saveQuestionSubmit;
window.deleteQuestion = deleteQuestion;
window.toggleAdminPreview = toggleAdminPreview;
window.renderAdminSelect = renderAdminSelect;
window.toggleQuestionSelect = toggleQuestionSelect;
window.selectAllFiltered = selectAllFiltered;
window.clearAllSelected = clearAllSelected;
window.removeFromExam = removeFromExam;
window.createExam = createExam;