import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Application, Ticker } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch/cubism4'
import type { Mood } from '@/lib/mood'
import { MOOD_REACTIONS } from '@/lib/mood'

Live2DModel.registerTicker(Ticker)

export interface Live2DStageHandle {
  triggerMood: (mood: Mood) => void
}

interface Live2DStageProps {
  modelUrl: string
  className?: string
  onHit?: (area: string) => void
}

const FIT = 0.9

const HIT_REACTIONS: Record<
  string,
  { motion?: string; randomExpression?: boolean }
> = {
  Head: { motion: 'Tap', randomExpression: true },
  Body: { motion: 'Tap' },
}

const EXPRESSIONS = ['f00', 'f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07']

export const Live2DStage = forwardRef<Live2DStageHandle, Live2DStageProps>(
  ({ modelUrl, className, onHit }, ref) => {
    const onHitRef = useRef(onHit)
    onHitRef.current = onHit
    const containerRef = useRef<HTMLDivElement>(null)
    const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null)
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      triggerMood(mood: Mood) {
        const model = modelRef.current
        if (!model) return
        const r = MOOD_REACTIONS[mood]
        console.log('[Live2D] triggerMood', mood, r)
        model.expression(r.expression)
        if (r.motion) void model.motion(r.motion)
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

      const fit = (model: InstanceType<typeof Live2DModel>) => {
        const { width, height } = app.renderer.screen
        const baseW = model.internalModel.width
        const baseH = model.internalModel.height
        const scale = Math.min(width / baseW, height / baseH) * FIT
        model.scale.set(scale)
        model.position.set(width / 2, height / 2)
      }

      Live2DModel.from(modelUrl, { autoInteract: true })
        .then((model) => {
          if (cancelled) {
            model.destroy()
            return
          }
          modelRef.current = model
          model.anchor.set(0.5, 0.5)
          app.stage.addChild(model)
          fit(model)
          app.renderer.on('resize', () => fit(model))

          model.on('hit', (areas: string[]) => {
            for (const area of areas) {
              const r = HIT_REACTIONS[area]
              if (r?.motion) void model.motion(r.motion)
              if (r?.randomExpression) {
                model.expression(
                  EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)],
                )
              }
              onHitRef.current?.(area)
            }
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
    }, [modelUrl])

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
