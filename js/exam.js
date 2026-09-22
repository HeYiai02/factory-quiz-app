window.examTimerInterval = null;
window.hasAlertedTimeUp = false;

// 防刷新草稿 Key
function getDraftKey(examTitle) {
    return `exam_draft_${currentUser ? currentUser.emp_id : 'guest'}_${examTitle}`;
}

// 自动保存答题草稿
function saveExamDraft(examTitle) {
    if (!currentUser) return;
    const key = getDraftKey(examTitle);
    const draft = {};

    const inputs = document.querySelectorAll('.exam-input');
    inputs.forEach(input => {
        const name = input.name;
        if (!name) return;

        if (input.type === 'checkbox') {
            if (!draft[name]) draft[name] = [];
            if (input.checked) draft[name].push(input.value);
        } else if (input.type === 'radio') {
            if (input.checked) draft[name] = input.value;
        } else {
            draft[name] = input.value;
        }
    });

    localStorage.setItem(key, JSON.stringify(draft));
}

// 自动还原答题草稿
function restoreExamDraft(examTitle) {
    if (!currentUser) return;
    const key = getDraftKey(examTitle);
    const saved = localStorage.getItem(key);
    if (!saved) return;

    try {
        const draft = JSON.parse(saved);
        Object.keys(draft).forEach(name => {
            const val = draft[name];
            if (Array.isArray(val)) {
                val.forEach(optVal => {
                    const cb = document.querySelector(`input[name="${name}"][value="${CSS.escape(optVal)}"]`);
                    if (cb) cb.checked = true;
                });
            } else {
                const radio = document.querySelector(`input[name="${name}"][value="${CSS.escape(val)}"]`);
                if (radio && radio.type === 'radio') {
                    radio.checked = true;
                } else {
                    const textEl = document.querySelector(`[name="${name}"]`);
                    if (textEl) textEl.value = val;
                }
            }
        });
    } catch (e) {
        console.error("还原草稿失败:", e);
    }
}

