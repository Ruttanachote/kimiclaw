#!/bin/bash

# VNC Password
VNC_PASS=${VNC_PASSWORD:-devstudio123}

# Start Xvfb (virtual display)
echo "Starting Xvfb..."
Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset &
sleep 2

# Start window manager
echo "Starting Fluxbox..."
fluxbox -display :99 &
sleep 1

# Start VNC server
echo "Starting VNC server..."
x11vnc -display :99 -nopw -listen 0.0.0.0 -xkb -forever -shared &
sleep 2

# Start noVNC (web-based VNC)
echo "Starting noVNC on port 8080..."
websockify --web /usr/share/novnc --cert none 8080 localhost:5900 &
sleep 2

# Start Research Agent
echo "Starting Research Agent..."
cd /app && python src/index.py
