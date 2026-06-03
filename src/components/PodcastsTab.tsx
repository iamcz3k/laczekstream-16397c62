import { useCallback, useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play, Search } from "lucide-react";

type Podcast = {
  collectionId: number;
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

const PROXIES = [
  (u: string) => `/api/public/podcast-feed?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
  (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
];

async function fetchFeed(url: string): Promise<string> {
  for (const make of PROXIES) {
    try {
      const r = await fetch(make(url));
      if (r.ok) {
        const t = await r.text();
        if (t && t.includes("<")) return t;
      }
    } catch {}
  }
  throw new Error("Feed unavailable");
}

export function PodcastsTab() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [epLoading, setEpLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  // Default: rotate a random pool of popular podcasts so the page never feels
  // empty. When the user types, switch to a real search.
  useEffect(() => {
    setLoading(true);
    if (debounced) {
      fetch(`https://itunes.apple.com/search?media=podcast&limit=50&term=${encodeURIComponent(debounced)}`)
        .then((r) => r.json())
        .then((d) => setPodcasts(d.results || []))
        .catch(() => setPodcasts([]))
        .finally(() => setLoading(false));
      return;
    }
    // Featured pool — pick one random seed term per visit for variety.
    const seeds = [
      "true crime", "comedy", "news", "technology", "business", "sports",
      "history", "science", "interview", "society", "music", "fiction",
      "health", "education", "politics", "movies",
    ];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    fetch(`https://itunes.apple.com/search?media=podcast&limit=50&term=${encodeURIComponent(seed)}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Podcast[] = (d.results || []).filter((p: Podcast) => p.feedUrl);
        // Shuffle for a fresh feel.
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        setPodcasts(list);
      })
      .catch(() => setPodcasts([]))
      .finally(() => setLoading(false));
  }, [debounced]);

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);

  async function openPodcast(p: Podcast) {
    setActive(p); setEpisodes([]); setFeedError(null); setVisibleCount(20);
    if (!p.feedUrl) { setFeedError("This podcast has no public feed."); return; }
    setEpLoading(true);
    try {
      const xml = await fetchFeed(p.feedUrl);
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      if (doc.querySelector("parsererror")) throw new Error("Invalid feed");
      const items = Array.from(doc.querySelectorAll("item, entry")).map((item, i) => {
        const enclosure = item.querySelector("enclosure");
        const media = item.querySelector("media\\:content, content");
        const link = Array.from(item.querySelectorAll("link")).find((node) => /audio|mpeg|mp3|m4a|ogg/i.test(node.getAttribute("type") || ""));
        return {
          guid: item.querySelector("guid")?.textContent || String(i),
          title: item.querySelector("title")?.textContent || "Untitled",
          pubDate: item.querySelector("pubDate")?.textContent || "",
          audio: enclosure?.getAttribute("url") || media?.getAttribute("url") || link?.getAttribute("href") || "",
          duration: item.getElementsByTagNameNS("*", "duration")[0]?.textContent || "",
        };
      }).filter((e) => e.audio);
      if (items.length === 0) setFeedError("No playable episodes found in this feed.");
      setEpisodes(items);
    } catch {
      setFeedError("Couldn't load this feed — try another podcast.");
    } finally { setEpLoading(false); }
  }

  const playEpisode = useCallback((ep: Episode) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setLoadingId(ep.guid);
    setPlayingId(null);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = ep.audio;
    audioRef.current = audio;
    audio.addEventListener("playing", () => { setLoadingId(null); setPlayingId(ep.guid); });
    audio.addEventListener("pause", () => setPlayingId((p) => (p === ep.guid ? null : p)));
    audio.addEventListener("error", () => { setLoadingId(null); setFeedError("Couldn't play this episode — try another episode."); });
    audio.addEventListener("ended", () => setPlayingId(null));
    audio.play().catch(() => { setLoadingId(null); setFeedError("Tap play again — browser blocked autoplay."); });
  }, []);

  function toggleCurrent() {
    const a = audioRef.current; if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }

  return (
    <div className="pb-32">
      <div className="relative mb-5">
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
        <>
        {!debounced && (
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Featured for you</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {podcasts.map((p) => (
            <button key={p.collectionId} onClick={() => openPodcast(p)} className="glass-card group overflow-hidden rounded-2xl text-left transition hover:border-primary/50">
              <div className="aspect-square overflow-hidden bg-secondary">
                {p.artworkUrl600 || p.artworkUrl100 ? (
                  <img src={p.artworkUrl600 || p.artworkUrl100} alt={p.collectionName} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : <Headphones className="m-12 h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="p-2">
                <p className="truncate text-xs font-bold sm:text-sm">{p.collectionName}</p>
                <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{p.artistName}</p>
              </div>
            </button>
          ))}
        </div>
        </>
      )}

      {active && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/85 backdrop-blur-xl sm:items-center sm:p-4" onClick={() => setActive(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex h-[85vh] w-full flex-col rounded-t-3xl border border-border bg-popover sm:h-[80vh] sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-center gap-4 border-b border-border p-4 sm:p-5">
              <img src={active.artworkUrl600 || active.artworkUrl100} alt="" className="h-16 w-16 rounded-xl object-cover sm:h-20 sm:w-20" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-black sm:text-lg">{active.collectionName}</p>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{active.artistName}</p>
              </div>
              <button onClick={() => setActive(null)} className="rounded-full bg-secondary px-3 py-1 text-xs">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {epLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : feedError ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{feedError}</p>
              ) : (
                <ul className="space-y-2">
                  {episodes.slice(0, visibleCount).map((ep) => {
                    const isLoading = loadingId === ep.guid;
                    const isPlaying = playingId === ep.guid;
                    return (
                      <li key={ep.guid} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                        <button
                          onClick={() => (isPlaying ? toggleCurrent() : playEpisode(ep))}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
                          disabled={isLoading}
                          aria-label={isPlaying ? "Pause" : "Play"}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-snug">{ep.title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">{ep.pubDate ? new Date(ep.pubDate).toLocaleDateString() : ""}{ep.duration ? ` · ${ep.duration}` : ""}</p>
                        </div>
                      </li>
                    );
                  })}
                  {episodes.length > visibleCount && (
                    <li>
                      <button
                        onClick={() => setVisibleCount((n) => n + 20)}
                        className="w-full rounded-xl border border-border bg-secondary/40 py-3 text-xs font-bold text-muted-foreground transition hover:text-foreground"
                      >
                        Show more episodes ({episodes.length - visibleCount} left)
                      </button>
                    </li>
                  )}
                  {episodes.length > 0 && episodes.length <= visibleCount && (
                    <li className="py-2 text-center text-[11px] text-muted-foreground">All {episodes.length} episodes loaded</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}