import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  Clock,
  Database,
  Download,
  Globe2,
  Lock,
  Megaphone,
  Plus,
  RefreshCcw,
  Search,
  ShieldCheck,
  Send,
  Star,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import {
  ADMIN_V2_PASSWORD,
  type Broadcast,
  type ChangelogEntry,
  type FeatureFlag,
  type FeaturedEvent,
  type LocalSession,
  addFlag,
  clearSessions,
  computeAnalytics,
  createBroadcast,
  createChangelog,
  deleteBroadcast,
  deleteChangelog,
  deleteEvent,
  deleteFlag,
  exportAll,
  getBroadcasts,
  getChangelog,
  getEvents,
  getFlags,
  getSessions,
  getTerms,
  getAdblockInstalls,
  importAll,
  recordLocalVisit,
  resetAll,
  setFlagEnabled,
  toggleBroadcast,
  toggleChangelog,
  upsertEvent,
} from "@/lib/admin-v2-store";

type Tab =
  | "overview"
  | "watched"
  | "searches"
  | "visitors"
  | "accounts"
  | "daily"
  | "config"
  | "broadcasts"
  | "changelog"
  | "terms"
  | "adblock"
  | "data";

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function AdminPanelV2({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [tick, setTick] = useState(0);

  // Record a local visit when the panel opens so the demo isn't empty
  useEffect(() => {
    if (authed) recordLocalVisit({ name: "Admin (this device)", current_path: "/admin-v2" });
  }, [authed]);

  // Auto-refresh
  useEffect(() => {
    if (!authed) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(t);
  }, [authed]);

  const analytics = useMemo(() => (authed ? computeAnalytics() : null), [authed, tick]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_V2_PASSWORD) {
      setAuthed(true);
      setError(null);
    } else {
      setError("Invalid admin password");
    }
  }

  if (!authed) {
    return (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0a0a0a] p-4"
        onClick={onClose}
      >
        <form
          onSubmit={submit}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl border border-border bg-popover p-6 text-popover-foreground shadow-2xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">DEV OPTIONS v2</h3>
            <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-500">
              Offline
            </span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Works without a backend. All data is stored on this device.
          </p>
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
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#0a0a0a] text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">DEV OPTIONS v2</h2>
          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-500">
            Offline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTick((n) => n + 1)} className="rounded-full bg-secondary p-2">
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-full bg-secondary p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border bg-popover/60 px-2 py-2">
        {(
          [
            ["overview", "Overview"],
            ["watched", "Top Watched"],
            ["searches", "Top Searches"],
            ["visitors", "Visitor Log"],
            ["accounts", "Accounts"],
            ["daily", "Daily"],
            ["config", "Flags & Events"],
            ["broadcasts", "Broadcasts"],
            ["changelog", "Fixes & Features"],
            ["terms", "Terms Accepted"],
            ["adblock", "AdBlock Installs"],
            ["data", "Data"],
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <LocalNotice />

        {tab === "overview" && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Users} label="Online now" value={analytics.onlineNow} accent />
            <Stat icon={Globe2} label="Total visits" value={analytics.totalVisits} />
            <Stat icon={Clock} label="Avg time" value={fmtDur(analytics.avgDuration)} />
            <Stat icon={TrendingUp} label="Top country" value={analytics.topCountries[0]?.country || "—"} />
            <Stat icon={Calendar} label="Today visits" value={analytics.dailyVisits[0]?.visits || 0} />
            <Stat icon={Calendar} label="Yesterday" value={analytics.dailyVisits[1]?.visits || 0} />
            <Stat icon={Users} label="Accounts" value={analytics.accounts.length} />
            <Stat icon={Activity} label="Today minutes" value={analytics.dailyVisits[0]?.minutes || 0} />
          </div>
        )}

        {tab === "watched" && (
          <div className="mt-4 space-y-5">
            {(["movie", "tv", "anime", "football"] as const).map((kind) => {
              const list = (analytics.topByKind as Record<string, Array<{ id: string; title: string; count: number }>>)[kind] || [];
              const label =
                kind === "movie" ? "Top movies" : kind === "tv" ? "Top series" : kind === "anime" ? "Top anime" : "Top football matches";
              return (
                <Section key={kind} title={label} icon={TrendingUp}>
                  {list.length === 0 ? (
                    <Empty />
                  ) : (
                    <ul className="divide-y divide-border">
                      {list.map((w, i) => (
                        <li key={i} className="flex items-center justify-between py-2 text-sm">
                          <span className="truncate font-medium">{w.title}</span>
                          <span className="font-bold text-primary">×{w.count}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              );
            })}
          </div>
        )}

        {tab === "searches" && (
          <div className="mt-4">
            <Section title="Top searches" icon={Search}>
              {analytics.topSearches.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-border">
                  {analytics.topSearches.map((s, i) => (
                    <li key={i} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate">{s.q}</span>
                      <span className="font-bold text-primary">×{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}

        {tab === "visitors" && <VisitorsPanel sessions={analytics.sessions} />}

        {tab === "accounts" && (
          <div className="mt-4 space-y-2">
            {analytics.accounts.map((a) => (
              <div
                key={a.name}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-sm"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-bold">{a.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.sessions} session{a.sessions !== 1 ? "s" : ""} · {fmtDur(a.totalSeconds)}
                </div>
              </div>
            ))}
            {analytics.accounts.length === 0 && <Empty />}
          </div>
        )}

        {tab === "daily" && (
          <div className="mt-4">
            <Section title="Visits per day (last 14 days)" icon={Calendar}>
              {analytics.dailyVisits.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-border">
                  {analytics.dailyVisits.map((d) => (
                    <li key={d.day} className="flex items-center justify-between py-2 text-sm">
                      <span>{d.day}</span>
                      <span className="text-muted-foreground">
                        {d.visits} visits · {d.minutes} min
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        )}

        {tab === "config" && <ConfigPanel onChange={() => setTick((n) => n + 1)} />}
        {tab === "broadcasts" && <BroadcastsPanel onChange={() => setTick((n) => n + 1)} />}
        {tab === "changelog" && <ChangelogPanel onChange={() => setTick((n) => n + 1)} />}
        {tab === "terms" && <TermsPanel />}
        {tab === "adblock" && <AdblockPanel />}
        {tab === "data" && <DataPanel onChange={() => setTick((n) => n + 1)} />}
      </div>
    </div>
  );
}

function LocalNotice() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
      <Database className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-bold">Offline mode — no backend</p>
        <p className="text-emerald-100/70">
          All settings, broadcasts, and analytics are stored locally on this device.
          Use the <strong>Data</strong> tab to export/import a JSON backup.
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        accent ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="py-4 text-center text-xs text-muted-foreground">No data yet.</p>;
}

function VisitorsPanel({ sessions }: { sessions: LocalSession[] }) {
  return (
    <div className="mt-4 space-y-2">
      {sessions.length === 0 && <Empty />}
      {sessions.map((s) => (
        <div key={s.id} className="rounded-xl border border-border bg-secondary/40 p-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold">{s.name}</span>
            <span className="text-muted-foreground">{fmtDur(s.duration_seconds)}</span>
          </div>
          <p className="mt-1 text-muted-foreground">
            {s.country || "?"} · {s.device || "Unknown device"}
          </p>
          <p className="text-muted-foreground">
            Last seen: {new Date(s.last_seen_at).toLocaleString()}
          </p>
          {s.current_path && <p className="text-primary">→ {s.current_path}</p>}
        </div>
      ))}
    </div>
  );
}

function ConfigPanel({ onChange }: { onChange: () => void }) {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => getFlags());
  const [events, setEvents] = useState<FeaturedEvent[]>(() => getEvents());
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagDesc, setNewFlagDesc] = useState("");
  const [editing, setEditing] = useState<FeaturedEvent | null>(null);

  function refresh() {
    setFlags(getFlags());
    setEvents(getEvents());
    onChange();
  }

  return (
    <div className="mt-4 space-y-5">
      <Section title="Feature flags" icon={Star}>
        <div className="mb-3 flex flex-wrap gap-2">
          <input
            value={newFlagKey}
            onChange={(e) => setNewFlagKey(e.target.value)}
            placeholder="flag_key"
            className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
          <input
            value={newFlagDesc}
            onChange={(e) => setNewFlagDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-[2] min-w-[160px] rounded-lg border border-border bg-background px-3 py-2 text-xs"
          />
          <button
            onClick={() => {
              if (!newFlagKey.trim()) return;
              addFlag(newFlagKey.trim(), newFlagDesc.trim() || undefined);
              setNewFlagKey("");
              setNewFlagDesc("");
              refresh();
            }}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        {flags.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border">
            {flags.map((f) => (
              <li key={f.key} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="truncate font-mono text-xs font-bold">{f.key}</p>
                  {f.description && (
                    <p className="truncate text-xs text-muted-foreground">{f.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFlagEnabled(f.key, !f.enabled);
                      refresh();
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      f.enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f.enabled ? "ON" : "OFF"}
                  </button>
                  <button
                    onClick={() => {
                      deleteFlag(f.key);
                      refresh();
                    }}
                    className="rounded-full bg-destructive/15 p-1.5 text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Featured events" icon={Calendar}>
        <button
          onClick={() =>
            setEditing({
              id: "",
              title: "",
              link_url: "",
              kind: "general",
              priority: 0,
              active: true,
              updated_at: new Date().toISOString(),
            })
          }
          className="mb-3 flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> New event
        </button>
        {events.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{ev.title}</p>
                    {ev.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{ev.subtitle}</p>
                    )}
                    <p className="truncate text-[11px] text-primary">{ev.link_url}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setEditing(ev)}
                      className="rounded-full bg-secondary px-2 py-1 text-[11px]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        deleteEvent(ev.id);
                        refresh();
                      }}
                      className="rounded-full bg-destructive/15 p-1.5 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {editing && (
        <EventEditor
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EventEditor({
  initial,
  onCancel,
  onSaved,
}: {
  initial: FeaturedEvent;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  function field<K extends keyof FeaturedEvent>(k: K, v: FeaturedEvent[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-popover p-4 text-sm"
      >
        <h3 className="text-base font-bold">{form.id ? "Edit event" : "New event"}</h3>
        <Input label="Title" value={form.title} onChange={(v) => field("title", v)} />
        <Input label="Subtitle" value={form.subtitle || ""} onChange={(v) => field("subtitle", v)} />
        <Input label="Link URL" value={form.link_url} onChange={(v) => field("link_url", v)} />
        <Input label="Image URL" value={form.image_url || ""} onChange={(v) => field("image_url", v)} />
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Priority"
            value={String(form.priority ?? 0)}
            onChange={(v) => field("priority", Number(v) || 0)}
          />
          <Input label="Kind" value={form.kind || "general"} onChange={(v) => field("kind", v)} />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.active ?? true}
            onChange={(e) => field("active", e.target.checked)}
          />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded-full border border-border px-3 py-1.5 text-xs">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!form.title || !form.link_url) return;
              upsertEvent({
                id: form.id || undefined,
                title: form.title,
                subtitle: form.subtitle ?? null,
                image_url: form.image_url ?? null,
                link_url: form.link_url,
                kind: form.kind || "general",
                priority: form.priority ?? 0,
                active: form.active ?? true,
                starts_at: form.starts_at ?? null,
                ends_at: form.ends_at ?? null,
                sport: form.sport ?? null,
                home_team: form.home_team ?? null,
                away_team: form.away_team ?? null,
                home_flag: form.home_flag ?? null,
                away_flag: form.away_flag ?? null,
                timer_mode: form.timer_mode ?? "none",
                timer_target_at: form.timer_target_at ?? null,
              });
              onSaved();
            }}
            className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2"
      />
    </label>
  );
}

function BroadcastsPanel({ onChange }: { onChange: () => void }) {
  const [list, setList] = useState<Broadcast[]>(() => getBroadcasts());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  function refresh() {
    setList(getBroadcasts());
    onChange();
  }
  return (
    <div className="mt-4 space-y-4">
      <Section title="New broadcast" icon={Megaphone}>
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message body"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (!title.trim() || !body.trim()) return;
              createBroadcast({ title: title.trim(), body: body.trim() });
              setTitle("");
              setBody("");
              refresh();
            }}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Send className="h-3.5 w-3.5" /> Publish
          </button>
        </div>
      </Section>
      <Section title="All broadcasts" icon={Megaphone}>
        {list.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {list.map((b) => (
              <li key={b.id} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{b.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{b.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      onClick={() => {
                        toggleBroadcast(b.id, !b.active);
                        refresh();
                      }}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        b.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {b.active ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => {
                        deleteBroadcast(b.id);
                        refresh();
                      }}
                      className="rounded-full bg-destructive/15 p-1.5 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function ChangelogPanel({ onChange }: { onChange: () => void }) {
  const [list, setList] = useState<ChangelogEntry[]>(() => getChangelog());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<ChangelogEntry["kind"]>("feature");
  function refresh() {
    setList(getChangelog());
    onChange();
  }
  return (
    <div className="mt-4 space-y-4">
      <Section title="New entry" icon={Plus}>
        <div className="space-y-2">
          <div className="flex gap-2">
            {(["fix", "feature", "improvement"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${
                  kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => {
              if (!title.trim() || !body.trim()) return;
              createChangelog({ title: title.trim(), body: body.trim(), kind });
              setTitle("");
              setBody("");
              refresh();
            }}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            Publish
          </button>
        </div>
      </Section>
      <Section title="All entries" icon={Star}>
        {list.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id} className="rounded-xl border border-border bg-background/40 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="mr-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {c.kind}
                    </span>
                    <span className="font-bold">{c.title}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{c.body}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <button
                      onClick={() => {
                        toggleChangelog(c.id, !c.active);
                        refresh();
                      }}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        c.active ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.active ? "ON" : "OFF"}
                    </button>
                    <button
                      onClick={() => {
                        deleteChangelog(c.id);
                        refresh();
                      }}
                      className="rounded-full bg-destructive/15 p-1.5 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function TermsPanel() {
  const list = getTerms();
  return (
    <div className="mt-4">
      <Section title="Users who accepted Terms" icon={User}>
        {list.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((t, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <span className="font-bold">{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.accepted_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function AdblockPanel() {
  const list = getAdblockInstalls();
  return (
    <div className="mt-4">
      <Section title="Users who installed an AdBlocker" icon={ShieldCheck}>
        {list.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border">
            {list.map((t, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <div className="flex flex-col">
                  <span className="font-bold">{t.name}</span>
                  <span className="text-xs text-muted-foreground">{t.device}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(t.accepted_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function DataPanel({ onChange }: { onChange: () => void }) {
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [hydratedAt, setHydratedAt] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/admin-v2-global").then((m) => {
      setPublishedAt(m.getLastPublishedAt());
      setHydratedAt(m.getLastHydratedAt());
    });
  }, []);

  function doExport() {
    const json = exportAll();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-v2-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function doImport() {
    try {
      importAll(importText);
      setMsg("Imported successfully.");
      setImportText("");
      onChange();
    } catch (e) {
      setMsg(`Import failed: ${(e as Error).message}`);
    }
  }

  async function doPublish() {
    setPublishing(true);
    setMsg(null);
    try {
      const { publishGlobal, getLastPublishedAt } = await import("@/lib/admin-v2-global");
      const r = await publishGlobal(ADMIN_V2_PASSWORD);
      if (r.ok) {
        setMsg("Published live — every visitor will pull this snapshot on next load.");
        setPublishedAt(getLastPublishedAt());
      } else {
        setMsg(`Publish failed: ${r.error || "unknown"}`);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function doPull() {
    setPulling(true);
    setMsg(null);
    try {
      const { pullGlobal, getLastPublishedAt, getLastHydratedAt } = await import("@/lib/admin-v2-global");
      const r = await pullGlobal();
      if (r.ok) {
        setMsg("Pulled latest live snapshot onto this device.");
        setPublishedAt(getLastPublishedAt());
        setHydratedAt(getLastHydratedAt());
        onChange();
      } else {
        setMsg(`Pull failed: ${r.error || "unknown"}`);
      }
    } finally {
      setPulling(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <Section title="Global publish (one website, all visitors)" icon={Send}>
        <p className="mb-3 text-xs text-muted-foreground">
          Push every flag, event, broadcast, and changelog entry from this device
          to the live website. All visitors will pull this snapshot on next page load.
          No database — the snapshot lives as a single JSON file in storage.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={doPublish}
            disabled={publishing}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" /> {publishing ? "Publishing…" : "Publish to website"}
          </button>
          <button
            onClick={doPull}
            disabled={pulling}
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> {pulling ? "Pulling…" : "Pull latest"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>
            <p className="uppercase tracking-wide">Last published</p>
            <p className="text-foreground">{publishedAt ? new Date(publishedAt).toLocaleString() : "Never"}</p>
          </div>
          <div>
            <p className="uppercase tracking-wide">Last hydrated</p>
            <p className="text-foreground">{hydratedAt ? new Date(hydratedAt).toLocaleString() : "Never"}</p>
          </div>
        </div>
      </Section>

      <Section title="Export / Import (this device)" icon={Download}>
        <p className="mb-3 text-xs text-muted-foreground">
          Back up all admin data to a JSON file, or restore from a previous backup.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={doExport}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Download JSON
          </button>
          <button
            onClick={() => {
              clearSessions();
              onChange();
              setMsg("Local visitor sessions cleared.");
            }}
            className="rounded-lg border border-border px-3 py-2 text-xs"
          >
            Clear visitor log
          </button>
          <button
            onClick={() => {
              if (!confirm("Erase ALL admin v2 data on this device?")) return;
              resetAll();
              onChange();
              setMsg("All admin v2 data erased.");
            }}
            className="rounded-lg bg-destructive/20 px-3 py-2 text-xs font-bold text-destructive"
          >
            Reset everything
          </button>
        </div>
        <div className="mt-3 space-y-2">
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste a JSON backup here to import…"
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={doImport}
            disabled={!importText.trim()}
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-xs font-bold disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" /> Import
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-emerald-400">{msg}</p>}
      </Section>
      <Section title="Demo data" icon={Activity}>
        <button
          onClick={() => {
            for (let i = 0; i < 5; i++) {
              recordLocalVisit({
                name: ["Alice", "Bob", "Cara", "Dan", "Eve"][i],
                country: ["UG", "KE", "NG", "US", "GB"][i],
                current_path: ["/", "/movies", "/sports", "/anime", "/radio"][i],
              });
            }
            onChange();
            setMsg("Seeded 5 demo visitors.");
          }}
          className="rounded-lg bg-secondary px-3 py-2 text-xs"
        >
          Seed sample visitors
        </button>
      </Section>
    </div>
  );
}

