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

// 智能解析 API 专用鉴权中间件
// - 外部API调用（显式指定type=json/video）：必须提供正确的api_key，否则返回403
// - 内部使用（无type参数）：必须登录才能使用，未登录跳转登录页
function smartParseAuth(req, res, next) {
    const { type, api_key } = req.query;
    
    // 判断是否为外部API调用（显式指定了type参数且为json或video）
    // 注意：不再默认type='json'，必须显式指定才算外部调用
    const isExternalApiCall = type === 'json' || type === 'video';
    
    // 判断是否为HTML页面请求（内部使用）
    const isHtmlRequest = req.accepts('html') && !req.headers['x-requested-with'];
    
    if (isExternalApiCall) {
        // 外部API调用：必须有api_key参数
        if (!api_key) {
            // 返回简单的403页面，不暴露具体错误信息
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head><title>403 Forbidden</title></head>
                <body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h1 style="font-size:72px;margin:0;">403</h1>
                        <p style="font-size:18px;">Forbidden</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        // 验证 API Key
        const user = UserModel.findByApiKey(api_key);
        if (!user) {
            // 返回简单的403页面
            return res.status(403).send(`
                <!DOCTYPE html>
                <html>
                <head><title>403 Forbidden</title></head>
                <body style="background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h1 style="font-size:72px;margin:0;">403</h1>
                        <p style="font-size:18px;">Forbidden</p>
                    </div>
                </body>
                </html>
            `);
        }
        
        req.user = user;
        req.isApiMode = true;
        return next();
    }
    
    // 内部使用（无type参数）：必须登录
    if (req.session.userId) {
        const user = UserModel.findById(req.session.userId);
        if (user) {
            req.user = user;
            req.isApiMode = false;
            return next();
        }
    }
    
    // 未登录，重定向到登录页（无论是HTML请求还是AJAX请求都跳转）
    const redirectUrl = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?next=${redirectUrl}`);
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
    smartParseAuth,
    loginRequired,
    adminRequired,
    getCurrentUser,
    formatChinaTime,
    getChinaNow
};
