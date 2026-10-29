import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, MapPin, ShieldAlert, Calendar, UserCog } from "lucide-react";
import { fetchFotmobMatchDetails, teamLogo, leagueLogo } from "@/lib/fotmob";

export const Route = createFileRoute("/match/$matchId")({
  component: MatchPage,
  head: () => ({ meta: [{ title: "Match · LACZEK STREAM" }] }),
});

type MatchTab = "overview" | "lineups" | "events" | "stats" | "table" | "h2h";

const ORANGE = "#FF6A00";

function ratingColor(r: number | null | undefined): string {
  if (!r && r !== 0) return "#3a3a3a";
  if (r >= 8) return ORANGE;
  if (r >= 7) return "#22c55e";
  if (r >= 6) return "#64748b";
  return "#ef4444";
}

function MatchPage() {
  const { matchId } = Route.useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<MatchTab>("overview");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFotmobMatchDetails(matchId).then((d) => {
      if (!cancelled) { setData(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [matchId]);

  // Auto-refresh while match is ongoing
  useEffect(() => {
    const ongoing = data?.header?.status?.started && !data?.header?.status?.finished;
    if (!ongoing) return;
    const t = window.setInterval(() => {
      fetchFotmobMatchDetails(matchId).then((d) => d && setData(d));
    }, 20_000);
    return () => window.clearInterval(t);
  }, [matchId, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: ORANGE }} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-3">
        <ShieldAlert className="h-10 w-10 text-white/40" />
        <p className="text-sm text-white/60">Match details unavailable.</p>
        <Link to="/" className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: ORANGE, color: "#000" }}>Back</Link>
      </div>
    );
  }

  const header = data.header || {};
  const general = data.general || {};
  const teams: any[] = header.teams || [];
  const home = teams[0] || {};
  const away = teams[1] || {};
  const status = header.status || {};
  const isLive = !!status.started && !status.finished;

  const content = data.content || {};
  const hasLineups = !!(content.lineup || content.lineup2);
  const hasEvents = Array.isArray(content?.matchFacts?.events?.events) && content.matchFacts.events.events.length > 0;
  const hasStats = Array.isArray(content?.stats?.stats) && content.stats.stats.length > 0;
  const hasTable = !!content?.table;
  const hasH2H = !!content?.h2h;

  const tabs: { key: MatchTab; label: string; visible: boolean }[] = ([
    { key: "overview" as MatchTab, label: "Overview", visible: true },
    { key: "lineups" as MatchTab, label: "Lineups", visible: hasLineups },
    { key: "events" as MatchTab, label: "Play-by-Play", visible: hasEvents },
    { key: "stats" as MatchTab, label: "Stats", visible: hasStats },
    { key: "table" as MatchTab, label: "Table", visible: hasTable },
    { key: "h2h" as MatchTab, label: "H2H", visible: hasH2H },
  ]).filter((t) => t.visible);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-[#0a0a0a]/95 px-3 py-3 backdrop-blur-md">
        <Link to="/" className="grid h-9 w-9 place-items-center rounded-full bg-white/5 hover:bg-white/10">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leagueLogo(general.parentLeagueId || general.leagueId) ? (
            <img src={leagueLogo(general.parentLeagueId || general.leagueId)} alt="" className="h-5 w-5 shrink-0 object-contain" />
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[12px] font-black uppercase tracking-wider text-white/80">{general.parentLeagueName || general.leagueName || "Match"}</p>
            <p className="truncate text-[10px] text-white/40">{general.leagueRoundName || general.leagueRound || ""}</p>
          </div>
        </div>
      </div>

      {/* Score header */}
      <div className="px-3 pb-4 pt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamHeader t={home} side="home" />
          <ScoreBlock home={home} away={away} status={status} isLive={isLive} />
          <TeamHeader t={away} side="away" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] text-white/50">
          {general.matchTimeUTC && (
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(general.matchTimeUTC).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          )}
          {general.matchFacts?.infoBox?.Stadium?.name && (
            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {general.matchFacts.infoBox.Stadium.name}</span>
          )}
          {general.matchFacts?.infoBox?.Referee?.text && (
            <span className="inline-flex items-center gap-1"><UserCog className="h-3 w-3" /> {general.matchFacts.infoBox.Referee.text}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[57px] z-20 flex gap-1 overflow-x-auto border-b border-white/5 bg-[#0a0a0a]/95 px-3 py-2 backdrop-blur-md">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
              tab === t.key ? "text-black" : "bg-white/5 text-white/60 hover:bg-white/10"
            }`}
            style={tab === t.key ? { background: ORANGE } : undefined}
          >{t.label}</button>
        ))}
      </div>

      <div className="px-3 py-4">
        {tab === "overview" && <OverviewPane data={data} />}
        {tab === "lineups" && <LineupsPane data={data} />}
        {tab === "events" && <EventsPane data={data} />}
        {tab === "stats" && <StatsPane data={data} />}
        {tab === "table" && <TablePane data={data} home={home} away={away} />}
        {tab === "h2h" && <H2HPane data={data} />}
      </div>
    </div>
  );
}

function TeamHeader({ t, side }: { t: any; side: "home" | "away" }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${side === "home" ? "" : ""}`}>
      {teamLogo(t.id) ? (
        <img src={teamLogo(t.id)} alt={t.name} className="h-14 w-14 object-contain" />
      ) : <div className="h-14 w-14 rounded-full bg-white/5" />}
      <p className="line-clamp-2 text-center text-[13px] font-bold leading-tight">{t.name}</p>
    </div>
  );
}

