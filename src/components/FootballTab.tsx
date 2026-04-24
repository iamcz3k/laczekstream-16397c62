import { useEffect, useState } from "react";
import { Loader2, Calendar } from "lucide-react";
import { footballMatches } from "@/lib/api";

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
        <p className="text-sm">Today's fixtures & live scores</p>
      </div>
      <div className="grid gap-3">
        {events.map((ev) => {
          const comp = ev.competitions?.[0];
          const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
          const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
          const status = ev.status?.type?.shortDetail ?? "";
          const isLive = ev.status?.type?.state === "in";
          return (
            <div
              key={ev.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition flex items-center justify-between gap-4"
            >
              <div className="flex-1 grid grid-cols-3 items-center gap-4">
                <div className="flex items-center gap-3 justify-end text-right">
                  <span className="font-medium truncate">{home?.team?.displayName}</span>
                  {home?.team?.logo && <img src={home.team.logo} alt="" className="w-8 h-8 object-contain" />}
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold tabular-nums">
                    {home?.score ?? "-"} : {away?.score ?? "-"}
                  </div>
                  <div className={`text-[10px] uppercase tracking-wider mt-1 ${isLive ? "text-primary" : "text-muted-foreground"}`}>
                    {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1 animate-pulse" />}
                    {status}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {away?.team?.logo && <img src={away.team.logo} alt="" className="w-8 h-8 object-contain" />}
                  <span className="font-medium truncate">{away?.team?.displayName}</span>
                </div>
              </div>
            </div>
          );
        })}
        {events.length === 0 && <p className="text-center text-muted-foreground py-20">No matches today.</p>}
      </div>
      <p className="text-xs text-muted-foreground text-center pt-4">
        Live scores via ESPN public API. For live video streams, check the TV tab → Sports category.
      </p>
    </div>
  );
}
