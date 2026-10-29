// Visitor session tracker. Routes all writes through server functions
// (admin client) so RLS stays locked down on the table.
import { startVisit, heartbeat, trackPath, trackWatchFn, trackSearchFn, trackEventFn } from "@/lib/tracker.functions";
import { getServerGeo } from "@/lib/geo.functions";
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
    let geo: GeoInfo = {};
    // Primary: server-side request headers (CF/Vercel inject country/IP).
    // Most accurate and covers every country including Uganda.
    try {
      const s = await getServerGeo();
      if (s?.country) geo = { country: s.country, city: s.city || undefined, ip: s.ip || undefined };
    } catch {}
    // Fallback chain: ipapi.co → ipwho.is → ip-api.com
    if (!geo.country) {
    try {
      const r = await fetch("https://ipapi.co/json/");
      if (r.ok) {
        const j = await r.json();
        geo = { country: j.country_name || j.country, city: j.city, ip: j.ip };
      }
    } catch {}
    // Fallback: ipwho.is — covers Uganda and other regions that ipapi sometimes misses.
    if (!geo.country) {
      try {
        const r = await fetch("https://ipwho.is/");
        if (r.ok) {
          const j = await r.json();
          if (j.success !== false) {
            geo = { country: j.country || geo.country, city: j.city || geo.city, ip: j.ip || geo.ip };
          }
        }
      } catch {}
    }
    // Final fallback: ip-api.com
    if (!geo.country) {
      try {
        const r = await fetch("https://ip-api.com/json/?fields=status,country,city,query");
        if (r.ok) {
          const j = await r.json();
          if (j.status === "success") {
            geo = { country: j.country || geo.country, city: j.city || geo.city, ip: j.query || geo.ip };
          }
        }
      } catch {}
    }
    } // end fallback chain
    if (geo.country || geo.city || geo.ip) {
      sessionStorage.setItem("laczek:geo", JSON.stringify(geo));
    }
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
  trackEvent(`Searched "${query.trim()}"`, "search", { query: query.trim() });
}

/** Generic action tracker — fire from any UI handler (server pick, button, fullscreen, etc.).
 *  Throttled per (label) for 1.5s so a chatty handler can't spam the row. */
const lastEventAt = new Map<string, number>();
export async function trackEvent(
  label: string,
  category: "fullscreen" | "server" | "button" | "menu" | "search" | "match" | "navigation" | "action" = "action",
  meta?: Record<string, string | number | boolean | null>,
) {
  if (typeof window === "undefined" || !sessionKey) return;
  const key = `${category}:${label}`;
  const now = Date.now();
  if ((lastEventAt.get(key) ?? 0) > now - 1500) return;
  lastEventAt.set(key, now);
  try { await trackEventFn({ data: { session_key: sessionKey, label, category, meta } }); } catch {}
}

if (typeof document !== "undefined") {
  document.addEventListener("fullscreenchange", () => {
    const on = !!document.fullscreenElement;
    trackEvent(on ? "Enabled fullscreen" : "Exited fullscreen", "fullscreen", { on });
  });
}

export function stopTracking() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}
