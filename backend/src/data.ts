import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { db } from "./db";

const SECRET = process.env.JWT_SECRET ?? "change-me-to-a-long-random-secret";

// Keys the client is allowed to store (mirror of the old localStorage keys).
const ALLOWED = new Set(["conversations", "active", "tts", "model", "persona"]);

export const data = new Hono();

// Every /data route requires a valid JWT.
data.use("*", jwt({ secret: SECRET, alg: "HS256" }));

const userId = (c: any): string => c.get("jwtPayload").sub as string;

// Read all of a user's data at once → { key: value, ... }
data.get("/", (c) => {
  const rows = db
    .query("SELECT key, value FROM user_data WHERE user_id = ?")
    .all(userId(c)) as { key: string; value: string }[];
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = JSON.parse(r.value);
  return c.json(out);
});

data.get("/:key", (c) => {
  const key = c.req.param("key");
  if (!ALLOWED.has(key)) return c.json({ error: "unknown key" }, 400);
  const row = db
    .query("SELECT value FROM user_data WHERE user_id = ? AND key = ?")
    .get(userId(c), key) as { value: string } | null;
  if (!row) return c.json(null);
  return c.json(JSON.parse(row.value));
});

data.put("/:key", async (c) => {
  const key = c.req.param("key");
  if (!ALLOWED.has(key)) return c.json({ error: "unknown key" }, 400);
  const value = await c.req.json().catch(() => undefined);
  if (value === undefined) return c.json({ error: "invalid JSON body" }, 400);

  db.run(
    `INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [userId(c), key, JSON.stringify(value), Date.now()],
  );
  return c.json({ ok: true });
});

data.delete("/:key", (c) => {
  const key = c.req.param("key");
  if (!ALLOWED.has(key)) return c.json({ error: "unknown key" }, 400);
  db.run("DELETE FROM user_data WHERE user_id = ? AND key = ?", [
    userId(c),
    key,
  ]);
  return c.json({ ok: true });
});
