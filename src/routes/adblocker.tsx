import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Apple, ShieldCheck, Smartphone, Monitor, Check, ExternalLink } from "lucide-react";
import {
  recordAdblockInstalled,
  isAdblockInstalledForUser,
  getAdblockClicks,
  recordAdblockClick,
  type AdblockClicks,
} from "@/lib/admin-v2-store";
import { getPrefs } from "@/lib/preferences";
import { trackEvent } from "@/lib/tracker";

export const Route = createFileRoute("/adblocker")({
  head: () => ({
    meta: [
      { title: "Ad Blocker — LaCzek Stream" },
      { name: "description", content: "Install a free ad blocker to keep LaCzek Stream clean. Optional — download only if you want." },
      { property: "og:title", content: "Install an Ad Blocker for LaCzek Stream" },
      { property: "og:description", content: "Optional guide to blocking pop-up ads from third-party stream providers." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdblockerPage,
});

type Device = "iphone" | "android" | "desktop";
const DEVICES: { key: Device; label: string; icon: React.ComponentType<{ className?: string }>; url: string; cta: string; note: string }[] = [
  { key: "iphone", label: "iPhone / iPad", icon: Apple,
    url: "https://apps.apple.com/us/app/adguard-ad-blocker-for-safari/id1047223162",
    cta: "Open App Store", note: "AdGuard for Safari — free, no account needed." },
  { key: "android", label: "Android", icon: Smartphone,
    url: "https://github.com/pass-with-high-score/blockads-android/releases/download/v6.5.2/app-arm64-v8a-release.apk",
    cta: "Download APK", note: "System-wide ad blocker (.apk). Enable install from unknown sources." },
  { key: "desktop", label: "Desktop (Chrome / Edge)", icon: Monitor,
    url: "https://chromewebstore.google.com/detail/ublock/epcnnfbjfcgphgdmggkamkmgojdagdnn?hl=en",
    cta: "Add to browser", note: "uBlock Origin Lite — one click, no configuration." },
];
function detectDefault(): Device {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function AdblockerPage() {
  const [device, setDevice] = useState<Device>(() => detectDefault());
  const [installed, setInstalled] = useState(false);
  const [clicks, setClicks] = useState<AdblockClicks>({ iphone: 0, android: 0, desktop: 0 });

  useEffect(() => {
    setClicks(getAdblockClicks());
    const name = getPrefs().name || "";
    if (name) setInstalled(isAdblockInstalledForUser(name));
  }, []);

  const active = useMemo(() => DEVICES.find((d) => d.key === device)!, [device]);

  function markInstalled(next: boolean) {
    setInstalled(next);
    if (!next) return;
    const name = getPrefs().name || "Anonymous";
    recordAdblockInstalled(name, active.label);
    void trackEvent(`Installed AdBlocker (${active.label})`, "action", { device: active.label });
  }
  function onCtaClick() {
    recordAdblockClick(active.key);
    setClicks(getAdblockClicks());
    void trackEvent(`AdBlocker Click (${active.label})`, "action", { device: active.label });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-4">
          <button onClick={() => window.history.back()} aria-label="Back" className="rounded-full bg-secondary p-2 hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight">Ad blocker</h1>
            <p className="text-[11px] text-muted-foreground">Optional · install only if you want</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <section className="rounded-3xl border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/15 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div>
            <div>
              <h2 className="text-base font-black">Block third-party pop-up ads</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                LaCzek Stream uses external stream providers — some push pop-up ads we can't
                remove server-side. Installing one of these free ad blockers keeps your experience
                clean. This page is optional; nothing is forced.
              </p>
            </div>
          </div>
        </section>

        <section>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Pick your device</p>
          <div className="grid grid-cols-3 gap-2">
            {DEVICES.map(({ key, label, icon: Icon }) => {
              const isActive = key === device;
              const count = clicks[key] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setDevice(key)}
                  className={`relative flex flex-col items-center gap-2 rounded-2xl border px-2 py-4 text-xs font-bold transition ${
                    isActive ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/60 hover:border-primary"
                  }`}
                >
                  <span className={`absolute -right-1 -top-1 min-w-[22px] rounded-full px-1.5 py-0.5 text-[10px] font-black ${isActive ? "bg-background text-primary" : "bg-primary text-primary-foreground"}`}>
                    {count}
                  </span>
                  <Icon className="h-6 w-6" />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-secondary/40 p-5">
          <div className="flex items-center gap-3">
            <active.icon className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-black">{active.label}</h3>
              <p className="text-[11px] text-muted-foreground">{active.note}</p>
            </div>
          </div>
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCtaClick}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition active:scale-95"
          >
            <ExternalLink className="h-4 w-4" />
            {active.cta}
            <span className="ml-1 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-black">{clicks[active.key] || 0}</span>
          </a>

          <button
            onClick={() => markInstalled(!installed)}
            className={`mt-3 flex w-full items-start gap-3 rounded-2xl border p-3 text-left text-sm transition ${
              installed ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border bg-secondary/40 hover:border-primary"
            }`}
          >
            <span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border ${installed ? "border-emerald-500 bg-emerald-500 text-white" : "border-border"}`}>
              {installed && <Check className="h-3.5 w-3.5" />}
            </span>
            <span>
              {installed ? "Marked as installed. Thanks for keeping the site clean!" : "I already installed an ad blocker."}
            </span>
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-secondary/20 p-5 text-xs text-muted-foreground">
          <p className="font-bold text-foreground">Why do I see pop-ups?</p>
          <p className="mt-1">Third-party stream hosts monetize with pop-under redirects. LaCzek Stream never opens pop-ups from its own domain. Ad blockers stop them at the browser level so streams keep working.</p>
        </section>
      </main>
    </div>
  );
}
