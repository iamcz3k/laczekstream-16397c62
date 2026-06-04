import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FeatureFlag = { key: string; enabled: boolean; description?: string | null };
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
        if (key in m) setEnabled(m[key]); else setEnabled(fallback);
      });
    };
    apply();
    listeners.add(apply);
    // Re-check periodically so public visitors pick up admin toggles without reload.
    const t = window.setInterval(apply, TTL_MS);
    return () => { cancelled = true; listeners.delete(apply); window.clearInterval(t); };
  }, [key, fallback]);
  return enabled;
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
    // Include events that haven't started yet so the banner can show a countdown.
    if (e.ends_at && e.ends_at < nowIso) return false;
    return true;
  });
}
