import { useState, type FormEvent } from "react";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AI_NAME = (import.meta.env.VITE_AI_NAME as string | undefined) ?? "Hermes";

interface LoginScreenProps {
  onLogin: (username: string, password: string) => boolean;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!onLogin(username, password)) {
      setError("Invalid username or password.");
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
          <h1 className="text-lg font-semibold">{AI_NAME}</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
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
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-1 w-full">
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
