@echo off
REM Setup script for Python 3.11 virtual environment

echo ========================================
echo ATC Environment Setup (Python 3.11)
echo ========================================
echo.

REM Check if Python 3.11 is available
py -3.11 --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python 3.11 not found!
    echo.
    echo Please install Python 3.11 from:
    echo https://www.python.org/downloads/release/python-3119/
    echo.
    pause
    exit /b 1
)

echo [OK] Python 3.11 found
py -3.11 --version
echo.

REM Create virtual environment
echo Creating virtual environment with Python 3.11...
py -3.11 -m venv venv311
if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment
    pause
    exit /b 1
)
echo [OK] Virtual environment created
echo.

REM Activate virtual environment
echo Activating virtual environment...
call venv311\Scripts\activate.bat
echo [OK] Virtual environment activated
echo.

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip
echo.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    echo See error messages above
    pause
    exit /b 1
)
echo.

REM Verify installation
echo Verifying installation...
python setup_check.py
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To activate this environment in the future, run:
echo   venv311\Scripts\activate
echo.
echo Then you can:
echo   python tests/test_env_smoke.py
echo   python train/train_rllib.py --cpus 4
echo.
pause
