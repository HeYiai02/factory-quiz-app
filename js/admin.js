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
        <div class="bg-slate-50 border border-slate-200 p-3 rounded-xl flex justify-between items-start gap-4 hover:border-indigo-200 transition">
            <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${getTypeBadgeClass(q.type)}">${q.type}</span>
                    <span class="text-xs text-slate-400 truncate">[${q.source}]</span>
                    ${q.image_url ? '<span class="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold"><i class="fa-solid fa-image"></i> 含图片</span>' : ''}
                </div>
                <div class="font-medium text-xs text-slate-800 break-all leading-snug">${q.question}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button onclick="openQuestionModal(${q.id})" class="text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium">编辑</button>
                <button onclick="deleteQuestion(${q.id})" class="text-xs px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 hover:bg-rose-100 font-medium">删除</button>
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

function setJudgmentAnswer(val) {
    const answerTextarea = document.getElementById('formAnswer');
    if (answerTextarea) {
        answerTextarea.value = val;
    }
}
// 1. 题型切换时，控制答案输入控件的显隐
// 2. 题型切换控制：判断题自动开启【只读】并弹出按钮
function toggleFormOptions() {
    const type = document.getElementById('formType').value;
    const optArea = document.getElementById('formOptionsArea');
    const judgmentHelper = document.getElementById('judgmentHelperArea');
    const answerTextarea = document.getElementById('formAnswer');

    // 1. 控制选择题动态选项区
    if (type === '选择题') {
        optArea.classList.remove('hidden');
    } else {
        optArea.classList.add('hidden');
    }

    // 2. 控制判断题：显现快捷按钮，并将文本框限制为【只读 + 禁止键盘输入】
    if (type === '判断题') {
        judgmentHelper.classList.remove('hidden');
        judgmentHelper.classList.add('flex');

        // 设置文本框为只读，并置灰样式
        answerTextarea.readOnly = true;
        answerTextarea.classList.add('bg-slate-100', 'cursor-not-allowed', 'text-slate-600');
        answerTextarea.placeholder = '请点击上方【正确】或【错误】按钮设置答案...';

        // 若当前无值或内容不规范，默认自动设定为"正确"
        if (answerTextarea.value !== '正确' && answerTextarea.value !== '错误') {
            answerTextarea.value = '正确';
        }
    } else {
        // 非判断题：恢复文本框正常打字功能
        judgmentHelper.classList.add('hidden');
        judgmentHelper.classList.remove('flex');

        answerTextarea.readOnly = false;
        answerTextarea.classList.remove('bg-slate-100', 'cursor-not-allowed', 'text-slate-600');
        answerTextarea.placeholder = '输入标准答案...';
    }
}

// 4. 打开与关闭题目 Modal（已清除重复定义[cite: 5]）
// 2. 打开弹窗时，还原判断题的“对/错”勾选状态
function openQuestionModal(qId = null) {
    const modal = document.getElementById('questionModal');
    if (!modal) return;
    modal.classList.remove('hidden');

    document.getElementById('editQId').value = qId || '';
    document.getElementById('modalTitle').innerText = qId ? '编辑题目' : '新增题目';
    document.getElementById('formImageFile').value = '';

    if (qId) {
        const q = window.allQuestions.find(item => item.id === qId);
        if (q) {
            document.getElementById('formSource').value = q.source || '';
            document.getElementById('formType').value = q.type || '填空题';
            document.getElementById('formQuestion').value = q.question || '';
            document.getElementById('formAnswer').value = q.answer || '';
            
            renderOptionInputs(Array.isArray(q.options) ? q.options : []);

            // 还原判断题的对错单选状态
            if (q.type === '判断题') {
                const val = q.answer || '正确';
                const radios = document.getElementsByName('judgmentAnswerRadio');
                radios.forEach(r => {
                    r.checked = (r.value === val || (val.includes('对') && r.value === '正确') || (val.includes('错') && r.value === '错误'));
                });
            }

            if (q.image_url) {
                document.getElementById('currentImagePreview').classList.remove('hidden');
                document.getElementById('previewImgSrc').src = q.image_url;
            } else {
                document.getElementById('currentImagePreview').classList.add('hidden');
            }
        }
    } else {
        document.getElementById('formSource').value = '';
        document.getElementById('formType').value = '填空题';
        document.getElementById('formQuestion').value = '';
        document.getElementById('formAnswer').value = '';
        
        // 默认将判断题重置为“正确”
        const radios = document.getElementsByName('judgmentAnswerRadio');
        if (radios.length > 0) radios[0].checked = true;

        renderOptionInputs([]);
        document.getElementById('currentImagePreview').classList.add('hidden');
    }

    toggleFormOptions();
}

