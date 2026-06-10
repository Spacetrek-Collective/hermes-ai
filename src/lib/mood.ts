export type Mood = 'happy' | 'sad' | 'surprised' | 'angry' | 'neutral'

export const MOOD_TAG_RE = /\[MOOD:(happy|sad|surprised|angry|neutral)\]/gi

export const MOOD_REACTIONS: Record<Mood, { expression: string; motion?: string }> = {
  happy:     { expression: 'f02', motion: 'Idle' },
  sad:       { expression: 'f05' },
  surprised: { expression: 'f03', motion: 'Tap' },
  angry:     { expression: 'f06' },
  neutral:   { expression: 'f00' },
}

const KEYWORDS: Record<Mood, RegExp> = {
  happy:     /\b(haha|hehe|happy|glad|great|wonderful|exciting|love|yay|joy|fun|nice|good|pleasure|pleased|delight|cute|sweet|awesome|fantastic|amazing|brilliant|excellent|hooray|senang|baik|bagus|suka|gembira|hebat)\b/i,
  sad:       /\b(sad|sorry|unfortunate|miss|lonely|cry|hurt|pain|regret|unfortunately|apologize|maaf|sedih|sayang|kasihan|menyesal)\b/i,
  surprised: /\b(wow|oh|whoa|really|seriously|unexpected|surprising|incredible|unbelievable|wait|wah|eh|hah|astaga|luar biasa)\b/i,
  angry:     /\b(angry|annoyed|frustrated|upset|mad|furious|irritated|hate|stop|enough|kesal|marah|jengkel)\b/i,
  neutral:   /\b(okay|ok|sure|alright|understood|noted|i see|fine|baik|oke|mengerti)\b/i,
}

export function detectMood(text: string): Mood {
  const scores: Record<Mood, number> = { happy: 0, sad: 0, surprised: 0, angry: 0, neutral: 0 }
  for (const [mood, re] of Object.entries(KEYWORDS) as [Mood, RegExp][]) {
    scores[mood] = (text.match(new RegExp(re.source, 'gi')) ?? []).length
  }
  const top = (Object.entries(scores) as [Mood, number][]).sort((a, b) => b[1] - a[1])[0]
  return top[1] > 0 ? top[0] : 'neutral'
}

export const MOOD_SYSTEM_PROMPT =
  'When responding, you may naturally include emotion tags to express your feelings: ' +
  '[MOOD:happy], [MOOD:sad], [MOOD:surprised], [MOOD:angry], or [MOOD:neutral]. ' +
  'Place them inline where the emotion fits. Use them sparingly and only when genuine.'
