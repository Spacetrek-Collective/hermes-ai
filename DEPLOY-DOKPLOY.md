# Deploying Hermes AI on Dokploy

This guide deploys the full stack (frontend + backend) on a
[Dokploy](https://dokploy.com) server using the repo's `docker-compose.yml`.

You end up with two public URLs:

- **App** → `https://hermes.example.com` (the chat UI, nginx)
- **API** → `https://api-hermes.example.com` (the Bun backend)

> Why two domains? `VITE_API_URL` is **baked into the frontend at build time**
> and the request is made by the **browser**, so it must be a public URL — the
> internal `backend` service name is not reachable from the user's browser.

---

## 0. Prerequisites

- A Dokploy server (installed + reachable).
- This repo on GitHub/GitLab (Dokploy pulls from Git).
- Two DNS `A` records pointing at the Dokploy server's IP:
  - `hermes.example.com`
  - `api-hermes.example.com`

---

## 1. Create the project + Compose service

1. Dokploy dashboard → **Create Project** → name it `hermes-ai`.
2. Inside the project → **Create Service** → **Compose**.
3. **Provider:** Git → select this repository, branch `main`.
4. **Compose Path:** `docker-compose.yml` (repo root — the default).

Dokploy will read the compose file but **don't deploy yet** — set env + domains
first.

---

## 2. Environment variables

Open the Compose service → **Environment** tab and paste:

```env
# --- Public URLs (must match the domains you attach in step 3) -------------
VITE_API_URL=https://api-hermes.example.com
FRONTEND_ORIGIN=https://hermes.example.com

# --- Backend ---------------------------------------------------------------
# Generate once: openssl rand -hex 32
JWT_SECRET=PASTE_A_LONG_RANDOM_SECRET

# --- Frontend build args (Hermes chat API + TTS) ---------------------------
VITE_HERMES_URL=https://your-hermes-api
VITE_HERMES_API_KEY=your-hermes-key
VITE_HERMES_MODEL=hermes-agent
VITE_HERMES_MOCK=false
VITE_MINIMAX_BASE_URL=https://api.minimax.io/v1
VITE_MINIMAX_API_KEY=your-minimax-key
VITE_MINIMAX_VOICE_ID=female-shaonv
```

Notes:
- These feed compose interpolation — the frontend build args and the backend
  `JWT_SECRET` / `CORS_ORIGIN` all come from here.
- With `VITE_API_URL` set, the app uses **real per-user auth** (register/login)
  on the backend. `VITE_AUTH_USERNAME/PASSWORD` (the soft gate) are then ignored
  and can be left out.

---

## 3. Domains

Compose services in Dokploy let you attach a domain **per internal service**.
Add two:

**App (frontend):**
- **Service Name:** `frontend`
- **Host:** `hermes.example.com`
- **Container Port:** `80`
- **HTTPS:** on, **Certificate:** Let's Encrypt

**API (backend):**
- **Service Name:** `backend`
- **Host:** `api-hermes.example.com`
- **Container Port:** `8787`
- **HTTPS:** on, **Certificate:** Let's Encrypt

> Dokploy/Traefik terminates TLS and proxies to the container port. You do **not**
> need to publish host ports — the `ports:` in the compose file are for local
> `docker compose up`; behind Dokploy, Traefik routes by domain instead. They do
> no harm, but if another service already uses `8080`/`8787` on the host, remove
> the `ports:` blocks to avoid a clash.

---

## 4. Deploy

Hit **Deploy**. Dokploy will:

1. Build `backend` (Bun) and `frontend` (Vite build → nginx) images.
2. Start both, with the SQLite DB on the `backend-data` volume.
3. Issue certs and route the two domains.

First build takes a few minutes (frontend bundles ~2600 modules).

---

## 5. Verify

```bash
# API health
curl https://api-hermes.example.com/health
# → {"ok":true}
```

Open `https://hermes.example.com`, click **Register**, create an account, and
start chatting. Your conversations/settings now persist server-side, scoped to
that account.

---

## 6. Data persistence

The SQLite file lives at `/data/hermes.db` inside the backend container, mapped
to the named volume **`backend-data`**. It survives redeploys and image rebuilds.

Back it up from the Dokploy server:

```bash
# find the volume mountpoint (name is prefixed by the compose project)
docker volume ls | grep backend-data
docker run --rm -v <project>_backend-data:/data -v "$PWD":/backup alpine \
  cp /data/hermes.db /backup/hermes-backup.db
```

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Build fails: `JWT_SECRET ... is required` | `JWT_SECRET` not set in the Environment tab. Add it. |
| Login → "Network error" | `VITE_API_URL` wrong, or the `backend` domain not routing. Check `curl .../health`. |
| Login → CORS error in console | `FRONTEND_ORIGIN` ≠ the actual app URL. Must match scheme+host exactly (`https://hermes.example.com`). |
| Changed `VITE_*` but UI unchanged | These are **build-time** — trigger a fresh **Deploy/rebuild**, not just a restart. |
| 404 on page refresh | nginx SPA fallback — already handled by `frontend/nginx.conf`; ensure the `frontend` domain points at port `80`. |

---

## Alternative: two separate Dokploy "Application" services

Instead of Compose you can create two **Application** services (Dockerfile
provider), one per folder:

- **backend** — Build Path `backend/`, Dockerfile `Dockerfile`, add a **Volume**
  mounted at `/data`, env `JWT_SECRET`, `CORS_ORIGIN`, `DB_PATH=/data/hermes.db`.
- **frontend** — Build Path `frontend/`, Dockerfile `Dockerfile`, set the
  `VITE_*` **build args** in the service's Build settings.

The Compose route above is simpler because both services + the volume are
declared in one file; use separate Applications only if you want to scale or
redeploy them independently.
