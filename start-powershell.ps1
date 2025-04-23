# Kill any existing processes on ports 3000 and 5000
Write-Host "Killing any processes on ports 3000 and 5000..." -ForegroundColor Yellow
npx kill-port 3000 5000

# Set environment variables
$env:SERVER_PORT = 5000
$env:CLIENT_PORT = 3000

# Update port files
$serverPort = $env:SERVER_PORT
"$serverPort" | Out-File -FilePath "current-port.txt" -Encoding ascii
"$serverPort" | Out-File -FilePath "server\data\port.txt" -Encoding ascii -Force
  
# Create directories if they don't exist
if (-not (Test-Path "server\data")) {
    New-Item -Path "server\data" -ItemType Directory -Force | Out-Null
}

# Preserve existing API keys while updating the PORT in .env file
Write-Host "Updating server port while preserving API keys..." -ForegroundColor Yellow
if (Test-Path "server\.env") {
    # Read existing .env file content
    $envContent = Get-Content "server\.env" -Raw
    
    # Update only the PORT value if it exists
    if ($envContent -match "PORT=") {
        $envContent = $envContent -replace "PORT=.*", "PORT=$env:SERVER_PORT"
    } else {
        # Add PORT if it doesn't exist
        $envContent = "PORT=$env:SERVER_PORT`n$envContent"
    }
    
    # Write updated content back to .env file
    $envContent | Out-File -FilePath "server\.env" -Encoding ascii -Force
    Write-Host "  → Updated PORT in .env file while preserving API keys" -ForegroundColor Cyan
} else {
    # Create new .env file if it doesn't exist
    Write-Host "  → Creating new .env file with placeholder values (update with your API keys)" -ForegroundColor Yellow
    @"
PORT=$env:SERVER_PORT
OPENAI_API_KEY=sk-your-api-key-here
NODE_ENV=development
API_TIMEOUT=60000
"@ | Out-File -FilePath "server\.env" -Encoding ascii -Force
}

# Start the server in a new window
Write-Host "Starting server on port $env:SERVER_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; `$env:PORT=$env:SERVER_PORT; node server.js"

# Wait for server to initialize
Write-Host "Waiting for server to start (5 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start the client in a new window
Write-Host "Starting client on port $env:CLIENT_PORT..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; `$env:PORT=$env:CLIENT_PORT; npm start"

Write-Host "`nBoth server and client should now be running in separate windows." -ForegroundColor Cyan
Write-Host "Server: http://localhost:$env:SERVER_PORT" -ForegroundColor Cyan
Write-Host "Client: http://localhost:$env:CLIENT_PORT" -ForegroundColor Cyan
Write-Host "`nIMPORTANT: You need to replace the OpenAI API key in server/.env with a valid key." -ForegroundColor Red 