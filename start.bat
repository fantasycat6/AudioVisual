@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo   AudioVisual Web 视频解析平台
echo ========================================
echo.

:: 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 安装依赖（如果 node_modules 不存在）
if not exist "node_modules" (
    echo [INFO] 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo.
echo [INFO] 启动服务中...
echo.
node src/app.js
pause
