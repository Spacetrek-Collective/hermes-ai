import type { ChatMessage, Conversation } from "@/types/hermes";

const STORAGE_KEY = "hermes:conversations";
const ACTIVE_KEY = "hermes:active";

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

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c) => ({
      ...c,
      messages: (c.messages ?? []).map(({ streaming: _s, ...m }) => m),
    }));
  } catch {
    return [];
  }
}

export function saveConversations(list: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

export function loadActiveId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export function saveActiveId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    /* ignore */
  }
}
