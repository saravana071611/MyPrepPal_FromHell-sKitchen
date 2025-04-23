@echo off
echo =========================================
echo   Enhanced Startup for MyPrepPal
echo =========================================

:: Kill any existing Node.js processes
echo Terminating any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Use fixed ports for server and client
set SERVER_PORT=5000
set CLIENT_PORT=3000

:: Create the required directories if they don't exist
if not exist "server\data" mkdir server\data
if not exist "server\data\audio" mkdir server\data\audio
if not exist "server\data\profiles" mkdir server\data\profiles
if not exist "server\data\temp" mkdir server\data\temp

:: Create port files directly
echo %SERVER_PORT% > current-port.txt
echo %SERVER_PORT% > server\data\port.txt

:: Create/update .env file with essential variables
echo Checking .env file...
if exist "server\.env" (
  echo Preserving existing API keys, updating only the PORT...
  powershell -Command "$content = Get-Content 'server\.env' -Raw; if ($content -match 'PORT=') { $content = $content -replace 'PORT=.*', 'PORT=%SERVER_PORT%' } else { $content = 'PORT=%SERVER_PORT%' + [Environment]::NewLine + $content }; $content | Set-Content 'server\.env' -NoNewline"
) else (
  echo Creating new .env file...
  echo PORT=%SERVER_PORT% > server\.env
  echo OPENAI_API_KEY=sk-your-api-key-here >> server\.env
  echo NODE_ENV=development >> server\.env
  echo API_TIMEOUT=60000 >> server\.env
  echo IMPORTANT: Replace the OpenAI API key placeholder in server\.env with a valid key
)

:: Skip package.json modifications for now
echo Skipping package.json modifications...

:: Start server in a separate window with increased timeout
echo Starting server on port %SERVER_PORT% with enhanced error handling...
start "MyPrepPal Server" cmd /k "cd server && set PORT=%SERVER_PORT% && set NODE_OPTIONS=--max-http-header-size=16384 && node --trace-warnings server.js"

:: Wait for server to initialize
echo Waiting for server to start (8 seconds)...
timeout /t 8 /nobreak >nul

:: Start client in a separate window
echo Starting client on port %CLIENT_PORT% with increased timeout settings...
start "MyPrepPal Client" cmd /k "cd client && set PORT=%CLIENT_PORT% && set REACT_APP_SERVER_PORT=%SERVER_PORT% && set REACT_APP_API_TIMEOUT=60000 && npm start"

echo.
echo Enhanced startup complete!
echo.
echo Both server and client should now be running in separate windows.
echo The application is accessible at: http://localhost:3000
echo.
echo If you experience ECONNRESET errors:
echo 1. Check the server window for any error messages
echo 2. Try running test-connection.js to diagnose connection issues
echo 3. You may need to restart the application with 'stop-app.bat' and then this script again
echo.
echo To stop the application, close the server and client windows,
echo or run 'stop-app.bat' to terminate all Node.js processes.
echo. 