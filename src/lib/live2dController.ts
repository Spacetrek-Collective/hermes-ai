import type { Ticker } from 'pixi.js'
import type { Live2DModel } from 'pixi-live2d-display-lipsyncpatch/cubism4'

export interface IdleConfig {
  breathingSpeed: number
  breathingAmplitude: number
  blinkIntervalMin: number
  blinkIntervalMax: number
  blinkDuration: number
  microMovementSpeed: number
  microMovementAmplitude: number
}

export const DEFAULT_IDLE_CONFIG: IdleConfig = {
  breathingSpeed: 0.8,
  breathingAmplitude: 0.3,
  blinkIntervalMin: 2000,
  blinkIntervalMax: 6000,
  blinkDuration: 150,
  microMovementSpeed: 0.5,
  microMovementAmplitude: 2,
}

export interface MicroExpression {
  name: string
  duration: number
  params: Record<string, number>
}

interface CoreModel {
  getParameterIndexById(id: string): number
  getParameterValueByIndex(index: number): number
  setParameterValueByIndex(index: number, value: number): void
}

export class Live2DController {
  private model: InstanceType<typeof Live2DModel> | null = null
  private ticker: Ticker | null = null
  private config: IdleConfig
  private isActive = false

  // Breathing state
  private breathPhase = 0
  private breathTime = 0

  // Blinking state
  private nextBlinkTime = 0
  private blinkStartTime = 0
  private isBlinking = false
  private blinkState: 'closing' | 'closed' | 'opening' | 'open' = 'open'
  private blinkProgress = 0

  // Micro-movements state
  private microMoveTime = 0
  private microMoveOffset = { x: 0, y: 0, z: 0 }
  private microMoveTarget = { x: 0, y: 0, z: 0 }
  private microMoveChangeTime = 0

  // Transition state
  private baseParams: Record<string, number> = {}
  private transitionStartTime = 0
  private transitionDuration = 300
  private isTransitioning = false
  private fromParams: Record<string, number> = {}
  private toParams: Record<string, number> = {}

  // Speaking state
  private isSpeaking = false
  private speakingStartTime = 0
  private speakingGestureTime = 0

  // Micro-expressions
  private nextMicroExpressionTime = 0
  private microExpression: MicroExpression | null = null
  private microExpressionStartTime = 0

  constructor(config: Partial<IdleConfig> = {}) {
    this.config = { ...DEFAULT_IDLE_CONFIG, ...config }
  }

  attach(model: InstanceType<typeof Live2DModel>, ticker: Ticker) {
    this.model = model
    this.ticker = ticker
    this.isActive = true
    this.breathTime = 0
    this.microMoveTime = 0
    this.nextBlinkTime = this.getNextBlinkTime()
    this.nextMicroExpressionTime = this.getNextMicroExpressionTime()

    // Store base parameters
    this.storeBaseParams()

    // Add update callback
    ticker.add(this.update)
  }

  detach() {
    this.isActive = false
    if (this.ticker) {
      this.ticker.remove(this.update)
    }
    this.model = null
    this.ticker = null
  }

  private getCoreModel(): CoreModel | null {
    if (!this.model) return null
    const core = this.model.internalModel?.coreModel as CoreModel | undefined
    return core ?? null
  }

  private storeBaseParams() {
    const core = this.getCoreModel()
    if (!core) return

    this.baseParams = {}
    // Store current values of key parameters
    const params = [
      'ParamBreath',
      'ParamAngleX',
      'ParamAngleY',
      'ParamAngleZ',
      'ParamEyeLOpen',
      'ParamEyeROpen',
      'ParamBrowLY',
      'ParamBrowRY',
      'ParamBodyAngleX',
      'ParamBodyAngleY',
    ]

    for (const param of params) {
      try {
        const idx = core.getParameterIndexById(param)
        if (idx >= 0) {
          this.baseParams[param] = core.getParameterValueByIndex(idx)
        }
      } catch {
        // Parameter might not exist on this model
      }
    }
  }

