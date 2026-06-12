// Thin client for the Hermes backend (server/). When VITE_API_URL is unset the
// app stays fully local (localStorage) — see lib/store.ts.

const BASE =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

const TOKEN_KEY = "hermes:token";

export function apiEnabled(): boolean {
  return BASE !== "";
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(BASE + path, { ...init, headers });
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export async function authRequest(
  kind: "login" | "register",
  username: string,
  password: string,
): Promise<AuthResult> {
  try {
    const res = await req(`/auth/${kind}`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      token?: string;
      error?: string;
    };
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    if (data.token) setToken(data.token);
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error — is the backend running?" };
  }
}

// Whether any account exists yet. Defaults to true on failure so we never
// expose registration just because the backend is unreachable.
export async function authStatus(): Promise<{ hasUsers: boolean }> {
  try {
    const res = await req("/auth/status", { method: "GET" });
    if (!res.ok) return { hasUsers: true };
    return (await res.json()) as { hasUsers: boolean };
  } catch {
    return { hasUsers: true };
  }
}

export async function getData<T>(key: string): Promise<T | null> {
  const res = await req(`/data/${key}`, { method: "GET" });
  if (res.status === 401) {
    clearToken();
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T | null;
}

export async function putData(key: string, value: unknown): Promise<void> {
  const res = await req(`/data/${key}`, {
    method: "PUT",
    body: JSON.stringify(value),
  });
  if (res.status === 401) clearToken();
}
