import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Globe2,
  Lock,
  Search,
  Users,
  Clock,
  TrendingUp,
  X,
  RefreshCcw,
  ArrowLeft,
  Calendar,
  User,
  Flag,
  Megaphone,
  Plus,
  Trash2,
  MessageSquare,
  Star,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminFetchAnalytics,
  adminListConfig,
  adminSetFeatureFlag,
  adminUpsertFeaturedEvent,
  adminDeleteFeaturedEvent,
  adminAddFeatureFlag,
  adminUploadEventPoster,
  adminSetDefaultServer,
  adminSetDefaultSportServer,
  adminRemoveSportServerEntry,
  adminSetRecommendedMovieServers,
  adminSetRecommendedSportSources,
  adminRemoveRecommendedSportEntry,
} from "@/lib/admin.functions";
import {
  adminCreateBroadcast,
  adminListBroadcasts,
  adminDeleteBroadcast,
  adminToggleBroadcast,
  adminSignBroadcastImageUpload,
} from "@/lib/broadcasts.functions";
import {
  adminCreateChangelog,
  adminListChangelog,
  adminDeleteChangelog,
  adminToggleChangelog,
  adminSignChangelogImageUpload,
} from "@/lib/changelog-admin.functions";
import { CHANGELOG_SUGGESTIONS } from "@/lib/changelog-suggestions";
import { EMBED_PROVIDERS } from "@/lib/api";
import { refreshFeatureFlags } from "@/lib/feature-flags";
import { UploadVideoForm } from "@/components/UploadVideoForm";
import { FlagPicker } from "@/components/FlagPicker";

type Analytics = Awaited<ReturnType<typeof adminFetchAnalytics>>;
type Session = Analytics["sessions"][number];

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
  | "terms";

