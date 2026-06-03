import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Clock,
  Code2,
  Download,
  Gauge,
  HelpCircle,
  History as HistoryIcon,
  Info,
  KeyboardIcon,
  Languages,
  ListChecks,
  MoreVertical,
  RefreshCcw,
  Search as SearchIcon,
  Send,
  Share2,
  Shuffle,
  Smartphone,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { tmdbRandomMovie } from "@/lib/api";
import { clearLibrary, exportLibrary } from "@/lib/library";
import { getPrefs, setPrefs } from "@/lib/preferences";
import { DeveloperInfo } from "@/components/DeveloperInfo";
import { QA_LIST } from "@/lib/qa";
import { BugReport } from "@/components/BugReport";
import { LANGUAGES } from "@/lib/languages";
import { CHANGELOG, type ChangeKind } from "@/lib/changelog";

export function MoreMenu({ onPicked }: { onPicked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const navigate = useNavigate();
  const [canInstall, setCanInstall] = useState(false);
  const installPromptRef = useRef<unknown>(null);

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      installPromptRef.current = e;
      setCanInstall(true);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function installApp() {
    const p = installPromptRef.current as { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null;
    if (p) {
      await p.prompt();
      await p.userChoice.catch(() => {});
      installPromptRef.current = null;
      setCanInstall(false);
    } else {
      setShowInstallHelp(true);
    }
    setOpen(false);
  }

  function openUpdates() {
    setOpen(false);
    window.open("https://t.me/laczekstream", "_blank", "noopener");
  }

  function goSpeedTest() { setOpen(false); navigate({ to: "/speedtest" }); }
  function goParty() { setOpen(false); navigate({ to: "/party" }); }

  // Lock body scroll when drawer open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  async function surpriseMe() {
    setBusy(true);
    try {
      const movie = await tmdbRandomMovie();
      if (movie) {
        setOpen(false);
        onPicked?.();
        navigate({ to: "/watch/$kind/$id", params: { kind: movie.type, id: String(movie.id) } });
      }
    } finally {
      setBusy(false);
    }
  }

  function goTab(tab: "library" | "genres", section?: "continue" | "watchlist" | "history") {
    setOpen(false);
    if (window.location.pathname !== "/") {
      navigate({ to: "/" });
      setTimeout(() => window.dispatchEvent(new CustomEvent("laczek:navigate-tab", { detail: { tab, section } })), 50);
    } else {
      window.dispatchEvent(new CustomEvent("laczek:navigate-tab", { detail: { tab, section } }));
    }
  }

  function shareSite() {
    setOpen(false);
    const data = { title: "LACZEK STREAM", text: "Free movies, TV, football, anime & live CCTV.", url: window.location.origin };
    if (navigator.share) navigator.share(data).catch(() => {});
    else { navigator.clipboard?.writeText(data.url); alert("Link copied to clipboard"); }
  }

  function exportData() {
    setOpen(false);
    const blob = new Blob([exportLibrary()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `laczek-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function clearAll() {
    setOpen(false);
    if (confirm("Clear continue watching, watchlist and history?")) clearLibrary("all");
  }

  function reload() {
    setOpen(false);
    window.location.reload();
  }

  const currentLang = LANGUAGES.find((l) => l.code === (getPrefs().language || "en")) || LANGUAGES[0];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-full glass transition hover:bg-primary hover:text-primary-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {/* Slide-in drawer */}
      <div
        className={`fixed inset-0 z-[80] transition-opacity duration-300 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
        <aside
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-0 top-0 flex h-full w-[88%] max-w-[380px] flex-col border-l border-border bg-popover text-popover-foreground shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <header className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-black tracking-tight">Menu</h2>
              <p className="text-[11px] text-muted-foreground">Quick actions & settings</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-full bg-secondary p-2 transition hover:bg-primary hover:text-primary-foreground">
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto py-2">
            <Group label="Library">
              <Row icon={Clock} onClick={() => goTab("library", "continue")}>Continue watching</Row>
              <Row icon={Bookmark} onClick={() => goTab("library", "watchlist")}>Watchlist</Row>
              <Row icon={HistoryIcon} onClick={() => goTab("library", "history")}>History</Row>
              <Row icon={Sparkles} onClick={() => goTab("genres")}>Browse genres</Row>
              <Row icon={Shuffle} onClick={surpriseMe} disabled={busy}>{busy ? "Picking…" : "Surprise me"}</Row>
            </Group>

            <Group label="Settings">
              <Row icon={Languages} onClick={() => setShowLang(true)} value={`${currentLang.native}`}>Language</Row>
            </Group>

            <Group label="More">
              <Row icon={ListChecks} onClick={() => { setOpen(false); setShowChangelog(true); }}>What's new</Row>
              <Row icon={Send} onClick={openUpdates}>Updates · Telegram</Row>
              <Row icon={Smartphone} onClick={installApp}>{canInstall ? "Install app" : "Install app / APK"}</Row>
              <Row icon={Users} onClick={goParty}>Watch Party</Row>
              <Row icon={Gauge} onClick={goSpeedTest}>Speed test</Row>
              <Row icon={Share2} onClick={shareSite}>Share LACZEK STREAM</Row>
              <Row icon={Download} onClick={exportData}>Export my library</Row>
              <Row icon={HelpCircle} onClick={() => { setOpen(false); setShowQA(true); }}>Help & FAQ</Row>
              <Row icon={Code2} onClick={() => { setOpen(false); setShowDev(true); }}>Developer</Row>
              <BugReport trigger="inline" />
              <Row icon={KeyboardIcon} onClick={() => { setOpen(false); setShowShortcuts(true); }}>Keyboard shortcuts</Row>
              <Row icon={RefreshCcw} onClick={reload}>Reload streams</Row>
              <Row icon={Info} onClick={() => { setOpen(false); setShowAbout(true); }}>About</Row>
            </Group>

            <Group label="Danger zone">
              <Row icon={Trash2} onClick={clearAll} destructive>Clear my data</Row>
            </Group>
          </div>

          <footer className="border-t border-border px-5 py-3 text-center text-[11px] text-muted-foreground">
            LACZEK STREAM · v3
          </footer>
        </aside>
      </div>

      {showShortcuts && (
        <Modal title="Keyboard shortcuts" onClose={() => setShowShortcuts(false)}>
          <ul className="space-y-2 text-sm">
            <li><Kbd>Space</Kbd> Play / pause</li>
            <li><Kbd>F</Kbd> Fullscreen</li>
            <li><Kbd>M</Kbd> Mute</li>
            <li><Kbd>← →</Kbd> Seek 10s</li>
            <li><Kbd>Esc</Kbd> Close player</li>
          </ul>
        </Modal>
      )}
      {showAbout && (<Modal title="About LACZEK STREAM" onClose={() => setShowAbout(false)}><AboutBody /></Modal>)}
      {showDev && (<Modal title="Developer" onClose={() => setShowDev(false)}><DeveloperInfo /></Modal>)}
      {showQA && (
        <Modal title="Help & FAQ" onClose={() => setShowQA(false)}>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
            {QA_LIST.map((item, i) => (
              <details key={i} className="rounded-xl border border-border bg-secondary/40 p-3">
                <summary className="cursor-pointer text-sm font-bold">{item.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </Modal>
      )}
      {showLang && <LanguagePicker onClose={() => setShowLang(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      {showInstallHelp && (<Modal title="Install LACZEK STREAM" onClose={() => setShowInstallHelp(false)}><InstallBody /></Modal>)}
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <p className="px-5 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function Row({ icon: Icon, children, onClick, destructive, disabled, value }: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  value?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 px-5 py-3 text-left text-sm transition disabled:opacity-50 ${destructive ? "text-destructive hover:bg-destructive/10" : "hover:bg-secondary"}`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 font-medium">{children}</span>
      {value && <span className="text-xs text-muted-foreground">{value}</span>}
    </button>
  );
}

function LanguagePicker({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const current = getPrefs().language || "en";
  const filtered = LANGUAGES.filter((l) =>
    `${l.name} ${l.native} ${l.code}`.toLowerCase().includes(q.toLowerCase()),
  );
  function pick(code: string) {
    setPrefs({ language: code });
    document.documentElement.lang = code;
    // Use Google Translate's no-cookie iframe trick to translate the live DOM.
    // We inject the widget script once, then trigger a translation by setting the
    // hidden select element's value.
    try {
      type GT = { TranslateElement: new (opts: { pageLanguage: string; autoDisplay: boolean }, el: string) => unknown };
      const w = window as unknown as { google?: { translate?: GT }; googleTranslateElementInit?: () => void };
      if (!w.google?.translate) {
        w.googleTranslateElementInit = () => {
          const g = (window as unknown as { google?: { translate?: GT } }).google;
          if (g?.translate) new g.translate.TranslateElement({ pageLanguage: "en", autoDisplay: false }, "google_translate_element");
          setTimeout(() => applyLang(code), 700);
        };
        if (!document.getElementById("google_translate_element")) {
          const div = document.createElement("div");
          div.id = "google_translate_element";
          div.style.display = "none";
          document.body.appendChild(div);
        }
        const s = document.createElement("script");
        s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        s.async = true;
        document.body.appendChild(s);
      } else {
        applyLang(code);
      }
    } catch {}
    onClose();
  }
  function applyLang(code: string) {
    const sel = document.querySelector<HTMLSelectElement>("select.goog-te-combo");
    if (sel) {
      sel.value = code;
      sel.dispatchEvent(new Event("change"));
    }
  }
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/85 p-0 backdrop-blur-xl sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-2xl sm:h-[70vh] sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-black">Choose language</h3>
            <p className="text-[11px] text-muted-foreground">{LANGUAGES.length} languages</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="relative px-5 py-3">
          <SearchIcon className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-full border border-border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
            autoFocus
          />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filtered.map((l) => (
            <button
              key={l.code}
              onClick={() => pick(l.code)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-secondary ${current === l.code ? "bg-primary/10 text-primary" : ""}`}
            >
              <span>
                <span className="font-bold">{l.native}</span>
                <span className="ml-2 text-xs text-muted-foreground">{l.name}</span>
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{l.code}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChangelogModal({ onClose }: { onClose: () => void }) {
  const colors: Record<ChangeKind, string> = {
    new: "bg-primary text-primary-foreground",
    fix: "bg-emerald-500 text-white",
    improved: "bg-blue-500 text-white",
    soon: "bg-amber-500 text-white",
  };
  const labels: Record<ChangeKind, string> = { new: "NEW", fix: "FIX", improved: "IMPROVED", soon: "SOON" };
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/85 p-0 backdrop-blur-xl sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-2xl sm:h-[70vh] sm:max-w-lg sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-base font-black">What's new</h3>
            <p className="text-[11px] text-muted-foreground">Updates, fixes, and what's coming soon</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {CHANGELOG.map((c, i) => (
            <div key={i} className="rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="mb-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${colors[c.kind]}`}>{labels[c.kind]}</span>
                <span className="text-[11px] text-muted-foreground">{c.date}</span>
              </div>
              <p className="text-sm font-bold">{c.title}</p>
              {c.detail && <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-popover text-popover-foreground p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-lg font-bold">{title}</h3>
        {children}
        <div className="mt-5 text-right">
          <button onClick={onClose} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Close</button>
        </div>
      </div>
    </div>
  );
}

function AboutBody() {
  return (
    <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed text-muted-foreground">
      <p>Welcome to <span className="font-bold text-foreground">LACZEK STREAMs</span> — your all-in-one digital entertainment hub. Movies, live football, free TV, music, anime and live CCTV — all in one place.</p>
      <p className="text-foreground font-bold">Our Mission</p>
      <p>Provide a seamless, free, and engaging entertainment experience for users worldwide.</p>
      <p className="text-center font-bold text-foreground">Start streaming. Stay connected. Enjoy more.</p>
    </div>
  );
}

function InstallBody() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      <p>Use your browser install option if it appears. On Android, open the browser menu and choose <span className="font-bold text-foreground">Add to Home screen</span> or <span className="font-bold text-foreground">Install app</span>.</p>
      <a
        href="https://www.mediafire.com/file/q823khadatbqlol/LACZEK_STREAM.apk/file"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-3 font-bold text-primary-foreground"
      >
        Download APK mirror
      </a>
      <p className="text-xs">If the install prompt is not shown, the browser has not exposed install permission yet. The APK mirror still opens directly.</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="mr-2 inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-bold">{children}</kbd>;
}
