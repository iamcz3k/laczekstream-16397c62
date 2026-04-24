// LACZEK STREAM — API helpers
// All providers chosen to be CORS-friendly for browser fetches.

export const YOUTUBE_API_KEY = "AIzaSyCKNCOT1lywT1oFav6uRFW2jkYUNKDlnDI";

// =====================================================================
// MOVIES / TV — TMDB for catalog (CORS-enabled), vidsrc.xyz / 2embed for
// embedded ad-light playback. TMDB demo key is publicly safe to ship.
// =====================================================================
const TMDB_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

export type MediaItem = {
  id: number;
  title: string;
  poster?: string;
  backdrop?: string;
  year?: string;
  overview?: string;
  type: "movie" | "tv";
  rating?: number;
};

function mapTmdb(it: any, fallbackKind: "movie" | "tv"): MediaItem {
  const type = (it.media_type ?? fallbackKind) as "movie" | "tv";
  const title = it.title || it.name || "Untitled";
  const date = it.release_date || it.first_air_date || "";
  return {
    id: it.id,
    title,
    poster: it.poster_path ? `${IMG}${it.poster_path}` : undefined,
    backdrop: it.backdrop_path ? `https://image.tmdb.org/t/p/w780${it.backdrop_path}` : undefined,
    year: date ? date.slice(0, 4) : undefined,
    overview: it.overview,
    type,
    rating: it.vote_average,
  };
}

export async function tmdbTrending(kind: "movie" | "tv"): Promise<MediaItem[]> {
  const r = await fetch(`${TMDB}/trending/${kind}/week?api_key=${TMDB_KEY}`);
  if (!r.ok) throw new Error("tmdb trending failed");
  const j = await r.json();
  return (j.results ?? []).map((x: any) => mapTmdb(x, kind));
}

export async function tmdbPopular(kind: "movie" | "tv", page = 1): Promise<MediaItem[]> {
  const r = await fetch(`${TMDB}/${kind}/popular?api_key=${TMDB_KEY}&page=${page}`);
  if (!r.ok) throw new Error("tmdb popular failed");
  const j = await r.json();
  return (j.results ?? []).map((x: any) => mapTmdb(x, kind));
}

