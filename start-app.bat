@echo off
echo =========================================
echo   Starting MyPrepPal from Hell's Kitchen
echo =========================================

:: Kill any existing Node.js processes
echo:
echo Clearing ports by terminating Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  echo All Node.js processes terminated.
) else (
  echo No Node.js processes found running.
)

:: Give a moment for ports to be released
echo:
echo Waiting for ports to be released...
timeout /t 2 /nobreak >nul

:: Find a free port
echo:
echo Finding an available port...
node server/utils/port-checker.js
if %ERRORLEVEL% NEQ 0 (
  echo Failed to find an available port.
  goto :error
)

:: Start the server in a new window
echo:
echo Starting server...
start "MyPrepPal Server" cmd /c "cd server && node server.js"

:: Wait for the server to initialize
echo:
echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

:: Start the client in a new window
echo:
echo Starting client...
start "MyPrepPal Client" cmd /c "cd client && npm start"

echo:
echo Application startup complete!
echo Both server and client are running in separate windows.
echo Close those windows when you're done using the application.
goto :end

:error
echo Failed to start the application. Please check the error messages above.
pause

:end 