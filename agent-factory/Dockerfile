FROM docker:24-dind

WORKDIR /app

# Install Node.js for agent management
RUN apk add --no-cache nodejs npm

COPY package.json ./
RUN npm install

COPY src/ ./src/
COPY templates/ ./templates/

# Docker socket access
VOLUME /var/run/docker.sock

CMD ["node", "src/factory.js"]
