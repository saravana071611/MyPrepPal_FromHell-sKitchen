@echo off
echo =========================================
echo   Stopping MyPrepPal from Hell's Kitchen
echo =========================================

echo:
echo Terminating all Node.js processes...

taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  echo All Node.js processes terminated successfully.
) else (
  echo No Node.js processes were found running.
)

echo:
echo Application has been shut down.
timeout /t 2 /nobreak >nul 