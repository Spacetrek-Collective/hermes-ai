import type { Mood } from './mood'
import { loadValue, saveValue } from '@/lib/store'

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
    id: 'jane-doe',
    label: 'Jane Doe',
    url: '/models/jane-doe/简.model3.json',
    moodExpressions: {
      happy:       '爱心眼',
      sad:         '泪',
      surprised:   '星星眼',
      angry:       '生气',
      neutral:     '白眼',
      embarrassed: '脸红',
    },
    tapExpressions: ['爱心眼', '星星眼', '泪', '生气', '白眼', '脸红', '脸黑', '血'],
  },
  {
    id: 'yachiyo',
    label: 'Yachiyo',
    url: '/models/yachiyo/八千代辉夜姬.model3.json',
    moodExpressions: {
      happy:       '笑咪咪',
      sad:         '眼泪',
      surprised:   '眯眯眼',
      angry:       '泪珠',
      neutral:     '眯眯眼',
      embarrassed: '笑咪咪',
    },
    tapExpressions: ['笑咪咪', '眯眯眼', '眼泪', '泪珠'],
  },
  {
    id: 'villhaze',
    label: 'Villhaze',
    url: '/models/villhaze/女仆.model3.json',
    moodExpressions: {
      happy:       '',
      sad:         '',
      surprised:   '',
      angry:       '',
      neutral:     '',
      embarrassed: '',
    },
    tapExpressions: [],
  },
  {
    id: 'nicole',
    label: 'Nicole',
    url: '/models/nicole/Nicole.model3.json',
    moodExpressions: {
      happy:       'Love eye',
      sad:         'cry',
      surprised:   'Money eye',
      angry:       'black face',
      neutral:     'Milk Tea',
      embarrassed: 'shyness',
    },
    tapExpressions: ['Love eye', 'Love Hand Posture', 'shyness', 'cry', 'black face', 'Y Hand Posture', 'sitting position'],
  },
]

const STORAGE_KEY = 'model'

export async function loadActiveModel(): Promise<ModelConfig> {
  const saved = await loadValue<string | null>(STORAGE_KEY, null)
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
  saveValue(STORAGE_KEY, id)
}
