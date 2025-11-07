@echo off
REM Quick start script for Vercel deployment (Windows)

echo ============================================
echo   ATC Dashboard - Vercel Deployment Setup
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo X Error: package.json not found
    echo    Please run this script from: visualization\web\vercel-deployment\
    exit /b 1
)

echo √ In correct directory
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if errorlevel 1 (
    echo X npm install failed
    exit /b 1
)

echo √ Dependencies installed
echo.

REM Create .env.local if it doesn't exist
if not exist ".env.local" (
    echo Creating .env.local...
    copy .env.example .env.local
    echo √ .env.local created
) else (
    echo √ .env.local already exists
)
echo.

REM Test build
echo Testing build...
call npm run build

if errorlevel 1 (
    echo X Build failed - please fix errors above
    exit /b 1
)

echo √ Build successful
echo.

echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo   1. Start dev server:
echo      npm run dev
echo.
echo   2. Open browser:
echo      http://localhost:3000?demo=true
echo.
echo   3. Deploy to Vercel:
echo      npx vercel --prod
echo.
echo   4. Or push to GitHub and connect Vercel
echo.
echo Documentation:
echo   • Full docs:    README.md
echo   • Deploy guide: DEPLOY.md
echo   • Summary:      SUMMARY.md
echo.
pause
