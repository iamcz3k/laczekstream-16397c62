import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BipEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "laczek:pwa:dismissed";

export function PwaInstallPrompt() {
  const [evt, setEvt] = useState<BipEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BipEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  if (!open || !evt) return null;

  async function install() {
    if (!evt) return;
    try { await evt.prompt(); await evt.userChoice; } catch {}
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setOpen(false);
  }
  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setOpen(false);
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[300] w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-popover/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Download className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Install LACZEK STREAM</p>
          <p className="text-xs text-muted-foreground">Get the app on your home screen for a faster, full-screen experience.</p>
        </div>
        <button onClick={dismiss} className="rounded-full p-1 text-muted-foreground"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={dismiss} className="flex-1 rounded-full border border-border px-3 py-2 text-xs">Later</button>
        <button onClick={install} className="flex-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">Install</button>
      </div>
    </div>
  );
}