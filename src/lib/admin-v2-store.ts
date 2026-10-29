// Fully client-side store for Admin Panel v2.
// All data lives in localStorage so the panel works without any backend.
// Keys are namespaced under "admin_v2_*".

export const ADMIN_V2_PASSWORD = "20071030";

const K = {
  flags: "admin_v2_flags",
  events: "admin_v2_events",
  broadcasts: "admin_v2_broadcasts",
  changelog: "admin_v2_changelog",
  sessions: "admin_v2_sessions",
  terms: "admin_v2_terms",
  adblock: "admin_v2_adblock",
  adblockClicks: "admin_v2_adblock_clicks",
  defaultMovieServer: "admin_v2_default_movie_server",
  defaultSportServers: "admin_v2_default_sport_servers",
  recommendedMovieServers: "admin_v2_recommended_movie_servers",
  recommendedSportSources: "admin_v2_recommended_sport_sources",
} as const;

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description?: string | null;
  updated_at: string;
};

export type FeaturedEvent = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  link_url: string;
  kind?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number;
  active?: boolean;
  sport?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_flag?: string | null;
  away_flag?: string | null;
  timer_mode?: "none" | "countdown" | "countup" | null;
  timer_target_at?: string | null;
  updated_at: string;
};

export type Broadcast = {
  id: string;
  title: string;
  body: string;
  image_url?: string | null;
  active: boolean;
  created_at: string;
};

export type ChangelogEntry = {
  id: string;
  title: string;
  body: string;
  kind: "fix" | "feature" | "improvement";
  image_url?: string | null;
  active: boolean;
  created_at: string;
};

export type LocalSession = {
  id: string;
  name: string;
  country?: string | null;
  city?: string | null;
  device?: string | null;
  started_at: string;
  last_seen_at: string;
  duration_seconds: number;
  current_path?: string | null;
  watched: Array<{ id?: string; title?: string; kind?: string; at?: string }>;
  searches: Array<{ q: string; at: string }>;
  path_log: Array<{ path: string; label?: string; at: string }>;
};

export type TermsRecord = {
  name: string;
  accepted_at: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Feature flags ----------
export function getFlags(): FeatureFlag[] {
  return read<FeatureFlag[]>(K.flags, []);
}
export function setFlagEnabled(key: string, enabled: boolean) {
  const list = getFlags();
  const i = list.findIndex((f) => f.key === key);
  if (i >= 0) {
    list[i] = { ...list[i], enabled, updated_at: nowIso() };
  } else {
    list.push({ key, enabled, updated_at: nowIso() });
  }
  write(K.flags, list);
}
export function addFlag(key: string, description?: string) {
  const list = getFlags();
  if (list.some((f) => f.key === key)) return;
  list.push({ key, description: description || null, enabled: true, updated_at: nowIso() });
  write(K.flags, list);
}
export function deleteFlag(key: string) {
  write(
    K.flags,
    getFlags().filter((f) => f.key !== key),
  );
}

// ---------- Featured events ----------
export function getEvents(): FeaturedEvent[] {
  return read<FeaturedEvent[]>(K.events, []).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
}
export function upsertEvent(input: Omit<FeaturedEvent, "id" | "updated_at"> & { id?: string }) {
  const list = read<FeaturedEvent[]>(K.events, []);
  if (input.id) {
    const i = list.findIndex((e) => e.id === input.id);
    if (i >= 0) {
      list[i] = { ...list[i], ...input, id: input.id, updated_at: nowIso() };
    }
  } else {
    list.push({ ...input, id: uid(), updated_at: nowIso() });
  }
  write(K.events, list);
}
export function deleteEvent(id: string) {
  write(
    K.events,
    read<FeaturedEvent[]>(K.events, []).filter((e) => e.id !== id),
  );
}

// ---------- Broadcasts ----------
export function getBroadcasts(): Broadcast[] {
  return read<Broadcast[]>(K.broadcasts, []).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
}
export function createBroadcast(input: { title: string; body: string; image_url?: string | null }) {
  const list = read<Broadcast[]>(K.broadcasts, []);
  list.push({
    id: uid(),
    title: input.title,
    body: input.body,
    image_url: input.image_url ?? null,
    active: true,
    created_at: nowIso(),
  });
  write(K.broadcasts, list);
}
export function toggleBroadcast(id: string, active: boolean) {
  const list = read<Broadcast[]>(K.broadcasts, []);
  const i = list.findIndex((b) => b.id === id);
  if (i >= 0) list[i] = { ...list[i], active };
  write(K.broadcasts, list);
}
export function deleteBroadcast(id: string) {
  write(
    K.broadcasts,
    read<Broadcast[]>(K.broadcasts, []).filter((b) => b.id !== id),
  );
}

// ---------- Changelog ----------
export function getChangelog(): ChangelogEntry[] {
  return read<ChangelogEntry[]>(K.changelog, []).sort((a, b) =>
    a.created_at < b.created_at ? 1 : -1,
  );
}
export function createChangelog(input: {
  title: string;
  body: string;
  kind: ChangelogEntry["kind"];
  image_url?: string | null;
}) {
  const list = read<ChangelogEntry[]>(K.changelog, []);
  list.push({
    id: uid(),
    title: input.title,
    body: input.body,
    kind: input.kind,
    image_url: input.image_url ?? null,
    active: true,
    created_at: nowIso(),
  });
  write(K.changelog, list);
}
export function toggleChangelog(id: string, active: boolean) {
  const list = read<ChangelogEntry[]>(K.changelog, []);
  const i = list.findIndex((c) => c.id === id);
  if (i >= 0) list[i] = { ...list[i], active };
  write(K.changelog, list);
}
export function deleteChangelog(id: string) {
  write(
    K.changelog,
    read<ChangelogEntry[]>(K.changelog, []).filter((c) => c.id !== id),
  );
}

// ---------- Local visitor sessions (this device only) ----------
export function getSessions(): LocalSession[] {
  return read<LocalSession[]>(K.sessions, []).sort((a, b) =>
    a.last_seen_at < b.last_seen_at ? 1 : -1,
  );
}
export function clearSessions() {
  write(K.sessions, []);
}
export function recordLocalVisit(partial?: Partial<LocalSession>) {
  if (typeof window === "undefined") return;
  const list = read<LocalSession[]>(K.sessions, []);
  const today = new Date().toISOString().slice(0, 10);
  const existing = list.find((s) => s.started_at.slice(0, 10) === today && s.name === (partial?.name || "This device"));
  if (existing) {
    existing.last_seen_at = nowIso();
    existing.duration_seconds += 30;
    if (partial?.current_path) existing.current_path = partial.current_path;
    write(K.sessions, list);
    return;
  }
  list.push({
    id: uid(),
    name: partial?.name || "This device",
    country: partial?.country ?? null,
    city: partial?.city ?? null,
    device: partial?.device ?? (typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 60) : null),
    started_at: nowIso(),
    last_seen_at: nowIso(),
    duration_seconds: 0,
    current_path: partial?.current_path ?? null,
    watched: [],
    searches: [],
    path_log: [],
  });
  write(K.sessions, list);
}

