async function handleLogin() {
    const empIdInput = document.getElementById('empIdInput');
    const empId = empIdInput ? empIdInput.value.trim() : '';
    if (!empId) return showToast('请输入工号！', 'warning');

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> 登录验证中...`;
    }

    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 8000)
        );

        const queryPromise = fetch(`/api/login?empId=${encodeURIComponent(empId)}`).then(async res => {
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 404 || data.error === 'PGRST116') throw new Error('NOT_FOUND');
                throw new Error(data.error || '登录失败');
            }
            return data;
        });

        const data = await Promise.race([queryPromise, timeoutPromise]);

        window.currentUser = data;
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) userInfoEl.innerText = `${currentUser.name}`;

        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('mainView')?.classList.remove('hidden');

        const adminTab = document.getElementById('tab-admin');
        if (adminTab) {
            if (currentUser.role === 'admin') adminTab.classList.remove('hidden');
            else adminTab.classList.add('hidden');
        }

        showToast(`欢迎回来，${currentUser.name}！`, 'success');
        await loadQuestions();

    } catch (err) {
        if (err.message === 'NOT_FOUND') {
            showToast('工号不存在，请联系管理员！', 'error');
        } else if (err.message === 'NETWORK_TIMEOUT') {
            showToast('网络连接超时！请检查网络后重试。', 'error');
        } else {
            showToast(`登录失败: ${err.message}`, 'error');
        }
    } finally {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `登录平台`;
        }
    }
}

window.handleLogin = handleLogin;

function logout() { location.reload(); }

function switchTab(tab) {
    if (tab === 'admin' && (!window.currentUser || window.currentUser.role !== 'admin')) return;

    const tabs = ['review', 'quiz', 'exam', 'admin'];
    tabs.forEach(t => {
        const viewEl = document.getElementById(`view-${t}`);
        const btnEl = document.getElementById(`tab-${t}`);
        if (viewEl) viewEl.classList.add('hidden');
        if (btnEl) {
            btnEl.classList.remove('border-b-2', 'border-indigo-600', 'border-amber-600', 'text-indigo-600', 'font-bold');
            if (t === 'admin') {
                if (!window.currentUser || window.currentUser.role !== 'admin') btnEl.classList.add('hidden');
                else btnEl.classList.remove('hidden');
            } else btnEl.classList.add('text-slate-500');
        }
    });

    const activeView = document.getElementById(`view-${tab}`);
    if (activeView) activeView.classList.remove('hidden');

    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        if (tab === 'admin') activeBtn.classList.add('border-b-2', 'border-amber-600', 'text-amber-600', 'font-bold');
        else activeBtn.classList.add('border-b-2', 'border-indigo-600', 'text-indigo-600', 'font-bold');
    }
}