  private update = (delta: number) => {
    if (!this.isActive || !this.model) return

    const now = performance.now()
    const dt = delta / 60 // Normalize to ~1 at 60fps

    this.updateBreathing(dt)
    this.updateBlinking(now)
    this.updateMicroMovements(dt, now)
    this.updateMicroExpressions(now)
    this.updateTransitions(now)
    this.updateSpeakingGestures(now)
  }

  private updateBreathing(dt: number) {
    this.breathTime += dt * this.config.breathingSpeed
    this.breathPhase = Math.sin(this.breathTime) * 0.5 + 0.5

    const breathValue = this.breathPhase * this.config.breathingAmplitude
    this.setParameter('ParamBreath', breathValue, true)

    // Subtle body movement with breathing
    const bodyX = Math.sin(this.breathTime * 0.7) * 0.5
    const bodyY = Math.cos(this.breathTime * 0.5) * 0.3
    this.setParameter('ParamBodyAngleX', bodyX, true)
    this.setParameter('ParamBodyAngleY', bodyY, true)
  }

  private updateBlinking(now: number) {
    if (this.isSpeaking) {
      // Don't blink while speaking
      this.nextBlinkTime = now + this.config.blinkIntervalMin
      return
    }

    if (!this.isBlinking && now >= this.nextBlinkTime) {
      this.startBlink(now)
    }

    if (this.isBlinking) {
      const elapsed = now - this.blinkStartTime
      const { blinkDuration } = this.config

      if (this.blinkState === 'closing') {
        this.blinkProgress = Math.min(elapsed / (blinkDuration * 0.3), 1)
        if (this.blinkProgress >= 1) {
          this.blinkState = 'closed'
        }
      } else if (this.blinkState === 'closed') {
        if (elapsed > blinkDuration * 0.4) {
          this.blinkState = 'opening'
        }
        this.blinkProgress = 1
      } else if (this.blinkState === 'opening') {
        const openElapsed = elapsed - blinkDuration * 0.4
        this.blinkProgress = 1 - Math.min(openElapsed / (blinkDuration * 0.6), 1)
        if (this.blinkProgress <= 0) {
          this.endBlink(now)
        }
      }

      const eyeOpen = 1 - this.blinkProgress
      this.setParameter('ParamEyeLOpen', eyeOpen, false)
      this.setParameter('ParamEyeROpen', eyeOpen, false)
    }
  }

  private startBlink(now: number) {
    this.isBlinking = true
    this.blinkStartTime = now
    this.blinkState = 'closing'
    this.blinkProgress = 0
  }

  private endBlink(now: number) {
    this.isBlinking = false
    this.blinkState = 'open'
    this.blinkProgress = 0
    this.nextBlinkTime = now + this.getNextBlinkTime()
    this.setParameter('ParamEyeLOpen', 1, false)
    this.setParameter('ParamEyeROpen', 1, false)
  }

  private getNextBlinkTime(): number {
    return Math.random() * (this.config.blinkIntervalMax - this.config.blinkIntervalMin) + this.config.blinkIntervalMin
  }

  private updateMicroMovements(dt: number, now: number) {
    this.microMoveTime += dt * this.config.microMovementSpeed

    // Change target every 2-4 seconds
    if (now > this.microMoveChangeTime) {
      this.microMoveTarget = {
        x: (Math.random() - 0.5) * this.config.microMovementAmplitude,
        y: (Math.random() - 0.5) * this.config.microMovementAmplitude * 0.5,
        z: (Math.random() - 0.5) * this.config.microMovementAmplitude * 0.3,
      }
      this.microMoveChangeTime = now + 2000 + Math.random() * 2000
    }

    // Smoothly interpolate to target
    this.microMoveOffset.x += (this.microMoveTarget.x - this.microMoveOffset.x) * 0.02 * dt
    this.microMoveOffset.y += (this.microMoveTarget.y - this.microMoveOffset.y) * 0.02 * dt
    this.microMoveOffset.z += (this.microMoveTarget.z - this.microMoveOffset.z) * 0.02 * dt

    // Apply to head angles (subtle)
    if (!this.isSpeaking) {
      this.setParameter('ParamAngleX', this.microMoveOffset.x, true)
      this.setParameter('ParamAngleY', this.microMoveOffset.y, true)
      this.setParameter('ParamAngleZ', this.microMoveOffset.z, true)
    }
  }

