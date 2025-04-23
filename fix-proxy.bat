@echo off
echo =============================================
echo   Fixing Proxy Configuration for MyPrepPal
echo =============================================

:: Kill any existing Node.js processes
echo Terminating any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo Updating package.json proxy to point to server on port 5000...
powershell -Command "(Get-Content 'client/package.json') -replace '\"proxy\":\s*\"http://localhost:[0-9]+\"', '\"proxy\": \"http://localhost:5000\"' | Set-Content 'client/package.json'"

echo Updating server port to 5000...
powershell -ExecutionPolicy Bypass -File update-env.ps1

echo.
echo Proxy configuration fixed. Now run one of these to start the application:
echo   - start-app.bat
echo   - enhanced-start.bat
echo   - powershell -ExecutionPolicy Bypass -File start-powershell.ps1
echo.
echo The client will run on port 3000 and proxy to the server on port 5000.
echo. 