import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Expand, Loader2, Play, Shield } from "lucide-react";
import { footballStreamDetail, type FootballStreamDetail } from "@/lib/api";
import { isBlockedAdUrl } from "@/lib/adblock";

export const Route = createFileRoute("/football-stream/$matchId")({
  component: FootballStreamPage,
  head: () => ({
    meta: [
      { title: "Football Stream Player — LACZEK STREAM" },
      { name: "description", content: "Watch football live streams with source selection in an isolated player." },
      { property: "og:title", content: "Football Stream Player — LACZEK STREAM" },
      { property: "og:description", content: "Watch football live streams with source selection in an isolated player." },
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

function FootballStreamPage() {
  const { matchId } = Route.useParams();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<FootballStreamDetail | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    footballStreamDetail(matchId)
      .then((data) => {
        setDetail(data);
        setSourceIndex(0);
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [matchId]);

  const source = detail?.sources?.[sourceIndex];
  const playerSrc = useMemo(() => {
    if (!source?.embedUrl) return "";
    try {
      const url = new URL(source.embedUrl);
      url.searchParams.set("autoplay", "1");
      return url.toString();
    } catch {
      return source.embedUrl;
    }
  }, [source?.embedUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === "string" && isBlockedAdUrl(event.data)) event.stopImmediatePropagation();
    };
    window.addEventListener("message", handleMessage, true);
    return () => window.removeEventListener("message", handleMessage, true);
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium transition hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Football
          </button>
          <Link to="/" className="text-sm font-black tracking-tight">LACZEK STREAM</Link>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !detail || !source ? (
          <div className="flex flex-1 items-center justify-center text-center text-muted-foreground">No sources are available for this match.</div>
        ) : (
          <div className="grid flex-1 gap-4 lg:grid-cols-[1fr_340px]">
            <section ref={playerRef} className="flex min-h-[55vh] flex-col overflow-hidden rounded-[28px] border border-border bg-black lg:min-h-0">
              <div className="glass flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold">{detail.title}</h1>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Shield className="h-3 w-3" /> Popups and top-page redirects blocked</p>
                </div>
                <button onClick={() => enterLandscapeFullscreen(playerRef.current)} className="inline-flex h-10 items-center gap-2 rounded-full bg-secondary px-3 text-sm transition hover:bg-primary hover:text-primary-foreground">
                  <Expand className="h-4 w-4" /><span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
              <iframe
                key={playerSrc}
                src={playerSrc}
                title={detail.title}
                className="min-h-0 flex-1 border-0"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
                sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
              />
            </section>

            <aside className="space-y-3 overflow-auto pb-4 lg:max-h-[calc(100vh-6rem)]">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sources</h2>
              {detail.sources.map((item, index) => (
                <button key={`${item.embedUrl}-${index}`} onClick={() => setSourceIndex(index)} className={`w-full rounded-[20px] border p-4 text-left transition-all duration-300 ${index === sourceIndex ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50 hover:border-primary/60"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold">Source {item.streamNo ?? index + 1}</span>
                    <span className="inline-flex items-center gap-1 text-xs"><Play className="h-3 w-3" fill="currentColor" /> {item.hd ? "HD" : item.quality || "SD"}</span>
                  </div>
                  <p className="mt-2 text-sm opacity-80">{item.language || item.source || "Football stream"}</p>
                  {typeof item.viewers === "number" && <p className="mt-1 text-xs opacity-70">{item.viewers.toLocaleString()} viewers</p>}
                </button>
              ))}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}