  private updateMicroExpressions(now: number) {
    if (this.isSpeaking || this.microExpression) return

    if (now >= this.nextMicroExpressionTime) {
      this.triggerRandomMicroExpression(now)
      this.nextMicroExpressionTime = now + this.getNextMicroExpressionTime()
    }
  }

  private triggerRandomMicroExpression(now: number) {
    const expressions: MicroExpression[] = [
      {
        name: 'subtle_smile',
        duration: 1500,
        params: { ParamMouthForm: 0.3 },
      },
      {
        name: 'eyebrow_raise',
        duration: 800,
        params: { ParamBrowLY: -0.5, ParamBrowRY: -0.5 },
      },
      {
        name: 'slight_pout',
        duration: 1200,
        params: { ParamMouthForm: -0.2, ParamCheekPuff: 0.3 },
      },
      {
        name: 'wink',
        duration: 400,
        params: { ParamEyeLOpen: 0.2 },
      },
    ]

    const expr = expressions[Math.floor(Math.random() * expressions.length)]
    this.microExpression = expr
    this.microExpressionStartTime = now
  }

  private getNextMicroExpressionTime(): number {
    return 5000 + Math.random() * 10000 // 5-15 seconds
  }

  private updateTransitions(now: number) {
    if (!this.isTransitioning) {
      // Check if micro-expression should end
      if (this.microExpression && now - this.microExpressionStartTime > this.microExpression.duration) {
        this.microExpression = null
      }
      return
    }

    const elapsed = now - this.transitionStartTime
    const progress = Math.min(elapsed / this.transitionDuration, 1)
    const eased = this.easeInOutCubic(progress)

    for (const [key, targetValue] of Object.entries(this.toParams)) {
      const fromValue = this.fromParams[key] ?? this.baseParams[key] ?? 0
      const currentValue = fromValue + (targetValue - fromValue) * eased
      this.setRawParameter(key, currentValue)
    }

    if (progress >= 1) {
      this.isTransitioning = false
      this.fromParams = { ...this.toParams }
    }
  }

  private updateSpeakingGestures(now: number) {
    if (!this.isSpeaking) return

    const speakingElapsed = now - this.speakingStartTime

    // Subtle head nodding while speaking
    const nodAmount = Math.sin(speakingElapsed * 0.003) * 1.5
    this.setParameter('ParamAngleY', nodAmount, true)

    // Occasional gestures every 3-5 seconds
    if (now > this.speakingGestureTime) {
      this.speakingGestureTime = now + 3000 + Math.random() * 2000
      this.triggerSpeakingGesture()
    }
  }

