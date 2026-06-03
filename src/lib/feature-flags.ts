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

let flagsCache: Record<string, boolean> | null = null;
let flagsPromise: Promise<Record<string, boolean>> | null = null;

async function loadFlags(): Promise<Record<string, boolean>> {
  if (flagsCache) return flagsCache;
  if (flagsPromise) return flagsPromise;
  flagsPromise = (async () => {
    const { data, error } = await supabase.from("feature_flags").select("key,enabled");
    if (error || !data) return {};
    const map: Record<string, boolean> = {};
    for (const f of data) map[f.key] = !!f.enabled;
    flagsCache = map;
    return map;
  })();
  return flagsPromise;
}

export function useFeatureFlag(key: string, fallback = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(fallback);
  useEffect(() => {
    let cancelled = false;
    loadFlags().then((m) => { if (!cancelled && key in m) setEnabled(m[key]); });
    return () => { cancelled = true; };
  }, [key]);
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
    if (e.starts_at && e.starts_at > nowIso) return false;
    if (e.ends_at && e.ends_at < nowIso) return false;
    return true;
  });
}
