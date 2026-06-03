import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, Clock, Loader2, Star, User } from "lucide-react";
import { tmdbTitleFull, type TitleFullDetail } from "@/lib/api";

function formatRuntime(min?: number) {
  if (!min || min <= 0) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function TitleDetails({ kind, id }: { kind: "movie" | "tv"; id: number }) {
  const [data, setData] = useState<TitleFullDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    tmdbTitleFull(kind, id).then((d) => { if (!cancelled) { setData(d); setLoading(false); } }).catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [kind, id]);

  if (loading) {
    return <div className="mt-6 flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!data) return null;

  const runtime = formatRuntime(data.runtime);

  return (
    <section className="mt-6 space-y-6">
      <div className="glass-card rounded-2xl p-5">
        {data.tagline && <p className="mb-2 text-sm italic text-muted-foreground">"{data.tagline}"</p>}
        <h2 className="text-2xl font-black sm:text-3xl">{data.title}{data.year ? <span className="ml-2 text-base font-bold text-muted-foreground">({data.year})</span> : null}</h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          {typeof data.rating === "number" && data.rating > 0 && (
            <span className="inline-flex items-center gap-1 font-bold text-foreground"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{data.rating.toFixed(1)}{data.voteCount ? ` · ${data.voteCount.toLocaleString()} votes` : ""}</span>
          )}
          {runtime && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{runtime}{kind === "tv" ? " / ep" : ""}</span>}
          {data.releaseDate && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(data.releaseDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>}
          {data.status && <span className="rounded-full bg-secondary px-2 py-0.5 font-bold">{data.status}</span>}
          {kind === "tv" && data.numberOfSeasons ? <span>{data.numberOfSeasons} season{data.numberOfSeasons > 1 ? "s" : ""} · {data.numberOfEpisodes} episodes</span> : null}
        </div>

        {data.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.genres.map((g) => <span key={g} className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-[11px] font-bold text-muted-foreground">{g}</span>)}
          </div>
        )}

        {data.overview && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.overview}</p>}

        <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
          {data.directors.length > 0 && <CrewRow label={kind === "tv" ? "Created by" : "Director"} names={data.directors} />}
          {data.writers.length > 0 && <CrewRow label="Writers" names={data.writers} />}
          {data.producers.length > 0 && <CrewRow label="Producers" names={data.producers} />}
        </dl>
      </div>

      {data.cast.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Cast</h3>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {data.cast.map((c) => (
              <div key={c.id} className="w-24 shrink-0 text-center">
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-secondary">
                  {c.profile ? <img src={c.profile} alt={c.name} loading="lazy" className="h-full w-full object-cover" /> : <User className="m-auto h-8 w-8 text-muted-foreground" />}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight">{c.name}</p>
                {c.character && <p className="line-clamp-2 text-[10px] text-muted-foreground">{c.character}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.similar.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">More like this</h3>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {data.similar.map((m) => (
              <Link key={m.id} to="/watch/$kind/$id" params={{ kind: m.type, id: String(m.id) }} className="w-32 shrink-0">
                <div className="aspect-[2/3] overflow-hidden rounded-xl bg-secondary">
                  {m.poster && <img src={m.poster} alt={m.title} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight">{m.title}</p>
                {m.year && <p className="text-[10px] text-muted-foreground">{m.year}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CrewRow({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <dt className="font-black uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-bold text-foreground">{names.join(", ")}</dd>
    </div>
  );
}