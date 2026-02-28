# AI DevStudio - Stop All Services

Write-Host "🛑 Stopping AI DevStudio..." -ForegroundColor Cyan

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir

Set-Location "$ProjectDir\docker"
docker compose down

Set-Location $ProjectDir

Write-Host "\n✅ All services stopped" -ForegroundColor Green
