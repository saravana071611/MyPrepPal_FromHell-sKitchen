# Update .env file with swapped port configuration
Write-Host "Updating .env file with server port 5000..." -ForegroundColor Yellow

if (Test-Path "server\.env") {
    # Read existing .env file content
    $envContent = Get-Content "server\.env" -Raw
    
    # Update PORT value
    if ($envContent -match "PORT=") {
        $envContent = $envContent -replace "PORT=.*", "PORT=5000"
    } else {
        $envContent = "PORT=5000`n$envContent"
    }
    
    # Write updated content back to .env file
    $envContent | Out-File -FilePath "server\.env" -Encoding ascii -Force
    Write-Host "  ✓ Updated PORT to 5000 in .env file while preserving API keys" -ForegroundColor Green
} else {
    Write-Host "  ! .env file not found, creating new one" -ForegroundColor Yellow
    @"
PORT=5000
OPENAI_API_KEY=sk-your-api-key-here
NODE_ENV=development
API_TIMEOUT=60000
"@ | Out-File -FilePath "server\.env" -Encoding ascii -Force
}

# Update current-port.txt as well
"5000" | Out-File -FilePath "current-port.txt" -Encoding ascii -Force
"5000" | Out-File -FilePath "server\data\port.txt" -Encoding ascii -Force -ErrorAction SilentlyContinue

Write-Host "`nPort configuration updated to:" -ForegroundColor Cyan
Write-Host "  • Server: http://localhost:5000" -ForegroundColor Cyan
Write-Host "  • Client: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nRun either start-app.bat or enhanced-start.bat to start the application with the new configuration." -ForegroundColor Yellow 