function ScoreBlock({ home, away, status, isLive }: any) {
  const hs = home.score ?? "—";
  const as = away.score ?? "—";
  if (status.cancelled) {
    return <div className="text-center"><p className="text-[11px] font-black uppercase tracking-wider text-red-400">{status.reason?.long || "Postponed"}</p></div>;
  }
  if (!status.started) {
    return (
      <div className="text-center">
        <p className="text-2xl font-black tabular-nums">vs</p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/50">Kickoff</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-4xl font-black tabular-nums leading-none" style={isLive ? { color: ORANGE } : undefined}>
        {hs} <span className="text-white/30">-</span> {as}
      </p>
      {isLive && (
        <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider" style={{ color: ORANGE }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: ORANGE }} />
          {status.liveTime?.short || "Live"}
        </p>
      )}
      {status.finished && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-white/40">Full Time</p>}
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewPane({ data }: { data: any }) {
  const momentum = data?.content?.matchFacts?.momentum?.main?.data;
  const events: any[] = data?.content?.matchFacts?.events?.events || [];
  const topEvents = events.slice(-8).reverse();
  return (
    <div className="space-y-4">
      {Array.isArray(momentum) && momentum.length > 0 && (
        <Section title="Momentum">
          <Momentum data={momentum} />
        </Section>
      )}
      {topEvents.length > 0 && (
        <Section title="Key events">
          <ul className="divide-y divide-white/5">
            {topEvents.map((e, i) => <EventRow key={i} ev={e} />)}
          </ul>
        </Section>
      )}
      {(!momentum && !topEvents.length) && (
        <p className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center text-sm text-white/50">No live action yet. Check back at kickoff.</p>
      )}
    </div>
  );
}

function Momentum({ data }: { data: { minute: number; value: number }[] }) {
  const max = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <div className="flex h-20 items-center gap-px overflow-hidden rounded-xl bg-white/[0.03] px-2">
      {data.map((d, i) => {
        const h = (Math.abs(d.value) / max) * 36;
        const top = d.value >= 0;
        return (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-center">
            <div className="flex h-1/2 w-full items-end justify-center">
              {top && <span className="w-full rounded-t" style={{ height: `${h}px`, background: ORANGE }} />}
            </div>
            <div className="flex h-1/2 w-full items-start justify-center">
              {!top && <span className="w-full rounded-b bg-white/40" style={{ height: `${h}px` }} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Events ---------------- */
function EventsPane({ data }: { data: any }) {
  const events: any[] = data?.content?.matchFacts?.events?.events || [];
  if (!events.length) return <p className="py-12 text-center text-sm text-white/40">No play yet — ticker starts at kickoff.</p>;
  const ongoing = data?.header?.status?.started && !data?.header?.status?.finished;
  return (
    <Section title={ongoing ? "Live ticker" : "Play-by-Play"}>
      <ol className="relative space-y-2.5 border-l border-white/10 pl-4">
        {[...events].reverse().map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[21px] top-2 grid h-3 w-3 place-items-center rounded-full" style={{ background: e.isHome ? "#ffffff" : "#FF6A00" }} />
            <EventRow ev={e} />
          </li>
        ))}
      </ol>
    </Section>
  );
}

function EventRow({ ev }: { ev: any }) {
  const min = ev.time ?? ev.minute ?? "";
  const type = (ev.type || "").toLowerCase();
  const side = ev.isHome ? "home" : "away";
  const icon = type.includes("goal") ? "⚽"
    : type.includes("yellow") ? "🟨"
    : type.includes("red") ? "🟥"
    : type.includes("sub") ? "⇄"
    : type.includes("var") ? "📺"
    : type.includes("penalty") ? "🎯"
    : "•";
  return (
    <li className={`grid grid-cols-[40px_28px_1fr] items-center gap-2 py-2.5 ${side === "away" ? "text-right" : ""}`}>
      <span className="text-[12px] font-black tabular-nums text-white/60">{min}{ev.timeStr ? ev.timeStr : "'"}</span>
      <span className="text-base">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold">{ev.nameStr || ev.player?.name || ev.fullName || ev.type}</p>
        {(ev.assistStr || ev.subbedIn?.name) && (
          <p className="truncate text-[11px] text-white/50">{ev.assistStr ? `Assist: ${ev.assistStr}` : ev.subbedIn ? `On: ${ev.subbedIn.name}` : ""}</p>
        )}
      </div>
    </li>
  );
}

/* ---------------- Lineups (FotMob-style pitch) ---------------- */
function playerImg(id?: number | string) {
  return id ? `https://images.fotmob.com/image_resources/playerimages/${id}.png` : "";
}

function LineupsPane({ data }: { data: any }) {
  const lineup = data?.content?.lineup;
  if (!lineup) return <p className="py-12 text-center text-sm text-white/40">Lineups not announced.</p>;

  // New shape: lineup.homeTeam / lineup.awayTeam with starters[] and verticalLayout coords.
  // Legacy shape: lineup.lineup[0|1] with starters as nested rows.
  const home = lineup.homeTeam || lineup.lineup?.[0] || {};
  const away = lineup.awayTeam || lineup.lineup?.[1] || {};
  const homeStarters: any[] = normaliseStarters(home.starters || home.players || home.lineup);
  const awayStarters: any[] = normaliseStarters(away.starters || away.players || away.lineup);

  return (
    <div className="space-y-4">
      <Section title={`Formations · ${home.formation || "?"}  vs  ${away.formation || "?"}`}>
        <Pitch home={homeStarters} away={awayStarters} />
      </Section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SubsList title="Substitutes · Home" subs={home.subs || home.bench || []} coach={home.coach} />
        <SubsList title="Substitutes · Away" subs={away.subs || away.bench || []} coach={away.coach} />
      </div>
    </div>
  );
}

function normaliseStarters(arr: any): any[] {
  if (!Array.isArray(arr)) return [];
  if (arr.length && Array.isArray(arr[0])) return arr.flat();
  return arr;
}

function Pitch({ home, away }: { home: any[]; away: any[] }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl ring-1 ring-white/5"
      style={{
        background:
          "repeating-linear-gradient(180deg,#0e3a1c 0 10%,#0b3018 10% 20%)",
        aspectRatio: "68/105",
      }}
    >
      <svg viewBox="0 0 68 105" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <g fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="0.3">
          <rect x="1" y="1" width="66" height="103" />
          <line x1="1" y1="52.5" x2="67" y2="52.5" />
          <circle cx="34" cy="52.5" r="8" />
          <circle cx="34" cy="52.5" r="0.6" fill="rgba(255,255,255,0.35)" />
          <rect x="14" y="1" width="40" height="14" />
          <rect x="14" y="90" width="40" height="14" />
          <rect x="24" y="1" width="20" height="5" />
          <rect x="24" y="99" width="20" height="5" />
          <circle cx="34" cy="11" r="0.6" fill="rgba(255,255,255,0.35)" />
          <circle cx="34" cy="94" r="0.6" fill="rgba(255,255,255,0.35)" />
        </g>
      </svg>
      {home.map((p, i) => <PitchPlayer key={`h${p.id ?? i}`} p={p} side="home" index={i} total={home.length} />)}
      {away.map((p, i) => <PitchPlayer key={`a${p.id ?? i}`} p={p} side="away" index={i} total={away.length} />)}
    </div>
  );
}

function PitchPlayer({ p, side, index, total }: { p: any; side: "home" | "away"; index: number; total: number }) {
  // Prefer verticalLayout (FotMob current) where x/y are 0..1 across the team's HALF.
  let leftPct: number;
  let topPct: number;
  const vl = p.verticalLayout;
  if (vl && typeof vl.x === "number" && typeof vl.y === "number") {
    // x runs along the goal line (0..1). Mirror home so its goalkeeper sits at the top.
    leftPct = vl.x * 100;
    // y is distance from own goal (0 = on goal line, 1 = halfway line).
    const halfY = vl.y * 50; // each half is 50% of the pitch height
    topPct = side === "home" ? halfY : 100 - halfY;
  } else if (typeof p.positionRow === "number" && typeof p.positionCol === "number") {
    const rowFrac = (p.positionRow + 0.5) / 5;
    const colFrac = (p.positionCol + 0.5) / 5;
    leftPct = colFrac * 100;
    topPct = side === "home" ? (1 - rowFrac) * 50 : 50 + rowFrac * 50;
  } else {
    const cols = 5;
    const col = index % cols;
    const row = Math.floor(index / cols);
    leftPct = ((col + 0.5) / cols) * 100;
    topPct = side === "home" ? 8 + row * 9 : 92 - row * 9;
  }

  const r = Number(p.rating?.num ?? p.rating ?? 0);
  const showRating = r > 0;
  const name = p.name?.lastName || p.lastName || p.name?.fullName || p.name || "";
  const shirt = p.shirtNumber || p.shirt || p.number || "";
  const img = playerImg(p.id);
  const isCaptain = !!(p.isCaptain || p.captain);
  // Sub-off info (FotMob exposes timeSubbedOff on a player when subbed off mid-game)
  const subOff = p.timeSubbedOff || p.subbedOut?.time || p.events?.find?.((e: any) => /subbedOff|substitutionOff/i.test(e.type))?.time;

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
      <div className="relative flex w-[60px] flex-col items-center">
        {subOff && (
          <span className="absolute -top-1 -left-3 z-10 rounded-md bg-black/70 px-1 text-[8px] font-black text-white">
            {subOff}'
          </span>
        )}
        {subOff && (
          <span className="absolute -top-1 left-3 z-10 grid h-3.5 w-3.5 place-items-center rounded-full bg-red-500 text-[8px] font-black text-white">←</span>
        )}
        {showRating && (
          <span
            className="absolute -top-1 right-0 z-10 rounded-md px-1 text-[9px] font-black tabular-nums text-white shadow"
            style={{ background: ratingColor(r) }}
          >{r.toFixed(1)}</span>
        )}
        <div
          className={`relative grid h-9 w-9 place-items-center overflow-hidden rounded-full ring-2 ${side === "home" ? "ring-white/80" : "ring-[#FF6A00]"}`}
          style={{ background: side === "home" ? "#1f2937" : "#3a1d05" }}
        >
          {img ? (
            <img
              src={img}
              alt=""
              className="h-9 w-9 object-cover"
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : null}
          <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-0.5 text-[8px] font-black leading-tight text-white">{shirt}</span>
        </div>
        <div className="mt-0.5 flex max-w-[68px] items-center gap-0.5">
          {isCaptain && <span className="grid h-3 w-3 place-items-center rounded-full bg-white/90 text-[7px] font-black text-black">C</span>}
          <span className="truncate rounded bg-black/70 px-1 text-[9px] font-bold text-white">{shirt} {name}</span>
        </div>
      </div>
    </div>
  );
}

function SubsList({ title, subs, coach }: { title: string; subs: any[]; coach?: any }) {
  return (
    <Section title={title}>
      {coach?.name && <p className="mb-2 text-[11px] text-white/50">Coach: <span className="font-bold text-white/80">{coach.name}</span></p>}
      <ul className="space-y-1">
        {subs.map((p, i) => {
          const r = Number(p.rating?.num ?? p.rating ?? 0);
          const img = playerImg(p.id);
          return (
            <li key={i} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-2 py-1.5 text-[12px]">
              <span className="flex items-center gap-2">
                {img ? <img src={img} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" loading="lazy" /> : <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-black">{p.shirtNumber || p.shirt || ""}</span>}
                <span className="font-bold">{p.name?.fullName || p.name || ""}</span>
              </span>
              {r > 0 && <span className="rounded px-1.5 text-[10px] font-black text-white" style={{ background: ratingColor(r) }}>{r.toFixed(1)}</span>}
            </li>
          );
        })}
        {subs.length === 0 && <li className="text-[11px] text-white/40">No subs listed.</li>}
      </ul>
    </Section>
  );
}



/* ---------------- Stats ---------------- */
function StatsPane({ data }: { data: any }) {
  const groups: any[] = data?.content?.stats?.stats || [];
  if (!groups.length) return <p className="py-12 text-center text-sm text-white/40">No stats available.</p>;
  return (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <Section key={gi} title={g.title || `Group ${gi + 1}`}>
          <div className="space-y-2.5">
            {(g.stats || []).map((s: any, i: number) => <StatBar key={i} s={s} />)}
          </div>
        </Section>
      ))}
    </div>
  );
}

function StatBar({ s }: { s: any }) {
  const stats = s.stats || [s.home, s.away];
  const a = Number(String(stats[0] ?? "0").replace(/[^0-9.]/g, "")) || 0;
  const b = Number(String(stats[1] ?? "0").replace(/[^0-9.]/g, "")) || 0;
  const total = a + b || 1;
  const ap = (a / total) * 100;
  const bp = (b / total) * 100;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px] font-black tabular-nums">
        <span>{stats[0] ?? "-"}</span>
        <span className="text-white/50">{s.title || s.key}</span>
        <span>{stats[1] ?? "-"}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/5">
        <div style={{ width: `${ap}%`, background: ORANGE }} />
        <div style={{ width: `${bp}%`, background: "rgba(255,255,255,0.4)" }} />
      </div>
    </div>
  );
}

/* ---------------- Table ---------------- */
function TablePane({ data, home, away }: { data: any; home: any; away: any }) {
  const tables = data?.content?.table?.tables || data?.content?.table?.all || [];
  const all = tables[0]?.table?.all || tables[0]?.all || [];
  if (!all.length) return <p className="py-12 text-center text-sm text-white/40">League table unavailable.</p>;
  return (
    <Section title="Standings">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="text-[10px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="py-1 text-left">#</th>
              <th className="py-1 text-left">Team</th>
              <th className="py-1 text-right">P</th>
              <th className="py-1 text-right">W</th>
              <th className="py-1 text-right">D</th>
              <th className="py-1 text-right">L</th>
              <th className="py-1 text-right">GD</th>
              <th className="py-1 text-right">Pts</th>
            </tr>
          </thead>
          <tbody>
            {all.map((row: any, i: number) => {
              const id = row.id ?? row.teamId;
              const hl = id === home.id || id === away.id;
              return (
                <tr key={i} className={`border-t border-white/5 ${hl ? "bg-white/[0.04]" : ""}`}>
                  <td className="py-1.5 text-left text-white/50">{row.idx ?? row.position ?? i + 1}</td>
                  <td className="py-1.5 text-left">
                    <span className="flex items-center gap-1.5">
                      {teamLogo(id) ? <img src={teamLogo(id)} alt="" className="h-4 w-4 object-contain" /> : null}
                      <span className={`truncate font-bold ${hl ? "" : "text-white/80"}`}>{row.name}</span>
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{row.played ?? row.matches}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.wins}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.draws}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.losses}</td>
                  <td className="py-1.5 text-right tabular-nums">{row.goalConDiff ?? row.gd}</td>
                  <td className="py-1.5 text-right font-black tabular-nums" style={hl ? { color: ORANGE } : undefined}>{row.pts ?? row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ---------------- H2H ---------------- */
function H2HPane({ data }: { data: any }) {
  const h2h = data?.content?.h2h || {};
  const matches: any[] = h2h.matches || [];
  const summary = h2h.summary;
  return (
    <div className="space-y-4">
      {summary && (
        <Section title="Head to head">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Home wins", summary[0]], ["Draws", summary[1]], ["Away wins", summary[2]]].map(([k, v]) => (
              <div key={k as string} className="rounded-xl bg-white/[0.04] py-3">
                <p className="text-2xl font-black tabular-nums" style={{ color: ORANGE }}>{v as any}</p>
                <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-white/40">{k}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section title="Recent meetings">
        <ul className="divide-y divide-white/5">
          {matches.slice(0, 10).map((m, i) => (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
              <span className="truncate text-right text-[12px] font-bold">{m.home?.name}</span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] font-black tabular-nums">{m.home?.score ?? "-"} - {m.away?.score ?? "-"}</span>
              <span className="truncate text-[12px] font-bold">{m.away?.name}</span>
            </li>
          ))}
          {matches.length === 0 && <li className="py-6 text-center text-[11px] text-white/40">No previous meetings.</li>}
        </ul>
      </Section>
    </div>
  );
}

/* ---------------- Shared ---------------- */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
      <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/40">{title}</h3>
      {children}
    </section>
  );
}
