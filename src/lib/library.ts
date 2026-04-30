// LACZEK STREAM — local user library (continue watching, watchlist, history)

export type LibraryEntry = {
  id: number;
  kind: "movie" | "tv";
  title: string;
  poster?: string;
  backdrop?: string;
  year?: string;
  rating?: number;
  // playback context (TV only, but stored for everything for simplicity)
  season?: number;
  episode?: number;
  // progress in seconds + duration in seconds (when known)
  position?: number;
  duration?: number;
  updatedAt: number;
};

const KEYS = {
  continue: "laczek:continue",
  watchlist: "laczek:watchlist",
  history: "laczek:history",
} as const;

type StoreKey = keyof typeof KEYS;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(key: StoreKey): LibraryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEYS[key]);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e) => e && typeof e.id === "number");
  } catch {
    return [];
  }
}

function write(key: StoreKey, list: LibraryEntry[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEYS[key], JSON.stringify(list.slice(0, 200)));
    window.dispatchEvent(new CustomEvent("laczek:library-changed", { detail: { key } }));
  } catch {}
}

function entryKey(e: { id: number; kind: string; season?: number; episode?: number }) {
  return `${e.kind}:${e.id}:${e.season ?? 0}:${e.episode ?? 0}`;
}

function upsert(key: StoreKey, entry: LibraryEntry) {
  const list = read(key);
  const k = entryKey(entry);
  const next = [entry, ...list.filter((e) => entryKey(e) !== k)];
  write(key, next);
}

export function getContinueWatching(): LibraryEntry[] {
  return read("continue").sort((a, b) => b.updatedAt - a.updatedAt);
}
export function getWatchlist(): LibraryEntry[] {
  return read("watchlist").sort((a, b) => b.updatedAt - a.updatedAt);
}
export function getHistory(): LibraryEntry[] {
  return read("history").sort((a, b) => b.updatedAt - a.updatedAt);
}

export function recordWatch(entry: Omit<LibraryEntry, "updatedAt">) {
  const full: LibraryEntry = { ...entry, updatedAt: Date.now() };
  upsert("history", full);
  // Add to continue-watching unless we know it's finished
  const finished = full.position && full.duration && full.position / full.duration > 0.95;
  if (!finished) upsert("continue", full);
  else removeFromContinue(full);
}

export function removeFromContinue(entry: { id: number; kind: string; season?: number; episode?: number }) {
  const list = read("continue").filter((e) => entryKey(e) !== entryKey(entry));
  write("continue", list);
}

export function toggleWatchlist(entry: Omit<LibraryEntry, "updatedAt">) {
  const list = read("watchlist");
  const k = entryKey(entry);
  if (list.some((e) => entryKey(e) === k)) {
    write("watchlist", list.filter((e) => entryKey(e) !== k));
    return false;
  }
  write("watchlist", [{ ...entry, updatedAt: Date.now() }, ...list]);
  return true;
}

export function isInWatchlist(entry: { id: number; kind: string; season?: number; episode?: number }) {
  return read("watchlist").some((e) => entryKey(e) === entryKey(entry));
}

export function clearLibrary(key: StoreKey | "all") {
  if (!isBrowser()) return;
  if (key === "all") {
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  } else {
    window.localStorage.removeItem(KEYS[key]);
  }
  window.dispatchEvent(new CustomEvent("laczek:library-changed", { detail: { key } }));
}

export function exportLibrary(): string {
  return JSON.stringify(
    {
      continue: read("continue"),
      watchlist: read("watchlist"),
      history: read("history"),
      exportedAt: new Date().toISOString(),
    },
    null,
    2,
  );
}

/** Subscribe to library changes; returns unsubscribe. */
export function onLibraryChange(cb: () => void) {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("laczek:library-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("laczek:library-changed", handler);
    window.removeEventListener("storage", handler);
  };
}