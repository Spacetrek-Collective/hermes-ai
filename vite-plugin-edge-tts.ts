import type { Plugin } from 'vite'

const DEFAULT_VOICE = 'en-US-JennyNeural' // female

/**
 * Dev-only middleware that runs Edge TTS server-side (Node), so the browser
 * can fetch real mp3 audio same-origin from `/api/tts` — no API key, and it
 * works in every browser (the browser build of edge-tts only works in MS Edge).
 *
 * For production, expose an equivalent `/api/tts` from your own server and
 * point VITE_TTS_PROXY at it.
 */
export function edgeTtsDev(): Plugin {
  return {
    name: 'edge-tts-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/tts')) return next()
        const url = new URL(req.url, 'http://localhost')
        const text = url.searchParams.get('text')
        const voice = url.searchParams.get('voice') || DEFAULT_VOICE
        if (!text) {
          res.statusCode = 400
          res.end('missing text')
          return
        }
        try {
          const { EdgeTTS } = await import('edge-tts-universal')
          const result = await new EdgeTTS(text, voice).synthesize()
          const buf = Buffer.from(await result.audio.arrayBuffer())
          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Cache-Control', 'no-store')
          res.end(buf)
        } catch (err) {
          console.error('[edge-tts-dev] synth failed', err)
          res.statusCode = 500
          res.end(String(err))
        }
      })
    },
  }
}
