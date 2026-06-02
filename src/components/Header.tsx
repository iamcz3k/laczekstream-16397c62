import { useState } from "react";
import { Camera, Film, Loader2, Shuffle, Tv, Trophy, Youtube } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { MoreMenu } from "@/components/MoreMenu";
import { tmdbRandomMovie } from "@/lib/api";

export type TabKey = "movies" | "tv" | "football" | "youtube" | "cctv" | "genres" | "library";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "movies", label: "Movies", icon: Film },
  { key: "tv", label: "TV", icon: Tv },
  { key: "football", label: "Live Sports", icon: Trophy },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "cctv", label: "CCTV", icon: Camera },
];

export function Header({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function surprise() {
    setBusy(true);
    try {
      const movie = await tmdbRandomMovie();
      if (movie) navigate({ to: "/watch/$kind/$id", params: { kind: movie.type, id: String(movie.id) } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-border rounded-none supports-[backdrop-filter]:bg-card/55">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <BrandMark />
        <nav className="flex items-center gap-1 glass rounded-full p-1 shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)]">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={surprise}
            disabled={busy}
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
            Surprise me
          </button>
          <MoreMenu />
        </div>
      </div>
    </header>
  );
}
