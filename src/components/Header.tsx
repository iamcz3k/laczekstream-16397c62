import { useState } from "react";
import { Camera, Film, Headphones, Loader2, Radio as RadioIcon, Shuffle, Tv, Trophy, Youtube } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { MoreMenu } from "@/components/MoreMenu";
import { tmdbRandomMovie } from "@/lib/api";
import { useFeatureFlag } from "@/lib/feature-flags";

export type TabKey = "movies" | "tv" | "football" | "youtube" | "cctv" | "radio" | "podcasts" | "genres" | "library";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "movies", label: "Movies", icon: Film },
  { key: "tv", label: "TV", icon: Tv },
  { key: "football", label: "Live Sports", icon: Trophy },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "cctv", label: "CCTV", icon: Camera },
  { key: "radio", label: "Radio", icon: RadioIcon },
  { key: "podcasts", label: "Podcasts", icon: Headphones },
];

export function Header({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  // Each tab keys off a feature flag. Flags default ON so removing the row
  // from the DB never hides a tab; admin must explicitly disable it.
  const flags: Record<TabKey, boolean> = {
    movies: useFeatureFlag("tab_movies", true),
    tv: useFeatureFlag("tab_tv", true),
    football: useFeatureFlag("live_sports", true),
    youtube: useFeatureFlag("tab_youtube", true),
    cctv: useFeatureFlag("tab_cctv", true),
    radio: useFeatureFlag("radio", true),
    podcasts: useFeatureFlag("podcasts", true),
    genres: useFeatureFlag("tab_genres", true),
    library: useFeatureFlag("tab_library", true),
  };

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
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-4 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3 lg:contents">
          <BrandMark />
          <div className="flex items-center gap-2 lg:order-3">
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
        <nav className="-mx-3 flex max-w-full items-center gap-1 overflow-x-auto px-3 pb-1 lg:order-2 lg:mx-0 lg:rounded-full lg:glass lg:p-1 lg:shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)]">
          {TABS.filter((t) => flags[t.key] !== false).map((t) => {
            const Icon = t.icon;
            const isActive = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => onChange(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition-all duration-300 active:scale-95 sm:gap-2 sm:px-4 sm:text-sm ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "bg-secondary/55 text-muted-foreground hover:text-foreground lg:bg-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
