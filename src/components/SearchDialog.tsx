import { useEffect, useMemo, useRef, useState } from 'react'
import { CornerDownLeft, MessageSquare, Search, SquarePen, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/hermes'

interface SearchDialogProps {
  open: boolean
  conversations: Conversation[]
  onClose: () => void
  onSelect: (id: string) => void
  onNew: () => void
}

const DAY = 86_400_000

function groupLabel(ts: number): string {
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  if (ts >= startOfToday) return 'Today'
  if (ts >= startOfToday - DAY) return 'Yesterday'
  if (ts >= startOfToday - 7 * DAY) return 'Previous 7 Days'
  if (ts >= startOfToday - 30 * DAY) return 'Previous 30 Days'
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function SearchDialog({
  open,
  conversations,
  onClose,
  onSelect,
  onNew,
}: SearchDialogProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => c.title.toLowerCase().includes(q))
  }, [conversations, query])

  // Grouped, preserving the (already recency-sorted) order.
  const groups = useMemo(() => {
    const map = new Map<string, Conversation[]>()
    for (const c of filtered) {
      const label = groupLabel(c.updatedAt)
      const arr = map.get(label) ?? []
      arr.push(c)
      map.set(label, arr)
    }
    return [...map.entries()]
  }, [filtered])

  // Flat list for keyboard nav: New chat row first, then conversations.
  type Row = { kind: 'new' } | { kind: 'conv'; id: string }
  const rows = useMemo<Row[]>(
    () => [{ kind: 'new' }, ...filtered.map((c) => ({ kind: 'conv', id: c.id }) as Row)],
    [filtered],
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      // focus after the dialog paints
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  if (!open) return null

  const runRow = (row: Row) => {
    if (row.kind === 'new') onNew()
    else onSelect(row.id)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % rows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + rows.length) % rows.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const row = rows[activeIndex]
      if (row) runRow(row)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const convIndex = (id: string) => rows.findIndex((r) => r.kind === 'conv' && r.id === id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Search field */}
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            className="h-12 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* New chat */}
            <Row
              icon={<SquarePen className="size-4" />}
              label="New chat"
              active={activeIndex === 0}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => runRow({ kind: 'new' })}
            />

            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matching chats
              </p>
            )}

            {groups.map(([label, items]) => (
              <div key={label} className="mt-1">
                <p className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                {items.map((c) => {
                  const idx = convIndex(c.id)
                  return (
                    <Row
                      key={c.id}
                      icon={<MessageSquare className="size-4" />}
                      label={c.title}
                      active={activeIndex === idx}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => runRow({ kind: 'conv', id: c.id })}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function Row({
  icon,
  label,
  active,
  onMouseEnter,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  onMouseEnter: () => void
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm',
        active ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {active && (
        <CornerDownLeft className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}
