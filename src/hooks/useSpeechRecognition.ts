import { useCallback, useEffect, useRef, useState } from 'react'

const STT_LANG =
  (import.meta.env.VITE_STT_LANG as string | undefined) ||
  (typeof navigator !== 'undefined' ? navigator.language : 'en-US') ||
  'en-US'

interface UseSpeechRecognitionOptions {
  lang?: string
  /** Called with the running transcript (interim + final) while listening. */
  onTranscript?: (text: string) => void
}

/**
 * Free, key-less speech-to-text via the browser's Web Speech API
 * (Chrome/Edge/Safari). Returns interim results live; on stop the latest
 * transcript stays in the input for editing.
 */
export function useSpeechRecognition({
  lang = STT_LANG,
  onTranscript,
}: UseSpeechRecognitionOptions = {}) {
  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const cbRef = useRef(onTranscript)
  cbRef.current = onTranscript

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!supported || recognitionRef.current) return
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Ctor) return

    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      cbRef.current?.(text)
    }
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      // "aborted"/"no-speech" are benign — don't surface them.
      if (e.error !== 'aborted' && e.error !== 'no-speech') setError(e.error)
    }
    recognition.onend = () => {
      setListening(false)
      recognitionRef.current = null
    }

    setError(null)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [lang, supported])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported, listening, error, start, stop, toggle }
}
