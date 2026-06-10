import { useCallback, useState } from "react";

const AUTH_USERNAME =
  (import.meta.env.VITE_AUTH_USERNAME as string | undefined) ?? "";

const AUTH_PASSWORD =
  (import.meta.env.VITE_AUTH_PASSWORD as string | undefined) ?? "";

// Gate is only enforced when both credentials are configured. With either
// unset the app is open (useful for local/mock runs).
const AUTH_ENABLED = AUTH_USERNAME !== "" && AUTH_PASSWORD !== "";

const STORAGE_KEY = "hermes:authed";

// NOTE: Vite inlines VITE_* vars into the client bundle, so this is a soft
// gate (deters casual access), not real security. Put a real auth layer on
// the API backend if you need that.
function readAuthed(): boolean {
  if (!AUTH_ENABLED) return true;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function useAuth() {
  const [authed, setAuthed] = useState(readAuthed);

  const login = useCallback((username: string, password: string): boolean => {
    if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore storage failures — stay authed for this session */
      }
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  }, []);

  return { authed, authEnabled: AUTH_ENABLED, login, logout };
}
