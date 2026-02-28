# AI DevStudio - Phase 4 Start

Write-Host "🚀 Starting AI DevStudio Phase 4..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

# Check .env
if (!(Test-Path "$ProjectDir\.env")) {
    Write-Host "⚠️  .env not found. Creating from template..." -ForegroundColor Yellow
    Copy-Item "$ProjectDir\.env.example" "$ProjectDir\.env"
    Write-Host "❌ Please edit .env with your API keys first!" -ForegroundColor Red
    exit 1
}

# Load env
Get-Content "$ProjectDir\.env" | ForEach-Object {
    if ($_ -match '^([^#][^=]*)=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

# Check API key
if ([string]::IsNullOrEmpty($env:ANTHROPIC_API_KEY) -or $env:ANTHROPIC_API_KEY -eq 'your-key-here') {
    Write-Host "❌ ANTHROPIC_API_KEY not set in .env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔨 Building Web UI..." -ForegroundColor Yellow

Set-Location "$ProjectDir\web"

if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Gray
    npm install 2>&1 | Out-Null
}

npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Set-Location $ProjectDir
    exit 1
}

Set-Location $ProjectDir

Write-Host ""
Write-Host "🐳 Starting all services..." -ForegroundColor Yellow

Set-Location "$ProjectDir\docker"
docker compose down 2>&1 | Out-Null
docker compose up --build -d 2>&1 | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    Set-Location $ProjectDir
    exit 1
}

Set-Location $ProjectDir

Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow

$services = @(
    @{ Name = "API Gateway"; Url = "http://localhost/health"; Timeout = 30 },
    @{ Name = "Research Agent VNC"; Url = "http://localhost:8080"; Timeout = 60 }
)

foreach ($svc in $services) {
    $attempts = 0
    $ready = $false
    
    while ($attempts -lt $svc.Timeout -and !$ready) {
        try {
            $resp = Invoke-WebRequest -Uri $svc.Url -Method HEAD -TimeoutSec 5 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                Write-Host "  ✅ $($svc.Name) ready" -ForegroundColor Green
                $ready = $true
            }
        } catch {}
        
        if (!$ready) {
            $attempts++
            Start-Sleep -Seconds 1
        }
    }
    
    if (!$ready) {
        Write-Host "  ⚠️  $($svc.Name) may still be starting" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 AI DevStudio Phase 4 is RUNNING!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Access Points:" -ForegroundColor Cyan
Write-Host "   Web UI:     http://localhost" -ForegroundColor White
Write-Host "   VNC Direct: http://localhost:8080" -ForegroundColor White
Write-Host "   API:        http://localhost/api" -ForegroundColor White
Write-Host ""
Write-Host "👥 Active Agents:" -ForegroundColor Cyan
Write-Host "   🔍 Research  |  🎨 UI/UX  |  ⚛️ Frontend" -ForegroundColor White
Write-Host "   🔧 Backend   |  🧪 QA     |  📊 PM/BA" -ForegroundColor White
Write-Host "   👁️ Supervisor |  💬 Secretary" -ForegroundColor White
Write-Host ""
Write-Host "💡 Try saying to your secretary:" -ForegroundColor Cyan
Write-Host '   "สร้างโปรเจกชื่อ my-shop"' -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop: .\scripts\stop.ps1" -ForegroundColor Gray
