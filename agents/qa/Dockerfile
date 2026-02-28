FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git docker

# Install ZAP and k6
RUN apk add --no-cache curl && \
    curl -L https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz | tar -xz -C /opt && \
    curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz | tar -xz -C /tmp && \
    mv /tmp/k6-v0.48.0-linux-amd64/k6 /usr/local/bin/

COPY package*.json ./
RUN npm install

COPY src/ ./src/

VOLUME /var/run/docker.sock

CMD ["node", "src/index.js"]
