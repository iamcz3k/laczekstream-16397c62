import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_PASSWORD = "czek2991";

export const adminFetchAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) {
      throw new Error("Invalid admin password");
    }

    const { data: sessions, error } = await supabaseAdmin
      .from("visitor_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(500);

    if (error) throw new Error(error.message);

    const now = Date.now();
    const onlineWindowMs = 60_000; // active in last 60s
    const onlineNow = (sessions || []).filter(
      (s) => now - new Date(s.last_seen_at).getTime() < onlineWindowMs,
    ).length;

    // Aggregate top watched
    const watchCount = new Map<string, { title: string; kind: string; count: number }>();
    const searchCount = new Map<string, number>();
    const countryCount = new Map<string, number>();

    for (const s of sessions || []) {
      if (s.country) countryCount.set(s.country, (countryCount.get(s.country) || 0) + 1);
      const watched = Array.isArray(s.watched) ? (s.watched as Array<{ id?: string; title?: string; kind?: string }>) : [];
      for (const w of watched) {
        const k = `${w.kind || "?"}:${w.id || "?"}`;
        const cur = watchCount.get(k) || { title: w.title || k, kind: w.kind || "?", count: 0 };
        cur.count += 1;
        watchCount.set(k, cur);
      }
      const searches = Array.isArray(s.searches) ? (s.searches as Array<{ q?: string }>) : [];
      for (const q of searches) {
        if (!q.q) continue;
        searchCount.set(q.q, (searchCount.get(q.q) || 0) + 1);
      }
    }

    const topWatched = Array.from(watchCount.values()).sort((a, b) => b.count - a.count).slice(0, 20);
    const topSearches = Array.from(searchCount.entries()).map(([q, count]) => ({ q, count })).sort((a, b) => b.count - a.count).slice(0, 20);
    const topCountries = Array.from(countryCount.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 20);

    const totalVisits = (sessions || []).length;
    const avgDuration = totalVisits > 0
      ? Math.round((sessions || []).reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / totalVisits)
      : 0;

    return {
      sessions: sessions || [],
      onlineNow,
      totalVisits,
      avgDuration,
      topWatched,
      topSearches,
      topCountries,
    };
  });