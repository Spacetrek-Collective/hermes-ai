import { Hono } from "hono";
import { cors } from "hono/cors";
import { auth } from "./auth";
import { data } from "./data";

const app = new Hono();

const origins = (process.env.CORS_ORIGIN ?? "http://localhost:7200")
  .split(",")
  .map((s) => s.trim());

app.use("*", cors({ origin: origins, allowHeaders: ["Authorization", "Content-Type"] }));

app.get("/health", (c) => c.json({ ok: true }));
app.route("/auth", auth);
app.route("/data", data);

const port = Number(process.env.PORT ?? 8787);
console.log(`hermes-server listening on :${port}`);

export default { port, fetch: app.fetch };
