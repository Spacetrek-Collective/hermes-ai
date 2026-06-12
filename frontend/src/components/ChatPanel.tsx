import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Mic, Send, Settings, Square, Volume2, VolumeOff, } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SelectRoot,
  SelectTrigger,
  SelectPositioner,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { cn } from "@/lib/utils";
import { MOOD_TAG_RE } from "@/lib/mood";
import type { ChatMessage } from "@/types/hermes";
import type { ModelConfig } from "@/lib/models";
import type { TTSProvider, TTSConfig } from "@/lib/tts";
import type { BgPreset } from "@/lib/background";

interface ChatPanelProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  error: string | null;
  onSend: (text: string) => void;
  onStop: () => void;
  models: ModelConfig[];
  activeModel: ModelConfig;
  onModelChange: (model: ModelConfig) => void;
  ttsEnabled: boolean;
  onTTSToggle: () => void;
  ttsProviders: TTSProvider[];
  ttsConfig: TTSConfig;
  onTTSConfigChange: (patch: Partial<TTSConfig>) => void;
  bg: string;
  bgPresets: BgPreset[];
  onBgChange: (value: string) => void;
  isSpeaking: boolean;
}

export function ChatPanel({
  messages,
  isStreaming,
  error,
  onSend,
  onStop,
  models,
  activeModel,
  onModelChange,
  ttsEnabled,
  onTTSToggle,
  ttsProviders,
  ttsConfig,
  onTTSConfigChange,
  bg,
  bgPresets,
  onBgChange,
  isSpeaking,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
          <SelectRoot
            value={activeModel.id}
            onValueChange={(id) => {
              const m = models.find((x) => x.id === (id as string));
              if (m) onModelChange(m);
            }}
          >
            <SelectTrigger aria-label="Switch model">
              <span className="font-semibold">{activeModel.label}</span>
            </SelectTrigger>
            <SelectPositioner>
              <SelectPopup>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </SelectPositioner>
          </SelectRoot>
          <Button
            type="button"
            size="icon"
            variant={ttsEnabled ? "default" : "ghost"}
            className={cn("size-7", isSpeaking && "animate-pulse")}
            aria-label={ttsEnabled ? "Disable TTS" : "Enable TTS"}
            onClick={onTTSToggle}
          >
            {ttsEnabled ? (
              <Volume2 className="size-3.5" />
            ) : (
              <VolumeOff className="size-3.5 text-muted-foreground" />
            )}
          </Button>
          {!collapsed && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Settings"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="size-3.5" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block size-2 rounded-full",
              isStreaming
                ? "animate-pulse bg-amber-400"
                : "bg-muted-foreground/40",
            )}
          />
          <span className="text-xs text-muted-foreground">
            {isStreaming && isSpeaking
              ? "thinking + voice…"
              : isStreaming
                ? "thinking…"
                : isSpeaking
                  ? "speaking…"
                  : "online"}
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label={collapsed ? "Expand chat" : "Collapse chat"}
            onClick={() => {
              setCollapsed((c) => {
                if (!c) setSettingsOpen(false);
                return !c;
              });
            }}
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

      {settingsOpen && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          ttsProviders={ttsProviders}
          ttsConfig={ttsConfig}
          onTTSConfigChange={onTTSConfigChange}
          bg={bg}
          bgPresets={bgPresets}
          onBgChange={onBgChange}
        />
      )}
    </Card>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const displayContent = message.content.replace(MOOD_TAG_RE, "");
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
          "min-w-0 max-w-[80%] overflow-hidden rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "rounded-tr-sm bg-primary text-primary-foreground whitespace-pre-wrap"
            : "rounded-tl-sm bg-muted text-foreground",
        )}
      >
        {isUser ? (
          displayContent || (message.streaming ? "…" : "")
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-1 break-words last:mb-0">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="rounded bg-black/20 px-1 py-0.5 font-mono text-xs break-words">
                  {children}
                </code>
              ),
              table: ({ children }) => (
                <div className="my-1 max-w-full overflow-x-auto">
                  <table className="w-max border-collapse text-xs">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border px-2 py-1 text-left align-top font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-2 py-1 align-top">
                  {children}
                </td>
              ),
              pre: ({ children }) => (
                <pre className="my-1 overflow-x-auto rounded bg-black/20 p-2 font-mono text-xs">
                  {children}
                </pre>
              ),
              ul: ({ children }) => (
                <ul className="mb-1 ml-4 list-disc">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-1 ml-4 list-decimal">{children}</ol>
              ),
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline opacity-80 hover:opacity-100"
                >
                  {children}
                </a>
              ),
            }}
          >
            {displayContent || (message.streaming ? "…" : "")}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
