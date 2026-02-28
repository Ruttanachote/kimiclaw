FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./
RUN npm install

COPY src/ ./src/

CMD ["node", "src/index.js"]
