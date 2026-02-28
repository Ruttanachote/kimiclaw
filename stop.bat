@echo off
echo.
echo 🤖 AI DevStudio - Quick Stop
echo.

cd /d "%~dp0\docker"
docker compose down

echo.
echo ✅ All services stopped
echo.
pause
