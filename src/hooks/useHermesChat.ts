import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ChatMessage } from "@/types/hermes";
import type { Mood } from "@/lib/mood";
import { MOOD_TAG_RE, MOOD_SYSTEM_PROMPT, detectMood } from "@/lib/mood";

const HERMES_BASE =
  (import.meta.env.VITE_HERMES_URL as string | undefined) ??
  "http://localhost:8642";

const HERMES_API_KEY =
  (import.meta.env.VITE_HERMES_API_KEY as string | undefined) ?? "";

const HERMES_MODEL =
  (import.meta.env.VITE_HERMES_MODEL as string | undefined) ?? "hermes-agent";

const MOCK =
  (import.meta.env.VITE_HERMES_MOCK as string | undefined) === "true";

const MOCK_REPLIES = [
  "[MOOD:happy] Hi there! I'm Hermes, your Live2D assistant. It's lovely to meet you!",
  "Sure thing! [MOOD:surprised] Let me think about that for a moment. Here is what I found.",
  "[MOOD:neutral] Of course! The weather today looks bright and cheerful, perfect for coding.",
  "Hello! [MOOD:happy] I can speak out loud and move my mouth in sync. Pretty neat, right?",
];

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useHermesChat(
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  onMood?: (mood: Mood) => void,
) {
  const onMoodRef = useRef(onMood);
  useLayoutEffect(() => {
    onMoodRef.current = onMood;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const syncMessages = useCallback(
    (updater: SetStateAction<ChatMessage[]>) => {
      setMessages((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        messagesRef.current = next;
        return next;
      });
    },
    [setMessages],
  );

  const appendToAssistant = useCallback(
    (id: string, chunk: string) => {
      syncMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, content: m.content + chunk } : m,
        ),
      );
    },
    [syncMessages],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const prompt = text.trim();
      if (!prompt || isStreaming) return;

      setError(null);
      const userMsg: ChatMessage = { id: uid(), role: "user", content: prompt };
      const assistantId = uid();
      syncMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // Buffer for partial [MOOD:...] tags that may span chunk boundaries
      let tagBuf = "";
      let moodTagFired = false;
      let fullResponse = "";

      const flushChunk = (raw: string) => {
        tagBuf += raw;
        fullResponse += raw;
        tagBuf = tagBuf.replace(MOOD_TAG_RE, (_, mood: string) => {
          moodTagFired = true;
          onMoodRef.current?.(mood.toLowerCase() as Mood);
          return "";
        });
        // Hold back a potential partial tag at the tail (max 15 chars)
        const openIdx = tagBuf.lastIndexOf("[");
        if (openIdx !== -1 && tagBuf.length - openIdx <= 15) {
          appendToAssistant(assistantId, tagBuf.slice(0, openIdx));
          tagBuf = tagBuf.slice(openIdx);
        } else {
          appendToAssistant(assistantId, tagBuf);
          tagBuf = "";
        }
      };

      const flushRemaining = () => {
        if (tagBuf) {
          appendToAssistant(
            assistantId,
            tagBuf.replace(MOOD_TAG_RE, (_, mood: string) => {
              moodTagFired = true;
              onMoodRef.current?.(mood.toLowerCase() as Mood);
              return "";
            }),
          );
          tagBuf = "";
        }
        if (!moodTagFired && fullResponse) {
          onMoodRef.current?.(detectMood(fullResponse));
        }
      };

      try {
        if (MOCK) {
          const reply =
            MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
          for (const word of reply.match(/\S+\s*/g) ?? [reply]) {
            if (controller.signal.aborted) {
              throw new DOMException("aborted", "AbortError");
            }
            flushChunk(word);
            await delay(55);
          }
          flushRemaining();
          return;
        }

        const history = [
          { role: "system", content: MOOD_SYSTEM_PROMPT },
          ...messagesRef.current
            .filter((m) => m.id !== assistantId)
            .map(({ role, content }) => ({ role, content })),
        ];

        const res = await fetch(`${HERMES_BASE}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(HERMES_API_KEY
              ? { Authorization: `Bearer ${HERMES_API_KEY}` }
              : {}),
          },
          body: JSON.stringify({
            model: HERMES_MODEL,
            messages: history,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Hermes responded ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });

          let sep: number;
          while ((sep = sseBuffer.indexOf("\n\n")) !== -1) {
            const record = sseBuffer.slice(0, sep);
            sseBuffer = sseBuffer.slice(sep + 2);
            for (const line of record.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const data = line.slice(5).trim();
              if (data === "[DONE]") break;
              try {
                const chunk = JSON.parse(data);
                const delta = chunk?.choices?.[0]?.delta?.content;
                if (typeof delta === "string") flushChunk(delta);
              } catch {
                /* ignore malformed chunks */
              }
            }
          }
        }
        flushRemaining();
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("[hermes] stream failed", err);
          setError((err as Error).message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        syncMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, streaming: false } : m,
          ),
        );
      }
    },
    [appendToAssistant, isStreaming, syncMessages],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { isStreaming, error, sendMessage, stop };
}
