import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Headphones, Loader2, Pause, Play, Search } from "lucide-react";

export const Route = createFileRoute("/podcasts")({
  component: PodcastsPage,
  head: () => ({
    meta: [
      { title: "Podcasts — LACZEK STREAM" },
      { name: "description", content: "Discover and stream podcasts from around the world." },
    ],
  }),
});

type Podcast = {
  collectionId: number;
  trackId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  feedUrl?: string;
  primaryGenreName?: string;
};

type Episode = {
  guid: string;
  title: string;
  pubDate: string;
  audio: string;
  duration?: string;
};

function PodcastsPage() {
  const [q, setQ] = useState("daily news");
  const [debounced, setDebounced] = useState(q);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [epLoading, setEpLoading] = useState(false);
  const [playing, setPlaying] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim() || "podcasts"), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    fetch(`https://itunes.apple.com/search?media=podcast&limit=40&term=${encodeURIComponent(debounced)}`)
      .then((r) => r.json())
      .then((d) => setPodcasts(d.results || []))
      .catch(() => setPodcasts([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  async function openPodcast(p: Podcast) {
    setActive(p);
    setEpisodes([]);
    if (!p.feedUrl) return;
    setEpLoading(true);
    try {
      // Use a CORS-friendly proxy for the RSS feed.
      const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(p.feedUrl)}`;
      const res = await fetch(proxy);
      const xml = await res.text();
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      const items = Array.from(doc.querySelectorAll("item")).slice(0, 50).map((item, i) => {
        const enclosure = item.querySelector("enclosure");
        return {
          guid: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Untitled",
          pubDate: item.querySelector("pubDate")?.textContent || "",
          audio: enclosure?.getAttribute("url") || "",
          duration: item.getElementsByTagNameNS("*", "duration")[0]?.textContent || "",
        };
      }).filter((e) => e.audio);
      setEpisodes(items);
    } catch {
      setEpisodes([]);
    } finally {
      setEpLoading(false);
    }
  }

  function playEpisode(ep: Episode) {
    setPlaying(ep);
    setIsPlaying(true);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = ep.audio;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }, 0);
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {}); }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <header className="sticky top-0 z-20 border-b border-border glass">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <Link to="/" className="rounded-full bg-secondary p-2"><ArrowLeft className="h-4 w-4" /></Link>
          <Headphones className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-black">Podcasts</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search podcasts…"
            className="w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {podcasts.map((p) => (
              <button key={p.collectionId} onClick={() => openPodcast(p)} className="glass-card group overflow-hidden rounded-2xl text-left transition hover:border-primary/50">
                <div className="aspect-square overflow-hidden bg-secondary">
                  {p.artworkUrl600 || p.artworkUrl100 ? (
                    <img src={p.artworkUrl600 || p.artworkUrl100} alt={p.collectionName} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : <Headphones className="m-12 h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{p.collectionName}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.artistName}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {active && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/85 backdrop-blur-xl sm:items-center sm:p-4" onClick={() => setActive(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-border bg-popover sm:h-[80vh] sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-center gap-4 border-b border-border p-5">
              <img src={active.artworkUrl600 || active.artworkUrl100} alt="" className="h-20 w-20 rounded-xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-black">{active.collectionName}</p>
                <p className="truncate text-sm text-muted-foreground">{active.artistName}</p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-full bg-secondary px-3 py-1 text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {epLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : episodes.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Episodes couldn't be loaded for this feed.</p>
              ) : (
                <ul className="space-y-2">
                  {episodes.map((ep) => (
                    <li key={ep.guid} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                      <button onClick={() => playEpisode(ep)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Play className="h-4 w-4" fill="currentColor" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-snug">{ep.title}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : ""}{ep.duration ? ` · ${ep.duration}` : ""}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {playing && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-popover/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{playing.title}</p>
                {active && <p className="truncate text-xs text-muted-foreground">{active.collectionName}</p>}
              </div>
            </div>
            <audio ref={audioRef} preload="none" controls className="w-full sm:max-w-sm" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
          </div>
        </div>
      )}
    </div>
  );
}