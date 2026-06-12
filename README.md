# Hermes AI

AI live-chat with a **Live2D** character. Streams replies from an OpenAI-compatible API endpoint and renders them as Markdown in the chat panel.

![status](https://img.shields.io/badge/status-WIP-orange)

## Features

- 🎭 **Live2D model** rendered with PixiJS v7 + [`pixi-live2d-display-lipsyncpatch`](https://github.com/RaSan147/pixi-live2d-display)
- 🔀 **Model switcher** — swap characters at runtime, persisted locally or to the backend
- 👤 **Accounts** — optional multi-user auth + server-side storage via the `backend/` API
- 😊 **Mood expressions** — AI response triggers character expressions via `[MOOD:*]` tags
- 🖐️ **Tap interaction** — tap the character to trigger random expressions
- 💬 **Streaming chat** via OpenAI-compatible `/v1/chat/completions` SSE with full message history
- 📝 **Markdown rendering** in assistant messages (bold, italic, code, lists, links)
- 🎙️ **Speech-to-text** — free, key-less voice input via the browser Web Speech API
- 🗣️ **Text-to-speech** — Minimax (API key), or free **Edge TTS** proxied through the backend (no key)
- 🗂️ **Multiple conversations** persisted locally or to the backend
- 🔍 **Command-palette search** (`Cmd`/`Ctrl`+`K`) with date grouping + keyboard nav; rename/delete chats
- 🌸 **Moe-pink** accent theme (light + dark)
- 📱 Responsive — overlay chat panel + collapsible drawer sidebar

## Tech stack

| | |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Styling | Tailwind v4 + shadcn/ui (Base UI primitives) |
| Live2D | PixiJS **v7** (pinned), `pixi-live2d-display-lipsyncpatch` (Cubism 4) |
| Markdown | `react-markdown` + `remark-gfm` |
| STT | Web Speech API (browser-native) |
| Runtime | Bun |

> ⚠️ `pixi-live2d-display` supports PixiJS **v6/v7 only — not v8**. Keep Pixi pinned to v7.

## Monorepo

Bun-workspaces monorepo:

- **`frontend/`** — the React + Vite SPA (Live2D chat).
- **`backend/`** — optional Hono + Bun API: per-user auth + storage. See [Backend](#backend-optional).

## Getting started

```bash
bun install                          # installs both workspaces
cp frontend/.env.example frontend/.env   # fill in your API key + URL
cp backend/.env.example backend/.env     # only if you want server storage
bun dev                              # frontend + backend in parallel
# or run one side:
bun run dev:web                      # frontend only → http://localhost:7200
bun run dev:api                      # backend only  → http://localhost:8787
```

Open http://localhost:7200.

## Environment

Frontend (`frontend/.env`):

| Var | Description | Default |
|---|---|---|
| `VITE_AI_NAME` | Display name shown in the chat header | `Hermes` |
| `VITE_API_URL` | Backend URL — when set, enables real auth + server storage | — (local) |
| `VITE_HERMES_URL` | OpenAI-compatible API base URL | `http://localhost:8642` |
| `VITE_HERMES_API_KEY` | Bearer token for the API | — |
| `VITE_HERMES_MODEL` | Model ID to pass in requests | `hermes-agent` |
| `VITE_HERMES_MOCK` | Stream a canned reply locally (no API needed) | `false` |
| `VITE_AUTH_USERNAME` / `VITE_AUTH_PASSWORD` | Soft login gate, used **only** when `VITE_API_URL` is blank | — |

> 🎙️ STT needs **HTTPS** (or `localhost`) + mic permission. The mic button auto-hides where the Web Speech API is unavailable (e.g. Firefox).

> 🗣️ TTS provider is switchable in the chat panel. **Minimax** needs `VITE_MINIMAX_API_KEY`. **Edge (free)** needs no key but is proxied by the backend (`POST /tts`), so it requires `VITE_API_URL` + a logged-in user.

## Models

Character models live in `public/models/`. Each model is registered in `src/lib/models.ts` with its mood expression mapping and tap expressions. The active model is persisted in `localStorage` under `hermes:model`.

| ID | Label |
|---|---|
| `changli` | Changli |
| `vivian` | Vivian |
| `camellya` | Camellya |
| `jane-doe` | Jane Doe |
| `yachiyo` | Yachiyo |
| `nicole` | Nicole |
| `villhaze` | Villhaze |

To add a new model:
1. Drop the Cubism 4 model folder into `public/models/`
2. Add expressions to the `.model3.json` `FileReferences.Expressions` array (if not already present)
3. Register it in `src/lib/models.ts` with mood and tap expression names

Supported moods: `happy`, `sad`, `surprised`, `angry`, `neutral`, `embarrassed`.

## API contract

The hook calls `POST /v1/chat/completions` with the full message history and `"stream": true`, then reads OpenAI-style SSE deltas:

```
data: {"choices":[{"delta":{"content":"Hel"}}]}
data: {"choices":[{"delta":{"content":"lo"}}]}
data: [DONE]
```

Any OpenAI-compatible backend works out of the box.

## Backend (optional)

A small **Hono + Bun** API in `backend/`. Without it the app stores everything
in the browser's `localStorage` (single device). Set `VITE_API_URL` to switch to
**per-user accounts** with server-side storage.

- **Auth:** `POST /auth/register`, `POST /auth/login` → JWT. Passwords hashed with
  `Bun.password` (argon2). Multi-user.
- **Storage:** `GET/PUT/DELETE /data/:key` (JWT-guarded). Per-user key-value —
  keys mirror the old localStorage names: `conversations`, `active`, `tts`,
  `model`, `persona`.
- **DB:** `bun:sqlite` (file at `DB_PATH`). Swap to Postgres by editing
  `backend/src/db.ts` — the SQL is portable.

Env (`backend/.env`): `PORT`, `JWT_SECRET`, `DB_PATH`, `CORS_ORIGIN`.

```bash
bun run dev:api        # http://localhost:8787
```

## Project layout

```
frontend/
  src/
    components/
      Live2DStage.tsx          Pixi app + model, tap/mood reactions
      ChatPanel.tsx            message list + composer + model switcher
      ConversationSidebar.tsx  drawer: list, search, rename, delete
      SearchDialog.tsx         command-palette with date groups + keyboard nav
      LoginScreen.tsx          login / register screen
      ui/                      shadcn (Base UI) primitives
    hooks/
      useHermesChat.ts         SSE stream → message state + mood detection
      useConversations.ts      multi-conversation state (async hydrate)
      useAuth.ts               soft gate or backend JWT auth
      useSpeechRecognition.ts  Web Speech API STT
    lib/
      api.ts                   backend client (auth + data)
      store.ts                 unified persistence (server or localStorage)
      models.ts                model registry + per-model expression config
      mood.ts                  mood type, keyword detector, system prompt
      conversations.ts         conversation CRUD
  public/
    live2dcubismcore.min.js    Cubism Core runtime (loaded globally in index.html)
    models/                    Cubism 4 character models
backend/
  src/
    index.ts                   Hono app + CORS + route mounting
    db.ts                      bun:sqlite schema (users, user_data)
    auth.ts                    register / login → JWT
    data.ts                    per-user key-value store (JWT-guarded)
```

## Build

```bash
bun run build     # tsc -b && vite build
bun run preview
```

## Deployment

### Cloudflare Pages (Wrangler) — frontend only

```bash
cd frontend && bun run deploy    # build + wrangler deploy
```

### Docker Compose (full stack)

Builds both services. Frontend served by nginx; backend on Bun with the SQLite
file on a named volume. `VITE_*` vars bake into the frontend bundle at build
time — set them in a root `.env` (see `.env.example`).

```bash
cp .env.example .env          # compose vars (ports, VITE_*, FRONTEND_ORIGIN)
cp backend/.env.example backend/.env   # JWT_SECRET etc. — change the secret
docker compose up -d --build
```

- Frontend → http://localhost:8080
- Backend  → http://localhost:8787 (data persisted in the `backend-data` volume)

> ⚠️ `VITE_API_URL` is read by the **browser**, so it must be a URL the browser
> can reach (not the internal `backend` service name). Keep `VITE_API_URL` and
> the backend's `CORS_ORIGIN`/`FRONTEND_ORIGIN` pointing at how you actually
> serve the app (behind a reverse proxy, use your public domains).

### Frontend only (static, no backend)

Leave `VITE_API_URL` blank to fall back to localStorage + the soft auth gate,
then build just the frontend image:

```bash
docker build -t hermes-web \
  --build-arg VITE_HERMES_URL=https://your-api \
  --build-arg VITE_HERMES_API_KEY=your-key \
  --build-arg VITE_AUTH_USERNAME=admin \
  --build-arg VITE_AUTH_PASSWORD=change-me \
  ./frontend
docker run -p 80:80 hermes-web
```

### Dokploy

Step-by-step guide (domains, env, SSL, volume backup): **[DEPLOY-DOKPLOY.md](DEPLOY-DOKPLOY.md)**.

## Licensing / attribution

- **Cubism Core** (`public/live2dcubismcore.min.js`) — © Live2D Inc., distributed under the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html).
- Character models in `public/models/` are subject to their respective authors' terms. Review before commercial use.
