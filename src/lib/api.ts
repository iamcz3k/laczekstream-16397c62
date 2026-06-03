// LACZEK STREAM — API helpers

export const YOUTUBE_API_KEY = "AIzaSyCKNCOT1lywT1oFav6uRFW2jkYUNKDlnDI";

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

const ANIME_API = "https://www.sankavollerei.com/anime";
const JIKAN_API = "https://api.jikan.moe/v4";

export type AnimeItem = {
  id: string;
  title: string;
  poster?: string;
  status?: string;
  episodes?: number;
  score?: string;
  latestReleaseDate?: string;
};

export type AnimeEpisode = {
  id: string;
  title: string;
  episode?: number;
  date?: string;
};

export type AnimeDetail = AnimeItem & {
  japanese?: string;
  duration?: string;
  studios?: string;
  genres: string[];
  episodeList: AnimeEpisode[];
};

export type AnimeStreamSource = {
  label: string;
  quality: string;
  serverId?: string;
  url: string;
};

const animePosterCache = new Map<string, string>();

function cleanAnimeTitle(title: string) {
  return title.replace(/subtitle\s+indonesia/gi, "").replace(/sub\s+indo/gi, "").replace(/\s+/g, " ").trim();
}

export async function animePosterFallback(title: string): Promise<string> {
  const key = cleanAnimeTitle(title).toLowerCase();
  if (!key) return "";
  if (animePosterCache.has(key)) return animePosterCache.get(key)!;
  const r = await fetch(`${JIKAN_API}/anime?q=${encodeURIComponent(key)}&limit=1`);
  if (!r.ok) return "";
  const j = await r.json();
  const poster = j?.data?.[0]?.images?.webp?.large_image_url || j?.data?.[0]?.images?.jpg?.large_image_url || "";
  if (poster) animePosterCache.set(key, poster);
  return poster;
}

export type AnimeEpisodeDetail = {
  title: string;
  animeId?: string;
  defaultStreamingUrl?: string;
  sources: AnimeStreamSource[];
  prevEpisodeId?: string;
  nextEpisodeId?: string;
};

export type MediaSeason = {
  seasonNumber: number;
  name: string;
  episodeCount: number;
};

