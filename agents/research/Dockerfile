FROM python:3.11-slim

# Install basic dependencies
RUN apt-get update && apt-get install -y \
    wget curl ca-certificates \
    git procps net-tools \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for agent
RUN apt-get update && apt-get install -y nodejs npm \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install
COPY package*.json ./
RUN npm install

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/index.js"]
