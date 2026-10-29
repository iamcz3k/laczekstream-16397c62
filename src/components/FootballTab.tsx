import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, BellRing, Calendar, Clock, Loader2, MapPin, Play, Radio, Search, X } from "lucide-react";
import { footballMatches, footballStreamMatches, type FootballStreamMatch } from "@/lib/api";
import { isMatchScheduled, scheduleMatchNotification } from "@/lib/notifications";
import { getPrefs } from "@/lib/preferences";
import { trackSearch } from "@/lib/tracker";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";
import { Button } from "@/components/ui/button";

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

function Countdown({ when }: { when: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const diff = Math.max(0, when - now);
  if (diff <= 0) return <span className="text-xs font-bold text-primary">Starting now</span>;
  const s = Math.floor(diff / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const label = d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
      <Clock className="h-3 w-3" /> Starts in {label}
    </span>
  );
}

export function FootballTab() {
  const [mode, setMode] = useState<"schedule" | "watch">("watch");
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [events, setEvents] = useState<any[]>([]);
  const [streams, setStreams] = useState<FootballStreamMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStreams, setAllStreams] = useState<FootballStreamMatch[]>([]);
  const [streamError, setStreamError] = useState(false);
  const userName = getPrefs().name || "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    async function refresh() {
      try {
        if (mode === "schedule") {
          const list = await footballMatches();
          if (!cancelled) setEvents(list.filter((ev) => ev.status?.type?.state === "in" || (ev.status?.type?.state === "pre" && Date.parse(ev.date) > Date.now())));
        } else {
          const list = await footballStreamMatches();
          if (!cancelled) { setStreams(list); setAllStreams(list); setStreamError(false); }
        }
      } catch {
        if (!cancelled) {
          if (mode === "watch") { setStreamError(true); setStreams([]); }
          else setEvents([]);
        }
      } finally { if (!cancelled) setLoading(false); }
    }
    void refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
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

  const LEAGUE_GROUPS: { name: string; match: RegExp }[] = [
    { name: "World Cup", match: /world\s*cup|fifa\s*wc|wc\s*qual/i },
    { name: "Champions League", match: /champions\s*league|ucl|uefa\s*champ/i },
    { name: "Europa League", match: /europa\s*league|uel|uefa\s*europa/i },
    { name: "Premier League", match: /premier\s*league|\bepl\b|english\s*premier/i },
    { name: "La Liga", match: /la\s*liga|laliga|spanish\s*la\s*liga|primera/i },
    { name: "Serie A", match: /serie\s*a|italian\s*serie/i },
    { name: "Bundesliga", match: /bundesliga|german\s*bundes/i },
    { name: "Ligue 1", match: /ligue\s*1|french\s*ligue/i },
    { name: "MLS", match: /\bmls\b|major\s*league\s*soccer/i },
    { name: "Saudi Pro League", match: /saudi\s*pro|spl\b/i },
    { name: "FA Cup", match: /fa\s*cup/i },
    { name: "Copa America", match: /copa\s*am[eé]rica/i },
    { name: "AFCON", match: /afcon|africa\s*cup\s*of\s*nations/i },
    { name: "Nations League", match: /nations\s*league/i },
    { name: "Friendlies", match: /friendl/i },
  ];

  function leagueGroupOf(m: FootballStreamMatch): string {
    const hay = `${m.league || ""} ${m.title || ""}`;
    for (const g of LEAGUE_GROUPS) if (g.match.test(hay)) return g.name;
    return m.league || "Other";
  }

  const allLeagues = useMemo(() => {
    const set = new Set<string>();
    for (const s of streams) set.add(leagueGroupOf(s));
    // Preserve curated order, then any extras alphabetically.
    const curated = LEAGUE_GROUPS.map((g) => g.name).filter((n) => set.has(n));
    const extras = Array.from(set).filter((n) => !curated.includes(n)).sort();
    return [...curated, ...extras];
  }, [streams]);

  const groupedStreams = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = streams.filter((m) => {
      const group = leagueGroupOf(m);
      if (leagueFilter !== "all" && group !== leagueFilter) return false;
      if (!q) return true;
      return `${m.title} ${m.league || ""}`.toLowerCase().includes(q);
    });
    return filtered.reduce<Record<string, FootballStreamMatch[]>>((acc, match) => {
      const group = match.status === "live" ? "Live now" : "Starting soon";
      acc[group] = [...(acc[group] ?? []), match];
      return acc;
    }, {});
  }, [streams, search, leagueFilter]);

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
                    <>
                      <Countdown when={new Date(ev.date).getTime()} />
                      <NotifyButton id={`sched-${ev.id}`} title={`${teamName(home)} vs ${teamName(away)}`} when={new Date(ev.date).getTime()} />
                    </>
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
            <p className="text-sm">Live football · {streams.filter((match) => match.status === "live").length} live now</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value.trim().length > 2) trackSearch(e.target.value); }}
              placeholder="Search team, match or league…"
              className="w-full rounded-full border border-border bg-secondary/50 py-3 pl-11 pr-20 text-sm outline-none focus:border-primary"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Clear">
                <X className="h-4 w-4" />
              </button>
            )}
            <VoiceSearchButton onInterim={setSearch} onResult={(t) => { setSearch(t); if (t.trim().length > 2) trackSearch(t); }} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9" />
            </div>
          </div>
          {allLeagues.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                onClick={() => setLeagueFilter("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${leagueFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}
              >
                All leagues
              </button>
              {allLeagues.map((lg) => (
                <button
                  key={lg}
                  onClick={() => setLeagueFilter(lg)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${leagueFilter === lg ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}
                >
                  {lg}
                </button>
              ))}
            </div>
          )}
          {Object.entries(groupedStreams).map(([league, matches]) => (
            <section key={league} className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{league} · {matches.length}</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => {
                  const kickoff = formatKickoff(match.date);
                  const notStarted = match.status === "upcoming";
                  return (
                    <div key={match.id} className="glass-card relative overflow-hidden rounded-[22px] text-left transition-all duration-300 hover:border-primary/50">
                      <Link to="/football-stream/$matchId" params={{ matchId: match.id }} className="block active:scale-[0.98]">
                        <div className="relative flex h-36 items-center justify-center gap-6 bg-secondary">
                          {match.poster ? <img src={match.poster} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <>
                            {match.teams?.home?.badge && <img src={match.teams.home.badge} alt={match.teams.home.name || "Home"} className="h-16 w-16 object-contain" loading="lazy" />}
                            <span className="text-sm font-bold text-muted-foreground">VS</span>
                            {match.teams?.away?.badge && <img src={match.teams.away.badge} alt={match.teams.away.name || "Away"} className="h-16 w-16 object-contain" loading="lazy" />}
                          </>}
                          <span className="absolute left-3 top-3 rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">{notStarted ? "UPCOMING" : "LIVE"}</span>
                        </div>
                        <div className="space-y-3 p-4 pb-2">
                          <p className="text-base font-bold leading-tight break-words">{match.title}</p>
                          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                            <span>{match.league || kickoff.time || "Live"}</span>
                            <span>{match.viewers ? `${match.viewers.toLocaleString()} views` : "Stream"}</span>
                          </div>
                          {notStarted && match.date && <Countdown when={match.date} />}
                          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                            <Play className="h-4 w-4" fill="currentColor" /> {notStarted ? "Open stream" : "Watch live"}
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
          {streams.length === 0 && <div className="space-y-3 py-12 text-center">
            <p className="text-muted-foreground">{streamError ? "Live football is temporarily unavailable." : "No live or starting-soon football streams are available right now."}</p>
            <Button variant="outline" onClick={() => setMode("schedule")}><Calendar /> View schedule</Button>
          </div>}
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