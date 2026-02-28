# AI DevStudio - Phase 1 Setup

Write-Host "🚀 AI DevStudio Phase 1 Setup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "\n📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker not found. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check Docker Compose
if (!(docker compose version)) {
    Write-Host "❌ Docker Compose not found." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker found" -ForegroundColor Green

# Create directories
Write-Host "\n📁 Creating directories..." -ForegroundColor Yellow
$dirs = @(
    "shared/outputs",
    "shared/projects",
    "shared/templates"
)

foreach ($dir in $dirs) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  Created: $dir" -ForegroundColor Gray
    }
}

# Copy .env if not exists
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env from template" -ForegroundColor Green
} else {
    Write-Host "⚠️  .env already exists, skipping" -ForegroundColor Yellow
}

Write-Host "\n✨ Setup complete!" -ForegroundColor Green
Write-Host "\nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Edit .env file if needed" -ForegroundColor White
Write-Host "  2. Run: .\scripts\start-phase1.ps1" -ForegroundColor White
Write-Host "  3. Open: http://localhost" -ForegroundColor White
