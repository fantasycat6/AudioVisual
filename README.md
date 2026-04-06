# AudioVisual Web - 视频解析平台 (Node.js版本)

基于 Node.js + Express 的视频解析 Web 平台，是 Python Flask 版本 AudioVisual 项目的完整复刻与增强。

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-orange.svg)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌟 项目分支

本项目是 AudioVisual 的 **Node.js 版本**，托管在 `nodejs` 分支：
- **主分支 (main/master)**: Python Flask 版本
- **当前分支 (nodejs)**: Node.js + Express 版本 ⬅️

## ✅ 项目状态

**🎉 生产就绪** - 所有核心功能已实现并通过测试，可部署到生产环境

### 最新更新 (2026-04-07)
- ✅ 修复登录功能的 Session 和 Flash 机制问题
- ✅ 修复登出时的空值访问错误
- ✅ 优化异步控制流，消除重复响应错误
- ✅ 简化 Session 存储方案（内存存储，无需 Redis）

## 🚀 功能特性

- 🎬 **视频解析** - 支持智能解析和快速获取，多接口自动切换
- 🌍 **影视导航** - 整合优质影视资源站，支持后台管理
- 👥 **用户系统** - 注册/登录、API Key 认证、用户中心、调用记录
- 🔧 **管理后台** - 用户管理、接口管理、导航管理、调用记录查看
- 💾 **数据备份** - 数据库导入导出，配置备份与恢复
- 🔐 **会话管理** - 支持"记住我"功能，Session 持久化
- 📱 **响应式设计** - 适配桌面和移动端浏览器
- ⚡ **性能优化** - 数据库查询优化，UI 改进

## 📦 快速开始

### 环境要求
- Node.js 18+ (推荐 20.x LTS)
- npm 9+ 或 yarn

### 1. 克隆项目

```bash
git clone -b nodejs https://github.com/fantasycat6/AudioVisual.git
cd AudioVisual
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```env
PORT=5010
NODE_ENV=production
SESSION_SECRET=your-secure-secret-key-here-change-this-min-32-chars

# (可选) 设置初始管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password-here
ADMIN_EMAIL=admin@example.com
```

⚠️ **重要**：生产环境务必将 `SESSION_SECRET` 替换为至少32位的强密码！

### 4. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 或使用 PM2 进程管理器
pm2 start src/app.js --name "audiovisual-web"
```

访问 http://localhost:5010

## 📁 目录结构

```
AudioVisual/
├── src/
│   ├── app.js              # 主应用入口
│   ├── db.js               # SQLite 数据库模块
│   ├── routes/
│   │   ├── auth.js         # 认证路由 (登录/注册/登出)
│   │   ├── main.js         # 主页面路由
│   │   └── admin.js        # 管理后台路由
│   ├── middleware/
│   │   └── auth.js         # 认证中间件
│   └── views/              # EJS 模板文件
│       ├── auth/           # 认证页面
│       ├── main/           # 主页面
│       ├── admin/          # 管理后台
│       └── partials/       # 公共组件
├── data/                   # 数据存储目录
│   └── audiovisual.db      # SQLite 数据库
├── backup/                 # 备份文件存储
├── public/                 # 静态资源
├── .env.example            # 环境变量示例
├── package.json            # 项目配置
└── README.md               # 项目说明
```

## 🔌 API 接口文档

### 智能解析

```http
GET /api/parse/smart?video_url={url}&api_key={your_key}
```

**参数**:
- `video_url` - 视频链接地址
- `api_key` - 用户 API Key

**响应**:
```json
{
  "success": true,
  "data": {
    "title": "视频标题",
    "url": "解析后的视频地址",
    "source": "解析接口来源"
  }
}
```

### 快速获取接口列表

```http
GET /api/parse/quick?api_key={your_key}
```

### 获取影视导航

```http
GET /api/drama-sites?api_key={your_key}
```

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **运行时** | Node.js 18+ |
| **Web框架** | Express.js 4.x |
| **模板引擎** | EJS (Embedded JavaScript) |
| **数据库** | SQLite (sql.js - 纯JavaScript实现) |
| **认证** | express-session + API Key |
| **Session存储** | MemoryStore (开发/测试) |
| **前端框架** | Bootstrap 5 |
| **代码规范** | ESLint |

## 🚀 生产部署

### 使用 PM2 部署

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start src/app.js --name "audiovisual-web"

# 保存配置
pm2 save
pm2 startup
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Docker 部署 (可选)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5010
CMD ["node", "src/app.js"]
```

## ⚠️ 安全建议

1. **修改默认配置**
   - 更换默认端口 (5010)
   - 设置强 SESSION_SECRET (至少32位随机字符)
   - 配置强密码的管理员账号

2. **启用 HTTPS**
   - 使用 Nginx 反向代理 + SSL 证书
   - 或使用 Cloudflare 等 CDN 服务

3. **定期维护**
   - 备份 `data/audiovisual.db` 数据库
   - 更新依赖包 (`npm update`)
   - 监控 `server.log` 日志文件

## 🐛 故障排除

### 端口被占用

```bash
# Windows
netstat -ano | findstr :5010
taskkill /F /PID [PID]

# Linux/macOS
lsof -i :5010
kill -9 [PID]
```

### 数据库问题

```bash
# 备份数据库
cp data/audiovisual.db backup/audiovisual-$(date +%Y%m%d).db

# 修复损坏的数据库
sqlite3 data/audiovisual.db ".dump" | sqlite3 data/audiovisual-new.db
mv data/audiovisual.db data/audiovisual-corrupt.db
mv data/audiovisual-new.db data/audiovisual.db
```

### Session 问题

开发环境使用内存存储 Session，服务器重启后会丢失登录状态。如需持久化，可配置数据库存储或 Redis。

## 📝 更新日志

### 2026-04-07
- 🔧 修复登录功能的 Session 保存和 Flash 机制
- 🔧 修复登出时的空值访问错误
- 🔧 优化异步控制流处理
- 🎉 项目达到生产就绪状态

### 2026-04-06
- ✨ 初始版本发布
- ✨ 完成 Python Flask 版本的完整复刻
- ✨ 添加管理后台优化

## 🤝 贡献指南

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证

## 🙏 致谢

- 原 Python Flask 版本 AudioVisual 项目
- Express.js 社区
- Bootstrap 团队

---

**项目维护**: fantasycat6  
**最后更新**: 2026年4月7日  
**版本**: v1.0.0-nodejs
