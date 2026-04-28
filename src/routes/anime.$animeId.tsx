import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Expand, Loader2, Play } from "lucide-react";
import { animeDetail, animeEpisodeDetail, animeServerUrl, type AnimeDetail, type AnimeEpisodeDetail } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/anime/$animeId")({
  component: AnimeWatchPage,
  head: () => ({
    meta: [
      { title: "Anime Player — LACZEK STREAM" },
      { name: "description", content: "Watch anime episodes with source and episode selection." },
      { property: "og:title", content: "Anime Player — LACZEK STREAM" },
      { property: "og:description", content: "Watch anime episodes with source and episode selection." },
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

function AnimeWatchPage() {
  const { animeId } = Route.useParams();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [episodeId, setEpisodeId] = useState("");
  const [episode, setEpisode] = useState<AnimeEpisodeDetail | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [directVideoUrl, setDirectVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState("");

  useEffect(() => {
    setLoading(true);
    animeDetail(animeId)
      .then((data) => {
        setDetail(data);
        setEpisodeId(data?.episodeList?.[data.episodeList.length - 1]?.id || data?.episodeList?.[0]?.id || "");
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [animeId]);

  useEffect(() => {
    if (!episodeId) return;
    setEpisodeLoading(true);
    animeEpisodeDetail(episodeId)
      .then((data) => {
        setEpisode(data);
        setSourceIndex(0);
      })
      .catch(() => setEpisode(null))
      .finally(() => setEpisodeLoading(false));
  }, [episodeId]);

  const source = episode?.sources?.[sourceIndex];

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      setDirectVideoUrl("");
      setPlayerError("");
      setPlayerLoading(true);
      if (!source) {
        setPlayerLoading(false);
        return setResolvedUrl("");
      }
      if (source.url) return setResolvedUrl(source.url);
      if (!source.serverId) {
        setPlayerLoading(false);
        return setResolvedUrl("");
      }
      try {
        const url = await animeServerUrl(source.serverId);
        if (!cancelled) setResolvedUrl(url);
      } catch {
        if (!cancelled) {
          setResolvedUrl("");
          setPlayerError("This source is not responding. Try another source.");
          setPlayerLoading(false);
        }
      }
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    async function extractDirectVideo() {
      setDirectVideoUrl("");
      if (!resolvedUrl || !/mp4upload\.com/i.test(resolvedUrl)) return;
      try {
        const res = await fetch(`/api/public/anime-video?url=${encodeURIComponent(resolvedUrl)}`);
        const data = await res.json();
        if (!cancelled && data?.url) setDirectVideoUrl(`/api/public/anime-proxy?url=${encodeURIComponent(data.url)}`);
      } catch {}
    }
    extractDirectVideo();
    return () => {
      cancelled = true;
    };
  }, [resolvedUrl]);

  const playerSrc = useMemo(() => {
    if (directVideoUrl) return directVideoUrl;
    if (!resolvedUrl) return "";
    try {
      const url = new URL(resolvedUrl);
      url.searchParams.set("autoplay", "1");
      return url.toString();
    } catch {
      return resolvedUrl;
    }
  }, [directVideoUrl, resolvedUrl]);

  useEffect(() => {
    if (!playerSrc) return;
    const timer = window.setTimeout(() => setPlayerLoading(false), 12000);
    return () => window.clearTimeout(timer);
  }, [playerSrc]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Anime
          </button>
          <BrandMark compact />
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !detail ? (
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">No anime data available.</div>
        ) : (
          <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_360px]">
            <section ref={playerRef} className="flex min-h-[55vh] flex-col overflow-hidden rounded-[28px] border border-border bg-black lg:min-h-0">
              <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold">{episode?.title || detail.title}</h1>
                  <p className="mt-1 text-xs text-muted-foreground">Auto-play enabled · use another source if one is slow</p>
                </div>
                <button onClick={() => enterLandscapeFullscreen(playerRef.current)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                  <Expand className="h-4 w-4" /><span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
              <div className="relative min-h-0 flex-1">
                {(episodeLoading || playerLoading) && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 text-center backdrop-blur-xl">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <p className="text-sm font-semibold">Loading anime stream…</p>
                  </div>
                )}
                {playerError ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">{playerError}</div>
                ) : directVideoUrl ? (
                  <video key={directVideoUrl} src={directVideoUrl} title={episode?.title || detail.title} controls autoPlay playsInline className="h-full w-full bg-black" onCanPlay={() => setPlayerLoading(false)} onLoadedData={() => setPlayerLoading(false)} />
                ) : playerSrc ? (
                  <iframe key={playerSrc} src={playerSrc} title={episode?.title || detail.title} className="h-full w-full border-0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen onLoad={() => window.setTimeout(() => setPlayerLoading(false), 900)} />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select another source.</div>
                )}
              </div>
            </section>

            <aside className="space-y-4 overflow-auto pb-4 lg:max-h-[calc(100vh-6rem)]">
              <section className="space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sources</h2>
                <div className="grid grid-cols-2 gap-2">
                  {(episode?.sources ?? []).map((item, index) => (
                    <button key={`${item.serverId || item.url}-${index}`} onClick={() => setSourceIndex(index)} className={`rounded-[18px] border px-3 py-3 text-sm font-bold transition ${index === sourceIndex ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                      {item.label} · {item.quality}
                    </button>
                  ))}
                </div>
              </section>
              <section className="space-y-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Episodes</h2>
                <div className="grid grid-cols-2 gap-2">
                  {detail.episodeList.map((item) => (
                    <button key={item.id} onClick={() => setEpisodeId(item.id)} className={`rounded-[18px] border p-3 text-left text-sm transition ${item.id === episodeId ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                      <span className="flex items-center gap-2 font-bold"><Play className="h-3 w-3" fill="currentColor" /> Ep {item.episode ?? ""}</span>
                      <span className="mt-1 line-clamp-2 block text-xs opacity-75">{item.title}</span>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}