/**
 * 认证中间件
 */
const { UserModel } = require('../db');

// 从请求中提取 API Key
function extractApiKey(req) {
    // 1. 从查询参数 ?api_key= 获取
    const queryKey = req.query.api_key || '';
    if (queryKey) return queryKey;
    
    // 2. 从请求头 X-API-Key 获取
    const headerKey = req.headers['x-api-key'] || '';
    if (headerKey) return headerKey;
    
    // 3. 从 Authorization: Bearer <token> 获取
    const auth = req.headers['authorization'] || '';
    if (auth.startsWith('Bearer ')) {
        return auth.substring(7).trim();
    }
    
    return '';
}

// 检查是否处于 API 模式（仅通过认证方式判断）
function isApiMode(req) {
    // 存在 api_key 参数
    if ('api_key' in req.query) return true;
    
    // 存在 X-API-Key 请求头
    if (req.headers['x-api-key']) return true;
    
    // 存在 Bearer token
    if (req.headers['authorization']?.startsWith('Bearer ')) return true;
    
    return false;
}

// API Key 认证中间件（支持 API Key 或 Session 双重认证）
function apiKeyOrLoginRequired(req, res, next) {
    // 检查是否有 session 登录
    if (req.session.userId) {
        const user = UserModel.findById(req.session.userId);
        if (user) {
            req.user = user;
            req.isApiMode = false;
            return next();
        }
    }
    
    // 未登录时，检查是否使用 API Key 认证
    if (isApiMode(req)) {
        // API 模式：必须有合法 Key
        const apiKey = extractApiKey(req);
        const user = apiKey ? UserModel.findByApiKey(apiKey) : null;
        
        if (!user) {
            if (req.accepts('html')) {
                return res.status(403).send('<h1>403 Forbidden</h1><p>无效的 API Key</p>');
            }
            return res.status(403).json({ error: 'Forbidden', message: '无效的 API Key' });
        }
        
        req.user = user;
        req.isApiMode = true;
        return next();
    }
    
    // 未登录且无 API Key，重定向到登录页
    if (req.accepts('html')) {
        const redirectUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login?next=${redirectUrl}`);
    }
    
    return res.status(401).json({ error: 'Unauthorized', message: '请先登录' });
}

// 登录必需中间件
function loginRequired(req, res, next) {
    if (req.session.userId) {
        const user = UserModel.findById(req.session.userId);
        if (user) {
            req.user = user;
            return next();
        }
    }
    
    if (req.accepts('html')) {
        const redirectUrl = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login?next=${redirectUrl}`);
    }
    
    return res.status(401).json({ error: 'Unauthorized', message: '请先登录' });
}

// 管理员权限中间件
function adminRequired(req, res, next) {
    if (!req.user || !req.user.is_admin) {
        if (req.accepts('html')) {
            req.flash = req.flash || {};
            req.flash.error = '需要管理员权限';
            return res.redirect('/');
        }
        return res.status(403).json({ error: 'Forbidden', message: '需要管理员权限' });
    }
    next();
}

// 获取当前用户（兼容 API Key 和 Session）
function getCurrentUser(req) {
    return req.user || null;
}

// 格式化中国时间
function formatChinaTime(date, format = '%Y-%m-%d %H:%M:%S') {
    if (!date) return '';
    
    const d = new Date(date);
    // 转换为中国时区 (UTC+8)
    d.setHours(d.getHours() + 8);
    
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    const seconds = String(d.getUTCSeconds()).padStart(2, '0');
    
    return format
        .replace('%Y', year)
        .replace('%m', month)
        .replace('%d', day)
        .replace('%H', hours)
        .replace('%M', minutes)
        .replace('%S', seconds);
}

// 获取中国时区当前时间
function getChinaNow() {
    const now = new Date();
    // 直接使用本地时间（系统时区），不额外加8小时
    // 如果系统时区是 Asia/Shanghai，new Date() 已经返回正确时间
    return now;
}

module.exports = {
    extractApiKey,
    isApiMode,
    apiKeyOrLoginRequired,
    loginRequired,
    adminRequired,
    getCurrentUser,
    formatChinaTime,
    getChinaNow
};
