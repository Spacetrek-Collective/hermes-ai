# Hermes AI

AI live-chat with a **Live2D** character. Streams replies from an OpenAI-compatible API endpoint and renders them as Markdown in the chat panel.

![status](https://img.shields.io/badge/status-WIP-orange)

## Features

- 🎭 **Live2D model** rendered with PixiJS v7 + [`pixi-live2d-display-lipsyncpatch`](https://github.com/RaSan147/pixi-live2d-display)
- 🔀 **Model switcher** — swap characters at runtime, persisted to `localStorage`
- 😊 **Mood expressions** — AI response triggers character expressions via `[MOOD:*]` tags
- 🖐️ **Tap interaction** — tap the character to trigger random expressions
- 💬 **Streaming chat** via OpenAI-compatible `/v1/chat/completions` SSE with full message history
- 📝 **Markdown rendering** in assistant messages (bold, italic, code, lists, links)
- 🎙️ **Speech-to-text** — free, key-less voice input via the browser Web Speech API
- 🗂️ **Multiple conversations** persisted in `localStorage`
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

## Getting started

```bash
bun install
cp .env.example .env   # fill in your API key and URL
bun dev
```

Open http://localhost:7200.

## Environment

| Var | Description | Default |
|---|---|---|
| `VITE_AI_NAME` | Display name shown in the chat header | `Hermes` |
| `VITE_HERMES_URL` | OpenAI-compatible API base URL | `http://localhost:8642` |
| `VITE_HERMES_API_KEY` | Bearer token for the API | — |
| `VITE_HERMES_MODEL` | Model ID to pass in requests | `hermes-agent` |
| `VITE_HERMES_MOCK` | Stream a canned reply locally (no API needed) | `false` |

> 🎙️ STT needs **HTTPS** (or `localhost`) + mic permission. The mic button auto-hides where the Web Speech API is unavailable (e.g. Firefox).

## Models

Character models live in `public/models/`. Each model is registered in `src/lib/models.ts` with its mood expression mapping and tap expressions. The active model is persisted in `localStorage` under `hermes:model`.

| ID | Label |
|---|---|
| `changli` | Changli |
| `vivian` | Vivian |
| `camellya` | Camellya |
| `ellen` | Ellen |
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

## Project layout

```
src/
  components/
    Live2DStage.tsx          Pixi app + model, tap/mood reactions
    ChatPanel.tsx            message list + composer + model switcher
    ConversationSidebar.tsx  drawer: list, search, rename, delete
    SearchDialog.tsx         command-palette with date groups + keyboard nav
    ui/                      shadcn (Base UI) primitives
  hooks/
    useHermesChat.ts         SSE stream → message state + mood detection
    useConversations.ts      multi-conversation state + localStorage
    useSpeechRecognition.ts  Web Speech API STT
  lib/
    models.ts                model registry + per-model expression config
    mood.ts                  mood type, keyword detector, system prompt
    conversations.ts         localStorage CRUD
public/
  live2dcubismcore.min.js    Cubism Core runtime (loaded globally in index.html)
  models/                    Cubism 4 character models
```

## Build

```bash
bun run build     # tsc -b && vite build
bun run preview
```

## Deployment

### Cloudflare Pages (Wrangler)

```bash
bun run deploy    # build + wrangler deploy
```

### VPS / Dokploy (Docker)

`VITE_*` vars bake into the bundle at build time — pass them as build args:

```bash
docker build \
  --build-arg VITE_HERMES_URL=https://your-api \
  --build-arg VITE_HERMES_API_KEY=your-key \
  --build-arg VITE_HERMES_MODEL=hermes-agent \
  --build-arg VITE_AUTH_USERNAME=admin \
  --build-arg VITE_AUTH_PASSWORD=change-me \
  -t hermes-ai .

docker run -p 80:80 hermes-ai
```

In Dokploy: set the build args above in the application settings, expose port `80`.

## Licensing / attribution

- **Cubism Core** (`public/live2dcubismcore.min.js`) — © Live2D Inc., distributed under the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html).
- Character models in `public/models/` are subject to their respective authors' terms. Review before commercial use.
