import { useCallback, useState } from "react";
import { apiEnabled, authRequest, clearToken, getToken } from "@/lib/api";

// --- Soft gate (used only when no backend is configured) -------------------
const AUTH_USERNAME =
  (import.meta.env.VITE_AUTH_USERNAME as string | undefined) ?? "";
const AUTH_PASSWORD =
  (import.meta.env.VITE_AUTH_PASSWORD as string | undefined) ?? "";
const SOFT_ENABLED = AUTH_USERNAME !== "" && AUTH_PASSWORD !== "";
const SOFT_KEY = "hermes:authed";

// Real auth when VITE_API_URL is set; otherwise the inline soft gate.
const API = apiEnabled();

function readAuthed(): boolean {
  if (API) return getToken() !== null;
  if (!SOFT_ENABLED) return true;
  try {
    return sessionStorage.getItem(SOFT_KEY) === "1";
  } catch {
    return false;
  }
}

/** login/register resolve to an error string, or null on success. */
export function useAuth() {
  const [authed, setAuthed] = useState(readAuthed);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      if (API) {
        const r = await authRequest("login", username, password);
        if (r.ok) {
          setAuthed(true);
          return null;
        }
        return r.error ?? "Login failed";
      }
      if (username === AUTH_USERNAME && password === AUTH_PASSWORD) {
        try {
          sessionStorage.setItem(SOFT_KEY, "1");
        } catch {
          /* ignore — stay authed for this session */
        }
        setAuthed(true);
        return null;
      }
      return "Invalid username or password.";
    },
    [],
  );

  const register = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      if (!API) return "Registration requires a backend (VITE_API_URL).";
      const r = await authRequest("register", username, password);
      if (r.ok) {
        setAuthed(true);
        return null;
      }
      return r.error ?? "Registration failed";
    },
    [],
  );

  const logout = useCallback(() => {
    if (API) {
      clearToken();
    } else {
      try {
        sessionStorage.removeItem(SOFT_KEY);
      } catch {
        /* ignore */
      }
    }
    setAuthed(false);
  }, []);

  return {
    authed,
    authEnabled: API || SOFT_ENABLED,
    apiMode: API,
    login,
    register,
    logout,
  };
}
