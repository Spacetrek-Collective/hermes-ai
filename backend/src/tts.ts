import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const SECRET = process.env.JWT_SECRET ?? "change-me-to-a-long-random-secret";

// Free Microsoft Edge TTS, proxied through the backend (the upstream needs a
// signed token + websocket that the browser can't reach directly).
const DEFAULT_VOICE = "en-US-AriaNeural";

export const tts = new Hono();
tts.use("*", jwt({ secret: SECRET, alg: "HS256" }));

tts.post("/", async (c) => {
  const { text, voice, pitch } = (await c.req.json().catch(() => ({}))) as {
    text?: string;
    voice?: string;
    pitch?: number;
  };
  if (!text || typeof text !== "string" || !text.trim()) {
    return c.json({ error: "text required" }, 400);
  }

  try {
    const engine = new MsEdgeTTS();
    await engine.setMetadata(
      voice || DEFAULT_VOICE,
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );

    // pitch is an Hz offset (-100..100). 0 = voice default.
    const options: { pitch?: string } = {};
    if (typeof pitch === "number" && Number.isFinite(pitch) && pitch !== 0) {
      const hz = Math.max(-100, Math.min(100, Math.round(pitch)));
      options.pitch = `${hz > 0 ? "+" : ""}${hz}Hz`;
    }

    const { audioStream } = await engine.toStream(text.trim(), options);
    const chunks: Uint8Array[] = [];
    for await (const ch of audioStream) chunks.push(ch);
    const buf = Buffer.concat(chunks);
    return new Response(buf, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[tts] edge synth failed", err);
    return c.json({ error: "tts synthesis failed" }, 502);
  }
});
