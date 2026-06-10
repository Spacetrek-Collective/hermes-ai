import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Live2DStage } from "@/components/Live2DStage";
import { ChatPanel } from "@/components/ChatPanel";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { SearchDialog } from "@/components/SearchDialog";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/useConversations";
import { useHermesChat } from "@/hooks/useHermesChat";

const MODEL_URL =
  (import.meta.env.VITE_MODEL_URL as string | undefined) ??
  "/models/haru/haru_greeter_t03.model3.json";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl+K opens the search palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const {
    conversations,
    activeId,
    messages,
    setMessages,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
  } = useConversations();

  const { isStreaming, error, sendMessage, stop } = useHermesChat(setMessages);

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectChat}
        onNew={() => {
          newChat();
          setSidebarOpen(false);
        }}
        onDelete={deleteChat}
        onRename={renameChat}
        onOpenSearch={() => setSearchOpen(true)}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {searchOpen && (
        <SearchDialog
          conversations={conversations}
          onClose={() => setSearchOpen(false)}
          onSelect={(id) => {
            selectChat(id);
            setSidebarOpen(false);
          }}
          onNew={() => {
            newChat();
            setSidebarOpen(false);
          }}
        />
      )}

      <main className="relative h-full w-full overflow-hidden bg-linear-to-b from-background to-secondary">
        <Live2DStage
          modelUrl={MODEL_URL}
          className="absolute inset-0"
        />

        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 left-3 z-10"
          aria-label="Open conversations"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu />
        </Button>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-end sm:flex-row sm:items-stretch sm:justify-end sm:p-4">
          <div className="pointer-events-auto w-full sm:w-full sm:max-w-sm">
            <ChatPanel
              messages={messages}
              isStreaming={isStreaming}
              error={error}
              onSend={sendMessage}
              onStop={stop}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