// ---------- Terms ----------
export function getTerms(): TermsRecord[] {
  return read<TermsRecord[]>(K.terms, []);
}
export function recordTermsAccepted(name: string) {
  const list = read<TermsRecord[]>(K.terms, []);
  if (list.some((t) => t.name === name)) return;
  list.push({ name, accepted_at: nowIso() });
  write(K.terms, list);
}

// ---------- AdBlock installs ----------
export type AdblockRecord = {
  name: string;
  device: string;
  accepted_at: string;
};
export function getAdblockInstalls(): AdblockRecord[] {
  return read<AdblockRecord[]>(K.adblock, []);
}
export function recordAdblockInstalled(name: string, device: string) {
  const list = read<AdblockRecord[]>(K.adblock, []);
  const key = `${name}|${device}`;
  if (list.some((t) => `${t.name}|${t.device}` === key)) return;
  list.push({ name, device, accepted_at: nowIso() });
  write(K.adblock, list);
}

export type AdblockClicks = { iphone: number; android: number; desktop: number };
export function getAdblockClicks(): AdblockClicks {
  return read<AdblockClicks>(K.adblockClicks, { iphone: 0, android: 0, desktop: 0 });
}
export function recordAdblockClick(device: "iphone" | "android" | "desktop") {
  const cur = getAdblockClicks();
  cur[device] = (cur[device] || 0) + 1;
  write(K.adblockClicks, cur);
}
export function isAdblockInstalledForUser(name: string): boolean {
  const list = getAdblockInstalls();
  return list.some((r) => r.name === name);
}

// ---------- Server preferences (local-only) ----------
export function getDefaultMovieServer(): { provider: string; enabled: boolean } | null {
  return read<{ provider: string; enabled: boolean } | null>(K.defaultMovieServer, null);
}
export function setDefaultMovieServer(provider: string, enabled: boolean) {
  write(K.defaultMovieServer, { provider, enabled });
}

export type SportServerEntry = { matchLink: string; serverIndex: number };
export function getDefaultSportServers(): { enabled: boolean; entries: SportServerEntry[] } {
  return read(K.defaultSportServers, { enabled: true, entries: [] as SportServerEntry[] });
}
export function setDefaultSportServer(matchLink: string, serverIndex: number, enabled: boolean) {
  const cur = getDefaultSportServers();
  const i = cur.entries.findIndex((e) => e.matchLink === matchLink);
  if (i >= 0) cur.entries[i] = { matchLink, serverIndex };
  else cur.entries.push({ matchLink, serverIndex });
  write(K.defaultSportServers, { enabled, entries: cur.entries });
}
export function removeDefaultSportServer(matchLink: string) {
  const cur = getDefaultSportServers();
  write(K.defaultSportServers, {
    enabled: cur.enabled,
    entries: cur.entries.filter((e) => e.matchLink !== matchLink),
  });
}

export function getRecommendedMovieServers(): { enabled: boolean; providers: string[] } {
  return read(K.recommendedMovieServers, { enabled: true, providers: [] as string[] });
}
export function setRecommendedMovieServers(providers: string[], enabled: boolean) {
  write(K.recommendedMovieServers, {
    enabled,
    providers: Array.from(new Set(providers.filter(Boolean))),
  });
}

