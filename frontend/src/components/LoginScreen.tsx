import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LoginScreenProps {
  // Resolve to an error string, or null on success.
  onLogin: (username: string, password: string) => Promise<string | null>;
  // When provided, a register toggle is shown (backend mode only).
  onRegister?: (username: string, password: string) => Promise<string | null>;
  // First-run provisioning: no users yet — show register form, hide toggle.
  registerOnly?: boolean;
}

export function LoginScreen({
  onLogin,
  onRegister,
  registerOnly = false,
}: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = registerOnly || (mode === "register" && !!onRegister);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const fn = isRegister ? onRegister! : onLogin;
    const err = await fn(username, password);
    setBusy(false);
    if (err) {
      setError(err);
      setPassword("");
    }
  };

  return (
    <div className="flex h-dvh w-screen items-center justify-center bg-linear-to-b from-background to-secondary p-4">
      <Card className="w-full max-w-sm gap-6 p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <h1 className="text-lg font-semibold">Hermes AI</h1>
          <p className="text-sm text-muted-foreground">
            {registerOnly
              ? "Create the first account"
              : isRegister
                ? "Create an account"
                : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            type="text"
            autoFocus
            autoComplete="username"
            placeholder="Username"
            aria-label="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
          />
          <Input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-1 w-full" disabled={busy}>
            {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        {onRegister && !registerOnly && (
          <button
            type="button"
            className="text-center cursor-pointer text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
          >
            {mode === "login"
              ? "Need an account? Register"
              : "Have an account? Sign in"}
          </button>
        )}
      </Card>
    </div>
  );
}
