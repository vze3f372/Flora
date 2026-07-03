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
goto :failed

:done
if errorlevel 1 (
  goto :failed
)

echo.
echo Flora update finished.
echo.
pause
exit /b 0

:failed
echo.
echo Flora update failed.
echo.
pause
exit /b 1
