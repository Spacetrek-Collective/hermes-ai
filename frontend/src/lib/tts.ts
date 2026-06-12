import { loadValue, saveValue } from '@/lib/store'

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

const STORAGE_KEY = 'tts'

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'minimax',
  voice: 'female-shaonv',
  enabled: true,
}

export async function loadTTSConfig(): Promise<TTSConfig> {
  const saved = await loadValue<Partial<TTSConfig> | null>(STORAGE_KEY, null)
  return saved ? { ...DEFAULT_TTS_CONFIG, ...saved } : { ...DEFAULT_TTS_CONFIG }
}

export function saveTTSConfig(config: TTSConfig) {
  saveValue(STORAGE_KEY, config)
}