// 加载试卷列表
async function loadExamList() {
    try {
        const { data, error } = await window.db.from('exams').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        const container = document.getElementById('examList');
        if (!container) return;

        const isAdmin = window.currentUser && window.currentUser.role === 'admin';
        const now = new Date();

        const displayList = (data || []).filter(e => {
            if (isAdmin) return true;
            return now >= new Date(e.start_time);
        });

        if (displayList.length === 0) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-8 text-slate-400 text-xs">
                    <i class="fa-solid fa-clock-rotate-left text-2xl mb-2 text-slate-300"></i>
                    <p>${isAdmin ? '暂无试卷，请在“管理控制台”中发布新试卷' : '当前暂无公开的考试试卷'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = displayList.map(e => {
            const start = new Date(e.start_time);
            const end = new Date(e.end_time);

            let statusBadge = '';
            let btnText = '进入答题';
            let btnClass = 'bg-indigo-600 hover:bg-indigo-700 text-white';

            if (now < start) {
                statusBadge = `<span class="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">未开始</span>`;
                btnText = '未到开始时间';
                btnClass = 'bg-slate-200 text-slate-400 cursor-not-allowed';
            } else if (now >= start && now <= end) {
                statusBadge = `<span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">进行中</span>`;
            } else {
                statusBadge = `<span class="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">已截止</span>`;
                btnText = '查看 / 导出答卷';
                btnClass = 'bg-slate-700 hover:bg-slate-800 text-white';
            }

            const adminActionBtns = isAdmin ? `
                <div class="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <button onclick="deleteExam(${e.id}, '${e.title}')" class="w-full text-xs py-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition font-medium">
                        <i class="fa-solid fa-trash-can"></i> 删除试卷
                    </button>
                </div>
            ` : '';

            const timeFormat = (d) => `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

            return `
                <div class="border border-slate-200 p-4 rounded-xl bg-slate-50/50 shadow-sm flex flex-col justify-between gap-3">
                    <div>
                        <div class="flex items-center justify-between gap-2 mb-1">
                            <span class="font-bold text-sm text-slate-800 break-all">${e.title}</span>
                            ${statusBadge}
                        </div>
                        <div class="text-xs text-slate-500 space-y-0.5 mt-2">
                            <div><i class="fa-regular fa-clock"></i> 时间：${timeFormat(start)} ~ ${timeFormat(end)}</div>
                            <div><i class="fa-solid fa-list-ol"></i> 题量：${e.question_ids ? e.question_ids.length : 0} 题</div>
                        </div>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button ${now < start ? 'disabled' : ''} onclick="startExam('${e.title}', ${JSON.stringify(e.question_ids)}, '${e.start_time}', '${e.end_time}')" class="w-full py-1.5 rounded-lg text-xs font-semibold transition ${btnClass}">
                            ${btnText}
                        </button>
                        ${adminActionBtns}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error("加载试卷列表失败:", err);
    }
}

// 删除试卷
async function deleteExam(examId, title) {
    if (!confirm(`确定要删除试卷《${title}》吗？此操作不可撤销！`)) return;
    try {
        const { error } = await window.db.from('exams').delete().eq('id', examId);
        if (error) throw error;
        alert("🗑️ 试卷已成功删除！");
        await loadExamList();
    } catch (err) {
        alert("删除试卷失败: " + err.message);
    }
}

// 开始答题与渲染
function startExam(title, qIds, startTimeStr, endTimeStr) {
    const paperArea = document.getElementById('paperArea');
    if (!paperArea) return;

    paperArea.classList.remove('hidden');
    document.getElementById('paperTitle').innerText = title;
    document.getElementById('paperMeta').innerText = `考生工号：${currentUser.emp_id} | 姓名：${currentUser.name} | 日期：${new Date().toLocaleDateString()}`;

    if (window.examTimerInterval) clearInterval(window.examTimerInterval);
    window.hasAlertedTimeUp = false;

    const examQs = (window.allQuestions || []).filter(q => qIds.includes(q.id));

    document.getElementById('paperQuestions').innerHTML = `
        <div id="examTimerBar" class="bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl flex justify-between items-center text-xs sticky top-[100px] z-30 shadow-sm transition">
            <span class="font-bold text-indigo-900 flex items-center gap-2">
                <i class="fa-solid fa-stopwatch text-base text-indigo-600"></i>
                <span id="examTimerLabel">剩余答题时间：</span>
            </span>
            <span id="examCountdownText" class="text-base font-black text-indigo-700 font-mono">00:00:00</span>
        </div>

        <div id="examQuestionsContainer" class="space-y-6 pt-2">
            ${examQs.map((q, idx) => {
                let interactiveHtml = '';

                if (q.type === '选择题' && Array.isArray(q.options) && q.options.length > 0) {
                    interactiveHtml = `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 my-2.5">
                            ${q.options.map((opt) => `
                                <label class="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition">
                                    <input type="checkbox" name="q_${q.id}" value="${opt}" class="exam-input mt-0.5 rounded text-indigo-600 focus:ring-indigo-500">
                                    <span class="text-xs text-slate-700 leading-snug">${opt}</span>
                                </label>
                            `).join('')}
                        </div>
                    `;
                } else if (q.type === '判断题') {
                    interactiveHtml = `
                        <div class="flex gap-4 my-2.5">
                            <label class="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition flex-1">
                                <input type="radio" name="q_${q.id}" value="正确" class="exam-input text-indigo-600 focus:ring-indigo-500">
                                <span class="text-xs text-slate-700 font-semibold">正确 (对)</span>
                            </label>
                            <label class="flex items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-indigo-50/60 transition flex-1">
                                <input type="radio" name="q_${q.id}" value="错误" class="exam-input text-indigo-600 focus:ring-indigo-500">
                                <span class="text-xs text-slate-700 font-semibold">错误 (错)</span>
                            </label>
                        </div>
                    `;
                } else if (q.type === '填空题') {
                    interactiveHtml = `
                        <div class="mt-2">
                            <input type="text" name="q_${q.id}" placeholder="请在此输入填空答案..." class="exam-input w-full border border-slate-200 p-2.5 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition">
                        </div>
                    `;
                } else {
                    interactiveHtml = `
                        <div class="mt-2">
                            <textarea name="q_${q.id}" placeholder="请在此输入简答题回答..." class="exam-input w-full border border-slate-200 p-2.5 rounded-xl text-xs h-28 focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed transition"></textarea>
                        </div>
                    `;
                }

                return `
                    <div class="space-y-2 border-b border-slate-100 pb-5">
                        <div class="font-medium text-sm text-slate-800 leading-snug">
                            <span class="text-indigo-600 font-bold">#${idx + 1} [${q.type}]</span>${q.question}
                        </div>
                        ${q.image_url ? `<div class="my-2"><img src="${q.image_url}" class="max-h-60 rounded-lg border border-slate-200 object-contain bg-slate-50"></div>` : ''}
                        ${interactiveHtml}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    restoreExamDraft(title);

    document.querySelectorAll('.exam-input').forEach(input => {
        input.addEventListener('input', () => saveExamDraft(title));
        input.addEventListener('change', () => saveExamDraft(title));
    });

    const formatMs = (ms) => {
        const totalSec = Math.max(0, Math.floor(ms / 1000));
        const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const s = String(totalSec % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const setExamLocked = (isLocked) => {
        const inputs = document.querySelectorAll('.exam-input');
        const container = document.getElementById('examQuestionsContainer');
        inputs.forEach(i => i.disabled = isLocked);
        if (container) {
            container.style.pointerEvents = isLocked ? 'none' : 'auto';
            container.style.opacity = isLocked ? '0.85' : '1';
        }
    };

    const startTime = new Date(startTimeStr).getTime();
    const endTime = new Date(endTimeStr).getTime();

    const updateTimer = () => {
        const now = Date.now();
        const timerBar = document.getElementById('examTimerBar');
        const timerLabel = document.getElementById('examTimerLabel');
        const countdownText = document.getElementById('examCountdownText');

        if (!timerBar || !countdownText) return;

        if (now >= startTime && now <= endTime) {
            timerLabel.innerText = "剩余答题时间：";
            countdownText.innerText = formatMs(endTime - now);
            timerBar.className = "bg-indigo-50 border border-indigo-200 p-3.5 rounded-xl flex justify-between items-center text-xs sticky top-[100px] z-30 shadow-sm transition";
            countdownText.className = "text-base font-black text-indigo-700 font-mono";
            setExamLocked(false);
        } else if (now > endTime) {
            timerLabel.innerText = "⚠️ 考试已截止（只读与导出模式）：";
            countdownText.innerText = "00:00:00";
            timerBar.className = "bg-amber-50 border border-amber-300 p-3.5 rounded-xl flex justify-between items-center text-xs sticky top-[100px] z-30 shadow-sm transition";
            countdownText.className = "text-base font-black text-amber-700 font-mono";
            setExamLocked(true);

            if (!window.hasAlertedTimeUp) {
                window.hasAlertedTimeUp = true;
                alert('⏰ 本场考试已结束！作答区域已锁定。您可以查看内容并点击右上角【导出PDF答卷】保存记录。');
            }
            clearInterval(window.examTimerInterval);
        }
    };

    updateTimer();
    window.examTimerInterval = setInterval(updateTimer, 1000);
    paperArea.scrollIntoView({ behavior: 'smooth' });
}

function exportPDF() {
    const element = document.getElementById('paperArea');
    html2pdf().set({ margin: 10, filename: `考试答卷_${currentUser.name}.pdf` }).from(element).save();
}