@echo off
setlocal
cd /d "%~dp0"

python scripts\flora-launcher.py %*
if %errorlevel% equ 0 exit /b 0

py -3 scripts\flora-launcher.py %*
exit /b %errorlevel%
