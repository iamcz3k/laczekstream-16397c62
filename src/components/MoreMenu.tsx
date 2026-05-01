import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Clock,
  Download,
  History as HistoryIcon,
  Info,
  KeyboardIcon,
  MoreVertical,
  RefreshCcw,
  Share2,
  Shuffle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { tmdbRandomMovie } from "@/lib/api";
import { clearLibrary, exportLibrary } from "@/lib/library";

export function MoreMenu({ onPicked }: { onPicked?: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
        <div className="absolute right-0 top-12 z-[60] w-64 overflow-hidden rounded-2xl border border-border glass shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <MenuItem icon={Clock} onClick={() => goTab("library", "continue")}>Continue watching</MenuItem>
          <MenuItem icon={Bookmark} onClick={() => goTab("library", "watchlist")}>Watchlist</MenuItem>
          <MenuItem icon={HistoryIcon} onClick={() => goTab("library", "history")}>History</MenuItem>
          <MenuItem icon={Sparkles} onClick={() => goTab("genres")}>Browse genres</MenuItem>
          <MenuItem icon={Shuffle} onClick={surpriseMe} disabled={busy}>{busy ? "Picking…" : "Surprise me"}</MenuItem>
          <MenuItem icon={Share2} onClick={shareSite}>Share LACZEK STREAM</MenuItem>
          <MenuItem icon={Download} onClick={exportData}>Export my library</MenuItem>
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
          <p className="text-sm text-muted-foreground">
            LACZEK STREAM aggregates public streaming sources for movies, TV shows, anime, football, YouTube and live CCTV. All streams are served via public APIs. No accounts required.
          </p>
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-border glass p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-lg font-bold">{title}</h3>
        {children}
        <div className="mt-5 text-right">
          <button onClick={onClose} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Close</button>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="mr-2 inline-block rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-bold">{children}</kbd>;
}