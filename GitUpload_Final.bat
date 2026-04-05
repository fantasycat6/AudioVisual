@echo off
chcp 65001 > nul
REM ==================================================
REM AudioVisual 项目 Git 上传工具 - 最终稳定版
REM 版本：v1.2 - 稳定可靠的解决方法
REM ==================================================

echo ==================================================
echo      AudioVisual 项目 Git 上传工具（稳定版）
echo ==================================================
echo.

if not exist ".git" (
    echo [错误] 当前目录不是Git仓库！
    echo 请确保在AudioVisual项目根目录中运行此脚本。
    pause
    exit /b 1
)

git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] Git未安装或不在PATH中！
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

echo 步骤4: 请选择提交信息类型：
echo 1. AudioVisual v2.0: 视频解析平台完整版本（主要功能发布）
echo 2. AudioVisual v2.0: 修复Git上传工具中文多行字符串问题（bug修复）
echo 3. AudioVisual v2.0: 更新生产环境配置和安全设置（配置优化）
echo 4. 自定义单行提交信息
echo.
set /p CHOICE=请选择（输入1-4）： 

if "%CHOICE%"=="1" (
    set "COMMIT_MSG=AudioVisual v2.0: 视频解析平台完整版本，包含时区修复、智能解析、管理后台、文档系统和生产配置"
) else if "%CHOICE%"=="2" (
    set "COMMIT_MSG=AudioVisual v2.0: 修复Git上传工具中文多行字符串问题并优化脚本稳定性"
) else if "%CHOICE%"=="3" (
    set "COMMIT_MSG=AudioVisual v2.0: 更新生产环境配置，增强安全设置和部署指南"
) else if "%CHOICE%"=="4" (
    echo.
    echo 请输入自定义提交信息（一行简短描述）：
    set /p CUSTOM_MSG=提交信息: 
    if "%CUSTOM_MSG%"=="" (
        echo [警告] 未输入提交信息，使用默认信息。
        set "COMMIT_MSG=AudioVisual 更新（%DATE% %TIME%）"
    ) else (
        set "COMMIT_MSG=%CUSTOM_MSG%"
    )
) else (
    echo [警告] 无效的选择，使用默认信息。
    set "COMMIT_MSG=AudioVisual v2.0: 视频解析平台完整发布和稳定修复"
)

echo.
echo 提交信息：%COMMIT_MSG%
echo.

echo 步骤5: 正在提交更改...
git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [注意] 提交失败，可能原因：
    echo 1. 没有需要提交的更改
    echo 2. Git配置信息不完整（需要运行下面的命令）
    echo 3. 已经提交过相同的内容
    echo.
    echo 请运行以下命令检查配置：
    echo git config --global user.name
    echo git config --global user.email
    echo git status
    echo.
    set /p RETRY=是否重试？(y重试/n退出): 
    if /i "%RETRY%" equ "y" (
        echo 正在重试提交...
        git commit -m "%COMMIT_MSG%"
        if %ERRORLEVEL% neq 0 (
            echo [错误] 重试提交失败！
            pause
            exit /b 1
        )
        echo ✓ 重试提交成功！
    ) else (
        echo 已取消提交流程。
        pause
        exit /b 0
    )
) else (
    echo ✓ 提交成功！
)

echo.
echo 步骤6: 检测远程仓库...
git remote -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo 已检测到远程仓库。
    echo.
    
    REM 检测当前分支
    for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
    if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=master
    
    echo 当前分支：%CURRENT_BRANCH%
    echo.
    
    set /p PUSH_REMOTE=是否推送到远程仓库？(y/n): 
    if /i "%PUSH_REMOTE%" equ "y" (
        echo 正在推送到远程仓库（%CURRENT_BRANCH%）...
        git push origin %CURRENT_BRANCH%
        if %ERRORLEVEL% equ 0 (
            echo ✓ 推送成功！
        ) else (
            echo [注意] 推送失败，可能是首次推送。
            set /p FIRST_PUSH=是否设置上游分支并推送？(y/n): 
            if /i "%FIRST_PUSH%" equ "y" (
                git push -u origin %CURRENT_BRANCH%
                if %ERRORLEVEL% equ 0 (
                    echo ✓ 首次推送成功！
                ) else (
                    echo [警告] 首次推送失败，请手动推送。
                    echo 运行：git push -u origin %CURRENT_BRANCH%
                )
            ) else (
                echo 取消推送，可稍后手动推送。
                echo 运行：git push origin %CURRENT_BRANCH%
            )
        )
    )
) else (
    echo 未配置远程仓库，仅在本地提交。
    echo.
    echo 如需推送，请先配置远程仓库：
    echo git remote add origin <仓库URL>
    echo git push -u origin master
)

echo.
echo ===================== 完成！ =====================
echo 当前时间：%DATE% %TIME%
echo.
echo 建议的后续操作：
echo 1. 查看提交历史：git log --oneline -5
echo 2. 检查工作区状态：git status
echo 3. 如果需要清理临时文件：
echo    del GitUpload_Final.bat
echo    del commit_message_example.txt
echo    del last_step_guide.txt
echo.
echo 注意事项：
echo - 确保所有生产环境配置已更新（.env.example）
echo - 确保文档系统完整（README.md, README_GIT.md, docs/）
echo - 确保Git配置正确（用户名和邮箱）
echo.
pause