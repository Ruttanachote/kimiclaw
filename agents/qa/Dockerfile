FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git docker curl

# Skip ZAP and k6 installation for now (optional tools)
# Can be added back when URLs are fixed

COPY package*.json ./
RUN npm install

COPY src/ ./src/

VOLUME /var/run/docker.sock

CMD ["node", "src/index.js"]
