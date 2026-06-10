export interface TTSProvider {
  id: string
  label: string
}

export const TTS_PROVIDERS: TTSProvider[] = [
  { id: 'minimax', label: 'Minimax' },
]

export interface TTSConfig {
  provider: string
  voice: string
  enabled: boolean
}

const STORAGE_KEY = 'hermes:tts'

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'minimax',
  voice: 'female-shaonv',
  enabled: true,
}

export function loadTTSConfig(): TTSConfig {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      return { ...DEFAULT_TTS_CONFIG, ...JSON.parse(saved) }
    } catch {
      /* ignore */
    }
  }
  return { ...DEFAULT_TTS_CONFIG }
}

export function saveTTSConfig(config: TTSConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
