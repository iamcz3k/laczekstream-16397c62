import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Download,
  Expand,
  Loader2,
  Maximize2,
  Play,
  RefreshCw,
  PictureInPicture2,
  SkipForward,
  FastForward,
} from "lucide-react";
import {
  EMBED_PROVIDERS,
  QUALITY_OPTIONS,
  embedUrl,
  tmdbMovieExtras,
  PROVIDER1_SERVERS,
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
import { downloadHistory } from "@/lib/download-history";
import { getBrowserDownloadUrl, listDownloadableTitles } from "@/lib/downloads.functions";
import { findArchiveDownload } from "@/lib/archive-download.functions";
import { Button } from "@/components/ui/button";
import { useDefaultMovieServer, useRecommendedMovieServers } from "@/lib/feature-flags";

export const Route = createFileRoute("/watch/$kind/$id")({
  component: WatchPage,
  loader: async ({ params }) => {
    const k = params.kind === "tv" ? "tv" : "movie";
    const id = Number(params.id);
    if (!Number.isFinite(id))
      return {
        title: null as string | null,
        overview: null as string | null,
        poster: null as string | null,
        kind: k,
      };
    try {
      const m = await tmdbDetail(k, id);
      return {
        title: m?.title ?? null,
        overview: m?.overview ?? null,
        poster: m?.poster ?? null,
        kind: k,
      };
    } catch {
      return {
        title: null as string | null,
        overview: null as string | null,
        poster: null as string | null,
        kind: k,
      };
    }
  },
  head: ({ params, loaderData }) => {
    const k = loaderData?.kind ?? (params.kind === "tv" ? "tv" : "movie");
    const label = k === "tv" ? "series" : "movie";
    const name = loaderData?.title || `${k === "tv" ? "Series" : "Movie"} #${params.id}`;
    const title = `Watch ${name} online free — LACZEK STREAM`.slice(0, 60);
    const desc = (
      loaderData?.overview
        ? `Watch ${name} online for free. ${loaderData.overview}`
        : `Watch ${name} (${label}) online for free on LACZEK STREAM — no ads, instant play.`
    ).slice(0, 158);
    const url = `https://laczekstream.lovable.app/watch/${k}/${params.id}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "video.other" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData?.poster ? [
          { property: "og:image", content: loaderData.poster },
          { name: "twitter:image", content: loaderData.poster },
        ] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": k === "tv" ? "TVSeries" : "Movie",
            name,
            description: loaderData?.overview ?? desc,
            image: loaderData?.poster ?? undefined,
            url,
          }),
        },
      ],
    };
  },
});

async function enterLandscapeFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try {
    const el = element as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      webkitEnterFullscreen?: () => void;
    };
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.webkitEnterFullscreen) el.webkitEnterFullscreen();
    }
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
    };
    await orientation?.lock?.("landscape");
  } catch {}
}

function WatchPage() {
  const listDownloadFiles = useServerFn(listDownloadableTitles);
  const getDownloadUrl = useServerFn(getBrowserDownloadUrl);
  const findArchive = useServerFn(findArchiveDownload);
  const { kind, id } = Route.useParams();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const mediaKind = kind === "tv" ? "tv" : "movie";
  const mediaId = Number(id);
  const adminDefaultServer = useDefaultMovieServer();
  const recommendedServers = useRecommendedMovieServers();
  const [provider, setProvider] = useState<EmbedProvider>("videasy");
  // Provider 1 = IMDbPlay (movies only, default). Provider 2 = existing servers.
  const [providerGroup, setProviderGroup] = useState<1 | 2>(1);
  const [p1Server, setP1Server] = useState<string>(PROVIDER1_SERVERS[0].id);
  const [adShield, setAdShield] = useState(false);
  const [extras, setExtras] = useState<{ imdbId?: string; trailerKey?: string }>({});
  const [showTrailer, setShowTrailer] = useState(false);
  useEffect(() => {
    setShowTrailer(false);
    setProviderGroup(1);
    tmdbMovieExtras(mediaId, mediaKind).then(setExtras).catch(() => setExtras({}));
  }, [mediaId, mediaKind]);
  const useP1 = providerGroup === 1 && !!extras.imdbId;

  // Apply admin-configured default server on mount (once loaded)
  const appliedDefault = useRef(false);
  useEffect(() => {
    if (
      adminDefaultServer &&
      !appliedDefault.current &&
      EMBED_PROVIDERS.some((p) => p.id === adminDefaultServer)
    ) {
      setProvider(adminDefaultServer as EmbedProvider);
      appliedDefault.current = true;
    }
  }, [adminDefaultServer]);
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
  const [recapSkipped, setRecapSkipped] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState<number | null>(null);
  const [autoplayNext, setAutoplayNext] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    // Personal preference (MoreMenu → "Auto-play next episode") wins if set;
    // fall back to the page-local toggle from older sessions.
    try {
      const gs = JSON.parse(localStorage.getItem("laczek:general") || "{}");
      if (typeof gs.autoplayNext === "boolean") return gs.autoplayNext;
    } catch {}
    return localStorage.getItem("lz_autoplay_next") !== "0";
  });

  useEffect(() => {
    if (typeof window !== "undefined")
      localStorage.setItem("lz_autoplay_next", autoplayNext ? "1" : "0");
  }, [autoplayNext]);

  // Live-sync with the personal-preferences toggle so flipping it in the menu
  // immediately updates the watch page.
  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<Record<string, boolean>>).detail;
      if (detail && typeof detail.autoplayNext === "boolean") setAutoplayNext(detail.autoplayNext);
    }
    window.addEventListener("laczek:general-changed", onChange as EventListener);
    return () => window.removeEventListener("laczek:general-changed", onChange as EventListener);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(mediaId)) return;
    tmdbDetail(mediaKind, mediaId)
      .then(setMeta)
      .catch(() => setMeta(null));
  }, [mediaId, mediaKind]);

  useEffect(() => {
    if (!meta) return;
    setSaved(
      isInWatchlist({
        id: meta.id,
        kind: meta.type,
        season: mediaKind === "tv" ? season : undefined,
        episode: mediaKind === "tv" ? episode : undefined,
      }),
    );
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
    trackWatch({
      kind: meta.type,
      id: String(meta.id),
      title: meta.title + (mediaKind === "tv" ? ` · S${season}E${episode}` : ""),
    });
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

  const src = useMemo(() => {
    if (useP1 && extras.imdbId) {
      const srv = PROVIDER1_SERVERS.find((x) => x.id === p1Server) ?? PROVIDER1_SERVERS[0];
      return srv.url(extras.imdbId, mediaKind === "tv" ? { s: season, e: episode } : undefined);
    }
    return embedUrl(provider, mediaKind, mediaId, season, episode);
  }, [episode, mediaId, mediaKind, provider, season, useP1, extras.imdbId, p1Server]);

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
      const anyIframe = iframe as unknown as {
        requestPictureInPicture?: () => Promise<unknown>;
      } | null;
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
    if (streamPlaying || useP1) return;
    const t = window.setTimeout(() => {
      if (streamPlaying) return;
      const idx = EMBED_PROVIDERS.findIndex((p) => p.id === provider);
      const next = EMBED_PROVIDERS[(idx + 1) % EMBED_PROVIDERS.length];
      if (next && next.id !== provider) setProvider(next.id);
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [provider, streamPlaying, src, useP1]);

  const baseTitle =
    meta?.title || (mediaKind === "movie" ? `Movie #${mediaId}` : `Series #${mediaId}`);
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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const safeFilename = useMemo(() => {
    const base = (meta?.title || "video").replace(/[^a-z0-9._-]/gi, "_");
    return mediaKind === "tv" ? `${base}_S${season}E${episode}.mp4` : `${base}.mp4`;
  }, [meta?.title, mediaKind, season, episode]);

  function handleDownload() {
    setDownloadError(null);
    setConfirmOpen(true);
  }

  async function handleMovieDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      // 1) Files you uploaded yourself in the admin panel.
      const { titles } = await listDownloadFiles({ data: { kind: "movie", tmdb_id: String(mediaId) } });
      if (titles.length) {
        const result = await getDownloadUrl({ data: { kind: "movie", tmdb_id: String(mediaId), filename: safeFilename } });
        if (!("fallback" in result) && result.title_id) {
          window.location.assign(result.url);
          return;
        }
      }
      // 2) Free public library (Internet Archive feature films).
      if (meta?.title) {
        const archive = await findArchive({ data: { title: meta.title, year: meta.year } });
        if (archive.found) {
          window.location.assign(archive.url);
          return;
        }
      }
      setDownloadError("No free download is available for this movie yet. You can still watch it with the servers above.");
    } catch {
      setDownloadError("Could not check this movie’s download. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function buildFallbackUrl() {
    // Public download mirror — works for any TMDB id without needing files
    // uploaded to our storage bucket. Opens in a new tab so the browser's
    // native download manager handles the file.
    if (mediaKind === "tv") {
      return `https://dl.vidsrc.vip/tv/${mediaId}/${season}/${episode}`;
    }
    return `https://dl.vidsrc.vip/movie/${mediaId}`;
  }

  async function confirmDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      let url: string;
      let titleId: string | undefined;
      let sizeBytes: number | undefined;
      let posterUrl: string | null | undefined;
      let titleName: string | undefined;
      try {
        const signed = await getBrowserDownloadUrl({
          data: {
            kind: mediaKind,
            tmdb_id: String(mediaId),
            season: mediaKind === "tv" ? season : undefined,
            episode: mediaKind === "tv" ? episode : undefined,
            filename: safeFilename,
          },
        });
        url = signed.url;
        titleId = signed.title_id;
        sizeBytes = signed.size_bytes;
        posterUrl = signed.poster_url;
        titleName = signed.title;
      } catch {
        // Fallback: external mirror (works without uploaded files)
        url = buildFallbackUrl();
      }
      const result = await downloadToDevice(url, safeFilename);
      downloadHistory.add({
        id: titleId,
        title: titleName || meta?.title || safeFilename,
        kind: mediaKind === "tv" ? "tv" : "movie",
        season: mediaKind === "tv" ? season : undefined,
        episode: mediaKind === "tv" ? episode : undefined,
        filename: safeFilename,
        url,
        poster: posterUrl ?? meta?.poster ?? null,
        size_bytes: sizeBytes,
        status: result === "native" ? "completed" : "started",
      });
      setConfirmOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download could not start";
      setDownloadError(message);
      downloadHistory.add({
        title: meta?.title || safeFilename,
        kind: mediaKind === "tv" ? "tv" : "movie",
        season: mediaKind === "tv" ? season : undefined,
        episode: mediaKind === "tv" ? episode : undefined,
        filename: safeFilename,
        url: window.location.href,
        poster: meta?.poster ?? null,
        status: "failed",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-0 py-0 sm:px-6 sm:py-4">
        <header className="mb-4 flex items-center justify-between gap-3 px-4 pt-4 sm:px-0 sm:pt-0">
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground"
          >
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
          <section
            ref={playerRef}
            className="flex w-full flex-col overflow-hidden border-border bg-black sm:rounded-[28px] sm:border lg:min-h-0"
          >
            <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold">{title}</h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  Movie player · unrestricted iframe ·{" "}
                  {useP1
                    ? `Provider 1 · ${PROVIDER1_SERVERS.find((x) => x.id === p1Server)?.label}`
                    : `Provider 2 · ${EMBED_PROVIDERS.find((item) => item.id === provider)?.label}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {mediaKind === "tv" && nextEpisodeNumber && (
                  <button
                    onClick={() => setEpisode(nextEpisodeNumber)}
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground"
                    title={`Next episode (E${nextEpisodeNumber})`}
                  >
                    <SkipForward className="h-4 w-4" />
                    <span className="hidden sm:inline">Next Ep</span>
                  </button>
                )}
                <button
                  onClick={skipRecap}
                  disabled={recapSkipped}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
                  title="Skip recap (+90s)"
                >
                  <FastForward className="h-4 w-4" />
                  <span className="hidden sm:inline">Skip Recap</span>
                </button>
                <button
                  onClick={requestPip}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground"
                  title="Picture-in-Picture"
                >
                  <PictureInPicture2 className="h-4 w-4" />
                  <span className="hidden sm:inline">PiP</span>
                </button>
                <button
                  onClick={() => setFillMode((v) => !v)}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground"
                >
                  <Maximize2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{fillMode ? "Fit" : "Fill & Zoom"}</span>
                </button>
                <button
                  onClick={() => enterLandscapeFullscreen(playerRef.current)}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground"
                >
                  <Expand className="h-4 w-4" />
                  <span className="hidden sm:inline">Fullscreen</span>
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
                {...(useP1 && adShield
                  ? { sandbox: "allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock" }
                  : {})}
              />
              {upNextCountdown !== null && nextEpisodeNumber && (
                <div className="absolute bottom-4 right-4 z-10 max-w-xs rounded-2xl border border-border bg-background/95 p-4 shadow-2xl backdrop-blur">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Up Next in {upNextCountdown}s
                  </p>
                  <p className="mt-1 text-sm font-bold">Episode {nextEpisodeNumber}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setEpisode(nextEpisodeNumber);
                        setUpNextCountdown(null);
                      }}
                      className="flex-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                    >
                      Play now
                    </button>
                    <button
                      onClick={() => setUpNextCountdown(null)}
                      className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 overflow-auto px-4 pb-4 sm:px-0 lg:max-h-[calc(100vh-6rem)]">
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Servers
              </h2>
              {mediaKind === "tv" && (
                <label className="flex items-center justify-between rounded-[18px] border border-border bg-secondary/50 px-3 py-2 text-xs">
                  <span>Auto-play next episode</span>
                  <input
                    type="checkbox"
                    checked={autoplayNext}
                    onChange={(e) => setAutoplayNext(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              )}
              {(
                <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary/50 p-1">
                  {([1, 2] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setProviderGroup(g)}
                      disabled={g === 1 && !extras.imdbId}
                      className={`rounded-full px-3 py-2 text-xs font-bold transition disabled:opacity-40 ${providerGroup === g ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      Provider {g}{g === 1 ? " · IMDbPlay" : ""}
                    </button>
                  ))}
                </div>
              )}
              {useP1 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {PROVIDER1_SERVERS.map((srv) => (
                      <button
                        key={srv.id}
                        onClick={() => setP1Server(srv.id)}
                        className={`rounded-[18px] border px-3 py-3 text-sm font-bold transition-all ${p1Server === srv.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}
                      >
                        {srv.label}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center justify-between rounded-[18px] border border-border bg-secondary/50 px-3 py-2 text-xs">
                    <span>Ad shield (blocks pop-ups &amp; redirects)</span>
                    <input type="checkbox" checked={adShield} onChange={(e) => setAdShield(e.target.checked)} className="h-4 w-4 accent-primary" />
                  </label>
                  <p className="text-[11px] text-muted-foreground">Off by default. Turn it on to block pop-ups and redirects — if a server refuses to load, turn it back off.</p>
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-2">
                {EMBED_PROVIDERS.map((item) => {
                  const isRecommended = recommendedServers.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setProvider(item.id)}
                      className={`relative rounded-[18px] border px-3 py-3 text-sm font-bold transition-all duration-300 ${provider === item.id ? "border-primary bg-primary text-primary-foreground" : isRecommended ? "border-orange-500/60 bg-orange-500/10 hover:border-orange-400" : "border-border bg-secondary/50 hover:border-primary/60"}`}
                    >
                      {isRecommended && (
                        <span className="feat-fire absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-orange-500 to-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                          Recommended 🔥
                        </span>
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </div>
              )}
              {extras.trailerKey && (
                <div className="space-y-2 pt-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Trailer</h2>
                  <div className="relative aspect-video overflow-hidden rounded-[18px] border border-border bg-black">
                    {showTrailer ? (
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${extras.trailerKey}?autoplay=1&rel=0`}
                        title="Trailer"
                        className="absolute inset-0 h-full w-full border-0"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        allowFullScreen
                      />
                    ) : (
                      <button onClick={() => setShowTrailer(true)} className="group absolute inset-0 flex items-center justify-center">
                        <img src={`https://i.ytimg.com/vi/${extras.trailerKey}/hqdefault.jpg`} alt="Trailer" className="absolute inset-0 h-full w-full object-cover opacity-70" />
                        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition group-hover:scale-110">
                          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> Download
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {mediaKind === "movie" ? (
                  <Button onClick={handleMovieDownload} disabled={downloading} className="h-auto rounded-[18px] px-4 py-3 text-sm font-bold">
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {downloading ? "Checking…" : "Download Movie"}
                  </Button>
                ) : (
                <Button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  {downloading
                    ? "Starting…"
                    : `Download ${mediaKind === "tv" ? "Episode" : "Movie"}`}
                </Button>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {mediaKind === "movie"
                    ? "Downloads depend on file availability."
                    : "Starts a browser download, with progress in your browser’s Downloads panel."}
                </p>
                {mediaKind === "movie" && downloadError && (
                  <p role="alert" className="text-xs text-destructive">{downloadError}</p>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Quality
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => setQuality(item)}
                    className={`rounded-[18px] border px-3 py-2 text-sm font-bold transition-all duration-300 ${quality === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Note: most embed providers stream adaptively and pick quality based on your
                bandwidth — the selector is a hint to the player.
              </p>
            </section>

            {mediaKind === "tv" && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Episodes
                </h2>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {seasons.map((item) => (
                    <button
                      key={item.seasonNumber}
                      onClick={() => setSeason(item.seasonNumber)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${season === item.seasonNumber ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"}`}
                    >
                      S{item.seasonNumber}
                    </button>
                  ))}
                </div>
                {loadingEpisodes ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {episodes.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setEpisode(item.episodeNumber)}
                        className={`rounded-[18px] border p-3 text-left text-sm transition-all duration-300 ${episode === item.episodeNumber ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}
                      >
                        <span className="flex items-center gap-2 font-bold">
                          <Play className="h-3 w-3" fill="currentColor" /> Episode{" "}
                          {item.episodeNumber}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs opacity-75">
                          {item.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}

            <button
              onClick={() => setProvider(EMBED_PROVIDERS[0].id)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold transition hover:bg-primary hover:text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" /> Retry with Auto
            </button>
          </aside>
        </div>

        {Number.isFinite(mediaId) && <TitleDetails kind={mediaKind} id={mediaId} />}
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl"
          onClick={() => !downloading && setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Download className="h-5 w-5" />
              </span>
              <h3 className="text-base font-black">
                Download {mediaKind === "tv" ? "episode" : "movie"}?
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              "{meta?.title || "this title"}"{mediaKind === "tv" ? ` · S${season}E${episode}` : ""}{" "}
              will download through your browser, with progress shown in the browser downloads
              panel.
            </p>
            {downloadError && (
              <p className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                {downloadError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={downloading}
                className="rounded-full bg-secondary px-4 py-2 text-sm font-bold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDownload}
                disabled={downloading}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? "Starting…" : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
