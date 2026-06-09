# Hermes AI — Live Chat with Live2D Model

## Context

`hermes-ai/` started as a bare **React 19 + Vite + TypeScript** boilerplate. Goal: an AI live-chat app where a **Live2D 2D character** speaks the agent's replies with synced mouth movement (lip-sync).

### Decisions
- **Agent transport**: Hermes exposes an **SSE / streaming HTTP** chat endpoint (text token stream only).
- **Voice**: **TTS + lip-sync, done client-side** behind a swappable `TtsProvider` interface. **Starter = Edge TTS** (free); **later = MiniMax TTS**. Frontend gets audio bytes → plays → drives model mouth from the audio.
- **UI**: **Tailwind v4** + **shadcn/ui** with **Base UI** primitives (not Radix).
- **Model**: start with a **free sample** Cubism 4 model (e.g. Hiyori/Haru), swap later.

### Hard constraints
- **`pixi-live2d-display` supports PixiJS v6/v7 — NOT v8.** Pin Pixi to **v7**.
- Lip-sync uses the fork **`pixi-live2d-display-lipsyncpatch`** (RaSan147) — adds `model.speak(audio, {...})` driving the mouth param from real audio amplitude; built for Pixi v7.
- **Cubism Core runtime** (`live2dcubismcore.min.js`) is proprietary — load as a **global `<script>`** in `index.html`, cannot npm-bundle.
- Pixi is driven **imperatively** in a container ref. We do NOT use `@pixi/react`.

## Architecture

```
┌─────────────────────────────────────────────┐
│ React App (Vite)                            │
│  ┌──────────────┐      ┌──────────────────┐ │
│  │ Live2DStage  │      │ ChatPanel        │ │
│  │ (Pixi canvas │◄─────│ messages + input │ │
│  │  + model)    │ speak└──────────────────┘ │
│  └──────▲───────┘             │ send        │
│  ┌──────┴──────────────────────▼──────────┐ │
│  │ useHermesChat() hook                    │ │
│  │  - POST prompt, read SSE text stream    │ │
│  │  - accumulate text tokens               │ │
│  │  - text done → tts.synthesize(text)     │ │
│  │      → blob URL → model.speak(url)      │ │
│  └────────┬────────────────────┬───────────┘ │
└───────────┼────────────────────┼─────────────┘
            │ SSE (text)         │ TtsProvider
     ┌──────▼───────┐     ┌──────▼──────────────┐
     │ Hermes Agent │     │ Edge TTS (→ MiniMax)│
     └──────────────┘     └─────────────────────┘
```

## Implementation Steps

### 0. Styling foundation — Tailwind v4 + shadcn/ui (Base UI)
- Tailwind v4 via `@tailwindcss/vite` plugin; `@import "tailwindcss"` in `src/index.css`. No `tailwind.config.js` in v4.
- Init shadcn/ui with the **Base UI** primitive set; pull `button`, `input`, `scroll-area`, `card`, `avatar` into `src/components/ui/`.
- Path alias `@/*` (`tsconfig` + `vite.config.ts`).

### 1. Dependencies & runtime
- `pixi.js@^7`, `pixi-live2d-display-lipsyncpatch` (use `/cubism4` entry for Hiyori/Haru).
- `public/live2dcubismcore.min.js` referenced in `index.html` **before** app bundle.
- `Live2DModel.registerTicker(Ticker)` so motions/physics update.
- Sample model under `public/models/<name>/` (`.model3.json`, textures, motions, physics, expressions).

### 2. `Live2DStage` — `src/components/Live2DStage.tsx`
- Pixi `Application` mounted in a `<div ref>`; load model; scale + center; resize handling.
- Imperative handle (`useImperativeHandle`): `speak(audioUrl, opts)`, `setExpression(name)`, `motion(group)`.
- Idle: breathing + random idle motion; auto-blink (lib default). Cleanup on unmount.

### 3. TTS provider layer — `src/tts/`
- `TtsProvider` interface: `synthesize(text, opts?): Promise<string>` → blob/object URL (mp3/wav).
- `edgeTts.ts` (starter): browser-capable Edge TTS port; pick voice (e.g. `en-US-AvaNeural`).
  - **CORS risk**: MS WSS endpoint uses `Sec-MS-GEC` token + origin checks. If blocked, add Vite dev proxy or tiny worker proxy returning mp3.
- `minimaxTts.ts` (later): same interface, MiniMax `t2a` API via proxy. Swap via factory.
- `index.ts`: factory from `VITE_TTS_PROVIDER` (default `edge`).

### 4. `useHermesChat` — `src/hooks/useHermesChat.ts`
- `sendMessage(text)`: POST to Hermes, read body stream, parse SSE `data:` lines, accumulate tokens (typewriter).
- On `done` → `tts.synthesize(fullText)` → `live2dRef.speak(url)` → revoke URL after playback.
- Enhancement: sentence-chunk stream (`.!?。`) → synth+speak per sentence with a speak queue.
- State: `messages[]`, `isStreaming`, `isSpeaking`, `error`. Endpoint from `VITE_HERMES_URL`.
- **Assumed SSE contract** (confirm w/ backend): `event: token data: {"text":"..."}`, `event: done data: {}`.

### 5. `ChatPanel` — `src/components/ChatPanel.tsx`
- shadcn components: `ScrollArea`, `Input`, `Button`, `Card`, `Avatar`. Streaming/speaking indicator; input disabled while streaming.
- Overlay layout: model fills background, glass chat panel docked right/bottom.

### 6. Wire `App.tsx`
- Render `<Live2DStage ref>` + `<ChatPanel>`; pass `live2dRef` into `useHermesChat`.

### 7. Styling
- Tailwind utilities only. Remove boilerplate `App.css`; keep Tailwind import + shadcn theme tokens in `src/index.css`.

## Open items to confirm
- Hermes: endpoint path + request body (`{prompt, sessionId?}`) and SSE event shape (assumed above).
- Hermes CORS: add Vite dev proxy if cross-origin.
- Edge TTS: verify browser port works client-side; else stand up mp3 proxy.

## Verification
1. `bun install`, `bun dev` — Cubism Core loads (no `Live2DCubismCore is undefined`), model renders + idles.
2. Send message → assistant text streams into panel.
3. On reply complete → audio synthesizes, plays, mouth moves in sync; expression resets.
4. Resize → model + panel stay laid out.
5. `bun run build` passes with Pixi pinned to v7.
