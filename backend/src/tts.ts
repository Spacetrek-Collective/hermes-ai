import { Hono } from "hono";
import { jwt } from "hono/jwt";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { GoogleGenAI } from "@google/genai";

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

// Gemini TTS — user supplies their own API key. PCM chunks → WAV.
tts.post("/gemini", async (c) => {
  const { text, apiKey, model, voice, scene } = (await c.req.json().catch(() => ({}))) as {
    text?: string;
    apiKey?: string;
    model?: string;
    voice?: string;
    scene?: string;
  };

  if (!text?.trim()) return c.json({ error: "text required" }, 400);
  if (!apiKey) return c.json({ error: "apiKey required" }, 400);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = scene?.trim()
      ? `## Scene:\n${scene.trim()}\n\n## Transcript:\n${text.trim()}`
      : text.trim();

    const stream = await ai.models.generateContentStream({
      model: model || "gemini-2.5-flash-preview-tts",
      config: {
        responseModalities: ["audio"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Zephyr" },
          },
        },
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const pcmChunks: Buffer[] = [];
    let mimeType = "";

    for await (const chunk of stream) {
      const part = chunk.candidates?.[0]?.content?.parts?.[0];
      if (part?.inlineData) {
        if (!mimeType) mimeType = part.inlineData.mimeType ?? "";
        pcmChunks.push(Buffer.from(part.inlineData.data ?? "", "base64"));
      }
    }

    if (!pcmChunks.length) return c.json({ error: "no audio returned" }, 502);

    const pcm = Buffer.concat(pcmChunks);
    const wav = pcmToWav(pcm, mimeType);

    return new Response(wav, {
      headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[tts] gemini synth failed", err);
    return c.json({ error: "gemini tts failed" }, 502);
  }
});

function pcmToWav(pcm: Buffer, mimeType: string): Buffer {
  const numChannels = 1;
  let sampleRate = 24000;
  let bitsPerSample = 16;

  // mimeType like "audio/L16;rate=24000"
  const rateMatch = mimeType.match(/rate=(\d+)/);
  if (rateMatch) sampleRate = parseInt(rateMatch[1], 10);
  const fmtMatch = mimeType.match(/\/L(\d+)/i);
  if (fmtMatch) bitsPerSample = parseInt(fmtMatch[1], 10);

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}
