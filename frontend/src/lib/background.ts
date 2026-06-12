import { loadValue, saveValue } from '@/lib/store'

const STORAGE_KEY = 'bg'

// Stored value: '' = none, otherwise a CSS image source (a /bg/<file> preset
// path, or an absolute http(s) URL).
export async function loadBackground(): Promise<string> {
  return loadValue<string>(STORAGE_KEY, '')
}

export function saveBackground(value: string) {
  saveValue(STORAGE_KEY, value)
}

export interface BgPreset {
  label: string
  value: string
}

// Presets are declared in public/bg/manifest.json (a JSON array of filenames).
// Drop an image in public/bg/ and add its filename there to offer it here.
export async function fetchBgPresets(): Promise<BgPreset[]> {
  try {
    const res = await fetch('/bg/manifest.json')
    if (!res.ok) return []
    const files = (await res.json()) as unknown
    if (!Array.isArray(files)) return []
    return files
      .filter((f): f is string => typeof f === 'string')
      .map((f) => ({ label: f.replace(/\.[^.]+$/, ''), value: `/bg/${f}` }))
  } catch {
    return []
  }
}
