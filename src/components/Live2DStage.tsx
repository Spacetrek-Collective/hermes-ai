import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Application, Ticker } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch/cubism4'
import type { Mood } from '@/lib/mood'
import type { ModelConfig } from '@/lib/models'
import { Live2DController } from '@/lib/live2dController'

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
    const controllerRef = useRef<Live2DController | null>(null)
    const appRef = useRef<Application | null>(null)
    const isSpeakingRef = useRef(false)

    useImperativeHandle(ref, () => ({
      triggerMood(mood: Mood) {
        const m = modelRef.current
        if (!m) return
        const expr = modelConfigRef.current.moodExpressions[mood]
        console.log('[Live2D] triggerMood', mood, expr)

        // Apply expression
        m.expression(expr)

        // Trigger corresponding gesture
        controllerRef.current?.resetToNeutral(200)
        setTimeout(() => {
          switch (mood) {
            case 'happy':
              controllerRef.current?.transitionTo(
                {
                  ParamAngleY: -3,
                  ParamBodyAngleY: -2,
                  ParamEyeLOpen: 1.1,
                  ParamEyeROpen: 1.1,
                },
                300,
              )
              break
            case 'sad':
              controllerRef.current?.transitionTo(
                {
                  ParamAngleY: 5,
                  ParamAngleZ: 2,
                  ParamBodyAngleY: 3,
                  ParamBrowLY: 1,
                  ParamBrowRY: 1,
                  ParamEyeLOpen: 0.8,
                  ParamEyeROpen: 0.8,
                },
                400,
              )
              break
            case 'surprised':
              controllerRef.current?.triggerSurprise()
              break
            case 'angry':
              controllerRef.current?.transitionTo(
                {
                  ParamAngleX: 2,
                  ParamBrowLY: 0.5,
                  ParamBrowRY: 0.5,
                  ParamEyeLOpen: 0.9,
                  ParamEyeROpen: 0.9,
                },
                250,
              )
              break
            case 'embarrassed':
              controllerRef.current?.transitionTo(
                {
                  ParamAngleY: 3,
                  ParamAngleZ: -2,
                  ParamEyeLOpen: 0.7,
                  ParamEyeROpen: 0.7,
                  ParamCheek: 0.6,
                },
                300,
              )
              break
            case 'neutral':
            default:
              controllerRef.current?.resetToNeutral(300)
              break
          }
        }, 250)
      },
      speak(url: string, onFinish?: () => void) {
        const m = modelRef.current
        if (!m) {
          console.warn('[Live2D] no model loaded, skipping speak')
          onFinish?.()
          return
        }
        console.log('[Live2D] speak()', url)

        isSpeakingRef.current = true
        controllerRef.current?.setSpeaking(true)

        // Play a gesture before speaking
        controllerRef.current?.transitionTo(
          {
            ParamAngleY: -2,
            ParamBodyAngleY: -1,
            ParamEyeLOpen: 1,
            ParamEyeROpen: 1,
          },
          200,
        )

        m.internalModel.motionManager
          .speak(url, {
            onFinish: () => {
              console.log('[Live2D] speak finished')
              isSpeakingRef.current = false
              controllerRef.current?.setSpeaking(false)
              onFinish?.()
            },
            onError: (e) => {
              console.error('[Live2D] speak error:', e?.message || e)
              isSpeakingRef.current = false
              controllerRef.current?.setSpeaking(false)
              onFinish?.()
            },
          })
          .catch((e: Error) => {
            console.error('[Live2D] speak promise rejected:', e?.message || e)
            isSpeakingRef.current = false
            controllerRef.current?.setSpeaking(false)
            onFinish?.()
          })
      },
      stopSpeaking() {
        const m = modelRef.current
        if (!m) return
        m.internalModel.motionManager.stopSpeaking()
        isSpeakingRef.current = false
        controllerRef.current?.setSpeaking(false)
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

      const fit = (m: InstanceType<typeof Live2DModel>) => {
        const { width, height } = app.renderer.screen
        const scale = Math.min(width / m.internalModel.width, height / m.internalModel.height) * FIT
        m.scale.set(scale)
        m.position.set(width / 2, height / 2)
      }

      // Load model with idle motion group configuration
      const loadOptions: Record<string, unknown> = {
        autoInteract: true,
        defaultMotionFadingDuration: 800,
        defaultExpressionFadingDuration: 500,
      }

      // Check if model has idle motions and configure them
      Live2DModel.from(model.url, loadOptions)
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

          // Set up idle motion group for Cubism 4
          try {
            if (m.internalModel?.motionManager?.groups) {
              m.internalModel.motionManager.groups.idle = 'Idle'
            }
          } catch (err) {
            console.log('[Live2D] No idle motion group configured')
          }

          // Set up hit areas
          m.eventMode = 'static'
          m.cursor = 'pointer'

          // Handle hit areas using the built-in 'hit' event
          m.on('hit', (hitAreaNames: string[]) => {
            console.log('[Live2D] Hit areas:', hitAreaNames)

            if (hitAreaNames.includes('Head')) {
              controllerRef.current?.triggerHeadPat()
              onHitRef.current?.('Head')
            } else if (hitAreaNames.includes('Body')) {
              controllerRef.current?.triggerBodyTap()
              const exprs = modelConfigRef.current.tapExpressions
              m.expression(exprs[Math.floor(Math.random() * exprs.length)])
              onHitRef.current?.('Body')
            } else {
              // Fallback: if no specific hit area, treat as body tap
              controllerRef.current?.triggerBodyTap()
              const exprs = modelConfigRef.current.tapExpressions
              m.expression(exprs[Math.floor(Math.random() * exprs.length)])
              onHitRef.current?.('Body')
            }
          })

          // Fallback pointerdown for models without hit areas
          m.on('pointerdown', (e) => {
            // Only trigger if 'hit' event didn't fire
            // We check this by seeing if the event already bubbled
            const hitAreas = m.hitTest(e.global.x, e.global.y)
            if (!hitAreas || hitAreas.length === 0) {
              controllerRef.current?.triggerBodyTap()
              const exprs = modelConfigRef.current.tapExpressions
              m.expression(exprs[Math.floor(Math.random() * exprs.length)])
              onHitRef.current?.('Body')
            }
          })

          // Initialize controller
          const controller = new Live2DController()
          controller.attach(m, app.ticker)
          controllerRef.current = controller

          // Try to play idle motion if available
          try {
            const motionManager = m.internalModel?.motionManager
            if (motionManager && motionManager.motionGroups) {
              const idleGroup = motionManager.motionGroups.Idle || motionManager.motionGroups.idle
              if (idleGroup && idleGroup.length > 0) {
                console.log('[Live2D] Playing idle motion')
                m.motion('Idle')
              }
            }
          } catch (err) {
            console.log('[Live2D] No idle motion available, using procedural animation')
          }

          console.log('[Live2D] Model loaded successfully')
        })
        .catch((err) => {
          console.error('[Live2D] failed to load model', err)
          if (!cancelled) setError('Failed to load Live2D model')
        })

      return () => {
        cancelled = true
        controllerRef.current?.detach()
        controllerRef.current = null
        modelRef.current = null
        app.destroy(true, { children: true, texture: true })
        appRef.current = null
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
