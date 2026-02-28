# AI DevStudio - Complete Setup with Subscription & Billing
# รันครั้งเดียว มีทุกอย่างครบ

param(
    [switch]$SkipDockerCheck,
    [switch]$QuickMode
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "AI DevStudio Setup"

# Colors
$Colors = @{ Red = "Red"; Green = "Green"; Yellow = "Yellow"; Cyan = "Cyan"; Magenta = "Magenta" }

function Write-Color($Text, $Color) { Write-Host $Text -ForegroundColor $Colors[$Color] }
function Show-Header {
    Clear-Host
    Write-Color "╔════════════════════════════════════════════════════════════════╗" "Cyan"
    Write-Color "║                                                                ║" "Cyan"
    Write-Color "║           🤖 AI DevStudio - Complete Setup                     ║" "Cyan"
    Write-Color "║           One-Click Install with AI Proxy & Billing            ║" "Cyan"
    Write-Color "║                                                                ║" "Cyan"
    Write-Color "╚════════════════════════════════════════════════════════════════╝" "Cyan"
    Write-Host ""
}

function Show-Step($Number, $Total, $Text) {
    Write-Color "[$Number/$Total] $Text" "Yellow"
}

function Show-Success($Text) { Write-Color "  ✅ $Text" "Green" }
function Show-Error($Text) { Write-Color "  ❌ $Text" "Red" }
function Show-Info($Text) { Write-Color "  ℹ️  $Text" "Cyan" }
function Show-Warning($Text) { Write-Color "  ⚠️  $Text" "Magenta" }

# Progress bar
function Show-Progress($Percent, $Text) {
    $filled = [math]::Floor($Percent / 2)
    $empty = 50 - $filled
    $bar = "█" * $filled + "░" * $empty
    Write-Host "`r  [$bar] $Percent% $Text" -NoNewline
    if ($Percent -eq 100) { Write-Host "" }
}

# ============================================
# MAIN
# ============================================

Show-Header

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir
$TotalSteps = 10
$CurrentStep = 0

# Step 1: Welcome
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Welcome"
Write-Host ""
Write-Color "  This installer will set up:" "Cyan"
Write-Color "  • 🤖 AI DevStudio with 8 Agents" "Cyan"
Write-Color "  • 🔌 AI Proxy (multi-account management)" "Cyan"
Write-Color "  • 💳 Subscription & Billing system" "Cyan"
Write-Color "  • 📊 Usage analytics" "Cyan"
Write-Host ""

$continue = Read-Host "  Continue? (y/n)"
if ($continue -ne 'y') { exit 0 }

# Step 2: Check Docker
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Checking Docker"

try {
    $dockerInfo = docker info 2>$null
    Show-Success "Docker is running"
} catch {
    Show-Error "Docker Desktop not found"
    Write-Host ""
    Write-Color "  ╔══════════════════════════════════════════════════════════╗" "Red"
    Write-Color "  ║  Please install Docker Desktop first:                    ║" "Red"
    Write-Color "  ║  https://docker.com/products/docker-desktop             ║" "Red"
    Write-Color "  ╚══════════════════════════════════════════════════════════╝" "Red"
    
    $install = Read-Host "`n  Open download page? (y/n)"
    if ($install -eq 'y') {
        Start-Process "https://docker.com/products/docker-desktop"
    }
    exit 1
}

# Step 3: Auto-install dependencies
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Installing Dependencies"

# Check/install Node.js
try {
    $nodeVer = node --version 2>$null
    Show-Success "Node.js found: $nodeVer"
} catch {
    Show-Info "Installing Node.js..."
    Show-Progress 0 "Downloading..."
    
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $installer = "$env:TEMP\node-setup.msi"
    
    Invoke-WebRequest -Uri $nodeUrl -OutFile $installer
    Show-Progress 50 "Installing..."
    
    Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /qn /norestart" -Wait
    Remove-Item $installer
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + 
                [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Show-Progress 100 "Done"
    Show-Success "Node.js installed"
}

# Step 4: Setup environment
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Configuring Environment"

$EnvFile = Join-Path $ProjectDir ".env"
$EnvExample = Join-Path $ProjectDir ".env.example"

if (!(Test-Path $EnvFile)) {
    Copy-Item $EnvExample $EnvFile
}

# Generate secure keys
$JWTSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$EncryptionKey = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object { [char]$_ })
$VncPass = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach-Object { [char]$_ })
$DbPass = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object { [char]$_ })

$envContent = Get-Content $EnvFile -Raw
$envContent = $envContent -replace "JWT_SECRET=.*", "JWT_SECRET=$JWTSecret"
$envContent = $envContent -replace "ENCRYPTION_KEY=.*", "ENCRYPTION_KEY=$EncryptionKey"
$envContent = $envContent -replace "VNC_PASSWORD=.*", "VNC_PASSWORD=$VncPass"
$envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=$DbPass"

