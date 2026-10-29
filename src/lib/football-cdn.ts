import { z } from "zod";

const channelSchema = z.object({
  id: z.string().optional(),
  channel_name: z.string().default(""),
  channel_code: z.string().optional(),
  url: z.string().optional(),
  viewers: z.number().optional(),
});
const eventSchema = z.object({
  gameID: z.union([z.string(), z.number()]).transform(String),
  event: z.string(),
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  homeTeamIMG: z.string().optional(),
  awayTeamIMG: z.string().optional(),
  tournament: z.string().optional(),
  status: z.string().default("NS"),
  start: z.string().optional(),
  end: z.string().optional(),
  channels: z.array(channelSchema).default([]),
});

export function cdnTime(value?: string) {
  if (!value) return undefined;
  const iso = value.replace(" ", "T");
  const time = Date.parse(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  return Number.isFinite(time) ? time : undefined;
}

function imageUrl(value?: string) {
  if (!value || !/^https:\/\/cdnlivetv\.tv\/api\/v1\/team\/images\/\d+$/.test(value)) return undefined;
  return `/api/public/football-streams?mode=image&url=${encodeURIComponent(value)}`;
}

export function normalizeCdnEvents(payload: unknown, now = Date.now(), includeUnavailable = false) {
  const root = payload as { "cdn-live-tv"?: { Soccer?: unknown[] } } | null;
  const rows = root?.["cdn-live-tv"]?.Soccer;
  if (!Array.isArray(rows)) return [];
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    const parsed = eventSchema.safeParse(row);
    if (!parsed.success) return [];
    const event = parsed.data;
    if (!/^[a-z0-9-]{1,180}$/i.test(event.gameID) || seen.has(event.gameID)) return [];
    seen.add(event.gameID);
    const date = cdnTime(event.start);
    const end = cdnTime(event.end) ?? (date ? date + 3 * 60 * 60 * 1000 : undefined);
    const status = event.status.trim().toUpperCase();
    const finished = /^(FT|AET|PEN|FINISHED|COMPLETED|CANCELLED|CANC|POSTPONED|PST|ABD|AWD)$/.test(status);
    const reportedLive = /^(LIVE|IN|INPLAY|IN PLAY|1H|2H|HT|ET|BT|P|INT)$/.test(status);
    const inWindow = date !== undefined && date <= now && end !== undefined && end > now;
    const live = !finished && (reportedLive || (status === "NS" && inWindow)) && (end === undefined || end > now);
    const upcoming = !finished && !live && date !== undefined && date > now && date <= now + 24 * 60 * 60 * 1000;
    const sources = event.channels.flatMap((channel, index) => {
      let url: URL;
      try {
        url = new URL(channel.url || "https://cdnlivetv.tv/api/v1/channels/player/");
      } catch { return []; }
      if (url.origin !== "https://cdnlivetv.tv" || url.pathname !== "/api/v1/channels/player/") return [];
      if (!url.searchParams.get("name")) url.searchParams.set("name", channel.channel_name);
      if (!url.searchParams.get("name")) return [];
      url.searchParams.set("user", "cdnlivetv");
      url.searchParams.set("plan", "free");
      if (channel.channel_code) url.searchParams.set("code", channel.channel_code);
      return [{ id: channel.id || String(index + 1), streamNo: index + 1, embedUrl: url.toString(), source: channel.channel_name, hd: /HD/i.test(channel.channel_name), viewers: channel.viewers }];
    });
    if (!includeUnavailable && ((!live && !upcoming) || sources.length === 0)) return [];
    return [{
      id: `cdn-${event.gameID}`, title: event.event, league: event.tournament || "Football", category: "football",
      date, status: live ? "live" as const : "upcoming" as const, available: sources.length > 0,
      teams: { home: { name: event.homeTeam, badge: imageUrl(event.homeTeamIMG) }, away: { name: event.awayTeam, badge: imageUrl(event.awayTeamIMG) } },
      sources,
    }];
  }).sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || (a.date ?? 0) - (b.date ?? 0));
}