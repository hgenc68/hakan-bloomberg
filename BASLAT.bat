@echo off
chcp 65001 > nul
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0..\terminal_service.ps1" -OpenBrowser -TargetPort 5173
exit /b 0
