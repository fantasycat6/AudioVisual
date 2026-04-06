/**
 * 管理后台路由 - 用户管理、接口管理、导航管理、备份恢复
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { ParseAPI, DramaSite, UserModel, APICallLog, BackupFile } = require('../db');
const { loginRequired, adminRequired, formatChinaTime, getChinaNow } = require('../middleware/auth');

// 文件上传配置
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 所有路由都需要登录和管理员权限
router.use(loginRequired);
router.use(adminRequired);

// 管理后台首页
router.get('/', (req, res) => {
    const userCount = UserModel.count();
    const apiCount = ParseAPI.count();
    const siteCount = DramaSite.count();
    
    const totalApiCalls = APICallLog.count();
    const todayCalls = APICallLog.countToday();
    const successfulCalls = APICallLog.countSuccess();
    const successRate = totalApiCalls > 0 ? (successfulCalls / totalApiCalls * 100).toFixed(2) : 0;
    
    // 最近24小时趋势
    const trend = APICallLog.getLast24HoursTrend();
    
    // API使用统计
    const apiStats = APICallLog.getApiStats(10);

    res.render('admin/index', {
        userCount,
        apiCount,
        siteCount,
        total_api_calls: totalApiCalls,
        today_calls: todayCalls,
        success_rate: successRate,
        api_stats: apiStats,
        last_24h_counts_json: JSON.stringify(trend.counts),
        last_24h_hours_json: JSON.stringify(trend.hours),
        user: req.user,
        formatChinaTime
    });
});

// ==================== 数据备份管理 ====================

// 备份管理页面
router.get('/backup', (req, res) => {
    res.render('admin/backup', {
        user: req.user,
        formatChinaTime
    });
});

// ==================== 用户管理 ====================

// 用户列表页
router.get('/users', (req, res) => {
    const users = UserModel.findAll();
    res.render('admin/users', {
        users,
        user: req.user,
        formatChinaTime
    });
});

// 切换管理员状态
router.post('/users/:id/toggle-admin', (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
        return res.status(400).json({ success: false, message: '不能修改自己的管理员状态' });
    }
    
    const user = UserModel.toggleAdmin(userId);
    res.json({ success: true, is_admin: user.is_admin === 1 });
});

// 重置用户密码
router.post('/users/:id/reset-password', (req, res) => {
    const userId = parseInt(req.params.id);
    const { password } = req.body;
    
    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, message: '密码至少需要6个字符' });
    }
    
    UserModel.updatePassword(userId, password);
    res.json({ success: true, message: '密码已重置' });
});

// 删除用户
router.delete('/users/:id', (req, res) => {
    const userId = parseInt(req.params.id);
    
    if (userId === req.user.id) {
        return res.status(400).json({ success: false, message: '不能删除自己的账号' });
    }
    
    UserModel.delete(userId);
    res.json({ success: true, message: '用户已删除' });
});

// 修改当前管理员密码
router.post('/users/change-password', (req, res) => {
    const { old_password, new_password } = req.body;
    
    if (!old_password || !new_password) {
        return res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
    }
    
    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: '新密码至少需要6个字符' });
    }
    
    if (!UserModel.verifyPassword(req.user, old_password)) {
        return res.status(400).json({ success: false, message: '旧密码错误' });
    }
    
    UserModel.updatePassword(req.user.id, new_password);
    res.json({ success: true, message: '密码修改成功' });
});

// ==================== 解析接口管理 ====================

// 解析接口列表页
router.get('/apis', (req, res) => {
    const apis = ParseAPI.findAll();
    res.render('admin/apis', {
        apis,
        user: req.user,
        formatChinaTime
    });
});

// 添加解析接口
router.post('/apis/add', (req, res) => {
    const { name, url } = req.body;
    
    if (!name || !url) {
        return res.status(400).json({ success: false, message: '名称和URL不能为空' });
    }
    
    const maxOrder = ParseAPI.getMaxSortOrder();
    const api = ParseAPI.create(name, url, maxOrder + 1);
    
    res.json({ success: true, api: {
        id: api.id,
        name: api.name,
        url: api.url,
        is_enabled: api.is_enabled === 1,
        sort_order: api.sort_order
    }});
});

// 编辑解析接口
router.put('/apis/:id', (req, res) => {
    const apiId = parseInt(req.params.id);
    const { name, url, is_enabled, sort_order } = req.body;
    
    const data = {};
    if (name !== undefined) data.name = name;
    if (url !== undefined) data.url = url;
    if (is_enabled !== undefined) data.is_enabled = is_enabled;
    if (sort_order !== undefined) data.sort_order = parseInt(sort_order);
    
    const api = ParseAPI.update(apiId, data);
    
    res.json({ success: true, api: {
        id: api.id,
        name: api.name,
        url: api.url,
        is_enabled: api.is_enabled === 1,
        sort_order: api.sort_order
    }});
});

// 删除解析接口
router.delete('/apis/:id', (req, res) => {
    const apiId = parseInt(req.params.id);
    ParseAPI.delete(apiId);
    res.json({ success: true });
});

// 切换解析接口状态
router.post('/apis/:id/toggle', (req, res) => {
    const apiId = parseInt(req.params.id);
    const api = ParseAPI.toggle(apiId);
    res.json({ success: true, is_enabled: api.is_enabled === 1 });
});

// 保存拖拽排序
router.post('/apis/reorder', (req, res) => {
    const { order } = req.body;
    if (Array.isArray(order)) {
        ParseAPI.reorder(order);
    }
    res.json({ success: true });
});

// ==================== 影视导航管理 ====================

// 影视导航列表页
router.get('/drama-sites', (req, res) => {
    const sites = DramaSite.findAll();
    res.render('admin/drama_sites', {
        sites,
        user: req.user,
        formatChinaTime
    });
});

// 添加影视导航
router.post('/drama-sites/add', (req, res) => {
    const { name, url, description, icon } = req.body;
    
    if (!name || !url) {
        return res.status(400).json({ success: false, message: '名称和URL不能为空' });
    }
    
    const maxOrder = DramaSite.getMaxSortOrder();
    const site = DramaSite.create(name, url, description || '', icon || '🎬', maxOrder + 1);
    
    res.json({ success: true, site: {
        id: site.id,
        name: site.name,
        url: site.url,
        description: site.description,
        icon: site.icon,
        is_enabled: site.is_enabled === 1,
        sort_order: site.sort_order
    }});
});

// 编辑影视导航
router.put('/drama-sites/:id', (req, res) => {
    const siteId = parseInt(req.params.id);
    const { name, url, description, icon, is_enabled } = req.body;
    
    const data = {};
    if (name !== undefined) data.name = name;
    if (url !== undefined) data.url = url;
    if (description !== undefined) data.description = description;
    if (icon !== undefined) data.icon = icon;
    if (is_enabled !== undefined) data.is_enabled = is_enabled;
    
    const site = DramaSite.update(siteId, data);
    
    res.json({ success: true, site: {
        id: site.id,
        name: site.name,
        url: site.url,
        description: site.description,
        icon: site.icon,
        is_enabled: site.is_enabled === 1,
        sort_order: site.sort_order
    }});
});

// 删除影视导航
router.delete('/drama-sites/:id', (req, res) => {
    const siteId = parseInt(req.params.id);
    DramaSite.delete(siteId);
    res.json({ success: true });
});

// 切换影视导航状态
router.post('/drama-sites/:id/toggle', (req, res) => {
    const siteId = parseInt(req.params.id);
    const site = DramaSite.toggle(siteId);
    res.json({ success: true, is_enabled: site.is_enabled === 1 });
});

// ==================== 数据备份与导入 ====================

// 导出备份
router.get('/backup/export', (req, res) => {
    const apis = ParseAPI.findAll().map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        is_enabled: !!a.is_enabled,
        sort_order: a.sort_order
    }));

    const sites = DramaSite.findAll().map(s => ({
        id: s.id,
        name: s.name,
        url: s.url,
        description: s.description,
        icon: s.icon,
        is_enabled: !!s.is_enabled,
        sort_order: s.sort_order
    }));
    
    const now = getChinaNow();
    const backup = {
        version: '1.0',
        exported_at: now.toISOString(),
        exported_at_timezone: 'Asia/Shanghai',
        parse_apis: apis,
        drama_sites: sites
    };
    
    const jsonStr = JSON.stringify(backup, null, 2);
    const filename = `audiovisual_backup_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}.json`;
    
    // 保存到文件系统
    const backupDir = path.join(process.cwd(), 'backup');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const filepath = path.join(backupDir, filename);
    fs.writeFileSync(filepath, jsonStr, 'utf8');
    
    // 记录到数据库
    BackupFile.create(filename, filepath, jsonStr.length, 'manual', '手动导出备份');
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(jsonStr);
});

// 导入备份（支持合并模式和覆盖模式）
router.post('/backup/import', upload.single('backup_file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '请上传 .json 格式的备份文件' });
    }

    const file = req.file;
    const mode = req.body.mode || 'merge'; // merge 或 overwrite

    if (!file.originalname.endsWith('.json')) {
        return res.status(400).json({ success: false, message: '请上传 .json 格式的备份文件' });
    }

    let data;
    try {
        data = JSON.parse(file.buffer.toString('utf8'));
    } catch (e) {
        return res.status(400).json({ success: false, message: `文件解析失败：${e.message}` });
    }

    if (!data.parse_apis && !data.drama_sites) {
        return res.status(400).json({ success: false, message: '备份文件格式不正确' });
    }

    const imported = { apis: 0, sites: 0 };

    try {
        // 覆盖模式：先清空现有数据
        if (mode === 'overwrite') {
            ParseAPI.deleteAll();
            DramaSite.deleteAll();
        }

        // 处理解析接口
        if (data.parse_apis) {
            let existingUrls, existingIds, nextOrder;
            
            if (mode === 'merge') {
                // 合并模式：检查URL重复
                const allApis = ParseAPI.findAll();
                existingUrls = new Set(allApis.map(a => a.url));
                existingIds = new Set(allApis.map(a => a.id));
                nextOrder = ParseAPI.getMaxSortOrder();
            } else {
                // 覆盖模式：清空后不需要检查重复
                existingUrls = new Set();
                existingIds = new Set();
                nextOrder = 0;
            }

            for (const item of data.parse_apis) {
                const url = item.url?.trim();
                if (!url) continue;

                const itemId = item.id;
                const itemName = item.name || '未命名';
                const isEnabled = item.is_enabled !== false;
                
                if (mode === 'merge') {
                    // 合并模式下跳过重复URL
                    if (existingUrls.has(url)) continue;
                    
                    // 合并模式下处理ID冲突
                    if (itemId && existingIds.has(itemId)) {
                        // ID冲突，自动分配新ID
                        nextOrder++;
                        const newApi = ParseAPI.create(itemName, url, nextOrder, isEnabled);
                        if (newApi) imported.apis++;
                        console.log(`[导入] 解析接口ID冲突 ${itemId} -> 新ID: ${newApi?.id || 'unknown'}`);
                    } else {
                        // 没有冲突，使用原始ID（覆盖模式）或新ID（无ID）
                        nextOrder++;
                        const api = itemId 
                            ? ParseAPI.createWithId(itemId, itemName, url, nextOrder, isEnabled)
                            : ParseAPI.create(itemName, url, nextOrder, isEnabled);
                        if (api) imported.apis++;
                    }
                } else {
                    // 覆盖模式：使用原始ID
                    nextOrder++;
                    const api = itemId 
                        ? ParseAPI.createWithId(itemId, itemName, url, nextOrder, isEnabled)
                        : ParseAPI.create(itemName, url, nextOrder, isEnabled);
                    if (api) imported.apis++;
                }
            }
        }

        // 处理影视导航
        if (data.drama_sites) {
            let existingUrls, existingIds, nextOrder;
            
            if (mode === 'merge') {
                // 合并模式：检查URL重复
                const allSites = DramaSite.findAll();
                existingUrls = new Set(allSites.map(s => s.url));
                existingIds = new Set(allSites.map(s => s.id));
                nextOrder = DramaSite.getMaxSortOrder();
            } else {
                // 覆盖模式：清空后不需要检查重复
                existingUrls = new Set();
                existingIds = new Set();
                nextOrder = 0;
            }

            for (const item of data.drama_sites) {
                const url = item.url?.trim();
                if (!url) continue;

                const itemId = item.id;
                const itemName = item.name || '未命名';
                const itemDescription = item.description || '';
                const itemIcon = item.icon || '🎬';
                const isEnabled = item.is_enabled !== false;
                
                if (mode === 'merge') {
                    // 合并模式下跳过重复URL
                    if (existingUrls.has(url)) continue;
                    
                    // 合并模式下处理ID冲突
                    if (itemId && existingIds.has(itemId)) {
                        // ID冲突，自动分配新ID
                        nextOrder++;
                        const newSite = DramaSite.create(itemName, url, itemDescription, itemIcon, nextOrder, isEnabled);
                        if (newSite) imported.sites++;
                        console.log(`[导入] 影视导航ID冲突 ${itemId} -> 新ID: ${newSite?.id || 'unknown'}`);
                    } else {
                        // 没有冲突，使用原始ID（覆盖模式）或新ID（无ID）
                        nextOrder++;
                        const site = itemId 
                            ? DramaSite.createWithId(itemId, itemName, url, itemDescription, itemIcon, nextOrder, isEnabled)
                            : DramaSite.create(itemName, url, itemDescription, itemIcon, nextOrder, isEnabled);
                        if (site) imported.sites++;
                    }
                } else {
                    // 覆盖模式：使用原始ID
                    nextOrder++;
                    const site = itemId 
                        ? DramaSite.createWithId(itemId, itemName, url, itemDescription, itemIcon, nextOrder, isEnabled)
                        : DramaSite.create(itemName, url, itemDescription, itemIcon, nextOrder, isEnabled);
                    if (site) imported.sites++;
                }
            }
        }

        res.json({
            success: true,
            message: mode === 'overwrite' 
                ? `覆盖导入成功：解析接口 ${imported.apis} 条，影视导航 ${imported.sites} 条` 
                : `合并导入成功：新增解析接口 ${imported.apis} 条，新增影视导航 ${imported.sites} 条`,
            imported,
            mode
        });
    } catch (error) {
        console.error('[Import Error]', error);
        res.status(500).json({
            success: false,
            message: '导入失败: ' + error.message
        });
    }
});

// 列出备份文件
router.get('/backup/list', (req, res) => {
    const backups = BackupFile.findAll();
    res.json({
        success: true,
        backups: backups.map(b => ({
            id: b.id,
            filename: b.filename,
            filepath: b.filepath,
            file_size: b.file_size,
            file_size_formatted: formatFileSize(b.file_size),
            backup_type: b.backup_type,
            description: b.description,
            created_at: b.created_at,
            created_at_formatted: formatChinaTime(b.created_at, '%Y-%m-%d %H:%M:%S')
        }))
    });
});

// 创建备份
router.get('/backup/create', (req, res) => {
    try {
    const apis = ParseAPI.findAll().map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        is_enabled: !!a.is_enabled,
        sort_order: a.sort_order
    }));

    const sites = DramaSite.findAll().map(s => ({
        id: s.id,
        name: s.name,
        url: s.url,
        description: s.description,
        icon: s.icon,
        is_enabled: !!s.is_enabled,
        sort_order: s.sort_order
    }));
        
        const now = getChinaNow();
        // 使用本地时间字符串（与文件名一致）
        const exportedAt = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}T${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}+08:00`;
        const backup = {
            version: '1.0',
            exported_at: exportedAt,
            exported_at_timezone: 'Asia/Shanghai',
            parse_apis: apis,
            drama_sites: sites
        };
        
        const jsonStr = JSON.stringify(backup, null, 2);
        const filename = `audiovisual_backup_${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}.json`;
        
        const backupDir = path.join(process.cwd(), 'backup');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const filepath = path.join(backupDir, filename);
        fs.writeFileSync(filepath, jsonStr, 'utf8');
        
        const record = BackupFile.create(filename, filepath, jsonStr.length, 'manual', '手动备份');
        
        res.json({
            success: true,
            message: '备份创建成功',
            backup: {
                id: record ? record.id : null,
                filename,
                filepath,
                file_size: jsonStr.length,
                file_size_formatted: formatFileSize(jsonStr.length),
                backup_type: 'manual',
                description: '手动备份',
                created_at: record ? record.created_at : getChinaNowStr(),
                created_at_formatted: formatChinaTime(record ? record.created_at : getChinaNow(), '%Y-%m-%d %H:%M:%S')
            }
        });
    } catch (error) {
        console.error('创建备份失败:', error);
        res.status(500).json({
            success: false,
            message: '创建备份失败: ' + error.message
        });
    }
});

// 下载备份文件
router.get('/backup/download/:id', (req, res) => {
    const backupId = parseInt(req.params.id);
    const backup = BackupFile.findById(backupId);
    
    if (!backup) {
        return res.status(404).json({ success: false, message: '备份文件不存在' });
    }
    
    if (!fs.existsSync(backup.filepath)) {
        return res.status(404).json({ success: false, message: '备份文件不存在' });
    }
    
    res.download(backup.filepath, backup.filename);
});

// 从备份恢复（支持合并模式和覆盖模式）
router.post('/backup/restore/:id', (req, res) => {
    try {
        const backupId = parseInt(req.params.id);
        const backup = BackupFile.findById(backupId);
        const mode = req.body.mode || 'merge'; // merge 或 overwrite

        if (!backup) {
            return res.status(404).json({ success: false, message: '备份文件不存在' });
        }

        if (!fs.existsSync(backup.filepath)) {
            return res.status(404).json({ success: false, message: '备份文件不存在' });
        }

        let data;
        try {
            const content = fs.readFileSync(backup.filepath, 'utf8');
            data = JSON.parse(content);
        } catch (e) {
            return res.status(400).json({ success: false, message: `备份文件解析失败: ${e.message}` });
        }

        const imported = { apis: 0, sites: 0 };

        // 覆盖模式：先清空现有数据
        if (mode === 'overwrite') {
            ParseAPI.deleteAll();
            DramaSite.deleteAll();
        }

        // 处理解析接口
        if (data.parse_apis) {
            let nextOrder, existingUrls;
            
            if (mode === 'merge') {
                existingUrls = new Set(ParseAPI.findAll().map(a => a.url));
                nextOrder = ParseAPI.getMaxSortOrder();
            } else {
                nextOrder = 0;
            }

            for (const item of data.parse_apis) {
                const url = item.url?.trim();
                if (!url) continue;

                if (mode === 'merge' && existingUrls.has(url)) continue;

                nextOrder++;
                const isEnabled = item.is_enabled !== false;
                const api = ParseAPI.create(item.name || '未命名', url, nextOrder, isEnabled);
                if (api) imported.apis++;
            }
        }

        // 处理影视导航
        if (data.drama_sites) {
            let nextOrder, existingUrls;
            
            if (mode === 'merge') {
                existingUrls = new Set(DramaSite.findAll().map(s => s.url));
                nextOrder = DramaSite.getMaxSortOrder();
            } else {
                nextOrder = 0;
            }

            for (const item of data.drama_sites) {
                const url = item.url?.trim();
                if (!url) continue;

                if (mode === 'merge' && existingUrls.has(url)) continue;

                nextOrder++;
                const isEnabled = item.is_enabled !== false;
                const site = DramaSite.create(item.name || '未命名', url, item.description || '', item.icon || '🎬', nextOrder, isEnabled);
                if (site) imported.sites++;
            }
        }

        res.json({
            success: true,
            message: mode === 'overwrite' 
                ? `覆盖恢复成功：解析接口 ${imported.apis} 条，影视导航 ${imported.sites} 条` 
                : `合并恢复成功：新增解析接口 ${imported.apis} 条，新增影视导航 ${imported.sites} 条`,
            imported,
            mode
        });
    } catch (error) {
        console.error('[Restore Error]', error);
        res.status(500).json({
            success: false,
            message: '恢复失败: ' + error.message
        });
    }
});

// 删除备份文件
router.delete('/backup/:id', (req, res) => {
    try {
        const backupId = parseInt(req.params.id);
        const backup = BackupFile.findById(backupId);
        
        if (!backup) {
            return res.status(404).json({ success: false, message: '备份文件不存在' });
        }
        
        // 删除物理文件
        if (fs.existsSync(backup.filepath)) {
            try {
                fs.unlinkSync(backup.filepath);
            } catch (e) {
                return res.status(500).json({ success: false, message: `删除文件失败: ${e.message}` });
            }
        }
        
        // 从数据库删除记录（此方法内部会检查是否需要重置sqlite_sequence）
        BackupFile.delete(backupId);

        res.json({ success: true, message: '备份已删除' });
    } catch (error) {
        console.error('[Admin] 删除备份时出错:', error);
        res.status(500).json({ success: false, message: '删除备份失败: ' + error.message });
    }
});

// API调用记录管理页面
router.get('/call-logs', (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const status = req.query.status || 'all';
        const apiType = req.query.api_type || 'all';
        
        // 获取筛选后的总记录数
        const totalLogs = APICallLog.countWithFilters(
            status !== 'all' ? status : null, 
            apiType !== 'all' ? apiType : null
        );
        const totalPages = Math.ceil(totalLogs / Math.max(limit, 1));
        
        // 获取筛选后的当前页记录
        const logs = APICallLog.findWithFilters(
            Math.min(limit, 200), 
            page, 
            status !== 'all' ? status : null, 
            apiType !== 'all' ? apiType : null
        );
        
        // 获取统计信息（这些统计应该基于所有数据，而不是筛选后的数据）
        const todayCalls = APICallLog.countToday();
        const totalAllLogs = APICallLog.count();
        const successRate = totalAllLogs > 0 ? (APICallLog.countSuccess() / totalAllLogs * 100).toFixed(2) : 0;
        const avgResponseTime = APICallLog.getAvgResponseTime();
        
        res.render('admin/call_logs', {
            user: req.user,
            formatChinaTime,
            logs: logs,
            total_logs: totalLogs,  // 筛选后的总数
            today_calls: todayCalls,
            success_rate: successRate,
            avg_response_time: avgResponseTime,
            page: page,
            limit: limit,
            total_pages: totalPages,
            has_prev: page > 1,
            has_next: page < totalPages,
            current_status: status,
            current_api_type: apiType,
            error: null  // 成功时需要显式传递null
        });
        
    } catch (error) {
        console.error('[Admin] 加载调用记录失败:', error);
        res.status(500).render('admin/call_logs', {
            user: req.user,
            formatChinaTime,
            logs: [],
            error: '加载调用记录失败: ' + error.message,
            total_logs: 0,
            today_calls: 0,
            success_rate: 0,
            avg_response_time: 0,
            current_status: 'all',
            current_api_type: 'all'
        });
    }
});

// 数据统计
router.get('/api/data-stats', (req, res) => {
    try {
        const apiCount = ParseAPI.count();
        const siteCount = DramaSite.count();
        
        res.json({
            success: true,
            parse_api_count: apiCount,
            drama_site_count: siteCount,
            total_count: apiCount + siteCount
        });
    } catch (error) {
        console.error('[Data Stats Error]', error);
        res.status(500).json({
            success: false,
            message: '获取数据统计失败: ' + error.message
        });
    }
});

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
    if (!bytes) return '未知';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

module.exports = router;
