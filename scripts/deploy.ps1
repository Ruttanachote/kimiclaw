# AI DevStudio - Complete Test & Deploy Script
# รันสคริปต์นี้เพื่อตรวจสอบและ deploy ทั้งระบบ

param(
    [switch]$SkipBuild,
    [switch]$TestOnly,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

# Colors
$Colors = @{
    Cyan = "Cyan"
    Green = "Green"
    Red = "Red"
    Yellow = "Yellow"
    Magenta = "Magenta"
}

function Write-Header($text) {
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor $Colors.Cyan
    Write-Host "  $text" -ForegroundColor $Colors.Cyan
    Write-Host "═══════════════════════════════════════" -ForegroundColor $Colors.Cyan
    Write-Host ""
}

function Write-Success($text) { Write-Host "  ✅ $text" -ForegroundColor $Colors.Green }
function Write-Error($text) { Write-Host "  ❌ $text" -ForegroundColor $Colors.Red }
function Write-Warning($text) { Write-Host "  ⚠️  $text" -ForegroundColor $Colors.Yellow }
function Write-Info($text) { Write-Host "  ℹ️  $text" -ForegroundColor $Colors.Magenta }

# Test Results
$TestResults = @{ Passed = 0; Failed = 0; Warnings = 0 }

function Test-Step($Name, $Test) {
    Write-Host "  Testing $Name..." -NoNewline -ForegroundColor $Colors.Yellow
    try {
        & $Test
        Write-Host " ✅" -ForegroundColor $Colors.Green
        $TestResults.Passed++
        return $true
    } catch {
        Write-Host " ❌" -ForegroundColor $Colors.Red
        Write-Host "     Error: $_" -ForegroundColor $Colors.Red
        $TestResults.Failed++
        return $false
    }
}

# ============================================
# MAIN
# ============================================

Clear-Host
Write-Header "AI DevStudio - Complete Test & Deploy"
Write-Info "Project Directory: $ProjectDir"
Write-Info "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ============================================
# PHASE 1: Environment Check
# ============================================

Write-Header "Phase 1: Environment Check"

# Check Docker
Test-Step "Docker Desktop" {
    $info = docker info 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
}

# Check Docker Compose
Test-Step "Docker Compose" {
    docker compose version | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose not found" }
}

# Check Node.js
$hasNode = Test-Step "Node.js" {
    $v = node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Node.js not installed" }
    Write-Info "Version: $v"
}

# Check .env
Test-Step ".env file" {
    if (!(Test-Path "$ProjectDir\.env")) {
        Copy-Item "$ProjectDir\.env.example" "$ProjectDir\.env"
        throw ".env created. Please edit API keys!"
    }
}

# Check API Keys
Test-Step "API Keys configured" {
    $env = Get-Content "$ProjectDir\.env" -Raw
    if ($env -notmatch 'ANTHROPIC_API_KEY=sk-ant-') {
        throw "ANTHROPIC_API_KEY missing"
    }
    if ($env -match 'ANTHROPIC_API_KEY=sk-ant-api03-\.\.\.') {
        Write-Warning "Using placeholder API key"
    }
}

# Check Ports
Test-Step "Port 80 available" {
    $conn = Get-NetTCPConnection -LocalPort 80 -EA SilentlyContinue
    if ($conn) { throw "Port 80 in use" }
}

Test-Step "Port 8080 available" {
    $conn = Get-NetTCPConnection -LocalPort 8080 -EA SilentlyContinue
    if ($conn) { throw "Port 8080 in use" }
}

Test-Step "Port 5678 available (N8N)" {
    $conn = Get-NetTCPConnection -LocalPort 5678 -EA SilentlyContinue
    if ($conn) { throw "Port 5678 in use" }
}

# ============================================
# PHASE 2: File Structure Check
# ============================================

Write-Header "Phase 2: File Structure Check"

$RequiredFiles = @(
    "docker/docker-compose.yml",
    "docker/nginx.conf",
    "api/src/server.js",
    "api/package.json",
    "web/package.json",
    "web/vite.config.ts",
    "web/src/App.vue",
    "agents/research/Dockerfile",
    "agents/uiux/Dockerfile",
    "agents/frontend/Dockerfile",
    "agents/backend/Dockerfile",
    "agents/qa/Dockerfile",
    "agents/pmba/Dockerfile",
    "agents/supervisor/Dockerfile",
    "agents/secretary/Dockerfile",
    "database/init/001_init.sql"
)

foreach ($file in $RequiredFiles) {
    $path = Join-Path $ProjectDir $file
    $name = Split-Path $file -Leaf
    Test-Step $name { 
        if (!(Test-Path $path)) { throw "Missing: $file" }
    }
}

# ============================================
# PHASE 3: Build Web UI
# ============================================

if (!$SkipBuild -and $hasNode) {
    Write-Header "Phase 3: Build Web UI"
    
    Set-Location "$ProjectDir\web"
    
    if (!(Test-Path "node_modules")) {
        Write-Info "Installing npm dependencies..."
        npm install 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-Success "Dependencies installed"
    }
    
    Write-Info "Building..."
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    
    if (!(Test-Path "$ProjectDir\web\dist\index.html")) {
        throw "Build output not found"
    }
    
    Write-Success "Web UI built successfully"
    Set-Location $ProjectDir
}

if ($TestOnly) {
    Write-Header "Test Only Mode - Stopping"
    exit 0
}

# ============================================
# PHASE 4: Deploy Services
# ============================================

Write-Header "Phase 4: Deploy Services"

Write-Info "Stopping existing containers..."
docker compose -f "$ProjectDir\docker\docker-compose.yml" down 2>&1 | Out-Null

Write-Info "Starting all services (this may take 2-3 minutes)..."
Set-Location "$ProjectDir\docker"

$buildOutput = docker compose up --build -d 2>&1
$exitCode = $LASTEXITCODE
Set-Location $ProjectDir

if ($exitCode -ne 0) {
    Write-Error "Docker compose failed"
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}

Write-Success "All services started"

# ============================================
# PHASE 5: Health Checks
# ============================================

Write-Header "Phase 5: Health Checks"

Write-Info "Waiting for services to initialize..."
Start-Sleep -Seconds 15

$Services = @(
    @{ Name = "API Gateway"; Url = "http://localhost/health"; Timeout = 30 },
    @{ Name = "N8N"; Url = "http://localhost:5678"; Timeout = 60 },
    @{ Name = "Research VNC"; Url = "http://localhost:8080"; Timeout = 60 }
)

foreach ($svc in $Services) {
    $attempts = 0
    $ready = $false
    
    while ($attempts -lt $svc.Timeout -and !$ready) {
        try {
            $resp = Invoke-WebRequest -Uri $svc.Url -Method HEAD -TimeoutSec 5 -EA SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                Write-Success "$($svc.Name) ready"
                $ready = $true
            }
        } catch {}
        
        if (!$ready) {
            $attempts++
            Start-Sleep -Seconds 1
        }
    }
    
    if (!$ready) {
        Write-Warning "$($svc.Name) may still be starting"
    }
}