  private triggerSpeakingGesture() {
    const gestures: Array<Record<string, number>> = [
      { ParamAngleX: 3, ParamBodyAngleX: 2 },
      { ParamAngleX: -3, ParamBodyAngleX: -2 },
      { ParamAngleY: -2 },
      { ParamBodyAngleZ: 2 },
    ]
    const gesture = gestures[Math.floor(Math.random() * gestures.length)]

    this.transitionTo(gesture, 400)
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  private setParameter(paramId: string, value: number, additive: boolean) {
    const core = this.getCoreModel()
    if (!core) return

    try {
      const idx = core.getParameterIndexById(paramId)
      if (idx < 0) return

      let finalValue = value
      if (additive) {
        const baseValue = this.baseParams[paramId] ?? 0
        finalValue = baseValue + value
      }

      // Apply micro-expression override
      if (this.microExpression && paramId in this.microExpression.params) {
        const exprValue = this.microExpression.params[paramId]
        const exprProgress = Math.min((performance.now() - this.microExpressionStartTime) / this.microExpression.duration, 1)
        const exprEase = Math.sin(exprProgress * Math.PI) // Fade in/out
        finalValue = finalValue + (exprValue - finalValue) * exprEase
      }

      core.setParameterValueByIndex(idx, finalValue)
    } catch {
      // Parameter might not exist
    }
  }

  private setRawParameter(paramId: string, value: number) {
    const core = this.getCoreModel()
    if (!core) return

    try {
      const idx = core.getParameterIndexById(paramId)
      if (idx < 0) return
      core.setParameterValueByIndex(idx, value)
    } catch {
      // Parameter might not exist
    }
  }

  transitionTo(params: Record<string, number>, duration = 300) {
    this.fromParams = {}
    const core = this.getCoreModel()
    if (!core) return

    for (const key of Object.keys(params)) {
      try {
        const idx = core.getParameterIndexById(key)
        if (idx >= 0) {
          this.fromParams[key] = core.getParameterValueByIndex(idx)
        }
      } catch {
        this.fromParams[key] = this.baseParams[key] ?? 0
      }
    }

    this.toParams = { ...params }
    this.transitionDuration = duration
    this.transitionStartTime = performance.now()
    this.isTransitioning = true
  }

  setSpeaking(speaking: boolean) {
    this.isSpeaking = speaking
    if (speaking) {
      this.speakingStartTime = performance.now()
      this.speakingGestureTime = performance.now() + 2000
    } else {
      // Reset to neutral
      this.transitionTo(
        {
          ParamAngleX: 0,
          ParamAngleY: 0,
          ParamAngleZ: 0,
          ParamBodyAngleX: 0,
          ParamBodyAngleY: 0,
          ParamBodyAngleZ: 0,
        },
        500,
      )
    }
  }

  // Trigger a head pat reaction
  triggerHeadPat() {
    this.transitionTo(
      {
        ParamAngleY: -5,
        ParamEyeLOpen: 0.8,
        ParamEyeROpen: 0.8,
        ParamCheek: 0.5,
      },
      200,
    )

    setTimeout(() => {
      this.transitionTo(
        {
          ParamAngleY: 0,
          ParamEyeLOpen: 1,
          ParamEyeROpen: 1,
          ParamCheek: 0,
        },
        400,
      )
    }, 1000)
  }

  // Trigger a body tap reaction
  triggerBodyTap() {
    const gestures: Array<Record<string, number>> = [
      { ParamAngleX: 5, ParamBodyAngleX: 3 },
      { ParamAngleX: -5, ParamBodyAngleX: -3 },
      { ParamAngleZ: 3, ParamBodyAngleZ: 2 },
    ]
    const reaction = gestures[Math.floor(Math.random() * gestures.length)]
    this.transitionTo(reaction, 200)

    setTimeout(() => {
      this.transitionTo(
        {
          ParamAngleX: 0,
          ParamAngleZ: 0,
          ParamBodyAngleX: 0,
          ParamBodyAngleZ: 0,
        },
        500,
      )
    }, 800)
  }

  // Trigger surprise reaction
  triggerSurprise() {
    this.transitionTo(
      {
        ParamAngleY: -3,
        ParamEyeLOpen: 1.2,
        ParamEyeROpen: 1.2,
        ParamBrowLY: -1,
        ParamBrowRY: -1,
      },
      150,
    )
  }

  resetToNeutral(duration = 500) {
    this.transitionTo(
      {
        ParamAngleX: 0,
        ParamAngleY: 0,
        ParamAngleZ: 0,
        ParamEyeLOpen: 1,
        ParamEyeROpen: 1,
        ParamBrowLY: 0,
        ParamBrowRY: 0,
        ParamCheek: 0,
        ParamBodyAngleX: 0,
        ParamBodyAngleY: 0,
        ParamBodyAngleZ: 0,
      },
      duration,
    )
  }
}
