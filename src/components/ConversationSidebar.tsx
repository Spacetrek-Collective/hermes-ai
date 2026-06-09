import { useEffect, useRef, useState } from 'react'
import { Check, MessageSquarePlus, Pencil, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/hermes'

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  /** Mobile drawer open state. */
  open: boolean
  onClose: () => void
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  open,
  onClose,
}: ConversationSidebarProps) {
  return (
    <>
      {/* Backdrop (all sizes — sidebar is an overlay drawer) */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r bg-card/90 backdrop-blur-xl transition-transform',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <Button className="flex-1 justify-start" onClick={onNew}>
            <MessageSquarePlus />
            New chat
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <ul className="flex flex-col gap-1 p-2">
            {conversations.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => {
                  onSelect(c.id)
                  onClose()
                }}
                onDelete={() => onDelete(c.id)}
                onRename={(title) => onRename(c.id, title)}
              />
            ))}
          </ul>
        </ScrollArea>
      </aside>
    </>
  )
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: Conversation
  active: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (title: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(conversation.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const commit = () => {
    onRename(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <li className="flex items-center gap-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') setEditing(false)
          }}
          className="h-8"
        />
        <Button size="icon" variant="ghost" className="size-7" onClick={commit}>
          <Check />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          onClick={() => {
            setValue(conversation.title)
            setEditing(false)
          }}
        >
          <X />
        </Button>
      </li>
    )
  }

  return (
    <li
      className={cn(
        'group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm',
        active ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex-1 truncate text-left"
        title={conversation.title}
      >
        {conversation.title}
      </button>
      <div className="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="size-7"
          aria-label="Rename"
          onClick={() => {
            setValue(conversation.title)
            setEditing(true)
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:text-destructive"
          aria-label="Delete"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  )
}
