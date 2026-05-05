import { useState } from "react";
import { Activity, Globe2, Lock, Search, Users, Clock, TrendingUp, X, RefreshCcw } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminFetchAnalytics } from "@/server/admin.functions";

type Analytics = Awaited<ReturnType<typeof adminFetchAnalytics>>;

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchFn = useServerFn(adminFetchAnalytics);

  async function load(pw: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn({ data: { password: pw } });
      setData(res);
      setAuthed(true);
    } catch (e) {
      setError((e as Error).message || "Failed to load");
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load(password);
  }

  if (!authed) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl" onClick={onClose}>
        <form
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">DEV OPTIONS</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Restricted area. Enter admin password.</p>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {loading ? "Checking…" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">DEV OPTIONS</h2>
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">Live</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(password)} className="rounded-full bg-secondary p-2" aria-label="Refresh">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={onClose} className="rounded-full bg-secondary p-2" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat icon={Users} label="Online now" value={data.onlineNow} accent />
              <Stat icon={Globe2} label="Total visits" value={data.totalVisits} />
              <Stat icon={Clock} label="Avg time" value={`${Math.floor(data.avgDuration / 60)}m ${data.avgDuration % 60}s`} />
              <Stat icon={TrendingUp} label="Top country" value={data.topCountries[0]?.country || "—"} />
            </div>

            <Section title="Top watched" icon={TrendingUp}>
              {data.topWatched.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border">
                  {data.topWatched.map((w, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate"><span className="text-muted-foreground mr-2">{w.kind}</span>{w.title}</span>
                      <span className="font-bold text-primary">×{w.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Top searches" icon={Search}>
              {data.topSearches.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border">
                  {data.topSearches.map((s, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate">{s.q}</span>
                      <span className="font-bold text-primary">×{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Top countries" icon={Globe2}>
              {data.topCountries.length === 0 ? <Empty /> : (
                <ul className="divide-y divide-border">
                  {data.topCountries.map((c, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <span>{c.country}</span>
                      <span className="font-bold text-primary">×{c.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title={`Visitor log (${data.sessions.length})`} icon={Users}>
              <div className="space-y-2">
                {data.sessions.map((s) => {
                  const online = Date.now() - new Date(s.last_seen_at).getTime() < 60_000;
                  const dur = s.duration_seconds || 0;
                  const watched = Array.isArray(s.watched) ? (s.watched as Array<{ title?: string; kind?: string }>) : [];
                  return (
                    <div key={s.id} className="rounded-xl border border-border bg-secondary/40 p-3 text-xs">
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                          <span className="font-bold text-foreground">{s.name || "Anonymous"}</span>
                          <span className="text-muted-foreground">· {s.country || "?"}{s.city ? `, ${s.city}` : ""}</span>
                        </div>
                        <span className="text-muted-foreground">{Math.floor(dur / 60)}m {dur % 60}s</span>
                      </div>
                      <div className="text-muted-foreground">
                        {s.device} · {new Date(s.started_at).toLocaleString()} · {s.page_views} views · at <span className="text-foreground">{s.current_path}</span>
                      </div>
                      {watched.length > 0 && (
                        <div className="mt-1 text-muted-foreground">
                          <span className="text-foreground">Watched:</span> {watched.slice(0, 3).map((w) => `${w.kind}/${w.title || "?"}`).join(", ")}
                          {watched.length > 3 ? ` +${watched.length - 3} more` : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold"><Icon className="h-4 w-4 text-primary" />{title}</h3>
      <div className="rounded-2xl border border-border bg-popover p-3">{children}</div>
    </div>
  );
}

function Empty() { return <p className="py-3 text-center text-xs text-muted-foreground">No data yet</p>; }