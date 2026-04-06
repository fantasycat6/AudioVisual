/**
 * 认证路由 - 登录、注册、登出
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { UserModel } = require('../db');
const { loginRequired, formatChinaTime, getChinaNow } = require('../middleware/auth');

// 登录页面
router.get('/login', (req, res) => {
    if (req.session.userId) {
        const user = UserModel.findById(req.session.userId);
        if (user) {
            return res.redirect('/');
        }
    }
    res.render('auth/login', {
        error: req.flash?.error?.[0] || null,
        success: req.flash?.success?.[0] || null,
        next: req.query.next || '',
        layout: false
    });
});

// 处理登录
router.post('/login', [
    body('username').trim().notEmpty().withMessage('请输入用户名或邮箱'),
    body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.accepts('json')) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        req.flash = req.flash || {};
        if (req.flash.error && typeof req.flash.error === 'function') {
            req.flash.error(errors.array()[0].msg);
        } else {
            req.session.flash = req.session.flash || {};
            req.session.flash.error = [errors.array()[0].msg];
        }
        return res.redirect('/login');
    }

    const { username, password, remember } = req.body;
    const user = UserModel.findByUsernameOrEmail(username);

    if (user && UserModel.verifyPassword(user, password)) {
        // 更新最后登录时间
        UserModel.updateLastLogin(user.id);
        
        // 设置 session - 修复Cookie maxAge设置
        req.session.userId = user.id;
        
        // 正确设置cookie过期时间
        if (remember) {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
            // 同时设置cookie选项，确保cookie被正确发送
            req.session.cookie.expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        } else {
            // 会话cookie，浏览器关闭时过期
            req.session.cookie.maxAge = null;
            req.session.cookie.expires = false;
        }

        // 在返回响应前显式保存session（特别是对AJAX请求）
        req.session.save((err) => {
            if (err) {
                console.error('Session保存失败:', err);
                if (req.accepts('json') || req.xhr) {
                    return res.status(500).json({ success: false, message: '服务器内部错误' });
                } else {
                    req.flash = req.flash || {};
                    if (req.flash.error && typeof req.flash.error === 'function') {
                        req.flash.error('服务器内部错误');
                    }
                    return res.redirect('/login');
                }
            }
            
            // Session保存成功，继续处理响应
            if (req.accepts('json') || req.headers['content-type']?.includes('application/json')) {
                return res.json({ success: true, redirect: req.body.next || '/' });
            }

            // 处理 next 参数，避免重定向到 API 路径
            let nextPage = req.body.next || '/';
            if (nextPage.startsWith('/api/')) {
                nextPage = '/';
            }
            
            return res.redirect(nextPage);
        });
        
        // 重要：异步操作已经开始，这里必须return阻止后续代码执行
        return;
    }

    // 密码验证失败的处理
    if (req.accepts('json') || req.headers['content-type']?.includes('application/json')) {
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    req.flash = req.flash || {};
    if (req.flash.error && typeof req.flash.error === 'function') {
        req.flash.error('用户名或密码错误');
    } else {
        req.session.flash = req.session.flash || {};
        req.session.flash.error = ['用户名或密码错误'];
    }
    res.redirect('/login');
});

// 注册页面
router.get('/register', (req, res) => {
    if (req.session.userId) {
        const user = UserModel.findById(req.session.userId);
        if (user) {
            return res.redirect('/');
        }
    }
    res.render('auth/register', {
        error: req.flash?.error?.[0] || null,
        layout: false
    });
});

// 处理注册
router.post('/register', [
    body('username').trim()
        .isLength({ min: 2, max: 20 }).withMessage('用户名需要2-20个字符'),
    body('email').trim()
        .isEmail().withMessage('请输入有效的邮箱地址'),
    body('password')
        .isLength({ min: 6 }).withMessage('密码至少需要6个字符'),
    body('confirm_password')
        .custom((value, { req }) => value === req.body.password)
        .withMessage('两次输入的密码不一致')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.accepts('json')) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }
        req.flash = req.flash || {};
        if (req.flash.error && typeof req.flash.error === 'function') {
            req.flash.error(errors.array()[0].msg);
        } else {
            req.session.flash = req.session.flash || {};
            req.session.flash.error = [errors.array()[0].msg];
        }
        return res.redirect('/register');
    }

    const { username, email, password } = req.body;

    // 检查用户名和邮箱是否已被占用
    if (UserModel.findByUsername(username)) {
        if (req.accepts('json')) {
            return res.status(400).json({ success: false, message: '用户名已被占用' });
        }
        req.flash = req.flash || {};
        if (req.flash.error && typeof req.flash.error === 'function') {
            req.flash.error('用户名已被占用');
        } else {
            req.session.flash = req.session.flash || {};
            req.session.flash.error = ['用户名已被占用'];
        }
        return res.redirect('/register');
    }

    if (UserModel.findByEmail(email)) {
        if (req.accepts('json')) {
            return res.status(400).json({ success: false, message: '邮箱已被注册' });
        }
        req.flash = req.flash || {};
        if (req.flash.error && typeof req.flash.error === 'function') {
            req.flash.error('邮箱已被注册');
        } else {
            req.session.flash = req.session.flash || {};
            req.session.flash.error = ['邮箱已被注册'];
        }
        return res.redirect('/register');
    }

    // 检查是否是第一个用户（自动成为管理员）
    const userCount = UserModel.count();
    const isFirstUser = userCount === 0;
    
    // 检查环境变量配置的管理员
    const adminUsername = process.env.ADMIN_USERNAME || '';
    const adminEmail = process.env.ADMIN_EMAIL || '';
    let isAdminUser = false;
    
    if (isFirstUser) {
        isAdminUser = true;
    } else if (adminUsername && username === adminUsername) {
        isAdminUser = true;
    } else if (adminEmail && email === adminEmail) {
        isAdminUser = true;
    }

    const user = UserModel.create(username, email, password, isAdminUser);
    
    if (isAdminUser) {
        console.log(`[INFO] 用户 ${username} 成为管理员`);
    }

    if (req.accepts('json') || req.xhr) {
        return res.json({ 
            success: true, 
            message: '注册成功，请登录',
            redirect: '/login'
        });
    }

    req.flash = req.flash || {};
    if (req.flash.success && typeof req.flash.success === 'function') {
        req.flash.success('注册成功，欢迎加入！');
    } else {
        req.session.flash = req.session.flash || {};
        req.session.flash.success = ['注册成功，欢迎加入！'];
    }
    
    // 自动登录
    req.session.userId = user.id;
    res.redirect('/');
});

// 登出
router.get('/logout', loginRequired, (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

router.post('/logout', loginRequired, (req, res) => {
    req.session.destroy();
    if (req.accepts('json')) {
        return res.json({ success: true, redirect: '/login' });
    }
    res.redirect('/login');
});

module.exports = router;
