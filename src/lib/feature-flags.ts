import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlag = { key: string; enabled: boolean; description?: string | null };
export type TimerMode = "none" | "countdown" | "countup";
export type FeaturedEvent = {
  id: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  link_url: string;
  kind: string;
  starts_at?: string | null;
  ends_at?: string | null;
  priority: number;
  active: boolean;
  sport?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_flag?: string | null;
  away_flag?: string | null;
  timer_mode?: TimerMode | null;
  timer_target_at?: string | null;
};

// Short TTL cache so flags propagate to all users within ~30s of an admin toggle.
const TTL_MS = 30_000;
let flagsCache: { at: number; map: Record<string, boolean> } | null = null;
let flagsPromise: Promise<Record<string, boolean>> | null = null;
const listeners = new Set<() => void>();

async function loadFlags(force = false): Promise<Record<string, boolean>> {
  if (!force && flagsCache && Date.now() - flagsCache.at < TTL_MS) return flagsCache.map;
  if (flagsPromise) return flagsPromise;
  flagsPromise = (async () => {
    const { data, error } = await supabase.from("feature_flags").select("key,enabled");
    const map: Record<string, boolean> = {};
    if (!error && data) for (const f of data) map[f.key] = !!f.enabled;
    flagsCache = { at: Date.now(), map };
    flagsPromise = null;
    return map;
  })();
  return flagsPromise;
}

export function refreshFeatureFlags() {
  flagsCache = null;
  loadFlags(true).then(() => listeners.forEach((l) => l()));
}

export function useFeatureFlag(key: string, fallback = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(fallback);
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      loadFlags().then((m) => {
        if (cancelled) return;
        if (key in m) setEnabled(m[key]);
        else setEnabled(fallback);
      });
    };
    apply();
    listeners.add(apply);
    // Re-check periodically so public visitors pick up admin toggles without reload.
    const t = window.setInterval(apply, TTL_MS);
    return () => {
      cancelled = true;
      listeners.delete(apply);
      window.clearInterval(t);
    };
  }, [key, fallback]);
  return enabled;
}

export function useDefaultMovieServer(): string | null {
  const [server, setServer] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      loadFlags().then((m) => {
        if (cancelled) return;
        if (m["default_movie_server"]) {
          // The provider ID is stored in the description field; fetch it directly.
          supabase
            .from("feature_flags")
            .select("description")
            .eq("key", "default_movie_server")
            .single()
            .then(({ data }) => {
              if (!cancelled && data?.description) setServer(data.description);
              else if (!cancelled) setServer(null);
            });
        } else {
          setServer(null);
        }
      });
    };
    apply();
    listeners.add(apply);
    const t = window.setInterval(apply, TTL_MS);
    return () => {
      cancelled = true;
      listeners.delete(apply);
      window.clearInterval(t);
    };
  }, []);
  return server;
}

export async function loadActiveEvents(): Promise<FeaturedEvent[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("featured_events")
    .select("*")
    .eq("active", true)
    .order("priority", { ascending: false });
  if (error || !data) return [];
  return (data as FeaturedEvent[]).filter((e) => {
    // Hide only if explicitly ended >24h ago; keep recent past events live
    // so admins don't have to micromanage end times.
    if (e.ends_at) {
      const ended = new Date(e.ends_at).getTime();
      if (Number.isFinite(ended) && Date.now() - ended > 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });
}

// ===== Default sport server hook =====
// Pulls a matchId out of anything the admin might paste (raw id, in-app URL,
// published URL, editor URL, etc.) so loose matching still works.
export function extractSportMatchId(input: string): string {
  const s = (input || "").trim().toLowerCase();
  if (!s) return "";
  const patterns = [/\/football-stream\/([^/?#]+)/, /\/stream\/([^/?#]+)/, /\/match\/([^/?#]+)/, /matchid=([^&]+)/];
  for (const re of patterns) {
    const m = s.match(re);
    if (m && m[1]) { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }
  }
  const cleaned = s.split("?")[0].split("#")[0];
  const parts = cleaned.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : cleaned;
}

export function useDefaultSportServer(matchLink: string | null | undefined): number | null {
  const [serverIndex, setServerIndex] = useState<number | null>(null);
  useEffect(() => {
    if (!matchLink) return;
    let cancelled = false;
    const apply = () => {
      supabase
        .from("feature_flags")
        .select("enabled,description")
        .eq("key", "default_sport_server")
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (!data?.enabled || !data?.description) { setServerIndex(null); return; }
          try {
            const entries: Array<{ matchLink: string; serverIndex: number }> = JSON.parse(data.description);
            const target = extractSportMatchId(matchLink);
            const match = entries.find((e) => {
              const storedId = extractSportMatchId(e.matchLink || "");
              if (!storedId || !target) return false;
              return storedId === target || storedId.includes(target) || target.includes(storedId);
            });
            setServerIndex(match ? match.serverIndex : null);
          } catch {
            setServerIndex(null);
          }
        });
    };
    apply();
    listeners.add(apply);
    const t = window.setInterval(apply, TTL_MS);
    return () => {
      cancelled = true;
      listeners.delete(apply);
      window.clearInterval(t);
    };
  }, [matchLink]);
  return serverIndex;
}

// ===== Recommended movie servers (🔥) =====
// Reads the single feature_flags row "recommended_movie_servers" — same cache.
export function useRecommendedMovieServers(): Set<string> {
  const [providers, setProviders] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    let cancelled = false;
    const apply = () => {
      supabase
        .from("feature_flags")
        .select("enabled,description")
        .eq("key", "recommended_movie_servers")
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (!data?.enabled || !data?.description) { setProviders(new Set()); return; }
          try {
            const arr = JSON.parse(data.description);
            setProviders(new Set(Array.isArray(arr) ? arr.filter((p) => typeof p === "string") : []));
          } catch {
            setProviders(new Set());
          }
        });
    };
    apply();
    listeners.add(apply);
    const t = window.setInterval(apply, TTL_MS);
    return () => {
      cancelled = true;
      listeners.delete(apply);
      window.clearInterval(t);
    };
  }, []);
  return providers;
}

// ===== Recommended sport sources (🔥, per match) =====
export function useRecommendedSportSources(matchLink: string | null | undefined): Set<number> {
  const [indices, setIndices] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    if (!matchLink) { setIndices(new Set()); return; }
    let cancelled = false;
    const apply = () => {
      supabase
        .from("feature_flags")
        .select("enabled,description")
        .eq("key", "recommended_sport_sources")
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          if (!data?.enabled || !data?.description) { setIndices(new Set()); return; }
          try {
            const entries: Array<{ matchLink: string; indices: number[] }> = JSON.parse(data.description);
            const target = extractSportMatchId(matchLink);
            const match = entries.find((e) => {
              const storedId = extractSportMatchId(e.matchLink || "");
              if (!storedId || !target) return false;
              return storedId === target || storedId.includes(target) || target.includes(storedId);
            });
            setIndices(new Set(match?.indices ?? []));
          } catch {
            setIndices(new Set());
          }
        });
    };
    apply();
    listeners.add(apply);
    const t = window.setInterval(apply, TTL_MS);
    return () => {
      cancelled = true;
      listeners.delete(apply);
      window.clearInterval(t);
    };
  }, [matchLink]);
  return indices;
}


                                               
