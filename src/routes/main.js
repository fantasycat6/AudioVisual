/**
 * 主路由 - 首页、视频解析、影视导航
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ParseAPI, DramaSite, APICallLog, UserModel } = require('../db');
const { apiKeyOrLoginRequired, getCurrentUser, formatChinaTime } = require('../middleware/auth');

// 首页
router.get('/', apiKeyOrLoginRequired, (req, res) => {
    const apis = ParseAPI.findAllEnabled();
    res.render('main/index', {
        apis: apis.map(api => ({...api, url: api.url})),
        user: req.user,
        formatChinaTime
    });
});

// 影视导航页
router.get('/drama', apiKeyOrLoginRequired, (req, res) => {
    const sites = DramaSite.findAllEnabled();
    res.render('main/drama', {
        sites,
        user: req.user
    });
});

// 获取解析接口列表 (JSON API)
router.get('/api/apis', apiKeyOrLoginRequired, (req, res) => {
    const apis = ParseAPI.findAllEnabled();
    res.json(apis.map(api => ({
        id: api.id,
        name: api.name,
        url: api.url,
        is_enabled: api.is_enabled === 1,
        sort_order: api.sort_order
    })));
});

// 获取影视导航列表 (JSON API)
router.get('/api/drama-sites', apiKeyOrLoginRequired, (req, res) => {
    const sites = DramaSite.findAllEnabled();
    res.json(sites.map(site => ({
        id: site.id,
        name: site.name,
        url: site.url,
        description: site.description,
        icon: site.icon,
        is_enabled: site.is_enabled === 1,
        sort_order: site.sort_order
    })));
});

// 智能解析 API
router.get('/api/parse/smart', apiKeyOrLoginRequired, async (req, res) => {
    const { video_url, api_id, max_retries = 3, type = 'json' } = req.query;

    if (!video_url) {
        if (type === 'video') {
            return res.status(400).send(`
                <html><body style="background:#111;color:#fff;font-family:sans-serif;
                display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;"><h2>❌ 缺少参数</h2><p>请提供 video_url 参数</p></div>
                </body></html>
            `);
        }
        return res.status(400).json({
            success: false,
            message: '请输入视频链接',
            error: 'video_url parameter is required'
        });
    }

    const apis = ParseAPI.findAllEnabled();
    if (apis.length === 0) {
        if (type === 'video') {
            return res.status(404).send(`
                <html><body style="background:#111;color:#fff;font-family:sans-serif;
                display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;"><h2>❌ 暂无可用解析接口</h2></div>
                </body></html>
            `);
        }
        return res.status(404).json({
            success: false,
            message: '暂无可用的解析接口',
            error: 'No enabled parse APIs found'
        });
    }

    // 确定起始位置
    let startIndex = 0;
    if (api_id) {
        const idx = apis.findIndex(api => api.id === parseInt(api_id));
        if (idx !== -1) startIndex = idx;
    }

    const startTime = Date.now();
    const triedApis = [];
    let successApi = null;

    // 尝试多个接口
    for (let i = 0; i < Math.min(max_retries, apis.length); i++) {
        const idx = (startIndex + i) % apis.length;
        const api = apis[idx];

        triedApis.push({
            id: api.id,
            name: api.name,
            url: api.url,
            index: idx
        });

        try {
            // 检查解析站首页是否可达
            const probeUrl = api.url.startsWith('http') ? api.url : 'https://' + api.url;
            const cleanProbeUrl = probeUrl.split('?')[0];

            const response = await axios.head(cleanProbeUrl, { 
                timeout: 5000,
                validateStatus: (status) => status < 500
            });

            if (response.status < 500) {
                successApi = api;
                break;
            }
        } catch (error) {
            console.log(`[解析] 接口 ${api.name} 不可达:`, error.message);
            continue;
        }
    }

    const responseTimeMs = Date.now() - startTime;

    // 记录日志
    try {
        APICallLog.create({
            user_id: getCurrentUser(req)?.id || null,
            api_type: 'smart_parse',
            video_url: video_url.substring(0, 200),
            success: successApi !== null,
            api_id: successApi?.id || null,
            api_name: successApi?.name || 'unknown',
            error_message: successApi ? '' : 'All parse APIs failed',
            response_time_ms: responseTimeMs
        });
    } catch (e) {
        console.error('日志记录失败:', e);
    }

    // 计算下一个建议接口
    const nextIndex = (startIndex + triedApis.length) % apis.length;
    const nextApiId = apis[nextIndex]?.id;

    if (successApi) {
        // 对视频链接进行 URL 编码
        const encodedVideoUrl = encodeURIComponent(video_url);
        const parseUrl = successApi.url + encodedVideoUrl;

        if (type === 'video') {
            return res.render('main/smart_player', {
                parse_url: parseUrl,
                video_url: video_url,
                api: successApi,
                all_apis: apis,
                next_api_id: nextApiId,
                isApiMode: req.isApiMode,
                formatChinaTime
            });
        }

        return res.json({
            success: true,
            message: `使用 ${successApi.name} 解析成功`,
            parse_url: parseUrl,
            api_id: successApi.id,
            api_name: successApi.name,
            next_api_id: nextApiId,
            tried_apis: triedApis
        });
    } else {
        if (type === 'video') {
            const triedNames = triedApis.map(a => a.name).join('、');
            return res.status(503).send(`
                <html><body style="background:#111;color:#fff;font-family:sans-serif;
                display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
                <div style="text-align:center;"><h2>❌ 解析失败</h2>
                <p>已尝试接口：${triedNames}</p><p>请检查视频链接或稍后重试</p></div>
                </body></html>
            `);
        }

        return res.status(503).json({
            success: false,
            message: `尝试了 ${triedApis.length} 个接口均失败，请检查视频链接或稍后重试`,
            error: 'All parse APIs failed',
            next_api_id: nextApiId,
            tried_apis: triedApis
        });
    }
});

// 快速解析 API - 返回所有可用解析接口
router.get('/api/parse/quick', apiKeyOrLoginRequired, (req, res) => {
    const startTime = Date.now();
    const apis = ParseAPI.findAllEnabled();

    // 记录日志
    try {
        APICallLog.create({
            user_id: req.user?.id,
            api_type: 'quick_parse',
            video_url: 'quick_api_list',
            success: true,
            response_time_ms: Date.now() - startTime
        });
    } catch (e) {
        console.error('日志记录失败:', e);
    }

    res.json({
        success: true,
        message: `找到 ${apis.length} 个可用解析接口`,
        apis: apis.map(api => ({
            id: api.id,
            name: api.name,
            url: api.url,
            is_enabled: api.is_enabled === 1,
            sort_order: api.sort_order
        }))
    });
});

// API Key 管理
router.post('/profile/api-key/generate', apiKeyOrLoginRequired, (req, res) => {
    const user = req.user;
    const apiKey = UserModel.generateApiKey(user.id);
    const updatedUser = UserModel.findById(user.id);
    
    res.json({
        success: true,
        api_key: apiKey,
        created_at: updatedUser.api_key_created_at ? 
            formatChinaTime(updatedUser.api_key_created_at, '%Y-%m-%d %H:%M') : ''
    });
});

router.post('/profile/api-key/revoke', apiKeyOrLoginRequired, (req, res) => {
    UserModel.revokeApiKey(req.user.id);
    res.json({ success: true, message: 'API Key 已撤销' });
});

// API 文档页
router.get('/api-docs', apiKeyOrLoginRequired, (req, res) => {
    const apis = ParseAPI.findAllEnabled();
    const totalApiCalls = APICallLog.count();
    const todayActiveUsers = APICallLog.countTodayActiveUsers();
    const successfulCalls = APICallLog.countSuccess();
    const successRate = totalApiCalls > 0 ? (successfulCalls / totalApiCalls * 100).toFixed(2) : 0;
    const avgResponseTime = Math.round(APICallLog.getAvgResponseTime());

    res.render('main/api_docs', {
        apis,
        total_api_calls: totalApiCalls,
        today_active_users: todayActiveUsers,
        success_rate: successRate,
        avg_response_time: avgResponseTime,
        api_count: apis.length,
        drama_site_count: DramaSite.count(),
        user: req.user,
        formatChinaTime
    });
});

// 用户中心
router.get('/profile', apiKeyOrLoginRequired, (req, res) => {
    const user = req.user;
    const userLogs = APICallLog.findByUser(user.id, 20);
    
    res.render('main/profile', {
        user,
        logs: userLogs,
        formatChinaTime
    });
});

// 修改密码
router.post('/profile/change-password', apiKeyOrLoginRequired, (req, res) => {
    const { old_password, new_password } = req.body;
    const user = req.user;

    if (!old_password || !new_password) {
        return res.status(400).json({ success: false, message: '旧密码和新密码不能为空' });
    }

    if (new_password.length < 6) {
        return res.status(400).json({ success: false, message: '新密码至少需要6个字符' });
    }

    if (!UserModel.verifyPassword(user, old_password)) {
        return res.status(400).json({ success: false, message: '旧密码错误' });
    }

    UserModel.updatePassword(user.id, new_password);

    res.json({ success: true, message: '密码修改成功' });
});

// favicon 重定向
router.get('/favicon.ico', (req, res) => {
    res.redirect('/public/favicon.ico');
});

module.exports = router;
