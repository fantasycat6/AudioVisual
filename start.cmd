@echo off
chcp 65001 > nul
REM Start AudioVisual Video Parsing Platform
ECHO Starting AudioVisual Video Parsing Platform...
ECHO.

REM Check if .env file exists
IF EXIST ".env" (
    ECHO Found .env configuration file...
) ELSE (
    ECHO Warning: .env configuration file not found
    ECHO Using default configuration...
)

REM Use python-dotenv to load environment variables
ECHO Installing/Checking python-dotenv...
pip install python-dotenv --quiet > nul 2>&1
ECHO.

REM Start the application
ECHO Starting application on port: 
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.environ.get('PORT', 5000))"
ECHO.
python app.py

REM If the application exits unexpectedly, pause to view error messages
pause