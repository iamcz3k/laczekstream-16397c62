import { useEffect, useState } from "react";
import { Activity, Loader2, Goal, Square, ArrowLeftRight, Flag, AlertTriangle, Clock3 } from "lucide-react";
import { fetchMatchInsights, type MatchInsights, type TimelineEvent } from "@/lib/sports-data";
import type { SportKey } from "@/lib/sports-api";

type Filter = "all" | "scoring" | "cards" | "subs";

/** Compact LiveScore + timeline panel that polls ESPN every 30s. Renders an
 *  "unavailable" empty state when we can't match the stream ID to an ESPN event.
 *  The host page passes the displayed match title so we can attempt a fuzzy
 *  name match against today's scoreboard if the numeric event ID misses. */
export function MatchTimeline({ eventId, sport, title }: { eventId: string; sport?: SportKey | null; title?: string }) {
  const [data, setData] = useState<MatchInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const fresh = await fetchMatchInsights(eventId, sport ?? null, title);
      if (!cancelled) {
        setData(fresh);
        setLoading(false);
      }
    };
    load();
    const t = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [eventId, sport]);

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading match data…</div>;
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-center text-xs text-muted-foreground">
        <Activity className="mx-auto mb-1 h-4 w-4" />
        LiveScore data unavailable for this match.
        {title && <p className="mt-1 opacity-70">{title}</p>}
      </div>
    );
  }
  const [home, away] = data.competitors;
  const live = data.status.state === "in";
  const final = data.status.state === "post";
  const events = data.events.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "scoring") return ev.scoringPlay || /goal/i.test(ev.type);
    if (filter === "cards") return /card|yellow|red/i.test(ev.type) || /card/i.test(ev.text);
    if (filter === "subs") return /sub/i.test(ev.type);
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Scoreboard */}
      <div className="rounded-2xl border border-border bg-card/60 p-3">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span className="truncate">{data.league || "Match"}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 ${
            live ? "animate-pulse bg-red-600 text-white" : final ? "bg-secondary" : "bg-primary/15 text-primary"
          }`}>{live ? `LIVE ${data.status.clock || ""}` : final ? "FINAL" : data.status.detail}</span>
        </div>
        <div className="flex items-center gap-3">
          <TeamScore c={home} />
          <span className="text-xs font-black text-muted-foreground">vs</span>
          <TeamScore c={away} reverse />
        </div>
      </div>

      {/* Filter chips */}
      {events.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["all", "scoring", "cards", "subs"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
              }`}>{f}</button>
          ))}
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 ? (
        <ul className="space-y-1.5">
          {events.map((ev) => <TimelineRow key={ev.id} ev={ev} />)}
        </ul>
      ) : (
        <p className="rounded-xl bg-secondary/40 p-3 text-center text-[11px] text-muted-foreground">No timeline events yet.</p>
      )}

      {/* Stats */}
      {data.stats.length > 0 && (
        <details className="rounded-xl border border-border bg-card/40">
          <summary className="cursor-pointer px-3 py-2 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Match stats</summary>
          <div className="space-y-1 px-3 pb-3">
            {data.stats.slice(0, 12).map((s) => (
              <div key={s.name} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[11px]">
                <span className="text-right font-bold tabular-nums">{s.home ?? "—"}</span>
                <span className="text-center text-[9px] uppercase tracking-wider text-muted-foreground">{s.name}</span>
                <span className="font-bold tabular-nums">{s.away ?? "—"}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TeamScore({ c, reverse }: { c: MatchInsights["competitors"][number]; reverse?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${reverse ? "flex-row-reverse text-right" : ""}`}>
      {c.logo ? <img src={c.logo} alt="" className="h-7 w-7 shrink-0 object-contain" loading="lazy" /> : <span className="h-7 w-7 shrink-0 rounded-full bg-secondary" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold">{c.name}</p>
      </div>
      <p className="shrink-0 text-xl font-black tabular-nums">{c.score || "0"}</p>
    </div>
  );
}

function TimelineRow({ ev }: { ev: TimelineEvent }) {
  const Icon =
    ev.scoringPlay || /goal/i.test(ev.type) ? Goal :
    /yellow|red|card/i.test(ev.type + ev.text) ? Square :
    /sub/i.test(ev.type) ? ArrowLeftRight :
    /penalty|var/i.test(ev.type + ev.text) ? AlertTriangle :
    /corner|kick|flag/i.test(ev.type + ev.text) ? Flag :
    Clock3;
  return (
    <li className={`flex items-start gap-2 rounded-lg p-2 text-[11px] ${ev.scoringPlay ? "bg-primary/10" : "bg-secondary/40"}`}>
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background">
        <Icon className="h-3 w-3 text-primary" />
      </span>
      {ev.clock && <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] font-black tabular-nums">{ev.clock}</span>}
      <p className="min-w-0 flex-1 leading-snug">{ev.text}</p>
      {ev.team?.logo && <img src={ev.team.logo} alt="" className="h-4 w-4 shrink-0 object-contain" loading="lazy" />}
    </li>
  );
}
