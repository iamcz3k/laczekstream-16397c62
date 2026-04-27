import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Play, Search, Star } from "lucide-react";
import { animeHome, animePosterFallback, animeSearch, type AnimeItem } from "@/lib/api";

function AnimePoster({ anime }: { anime: AnimeItem }) {
  const [src, setSrc] = useState(anime.poster || "");

  useEffect(() => {
    let cancelled = false;
    setSrc(anime.poster || "");
    if (!anime.poster) {
      animePosterFallback(anime.title).then((poster) => {
        if (!cancelled) setSrc(poster);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [anime.poster, anime.title]);

  if (!src) return <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Loading cover…</div>;
  return <img src={src} alt={anime.title} loading="lazy" onError={() => animePosterFallback(anime.title).then(setSrc)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />;
}

export function AnimeTab() {
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    animeHome()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      setItems(q.trim() ? await animeSearch(q.trim()) : await animeHome());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anime…"
          className="w-full rounded-full border-border glass py-3 pl-11 pr-4 transition focus:border-primary focus:outline-none"
        />
      </form>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((anime) => (
            <Link key={anime.id} to="/anime/$animeId" params={{ animeId: anime.id }} className="group overflow-hidden rounded-[22px] glass-card text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-glow)]">
              <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                <AnimePoster anime={anime} />
                {anime.score ? (
                  <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full glass px-2 py-0.5 text-[10px] font-bold">
                    <Star className="h-2.5 w-2.5 fill-primary text-primary" /> {anime.score}
                  </div>
                ) : null}
                <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/90 via-transparent pb-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{anime.title}</p>
                <p className="text-xs text-muted-foreground">{anime.status || `${anime.episodes ?? ""} episodes`}</p>
              </div>
            </Link>
          ))}
          {items.length === 0 && <p className="col-span-full py-20 text-center text-muted-foreground">No anime found.</p>}
        </div>
      )}
    </div>
  );
}