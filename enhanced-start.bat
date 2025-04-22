@echo off
echo =========================================
echo   Enhanced Startup for MyPrepPal
echo =========================================

:: Kill any existing Node.js processes
echo Terminating any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Use a fixed port for simplicity
set PORT=5000

:: Create the required directories if they don't exist
if not exist "server\data" mkdir server\data
if not exist "server\data\audio" mkdir server\data\audio
if not exist "server\data\profiles" mkdir server\data\profiles
if not exist "server\data\temp" mkdir server\data\temp

:: Create port files directly
echo %PORT% > current-port.txt
echo %PORT% > server\data\port.txt

:: Create/update .env file with essential variables
echo Checking .env file...
if not exist "server\.env" (
  echo Creating new .env file...
  echo PORT=%PORT% > server\.env
  echo OPENAI_API_KEY= >> server\.env
  echo NODE_ENV=development >> server\.env
  echo API_TIMEOUT=60000 >> server\.env
)

:: Set increased timeouts for the server in package.json
echo Updating server timeout settings...
cd server
node -e "const fs=require('fs');const path=require('path');const pjPath=path.join(__dirname,'package.json');const pj=require(pjPath);if(!pj.config)pj.config={};pj.config.timeout=90000;fs.writeFileSync(pjPath,JSON.stringify(pj,null,2));"
cd ..

:: Add proxy error handling to client package.json
echo Updating client proxy settings...
cd client
node -e "const fs=require('fs');const path=require('path');const pjPath=path.join(__dirname,'package.json');const pj=require(pjPath);pj.proxy='http://localhost:5000';if(!pj.proxyConfig)pj.proxyConfig={changeOrigin:true,timeout:120000};fs.writeFileSync(pjPath,JSON.stringify(pj,null,2));"
cd ..

:: Start server in a separate window with increased timeout
echo Starting server on port %PORT% with enhanced error handling...
start "MyPrepPal Server" cmd /k "cd server && set PORT=%PORT% && set NODE_OPTIONS=--max-http-header-size=16384 && node --trace-warnings server.js"

:: Wait for server to initialize
echo Waiting for server to start (8 seconds)...
timeout /t 8 /nobreak >nul

:: Start client in a separate window
echo Starting client with increased timeout settings...
start "MyPrepPal Client" cmd /k "cd client && set PORT=%PORT% && set REACT_APP_SERVER_PORT=%PORT% && set REACT_APP_API_TIMEOUT=60000 && npm start"

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