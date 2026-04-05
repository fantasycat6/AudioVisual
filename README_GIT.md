# Git 配置与部署指南

## Git 配置说明

此项目已配置 `.gitignore` 文件，以下文件/目录将不会提交到 GitHub：

### 忽略的文件和目录：

1. **本地环境配置**:
   - `.env` - 环境配置文件（包含敏感数据）
   - `.env.local` - 本地环境配置

2. **开发工具文件**:
   - `.workbuddy/` - WorkBuddy IDE 工作区文件
   - `.vscode/` - VS Code 配置文件
   - `.idea/` - PyCharm 配置文件

3. **缓存和临时文件**:
   - `__pycache__/` - Python 字节码缓存
   - `*.pyc`, `*.pyo`, `*.pyd` - Python 编译文件
   - `*.db`, `*.sqlite`, `*.sqlite3` - 数据库文件
   - `audiovisual.db` - 当前项目的 SQLite 数据库

4. **备份文件**:
   - `backup/` - 数据备份目录
   - `*.bak` - 备份文件

5. **Windows 特定文件**:
   - `start.cmd` - Windows 启动脚本
   - `GitUpload.bat` - Windows Git 上传脚本
   - `Thumbs.db` - Windows 缩略图缓存

### 需要手动添加的文件：

以下文件可能需要在首次提交时手动添加：

```bash
# 添加所有非忽略文件
git add .

# 或者逐个添加重要文件
git add .gitignore
git add .env.example
git add README.md
git add requirements.txt
git add app.py
git add config.py
git add models.py
git add routes.py
git add admin.py
git add auth.py
git add static/
git add templates/
```

## 首次部署到 GitHub

```bash
# 1. 初始化本地仓库
git init

# 2. 添加远程仓库
git remote add origin https://github.com/用户名/仓库名.git

# 3. 添加并提交文件
git add .
git commit -m "Initial commit: AudioVisual 视频解析平台"

# 4. 推送到 GitHub
git push -u origin master
```

## 日常开发工作流

### 推荐的工作流程：

1. **本地开发**：
   - 使用 `.env` 文件配置本地环境（不要提交）
   - 使用 `start.cmd` 或 `python app.py` 启动应用

2. **提交更改**：
   - 使用 `GitUpload.bat`（Windows）或手动执行：
     ```bash
     # 只添加已跟踪的文件，避免意外添加 .env
     git add -u
     
     # 添加新创建的源代码文件
     git add app.py config.py models.py routes.py admin.py auth.py
     git add static/ templates/
     
     # 提交
     git commit -m "更新描述"
     
     # 推送
     git push origin master
     ```

3. **安全注意事项**：
   - 永远不要提交 `.env` 文件
   - 检查 `git status` 确保没有敏感文件被添加
   - 使用 `.env.example` 作为配置文件模板

## 从 GitHub 克隆项目

```bash
# 1. 克隆项目
git clone https://github.com/用户名/仓库名.git
cd 仓库名

# 2. 创建本地环境配置
copy .env.example .env
# 编辑 .env 文件，设置 SECRET_KEY、PORT 等

# 3. 安装依赖
pip install -r requirements.txt

# 4. 初始化数据库
# 首次运行会自动创建数据库

# 5. 启动应用
python app.py
# 或使用 start.cmd (Windows)
```

## 故障排除

### 问题：意外添加了敏感文件

```bash
# 从暂存区移除文件但保留本地副本
git rm --cached .env
git rm --cached audiovisual.db
git rm -r --cached .workbuddy/
git rm -r --cached backup/

# 更新 .gitignore 并提交更改
git add .gitignore
git commit -m "移除敏感文件"
```

### 问题：.gitignore 不生效

```bash
# 清除缓存，重新添加文件
git rm -r --cached .
git add .
git commit -m "修复 .gitignore 缓存"
```

### 问题：端口配置不起作用

1. 确保安装了 `python-dotenv`：
   ```bash
   pip install python-dotenv
   ```

2. 检查 `.env` 文件格式：
   ```
   PORT=5010  # 不要有空格
   ```

3. 重启应用使配置生效。

## 更新后的文件结构

```
AudioVisual/
├── .gitignore              # Git 忽略规则
├── .env.example           # 环境配置模板
├── README_GIT.md         # Git 使用指南 (本文件)
├── README.md             # 项目说明
├── requirements.txt      # Python 依赖
├── app.py               # 应用入口 (已更新支持 dotenv)
├── config.py            # 配置管理
├── models.py            # 数据库模型
├── routes.py            # 路由
├── admin.py             # 管理后台
├── auth.py              # 认证模块
├── static/              # 静态文件
├── templates/           # 模板文件
├── start.cmd            # Windows 启动脚本 (已更新)
└── GitUpload.bat        # Git 上传脚本 (已更新)
```

以下文件**不会**提交到 GitHub：
- `.env` (本地环境配置)
- `.workbuddy/` (WorkBuddy 工作区)
- `__pycache__/` (Python 缓存)
- `backup/` (数据备份)
- `audiovisual.db` (本地数据库)