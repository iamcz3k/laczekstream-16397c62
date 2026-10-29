import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Chrome, Download, Sparkles, Search, Trophy, MousePointerClick, Keyboard, Settings2, Check } from "lucide-react";

export const Route = createFileRoute("/extension")({
  head: () => ({
    meta: [
      { title: "Chrome Extension — LaCzek Stream" },
      { name: "description", content: "Install the LACZEK STREAM Chrome extension: instant search, live fixtures and quick links from your toolbar." },
      { property: "og:title", content: "LACZEK STREAM Chrome Extension" },
      { property: "og:description", content: "Instant movie & football search and quick links, right in your browser toolbar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExtensionPage,
});

const FEATURES = [
  { icon: Sparkles, title: "One-click access", desc: "Open movies, live sports, radio, podcasts and downloads straight from your toolbar." },
  { icon: Search, title: "Instant search", desc: "Type any title and jump straight into LACZEK STREAM's search results." },
  { icon: Trophy, title: "Today's live fixtures", desc: "See football matches and kick-off times, then open the stream in one click." },
  { icon: MousePointerClick, title: "Right-click anywhere", desc: "Highlight a title on any site and search it on LACZEK STREAM." },
  { icon: Keyboard, title: "Alt + L shortcut", desc: "Pop the extension open from any tab without touching the mouse." },
  { icon: Settings2, title: "Your preferences", desc: "New-tab behaviour and right-click search controls." },
];

const STEPS = [
  "Unzip the downloaded laczek-extension.zip file.",
  "Open chrome://extensions in Chrome, Edge, Brave, Opera or Arc.",
  "Turn on Developer mode (top-right toggle).",
  "Click Load unpacked and pick the unzipped folder.",
  "Pin LACZEK STREAM to your toolbar and you're done.",
];

function ExtensionPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch("/laczek-extension.zip");
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "laczek-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
      setDone(true);
      setShowSteps(true);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <button onClick={() => navigate({ to: "/" })} className="mb-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <section className="rounded-3xl border border-border bg-secondary/30 p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-[11px] font-bold text-primary">
          <Chrome className="h-3.5 w-3.5" /> Chrome · Edge · Brave · Opera
        </span>
        <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">LACZEK STREAM browser extension</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Bring instant search and today's live fixtures into your browser toolbar. Free, optional, and it never touches the pages you browse.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={download}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {done ? <Check className="h-4 w-4" /> : <Chrome className="h-4 w-4" />}
            {downloading ? "Preparing…" : done ? "Downloaded — follow the steps" : "Add to Chrome"}
          </button>
          <button
            onClick={download}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-bold transition hover:bg-secondary/70"
          >
            <Download className="h-4 w-4" /> Download .zip
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Chrome only allows one-click installs from the Web Store, so the extension installs in Developer mode — takes about 20 seconds.
        </p>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-secondary/20 p-4">
            <f.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-2 text-sm font-bold">{f.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-3xl border border-border bg-secondary/20 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black">How to install</h2>
          <button onClick={() => setShowSteps((s) => !s)} className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold">
            {showSteps ? "Hide" : "Show"}
          </button>
        </div>
        {showSteps && (
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-black text-primary">{i + 1}</span>
                <span className="text-muted-foreground">{s}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
