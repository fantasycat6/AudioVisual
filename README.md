# AudioVisual Web - 视频解析平台

基于 Node.js 的视频解析 Web 平台，复刻自 Python Flask 版本的 AudioVisual 项目。

## 项目状态

✅ **已完成** - 所有核心功能已实现，项目准备就绪，可用于生产环境

## 功能特性

- 🎬 **视频解析** - 支持智能解析和快速获取，多接口自动切换
- 🌍 **影视导航** - 整合优质影视资源站，可后台管理
- 👥 **用户系统** - 注册/登录、API Key认证、用户中心、调用记录
- 🔧 **管理后台** - 用户管理、接口管理、导航管理、调用记录查看
- 💾 **数据备份** - 数据库导入导出，配置备份与恢复
- 🔐 **会话持久化** - 支持“记住我”功能，session持久存储
- 📱 **响应式设计** - 适配桌面和移动端浏览器
- ⚡ **性能优化** - 数据库查询优化，UI改进

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置生产环境

复制 `.env.example` 为 `.env` 并设置生产模式：

```env
PORT=5010
NODE_ENV=production
SESSION_SECRET=your-secure-secret-key-here-change-this
# (可选) 设置初始管理员账号
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password-here
ADMIN_EMAIL=admin@example.com
```

**重要**：在生产环境中，请务必将 `SESSION_SECRET` 替换为强密码。

### 3. 启动服务

```bash
# 生产环境启动
node src/app.js
# 或使用PM2等进程管理器
pm2 start src/app.js --name "audiovisual-web"
# 或双击 start.bat (Windows)
```

访问 http://127.0.0.1:5010

## 目录结构

```
audiovisual-web/
├── src/
│   ├── app.js          # 主应用入口
│   ├── db.js           # 数据库模块
│   ├── routes/
│   │   ├── auth.js     # 认证路由
│   │   ├── main.js     # 主路由
│   │   └── admin.js    # 管理后台路由
│   ├── middleware/
│   │   └── auth.js     # 认证中间件
│   └── views/          # EJS 模板
├── data/               # SQLite 数据库存储
├── backup/             # 备份文件存储
├── public/             # 静态文件
└── .env                # 环境配置
```

## API 接口

### 智能解析

```
GET /api/parse/smart?video_url=xxx&api_key=your_key
```

### 快速获取接口列表

```
GET /api/parse/quick?api_key=your_key
```

### 获取影视导航

```
GET /api/drama-sites?api_key=your_key
```

## 技术栈

- **运行时**: Node.js
- **框架**: Express.js
- **模板引擎**: EJS (嵌入式JavaScript模板)
- **数据库**: SQLite (sql.js - 纯JavaScript实现，无需编译)
- **认证**: Session + API Key 双重认证
- **会话存储**: session-file-store (持久化存储)
- **前端**: Bootstrap 5 + 自定义CSS
- **工具**: ESLint, Prettier (代码质量)

## 🚀 生产部署指南

### 环境要求
- Node.js 14+ (推荐使用最新LTS版本)
- 稳定的磁盘空间用于数据库存储

### 最佳实践
1. **安全性**：
   - 修改默认端口 (5010) 和 SESSION_SECRET
   - 为管理员用户设置强密码
   - 启用HTTPS（如使用Nginx反向代理）

2. **数据管理**：
   - 定期备份 `data/` 目录和SQLite数据库
   - 使用管理后台的备份/恢复功能
   - 监控 `data/sessions/` 目录大小，定期清理过期session

3. **性能优化**：
   - 使用PM2或systemd进行进程管理
   - 考虑使用CDN分发静态资源
   - 定期检查并优化数据库查询

4. **维护**：
   - 定期更新依赖包 (`npm update`)
   - 监控日志文件 (`server.log`)
   - 检查磁盘使用情况

### 注意事项
- 第一个注册的用户会自动成为管理员
- 可以通过环境变量配置初始管理员账号
- 后台管理的API调用记录页面已优化：
  - 用户列显示用户名而非仅ID
  - 视频URL为可点击链接并支持复制
  - 简化API类型筛选条件（移除不常用选项）
- session持久化：支持“记住我”功能，session文件存储在 `data/sessions/` 目录

## 🐛 故障排除

### 常见问题
1. **服务器端口占用**
   ```bash
   # Windows
   netstat -ano | findstr :5010
   taskkill /F /PID [PID]
   # Linux/macOS
   lsof -i :5010
   kill -9 [PID]
   ```

2. **数据库文件损坏**
   ```bash
   # 使用SQLite工具修复
   sqlite3 data/audiovisual.db ".dump" | sqlite3 data/audiovisual-new.db
   mv data/audiovisual.db data/audiovisual-corrupt.db
   mv data/audiovisual-new.db data/audiovisual.db
   ```

3. **Session文件过多**
   ```bash
   # 手动清理过期session文件
   find data/sessions/ -name "*.json" -mtime +30 -delete
   ```

### 日志查看
- 应用日志：`server.log`
- 访问日志：查看控制台输出
- 错误日志：查看控制台/stderr输出

## 📞 支持与贡献

如需技术支持或有改进建议，欢迎：
- 查看代码中的注释文档
- 查阅技术决策记录（参考项目记忆文件）
- 报告问题或提出功能建议

## 许可证

MIT License

---

**项目完成于 2026年4月 - AudioVisual Web Node.js版本**
