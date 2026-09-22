// 登录逻辑
async function handleLogin() {
    if (!window.db) {
        return alert('系统数据库正在连接中，请稍等 1~2 秒后重试登录...');
    }

    const empId = document.getElementById('empIdInput').value.trim();
    if (!empId) return alert('请输入工号');

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> 登录验证中...`;

    try {
        const { data, error } = await window.db
            .from('users')
            .select('*')
            .eq('emp_id', empId)
            .single();

        if (error || !data) {
            alert('工号不存在，请联系管理员！');
            loginBtn.disabled = false;
            loginBtn.innerText = '登录平台';
            return;
        }

        window.currentUser = data;
        document.getElementById('userInfo').innerText = currentUser.name;
        document.getElementById('loginView').classList.add('hidden');
        document.getElementById('mainView').classList.remove('hidden');

        // 权限判断：显式隐藏或显示管理员控制台
        const adminTab = document.getElementById('tab-admin');
        if (currentUser.role === 'admin') {
            adminTab.classList.remove('hidden');
        } else {
            adminTab.classList.add('hidden');
        }

        await loadQuestions();
    } catch (err) {
        console.error("登录异常:", err);
        alert("登录过程发生错误，请查看控制台。");
        loginBtn.disabled = false;
        loginBtn.innerText = '登录平台';
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