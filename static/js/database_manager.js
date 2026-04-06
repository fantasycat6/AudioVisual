/**
 * AudioVisual 数据库管理系统 - 前端JavaScript
 * 
 * 功能：
 * 1. 数据库配置管理
 * 2. 数据迁移监控
 * 3. 备份恢复操作
 * 4. 系统状态监控
 */

// 全局变量
let currentMigrationId = null;
let migrationInterval = null;
let performanceChart = null;
let diskUsageChart = null;

// ==================== 初始化函数 ====================

/**
 * 页面加载完成初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    // 初始化标签页
    initDatabaseTabs();
    
    // 加载初始数据
    loadDatabaseInfo();
    loadDatabaseConfig();
    
    // 检查迁移任务
    checkMigrationTasks();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 设置默认数据库类型
    setTimeout(() => {
        const currentDbType = document.getElementById('current-db-type')?.value;
        if (currentDbType === 'mysql') {
            document.getElementById('db-type-mysql')?.click();
        } else {
            document.getElementById('db-type-sqlite')?.click();
        }
    }, 500);
});

/**
 * 初始化事件监听器
 */
function initEventListeners() {
    // 密码显示切换
    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const passwordInput = document.getElementById('mysql-password');
            if (!passwordInput) return;
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                this.textContent = '👁️';
            }
        });
    }
    
    // 数据库类型选择切换
    document.querySelectorAll('input[name="db-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            updateDbTypeForm(this.id === 'db-type-mysql');
        });
    });
}

/**
 * 初始化数据库标签页
 */
function initDatabaseTabs() {
    const tabLinks = document.querySelectorAll('#databaseTabs button');
    tabLinks.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 更新活动标签
            tabLinks.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应的内容
            const tabId = this.getAttribute('data-bs-target').substring(1);
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('show', 'active');
            });
            const targetPane = document.getElementById(tabId);
            if (targetPane) {
                targetPane.classList.add('show', 'active');
            }
            
            // 标签页特定加载
            if (tabId === 'monitor') {
                loadDetailedStatus();
            } else if (tabId === 'backup') {
                loadBackupList();
            } else if (tabId === 'migration') {
                loadMigrationHistory();
            }
        });
    });
}

/**
 * 更新数据库类型表单显示
 * @param {boolean} isMysql - 是否显示MySQL表单
 */
function updateDbTypeForm(isMysql) {
    const sqliteForm = document.getElementById('sqlite-config-form');
    const mysqlForm = document.getElementById('mysql-config-form');
    const currentSqlite = document.getElementById('current-sqlite-config');
    const currentMysql = document.getElementById('current-mysql-config');
    
    if (!sqliteForm || !mysqlForm) return;
    
    if (isMysql) {
        sqliteForm.style.display = 'none';
        mysqlForm.style.display = 'block';
        if (currentSqlite) currentSqlite.style.display = 'none';
        if (currentMysql) currentMysql.style.display = 'block';
        
        // 加载当前MySQL配置到表单
        loadCurrentConfigIntoForm();
    } else {
        sqliteForm.style.display = 'block';
        mysqlForm.style.display = 'none';
        if (currentSqlite) currentSqlite.style.display = 'block';
        if (currentMysql) currentMysql.style.display = 'none';
        
        // 加载当前SQLite配置到表单
        const currentPath = document.getElementById('current-sqlite-path')?.value;
        if (currentPath && document.getElementById('new-sqlite-path')) {
            document.getElementById('new-sqlite-path').value = currentPath;
        }
    }
}

/**
 * 加载当前配置到编辑表单
 */
function loadCurrentConfigIntoForm() {
    if (!document.getElementById('mysql-host') || !document.getElementById('current-mysql-host')) return;
    
    const host = document.getElementById('current-mysql-host').value;
    const port = document.getElementById('current-mysql-port').value;
    const user = document.getElementById('current-mysql-user').value;
    const db = document.getElementById('current-mysql-db').value;
    
    if (host) document.getElementById('mysql-host').value = host;
    if (port) document.getElementById('mysql-port').value = port;
    if (user) document.getElementById('mysql-user').value = user;
    if (db) document.getElementById('mysql-database').value = db;
}

// ==================== UI工具函数 ====================

/**
 * 显示加载遮罩
 * @param {string} message - 加载消息
 */
function showLoading(message = '处理中...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingMessage = document.getElementById('loadingMessage');
    
    if (loadingOverlay && loadingMessage) {
        loadingMessage.textContent = message;
        loadingOverlay.classList.add('active');
    }
}

/**
 * 隐藏加载遮罩
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}

/**
 * 显示消息模态框
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (info, success, error, warning)
 */
function showMessage(title, message, type = 'info') {
    const modal = new bootstrap.Modal(document.getElementById('messageModal'));
    const titleEl = document.getElementById('messageModalTitle');
    const bodyEl = document.getElementById('messageModalBody');
    
    if (!modal || !titleEl || !bodyEl) return;
    
    titleEl.textContent = title;
    
    // 根据类型添加样式
    let icon = 'ℹ️';
    let colorClass = 'text-info';
    
    switch (type) {
        case 'success':
            icon = '✅';
            colorClass = 'text-success';
            break;
        case 'error':
            icon = '❌';
            colorClass = 'text-danger';
            break;
        case 'warning':
            icon = '⚠️';
            colorClass = 'text-warning';
            break;
    }
    
    bodyEl.innerHTML = `<div class="${colorClass}">${icon} ${message}</div>`;
    
    try {
        modal.show();
    } catch (e) {
        console.error('显示消息框失败:', e);
    }
}

