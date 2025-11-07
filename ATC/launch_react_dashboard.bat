@echo off
echo ========================================
echo AI Controller React Dashboard Launcher
echo ========================================
echo.

echo This script will start:
echo 1. Demo WebSocket server (port 8080)
echo 2. React dashboard (port 3000)
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found: 
node --version
echo.

echo Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    pause
    exit /b 1
)

echo Python found:
python --version
echo.

echo Checking if dashboard dependencies are installed...
if not exist "visualization\web\react-dashboard\node_modules" (
    echo Installing dashboard dependencies...
    cd visualization\web\react-dashboard
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        cd ..\..\..
        pause
        exit /b 1
    )
    cd ..\..\..
    echo.
)

echo ========================================
echo Starting services...
echo ========================================
echo.

echo Starting demo WebSocket server...
start "Demo Server" cmd /k "python visualization\examples\dashboard_demo_server.py"

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Starting React dashboard...
cd visualization\web\react-dashboard
start "React Dashboard" cmd /k "npm start"
cd ..\..\..

echo.
echo ========================================
echo Services started!
echo ========================================
echo.
echo Demo Server: ws://localhost:8080
echo Dashboard: http://localhost:3000
echo.
echo The dashboard should open automatically in your browser.
echo If not, open http://localhost:3000 manually.
echo.
echo To stop the services:
echo 1. Close the "Demo Server" window
echo 2. Close the "React Dashboard" window
echo.
echo Press any key to exit this launcher...
pause >nul