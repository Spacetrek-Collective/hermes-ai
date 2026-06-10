import { useEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { Live2DStage } from "@/components/Live2DStage";
import type { Live2DStageHandle } from "@/components/Live2DStage";
import { ChatPanel } from "@/components/ChatPanel";
import { ConversationSidebar } from "@/components/ConversationSidebar";
import { SearchDialog } from "@/components/SearchDialog";
import { LoginScreen } from "@/components/LoginScreen";
import { Button } from "@/components/ui/button";
import { useConversations } from "@/hooks/useConversations";
import { useHermesChat } from "@/hooks/useHermesChat";
import { useAuth } from "@/hooks/useAuth";
import { MODELS, loadActiveModel, saveActiveModel } from "@/lib/models";
import type { ModelConfig } from "@/lib/models";

function App() {
  const { authed, login } = useAuth();
  const liveRef = useRef<Live2DStageHandle>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelConfig>(loadActiveModel);

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

  const { isStreaming, error, sendMessage, stop } = useHermesChat(
    setMessages,
    (mood) => liveRef.current?.triggerMood(mood),
  );

  const handleSelectModel = (m: ModelConfig) => {
    saveActiveModel(m.id);
    setActiveModel(m);
  };

  if (!authed) {
    return <LoginScreen onLogin={login} />;
  }

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
          ref={liveRef}
          model={activeModel}
          className="absolute inset-0 sm:right-[380px]"
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
              models={MODELS}
              activeModel={activeModel}
              onModelChange={handleSelectModel}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
