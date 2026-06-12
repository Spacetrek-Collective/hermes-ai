import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectPositioner,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { EDGE_VOICES, type TTSProvider, type TTSConfig } from "@/lib/tts";
import type { BgPreset } from "@/lib/background";

const CUSTOM_URL = "__url__";

interface SettingsDialogProps {
  onClose: () => void;
  ttsProviders: TTSProvider[];
  ttsConfig: TTSConfig;
  onTTSConfigChange: (patch: Partial<TTSConfig>) => void;
  bg: string;
  bgPresets: BgPreset[];
  onBgChange: (value: string) => void;
}

export function SettingsDialog({
  onClose,
  ttsProviders,
  ttsConfig,
  onTTSConfigChange,
  bg,
  bgPresets,
  onBgChange,
}: SettingsDialogProps) {
  const isPreset = bgPresets.some((p) => p.value === bg);
  const isCustom = bg !== "" && !isPreset;
  // Keep "Custom URL" selected while the field is empty (don't snap back to None).
  const [customMode, setCustomMode] = useState(isCustom);
  const [urlDraft, setUrlDraft] = useState(isCustom ? bg : "");
  const bgSelect = customMode ? CUSTOM_URL : bg === "" ? "none" : bg;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex flex-col gap-5 p-4">
          {/* Text-to-speech */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Text-to-speech
            </h3>

            <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
              <span className="text-sm">Provider</span>
              <div className="flex justify-end">
                <SelectRoot
                  value={ttsConfig.provider}
                  onValueChange={(id) =>
                    onTTSConfigChange({ provider: id as string })
                  }
                >
                  <SelectTrigger
                    aria-label="TTS provider"
                    className="min-w-36 justify-between"
                  >
                    <SelectValue>
                      {ttsProviders.find((p) => p.id === ttsConfig.provider)
                        ?.label ?? ttsConfig.provider}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectPopup>
                      {ttsProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </SelectPositioner>
                </SelectRoot>
              </div>
            </div>

            {ttsConfig.provider === "edge" && (
              <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
                <span className="text-sm">Voice</span>
                <div className="flex justify-end">
                  <SelectRoot
                    value={ttsConfig.edgeVoice}
                    onValueChange={(id) =>
                      onTTSConfigChange({ edgeVoice: id as string })
                    }
                  >
                    <SelectTrigger
                      aria-label="Edge voice"
                      className="min-w-36 justify-between"
                    >
                      <SelectValue>
                        {EDGE_VOICES.find((v) => v.id === ttsConfig.edgeVoice)
                          ?.label ?? ttsConfig.edgeVoice}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPositioner>
                      <SelectPopup>
                        {EDGE_VOICES.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </SelectPositioner>
                  </SelectRoot>
                </div>
              </div>
            )}

            {ttsConfig.provider === "edge" && (
              <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
                <span className="text-sm">Pitch</span>
                <div className="flex items-center gap-3">
                  <Slider
                    min={-50}
                    max={50}
                    step={5}
                    value={ttsConfig.pitch}
                    onValueChange={(v) =>
                      onTTSConfigChange({ pitch: Array.isArray(v) ? v[0] : v })
                    }
                    aria-label="Edge TTS pitch"
                    className="flex-1"
                  />
                  <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {ttsConfig.pitch > 0 ? `+${ttsConfig.pitch}` : ttsConfig.pitch}
                  </span>
                </div>
              </div>
            )}

            {ttsConfig.provider === "minimax" && (
              <>
                <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
                  <span className="text-sm">API key</span>
                  <Input
                    type="password"
                    value={ttsConfig.minimaxApiKey}
                    onChange={(e) =>
                      onTTSConfigChange({ minimaxApiKey: e.target.value })
                    }
                    placeholder="Minimax API key"
                    aria-label="Minimax API key"
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
                  <span className="text-sm">Voice ID</span>
                  <Input
                    value={ttsConfig.minimaxVoice}
                    onChange={(e) =>
                      onTTSConfigChange({ minimaxVoice: e.target.value })
                    }
                    placeholder="female-shaonv"
                    aria-label="Minimax voice ID"
                  />
                </div>
              </>
            )}
          </section>

          {/* Appearance */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Appearance
            </h3>

            <div className="grid grid-cols-[5rem_1fr] items-center gap-3">
              <span className="text-sm">Background</span>
              <div className="flex justify-end">
                <SelectRoot
                  value={bgSelect}
                  onValueChange={(v) => {
                    const id = v as string;
                    if (id === CUSTOM_URL) {
                      setCustomMode(true);
                      if (urlDraft.trim()) onBgChange(urlDraft.trim());
                    } else {
                      setCustomMode(false);
                      onBgChange(id === "none" ? "" : id);
                    }
                  }}
                >
                  <SelectTrigger
                    aria-label="Background"
                    className="min-w-36 justify-between"
                  >
                    <SelectValue>
                      {bgSelect === "none"
                        ? "None"
                        : bgSelect === CUSTOM_URL
                          ? "Custom URL"
                          : (bgPresets.find((p) => p.value === bg)?.label ?? bg)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectPopup>
                      <SelectItem value="none">None</SelectItem>
                      {bgPresets.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_URL}>Custom URL</SelectItem>
                    </SelectPopup>
                  </SelectPositioner>
                </SelectRoot>
              </div>
            </div>

            {bgSelect === CUSTOM_URL && (
              <Input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onBlur={() => onBgChange(urlDraft.trim())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onBgChange(urlDraft.trim());
                }}
                placeholder="https://example.com/image.jpg"
                aria-label="Background image URL"
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
