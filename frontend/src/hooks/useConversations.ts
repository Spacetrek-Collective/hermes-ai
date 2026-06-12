import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  createConversation,
  deriveTitle,
  loadActiveId,
  loadConversations,
  saveActiveId,
  saveConversations,
} from '@/lib/conversations'
import type { ChatMessage, Conversation } from '@/types/hermes'

function initState(): { list: Conversation[]; activeId: string } {
  const conv = createConversation()
  return { list: [conv], activeId: conv.id }
}

export function useConversations() {
  const [{ list, activeId }, setState] = useState(initState)

  // Storage is async (server or localStorage) — hydrate after mount. Guard the
  // save effects until then so the initial blank chat never clobbers stored data.
  const hydrated = useRef(false)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [loaded, stored] = await Promise.all([
        loadConversations(),
        loadActiveId(),
      ])
      if (cancelled) return
      if (loaded.length) {
        const activeId =
          stored && loaded.some((c) => c.id === stored) ? stored : loaded[0].id
        setState({ list: loaded, activeId })
      }
      hydrated.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Persist (debounced) so streaming token updates don't hammer storage.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!hydrated.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveConversations(list), 300)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [list])

  useEffect(() => {
    if (hydrated.current) saveActiveId(activeId)
  }, [activeId])

  const active = useMemo(
    () => list.find((c) => c.id === activeId) ?? list[0],
    [list, activeId],
  )

  /** Controlled setter for the active conversation's messages. */
  const setMessages: Dispatch<SetStateAction<ChatMessage[]>> = useCallback(
    (action) => {
      setState((s) => {
        const list = s.list.map((c) => {
          if (c.id !== s.activeId) return c
          const messages =
            typeof action === 'function'
              ? (action as (p: ChatMessage[]) => ChatMessage[])(c.messages)
              : action
          const title =
            c.title === 'New chat' ? deriveTitle(messages) : c.title
          return { ...c, messages, title, updatedAt: Date.now() }
        })
        return { ...s, list }
      })
    },
    [],
  )

  const newChat = useCallback(() => {
    setState((s) => {
      // Reuse an existing empty "New chat" instead of stacking blanks.
      const existingEmpty = s.list.find((c) => c.messages.length === 0)
      if (existingEmpty) return { ...s, activeId: existingEmpty.id }
      const conv = createConversation()
      return { list: [conv, ...s.list], activeId: conv.id }
    })
  }, [])

  const selectChat = useCallback((id: string) => {
    setState((s) => ({ ...s, activeId: id }))
  }, [])

  const renameChat = useCallback((id: string, title: string) => {
    const t = title.trim() || 'New chat'
    setState((s) => ({
      ...s,
      list: s.list.map((c) => (c.id === id ? { ...c, title: t } : c)),
    }))
  }, [])

  const deleteChat = useCallback((id: string) => {
    setState((s) => {
      const remaining = s.list.filter((c) => c.id !== id)
      const list = remaining.length ? remaining : [createConversation()]
      const activeId =
        s.activeId === id ? list[0].id : s.activeId
      return { list, activeId }
    })
  }, [])

  // Most-recently-updated first for the sidebar.
  const conversations = useMemo(
    () => [...list].sort((a, b) => b.updatedAt - a.updatedAt),
    [list],
  )

  return {
    conversations,
    activeId,
    messages: active.messages,
    setMessages,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
  }
}
