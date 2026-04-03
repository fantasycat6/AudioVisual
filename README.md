# AudioVisual Web — 视频解析平台

> 从 [AudioVisual](https://github.com/RemotePinee/AudioVisual) Electron 桌面应用提取并重构为 Python Flask Web 版本。

## 功能特性

- 🔐 **用户系统**：注册/登录/退出，支持记住登录
- 🎯 **视频解析**：15个解析接口，支持腾讯/爱奇艺/优酷/B站/芒果TV
- 🌍 **影视导航**：4个精选影视网站（新标签页打开，无CORS限制）
- ⚙️ **管理后台**：用户管理、解析接口管理、导航管理
- 🗄️ **双数据库支持**：默认 SQLite，可切换 MySQL

## 快速启动

### 1. 安装依赖

```bash
cd web_app
pip install -r requirements.txt

# 如果使用 MySQL，还需要：
pip install PyMySQL
```

### 2. 启动服务

```bash
# 默认使用 SQLite，直接启动
python app.py

# 指定端口
PORT=8080 python app.py

# 使用 MySQL
DB_TYPE=mysql MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD=xxx MYSQL_DB=audiovisual python app.py
```

### 3. 访问地址

打开浏览器访问：http://127.0.0.1:5000

**首次注册的用户自动成为管理员。**

## 目录结构

```
web_app/
├── app.py              # Flask 应用入口
├── config.py           # 配置（SQLite/MySQL切换）
├── models.py           # 数据库模型
├── auth.py             # 认证蓝图（登录/注册/退出）
├── routes.py           # 主要路由（首页/解析/影视）
├── admin.py            # 管理后台蓝图
├── requirements.txt    # Python 依赖
├── .env.example        # 环境变量示例
├── templates/
│   ├── base.html           # 基础布局
│   ├── auth/
│   │   ├── login.html      # 登录页
│   │   └── register.html   # 注册页
│   ├── main/
│   │   ├── index.html      # 视频解析主页
│   │   ├── drama.html      # 影视导航
│   │   └── player.html     # 播放器页
│   └── admin/
│       ├── index.html      # 管理后台首页
│       ├── users.html      # 用户管理
│       ├── apis.html       # 解析接口管理
│       └── drama_sites.html # 影视导航管理
└── static/
    ├── css/
    │   ├── style.css   # 全局样式
    │   └── auth.css    # 认证页样式
    └── js/
        └── main.js     # 全局 JS
```

## 与原版区别

| 功能 | 原版（Electron） | Web版（Flask） |
|------|-----------------|----------------|
| 视频解析 | 内嵌 BrowserView | iframe 嵌入解析接口 |
| 影视导航 | 内置浏览器直接访问 | 新标签页打开（无CORS限制）|
| 数据存储 | localStorage | SQLite / MySQL |
| 用户管理 | 无 | 注册/登录/管理员 |
| 部署方式 | 桌面安装包 | Web服务，局域网/公网 |

## 注意事项

- 视频解析页面使用 iframe 加载解析接口，部分接口可能有广告
- 影视导航采用新标签页方式打开，避免 CORS/X-Frame-Options 限制
- 生产部署建议修改 `SECRET_KEY` 为随机字符串
- 本项目仅供学习研究，所有资源来自互联网
