@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                                                          ║
echo ║           🤖 AI DevStudio - One Click Setup              ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

:: Check Windows Version
echo [1/6] Checking system requirements...
ver | find "10." > nul
if errorlevel 1 (
    echo ❌ Windows 10 or higher required
    pause
    exit /b 1
)
echo ✅ Windows compatible

:: Check if Docker is installed
echo.
echo [2/6] Checking Docker...
docker --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Docker not found
    echo.
    echo Installing Docker Desktop...
    echo Please download and install from:
    echo https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe
    echo.
    start https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe
    echo After installation, restart this setup.
    pause
    exit /b 1
)
echo ✅ Docker found

:: Check if Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running
    echo Please start Docker Desktop and wait for it to be ready
    pause
    exit /b 1
)
echo ✅ Docker is running

:: Check Node.js
echo.
echo [3/6] Checking Node.js...
node --version > nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found
    echo Installing Node.js LTS...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile 'node-installer.msi'}"
    start /wait msiexec /i node-installer.msi /qn
    del node-installer.msi
    echo ✅ Node.js installed
) else (
    for /f "tokens=*" %%a in ('node --version') do echo ✅ Node.js %%a found
)

:: Setup environment
echo.
echo [4/6] Setting up environment...

if not exist ".env" (
    copy ".env.example" ".env" > nul
    echo ✅ Created .env file
    echo.
    echo ⚠️  IMPORTANT: Please edit .env file and add your API keys:
    echo    - ANTHROPIC_API_KEY (get from https://console.anthropic.com)
    echo    - FIGMA_API_KEY (optional, from https://figma.com/developers)
    echo.
    notepad ".env"
) else (
    echo ✅ .env file exists
)

:: Install dependencies
echo.
echo [5/6] Installing dependencies...

if not exist "web\node_modules" (
    echo Installing Web UI dependencies...
    cd web
    call npm install
    if errorlevel 1 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
    cd ..
    echo ✅ Dependencies installed
) else (
    echo ✅ Dependencies already installed
)

:: Build and start
echo.
echo [6/6] Building and starting services...
echo This may take 3-5 minutes on first run...
echo.

cd docker
docker compose down > nul 2>&1

echo Building Web UI...
cd ..\web
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo Starting all services...
cd ..\docker
docker compose up --build -d

if errorlevel 1 (
    echo ❌ Failed to start services
    pause
    exit /b 1
)

echo.
echo ✅ AI DevStudio is starting up...
echo.
echo Waiting for services to be ready (30 seconds)...
timeout /t 30 /nobreak > nul

:: Check if services are running
curl -s http://localhost/health > nul 2>&1
if errorlevel 1 (
    echo ⚠️  Services may still be starting
    echo Please wait a moment and try accessing http://localhost
) else (
    echo ✅ All services are ready!
)

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║  🎉 Setup Complete!                                      ║
echo ║                                                          ║
echo ║  Access your AI DevStudio at:                            ║
echo ║  http://localhost                                        ║
echo ║                                                          ║
echo ║  N8N Workflow: http://localhost:5678                     ║
echo ║  (Login: admin / admin123)                               ║
echo ║                                                          ║
echo ║  To stop: run stop.bat                                   ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

set /p open_browser="Open browser now? (y/n): "
if /i "%open_browser%"=="y" (
    start http://localhost
)

pause
