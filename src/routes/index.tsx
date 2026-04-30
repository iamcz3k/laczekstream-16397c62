import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bookmark, Clock, History as HistoryIcon, Loader2, Sparkles, Shuffle } from "lucide-react";
import { Header, type TabKey } from "@/components/Header";
import { MoviesTab } from "@/components/MoviesTab";
import { AnimeTab } from "@/components/AnimeTab";
import { TVTab } from "@/components/TVTab";
import { FootballTab } from "@/components/FootballTab";
import { MusicTab } from "@/components/MusicTab";
import { CctvTab } from "@/components/CctvTab";
import { GenresTab } from "@/components/GenresTab";
import { LibraryTab } from "@/components/LibraryTab";
import { MediaCard } from "@/components/MediaCard";
import { getContinueWatching, onLibraryChange, type LibraryEntry } from "@/lib/library";
import { tmdbRandomMovie } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "LACZEK STREAM — Free Movies, TV, Football & YouTube" },
      { name: "description", content: "Stream free movies, live TV channels, football, YouTube and public CCTV cameras — clean matte-black player." },
    ],
  }),
});

function Index() {
  const [tab, setTab] = useState<TabKey>("movies");
  const [movieKind, setMovieKind] = useState<"movie" | "tv" | "anime">("movie");
  const [librarySection, setLibrarySection] = useState<"continue" | "watchlist" | "history">("continue");
  const [continueList, setContinueList] = useState<LibraryEntry[]>([]);
  const [surpriseBusy, setSurpriseBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setContinueList(getContinueWatching().slice(0, 12));
    refresh();
    return onLibraryChange(refresh);
  }, []);

  function openLibrary(section: "continue" | "watchlist" | "history") {
    setLibrarySection(section);
    setTab("library");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function surpriseMe() {
    setSurpriseBusy(true);
    try {
      const movie = await tmdbRandomMovie();
      if (movie) navigate({ to: "/watch/$kind/$id", params: { kind: movie.type, id: String(movie.id) } });
    } finally {
      setSurpriseBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header active={tab} onChange={setTab} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {tab === "movies" && (
          <section className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-3xl font-black tracking-tight">{movieKind === "movie" ? "Movies" : movieKind === "tv" ? "TV Shows" : "Anime"}</h2>
                <p className="text-sm text-muted-foreground mt-1">Trending now · play instantly · no ads</p>
              </div>
              <div className="inline-flex bg-secondary rounded-full p-1 border border-border shadow-[inset_0_1px_0_color-mix(in_oklab,white_7%,transparent)]">
                {(["movie", "tv", "anime"] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => setMovieKind(k)}
                    className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition-all duration-300 ${
                      movieKind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {k === "movie" ? "Movies" : k === "tv" ? "Series" : "Anime"}
                  </button>
                ))}
              </div>
            </div>
            {movieKind === "anime" ? <AnimeTab /> : <MoviesTab kind={movieKind} />}
          </section>
        )}

        {tab === "tv" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Live TV</h2>
              <p className="text-sm text-muted-foreground mt-1">Thousands of free channels worldwide</p>
            </div>
            <TVTab />
          </section>
        )}

        {tab === "football" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Football</h2>
              <p className="text-sm text-muted-foreground mt-1">Live scores & today's fixtures</p>
            </div>
            <FootballTab />
          </section>
        )}

        {tab === "youtube" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">YouTube</h2>
              <p className="text-sm text-muted-foreground mt-1">Stream songs, videos, creators and live streams</p>
            </div>
            <MusicTab />
          </section>
        )}

        {tab === "cctv" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Live CCTV</h2>
              <p className="text-sm text-muted-foreground mt-1">Free public camera streams from supported public APIs</p>
            </div>
            <CctvTab />
          </section>
        )}

        {tab === "genres" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Browse by Genre</h2>
              <p className="text-sm text-muted-foreground mt-1">Action, Sci-Fi, Romance, Comedy and more</p>
            </div>
            <GenresTab />
          </section>
        )}

        {tab === "library" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">My Library</h2>
              <p className="text-sm text-muted-foreground mt-1">Continue watching · watchlist · history</p>
            </div>
            <LibraryTab initial={librarySection} />
          </section>
        )}

        {/* Continue Watching strip — only on the Movies tab so it's discoverable but doesn't repeat everywhere */}
        {tab === "movies" && continueList.length > 0 && (
          <section className="mt-12 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight"><Clock className="h-5 w-5 text-primary" /> Continue Watching</h3>
                <p className="text-sm text-muted-foreground mt-1">Pick up where you left off</p>
              </div>
              <button onClick={() => openLibrary("continue")} className="text-sm font-medium text-primary hover:underline">See all →</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
              {continueList.map((entry) => (
                <div key={`${entry.kind}-${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`} className="w-40 shrink-0 sm:w-44">
                  <MediaCard entry={entry} showProgress />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Bottom secondary tab row — quick library + browse access */}
      <nav className="sticky bottom-0 z-40 mt-8 border-t border-border glass supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex max-w-7xl items-center justify-around gap-1 px-2 py-2">
          <BottomItem label="Continue" icon={Clock} active={tab === "library" && librarySection === "continue"} onClick={() => openLibrary("continue")} />
          <BottomItem label="Watchlist" icon={Bookmark} active={tab === "library" && librarySection === "watchlist"} onClick={() => openLibrary("watchlist")} />
          <BottomItem label="Genres" icon={Sparkles} active={tab === "genres"} onClick={() => { setTab("genres"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
          <BottomItem label="Surprise" icon={surpriseBusy ? Loader2 : Shuffle} iconClass={surpriseBusy ? "animate-spin" : ""} onClick={surpriseMe} highlight />
          <BottomItem label="History" icon={HistoryIcon} active={tab === "library" && librarySection === "history"} onClick={() => openLibrary("history")} />
        </div>
      </nav>

      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © LACZEK STREAM · Built for entertainment · All content served via public APIs
        </div>
      </footer>
    </div>
  );
}

function BottomItem({
  label,
  icon: Icon,
  iconClass,
  active,
  onClick,
  highlight,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  active?: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition active:scale-95 ${
        highlight
          ? "text-primary"
          : active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className={`flex h-9 w-9 items-center justify-center rounded-full transition ${highlight ? "bg-primary text-primary-foreground" : active ? "bg-secondary" : ""}`}>
        <Icon className={`h-4 w-4 ${iconClass ?? ""}`} />
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
