import { loadValue, saveValue } from '@/lib/store'

export interface TTSProvider {
  id: string
  label: string
}

export const TTS_PROVIDERS: TTSProvider[] = [
  { id: 'edge', label: 'Edge (free)' },
  { id: 'minimax', label: 'Minimax' },
]

// Edge TTS voices (free, no key).
export interface TTSVoice {
  id: string
  label: string
}

export const EDGE_VOICES: TTSVoice[] = [
  { id: 'en-US-AriaNeural', label: 'English (Female)' },
  { id: 'id-ID-GadisNeural', label: 'Indonesian (Female)' },
  { id: 'ja-JP-NanamiNeural', label: 'Japanese (Female)' },
]

export const EDGE_DEFAULT_VOICE = EDGE_VOICES[0].id

export interface TTSConfig {
  provider: string
  enabled: boolean
  /** Edge TTS pitch offset in Hz (-100..100, 0 = default). */
  pitch: number
  /** Edge TTS voice id. */
  edgeVoice: string
  /** Minimax API key (moved here from env so it's user-configurable). */
  minimaxApiKey: string
  /** Minimax voice id. */
  minimaxVoice: string
}

const STORAGE_KEY = 'tts'

export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'edge',
  enabled: true,
  pitch: 0,
  edgeVoice: EDGE_DEFAULT_VOICE,
  minimaxApiKey: '',
  minimaxVoice: 'female-shaonv',
}

export async function loadTTSConfig(): Promise<TTSConfig> {
  const saved = await loadValue<Partial<TTSConfig> | null>(STORAGE_KEY, null)
  return saved ? { ...DEFAULT_TTS_CONFIG, ...saved } : { ...DEFAULT_TTS_CONFIG }
}

export function saveTTSConfig(config: TTSConfig) {
  saveValue(STORAGE_KEY, config)
}
