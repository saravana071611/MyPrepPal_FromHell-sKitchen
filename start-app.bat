@echo off
echo =========================================
echo   Starting MyPrepPal from Hell's Kitchen
echo =========================================

:: Kill any existing Node.js processes
echo Terminating any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Use a fixed port for simplicity
set SERVER_PORT=5000
set CLIENT_PORT=3000

:: Create the required directories if they don't exist
if not exist "server\data" mkdir server\data

:: Create port files directly
echo %SERVER_PORT% > current-port.txt
echo %SERVER_PORT% > server\data\port.txt

:: Preserve existing API keys in .env file
if exist "server\.env" (
  echo Preserving existing API keys, updating only the PORT...
  powershell -Command "$content = Get-Content 'server\.env' -Raw; if ($content -match 'PORT=') { $content = $content -replace 'PORT=.*', 'PORT=%SERVER_PORT%' } else { $content = 'PORT=%SERVER_PORT%' + [Environment]::NewLine + $content }; $content | Set-Content 'server\.env' -NoNewline"
) else (
  echo Creating new .env file...
  echo PORT=%SERVER_PORT% > server\.env
  echo OPENAI_API_KEY=sk-your-api-key-here >> server\.env
  echo NODE_ENV=development >> server\.env
  echo API_TIMEOUT=60000 >> server\.env
)

:: Start server in a separate window
echo Starting server on port %SERVER_PORT%...
start "MyPrepPal Server" cmd /k "cd server && set PORT=%SERVER_PORT% && node server.js"

:: Wait for server to initialize
echo Waiting for server to start (5 seconds)...
timeout /t 5 /nobreak >nul

:: Start client in a separate window
echo Starting client on port %CLIENT_PORT%...
start "MyPrepPal Client" cmd /k "cd client && set PORT=%CLIENT_PORT% && npm start"

echo.
echo Both server and client should now be running in separate windows.
echo The application is accessible at: http://localhost:3000
echo.
echo To stop the application, close the server and client windows,
echo or run 'stop-app.bat' to terminate all Node.js processes. 