function closeQuestionModal() {
    const modal = document.getElementById('questionModal');
    if (modal) modal.classList.add('hidden');
}

// 图片上传辅助函数
async function uploadImageToStorage(file) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { data, error } = await window.db.storage
        .from('question-images')
        .upload(filePath, file);

    if (error) throw error;

    const { data: publicUrlData } = window.db.storage
        .from('question-images')
        .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
}

// 3. 保存提交时，根据题型自动提取判断题选中的“对/错”值
async function saveQuestionSubmit() {
    const qId = document.getElementById('editQId').value;
    const source = document.getElementById('formSource').value.trim();
    const type = document.getElementById('formType').value;
    const question = document.getElementById('formQuestion').value.trim();
    const imageFile = document.getElementById('formImageFile').files[0];

    // 提取标准答案：判断题从单选框获取，其他题型从文本框获取
    let answer = '';
    if (type === '判断题') {
        const checkedRadio = document.querySelector('input[name="judgmentAnswerRadio"]:checked');
        answer = checkedRadio ? checkedRadio.value : '正确';
    } else {
        answer = document.getElementById('formAnswer').value.trim();
    }

    if (!source || !question || !answer) {
        return alert('请填写完整的内容（所属模块、题目描述、标准答案）！');
    }

    const options = type === '选择题' ? getCollectedOptionValues() : [];

    if (type === '选择题' && options.length === 0) {
        return alert('选择题请至少填写一个有效选项！');
    }

    const saveBtn = document.getElementById('btnSaveQ');
    saveBtn.disabled = true;
    saveBtn.innerText = '正在保存...';

    try {
        let imageUrl = null;
        if (imageFile) {
            imageUrl = await uploadImageToStorage(imageFile);
        } else if (qId) {
            const existingQ = window.allQuestions.find(item => item.id === parseInt(qId));
            if (existingQ) imageUrl = existingQ.image_url;
        }

        const payload = { source, type, question, answer, options, image_url: imageUrl };

        if (qId) {
            const { error } = await window.db.from('questions').update(payload).eq('id', parseInt(qId));
            if (error) throw error;
        } else {
            const { error } = await window.db.from('questions').insert([payload]);
            if (error) throw error;
        }

        alert('🎉 题目保存成功！');
        closeQuestionModal();
        await loadQuestions();
    } catch (err) {
        console.error("保存失败:", err);
        alert("保存题目失败：" + err.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = '保存题目';
    }
}

// 删除题目
async function deleteQuestion(qId) {
    if (!confirm('确定要彻底删除这道题目吗？')) return;

    try {
        const { error } = await window.db.from('questions').delete().eq('id', qId);
        if (error) throw error;

        alert('🗑️ 题目已成功删除！');
        await loadQuestions();
    } catch (err) {
        alert("删除题目失败：" + err.message);
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

    if (!title) return alert('请输入试卷名称！');
    if (!startTimeVal || !endTimeVal) return alert('请设置完整的考试开始时间与结束时间！');
    
    const startTime = new Date(startTimeVal);
    const endTime = new Date(endTimeVal);
    if (startTime >= endTime) return alert('考试结束时间必须晚于开始时间！');
    if (qIds.length === 0) return alert('请至少选择一道题目！');

    try {
        const { error } = await window.db.from('exams').insert([{ 
            title, 
            question_ids: qIds,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString()
        }]);
        if (error) throw error;

        alert('🎉 试卷发布成功！员工将在您设定的考试时间段内可见并参加考试。');
        document.getElementById('newExamTitle').value = '';
        document.getElementById('newExamStart').value = '';
        document.getElementById('newExamEnd').value = '';
        clearAllSelected();
        await loadExamList();
        switchTab('exam');
    } catch (err) {
        console.error("发布失败:", err);
        alert("发布试卷失败：" + err.message);
    }
}