import type { Mood } from './mood'

export interface ModelConfig {
  id: string
  label: string
  url: string
  moodExpressions: Record<Mood, string>
  tapExpressions: string[]
}

export const MODELS: ModelConfig[] = [
  {
    id: 'changli',
    label: 'Changli',
    url: '/models/changli/长离.model3.json',
    moodExpressions: {
      happy:       '爱心眼',
      sad:         '黑脸',
      surprised:   '眼罩',
      angry:       '生气',
      neutral:     '白眼',
      embarrassed: '脸红',
    },
    tapExpressions: ['爱心眼', '生气', '白眼', '眼罩', '脸红', '黑脸', '外套穿脱'],
  },
  {
    id: 'vivian',
    label: 'Vivian',
    url: '/models/vivian/薇薇安.model3.json',
    moodExpressions: {
      happy:       '害羞',
      sad:         '哭',
      surprised:   '慌张',
      angry:       '黑脸',
      neutral:     '白眼',
      embarrassed: '害羞',
    },
    tapExpressions: ['哭', '害羞', '慌张', '白眼', '黑脸', '伞关闭'],
  },
  {
    id: 'camellya',
    label: 'Camellya',
    url: '/models/camellya/ดป.model3.json',
    moodExpressions: {
      happy:       'บฺมณ',
      sad:         'มณบ์',
      surprised:   'บฺมณ',
      angry:       'มณบ์',
      neutral:     'บฺมณ',
      embarrassed: 'มณบ์',
    },
    tapExpressions: ['บฺมณ', 'มณบ์'],
  },
  {
    id: 'tingyun',
    label: 'Tingyun',
    url: '/models/tingyun/停云.model3.json',
    moodExpressions: {
      happy:       '心心眼',
      sad:         '脸黑',
      surprised:   '尾巴',
      angry:       '脸黑',
      neutral:     '尾巴',
      embarrassed: '脸红',
    },
    tapExpressions: ['心心眼', '脸红', '脸黑', '尾巴'],
  },
]

const STORAGE_KEY = 'hermes:model'

export function loadActiveModel(): ModelConfig {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    const found = MODELS.find((m) => m.id === saved)
    if (found) return found
  }
  const envUrl = import.meta.env.VITE_MODEL_URL as string | undefined
  if (envUrl) {
    const found = MODELS.find((m) => m.url === envUrl)
    if (found) return found
  }
  return MODELS[0]
}

export function saveActiveModel(id: string) {
  localStorage.setItem(STORAGE_KEY, id)
}
