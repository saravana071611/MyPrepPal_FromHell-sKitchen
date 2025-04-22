@echo off
echo =========================================
echo   Direct startup for MyPrepPal application
echo =========================================

:: Kill any existing processes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Use a fixed port instead of dynamic detection
set PORT=5000

:: Create port files directly
echo %PORT% > current-port.txt
echo %PORT% > server\data\port.txt

:: Start server in a new window
start "MyPrepPal Server" cmd /c "cd server && set PORT=%PORT% && node server.js"

:: Wait for server to initialize
echo Waiting for server to start (5 seconds)...
timeout /t 5 /nobreak >nul

:: Start client in a new window 
start "MyPrepPal Client" cmd /c "cd client && set PORT=%PORT% && npm start"

echo.
echo Both server and client should now be starting in separate windows.
echo Close those windows when you're done using the application.
echo Or run stop-app.bat to terminate all processes. 