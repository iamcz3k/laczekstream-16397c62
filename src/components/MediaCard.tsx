import { Link } from "@tanstack/react-router";
import { Play, Star, X } from "lucide-react";
import type { LibraryEntry } from "@/lib/library";

export function MediaCard({
  entry,
  onRemove,
  showProgress,
}: {
  entry: LibraryEntry;
  onRemove?: () => void;
  showProgress?: boolean;
}) {
  const pct = entry.position && entry.duration ? Math.min(100, Math.round((entry.position / entry.duration) * 100)) : 0;
  return (
    <div className="group relative">
      <Link
        to="/watch/$kind/$id"
        params={{ kind: entry.kind, id: String(entry.id) }}
        className="block overflow-hidden rounded-[22px] glass-card hover:border-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
      >
        <div className="aspect-[2/3] bg-muted relative overflow-hidden">
          {entry.poster ? (
            <img src={entry.poster} alt={entry.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No poster</div>
          )}
          {entry.rating ? (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full glass text-[10px] font-bold">
              <Star className="w-2.5 h-2.5 fill-primary text-primary" />
              {entry.rating.toFixed(1)}
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent opacity-0 group-hover:opacity-100 transition flex items-end justify-center pb-4">
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            </div>
          </div>
          {showProgress && pct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
              <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-sm font-medium truncate">{entry.title}</p>
          <p className="text-xs text-muted-foreground">
            {entry.kind === "tv" && entry.season ? `S${entry.season} · E${entry.episode ?? 1}` : entry.year || (entry.kind === "tv" ? "Series" : "Movie")}
          </p>
        </div>
      </Link>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label="Remove"
          className="absolute top-2 left-2 z-10 flex h-7 w-7 items-center justify-center rounded-full glass opacity-0 transition group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}