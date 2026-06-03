import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Loader2, MapPin, Play, Radio, Users } from "lucide-react";
import { FootballTab } from "@/components/FootballTab";
import { footballStreamMatches, type FootballStreamMatch } from "@/lib/api";
import { fetchSportScoreboard, SPORTS, type SportEvent, type SportKey } from "@/lib/sports-api";

export function LiveSportsTab() {
  const [sport, setSport] = useState<SportKey>("soccer");
  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {SPORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSport(s.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95 ${
              sport === s.key
                ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                : "border-border bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {sport === "soccer" ? <FootballTab /> : <SportScoreboard sport={sport} />}
    </div>
  );
}

function SportScoreboard({ sport }: { sport: SportKey }) {
  const [events, setEvents] = useState<SportEvent[]>([]);
  const [streams, setStreams] = useState<FootballStreamMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const meta = SPORTS.find((s) => s.key === sport)!;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchSportScoreboard(sport), footballStreamMatches(sport)]).then(([scoreboard, streamList]) => {
      if (!cancelled) { setEvents(scoreboard); setStreams(streamList); setLoading(false); }
    }).catch(() => {
      if (!cancelled) { setEvents([]); setStreams([]); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [sport]);

  const live = events.filter((e) => e.status.state === "in");
  const upcoming = events.filter((e) => e.status.state === "pre");
  const finished = events.filter((e) => e.status.state === "post");

  const { liveStreams, upcomingStreams } = useMemo(() => {
    const now = Date.now();
    const live: FootballStreamMatch[] = [];
    const up: FootballStreamMatch[] = [];
    for (const s of streams) {
      const ts = s.date ? Number(s.date) : 0;
      if (!ts || ts <= now + 5 * 60 * 1000) live.push(s);
      else up.push(s);
    }
    up.sort((a, b) => (a.date || 0) - (b.date || 0));
    return { liveStreams: live, upcomingStreams: up };
  }, [streams]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (events.length === 0 && streams.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-secondary/40 p-8 text-center">
        <p className="text-3xl">{meta.emoji}</p>
        <p className="mt-2 text-sm font-bold">No {meta.label} events scheduled today.</p>
        <p className="mt-1 text-xs text-muted-foreground">Check back during the season.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {liveStreams.length > 0 && <StreamGroup title="🔴 Watch live" tone="live" sport={sport} streams={liveStreams} />}
      {upcomingStreams.length > 0 && <StreamGroup title="Upcoming streams" tone="upcoming" sport={sport} streams={upcomingStreams} />}
      {live.length > 0 && <EventGroup title="🔴 Live now" tone="live" events={live} streams={streams} sport={sport} />}
      {upcoming.length > 0 && <EventGroup title="Upcoming" tone="upcoming" events={upcoming} streams={streams} sport={sport} />}
      {finished.length > 0 && <EventGroup title="Final" tone="final" events={finished} streams={streams} sport={sport} />}
    </div>
  );
}

function findStreamForEvent(event: SportEvent, streams: FootballStreamMatch[]) {
  const names = event.competitors.map((c) => c.name.toLowerCase().split(/\s+/)[0]).filter(Boolean);
  return streams.find((stream) => names.length >= 2 && names.every((name) => stream.title.toLowerCase().includes(name)));
}

function StreamGroup({ title, tone, sport, streams }: { title: string; tone: "live" | "upcoming"; sport: SportKey; streams: FootballStreamMatch[] }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {streams.map((stream) => <StreamCard key={stream.id} stream={stream} sport={sport} tone={tone} />)}
      </div>
    </section>
  );
}

function StreamCard({ stream, sport, tone }: { stream: FootballStreamMatch; sport: SportKey; tone: "live" | "upcoming" }) {
  const home = stream.teams?.home;
  const away = stream.teams?.away;
  const hasTeams = !!(home?.name || away?.name);
  const when = stream.date ? new Date(Number(stream.date)) : null;
  return (
    <a href={`/football-stream/${encodeURIComponent(stream.id)}?sport=${sport}`} className="glass-card block overflow-hidden rounded-2xl transition active:scale-[0.98] hover:border-primary/50">
      {stream.poster && (
        <div className="relative aspect-video bg-secondary">
          <img src={stream.poster} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => ((e.currentTarget.style.display = "none"))} />
          <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-black ${tone === "live" ? "animate-pulse bg-red-600 text-white" : "bg-primary/90 text-primary-foreground"}`}>
            {tone === "live" ? "LIVE" : "UPCOMING"}
          </span>
        </div>
      )}
      <div className="p-3">
        {hasTeams ? (
          <div className="flex items-center justify-between gap-2">
            <TeamBadge team={home} align="left" />
            <span className="text-[10px] font-black text-muted-foreground">VS</span>
            <TeamBadge team={away} align="right" />
          </div>
        ) : (
          <p className="line-clamp-2 text-sm font-black leading-tight">{stream.title}</p>
        )}
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 truncate">
            {when ? <><Clock className="h-3 w-3 shrink-0" />{when.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}</> : <span className="truncate">{stream.league || "Stream"}</span>}
          </span>
          {typeof stream.viewers === "number" && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{stream.viewers.toLocaleString()}</span>}
        </div>
        <div className="mt-2 flex items-center justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground"><Play className="h-3 w-3" fill="currentColor" /> Watch</span>
        </div>
      </div>
    </a>
  );
}

function TeamBadge({ team, align }: { team?: { name?: string; badge?: string }; align: "left" | "right" }) {
  if (!team?.name && !team?.badge) return <div className="flex-1" />;
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "justify-end text-right" : ""}`}>
      {align === "left" && team.badge && <img src={team.badge} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" onError={(e) => ((e.currentTarget.style.display = "none"))} />}
      <span className="truncate text-xs font-bold">{team.name}</span>
      {align === "right" && team.badge && <img src={team.badge} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" onError={(e) => ((e.currentTarget.style.display = "none"))} />}
    </div>
  );
}

function EventGroup({ title, tone, events, streams, sport }: { title: string; tone: "live" | "upcoming" | "final"; events: SportEvent[]; streams: FootballStreamMatch[]; sport: SportKey }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((e) => <EventCard key={e.id} event={e} tone={tone} stream={findStreamForEvent(e, streams)} sport={sport} />)}
      </div>
    </section>
  );
}

function EventCard({ event, tone, stream, sport }: { event: SportEvent; tone: "live" | "upcoming" | "final"; stream?: FootballStreamMatch; sport: SportKey }) {
  const [a, b] = event.competitors;
  const kickoff = new Date(event.date);
  return (
    <article className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{event.league || ""}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
          tone === "live" ? "animate-pulse bg-red-600 text-white" :
          tone === "final" ? "bg-secondary text-muted-foreground" :
          "bg-primary/15 text-primary"
        }`}>
          {tone === "live" ? `LIVE · ${event.status.clock || event.status.detail}` :
           tone === "final" ? "FINAL" :
           kickoff.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {a && b ? (
        <div className="space-y-2">
          <Competitor c={a} live={tone !== "upcoming"} />
          <Competitor c={b} live={tone !== "upcoming"} />
        </div>
      ) : (
        <p className="text-sm font-bold">{event.name}</p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
        <div className="flex min-w-0 items-center gap-2">
          {event.venue ? <><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{event.venue}</span></> :
           tone === "upcoming" ? <><Calendar className="h-3 w-3 shrink-0" /><span>{kickoff.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span></> : null}
        </div>
        {stream ? (
          <a href={`/football-stream/${encodeURIComponent(stream.id)}?sport=${sport}`} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition active:scale-95">
            <Radio className="h-3 w-3" /> Watch
          </a>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold text-muted-foreground">No stream yet</span>
        )}
      </div>
    </article>
  );
}

function Competitor({ c, live }: { c: SportEvent["competitors"][number]; live: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${c.winner ? "" : live && !c.winner ? "opacity-70" : ""}`}>
      {c.logo ? <img src={c.logo} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" /> : <span className="h-7 w-7 shrink-0 rounded-full bg-secondary" />}
      <p className="min-w-0 flex-1 truncate text-sm font-bold">{c.name}</p>
      {live && <p className="shrink-0 text-lg font-black tabular-nums">{c.score}</p>}
    </div>
  );
}