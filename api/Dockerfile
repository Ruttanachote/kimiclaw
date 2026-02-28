FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git

COPY package*.json ./
RUN npm install

COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/server.js"]
