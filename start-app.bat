@echo off
echo =========================================
echo   Starting MyPrepPal from Hell's Kitchen
echo =========================================

:: Kill any existing Node.js processes
echo Terminating any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Use a fixed port for simplicity
set PORT=5000

:: Create the required directories if they don't exist
if not exist "server\data" mkdir server\data

:: Create port files directly
echo %PORT% > current-port.txt
echo %PORT% > server\data\port.txt

:: Start server in a separate window
echo Starting server on port %PORT%...
start "MyPrepPal Server" cmd /k "cd server && set PORT=%PORT% && node server.js"

:: Wait for server to initialize
echo Waiting for server to start (5 seconds)...
timeout /t 5 /nobreak >nul

:: Start client in a separate window
echo Starting client...
start "MyPrepPal Client" cmd /k "cd client && set PORT=%PORT% && npm start"

echo.
echo Both server and client should now be running in separate windows.
echo The application is accessible at: http://localhost:3000
echo.
echo To stop the application, close the server and client windows,
echo or run 'stop-app.bat' to terminate all Node.js processes. 