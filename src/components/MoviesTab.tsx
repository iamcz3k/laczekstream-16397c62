import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Play, Loader2, Star, SlidersHorizontal, X, User, Lock } from "lucide-react";
import { tmdbTrending, tmdbSearch, tmdbPopular, tmdbMultiSearch, tmdbGenres, tmdbDiscoverAdvanced, type MediaItem, type Genre, type PersonHit } from "@/lib/api";
import { trackSearch } from "@/lib/tracker";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { TranslatedTab } from "@/components/TranslatedTab";
import { openPaywall, usePerk } from "@/lib/subscription";

// Industry → TMDB `with_original_language` (ISO 639-1).
// Inspired by https://github.com/vikhyatsingh123/Movies-Collection
const INDUSTRIES = [
  { key: "all", label: "All", lang: undefined as string | undefined },
  { key: "hollywood", label: "Hollywood", lang: "en" },
  { key: "bollywood", label: "Bollywood", lang: "hi" },
  { key: "tollywood", label: "Tollywood", lang: "te" },
] as const;
type IndustryKey = typeof INDUSTRIES[number]["key"];

export function MoviesTab({ kind }: { kind: "movie" | "tv" }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [section, setSection] = useState<"trending" | "popular">("trending");
  const [suggestions, setSuggestions] = useState<{ movies: MediaItem[]; tv: MediaItem[]; people: PersonHit[] }>({ movies: [], tv: [], people: [] });
  const [showSugg, setShowSugg] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [pickedGenres, setPickedGenres] = useState<number[]>([]);
  const [year, setYear] = useState<string>("");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"popularity.desc" | "vote_average.desc" | "release_date.desc" | "revenue.desc">("popularity.desc");
  const [personFilter, setPersonFilter] = useState<PersonHit | null>(null);
  const [industry, setIndustry] = useState<IndustryKey>("all");
  const [catalogue, setCatalogue] = useState<"global" | "translated">("global");
  const translatedUnlocked = usePerk("translated");
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => { tmdbGenres(kind).then(setGenres).catch(() => setGenres([])); }, [kind]);

  const industryLang = INDUSTRIES.find((i) => i.key === industry)?.lang;
  const filtersActive = pickedGenres.length > 0 || !!year || minRating > 0 || sortBy !== "popularity.desc" || !!personFilter || !!industryLang;

  useEffect(() => {
    if (filtersActive) return; // discover query effect handles it
    setLoading(true);
    const fetcher = section === "trending" ? tmdbTrending(kind) : tmdbPopular(kind);
    fetcher
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kind, section, filtersActive]);

  // Apply advanced filters (debounced)
  useEffect(() => {
    if (!filtersActive) return;
    setLoading(true);
    tmdbDiscoverAdvanced(kind, {
      genres: pickedGenres,
      year: year ? Number(year) : undefined,
      sortBy,
      minRating: minRating || undefined,
      personId: personFilter?.id,
      originalLanguage: industryLang,
    })
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [kind, pickedGenres, year, sortBy, minRating, personFilter, industryLang, filtersActive]);

  // Debounced suggestions
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q.trim()) { setSuggestions({ movies: [], tv: [], people: [] }); return; }
    debounceRef.current = window.setTimeout(() => {
      tmdbMultiSearch(q).then(setSuggestions).catch(() => {});
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [q]);

  // Close suggestions on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSugg(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function runSearch(term: string) {
    if (!term.trim()) return;
    setShowSugg(false);
    setLoading(true);
    trackSearch(term);
    try {
      setItems(await tmdbSearch(kind, term));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(q);
  }

  function toggleGenre(id: number) {
    setPickedGenres((g) => g.includes(id) ? g.filter((x) => x !== id) : [...g, id]);
  }
  function clearFilters() {
    setPickedGenres([]); setYear(""); setMinRating(0); setSortBy("popularity.desc"); setPersonFilter(null); setIndustry("all");
  }

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 1949 }, (_, i) => now - i);
  }, []);

  const subTabs = kind === "movie" ? (
    <div className="inline-flex rounded-full border border-border bg-secondary/50 p-1">
      {([
        { k: "global", label: "Global" },
        { k: "translated", label: "Translated (UG)" },
      ] as const).map((t) => (
        <button
          key={t.k}
          onClick={() => {
            if (t.k === "translated" && !translatedUnlocked) {
              openPaywall("translated");
              return;
            }
            setCatalogue(t.k);
          }}
          className={`rounded-full px-5 py-2 text-sm font-bold transition ${
            catalogue === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {t.k === "translated" && !translatedUnlocked && <Lock className="mr-1.5 inline h-3 w-3" />}
          {t.label}
        </button>
      ))}
    </div>
  ) : null;

  if (kind === "movie" && catalogue === "translated") {
    return (
      <div className="space-y-6">
        {subTabs}
        <TranslatedTab />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subTabs}
      <div className="flex flex-col md:flex-row gap-3">
        <div ref={searchRef} className="relative flex flex-1 max-w-xl items-center gap-2">
          <form onSubmit={search} className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={q}
              onFocus={() => setShowSugg(true)}
              onChange={(e) => { setQ(e.target.value); setShowSugg(true); }}
              placeholder={kind === "movie" ? "Search movies, actors, directors…" : "Search TV shows, actors…"}
              className="w-full pl-11 pr-14 py-3 rounded-full bg-secondary/50 border border-border focus:border-primary focus:outline-none transition"
            />
            <VoiceSearchButton
              onInterim={(t) => { setQ(t); setShowSugg(true); }}
              onResult={(t) => { setQ(t); setShowSugg(true); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9"
            />
          </form>
          {showSugg && q.trim() && (suggestions.movies.length || suggestions.tv.length || suggestions.people.length) ? (
            <div className="absolute top-full left-0 right-0 mt-2 z-30 max-h-[60vh] overflow-auto rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl">
              {suggestions.people.length > 0 && (
                <div className="p-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">People</p>
                  {suggestions.people.slice(0, 4).map((p) => (
                    <button key={p.id} onClick={() => { setPersonFilter(p); setShowSugg(false); setQ(""); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-secondary">
                      {p.profile ? <img src={p.profile} alt={p.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center"><User className="h-4 w-4" /></div>}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.knownFor}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {[
                { label: "Movies", arr: suggestions.movies },
                { label: "TV Shows", arr: suggestions.tv },
              ].map(({ label, arr }) => arr.length > 0 && (
                <div key={label} className="p-2 border-t border-border">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                  {arr.slice(0, 5).map((it) => (
                    <Link key={it.id} to="/watch/$kind/$id" params={{ kind: it.type, id: String(it.id) }} onClick={() => setShowSugg(false)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary">
                      {it.poster ? <img src={it.poster} alt={it.title} className="h-14 w-10 rounded object-cover" /> : <div className="h-14 w-10 rounded bg-secondary" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{it.title}</p>
                        <p className="text-xs text-muted-foreground">{it.year} {it.rating ? `· ★ ${it.rating.toFixed(1)}` : ""}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition ${showFilters || filtersActive ? "bg-primary text-primary-foreground" : "bg-secondary/50 border border-border"}`}
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters{filtersActive ? ` · ${pickedGenres.length + (year ? 1 : 0) + (minRating ? 1 : 0) + (personFilter ? 1 : 0) + (sortBy !== "popularity.desc" ? 1 : 0)}` : ""}
        </button>
        <div className="inline-flex bg-secondary/50 border border-border rounded-full p-1">
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

      <div className="-mt-2 flex flex-wrap items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Industry</span>
        {INDUSTRIES.map((ind) => (
          <button
            key={ind.key}
            onClick={() => setIndustry(ind.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              industry === ind.key ? "bg-primary text-primary-foreground shadow" : "bg-secondary/50 border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {ind.label}
          </button>
        ))}
      </div>


      {(showFilters || filtersActive) && (
        <div className="rounded-3xl border border-border bg-secondary/30 p-4 space-y-4">
          {personFilter && (
            <div className="flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 w-fit text-xs">
              <User className="h-3 w-3" /> {personFilter.name}
              <button onClick={() => setPersonFilter(null)}><X className="h-3 w-3" /></button>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Genres</p>
            <div className="flex flex-wrap gap-2">
              {genres.map((g) => (
                <button key={g.id} onClick={() => toggleGenre(g.id)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${pickedGenres.includes(g.id) ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{g.name}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">Year</span>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-xl bg-background border border-border px-3 py-2 text-sm">
                <option value="">Any</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">Min rating</span>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="rounded-xl bg-background border border-border px-3 py-2 text-sm">
                <option value={0}>Any</option>
                {[5, 6, 7, 7.5, 8, 8.5, 9].map((r) => <option key={r} value={r}>★ {r}+</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">Sort</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="rounded-xl bg-background border border-border px-3 py-2 text-sm">
                <option value="popularity.desc">Most popular</option>
                <option value="vote_average.desc">Highest rated</option>
                <option value="release_date.desc">Newest</option>
                <option value="revenue.desc">Highest grossing</option>
              </select>
            </label>
          </div>
          {filtersActive && (
            <button onClick={clearFilters} className="text-xs font-bold text-primary hover:underline">Clear all filters</button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {items.map((it) => (
            <Link
              key={it.id}
              to="/watch/$kind/$id"
              params={{ kind: it.type, id: String(it.id) }}
              className="group text-left rounded-[22px] overflow-hidden bg-secondary/50 border border-border hover:border-primary transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
            >
              <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                {it.poster ? (
                  <img src={it.poster} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No poster</div>
                )}
                {it.rating ? (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold">
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
            </Link>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-muted-foreground py-20">Nothing found.</p>}
        </div>
      )}

    </div>
  );
}
