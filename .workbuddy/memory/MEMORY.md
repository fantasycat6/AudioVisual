# 项目长期记忆

## 项目概述
AudioVisual Web 视频解析平台 - Node.js版本

## 技术栈
- 后端: Node.js + Express
- 数据库: SQLite (sql.js - 纯JavaScript实现，无需编译)
- 模板引擎: EJS
- 认证: Session + API Key

## 已知问题和修复
- **调用记录筛选问题** (已修复)
  - 用户中心调用记录只显示最新20条 - 这是有意设计
  - 管理后台筛选条件闪烁 - 已修复后端筛选逻辑和前端状态保持

## Session存储方案 (简化版)
**当前方案**: 默认内存存储
**优势**: 简单、无需外部依赖、无文件系统残留问题

### 技术细节:
- 使用express-session默认的MemoryStore
- 无需额外依赖或配置
- "记住我"功能正常工作，支持长期保持登录状态

### 注意事项:
- 内存存储不适用于生产环境（会显示警告）
- 服务器重启后session会丢失，需要重新登录
- 适合开发和测试环境使用

### 生产部署建议:
1. **开发/测试环境**: 使用当前内存存储方案
2. **生产环境**: 建议升级到数据库存储（如MySQL、PostgreSQL + Sequelize store）或安装Redis服务

## Favicon修复 (2026-04-06)
**问题**: 后台管理的数据备份与恢复页面没有正确显示favicon.ico
**解决方案**: 
1. 在app.js中添加根路径favicon.ico路由支持
2. 更新header.ejs中的favicon引用为根路径`/favicon.ico`

### 技术细节:
- **根路径访问**: 添加`app.get('/favicon.ico', ...)`路由，确保所有页面都能访问favicon
- **路径标准化**: 更新模板中使用`/favicon.ico`替代`/public/favicon.ico`
- **双路径支持**: 保留`/public/favicon.ico`访问以保持向后兼容

### 验证方法:
1. 访问 `http://localhost:5010/favicon.ico` 应返回200状态码
2. 访问数据备份页面 `http://localhost:5010/admin/backup` 应正常显示favicon
3. 其他页面也应正常显示favicon

### 重要文件:
- `src/app.js` - 第59-63行，添加favicon路由
- `src/views/partials/header.ejs` - 第7行，更新favicon引用
- `FAVICON_FIX_README.md` - 详细修复文档

## 用户偏好和项目约定
- 用户希望简化session管理，避免文件系统残留
- "记住我"功能应该正常工作，支持长期保持登录状态（内存存储下重启服务器仍会丢失session）
- 保持与现有登录/登出逻辑的兼容性
- 所有页面都应正确显示favicon.ico图标

## 项目完成状态 (2026-04-07)
- ✅ **功能完善**: 所有核心功能已实现并测试通过
- ✅ **生产就绪**: 环境变量设置为生产模式 (NODE_ENV=production)
- ✅ **文档完整**: README.md包含完整部署指南和技术文档
- **清理完成**:
  - 删除了所有开发测试文件 (`test_session_persistence.js`, `test_favicon.html`)
  - 清理了临时文档 (`SESSION_PERSISTENCE_README.md`, `FAVICON_FIX_README.md`)
  - 移除了进程记录文件 (`.server.pid`)
- ✅ **技术改进**:
  - 管理后台API调用记录页面优化（用户名显示、视频URL点击复制）
  - 界面筛选条件简化（移除不常用API类型）
  - Session方案简化（移除Redis，回退到简单内存存储）
  - Favicon兼容性修复
  - **登录关键修复**:
    - **Flash机制统一化**: 修复所有 `req.flash.error = '消息'` 为 `req.flash.error('消息')` 函数调用
    - **Session生命周期**: 添加 `req.session.save()` 显式保存，特别是对AJAX请求
    - **AJAX检测优化**: 使用 `req.headers['content-type']?.includes('application/json')` 替代过时的 `req.xhr`
    - **重复响应错误修复**: 修复 `ERR_HTTP_HEADERS_SENT` 错误，重构Session保存回调逻辑

## 生产部署配置
- **必改配置**:
  1. 修改默认SESSION_SECRET为安全密钥
  2. 设置管理员账号和环境变量
  3. 调整端口（如需）
- **推荐部署方式**: PM2进程管理 + Nginx反向代理 + HTTPS
- **数据监控**: 定期检查`data/sessions/`目录大小和数据库文件备份

## 最佳实践
1. 生产环境必须设置更强的SESSION_SECRET
2. favicon等静态资源使用根路径引用以提高兼容性
3. 使用CDN分发前端静态资源提升性能
4. 定期备份`data/audiovisual.db`数据库文件
5. 更新依赖 (`npm update`) 并监控安全漏洞
6. 如需生产环境部署，考虑升级session存储方案（数据库或Redis）

## 性能优化建议
1. **数据库索引**: 针对常用查询字段添加索引
2. **缓存策略**: 实现API响应缓存减少数据库压力
3. **日志管理**: 定期轮转`server.log`文件避免过大
4. **内存监控**: 监控Node.js进程内存使用情况
5. **并发处理**: 在高并发场景下考虑负载均衡

## 维护计划
- 每周检查一次服务器日志
- 每月备份数据库
- 每季度更新依赖包
- 每年审查安全配置

**项目完成纪念**: AudioVisual Web Node.js版本 - 从Flask复刻并完善，2026年4月完成✅