export async function tmdbSearch(kind: "movie" | "tv", q: string): Promise<MediaItem[]> {
  const r = await fetch(`${TMDB}/search/${kind}?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error("tmdb search failed");
  const j = await r.json();
  return (j.results ?? []).map((x: any) => mapTmdb(x, kind));
}

// Embed providers (TMDB id based, work in iframes)
export type EmbedProvider = "vidsrccc" | "vidsrcto" | "autoembed" | "multiembed" | "vidlink" | "2embed";
export const EMBED_PROVIDERS: { id: EmbedProvider; label: string }[] = [
  { id: "vidsrccc", label: "Server 1" },
  { id: "vidsrcto", label: "Server 2" },
  { id: "autoembed", label: "Server 3" },
  { id: "multiembed", label: "Server 4" },
  { id: "vidlink", label: "Server 5" },
  { id: "2embed", label: "Server 6" },
];
export function embedUrl(p: EmbedProvider, kind: "movie" | "tv", id: number, season = 1, episode = 1) {
  switch (p) {
    case "vidsrccc":
      return kind === "movie"
        ? `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=true`
        : `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}?autoPlay=true`;
    case "vidsrcto":
      return kind === "movie"
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
    case "autoembed":
      return kind === "movie"
        ? `https://player.autoembed.cc/embed/movie/${id}`
        : `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`;
    case "multiembed":
      return kind === "movie"
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
    case "vidlink":
      return kind === "movie"
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}`;
    case "2embed":
      return kind === "movie"
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
  }
}

// =====================================================================
// LIVE TV — IPTV-org. Combines channels + streams + logos.
// =====================================================================
export type Channel = {
  id: string;
  name: string;
  country: string;
  categories: string[];
  logo?: string;
  url: string;
  streams?: string[];
};

let _channelCache: Channel[] | null = null;
export async function iptvChannels(): Promise<Channel[]> {
  if (_channelCache) return _channelCache;
  const [chRes, stRes, lgRes] = await Promise.all([
    fetch("https://iptv-org.github.io/api/channels.json"),
    fetch("https://iptv-org.github.io/api/streams.json"),
    fetch("https://iptv-org.github.io/api/logos.json"),
  ]);
  const channels = await chRes.json();
  const streams = await stRes.json();
  const logos = await lgRes.json();

  // Collect ALL streams per channel so we can fall back when one is broken
  const streamMap = new Map<string, string[]>();
  for (const s of streams as any[]) {
    if (!s.channel || !s.url) continue;
    const arr = streamMap.get(s.channel) ?? [];
    arr.push(s.url);
    streamMap.set(s.channel, arr);
  }
  for (const [k, arr] of streamMap) {
    arr.sort((a, b) => {
      const score = (u: string) =>
        (u.startsWith("https") ? 2 : 0) + (u.includes(".m3u8") ? 1 : 0);
      return score(b) - score(a);
    });
    streamMap.set(k, arr);
  }

  const logoMap = new Map<string, string>();
  for (const l of logos) {
    if (l.channel && l.url && !logoMap.has(l.channel)) logoMap.set(l.channel, l.url);
  }

  _channelCache = (channels as any[])
    .filter((c) => streamMap.has(c.id) && !c.closed)
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      country: (c.country as string) || "INT",
      categories: (c.categories ?? []) as string[],
      logo: logoMap.get(c.id),
      url: streamMap.get(c.id)![0],
      streams: streamMap.get(c.id)!,
    }));
  return _channelCache;
}

// ISO country code → display name + flag emoji
export function countryName(code: string): string {
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌐";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + code.charCodeAt(0) - 65, A + code.charCodeAt(1) - 65);
}

// =====================================================================
// FOOTBALL — ESPN public scoreboard
// =====================================================================
export async function footballMatches() {
  const res = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
  );
  if (!res.ok) throw new Error("football api failed");
  const json = await res.json();
  return (json?.events ?? []) as any[];
}

// =====================================================================
// YOUTUBE — search, live, channels
// =====================================================================
const YT = "https://www.googleapis.com/youtube/v3";

export type YTItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  publishedAt?: string;
  liveBroadcastContent?: string;
};

function mapYT(items: any[]): YTItem[] {
  return (items ?? [])
    .filter((it) => it.id?.videoId)
    .map((it) => ({
      videoId: it.id.videoId,
      title: it.snippet.title,
      channelTitle: it.snippet.channelTitle,
      thumbnail: it.snippet.thumbnails?.medium?.url ?? it.snippet.thumbnails?.default?.url ?? "",
      publishedAt: it.snippet.publishedAt,
      liveBroadcastContent: it.snippet.liveBroadcastContent,
    }));
}

export async function ytSearch(q: string, opts: { type?: "video"; eventType?: "live"; channelId?: string; videoCategoryId?: string; max?: number } = {}) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(opts.max ?? 24),
    q,
    key: YOUTUBE_API_KEY,
  });
  if (opts.eventType) params.set("eventType", opts.eventType);
  if (opts.channelId) params.set("channelId", opts.channelId);
  if (opts.videoCategoryId) params.set("videoCategoryId", opts.videoCategoryId);
  const res = await fetch(`${YT}/search?${params}`);
  if (!res.ok) throw new Error("YouTube search failed");
  const json = await res.json();
  return mapYT(json.items ?? []);
}

// Featured creator channel IDs
export const FEATURED_CREATORS: { name: string; channelId: string; avatar?: string }[] = [
  { name: "IShowSpeed", channelId: "UCWVqdPTigfQ-cSNwG7O9MeA" },
  { name: "MrBeast", channelId: "UCX6OQ3DkcsbYNE6H8uQQuVA" },
  { name: "Kai Cenat", channelId: "UCXyEqsx38wwGBjlj956Hsgg" },
  { name: "PewDiePie", channelId: "UC-lHJZR3Gqxm24_Vd_AJ5Yw" },
  { name: "T-Series", channelId: "UCq-Fj5jknLsUf-MWSy4_brA" },
  { name: "NBA", channelId: "UCWJ2lWNubArHWmf3FIHbfcQ" },
];

// Download links — uses public converter services (open in new tab)
export function downloadLinks(videoId: string) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  return [
    { label: "MP3 (audio)", href: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=mp3&color=ffb347` },
    { label: "MP4 1080p", href: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=1080&color=ffb347` },
    { label: "MP4 720p", href: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=720&color=ffb347` },
    { label: "MP4 360p", href: `https://loader.to/api/button/?url=${encodeURIComponent(url)}&f=360&color=ffb347` },
    { label: "Open on Y2mate", href: `https://www.y2mate.com/youtube/${videoId}` },
  ];
}

// YouTube live-chat iframe URL (no quota usage; works for live broadcasts)
export function youtubeLiveChatUrl(videoId: string) {
  const host = typeof window !== "undefined" ? window.location.hostname : "www.youtube.com";
  return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${host}`;
}
