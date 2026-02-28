FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY src/ ./src/

# Create keys directory for encrypted storage
RUN mkdir -p /app/keys

EXPOSE 3001

CMD ["node", "src/proxy.js"]
