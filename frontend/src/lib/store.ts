// Unified persistence. Routes to the backend when VITE_API_URL is set, else
// falls back to localStorage. Keys mirror the old `hermes:<key>` localStorage
// names so existing local data keeps working.
import { apiEnabled, getData, putData } from "@/lib/api";

export async function loadValue<T>(key: string, fallback: T): Promise<T> {
  if (apiEnabled()) {
    try {
      const v = await getData<T>(key);
      return v == null ? fallback : v;
    } catch {
      return fallback;
    }
  }
  try {
    const raw = localStorage.getItem(`hermes:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Fire-and-forget — callers already debounce. Failures are non-fatal.
export function saveValue(key: string, value: unknown): void {
  if (apiEnabled()) {
    void putData(key, value);
    return;
  }
  try {
    localStorage.setItem(`hermes:${key}`, JSON.stringify(value));
  } catch {
    /* quota / disabled storage — ignore */
  }
}