export type RecSportEntry = { matchLink: string; indices: number[] };
export function getRecommendedSportSources(): { enabled: boolean; entries: RecSportEntry[] } {
  return read(K.recommendedSportSources, { enabled: true, entries: [] as RecSportEntry[] });
}
export function setRecommendedSportSources(matchLink: string, indices: number[], enabled: boolean) {
  const cur = getRecommendedSportSources();
  const clean = Array.from(new Set(indices.filter((n) => Number.isFinite(n) && n >= 1).map((n) => Math.floor(n))));
  const i = cur.entries.findIndex((e) => e.matchLink === matchLink);
  if (clean.length === 0) {
    if (i >= 0) cur.entries.splice(i, 1);
  } else if (i >= 0) {
    cur.entries[i] = { matchLink, indices: clean };
  } else {
    cur.entries.push({ matchLink, indices: clean });
  }
  write(K.recommendedSportSources, { enabled, entries: cur.entries });
}
export function removeRecommendedSportEntry(matchLink: string) {
  const cur = getRecommendedSportSources();
  write(K.recommendedSportSources, {
    enabled: cur.enabled,
    entries: cur.entries.filter((e) => e.matchLink !== matchLink),
  });
}

// ---------- Export / Import ----------
export function exportAll(): string {
  const dump: Record<string, unknown> = {};
  for (const key of Object.values(K)) {
    dump[key] = read(key, null);
  }
  return JSON.stringify(dump, null, 2);
}
export function importAll(json: string) {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  for (const key of Object.values(K)) {
    if (key in parsed) write(key, parsed[key]);
  }
}
export function resetAll() {
  for (const key of Object.values(K)) {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
  }
}

// ---------- Analytics aggregation (local) ----------
export function computeAnalytics() {
  const sessions = getSessions();
  const now = Date.now();
  const onlineNow = sessions.filter((s) => now - new Date(s.last_seen_at).getTime() < 60_000).length;
  const totalVisits = sessions.length;
  const avgDuration =
    totalVisits > 0
      ? Math.round(sessions.reduce((a, s) => a + (s.duration_seconds || 0), 0) / totalVisits)
      : 0;

  const watchCount = new Map<string, { title: string; kind: string; count: number; id: string }>();
  const byKind: Record<string, Map<string, { title: string; count: number }>> = {
    movie: new Map(),
    tv: new Map(),
    anime: new Map(),
    football: new Map(),
  };
  const searchCount = new Map<string, number>();
  const countryCount = new Map<string, number>();
  const dayCount = new Map<string, number>();
  const dayMinutes = new Map<string, number>();
  const accounts = new Map<
    string,
    { name: string; sessions: number; lastSeen: string; totalSeconds: number }
  >();

  for (const s of sessions) {
    if (s.country) countryCount.set(s.country, (countryCount.get(s.country) || 0) + 1);
    const day = s.started_at.slice(0, 10);
    dayCount.set(day, (dayCount.get(day) || 0) + 1);
    dayMinutes.set(day, (dayMinutes.get(day) || 0) + Math.round((s.duration_seconds || 0) / 60));
    const a = accounts.get(s.name) || { name: s.name, sessions: 0, lastSeen: s.last_seen_at, totalSeconds: 0 };
    a.sessions += 1;
    a.totalSeconds += s.duration_seconds || 0;
    if (new Date(s.last_seen_at) > new Date(a.lastSeen)) a.lastSeen = s.last_seen_at;
    accounts.set(s.name, a);

    for (const w of s.watched || []) {
      const k = `${w.kind || "?"}:${w.id || "?"}`;
      const cur = watchCount.get(k) || { id: w.id || "?", title: w.title || k, kind: w.kind || "?", count: 0 };
      cur.count += 1;
      watchCount.set(k, cur);
      const bucket = byKind[w.kind || ""];
      if (bucket) {
        const b = bucket.get(w.id || "?") || { title: w.title || "?", count: 0 };
        b.count += 1;
        bucket.set(w.id || "?", b);
      }
    }
    for (const q of s.searches || []) {
      if (!q.q) continue;
      searchCount.set(q.q, (searchCount.get(q.q) || 0) + 1);
    }
  }

  const topWatched = Array.from(watchCount.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  const topByKind = Object.fromEntries(
    Object.entries(byKind).map(([k, m]) => [
      k,
      Array.from(m.entries())
        .map(([id, v]) => ({ id, title: v.title, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    ]),
  );
  const topSearches = Array.from(searchCount.entries())
    .map(([q, count]) => ({ q, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  const topCountries = Array.from(countryCount.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  const dailyVisits = Array.from(dayCount.entries())
    .map(([day, visits]) => ({ day, visits, minutes: dayMinutes.get(day) || 0 }))
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .slice(0, 14);
  const accountsList = Array.from(accounts.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    sessions,
    onlineNow,
    totalVisits,
    avgDuration,
    topWatched,
    topByKind,
    topSearches,
    topCountries,
    dailyVisits,
    accounts: accountsList,
  };
}
