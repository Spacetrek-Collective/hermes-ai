# Hermes AI

AI live-chat with a **Live2D** character that speaks replies with synced mouth movement (lip-sync). Streaming text from a Hermes agent → client-side TTS → audio drives the model's mouth.

![status](https://img.shields.io/badge/status-WIP-orange)

## Features

- 🎭 **Live2D model** rendered with PixiJS v7 + [`pixi-live2d-display-lipsyncpatch`](https://github.com/RaSan147/pixi-live2d-display)
- 👄 **Lip-sync** — TTS audio amplitude drives `ParamMouthOpenY`
- 🗣️ **Client-side TTS** behind a swappable provider (Edge TTS now, MiniMax later)
- 🎙️ **Speech-to-text** — free, key-less voice input via the browser Web Speech API
- 💬 **Streaming chat** over SSE, with a sentence-chunked speak queue (audio starts before the full reply finishes)
- 🖐️ **Tap interaction** — touch head/body to trigger motions + expressions
- 🗂️ **Multiple conversations** (ChatGPT/Claude-style) persisted in `localStorage`
- 🔍 **Command-palette search** (`Cmd`/`Ctrl`+`K`) with date grouping + keyboard nav; rename/delete chats
- 🌸 **Moe-pink** accent theme (light + dark)
- 📱 Responsive — overlay chat panel + collapsible drawer sidebar

## Tech stack

| | |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Styling | Tailwind v4 + shadcn/ui (Base UI primitives) |
| Live2D | PixiJS **v7** (pinned), `pixi-live2d-display-lipsyncpatch` (Cubism 4) |
| TTS | `edge-tts-universal` (browser) |
| STT | Web Speech API (browser-native) |
| Runtime | Bun |

> ⚠️ `pixi-live2d-display` supports PixiJS **v6/v7 only — not v8**. Keep Pixi pinned to v7.

## Getting started

```bash
bun install
cp .env.example .env   # then edit values
bun dev
```

Open http://localhost:5173.

### Environment

| Var | Description | Default |
|---|---|---|
| `VITE_HERMES_URL` | Hermes agent SSE chat endpoint (POST) | `http://localhost:8000/chat` |
| `VITE_MODEL_URL` | Live2D `.model3.json` entry | bundled Haru sample |
| `VITE_TTS_PROVIDER` | `edge` \| `minimax` | `edge` |
| `VITE_EDGE_TTS_VOICE` | Edge TTS voice id | `en-US-AvaNeural` |
| `VITE_STT_LANG` | Speech-to-text language (Web Speech API) | browser language |

> 🎙️ STT needs **HTTPS** (or `localhost`) + mic permission, and runs on Chromium/Safari.
> The mic button auto-hides where the Web Speech API is unavailable (e.g. Firefox).

## Hermes agent contract

The chat hook `POST`s `{ "prompt": "…" }` and reads an SSE stream:

```
event: token
data: {"text":"Hel"}

event: token
data: {"text":"lo"}

event: done
data: {}
```

The parser also accepts raw-string `data:` tokens and a `[DONE]` sentinel. Adjust
`src/hooks/useHermesChat.ts` if your agent's shape differs.

## Project layout

```
src/
  components/
    Live2DStage.tsx        Pixi app + model, imperative speak/expression/motion
    ChatPanel.tsx          message list + composer (shadcn)
    ConversationSidebar.tsx drawer: list, search, rename, delete
    ui/                    shadcn (Base UI) primitives
  hooks/
    useHermesChat.ts       SSE stream → text + TTS lip-sync queue
    useConversations.ts    multi-conversation state + localStorage
  tts/                     TtsProvider interface + Edge TTS impl
  lib/conversations.ts     storage CRUD
public/
  live2dcubismcore.min.js  Cubism Core runtime (loaded globally in index.html)
  models/haru/             sample Cubism 4 model
docs/PRD.md                full product/requirements doc
```

## Swapping the TTS provider

Implement `TtsProvider` (`src/tts/types.ts`) and register it in `src/tts/index.ts`:

```ts
case 'minimax':
  provider = new MinimaxTtsProvider()
  break
```

`synthesize(text)` must return an object-URL of playable audio; the speak queue
revokes it after playback.

## Build

```bash
bun run build     # tsc -b && vite build
bun run preview
```

## Licensing / attribution

This repo bundles third-party Live2D assets for convenience:

- **Cubism Core** (`public/live2dcubismcore.min.js`) — © Live2D Inc., distributed
  under the [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html).
- **Haru sample model** (`public/models/haru/`) — © Live2D Inc., [Free Material License](https://www.live2d.com/eula/live2d-free-material-license-agreement_en.html).

Review those terms before using commercially. To ship your own model, drop it in
`public/models/` and point `VITE_MODEL_URL` at it.
