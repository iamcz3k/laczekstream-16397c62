import { useEffect, useState } from "react";
import { Search, Play, Loader2 } from "lucide-react";
import { vidsrcList, vidsrcSearch, vidsrcEmbedUrl } from "@/lib/api";
import { IframePlayer } from "./IframePlayer";

type Item = { id: string; tmdb_id?: string | number; title: string; poster?: string; year?: string; type?: string };

export function MoviesTab({ kind }: { kind: "movie" | "tv" }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<{ id: string | number; title: string; type: "movie" | "tv" } | null>(null);

  useEffect(() => {
    setLoading(true);
    vidsrcList(kind, "trending")
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kind]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await vidsrcSearch(q);
      setItems(kind === "movie" ? r.filter((i) => i.type !== "tv") : r.filter((i) => i.type === "tv"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={search} className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={kind === "movie" ? "Search movies…" : "Search TV shows…"}
          className="w-full pl-11 pr-4 py-3 rounded-full bg-secondary border border-border focus:border-primary focus:outline-none transition"
        />
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((it) => {
            const tmdb = it.tmdb_id ?? it.id;
            const t = (it.type === "tv" ? "tv" : kind) as "movie" | "tv";
            return (
              <button
                key={`${it.id}-${it.title}`}
                onClick={() => setPlaying({ id: tmdb, title: it.title, type: t })}
                className="group text-left rounded-xl overflow-hidden bg-card border border-border hover:border-primary transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
              >
                <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                  {it.poster ? (
                    <img src={it.poster} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No poster</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-4">
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
            );
          })}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">Nothing found.</p>}
        </div>
      )}

      {playing && (
        <IframePlayer
          src={vidsrcEmbedUrl(playing.type, playing.id)}
          title={playing.title}
          onClose={() => setPlaying(null)}
        />
      )}
    </div>
  );
}
