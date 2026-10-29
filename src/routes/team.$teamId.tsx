import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Calendar, MapPin, Trophy, Users, Loader2 } from "lucide-react";
import { fetchTeamProfile, type TeamProfile } from "@/lib/sports-data";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/team/$teamId")({
  component: TeamPage,
  validateSearch: (s: Record<string, unknown>) => ({ league: typeof s.league === "string" ? s.league : undefined }),
  head: ({ params }) => ({
    meta: [
      { title: `Team ${params.teamId} · LACZEK STREAM` },
      { name: "description", content: "Squad, fixtures, results and stats." },
    ],
  }),
});

function TeamPage() {
  const { teamId } = Route.useParams();
  const { league } = Route.useSearch();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTeamProfile(teamId, league).then(setTeam).catch(() => setTeam(null)).finally(() => setLoading(false));
  }, [teamId, league]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <BrandMark compact />
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : !team ? (
          <div className="rounded-2xl border border-border bg-secondary/40 p-10 text-center text-sm text-muted-foreground">
            Team data unavailable. ESPN's free API doesn't have this team — try a Premier League / NBA / NFL team.
          </div>
        ) : (
          <article className="space-y-6">
            {/* Hero */}
            <header className="glass-card flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:flex-row sm:text-left" style={team.color ? { borderColor: team.color } : undefined}>
              {team.logo && <img src={team.logo} alt={team.name} className="h-24 w-24 object-contain" />}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black">{team.name}</h1>
                <p className="text-xs text-muted-foreground">{team.league}{team.location ? ` · ${team.location}` : ""}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] sm:justify-start">
                  {team.record && <Pill icon={Trophy}>{team.record}</Pill>}
                  {team.standingSummary && <Pill icon={Trophy}>{team.standingSummary}</Pill>}
                  {team.venue && <Pill icon={MapPin}>{team.venue}</Pill>}
                  {team.coach && <Pill icon={Users}>Coach: {team.coach}</Pill>}
                </div>
              </div>
            </header>

            {/* Squad */}
            {team.squad.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Squad · {team.squad.length}</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {team.squad.map((p) => (
                    <div key={p.id} className="glass-card flex items-center gap-2 rounded-xl p-2">
                      {p.headshot ? <img src={p.headshot} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" /> : <span className="h-10 w-10 shrink-0 rounded-full bg-secondary" />}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.jersey ? `#${p.jersey} · ` : ""}{p.position || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Fixtures */}
            {team.nextEvents.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Upcoming fixtures</h2>
                <ul className="space-y-2">
                  {team.nextEvents.map((e) => (
                    <li key={e.id} className="glass-card flex items-center justify-between gap-3 rounded-xl p-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground">{e.competition}</p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(e.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Results */}
            {team.results.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Recent results</h2>
                <ul className="space-y-2">
                  {team.results.map((e) => (
                    <li key={e.id} className="glass-card flex items-center justify-between gap-3 rounded-xl p-3 text-xs">
                      <p className="min-w-0 truncate font-bold">{e.name}</p>
                      <span className="shrink-0 font-black tabular-nums">{e.score || e.result}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <p className="pt-4 text-center text-[10px] text-muted-foreground">
              <Link to="/sports-search" className="underline">Search more teams →</Link>
            </p>
          </article>
        )}
      </div>
    </main>
  );
}

function Pill({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-bold text-muted-foreground"><Icon className="h-3 w-3" />{children}</span>;
}
