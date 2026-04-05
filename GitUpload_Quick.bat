@echo off
chcp 65001 > nul
REM ==================================================
REM AudioVisual 项目 Git 快速上传工具
REM 版本：v1.0 - 快速模式
REM ==================================================

echo ======== AudioVisual Git 快速上传 ========
echo.

REM 定义换行符变量
for /f %%a in ('copy /Z "%~dpf0" nul') do set "CR=%%a"
set LF=^


REM 检查Git环境
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] Git未安装！
    pause
    exit /b 1
)

if not exist ".git" (
    echo [错误] 当前目录不是Git仓库！
    pause
    exit /b 1
)

REM 获取当前分支
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set BRANCH=%%i
if "%BRANCH%"=="" set BRANCH=master

REM 1. 添加所有文件
echo 步骤1: 添加所有文件到暂存区...
git add .
if %ERRORLEVEL% neq 0 (
    echo [错误] 添加文件失败！
    pause
    exit /b 1
)
echo  ✓ 完成！^&^& echo.

REM 2. 自动生成提交信息
set "CURRENT_DATE=%DATE%"
set "CURRENT_TIME=%TIME%"

echo 步骤2: 生成提交信息...
for /f "tokens=2 delims==" %%I in ('wmic OS Get localdatetime /value') do set DATETIME=%%I
set "YEAR=%DATETIME:~0,4%"
set "MONTH=%DATETIME:~4,2%"
set "DAY=%DATETIME:~6,2%"
set "HOUR=%DATETIME:~8,2%"
set "MINUTE=%DATETIME:~10,2%"

REM 使用安全的字符串构建方式
setlocal enabledelayedexpansion
set "COMMIT_MSG=AudioVisual 更新（%YEAR%-%MONTH%-%DAY% %HOUR%:%MINUTE%）"
set "COMMIT_MSG=!COMMIT_MSG!%LF%%LF%"
set "COMMIT_MSG=!COMMIT_MSG!主要内容："
set "COMMIT_MSG=!COMMIT_MSG!%LF%"
set "COMMIT_MSG=!COMMIT_MSG!• 视频解析平台完整版本"
set "COMMIT_MSG=!COMMIT_MSG!%LF%"
set "COMMIT_MSG=!COMMIT_MSG!• 修复时区问题，支持多时区配置"
set "COMMIT_MSG=!COMMIT_MSG!%LF%"
set "COMMIT_MSG=!COMMIT_MSG!• 新增智能解析系统"
set "COMMIT_MSG=!COMMIT_MSG!%LF%"
set "COMMIT_MSG=!COMMIT_MSG!• 完善API文档和测试工具"
set "COMMIT_MSG=!COMMIT_MSG!%LF%"
set "COMMIT_MSG=!COMMIT_MSG!• 完成文档系统（README/README_GIT/docs）"
set "COMMIT_MSG=!COMMIT_MSG!%LF%"
set "COMMIT_MSG=!COMMIT_MSG!• 更新为生产环境默认配置"
endlocal & set "COMMIT_MSG=%COMMIT_MSG%"

echo.
echo 提交信息：
echo -------------------------------------------------
echo %COMMIT_MSG%
echo -------------------------------------------------
echo.

REM 3. 提交
echo 步骤3: 提交更改...
git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 (
    echo [错误] 提交失败！
    echo 请检查Git配置（git config --global user.name/user.email）
    pause
    exit /b 1
)
echo  ✓ 提交成功！^&^& echo.

REM 4. 提示推送到远程
git remote -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo 步骤4: 检测到已配置远程仓库...
    set /p PUSH=  是否推送到远程？(y/n,默认y): 
    if "%PUSH%"=="" set PUSH=y
    if /i "%PUSH%" equ "y" (
        echo  正在推送到远程仓库...
        git push origin %BRANCH%
        if %ERRORLEVEL% equ 0 (
            echo  ✓ 推送成功！
        ) else (
            echo  [注意] 推送失败，可能是首次推送。
            echo  请运行：git push -u origin %BRANCH%
        )
    )
) else (
    echo 步骤4: 未配置远程仓库
    echo  本地提交完成，如需推送到远程请先配置远程仓库。
)

echo.
echo ======== 完成！ ========
echo.
echo 状态报告：
echo  • 分支: %BRANCH%
echo  • 时间: %CURRENT_DATE% %CURRENT_TIME%
echo  • 提交: 本地提交完成

echo.
set /p DEL_FILE=是否删除生成的上传工具？(y/n,默认n): 
if "%DEL_FILE%"=="" set DEL_FILE=n
if /i "%DEL_FILE%" equ "y" (
    echo 正在删除临时文件...
    del GitUpload_Quick.bat >nul 2>&1
    if exist Git上传检查清单.md del Git上传检查清单.md >nul 2>&1
    if exist final_upload_guide.md del final_upload_guide.md >nul 2>&1
    echo 已清理临时文件！
)

pause