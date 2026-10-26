@echo off
chcp 65001 > nul
title HAKAN GENC FINANS - BLOOMBERG TERMINAL
cls
cd /d "%~dp0"

echo =========================================================================
echo       BLOOMBERG TERMINAL - GLOBAL MARKETS & QUANT INTELLIGENCE
echo =========================================================================
echo.

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Bloomberg Terminal zaten calisiyor. Tarayici aciliyor...
    start "" "http://localhost:5173"
    exit /b 0
)

echo [BILGI] Terminal sunucusu baslatiliyor (http://localhost:5173)...
timeout /t 1 /nobreak >nul
start "" "http://localhost:5173"
call npm run dev -- --host --port 5173
pause
