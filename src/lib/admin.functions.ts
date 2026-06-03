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
      .limit(2000);

    if (error) throw new Error(error.message);

    const now = Date.now();
    const onlineWindowMs = 60_000; // active in last 60s
    const onlineNow = (sessions || []).filter(
      (s) => now - new Date(s.last_seen_at).getTime() < onlineWindowMs,
    ).length;

    // Aggregate
    const watchCount = new Map<string, { title: string; kind: string; count: number }>();
    const watchByKind: Record<string, Map<string, { title: string; count: number }>> = {
      movie: new Map(), tv: new Map(), anime: new Map(), football: new Map(),
    };
    const searchCount = new Map<string, number>();
    const countryCount = new Map<string, number>();
    const dayCount = new Map<string, number>(); // YYYY-MM-DD => visits
    const dayMinutes = new Map<string, number>();
    const accounts = new Map<string, { name: string; sessions: number; lastSeen: string; totalSeconds: number }>();

    for (const s of sessions || []) {
      if (s.country) countryCount.set(s.country, (countryCount.get(s.country) || 0) + 1);
      const day = new Date(s.started_at).toISOString().slice(0, 10);
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
      dayMinutes.set(day, (dayMinutes.get(day) || 0) + Math.round((s.duration_seconds || 0) / 60));
      const accName = (s.name || "Anonymous").trim() || "Anonymous";
      const a = accounts.get(accName) || { name: accName, sessions: 0, lastSeen: s.last_seen_at, totalSeconds: 0 };
      a.sessions += 1;
      a.totalSeconds += s.duration_seconds || 0;
      if (new Date(s.last_seen_at) > new Date(a.lastSeen)) a.lastSeen = s.last_seen_at;
      accounts.set(accName, a);

      const watched = Array.isArray(s.watched) ? (s.watched as Array<{ id?: string; title?: string; kind?: string }>) : [];
      for (const w of watched) {
        const k = `${w.kind || "?"}:${w.id || "?"}`;
        const cur = watchCount.get(k) || { title: w.title || k, kind: w.kind || "?", count: 0 };
        cur.count += 1;
        watchCount.set(k, cur);
        const bucket = watchByKind[w.kind || ""];
        if (bucket) {
          const b = bucket.get(w.id || "?") || { title: w.title || "?", count: 0 };
          b.count += 1;
          bucket.set(w.id || "?", b);
        }
      }
      const searches = Array.isArray(s.searches) ? (s.searches as Array<{ q?: string }>) : [];
      for (const q of searches) {
        if (!q.q) continue;
        searchCount.set(q.q, (searchCount.get(q.q) || 0) + 1);
      }
    }

    const topWatched = Array.from(watchCount.values()).sort((a, b) => b.count - a.count).slice(0, 20);
    const topByKind = Object.fromEntries(
      Object.entries(watchByKind).map(([k, m]) => [
        k,
        Array.from(m.entries())
          .map(([id, v]) => ({ id, title: v.title, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      ]),
    ) as Record<string, Array<{ id: string; title: string; count: number }>>;
    const topSearches = Array.from(searchCount.entries()).map(([q, count]) => ({ q, count })).sort((a, b) => b.count - a.count).slice(0, 20);
    const topCountries = Array.from(countryCount.entries()).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 20);
    const dailyVisits = Array.from(dayCount.entries())
      .map(([day, visits]) => ({ day, visits, minutes: dayMinutes.get(day) || 0 }))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 14);
    const accountsList = Array.from(accounts.values()).sort((a, b) => a.name.localeCompare(b.name));

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
      topByKind,
      topSearches,
      topCountries,
      dailyVisits,
      accounts: accountsList,
    };
  });