// Visitor session tracker. Routes all writes through server functions
// (admin client) so RLS stays locked down on the table.
import { startVisit, heartbeat, trackPath, trackWatchFn, trackSearchFn } from "@/lib/tracker.functions";
import { getPrefs } from "@/lib/preferences";

const SESSION_KEY_LS = "laczek:visitor:key";
const HEARTBEAT_MS = 10_000;

type GeoInfo = { country?: string; city?: string; ip?: string };

function newKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getSessionKey(): string {
  let key = localStorage.getItem(SESSION_KEY_LS);
  if (!key) {
    key = newKey();
    localStorage.setItem(SESSION_KEY_LS, key);
  }
  return key;
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  return "Desktop";
}

async function fetchGeo(): Promise<GeoInfo> {
  try {
    const cached = sessionStorage.getItem("laczek:geo");
    if (cached) return JSON.parse(cached);
    const r = await fetch("https://ipapi.co/json/");
    if (!r.ok) return {};
    const j = await r.json();
    const geo: GeoInfo = { country: j.country_name || j.country, city: j.city, ip: j.ip };
    sessionStorage.setItem("laczek:geo", JSON.stringify(geo));
    return geo;
  } catch {
    return {};
  }
}

let sessionKey = "";
let startedAt = Date.now();
let heartbeatTimer: number | null = null;
let lastPath = "";

function friendlyLabel(path: string): string {
  if (path === "/" || path === "") return "Opened Home";
  if (path.startsWith("/watch/movie/")) return "Opened a Movie player";
  if (path.startsWith("/watch/tv/")) return "Opened a Series player";
  if (path.startsWith("/watch/anime/")) return "Opened an Anime player";
  if (path.startsWith("/football-stream/")) return "Opened a Football live stream";
  if (path.startsWith("/anime/")) return "Opened Anime details";
  return `Opened ${path}`;
}

export async function startTracking() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __laczekTracker?: boolean }).__laczekTracker) return;
  (window as unknown as { __laczekTracker?: boolean }).__laczekTracker = true;

  startedAt = Date.now();
  sessionKey = getSessionKey();
  lastPath = window.location.pathname;
  const geo = await fetchGeo();
  const prefs = getPrefs();

  try {
    await startVisit({
      data: {
        session_key: sessionKey,
        name: prefs.name || null,
        country: geo.country || null,
        city: geo.city || null,
        ip: geo.ip || null,
        user_agent: navigator.userAgent,
        device: detectDevice(),
        current_path: lastPath,
      },
    });
  } catch (e) {
    console.warn("[tracker] startVisit failed", e);
  }

  beat();
  heartbeatTimer = window.setInterval(beat, HEARTBEAT_MS);
  window.addEventListener("beforeunload", () => beat());
  window.addEventListener("popstate", () => maybePathChange());
  ["pushState", "replaceState"].forEach((m) => {
    const orig = (history as unknown as Record<string, (...args: unknown[]) => unknown>)[m];
    (history as unknown as Record<string, (...args: unknown[]) => unknown>)[m] = function (...args: unknown[]) {
      const r = orig.apply(history, args);
      setTimeout(maybePathChange, 0);
      return r;
    };
  });
}

async function beat() {
  if (!sessionKey) return;
  try {
    await heartbeat({
      data: {
        session_key: sessionKey,
        duration_seconds: Math.round((Date.now() - startedAt) / 1000),
        current_path: window.location.pathname,
        name: getPrefs().name || null,
      },
    });
  } catch {}
}

async function maybePathChange() {
  const p = window.location.pathname;
  if (p === lastPath) return;
  lastPath = p;
  try {
    await trackPath({ data: { session_key: sessionKey, current_path: p, label: friendlyLabel(p) } });
  } catch {}
}

export async function trackWatch(entry: { kind: string; id: string; title?: string }) {
  if (!sessionKey) return;
  try { await trackWatchFn({ data: { session_key: sessionKey, entry } }); } catch {}
}

export async function trackSearch(query: string) {
  if (!sessionKey || !query.trim()) return;
  try { await trackSearchFn({ data: { session_key: sessionKey, q: query.trim() } }); } catch {}
}

export function stopTracking() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}
