# Hermes AI

AI live-chat with a **Live2D** character that speaks replies with synced mouth movement (lip-sync). Streaming text from a Hermes agent → per-sentence TTS → audio drives the model's mouth in real time.

![status](https://img.shields.io/badge/status-WIP-orange)

## Features

- 🎭 **Live2D model** rendered with PixiJS v7 + [`pixi-live2d-display-lipsyncpatch`](https://github.com/RaSan147/pixi-live2d-display)
- 👄 **Lip-sync** — TTS audio amplitude drives `ParamMouthOpenY`
- 🗣️ **Edge TTS** via Vite Node middleware proxy — free, no API key, female voice (`en-US-JennyNeural`), works in every browser
- 🎙️ **Speech-to-text** — free, key-less voice input via the browser Web Speech API
- 💬 **Streaming chat** over SSE — sentences synthesized eagerly in parallel, played in order (first audio fires ~1s after first sentence, not after full reply)
- 🖐️ **Tap interaction** — touch head/body to trigger motions + expressions
- 🗂️ **Multiple conversations** (ChatGPT/Claude-style) persisted in `localStorage`
- 🔍 **Command-palette search** (`Cmd`/`Ctrl`+`K`) with date grouping + keyboard nav; rename/delete chats
- 🌸 **Moe-pink** accent theme (light + dark)
- 🔤 **Rubik** font
- 📱 Responsive — overlay chat panel + collapsible drawer sidebar

## Tech stack

| | |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Styling | Tailwind v4 + shadcn/ui (Base UI primitives) |
| Font | Rubik (Google Fonts) |
| Live2D | PixiJS **v7** (pinned), `pixi-live2d-display-lipsyncpatch` (Cubism 4) |
| TTS | `edge-tts-universal` via Vite Node middleware (dev) / `VITE_TTS_PROXY` (prod) |
| STT | Web Speech API (browser-native) |
| Runtime | Bun |

> ⚠️ `pixi-live2d-display` supports PixiJS **v6/v7 only — not v8**. Keep Pixi pinned to v7.

## Getting started

```bash
bun install
cp .env.example .env   # edit values as needed
bun dev
```

Open http://localhost:5173.

### Environment

| Var | Description | Default |
|---|---|---|
| `VITE_HERMES_URL` | Hermes agent SSE chat endpoint (POST) | `http://localhost:8000/chat` |
| `VITE_HERMES_MOCK` | Stream canned reply locally (no agent needed) | `false` |
| `VITE_MODEL_URL` | Live2D `.model3.json` entry | bundled Haru sample |
| `VITE_EDGE_TTS_VOICE` | Edge TTS voice id | `en-US-JennyNeural` |
| `VITE_TTS_PROXY` | Production `/api/tts` endpoint (Vite middleware is dev-only) | — |
| `VITE_STT_LANG` | Speech-to-text language (Web Speech API) | browser language |

> 🎙️ STT needs **HTTPS** (or `localhost`) + mic permission, and runs on Chromium/Safari.
> The mic button auto-hides where the Web Speech API is unavailable (e.g. Firefox).

### Production TTS

The Vite middleware (`vite-plugin-edge-tts.ts`) only runs in dev. For production, deploy a `/api/tts?voice=…&text=…` endpoint (Node, Cloudflare Worker, etc.) using `edge-tts-universal`, then set `VITE_TTS_PROXY` to its URL.

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
    SearchDialog.tsx       command-palette search with date groups + keyboard nav
    ui/                    shadcn (Base UI) primitives
  hooks/
    useHermesChat.ts       SSE stream → per-sentence TTS queue → lip-sync
    useConversations.ts    multi-conversation state + localStorage
    useSpeechRecognition.ts Web Speech API STT
  tts/
    types.ts               TtsProvider interface
    edgeProxyTts.ts        Edge TTS via /api/tts proxy
    index.ts               provider factory
  lib/conversations.ts     localStorage CRUD
public/
  live2dcubismcore.min.js  Cubism Core runtime (loaded globally in index.html)
  models/haru/             sample Cubism 4 model
vite-plugin-edge-tts.ts    dev middleware: runs edge-tts-universal in Node
docs/PRD.md                full product/requirements doc
```

## Swapping the TTS provider

Implement `TtsProvider` (`src/tts/types.ts`) and register it in `src/tts/index.ts`:

```ts
case 'minimax':
  provider = new MinimaxTtsProvider()
  break
```

`synthesize(text)` must return `{ url: string }` where `url` is a playable object-URL; the speak queue revokes it after playback.

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
