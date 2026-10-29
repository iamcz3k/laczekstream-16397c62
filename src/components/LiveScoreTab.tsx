import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Search, Star, X } from "lucide-react";
import { fetchFotmobMatches, teamLogo, type FmLeague, type FmMatch } from "@/lib/fotmob";

type Filter = "all" | "live" | "upcoming" | "finished" | "favourites";

const FAV_KEY = "laczek:fm:fav-leagues";

function loadFavs(): Set<number> {
  try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || "[]")); } catch { return new Set(); }
}
function saveFavs(set: Set<number>) { try { localStorage.setItem(FAV_KEY, JSON.stringify([...set])); } catch {} }

function dayShift(d: Date, n: number) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtDayChip(d: Date) {
  const today = new Date();
  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, dayShift(today, -1))) return "Yesterday";
  if (isSameDay(d, dayShift(today, 1))) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
function fmtKick(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/** FotMob-style LiveScore. Matte black + orange accents. */
export function LiveScoreTab() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [leagues, setLeagues] = useState<FmLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [favs, setFavs] = useState<Set<number>>(() => (typeof window === "undefined" ? new Set() : loadFavs()));
  const [openLeagues, setOpenLeagues] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFotmobMatches(date).then((data) => {
      if (cancelled) return;
      setLeagues(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [date]);

  // Auto-refresh live data every 30s for today.
  useEffect(() => {
    if (!isSameDay(date, new Date())) return;
    const t = window.setInterval(() => {
      fetchFotmobMatches(date).then((d) => setLeagues(d));
    }, 30_000);
    return () => window.clearInterval(t);
  }, [date]);

  const toggleFav = (id?: number) => {
    if (!id) return;
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavs(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: FmLeague[] = [];
    for (const lg of leagues) {
      const matches = lg.matches.filter((m) => {
        if (filter === "live" && !(m.status.started && !m.status.finished)) return false;
        if (filter === "upcoming" && m.status.started) return false;
        if (filter === "finished" && !m.status.finished) return false;
        if (filter === "favourites" && !(favs.has(lg.id) || favs.has(lg.primaryId || -1))) return false;
        if (q) {
          const hay = `${m.home.name} ${m.away.name} ${lg.name}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      if (matches.length) out.push({ ...lg, matches });
    }
    // Favourites first, then leagues by live count desc.
    return out.sort((a, b) => {
      const fa = favs.has(a.id) || favs.has(a.primaryId || -1) ? 1 : 0;
      const fb = favs.has(b.id) || favs.has(b.primaryId || -1) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      const la = a.matches.filter((m) => m.status.started && !m.status.finished).length;
      const lb = b.matches.filter((m) => m.status.started && !m.status.finished).length;
      return lb - la;
    });
  }, [leagues, filter, query, favs]);

  const totalLive = useMemo(
    () => leagues.reduce((sum, lg) => sum + lg.matches.filter((m) => m.status.started && !m.status.finished).length, 0),
    [leagues],
  );

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -3; i <= 3; i++) arr.push(dayShift(new Date(), i));
    return arr;
  }, []);

  return (
    <div className="space-y-4 rounded-3xl bg-[#0a0a0a] p-3 sm:p-5 text-white ring-1 ring-white/5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#FF6A00] text-sm font-black text-black shadow-[0_8px_24px_-8px_rgba(255,106,0,0.7)]">LS</span>
          <div>
            <h2 className="text-lg font-black leading-none tracking-tight">LiveScore</h2>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Powered by Fotmob feed</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6A00]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#FF6A00]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FF6A00]" />
            {totalLive} live
          </span>
        </div>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2">
        <button onClick={() => setDate((d) => dayShift(d, -1))} aria-label="Previous day" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {days.map((d) => {
            const active = isSameDay(d, date);
            return (
              <button
                key={d.toDateString()}
                onClick={() => setDate(d)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                  active ? "bg-[#FF6A00] text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >{fmtDayChip(d)}</button>
            );
          })}
        </div>
        <button onClick={() => setDate((d) => dayShift(d, 1))} aria-label="Next day" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-white/70 hover:bg-white/10">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search team or league"
          className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 pl-9 pr-9 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#FF6A00]/60"
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto">
        {(["all", "live", "upcoming", "finished", "favourites"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
              filter === f
                ? "bg-[#FF6A00] text-black"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
          >{f === "favourites" ? "★ Favs" : f}</button>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[#FF6A00]" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center text-sm text-white/50">
          No {filter !== "all" ? filter : ""} matches.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((lg) => {
            const open = openLeagues[lg.id] !== false;
            const isFav = favs.has(lg.id) || favs.has(lg.primaryId || -1);
            return (
              <section key={`${lg.id}-${lg.name}`} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025]">
                <header className="flex items-center gap-2 border-b border-white/[0.05] px-3 py-2.5">
                  {lg.logo ? (
                    <img src={lg.logo} alt="" className="h-5 w-5 shrink-0 object-contain" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  ) : <span className="h-5 w-5 shrink-0 rounded-sm bg-white/10" />}
                  <button
                    onClick={() => setOpenLeagues((s) => ({ ...s, [lg.id]: !open }))}
                    className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
                  >
                    <p className="truncate text-[12px] font-black uppercase tracking-wider text-white/90">{lg.name}</p>
                    {lg.ccode && <span className="text-[10px] font-bold text-white/40">{lg.ccode}</span>}
                  </button>
                  <button
                    onClick={() => toggleFav(lg.primaryId || lg.id)}
                    aria-label={isFav ? "Unfavourite" : "Favourite"}
                    className={`grid h-7 w-7 place-items-center rounded-full transition ${isFav ? "bg-[#FF6A00]/15 text-[#FF6A00]" : "text-white/30 hover:bg-white/5 hover:text-white/70"}`}
                  >
                    <Star className="h-3.5 w-3.5" fill={isFav ? "currentColor" : "none"} />
                  </button>
                </header>
                {open && (
                  <ul className="divide-y divide-white/[0.04]">
                    {lg.matches.map((m) => <MatchRow key={m.id} m={m} />)}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchRow({ m }: { m: FmMatch }) {
  const live = m.status.started && !m.status.finished && !m.status.cancelled;
  const finished = m.status.finished;
  const hs = m.home.score ?? "";
  const as = m.away.score ?? "";
  const homeWon = finished && Number(hs) > Number(as);
  const awayWon = finished && Number(as) > Number(hs);

  const center = live
    ? (m.status.liveTime?.short || m.status.scoreStr || "LIVE")
    : finished
      ? (m.status.scoreStr || "FT")
      : fmtKick(m.timeTS);

  return (
    <li>
      <Link
        to="/match/$matchId"
        params={{ matchId: String(m.id) }}
        className="group grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5 transition hover:bg-white/[0.03]"
      >
        {/* Home */}
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className={`min-w-0 truncate text-[13px] font-bold ${finished && !homeWon ? "text-white/50" : "text-white"}`}>{m.home.name}</span>
          {teamLogo(m.home.id) ? (
            <img src={teamLogo(m.home.id)} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
          ) : <span className="h-6 w-6 shrink-0 rounded-full bg-white/5" />}
        </div>

        {/* Score / status */}
        <div className="flex min-w-[64px] flex-col items-center justify-center">
          {live || finished ? (
            <div className={`tabular-nums text-[15px] font-black ${live ? "text-[#FF6A00]" : "text-white"}`}>
              {hs} <span className="text-white/30">-</span> {as}
            </div>
          ) : (
            <div className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white/80">{center}</div>
          )}
          {live && (
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#FF6A00]/15 px-1.5 py-px text-[9px] font-black uppercase tracking-wider text-[#FF6A00]">
              <span className="h-1 w-1 animate-pulse rounded-full bg-[#FF6A00]" />
              {m.status.liveTime?.short || "Live"}
            </span>
          )}
          {finished && <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-white/40">FT</span>}
          {m.status.cancelled && <span className="mt-0.5 text-[9px] font-black uppercase tracking-wider text-red-400">{m.status.reason?.short || "Postp."}</span>}
        </div>

        {/* Away */}
        <div className="flex min-w-0 items-center gap-2">
          {teamLogo(m.away.id) ? (
            <img src={teamLogo(m.away.id)} alt="" className="h-6 w-6 shrink-0 object-contain" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
          ) : <span className="h-6 w-6 shrink-0 rounded-full bg-white/5" />}
          <span className={`min-w-0 truncate text-[13px] font-bold ${finished && !awayWon ? "text-white/50" : "text-white"}`}>{m.away.name}</span>
        </div>
      </Link>
    </li>
  );
}
