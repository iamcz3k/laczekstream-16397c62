import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header, type TabKey } from "@/components/Header";
import { MoviesTab } from "@/components/MoviesTab";
import { AnimeTab } from "@/components/AnimeTab";
import { TVTab } from "@/components/TVTab";
import { FootballTab } from "@/components/FootballTab";
import { MusicTab } from "@/components/MusicTab";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "LACZEK STREAM — Free Movies, TV, Football & Music" },
      { name: "description", content: "Stream free movies, live TV channels, football and music — clean matte-black player, no ads." },
    ],
  }),
});

function Index() {
  const [tab, setTab] = useState<TabKey>("movies");
  const [movieKind, setMovieKind] = useState<"movie" | "tv" | "anime">("movie");

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

        {tab === "music" && (
          <section className="space-y-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Music</h2>
              <p className="text-sm text-muted-foreground mt-1">Stream songs & music videos</p>
            </div>
            <MusicTab />
          </section>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-xs text-muted-foreground">
          © LACZEK STREAM · Built for entertainment · All content served via public APIs
        </div>
      </footer>
    </div>
  );
}
