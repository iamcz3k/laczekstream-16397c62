// Visitor session tracker. Persists a session row in Supabase and updates time spent,
// current path, watched items, and searches. Geo-IP via free ipapi.co (no key).
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getPrefs } from "@/lib/preferences";

const SESSION_KEY_LS = "laczek:visitor:key";
const SESSION_ID_LS = "laczek:visitor:id";
const HEARTBEAT_MS = 15_000;

type GeoInfo = { country?: string; city?: string; ip?: string };

function newKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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

let sessionId: string | null = null;
let startedAt = Date.now();
let heartbeatTimer: number | null = null;

export async function startTracking() {
  if (typeof window === "undefined") return;
  if ((window as unknown as { __laczekTracker?: boolean }).__laczekTracker) return;
  (window as unknown as { __laczekTracker?: boolean }).__laczekTracker = true;

  startedAt = Date.now();
  const key = getSessionKey();
  const cachedId = localStorage.getItem(SESSION_ID_LS);
  const geo = await fetchGeo();
  const prefs = getPrefs();
  const base = {
    session_key: key,
    name: prefs.name || null,
    country: geo.country || null,
    city: geo.city || null,
    ip: geo.ip || null,
    user_agent: navigator.userAgent,
    device: detectDevice(),
    current_path: window.location.pathname,
  };

  // Always create a fresh row per visit so admin sees each visit separately
  const { data, error } = await supabase
    .from("visitor_sessions")
    .insert(base)
    .select("id")
    .single();

  if (!error && data) {
    sessionId = data.id;
    localStorage.setItem(SESSION_ID_LS, data.id);
  } else {
    sessionId = cachedId;
  }

  heartbeatTimer = window.setInterval(heartbeat, HEARTBEAT_MS);
  window.addEventListener("beforeunload", () => heartbeat(true));
  window.addEventListener("popstate", () => updatePath());
  // Patch pushState/replaceState to detect SPA navigations
  ["pushState", "replaceState"].forEach((m) => {
    const orig = (history as unknown as Record<string, (...args: unknown[]) => unknown>)[m];
    (history as unknown as Record<string, (...args: unknown[]) => unknown>)[m] = function (...args: unknown[]) {
      const r = orig.apply(history, args);
      setTimeout(updatePath, 0);
      return r;
    };
  });
}

async function heartbeat(_final = false) {
  if (!sessionId) return;
  const duration = Math.round((Date.now() - startedAt) / 1000);
  await supabase
    .from("visitor_sessions")
    .update({
      duration_seconds: duration,
      last_seen_at: new Date().toISOString(),
      current_path: window.location.pathname,
      name: getPrefs().name || null,
    })
    .eq("id", sessionId);
}

async function updatePath() {
  if (!sessionId) return;
  await supabase
    .from("visitor_sessions")
    .update({ current_path: window.location.pathname })
    .eq("id", sessionId);
  // Bump page_views via a fetch RPC-style update
  const { data } = await supabase.from("visitor_sessions").select("page_views").eq("id", sessionId).single();
  const pv = (data?.page_views ?? 1) + 1;
  await supabase.from("visitor_sessions").update({ page_views: pv }).eq("id", sessionId);
}

export async function trackWatch(entry: { kind: string; id: string; title?: string }) {
  if (!sessionId) return;
  const { data } = await supabase.from("visitor_sessions").select("watched").eq("id", sessionId).single();
  const watched: Json[] = Array.isArray(data?.watched) ? (data!.watched as Json[]) : [];
  watched.unshift({ ...entry, at: new Date().toISOString() } as unknown as Json);
  await supabase.from("visitor_sessions").update({ watched: watched.slice(0, 50) as Json }).eq("id", sessionId);
}

export async function trackSearch(query: string) {
  if (!sessionId || !query.trim()) return;
  const { data } = await supabase.from("visitor_sessions").select("searches").eq("id", sessionId).single();
  const searches: Json[] = Array.isArray(data?.searches) ? (data!.searches as Json[]) : [];
  searches.unshift({ q: query, at: new Date().toISOString() } as unknown as Json);
  await supabase.from("visitor_sessions").update({ searches: searches.slice(0, 30) as Json }).eq("id", sessionId);
}

export function stopTracking() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
}