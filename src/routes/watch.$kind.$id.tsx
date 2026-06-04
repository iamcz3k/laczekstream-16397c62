import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, Download, Expand, Loader2, Maximize2, Play, RefreshCw, PictureInPicture2, SkipForward, FastForward } from "lucide-react";
import {
  EMBED_PROVIDERS,
  QUALITY_OPTIONS,
  embedUrl,
  tmdbSeasonEpisodes,
  tmdbTvSeasons,
  tmdbDetail,
  type MediaItem,
  type EmbedProvider,
  type MediaEpisode,
  type MediaSeason,
} from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";
import { isInWatchlist, recordWatch, toggleWatchlist } from "@/lib/library";
import { trackWatch } from "@/lib/tracker";
import { TitleDetails } from "@/components/TitleDetails";
import { downloadToDevice } from "@/lib/native-download";

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
    const el = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void>; webkitEnterFullscreen?: () => void };
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen();
    }
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
  const [provider, setProvider] = useState<EmbedProvider>("videasy");
  const [quality, setQuality] = useState<(typeof QUALITY_OPTIONS)[number]>("720p");
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasons, setSeasons] = useState<MediaSeason[]>([]);
  const [episodes, setEpisodes] = useState<MediaEpisode[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [meta, setMeta] = useState<MediaItem | null>(null);
  const [saved, setSaved] = useState(false);
  const [fillMode, setFillMode] = useState(false);
  const [streamPlaying, setStreamPlaying] = useState(false);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("lz_autoplay_next") !== "0";
  });
  const [recapSkipped, setRecapSkipped] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("lz_autoplay_next", autoplayNext ? "1" : "0");
  }, [autoplayNext]);

  useEffect(() => {
    if (!Number.isFinite(mediaId)) return;
    tmdbDetail(mediaKind, mediaId).then(setMeta).catch(() => setMeta(null));
  }, [mediaId, mediaKind]);

  useEffect(() => {
    if (!meta) return;
    setSaved(isInWatchlist({ id: meta.id, kind: meta.type, season: mediaKind === "tv" ? season : undefined, episode: mediaKind === "tv" ? episode : undefined }));
  }, [meta, season, episode, mediaKind]);

  // Track every play (for Continue Watching + History)
  useEffect(() => {
    if (!meta) return;
    recordWatch({
      id: meta.id,
      kind: meta.type,
      title: meta.title,
      poster: meta.poster,
      backdrop: meta.backdrop,
      year: meta.year,
      rating: meta.rating,
      season: mediaKind === "tv" ? season : undefined,
      episode: mediaKind === "tv" ? episode : undefined,
    });
    trackWatch({ kind: meta.type, id: String(meta.id), title: meta.title + (mediaKind === "tv" ? ` · S${season}E${episode}` : "") });
  }, [meta, mediaKind, season, episode]);

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

  // Reset playing-detection whenever the iframe source changes
  useEffect(() => {
    setStreamPlaying(false);
    setRecapSkipped(false);
    setUpNextCountdown(null);
  }, [src]);

  // Up Next: for TV, after the iframe has been playing for ~episode runtime,
  // surface a countdown to the next episode. Since iframe end-detection is
  // cross-origin-blocked, fall back to runtime metadata (default 22 min).
  const currentEpisodeMeta = episodes.find((e) => e.episodeNumber === episode);
  const nextEpisodeNumber = useMemo(() => {
    const idx = episodes.findIndex((e) => e.episodeNumber === episode);
    return idx >= 0 ? episodes[idx + 1]?.episodeNumber : undefined;
  }, [episodes, episode]);

  useEffect(() => {
    if (mediaKind !== "tv" || !autoplayNext || !nextEpisodeNumber || !streamPlaying) return;
    const epAny = currentEpisodeMeta as unknown as { runtime?: number } | undefined;
    const metaAny = meta as unknown as { runtime?: number } | null;
    const runtimeMin = epAny?.runtime || metaAny?.runtime || 22;
    const delayMs = Math.max(60_000, (runtimeMin - 1) * 60_000);
    const t = window.setTimeout(() => setUpNextCountdown(10), delayMs);
    return () => window.clearTimeout(t);
  }, [mediaKind, autoplayNext, nextEpisodeNumber, streamPlaying, currentEpisodeMeta, meta]);

  // Fallback: if the iframe never reports a blur event (some providers swallow
  // focus changes), still arm a runtime-based countdown so autoplay isn't
  // permanently silent. Triggers ~runtime minutes after the episode is opened.
  useEffect(() => {
    if (mediaKind !== "tv" || !autoplayNext || !nextEpisodeNumber) return;
    const epAny = currentEpisodeMeta as unknown as { runtime?: number } | undefined;
    const metaAny = meta as unknown as { runtime?: number } | null;
    const runtimeMin = epAny?.runtime || metaAny?.runtime || 22;
    const fallbackMs = Math.max(120_000, runtimeMin * 60_000);
    const t = window.setTimeout(() => setUpNextCountdown((c) => c ?? 10), fallbackMs);
    return () => window.clearTimeout(t);
  }, [mediaKind, autoplayNext, nextEpisodeNumber, currentEpisodeMeta, meta, src]);

  useEffect(() => {
    if (upNextCountdown === null) return;
    if (upNextCountdown <= 0) {
      if (nextEpisodeNumber) setEpisode(nextEpisodeNumber);
      setUpNextCountdown(null);
      return;
    }
    const t = window.setTimeout(() => setUpNextCountdown((c) => (c ?? 0) - 1), 1000);
    return () => window.clearTimeout(t);
  }, [upNextCountdown, nextEpisodeNumber]);

  async function requestPip() {
    // Cross-origin iframe blocks programmatic PiP — best-effort: open a small
    // popup window of the same embed URL so the user can keep watching while
    // browsing elsewhere.
    try {
      const iframe = playerRef.current?.querySelector("iframe") as HTMLIFrameElement | null;
      const anyIframe = iframe as unknown as { requestPictureInPicture?: () => Promise<unknown> } | null;
      if (anyIframe?.requestPictureInPicture) {
        await anyIframe.requestPictureInPicture();
        return;
      }
    } catch {}
    window.open(src, "lz_pip", "width=480,height=270,menubar=no,toolbar=no,location=no,status=no");
  }

  function skipRecap() {
    // Most embed providers ignore custom timestamp params, but a couple of them
    // (videasy, vidsrc.cc) honor `?t=` or `#t=`. Best-effort reload to +90s.
    setRecapSkipped(true);
    const iframe = playerRef.current?.querySelector("iframe") as HTMLIFrameElement | null;
    if (!iframe) return;
    const sep = src.includes("?") ? "&" : "?";
    iframe.src = `${src}${sep}t=90#t=90`;
  }

  // Detect when iframe takes focus = stream actually playing
  useEffect(() => {
    function onBlur() {
      if (document.activeElement && document.activeElement.tagName === "IFRAME") {
        setStreamPlaying(true);
      }
    }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  // If a server doesn't start within 30s, automatically switch to the next one.
  useEffect(() => {
    if (streamPlaying) return;
    const t = window.setTimeout(() => {
      if (streamPlaying) return;
      const idx = EMBED_PROVIDERS.findIndex((p) => p.id === provider);
      const next = EMBED_PROVIDERS[(idx + 1) % EMBED_PROVIDERS.length];
      if (next && next.id !== provider) setProvider(next.id);
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [provider, streamPlaying, src]);

  const baseTitle = meta?.title || (mediaKind === "movie" ? `Movie #${mediaId}` : `Series #${mediaId}`);
  const title = mediaKind === "tv" ? `${baseTitle} · S${season} E${episode}` : baseTitle;

  function handleSave() {
    if (!meta) return;
    const inList = toggleWatchlist({
      id: meta.id,
      kind: meta.type,
      title: meta.title,
      poster: meta.poster,
      backdrop: meta.backdrop,
      year: meta.year,
      rating: meta.rating,
      season: mediaKind === "tv" ? season : undefined,
      episode: mediaKind === "tv" ? episode : undefined,
    });
    setSaved(inList);
  }

  // Build download mirrors. These public mirrors detect the TMDB id and present
  // a direct file download (forces a Save dialog when the user clicks Download
  // on the mirror). Opening them in a new tab is the only legal pattern — we
  // cannot blob-fetch cross-origin video files because the embed providers
  // intentionally hide their CDN URLs.
  const downloadMirrors = useMemo(() => {
    const list: { label: string; url: string }[] = [];
    if (mediaKind === "movie") {
      list.push({ label: "Mirror 1 · dl.vidsrc", url: `https://dl.vidsrc.vip/movie/${mediaId}` });
      list.push({ label: "Mirror 2 · vidsrc.icu", url: `https://vidsrc.icu/download/movie/${mediaId}` });
      list.push({ label: "Mirror 3 · moviesapi", url: `https://moviesapi.club/movie/${mediaId}` });
    } else {
      list.push({ label: "Mirror 1 · dl.vidsrc", url: `https://dl.vidsrc.vip/tv/${mediaId}/${season}/${episode}` });
      list.push({ label: "Mirror 2 · vidsrc.icu", url: `https://vidsrc.icu/download/tv/${mediaId}/${season}/${episode}` });
    }
    return list;
  }, [mediaKind, mediaId, season, episode]);

  function openDownload(url: string) {
    // Inside the Capacitor APK shell this writes straight to the device's
    // Downloads folder; on the web it falls back to opening the mirror in a
    // new tab so the browser's Save dialog can handle it.
    const safe = `${(meta?.title || "video").replace(/[^a-z0-9._-]/gi, "_")}.mp4`;
    void downloadToDevice(url, safe);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-0 py-0 sm:px-6 sm:py-4">
        <header className="mb-4 flex items-center justify-between gap-3 px-4 pt-4 sm:px-0 sm:pt-0">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!meta}
              className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition disabled:opacity-50 ${saved ? "bg-primary text-primary-foreground" : "glass hover:bg-primary hover:text-primary-foreground"}`}
            >
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              <span className="hidden sm:inline">{saved ? "Saved" : "Watchlist"}</span>
            </button>
            <BrandMark compact />
          </div>
        </header>

        <div className="grid flex-1 gap-4 px-0 sm:px-0 lg:grid-cols-[1fr_340px]">
          <section ref={playerRef} className="flex w-full flex-col overflow-hidden border-border bg-black sm:rounded-[28px] sm:border lg:min-h-0">
            <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold">{title}</h1>
                <p className="mt-1 text-xs text-muted-foreground">Movie player · unrestricted iframe · {EMBED_PROVIDERS.find((item) => item.id === provider)?.label}</p>
              </div>
              <div className="flex items-center gap-2">
                {mediaKind === "tv" && nextEpisodeNumber && (
                  <button
                    onClick={() => setEpisode(nextEpisodeNumber)}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground"
                    title={`Next episode (E${nextEpisodeNumber})`}
                  >
                    <SkipForward className="h-4 w-4" /><span className="hidden sm:inline">Next Ep</span>
                  </button>
                )}
                <button
                  onClick={skipRecap}
                  disabled={recapSkipped}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  title="Skip recap (+90s)"
                >
                  <FastForward className="h-4 w-4" /><span className="hidden sm:inline">Skip Recap</span>
                </button>
                <button onClick={requestPip} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground" title="Picture-in-Picture">
                  <PictureInPicture2 className="h-4 w-4" /><span className="hidden sm:inline">PiP</span>
                </button>
                <button onClick={() => setFillMode((v) => !v)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                  <Maximize2 className="h-4 w-4" /><span className="hidden sm:inline">{fillMode ? "Fit" : "Fill & Zoom"}</span>
                </button>
                <button onClick={() => enterLandscapeFullscreen(playerRef.current)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                  <Expand className="h-4 w-4" /><span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
            </div>
            <div className="relative aspect-video w-full flex-1 lg:aspect-auto lg:min-h-0">
            <iframe
              key={`${src}-${quality}`}
              src={src}
              title={title}
              className={`absolute inset-0 h-full w-full border-0 ${fillMode ? "scale-[1.06]" : ""} origin-center transition-transform`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer"
            />
            {upNextCountdown !== null && nextEpisodeNumber && (
              <div className="absolute bottom-4 right-4 z-10 max-w-xs rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Up Next in {upNextCountdown}s</p>
                <p className="mt-1 text-sm font-bold">Episode {nextEpisodeNumber}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setEpisode(nextEpisodeNumber); setUpNextCountdown(null); }} className="flex-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Play now</button>
                  <button onClick={() => setUpNextCountdown(null)} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold">Cancel</button>
                </div>
              </div>
            )}
            </div>
          </section>

          <aside className="space-y-4 overflow-auto px-4 pb-4 sm:px-0 lg:max-h-[calc(100vh-6rem)]">
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Servers</h2>
              {mediaKind === "tv" && (
                <label className="flex items-center justify-between rounded-[18px] border border-border bg-secondary/50 px-3 py-2 text-xs">
                  <span>Auto-play next episode</span>
                  <input type="checkbox" checked={autoplayNext} onChange={(e) => setAutoplayNext(e.target.checked)} className="h-4 w-4 accent-primary" />
                </label>
              )}
              <div className="grid grid-cols-2 gap-2">
                {EMBED_PROVIDERS.map((item) => (
                  <button key={item.id} onClick={() => setProvider(item.id)} className={`rounded-[18px] border px-3 py-3 text-sm font-bold transition-all duration-300 ${provider === item.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground"><Download className="h-3.5 w-3.5" /> Download</h2>
              <div className="grid grid-cols-1 gap-2">
                {downloadMirrors.map((m) => (
                  <button
                    key={m.url}
                    onClick={() => openDownload(m.url)}
                    className="inline-flex items-center justify-between gap-2 rounded-[18px] border border-border bg-secondary/50 px-3 py-3 text-sm font-bold transition hover:border-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <span>{m.label}</span>
                    <Download className="h-4 w-4" />
                  </button>
                ))}
                <p className="text-[11px] text-muted-foreground">Opens a public download mirror in a new tab. Click the green/red download button on the mirror page to save the file to your device.</p>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quality</h2>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((item) => (
                  <button key={item} onClick={() => setQuality(item)} className={`rounded-[18px] border px-3 py-2 text-sm font-bold transition-all duration-300 ${quality === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                    {item}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Note: most embed providers stream adaptively and pick quality based on your bandwidth — the selector is a hint to the player.</p>
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
                      <button key={item.id} onClick={() => setEpisode(item.episodeNumber)} className={`rounded-[18px] border p-3 text-left text-sm transition-all duration-300 ${episode === item.episodeNumber ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
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

        {Number.isFinite(mediaId) && <TitleDetails kind={mediaKind} id={mediaId} />}
      </div>
    </main>
  );
}