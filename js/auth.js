// ==========================================
// 工厂知识点考核平台 - 用户认证与会话管理
// ==========================================

// 1. 页面加载自动恢复会话 (跨页面/刷新缓存)
async function initAuthSession() {
    try {
        const savedUserStr = localStorage.getItem('quiz_user');
        if (!savedUserStr) return;

        const savedUser = JSON.parse(savedUserStr);
        if (!savedUser || !savedUser.emp_id) return;

        // 恢复全局登录状态
        window.currentUser = savedUser;

        // 更新顶栏 UI
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) {
            userInfoEl.innerText = `${currentUser.name} (${currentUser.role === 'admin' ? '管理员' : '员工'})`;
        }

        // 切换视图：隐藏登录页，显示主界面
        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('mainView')?.classList.remove('hidden');

        // 控制管理员控制台 Tab 显隐
        const adminTab = document.getElementById('tab-admin');
        if (adminTab) {
            if (currentUser.role === 'admin') adminTab.classList.remove('hidden');
            else adminTab.classList.add('hidden');
        }

        // 恢复之前停留的页面 Tab (默认 review 题库复习)
        const savedTab = localStorage.getItem('quiz_active_tab') || 'review';
        switchTab(savedTab);

        // 加载题库数据
        await loadQuestions();

    } catch (e) {
        console.error("恢复登录状态失败:", e);
        localStorage.removeItem('quiz_user');
        localStorage.removeItem('quiz_active_tab');
    }
}

// 2. 处理工号登录 (支持过滤非数字 + 截取后7位 + 缓存登录状态)
async function handleLogin() {
    const empIdInput = document.getElementById('empIdInput');
    const rawInput = empIdInput ? empIdInput.value.trim() : '';

    // 提取输入中的所有纯数字
    const digitsOnly = rawInput.replace(/\D/g, '');

    // 格式校验：不足 7 位数字给出精确警告
    if (digitsOnly.length < 7) {
        return showToast('工号格式不正确，请输入包含 7 位数字的有效工号！', 'warning');
    }

    // 截取后 7 位数字作为标准工号
    const empId = digitsOnly.slice(-7);

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> 登录验证中...`;
    }

    try {
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 8000)
        );

        // 请求后端接口验证
        const queryPromise = fetch(`/api/login?empId=${encodeURIComponent(empId)}`).then(async res => {
            const data = await res.json();
            if (!res.ok) {
                if (res.status === 404 || data.error === 'PGRST116') throw new Error('NOT_FOUND');
                throw new Error(data.error || '登录失败');
            }
            return data;
        });

        const data = await Promise.race([queryPromise, timeoutPromise]);

        // 登录成功：保存至全局变量与 localStorage 缓存
        window.currentUser = data;
        localStorage.setItem('quiz_user', JSON.stringify(data));

        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) {
            userInfoEl.innerText = `${currentUser.name} (${currentUser.role === 'admin' ? '管理员' : '员工'})`;
        }

        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('mainView')?.classList.remove('hidden');

        const adminTab = document.getElementById('tab-admin');
        if (adminTab) {
            if (currentUser.role === 'admin') adminTab.classList.remove('hidden');
            else adminTab.classList.add('hidden');
        }

        showToast(`欢迎回来，${currentUser.name}！`, 'success');
        
        // 登录后跳转至复习 Tab 或上次停留的 Tab
        const savedTab = localStorage.getItem('quiz_active_tab') || 'review';
        switchTab(savedTab);

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

// 3. 提升反馈体验的退出登录 (防误触 + 按钮 Loading + Toast + 清除缓存)
function logout() {
    if (!confirm('确定要退出当前账号吗？')) return;

    // 清除本地登录缓存与视图状态
    localStorage.removeItem('quiz_user');
    localStorage.removeItem('quiz_active_tab');

    // 查找并给退出按钮增加动画反馈
    const logoutBtn = event?.currentTarget || document.querySelector('button[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 退出中...`;
    }

    // 友善的 Toast 提示
    showToast('已安全退出登录 👋', 'info');

    // 清空内存状态
    window.currentUser = null;

    // 延迟 400ms 刷新重置页面，使用户能明显感知到操作成功
    setTimeout(() => {
        location.reload();
    }, 400);
}

// 4. Tab 切换与停留状态持久化
function switchTab(tab) {
    if (tab === 'admin' && (!window.currentUser || window.currentUser.role !== 'admin')) return;

    // 记录用户当前停留的 Tab 视图
    localStorage.setItem('quiz_active_tab', tab);

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

// 挂载全局方法
window.handleLogin = handleLogin;
window.logout = logout;
window.switchTab = switchTab;

// 页面加载完毕自动初始化会话
document.addEventListener('DOMContentLoaded', initAuthSession);