@echo off
title Django Data Export
color 0B

echo ==========================================
echo        EXPORTING DJANGO DATA
echo ==========================================
echo.

:: Check venv
if not exist ".venv" (
    echo ERROR: .venv not found
    pause
    exit /b
)

call .venv\Scripts\activate

echo Running Django check...
python manage.py check

if %errorlevel% neq 0 (
    echo ERROR in Django project
    pause
    exit /b
)

echo Exporting data.json...

python manage.py dumpdata --indent 2 > data.json

if %errorlevel% neq 0 (
    echo FAILED to create data.json
    pause
    exit /b
)

echo.
echo SUCCESS: data.json created!
echo.

pause