/**
 * 显示确认对话框
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 * @param {Function} onConfirm - 确认回调函数
 */
function showConfirm(title, message, onConfirm) {
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    const titleEl = document.getElementById('confirmModalTitle');
    const bodyEl = document.getElementById('confirmModalBody');
    const confirmBtn = document.getElementById('confirmModalBtn');
    
    if (!modal || !titleEl || !bodyEl || !confirmBtn) return;
    
    titleEl.textContent = title;
    bodyEl.innerHTML = message;
    
    // 设置确认按钮点击事件
    confirmBtn.onclick = function() {
        modal.hide();
        if (onConfirm) onConfirm();
    };
    
    try {
        modal.show();
    } catch (e) {
        console.error('显示确认框失败:', e);
    }
}

// ==================== 数据库配置管理 ====================

/**
 * 加载数据库配置
 */
async function loadDatabaseConfig() {
    try {
        showLoading('正在加载数据库配置...');
        const response = await axios.get('/admin/database/config');
        
        if (response.data.success) {
            const config = response.data.config;
            updateConfigDisplay(config);
            showMessage('成功', '配置加载完成', 'success');
        } else {
            showMessage('加载失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `加载配置失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 更新配置显示
 * @param {Object} config - 配置对象
 */
function updateConfigDisplay(config) {
    if (!config) return;
    
    // 更新数据库类型
    const dbTypeEl = document.getElementById('current-db-type');
    if (dbTypeEl) {
        dbTypeEl.value = config.db_type || 'sqlite';
    }
    
    // 更新SQLite配置
    if (config.db_type === 'sqlite') {
        const sqlitePathEl = document.getElementById('current-sqlite-path');
        if (sqlitePathEl) {
            sqlitePathEl.value = config.sqlite_path || 'audiovisual.db';
        }
    } else if (config.db_type === 'mysql') {
        // 更新MySQL配置
        const mysqlFields = ['host', 'port', 'user', 'db'];
        mysqlFields.forEach(field => {
            const key = `mysql_${field}`;
            const element = document.getElementById(`current-mysql-${field}`);
            if (element && config[key]) {
                element.value = config[key];
            }
        });
    }
    
    // 更新应用配置
    if (config.app_config) {
        // 可以在这里添加应用配置的显示
    }
}

/**
 * 测试MySQL连接
 */
async function testMysqlConnection() {
    const host = document.getElementById('mysql-host')?.value;
    const port = document.getElementById('mysql-port')?.value;
    const user = document.getElementById('mysql-user')?.value;
    const password = document.getElementById('mysql-password')?.value;
    const database = document.getElementById('mysql-database')?.value;
    
    if (!host || !port || !user || !database) {
        showMessage('警告', '请填写完整的MySQL连接信息', 'warning');
        return;
    }
    
    try {
        showLoading('正在测试MySQL连接...');
        
        const response = await axios.post('/admin/database/test-connection', {
            db_type: 'mysql',
            mysql_config: {
                host: host,
                port: port,
                user: user,
                password: password,
                database: database
            }
        });
        
        if (response.data.success) {
            showMessage('成功', 'MySQL连接测试成功', 'success');
        } else {
            showMessage('失败', `连接测试失败: ${response.data.message}`, 'error');
        }
    } catch (error) {
        showMessage('错误', `测试连接失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 测试数据库连接（通用）
 */
async function testDatabaseConnection() {
    try {
        showLoading('正在测试数据库连接...');
        const response = await axios.get('/admin/database/info');
        
        if (response.data.success && response.data.info.status === 'connected') {
            showMessage('成功', '数据库连接正常', 'success');
        } else {
            showMessage('失败', '数据库连接失败', 'error');
        }
    } catch (error) {
        showMessage('错误', `测试连接失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 保存数据库配置
 */
async function saveDatabaseConfig() {
    // 获取选中的数据库类型
    const dbTypeInput = document.querySelector('input[name="db-type"]:checked');
    if (!dbTypeInput) {
        showMessage('错误', '请选择数据库类型', 'error');
        return;
    }
    
    const dbType = dbTypeInput.id === 'db-type-mysql' ? 'mysql' : 'sqlite';
    const config = { db_type: dbType };
    
    if (dbType === 'sqlite') {
        const sqlitePath = document.getElementById('new-sqlite-path')?.value;
        if (!sqlitePath) {
            showMessage('警告', '请填写SQLite文件路径', 'warning');
            return;
        }
        config.sqlite_path = sqlitePath;
    } else {
        const host = document.getElementById('mysql-host')?.value;
        const port = document.getElementById('mysql-port')?.value;
        const user = document.getElementById('mysql-user')?.value;
        const password = document.getElementById('mysql-password')?.value;
        const database = document.getElementById('mysql-database')?.value;
        
        if (!host || !port || !user || !database) {
            showMessage('警告', '请填写完整的MySQL连接信息', 'warning');
            return;
        }
        
        config.mysql_config = {
            host: host,
            port: port,
            user: user,
            password: password,
            database: database
        };
    }
    
    showConfirm('确认保存', '您确定要保存新的数据库配置吗？配置修改后需要重启应用才能生效。', async () => {
        try {
            showLoading('正在保存数据库配置...');
            
            const response = await axios.put('/admin/database/update-config', config);
            
            if (response.data.success) {
                showMessage('成功', response.data.message, 'success');
                // 重新加载配置
                setTimeout(() => {
                    loadDatabaseConfig();
                    loadDatabaseInfo();
                }, 1500);
            } else {
                showMessage('失败', response.data.message, 'error');
            }
        } catch (error) {
            showMessage('错误', `保存配置失败: ${error.message}`, 'error');
        } finally {
            hideLoading();
        }
    });
}

// ==================== 数据库信息加载 ====================

/**
 * 加载数据库信息
 */
async function loadDatabaseInfo() {
    try {
        showLoading('正在获取数据库信息...');
        const response = await axios.get('/admin/database/info');
        
        if (response.data.success) {
            const info = response.data.info;
            updateOverviewCards(info);
            updateInfoTable(info);
        } else {
            showMessage('加载失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `获取数据库信息失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 更新概览卡片
 * @param {Object} info - 数据库信息
 */
function updateOverviewCards(info) {
    const statusMap = {
        'connected': { text: '已连接', className: 'text-success' },
        'error': { text: '未连接', className: 'text-danger' },
        'unknown': { text: '未知', className: 'text-warning' }
    };
    
    const status = statusMap[info.status] || statusMap.unknown;
    
    // 更新状态卡片
    const statusEl = document.getElementById('db-status');
    const typeEl = document.getElementById('db-type');
    const sizeEl = document.getElementById('db-size');
    const tableEl = document.getElementById('table-count');
    const createdEl = document.getElementById('db-created');
    
    if (statusEl) {
        statusEl.textContent = status.text;
        statusEl.className = status.className;
    }
    
    if (typeEl) typeEl.textContent = `类型：${info.type || '未知'}`;
    if (sizeEl) sizeEl.textContent = info.size_mb ? `${info.size_mb} MB` : '--';
    if (tableEl) tableEl.textContent = info.tables ? info.tables.length : '--';
    if (createdEl) createdEl.textContent = info.created_at ? info.created_at.split(' ')[0] : '--';
}

/**
 * 更新详细信息表格
 * @param {Object} info - 数据库信息
 */
function updateInfoTable(info) {
    const tbody = document.querySelector('#db-info-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const rows = [
        ['状态', getStatusBadge(info.status), '数据库连接状态'],
        ['类型', info.type || '未知', '数据库类型'],
        ['连接状态', getConnectionStatusBadge(info.connection_status), '连接测试结果'],
        ['表数量', info.tables ? info.tables.length : '未知', '数据库中表的数量'],
        ['大小', info.size_mb ? `${info.size_mb} MB` : '未知', '数据库文件大小'],
        ['创建时间', info.created_at || '未知', '最早数据创建时间']
    ];
    
    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${row[0]}</strong></td>
            <td>${row[1]}</td>
            <td><small class="text-muted">${row[2]}</small></td>
        `;
        tbody.appendChild(tr);
    });
    
    // 如果有表，添加表列表
    if (info.tables && info.tables.length > 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>数据表列表</strong></td>
            <td colspan="2">
                <div class="d-flex flex-wrap gap-1">
                    ${info.tables.map(table => `<span class="badge bg-secondary">${table}</span>`).join('')}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

/**
 * 获取状态徽章HTML
 * @param {string} status - 状态字符串
 * @returns {string} 徽章HTML
 */
function getStatusBadge(status) {
    const badges = {
        'connected': '<span class="badge bg-success">已连接</span>',
        'error': '<span class="badge bg-danger">未连接</span>',
    };
    return badges[status] || '<span class="badge bg-warning">未知</span>';
}

/**
 * 获取连接状态徽章HTML
 * @param {string} connectionStatus - 连接状态字符串
 * @returns {string} 徽章HTML
 */
function getConnectionStatusBadge(connectionStatus) {
    if (!connectionStatus) return '<span class="badge bg-secondary">未知</span>';
    
    if (connectionStatus === 'success' || connectionStatus.includes('success')) {
        return '<span class="badge bg-success">正常</span>';
    } else if (connectionStatus.includes('error')) {
        return `<span class="badge bg-danger">${connectionStatus}</span>`;
    } else {
        return `<span class="badge bg-warning">${connectionStatus}</span>`;
    }
}

// ==================== 数据迁移功能 ====================

/**
 * 预检查迁移
 */
async function precheckMigration() {
    // 获取MySQL配置
    const host = document.getElementById('migration-host')?.value;
    const port = document.getElementById('migration-port')?.value;
    const user = document.getElementById('migration-user')?.value;
    const password = document.getElementById('migration-password')?.value;
    const database = document.getElementById('migration-database')?.value;
    
    if (!host || !port || !user || !database) {
        showMessage('警告', '请填写完整的MySQL连接信息', 'warning');
        return;
    }
    
    try {
        showLoading('正在进行迁移预检查...');
        
        const response = await axios.post('/admin/database/test-connection', {
            db_type: 'mysql',
            mysql_config: {
                host: host,
                port: port,
                user: user,
                password: password,
                database: database
            }
        });
        
        if (response.data.success) {
            showMessage('预检查通过', 'MySQL连接正常，可以开始迁移', 'success');
        } else {
            showMessage('预检查失败', `连接测试失败: ${response.data.message}`, 'error');
        }
    } catch (error) {
        showMessage('错误', `预检查失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 开始数据迁移
 */
async function startMigration() {
    // 获取配置信息
    const host = document.getElementById('migration-host')?.value;
    const port = document.getElementById('migration-port')?.value;
    const user = document.getElementById('migration-user')?.value;
    const password = document.getElementById('migration-password')?.value;
    const database = document.getElementById('migration-database')?.value;
    const description = document.getElementById('migration-description')?.value;
    
    if (!host || !port || !user || !database) {
        showMessage('警告', '请填写完整的MySQL连接信息', 'warning');
        return;
    }
    
    if (!description) {
        showMessage('警告', '请填写迁移描述', 'warning');
        return;
    }
    
    showConfirm('确认开始迁移', 
        `您确定要开始数据迁移吗？<br><br>
        <strong>迁移方向：</strong> SQLite → MySQL<br>
        <strong>目标数据库：</strong> ${user}@${host}:${port}/${database}<br><br>
        <strong>⚠️ 警告：</strong> 迁移可能需要较长时间，请确保服务器连接稳定。`,
        async () => {
            try {
                showLoading('正在启动迁移任务...');
                
                const response = await axios.post('/admin/database/migrate/sqlite-to-mysql', {
                    mysql_config: {
                        host: host,
                        port: port,
                        user: user,
                        password: password,
                        database: database
                    },
                    description: description
                });
                
                if (response.data.success) {
                    currentMigrationId = response.data.migration_id;
                    showMessage('迁移开始', '迁移任务已启动，正在后台执行', 'success');
                    
                    // 显示迁移状态区域
                    const statusSection = document.getElementById('migration-status-section');
                    if (statusSection) {
                        statusSection.style.display = 'block';
                    }
                    
                    // 启用停止按钮
                    const stopBtn = document.getElementById('stop-migration-btn');
                    if (stopBtn) {
                        stopBtn.disabled = false;
                    }
                    
                    // 禁用开始按钮
                    const startBtn = document.getElementById('start-migration-btn');
                    if (startBtn) {
                        startBtn.disabled = true;
                    }
                    
                    // 开始轮询迁移状态
                    startMigrationPolling();
                } else {
                    showMessage('启动失败', response.data.message, 'error');
                }
            } catch (error) {
                showMessage('错误', `启动迁移失败: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
}

/**
 * 开始轮询迁移状态
 */
function startMigrationPolling() {
    if (migrationInterval) {
        clearInterval(migrationInterval);
    }
    
    // 立即查询一次状态
    checkMigrationStatus();
    
    // 设置轮询间隔（每2秒一次）
    migrationInterval = setInterval(checkMigrationStatus, 2000);
}

/**
 * 检查迁移状态
 */
async function checkMigrationStatus() {
    if (!currentMigrationId) return;
    
    try {
        const response = await axios.get(`/admin/database/migration/${currentMigrationId}/status`);
        
        if (response.data.success) {
            updateMigrationUI(response.data.task);
            
            // 如果迁移完成，停止轮询
            const status = response.data.task.status;
            if (status === 'completed' || status === 'failed') {
                clearInterval(migrationInterval);
                migrationInterval = null;
                
                // 重新启用开始按钮
                const startBtn = document.getElementById('start-migration-btn');
                if (startBtn) {
                    startBtn.disabled = false;
                }
            }
        }
    } catch (error) {
        console.error('检查迁移状态失败:', error);
    }
}

/**
 * 更新迁移UI
 * @param {Object} task - 迁移任务数据
 */
function updateMigrationUI(task) {
    const progressBar = document.getElementById('migration-progress-bar');
    const progressText = document.getElementById('migration-progress-text');
    const statusText = document.getElementById('migration-status-text');
    const messageEl = document.getElementById('migration-message');
    const taskNameEl = document.getElementById('migration-task-name');
    
    if (progressBar) {
        progressBar.style.width = `${task.progress || 0}%`;
        progressBar.textContent = `${task.progress || 0}%`;
    }
    
    if (progressText) {
        progressText.textContent = `${task.progress || 0}%`;
    }
    
    if (statusText) {
        statusText.textContent = task.current_message || '等待启动...';
    }
    
    if (messageEl) {
        if (task.status === 'completed') {
            messageEl.className = 'alert alert-success';
            messageEl.innerHTML = `<strong>✅ 迁移完成！</strong><br>${task.message || ''}`;
        } else if (task.status === 'failed') {
            messageEl.className = 'alert alert-danger';
            messageEl.innerHTML = `<strong>❌ 迁移失败！</strong><br>${task.message || ''}`;
        } else if (task.status === 'running') {
            messageEl.className = 'alert alert-info';
            messageEl.innerHTML = `<strong>🚀 迁移进行中...</strong><br>${task.current_message || ''}`;
        } else {
            messageEl.className = 'alert alert-secondary';
            messageEl.innerHTML = `<strong>📋 迁移状态</strong><br>${task.current_message || ''}`;
        }
    }
    
    if (taskNameEl) {
        taskNameEl.textContent = task.description || 'SQLite to MySQL 迁移';
    }
}

/**
 * 检查是否有迁移任务
 */
async function checkMigrationTasks() {
    try {
        const response = await axios.get('/admin/database/migration/history');
        if (response.data.success && response.data.history) {
            const latestMigration = response.data.history[0];
            if (latestMigration && latestMigration.timestamp) {
                // 检查是否有最近24小时的迁移
                const migrationTime = new Date(latestMigration.timestamp);
                const now = new Date();
                const hoursDiff = (now - migrationTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    showMessage('迁移通知', `最近 ${Math.round(hoursDiff)} 小时内有数据迁移操作`, 'info');
                }
            }
        }
    } catch (error) {
        console.error('检查迁移任务失败:', error);
    }
}

/**
 * 刷新迁移状态
 */
function refreshMigrationStatus() {
    if (currentMigrationId) {
        checkMigrationStatus();
    } else {
        showMessage('提示', '当前没有进行中的迁移任务', 'info');
    }
}

/**
 * 停止迁移
 */
async function stopMigration() {
    if (!currentMigrationId) {
        showMessage('错误', '没有进行中的迁移任务', 'error');
        return;
    }
    
    showConfirm('确认停止', '您确定要停止当前的迁移任务吗？停止后无法恢复。', async () => {
        showMessage('提示', '停止迁移功能开发中...', 'info');
        // 这里可以添加停止迁移的API调用
    });
}

/**
 * 加载迁移历史
 */
async function loadMigrationHistory() {
    try {
        showLoading('正在加载迁移历史...');
        const response = await axios.get('/admin/database/migration/history');
        
        if (response.data.success) {
            updateMigrationHistoryTable(response.data.history);
        } else {
            showMessage('加载失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `加载迁移历史失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 更新迁移历史表格
 * @param {Array} history - 迁移历史数据
 */
function updateMigrationHistoryTable(history) {
    const tbody = document.querySelector('#migration-history-table tbody');
    const emptyRow = document.getElementById('migration-history-empty');
    
    if (!tbody) return;
    
    // 清空表格（保留空行占位）
    const rows = tbody.querySelectorAll('tr:not(#migration-history-empty)');
    rows.forEach(row => row.remove());
    
    if (emptyRow) {
        emptyRow.style.display = history && history.length > 0 ? 'none' : '';
    }
    
    if (!history || history.length === 0) return;
    
    // 添加历史记录行
    history.forEach(item => {
        const tr = document.createElement('tr');
        
        const time = new Date(item.timestamp).toLocaleString('zh-CN');
        const source = item.source || '未知';
        const destination = item.destination || '未知';
        const status = item.stats ? '完成' : '失败';
        
        let statsHtml = '';
        if (item.stats) {
            statsHtml = `
                <div class="small">
                    表: ${item.stats.tables || 0}个<br>
                    行: ${item.stats.rows || 0}行<br>
                    错误: ${item.stats.errors?.length || 0}个
                </div>
            `;
        } else {
            statsHtml = '<span class="badge bg-danger">迁移失败</span>';
        }
        
        tr.innerHTML = `
            <td><small>${time}</small></td>
            <td>${source} → ${destination}</td>
            <td>${status === '完成' ? '<span class="badge bg-success">完成</span>' : '<span class="badge bg-danger">失败</span>'}</td>
            <td>${statsHtml}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

/**
 * 显示迁移历史
 */
function showMigrationHistory() {
    loadMigrationHistory();
    // 如果有模态框可以在这里显示
}

// ==================== 备份恢复功能 ====================

/**
 * 创建系统备份
 */
async function createSystemBackup() {
    const backupType = document.getElementById('backup-type')?.value;
    const description = document.getElementById('backup-description')?.value;
    
    if (!description) {
        showMessage('警告', '请填写备份描述', 'warning');
        return;
    }
    
    try {
        showLoading('正在创建系统备份...');
        
        const response = await axios.post('/admin/database/backup/system', {
            backup_type: backupType,
            description: description
        });
        
        if (response.data.success) {
            showMessage('备份创建成功', response.data.message, 'success');
            // 刷新备份列表
            setTimeout(loadBackupList, 1000);
        } else {
            showMessage('备份失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `创建备份失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 加载备份列表
 */
async function loadBackupList() {
    try {
        showLoading('正在加载备份列表...');
        const response = await axios.get('/admin/backup/list');
        
        if (response.data.success) {
            updateBackupTable(response.data.backups);
        } else {
            showMessage('加载失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `加载备份列表失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 更新备份表格
 * @param {Array} backups - 备份列表数据
 */
function updateBackupTable(backups) {
    const tbody = document.querySelector('#backup-list-table tbody');
    const emptyRow = document.getElementById('backup-list-empty');
    
    if (!tbody) return;
    
    // 清空表格（保留空行占位）
    const rows = tbody.querySelectorAll('tr:not(#backup-list-empty)');
    rows.forEach(row => row.remove());
    
    if (emptyRow) {
        emptyRow.style.display = backups && backups.length > 0 ? 'none' : '';
    }
    
    if (!backups || backups.length === 0) return;
    
    // 添加备份记录行
    backups.forEach(backup => {
        const tr = document.createElement('tr');
        
        const sizeKB = Math.round((backup.file_size || 0) / 1024);
        const time = backup.created_at ? new Date(backup.created_at).toLocaleString('zh-CN') : '未知';
        
        tr.innerHTML = `
            <td>
                <strong>${backup.filename}</strong><br>
                <small class="text-muted">${backup.description || '无描述'}</small>
            </td>
            <td>${sizeKB} KB</td>
            <td><small>${time}</small></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <a href="/admin/backup/download/${backup.id}" class="btn btn-outline-primary">
                        下载
                    </a>
                    <button class="btn btn-outline-success" onclick="restoreBackup(${backup.id})">
                        恢复
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteBackup(${backup.id})">
                        删除
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

/**
 * 恢复备份
 * @param {number|string} backupId - 备份ID
 */
async function restoreBackup(backupId) {
    showConfirm('确认恢复', 
        `您确定要从备份恢复数据吗？<br><br>
        <strong>⚠️ 警告：</strong> 恢复操作将覆盖当前数据，请确保已做好必要的备份！`,
        async () => {
            try {
                showLoading('正在从备份恢复数据...');
                
                const response = await axios.post(`/admin/backup/restore/${backupId}`, {
                    mode: 'overwrite'
                });
                
                if (response.data.success) {
                    showMessage('恢复成功', response.data.message, 'success');
                } else {
                    showMessage('恢复失败', response.data.message, 'error');
                }
            } catch (error) {
                showMessage('错误', `恢复备份失败: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
}

/**
 * 删除备份
 * @param {number|string} backupId - 备份ID
 */
async function deleteBackup(backupId) {
    showConfirm('确认删除', 
        `您确定要删除这个备份文件吗？删除后无法恢复。`,
        async () => {
            try {
                showLoading('正在删除备份...');
                
                const response = await axios.delete(`/admin/backup/delete/${backupId}`);
                
                if (response.data.success) {
                    showMessage('删除成功', response.data.message, 'success');
                    // 刷新备份列表
                    setTimeout(loadBackupList, 1000);
                } else {
                    showMessage('删除失败', response.data.message, 'error');
                }
            } catch (error) {
                showMessage('错误', `删除备份失败: ${error.message}`, 'error');
            } finally {
                hideLoading();
            }
        });
}

/**
 * 打开导入备份模态框
 */
function openImportModal() {
    const modal = new bootstrap.Modal(document.getElementById('importModal'));
    try {
        modal.show();
    } catch (e) {
        console.error('打开导入模态框失败:', e);
    }
}

/**
 * 提交导入备份
 */
async function submitImportBackup() {
    const fileInput = document.getElementById('backupFile');
    const modeSelect = document.getElementById('importMode');
    
    if (!fileInput.files.length) {
        showMessage('警告', '请选择备份文件', 'warning');
        return;
    }
    
    const formData = new FormData();
    formData.append('backup_file', fileInput.files[0]);
    formData.append('mode', modeSelect.value);
    
    try {
        showLoading('正在导入备份数据...');
        
        const response = await axios.post('/admin/backup/import', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (response.data.success) {
            showMessage('导入成功', response.data.message, 'success');
            
            // 关闭模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('importModal'));
            if (modal) modal.hide();
        } else {
            showMessage('导入失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `导入备份失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// ==================== 状态监控功能 ====================

/**
 * 加载详细状态
 */
async function loadDetailedStatus() {
    try {
        showLoading('正在加载系统状态...');
        const response = await axios.get('/admin/database/status');
        
        if (response.data.success) {
            updateStatusCards(response.data.database?.stats || {});
            updateStatusTable(response.data);
        } else {
            showMessage('加载失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `加载状态失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 更新状态卡片
 * @param {Object} stats - 统计数据
 */
function updateStatusCards(stats) {
    if (!stats) return;
    
    const elements = {
        'users': document.getElementById('stats-users'),
        'active_users': document.getElementById('stats-active-users'),
        'apis': document.getElementById('stats-apis'),
        'enabled_apis': document.getElementById('stats-enabled-apis'),
        'sites': document.getElementById('stats-sites'),
        'enabled_sites': document.getElementById('stats-enabled-sites'),
        'calls': document.getElementById('stats-calls'),
        'success_rate': document.getElementById('stats-success-rate')
    };
    
    if (elements.users) elements.users.textContent = stats.users || '--';
    if (elements.active_users) elements.active_users.textContent = `活跃：${stats.active_users || '--'}`;
    if (elements.apis) elements.apis.textContent = stats.parse_apis || '--';
    if (elements.enabled_apis) elements.enabled_apis.textContent = `启用：${stats.enabled_apis || '--'}`;
    if (elements.sites) elements.sites.textContent = stats.drama_sites || '--';
    if (elements.enabled_sites) elements.enabled_sites.textContent = `启用：${stats.enabled_sites || '--'}`;
    if (elements.calls) elements.calls.textContent = stats.total_api_calls || '--';
    if (elements.success_rate) elements.success_rate.textContent = `成功率：${stats.success_rate || 0}%`;
}

/**
 * 更新状态表格
 * @param {Object} data - 完整状态数据
 */
function updateStatusTable(data) {
    const tbody = document.querySelector('#detailed-status-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!data.database || !data.system) {
        // 添加错误行
        addStatusRow('系统状态', '数据加载失败', 'error', '请刷新页面重试');
        return;
    }
    
    const db = data.database;
    const sys = data.system;
    
    // 数据库状态行
    addStatusRow('数据库连接', 
                 db.info?.status === 'connected' ? '正常' : '异常', 
                 db.info?.status === 'connected' ? 'good' : 'error',
                 db.info?.status === 'connected' ? '连接稳定' : '检查数据库配置');
    
    addStatusRow('数据库大小', 
                 db.info?.size_mb ? `${db.info.size_mb} MB` : '未知',
                 db.info?.size_mb > 100 ? 'warning' : 'good',
                 db.info?.size_mb > 100 ? '数据库较大，建议定期清理' : '大小正常');
    
    // 系统状态行
    if (sys.disk_usage) {
        const diskPercent = sys.disk_usage.percent || 0;
        addStatusRow('磁盘使用率', 
                     `${diskPercent}% (${sys.disk_usage.free_gb || 0} GB 可用)`,
                     diskPercent > 90 ? 'error' : diskPercent > 70 ? 'warning' : 'good',
                     diskPercent > 90 ? '磁盘空间不足，需要清理' : '空间充足');
    }
    
    if (sys.memory_usage) {
        const memoryPercent = sys.memory_usage.percent || 0;
        addStatusRow('内存使用率', 
                     `${memoryPercent}% (${sys.memory_usage.used_gb || 0} GB / ${sys.memory_usage.total_gb || 0} GB)`,
                     memoryPercent > 90 ? 'error' : memoryPercent > 80 ? 'warning' : 'good',
                     memoryPercent > 90 ? '内存使用过高，考虑优化' : '内存使用正常');
    }
    
    if (db.stats) {
        const successRate = db.stats.success_rate || 0;
        addStatusRow('API调用成功率', 
                     `${successRate}% (${db.stats.successful_calls || 0} / ${db.stats.total_api_calls || 0} 次)`,
                     successRate > 95 ? 'good' : successRate > 80 ? 'warning' : 'error',
                     successRate > 95 ? 'API调用稳定' : successRate > 80 ? '建议检查失败原因' : 'API问题较多，需要检查');
    }
    
    // 时间戳行
    addStatusRow('检查时间', data.timestamp || '未知', 'info', '最后状态更新时间');
}

/**
 * 添加状态表格行
 * @param {string} metric - 指标名称
 * @param {string} value - 指标值
 * @param {string} status - 状态类型 (good, warning, error, info)
 * @param {string} suggestion - 建议说明
 */
function addStatusRow(metric, value, status, suggestion) {
    const tbody = document.querySelector('#detailed-status-table tbody');
    if (!tbody) return;
    
    const statusMap = {
        'good': { badge: 'bg-success', icon: '✅' },
        'warning': { badge: 'bg-warning', icon: '⚠️' },
        'error': { badge: 'bg-danger', icon: '❌' },
        'info': { badge: 'bg-info', icon: 'ℹ️' }
    };
    
    const statusInfo = statusMap[status] || statusMap.info;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><strong>${metric}</strong></td>
        <td>${statusInfo.icon} ${value}</td>
        <td><span class="badge ${statusInfo.badge}">${status}</span></td>
        <td><small class="text-muted">${suggestion}</small></td>
    `;
    
    tbody.appendChild(tr);
}

/**
 * 诊断连接
 */
async function diagnoseConnections() {
    try {
        showLoading('正在诊断系统连接...');
        
        const [dbResponse, configResponse] = await Promise.all([
            axios.get('/admin/database/info'),
            axios.get('/admin/database/config')
        ]);
        
        let messages = [];
        
        // 检查数据库连接
        if (dbResponse.data.success && dbResponse.data.info.status === 'connected') {
            messages.push('✅ 数据库连接正常');
        } else {
            messages.push('❌ 数据库连接异常');
        }
        
        // 检查配置
        if (configResponse.data.success) {
            messages.push('✅ 配置加载正常');
            
            const config = configResponse.data.config;
            if (config.db_type === 'mysql') {
                // 测试MySQL连接
                const testResponse = await axios.post('/admin/database/test-connection', {
                    db_type: 'mysql',
                    mysql_config: config
                });
                
                if (testResponse.data.success) {
                    messages.push('✅ MySQL配置有效');
                } else {
                    messages.push(`❌ MySQL连接测试失败: ${testResponse.data.message}`);
                }
            } else {
                messages.push('✅ SQLite配置检查通过');
            }
        } else {
            messages.push('❌ 配置加载失败');
        }
        
        showMessage('连接诊断结果', messages.join('<br>'), messages.includes('❌') ? 'warning' : 'success');
        
    } catch (error) {
        showMessage('错误', `连接诊断失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 优化数据库
 */
async function optimizeDatabase() {
    showMessage('提示', '数据库优化功能开发中...', 'info');
    // 这里可以添加数据库优化的API调用
}

/**
 * 生成状态报告
 */
async function generateStatusReport() {
    try {
        showLoading('正在生成状态报告...');
        
        const response = await axios.get('/admin/database/status');
        
        if (response.data.success) {
            const report = formatStatusReport(response.data);
            showMessage('状态报告', report, 'info');
        } else {
            showMessage('生成失败', response.data.message, 'error');
        }
    } catch (error) {
        showMessage('错误', `生成报告失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

/**
 * 格式化状态报告
 * @param {Object} data - 状态数据
 * @returns {string} 格式化的报告文本
 */
function formatStatusReport(data) {
    if (!data.database || !data.system) {
        return '状态数据不完整';
    }
    
    const db = data.database;
    const sys = data.system;
    
    let report = `
<h5>📋 系统状态报告</h5>
<small>生成时间: ${data.timestamp || new Date().toLocaleString()}</small>
<hr>

<h6>📊 数据库状态</h6>
<ul>
    <li><strong>连接状态:</strong> ${db.info?.status === 'connected' ? '✅ 正常' : '❌ 异常'}</li>
    <li><strong>数据库类型:</strong> ${db.info?.type || '未知'}</li>
    <li><strong>表数量:</strong> ${db.info?.tables?.length || 0}</li>
    <li><strong>数据库大小:</strong> ${db.info?.size_mb || 0} MB</li>
</ul>

<h6>📈 系统统计</h6>
`;

    if (db.stats) {
        report += `<ul>
    <li><strong>用户数量:</strong> ${db.stats.users || 0} (${db.stats.active_users || 0} 活跃)</li>
    <li><strong>API接口:</strong> ${db.stats.parse_apis || 0} (${db.stats.enabled_apis || 0} 启用)</li>
    <li><strong>导航网站:</strong> ${db.stats.drama_sites || 0} (${db.stats.enabled_sites || 0} 启用)</li>
    <li><strong>API调用:</strong> ${db.stats.total_api_calls || 0} 次 (成功率: ${db.stats.success_rate || 0}%)</li>
</ul>`;
    }

    if (sys.disk_usage) {
        report += `
<h6>💾 系统资源</h6>
<ul>
    <li><strong>磁盘空间:</strong> ${sys.disk_usage.percent || 0}% 使用 (${sys.disk_usage.free_gb || 0} GB 可用)</li>
    <li><strong>内存使用:</strong> ${sys.memory_usage?.percent || 0}%</li>
    <li><strong>操作系统:</strong> ${sys.os || '未知'}</li>
</ul>`;
    }

    report += `
<hr>
<small class="text-muted">报告生成完成 - AudioVisual 数据库管理系统</small>`;

    return report;
}

/**
 * 导出状态报告
 */
function exportStatusReport() {
    showMessage('提示', '报告导出功能开发中...', 'info');
    // 这里可以添加导出报告的功能
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles() {
    showConfirm('确认清理', 
        '您确定要清理系统临时文件吗？<br><br>清理操作将删除不重要的缓存文件，不会影响数据库数据。',
        async () => {
            showMessage('提示', '临时文件清理功能开发中...', 'info');
            // 这里可以添加清理临时文件的API调用
        });
}

// ==================== 其他工具函数 ====================

/**
 * 浏览SQLite文件路径
 */
function browseSqlitePath() {
    showMessage('提示', '文件浏览器功能需要浏览器API支持，请手动输入文件路径或使用默认路径。', 'info');
}

// ==================== 导出函数到全局作用域 ====================
// 让函数可以从HTML中调用
window.loadDatabaseInfo = loadDatabaseInfo;
window.loadDatabaseConfig = loadDatabaseConfig;
window.testDatabaseConnection = testDatabaseConnection;
window.testMysqlConnection = testMysqlConnection;
window.saveDatabaseConfig = saveDatabaseConfig;

window.precheckMigration = precheckMigration;
window.startMigration = startMigration;
window.refreshMigrationStatus = refreshMigrationStatus;
window.stopMigration = stopMigration;
window.showMigrationHistory = showMigrationHistory;
window.loadMigrationHistory = loadMigrationHistory;

window.createSystemBackup = createSystemBackup;
window.loadBackupList = loadBackupList;
window.restoreBackup = restoreBackup;
window.deleteBackup = deleteBackup;
window.openImportModal = openImportModal;
window.submitImportBackup = submitImportBackup;

window.loadDetailedStatus = loadDetailedStatus;
window.diagnoseConnections = diagnoseConnections;
window.optimizeDatabase = optimizeDatabase;
window.generateStatusReport = generateStatusReport;
window.exportStatusReport = exportStatusReport;
window.cleanupTempFiles = cleanupTempFiles;

window.browseSqlitePath = browseSqlitePath;