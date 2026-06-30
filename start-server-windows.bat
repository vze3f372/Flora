@echo off
setlocal

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\flora-start-windows.ps1"

exit /b %ERRORLEVEL%
