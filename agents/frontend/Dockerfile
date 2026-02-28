FROM node:20-alpine

WORKDIR /app

# Install git and basic tools
RUN apk add --no-cache git

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY src/ ./src/

# Create outputs directory
RUN mkdir -p /app/outputs /app/projects

CMD ["node", "src/index.js"]
