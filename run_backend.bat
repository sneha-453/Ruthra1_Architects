@echo off
title Ruthra Architects Backend Setup and Launcher
color 0A

echo ============================================================
echo      RUTHRA ARCHITECTS - SECURE DJANGO BACKEND LAUNCHER
echo ============================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% equ 0 goto python_ok
color 0C
echo ✗ ERROR: Python is not installed or not added to your system PATH!
echo.
echo Please install Python 3.8 or higher from https://www.python.org/
echo Make sure to check the box "Add Python to PATH" during installation.
echo.
pause
exit /b

:python_ok

:: Step 1: Create Virtual Environment if not exists
if exist ".venv" goto venv_exists
echo [1/5] Creating Python Virtual Environment...
python -m venv .venv
if %errorlevel% equ 0 goto venv_exists
color 0C
echo ✗ Failed to create virtual environment!
pause
exit /b

:venv_exists
echo [1/5] Python Virtual Environment found.

:: Step 2: Activate Virtual Environment
echo [2/5] Activating Virtual Environment...
call .venv\Scripts\activate
if %errorlevel% equ 0 goto venv_activated
color 0C
echo ✗ Failed to activate virtual environment!
pause
exit /b

:venv_activated

:: Step 3: Install Dependencies
echo [3/5] Installing dependencies - Django, openpyxl, pillow...
python -m pip install --upgrade pip >nul 2>&1
pip install -r requirements.txt
if %errorlevel% equ 0 goto pip_ok
color 0C
echo ✗ Failed to install dependencies! Please check your internet connection.
pause
exit /b

:pip_ok

:: Step 4: Database Migrations
echo [4/5] Generating and executing SQL database migrations...
python manage.py makemigrations portfolio
python manage.py migrate

:: Step 5: Create default superuser
echo [5/5] Creating secure default admin user...
python create_default_admin.py

echo.
echo ============================================================
echo      SUCCESS! SERVER RUNNING ON: http://127.0.0.1:8000/
echo ============================================================
echo   * Website:      http://127.0.0.1:8000/
echo   * Django Admin: http://127.0.0.1:8000/admin/
echo.
echo   * Login:
echo     - Username:   admin
echo     - Password:   adminpassword
echo.
echo   [Press Ctrl+C to stop the server at any time]
echo ============================================================
echo.

python manage.py runserver

pause
