@echo off
chcp 65001 > nul
CLS
REM ==================================================
REM AudioVisual 项目 Git 简单上传工具
REM 修复版 - 避免多行字符串问题
REM ==================================================

echo.
echo ==================================================
echo      AudioVisual Git 简单上传工具
echo ==================================================
echo.

REM 1. 检查是否在Git仓库
if not exist ".git" (
    echo [错误] 当前目录不是Git仓库！
    echo 请确保在AudioVisual项目根目录中运行此脚本。
    pause
    exit /b 1
)

REM 2. 检查Git安装
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] Git未安装或不在PATH中！
    echo 请先安装Git并配置系统PATH。
    pause
    exit /b 1
)

echo 步骤1: 检查当前状态...
git status
echo.

set /p CONFIRM=是否继续上传？(y/n): 
if /i "%CONFIRM%" neq "y" (
    echo 已取消上传！
    pause
    exit /b 0
)

echo.
echo ================= 开始上传流程 ====================
echo.

echo 步骤2: 添加所有文件到暂存区...
git add .
if %ERRORLEVEL% neq 0 (
    echo [错误] 添加文件失败！
    pause
    exit /b 1
)
echo ✓ 添加成功！
echo.

echo 步骤3: 查看将要提交的文件...
git status --short
echo.

echo 步骤4: 请输入提交信息（一行简短描述）：
echo 示例："AudioVisual v2.0: 修复中文多行字符串问题"
echo.
set /p COMMIT_SUMMARY=提交信息: 

echo.
echo 步骤5: 正在提交更改...
echo 提交信息："%COMMIT_SUMMARY%"
git commit -m "%COMMIT_SUMMARY%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [注意] 提交失败，可能原因：
    echo 1. 没有需要提交的更改
    echo 2. Git配置信息不完整
    echo 3. 已经提交过相同的内容
    echo.
    echo 检查Git配置：
    git config --global user.name
    git config --global user.email
    echo.
    echo 检查状态：
    git status
    echo.
    set /p CONTINUE=是否继续？（输入y继续，其他键退出）: 
    if /i "%CONTINUE%" neq "y" (
        pause
        exit /b 0
    )
) else (
    echo ✓ 提交成功！
    echo.
)

echo 步骤6: 检查远程仓库...
git remote -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo 检测到已配置的远程仓库。
    echo.
    set /p PUSH_REMOTE=是否推送到远程仓库？(y/n): 
    if /i "%PUSH_REMOTE%" equ "y" (
        echo 正在推送到远程仓库...
        for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
        if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=master
        git push origin %CURRENT_BRANCH%
        if %ERRORLEVEL% equ 0 (
            echo ✓ 推送成功！
        ) else (
            echo [注意] 推送失败，可能是首次推送。
            echo 请运行：git push -u origin %CURRENT_BRANCH%
        )
    )
) else (
    echo 未配置远程仓库，本地提交完成。
    echo 如需推送到远程，请先配置：git remote add origin <URL>
)

echo.
echo ================= 上传完成！ ====================
echo 时间：%DATE% %TIME%
echo.
echo 建议的Git操作：
echo 1. 查看提交历史：git log --oneline -5
echo 2. 检查配置：git config --list | findstr user
echo 3. 清理临时文件（如需）：
echo    del GitUpload_Simple.bat
echo.
pause