function fmtDur(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function streamLinkFromPath(path?: string | null): { href: string; label: string } | null {
  if (!path) return null;
  if (
    path.startsWith("/watch/") ||
    path.startsWith("/football-stream/") ||
    path.startsWith("/anime/")
  ) {
    return { href: path, label: path };
  }
  return null;
}

type VisitorContentFilter =
  | "all"
  | "movie"
  | "series"
  | "live-sports"
  | "anime"
  | "cctv"
  | "radio"
  | "podcasts"
  | "other";

function contentTypeForSession(s: Session): VisitorContentFilter {
  const path = String((s as { current_path?: string | null }).current_path || "").toLowerCase();
  const watched = Array.isArray((s as { watched?: unknown[] }).watched)
    ? (s as { watched: Array<{ kind?: string }> }).watched || []
    : [];
  const latestKind = watched[0]?.kind;
  if (path.startsWith("/watch/movie/") || latestKind === "movie") return "movie";
  if (path.startsWith("/watch/tv/") || latestKind === "tv") return "series";
  if (path.startsWith("/football-stream/") || latestKind === "football") return "live-sports";
  if (path.startsWith("/watch/anime/") || path.startsWith("/anime") || latestKind === "anime")
    return "anime";
  if (path.includes("cctv")) return "cctv";
  if (path.includes("radio")) return "radio";
  if (path.includes("podcast")) return "podcasts";
  return "other";
}

function contentFilterLabel(value: VisitorContentFilter) {
  return value === "all"
    ? "All content"
    : value === "movie"
      ? "Movies"
      : value === "series"
        ? "Series"
        : value === "live-sports"
          ? "Live sports"
          : value === "anime"
            ? "Anime"
            : value === "cctv"
              ? "CCTV"
              : value === "radio"
                ? "Radio"
                : value === "podcasts"
                  ? "Podcasts"
                  : "Other tabs";
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

  async function silentReload(pw: string) {
    if (!authed) return;
    try {
      const res = await fetchFn({ data: { password: pw } });
      setData(res);
    } catch {
      // silently fail on background refresh
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await load(password);
  }

  const pwRef = useRef(password);
  pwRef.current = password;
  useEffect(() => {
    if (!authed) return;
    const t = window.setInterval(() => silentReload(pwRef.current), 30_000);
    return () => window.clearInterval(t);
  }, [authed]);

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
            <h3 className="text-lg font-bold">DEV OPTIONS</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Restricted area. Enter admin password.
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
              disabled={loading}
              className="flex-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Checking…" : "Unlock"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (!data) return null;

  // Drill-down: session detail
  if (openSession)
    return <SessionDetail s={openSession} onBack={() => setOpenSession(null)} onClose={onClose} />;
  // Drill-down: account detail
  if (openAccount) {
    const userSessions = data.sessions.filter((s: any) => (s.name || "Anonymous") === openAccount);
    return (
      <AccountDetail
        name={openAccount}
        sessions={userSessions}
        onOpenSession={setOpenSession}
        onBack={() => setOpenAccount(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-[#0a0a0a] text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">DEV OPTIONS</h2>
          <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
            Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(password)} className="rounded-full bg-secondary p-2">
            <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
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
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${tab === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Users} label="Online now" value={data.onlineNow} accent />
            <Stat icon={Globe2} label="Total visits" value={data.totalVisits} />
            <Stat icon={Clock} label="Avg time" value={fmtDur(data.avgDuration)} />
            <Stat
              icon={TrendingUp}
              label="Top country"
              value={data.topCountries[0]?.country || "—"}
            />
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
              const label =
                kind === "movie"
                  ? "Top movies"
                  : kind === "tv"
                    ? "Top series"
                    : kind === "anime"
                      ? "Top anime"
                      : "Top football matches";
              return (
                <Section key={kind} title={label} icon={TrendingUp}>
                  {list.length === 0 ? (
                    <Empty />
                  ) : (
                    <ul className="divide-y divide-border">
                      {list.map((w, i) => {
                        const watchers = data.sessions.filter((s: any) =>
                          (Array.isArray(s.watched)
                            ? (s.watched as Array<{ kind?: string; id?: string }>)
                            : []
                          ).some((x) => x.kind === kind && x.id === w.id),
                        );
                        return (
                          <li key={i} className="py-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="truncate font-medium">{w.title}</span>
                              <span className="font-bold text-primary">×{w.count}</span>
                            </div>
                            {watchers.length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Watched by:{" "}
                                {watchers
                                  .slice(0, 5)
                                  .map((s: any) => s.name || "Anonymous")
                                  .join(", ")}
                                {watchers.length > 5 ? ` +${watchers.length - 5}` : ""}
                              </p>
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
            {data.topSearches.length === 0 ? (
              <Empty />
            ) : (
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
        )}

        {tab === "visitors" && (
          <VisitorsList
            sessions={data.sessions}
            password={password}
            onOpenSession={setOpenSession}
          />
        )}

        {tab === "accounts" && (
          <div className="space-y-2">
            {data.accounts.map((a) => (
              <button
                key={a.name}
                onClick={() => setOpenAccount(a.name)}
                className="flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-left text-sm transition hover:border-primary"
              >
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="font-bold">{a.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.sessions} session{a.sessions !== 1 ? "s" : ""} · {fmtDur(a.totalSeconds)}
                </div>
              </button>
            ))}
            {data.accounts.length === 0 && <Empty />}
          </div>
        )}

        {tab === "daily" && (
          <Section title="Visits per day (last 14 days)" icon={Calendar}>
            {data.dailyVisits.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-border">
                {data.dailyVisits.map((d) => (
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
        )}

        {tab === "config" && <ConfigPanel password={password} />}

        {tab === "broadcasts" && <BroadcastsPanel password={password} />}

        {tab === "changelog" && <ChangelogPanel password={password} />}

        {tab === "terms" && <TermsPanel sessions={data.sessions} />}
      </div>
    </div>
  );
}

function SessionDetail({
  s,
  onBack,
  onClose,
}: {
  s: Session;
  onBack: () => void;
  onClose: () => void;
}) {
  const link = streamLinkFromPath(s.current_path);
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-popover px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-full bg-secondary p-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-bold">{s.name || "Anonymous"}</h2>
        </div>
        <button onClick={onClose} className="rounded-full bg-secondary p-2">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24">
        <div className="rounded-2xl border border-border bg-secondary/40 p-3 text-xs">
          <p>
            <span className="text-muted-foreground">Country:</span> {s.country || "?"}
            {s.city ? `, ${s.city}` : ""}
          </p>
          <p>
            <span className="text-muted-foreground">Device:</span> {s.device}
          </p>
          <p>
            <span className="text-muted-foreground">Started:</span>{" "}
            {new Date(s.started_at).toLocaleString()}
          </p>
          <p>
            <span className="text-muted-foreground">Last seen:</span>{" "}
            {new Date(s.last_seen_at).toLocaleString()}
          </p>
          <p>
            <span className="text-muted-foreground">Time spent:</span>{" "}
            {fmtDur(s.duration_seconds || 0)}
          </p>
          <p>
            <span className="text-muted-foreground">Page views:</span> {s.page_views}
          </p>
          {link && (
            <p>
              <span className="text-muted-foreground">Currently on:</span>{" "}
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {link.label}
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


function AccountDetail({
  name,
  sessions,
  onOpenSession,
  onBack,
  onClose,
}: {
  name: string;
  sessions: Session[];
  onOpenSession: (s: Session) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const totalSec = sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);
  const allWatched = sessions.flatMap((s) =>
    Array.isArray(s.watched)
      ? (s.watched as Array<{ kind?: string; title?: string; id?: string; at?: string }>)
      : [],
  );
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
          <button onClick={onBack} className="rounded-full bg-secondary p-2">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-base font-bold">{name}</h2>
        </div>
        <button onClick={onClose} className="rounded-full bg-secondary p-2">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-24">
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Users} label="Sessions" value={sessions.length} accent />
          <Stat icon={Clock} label="Total time" value={fmtDur(totalSec)} />
          <Stat icon={TrendingUp} label="Movies played" value={finishedMovies.length} />
          <Stat icon={TrendingUp} label="Series" value={seenSeries.size} />
        </div>
        <Section title="Series progress" icon={TrendingUp}>
          {seenSeries.size === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-1 text-xs">
              {Array.from(seenSeries.values()).map((v, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-border/50 py-1.5"
                >
                  <span className="font-medium">{v.title}</span>
                  <span className="text-muted-foreground">{v.episodes.size} episodes</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Sessions" icon={Activity}>
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onOpenSession(s)}
              className="mb-2 flex w-full items-center justify-between rounded-xl border border-border bg-secondary/40 p-3 text-left text-xs hover:border-primary"
            >
              <span>
                {new Date(s.started_at).toLocaleString()} · {s.country || "?"}
              </span>
              <span className="text-muted-foreground">{fmtDur(s.duration_seconds || 0)}</span>
            </button>
          ))}
        </Section>
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
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3 ${accent ? "border-primary/40 bg-primary/10" : "border-border bg-secondary/40"}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
    <div className="mt-5">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h3>
      <div className="rounded-2xl border border-border bg-popover p-3">{children}</div>
    </div>
  );
}

type CfgFlag = { key: string; enabled: boolean; description: string | null };
type CfgEvent = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string;
  kind: string;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  active: boolean;
  sport: string | null;
  home_team: string | null;
  away_team: string | null;
  home_flag: string | null;
  away_flag: string | null;
  timer_mode: "none" | "countdown" | "countup" | null;
  timer_target_at: string | null;
};

function ConfigPanel({ password }: { password: string }) {
  const list = useServerFn(adminListConfig);
  const setFlag = useServerFn(adminSetFeatureFlag);
  const addFlag = useServerFn(adminAddFeatureFlag);
  const upsertEvent = useServerFn(adminUpsertFeaturedEvent);
  const deleteEvent = useServerFn(adminDeleteFeaturedEvent);
  const uploadPoster = useServerFn(adminUploadEventPoster);
  const setDefaultServer = useServerFn(adminSetDefaultServer);
  const setDefaultSportServer = useServerFn(adminSetDefaultSportServer);
  const removeSportServerEntry = useServerFn(adminRemoveSportServerEntry);
  const setRecMovie = useServerFn(adminSetRecommendedMovieServers);
  const setRecSport = useServerFn(adminSetRecommendedSportSources);
  const removeRecSport = useServerFn(adminRemoveRecommendedSportEntry);
  const [flags, setFlags] = useState<CfgFlag[]>([]);
  const [events, setEvents] = useState<CfgEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFlagKey, setNewFlagKey] = useState("");
  const [newFlagDesc, setNewFlagDesc] = useState("");
  const [editing, setEditing] = useState<Partial<CfgEvent> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [defaultServer, setDefaultServerState] = useState<string>("videasy");
  const [defaultServerEnabled, setDefaultServerEnabled] = useState(false);
  const [sportEntries, setSportEntries] = useState<Array<{ matchLink: string; serverIndex: number }>>([]);
  const [sportServerEnabled, setSportServerEnabled] = useState(false);
  const [newSportLink, setNewSportLink] = useState("");
  const [newSportIndex, setNewSportIndex] = useState<string>("1");
  const [recMovieEnabled, setRecMovieEnabled] = useState(false);
  const [recMovieProviders, setRecMovieProviders] = useState<Set<string>>(() => new Set());
  const [recSportEnabled, setRecSportEnabled] = useState(false);
  const [recSportEntries, setRecSportEntries] = useState<Array<{ matchLink: string; indices: number[] }>>([]);
  const [newRecSportLink, setNewRecSportLink] = useState("");
  const [newRecSportIndices, setNewRecSportIndices] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const r = await list({ data: { password } });
      setFlags(r.flags as CfgFlag[]);
      setEvents(r.events as CfgEvent[]);
      const serverFlag = (r.flags as CfgFlag[]).find((f) => f.key === "default_movie_server");
      if (serverFlag) {
        setDefaultServerEnabled(serverFlag.enabled);
        if (serverFlag.description) setDefaultServerState(serverFlag.description);
      }
      const sportFlag = (r.flags as CfgFlag[]).find((f) => f.key === "default_sport_server");
      if (sportFlag) {
        setSportServerEnabled(sportFlag.enabled);
        try {
          const parsed = sportFlag.description ? JSON.parse(sportFlag.description) : [];
          if (Array.isArray(parsed)) setSportEntries(parsed);
        } catch {
          setSportEntries([]);
        }
      } else {
        setSportServerEnabled(false);
        setSportEntries([]);
      }
      const recMovieFlag = (r.flags as CfgFlag[]).find((f) => f.key === "recommended_movie_servers");
      if (recMovieFlag) {
        setRecMovieEnabled(recMovieFlag.enabled);
        try {
          const arr = recMovieFlag.description ? JSON.parse(recMovieFlag.description) : [];
          setRecMovieProviders(new Set(Array.isArray(arr) ? arr : []));
        } catch { setRecMovieProviders(new Set()); }
      } else { setRecMovieEnabled(false); setRecMovieProviders(new Set()); }
      const recSportFlag = (r.flags as CfgFlag[]).find((f) => f.key === "recommended_sport_sources");
      if (recSportFlag) {
        setRecSportEnabled(recSportFlag.enabled);
        try {
          const arr = recSportFlag.description ? JSON.parse(recSportFlag.description) : [];
          setRecSportEntries(Array.isArray(arr) ? arr : []);
        } catch { setRecSportEntries([]); }
      } else { setRecSportEnabled(false); setRecSportEntries([]); }
    } catch {
      // Keep existing config visible if a background refresh fails.
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh(); /* eslint-disable-next-line */
  }, []);

  async function toggleFlag(key: string, enabled: boolean) {
    setFlags((arr) => arr.map((f) => (f.key === key ? { ...f, enabled } : f)));
    if (key === "default_movie_server") setDefaultServerEnabled(enabled);
    await setFlag({ data: { password, key, enabled } });
    refreshFeatureFlags();
  }
  async function createFlag() {
    if (!newFlagKey.trim()) return;
    await addFlag({
      data: { password, key: newFlagKey.trim(), description: newFlagDesc.trim() || undefined },
    });
    setNewFlagKey("");
    setNewFlagDesc("");
    refresh();
  }
  async function saveEvent() {
    if (!editing?.title || !editing?.link_url) return;
    await upsertEvent({
      data: {
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
        sport: editing.sport ?? null,
        home_team: editing.home_team ?? null,
        away_team: editing.away_team ?? null,
        home_flag: editing.home_flag ?? null,
        away_flag: editing.away_flag ?? null,
        timer_mode: editing.timer_mode ?? "none",
        timer_target_at: editing.timer_target_at ?? null,
      },
    });
    setEditing(null);
    refresh();
  }
  async function removeEvent(id: string) {
    if (!confirm("Delete this featured event?")) return;
    await deleteEvent({ data: { password, id } });
    refresh();
  }
  async function toggleEventActive(ev: typeof events[number]) {
    await upsertEvent({
      data: {
        password,
        id: ev.id,
        title: ev.title,
        subtitle: ev.subtitle ?? undefined,
        image_url: ev.image_url ?? undefined,
        link_url: ev.link_url,
        kind: ev.kind || "general",
        starts_at: ev.starts_at ?? null,
        ends_at: ev.ends_at ?? null,
        priority: ev.priority ?? 0,
        active: !ev.active,
        sport: ev.sport ?? null,
        home_team: ev.home_team ?? null,
        away_team: ev.away_team ?? null,
        home_flag: ev.home_flag ?? null,
        away_flag: ev.away_flag ?? null,
        timer_mode: (ev.timer_mode as "none" | "countdown" | "countup" | null) ?? "none",
        timer_target_at: ev.timer_target_at ?? null,
      },
    });
    refresh();
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

  async function saveDefaultServer(provider: string, enabled: boolean) {
    setDefaultServerState(provider);
    setDefaultServerEnabled(enabled);
    setFlags((arr) =>
      arr.map((f) =>
        f.key === "default_movie_server" ? { ...f, enabled, description: provider } : f,
      ),
    );
    await setDefaultServer({ data: { password, provider, enabled } });
    refreshFeatureFlags();
  }

  if (loading) return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Section title="Default movie server" icon={Globe2}>
        <p className="mb-3 text-xs text-muted-foreground">
          Set the default embed server that all users will see when opening a movie or TV show
          player. Users can still switch servers manually.
        </p>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Enable default override</span>
          <button
            onClick={() => saveDefaultServer(defaultServer, !defaultServerEnabled)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${defaultServerEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {defaultServerEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <select
          value={defaultServer}
          onChange={(ev) => saveDefaultServer(ev.target.value, defaultServerEnabled)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        >
          {EMBED_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.id})
            </option>
          ))}
        </select>
        {defaultServerEnabled && (
          <p className="mt-2 text-xs text-primary font-bold">
            Active: all public movie players will default to "
            {EMBED_PROVIDERS.find((p) => p.id === defaultServer)?.label || defaultServer}"
          </p>
        )}
      </Section>

      <Section title="Default sport server (per match)" icon={Globe2}>
        <p className="mb-3 text-xs text-muted-foreground">
          Force a specific source/server on a live sports match. Paste the match link
          (e.g. <code className="rounded bg-secondary px-1">/football-stream/abc123</code> or the full URL)
          and the source number (1, 2, 3…). Users will land on that source by default; they can still switch.
        </p>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Master enable</span>
          <button
            onClick={async () => {
              const next = !sportServerEnabled;
              setSportServerEnabled(next);
              // Re-upsert any one entry (or no-op) just to flip the flag; if no entries, push a dummy upsert via first entry if exists
              if (sportEntries.length > 0) {
                await setDefaultSportServer({ data: { password, matchLink: sportEntries[0].matchLink, serverIndex: sportEntries[0].serverIndex, enabled: next } });
              } else {
                await setFlag({ data: { password, key: "default_sport_server", enabled: next } });
              }
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${sportServerEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {sportServerEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={newSportLink}
            onChange={(e) => setNewSportLink(e.target.value)}
            placeholder="Match link or matchId (e.g. /football-stream/abc123)"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={newSportIndex}
            onChange={(e) => setNewSportIndex(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Source #"
          />
          <button
            onClick={async () => {
              const link = newSportLink.trim();
              const idx = Math.max(1, parseInt(newSportIndex || "1", 10) || 1);
              if (!link) return;
              await setDefaultSportServer({ data: { password, matchLink: link, serverIndex: idx, enabled: sportServerEnabled || true } });
              setSportServerEnabled(true);
              setNewSportLink("");
              setNewSportIndex("1");
              refresh();
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Save
          </button>
        </div>

        {sportEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches configured yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {sportEntries.map((entry) => (
              <li key={entry.matchLink} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{entry.matchLink}</p>
                  <p className="text-[11px] text-muted-foreground">Default source: #{entry.serverIndex}</p>
                </div>
                <button
                  onClick={async () => {
                    await removeSportServerEntry({ data: { password, matchLink: entry.matchLink } });
                    refresh();
                  }}
                  className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {sportServerEnabled && sportEntries.length > 0 && (
          <p className="mt-2 text-xs font-bold text-primary">
            Active: {sportEntries.length} match{sportEntries.length === 1 ? "" : "es"} have a default source override.
          </p>
        )}
      </Section>

      <Section title="🔥 Recommended movie servers" icon={Star}>
        <p className="mb-3 text-xs text-muted-foreground">
          Mark one or more movie/TV embed servers as recommended. Selected servers get a 🔥 badge in the player so users know which to try first. Users can still switch freely.
        </p>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Show 🔥 badges</span>
          <button
            onClick={async () => {
              const next = !recMovieEnabled;
              setRecMovieEnabled(next);
              await setRecMovie({ data: { password, providers: Array.from(recMovieProviders), enabled: next } });
              refreshFeatureFlags();
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${recMovieEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {recMovieEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EMBED_PROVIDERS.map((p) => {
            const on = recMovieProviders.has(p.id);
            return (
              <button
                key={p.id}
                onClick={async () => {
                  const next = new Set(recMovieProviders);
                  if (on) next.delete(p.id); else next.add(p.id);
                  setRecMovieProviders(next);
                  await setRecMovie({ data: { password, providers: Array.from(next), enabled: recMovieEnabled || next.size > 0 } });
                  if (next.size > 0 && !recMovieEnabled) setRecMovieEnabled(true);
                  refreshFeatureFlags();
                }}
                className={`relative rounded-xl border px-3 py-2 text-xs font-bold transition ${on ? "border-orange-500 bg-orange-500/15 text-foreground" : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/60"}`}
              >
                {on && <span className="absolute -top-1.5 -right-1.5 text-sm">🔥</span>}
                {p.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="🔥 Recommended sport sources (per match)" icon={Star}>
        <p className="mb-3 text-xs text-muted-foreground">
          Paste a match link (e.g. <code className="rounded bg-secondary px-1">/football-stream/abc123</code>) and the source numbers to flag as recommended (comma-separated, e.g. <code className="rounded bg-secondary px-1">1,3</code>).
        </p>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold">Show 🔥 badges</span>
          <button
            onClick={async () => {
              const next = !recSportEnabled;
              setRecSportEnabled(next);
              if (recSportEntries.length > 0) {
                const first = recSportEntries[0];
                await setRecSport({ data: { password, matchLink: first.matchLink, indices: first.indices, enabled: next } });
              } else {
                await setFlag({ data: { password, key: "recommended_sport_sources", enabled: next } });
              }
              refreshFeatureFlags();
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${recSportEnabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {recSportEnabled ? "ON" : "OFF"}
          </button>
        </div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={newRecSportLink}
            onChange={(e) => setNewRecSportLink(e.target.value)}
            placeholder="Match link (e.g. /football-stream/abc123)"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={newRecSportIndices}
            onChange={(e) => setNewRecSportIndices(e.target.value)}
            placeholder="Sources, e.g. 1,3"
            className="w-32 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={async () => {
              const link = newRecSportLink.trim();
              const indices = newRecSportIndices.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n) && n >= 1);
              if (!link || indices.length === 0) return;
              await setRecSport({ data: { password, matchLink: link, indices, enabled: true } });
              setRecSportEnabled(true);
              setNewRecSportLink("");
              setNewRecSportIndices("");
              refresh();
              refreshFeatureFlags();
            }}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            Save
          </button>
        </div>
        {recSportEntries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches configured yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {recSportEntries.map((entry) => (
              <li key={entry.matchLink} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{entry.matchLink}</p>
                  <p className="text-[11px] text-muted-foreground">🔥 Sources: {entry.indices.join(", ")}</p>
                </div>
                <button
                  onClick={async () => {
                    await removeRecSport({ data: { password, matchLink: entry.matchLink } });
                    refresh();
                    refreshFeatureFlags();
                  }}
                  className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>





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
              >
                {f.enabled ? "ON" : "OFF"}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-border bg-secondary/40 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={newFlagKey}
            onChange={(e) => setNewFlagKey(e.target.value)}
            placeholder="new_flag_key"
            className="rounded-lg bg-background px-3 py-2 text-xs"
          />
          <input
            value={newFlagDesc}
            onChange={(e) => setNewFlagDesc(e.target.value)}
            placeholder="Description"
            className="rounded-lg bg-background px-3 py-2 text-xs"
          />
          <button
            onClick={createFlag}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </Section>

      <Section title="Featured events" icon={Megaphone}>
        <button
          onClick={() => setEditing({ kind: "general", priority: 0, active: true })}
          className="mb-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> New event
        </button>
        {events.length === 0 ? (
          <Empty />
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                {e.image_url ? (
                  <img src={e.image_url} alt="" className="h-10 w-16 rounded object-cover" />
                ) : (
                  <div className="h-10 w-16 rounded bg-secondary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">
                    {e.title}{" "}
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      · {e.kind} · p{e.priority}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{e.link_url}</p>
                </div>
                <button
                  onClick={() => toggleEventActive(e)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition active:scale-95 ${e.active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-secondary/70"}`}
                  title={e.active ? "Click to hide from users" : "Click to show to users"}
                >
                  {e.active ? "LIVE · tap to hide" : "OFF · tap to show"}
                </button>
                <button
                  onClick={() => setEditing(e)}
                  className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[11px]"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeEvent(e.id)}
                  className="shrink-0 rounded-full bg-secondary p-1.5 text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Downloadable videos" icon={Megaphone}>
        <UploadVideoForm password={password} />
      </Section>

      {editing && (
        <div
          className="fixed inset-0 z-[95] flex items-start justify-center bg-black/85 p-4 overflow-y-auto"
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] space-y-3 overflow-y-auto rounded-3xl border border-border bg-popover p-5 my-auto"
          >
            <h3 className="text-base font-bold">{editing.id ? "Edit event" : "New event"}</h3>
            <input
              value={editing.title || ""}
              onChange={(ev) => setEditing({ ...editing, title: ev.target.value })}
              placeholder="Title *"
              className="w-full rounded-xl bg-background px-3 py-2 text-sm"
            />
            <input
              value={editing.subtitle || ""}
              onChange={(ev) => setEditing({ ...editing, subtitle: ev.target.value })}
              placeholder="Subtitle"
              className="w-full rounded-xl bg-background px-3 py-2 text-sm"
            />
            <div className="space-y-2">
              <input
                value={editing.image_url || ""}
                onChange={(ev) => setEditing({ ...editing, image_url: ev.target.value })}
                placeholder="Image URL (or upload below)"
                className="w-full rounded-xl bg-background px-3 py-2 text-sm"
              />
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground">
                {uploading
                  ? "Uploading…"
                  : editing.image_url
                    ? "Replace poster image"
                    : "Upload poster image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) handlePosterFile(f);
                  }}
                />
              </label>
              {editing.image_url && (
                <img
                  src={editing.image_url}
                  alt=""
                  className="h-24 w-full rounded-lg object-cover"
                />
              )}
            </div>
            <input
              value={editing.link_url || ""}
              onChange={(ev) => setEditing({ ...editing, link_url: ev.target.value })}
              placeholder="Link (/watch/movie/123 or https://…) *"
              className="w-full rounded-xl bg-background px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editing.kind || ""}
                onChange={(ev) => setEditing({ ...editing, kind: ev.target.value })}
                placeholder="Kind (match/premiere/…)"
                className="rounded-xl bg-background px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={editing.priority ?? 0}
                onChange={(ev) => setEditing({ ...editing, priority: Number(ev.target.value) })}
                placeholder="Priority"
                className="rounded-xl bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Match / teams (optional)
              </p>
              <select
                value={editing.sport || ""}
                onChange={(ev) => setEditing({ ...editing, sport: ev.target.value || null })}
                className="w-full rounded-lg bg-background px-3 py-2 text-xs"
              >
                <option value="">— Sport —</option>
                <option value="Soccer">⚽ Soccer</option>
                <option value="Basketball">🏀 Basketball</option>
                <option value="Football">🏈 Football (NFL)</option>
                <option value="Baseball">⚾ Baseball</option>
                <option value="Hockey">🏒 Hockey</option>
                <option value="Tennis">🎾 Tennis</option>
                <option value="MMA">🥊 MMA / UFC</option>
                <option value="F1">🏎️ Formula 1</option>
                <option value="Cricket">🏏 Cricket</option>
                <option value="Rugby">🏉 Rugby</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editing.home_team || ""}
                  onChange={(ev) => setEditing({ ...editing, home_team: ev.target.value })}
                  placeholder="Home team"
                  className="rounded-lg bg-background px-3 py-2 text-xs"
                />
                <input
                  value={editing.away_team || ""}
                  onChange={(ev) => setEditing({ ...editing, away_team: ev.target.value })}
                  placeholder="Away team"
                  className="rounded-lg bg-background px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FlagPicker
                  value={editing.home_flag}
                  onChange={(c) => setEditing({ ...editing, home_flag: c })}
                  placeholder="Home flag"
                />
                <FlagPicker
                  value={editing.away_flag}
                  onChange={(c) => setEditing({ ...editing, away_flag: c })}
                  placeholder="Away flag"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Tip: paste a badge URL (https://…) into the flag field to use a club logo instead of
                a country flag.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={
                    editing.home_flag && editing.home_flag.startsWith("http")
                      ? editing.home_flag
                      : ""
                  }
                  onChange={(ev) => setEditing({ ...editing, home_flag: ev.target.value || null })}
                  placeholder="…or home badge URL"
                  className="rounded-lg bg-background px-3 py-2 text-xs"
                />
                <input
                  value={
                    editing.away_flag && editing.away_flag.startsWith("http")
                      ? editing.away_flag
                      : ""
                  }
                  onChange={(ev) => setEditing({ ...editing, away_flag: ev.target.value || null })}
                  placeholder="…or away badge URL"
                  className="rounded-lg bg-background px-3 py-2 text-xs"
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Live timer (shown publicly)
              </p>
              <select
                value={editing.timer_mode || "none"}
                onChange={(ev) =>
                  setEditing({
                    ...editing,
                    timer_mode: ev.target.value as "none" | "countdown" | "countup",
                  })
                }
                className="w-full rounded-lg bg-background px-3 py-2 text-xs"
              >
                <option value="none">No timer</option>
                <option value="countdown">Countdown to event</option>
                <option value="countup">Count up from event</option>
              </select>
              <input
                type="datetime-local"
                value={editing.timer_target_at?.slice(0, 16) || ""}
                onChange={(ev) =>
                  setEditing({
                    ...editing,
                    timer_target_at: ev.target.value
                      ? new Date(ev.target.value).toISOString()
                      : null,
                  })
                }
                className="w-full rounded-lg bg-background px-3 py-2 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Falls back to Start time if no target is set.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="datetime-local"
                value={editing.starts_at?.slice(0, 16) || ""}
                onChange={(ev) =>
                  setEditing({
                    ...editing,
                    starts_at: ev.target.value ? new Date(ev.target.value).toISOString() : null,
                  })
                }
                className="rounded-xl bg-background px-3 py-2 text-xs"
                placeholder="Starts"
              />
              <input
                type="datetime-local"
                value={editing.ends_at?.slice(0, 16) || ""}
                onChange={(ev) =>
                  setEditing({
                    ...editing,
                    ends_at: ev.target.value ? new Date(ev.target.value).toISOString() : null,
                  })
                }
                className="rounded-xl bg-background px-3 py-2 text-xs"
                placeholder="Ends"
              />
            </div>
            <button
              type="button"
              onClick={() => setEditing({ ...editing, active: !(editing.active ?? true) })}
              className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-widest transition ${
                (editing.active ?? true)
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-secondary/40 text-muted-foreground"
              }`}
            >
              <span>
                {(editing.active ?? true)
                  ? "🟢 Live — visible to public"
                  : "⚪ Off — hidden from public"}
              </span>
              <span
                className={`relative inline-flex h-5 w-9 rounded-full transition ${(editing.active ?? true) ? "bg-primary" : "bg-border"}`}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${(editing.active ?? true) ? "left-[18px]" : "left-0.5"}`}
                />
              </span>
            </button>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full bg-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={saveEvent}
                className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-center text-xs text-muted-foreground">No data yet</p>;
}

// ===== Visitor list with optional inline "Send review" action =====
function VisitorsList({
  sessions,
  password,
  onOpenSession,
}: {
  sessions: Session[];
  password: string;
  onOpenSession: (s: Session) => void;
}) {
  const listBroadcasts = useServerFn(adminListBroadcasts);
  const createBroadcast = useServerFn(adminCreateBroadcast);
  const [reviewedNames, setReviewedNames] = useState<Set<string>>(new Set());
  const [reviewedSessions, setReviewedSessions] = useState<Set<string>>(new Set());
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [composeMsg, setComposeMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [countryFilter, setCountryFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [contentFilter, setContentFilter] = useState<VisitorContentFilter>("all");
  const [sortBy, setSortBy] = useState<"recent" | "longest" | "online">("recent");

  async function refresh() {
    try {
      const r = await listBroadcasts({ data: { password } });
      const names = new Set<string>();
      const sessionKeys = new Set<string>();
      for (const b of r.broadcasts as Array<{
        kind: string;
        target_name: string | null;
        target_session_key?: string | null;
      }>) {
        if (b.kind !== "review") continue;
        if (b.target_session_key) sessionKeys.add(b.target_session_key);
        else if (b.target_name) names.add(b.target_name.toLowerCase());
      }
      setReviewedNames(names);
      setReviewedSessions(sessionKeys);
    } catch {
      // Keep the visitor log usable if broadcast history is unavailable.
    }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendReview(s: Session) {
    if (!composeMsg.trim()) return;
    const name = ((s as { name?: string | null }).name || "").trim();
    const sessionKey = (s as { session_key?: string | null }).session_key || null;
    setSending(true);
    try {
      await createBroadcast({
        data: {
          password,
          kind: "review",
          message: composeMsg.trim(),
          target_name: name || null,
          target_session_key: sessionKey,
        },
      });
      setComposeFor(null);
      setComposeMsg("");
      refresh();
    } catch (e) {
      alert((e as Error).message || "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const countries = Array.from(
    new Set(
      sessions.map(
        (s) => ((s as { country?: string | null }).country || "Unknown").trim() || "Unknown",
      ),
    ),
  ).sort();
  const devices = Array.from(
    new Set(
      sessions.map(
        (s) => ((s as { device?: string | null }).device || "Unknown").trim() || "Unknown",
      ),
    ),
  ).sort();
  const contentTypes: VisitorContentFilter[] = [
    "all",
    "movie",
    "series",
    "live-sports",
    "anime",
    "cctv",
    "radio",
    "podcasts",
    "other",
  ];
  const ONLINE_WINDOW_MS = 60_000;
  const isOnline = (s: Session) => {
    const last = (s as { last_seen_at?: string }).last_seen_at;
    return last ? Date.now() - new Date(last).getTime() < ONLINE_WINDOW_MS : false;
  };
  const baseFiltered = sessions.filter((s) => {
    const country = ((s as { country?: string | null }).country || "Unknown").trim() || "Unknown";
    const device = ((s as { device?: string | null }).device || "Unknown").trim() || "Unknown";
    return (
      (countryFilter === "all" || country === countryFilter) &&
      (deviceFilter === "all" || device === deviceFilter) &&
      (contentFilter === "all" || contentTypeForSession(s) === contentFilter)
    );
  });
  const filteredSessions = [...baseFiltered].sort((a, b) => {
    if (sortBy === "longest") {
      const da = (a as { duration_seconds?: number }).duration_seconds || 0;
      const db = (b as { duration_seconds?: number }).duration_seconds || 0;
      return db - da;
    }
    if (sortBy === "online") {
      const oa = isOnline(a) ? 1 : 0;
      const ob = isOnline(b) ? 1 : 0;
      if (oa !== ob) return ob - oa;
      // Within online group, longest duration first; within offline, most recent first.
      if (oa === 1) {
        const da = (a as { duration_seconds?: number }).duration_seconds || 0;
        const db = (b as { duration_seconds?: number }).duration_seconds || 0;
        return db - da;
      }
    }
    const la = new Date((a as { last_seen_at?: string }).last_seen_at || 0).getTime();
    const lb = new Date((b as { last_seen_at?: string }).last_seen_at || 0).getTime();
    return lb - la;
  });
  const filtersActive =
    countryFilter !== "all" ||
    deviceFilter !== "all" ||
    contentFilter !== "all" ||
    sortBy !== "recent";

  function clearFilters() {
    setCountryFilter("all");
    setDeviceFilter("all");
    setContentFilter("all");
    setSortBy("recent");
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[230px_1fr]">
      <aside className="rounded-2xl border border-border bg-popover p-3 lg:sticky lg:top-3 lg:self-start">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Filters
          </p>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold"
            >
              All users
            </button>
          )}
        </div>
        <div className="space-y-3">
          <label className="block text-[11px] font-bold text-muted-foreground">
            Country
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-2 py-2 text-xs text-foreground"
            >
              <option value="all">All countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px] font-bold text-muted-foreground">
            Device
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-2 py-2 text-xs text-foreground"
            >
              <option value="all">All devices</option>
              {devices.map((device) => (
                <option key={device} value={device}>
                  {device}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="mb-2 text-[11px] font-bold text-muted-foreground">Watching / tab</p>
            <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
              {contentTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setContentFilter(type)}
                  className={`rounded-xl px-2 py-1.5 text-left text-[11px] font-bold ${
                    contentFilter === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {contentFilterLabel(type)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold text-muted-foreground">Sort</p>
            <div className="grid grid-cols-1 gap-1">
              {(
                [
                  ["recent", "Most recent"],
                  ["online", "Online first · longest"],
                  ["longest", "Longest on site"],
                ] as Array<[typeof sortBy, string]>
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`rounded-xl px-2 py-1.5 text-left text-[11px] font-bold ${
                    sortBy === k
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Showing {Math.min(filteredSessions.length, 100)} of {sessions.length} visitors{filteredSessions.length > 100 ? " (capped at 100 for performance — refine filters to see more)" : ""}.
        </p>
      </aside>
      <div className="space-y-2">
        {filteredSessions.slice(0, 100).map((s) => {
          const row = s as Session & {
            id: string;
            session_key?: string | null;
            name?: string | null;
            country?: string | null;
            city?: string | null;
            device?: string | null;
            page_views?: number | null;
            current_path?: string | null;
            duration_seconds?: number | null;
            last_seen_at: string;
          };
          const online = Date.now() - new Date(row.last_seen_at).getTime() < 60_000;
          const link = streamLinkFromPath(row.current_path);
          const name = (row.name || "").trim();
          const displayName = name || "Anonymous";
          const composeKey = row.session_key || row.id;
          const contentType = contentTypeForSession(row);
          const alreadyReviewed =
            (row.session_key && reviewedSessions.has(row.session_key)) ||
            (!!name && reviewedNames.has(name.toLowerCase()));
          return (
            <div
              key={row.id}
              className="w-full rounded-xl border border-border bg-secondary/40 p-3 text-left text-xs transition hover:border-primary"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenSession(row)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpenSession(row);
                }}
                className="cursor-pointer"
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-muted-foreground/50"}`}
                    />
                    <span className="font-bold text-foreground">{displayName}</span>
                    <span className="text-muted-foreground">
                      · {row.country || "?"}
                      {row.city ? `, ${row.city}` : ""}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{fmtDur(row.duration_seconds || 0)}</span>
                </div>
                <p className="text-muted-foreground">
                  {row.device} · {row.page_views} views
                  <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {contentFilterLabel(contentType)}
                  </span>
                  {link ? (
                    <>
                      {" "}
                      · watching <span className="text-primary">{link.label}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">Tap for full activity →</p>
              </div>
              {!alreadyReviewed && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  {composeFor === composeKey ? (
                    <div className="space-y-2">
                      <textarea
                        value={composeMsg}
                        onChange={(e) => setComposeMsg(e.target.value)}
                        placeholder={`Ask ${displayName} for a review…`}
                        rows={2}
                        className="w-full resize-none rounded-lg bg-background px-2 py-1.5 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setComposeFor(null);
                            setComposeMsg("");
                          }}
                          className="rounded-full bg-secondary px-3 py-1 text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={sending || !composeMsg.trim()}
                          onClick={() => sendReview(row)}
                          className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground disabled:opacity-50"
                        >
                          {sending ? "Sending…" : "Send review request"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setComposeFor(composeKey);
                        setComposeMsg(`Hi ${displayName}, please leave a review!`);
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary"
                    >
                      <Star className="h-3 w-3" /> Send review request
                    </button>
                  )}
                </div>
              )}
              {alreadyReviewed && (
                <p className="mt-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                  Review request already sent.
                </p>
              )}
            </div>
          );
        })}
        {filteredSessions.length === 0 && <Empty />}
      </div>
    </div>
  );
}

// ===== Broadcasts admin panel: notifications, questions, reviews =====
type Broadcast = {
  id: string;
  kind: "notification" | "question" | "review";
  message: string;
  target_name: string | null;
  active: boolean;
  created_at: string;
};
type BResponse = {
  id: string;
  broadcast_id: string;
  session_key: string;
  name: string | null;
  response_text: string | null;
  rating: number | null;
  dismissed: boolean;
  created_at: string;
};

function BroadcastsPanel({ password }: { password: string }) {
  const list = useServerFn(adminListBroadcasts);
  const create = useServerFn(adminCreateBroadcast);
  const del = useServerFn(adminDeleteBroadcast);
  const toggle = useServerFn(adminToggleBroadcast);
  const signFn = useServerFn(adminSignBroadcastImageUpload);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [responses, setResponses] = useState<BResponse[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [kind, setKind] = useState<"notification" | "question" | "review">("notification");
  const [msg, setMsg] = useState("");
  const [target, setTarget] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function refresh() {
    try {
      const r = await list({ data: { password } });
      setBroadcasts(r.broadcasts as Broadcast[]);
      setResponses(r.responses as BResponse[]);
    } catch {
    } finally {
      setInitialLoading(false);
    }
  }
  async function silentRefresh() {
    try {
      const r = await list({ data: { password } });
      setBroadcasts(r.broadcasts as Broadcast[]);
      setResponses(r.responses as BResponse[]);
    } catch {
      // silently fail on background refresh
    }
  }
  useEffect(() => {
    refresh();
    const t = window.setInterval(silentRefresh, 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image.jpg";
      const signed = await signFn({ data: { password, filename: safe } });
      const { supabase } = await import("@/integrations/supabase/client");
      const up = await supabase.storage
        .from("changelog-images")
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (up.error) throw up.error;
      setImagePath(signed.path);
      setImageUrl(signed.publicUrl);
    } catch (err) {
      setUploadError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setImageUrl("");
    setImagePath(null);
    setUploadError(null);
  }

  async function send() {
    if (!msg.trim()) return;
    setSending(true);
    try {
      await create({
        data: {
          password,
          kind,
          message: msg.trim(),
          target_name: target.trim() || null,
          image_url: imageUrl.trim() || null,
          image_path: imagePath,
        },
      });
      setMsg("");
      setTarget("");
      clearImage();
      refresh();
    } catch (e) {
      alert((e as Error).message || "Failed");
    } finally {
      setSending(false);
    }
  }

  const placeholder =
    kind === "notification"
      ? "Type your announcement…"
      : kind === "question"
        ? "Ask users a question, e.g. Which football club do you support?"
        : "Ask users to leave a review (e.g. Please rate your experience)";

  if (initialLoading)
    return <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Section title="Send broadcast" icon={MessageSquare}>
        <div className="mb-3 flex gap-2">
          {(
            [
              ["notification", "Notification"],
              ["question", "Question"],
              ["review", "Review"],
            ] as Array<["notification" | "question" | "review", string]>
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold ${kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="mb-2 w-full resize-none rounded-xl bg-background px-3 py-2 text-sm"
        />
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target user name (leave empty for everyone)"
          className="mb-2 w-full rounded-xl bg-background px-3 py-2 text-sm"
        />

        <div className="mb-2 rounded-xl border border-dashed border-border bg-background/40 p-2">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Preview image (optional)
          </p>
          {imageUrl ? (
            <div className="flex items-start gap-2">
              <img
                src={imageUrl}
                alt=""
                className="h-16 w-24 shrink-0 rounded-lg object-cover"
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
              <button
                type="button"
                onClick={clearImage}
                className="rounded-full bg-secondary px-2 py-1 text-[11px] font-bold"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold">
                {uploading ? "Uploading…" : "Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
              </label>
              <span className="text-[11px] text-muted-foreground">or paste URL</span>
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImagePath(null);
                }}
                placeholder="https://…"
                className="flex-1 rounded-xl bg-background px-2 py-1.5 text-xs"
              />
            </div>
          )}
          {uploadError && <p className="mt-1 text-[11px] text-destructive">{uploadError}</p>}
        </div>

        <button
          disabled={sending || !msg.trim() || uploading}
          onClick={send}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? "Sending…" : "Send"}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {kind === "notification"
            ? "Users will see a popup they can close with the X button."
            : kind === "question"
              ? "Users must type an answer to dismiss the popup."
              : "Users must give 1–5 stars and a 20+ character review. They can't close the popup."}
        </p>
      </Section>

      <Section title="Active & past broadcasts" icon={MessageSquare}>
        {broadcasts.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-3">
            {broadcasts.map((b) => {
              const replies = responses.filter((r) => r.broadcast_id === b.id);
              return (
                <li key={b.id} className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        {b.kind}
                        {b.target_name ? ` → ${b.target_name}` : " → everyone"}
                      </p>
                      <p className="mt-1 truncate text-sm font-semibold">{b.message}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()} · {replies.length} response
                        {replies.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={async () => {
                          await toggle({ data: { password, id: b.id, active: !b.active } });
                          refresh();
                        }}
                        className={`rounded-full px-2 py-1 text-[11px] font-bold ${b.active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                      >
                        {b.active ? "Live" : "Off"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this broadcast and all responses?")) return;
                          await del({ data: { password, id: b.id } });
                          refresh();
                        }}
                        className="rounded-full bg-secondary p-1.5 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {replies.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-2 text-xs">
                      {replies.map((r) => (
                        <li key={r.id} className="rounded-lg bg-background/60 px-2 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">{r.name || "Anonymous"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleString()}
                            </span>
                          </div>
                          {r.rating ? (
                            <div className="mt-0.5 flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${i < (r.rating || 0) ? "fill-yellow-400 stroke-yellow-400" : "stroke-muted-foreground"}`}
                                />
                              ))}
                            </div>
                          ) : null}
                          {r.response_text && (
                            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                              {r.response_text}
                            </p>
                          )}
                          {!r.response_text && !r.rating && r.dismissed && (
                            <p className="mt-1 text-[11px] text-muted-foreground">Dismissed</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ===== Fixes & Features (changelog) admin panel =====

type ChangelogRow = {
  id: string;
  kind: "new" | "fix" | "improved" | "soon";
  title: string;
  detail: string | null;
  active: boolean;
  image_url: string | null;
  image_path: string | null;
  published_at: string;
};

function ChangelogPanel({ password }: { password: string }) {
  const listFn = useServerFn(adminListChangelog);
  const createFn = useServerFn(adminCreateChangelog);
  const delFn = useServerFn(adminDeleteChangelog);
  const toggleFn = useServerFn(adminToggleChangelog);
  const signFn = useServerFn(adminSignChangelogImageUpload);

  const [items, setItems] = useState<ChangelogRow[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<ChangelogRow["kind"]>("new");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [imageMode, setImageMode] = useState<"none" | "upload" | "url">("none");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function refresh(silent = false) {
    try {
      const r = await listFn({ data: { password } });
      setItems(r.items as ChangelogRow[]);
    } catch (e) {
      if (!silent) setError((e as Error).message || "Failed to load");
    } finally {
      if (!silent) setInitialLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = window.setInterval(() => refresh(true), 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const finalUrl = imageMode === "none" ? null : imageUrl.trim() || null;
      await createFn({
        data: {
          password,
          kind,
          title: title.trim(),
          detail: detail.trim() || null,
          image_url: finalUrl,
          image_path: imageMode === "upload" ? imagePath : null,
        },
      });
      setTitle("");
      setDetail("");
      setImageUrl("");
      setImagePath(null);
      setImageMode("none");
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "image.jpg";
      const signed = await signFn({ data: { password, filename: safe } });
      const { supabase } = await import("@/integrations/supabase/client");
      const up = await supabase.storage
        .from("changelog-images")
        .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
      if (up.error) throw up.error;
      setImagePath(signed.path);
      setImageUrl(signed.publicUrl);
    } catch (err) {
      setError((err as Error).message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry? Users won't see it again.")) return;
    await delFn({ data: { password, id } });
    setItems((arr) => arr.filter((i) => i.id !== id));
  }

  async function toggle(id: string, active: boolean) {
    await toggleFn({ data: { password, id, active } });
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, active } : i)));
  }

  const kindStyle: Record<ChangelogRow["kind"], string> = {
    new: "bg-primary text-primary-foreground",
    fix: "bg-emerald-500 text-white",
    improved: "bg-blue-500 text-white",
    soon: "bg-amber-500 text-white",
  };

  const publishedTitles = new Set(items.map((i) => i.title.trim().toLowerCase()));
  const suggestions = CHANGELOG_SUGGESTIONS.filter(
    (s) => !publishedTitles.has(s.title.trim().toLowerCase()),
  );

  const [queue, setQueue] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | ChangelogRow["kind"]>("all");
  const visible = filter === "all" ? suggestions : suggestions.filter((s) => s.kind === filter);

  function toggleQueue(key: string) {
    setQueue((q) => {
      const next = new Set(q);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function publishSuggestion(s: (typeof CHANGELOG_SUGGESTIONS)[number]) {
    setBusy(true);
    setError(null);
    try {
      await createFn({
        data: { password, kind: s.kind, title: s.title, detail: s.detail || null },
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  async function publishQueue() {
    const picks = suggestions.filter((s) => queue.has(s.key));
    if (picks.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const s of picks) {
        await createFn({
          data: { password, kind: s.kind, title: s.title, detail: s.detail || null },
        });
      }
      setQueue(new Set());
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Could not publish queue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black uppercase tracking-widest">Updates feed</h3>
          <span className="text-[11px] text-muted-foreground">
            {visible.length} of {suggestions.length} unpublished
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Every feature, fix and improvement we've shipped. Tick the ones you want, then publish the
          queue — or tap a single one to push it instantly.
        </p>

        <div className="flex flex-wrap gap-2">
          {(["all", "new", "fix", "improved", "soon"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                filter === f
                  ? f === "all"
                    ? "bg-foreground text-background"
                    : kindStyle[f as ChangelogRow["kind"]]
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {queue.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/40 bg-primary/10 p-3">
            <p className="text-xs font-bold">{queue.size} in queue</p>
            <div className="flex gap-2">
              <button
                onClick={() => setQueue(new Set())}
                className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold"
              >
                Clear
              </button>
              <button
                onClick={publishQueue}
                disabled={busy}
                className="rounded-full bg-primary px-4 py-1.5 text-[11px] font-black text-primary-foreground transition active:scale-95 disabled:opacity-50"
              >
                {busy ? "Publishing…" : `Publish ${queue.size} to users`}
              </button>
            </div>
          </div>
        )}

        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground">All caught up — nothing new to publish.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((s) => {
              const checked = queue.has(s.key);
              return (
                <li
                  key={s.key}
                  className={`rounded-xl border p-3 transition ${
                    checked ? "border-primary bg-primary/5" : "border-border bg-background/60"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleQueue(s.key)}
                      className="mt-1 h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${kindStyle[s.kind]}`}
                        >
                          {s.kind.toUpperCase()}
                        </span>
                        <p className="text-sm font-bold">{s.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.detail}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => publishSuggestion(s)}
                          disabled={busy}
                          className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
                        >
                          Publish now
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setKind(s.kind);
                            setTitle(s.title);
                            setDetail(s.detail);
                          }}
                          className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold"
                        >
                          Edit first
                        </button>
                      </div>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={publish}
        className="space-y-3 rounded-2xl border border-border bg-secondary/30 p-4"
      >
        <h3 className="text-sm font-black uppercase tracking-widest">Publish update</h3>
        <p className="text-xs text-muted-foreground">
          Every visitor sees this as a dismissible popup. They can also revisit it in the "What's
          new" menu.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["new", "fix", "improved", "soon"] as ChangelogRow["kind"][]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${
                kind === k ? kindStyle[k] : "bg-secondary text-muted-foreground"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short title (e.g. Faster downloads)"
          maxLength={120}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          required
        />
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          rows={3}
          placeholder="Optional details for users"
          maxLength={2000}
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />

        <div className="space-y-2 rounded-xl border border-border bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Preview image</span>
            {(["none", "upload", "url"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setImageMode(m)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                  imageMode === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {m === "none" ? "No image" : m === "upload" ? "Upload" : "Paste URL"}
              </button>
            ))}
          </div>
          {imageMode === "upload" && (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                disabled={uploading}
                className="block w-full text-xs file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-[11px] file:font-bold file:text-primary-foreground"
              />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            </div>
          )}
          {imageMode === "url" && (
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => { setImageUrl(e.target.value); setImagePath(null); }}
              placeholder="https://example.com/preview.jpg"
              maxLength={1024}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          )}
          {imageMode !== "none" && imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              className="max-h-40 w-full rounded-lg object-cover"
            />
          )}
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={busy || !title.trim()}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition active:scale-95 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {busy ? "Publishing…" : "Publish to users"}
        </button>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-black uppercase tracking-widest">Published</h3>
        {initialLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing published yet.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li
                key={c.id}
                className={`rounded-2xl border border-border bg-secondary/30 p-4 ${c.active ? "" : "opacity-50"}`}
              >
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${kindStyle[c.kind]}`}
                  >
                    {c.kind.toUpperCase()}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(c.published_at).toLocaleString()}
                  </span>
                  {!c.active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold">{c.title}</p>
                {c.detail && (
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">
                    {c.detail}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => toggle(c.id, !c.active)}
                    className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold"
                  >
                    {c.active ? "Hide from users" : "Show again"}
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-[11px] font-bold text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TermsPanel({ sessions }: { sessions: Session[] }) {
  type Row = { name: string; version: number; at: string; country?: string; device?: string };
  const rows: Row[] = [];
  const seen = new Set<string>();
  for (const s of sessions) {
    const events = Array.isArray((s as unknown as { events?: unknown[] }).events)
      ? ((s as unknown as { events: Array<{ label?: string; meta?: { version?: number } | null; at?: string }> }).events)
      : [];
    const accept = events.find((e) => typeof e.label === "string" && e.label.startsWith("Accepted Terms"));
    if (!accept) continue;
    const name = (s.name || "Anonymous").trim() || "Anonymous";
    const key = `${name}|${accept.at || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const version = (accept.meta && typeof accept.meta.version === "number") ? accept.meta.version : 1;
    rows.push({
      name,
      version,
      at: accept.at || s.last_seen_at,
      country: s.country || undefined,
      device: s.device || undefined,
    });
  }
  rows.sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <Section title={`Users who accepted the Terms (${rows.length})`} icon={ShieldCheck}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={i} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{r.name}</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">v{r.version}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(r.at).toLocaleString()}
                {r.country ? ` · ${r.country}` : ""}
                {r.device ? ` · ${r.device}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
