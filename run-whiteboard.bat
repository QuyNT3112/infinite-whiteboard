@echo off
title Microsoft Whiteboard
cd /d "%~dp0"

echo ===================================================
echo   Starting Microsoft Whiteboard...
echo ===================================================

:: Ensure node in PATH if in common locations
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=C:\Program Files\nodejs;%PATH%"
)
if exist "D:\NODEJS\node.exe" (
    set "PATH=D:\NODEJS;%PATH%"
)

:: If dist does not exist, build it
if not exist "dist\index.html" (
    echo Building production bundle...
    call npm.cmd run build
)

:: Open browser after 1 second in background
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:5173"

:: Start the lightweight production server
echo Whiteboard is running at http://localhost:5173/
echo Close this window to stop the server.
node server.cjs
