import { EdgeTTS } from 'edge-tts-universal/browser'
import type { SynthesizeOptions, TtsProvider, TtsResult } from './types'

const DEFAULT_VOICE =
  (import.meta.env.VITE_EDGE_TTS_VOICE as string | undefined) ??
  'en-US-AvaNeural'

/**
 * Microsoft Edge TTS via the browser build of edge-tts-universal.
 * The lib opens a WSS connection to Microsoft and handles the Sec-MS-GEC
 * token. If a corporate proxy / CSP blocks the WSS endpoint, route through a
 * server proxy instead (see VITE_TTS_PROXY) and swap this provider.
 */
export class EdgeTtsProvider implements TtsProvider {
  readonly name = 'edge'

  async synthesize(
    text: string,
    opts?: SynthesizeOptions,
  ): Promise<TtsResult> {
    const tts = new EdgeTTS(text, opts?.voice ?? DEFAULT_VOICE)
    const { audio } = await tts.synthesize()
    const blob = audio.type ? audio : new Blob([audio], { type: 'audio/mpeg' })
    return { url: URL.createObjectURL(blob), blob }
  }
}
