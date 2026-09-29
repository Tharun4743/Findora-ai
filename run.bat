@echo off
setlocal enabledelayedexpansion
title FINDORA AI Launcher

echo ====================================================================
echo                   FINDORA AI - SYSTEM LAUNCHER
echo      Autonomous Lost ^& Found Intelligence, Verification ^& Recovery
echo ====================================================================
echo.

REM 1. Check for Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not found in your system PATH.
    echo Please install Node.js (v18 or higher) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 2. Ensure uploads directory exists
if not exist "%~dp0uploads" (
    echo [*] Creating uploads directory...
    mkdir "%~dp0uploads"
)

REM 3. Check Backend Dependencies
if not exist "%~dp0backend\node_modules" (
    echo [*] Installing backend dependencies...
    cd /d "%~dp0backend"
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

REM 4. Check Frontend Dependencies
if not exist "%~dp0frontend\node_modules" (
    echo [*] Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

echo.
echo [*] Starting Backend Service on http://localhost:5000...
start "FINDORA AI - Backend (Port 5000)" cmd /k "cd /d "%~dp0backend" && node server.js"

echo [*] Waiting for Backend to initialize...
timeout /t 3 /nobreak >nul

echo [*] Starting Frontend UI on http://localhost:3000...
start "FINDORA AI - Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [*] Waiting for Frontend dev server...
timeout /t 4 /nobreak >nul

echo [*] Launching application in your browser...
start http://localhost:3000

echo.
echo ====================================================================
echo                    FINDORA AI IS NOW RUNNING!
echo ====================================================================
echo  - Frontend Web UI : http://localhost:3000
echo  - Backend API     : http://localhost:5000
echo  - Health Endpoint : http://localhost:5000/api/health
echo ====================================================================
echo.
echo TIP: Close the individual Backend and Frontend command windows
echo      or run stop.bat to stop the servers.
echo.
pause
