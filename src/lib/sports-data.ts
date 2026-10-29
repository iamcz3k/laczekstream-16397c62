/** ESPN-backed helpers for live timeline, team pages, and search.
 *  ESPN's public site APIs are unauthenticated and CORS-open. Where data
 *  isn't available we return empty arrays so the UI can show an "unavailable"
 *  state without crashing. */
import { SPORTS, type SportKey } from "@/lib/sports-api";

const SUMMARY_BASE = "https://site.api.espn.com/apis/site/v2/sports";
const SEARCH = "https://site.web.api.espn.com/apis/common/v3/search";

export type TimelineEvent = {
  id: string;
  type: string;
  text: string;
  clock?: string;
  period?: number;
  scoringPlay?: boolean;
  team?: { name?: string; logo?: string; abbreviation?: string };
  athletes?: { name?: string; headshot?: string }[];
};

export type MatchInsights = {
  status: { state: "pre" | "in" | "post"; detail: string; clock?: string };
  competitors: { name: string; logo?: string; score: string; winner?: boolean; homeAway: "home" | "away" }[];
  events: TimelineEvent[];
  stats: { name: string; home?: string; away?: string }[];
  venue?: string;
  league?: string;
};

const PROBE_LEAGUES = [
  "soccer/eng.1", "soccer/esp.1", "soccer/ita.1", "soccer/ger.1", "soccer/fra.1",
  "soccer/uefa.champions", "soccer/uefa.europa", "soccer/uefa.europa.conf",
  "soccer/usa.1", "soccer/mex.1", "soccer/por.1", "soccer/ned.1", "soccer/tur.1",
  "soccer/sau.1", "soccer/bra.1", "soccer/arg.1", "soccer/fifa.world",
  "basketball/nba", "basketball/wnba", "basketball/mens-college-basketball", "basketball/womens-college-basketball",
  "football/nfl", "football/college-football",
  "baseball/mlb",
  "hockey/nhl",
  "mma/ufc", "tennis/atp", "tennis/wta", "racing/f1",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}
function parseTitleTeams(title: string): [string, string] | null {
  const m = title.replace(/\s+/g, " ").trim().match(/^(.+?)\s+(?:vs\.?|v\.?|-|@|x)\s+(.+)$/i);
  if (!m) return null;
  return [normalize(m[1]), normalize(m[2])];
}
function teamsMatch(want: [string, string], compNames: string[]): boolean {
  if (compNames.length < 2) return false;
  const a = normalize(compNames[0]); const b = normalize(compNames[1]);
  const hit = (x: string, y: string) => x.includes(y) || y.includes(x) || x.split(" ").some((w) => w.length > 3 && y.includes(w));
  return (hit(want[0], a) && hit(want[1], b)) || (hit(want[0], b) && hit(want[1], a));
}

function shapeInsights(data: any): MatchInsights | null {
  const header = data.header || {};
  const comp = header.competitions?.[0] || {};
  const competitors = (comp.competitors || []).map((c: any) => ({
    name: c.team?.displayName || c.athlete?.displayName || "—",
    logo: c.team?.logo || c.team?.logos?.[0]?.href,
    score: c.score?.value?.toString() ?? c.score ?? "",
    winner: c.winner,
    homeAway: (c.homeAway || "home") as "home" | "away",
  }));
  if (competitors.length === 0) return null;
  const status = header.competitions?.[0]?.status?.type || header.status?.type || {};
  const plays = (data.plays || comp.details || []).map((p: any, i: number): TimelineEvent => ({
    id: p.id?.toString() ?? `${i}`,
    type: p.type?.text || p.type?.id || "event",
    text: p.text || p.shortText || p.type?.text || "",
    clock: p.clock?.displayValue || p.clockDisplayValue,
    period: p.period?.number ?? p.period,
    scoringPlay: !!p.scoringPlay,
    team: p.team ? { name: p.team.displayName, logo: p.team.logo || p.team.logos?.[0]?.href, abbreviation: p.team.abbreviation } : undefined,
    athletes: (p.participants || p.athletesInvolved || []).map((a: any) => ({
      name: a.athlete?.displayName || a.displayName,
      headshot: a.athlete?.headshot?.href || a.headshot?.href,
    })),
  }));
  const teamStats = (data.boxscore?.teams || []).map((t: any) => ({ homeAway: t.homeAway, stats: t.statistics || [] }));
  const statNames = new Set<string>();
  for (const t of teamStats) for (const s of t.stats) statNames.add(s.label || s.name);
  const stats = Array.from(statNames).map((name) => {
    const home = teamStats.find((t: any) => t.homeAway === "home")?.stats.find((s: any) => (s.label || s.name) === name);
    const away = teamStats.find((t: any) => t.homeAway === "away")?.stats.find((s: any) => (s.label || s.name) === name);
    return { name, home: home?.displayValue ?? home?.value?.toString(), away: away?.displayValue ?? away?.value?.toString() };
  });
  return {
    status: { state: (status.state || "pre") as "pre" | "in" | "post", detail: status.shortDetail || status.detail || "", clock: comp.status?.displayClock || header.status?.displayClock },
    competitors, events: plays.reverse(), stats,
    venue: comp.venue?.fullName, league: data.leagues?.[0]?.name,
  };
}

