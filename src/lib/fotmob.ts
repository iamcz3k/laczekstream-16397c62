// FotMob client wrapper. Hits our /api/public/fotmob proxy so the browser
// never talks to api.fotmob.com directly (CORS + UA gating).

export type FmTeam = { id: number; name: string; score?: number | string };
export type FmMatch = {
  id: string;
  pageUrl?: string;
  home: FmTeam;
  away: FmTeam;
  status: { started: boolean; finished: boolean; cancelled?: boolean; ongoing?: boolean; scoreStr?: string; liveTime?: { short?: string; long?: string }; reason?: { short?: string; long?: string } };
  statusId?: number;
  timeTS?: number;
  time?: string;
};
export type FmLeague = {
  id: number;
  name: string;
  ccode?: string;
  logo?: string;
  primaryId?: number;
  parentLeagueId?: number;
  matches: FmMatch[];
};

function logoLeague(id?: number) {
  return id ? `https://images.fotmob.com/image_resources/logo/leaguelogo/${id}.png` : undefined;
}
function logoTeam(id?: number) {
  return id ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}_small.png` : undefined;
}

export function teamLogo(id?: number) { return logoTeam(id); }
export function leagueLogo(id?: number) { return logoLeague(id); }

export async function fetchFotmobMatches(date?: Date): Promise<FmLeague[]> {
  const dt = date ?? new Date();
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  const q = `${y}${m}${d}`;
  try {
    const r = await fetch(`/api/public/fotmob?mode=matches&date=${q}`);
    const j = await r.json();
    if (!j?.ok) return [];
    const leagues: any[] = j.data?.leagues || [];
    return leagues.map((lg) => ({
      id: lg.id ?? lg.primaryId,
      name: lg.name,
      ccode: lg.ccode,
      primaryId: lg.primaryId,
      parentLeagueId: lg.parentLeagueId,
      logo: logoLeague(lg.primaryId ?? lg.id),
      matches: (lg.matches || []).map((m: any): FmMatch => ({
        id: String(m.id),
        pageUrl: m.pageUrl,
        home: { id: m.home?.id, name: m.home?.name, score: m.home?.score ?? m.status?.scoreStr?.split("-")?.[0]?.trim() },
        away: { id: m.away?.id, name: m.away?.name, score: m.away?.score ?? m.status?.scoreStr?.split("-")?.[1]?.trim() },
        status: {
          started: !!m.status?.started,
          finished: !!m.status?.finished,
          cancelled: !!m.status?.cancelled,
          ongoing: !!m.status?.ongoing,
          scoreStr: m.status?.scoreStr,
          liveTime: m.status?.liveTime,
          reason: m.status?.reason,
        },
        statusId: m.statusId,
        timeTS: m.status?.utcTime ? Date.parse(m.status.utcTime) : (m.timeTS || undefined),
        time: m.time,
      })),
    }));
  } catch {
    return [];
  }
}

export async function fetchFotmobMatchDetails(id: string) {
  try {
    const r = await fetch(`/api/public/fotmob?mode=match&id=${encodeURIComponent(id)}`);
    const j = await r.json();
    return j?.ok ? j.data : null;
  } catch { return null; }
}
