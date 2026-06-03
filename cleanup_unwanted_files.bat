@echo off
title Ruthra Design Studio Workspace Cleanup
color 0E

echo ============================================================
echo      RUTHRA DESIGN STUDIO - WORKSPACE CLEANUP UTILITY
echo ============================================================
echo.

:: Safeguard: Ensure we are in the correct directory containing manage.py
if not exist "manage.py" (
    color 0C
    echo [ERROR] This script must be run from the Django project root folder
    echo         containing "manage.py" and the folders to be deleted.
    echo         Current directory: %CD%
    echo.
    pause
    exit /b
)

echo The following unwanted/leftover boilerplate files and folders will be deleted:
echo.
if exist "ruthra_backend" echo   [Folder] ruthra_backend
if exist "mainapp"        echo   [Folder] mainapp
if exist "migrate_assets.py" echo   [File]   migrate_assets.py
echo.
set /p confirm="Are you sure you want to proceed with the cleanup? (Y/N): "
if /i "%confirm%" neq "y" (
    echo.
    echo Cleanup cancelled. No files were deleted.
    echo.
    pause
    exit /b
)

echo.
echo Performing cleanup...
echo.

if exist "ruthra_backend" (
    rmdir /s /q "ruthra_backend"
    echo   ✓ Deleted ruthra_backend folder
)

if exist "mainapp" (
    rmdir /s /q "mainapp"
    echo   ✓ Deleted mainapp folder
)

if exist "migrate_assets.py" (
    del /f /q "migrate_assets.py"
    echo   ✓ Deleted migrate_assets.py
)

echo.
echo ============================================================
echo      CLEANUP COMPLETED SUCCESSFULLY!
echo ============================================================
echo.

set /p self_del="Would you like this cleanup script to delete itself now? (Y/N): "
if /i "%self_del%"=="y" (
    echo Deleting cleanup script...
    (goto) 2>nul & del "%~f0"
) else (
    echo Cleanup script preserved.
    pause
)
