@echo off
echo.
echo ================================================================================
echo   Launching Minimal ATC Dashboard
echo ================================================================================
echo.

REM Check if dependencies are installed
if not exist "visualization\web\minimal-dashboard\node_modules" (
    echo Dependencies not installed. Running setup...
    echo.
    cd visualization\web\minimal-dashboard
    call setup.bat
    cd ..\..\..
)

echo Starting dashboard...
echo.
echo Backend should be running on ws://localhost:8080
echo Dashboard will open on http://localhost:3000
echo.
echo Press Ctrl+C to stop
echo.

cd visualization\web\minimal-dashboard
call npm run dev

pause
