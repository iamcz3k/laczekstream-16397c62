import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, Lock, Mic2, Star } from "lucide-react";
import type { TranslatedDetail } from "@/routes/api.public.translated";
import { openPaywall, usePerk } from "@/lib/subscription";

export const Route = createFileRoute("/translated/$id")({
  head: () => ({
    meta: [
      { title: "Translated Movie Details | LaCzek Stream" },
      {
        name: "description",
        content:
          "Details for Luganda translated movies — VJ, genre, year, rating and synopsis, with a link to watch the film.",
      },
      { property: "og:title", content: "Translated Movie Details | LaCzek Stream" },
      {
        property: "og:description",
        content: "Browse Luganda translated films by VJ, genre and year on LaCzek Stream.",
      },
      { property: "og:type", content: "video.movie" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TranslatedDetailPage,
});

function TranslatedDetailPage() {
  const { id } = Route.useParams();
  const [movie, setMovie] = useState<TranslatedDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const unlocked = usePerk("translated");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/public/translated?type=detail&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setMovie(d.ok ? d.movie : null))
      .catch(() => !cancelled && setMovie(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {!unlocked ? (
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-secondary/30 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-black">Translated movies are locked</h3>
          <p className="mt-2 text-sm text-muted-foreground">Unlock them with the All Access plan.</p>
          <button
            onClick={() => openPaywall("translated")}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground"
          >
            <Lock className="h-3.5 w-3.5" /> See plans
          </button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !movie ? (
        <p className="py-24 text-center text-muted-foreground">This title is unavailable right now.</p>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-3xl border border-border bg-secondary/40">
              {movie.poster ? (
                <img src={movie.poster} alt={movie.title} referrerPolicy="no-referrer" className="aspect-[2/3] w-full object-cover" />
              ) : (
                <div className="aspect-[2/3] w-full" />
              )}
            </div>
            <div className="space-y-4">
              <h1 className="text-3xl font-black">{movie.title}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {movie.vj && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-bold">
                    <Mic2 className="h-3 w-3" /> {movie.vj}
                  </span>
                )}
                {movie.genre && <span className="rounded-full bg-secondary px-3 py-1 font-bold">{movie.genre}</span>}
                {movie.year && <span className="rounded-full bg-secondary px-3 py-1 font-bold">{movie.year}</span>}
                {movie.rating ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-bold">
                    <Star className="h-3 w-3 fill-primary text-primary" /> {movie.rating.toFixed(1)}
                  </span>
                ) : null}
                {movie.status && (
                  <span className="rounded-full bg-primary/15 px-3 py-1 font-bold text-primary">{movie.status}</span>
                )}
              </div>
              {movie.description && <p className="max-w-2xl leading-relaxed text-muted-foreground">{movie.description}</p>}
              <a
                href={movie.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition active:scale-95"
              >
                Watch film <ExternalLink className="h-4 w-4" />
              </a>
              <p className="text-xs text-muted-foreground">Playback is provided by the publisher of this translated film.</p>
            </div>
          </div>

          {movie.related.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold">More translated films</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {movie.related.map((r) => (
                  <Link
                    key={r.id}
                    to="/translated/$id"
                    params={{ id: r.id }}
                    className="overflow-hidden rounded-2xl border border-border bg-secondary/50 transition hover:border-primary"
                  >
                    {r.poster ? (
                      <img src={r.poster} alt={r.title} loading="lazy" referrerPolicy="no-referrer" className="aspect-[2/3] w-full object-cover" />
                    ) : (
                      <div className="aspect-[2/3] w-full bg-muted" />
                    )}
                    <p className="truncate p-2 text-xs font-medium">{r.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
