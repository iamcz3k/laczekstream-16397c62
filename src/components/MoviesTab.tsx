import { useEffect, useState } from "react";
import { Search, Play, Loader2, Star } from "lucide-react";
import { tmdbTrending, tmdbSearch, tmdbPopular, embedUrl, EMBED_PROVIDERS, type MediaItem, type EmbedProvider } from "@/lib/api";
import { IframePlayer } from "./IframePlayer";

export function MoviesTab({ kind }: { kind: "movie" | "tv" }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [section, setSection] = useState<"trending" | "popular">("trending");
  const [playing, setPlaying] = useState<MediaItem | null>(null);
  const [provider, setProvider] = useState<EmbedProvider>("vidsrcxyz");

  useEffect(() => {
    setLoading(true);
    const fetcher = section === "trending" ? tmdbTrending(kind) : tmdbPopular(kind);
    fetcher
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kind, section]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      setItems(await tmdbSearch(kind, q));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-3">
        <form onSubmit={search} className="relative flex-1 max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === "movie" ? "Search movies…" : "Search TV shows…"}
            className="w-full pl-11 pr-4 py-3 rounded-full glass border-border focus:border-primary focus:outline-none transition"
          />
        </form>
        <div className="inline-flex glass rounded-full p-1">
          {(["trending", "popular"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`px-5 py-2 rounded-full text-sm font-medium capitalize transition ${
                section === s ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setPlaying(it)}
              className="group text-left rounded-xl overflow-hidden glass-card hover:border-primary transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
            >
              <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                {it.poster ? (
                  <img src={it.poster} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No poster</div>
                )}
                {it.rating ? (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full glass text-[10px] font-bold">
                    <Star className="w-2.5 h-2.5 fill-primary text-primary" />
                    {it.rating.toFixed(1)}
                  </div>
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-4">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm font-medium truncate">{it.title}</p>
                {it.year && <p className="text-xs text-muted-foreground">{it.year}</p>}
              </div>
            </button>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">Nothing found.</p>}
        </div>
      )}

      {playing && (
        <IframePlayer
          src={embedUrl(provider, playing.type, playing.id)}
          title={playing.title}
          onClose={() => setPlaying(null)}
          providers={EMBED_PROVIDERS}
          activeProvider={provider}
          onProviderChange={(p) => setProvider(p as EmbedProvider)}
        />
      )}
    </div>
  );
}