/** Try ESPN summary by event ID; if that misses, fuzzy-match by team names
 *  parsed from the match title across many league scoreboards. */
export async function fetchMatchInsights(eventId: string, sportHint?: SportKey | null, title?: string): Promise<MatchInsights | null> {
  const leagues: string[] = [];
  const espn = SPORTS.find((s) => s.key === sportHint)?.espn;
  if (espn) leagues.push(espn);
  for (const lg of PROBE_LEAGUES) if (!leagues.includes(lg)) leagues.push(lg);

  // 1) direct event-ID probe on the hinted sport + a small slice
  for (const path of leagues.slice(0, 8)) {
    try {
      const r = await fetch(`${SUMMARY_BASE}/${path}/summary?event=${eventId}`);
      if (!r.ok) continue;
      const shaped = shapeInsights(await r.json());
      if (shaped) return shaped;
    } catch {}
  }

  // 2) fuzzy match by title across scoreboards (parallel batches)
  if (!title) return null;
  const want = parseTitleTeams(title);
  if (!want) return null;
  const batchSize = 6;
  for (let i = 0; i < leagues.length; i += batchSize) {
    const batch = leagues.slice(i, i + batchSize);
    const hits = await Promise.all(batch.map(async (path) => {
      try {
        const r = await fetch(`${SUMMARY_BASE}/${path}/scoreboard`);
        if (!r.ok) return null;
        const data = await r.json();
        for (const ev of data.events || []) {
          const names = (ev.competitions?.[0]?.competitors || []).map((c: any) => c.team?.displayName || c.athlete?.displayName || "");
          if (teamsMatch(want, names)) return { eventId: ev.id?.toString() as string, path };
        }
        return null;
      } catch { return null; }
    }));
    const hit = hits.find((x): x is { eventId: string; path: string } => !!x);
    if (hit) {
      try {
        const r = await fetch(`${SUMMARY_BASE}/${hit.path}/summary?event=${hit.eventId}`);
        if (r.ok) {
          const shaped = shapeInsights(await r.json());
          if (shaped) return shaped;
        }
      } catch {}
    }
  }
  return null;
}

export type TeamProfile = {
  id: string;
  name: string;
  abbreviation?: string;
  logo?: string;
  venue?: string;
  location?: string;
  color?: string;
  league?: string;
  record?: string;
  standingSummary?: string;
  coach?: string;
  squad: { id: string; name: string; position?: string; jersey?: string; headshot?: string }[];
  nextEvents: { id: string; name: string; date: string; competition?: string }[];
  results: { id: string; name: string; date: string; score?: string; result?: string }[];
};

