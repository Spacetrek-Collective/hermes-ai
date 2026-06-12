import { useCallback, useEffect, useRef, useState } from "react";
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
import { authStatus } from "@/lib/api";
import {
  loadBackground,
  saveBackground,
  fetchBgPresets,
  type BgPreset,
} from "@/lib/background";
import { useTTS } from "@/hooks/useTTS";
import { MODELS, loadActiveModel, saveActiveModel } from "@/lib/models";
import { TTS_PROVIDERS } from "@/lib/tts";
import type { ModelConfig } from "@/lib/models";

function App() {
  const { authed, authEnabled, apiMode, login, register, logout } = useAuth();
  const liveRef = useRef<Live2DStageHandle>(null);
  // null = still checking (API mode); true when at least one account exists.
  const [hasUsers, setHasUsers] = useState<boolean | null>(apiMode ? null : true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelConfig>(MODELS[0]);
  const [bg, setBg] = useState("");
  const [bgPresets, setBgPresets] = useState<BgPreset[]>([]);

  // Hydrate background + load presets after mount.
  useEffect(() => {
    let cancelled = false;
    void loadBackground().then((v) => {
      if (!cancelled) setBg(v);
    });
    void fetchBgPresets().then((p) => {
      if (!cancelled) setBgPresets(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBgChange = useCallback((value: string) => {
    saveBackground(value);
    setBg(value);
  }, []);

  // First-run check: if no accounts exist yet, show register instead of login.
  useEffect(() => {
    if (!apiMode || authed) return;
    let cancelled = false;
    void authStatus().then((s) => {
      if (!cancelled) setHasUsers(s.hasUsers);
    });
    return () => {
      cancelled = true;
    };
  }, [authed, apiMode]);

  // Hydrate active model from async storage after mount.
  useEffect(() => {
    let cancelled = false;
    void loadActiveModel().then((m) => {
      if (!cancelled) setActiveModel(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const { config: ttsConfig, setConfig: setTTSConfig, speak, onSpeakEnd, isSpeaking: ttsSpeaking } = useTTS();

  const handleTTSComplete = useCallback(
    async (text: string) => {
      const url = await speak(text);
      if (url) liveRef.current?.speak(url, onSpeakEnd);
    },
    [speak, onSpeakEnd],
  );

  const { isStreaming, error, sendMessage, stop } = useHermesChat(
    setMessages,
    (mood) => liveRef.current?.triggerMood(mood),
    handleTTSComplete,
  );

  const handleSelectModel = (m: ModelConfig) => {
    saveActiveModel(m.id);
    setActiveModel(m);
  };

  // Reload after logout so in-memory per-user state (conversations, etc.) resets.
  const handleLogout = useCallback(() => {
    logout();
    window.location.reload();
  }, [logout]);

  // Conversations hydrate once at mount — before auth in API mode. Reload on a
  // successful login so the next mount fetches this user's data with a token.
  const handleLogin = useCallback(
    async (u: string, p: string) => {
      const err = await login(u, p);
      if (!err) window.location.reload();
      return err;
    },
    [login],
  );

  const handleRegister = useCallback(
    async (u: string, p: string) => {
      const err = await register(u, p);
      if (!err) window.location.reload();
      return err;
    },
    [register],
  );

  if (!authed) {
    // Wait for the first-run check before deciding login vs register.
    if (apiMode && hasUsers === null) return null;
    const firstRun = apiMode && hasUsers === false;
    return (
      <LoginScreen
        onLogin={handleLogin}
        onRegister={firstRun ? handleRegister : undefined}
        registerOnly={firstRun}
      />
    );
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
        onLogout={authEnabled ? handleLogout : undefined}
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

      <main
        className="relative h-full w-full overflow-hidden bg-linear-to-b from-background to-secondary bg-cover bg-center"
        style={bg ? { backgroundImage: `url("${bg}")` } : undefined}
      >
        <Live2DStage
          ref={liveRef}
          model={activeModel}
          className="absolute inset-0 sm:right-95"
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
              ttsEnabled={ttsConfig.enabled}
              onTTSToggle={() => setTTSConfig({ enabled: !ttsConfig.enabled })}
              ttsProviders={TTS_PROVIDERS}
              activeTTSProvider={ttsConfig.provider}
              onTTSProviderChange={(id) => setTTSConfig({ provider: id })}
              ttsPitch={ttsConfig.pitch}
              onTTSPitchChange={(pitch) => setTTSConfig({ pitch })}
              bg={bg}
              bgPresets={bgPresets}
              onBgChange={handleBgChange}
              isSpeaking={ttsSpeaking}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
