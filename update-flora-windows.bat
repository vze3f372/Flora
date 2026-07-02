@echo off
setlocal

cd /d "%~dp0"

where py >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  py -3 scripts\flora-update.py %*
  goto :done
)

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  python scripts\flora-update.py %*
  goto :done
)

echo Python was not found. Install Python 3 or add it to PATH.
exit /b 1

:done
if errorlevel 1 (
  echo.
  echo Flora update failed.
  exit /b %ERRORLEVEL%
)

echo.
echo Flora update finished.
endlocal
