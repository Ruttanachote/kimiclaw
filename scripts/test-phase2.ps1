# AI DevStudio - Phase 2 Test Script
# รันสคริปต์นี้เพื่อตรวจสอบและเทสระบบทั้งหมด

param(
    [switch]$SkipBuild,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Write-Host "🧪 AI DevStudio Phase 2 - Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$TestResults = @{
    Passed = 0
    Failed = 0
    Warnings = 0
}

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Test
    )
    
    Write-Host "🔍 $Name..." -NoNewline -ForegroundColor Yellow
    
    try {
        & $Test
        Write-Host " ✅ PASS" -ForegroundColor Green
        $TestResults.Passed++
        return $true
    } catch {
        Write-Host " ❌ FAIL" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
        $TestResults.Failed++
        return $false
    }
}

Write-Host "📋 Pre-flight Checks" -ForegroundColor Magenta
Write-Host "--------------------" -ForegroundColor Magenta

# Check Docker
Test-Step "Docker Desktop running" {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running. Please start Docker Desktop."
    }
}

# Check Node.js
$NodeInstalled = Test-Step "Node.js installed" {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Node.js not found. Install from https://nodejs.org"
    }
}

# Check .env
Test-Step ".env file exists" {
    if (!(Test-Path "$ProjectDir\.env")) {
        Copy-Item "$ProjectDir\.env.example" "$ProjectDir\.env"
        throw ".env created from template. Please edit it with your API keys."
    }
}

# Check API Key
Test-Step "Anthropic API Key configured" {
    $envContent = Get-Content "$ProjectDir\.env" -Raw
    if ($envContent -notmatch 'ANTHROPIC_API_KEY=sk-ant-') {
        throw "ANTHROPIC_API_KEY not found in .env"
    }
}

Write-Host ""
Write-Host "🔨 Build Phase" -ForegroundColor Magenta
Write-Host "--------------" -ForegroundColor Magenta

if (!$SkipBuild) {
    Set-Location "$ProjectDir\web"
    
    Test-Step "Install NPM dependencies" {
        npm install 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
    }
    
    Test-Step "Build Web UI" {
        npm run build 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    }
    
    Set-Location $ProjectDir
}

Write-Host ""
Write-Host "🚀 Deploy Phase" -ForegroundColor Magenta
Write-Host "---------------" -ForegroundColor Magenta

# Stop existing
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker compose -f "$ProjectDir\docker\docker-compose.yml" down 2>&1 | Out-Null

# Start containers
Test-Step "Start all services" {
    Set-Location "$ProjectDir\docker"
    docker compose up --build -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "docker compose up failed" }
    Start-Sleep -Seconds 5
    Set-Location $ProjectDir
}

# Verify containers
Test-Step "All containers running" {
    $containers = docker ps --format "{{.Names}}" 2>&1
    $required = @("ai-devstudio-nginx", "ai-devstudio-api", "ai-devstudio-research", 
                  "ai-devstudio-frontend", "ai-devstudio-secretary", "ai-devstudio-redis")
    foreach ($c in $required) {
        if ($containers -notmatch $c) { throw "Container not running: $c" }
    }
}

Write-Host ""
Write-Host "🏥 Health Checks" -ForegroundColor Magenta
Write-Host "----------------" -ForegroundColor Magenta

Start-Sleep -Seconds 10

# Check API
Test-Step "API Gateway responding" {
    $resp = Invoke-WebRequest -Uri "http://localhost/health" -TimeoutSec 10
    if ($resp.StatusCode -ne 200) { throw "API returned $($resp.StatusCode)" }
}

# Check noVNC
Test-Step "Research Agent VNC ready" {
    Start-Sleep -Seconds 5
    $resp = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 10
    if ($resp.StatusCode -ne 200) { throw "VNC returned $($resp.StatusCode)" }
}

Write-Host ""
Write-Host "🎉 TEST SUMMARY" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host "✅ Passed:  $($TestResults.Passed)" -ForegroundColor Green
Write-Host "❌ Failed:  $($TestResults.Failed)" -ForegroundColor Red
Write-Host "⚠️  Warnings: $($TestResults.Warnings)" -ForegroundColor Yellow
Write-Host ""

if ($TestResults.Failed -eq 0) {
    Write-Host "🚀 AI DevStudio Phase 2 is READY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Access your system:" -ForegroundColor Cyan
    Write-Host "   Web UI:     http://localhost" -ForegroundColor White
    Write-Host "   VNC Direct: http://localhost:8080" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Try saying to your secretary:" -ForegroundColor Cyan
    Write-Host '   "สร้างโปรเจกชื่อ my-app"' -ForegroundColor White
} else {
    Write-Host "❌ Some tests failed. Check errors above." -ForegroundColor Red
    exit 1
}
