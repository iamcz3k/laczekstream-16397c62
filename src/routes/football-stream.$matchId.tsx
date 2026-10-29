import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Clock3, Expand, Loader2, Maximize2, Play, Shield, Activity, MessageCircle, List } from "lucide-react";
import { footballStreamDetail, type FootballStreamDetail } from "@/lib/api";
import { BrandMark } from "@/components/BrandMark";
import { MatchChat } from "@/components/MatchChat";
import { MatchTimeline } from "@/components/MatchTimeline";
import { trackWatch, trackEvent } from "@/lib/tracker";
import { useDefaultSportServer, useRecommendedSportSources } from "@/lib/feature-flags";
import type { SportKey } from "@/lib/sports-api";

export const Route = createFileRoute("/football-stream/$matchId")({
  component: FootballStreamPage,
  loader: async ({ params }) => {
    try {
      const d = await footballStreamDetail(params.matchId, "football");
      return { title: d?.title ?? null };
    } catch {
      return { title: null as string | null };
    }
  },
  head: ({ params, loaderData }) => {
    const name = loaderData?.title || `Live match ${params.matchId}`;
    const title = `${name} — Live stream · LACZEK STREAM`.slice(0, 60);
    const desc = `Watch ${name} live for free on LACZEK STREAM — multiple HD sources, no ads, instant play.`.slice(0, 158);
    const url = `https://laczekstream.lovable.app/football-stream/${params.matchId}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "video.other" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BroadcastEvent",
          name,
          description: desc,
          isLiveBroadcast: true,
          url,
        }),
      }],
    };
  },
});

async function enterLandscapeFullscreen(element: HTMLElement | null) {
  if (!element) return;
  try {
    const el = element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    }
    const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
    await orientation?.lock?.("landscape");
  } catch {}
}

function FootballStreamPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const sport = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("sport") || "football" : "football";
  const [detail, setDetail] = useState<FootballStreamDetail | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [frameLoading, setFrameLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [fillMode, setFillMode] = useState(false);
  const [streamPlaying, setStreamPlaying] = useState(false);
  const [sideTab, setSideTab] = useState<"sources" | "livescore" | "chat">("sources");

  const defaultServerIdx = useDefaultSportServer(matchId);
  const recommendedSources = useRecommendedSportSources(matchId);
  const appliedDefaultRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    appliedDefaultRef.current = false;
    footballStreamDetail(matchId, sport)
      .then((data) => {
        setDetail(data);
        const total = data?.sources?.length ?? 0;
        // If admin has set a default server for this match, apply it (1-based input → 0-based index).
        if (defaultServerIdx != null && total > 0) {
          const target = Math.min(Math.max(defaultServerIdx - 1, 0), total - 1);
          setSourceIndex(target);
          appliedDefaultRef.current = true;
        } else {
          setSourceIndex(data?.id.startsWith("cdn-") ? 0 : Math.max(total - 1, 0));
        }
        if (data?.title) trackWatch({ kind: "football", id: matchId, title: data.title });
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [matchId, sport, defaultServerIdx]);

  const source = detail?.sources?.[sourceIndex];
  const playerSrc = useMemo(() => {
    if (!source?.embedUrl) return "";
    try {
      const url = new URL(source.embedUrl);
      url.searchParams.set("autoplay", "1");
      url.searchParams.set("auto", "1");
      // Don't force-mute — users want sound
      url.searchParams.delete("muted");
      url.searchParams.delete("mute");
      return url.toString();
    } catch {
      return source.embedUrl;
    }
  }, [source?.embedUrl]);

  useEffect(() => {
    if (playerSrc) {
      setFrameLoading(true);
      setStreamPlaying(false);
    }
  }, [playerSrc]);

  useEffect(() => {
    setCountdown(30);
    if (!playerSrc || streamPlaying) return;
    const timer = window.setInterval(() => setCountdown((value) => (value > 0 ? value - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [playerSrc, streamPlaying]);

  // Auto-switch source if it doesn't start playing within 30 seconds
  useEffect(() => {
    if (!playerSrc || streamPlaying) return;
    const sourcesCount = detail?.sources?.length ?? 0;
    if (sourcesCount <= 1) return;
    const t = window.setTimeout(() => {
      if (!streamPlaying) {
        setSourceIndex((idx) => (idx + 1) % sourcesCount);
      }
    }, 30_000);
    return () => window.clearTimeout(t);
  }, [playerSrc, streamPlaying, detail?.sources?.length]);

  // Detect when the iframe starts playing audio/video by listening for visibility/blur on
  // the iframe — most embed players take focus when the user clicks play.
  useEffect(() => {
    function onBlur() {
      if (document.activeElement && document.activeElement.tagName === "IFRAME") {
        setStreamPlaying(true);
      }
    }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Sports
          </button>
          <BrandMark compact />
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-sm font-semibold text-muted-foreground">Loading live stream sources…</p>
          </div>
        ) : !detail || !source ? (
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">No sources are available for this match.</div>
        ) : (
          <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_340px]">
            <section ref={playerRef} className="flex min-h-[55vh] flex-col overflow-hidden rounded-[28px] border border-border bg-black lg:min-h-0">
              <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold">{detail.title}</h1>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Shield className="h-3 w-3" /> Football player · manual play</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground sm:flex">
                    {streamPlaying || countdown === 0 ? (
                      <><span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> Live</>
                    ) : (
                      <><Clock3 className="h-4 w-4 text-primary" /> Stream will play soon in {countdown}s</>
                    )}
                  </div>
                  <button onClick={() => setFillMode((v) => !v)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                    <Maximize2 className="h-4 w-4" /><span className="hidden sm:inline">{fillMode ? "Fit" : "Fill & Zoom"}</span>
                  </button>
                  <button onClick={() => enterLandscapeFullscreen(playerRef.current)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                    <Expand className="h-4 w-4" /><span className="hidden sm:inline">Fullscreen</span>
                  </button>
                </div>
              </div>
              {!streamPlaying && countdown > 0 && (
                <div className="flex items-center justify-center gap-2 border-b border-border bg-secondary/40 px-4 py-2 text-xs font-bold text-muted-foreground sm:hidden">
                  <Clock3 className="h-4 w-4 text-primary" /> Stream will play soon in {countdown}s
                </div>
              )}
              <div className="relative min-h-0 flex-1">
                {frameLoading && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80 text-center backdrop-blur-xl">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <p className="text-sm font-semibold">Loading live stream…</p>
                  </div>
                )}
                <iframe
                  key={playerSrc}
                  src={playerSrc}
                  title={detail.title}
                  className={`h-full w-full border-0 ${fillMode ? "scale-110" : ""} origin-center transition-transform`}
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  onLoad={() => window.setTimeout(() => setFrameLoading(false), 900)}
                />
              </div>
            </section>

            <aside className="space-y-3 overflow-auto pb-4 lg:max-h-[calc(100vh-6rem)]">
              <div className="sticky top-0 z-10 flex gap-1 rounded-full bg-secondary/80 p-1 backdrop-blur">
                {([
                  { k: "sources", label: "Sources", Icon: List },
                  { k: "livescore", label: "LiveScore", Icon: Activity },
                  { k: "chat", label: "Chat", Icon: MessageCircle },
                ] as const).map(({ k, label, Icon }) => (
                  <button key={k} onClick={() => { setSideTab(k); trackEvent(`Opened ${label} tab`, "menu", { matchId }); }} className={`${k === "chat" ? "feat-chat " : ""}flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${sideTab === k ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />{label}
                  </button>
                ))}
              </div>
              {sideTab === "sources" && (
                <>
                  {detail.sources.map((item, index) => {
                    const sourceNo = item.streamNo ?? index + 1;
                    const isRecommended = recommendedSources.has(sourceNo);
                    return (
                      <button key={`${item.embedUrl}-${index}`} onClick={() => { setSourceIndex(index); trackEvent(`Selected Source ${sourceNo}`, "server", { matchId, source: item.source || null, hd: !!item.hd }); }} className={`relative w-full rounded-[20px] border p-4 text-left transition-all duration-300 ${index === sourceIndex ? "border-primary bg-primary text-primary-foreground" : isRecommended ? "border-orange-500/60 bg-orange-500/10 hover:border-orange-400" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                        {isRecommended && (
                          <span className="feat-fire absolute -top-2 -right-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-orange-500 to-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                            Recommended 🔥
                          </span>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold">Source {sourceNo}</span>
                          <span className="inline-flex items-center gap-1 text-xs"><Play className="h-3 w-3" fill="currentColor" /> {item.hd ? "HD" : item.quality || "SD"}</span>
                        </div>
                        <p className="mt-2 text-sm opacity-80">{item.language || item.source || "Football stream"}</p>
                        {typeof item.viewers === "number" && <p className="mt-1 text-xs opacity-70">{item.viewers.toLocaleString()} viewers</p>}
                      </button>
                    );
                  })}
                </>
              )}
              {sideTab === "livescore" && <MatchTimeline eventId={matchId} sport={sport as SportKey} title={detail.title} />}
              {sideTab === "chat" && (() => {
                const parts = (detail.title || "").split(/\s+vs\.?\s+|\s+-\s+/i);
                return <MatchChat matchId={matchId} home={parts[0]?.trim()} away={parts[1]?.trim()} />;
              })()}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}