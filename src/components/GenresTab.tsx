import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { tmdbDiscover, tmdbGenres, type Genre, type MediaItem } from "@/lib/api";
import { MediaCard } from "./MediaCard";

export function GenresTab() {
  const [kind, setKind] = useState<"movie" | "tv">("movie");
  const [genres, setGenres] = useState<Genre[]>([]);
  const [active, setActive] = useState<Genre | null>(null);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActive(null);
    setItems([]);
    tmdbGenres(kind).then((list) => {
      setGenres(list);
      if (list[0]) setActive(list[0]);
    });
  }, [kind]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    tmdbDiscover(kind, active.id).then((list) => setItems(list)).finally(() => setLoading(false));
  }, [active, kind]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex glass rounded-full p-1">
          {(["movie", "tv"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {k === "movie" ? "Movies" : "Series"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {genres.map((g) => (
          <button
            key={g.id}
            onClick={() => setActive(g)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${active?.id === g.id ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"}`}
          >
            {g.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((it) => (
            <MediaCard key={`${it.type}-${it.id}`} entry={{ id: it.id, kind: it.type, title: it.title, poster: it.poster, year: it.year, rating: it.rating, updatedAt: 0 }} />
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">No titles in this genre.</p>}
        </div>
      )}
    </div>
  );
}