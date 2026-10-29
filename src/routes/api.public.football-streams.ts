import { createFileRoute } from "@tanstack/react-router";
import { normalizeCdnEvents } from "@/lib/football-cdn";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

const STREAMED = "https://streamed.pk";
const FETCH_OPTS = { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } };
const CATEGORY_BY_SPORT: Record<string, string> = {
  soccer: "football",
  football: "football",
  nba: "basketball",
  basketball: "basketball",
  nfl: "american-football",
  mlb: "baseball",
  nhl: "hockey",
  ufc: "fight",
  fighting: "fight",
  tennis: "tennis",
  f1: "motor-sports",
};

function badgeUrl(badge?: string) {
  if (!badge) return undefined;
  if (/^https?:\/\//i.test(badge)) return badge;
  return `${STREAMED}/api/images/badge/${badge}.webp`;
}

function posterUrl(poster?: string) {
  if (!poster) return undefined;
  if (/^https?:\/\//i.test(poster)) return poster;
  if (poster.startsWith("/api/images/")) return `${STREAMED}${poster}`;
  return `${STREAMED}/api/images/poster/${poster}.webp`;
}

function leagueFromTitle(title: string, category = "football") {
  // Just use category-fallback; streamed doesn't expose league per match.
  return category.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");
}

function normalizeMatch(m: any) {
  const category = m.category || "football";
  return {
    id: m.id,
    title: m.title,
    league: leagueFromTitle(m.title || "", category),
    category,
    poster: posterUrl(m.poster),
    date: m.date,
    viewers: typeof m.viewers === "number" ? m.viewers : undefined,
    teams: m.teams
      ? {
          home: m.teams.home ? { name: m.teams.home.name, badge: badgeUrl(m.teams.home.badge) } : undefined,
          away: m.teams.away ? { name: m.teams.away.name, badge: badgeUrl(m.teams.away.badge) } : undefined,
        }
      : undefined,
    rawSources: m.sources || [],
  };
}

const SPORTSRC = "https://api.sportsrc.org/";
const CDN_EVENTS = "https://api.cdnlivetv.tv/api/v1/events/sports/?user=cdnlivetv&plan=free";
let cdnCache: { data: unknown; expires: number } | undefined;
let cdnPending: Promise<unknown> | undefined;

async function cdnEvents() {
  if (cdnCache && cdnCache.expires > Date.now()) return cdnCache.data;
  if (cdnPending) return cdnPending;
  cdnPending = (async () => {
    const response = await fetch(CDN_EVENTS, { ...FETCH_OPTS, signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("Football feed unavailable");
    const data: unknown = await response.json();
    cdnCache = { data, expires: Date.now() + 20_000 };
    return data;
  })();
  try { return await cdnPending; } finally { cdnPending = undefined; }
}

async function srcJson(qs: string) {
  try {
    const r = await fetch(`${SPORTSRC}?${qs}`, FETCH_OPTS);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.success ? j.data : null;
  } catch {
    return null;
  }
}

async function fetchMatches(category = "football") {
  if (category === "football") {
    return normalizeCdnEvents(await cdnEvents()).map(({ sources, ...match }) => match);
  }
  const data = await srcJson(`data=matches&category=${encodeURIComponent(category)}`);
  const list = Array.isArray(data) ? data : [];
  const seen = new Set<string>();
  return list
    .filter((m: any) => m?.id && !seen.has(m.id) && seen.add(m.id))
    .map((m: any) => normalizeMatch({ ...m, category: m.category || category }));
}

async function fetchDetail(id: string, category = "football") {
  if (category === "football") {
    return normalizeCdnEvents(await cdnEvents(), Date.now(), true).find((match) => match.id === id) ?? null;
  }
  const d = await srcJson(`data=detail&category=${encodeURIComponent(category)}&id=${encodeURIComponent(id)}`);
  if (!d) return null;
  const normalized = normalizeMatch({ ...d, category: d.category || category });
  const sources = (Array.isArray(d.sources) ? d.sources : []).map((s: any) => ({
    id: s.id,
    streamNo: s.streamNo,
    language: s.language,
    hd: !!s.hd,
    embedUrl: s.embedUrl,
    source: s.source,
    viewers: typeof s.viewers === "number" ? s.viewers : undefined,
  })).filter((s: any) => /^https?:\/\//i.test(s.embedUrl || ""));
  return { ...normalized, sources };
}

export const Route = createFileRoute("/api/public/football-streams")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get("mode") === "image") {
          const image = params.get("url") || "";
          if (!/^https:\/\/cdnlivetv\.tv\/api\/v1\/team\/images\/\d{1,12}$/.test(image)) {
            return new Response("Invalid image", { status: 400, headers: CORS_HEADERS });
          }
          try {
            let response = await fetch(image, { headers: { referer: "https://cdnlivetv.tv/" }, signal: AbortSignal.timeout(8000), redirect: "manual" });
            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.get("location") || "";
              if (!/^https:\/\/(?:r2\.)?thesportsdb\.com\/images\/media\/team\/badge\/[a-z0-9._-]+$/i.test(location)) {
                return new Response(null, { status: 404, headers: CORS_HEADERS });
              }
              response = await fetch(location, { signal: AbortSignal.timeout(8000), redirect: "error" });
            }
            const type = response.headers.get("content-type") || "";
            if (!response.ok || !type.startsWith("image/")) return new Response(null, { status: 404, headers: CORS_HEADERS });
            return new Response(response.body, { headers: { ...CORS_HEADERS, "content-type": type, "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
          } catch { return new Response(null, { status: 502, headers: CORS_HEADERS }); }
        }
        const mode = params.get("mode") === "detail" ? "detail" : "matches";
        const id = params.get("id") || "";
        const sport = (params.get("sport") || "football").toLowerCase();
        const category = CATEGORY_BY_SPORT[sport] || CATEGORY_BY_SPORT.football;

        try {
          if (mode === "detail") {
            if (!/^[a-z0-9-]{3,200}$/i.test(id)) {
              return Response.json({ success: false, data: null }, { status: 400, headers: CORS_HEADERS });
            }
            const data = await fetchDetail(id, category);
            return Response.json(
              { success: !!data, data },
              { headers: { ...CORS_HEADERS, "cache-control": "public, max-age=20" } },
            );
          }
          const matches = await fetchMatches(category);
          return Response.json(
            { success: true, data: matches },
            { headers: { ...CORS_HEADERS, "cache-control": "public, max-age=30" } },
          );
        } catch (err) {
          return Response.json(
            { success: false, data: mode === "detail" ? null : [] },
            { status: 500, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});