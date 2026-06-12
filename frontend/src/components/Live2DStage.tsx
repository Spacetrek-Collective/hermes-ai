import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Application, Ticker } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch/cubism4'
import type { Mood } from '@/lib/mood'
import type { ModelConfig } from '@/lib/models'

Live2DModel.registerTicker(Ticker)

export interface Live2DStageHandle {
  triggerMood: (mood: Mood) => void
  speak: (url: string, onFinish?: () => void) => void
  stopSpeaking: () => void
}

interface Live2DStageProps {
  model: ModelConfig
  className?: string
  onHit?: (area: string) => void
}

const FIT = 0.9

export const Live2DStage = forwardRef<Live2DStageHandle, Live2DStageProps>(
  ({ model, className, onHit }, ref) => {
    const onHitRef = useRef(onHit)
    onHitRef.current = onHit
    const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null)
    const modelConfigRef = useRef(model)
    modelConfigRef.current = model
    const containerRef = useRef<HTMLDivElement>(null)
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      triggerMood(mood: Mood) {
        const m = modelRef.current
        if (!m) return
        const expr = modelConfigRef.current.moodExpressions[mood]
        console.log('[Live2D] triggerMood', mood, expr)
        m.expression(expr)
      },
      speak(url: string, onFinish?: () => void) {
        const m = modelRef.current
        if (!m) {
          console.warn('[Live2D] no model loaded, skipping speak')
          onFinish?.()
          return
        }
        console.log('[Live2D] speak()', url)
        m.internalModel.motionManager
          .speak(url, {
            onFinish: () => {
              console.log('[Live2D] speak finished')
              onFinish?.()
            },
            onError: (e) => {
              console.error('[Live2D] speak error:', e?.message || e)
              onFinish?.()
            },
          })
          .catch((e: Error) => {
            console.error('[Live2D] speak promise rejected:', e?.message || e)
            onFinish?.()
          })
      },
      stopSpeaking() {
        const m = modelRef.current
        if (!m) return
        m.internalModel.motionManager.stopSpeaking()
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      let cancelled = false

      const app = new Application({
        resizeTo: container,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })
      container.appendChild(app.view as HTMLCanvasElement)

      const fit = (m: InstanceType<typeof Live2DModel>) => {
        const { width, height } = app.renderer.screen
        const scale = Math.min(width / m.internalModel.width, height / m.internalModel.height) * FIT
        m.scale.set(scale)
        m.position.set(width / 2, height / 2)
      }

      Live2DModel.from(model.url, { autoInteract: true })
        .then((m) => {
          if (cancelled) {
            m.destroy()
            return
          }
          modelRef.current = m
          m.anchor.set(0.5, 0.5)
          app.stage.addChild(m)
          fit(m)
          app.renderer.on('resize', () => fit(m))

          m.on('pointerdown', () => {
            const exprs = modelConfigRef.current.tapExpressions
            m.expression(exprs[Math.floor(Math.random() * exprs.length)])
            onHitRef.current?.('Body')
          })
        })
        .catch((err) => {
          console.error('[Live2D] failed to load model', err)
          if (!cancelled) setError('Failed to load Live2D model')
        })

      return () => {
        cancelled = true
        modelRef.current = null
        app.destroy(true, { children: true, texture: true })
      }
    }, [model.url])

    return (
      <div ref={containerRef} className={className}>
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    )
  },
)
