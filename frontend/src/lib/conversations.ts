import type { ChatMessage, Conversation } from "@/types/hermes";
import { MOOD_TAG_RE } from "@/lib/mood";
import { loadValue, saveValue } from "@/lib/store";

const STORAGE_KEY = "conversations";
const ACTIVE_KEY = "active";

export const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

export function createConversation(): Conversation {
  const now = Date.now();
  return {
    id: uid(),
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Derive a title from the first user message. */
export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user")?.content.trim();
  if (!first) return "New chat";
  return first.length > 40 ? first.slice(0, 40).trimEnd() + "…" : first;
}

export async function loadConversations(): Promise<Conversation[]> {
  const parsed = await loadValue<Conversation[]>(STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((c) => ({
    ...c,
    messages: (c.messages ?? []).map(({ streaming: _s, ...m }) => ({
      ...m,
      content: m.content.replace(MOOD_TAG_RE, "").trim(),
    })),
  }));
}

export function saveConversations(list: Conversation[]): void {
  saveValue(STORAGE_KEY, list);
}

export async function loadActiveId(): Promise<string | null> {
  return loadValue<string | null>(ACTIVE_KEY, null);
}

export function saveActiveId(id: string): void {
  saveValue(ACTIVE_KEY, id);
}
