// ===== AudioVisual Web - 全局 JS =====

// Toast 通知
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 自动关闭 Flash 消息（4秒）
document.addEventListener('DOMContentLoaded', function() {
    const flashMsgs = document.querySelectorAll('.flash-msg');
    flashMsgs.forEach(msg => {
        setTimeout(() => {
            msg.style.opacity = '0';
            msg.style.transition = 'opacity 0.3s';
            setTimeout(() => msg.remove(), 300);
        }, 4000);
    });

    // 点击弹窗背景关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // 初始化用户下拉菜单
    initUserDropdown();
});

// ===== 用户下拉菜单功能 =====
// 全局变量跟踪菜单状态
let userMenuOpen = false;

// 全局函数 - 可以被 onclick 直接调用
function toggleUserMenu(isOpen) {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userMenuBtn || !userDropdownMenu) {
        console.warn('用户下拉菜单元素未找到');
        return;
    }
    
    const shouldOpen = isOpen !== undefined ? isOpen : !userMenuOpen;
    
    if (shouldOpen) {
        userDropdownMenu.classList.add('show');
        userMenuBtn.classList.add('open');
        userMenuBtn.setAttribute('aria-expanded', 'true');
        userMenuOpen = true;
        // 添加点击外部关闭监听
        document.addEventListener('click', handleOutsideClick);
        console.log('用户下拉菜单已打开');
    } else {
        userDropdownMenu.classList.remove('show');
        userMenuBtn.classList.remove('open');
        userMenuBtn.setAttribute('aria-expanded', 'false');
        userMenuOpen = false;
        // 移除点击外部关闭监听
        document.removeEventListener('click', handleOutsideClick);
        console.log('用户下拉菜单已关闭');
    }
}

// 处理点击外部关闭菜单
function handleOutsideClick(event) {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userMenuBtn || !userDropdownMenu) return;
    
    if (!userMenuBtn.contains(event.target) && !userDropdownMenu.contains(event.target)) {
        toggleUserMenu(false);
    }
}

function initUserDropdown() {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    
    if (!userMenuBtn) {
        console.warn('用户菜单按钮未找到');
        return;
    }
    if (!userDropdownMenu) {
        console.warn('用户下拉菜单未找到');
        return;
    }
    
    console.log('初始化用户下拉菜单，找到按钮和菜单');
    
    // 绑定点击事件到按钮（阻止事件冒泡，避免立即关闭）
    userMenuBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault(); // 防止默认行为
        console.log('用户菜单按钮被点击');
        toggleUserMenu();
    });
    
    // 点击菜单项自动关闭菜单
    userDropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function() {
            console.log('菜单项被点击，关闭菜单');
            toggleUserMenu(false);
        });
    });
    
    // 确保菜单关闭状态正确初始化
    toggleUserMenu(false);
}
