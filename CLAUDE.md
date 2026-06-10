# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Runtime is **Bun** (scripts also work with npm/pnpm).

```bash
bun install
bun dev          # vite --host, serves on http://localhost:7200
bun run build    # tsc -b && vite build  (type-check then bundle)
bun run lint     # eslint .
bun run preview  # serve the built dist/
```

No test runner is configured — there are no tests.

Copy `.env.example` → `.env` before running. Without an API backend set `VITE_HERMES_MOCK=true` to stream canned replies.

## Architecture

Single-page React 19 + Vite + TypeScript app: a Live2D character over a streaming chat panel. No backend in this repo — chat hits any OpenAI-compatible `/v1/chat/completions` endpoint.

**Data flow:** `App.tsx` wires two hooks. `useConversations` owns the conversation list + active messages (persisted to `localStorage` via `lib/conversations.ts`). `useHermesChat(setMessages)` drives a single in-flight stream and writes assistant deltas back through that same setter.

**Streaming (`hooks/useHermesChat.ts`):** raw `fetch` + `ReadableStream` reader, manual SSE parse (split on `\n\n`, strip `data:`, JSON-parse, read `choices[0].delta.content`, stop on `[DONE]`). It keeps a `messagesRef` mirror of message state so it can build the full history payload without stale closures. An `AbortController` backs `stop()`. `MOCK` mode bypasses fetch and replays word-by-word. Config comes from `import.meta.env.VITE_HERMES_*`.

**Live2D (`components/Live2DStage.tsx`):** PixiJS `Application` + `Live2DModel` from `pixi-live2d-display-lipsyncpatch/cubism4`. Cubism Core runtime is loaded as a **global script in `index.html`** (`/live2dcubismcore.min.js`) — it must load before the app bundle, so it is not an npm import. Tap on Head/Body hit areas triggers motions/expressions.

## Constraints & conventions

- **PixiJS is pinned to v7.** `pixi-live2d-display` supports Pixi v6/v7 only — do NOT upgrade to v8.
- Path alias `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.app.json`).
- UI is shadcn/ui in **new-york** style built on **Base UI** primitives (`@base-ui-components/react`), not Radix. Tailwind **v4** (config-less, via `@tailwindcss/vite`; theme tokens live in `src/index.css`). `cn()` is in `lib/utils.ts`.
- TS is strict-ish: `noUnusedLocals`/`noUnusedParameters` on, and `verbatimModuleSyntax` — use `import type` for type-only imports. Lint allows unused names prefixed with `_`.
- STT (`useSpeechRecognition.ts`) uses the browser Web Speech API; requires HTTPS or localhost, unavailable in Firefox (mic button auto-hides).

## Environment variables

`VITE_AI_NAME`, `VITE_HERMES_URL`, `VITE_HERMES_API_KEY`, `VITE_HERMES_MODEL`, `VITE_HERMES_MOCK`, `VITE_MODEL_URL` (path to a `.model3.json`; defaults to bundled Haru sample in `public/models/`).
