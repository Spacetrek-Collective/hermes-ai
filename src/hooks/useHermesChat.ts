import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react'
import type { Live2DHandle } from '@/components/Live2DStage'
import { getTts } from '@/tts'
import type { ChatMessage } from '@/types/hermes'

const HERMES_URL =
  (import.meta.env.VITE_HERMES_URL as string | undefined) ??
  'http://localhost:8000/chat'

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)

/** Split off complete sentences from a buffer, returning [sentences, rest]. */
function takeSentences(buffer: string): [string[], string] {
  const sentences: string[] = []
  const re = /[^.!?。！？]*[.!?。！？]+\s*/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(buffer))) {
    const s = m[0].trim()
    if (s) sentences.push(s)
    lastIndex = re.lastIndex
  }
  return [sentences, buffer.slice(lastIndex)]
}

export function useHermesChat(
  live2dRef: RefObject<Live2DHandle | null>,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // --- ordered TTS → lip-sync queue --------------------------------------
  const speakQueue = useRef<Promise<void>>(Promise.resolve())

  const enqueueSpeak = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean) return
      speakQueue.current = speakQueue.current.then(async () => {
        try {
          const { url } = await getTts().synthesize(clean)
          setIsSpeaking(true)
          await new Promise<void>((resolve) => {
            live2dRef.current?.speak(url, {
              resetExpression: true,
              onFinish: () => {
                URL.revokeObjectURL(url)
                resolve()
              },
              onError: () => {
                URL.revokeObjectURL(url)
                resolve()
              },
            })
            // No model mounted yet → don't hang the queue.
            if (!live2dRef.current) resolve()
          })
        } catch (err) {
          console.error('[tts] synthesize failed', err)
        } finally {
          setIsSpeaking(false)
        }
      })
    },
    [live2dRef],
  )

  const appendToAssistant = useCallback(
    (id: string, chunk: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: m.content + chunk } : m,
        ),
      )
    },
    [setMessages],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      const prompt = text.trim()
      if (!prompt || isStreaming) return

      setError(null)
      const userMsg: ChatMessage = { id: uid(), role: 'user', content: prompt }
      const assistantId = uid()
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '', streaming: true },
      ])
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      let ttsBuffer = '' // text not yet sent to TTS

      try {
        const res = await fetch(HERMES_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({ prompt }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          throw new Error(`Hermes responded ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let sseBuffer = ''

        const handleToken = (tok: string) => {
          if (!tok) return
          appendToAssistant(assistantId, tok)
          ttsBuffer += tok
          const [sentences, rest] = takeSentences(ttsBuffer)
          ttsBuffer = rest
          sentences.forEach(enqueueSpeak)
        }

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          sseBuffer += decoder.decode(value, { stream: true })

          // Process complete SSE records (separated by a blank line).
          let sep: number
          while ((sep = sseBuffer.indexOf('\n\n')) !== -1) {
            const record = sseBuffer.slice(0, sep)
            sseBuffer = sseBuffer.slice(sep + 2)
            let eventType = 'token'
            const dataLines: string[] = []
            for (const line of record.split('\n')) {
              if (line.startsWith('event:')) eventType = line.slice(6).trim()
              else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
            }
            const data = dataLines.join('\n')
            if (eventType === 'done' || data === '[DONE]') {
              sseBuffer = ''
              break
            }
            // data may be JSON {text} or a raw token string.
            let tok = data
            try {
              const parsed = JSON.parse(data)
              tok = typeof parsed === 'string' ? parsed : (parsed.text ?? '')
            } catch {
              /* raw string token */
            }
            handleToken(tok)
          }
        }

        // Flush any trailing partial sentence to TTS.
        if (ttsBuffer.trim()) enqueueSpeak(ttsBuffer)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('[hermes] stream failed', err)
          setError((err as Error).message)
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        )
      }
    },
    [appendToAssistant, enqueueSpeak, isStreaming, setMessages],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    live2dRef.current?.stopSpeaking()
  }, [live2dRef])

  return { isStreaming, isSpeaking, error, sendMessage, stop }
}
