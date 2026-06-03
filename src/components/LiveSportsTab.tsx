import { useEffect, useState } from "react";
import { Calendar, ExternalLink, Loader2, MapPin, Radio } from "lucide-react";
import { FootballTab } from "@/components/FootballTab";
import { fetchSportScoreboard, findStreamUrl, SPORTS, type SportEvent, type SportKey } from "@/lib/sports-api";

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
  const [loading, setLoading] = useState(true);
  const meta = SPORTS.find((s) => s.key === sport)!;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSportScoreboard(sport).then((d) => {
      if (!cancelled) { setEvents(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [sport]);

  const live = events.filter((e) => e.status.state === "in");
  const upcoming = events.filter((e) => e.status.state === "pre");
  const finished = events.filter((e) => e.status.state === "post");

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (events.length === 0) {
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
      {live.length > 0 && <EventGroup title="🔴 Live now" tone="live" events={live} />}
      {upcoming.length > 0 && <EventGroup title="Upcoming" tone="upcoming" events={upcoming} />}
      {finished.length > 0 && <EventGroup title="Final" tone="final" events={finished} />}
    </div>
  );
}

function EventGroup({ title, tone, events }: { title: string; tone: "live" | "upcoming" | "final"; events: SportEvent[] }) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {events.map((e) => <EventCard key={e.id} event={e} tone={tone} />)}
      </div>
    </section>
  );
}

function EventCard({ event, tone }: { event: SportEvent; tone: "live" | "upcoming" | "final" }) {
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
        <a
          href={findStreamUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition active:scale-95"
        >
          {tone === "live" ? <><Radio className="h-3 w-3" /> Watch</> : <><ExternalLink className="h-3 w-3" /> Find stream</>}
        </a>
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