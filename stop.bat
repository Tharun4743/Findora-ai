@echo off
title Stop FINDORA AI Servers
echo ====================================================================
echo                   STOPPING FINDORA AI SERVERS
echo ====================================================================
echo.

echo [*] Terminating process on port 5000 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo     Stopped Backend process PID: %%a
)

echo [*] Terminating process on port 3000 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo     Stopped Frontend process PID: %%a
)

echo.
echo [✓] FINDORA AI services have been stopped.
echo.
pause
