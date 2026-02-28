@echo off
echo.
echo 🤖 AI DevStudio - Quick Start
echo.

cd /d "%~dp0\docker"
docker compose up -d

echo.
echo ✅ AI DevStudio is running!
echo.
echo Access: http://localhost
echo.

set /p open="Open browser? (y/n): "
if /i "%open%"=="y" start http://localhost
