import { useEffect, useState } from "react";
import { Loader2, Calendar, Clock, MapPin } from "lucide-react";
import { footballMatches } from "@/lib/api";

function formatKickoff(iso: string) {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
  };
}

export function FootballTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    footballMatches()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <p className="text-sm">Today's fixtures · live scores · kickoff times in your local timezone</p>
      </div>
      <div className="grid gap-3">
        {events.map((ev) => {
          const comp = ev.competitions?.[0];
          const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
          const status = ev.status?.type;
          const state = status?.state; // pre | in | post
          const isLive = state === "in";
          const isFinal = state === "post";
          const kickoff = formatKickoff(ev.date);
          const venue = comp?.venue?.fullName;
          const league = ev.season?.slug?.replace(/-/g, " ");
          const clock = ev.status?.displayClock;
          const period = ev.status?.period;

          return (
            <div
              key={ev.id}
              className="glass-card rounded-xl p-4 hover:border-primary/50 transition"
            >
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground mb-3 gap-2">
                <span className="truncate">{league || ev.shortName}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {isLive && (
                    <span className="flex items-center gap-1 text-primary font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      LIVE {period ? `${period}H` : ""} {clock}
                    </span>
                  )}
                  {!isLive && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {kickoff.date} · {kickoff.time}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                <div className="flex items-center gap-3 justify-end text-right min-w-0">
                  <span className="font-medium truncate">{home?.team?.displayName}</span>
                  {home?.team?.logo && <img src={home.team.logo} alt="" className="w-9 h-9 object-contain shrink-0" />}
                </div>
                <div className="text-center min-w-[90px]">
                  {state === "pre" ? (
                    <div className="text-xs font-medium text-muted-foreground">
                      {kickoff.time}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold tabular-nums">
                      {home?.score ?? 0} <span className="text-muted-foreground">:</span> {away?.score ?? 0}
                    </div>
                  )}
                  <div className={`text-[10px] uppercase tracking-wider mt-1 ${isLive ? "text-primary" : isFinal ? "text-muted-foreground" : "text-muted-foreground"}`}>
                    {isFinal ? "Full Time" : status?.shortDetail?.includes(",") ? "Scheduled" : status?.shortDetail}
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  {away?.team?.logo && <img src={away.team.logo} alt="" className="w-9 h-9 object-contain shrink-0" />}
                  <span className="font-medium truncate">{away?.team?.displayName}</span>
                </div>
              </div>

              {venue && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-3 justify-center">
                  <MapPin className="w-3 h-3" /> {venue}
                </div>
              )}
            </div>
          );
        })}
        {events.length === 0 && <p className="text-center text-muted-foreground py-20">No matches today.</p>}
      </div>
    </div>
  );
}
