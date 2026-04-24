// Public API helpers — no keys needed except YouTube
export const YOUTUBE_API_KEY = "AIzaSyCKNCOT1lywT1oFav6uRFW2jkYUNKDlnDI";

// TMDB via vidsrc-friendly metadata: use TMDB public API through a proxy-free public mirror.
// We use TMDB v3 with the open community key embedded in many demos. To be safe we use
// the no-key /3/discover via api.themoviedb.org would require a key.
// Instead we use vidsrc.to's own listing endpoints which return TMDB-ID items and posters.
// Endpoints docs: https://vidsrc.to (no auth required)

export const VIDSRC_BASE = "https://vidsrc.to";

export async function vidsrcList(kind: "movie" | "tv", section: "new" | "trending" | "popular" = "trending", page = 1) {
  // vidsrc.to public listing
  const res = await fetch(`${VIDSRC_BASE}/vapi/${kind}/${section}/${page}`);
  if (!res.ok) throw new Error("vidsrc list failed");
  const json = await res.json();
  // shape: { result: { items: [{ id, tmdb_id, title, poster, ... }] } }
  return (json?.result?.items ?? []) as Array<{
    id: string;
    tmdb_id?: string | number;
    title: string;
    poster?: string;
    year?: string;
    type?: string;
  }>;
}

export async function vidsrcSearch(query: string) {
  const res = await fetch(`${VIDSRC_BASE}/vapi/search/${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("vidsrc search failed");
  const json = await res.json();
  return (json?.result?.items ?? []) as Array<{
    id: string;
    tmdb_id?: string | number;
    title: string;
    poster?: string;
    year?: string;
    type?: string; // "movie" | "tv"
  }>;
}

export function vidsrcEmbedUrl(kind: "movie" | "tv", id: string | number) {
  return `${VIDSRC_BASE}/embed/${kind}/${id}`;
}

// IPTV-org
export async function iptvChannels() {
  const [chRes, stRes] = await Promise.all([
    fetch("https://iptv-org.github.io/api/channels.json"),
    fetch("https://iptv-org.github.io/api/streams.json"),
  ]);
  const channels = await chRes.json();
  const streams = await stRes.json();
  const streamMap = new Map<string, string>();
  for (const s of streams) {
    if (s.channel && s.url && !streamMap.has(s.channel)) streamMap.set(s.channel, s.url);
  }
  return (channels as any[])
    .filter((c) => streamMap.has(c.id))
    .map((c) => ({
      id: c.id as string,
      name: c.name as string,
      country: c.country as string,
      categories: (c.categories ?? []) as string[],
      logo: c.logo as string | undefined,
      url: streamMap.get(c.id)!,
    }));
}

// Football — ESPN public scoreboard
export async function footballMatches() {
  const res = await fetch(
    "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
  );
  if (!res.ok) throw new Error("football api failed");
  const json = await res.json();
  return (json?.events ?? []) as any[];
}

// YouTube search
export async function ytSearch(q: string, type: "video" | "music" = "video") {
  const query = type === "music" ? `${q} official audio` : q;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=24&type=video&q=${encodeURIComponent(
    query
  )}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("YouTube search failed");
  const json = await res.json();
  return (json?.items ?? []) as Array<{
    id: { videoId: string };
    snippet: { title: string; channelTitle: string; thumbnails: { medium: { url: string } } };
  }>;
}
