@echo off
REM Launch the integrated visualization system demo

echo.
echo ================================================================================
echo   AI Controller - Integrated Visualization System Demo
echo ================================================================================
echo.
echo This demo shows all visualization and reasoning components working together.
echo.

REM Set Python path to include current directory
set PYTHONPATH=%CD%

REM Run the demo
python visualization\examples\complete_integration_demo.py

pause
