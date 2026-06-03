export type SportKey = "soccer" | "nba" | "nfl" | "mlb" | "nhl" | "f1" | "ufc" | "tennis";

export const SPORTS: { key: SportKey; label: string; emoji: string; espn: string | null }[] = [
  { key: "soccer", label: "Soccer", emoji: "⚽", espn: null },
  { key: "nba", label: "NBA", emoji: "🏀", espn: "basketball/nba" },
  { key: "nfl", label: "NFL", emoji: "🏈", espn: "football/nfl" },
  { key: "mlb", label: "MLB", emoji: "⚾", espn: "baseball/mlb" },
  { key: "nhl", label: "NHL", emoji: "🏒", espn: "hockey/nhl" },
  { key: "f1", label: "F1", emoji: "🏎️", espn: "racing/f1" },
  { key: "ufc", label: "UFC", emoji: "🥊", espn: "mma/ufc" },
  { key: "tennis", label: "Tennis", emoji: "🎾", espn: "tennis/atp" },
];

export type SportEvent = {
  id: string;
  name: string;
  shortName: string;
  date: string;
  status: { state: "pre" | "in" | "post"; detail: string; clock?: string; period?: number };
  competitors: {
    name: string;
    abbreviation: string;
    score: string;
    logo?: string;
    homeAway: "home" | "away";
    winner?: boolean;
  }[];
  league?: string;
  venue?: string;
};

export async function fetchSportScoreboard(sport: SportKey): Promise<SportEvent[]> {
  const meta = SPORTS.find((s) => s.key === sport);
  if (!meta?.espn) return [];
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${meta.espn}/scoreboard`);
    if (!r.ok) return [];
    const data = await r.json();
    const league = data.leagues?.[0]?.name;
    return (data.events || []).map((ev: any): SportEvent => {
      const comp = ev.competitions?.[0] || {};
      const competitors = (comp.competitors || []).map((c: any) => ({
        name: c.team?.displayName || c.athlete?.displayName || "—",
        abbreviation: c.team?.abbreviation || c.athlete?.shortName || "",
        score: c.score ?? "",
        logo: c.team?.logo || c.athlete?.headshot?.href,
        homeAway: c.homeAway || "home",
        winner: c.winner,
      }));
      const st = ev.status?.type;
      return {
        id: ev.id,
        name: ev.name,
        shortName: ev.shortName,
        date: ev.date,
        status: {
          state: (st?.state || "pre") as "pre" | "in" | "post",
          detail: st?.shortDetail || st?.detail || "",
          clock: ev.status?.displayClock,
          period: ev.status?.period,
        },
        competitors,
        league,
        venue: comp.venue?.fullName,
      };
    });
  } catch {
    return [];
  }
}

/** Build a generic "find a stream" URL for sports we don't have a direct provider for. */
export function findStreamUrl(event: SportEvent): string {
  const query = encodeURIComponent(`${event.shortName || event.name} live stream free`);
  return `https://duckduckgo.com/?q=${query}`;
}