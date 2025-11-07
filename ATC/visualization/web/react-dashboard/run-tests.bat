@echo off
REM Run integration tests for the React dashboard

echo ========================================
echo AI Controller Dashboard - Integration Tests
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Error: node_modules not found!
    echo Please run 'npm install' first.
    echo.
    pause
    exit /b 1
)

REM Parse command line arguments
set TEST_MODE=all
set COVERAGE=no

:parse_args
if "%~1"=="" goto run_tests
if /i "%~1"=="--watch" set TEST_MODE=watch
if /i "%~1"=="--coverage" set COVERAGE=yes
if /i "%~1"=="--help" goto show_help
shift
goto parse_args

:show_help
echo Usage: run-tests.bat [options]
echo.
echo Options:
echo   --watch      Run tests in watch mode
echo   --coverage   Generate coverage report
echo   --help       Show this help message
echo.
echo Examples:
echo   run-tests.bat                Run all tests once
echo   run-tests.bat --watch        Run tests in watch mode
echo   run-tests.bat --coverage     Run tests with coverage
echo.
exit /b 0

:run_tests
echo Running tests...
echo.

if "%TEST_MODE%"=="watch" (
    echo Running in WATCH mode...
    echo Press Ctrl+C to stop
    echo.
    call npm test -- --watch
) else if "%COVERAGE%"=="yes" (
    echo Running with COVERAGE...
    echo.
    call npm test -- --coverage --watchAll=false
    echo.
    echo Coverage report generated in coverage/
    echo Open coverage/lcov-report/index.html to view detailed report
) else (
    echo Running all tests...
    echo.
    call npm test -- --watchAll=false
)

echo.
echo ========================================
echo Tests completed!
echo ========================================
pause
