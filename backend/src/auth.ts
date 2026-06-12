import { Hono } from "hono";
import { sign } from "hono/jwt";
import { db } from "./db";

const SECRET = process.env.JWT_SECRET ?? "change-me-to-a-long-random-secret";

const uid = () => crypto.randomUUID();

type UserRow = { id: string; username: string; password_hash: string };

export const auth = new Hono();

auth.post("/register", async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}));
  if (!username || !password || password.length < 6) {
    return c.json({ error: "username and password (min 6 chars) required" }, 400);
  }

  const exists = db
    .query("SELECT 1 FROM users WHERE username = ?")
    .get(username);
  if (exists) return c.json({ error: "username taken" }, 409);

  const id = uid();
  const hash = await Bun.password.hash(password);
  db.run(
    "INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)",
    [id, username, hash, Date.now()],
  );

  const token = await sign({ sub: id, username }, SECRET);
  return c.json({ token, user: { id, username } }, 201);
});

auth.post("/login", async (c) => {
  const { username, password } = await c.req.json().catch(() => ({}));
  if (!username || !password) {
    return c.json({ error: "username and password required" }, 400);
  }

  const user = db
    .query("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(username) as UserRow | null;
  if (!user || !(await Bun.password.verify(password, user.password_hash))) {
    return c.json({ error: "invalid credentials" }, 401);
  }

  const token = await sign({ sub: user.id, username: user.username }, SECRET);
  return c.json({ token, user: { id: user.id, username: user.username } });
});
