import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types/hermes";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  /** Mobile drawer open state. */
  open: boolean;
  onClose: () => void;
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

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
          "fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r bg-card/90 backdrop-blur-xl transition-transform",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header: logo · search · close */}
        <header className="flex items-center justify-between border-b px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <span className="text-sm font-semibold">Hermes</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Search chats"
              onClick={() => {
                setSearchOpen((s) => {
                  if (s) setQuery("");
                  return !s;
                });
              }}
            >
              <Search />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Close sidebar"
              onClick={onClose}
            >
              <X />
            </Button>
          </div>
        </header>

        {/* New chat + optional search field */}
        <div className="flex flex-col gap-2 p-3">
          <Button
            className="w-full justify-start h-auto"
            variant="outline"
            onClick={onNew}
          >
            <Plus />
            New chat
          </Button>
          {searchOpen && (
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setQuery("");
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search chats…"
                className="h-10 pl-8"
              />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <ul className="flex flex-col gap-1 p-3 pt-0">
            {filtered.length === 0 && (
              <li className="px-2 py-6 text-center text-xs text-muted-foreground">
                {query ? "No matching chats" : "No chats yet"}
              </li>
            )}
            {filtered.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                onSelect={() => {
                  onSelect(c.id);
                  onClose();
                }}
                onDelete={() => onDelete(c.id)}
                onRename={(title) => onRename(c.id, title)}
              />
            ))}
          </ul>
        </ScrollArea>
      </aside>
    </>
  );
}

function ConversationItem({
  conversation,
  active,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    onRename(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="flex items-center gap-1.5 p-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
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
            setValue(conversation.title);
            setEditing(false);
          }}
        >
          <X />
        </Button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-1 rounded-md px-3 py-1.5 text-sm",
        active ? "bg-accent" : "hover:bg-accent/50",
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
            setValue(conversation.title);
            setEditing(true);
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
  );
}
