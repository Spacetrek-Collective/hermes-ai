import { EdgeTtsProvider } from './edgeTts'
import type { TtsProvider } from './types'

export type { TtsProvider, TtsResult, SynthesizeOptions } from './types'

let provider: TtsProvider | null = null

/** Returns the configured TTS provider (singleton). */
export function getTts(): TtsProvider {
  if (provider) return provider
  const choice = (import.meta.env.VITE_TTS_PROVIDER as string | undefined) ?? 'edge'
  switch (choice) {
    case 'edge':
    default:
      provider = new EdgeTtsProvider()
      // MiniMax: add `case 'minimax': provider = new MinimaxTtsProvider()` later.
      break
  }
  return provider
}
