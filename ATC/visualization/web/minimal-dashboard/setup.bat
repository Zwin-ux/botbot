@echo off
echo.
echo ================================================================================
echo   Minimal ATC Dashboard - Setup
echo ================================================================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Installing dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================================
    echo   Setup Complete!
    echo ================================================================================
    echo.
    echo To start the dashboard:
    echo   npm run dev
    echo.
    echo Then open http://localhost:3000
    echo.
) else (
    echo.
    echo ERROR: Installation failed
    echo.
)

pause
