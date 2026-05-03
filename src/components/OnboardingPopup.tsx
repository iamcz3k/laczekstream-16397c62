import { useEffect, useState } from "react";
import { Camera, Film, Trophy, Tv, Youtube } from "lucide-react";
import { getPrefs, setPrefs } from "@/lib/preferences";
import type { TabKey } from "@/components/Header";

const TAB_OPTIONS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; emoji: string }[] = [
  { key: "movies", label: "Movies", icon: Film, emoji: "🎬" },
  { key: "football", label: "Football", icon: Trophy, emoji: "⚽" },
  { key: "tv", label: "Live TV", icon: Tv, emoji: "📺" },
  { key: "youtube", label: "Music & YouTube", icon: Youtube, emoji: "🎵" },
  { key: "cctv", label: "Live CCTV", icon: Camera, emoji: "📹" },
];

export function OnboardingPopup({ onPickTab }: { onPickTab: (tab: TabKey) => void }) {
  const [step, setStep] = useState<"name" | "tab" | "done">("done");
  const [name, setName] = useState("");

  useEffect(() => {
    const prefs = getPrefs();
    if (!prefs.onboardedName) setStep("name");
    else if (!prefs.onboardedTab) setStep("tab");
    else setStep("done");
  }, []);

  if (step === "done") return null;

  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPrefs({ name: trimmed, onboardedName: true });
    setStep("tab");
  }

  function pickTab(tab: TabKey) {
    setPrefs({ defaultTab: tab, onboardedTab: true });
    setStep("done");
    onPickTab(tab);
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl">
      <div className="w-full max-w-md rounded-3xl border border-border bg-popover text-popover-foreground p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        {step === "name" && (
          <form onSubmit={submitName} className="space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-3xl">👋</div>
              <h2 className="text-2xl font-black tracking-tight">Welcome to LACZEK STREAMs</h2>
              <p className="mt-2 text-sm text-muted-foreground">What should we call you?</p>
            </div>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={32}
              className="w-full rounded-2xl border border-border bg-secondary px-4 py-3 text-base focus:border-primary focus:outline-none"
            />
            <button type="submit" disabled={!name.trim()} className="w-full rounded-2xl bg-primary py-3 font-bold text-primary-foreground transition active:scale-95 disabled:opacity-40">
              Continue
            </button>
          </form>
        )}
        {step === "tab" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-3xl">🎯</div>
              <h2 className="text-2xl font-black tracking-tight">What brings you here?</h2>
              <p className="mt-2 text-sm text-muted-foreground">We'll set this as your default tab.</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {TAB_OPTIONS.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => pickTab(key)}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/60 px-4 py-3 text-left transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}