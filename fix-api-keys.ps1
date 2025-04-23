# This script fixes the API key issue by prompting for your keys if needed
# while setting up the correct port configuration

# Set the correct port values
$env:SERVER_PORT = 3000
$env:CLIENT_PORT = 5000

Write-Host "MyPrepPal API Key Setup Script" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Create port files
"$env:SERVER_PORT" | Out-File -FilePath "current-port.txt" -Encoding ascii -Force
"$env:SERVER_PORT" | Out-File -FilePath "server\data\port.txt" -Encoding ascii -Force

# Check if .env file exists
if (Test-Path "server\.env") {
    Write-Host "Existing .env file found. Checking for API keys..." -ForegroundColor Yellow
    $envContent = Get-Content "server\.env" -Raw
    
    # Update PORT value
    if ($envContent -match "PORT=") {
        $envContent = $envContent -replace "PORT=.*", "PORT=$env:SERVER_PORT"
    } else {
        $envContent = "PORT=$env:SERVER_PORT`n$envContent"
    }
    
    # Check if OpenAI API key is missing or placeholder
    $hasOpenAIKey = $envContent -match "OPENAI_API_KEY=sk-[a-zA-Z0-9]+"
    $hasPlaceholder = $envContent -match "OPENAI_API_KEY=sk-your-api-key-here"
    
    if (-not $hasOpenAIKey -or $hasPlaceholder) {
        Write-Host "  OPENAI_API_KEY is missing or is a placeholder." -ForegroundColor Red
        $openAIKey = Read-Host "Enter your OpenAI API key (starts with 'sk-')"
        
        if ($openAIKey.StartsWith("sk-")) {
            if ($envContent -match "OPENAI_API_KEY=") {
                $envContent = $envContent -replace "OPENAI_API_KEY=.*", "OPENAI_API_KEY=$openAIKey"
            } else {
                $envContent += "`nOPENAI_API_KEY=$openAIKey"
            }
            Write-Host "  → OpenAI API key has been updated." -ForegroundColor Green
        } else {
            Write-Host "  → Invalid API key format. Using placeholder, update manually later." -ForegroundColor Yellow
            if ($envContent -match "OPENAI_API_KEY=") {
                $envContent = $envContent -replace "OPENAI_API_KEY=.*", "OPENAI_API_KEY=sk-your-api-key-here"
            } else {
                $envContent += "`nOPENAI_API_KEY=sk-your-api-key-here"
            }
        }
    } else {
        Write-Host "  → OpenAI API key found and preserved." -ForegroundColor Green
    }
    
    # Make sure other required variables exist
    if (-not ($envContent -match "NODE_ENV=")) {
        $envContent += "`nNODE_ENV=development"
    }
    
    if (-not ($envContent -match "API_TIMEOUT=")) {
        $envContent += "`nAPI_TIMEOUT=60000"
    }
    
    # Write updated content back to .env file
    $envContent | Out-File -FilePath "server\.env" -Encoding ascii -Force
    Write-Host "Updated .env file with correct port while preserving API keys" -ForegroundColor Green
    
} else {
    Write-Host "No .env file found. Creating new one..." -ForegroundColor Yellow
    
    # Get API key from user
    $openAIKey = Read-Host "Enter your OpenAI API key (starts with 'sk-')"
    
    if (-not $openAIKey.StartsWith("sk-")) {
        Write-Host "Invalid API key format. Using placeholder, update manually later." -ForegroundColor Yellow
        $openAIKey = "sk-your-api-key-here"
    }
    
    @"
PORT=$env:SERVER_PORT
OPENAI_API_KEY=$openAIKey
NODE_ENV=development
API_TIMEOUT=60000
"@ | Out-File -FilePath "server\.env" -Encoding ascii -Force
    
    Write-Host "Created new .env file with your API configuration" -ForegroundColor Green
}

Write-Host "`nAPI key setup complete!" -ForegroundColor Cyan
Write-Host "Server will run on port: $env:SERVER_PORT" -ForegroundColor Cyan
Write-Host "Client will run on port: $env:CLIENT_PORT" -ForegroundColor Cyan
Write-Host "`nNow run either 'start-app.bat' or 'enhanced-start.bat' to start the application." -ForegroundColor Yellow 