import { EdgeProxyTtsProvider } from './edgeProxyTts'
import type { TtsProvider } from './types'

export type { TtsProvider, TtsResult, SynthesizeOptions } from './types'

let provider: TtsProvider | null = null

/** Returns the configured audio TTS provider (singleton). */
export function getTts(): TtsProvider {
  if (provider) return provider
  // Server-proxied Edge TTS (free, no key, real audio + lip-sync).
  provider = new EdgeProxyTtsProvider()
  return provider
}
