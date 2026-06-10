import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Mic, Send, Square } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/hermes";

const AI_NAME =
  (import.meta.env.VITE_AI_NAME as string | undefined) ?? "Hermes";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatPanel({
  messages,
  isStreaming,
  error,
  onSend,
  onStop,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition({ onTranscript: setDraft });

  useEffect(() => {
    const vp = viewportRef.current;
    if (vp) vp.scrollTop = vp.scrollHeight;
  }, [messages, collapsed]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || isStreaming) return;
    if (speech.listening) speech.stop();
    onSend(draft);
    setDraft("");
  };

  return (
    <Card
      className={cn(
        "flex w-full flex-col overflow-hidden bg-card/70 backdrop-blur-xl",
        "rounded-b-none rounded-t-2xl sm:rounded-xl",
        collapsed
          ? "h-auto"
          : "h-[58dvh] sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)]",
      )}
    >
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{AI_NAME}</span>
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              isStreaming
                ? "animate-pulse bg-amber-400"
                : "bg-muted-foreground/40",
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {isStreaming ? "thinking…" : "online"}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={collapsed ? "Expand chat" : "Collapse chat"}
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronDown
              className={cn("transition-transform", collapsed && "rotate-180")}
            />
          </Button>
        </div>
      </header>

      {!collapsed && (
        <>
          <ScrollArea viewportRef={viewportRef} className="flex-1">
            <div className="flex flex-col gap-4 p-4">
              {messages.length === 0 && (
                <p className="mt-8 text-center text-sm text-muted-foreground">
                  Say hello to start the conversation.
                </p>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>
          </ScrollArea>

          {error && (
            <p className="px-4 py-2 text-xs text-destructive">{error}</p>
          )}

          <form
            onSubmit={submit}
            className="flex items-center gap-2 border-t p-3"
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={speech.listening ? "Listening…" : "Type a message…"}
              disabled={isStreaming}
              autoFocus
            />
            {speech.supported && !isStreaming && (
              <Button
                type="button"
                size="icon"
                variant={speech.listening ? "default" : "secondary"}
                aria-label={
                  speech.listening ? "Stop dictation" : "Start dictation"
                }
                onClick={speech.toggle}
                className={cn(speech.listening && "animate-pulse")}
              >
                <Mic />
              </Button>
            )}
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={onStop}
              >
                <Square className="fill-current" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!draft.trim()}>
                <Send />
              </Button>
            )}
          </form>
        </>
      )}
    </Card>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2", isUser && "flex-row-reverse")}>
      <Avatar>
        <AvatarFallback
          className={cn(isUser && "bg-primary text-primary-foreground")}
        >
          {isUser ? "You" : "H"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {isUser ? (
          message.content || (message.streaming ? "…" : "")
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-xs">{children}</code>
              ),
              pre: ({ children }) => (
                <pre className="my-1 overflow-x-auto rounded bg-black/20 p-2 font-mono text-xs">{children}</pre>
              ),
              ul: ({ children }) => <ul className="mb-1 ml-4 list-disc">{children}</ul>,
              ol: ({ children }) => <ol className="mb-1 ml-4 list-decimal">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="underline opacity-80 hover:opacity-100">{children}</a>
              ),
            }}
          >
            {message.content || (message.streaming ? "…" : "")}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
