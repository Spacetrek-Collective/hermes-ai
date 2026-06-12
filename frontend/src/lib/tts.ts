import { loadValue, saveValue } from '@/lib/store'

export interface TTSProvider {
  id: string
  label: string
}

export const TTS_PROVIDERS: TTSProvider[] = [
  { id: 'edge', label: 'Edge (free)' },
  { id: 'minimax', label: 'Minimax' },
]

// Default voice used for the Edge provider (overridable per config).
export const EDGE_DEFAULT_VOICE = 'en-US-AriaNeural'

export interface TTSConfig {
  provider: string
  voice: string
  enabled: boolean
  /** Edge TTS pitch offset in Hz (-100..100, 0 = default). */
  pitch: number
}

const STORAGE_KEY = 'tts'

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'edge',
  voice: 'female-shaonv',
  enabled: true,
  pitch: 0,
}

export async function loadTTSConfig(): Promise<TTSConfig> {
  const saved = await loadValue<Partial<TTSConfig> | null>(STORAGE_KEY, null)
  return saved ? { ...DEFAULT_TTS_CONFIG, ...saved } : { ...DEFAULT_TTS_CONFIG }
}

export function saveTTSConfig(config: TTSConfig) {
  saveValue(STORAGE_KEY, config)
}
