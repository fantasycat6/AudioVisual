@echo off
REM ==================================================
REM AudioVisual Project Git Upload Tool - English Version
REM Version: v1.3 - Stable English Edition
REM ==================================================

echo ==================================================
echo      AudioVisual Project Git Upload Tool
echo ==================================================
echo.

REM 1. Check Git repository
if not exist ".git" (
    echo [ERROR] Not a Git repository!
    echo Please run in AudioVisual project root directory.
    pause
    exit /b 1
)

REM 2. Check Git installation
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git not installed or not in PATH!
    pause
    exit /b 1
)

echo Step 1: Check current status...
git status
echo.

set /p CONFIRM=Continue upload? (y/n): 
if /i "%CONFIRM%" neq "y" (
    echo Upload cancelled!
    pause
    exit /b 0
)

echo.
echo ================ Upload Process ==================
echo.

echo Step 2: Add all files to staging...
git add .
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to add files!
    pause
    exit /b 1
)
echo ✓ Files added successfully!
echo.

echo Step 3: View files to commit...
git status --short
echo.

REM Check if there are any changes
git diff --cached --quiet
if %ERRORLEVEL% equ 0 (
    echo [WARNING] No changes to commit!
    echo The working tree is clean.
    echo.
    set /p EMPTY_COMMIT=Create empty commit? (y/n): 
    if /i "%EMPTY_COMMIT%" neq "y" (
        echo Upload cancelled.
        pause
        exit /b 0
    )
)

echo Step 4: Select commit message type:
echo 1. AudioVisual v2.0: Complete video parsing platform
echo 2. AudioVisual v2.0: Fix Git upload tool issues
echo 3. AudioVisual v2.0: Update production configuration
echo 4. Custom single-line commit message
echo.
set /p CHOICE=Please select (1-4): 

if "%CHOICE%"=="1" (
    set "COMMIT_MSG=AudioVisual v2.0: Complete video parsing platform with timezone fix, smart parsing, admin panel, documentation, and production config"
) else if "%CHOICE%"=="2" (
    set "COMMIT_MSG=AudioVisual v2.0: Fix Git upload tool multi-line string issues and improve script stability"
) else if "%CHOICE%"=="3" (
    set "COMMIT_MSG=AudioVisual v2.0: Update production environment configuration with enhanced security and deployment guide"
) else if "%CHOICE%"=="4" (
    echo.
    echo Enter custom commit message (single line):
    set /p CUSTOM_MSG=Commit message: 
    if "%CUSTOM_MSG%"=="" (
        echo [WARNING] No message entered, using default.
        set "COMMIT_MSG=AudioVisual update (%DATE% %TIME%)"
    ) else (
        set "COMMIT_MSG=%CUSTOM_MSG%"
    )
) else (
    echo [WARNING] Invalid choice, using default message.
    set "COMMIT_MSG=AudioVisual v2.0: Complete project release and stability fixes"
)

echo.
echo Commit message: %COMMIT_MSG%
echo.

echo Step 5: Committing changes...
git commit -m "%COMMIT_MSG%"
if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTICE] Commit failed, possible reasons:
    echo 1. No changes to commit
    echo 2. Git configuration incomplete (run commands below)
    echo 3. Already committed same content
    echo.
    echo Check Git configuration:
    git config --global user.name
    git config --global user.email
    echo git status
    echo.
    set /p RETRY=Try again? (y retry/n exit): 
    if /i "%RETRY%" equ "y" (
        echo Retrying commit...
        git commit -m "%COMMIT_MSG%"
        if %ERRORLEVEL% neq 0 (
            echo [ERROR] Retry failed!
            pause
            exit /b 1
        )
        echo ✓ Retry successful!
    ) else (
        echo Upload process cancelled.
        pause
        exit /b 0
    )
) else (
    echo ✓ Commit successful!
)

echo.
echo Step 6: Check remote repository...
git remote -v >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Remote repository detected.
    echo.
    
    REM Detect current branch
    for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
    if "%CURRENT_BRANCH%"=="" set CURRENT_BRANCH=master
    
    echo Current branch: %CURRENT_BRANCH%
    echo.
    
    set /p PUSH_REMOTE=Push to remote repository? (y/n): 
    if /i "%PUSH_REMOTE%" equ "y" (
        echo Pushing to remote repository (%CURRENT_BRANCH%)...
        git push origin %CURRENT_BRANCH%
        if %ERRORLEVEL% equ 0 (
            echo ✓ Push successful!
        ) else (
            echo [NOTICE] Push failed, may be first time push.
            set /p FIRST_PUSH=Set upstream branch and push? (y/n): 
            if /i "%FIRST_PUSH%" equ "y" (
                git push -u origin %CURRENT_BRANCH%
                if %ERRORLEVEL% equ 0 (
                    echo ✓ First push successful!
                ) else (
                    echo [WARNING] First push failed, please push manually.
                    echo Run: git push -u origin %CURRENT_BRANCH%
                )
            ) else (
                echo Push cancelled, can push manually later.
                echo Run: git push origin %CURRENT_BRANCH%
            )
        )
    )
) else (
    echo No remote repository configured, local commit only.
    echo.
    echo To push later, configure remote repository:
    echo git remote add origin <repository-url>
    echo git push -u origin master
)

echo.
echo ================== COMPLETE! ====================
echo Time: %DATE% %TIME%
echo.
echo Recommended next steps:
echo 1. View commit history: git log --oneline -5
echo 2. Check workspace status: git status
echo 3. Clean up temporary files (if needed):
echo    del GitUpload_English.bat
echo    del Git上传检查清单.md
echo    del last_step_guide.txt
echo.
echo Project status:
echo - Production configuration updated (.env.example)
echo - Documentation system complete (README, docs/)
echo - Git tools optimized and stable
echo - Project ready for open source release.
echo.
pause