# Check containers
Write-Info "Checking containers..."
$containers = docker ps --format "{{.Names}}" 2>&1
$required = @(
    "ai-devstudio-nginx",
    "ai-devstudio-n8n",
    "ai-devstudio-api",
    "ai-devstudio-research",
    "ai-devstudio-uiux",
    "ai-devstudio-frontend",
    "ai-devstudio-backend",
    "ai-devstudio-qa",
    "ai-devstudio-pmba",
    "ai-devstudio-supervisor",
    "ai-devstudio-secretary",
    "ai-devstudio-redis",
    "ai-devstudio-postgres"
)

$missing = @()
foreach ($c in $required) {
    if ($containers -notmatch $c) {
        $missing += $c
    }
}

if ($missing.Count -eq 0) {
    Write-Success "All 13 containers running"
} else {
    Write-Warning "Missing containers: $($missing -join ', ')"
}

# ============================================
# SUMMARY
# ============================================

Write-Header "Test Summary"

Write-Host "  ✅ Passed:  $($TestResults.Passed)" -ForegroundColor $Colors.Green
Write-Host "  ❌ Failed:  $($TestResults.Failed)" -ForegroundColor $Colors.Red
Write-Host "  ⚠️  Warnings: $($TestResults.Warnings)" -ForegroundColor $Colors.Yellow
Write-Host ""

if ($TestResults.Failed -eq 0) {
    Write-Header "🎉 AI DevStudio is READY!"
    
    Write-Host "  📍 Access Points:" -ForegroundColor $Colors.Cyan
    Write-Host "     Main App:    http://localhost" -ForegroundColor White
    Write-Host "     N8N:         http://localhost:5678" -ForegroundColor White
    Write-Host "     VNC Viewer:  http://localhost:8080" -ForegroundColor White
    Write-Host "     API:         http://localhost/api" -ForegroundColor White
    Write-Host ""
    Write-Host "  👥 Active Agents (8):" -ForegroundColor $Colors.Cyan
    Write-Host "     🔍 Research  |  🎨 UI/UX  |  ⚛️ Frontend  |  🔧 Backend" -ForegroundColor White
    Write-Host "     🧪 QA        |  📊 PM/BA  |  👁️ Supervisor |  💬 Secretary" -ForegroundColor White
    Write-Host ""
    Write-Host "  🔧 N8N Workflows:" -ForegroundColor $Colors.Cyan
    Write-Host "     User: admin  |  Pass: admin123" -ForegroundColor White
    Write-Host ""
    Write-Host "  💡 Try saying to your secretary:" -ForegroundColor $Colors.Cyan
    Write-Host '     "สร้างโปรเจกชื่อ my-shop"' -ForegroundColor White
    Write-Host ""
    Write-Host "  🛑 To stop: .\scripts\stop.ps1" -ForegroundColor Gray
    Write-Host ""
    
    # Open browser
    $openBrowser = Read-Host "  Open browser now? (y/n)"
    if ($openBrowser -eq 'y') {
        Start-Process "http://localhost"
    }
} else {
    Write-Header "❌ Some tests failed"
    Write-Host "  Check errors above or run:"
    Write-Host "  docker compose -f docker/docker-compose.yml logs" -ForegroundColor Yellow
    exit 1
}
