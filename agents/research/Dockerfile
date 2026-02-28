FROM python:3.11-slim

# ติดตั้ง dependencies สำหรับ Chrome + VNC
RUN apt-get update && apt-get install -y \
    # Chrome dependencies
    wget gnupg curl ca-certificates \
    fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libatspi2.0-0 libcups2 libdbus-1-3 libdrm2 libgbm1 \
    libgtk-3-0 libnspr4 libnss3 libxcomposite1 libxdamage1 \
    libxfixes3 libxkbcommon0 libxrandr2 xdg-utils \
    # VNC + Display
    xvfb x11vnc \
    novnc websockify \
    # Window manager (ต้องมีสำหรับ Chrome)
    fluxbox \
    # Utilities
    git procps net-tools \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# ติดตั้ง Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# ติดตั้ง Playwright + Python dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install chromium

# Copy agent code
COPY src/ ./src/

# Setup noVNC
RUN ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html

# Expose ports
EXPOSE 5900 8080

# Start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
