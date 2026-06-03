import { createFileRoute } from "@tanstack/react-router";

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

async function fetchMatches(category = "football") {
  // Combine category + live so user sees live games too.
  const [catRes, liveRes] = await Promise.all([
    fetch(`${STREAMED}/api/matches/${category}`, FETCH_OPTS).then((r) => r.ok ? r.json() : []).catch(() => []),
    fetch(`${STREAMED}/api/matches/live`, FETCH_OPTS).then((r) => r.ok ? r.json() : []).catch(() => []),
  ]);
  const seen = new Set<string>();
  const all = [...liveRes.filter((m: any) => m.category === category), ...catRes.map((m: any) => ({ ...m, category }))];
  return all
    .filter((m: any) => {
      if (!m?.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return Array.isArray(m.sources) && m.sources.length > 0;
    })
    .map(normalizeMatch);
}

async function fetchDetail(id: string, category?: string) {
  // Find match across supported sports + live to get its source list.
  const categories = category ? [category] : Array.from(new Set(Object.values(CATEGORY_BY_SPORT)));
  const [liveRes, ...categoryResults] = await Promise.all([
    fetch(`${STREAMED}/api/matches/live`, FETCH_OPTS).then((r) => r.ok ? r.json() : []).catch(() => []),
    ...categories.map((cat) => fetch(`${STREAMED}/api/matches/${cat}`, FETCH_OPTS).then((r) => r.ok ? r.json() : []).catch(() => []).then((items) => items.map((m: any) => ({ ...m, category: cat })))),
  ]);
  const all = [...liveRes, ...categoryResults.flat()];
  const match = all.find((m: any) => m?.id === id);
  if (!match) return null;

  const normalized = normalizeMatch(match);
  const refs: { source: string; id: string }[] = match.sources || [];

  const streamLists = await Promise.all(
    refs.map(async (ref) => {
      try {
        const r = await fetch(`${STREAMED}/api/stream/${ref.source}/${ref.id}`, FETCH_OPTS);
        if (!r.ok) return [];
        const data = await r.json();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }),
  );

  const sources = streamLists.flat().map((s: any) => ({
    id: s.id,
    streamNo: s.streamNo,
    language: s.language,
    hd: !!s.hd,
    embedUrl: s.embedUrl,
    source: s.source,
    viewers: typeof s.viewers === "number" ? s.viewers : undefined,
  })).filter((s) => /^https?:\/\//i.test(s.embedUrl));

  return { ...normalized, sources };
}

export const Route = createFileRoute("/api/public/football-streams")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
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