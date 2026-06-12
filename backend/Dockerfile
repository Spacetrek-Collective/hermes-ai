# syntax=docker/dockerfile:1
# Build context is ./backend (see docker-compose.yml).
FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .

# SQLite lives on a mounted volume so data survives container rebuilds.
ENV DB_PATH=/data/hermes.db
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8787
CMD ["bun", "src/index.ts"]
