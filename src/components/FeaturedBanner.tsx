import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import { loadActiveEvents, useFeatureFlag, type FeaturedEvent } from "@/lib/feature-flags";
import { flagUrl } from "@/lib/countries";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, sec };
}

function LiveTimer({ targetIso, mode }: { targetIso: string; mode: "countdown" | "countup" }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const target = new Date(targetIso).getTime();
  const ms = mode === "countdown" ? target - now : now - target;
  if (mode === "countdown" && ms <= 0) {
    return <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">Live now</span>;
  }
  const { d, h, m, sec } = fmt(Math.abs(ms));
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-black tabular-nums text-primary backdrop-blur">
      <Clock className="h-3 w-3" />
      {d > 0 && `${d}d `}{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
    </span>
  );
}

function Side({ team, flag, align }: { team?: string | null; flag?: string | null; align: "left" | "right" }) {
  if (!team && !flag) return null;
  const url = flagUrl(flag, 80);
  return (
    <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {url && <img src={url} alt="" className="h-6 w-8 shrink-0 rounded-sm object-cover" />}
      {team && <span className="truncate text-xs font-black sm:text-sm">{team}</span>}
    </div>
  );
}

export function FeaturedBanner() {
  const enabled = useFeatureFlag("featured_banner", true);
  const [events, setEvents] = useState<FeaturedEvent[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = () => loadActiveEvents().then((e) => { if (!cancelled) setEvents(e); }).catch(() => { if (!cancelled) setEvents([]); });
    load();
    const t = window.setInterval(load, 30_000);
    return () => { cancelled = true; window.clearInterval(t); };
  }, [enabled]);

  useEffect(() => {
    if (events.length < 2) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % events.length), 6000);
    return () => window.clearInterval(t);
  }, [events.length]);

  if (!enabled || !events.length) return null;
  const e = events[idx];
  const isInternal = e.link_url.startsWith("/");
  const hasTeams = !!(e.home_team || e.away_team || e.home_flag || e.away_flag);
  const timerTarget = e.timer_target_at || e.starts_at || null;
  const rawMode = e.timer_mode;
  const timerMode: "countdown" | "countup" | null =
    rawMode === "countdown" || rawMode === "countup"
      ? rawMode
      : timerTarget
        ? (new Date(timerTarget).getTime() > Date.now() ? "countdown" : "countup")
        : null;
  const showTimer = !!(timerTarget && timerMode);
  const timerMissingTarget = !timerTarget && (rawMode === "countdown" || rawMode === "countup");

  const body = (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-primary/20 via-background to-background">
      {e.image_url && (
        <img src={e.image_url} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-25 transition group-hover:opacity-35" />
      )}
      <div className="relative flex items-center gap-4 p-5 sm:p-6">
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Calendar className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{e.sport || e.kind} · Featured</p>
          </div>
          {hasTeams ? (
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <Side team={e.home_team} flag={e.home_flag} align="left" />
              <div className="flex shrink-0 flex-col items-center gap-1">
                <span className="text-[10px] font-black text-muted-foreground">VS</span>
                {showTimer
                  ? <LiveTimer targetIso={timerTarget!} mode={timerMode!} />
                  : timerMissingTarget && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-500">set timer date</span>}
              </div>
              <Side team={e.away_team} flag={e.away_flag} align="right" />
            </div>
          ) : (
            <>
              <h3 className="mt-1 truncate text-base font-black sm:text-xl">{e.title}</h3>
              {showTimer && <div className="mt-1"><LiveTimer targetIso={timerTarget!} mode={timerMode!} /></div>}
            </>
          )}
          {e.subtitle && <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{e.subtitle}</p>}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      {events.length > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {events.map((_, i) => (
            <span key={i} className={`h-1 w-4 rounded-full ${i === idx ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      )}
    </div>
  );
  const onPosterOpen = () => { import("@/lib/tracker").then((m) => m.trackEvent(`Opened event poster: ${e.title}`, "match", { via: "event-poster", url: e.link_url })); };
  return isInternal
    ? <Link to={e.link_url} className="block" onClick={onPosterOpen}>{body}</Link>
    : <a href={e.link_url} target="_blank" rel="noopener noreferrer" className="block" onClick={onPosterOpen}>{body}</a>;
}
