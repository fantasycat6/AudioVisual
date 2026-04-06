/**
 * 数据库初始化和管理模块
 * 使用 sql.js 进行 SQLite 数据库操作（纯 JavaScript 实现，无需编译）
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// 数据库文件路径
const dbDir = path.dirname(process.env.DB_PATH || './data/audiovisual.db');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.resolve(process.env.DB_PATH || './data/audiovisual.db');

let db = null;
let SQL = null;

// 初始化数据库
async function initDatabase() {
    SQL = await initSqlJs();
    
    // 尝试加载现有数据库
    if (fs.existsSync(dbPath)) {
        try {
            const fileBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(fileBuffer);
            console.log('[DB] 已加载现有数据库');
        } catch (e) {
            console.log('[DB] 数据库文件损坏，创建新数据库');
            db = new SQL.Database();
        }
    } else {
        db = new SQL.Database();
        console.log('[DB] 已创建新数据库');
    }
    
    // 创建表结构
    initTables();
    
    // 自动迁移
    autoMigrate();
    
    // 初始化默认数据
    initDefaultData();
    
    // 保存数据库
    saveDatabase();
    
    return db;
}

// 保存数据库到文件
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// 立即保存（用于写入操作后）
function saveDatabaseSync() {
    if (db) {
        saveDatabase();
    }
}

// 创建表结构
function initTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            last_login TEXT,
            api_key TEXT UNIQUE,
            api_key_created_at TEXT
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS parse_apis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            is_enabled INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS drama_sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            description TEXT,
            icon TEXT DEFAULT '🎬',
            is_enabled INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS api_call_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            api_type TEXT NOT NULL,
            video_url TEXT NOT NULL,
            success INTEGER DEFAULT 1,
            api_id INTEGER,
            api_name TEXT,
            error_message TEXT,
            response_time_ms INTEGER,
            created_at TEXT DEFAULT (datetime('now', '+8 hours')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS backup_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_size INTEGER,
            backup_type TEXT DEFAULT 'full',
            description TEXT,
            created_at TEXT DEFAULT (datetime('now', '+8 hours'))
        )
    `);
}

// 自动迁移
function autoMigrate() {
    try {
        const result = db.exec("PRAGMA table_info(users)");
        const cols = result.length > 0 ? result[0].values.map(v => v[1]) : [];
        
        if (!cols.includes('api_key')) {
            db.run("ALTER TABLE users ADD COLUMN api_key TEXT UNIQUE");
            console.log('[migrate] users 表已添加字段: api_key');
        }
        
        if (!cols.includes('api_key_created_at')) {
            db.run("ALTER TABLE users ADD COLUMN api_key_created_at TEXT");
            console.log('[migrate] users 表已添加字段: api_key_created_at');
        }
        
        saveDatabase();
    } catch (e) {
        console.error('[migrate] 自动迁移失败:', e.message);
    }
}

// 获取当前中国时间字符串 (格式: YYYY-MM-DD HH:mm:ss)
function getChinaNowStr() {
    const now = new Date();
    // 直接获取本地时间的各个部分并格式化
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================
// 用户操作
// ============================================

const UserModel = {
    create(username, email, password, isAdmin = false) {
        const passwordHash = bcrypt.hashSync(password, 10);
        const createdAt = getChinaNowStr();
        db.run(
            'INSERT INTO users (username, email, password_hash, is_admin, created_at) VALUES (?, ?, ?, ?, ?)',
            [username, email, passwordHash, isAdmin ? 1 : 0, createdAt]
        );
        saveDatabase();
        return this.findByUsername(username);
    },
    
    findById(id) {
        const result = db.exec('SELECT * FROM users WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToUser(result[0].columns, result[0].values[0]);
    },
    
    findByUsername(username) {
        const result = db.exec('SELECT * FROM users WHERE username = ?', [username]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToUser(result[0].columns, result[0].values[0]);
    },
    
    findByEmail(email) {
        const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToUser(result[0].columns, result[0].values[0]);
    },
    
    findByUsernameOrEmail(usernameOrEmail) {
        const result = db.exec('SELECT * FROM users WHERE username = ? OR email = ?', [usernameOrEmail, usernameOrEmail]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToUser(result[0].columns, result[0].values[0]);
    },
    
    findByApiKey(apiKey) {
        const result = db.exec('SELECT * FROM users WHERE api_key = ?', [apiKey]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToUser(result[0].columns, result[0].values[0]);
    },
    
    verifyPassword(user, password) {
        return bcrypt.compareSync(password, user.password_hash);
    },
    
    updateLastLogin(userId) {
        db.run("UPDATE users SET last_login = ? WHERE id = ?", [getChinaNowStr(), userId]);
        saveDatabase();
    },
    
    updatePassword(userId, newPassword) {
        const passwordHash = bcrypt.hashSync(newPassword, 10);
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        saveDatabase();
    },
    
    generateApiKey(userId) {
        const apiKey = 'av_' + crypto.randomBytes(32).toString('hex');
        const createdAt = getChinaNowStr();
        db.run(
            'UPDATE users SET api_key = ?, api_key_created_at = ? WHERE id = ?',
            [apiKey, createdAt, userId]
        );
        saveDatabase();
        return apiKey;
    },
    
    revokeApiKey(userId) {
        db.run('UPDATE users SET api_key = NULL, api_key_created_at = NULL WHERE id = ?', [userId]);
        saveDatabase();
    },
    
    findAll() {
        const result = db.exec('SELECT * FROM users ORDER BY created_at DESC');
        if (result.length === 0) return [];
        return result[0].values.map(row => this._rowToUser(result[0].columns, row));
    },
    
    toggleAdmin(userId) {
        db.run('UPDATE users SET is_admin = NOT is_admin WHERE id = ?', [userId]);
        saveDatabase();
        return this.findById(userId);
    },
    
    delete(userId) {
        db.run('DELETE FROM users WHERE id = ?', [userId]);
        saveDatabase();
    },
    
    count() {
        const result = db.exec('SELECT COUNT(*) as count FROM users');
        return result[0].values[0][0];
    },
    
    _rowToUser(columns, values) {
        const user = {};
        columns.forEach((col, i) => user[col] = values[i]);
        user.is_admin = user.is_admin === 1;
        return user;
    }
};

// ============================================
// 解析接口操作
// ============================================

const ParseAPI = {
    create(name, url, sortOrder = 0, isEnabled = true) {
        const createdAt = getChinaNowStr();
        // 使用 db.exec 替代 db.run，避免 prepared statement 潜在问题
        db.exec(
            'INSERT INTO parse_apis (name, url, sort_order, is_enabled, created_at) VALUES (?, ?, ?, ?, ?)',
            [name, url, sortOrder, isEnabled ? 1 : 0, createdAt]
        );
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id');
        if (result.length === 0 || result[0].values.length === 0) return null;
        // 直接返回包含 ID 的对象，避免 findById() 在某些情况下返回 null
        const newId = result[0].values[0][0];
        return {
            id: newId,
            name,
            url,
            sort_order: sortOrder,
            is_enabled: isEnabled,
            created_at: createdAt
        };
    },
    
    // 新增：创建一个指定ID的解析接口（用于备份恢复）
    createWithId(id, name, url, sortOrder = 0, isEnabled = true) {
        const createdAt = getChinaNowStr();
        try {
            // 尝试插入指定ID的记录
            db.exec(
                'INSERT INTO parse_apis (id, name, url, sort_order, is_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                [id, name, url, sortOrder, isEnabled ? 1 : 0, createdAt]
            );
            saveDatabase();
            
            // 检查是否插入成功
            const check = this.findById(id);
            if (check) {
                console.log(`[ParseAPI] 已创建指定ID的解析接口 ID=${id}: ${name}`);
                return check;
            } else {
                // 如果失败，回退到普通create
                console.warn(`[ParseAPI] 无法插入指定ID=${id}，回退到普通创建`);
                return this.create(name, url, sortOrder, isEnabled);
            }
        } catch (error) {
            console.warn(`[ParseAPI.createWithId] ID=${id} 插入失败:`, error.message);
            // 回退到普通create
            return this.create(name, url, sortOrder, isEnabled);
        }
    },
    
    findById(id) {
        const result = db.exec('SELECT * FROM parse_apis WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToApi(result[0].columns, result[0].values[0]);
    },
    
    findAllEnabled() {
        const result = db.exec('SELECT * FROM parse_apis WHERE is_enabled = 1 ORDER BY sort_order');
        if (result.length === 0) return [];
        return result[0].values.map(row => this._rowToApi(result[0].columns, row));
    },
    
    findAll() {
        const result = db.exec('SELECT * FROM parse_apis ORDER BY sort_order');
        if (result.length === 0) return [];
        return result[0].values.map(row => this._rowToApi(result[0].columns, row));
    },
    
    update(id, data) {
        const fields = [];
        const values = [];
        
        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
        if (data.is_enabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.is_enabled ? 1 : 0); }
        if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
        
        if (fields.length > 0) {
            values.push(id);
            db.run(`UPDATE parse_apis SET ${fields.join(', ')} WHERE id = ?`, values);
            saveDatabase();
        }
        
        return this.findById(id);
    },
    
    toggle(id) {
        db.run('UPDATE parse_apis SET is_enabled = NOT is_enabled WHERE id = ?', [id]);
        saveDatabase();
        return this.findById(id);
    },
    
    delete(id) {
        db.run('DELETE FROM parse_apis WHERE id = ?', [id]);
        saveDatabase();
    },
    
    reorder(orderList) {
        orderList.forEach((apiId, index) => {
            db.run('UPDATE parse_apis SET sort_order = ? WHERE id = ?', [index + 1, apiId]);
        });
        saveDatabase();
    },
    
    getMaxSortOrder() {
        const result = db.exec('SELECT MAX(sort_order) as max_order FROM parse_apis');
        return result[0].values[0][0] || 0;
    },
    
    count() {
        const result = db.exec('SELECT COUNT(*) as count FROM parse_apis');
        return result[0].values[0][0];
    },
    
    deleteAll() {
        db.exec('DELETE FROM parse_apis');
        saveDatabase();
        console.log('[ParseAPI] 已清空所有解析接口记录');
    },
    
    _rowToApi(columns, values) {
        const api = {};
        columns.forEach((col, i) => api[col] = values[i]);
        api.is_enabled = api.is_enabled === 1;
        return api;
    }
};

// ============================================
// 影视导航操作
// ============================================

const DramaSite = {
    create(name, url, description = '', icon = '🎬', sortOrder = 0, isEnabled = true) {
        const createdAt = getChinaNowStr();
        // 使用 db.exec 替代 db.run，避免 prepared statement 潜在问题
        db.exec(
            'INSERT INTO drama_sites (name, url, description, icon, sort_order, is_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, url, description, icon, sortOrder, isEnabled ? 1 : 0, createdAt]
        );
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id');
        if (result.length === 0 || result[0].values.length === 0) return null;
        // 直接返回包含 ID 的对象，避免 findById() 在某些情况下返回 null
        const newId = result[0].values[0][0];
        return {
            id: newId,
            name,
            url,
            description,
            icon,
            sort_order: sortOrder,
            is_enabled: isEnabled,
            created_at: createdAt
        };
    },
    
    // 新增：创建一个指定ID的影视导航（用于备份恢复）
    createWithId(id, name, url, description = '', icon = '🎬', sortOrder = 0, isEnabled = true) {
        const createdAt = getChinaNowStr();
        try {
            // 尝试插入指定ID的记录
            db.exec(
                'INSERT INTO drama_sites (id, name, url, description, icon, sort_order, is_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, name, url, description, icon, sortOrder, isEnabled ? 1 : 0, createdAt]
            );
            saveDatabase();
            
            // 检查是否插入成功
            const check = this.findById(id);
            if (check) {
                console.log(`[DramaSite] 已创建指定ID的影视导航 ID=${id}: ${name}`);
                return check;
            } else {
                // 如果失败，回退到普通create
                console.warn(`[DramaSite] 无法插入指定ID=${id}，回退到普通创建`);
                return this.create(name, url, description, icon, sortOrder, isEnabled);
            }
        } catch (error) {
            console.warn(`[DramaSite.createWithId] ID=${id} 插入失败:`, error.message);
            // 回退到普通create
            return this.create(name, url, description, icon, sortOrder, isEnabled);
        }
    },
    
    findById(id) {
        const result = db.exec('SELECT * FROM drama_sites WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        return this._rowToSite(result[0].columns, result[0].values[0]);
    },
    
    findAllEnabled() {
        const result = db.exec('SELECT * FROM drama_sites WHERE is_enabled = 1 ORDER BY sort_order');
        if (result.length === 0) return [];
        return result[0].values.map(row => this._rowToSite(result[0].columns, row));
    },
    
    findAll() {
        const result = db.exec('SELECT * FROM drama_sites ORDER BY sort_order');
        if (result.length === 0) return [];
        return result[0].values.map(row => this._rowToSite(result[0].columns, row));
    },
    
    update(id, data) {
        const fields = [];
        const values = [];
        
        if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
        if (data.url !== undefined) { fields.push('url = ?'); values.push(data.url); }
        if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
        if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
        if (data.is_enabled !== undefined) { fields.push('is_enabled = ?'); values.push(data.is_enabled ? 1 : 0); }
        
        if (fields.length > 0) {
            values.push(id);
            db.run(`UPDATE drama_sites SET ${fields.join(', ')} WHERE id = ?`, values);
            saveDatabase();
        }
        
        return this.findById(id);
    },
    
    toggle(id) {
        db.run('UPDATE drama_sites SET is_enabled = NOT is_enabled WHERE id = ?', [id]);
        saveDatabase();
        return this.findById(id);
    },
    
    delete(id) {
        db.run('DELETE FROM drama_sites WHERE id = ?', [id]);
        saveDatabase();
    },
    
    getMaxSortOrder() {
        const result = db.exec('SELECT MAX(sort_order) as max_order FROM drama_sites');
        return result[0].values[0][0] || 0;
    },
    
    count() {
        const result = db.exec('SELECT COUNT(*) as count FROM drama_sites');
        return result[0].values[0][0];
    },
    
    deleteAll() {
        db.exec('DELETE FROM drama_sites');
        saveDatabase();
        console.log('[DramaSite] 已清空所有影视导航记录');
    },
    
    _rowToSite(columns, values) {
        const site = {};
        columns.forEach((col, i) => site[col] = values[i]);
        site.is_enabled = site.is_enabled === 1;
        return site;
    }
};

// ============================================
// API调用日志操作
// ============================================

const APICallLog = {
    create(data) {
        const createdAt = getChinaNowStr();
        db.run(
            'INSERT INTO api_call_logs (user_id, api_type, video_url, success, api_id, api_name, error_message, response_time_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [data.user_id || null, data.api_type, data.video_url, data.success ? 1 : 0, data.api_id || null, data.api_name || null, data.error_message || null, data.response_time_ms || null, createdAt]
        );
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id');
        return { id: result[0].values[0][0] };
    },
    
    findAll(limit = 100) {
        const result = db.exec(`SELECT 
            l.*, 
            u.username as user_username,
            u.email as user_email
        FROM api_call_logs l 
        LEFT JOIN users u ON l.user_id = u.id 
        ORDER BY l.created_at DESC 
        LIMIT ${limit}`);
        if (result.length === 0) return [];
        return this._rowsToLogs(result[0].columns, result[0].values);
    },
    
    findWithFilters(limit = 100, page = 1, status = null, apiType = null) {
        // 构建WHERE子句
        const whereConditions = [];
        const whereParams = [];
        
        if (status === 'success') {
            whereConditions.push('l.success = ?');
            whereParams.push(1);
        } else if (status === 'error') {
            whereConditions.push('l.success = ?');
            whereParams.push(0);
        }
        
        if (apiType && apiType !== 'all') {
            whereConditions.push('l.api_type = ?');
            whereParams.push(apiType);
        }
        
        // 构建WHERE子句字符串
        let whereClause = '';
        if (whereConditions.length > 0) {
            whereClause = 'WHERE ' + whereConditions.join(' AND ');
        }
        
        // 计算偏移量
        const offset = (page - 1) * limit;
        
        // 执行查询 - 使用LEFT JOIN连接用户表以获取用户名
        const query = `SELECT 
            l.*, 
            u.username as user_username,
            u.email as user_email
        FROM api_call_logs l 
        LEFT JOIN users u ON l.user_id = u.id 
        ${whereClause} 
        ORDER BY l.created_at DESC 
        LIMIT ${limit} OFFSET ${offset}`;
        
        const result = db.exec(query, whereParams);
        if (result.length === 0) return [];
        return this._rowsToLogs(result[0].columns, result[0].values);
    },
    
    countWithFilters(status = null, apiType = null) {
        // 构建WHERE子句
        const whereConditions = [];
        const whereParams = [];
        
        if (status === 'success') {
            whereConditions.push('success = ?');
            whereParams.push(1);
        } else if (status === 'error') {
            whereConditions.push('success = ?');
            whereParams.push(0);
        }
        
        if (apiType && apiType !== 'all') {
            whereConditions.push('api_type = ?');
            whereParams.push(apiType);
        }
        
        // 构建WHERE子句字符串
        let whereClause = '';
        if (whereConditions.length > 0) {
            whereClause = 'WHERE ' + whereConditions.join(' AND ');
        }
        
        // 执行计数查询
        const query = `SELECT COUNT(*) as count FROM api_call_logs ${whereClause}`;
        const result = db.exec(query, whereParams);
        return result[0].values[0][0];
    },
    
    findByUser(userId, limit = 50) {
        const result = db.exec(`SELECT 
            l.*, 
            u.username as user_username,
            u.email as user_email
        FROM api_call_logs l 
        LEFT JOIN users u ON l.user_id = u.id 
        WHERE l.user_id = ? 
        ORDER BY l.created_at DESC 
        LIMIT ${limit}`, [userId]);
        if (result.length === 0) return [];
        return this._rowsToLogs(result[0].columns, result[0].values);
    },
    
    count() {
        const result = db.exec('SELECT COUNT(*) as count FROM api_call_logs');
        return result[0].values[0][0];
    },
    
    countSuccess() {
        const result = db.exec('SELECT COUNT(*) as count FROM api_call_logs WHERE success = 1');
        return result[0].values[0][0];
    },
    
    countToday() {
        const today = getChinaNowStr().slice(0, 10);
        const result = db.exec("SELECT COUNT(*) as count FROM api_call_logs WHERE date(created_at) = ?", [today]);
        return result[0].values[0][0];
    },
    
    countTodayActiveUsers() {
        const today = getChinaNowStr().slice(0, 10);
        const result = db.exec("SELECT COUNT(DISTINCT user_id) as count FROM api_call_logs WHERE date(created_at) = ? AND user_id IS NOT NULL", [today]);
        return result[0].values[0][0];
    },
    
    getAvgResponseTime() {
        const result = db.exec('SELECT AVG(response_time_ms) as avg_time FROM api_call_logs WHERE response_time_ms IS NOT NULL');
        return result[0].values[0][0] || 0;
    },
    
    getLast24HoursTrend() {
        const hours = [];
        const counts = [];
        
        // 使用中国时间计算24小时
        const now = new Date();
        now.setHours(now.getHours() + 8); // 转为中国时间
        
        for (let i = 23; i >= 0; i--) {
            const hourStart = new Date(now);
            hourStart.setHours(hourStart.getHours() - i - 1);
            hourStart.setMinutes(0, 0, 0);
            
            const hourEnd = new Date(now);
            hourEnd.setHours(hourEnd.getHours() - i);
            hourEnd.setMinutes(0, 0, 0);
            
            // 使用中国时区的 ISO 字符串
            const startStr = hourStart.toISOString().slice(0, 19).replace('T', ' ');
            const endStr = hourEnd.toISOString().slice(0, 19).replace('T', ' ');
            
            // 获取小时显示 (中国时区的小时)
            const chinaHour = hourStart.getUTCHours().toString().padStart(2, '0');
            hours.push(`${chinaHour}:00`);
            
            // 查询该小时的记录数
            try {
                const result = db.exec('SELECT COUNT(*) as count FROM api_call_logs WHERE created_at >= ? AND created_at < ?', [startStr, endStr]);
                if (result.length > 0 && result[0].values.length > 0) {
                    counts.push(result[0].values[0][0] || 0);
                } else {
                    counts.push(0);
                }
            } catch (e) {
                counts.push(0);
            }
        }
        
        return { hours, counts };
    },
    
    getApiStats(limit = 10) {
        const result = db.exec(`SELECT api_name, COUNT(*) as count FROM api_call_logs WHERE api_name IS NOT NULL GROUP BY api_name ORDER BY count DESC LIMIT ${limit}`);
        if (result.length === 0) return [];
        return result[0].values.map(row => ({ api_name: row[0], count: row[1] }));
    },
    
    _rowsToLogs(columns, values) {
        return values.map(row => {
            const log = {};
            columns.forEach((col, i) => log[col] = row[i]);
            log.success = log.success === 1;
            return log;
        });
    }
};

// ============================================
// 备份文件操作
// ============================================

const BackupFile = {
    create(filename, filepath, fileSize, backupType = 'full', description = '') {
        const createdAt = getChinaNowStr();
        
        // 使用 db.exec 替代 db.run
        db.exec(
            'INSERT INTO backup_files (filename, filepath, file_size, backup_type, description, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [filename, filepath, fileSize, backupType, description, createdAt]
        );
        saveDatabase();
        
        // 尝试获取最后插入的ID
        try {
            const result = db.exec('SELECT last_insert_rowid() as id');
            if (result && result.length > 0 && result[0].values && result[0].values.length > 0) {
                const newId = result[0].values[0][0];
                
                // 直接构造返回对象，不调用 findById
                return {
                    id: newId,
                    filename,
                    filepath,
                    file_size: fileSize,
                    backup_type: backupType,
                    description,
                    created_at: createdAt
                };
            }
        } catch (error) {
            console.warn('[BackupFile.create] 获取最后插入ID失败:', error.message);
        }
        
        // 如果获取ID失败，返回null ID的对象
        return {
            id: null,
            filename,
            filepath,
            file_size: fileSize,
            backup_type: backupType,
            description,
            created_at: createdAt
        };
    },
    
    findById(id) {
        const result = db.exec('SELECT * FROM backup_files WHERE id = ?', [id]);
        if (result.length === 0 || result[0].values.length === 0) return null;
        const backup = {};
        result[0].columns.forEach((col, i) => backup[col] = result[0].values[0][i]);
        return backup;
    },
    
    findAll() {
        const result = db.exec('SELECT * FROM backup_files ORDER BY created_at DESC');
        if (result.length === 0) return [];
        return result[0].values.map(row => {
            const backup = {};
            result[0].columns.forEach((col, i) => backup[col] = row[i]);
            return backup;
        });
    },
    
    delete(id) {
        db.run('DELETE FROM backup_files WHERE id = ?', [id]);
        saveDatabase();
        
        // 简单删除记录，不涉及ID处理的逻辑
        console.log(`[BackupFile] 已删除备份记录 ID: ${id}`);
    }
};

// ============================================
// 默认数据初始化
// ============================================

const DEFAULT_APIS = [
    { name: "虾米视频解析", url: "https://jx.xmflv.com/?url=", sort_order: 1 },
    { name: "七七云解析", url: "https://jx.77flv.cc/?url=", sort_order: 2 },
    { name: "Player-JY", url: "https://jx.playerjy.com/?url=", sort_order: 3 },
    { name: "789解析", url: "https://jiexi.789jiexi.icu:4433/?url=", sort_order: 4 },
    { name: "极速解析", url: "https://jx.2s0.cn/player/?url=", sort_order: 5 },
    { name: "冰豆解析", url: "https://bd.jx.cn/?url=", sort_order: 6 },
    { name: "973解析", url: "https://jx.973973.xyz/?url=", sort_order: 7 },
    { name: "CK", url: "https://www.ckplayer.vip/jiexi/?url=", sort_order: 8 },
    { name: "七哥解析", url: "https://jx.nnxv.cn/tv.php?url=", sort_order: 9 },
    { name: "夜幕", url: "https://www.yemu.xyz/?url=", sort_order: 10 },
    { name: "盘古", url: "https://www.pangujiexi.com/jiexi/?url=", sort_order: 11 },
    { name: "playm3u8", url: "https://www.playm3u8.cn/jiexi.php?url=", sort_order: 12 },
    { name: "芒果TV1", url: "https://video.isyour.love/player/getplayer?url=", sort_order: 13 },
    { name: "芒果TV2", url: "https://im1907.top/?jx=", sort_order: 14 },
    { name: "HLS解析", url: "https://jx.hls.one/?url=", sort_order: 15 },
];

const DEFAULT_DRAMA_SITES = [
    { name: "影巢movie", url: "https://www.movie1080.xyz/", description: "高清影视资源，美日韩剧优选", icon: "🎬", sort_order: 1 },
    { name: "猴影工坊", url: "https://monkey-flix.com/", description: "Netflix同步资源，猴影精选", icon: "🐒", sort_order: 2 },
    { name: "茉小影", url: "https://www.letu.me/", description: "小清新影视导航，资源丰富", icon: "🌸", sort_order: 3 },
    { name: "网飞猫", url: "https://www.ncat21.com/", description: "网飞猫影视，追剧首选", icon: "🐱", sort_order: 4 },
];

function initDefaultData() {
    // 初始化解析接口
    if (ParseAPI.count() === 0) {
        for (const api of DEFAULT_APIS) {
            ParseAPI.create(api.name, api.url, api.sort_order);
        }
        console.log(`[INFO] 已初始化 ${DEFAULT_APIS.length} 个解析接口`);
    }
    
    // 初始化影视导航
    if (DramaSite.count() === 0) {
        for (const site of DEFAULT_DRAMA_SITES) {
            DramaSite.create(site.name, site.url, site.description, site.icon, site.sort_order);
        }
        console.log(`[INFO] 已初始化 ${DEFAULT_DRAMA_SITES.length} 个影视导航`);
    }
    
    // 检查管理员环境变量
    const adminUsername = process.env.ADMIN_USERNAME || '';
    const adminPassword = process.env.ADMIN_PASSWORD || '';
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    if (adminUsername && adminPassword && adminEmail && UserModel.count() === 0) {
        UserModel.create(adminUsername, adminEmail, adminPassword, true);
        console.log(`[INFO] 已通过环境变量创建管理员账户: ${adminUsername}`);
    } else if (UserModel.count() === 0) {
        console.log('[INFO] 未配置管理员环境变量，请通过注册页面创建第一个用户');
        console.log('[INFO] 第一个注册的用户将自动成为管理员');
    }
}

module.exports = {
    initDatabase,
    saveDatabase,
    UserModel,
    ParseAPI,
    DramaSite,
    APICallLog,
    BackupFile
};
