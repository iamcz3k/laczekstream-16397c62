import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Search, Loader2, X } from "lucide-react";
import { searchSports, type SearchResult } from "@/lib/sports-data";
import { BrandMark } from "@/components/BrandMark";
import { VoiceSearchButton } from "@/components/VoiceSearchButton";

const TRENDING = ["Real Madrid", "Manchester City", "Lakers", "Chiefs", "Messi", "Premier League", "Arsenal", "Mbappe"];
const RECENT_KEY = "laczek:sports-search:recent";

export const Route = createFileRoute("/sports-search")({
  component: SportsSearchPage,
  head: () => ({
    meta: [
      { title: "Sports Search · LACZEK STREAM" },
      { name: "description", content: "Search teams, players, leagues across every sport." },
    ],
  }),
});

function SportsSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const debounce = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(debounce.current);
    if (!query.trim()) { setResults([]); return; }
    debounce.current = window.setTimeout(async () => {
      setLoading(true);
      const r = await searchSports(query);
      setResults(r);
      setLoading(false);
    }, 250);
    return () => window.clearTimeout(debounce.current);
  }, [query]);

  function commit(term: string) {
    setQuery(term);
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 8);
    setRecent(updated);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)); } catch {}
  }

  function openResult(r: SearchResult) {
    commit(r.name);
    if (r.type === "team" && r.id) {
      navigate({ to: "/team/$teamId", params: { teamId: r.id }, search: { league: undefined } });
    } else if (r.url) {
      window.open(r.url, "_blank", "noopener,noreferrer");
    }
  }

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = { team: [], player: [], league: [], other: [] };
    for (const r of results) groups[r.type].push(r);
    return groups;
  }, [results]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3">
          <button onClick={() => navigate({ to: "/" })} className="inline-flex h-10 items-center gap-2 rounded-full glass px-4 text-sm font-medium hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <BrandMark compact />
        </header>

        <div className="glass-card sticky top-2 z-10 mb-4 flex items-center gap-2 rounded-full px-3 py-2">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams, players, leagues…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {query && <button onClick={() => setQuery("")} aria-label="Clear" className="shrink-0 rounded-full p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>}
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
          <VoiceSearchButton onInterim={setQuery} onResult={setQuery} className="h-8 w-8 shrink-0" />
        </div>

        {!query.trim() ? (
          <div className="space-y-5">
            {recent.length > 0 && (
              <section>
                <h2 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Recent</h2>
                <div className="flex flex-wrap gap-2">
                  {recent.map((t) => <Chip key={t} onClick={() => setQuery(t)}>{t}</Chip>)}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Trending</h2>
              <div className="flex flex-wrap gap-2">
                {TRENDING.map((t) => <Chip key={t} onClick={() => setQuery(t)}>🔥 {t}</Chip>)}
              </div>
            </section>
          </div>
        ) : results.length === 0 && !loading ? (
          <p className="rounded-2xl border border-border bg-secondary/40 p-8 text-center text-sm text-muted-foreground">No matches.</p>
        ) : (
          <div className="space-y-5">
            {(["team", "player", "league", "other"] as const).map((kind) => (
              grouped[kind].length > 0 && (
                <section key={kind}>
                  <h2 className="mb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{kind}s</h2>
                  <ul className="space-y-1.5">
                    {grouped[kind].map((r) => (
                      <li key={r.id}>
                        <button onClick={() => openResult(r)} className="glass-card flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition active:scale-[0.98] hover:border-primary/50">
                          {r.image ? <img src={r.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" loading="lazy" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-black uppercase">{r.name[0]}</span>}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{r.name}</p>
                            {r.description && <p className="truncate text-[11px] text-muted-foreground">{r.description}</p>}
                          </div>
                          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-black uppercase text-muted-foreground">{r.type}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-primary hover:text-primary-foreground">{children}</button>;
}
