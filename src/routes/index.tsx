import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Sparkles } from "lucide-react";
import { Header, type TabKey } from "@/components/Header";
import { MoviesTab } from "@/components/MoviesTab";
import { FeaturedBanner } from "@/components/FeaturedBanner";
import { AnimeTab } from "@/components/AnimeTab";
import { TVTab } from "@/components/TVTab";
import { LiveSportsTab } from "@/components/LiveSportsTab";
import { MusicTab } from "@/components/MusicTab";
import { CctvTab } from "@/components/CctvTab";
import { RadioTab } from "@/components/RadioTab";
import { PodcastsTab } from "@/components/PodcastsTab";
import { GenresTab } from "@/components/GenresTab";
import { LibraryTab } from "@/components/LibraryTab";
import { MediaCard } from "@/components/MediaCard";
import { getContinueWatching, onLibraryChange, type LibraryEntry } from "@/lib/library";
import { getPrefs, onPrefsChange } from "@/lib/preferences";
import { OnboardingPopup } from "@/components/OnboardingPopup";
import { LogoAnimation, type LogoAnimKind } from "@/components/LogoAnimation";
import { tmdbPopular, type MediaItem } from "@/lib/api";
import { Link } from "@tanstack/react-router";

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
  const [tab, setTab] = useState<TabKey>(() => {
    if (typeof window === "undefined") return "movies";
    return (getPrefs().defaultTab as TabKey | undefined) || "movies";
  });
  const [movieKind, setMovieKind] = useState<"movie" | "tv" | "anime">("movie");
  const [librarySection, setLibrarySection] = useState<"continue" | "watchlist" | "history">("continue");
  const [continueList, setContinueList] = useState<LibraryEntry[]>([]);
  const [name, setName] = useState<string>(() => getPrefs().name || "");
  const [recommended, setRecommended] = useState<MediaItem[]>([]);
  const [logoAnim, setLogoAnim] = useState<LogoAnimKind | null>(null);

  useEffect(() => {
    const refresh = () => setContinueList(getContinueWatching().slice(0, 12));
    refresh();
    return onLibraryChange(refresh);
  }, []);

  useEffect(() => onPrefsChange((p) => setName(p.name || "")), []);

  useEffect(() => {
    tmdbPopular("movie", 2).then((items) => setRecommended(items.slice(0, 12))).catch(() => setRecommended([]));
  }, []);

  // Listen for brand-logo clicks to play the per-tab celebration animation.
  useEffect(() => {
    function handler() {
      const kind: LogoAnimKind = (["movies", "football", "tv", "youtube", "cctv"] as TabKey[]).includes(tab)
        ? (tab as LogoAnimKind)
        : "default";
      setLogoAnim(kind);
    }
    window.addEventListener("laczek:logo-click", handler);
    return () => window.removeEventListener("laczek:logo-click", handler);
  }, [tab]);

  // Listen for navigation events from the 3-dots menu (continue/watchlist/history/genres).
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ tab: TabKey; section?: "continue" | "watchlist" | "history" }>).detail;
      if (!detail?.tab) return;
      if (detail.section) setLibrarySection(detail.section);
      setTab(detail.tab);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("laczek:navigate-tab", handler as EventListener);
    return () => window.removeEventListener("laczek:navigate-tab", handler as EventListener);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <OnboardingPopup onPickTab={(t) => setTab(t)} />
      {logoAnim && <LogoAnimation kind={logoAnim} onDone={() => setLogoAnim(null)} />}
      {/* BugReport moved to MoreMenu (Settings) */}
      <Header active={tab} onChange={setTab} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6"><FeaturedBanner /></div>
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

        {tab === "movies" && movieKind === "movie" && recommended.length > 0 && (
          <section className="mt-12 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-2xl font-black tracking-tight">
                  <Sparkles className="h-5 w-5 text-primary" /> {name ? `${name}, you might like` : "Recommended for you"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Hand-picked popular picks</p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
              {recommended.map((m) => (
                <Link
                  key={m.id}
                  to="/watch/$kind/$id"
                  params={{ kind: m.type, id: String(m.id) }}
                  className="group w-40 shrink-0 sm:w-44 rounded-[20px] overflow-hidden glass-card hover:border-primary transition-all hover:-translate-y-1"
                >
                  <div className="aspect-[2/3] bg-muted overflow-hidden">
                    {m.poster && <img src={m.poster} alt={m.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition" />}
                  </div>
                  <div className="p-2">
                    <p className="truncate text-sm font-medium">{m.title}</p>
                    {m.year && <p className="text-xs text-muted-foreground">{m.year}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {tab === "tv" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{name ? `${name}'s Live TV` : "Live TV"}</h2>
              <p className="text-sm text-muted-foreground mt-1">Thousands of free channels worldwide</p>
            </div>
            <TVTab />
          </section>
        )}

        {tab === "football" && (
          <section className="space-y-6">
            <div>
                <h2 className="text-3xl font-black tracking-tight">{name ? `${name}'s Live Sports` : "Live Sports"}</h2>
                <p className="text-sm text-muted-foreground mt-1">Live scores & today's fixtures</p>
            </div>
            <LiveSportsTab />
          </section>
        )}

        {tab === "youtube" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{name ? `${name} on YouTube` : "YouTube"}</h2>
              <p className="text-sm text-muted-foreground mt-1">Stream songs, videos, creators and live streams</p>
            </div>
            <MusicTab />
          </section>
        )}

        {tab === "cctv" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{name ? `${name}'s Live CCTV` : "Live CCTV"}</h2>
              <p className="text-sm text-muted-foreground mt-1">Free public camera streams worldwide</p>
            </div>
            <CctvTab />
          </section>
        )}

        {tab === "radio" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{name ? `${name}'s Radio` : "Radio Worldwide"}</h2>
              <p className="text-sm text-muted-foreground mt-1">Thousands of free stations, anywhere</p>
            </div>
            <RadioTab />
          </section>
        )}

        {tab === "podcasts" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">{name ? `${name}'s Podcasts` : "Podcasts"}</h2>
              <p className="text-sm text-muted-foreground mt-1">Search, browse and play</p>
            </div>
            <PodcastsTab />
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
              <button
                onClick={() => {
                  setLibrarySection("continue");
                  setTab("library");
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                See all →
              </button>
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

      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © LACZEK STREAM · Built for entertainment
        </div>
      </footer>
    </div>
  );
}
