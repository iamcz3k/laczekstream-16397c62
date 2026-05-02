import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Clock,
  Code2,
  Download,
  HelpCircle,
  History as HistoryIcon,
  Info,
  KeyboardIcon,
  Moon,
  MoreVertical,
  RefreshCcw,
  Share2,
  Shuffle,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { tmdbRandomMovie } from "@/lib/api";
import { clearLibrary, exportLibrary } from "@/lib/library";
import { getPrefs, setPrefs } from "@/lib/preferences";
import { DeveloperInfo } from "@/components/DeveloperInfo";
import { QA_LIST } from "@/lib/qa";

export function MoreMenu({ onPicked }: { onPicked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [showQA, setShowQA] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(() => getPrefs().theme || "dark");
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setPrefs({ theme: next });
    setOpen(false);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    // If we're not on the home route, navigate there first.
    if (window.location.pathname !== "/") {
      navigate({ to: "/" });
      // give the page a tick to mount before dispatching
      setTimeout(() => window.dispatchEvent(new CustomEvent("laczek:navigate-tab", { detail: { tab, section } })), 50);
    } else {
      window.dispatchEvent(new CustomEvent("laczek:navigate-tab", { detail: { tab, section } }));
    }
  }

  function shareSite() {
    setOpen(false);
    const data = { title: "LACZEK STREAM", text: "Free movies, TV, football, anime & live CCTV.", url: window.location.origin };
    if (navigator.share) navigator.share(data).catch(() => {});
    else {
      navigator.clipboard?.writeText(data.url);
      alert("Link copied to clipboard");
    }
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="More options"
        className="flex h-10 w-10 items-center justify-center rounded-full glass transition hover:bg-primary hover:text-primary-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[60] w-64 overflow-hidden rounded-2xl border border-border bg-black shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <MenuItem icon={Clock} onClick={() => goTab("library", "continue")}>Continue watching</MenuItem>
          <MenuItem icon={Bookmark} onClick={() => goTab("library", "watchlist")}>Watchlist</MenuItem>
          <MenuItem icon={HistoryIcon} onClick={() => goTab("library", "history")}>History</MenuItem>
          <MenuItem icon={Sparkles} onClick={() => goTab("genres")}>Browse genres</MenuItem>
          <MenuItem icon={Shuffle} onClick={surpriseMe} disabled={busy}>{busy ? "Picking…" : "Surprise me"}</MenuItem>
          <MenuItem icon={theme === "dark" ? Sun : Moon} onClick={toggleTheme}>
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </MenuItem>
          <MenuItem icon={Share2} onClick={shareSite}>Share LACZEK STREAM</MenuItem>
          <MenuItem icon={Download} onClick={exportData}>Export my library</MenuItem>
          <MenuItem icon={HelpCircle} onClick={() => { setOpen(false); setShowQA(true); }}>Help & FAQ</MenuItem>
          <MenuItem icon={Code2} onClick={() => { setOpen(false); setShowDev(true); }}>Developer</MenuItem>
          <MenuItem icon={KeyboardIcon} onClick={() => { setOpen(false); setShowShortcuts(true); }}>Keyboard shortcuts</MenuItem>
          <MenuItem icon={RefreshCcw} onClick={reload}>Reload streams</MenuItem>
          <MenuItem icon={Info} onClick={() => { setOpen(false); setShowAbout(true); }}>About</MenuItem>
          <MenuItem icon={Trash2} onClick={clearAll} destructive>Clear my data</MenuItem>
        </div>
      )}
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
      {showAbout && (
        <Modal title="About LACZEK STREAM" onClose={() => setShowAbout(false)}>
          <AboutBody />
        </Modal>
      )}
      {showDev && (
        <Modal title="Developer" onClose={() => setShowDev(false)}>
          <DeveloperInfo />
        </Modal>
      )}
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
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  onClick,
  destructive,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition disabled:opacity-50 ${destructive ? "text-destructive hover:bg-destructive hover:text-destructive-foreground" : "hover:bg-secondary"}`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{children}</span>
    </button>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-border bg-black p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
      <p>Welcome to <span className="font-bold text-foreground">LACZEK STREAMs</span> — your all-in-one digital entertainment hub designed to bring you closer to the content you love, anytime and anywhere. Whether you're a movie enthusiast, a sports fanatic, a music lover, or simply someone looking for real-time global access, LACZEK STREAMs is built to deliver a rich and diverse streaming experience without limits.</p>
      <p>At LACZEK STREAMs, we believe entertainment should be accessible, flexible, and enjoyable. That's why our platform offers a wide range of features all in one place:</p>
      <p><span className="font-bold text-foreground">🎬 Movies & Downloads</span> — Explore a growing collection of movies across different genres, from the latest releases to timeless classics. Stream movies directly or download selected titles for offline viewing — completely free. Availability may vary; some movies may not play due to temporary media issues or regional restrictions.</p>
      <p><span className="font-bold text-foreground">⚽ Live Football & Scores</span> — Stay connected to the world of football with live match streaming and real-time score updates.</p>
      <p><span className="font-bold text-foreground">📺 Free Live TV Channels</span> — Enjoy a variety of live TV channels from different regions: news, entertainment, sports and more.</p>
      <p><span className="font-bold text-foreground">🎵 Free Music Streaming</span> — Discover and stream music across multiple genres, artists and moods.</p>
      <p><span className="font-bold text-foreground">📹 Live CCTV Cameras</span> — Experience real-time views from various locations around the world through live CCTV camera feeds.</p>
      <p className="text-foreground font-bold">Important Notes & Disclaimer</p>
      <p>Some features may include advertisements from upstream sources. Not all content is guaranteed to be available at all times. We continuously work to improve availability and user experience, but occasional interruptions may occur.</p>
      <p className="text-foreground font-bold">Our Mission</p>
      <p>LACZEK STREAMs is committed to providing a seamless, free, and engaging entertainment experience for users worldwide.</p>
      <p className="text-center font-bold text-foreground">Start streaming. Stay connected. Enjoy more — only on LACZEK STREAMs.</p>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="mr-2 inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-bold">{children}</kbd>;
}