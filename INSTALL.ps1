# AI DevStudio - True One-Click Setup
# รันครั้งเดียว ทำทุกอย่างให้เลย (ยกเว้น Docker ต้องลงเอง)

param(
    [switch]$SkipDockerCheck,
    [switch]$UseDemoMode
)

$ErrorActionPreference = "Stop"

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Color($Text, $Color) {
    Write-Host $Text -ForegroundColor $Color
}

function Show-Header {
    Clear-Host
    Write-Color "═══════════════════════════════════════════════════════════" $Cyan
    Write-Color "  🤖 AI DevStudio - TRUE ONE-CLICK SETUP" $Cyan
    Write-Color "═══════════════════════════════════════════════════════════" $Cyan
    Write-Host ""
}

function Show-Step($Number, $Text) {
    Write-Color "[$Number/8] $Text" $Yellow
}

function Show-Success($Text) {
    Write-Color "  ✅ $Text" $Green
}

function Show-Error($Text) {
    Write-Color "  ❌ $Text" $Red
}

function Show-Info($Text) {
    Write-Color "  ℹ️  $Text" $Cyan
}

# ============================================
# MAIN
# ============================================

Show-Header

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

# Step 1: Check Docker (Cannot auto-install due to license)
Show-Step 1 "Checking Docker Desktop"

try {
    $dockerInfo = docker info 2>$null
    Show-Success "Docker is running"
} catch {
    Show-Error "Docker Desktop not found or not running"
    Write-Host ""
    Write-Color "╔═══════════════════════════════════════════════════════════╗" $Red
    Write-Color "║  ⚠️  DOCKER REQUIRED                                     ║" $Red
    Write-Color "╠═══════════════════════════════════════════════════════════╣" $Red
    Write-Color "║  Please install Docker Desktop:                          ║" $Red
    Write-Color "║  https://docker.com/products/docker-desktop             ║" $Red
    Write-Color "║                                                          ║" $Red
    Write-Color "║  1. Download and install                                 ║" $Red
    Write-Color "║  2. Wait for Docker to start (whale icon in taskbar)     ║" $Red
    Write-Color "║  3. Run this script again                                ║" $Red
    Write-Color "╚═══════════════════════════════════════════════════════════╝" $Red
    Write-Host ""
    
    $openUrl = Read-Host "Open download page now? (y/n)"
    if ($openUrl -eq 'y') {
        Start-Process "https://docker.com/products/docker-desktop"
    }
    exit 1
}

# Step 2: Check Node.js (Auto-install if missing)
Show-Step 2 "Checking Node.js"

try {
    $nodeVersion = node --version 2>$null
    Show-Success "Node.js found: $nodeVersion"
} catch {
    Show-Info "Node.js not found. Installing..."
    
    # Download and install Node.js silently
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installer = "$env:TEMP\node-installer.msi"
    
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installer
    Show-Info "Installing Node.js (this may take 1-2 minutes)..."
    
    Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /qn" -Wait
    Remove-Item $installer
    
    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Show-Success "Node.js installed"
}

# Step 3: Auto-configure environment
Show-Step 3 "Configuring Environment"

$EnvFile = Join-Path $ProjectDir ".env"
$EnvExample = Join-Path $ProjectDir ".env.example"

if (!(Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
    Show-Success "Created .env file"
}

# Auto-generate secure values
$JWTSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$VncPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object { [char]$_ })
$DbPassword = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ })

# Update .env with auto-generated values
$envContent = Get-Content $EnvFile -Raw
$envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$JWTSecret"
$envContent = $envContent -replace "VNC_PASSWORD=.*", "VNC_PASSWORD=$VncPassword"
$envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$DbPassword"

# If Demo Mode, clear API keys
if ($UseDemoMode) {
    $envContent = $envContent -replace "ANTHROPIC_API_KEY=.*", "ANTHROPIC_API_KEY="
    $envContent = $envContent -replace "OPENAI_API_KEY=.*", "OPENAI_API_KEY="
    $envContent = $envContent -replace "FIGMA_API_KEY=.*", "FIGMA_API_KEY="
    Show-Info "Demo Mode: API keys cleared (will use template responses)"
}

Set-Content $EnvFile $envContent
Show-Success "Environment configured"

# Step 4: Install dependencies
Show-Step 4 "Installing Dependencies"

Set-Location "$ProjectDir\web"

if (!(Test-Path "node_modules")) {
    Show-Info "Installing npm packages (this may take 2-3 minutes)..."
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Dependencies installed"
    } else {
        Show-Error "npm install failed"
        exit 1
    }
} else {
    Show-Success "Dependencies already installed"
}

# Step 5: Build Web UI
Show-Step 5 "Building Web UI"

Show-Info "Building production bundle..."
npm run build 2>&1 | Out-Null

if (!(Test-Path "$ProjectDir\web\dist\index.html")) {
    Show-Error "Build failed"
    exit 1
}

Show-Success "Web UI built"

# Step 6: Start all services
Show-Step 6 "Starting AI DevStudio"

Set-Location "$ProjectDir\docker"

Show-Info "Stopping any existing containers..."
docker compose down 2>$null | Out-Null

Show-Info "Starting services (this may take 3-5 minutes on first run)..."
docker compose up --build -d 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Show-Error "Failed to start services"
    exit 1
}

Show-Success "All services started"

# Step 7: Wait and verify
Show-Step 7 "Verifying Installation"

Show-Info "Waiting for services to be ready..."
$maxAttempts = 60
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and !$ready) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        Start-Sleep -Seconds 1
        $attempt++
        if ($attempt % 10 -eq 0) {
            Show-Info "Still waiting... ($attempt/$maxAttempts)"
        }
    }
}

if (!$ready) {
    Show-Warning "Services may still be starting"
}

# Step 8: Show completion
Show-Step 8 "Setup Complete!"

Write-Host ""
Write-Color "╔═══════════════════════════════════════════════════════════╗" $Green
Write-Color "║  🎉 AI DEVSTUDIO IS READY!                               ║" $Green
Write-Color "╠═══════════════════════════════════════════════════════════╣" $Green

if ($UseDemoMode) {
    Write-Color "║  Mode: DEMO (No API Key Required)                        ║" $Yellow
} else {
    Write-Color "║  Mode: FULL AI (Using your API keys)                     ║" $Green
}

Write-Color "╠═══════════════════════════════════════════════════════════╣" $Green
Write-Color "║                                                           ║" $Green
Write-Color "║  🌐 Open: http://localhost                                ║" $Green
Write-Color "║                                                           ║" $Green
Write-Color "║  🔧 N8N:  http://localhost:5678                           ║" $Green
Write-Color "║      User: admin | Pass: admin123                         ║" $Green
Write-Color "║                                                           ║" $Green
Write-Color "║  📁 Project folder: $ProjectDir" $Green
Write-Color "║                                                           ║" $Green
Write-Color "╚═══════════════════════════════════════════════════════════╝" $Green

Write-Host ""

if ($UseDemoMode) {
    Write-Color "💡 Tip: To use real AI, add your API key to .env file" $Cyan
    Write-Host ""
}

$openNow = Read-Host "Open browser now? (y/n)"
if ($openNow -eq 'y') {
    Start-Process "http://localhost"
}

Write-Host ""
Write-Color "To stop: Run .\stop.bat" $Cyan
Write-Host ""

Pause
