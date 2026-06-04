import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, Clock } from "lucide-react";
import { loadActiveEvents, useFeatureFlag, type FeaturedEvent } from "@/lib/feature-flags";

function diffParts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, sec };
}

function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return <span className="font-black text-primary">LIVE NOW</span>;
  const { d, h, m, sec } = diffParts(ms);
  return (
    <span className="inline-flex items-center gap-1 font-black tabular-nums text-primary">
      <Clock className="h-3 w-3" />
      {d > 0 && `${d}d `}{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(sec).padStart(2, "0")}
    </span>
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
    // Re-poll every 30s so newly-added events surface for already-open visitors.
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
  const body = (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-gradient-to-r from-primary/20 via-background to-background">
      {e.image_url && (
        <img src={e.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 transition group-hover:opacity-40" />
      )}
      <div className="relative flex items-center gap-4 p-5 sm:p-6">
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><Calendar className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{e.kind} · Featured</p>
          <h3 className="mt-1 truncate text-base font-black sm:text-xl">{e.title}</h3>
          {e.subtitle && <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{e.subtitle}</p>}
          {e.starts_at && (
            <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
              Starts in <Countdown target={e.starts_at} />
            </p>
          )}
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
  return isInternal
    ? <Link to={e.link_url} className="block">{body}</Link>
    : <a href={e.link_url} target="_blank" rel="noopener noreferrer" className="block">{body}</a>;
}
