@echo off
echo ========================================
echo Dashboard Setup Verification
echo ========================================
echo.

echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] Node.js is not installed
    echo        Please install from https://nodejs.org/
    set HAS_ERROR=1
) else (
    echo [OK] Node.js is installed
    node --version
)
echo.

echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [FAIL] npm is not installed
    set HAS_ERROR=1
) else (
    echo [OK] npm is installed
    npm --version
)
echo.

echo Checking dependencies...
if exist "node_modules" (
    echo [OK] node_modules folder exists
    if exist "node_modules\react" (
        echo [OK] React is installed
    ) else (
        echo [WARN] React not found in node_modules
        echo        Run 'npm install' to install dependencies
    )
    if exist "node_modules\@mui\material" (
        echo [OK] Material-UI is installed
    ) else (
        echo [WARN] Material-UI not found in node_modules
        echo        Run 'npm install' to install dependencies
    )
) else (
    echo [WARN] node_modules folder not found
    echo        Run 'npm install' to install dependencies
)
echo.

echo Checking source files...
if exist "src\App.tsx" (
    echo [OK] App.tsx exists
) else (
    echo [FAIL] App.tsx not found
    set HAS_ERROR=1
)

if exist "src\components\ScenarioVisualizer.tsx" (
    echo [OK] ScenarioVisualizer.tsx exists
) else (
    echo [FAIL] ScenarioVisualizer.tsx not found
    set HAS_ERROR=1
)

if exist "src\components\TrainingControls.tsx" (
    echo [OK] TrainingControls.tsx exists
) else (
    echo [FAIL] TrainingControls.tsx not found
    set HAS_ERROR=1
)

if exist "src\components\PerformanceMetrics.tsx" (
    echo [OK] PerformanceMetrics.tsx exists
) else (
    echo [FAIL] PerformanceMetrics.tsx not found
    set HAS_ERROR=1
)

if exist "src\services\WebSocketService.ts" (
    echo [OK] WebSocketService.ts exists
) else (
    echo [FAIL] WebSocketService.ts not found
    set HAS_ERROR=1
)
echo.

echo ========================================
if defined HAS_ERROR (
    echo Status: FAILED - Please fix the errors above
) else (
    echo Status: READY - Dashboard is set up correctly
    echo.
    echo Next steps:
    echo 1. If dependencies are not installed, run: npm install
    echo 2. Start the demo server: python ..\..\examples\dashboard_demo_server.py
    echo 3. Start the dashboard: npm start
)
echo ========================================
echo.
pause