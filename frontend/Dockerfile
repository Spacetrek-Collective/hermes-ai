# syntax=docker/dockerfile:1
# Build context is ./frontend (see docker-compose.yml). Self-contained — does
# not depend on the workspace root lockfile.
# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN bun install
COPY . .
# VITE_* vars are inlined at build time — pass via --build-arg / compose args.
ARG VITE_API_URL
ARG VITE_AUTH_USERNAME
ARG VITE_AUTH_PASSWORD
ARG VITE_HERMES_URL
ARG VITE_HERMES_API_KEY
ARG VITE_HERMES_MODEL
ARG VITE_HERMES_MOCK=false
ARG VITE_MINIMAX_BASE_URL
ARG VITE_MINIMAX_API_KEY
ARG VITE_MINIMAX_VOICE_ID
ENV VITE_API_URL=$VITE_API_URL \
    VITE_AUTH_USERNAME=$VITE_AUTH_USERNAME \
    VITE_AUTH_PASSWORD=$VITE_AUTH_PASSWORD \
    VITE_HERMES_URL=$VITE_HERMES_URL \
    VITE_HERMES_API_KEY=$VITE_HERMES_API_KEY \
    VITE_HERMES_MODEL=$VITE_HERMES_MODEL \
    VITE_HERMES_MOCK=$VITE_HERMES_MOCK \
    VITE_MINIMAX_BASE_URL=$VITE_MINIMAX_BASE_URL \
    VITE_MINIMAX_API_KEY=$VITE_MINIMAX_API_KEY \
    VITE_MINIMAX_VOICE_ID=$VITE_MINIMAX_VOICE_ID
RUN bun run build
# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# SPA routing: unknown paths → index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
