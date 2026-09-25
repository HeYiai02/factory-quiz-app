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
        // 1. 设置 8 秒强行超时机制，防止移动端网络挂起无限期死等
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 8000)
        );

        // Supabase 查询请求
        const queryPromise = window.db
            .from('users')
            .select('*')
            .eq('emp_id', empId)
            .single();

        // 竞速：看查询先返回还是 8 秒先超时
        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        // 2. 精确区分错误类型
        if (error) {
            // PGRST116 是 Supabase/PostgREST 返回的“查无此记录”错误码
            if (error.code === 'PGRST116') {
                if (typeof showToast === 'function') showToast('工号不存在，请联系管理员！', 'error');
                else alert('工号不存在，请联系管理员！');
            } else {
                console.error('Supabase 登录请求异常:', error);
                const errMsg = error.message || '网络连接异常';
                if (typeof showToast === 'function') showToast(`登录失败: ${errMsg}`, 'error');
                else alert(`登录失败: ${errMsg}`);
            }
            return;
        }

        if (!data) {
            if (typeof showToast === 'function') showToast('工号不存在，请联系管理员！', 'error');
            else alert('工号不存在，请联系管理员！');
            return;
        }

        // 3. 验证成功，记录当前用户并进入主界面
        window.currentUser = data;
        
        const userInfoEl = document.getElementById('userInfo');
        if (userInfoEl) {
            userInfoEl.innerText = `${currentUser.name} (${currentUser.role === 'admin' ? '管理员' : '员工'})`;
        }
        
        document.getElementById('loginView')?.classList.add('hidden');
        document.getElementById('mainView')?.classList.remove('hidden');

        // 权限判断：显式隐藏或显示管理员控制台
        const adminTab = document.getElementById('tab-admin');
        if (adminTab) {
            if (currentUser.role === 'admin') {
                adminTab.classList.remove('hidden');
            } else {
                adminTab.classList.add('hidden');
            }
        }

        if (typeof showToast === 'function') {
            showToast(`欢迎回来，${currentUser.name}！`, 'success');
        }

        await loadQuestions();

    } catch (err) {
        console.error("登录异常:", err);
        if (err.message === 'NETWORK_TIMEOUT') {
            const timeoutMsg = '网络连接超时！请检查手机网络（4G/5G/Wi-Fi）后重试。';
            if (typeof showToast === 'function') showToast(timeoutMsg, 'error');
            else alert(timeoutMsg);
        } else {
            const genericMsg = '登录过程发生错误，请稍后重试！';
            if (typeof showToast === 'function') showToast(genericMsg, 'error');
            else alert(genericMsg);
        }
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