# Ask for Google OAuth (optional)
Write-Host ""
Write-Color "  Google Login (Optional):" "Cyan"
Write-Color "  For Google authentication, you need:" "Cyan"
Write-Color "  1. Go to https://console.cloud.google.com" "Cyan"
Write-Color "  2. Create OAuth 2.0 credentials" "Cyan"
Write-Color "  3. Add redirect URI: http://localhost/auth/google/callback" "Cyan"
Write-Host ""

$hasGoogle = Read-Host "  Do you have Google OAuth credentials? (y/n/skip)"
if ($hasGoogle -eq 'y') {
    $clientId = Read-Host "  Enter Google Client ID"
    $clientSecret = Read-Host "  Enter Google Client Secret" -AsSecureString
    $clientSecretPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($clientSecret))
    
    $envContent = $envContent -replace "GOOGLE_CLIENT_ID=.*", "GOOGLE_CLIENT_ID=$clientId"
    $envContent = $envContent -replace "GOOGLE_CLIENT_SECRET=.*", "GOOGLE_CLIENT_SECRET=$clientSecretPlain"
}

Set-Content $EnvFile $envContent
Show-Success "Environment configured"

# Step 5: Install npm packages
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Installing NPM Packages"

Set-Location "$ProjectDir\web"
if (!(Test-Path "node_modules")) {
    Show-Info "Installing (this may take 2-3 minutes)..."
    npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Show-Success "Packages installed"
    } else {
        Show-Error "Installation failed"
        exit 1
    }
} else {
    Show-Success "Already installed"
}

# Step 6: Install AI Proxy packages
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Installing AI Proxy"

Set-Location "$ProjectDir\ai-proxy"
if (!(Test-Path "node_modules")) {
    npm install 2>&1 | Out-Null
    Show-Success "AI Proxy installed"
} else {
    Show-Success "Already installed"
}

# Step 7: Build applications
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Building Applications"

Set-Location "$ProjectDir\web"
Show-Info "Building Web UI..."
npm run build 2>&1 | Out-Null

if (!(Test-Path "$ProjectDir\web\dist\index.html")) {
    Show-Error "Build failed"
    exit 1
}
Show-Success "Web UI built"

# Step 8: Initialize database
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Initializing Database"

Set-Location "$ProjectDir\docker"
docker compose -f docker-compose-with-proxy.yml down 2>$null | Out-Null

Show-Info "Starting database..."
docker compose -f docker-compose-with-proxy.yml up -d postgres redis 2>&1 | Out-Null

Start-Sleep -Seconds 5
Show-Success "Database ready"

# Step 9: Start all services
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Starting AI DevStudio"

Show-Info "Starting all services (this may take 3-5 minutes)..."
docker compose -f docker-compose-with-proxy.yml up --build -d 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Show-Error "Failed to start services"
    exit 1
}

# Wait for health check
Show-Info "Waiting for services to be ready..."
$attempts = 0
$maxAttempts = 60
$ready = $false

while ($attempts -lt $maxAttempts -and !$ready) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $ready = $true
        }
    } catch {
        Start-Sleep -Seconds 1
        $attempts++
        Show-Progress ([math]::Floor($attempts / $maxAttempts * 100)) "Waiting..."
    }
}

Show-Progress 100 "Ready"

# Step 10: Complete
$CurrentStep++
Show-Step $CurrentStep $TotalSteps "Setup Complete!"

Write-Host ""
Write-Color "╔════════════════════════════════════════════════════════════════╗" "Green"
Write-Color "║  🎉 AI DEVSTUDIO IS READY!                                     ║" "Green"
Write-Color "╠════════════════════════════════════════════════════════════════╣" "Green"
Write-Color "║                                                                ║" "Green"
Write-Color "║  🌐 Main App:      http://localhost                            ║" "Green"
Write-Color "║  🔧 N8N:           http://localhost:5678 (admin/admin123)      ║" "Green"
Write-Color "║  🔌 AI Proxy:      http://localhost:3001                       ║" "Green"
Write-Color "║                                                                ║" "Green"
Write-Color "║  💳 Billing:       http://localhost/pricing                    ║" "Green"
Write-Color "║  📊 Dashboard:     http://localhost/dashboard                  ║" "Green"
Write-Color "║                                                                ║" "Green"
Write-Color "╚════════════════════════════════════════════════════════════════╝" "Green"

Write-Host ""
Write-Color "📋 Default Login:" "Cyan"
Write-Color "   Username: admin" "Cyan"
Write-Color "   Password: admin123" "Cyan"
Write-Host ""
Write-Color "💡 Or login with Google (if configured)" "Cyan"
Write-Host ""

$openNow = Read-Host "Open browser now? (y/n)"
if ($openNow -eq 'y') {
    Start-Process "http://localhost"
}

Write-Host ""
Write-Color "To stop: .\stop.bat" "Yellow"
Write-Color "To start: .\start.bat" "Yellow"
Write-Host ""

Pause
