import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Lock, Search, Star, Mic2, Play, ChevronLeft, ChevronRight } from "lucide-react";
import type { TranslatedItem } from "@/routes/api.public.translated";
import { openPaywall, usePerk } from "@/lib/subscription";

const GENRES = ["Action", "Thriller", "Drama", "Horror", "Romance", "Animation", "Scifi", "Highschool"];
const VJS = ["VJ Junior", "VJ Jingo", "VJ Kevo", "VJ Ice P", "VJ Emmy", "Others"];

type Source = { source: "latest" | "all" | "genre" | "vj" | "search"; value: string };

export function TranslatedTab() {
  const [src, setSrc] = useState<Source>({ source: "latest", value: "" });
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TranslatedItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const unlocked = usePerk("translated");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `/api/public/translated?source=${src.source}&value=${encodeURIComponent(src.value)}&page=${page}`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) throw new Error(d.error ?? "unavailable");
        setItems(d.items ?? []);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch((e) => {
        if (!cancelled) {
          setItems([]);
          setError(e instanceof Error ? e.message : "Could not load the catalogue");
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [src, page]);

  function pick(next: Source) {
    setPage(1);
    setSrc(next);
  }

  const heading = useMemo(() => {
    if (src.source === "search") return `Results for “${src.value}”`;
    if (src.source === "genre") return `${src.value} films`;
    if (src.source === "vj") return src.value;
    if (src.source === "all") return "Full library";
    return "Latest translated releases";
  }, [src]);

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-border bg-secondary/30 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-black">Translated movies are locked</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Ugandan translated films (VJ Junior, Jingo, Kevo and more) are part of the All Access plan.
        </p>
        <button
          onClick={() => openPaywall("translated")}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
        >
          <Lock className="h-3.5 w-3.5" /> Unlock for $4.99
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) pick({ source: "search", value: q.trim() });
        }}
        className="relative max-w-xl"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search translated movies…"
          className="w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-4 transition focus:border-primary focus:outline-none"
        />
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {([
          { label: "Latest", s: { source: "latest", value: "" } as Source },
          { label: "All films", s: { source: "all", value: "" } as Source },
        ]).map(({ label, s }) => (
          <button
            key={label}
            onClick={() => pick(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
              src.source === s.source
                ? "bg-primary text-primary-foreground shadow"
                : "border border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categories</span>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => pick({ source: "genre", value: g })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                src.source === "genre" && src.value === g ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">VJs</span>
          {VJS.map((v) => (
            <button
              key={v}
              onClick={() => pick({ source: "vj", value: v })}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                src.source === "vj" && src.value === v ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              <Mic2 className="h-3 w-3" />
              {v}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-lg font-bold">{heading}</h2>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <p className="py-16 text-center text-muted-foreground">Catalogue is unavailable right now. Try again shortly.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((it) => (
              <Link
                key={it.id}
                to="/translated/$id"
                params={{ id: it.id }}
                className="group overflow-hidden rounded-[22px] border border-border bg-secondary/50 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                  {it.poster ? (
                    <img
                      src={it.poster}
                      alt={it.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No poster</div>
                  )}
                  {it.rating ? (
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                      {it.rating.toFixed(1)}
                    </div>
                  ) : null}
                  {it.isNew && (
                    <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      New
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/90 via-transparent pb-4 opacity-0 transition group-hover:opacity-100">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{it.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.vj ?? ""}
                    {it.vj && it.year ? " · " : ""}
                    {it.year ?? ""}
                  </p>
                </div>
              </Link>
            ))}
            {items.length === 0 && <p className="col-span-full py-20 text-center text-muted-foreground">Nothing found.</p>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
