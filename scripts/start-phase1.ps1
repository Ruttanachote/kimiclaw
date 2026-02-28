# AI DevStudio - Phase 1 Start

Write-Host "🚀 Starting AI DevStudio Phase 1..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

# Check if .env exists
if (!(Test-Path "$ProjectDir\.env")) {
    Write-Host "⚠️  .env not found. Running setup first..." -ForegroundColor Yellow
    & "$ScriptDir\setup.ps1"
}

# Load environment variables
Get-Content "$ProjectDir\.env" | ForEach-Object {
    if ($_ -match '^([^#][^=]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

Write-Host "\n🔧 Building and starting services..." -ForegroundColor Yellow

# Change to docker directory
Set-Location "$ProjectDir\docker"

# Build and start
docker compose up --build -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "\n❌ Failed to start services" -ForegroundColor Red
    Set-Location $ProjectDir
    exit 1
}

Set-Location $ProjectDir

Write-Host "\n✅ Services started!" -ForegroundColor Green
Write-Host "\n📍 Access points:" -ForegroundColor Cyan
Write-Host "  Web UI:       http://localhost" -ForegroundColor White
Write-Host "  VNC Direct:   http://localhost:8080" -ForegroundColor White
Write-Host "  Redis:        localhost:6379" -ForegroundColor White

Write-Host "\n🔍 View logs:" -ForegroundColor Cyan
Write-Host "  docker compose -f docker/docker-compose.yml logs -f" -ForegroundColor White

Write-Host "\n🛑 To stop:" -ForegroundColor Cyan
Write-Host "  .\scripts\stop.ps1" -ForegroundColor White

Write-Host "\n⏳ Waiting for Research Agent to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if agent is ready
$attempts = 0
$maxAttempts = 30

while ($attempts -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080" -Method HEAD -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "\n🎉 Research Agent is ready!" -ForegroundColor Green
            Write-Host "   Open http://localhost in your browser" -ForegroundColor Cyan
            break
        }
    } catch {
        Write-Host "  Checking... ($($attempts + 1)/$maxAttempts)" -ForegroundColor Gray
    }
    
    $attempts++
    Start-Sleep -Seconds 2
}

if ($attempts -ge $maxAttempts) {
    Write-Host "\n⚠️  Agent might still be starting. Check logs with:" -ForegroundColor Yellow
    Write-Host "   docker compose -f docker/docker-compose.yml logs research-agent" -ForegroundColor White
}
