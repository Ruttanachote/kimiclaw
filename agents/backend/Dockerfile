FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git docker

COPY package*.json ./
RUN npm install

COPY src/ ./src/

VOLUME /var/run/docker.sock

CMD ["node", "src/index.js"]
