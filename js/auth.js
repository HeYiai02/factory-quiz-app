// 登录逻辑
async function handleLogin() {
    if (!window.db) {
        if (typeof showToast === 'function') {
            showToast('系统数据库正在连接中，请稍等 1~2 秒后重试登录...', 'warning');
        } else {
            alert('系统数据库正在连接中，请稍等 1~2 秒后重试登录...');
        }
        return;
    }

    const empIdInput = document.getElementById('empIdInput');
    const empId = empIdInput ? empIdInput.value.trim() : '';
    if (!empId) {
        if (typeof showToast === 'function') showToast('请输入工号！', 'warning');
        else alert('请输入工号');
        return;
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> 登录验证中...`;
    }

    try {
        // 手机端直接请求同源接口 /api/login，极速响应
        const res = await fetch(`/api/login?empId=${encodeURIComponent(empId)}`);
        const result = await res.json();

        if (res.status === 404 || result.error === 'NOT_FOUND') {
            showToast('工号不存在，请联系管理员！', 'error');
            return;
        }

        if (!res.ok) {
            showToast(`登录失败: ${result.error || '网络连接异常'}`, 'error');
            return;
        }

        // 登录成功！
        window.currentUser = result.user;
        document.getElementById('userInfo').innerText = `${currentUser.name} (${currentUser.role === 'admin' ? '管理员' : '员工'})`;
        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('mainView')?.classList.remove('hidden');

        await loadQuestions();

    } catch (err) {
        showToast('网络异常，请检查手机网络后重试！', 'error');
    } finally {
        // 4. 无论成功与否，必定解禁按钮状态
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `登录平台`;
        }
    }
}

window.handleLogin = handleLogin;

function logout() { 
    location.reload(); 
}

// 导航 Tab 切换
function switchTab(tab) {
    if (tab === 'admin' && (!window.currentUser || window.currentUser.role !== 'admin')) {
        return;
    }

    const tabs = ['review', 'quiz', 'exam', 'admin'];

    tabs.forEach(t => {
        const viewEl = document.getElementById(`view-${t}`);
        const btnEl = document.getElementById(`tab-${t}`);

        if (viewEl) viewEl.classList.add('hidden');

        if (btnEl) {
            btnEl.classList.remove('border-b-2', 'border-indigo-600', 'border-amber-600', 'text-indigo-600', 'font-bold');
            
            if (t === 'admin') {
                if (!window.currentUser || window.currentUser.role !== 'admin') {
                    btnEl.classList.add('hidden');
                } else {
                    btnEl.classList.remove('hidden');
                }
            } else {
                btnEl.classList.add('text-slate-500');
            }
        }
    });

    const activeView = document.getElementById(`view-${tab}`);
    if (activeView) activeView.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        if (tab === 'admin') {
            activeBtn.classList.add('border-b-2', 'border-amber-600', 'text-amber-600', 'font-bold');
        } else {
            activeBtn.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600', 'font-bold');
        }
    }
}