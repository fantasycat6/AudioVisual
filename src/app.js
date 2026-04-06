/**
 * AudioVisual Web - 视频解析平台 Node.js 版本
 * 主应用入口
 */
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 导入数据库（异步初始化）
const { initDatabase } = require('./db');

// 日志文件路径
const logFile = path.join(process.cwd(), 'server.log');

// 写入日志文件
function writeLog(message) {
    const timestamp = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logLine);
}

// 重写 console.log 同时输出到文件
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = (...args) => {
    originalConsoleLog.apply(console, args);
    writeLog(args.join(' '));
};
console.error = (...args) => {
    originalConsoleError.apply(console, args);
    writeLog('[ERROR] ' + args.join(' '));
};

// 确保必要目录存在
const dirs = ['data', 'backup', 'public'];
dirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

async function startServer() {
    // 初始化数据库
    await initDatabase();
    console.log('[App] 数据库初始化完成');
    
    const app = express();
    const PORT = process.env.PORT || 5000;
    
    // 静态文件目录
    app.use('/public', express.static(path.join(process.cwd(), 'public')));
    
    // 为favicon.ico提供根路径访问支持
    app.get('/favicon.ico', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'public/favicon.ico'));
    });

    // 解析请求体
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    
    // Session配置
    app.use(session({
        secret: process.env.SESSION_SECRET || 'audiovisual-secret-key-2026',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30天（用于"记住我"功能）
        }
    }));
    
    // Flash 消息中间件 (修复版)
    app.use((req, res, next) => {
        // 为向后兼容，设置 req.flash 和 session.flash
        if (!req.session.flash) {
            req.session.flash = {
                error: [],
                success: [],
                info: []
            };
        }
        
        // 创建 req.flash 方法
        req.flash = req.flash || {};
        ['error', 'success', 'info'].forEach(type => {
            req.flash[type] = function(message) {
                if (typeof message === 'string') {
                    if (!req.session.flash[type]) {
                        req.session.flash[type] = [];
                    }
                    req.session.flash[type].push(message);
                }
                return this;
            };
        });
        
        // 设置 res.locals 变量以供视图使用
        res.locals.flash = {
            error: req.session.flash?.error?.[0] || null,
            success: req.session.flash?.success?.[0] || null,
            info: req.session.flash?.info?.[0] || null
        };
        
        // 设置用户信息
        res.locals.user = null;
        
        if (req.session.userId) {
            const { UserModel } = require('./db');
            const user = UserModel.findById(req.session.userId);
            if (user) {
                res.locals.user = user;
            }
        }
        
        next();
    });
    
    // 在请求结束后清除 flash 消息
    app.use((req, res, next) => {
        // 保存对原始end方法的引用
        const originalEnd = res.end;
        
        res.end = function(...args) {
            // 只在响应结束时清除flash（检查session是否存在，因为可能已被destroy）
            if (req.session && req.session.flash) {
                req.session.flash.error = [];
                req.session.flash.success = [];
                req.session.flash.info = [];
            }
            return originalEnd.apply(this, args);
        };
        
        next();
    });
    
    // 视图引擎配置
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    
    // 导入路由
    const authRoutes = require('./routes/auth');
    const mainRoutes = require('./routes/main');
    const adminRoutes = require('./routes/admin');
    
    // 路由配置
    app.use('/', authRoutes);
    app.use('/', mainRoutes);
    app.use('/admin', adminRoutes);
    
    // 404 处理
    app.use((req, res) => {
        if (req.accepts('html')) {
            res.status(404).render('main/parse_error', {
                title: '404 - 页面未找到',
                message: '您访问的页面不存在',
                user: res.locals.user
            });
        } else {
            res.status(404).json({ error: 'Not Found' });
        }
    });
    
    // 错误处理
    app.use((err, req, res, next) => {
        console.error('[Error]', err);
        
        if (req.accepts('html')) {
            res.status(500).render('main/parse_error', {
                title: '500 - 服务器错误',
                message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
                user: res.locals.user
            });
        } else {
            res.status(500).json({ error: 'Internal Server Error', message: err.message });
        }
    });
    
    // 启动服务器
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('='.repeat(50));
        console.log('  AudioVisual Web 视频解析平台 (Node.js)');
        console.log(`  访问地址: http://127.0.0.1:${PORT}`);
        console.log(`  数据库架构: SQLite`);
        console.log(`  Session存储: Memory`);
        console.log('='.repeat(50));
        console.log('');
    });
    
    // 清理函数
    function cleanup() {
        console.log('正在关闭服务器...');
    }
    
    // 添加进程信号处理
    process.on('SIGINT', async () => {
        cleanup();
        process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
        cleanup();
        process.exit(0);
    });
    
    return { app, server, cleanup };
}

startServer().catch(err => {
    console.error('[App] 启动失败:', err);
    process.exit(1);
});

module.exports = null;
