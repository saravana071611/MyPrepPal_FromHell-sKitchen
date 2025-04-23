@echo off
echo =============================================
echo   Updating Port Configuration for MyPrepPal
echo =============================================

:: Kill any existing Node.js processes
echo Terminating any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Run PowerShell script to update environment files
powershell -ExecutionPolicy Bypass -File update-env.ps1

echo.
echo Port configuration updated. You can now run:
echo   - start-app.bat
echo   - enhanced-start.bat
echo   - powershell -ExecutionPolicy Bypass -File start-powershell.ps1
echo.
echo to start the application with client on port 3000 and server on port 5000.
echo. 