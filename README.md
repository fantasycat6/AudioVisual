# 🎬 AudioVisual Web — 专业视频解析平台

> 从 [AudioVisual](https://github.com/RemotePinee/AudioVisual) Electron 桌面应用提取并重构为现代化的 Python Flask Web 版本。  
> 支持多解析接口、智能解析、影视导航，并提供完整的管理后台与API系统。

![Flask](https://img.shields.io/badge/Flask-3.0.0+-blue.svg)
![Python](https://img.shields.io/badge/Python-3.8+-green.svg)
![SQLite/MySQL](https://img.shields.io/badge/Database-SQLite%2FMySQL-orange.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ 核心功能概览

### 🎯 **视频解析系统**
- **多接口支持**：15个主流视频平台解析接口（腾讯/爱奇艺/优酷/B站/芒果TV等）
- **智能解析**：自动尝试多个接口，失败时智能切换（`/api/parse/smart`）
- **快速解析**：获取所有可用接口列表（`/api/parse/quick`）
- **接口管理**：后台可配置解析接口的启用/禁用和排序

### 🌍 **影视导航服务**
- **精选网站**：4个高质量影视资源网站导航
- **无CORS限制**：新标签页打开，避免跨域问题
- **网站管理**：支持自定义导航图标、描述和排序

### 👤 **用户与权限系统**
- **完整用户系统**：注册、登录、登出、记住登录状态
- **用户中心**：个人信息查看、自助密码修改、账户安全建议
- **智能权限管理**：
  - 第一个注册的用户自动成为管理员
  - 管理员可以管理其他用户权限
  - 管理员有完整的管理后台访问权限

### ⚙️ **专业管理后台**
- **用户管理**：用户列表、权限管理、密码重置
- **API接口管理**：解析接口的增删改查、启用/禁用、排序
- **影视导航管理**：网站导航的增删改查、图标设置
- **备份管理系统**：数据备份创建、导入、恢复、下载、删除
- **实时统计**：API调用次数统计、成功率、24小时趋势图

### 🔧 **技术架构特性**
- **双数据库支持**：默认SQLite，可无缝切换MySQL
- **时区智能处理**：完整的时区支持，通过环境变量配置
- **API文档系统**：完整的在线API文档和测试工具
- **响应式设计**：完美适配桌面和移动设备
- **安全保障**：密码SHA-256哈希存储，安全的会话管理

---

## 🚀 快速开始

### 1. 环境准备
```bash
# 克隆项目（或下载源码）
git clone <your-repository-url>
cd AudioVisual

# 创建虚拟环境（推荐）
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 配置环境
```bash
# 复制环境配置模板
copy .env.example .env
# Linux/macOS: cp .env.example .env

# 编辑 .env 文件，至少设置：
SECRET_KEY=your_secure_secret_key_here
```

### 3. 启动应用
```bash
# 默认配置启动
python app.py

# 指定端口启动
PORT=8080 python app.py

# 开发模式（自动重启）
FLASK_DEBUG=true python app.py
```

### 4. 访问应用
打开浏览器访问：**http://127.0.0.1:5000**

**重要提示**：第一个注册的用户会自动成为管理员！

---

## 📁 详细配置说明

### 环境变量配置（.env文件）
```bash
# ===== 基础配置 =====
# 运行环境设置：development (开发), production (生产), testing (测试)
FLASK_ENV=production           # 生产环境设置为 production
FLASK_DEBUG=false              # 生产环境关闭调试模式
SECRET_KEY=your-secret-key      # 必须更换为安全的随机密钥！
PORT=5000                      # 绑定端口

# ===== 数据库配置 =====
DB_TYPE=sqlite                  # sqlite（默认） 或 mysql

# SQLite 配置（默认）
# SQLITE_PATH=./audiovisual.db

# MySQL 配置（DB_TYPE=mysql 时使用）
# DB_TYPE=mysql
# MYSQL_HOST=localhost
# MYSQL_PORT=3306
# MYSQL_USER=root
# MYSQL_PASSWORD=your_password
# MYSQL_DB=audiovisual

# ===== 时区配置 =====
# 时区字符串: Asia/Shanghai, UTC, America/New_York
# 时区别名: china, shanghai, beijing, utc, gmt, us_eastern...
APP_TIMEZONE=Asia/Shanghai

# ===== 生产环境安全配置 =====
# WTF CSRF 保护密钥（防止跨站请求伪造）
WTF_CSRF_SECRET_KEY=your_csrf_secret_key_here_change_it

# ===== 生产环境日志配置 =====
LOG_LEVEL=WARNING                  # 日志级别：DEBUG,INFO,WARNING,ERROR,CRITICAL
# LOG_FILE=./logs/audiovisual.log  # 日志文件路径（为空则输出到控制台）

# ===== 生产环境会话安全 =====
SESSION_COOKIE_SECURE=false        # HTTPS环境建议设置为true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax

# ===== 管理员账户 =====
# 首次运行的默认管理员账户（可选）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password
ADMIN_EMAIL=admin@example.com
```

### 数据库切换
项目支持两种数据库：
1. **SQLite（默认）**：适合开发和个人使用，零配置
2. **MySQL**：适合生产环境，需要安装 `PyMySQL`

切换数据库只需修改 `.env` 文件的 `DB_TYPE` 和相应配置。

### 生产环境配置安全建议
1. **环境模式**：`FLASK_ENV=production`
2. **关闭调试**：`FLASK_DEBUG=false`（防止敏感信息泄露）
3. **生成安全密钥**：使用命令生成32位以上随机密钥
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
4. **使用MySQL**：生产环境建议使用MySQL代替SQLite
5. **启用HTTPS**：如果启用HTTPS，设置`SESSION_COOKIE_SECURE=true`
6. **日志管理**：配置`LOG_FILE`将日志输出到文件
7. **管理员密码**：修改管理员默认密码为强密码

### 生产环境部署检查清单
✅ `FLASK_ENV=production`  
✅ `FLASK_DEBUG=false`  
✅ `SECRET_KEY` 已更换为随机密钥  
✅ 数据库已配置（MySQL推荐）  
✅ 管理员密码已修改  
✅ 日志配置已完成  
✅ 防火墙/安全组已配置允许端口

---

## 🔌 API 接口系统

### API 文档
访问 **http://127.0.0.1:5000/api-docs** 查看完整的API文档和在线测试工具。

### 核心API端点
| 端点 | 方法 | 功能 | 参数 |
|------|------|------|------|
| `/api/parse/smart` | GET/POST | 智能视频解析 | `video_url`, `api_id`(可选), `max_retries`(默认3) |
| `/api/parse/quick` | GET/POST | 快速获取解析接口列表 | 无 |
| `/api/apis` | GET | 获取所有可用解析接口 | 无 |
| `/api/drama-sites` | GET | 获取影视导航网站 | 无 |

### 使用示例
```python
import requests

# 智能视频解析
response = requests.post('http://localhost:5000/api/parse/smart', json={
    'video_url': 'https://v.qq.com/x/cover/id.html',
    'max_retries': 3
})

# 获取解析接口列表
response = requests.get('http://localhost:5000/api/apis')
```

---

## 👥 用户权限系统

### 用户角色
1. **普通用户**：
   - 视频解析功能
   - 影视导航访问
   - 用户中心（个人信息、密码修改）

2. **管理员**：
   - 所有普通用户功能
   - 管理后台访问权限
   - 用户管理、API管理、影视导航管理
   - 数据备份与恢复

### 权限管理流程
```bash
# 1. 系统启动后，第一个注册的用户自动成为管理员
# 2. 管理员可在后台管理其他用户的权限
# 3. 普通用户可通过用户中心修改密码
# 4. 忘记密码需联系管理员重置
```

---

## 📊 管理后台功能

### 用户管理
- ✅ 用户列表查看
- ✅ 用户权限切换（普通↔管理员）
- ✅ 用户密码重置
- ✅ 用户删除（需谨慎操作）
- ✅ 管理员自助密码修改（需验证旧密码）

### API接口管理
- ✅ 解析接口列表查看
- ✅ 新增解析接口
- ✅ 编辑解析接口
- ✅ 启用/禁用解析接口
- ✅ 接口排序调整

### 影视导航管理
- ✅ 导航网站列表查看
- ✅ 新增导航网站
- ✅ 编辑导航网站信息
- ✅ 启用/禁用导航网站
- ✅ 自定义网站图标

### 备份管理系统
- ✅ 备份文件列表查看
- ✅ 创建数据备份
- ✅ 从备份恢复数据
- ✅ 备份文件下载
- ✅ 备份文件删除
- ✅ 外部备份导入

### 实时统计
- ✅ API调用总次数统计
- ✅ 今日API调用统计
- ✅ API成功率统计
- ✅ 24小时调用趋势图表
- ✅ 最常用API接口排名

---

## 🗂️ 项目目录结构

```
AudioVisual/
├── app.py                    # Flask应用工厂和主入口
├── config.py                 # 配置管理（SQLite/MySQL切换）
├── models.py                 # 数据库模型（用户、API、影视等）
├── auth.py                   # 用户认证蓝图（登录/注册/登出）
├── routes.py                 # 主路由蓝图（首页/解析/影视/API）
├── admin.py                  # 管理后台蓝图（完整后台管理）
├── timezone_util.py          # 时区处理工具模块
├── requirements.txt          # Python依赖包
├── .env.example              # 环境变量配置模板
├── .gitignore               # Git忽略规则（已排除敏感文件）
├── README.md                # 项目说明文档（本文件）
├── static/                   # 静态资源文件
│   ├── css/                  # 样式表
│   │   ├── style.css        # 全局样式
│   │   └── auth.css         # 认证页面样式
│   ├── js/                  # JavaScript文件
│   │   └── main.js          # 全局交互脚本
│   └── favicon.*             # 网站图标
└── templates/               # Jinja2模板
    ├── base.html            # 基础布局模板
    ├── auth/                # 认证相关
    │   ├── login.html       # 登录页
    │   └── register.html    # 注册页
    ├── main/                # 主页面
    │   ├── index.html       # 视频解析主页
    │   ├── drama.html       # 影视导航页
    │   ├── player.html      # 播放器页
    │   ├── api_docs.html    # API文档页
    │   └── profile.html     # 用户中心页
    └── admin/               # 管理后台
        ├── index.html       # 管理首页
        ├── users.html       # 用户管理
        ├── apis.html        # API接口管理
        ├── drama_sites.html # 影视导航管理
        └── backup.html      # 备份文件管理
```

---

## ⚙️ 技术架构详解

### 后端框架
- **Flask 3.0+**：轻量级Python Web框架
- **Flask-SQLAlchemy**：ORM数据库操作
- **Flask-Login**：用户会话管理
- **Werkzeug**：安全密码哈希

### 数据库系统
1. **SQLite（默认）**：
   - 零配置，文件数据库
   - 开发测试最佳选择
   - 单文件便于备份和迁移

2. **MySQL（生产可选）**：
   - 高性能并发支持
   - 更好的生产环境稳定性
   - 需要安装 `PyMySQL` 驱动

### 时区处理
采用智能时区方案：
- 数据库存储本地时间（无时区）
- 模板过滤器自动格式化显示
- 支持运行时通过 `APP_TIMEZONE` 配置时区
- 内置常见时区别名映射（china→上海，utc→UTC等）

### 安全性设计
- **密码安全**：SHA-256哈希存储，加盐处理
- **会话管理**：Flask-Login + 安全会话cookie
- **权限验证**：装饰器保护管理员路由
- **输入验证**：前后端双重验证机制
- **CSRF防护**：内置安全性头

---

## 🔄 部署方案

### 开发环境
```bash
# 直接运行（推荐）
python app.py

# 指定端口
PORT=5010 python app.py

# Windows启动脚本
start.cmd
```

### 生产部署建议

1. **使用生产配置**：
```bash
# .env 文件中设置
FLASK_ENV=production
FLASK_DEBUG=false
SECRET_KEY=<生成安全的随机密钥>
DB_TYPE=mysql  # 生产环境推荐使用MySQL
```

2. **使用Gunicorn（Linux/macOS）**：
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app()"
```

3. **使用Nginx反向代理**：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

4. **Windows服务部署**：
```bash
# 使用 waitress（Windows兼容）
pip install waitress
waitress-serve --port=5000 app:create_app
```

---

## 🔧 维护与备份

### 数据备份
```bash
# 通过管理后台创建备份
# 访问：/admin/  → 备份管理 → 创建备份

# 手动备份SQLite数据库（文件拷贝）
copy audiovisual.db audiovisual_backup_$(date +%Y%m%d).db
```

### 数据恢复
1. **通过管理后台**：
   - 登录管理员账户
   - 进入备份管理
   - 选择备份文件恢复

2. **手动恢复**：
   - 替换数据库文件即可恢复

### 日志查看
- Flask开发模式下自动输出日志到控制台
- 生产环境建议配置日志文件

---

## 🐛 故障排除

### 常见问题

**Q1: 端口已被占用**
```bash
# 查找占用端口的进程
netstat -ano | findstr :5000
# Windows: 终止进程或修改PORT环境变量
```

**Q2: 数据库连接失败**
```bash
# SQLite: 检查文件权限
# MySQL: 检查连接信息和PyMySQL安装
pip install PyMySQL  # 如果使用MySQL
```

**Q3: 时区显示不正确**
```bash
# 检查 .env 文件中的 APP_TIMEZONE 配置
APP_TIMEZONE=Asia/Shanghai  # 中国时区
```

**Q4: 管理员账户被锁**
```bash
# 通过环境变量创建默认管理员
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin_password
ADMIN_EMAIL=admin@example.com
# 重新启动应用
```

### 调试模式
```bash
# 启用详细错误输出
FLASK_DEBUG=true python app.py

# 查看应用日志
python app.py 2>&1 | tee app.log
```

---

## 🔮 未来发展计划

### 已规划特性
- [ ] 更多视频解析接口支持
- [ ] 解析历史记录和收藏功能
- [ ] 用户偏好设置
- [ ] 多语言国际化支持
- [ ] 高级搜索功能
- [ ] 移动端App适配
- [ ] 解析API缓存机制
- [ ] 视频下载功能
- [ ] 第三方登录（微信/QQ）
- [ ] 付费会员系统

### 性能优化
- [ ] 数据库查询优化
- [ ] API响应缓存
- [ ] 静态资源CDN
- [ ] 负载均衡支持
- [ ] Docker容器化部署

---

## 📄 许可证与版权

### 许可证
本项目采用 **MIT 许可证** - 查看 [LICENSE](LICENSE) 文件了解详情。

### 版权声明
```
Copyright (c) 2026 AudioVisual Web 项目

本软件仅供学习和研究目的使用，请勿用于商业用途。
所有视频资源来自互联网，版权归原版权方所有。

如有版权问题，请联系我们立即删除相关内容。
```

### 注意事项
1. **仅供学习研究**：请遵守相关法律法规
2. **免责声明**：开发者不对使用本软件造成的任何后果负责
3. **开源贡献**：欢迎提交Issue和Pull Request

---

## 🤝 贡献指南

### 如何贡献
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 代码规范
- 遵循 PEP 8 Python 编码规范
- 添加适当的注释和文档
- 确保代码包含必要的测试
- 保持向后兼容性

### 联系方式
- 项目主页：GitHub Repository
- 问题反馈：[Issues](https://github.com/your-repo/issues)
- 功能建议：[Discussion](https://github.com/your-repo/discussions)

---

## 📖 文档资源

### 在线文档
- **API文档**：`http://your-server:5000/api-docs`
- **管理后台**：`http://your-server:5000/admin/` (需管理员登录)
- **用户中心**：`http://your-server:5000/profile`

### 离线文档
项目包含详细的说明文档，位于 `docs/` 目录下：
- `管理员密码修改说明.md` - 管理员账户管理指南
- `普通用户用户中心使用说明.md` - 用户自助服务指南

### Git使用指南
查看 `README_GIT.md`（如果需要）获取详细的Git配置和部署指南。

---

## 🌟 特别鸣谢

感谢以下开源项目为本项目提供支持：
- [Flask](https://github.com/pallets/flask) - Python Web框架
- [Flask-SQLAlchemy](https://github.com/pallets-eco/flask-sqlalchemy) - ORM扩展
- [Flask-Login](https://github.com/maxcountryman/flask-login) - 用户认证
- [pytz](https://pythonhosted.org/pytz/) - 时区处理库
- [原版AudioVisual](https://github.com/RemotePinee/AudioVisual) - 灵感来源

---

**✨ 感谢使用 AudioVisual Web 视频解析平台！**

如果有任何问题或建议，请随时通过GitHub Issue联系我们。

*最后更新：2026年4月*