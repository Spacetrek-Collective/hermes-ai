import type { SynthesizeOptions, TtsProvider, TtsResult } from './types'

// Same-origin dev middleware by default (see vite-plugin-edge-tts.ts); override
// with VITE_TTS_PROXY to point at your own server endpoint in production.
const PROXY = (import.meta.env.VITE_TTS_PROXY as string | undefined) ?? '/api/tts'
const DEFAULT_VOICE =
  (import.meta.env.VITE_EDGE_TTS_VOICE as string | undefined) ??
  'en-US-JennyNeural' // female

/**
 * Edge TTS via a server proxy. Free (no API key) and returns real mp3 bytes,
 * so audio plays AND drives lip-sync, in every browser.
 */
export class EdgeProxyTtsProvider implements TtsProvider {
  readonly name = 'edge'

  async synthesize(
    text: string,
    opts?: SynthesizeOptions,
  ): Promise<TtsResult> {
    const voice = opts?.voice ?? DEFAULT_VOICE
    const url = `${PROXY}?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`
    const res = await fetch(url, { signal: opts?.signal })
    if (!res.ok) throw new Error(`Edge TTS proxy ${res.status}`)
    const blob = await res.blob()
    return { url: URL.createObjectURL(blob), blob }
  }
}
