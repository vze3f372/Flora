@echo off
setlocal
cd /d "%~dp0"

for /f "usebackq delims=" %%I in (`winepath -u "%~dp0"`) do set "FLORA_UNIX_DIR=%%I"

start /unix /usr/bin/python "%FLORA_UNIX_DIR%/scripts/flora-launcher.py" %*
