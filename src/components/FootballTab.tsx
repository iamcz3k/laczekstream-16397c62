import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, Calendar, Clock, Loader2, MapPin, Play, Radio, Search, X } from "lucide-react";
import { footballMatches, footballStreamMatches, type FootballStreamMatch } from "@/lib/api";
import { isMatchScheduled, scheduleMatchNotification } from "@/lib/notifications";
import { getPrefs } from "@/lib/preferences";
import { trackSearch } from "@/lib/tracker";

function formatKickoff(iso?: string | number) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

function teamName(team: any) {
  return team?.team?.displayName || team?.team?.name || "Team";
}

export function FootballTab() {
  const [mode, setMode] = useState<"schedule" | "watch">("watch");
  const [search, setSearch] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [streams, setStreams] = useState<FootballStreamMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStreams, setAllStreams] = useState<FootballStreamMatch[]>([]);
  const userName = getPrefs().name || "";

  useEffect(() => {
    setLoading(true);
    const loader = mode === "schedule" ? footballMatches().then(setEvents) : footballStreamMatches().then(setStreams);
    loader.catch(() => (mode === "schedule" ? setEvents([]) : setStreams([]))).finally(() => setLoading(false));
  }, [mode]);

  // Always fetch the live stream catalog so the schedule view can show "Watch live" buttons
  // when a match is also available as a live stream.
  useEffect(() => {
    footballStreamMatches().then(setAllStreams).catch(() => setAllStreams([]));
  }, []);

  function findStreamForEvent(ev: any): FootballStreamMatch | undefined {
    const comp = ev.competitions?.[0];
    const home = (comp?.competitors?.find((c: any) => c.homeAway === "home")?.team?.displayName || "").toLowerCase();
    const away = (comp?.competitors?.find((c: any) => c.homeAway === "away")?.team?.displayName || "").toLowerCase();
    if (!home && !away) return undefined;
    return allStreams.find((s) => {
      const t = (s.title || "").toLowerCase();
      return (home && t.includes(home.split(" ")[0])) && (away && t.includes(away.split(" ")[0]));
    });
  }

  const groupedStreams = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? streams.filter((m) => `${m.title} ${m.league ?? ""}`.toLowerCase().includes(q))
      : streams;
    return filtered.reduce<Record<string, FootballStreamMatch[]>>((acc, match) => {
      const league = match.league || "Football";
      acc[league] = [...(acc[league] ?? []), match];
      return acc;
    }, {});
  }, [streams, search]);

  return (
    <div className="space-y-4">
      {userName && (
        <p className="text-sm text-muted-foreground">⚽ Welcome back, <span className="font-bold text-foreground">{userName}</span> — here's today's action.</p>
      )}
      <div className="inline-flex w-full rounded-full glass p-1 shadow-[inset_0_1px_0_color-mix(in_oklab,white_8%,transparent)] sm:w-auto">
        {([
          ["watch", "Watch Live"],
          ["schedule", "Schedule"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 active:scale-95 sm:flex-none ${
              mode === key ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : mode === "schedule" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <p className="text-sm">Today's fixtures · kickoff times in your local timezone</p>
          </div>
          {events.map((ev) => {
            const comp = ev.competitions?.[0];
            const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
            const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
            const status = ev.status?.type;
            const state = status?.state;
            const isLive = state === "in";
            const isFinal = state === "post";
            const kickoff = formatKickoff(ev.date);
            const venue = comp?.venue?.fullName;
            const league = ev.season?.slug?.replace(/-/g, " ") || ev.shortName;
            const matchedStream = findStreamForEvent(ev);

            return (
                <article key={ev.id} className="glass-card rounded-[22px] p-4 transition-all duration-300 hover:border-primary/50">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{league}</span>
                  <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${isLive ? "bg-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                    {isLive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" /> : <Clock className="h-3 w-3" />}
                    {isLive ? `LIVE ${ev.status?.displayClock ?? ""}` : `${kickoff.date} · ${kickoff.time}`}
                  </span>
                </div>

                <div className="space-y-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4 sm:space-y-0">
                  <div className="flex items-center gap-3 sm:justify-end sm:text-right">
                    {home?.team?.logo && <img src={home.team.logo} alt="" className="h-10 w-10 shrink-0 object-contain" />}
                    <span className="min-w-0 text-base font-semibold leading-tight break-words">{teamName(home)}</span>
                  </div>
                  <div className="mx-auto flex w-fit min-w-24 items-center justify-center rounded-lg bg-secondary px-4 py-2 text-center">
                    {state === "pre" ? <span className="text-sm font-bold text-primary">{kickoff.time}</span> : <span className="text-2xl font-black tabular-nums">{home?.score ?? 0} : {away?.score ?? 0}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {away?.team?.logo && <img src={away.team.logo} alt="" className="h-10 w-10 shrink-0 object-contain" />}
                    <span className="min-w-0 text-base font-semibold leading-tight break-words">{teamName(away)}</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-muted-foreground">
                  <span>{isFinal ? "Full Time" : status?.shortDetail || "Scheduled"}</span>
                  {venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {venue}</span>}
                  {matchedStream && (
                    <Link
                      to="/football-stream/$matchId"
                      params={{ matchId: matchedStream.id }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground transition hover:scale-105"
                    >
                      <Play className="h-3 w-3" fill="currentColor" /> Watch live
                    </Link>
                  )}
                  {state === "pre" && ev.date && new Date(ev.date).getTime() > Date.now() && (
                    <NotifyButton id={`sched-${ev.id}`} title={`${teamName(home)} vs ${teamName(away)}`} when={new Date(ev.date).getTime()} />
                  )}
                </div>
              </article>
            );
          })}
          {events.length === 0 && <p className="py-20 text-center text-muted-foreground">No matches today.</p>}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Radio className="h-4 w-4" />
            <p className="text-sm">Live football streams · today's matches</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value.trim().length > 2) trackSearch(e.target.value); }}
              placeholder="Search team, match or league…"
              className="w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-10 text-sm outline-none focus:border-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Clear">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {Object.entries(groupedStreams).map(([league, matches]) => (
            <section key={league} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{league}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => {
                  const kickoff = formatKickoff(match.date);
                  const notStarted = match.date ? match.date > Date.now() : false;
                  return (
                    <div key={match.id} className="glass-card relative overflow-hidden rounded-[22px] text-left transition-all duration-300 hover:border-primary/50">
                      <Link to="/football-stream/$matchId" params={{ matchId: match.id }} className="block active:scale-[0.98]">
                        {match.poster && <img src={match.poster} alt={match.title} className="h-36 w-full object-cover" loading="lazy" />}
                        <div className="space-y-3 p-4 pb-2">
                          <p className="text-base font-bold leading-tight break-words">{match.title}</p>
                          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>{kickoff.time || "Live"}</span>
                            <span>{match.viewers ? `${match.viewers.toLocaleString()} views` : "Stream"}</span>
                          </div>
                          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                            <Play className="h-4 w-4" fill="currentColor" /> Watch
                          </span>
                        </div>
                      </Link>
                      {notStarted && match.date && (
                        <div className="px-4 pb-4">
                          <NotifyButton id={match.id} title={match.title} when={match.date} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
          {streams.length === 0 && <p className="py-20 text-center text-muted-foreground">No football streams are live right now.</p>}
        </div>
      )}

    </div>
  );
}

function NotifyButton({ id, title, when }: { id: string; title: string; when: number }) {
  const [scheduled, setScheduled] = useState(() => isMatchScheduled(id));
  const [busy, setBusy] = useState(false);

  async function notify() {
    setBusy(true);
    const ok = await scheduleMatchNotification({ id, title, when, url: window.location.origin });
    setBusy(false);
    if (ok) setScheduled(true);
    else alert("Notifications were blocked. Enable notifications in your browser settings to get a kickoff alert.");
  }

  return (
    <button
      onClick={notify}
      disabled={busy || scheduled}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition ${scheduled ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-primary hover:text-primary-foreground"}`}
    >
      {scheduled ? <BellRing className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
      {scheduled ? "We'll notify you" : "Notify me"}
    </button>
  );
}