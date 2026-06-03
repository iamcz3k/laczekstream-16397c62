import { useEffect, useRef, useState } from "react";
import { Activity, Globe2, Lock, Search, Users, Clock, TrendingUp, X, RefreshCcw, ArrowLeft, Calendar, User, Flag, Megaphone, Plus, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { adminFetchAnalytics, adminListConfig, adminSetFeatureFlag, adminUpsertFeaturedEvent, adminDeleteFeaturedEvent, adminAddFeatureFlag, adminUploadEventPoster } from "@/lib/admin.functions";
import { refreshFeatureFlags } from "@/lib/feature-flags";

type Analytics = Awaited<ReturnType<typeof adminFetchAnalytics>>;
type Session = Analytics["sessions"][number];

type Tab = "overview" | "watched" | "searches" | "visitors" | "accounts" | "daily" | "config";

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function streamLinkFromPath(path?: string | null): { href: string; label: string } | null {
  if (!path) return null;
  if (path.startsWith("/watch/") || path.startsWith("/football-stream/") || path.startsWith("/anime/")) {
    return { href: path, label: path };
  }
  return null;
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const [openAccount, setOpenAccount] = useState<string | null>(null);
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

  async function submit(e: React.FormEvent) { e.preventDefault(); await load(password); }

  const pwRef = useRef(password); pwRef.current = password;
  useEffect(() => {
    if (!authed) return;
    const t = window.setInterval(() => load(pwRef.current), 5000);
    return () => window.clearInterval(t);
  }, [authed]);

  if (!authed) {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl" onClick={onClose}>
        <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl">
          <div className="mb-4 flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold">DEV OPTIONS</h3></div>
          <p className="mb-3 text-xs text-muted-foreground">Restricted area. Enter admin password.</p>
          <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{loading ? "Checking…" : "Unlock"}</button>
          </div>
        </form>
      </div>
    );
  }

  if (!data) return null;

  // Drill-down: session detail
  if (openSession) return <SessionDetail s={openSession} onBack={() => setOpenSession(null)} onClose={onClose} />;
  // Drill-down: account detail
  if (openAccount) {
    const userSessions = data.sessions.filter((s) => (s.name || "Anonymous") === openAccount);
    return <AccountDetail name={openAccount} sessions={userSessions} onOpenSession={setOpenSession} onBack={() => setOpenAccount(null)} onClose={onClose} />;
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
          <button onClick={() => load(password)} className="rounded-full bg-secondary p-2"><RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button>
          <button onClick={onClose} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border bg-popover/60 px-2 py-2">
        {([
          ["overview", "Overview"],
          ["watched", "Top Watched"],
          ["searches", "Top Searches"],
          ["visitors", "Visitor Log"],
          ["accounts", "Accounts"],
          ["daily", "Daily"],
          ["config", "Flags & Events"],
        ] as Array<[Tab, string]>).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Users} label="Online now" value={data.onlineNow} accent />
            <Stat icon={Globe2} label="Total visits" value={data.totalVisits} />
            <Stat icon={Clock} label="Avg time" value={fmtDur(data.avgDuration)} />
            <Stat icon={TrendingUp} label="Top country" value={data.topCountries[0]?.country || "—"} />
            <Stat icon={Calendar} label="Today visits" value={data.dailyVisits[0]?.visits || 0} />
            <Stat icon={Calendar} label="Yesterday" value={data.dailyVisits[1]?.visits || 0} />
            <Stat icon={Users} label="Accounts" value={data.accounts.length} />
            <Stat icon={Activity} label="Today minutes" value={data.dailyVisits[0]?.minutes || 0} />
          </div>
        )}

        {tab === "watched" && (
          <div className="space-y-5">
            {(["movie", "tv", "anime", "football"] as const).map((kind) => {
              const list = data.topByKind[kind] || [];
              const label = kind === "movie" ? "Top movies" : kind === "tv" ? "Top series" : kind === "anime" ? "Top anime" : "Top football matches";
              return (
                <Section key={kind} title={label} icon={TrendingUp}>
                  {list.length === 0 ? <Empty /> : (
                    <ul className="divide-y divide-border">
                      {list.map((w, i) => {
                        const watchers = data.sessions.filter((s) => (Array.isArray(s.watched) ? s.watched as Array<{kind?:string; id?:string}> : []).some((x) => x.kind === kind && x.id === w.id));
                        return (
                          <li key={i} className="py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium">{w.title}</span>
                              <span className="font-bold text-primary">×{w.count}</span>
                            </div>
                            {watchers.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">Watched by: {watchers.slice(0, 5).map((s) => s.name || "Anonymous").join(", ")}{watchers.length > 5 ? ` +${watchers.length - 5}` : ""}</p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Section>
              );
            })}
          </div>
        )}

        {tab === "searches" && (
          <Section title="Top searches" icon={Search}>
            {data.topSearches.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-border">
                {data.topSearches.map((s, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm"><span className="truncate">{s.q}</span><span className="font-bold text-primary">×{s.count}</span></li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {tab === "visitors" && (
          <div className="space-y-2">
            {data.sessions.map((s) => {
              const online = Date.now() - new Date(s.last_seen_at).getTime() < 60_000;
              const link = streamLinkFromPath(s.current_path);
              return (
                <button key={s.id} onClick={() => setOpenSession(s)} className="w-full rounded-xl border border-border bg-secondary/40 p-3 text-left text-xs transition hover:border-primary">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-muted-foreground/50"}`} />
                      <span className="font-bold text-foreground">{s.name || "Anonymous"}</span>
                      <span className="text-muted-foreground">· {s.country || "?"}{s.city ? `, ${s.city}` : ""}</span>
                    </div>
                    <span className="text-muted-foreground">{fmtDur(s.duration_seconds || 0)}</span>
                  </div>
                  <p className="text-muted-foreground">{s.device} · {s.page_views} views{link ? <> · watching <span className="text-primary">{link.label}</span></> : null}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Tap for full activity →</p>
                </button>
              );
            })}
          </div>
        )}

        {tab === "accounts" && (
          <div className="space-y-2">
            {data.accounts.map((a) => (
              <button key={a.name} onClick={() => setOpenAccount(a.name)} className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-left text-sm transition hover:border-primary">
                <div className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /><span className="font-bold">{a.name}</span></div>
                <div className="text-xs text-muted-foreground">{a.sessions} session{a.sessions !== 1 ? "s" : ""} · {fmtDur(a.totalSeconds)}</div>
              </button>
            ))}
            {data.accounts.length === 0 && <Empty />}
          </div>
        )}

        {tab === "daily" && (
          <Section title="Visits per day (last 14 days)" icon={Calendar}>
            {data.dailyVisits.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-border">
                {data.dailyVisits.map((d) => (
                  <li key={d.day} className="flex items-center justify-between py-2 text-sm">
                    <span>{d.day}</span>
                    <span className="text-muted-foreground">{d.visits} visits · {d.minutes} min</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {tab === "config" && (
          <ConfigPanel password={password} />
        )}
      </div>
    </div>
  );
}

function SessionDetail({ s, onBack, onClose }: { s: Session; onBack: () => void; onClose: () => void }) {
  const watched = Array.isArray(s.watched) ? (s.watched as Array<{ kind?: string; title?: string; id?: string; at?: string }>) : [];
  const log = Array.isArray((s as unknown as { path_log?: unknown[] }).path_log) ? ((s as unknown as { path_log: Array<{ path?: string; label?: string; at?: string }> }).path_log) : [];
  const link = streamLinkFromPath(s.current_path);
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-full bg-secondary p-2"><ArrowLeft className="h-4 w-4" /></button>
          <h2 className="text-base font-bold">{s.name || "Anonymous"}</h2>
        </div>
        <button onClick={onClose} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24">
        <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-xs">
          <p><span className="text-muted-foreground">Country:</span> {s.country || "?"}{s.city ? `, ${s.city}` : ""}</p>
          <p><span className="text-muted-foreground">Device:</span> {s.device}</p>
          <p><span className="text-muted-foreground">Started:</span> {new Date(s.started_at).toLocaleString()}</p>
          <p><span className="text-muted-foreground">Last seen:</span> {new Date(s.last_seen_at).toLocaleString()}</p>
          <p><span className="text-muted-foreground">Time spent:</span> {fmtDur(s.duration_seconds || 0)}</p>
          <p><span className="text-muted-foreground">Page views:</span> {s.page_views}</p>
          {link && <p><span className="text-muted-foreground">Currently on:</span> <a href={link.href} target="_blank" rel="noreferrer" className="text-primary underline">{link.label}</a></p>}
        </div>
        <Section title={`Activity (${log.length})`} icon={Activity}>
          {log.length === 0 ? <Empty /> : (
            <ul className="space-y-1 text-xs">
              {log.map((l, i) => (
                <li key={i} className="flex items-start justify-between gap-2 border-b border-border/50 py-1.5">
                  <span><span className="font-medium">{l.label || l.path}</span>{l.path && l.path !== l.label ? <span className="ml-1 text-muted-foreground">({l.path})</span> : null}</span>
                  <span className="text-muted-foreground">{l.at ? new Date(l.at).toLocaleTimeString() : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title={`Watched (${watched.length})`} icon={TrendingUp}>
          {watched.length === 0 ? <Empty /> : (
            <ul className="space-y-1 text-xs">
              {watched.map((w, i) => (
                <li key={i} className="flex items-start justify-between gap-2 border-b border-border/50 py-1.5">
                  <span>Played <span className="font-medium">{w.title || w.id}</span> <span className="text-muted-foreground">({w.kind})</span></span>
                  <span className="text-muted-foreground">{w.at ? new Date(w.at).toLocaleString() : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function AccountDetail({ name, sessions, onOpenSession, onBack, onClose }: { name: string; sessions: Session[]; onOpenSession: (s: Session) => void; onBack: () => void; onClose: () => void }) {
  const totalSec = sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const allWatched = sessions.flatMap((s) => Array.isArray(s.watched) ? (s.watched as Array<{kind?:string; title?:string; id?:string; at?:string}>) : []);
  const finishedMovies = allWatched.filter((w) => w.kind === "movie");
  const seenSeries = new Map<string, { title: string; episodes: Set<string> }>();
  for (const w of allWatched) {
    if (w.kind === "tv" && w.id) {
      const cur = seenSeries.get(w.id) || { title: w.title || w.id, episodes: new Set<string>() };
      const ep = (w.title || "").match(/S\d+E\d+/i)?.[0] || "?";
      cur.episodes.add(ep);
      seenSeries.set(w.id, cur);
    }
  }
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-full bg-secondary p-2"><ArrowLeft className="h-4 w-4" /></button>
          <h2 className="text-base font-bold">{name}</h2>
        </div>
        <button onClick={onClose} className="rounded-full bg-secondary p-2"><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Users} label="Sessions" value={sessions.length} accent />
          <Stat icon={Clock} label="Total time" value={fmtDur(totalSec)} />
          <Stat icon={TrendingUp} label="Movies played" value={finishedMovies.length} />
          <Stat icon={TrendingUp} label="Series" value={seenSeries.size} />
        </div>
        <Section title="Series progress" icon={TrendingUp}>
          {seenSeries.size === 0 ? <Empty /> : (
            <ul className="space-y-1 text-xs">
              {Array.from(seenSeries.values()).map((v, i) => (
                <li key={i} className="flex items-center justify-between border-b border-border/50 py-1.5">
                  <span className="font-medium">{v.title}</span>
                  <span className="text-muted-foreground">{v.episodes.size} episodes</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Sessions" icon={Activity}>
          {sessions.map((s) => (
            <button key={s.id} onClick={() => onOpenSession(s)} className="mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-left text-xs hover:border-primary">
              <span>{new Date(s.started_at).toLocaleString()} · {s.country || "?"}</span>
              <span className="text-muted-foreground">{fmtDur(s.duration_seconds || 0)}</span>
            </button>
          ))}
        </Section>
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

type CfgFlag = { key: string; enabled: boolean; description: string | null };
type CfgEvent = {
  id: string; title: string; subtitle: string | null; image_url: string | null;
  link_url: string; kind: string; starts_at: string | null; ends_at: string | null;
  priority: number; active: boolean;
};

function ConfigPanel({ password }: { password: string }) {
  const list = useServerFn(adminListConfig);
  const setFlag = useServerFn(adminSetFeatureFlag);
  const addFlag = useServerFn(adminAddFeatureFlag);
  const upsertEvent = useServerFn(adminUpsertFeaturedEvent);
  const deleteEvent = useServerFn(adminDeleteFeaturedEvent);
  const uploadPoster = useServerFn(adminUploadEventPoster);
  const [flags, setFlags] = useState<CfgFlag[]>([]);
  const [events, setEvents] = useState<CfgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagDesc, setNewFlagDesc] = useState("");
  const [editing, setEditing] = useState<Partial<CfgEvent> | null>(null);
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    setLoading(true);
    try { const r = await list({ data: { password } }); setFlags(r.flags as CfgFlag[]); setEvents(r.events as CfgEvent[]); }
    catch {} finally { setLoading(false); }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  async function toggleFlag(key: string, enabled: boolean) {
    setFlags((arr) => arr.map((f) => f.key === key ? { ...f, enabled } : f));
    await setFlag({ data: { password, key, enabled } });
    refreshFeatureFlags();
  }
  async function createFlag() {
    if (!newFlagKey.trim()) return;
    await addFlag({ data: { password, key: newFlagKey.trim(), description: newFlagDesc.trim() || undefined } });
    setNewFlagKey(""); setNewFlagDesc(""); refresh();
  }
  async function saveEvent() {
    if (!editing?.title || !editing?.link_url) return;
    await upsertEvent({ data: {
      password,
      id: editing.id,
      title: editing.title!,
      subtitle: editing.subtitle ?? undefined,
      image_url: editing.image_url ?? undefined,
      link_url: editing.link_url!,
      kind: editing.kind || "general",
      starts_at: editing.starts_at ?? null,
      ends_at: editing.ends_at ?? null,
      priority: editing.priority ?? 0,
      active: editing.active ?? true,
    } });
    setEditing(null); refresh();
  }
  async function removeEvent(id: string) {
    if (!confirm("Delete this featured event?")) return;
    await deleteEvent({ data: { password, id } }); refresh();
  }

  async function handlePosterFile(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      const { url } = await uploadPoster({ data: { password, filename: file.name, dataUrl } });
      setEditing((e) => ({ ...(e || {}), image_url: url }));
    } catch (err) {
      alert((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Section title="Feature flags" icon={Flag}>
        <ul className="divide-y divide-border">
          {flags.map((f) => (
            <li key={f.key} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">{f.key}</p>
                {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
              </div>
              <button
                onClick={() => toggleFlag(f.key, !f.enabled)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${f.enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
              >{f.enabled ? "ON" : "OFF"}</button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-border bg-secondary/40 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <input value={newFlagKey} onChange={(e) => setNewFlagKey(e.target.value)} placeholder="new_flag_key" className="rounded-lg bg-background px-3 py-2 text-xs" />
          <input value={newFlagDesc} onChange={(e) => setNewFlagDesc(e.target.value)} placeholder="Description" className="rounded-lg bg-background px-3 py-2 text-xs" />
          <button onClick={createFlag} className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Plus className="h-3 w-3" /> Add</button>
        </div>
      </Section>

      <Section title="Featured events" icon={Megaphone}>
        <button onClick={() => setEditing({ kind: "general", priority: 0, active: true })} className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Plus className="h-3 w-3" /> New event</button>
        {events.length === 0 ? <Empty /> : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                {e.image_url ? <img src={e.image_url} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="h-10 w-16 rounded bg-secondary" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.title} <span className="ml-1 text-[10px] text-muted-foreground">· {e.kind} · p{e.priority}</span></p>
                  <p className="truncate text-[11px] text-muted-foreground">{e.link_url}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${e.active ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>{e.active ? "live" : "off"}</span>
                <button onClick={() => setEditing(e)} className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px]">Edit</button>
                <button onClick={() => removeEvent(e.id)} className="shrink-0 rounded-full bg-secondary p-1.5 text-destructive"><Trash2 className="h-3 w-3" /></button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {editing && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/85 p-4" onClick={() => setEditing(null)}>
          <div onClick={(ev) => ev.stopPropagation()} className="w-full max-w-md space-y-3 rounded-3xl border border-border bg-popover p-5">
            <h3 className="text-base font-bold">{editing.id ? "Edit event" : "New event"}</h3>
            <input value={editing.title || ""} onChange={(ev) => setEditing({ ...editing, title: ev.target.value })} placeholder="Title *" className="w-full rounded-xl bg-background px-3 py-2 text-sm" />
            <input value={editing.subtitle || ""} onChange={(ev) => setEditing({ ...editing, subtitle: ev.target.value })} placeholder="Subtitle" className="w-full rounded-xl bg-background px-3 py-2 text-sm" />
            <div className="space-y-2">
              <input value={editing.image_url || ""} onChange={(ev) => setEditing({ ...editing, image_url: ev.target.value })} placeholder="Image URL (or upload below)" className="w-full rounded-xl bg-background px-3 py-2 text-sm" />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground">
                {uploading ? "Uploading…" : (editing.image_url ? "Replace poster image" : "Upload poster image")}
                <input type="file" accept="image/*" className="hidden" onChange={(ev) => { const f = ev.target.files?.[0]; if (f) handlePosterFile(f); }} />
              </label>
              {editing.image_url && <img src={editing.image_url} alt="" className="h-24 w-full rounded-lg object-cover" />}
            </div>
            <input value={editing.link_url || ""} onChange={(ev) => setEditing({ ...editing, link_url: ev.target.value })} placeholder="Link (/watch/movie/123 or https://…) *" className="w-full rounded-xl bg-background px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input value={editing.kind || ""} onChange={(ev) => setEditing({ ...editing, kind: ev.target.value })} placeholder="Kind (match/premiere/…)" className="rounded-xl bg-background px-3 py-2 text-sm" />
              <input type="number" value={editing.priority ?? 0} onChange={(ev) => setEditing({ ...editing, priority: Number(ev.target.value) })} placeholder="Priority" className="rounded-xl bg-background px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" value={editing.starts_at?.slice(0,16) || ""} onChange={(ev) => setEditing({ ...editing, starts_at: ev.target.value ? new Date(ev.target.value).toISOString() : null })} className="rounded-xl bg-background px-3 py-2 text-xs" />
              <input type="datetime-local" value={editing.ends_at?.slice(0,16) || ""} onChange={(ev) => setEditing({ ...editing, ends_at: ev.target.value ? new Date(ev.target.value).toISOString() : null })} className="rounded-xl bg-background px-3 py-2 text-xs" />
            </div>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={editing.active ?? true} onChange={(ev) => setEditing({ ...editing, active: ev.target.checked })} className="h-4 w-4 accent-primary" /> Active</label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-full bg-secondary px-4 py-2 text-xs">Cancel</button>
              <button onClick={saveEvent} className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty() { return <p className="py-3 text-center text-xs text-muted-foreground">No data yet</p>; }
