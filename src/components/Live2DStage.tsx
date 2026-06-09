import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Application, Ticker } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch/cubism4'

// Cubism Core is loaded as a global <script> in index.html; the lib drives
// motions/physics off the shared Pixi ticker.
Live2DModel.registerTicker(Ticker)

export interface SpeakOptions {
  volume?: number
  expression?: string | number
  resetExpression?: boolean
  onFinish?: () => void
  onError?: (err: unknown) => void
}

export interface Live2DHandle {
  /** Play audio (url or data-uri) and lip-sync the mouth to it. */
  speak: (audio: string, opts?: SpeakOptions) => void
  stopSpeaking: () => void
  setExpression: (name?: string | number) => void
  motion: (group: string, index?: number) => void
}

interface Live2DStageProps {
  modelUrl: string
  className?: string
  /** Fired when a hit area is tapped (e.g. "Head", "Body"). */
  onHit?: (area: string) => void
}

const FIT = 0.9 // fraction of the smaller container dimension the model fills

/**
 * Reaction per hit area name (as defined in the model's `HitAreas`).
 * Haru only defines Head + Body. A model with "Legs"/"Foot" hit areas would
 * just need another entry here.
 */
const HIT_REACTIONS: Record<
  string,
  { motion?: string; randomExpression?: boolean }
> = {
  Head: { motion: 'Tap', randomExpression: true },
  Body: { motion: 'Tap' },
}

const EXPRESSIONS = ['f00', 'f01', 'f02', 'f03', 'f04', 'f05', 'f06', 'f07']

export const Live2DStage = forwardRef<Live2DHandle, Live2DStageProps>(
  function Live2DStage({ modelUrl, className, onHit }, ref) {
    const onHitRef = useRef(onHit)
    onHitRef.current = onHit
    const containerRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<Application | null>(null)
    const modelRef = useRef<InstanceType<typeof Live2DModel> | null>(null)
    const [error, setError] = useState<string | null>(null)

    useImperativeHandle(ref, () => ({
      speak: (audio, opts) => {
        modelRef.current?.speak(audio, {
          volume: opts?.volume ?? 1,
          expression: opts?.expression,
          resetExpression: opts?.resetExpression ?? true,
          onFinish: opts?.onFinish,
          onError: opts?.onError,
        })
      },
      stopSpeaking: () => modelRef.current?.stopSpeaking(),
      setExpression: (name) => modelRef.current?.expression(name),
      motion: (group, index) => {
        void modelRef.current?.motion(group, index)
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
      appRef.current = app
      container.appendChild(app.view as HTMLCanvasElement)

      const fit = (model: InstanceType<typeof Live2DModel>) => {
        const { width, height } = app.renderer.screen
        // Use the model's intrinsic (unscaled) size — model.width/height return
        // the *already-scaled* bounds, which compounds on every resize.
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

          // Tap interaction: react per hit area (head/body/…).
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
        appRef.current = null
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
