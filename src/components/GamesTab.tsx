import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Gamepad2, HardDrive, Loader2, Search, Tag, X } from "lucide-react";

type Game = {
  id: number;
  slug: string;
  title: string;
  url: string;
  image: string | null;
  cover: string | null;
  version: string | null;
  size: string | null;
  year: string | null;
  release_date: string | null;
  genres: string[];
  overview?: string | null;
};

const CACHE_KEY = "games:cache:v4";
const SEARCH_CACHE_KEY = "games:search:v2";
const CACHE_TTL = 60 * 60_000;

function readLocalCache(): Game[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; games: Game[] };
    if (!parsed?.games?.length) return null;
    return parsed.games; // return even if stale, will refresh in background
  } catch {
    return null;
  }
}

function writeLocalCache(games: Game[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), games }));
  } catch {
    /* ignore */
  }
}

function readSearchCache(query: string): Game[] | null {
  try {
    const raw = localStorage.getItem(`${SEARCH_CACHE_KEY}:${query.toLowerCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; games: Game[] };
    if (Date.now() - parsed.at > CACHE_TTL || !parsed.games?.length) return null;
    return parsed.games;
  } catch {
    return null;
  }
}

function writeSearchCache(query: string, games: Game[]) {
  try {
    localStorage.setItem(`${SEARCH_CACHE_KEY}:${query.toLowerCase()}`, JSON.stringify({ at: Date.now(), games }));
  } catch {
    /* ignore */
  }
}

export function GamesTab() {
  const cached = useMemo(() => readLocalCache(), []);
  const [games, setGames] = useState<Game[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [serverResults, setServerResults] = useState<Game[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [genre, setGenre] = useState<string>("All");
  const [selected, setSelected] = useState<Game | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cached) setRefreshing(true);
      try {
        const r = await fetch("/api/public/games");
        const j = await r.json();
        if (cancelled) return;
        if (!j?.ok && !j?.games?.length) {
          setError(j?.error || "Failed to load games");
        } else {
          setGames(j.games || []);
          writeLocalCache(j.games || []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cached]);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setServerResults(null);
      setSearchError(null);
      setSearching(false);
      return;
    }

    const cachedSearch = readSearchCache(query);
    if (cachedSearch) setServerResults(cachedSearch);
    setSearching(!cachedSearch);
    setSearchError(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/public/games?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const j = await r.json();
        if (controller.signal.aborted) return;
        if (!j?.ok) {
          setSearchError(j?.error || "Search failed");
          setServerResults([]);
        } else {
          const results = j.games || [];
          setServerResults(results);
          if (results.length) writeSearchCache(query, results);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setSearchError(e instanceof Error ? e.message : "Search failed");
          setServerResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, cachedSearch ? 50 : 300);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [q]);

  const allGenres = useMemo(() => {
    const s = new Set<string>();
    for (const g of games) for (const x of g.genres) s.add(x);
    return ["All", ...Array.from(s).sort()];
  }, [games]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const source = query && serverResults ? serverResults : games;
    return source.filter((g) => {
      if (genre !== "All" && !g.genres.includes(genre)) return false;
      if (query && serverResults) return true;
      if (!query) return true;
      return (
        g.title.toLowerCase().includes(query) ||
        g.slug.replace(/-/g, " ").includes(query) ||
        g.genres.some((x) => x.toLowerCase().includes(query))
      );
    });
  }, [games, q, genre, serverResults]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${games.length || ""} games…`}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ("")} className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {(refreshing || searching) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {q.trim() && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>{searching ? "Searching the full catalogue…" : `${filtered.length} result${filtered.length === 1 ? "" : "s"}`}</span>
          {searchError && <span className="text-destructive">{searchError}</span>}
        </div>
      )}

      {allGenres.length > 1 && (
        <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {allGenres.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition ${
                genre === g
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {loading && games.length === 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[2/3] w-full animate-pulse rounded-2xl border border-border bg-secondary/40"
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {searching ? "Searching all games…" : error || searchError || (q ? `No results for "${q}"` : "No games found.")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {filtered.map((g) => (
          <button
            key={g.slug}
            onClick={() => setSelected(g)}
            className="group overflow-hidden rounded-2xl border border-border bg-secondary/40 text-left transition hover:border-primary/60 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
              {g.image ? (
                <img
                  src={g.image}
                  alt={g.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Gamepad2 className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {g.version && (
                <span className="absolute left-1.5 top-1.5 rounded-md bg-emerald-500/95 px-1.5 py-0.5 text-[10px] font-black text-black shadow-lg">
                  {g.version}
                </span>
              )}
              {g.size && (
                <span className="absolute right-1.5 top-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                  {g.size}
                </span>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent p-2">
                <p className="line-clamp-2 text-xs font-bold text-white">{g.title}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-white/70">
                  {g.year && <span>{g.year}</span>}
                  {g.genres[0] && (
                    <>
                      {g.year && <span>·</span>}
                      <span className="truncate">{g.genres[0]}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/85 p-0 backdrop-blur-xl sm:items-center sm:p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-popover text-popover-foreground shadow-2xl sm:rounded-3xl"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              {(selected.cover || selected.image) && (
                <img
                  src={selected.cover || selected.image || ""}
                  alt={selected.title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <button
                onClick={() => setSelected(null)}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 backdrop-blur-md"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-white" />
              </button>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h3 className="text-xl font-black tracking-tight text-white">{selected.title}</h3>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold text-white/80">
                  {selected.version && (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-black">
                      {selected.version}
                    </span>
                  )}
                  {selected.size && (
                    <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
                      <HardDrive className="h-3 w-3" />
                      {selected.size}
                    </span>
                  )}
                  {selected.year && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5">{selected.year}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4">
              {selected.genres.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <Tag className="h-3 w-3 text-muted-foreground" />
                  {selected.genres.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-foreground/80"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
              {selected.overview && (
                <p className="text-xs leading-relaxed text-muted-foreground">{selected.overview}</p>
              )}
              <p className="rounded-xl border border-border bg-secondary/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
                Download opens the official release page for this title, where the installer and
                mirrors are provided. Large titles may take a while depending on your connection.
              </p>
              <div className="flex gap-2">
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
                >
                  <Download className="h-4 w-4" /> Download
                </a>
                <a
                  href={selected.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-1 rounded-full bg-secondary px-4 py-3 text-sm font-bold"
                >
                  Details <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
