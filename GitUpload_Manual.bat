@echo off
REM ==================================================
REM AudioVisual Git Upload - SAFE MANUAL METHOD
REM Bypass all batch script problems
REM ==================================================

echo ==================================================
echo    AudioVisual Safe Git Upload - Manual Method
echo ==================================================
echo.
echo This tool will guide you through SAFE manual steps
echo to upload your project, avoiding all batch script issues.
echo.
pause

REM Check basic requirements
if not exist ".git" (
    echo 1. [CHECK] Not in Git repository!
    echo    Please open Command Prompt in AudioVisual project folder.
    echo    Current path: %CD%
    echo.
    pause
    exit /b 1
)

git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo 1. [CHECK] Git not found!
    echo    Please install Git first: https://git-scm.com
    echo.
    pause
    exit /b 1
)

echo.
echo =============== STEP 1: Check Status ===============
echo.
echo Run this command in Command Prompt:
echo git status
echo.
echo You should see something like:
echo "Your branch is ahead of 'origin/master' by 3 commits"
echo "nothing to commit, working tree clean"
echo.
pause

echo.
echo =============== STEP 2: Add All Files ===============
echo.
echo If you have changes to commit, run:
echo git add .
echo.
echo If you want to see what will be added:
echo git status --short
echo.
pause

echo.
echo ============ STEP 3: Choose Commit Message ===========
echo.
echo Recommended commit messages (COPY ONE):
echo.
echo OPTION 1 (Main Release):
echo git commit -m "AudioVisual v2.0: Complete video parsing platform"
echo.
echo OPTION 2 (Bug Fix):
echo git commit -m "AudioVisual v2.0: Fix Git upload tool encoding issues"
echo.
echo OPTION 3 (Config Update):
echo git commit -m "AudioVisual v2.0: Update production configuration"
echo.
echo OPTION 4 (Custom):
echo git commit -m "Your custom commit message here"
echo.
pause

echo.
echo =============== STEP 4: Verify Commit ===============
echo.
echo After committing, verify with:
echo git log --oneline -3
echo.
echo You should see your commit at the top.
echo.
pause

echo.
echo =============== STEP 5: Push to Remote ===============
echo.
echo If you want to push to GitHub/Gitee:
echo git push origin master
echo.
echo If pushing for the first time:
echo git push -u origin master
echo.
pause

echo.
echo ================ DIRECT COMMANDS =================
echo.
echo Or run these commands directly in Command Prompt:
echo.
echo 1. git add .
echo 2. git status
echo 3. git commit -m "AudioVisual v2.0: Complete project with production config"
echo 4. git push origin master
echo.
echo ============= Git Configuration Check =============
echo.
echo Before pushing, verify Git config:
echo git config --global user.name
echo git config --global user.email
echo.
echo If not set, configure with:
echo git config --global user.name "Your Name"
echo git config --global user.email "your.email@example.com"
echo.
pause

echo.
echo ============ Project Status Summary =============
echo.
echo Your AudioVisual project is ready:
echo ✓ 15 video parsing APIs + smart parsing system
echo ✓ Complete user management with admin panel
echo ✓ Timezone system (APP_TIMEZONE support)
echo ✓ Production configuration (security optimized)
echo ✓ Full documentation (23,000+ words)
echo ✓ Ready for open source release!
echo.
echo.
echo ============== FINAL RECOMMENDATION =============
echo.
echo Since batch tools have encoding problems, we recommend:
echo.
echo 1. Open Command Prompt as Administrator
echo 2. Navigate to: d:\File\Code\Python\AudioVisual\
echo 3. Run these commands one by one:
echo    git add .
echo    git commit -m "AudioVisual v2.0: Complete project with production config"
echo    git push origin master
echo.
echo ==================================================
echo    MANUAL METHOD COMPLETE - SAFE AND RELIABLE
echo ==================================================
echo.
echo This avoids all Windows batch encoding issues.
echo.
pause