export type MediaEpisode = {
  id: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  still?: string;
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

export type PersonHit = { id: number; name: string; profile?: string; knownFor: string };
export type MultiSearchResult = { movies: MediaItem[]; tv: MediaItem[]; people: PersonHit[] };

export async function tmdbMultiSearch(q: string): Promise<MultiSearchResult> {
  if (!q.trim()) return { movies: [], tv: [], people: [] };
  const r = await fetch(`${TMDB}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&include_adult=false`);
  if (!r.ok) return { movies: [], tv: [], people: [] };
  const j = await r.json();
  const movies: MediaItem[] = [];
  const tv: MediaItem[] = [];
  const people: PersonHit[] = [];
  for (const x of (j.results ?? []) as any[]) {
    if (x.media_type === "movie") movies.push(mapTmdb(x, "movie"));
    else if (x.media_type === "tv") tv.push(mapTmdb(x, "tv"));
    else if (x.media_type === "person") people.push({
      id: x.id,
      name: x.name,
      profile: x.profile_path ? `${IMG}${x.profile_path}` : undefined,
      knownFor: (x.known_for ?? []).map((k: any) => k.title || k.name).filter(Boolean).slice(0, 3).join(", "),
    });
  }
  return { movies, tv, people };
}

export type DiscoverOpts = {
  genres?: number[];
  year?: number;
  sortBy?: "popularity.desc" | "vote_average.desc" | "release_date.desc" | "revenue.desc";
  minRating?: number;
  personId?: number;
};

export async function tmdbDiscoverAdvanced(kind: "movie" | "tv", opts: DiscoverOpts, page = 1): Promise<MediaItem[]> {
  const params = new URLSearchParams({ api_key: TMDB_KEY, page: String(page), sort_by: opts.sortBy || "popularity.desc" });
  if (opts.genres?.length) params.set("with_genres", opts.genres.join(","));
  if (opts.minRating) params.set("vote_average.gte", String(opts.minRating));
  if (opts.year) {
    if (kind === "movie") params.set("primary_release_year", String(opts.year));
    else params.set("first_air_date_year", String(opts.year));
  }
  if (opts.personId) params.set("with_people", String(opts.personId));
  const r = await fetch(`${TMDB}/discover/${kind}?${params.toString()}`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results ?? []).map((x: any) => mapTmdb(x, kind));
}

export type Genre = { id: number; name: string };

export async function tmdbGenres(kind: "movie" | "tv"): Promise<Genre[]> {
  const r = await fetch(`${TMDB}/genre/${kind}/list?api_key=${TMDB_KEY}`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.genres ?? []) as Genre[];
}

export async function tmdbDiscover(kind: "movie" | "tv", genreId: number, page = 1): Promise<MediaItem[]> {
  const r = await fetch(`${TMDB}/discover/${kind}?api_key=${TMDB_KEY}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results ?? []).map((x: any) => mapTmdb(x, kind));
}

export async function tmdbDetail(kind: "movie" | "tv", id: number): Promise<MediaItem | null> {
  const r = await fetch(`${TMDB}/${kind}/${id}?api_key=${TMDB_KEY}`);
  if (!r.ok) return null;
  const j = await r.json();
  return mapTmdb(j, kind);
}

export type CastMember = { id: number; name: string; character: string; profile?: string };
export type CrewMember = { id: number; name: string; job: string; department: string };
export type TitleFullDetail = MediaItem & {
  runtime?: number;
  genres: string[];
  tagline?: string;
  status?: string;
  releaseDate?: string;
  voteCount?: number;
  cast: CastMember[];
  crew: CrewMember[];
  similar: MediaItem[];
  directors: string[];
  producers: string[];
  writers: string[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  homepage?: string;
};

export async function tmdbTitleFull(kind: "movie" | "tv", id: number): Promise<TitleFullDetail | null> {
  const r = await fetch(`${TMDB}/${kind}/${id}?api_key=${TMDB_KEY}&append_to_response=credits,similar,recommendations`);
  if (!r.ok) return null;
  const j = await r.json();
  const base = mapTmdb(j, kind);
  const credits = j.credits || {};
  const cast = (credits.cast || []).slice(0, 20).map((c: any): CastMember => ({
    id: c.id, name: c.name, character: c.character || "",
    profile: c.profile_path ? `${IMG}${c.profile_path}` : undefined,
  }));
  const crew = (credits.crew || []).map((c: any): CrewMember => ({
    id: c.id, name: c.name, job: c.job, department: c.department,
  }));
  const directors: string[] = crew.filter((c: CrewMember) => c.job === "Director").map((c: CrewMember) => c.name);
  const producers: string[] = crew.filter((c: CrewMember) => c.job === "Producer" || c.job === "Executive Producer").map((c: CrewMember) => c.name);
  const writers: string[] = crew.filter((c: CrewMember) => c.department === "Writing" || c.job === "Writer" || c.job === "Screenplay").map((c: CrewMember) => c.name);
  const similarRaw = (j.similar?.results || j.recommendations?.results || []).slice(0, 12);
  const similar = similarRaw.map((x: any) => mapTmdb(x, kind));
  return {
    ...base,
    runtime: j.runtime ?? (j.episode_run_time?.[0]),
    genres: (j.genres || []).map((g: any) => g.name),
    tagline: j.tagline || undefined,
    status: j.status,
    releaseDate: j.release_date || j.first_air_date,
    voteCount: j.vote_count,
    cast, crew,
    directors: Array.from(new Set(directors)).slice(0, 4),
    producers: Array.from(new Set(producers)).slice(0, 4),
    writers: Array.from(new Set(writers)).slice(0, 4),
    similar,
    numberOfSeasons: j.number_of_seasons,
    numberOfEpisodes: j.number_of_episodes,
    homepage: j.homepage || undefined,
  };
}

export async function tmdbRandomMovie(): Promise<MediaItem | null> {
  const page = Math.floor(Math.random() * 20) + 1;
  const r = await fetch(`${TMDB}/movie/popular?api_key=${TMDB_KEY}&page=${page}`);
  if (!r.ok) return null;
  const j = await r.json();
  const list = (j.results ?? []).map((x: any) => mapTmdb(x, "movie"));
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

function proxiedAnimePoster(src?: string) {
  if (!src) return undefined;
  if (/^https?:\/\/[^/]*otakudesu\./i.test(src)) return `/api/public/anime-image?url=${encodeURIComponent(src)}`;
  return src;
}

function mapAnime(item: any): AnimeItem {
  return {
    id: item.animeId || item.slug || item.id,
    title: item.title || "Untitled anime",
    poster: proxiedAnimePoster(item.poster),
    status: item.status,
    episodes: item.episodes,
    score: item.score,
    latestReleaseDate: item.latestReleaseDate,
  };
}

export async function animeHome(): Promise<AnimeItem[]> {
  const r = await fetch(`${ANIME_API}/home`);
  if (!r.ok) throw new Error("anime home failed");
  const j = await r.json();
  const ongoing = j?.data?.ongoing?.animeList ?? [];
  const complete = j?.data?.complete?.animeList ?? [];
  return [...ongoing, ...complete].map(mapAnime).filter((item) => item.id);
}

export async function animeSearch(q: string): Promise<AnimeItem[]> {
  const r = await fetch(`${ANIME_API}/search/${encodeURIComponent(q)}`);
  if (!r.ok) throw new Error("anime search failed");
  const j = await r.json();
  return (j?.data?.animeList ?? []).map(mapAnime).filter((item: AnimeItem) => item.id);
}

export async function animeDetail(id: string): Promise<AnimeDetail | null> {
  const r = await fetch(`${ANIME_API}/anime/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error("anime detail failed");
  const j = await r.json();
  const d = j?.data;
  if (!d) return null;
  return {
    ...mapAnime({ ...d, animeId: id }),
    japanese: d.japanese,
    duration: d.duration,
    studios: d.studios,
    genres: (d.genreList ?? []).map((g: any) => g.title).filter(Boolean),
    episodeList: (d.episodeList ?? []).map((episode: any) => ({
      id: episode.episodeId,
      title: episode.title || `Episode ${episode.eps ?? ""}`,
      episode: episode.eps,
      date: episode.date,
    })).filter((episode: AnimeEpisode) => episode.id),
  };
}

export async function animeEpisodeDetail(id: string): Promise<AnimeEpisodeDetail | null> {
  const r = await fetch(`${ANIME_API}/episode/${encodeURIComponent(id)}`);
  if (!r.ok) throw new Error("anime episode failed");
  const j = await r.json();
  const d = j?.data;
  if (!d) return null;
  const serverSources: AnimeStreamSource[] = (d.server?.qualities ?? []).flatMap((quality: any) =>
    (quality.serverList ?? []).map((server: any) => ({
      label: (server.title || "Server").trim(),
      quality: quality.title || "Auto",
      serverId: server.serverId,
      url: "",
    })),
  );
  const rankedSources = serverSources.sort((a, b) => {
    const score = (item: AnimeStreamSource) =>
      (/vidhide|filedon|yourupload|yuplod|streamwish|mp4/i.test(item.label) ? 50 : /ondesu|desu/i.test(item.label) ? -30 : /mega/i.test(item.label) ? -50 : 0) +
      (parseInt(item.quality, 10) || 0) / 100;
    return score(b) - score(a);
  });
  return {
    title: d.title || "Anime episode",
    animeId: d.animeId,
    defaultStreamingUrl: d.defaultStreamingUrl,
    sources: [...rankedSources, ...(d.defaultStreamingUrl ? [{ label: "Auto", quality: "Auto", url: d.defaultStreamingUrl }] : [])],
    prevEpisodeId: d.prevEpisode?.episodeId,
    nextEpisodeId: d.nextEpisode?.episodeId,
  };
}

export async function animeServerUrl(serverId: string): Promise<string> {
  const r = await fetch(`${ANIME_API}/server/${encodeURIComponent(serverId)}`);
  if (!r.ok) throw new Error("anime server failed");
  const j = await r.json();
  return j?.data?.url || "";
}

export async function animeDirectVideoUrl(embedUrl: string): Promise<string> {
  if (!/mp4upload\.com/i.test(embedUrl)) return "";
  const r = await fetch(embedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) return "";
  const html = await r.text();
  return html.match(/https?:\/\/[^"']+\/video\.mp4[^"']*/i)?.[0] || "";
}

export async function tmdbTvSeasons(tvId: number): Promise<MediaSeason[]> {
  const r = await fetch(`${TMDB}/tv/${tvId}?api_key=${TMDB_KEY}`);
  if (!r.ok) throw new Error("tmdb tv details failed");
  const j = await r.json();
  return (j.seasons ?? [])
    .filter((season: any) => season.season_number > 0)
    .map((season: any) => ({
      seasonNumber: season.season_number,
      name: season.name || `Season ${season.season_number}`,
      episodeCount: season.episode_count || 0,
    }));
}

export async function tmdbSeasonEpisodes(tvId: number, seasonNumber: number): Promise<MediaEpisode[]> {
  const r = await fetch(`${TMDB}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_KEY}`);
  if (!r.ok) throw new Error("tmdb season failed");
  const j = await r.json();
  return (j.episodes ?? []).map((episode: any) => ({
    id: episode.id,
    episodeNumber: episode.episode_number,
    name: episode.name || `Episode ${episode.episode_number}`,
    overview: episode.overview,
    still: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : undefined,
  }));
}

export type EmbedProvider = "videasy" | "vidsrcvip" | "vidsrcme" | "vidjoy" | "vidsrcxyz" | "vidsrcicu" | "vidlink" | "autoembed" | "111movies" | "vidfast" | "2embed" | "vidsrcto";

export const EMBED_PROVIDERS: { id: EmbedProvider; label: string }[] = [
  { id: "videasy", label: "Auto 1" },
  { id: "vidsrcvip", label: "Auto 2" },
  { id: "vidsrcme", label: "Asian 1" },
  { id: "vidjoy", label: "Asian 2" },
  { id: "vidsrcxyz", label: "Asian 3" },
  { id: "vidsrcicu", label: "Asian 4" },
  { id: "vidlink", label: "Asian 5" },
  { id: "autoembed", label: "Auto 3" },
  { id: "vidsrcto", label: "Auto 4" },
  { id: "111movies", label: "Server 3" },
  { id: "vidfast", label: "Server 5" },
  { id: "2embed", label: "Server 6" },
];

export function embedUrl(p: EmbedProvider, kind: "movie" | "tv", id: number, season = 1, episode = 1) {
  switch (p) {
    case "videasy":
      return kind === "movie"
        ? `https://player.videasy.net/movie/${id}?autoplay=true`
        : `https://player.videasy.net/tv/${id}/${season}/${episode}?autoplay=true`;
    case "vidsrcvip":
      return kind === "movie"
        ? `https://vidsrc.vip/embed/movie/${id}`
        : `https://vidsrc.vip/embed/tv/${id}/${season}/${episode}`;
    case "vidsrcme":
      return kind === "movie"
        ? `https://vidsrc.me/embed/movie?tmdb=${id}`
        : `https://vidsrc.me/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
    case "vidjoy":
      return kind === "movie"
        ? `https://vidjoy.pro/embed/movie/${id}`
        : `https://vidjoy.pro/embed/tv/${id}/${season}/${episode}`;
    case "vidsrcxyz":
      return kind === "movie"
        ? `https://vidsrc.xyz/embed/movie?tmdb=${id}`
        : `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`;
    case "vidsrcicu":
      return kind === "movie"
        ? `https://vidsrc.icu/embed/movie/${id}`
        : `https://vidsrc.icu/embed/tv/${id}/${season}/${episode}`;
    case "vidlink":
      return kind === "movie"
        ? `https://vidlink.pro/movie/${id}`
        : `https://vidlink.pro/tv/${id}/${season}/${episode}`;
    case "autoembed":
      return kind === "movie"
        ? `https://autoembed.co/movie/tmdb/${id}`
        : `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
    case "111movies":
      return kind === "movie"
        ? `https://111movies.com/movie/${id}`
        : `https://111movies.com/tv/${id}/${season}/${episode}`;
    case "vidfast":
      return kind === "movie"
        ? `https://vidfast.pro/movie/${id}`
        : `https://vidfast.pro/tv/${id}/${season}/${episode}`;
    case "2embed":
      return kind === "movie"
        ? `https://www.2embed.cc/embed/${id}`
        : `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`;
    case "vidsrcto":
      return kind === "movie"
        ? `https://vidsrc.to/embed/movie/${id}`
        : `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`;
  }
}

export const QUALITY_OPTIONS = ["240p", "360p", "480p", "720p", "1080p"] as const;

export type Channel = {
  id: string;
  name: string;
  country: string;
  categories: string[];
  logo?: string;
  url: string;
  streams?: string[];
};

export type CctvCamera = {
  id: string;
  name: string;
  city?: string;
  country?: string;
  info?: string;
  url: string;
  thumbnail?: string;
  isIframe?: boolean;
  isStreaming?: boolean;
  latitude?: number;
  longitude?: number;
};

export async function cctvCameras(): Promise<CctvCamera[]> {
  const res = await fetch("/api/public/cctv-cameras");
  if (!res.ok) throw new Error("cctv cameras failed");
  const json = await res.json();
  return json?.cameras ?? [];
}

type RawStream = {
  channel?: string | null;
  url?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  quality?: string | null;
};

export const CURATED_TV_CHANNELS: Channel[] = [
  {
    id: "AajTak.in",
    name: "Aaj Tak HD",
    country: "IN",
    categories: ["news"],
    url: "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8",
    streams: [
      "https://feeds.intoday.in/aajtak/api/aajtakhd/master.m3u8",
      "https://feeds.intoday.in/aajtak/api/master.m3u8",
      "https://aajtaklive-amd.akamaized.net/hls/live/2014416/aajtak/aajtaklive/live_404p/chunks.m3u8",
    ],
  },
  {
    id: "13C.cl",
    name: "13C",
    country: "CL",
    categories: ["culture", "general"],
    url: "https://origin.dpsgo.com/ssai/event/GI-9cp_bT8KcerLpZwkuhw/master.m3u8",
    streams: ["https://origin.dpsgo.com/ssai/event/GI-9cp_bT8KcerLpZwkuhw/master.m3u8"],
  },
  {
    id: "ctbperth.au",
    name: "CTB Perth",
    country: "AU",
    categories: ["news"],
    logo: "https://news.ctbperth.net.au/wp-content/uploads/2022/11/cropped-ctb-logo-512x512-1.png",
    url: "https://news.ctbperth.net.au/hls/stream.m3u8",
    streams: ["https://news.ctbperth.net.au/hls/stream.m3u8"],
  },
  {
    id: "bondi-vet.au",
    name: "Bondi Vet",
    country: "AU",
    categories: ["lifestyle"],
    logo: "https://images.ctfassets.net/8cd2csgvqd3m/2pdW0hTKLAfGIIYx4YfSpZ/910b42c0b11c04fc673d1c526fa6d429/Bondi_Vet.png",
    url: "https://wtfn-bondivet-1-au.samsung.wurl.tv/playlist.m3u8",
    streams: ["https://wtfn-bondivet-1-au.samsung.wurl.tv/playlist.m3u8"],
  },
  {
    id: "8outof10cats.au",
    name: "8 Out Of 10 Cats",
    country: "AU",
    categories: ["comedy"],
    logo: "https://images.ctfassets.net/8cd2csgvqd3m/7mK6VwObqfN2cK2AlUbs9D/2fd0c437643537454b6c3968546a6f6e7/8_out_of_10_cats.png",
    url: "https://amg00627-amg00627c37-samsung-au-4294.playouts.now.amagi.tv/playlist/amg00627-banijayfast-8outof10cats-samsungau/playlist.m3u8",
    streams: ["https://amg00627-amg00627c37-samsung-au-4294.playouts.now.amagi.tv/playlist/amg00627-banijayfast-8outof10cats-samsungau/playlist.m3u8"],
  },
  {
    id: "action-hollywood.au",
    name: "Action Hollywood Movies",
    country: "AU",
    categories: ["movies"],
    logo: "https://images.ctfassets.net/8cd2csgvqd3m/5l27f3yJ3rcnG2YpQ8Qg4x/e9af3a2cf6e8de1c9ad65e4052a0fd40/action_hollywood_movies.png",
    url: "https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungau/playlist.m3u8",
    streams: ["https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/playlist/amg01076-lightningintern-actionhollywood-samsungau/playlist.m3u8"],
  },
  {
    id: "milenniotv.ar",
    name: "Milennio TV",
    country: "AR",
    categories: ["general"],
    url: "https://videostream.shockmedia.com.ar:19360/milenniotv/milenniotv.m3u8",
    streams: ["https://videostream.shockmedia.com.ar:19360/milenniotv/milenniotv.m3u8"],
  },
];

let _channelCache: Channel[] | null = null;

function isPlayableStream(s: RawStream) {
  const url = s.url ?? "";
  return Boolean(
    s.channel &&
      /^https?:\/\//.test(url) &&
      (/\.m3u8(\?|$)|playlist|manifest|\.mpd(\?|$)/i.test(url)) &&
      !s.user_agent &&
      !s.referrer,
  );
}

function scoreStream(url: string) {
  let score = 0;
  if (url.startsWith("https://")) score += 5;
  if (url.includes(".m3u8")) score += 4;
  if (/(akamaized|amagi|wurl|dpsgo|intoday|shockmedia)/i.test(url)) score += 10;
  if (/render|proxy|githubusercontent/i.test(url)) score -= 6;
  return score;
}

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

  const logoMap = new Map<string, string>();
  for (const l of logos as any[]) {
    if (l.channel && l.url && !logoMap.has(l.channel)) logoMap.set(l.channel, l.url);
  }

  const streamMap = new Map<string, string[]>();
  for (const s of streams as RawStream[]) {
    if (!isPlayableStream(s)) continue;
    const arr = streamMap.get(s.channel!) ?? [];
    arr.push(s.url!);
    streamMap.set(s.channel!, arr);
  }

  for (const [key, arr] of streamMap.entries()) {
    const unique = Array.from(new Set(arr)).sort((a, b) => scoreStream(b) - scoreStream(a));
    streamMap.set(key, unique.slice(0, 4));
  }

  const apiChannels: Channel[] = (channels as any[])
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

  const curated = CURATED_TV_CHANNELS.map((channel) => ({
    ...channel,
    logo: channel.logo ?? logoMap.get(channel.id),
  }));

  const seen = new Set<string>();
  _channelCache = [...curated, ...apiChannels]
    .filter((channel) => {
      if (!channel.streams?.length || seen.has(channel.id)) return false;
      seen.add(channel.id);
      return true;
    })
    .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));

  return _channelCache;
}

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

export async function footballMatches() {
  const res = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard");
  if (!res.ok) throw new Error("football api failed");
  const json = await res.json();
  return (json?.events ?? []) as any[];
}

export type FootballStreamMatch = {
  id: string;
  title: string;
  league?: string;
  category?: string;
  poster?: string;
  date?: number;
  viewers?: number;
  teams?: {
    home?: { name?: string; badge?: string };
    away?: { name?: string; badge?: string };
  };
};

export type FootballStreamDetail = FootballStreamMatch & {
  sources: {
    id?: string;
    streamNo?: number;
    language?: string;
    hd?: boolean;
    embedUrl: string;
    source?: string;
    quality?: string;
    viewers?: number;
  }[];
};

const SPORTSRC = "https://api.sportsrc.org";

export async function footballStreamMatches(sport = "football"): Promise<FootballStreamMatch[]> {
  const res = await fetch(`/api/public/football-streams?mode=matches&sport=${encodeURIComponent(sport)}`);
  if (!res.ok) throw new Error("football streams failed");
  const json = await res.json();
  return json?.success ? (json.data ?? []) : [];
}

export async function footballStreamDetail(id: string, sport = "football"): Promise<FootballStreamDetail | null> {
  const res = await fetch(`/api/public/football-streams?mode=detail&id=${encodeURIComponent(id)}&sport=${encodeURIComponent(sport)}`);
  if (!res.ok) throw new Error("football stream detail failed");
  const json = await res.json();
  if (!json?.success || !json.data?.sources?.length) return null;
  return json.data as FootballStreamDetail;
}

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

export async function ytSearch(
  q: string,
  opts: { type?: "video"; eventType?: "live"; channelId?: string; videoCategoryId?: string; max?: number } = {},
) {
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

export async function ytLiveSearch(q: string, max = 24) {
  const liveItems = await ytSearch(q, { eventType: "live", max });
  if (liveItems.length === 0) return [];

  const ids = liveItems.map((item) => item.videoId).join(",");
  const res = await fetch(
    `${YT}/videos?part=status,liveStreamingDetails&id=${ids}&key=${YOUTUBE_API_KEY}`,
  );
  if (!res.ok) return liveItems;

  const json = await res.json();
  const allowed = new Set(
    (json.items ?? [])
      .filter((item: any) => item.status?.embeddable && item.status?.privacyStatus === "public" && item.liveStreamingDetails)
      .map((item: any) => item.id),
  );

  return liveItems.filter((item) => allowed.has(item.videoId));
}

export const FEATURED_CREATORS: { name: string; channelId: string; avatar?: string }[] = [
  { name: "IShowSpeed", channelId: "UCWVqdPTigfQ-cSNwG7O9MeA" },
  { name: "MrBeast", channelId: "UCX6OQ3DkcsbYNE6H8uQQuVA" },
  { name: "Kai Cenat", channelId: "UCXyEqsx38wwGBjlj956Hsgg" },
  { name: "PewDiePie", channelId: "UC-lHJZR3Gqxm24_Vd_AJ5Yw" },
  { name: "T-Series", channelId: "UCq-Fj5jknLsUf-MWSy4_brA" },
  { name: "NBA", channelId: "UCWJ2lWNubArHWmf3FIHbfcQ" },
];

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

export function youtubeLiveChatUrl(videoId: string) {
  const host = typeof window !== "undefined" ? window.location.hostname : "www.youtube.com";
  return `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${host}`;
}