const TEAM_LEAGUES: { sport: SportKey; path: string }[] = [
  { sport: "soccer", path: "soccer/eng.1" },
  { sport: "soccer", path: "soccer/esp.1" },
  { sport: "soccer", path: "soccer/ita.1" },
  { sport: "soccer", path: "soccer/ger.1" },
  { sport: "soccer", path: "soccer/fra.1" },
  { sport: "soccer", path: "soccer/uefa.champions" },
  { sport: "nba", path: "basketball/nba" },
  { sport: "nfl", path: "football/nfl" },
  { sport: "mlb", path: "baseball/mlb" },
  { sport: "nhl", path: "hockey/nhl" },
];

export async function fetchTeamProfile(teamId: string, leagueHint?: string): Promise<TeamProfile | null> {
  const paths = leagueHint ? [leagueHint, ...TEAM_LEAGUES.map((l) => l.path)] : TEAM_LEAGUES.map((l) => l.path);
  for (const path of paths) {
    try {
      const r = await fetch(`${SUMMARY_BASE}/${path}/teams/${teamId}`);
      if (!r.ok) continue;
      const data = await r.json();
      const t = data.team;
      if (!t) continue;
      // Roster + schedule (separate endpoints, parallel)
      const [rosterRes, scheduleRes] = await Promise.all([
        fetch(`${SUMMARY_BASE}/${path}/teams/${teamId}/roster`).then((r) => r.ok ? r.json() : null).catch(() => null),
        fetch(`${SUMMARY_BASE}/${path}/teams/${teamId}/schedule`).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);
      const squad = (rosterRes?.athletes || []).flatMap((group: any) =>
        (group.items || group).map((a: any) => ({
          id: a.id?.toString(),
          name: a.displayName || a.fullName,
          position: a.position?.displayName || a.position?.abbreviation,
          jersey: a.jersey,
          headshot: a.headshot?.href,
        }))
      ).filter((p: any) => p.id && p.name);
      const events = (scheduleRes?.events || []).map((ev: any) => {
        const comp = ev.competitions?.[0] || {};
        const st = comp.status?.type;
        return {
          id: ev.id?.toString(),
          name: ev.name || ev.shortName,
          date: ev.date,
          competition: ev.season?.displayName || comp.league?.name,
          state: st?.state as "pre" | "in" | "post" | undefined,
          score: comp.competitors?.map((c: any) => `${c.team?.abbreviation || ""} ${c.score || ""}`).join(" - "),
          result: st?.shortDetail,
        };
      });
      return {
        id: t.id?.toString() ?? teamId,
        name: t.displayName || t.name,
        abbreviation: t.abbreviation,
        logo: t.logos?.[0]?.href || t.logo,
        venue: t.franchise?.venue?.fullName || t.venue?.fullName,
        location: t.location,
        color: t.color ? `#${t.color}` : undefined,
        league: data.season?.displayName || path,
        record: t.record?.items?.[0]?.summary,
        standingSummary: t.standingSummary,
        coach: t.coach?.[0]?.displayName,
        squad,
        nextEvents: events.filter((e: any) => e.state === "pre").slice(0, 12),
        results: events.filter((e: any) => e.state === "post").slice(0, 12),
      };
    } catch { continue; }
  }
  return null;
}

export type SearchResult = {
  id: string;
  type: "team" | "player" | "league" | "other";
  name: string;
  description?: string;
  image?: string;
  url?: string;
};

export async function searchSports(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  try {
    const r = await fetch(`${SEARCH}?query=${encodeURIComponent(query)}&limit=20&mode=prefix`);
    if (!r.ok) return [];
    const data = await r.json();
    const out: SearchResult[] = [];
    for (const group of data.results || []) {
      for (const c of group.contents || []) {
        const type: SearchResult["type"] =
          c.type === "team" ? "team" :
          c.type === "player" || c.type === "athlete" ? "player" :
          c.type === "league" ? "league" : "other";
        out.push({
          id: c.id?.toString() ?? c.uid ?? c.link?.web?.href ?? c.displayName,
          type,
          name: c.displayName || c.shortName || c.title,
          description: c.subtitle || c.description,
          image: c.image?.default || c.headshot?.href || c.logo,
          url: c.link?.web?.href,
        });
      }
    }
    return out;
  } catch { return []; }
}
