import { useEffect, useRef, useState } from 'react'
import { Application, Ticker } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch/cubism4'

Live2DModel.registerTicker(Ticker)

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

export function Live2DStage({ modelUrl, className, onHit }: Live2DStageProps) {
  const onHitRef = useRef(onHit)
  onHitRef.current = onHit
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

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
}
