import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_TTS_CONFIG, EDGE_DEFAULT_VOICE, loadTTSConfig, saveTTSConfig, type TTSConfig } from '@/lib/tts'
import { edgeTTS, geminiTTS } from '@/lib/api'

const MINIMAX_BASE =
  (import.meta.env.VITE_MINIMAX_BASE_URL as string | undefined) ??
  'https://api.minimax.io/v1'

// Env values are fallbacks only — the key + voice are now set in Settings.
const ENV_MINIMAX_API_KEY =
  (import.meta.env.VITE_MINIMAX_API_KEY as string | undefined) ?? ''

const ENV_MINIMAX_VOICE_ID =
  (import.meta.env.VITE_MINIMAX_VOICE_ID as string | undefined) ?? ''

export function useTTS() {
  const [config, setConfigState] = useState<TTSConfig>(DEFAULT_TTS_CONFIG)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const currentUrlRef = useRef<string | null>(null)

  // Hydrate from async storage after mount.
  useEffect(() => {
    let cancelled = false
    void loadTTSConfig().then((cfg) => {
      if (!cancelled) setConfigState(cfg)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const setConfig = useCallback((next: Partial<TTSConfig>) => {
    setConfigState((prev) => {
      const updated = { ...prev, ...next }
      saveTTSConfig(updated)
      return updated
    })
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  const speak = useCallback(
    async (text: string): Promise<string | null> => {
      if (!config.enabled || !text.trim()) return null

      stop()

      // Edge TTS (free) — synthesized by the backend, no API key needed.
      if (config.provider === 'edge') {
        setIsSpeaking(true)
        const voice = config.edgeVoice || EDGE_DEFAULT_VOICE
        const blob = await edgeTTS(text.trim(), voice, config.pitch)
        if (!blob) {
          console.warn('[TTS] Edge TTS failed (backend required / unreachable)')
          setIsSpeaking(false)
          return null
        }
        const url = URL.createObjectURL(blob)
        currentUrlRef.current = url
        setIsSpeaking(true)
        return url
      }

      // Gemini TTS — proxied through backend, user supplies API key.
      if (config.provider === 'gemini') {
        if (!config.geminiApiKey) {
          console.warn('[TTS] No Gemini API key set in Settings')
          return null
        }
        setIsSpeaking(true)
        const blob = await geminiTTS(
          text.trim(),
          config.geminiApiKey,
          config.geminiModel,
          config.geminiVoice,
          config.geminiScene,
        )
        if (!blob) {
          console.warn('[TTS] Gemini TTS failed (backend required / unreachable)')
          setIsSpeaking(false)
          return null
        }
        const url = URL.createObjectURL(blob)
        currentUrlRef.current = url
        setIsSpeaking(true)
        return url
      }

      const minimaxKey = config.minimaxApiKey || ENV_MINIMAX_API_KEY
      if (!minimaxKey) {
        console.warn('[TTS] No Minimax API key set in Settings')
        return null
      }

      const controller = new AbortController()
      abortRef.current = controller

      // Show voice loading indicator immediately when voice is ON
      setIsSpeaking(true)

      try {
        const endpoint = `${MINIMAX_BASE}/t2a_v2`
        console.log('[TTS] fetching from', endpoint)

        const voiceId =
          config.minimaxVoice || ENV_MINIMAX_VOICE_ID || 'female-shaonv'
        console.log('[TTS] using voice_id:', voiceId)

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${minimaxKey}`,
          },
          body: JSON.stringify({
            model: 'speech-01-turbo',
            text: text.trim(),
            stream: false,
            voice_setting: {
              voice_id: voiceId,
              speed: 1,
              vol: 1,
              pitch: 0,
            },
            audio_setting: {
              sample_rate: 32000,
              bitrate: 128000,
              format: 'mp3',
              channel: 1,
            },
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errText = await res.text().catch(() => '')
          console.error('[TTS] HTTP error', res.status, errText)
          throw new Error(`Minimax TTS responded ${res.status}: ${errText}`)
        }

        const data = await res.json()
        console.log('[TTS] response keys:', Object.keys(data))

        if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
          console.error('[TTS] API error', data.base_resp)
          throw new Error(`Minimax API error: ${data.base_resp?.status_msg || 'unknown'}`)
        }

        const base64Audio: string | undefined = data.data?.audio
        if (!base64Audio) {
          console.error('[TTS] No audio field in response. Full data:', data)
          throw new Error('No audio returned from Minimax TTS')
        }

        console.log('[TTS] audio length (chars):', base64Audio.length)
        console.log('[TTS] audio preview (first 80 chars):', base64Audio.slice(0, 80))

        // Detect encoding: base64 contains +/=, hex is only 0-9a-fA-F
        const isHex = /^[0-9a-fA-F\s]+$/.test(base64Audio)
        let blob: Blob

        if (isHex) {
          console.log('[TTS] detected hex encoding, converting...')
          const hex = base64Audio.replace(/\s/g, '')
          const bytes = new Uint8Array(hex.length / 2)
          for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
          }
          blob = new Blob([bytes], { type: 'audio/mpeg' })
        } else {
          // Clean base64 (remove whitespace/newlines)
          const cleanBase64 = base64Audio.replace(/\s/g, '')
          // Use fetch to decode base64 more reliably
          const dataUrl = `data:audio/mpeg;base64,${cleanBase64}`
          const audioRes = await fetch(dataUrl)
          blob = await audioRes.blob()
        }

        // Debug: check first bytes (MP3 should start with ID3 or FF FB/FF F3)
        const headerBytes = await blob.slice(0, 16).arrayBuffer()
        const header = new Uint8Array(headerBytes)
        const firstBytes = Array.from(header)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ')
        console.log('[TTS] first 16 bytes (hex):', firstBytes)

        const url = URL.createObjectURL(blob)
        currentUrlRef.current = url
        setIsSpeaking(true)
        console.log('[TTS] created blob URL:', url, 'size:', blob.size, 'bytes')

        // Test if browser can actually play this audio
        const testAudio = new Audio(url)
        await new Promise<void>((resolve) => {
          testAudio.oncanplay = () => {
            console.log('[TTS] Audio validated successfully (can play)')
            resolve()
          }
          testAudio.onerror = () => {
            console.error('[TTS] Audio validation FAILED - browser cannot decode this blob')
            resolve()
          }
          // Timeout fallback
          setTimeout(() => {
            console.warn('[TTS] Audio validation timeout')
            resolve()
          }, 2000)
        })

        return url
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[TTS] failed', err)
        }
        setIsSpeaking(false)
        return null
      }
    },
    [
      config.enabled,
      config.provider,
      config.pitch,
      config.edgeVoice,
      config.minimaxApiKey,
      config.minimaxVoice,
      config.geminiApiKey,
      config.geminiModel,
      config.geminiVoice,
      config.geminiScene,
      stop,
    ],
  )

  const onSpeakEnd = useCallback(() => {
    console.log('[TTS] speak ended')
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current)
      currentUrlRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  return {
    config,
    setConfig,
    speak,
    stop,
    isSpeaking,
    onSpeakEnd,
  }
}
