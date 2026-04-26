import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Expand, Loader2, Play, RefreshCw } from "lucide-react";
import {
  EMBED_PROVIDERS,
  QUALITY_OPTIONS,
  embedUrl,
  tmdbSeasonEpisodes,
  tmdbTvSeasons,
  type EmbedProvider,
  type MediaEpisode,
  type MediaSeason,
} from "@/lib/api";

export const Route = createFileRoute("/watch/$kind/$id")({
  component: WatchPage,
  head: () => ({
    meta: [
      { title: "Movie Player — LACZEK STREAM" },
      { name: "description", content: "Watch movies and series in a full-page embedded player with server and episode selection." },
      { property: "og:title", content: "Movie Player — LACZEK STREAM" },
      { property: "og:description", content: "Watch movies and series in a full-page embedded player with server and episode selection." },
    ],
  }),
});

async function enterLandscapeFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try {
    if (!document.fullscreenElement) await element.requestFullscreen();
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    await orientation?.lock?.("landscape");
  } catch {}
}

function WatchPage() {
  const { kind, id } = Route.useParams();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const mediaKind = kind === "tv" ? "tv" : "movie";
  const mediaId = Number(id);
  const [provider, setProvider] = useState<EmbedProvider>("vidsrcto");
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>("720p");
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasons, setSeasons] = useState<MediaSeason[]>([]);
  const [episodes, setEpisodes] = useState<MediaEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);

  useEffect(() => {
    if (mediaKind !== "tv" || !Number.isFinite(mediaId)) return;
    tmdbTvSeasons(mediaId)
      .then((items) => {
        setSeasons(items);
        if (items[0]) setSeason(items[0].seasonNumber);
      })
      .catch(() => setSeasons([]));
  }, [mediaId, mediaKind]);

  useEffect(() => {
    if (mediaKind !== "tv" || !Number.isFinite(mediaId)) return;
    setLoadingEpisodes(true);
    tmdbSeasonEpisodes(mediaId, season)
      .then((items) => {
        setEpisodes(items);
        setEpisode(items[0]?.episodeNumber ?? 1);
      })
      .catch(() => setEpisodes([]))
      .finally(() => setLoadingEpisodes(false));
  }, [mediaId, mediaKind, season]);

  const src = useMemo(() => embedUrl(provider, mediaKind, mediaId, season, episode), [episode, mediaId, mediaKind, provider, season]);
  const title = mediaKind === "movie" ? `Movie #${mediaId}` : `Series #${mediaId} · S${season} E${episode}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <Link to="/" className="text-sm font-black tracking-tight">LACZEK STREAM</Link>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_340px]">
          <section ref={playerRef} className="flex min-h-[58vh] flex-col overflow-hidden rounded-xl border border-border bg-black lg:min-h-0">
            <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold">{title}</h1>
                <p className="mt-1 text-xs text-muted-foreground">No app sandbox · {EMBED_PROVIDERS.find((item) => item.id === provider)?.label}</p>
              </div>
              <button onClick={() => enterLandscapeFullscreen(playerRef.current)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                <Expand className="h-4 w-4" /><span className="hidden sm:inline">Fullscreen</span>
              </button>
            </div>
            <iframe
              key={`${src}-${quality}`}
              src={src}
              title={title}
              className="min-h-0 flex-1 border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
          </section>

          <aside className="space-y-4 overflow-auto pb-4 lg:max-h-[calc(100vh-6rem)]">
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Servers</h2>
              <div className="grid grid-cols-2 gap-2">
                {EMBED_PROVIDERS.map((item) => (
                  <button key={item.id} onClick={() => setProvider(item.id)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${provider === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quality</h2>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((item) => (
                  <button key={item} onClick={() => setQuality(item)} className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${quality === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                    {item}
                  </button>
                ))}
              </div>
            </section>

            {mediaKind === "tv" && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Episodes</h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {seasons.map((item) => (
                    <button key={item.seasonNumber} onClick={() => setSeason(item.seasonNumber)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${season === item.seasonNumber ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                      S{item.seasonNumber}
                    </button>
                  ))}
                </div>
                {loadingEpisodes ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
                  <div className="grid grid-cols-2 gap-2">
                    {episodes.map((item) => (
                      <button key={item.id} onClick={() => setEpisode(item.episodeNumber)} className={`rounded-xl border p-3 text-left text-sm transition ${episode === item.episodeNumber ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                        <span className="flex items-center gap-2 font-bold"><Play className="h-3 w-3" fill="currentColor" /> Episode {item.episodeNumber}</span>
                        <span className="mt-1 line-clamp-2 block text-xs opacity-75">{item.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            <button onClick={() => setProvider(EMBED_PROVIDERS[0].id)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold transition hover:bg-primary hover:text-primary-foreground">
              <RefreshCw className="h-4 w-4" /> Retry with Auto
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}