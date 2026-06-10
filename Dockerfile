# syntax=docker/dockerfile:1

# ── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# VITE_* vars are inlined at build time — pass via --build-arg
ARG VITE_AUTH_USERNAME
ARG VITE_AUTH_PASSWORD
ARG VITE_HERMES_URL
ARG VITE_HERMES_API_KEY
ARG VITE_HERMES_MODEL
ARG VITE_HERMES_MOCK=false

ENV VITE_AUTH_USERNAME=$VITE_AUTH_USERNAME \
    VITE_AUTH_PASSWORD=$VITE_AUTH_PASSWORD \
    VITE_HERMES_URL=$VITE_HERMES_URL \
    VITE_HERMES_API_KEY=$VITE_HERMES_API_KEY \
    VITE_HERMES_MODEL=$VITE_HERMES_MODEL \
    VITE_HERMES_MOCK=$VITE_HERMES_MOCK

RUN bun run build

# ── Serve stage ───────────────────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: unknown paths → index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 7200

CMD ["nginx", "-g", "daemon off;"]
