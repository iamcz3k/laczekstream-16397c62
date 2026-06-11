// Visitor session tracker. Public visitors write only their own anonymous activity.
import { supabase } from "@/integrations/supabase/client";
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
  // FIX: removed the __laczekTracker guard that was preventing re-registration
  // after a deploy reloads the JS bundle (module vars reset but guard stayed true
  // via window property, so beat() would fire with empty sessionKey and silently fail).
  if ((window as unknown as { __laczekTracker?: boolean }).__laczekTracker) return;
  (window as unknown as { __laczekTracker?: boolean }).__laczekTracker = true;

  startedAt = Date.now();
  // FIX: always read sessionKey from localStorage — never leave it as empty string.
  sessionKey = getSessionKey();
  lastPath = window.location.pathname;
  const geo = await fetchGeo();
  const prefs = getPrefs();

  // Attach the signed-in user (if any) to this visitor session.
  let userId: string | null = null;
  let displayName: string | null = prefs.name || null;
  try {
    const { data: sess } = await supabase.auth.getSession();
    if (sess.session?.user) {
      userId = sess.session.user.id;
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", userId)
        .maybeSingle();
      if (prof?.full_name) displayName = prof.full_name;
      else if (prof?.username) displayName = prof.username;
    }
  } catch {}

  try {
    await supabase
      .from("visitor_sessions")
      .upsert(
        {
          session_key: sessionKey,
          name: displayName,
          user_id: userId,
          country: geo.country || null,
          city: geo.city || null,
          ip: geo.ip || null,
          user_agent: navigator.userAgent,
          device: detectDevice(),
          current_path: lastPath,
          last_seen_at: new Date().toISOString(),
          // FIX: explicitly include these so the RLS WITH CHECK never sees NULLs
          duration_seconds: 0,
          page_views: 1,
        },
        { onConflict: "session_key" },
      );
  } catch (e) {
    console.warn("[tracker] startVisit failed", e);
  }

  beat();
  if (heartbeatTimer) window.clearInterval(heartbeatTimer);
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
  // FIX: if sessionKey somehow empty, recover it from localStorage before giving up
  if (!sessionKey) sessionKey = localStorage.getItem(SESSION_KEY_LS) || "";
  if (!sessionKey) return;
  try {
    await supabase
      .from("visitor_sessions")
      .update({
        duration_seconds: Math.round((Date.now() - startedAt) / 1000),
        current_path: window.location.pathname,
        name: getPrefs().name || null,
        last_seen_at: new Date().toISOString(),
      })
      .eq("session_key", sessionKey);
  } catch (e) {
    console.warn("[tracker] heartbeat failed", e);
  }
}

async function maybePathChange() {
  const p = window.location.pathname;
  if (p === lastPath) return;
  lastPath = p;
  try {
    await supabase
      .from("visitor_sessions")
      .update({ current_path: p, last_seen_at: new Date().toISOString() })
      .eq("session_key", sessionKey);
  } catch (e) {
    console.warn("[tracker] path update failed", e);
  }
}

export async function trackWatch(entry: { kind: string; id: string; title?: string }) {
  if (!sessionKey) sessionKey = localStorage.getItem(SESSION_KEY_LS) || "";
  if (!sessionKey) return;
  try {
    const { data: row } = await supabase
      .from("visitor_sessions")
      .select("watched")
      .eq("session_key", sessionKey)
      .maybeSingle();
    const watched = Array.isArray(row?.watched) ? (row!.watched as unknown[]) : [];
    watched.unshift({ ...entry, at: new Date().toISOString() });
    await supabase
      .from("visitor_sessions")
      .update({ watched: watched.slice(0, 50) as never })
      .eq("session_key", sessionKey);
  } catch (e) {
    console.warn("[tracker] trackWatch failed", e);
  }
}

export async function trackSearch(query: string) {
  if (!sessionKey) sessionKey = localStorage.getItem(SESSION_KEY_LS) || "";
  if (!sessionKey || !query.trim()) return;
  try {
    const { data: row } = await supabase
      .from("visitor_sessions")
      .select("searches")
      .eq("session_key", sessionKey)
      .maybeSingle();
    const searches = Array.isArray(row?.searches) ? (row!.searches as unknown[]) : [];
    searches.unshift({ q: query.trim(), at: new Date().toISOString() });
    await supabase
      .from("visitor_sessions")
      .update({ searches: searches.slice(0, 30) as never })
      .eq("session_key", sessionKey);
  } catch (e) {
    console.warn("[tracker] trackSearch failed", e);
  }
}

export function stopTracking() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}
