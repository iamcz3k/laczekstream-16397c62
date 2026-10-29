
import { createServerFn } from "@tanstack/react-start";
import { ADMIN_PASSWORD } from "@/lib/admin-shared";


// ===== Feature flags =====

export const adminSetFeatureFlag = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; key: string; enabled: boolean }) => {
    if (
      typeof input?.password !== "string" ||
      typeof input?.key !== "string" ||
      typeof input?.enabled !== "boolean"
    )
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .update({ enabled: data.enabled, updated_at: new Date().toISOString() })
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAddFeatureFlag = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; key: string; description?: string }) => {
    if (typeof input?.password !== "string" || !input?.key) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .insert({ key: data.key, description: data.description ?? null, enabled: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Default movie server =====

export const adminSetDefaultServer = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; provider: string; enabled: boolean }) => {
    if (
      typeof input?.password !== "string" ||
      typeof input?.provider !== "string" ||
      typeof input?.enabled !== "boolean"
    )
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key: "default_movie_server",
          enabled: data.enabled,
          description: data.provider,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Featured events =====

export type FeaturedEventInput = {
  password: string;
  id?: string;
  title: string;
  subtitle?: string;
  image_url?: string;
  link_url: string;
  kind?: string;
  starts_at?: string | null;
  ends_at?: string | null;
  priority?: number;
  active?: boolean;
  sport?: string | null;
  home_team?: string | null;
  away_team?: string | null;
  home_flag?: string | null;
  away_flag?: string | null;
  timer_mode?: "none" | "countdown" | "countup" | null;
  timer_target_at?: string | null;
};

export const adminUpsertFeaturedEvent = createServerFn({ method: "POST" })
  .inputValidator((input: FeaturedEventInput) => {
    if (typeof input?.password !== "string" || !input?.title || !input?.link_url)
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const row = {
      title: data.title,
      subtitle: data.subtitle ?? null,
      image_url: data.image_url ?? null,
      link_url: data.link_url,
      kind: data.kind ?? "general",
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      priority: data.priority ?? 0,
      active: data.active ?? true,
      sport: data.sport ?? null,
      home_team: data.home_team ?? null,
      away_team: data.away_team ?? null,
      home_flag: data.home_flag ?? null,
      away_flag: data.away_flag ?? null,
      timer_mode: data.timer_mode ?? "none",
      timer_target_at: data.timer_target_at ?? null,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("featured_events").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("featured_events").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteFeaturedEvent = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => {
    if (typeof input?.password !== "string" || !input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin.from("featured_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListConfig = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const [flagsRes, eventsRes] = await Promise.all([
      supabaseAdmin.from("feature_flags").select("*").order("key"),
      supabaseAdmin.from("featured_events").select("*").order("priority", { ascending: false }),
    ]);
    if (flagsRes.error) throw new Error(flagsRes.error.message);
    if (eventsRes.error) throw new Error(eventsRes.error.message);
    return { flags: flagsRes.data || [], events: eventsRes.data || [] };
  });

// ===== Upload event poster image (data URL → storage bucket) =====

export const adminUploadEventPoster = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; filename: string; dataUrl: string }) => {
    if (
      typeof input?.password !== "string" ||
      typeof input?.dataUrl !== "string" ||
      !input.dataUrl.startsWith("data:")
    ) {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Expected base64 image data URL");
    const mime = match[1];
    const ext = mime.split("/")[1].replace("+xml", "").replace("jpeg", "jpg");
    const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("Image too large (max 5MB)");
    const safe = (data.filename || "poster").replace(/[^a-z0-9._-]/gi, "_").slice(0, 60);
    const path = `${Date.now()}-${safe}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("event-posters").upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    // Bucket is private (workspace blocks public buckets). Issue a long-lived
    // signed URL so the public site can render the poster image.
    const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("event-posters")
      .createSignedUrl(path, TEN_YEARS);
    if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "Could not sign URL");
    return { url: signed.signedUrl };
  });

export const adminFetchAnalytics = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) {
      throw new Error("Invalid admin password");
    }

    // Cap at 1000 sessions to limit DB IO.
    const { data: page, error } = await supabaseAdmin
      .from("visitor_sessions")
      .select("*")
      .order("last_seen_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const sessions: any[] = page || [];
    const totalVisitsCount = sessions.length;


    const now = Date.now();
    const onlineWindowMs = 60_000; // active in last 60s
    const onlineNow = (sessions || []).filter(
      (s: any) => now - new Date(s.last_seen_at).getTime() < onlineWindowMs,
    ).length;

    // Aggregate
    const watchCount = new Map<string, { title: string; kind: string; count: number }>();
    const watchByKind: Record<string, Map<string, { title: string; count: number }>> = {
      movie: new Map(),
      tv: new Map(),
      anime: new Map(),
      football: new Map(),
    };
    const searchCount = new Map<string, number>();
    const countryCount = new Map<string, number>();
    const dayCount = new Map<string, number>(); // YYYY-MM-DD => visits
    const dayMinutes = new Map<string, number>();
    const accounts = new Map<
      string,
      { name: string; sessions: number; lastSeen: string; totalSeconds: number }
    >();

    for (const s of sessions || []) {
      if (s.country) countryCount.set(s.country, (countryCount.get(s.country) || 0) + 1);
      const day = new Date(s.started_at).toISOString().slice(0, 10);
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
      dayMinutes.set(day, (dayMinutes.get(day) || 0) + Math.round((s.duration_seconds || 0) / 60));
      const accName = (s.name || "Anonymous").trim() || "Anonymous";
      const a = accounts.get(accName) || {
        name: accName,
        sessions: 0,
        lastSeen: s.last_seen_at,
        totalSeconds: 0,
      };
      a.sessions += 1;
      a.totalSeconds += s.duration_seconds || 0;
      if (new Date(s.last_seen_at) > new Date(a.lastSeen)) a.lastSeen = s.last_seen_at;
      accounts.set(accName, a);

      const watched = Array.isArray(s.watched)
        ? (s.watched as Array<{ id?: string; title?: string; kind?: string }>)
        : [];
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

    const topWatched = Array.from(watchCount.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const topByKind = Object.fromEntries(
      Object.entries(watchByKind).map(([k, m]) => [
        k,
        Array.from(m.entries())
          .map(([id, v]) => ({ id, title: v.title, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
      ]),
    ) as Record<string, Array<{ id: string; title: string; count: number }>>;
    const topSearches = Array.from(searchCount.entries())
      .map(([q, count]) => ({ q, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const topCountries = Array.from(countryCount.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    const dailyVisits = Array.from(dayCount.entries())
      .map(([day, visits]) => ({ day, visits, minutes: dayMinutes.get(day) || 0 }))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 14);
    const accountsList = Array.from(accounts.values()).sort((a, b) => a.name.localeCompare(b.name));

    const totalVisits = totalVisitsCount ?? (sessions || []).length;
    const avgDuration =
      totalVisits > 0
        ? Math.round(
            (sessions || []).reduce((acc: number, s: any) => acc + (s.duration_seconds || 0), 0) /
              totalVisits,
          )
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

// ===== Default sport server (per match link) =====
// Stored in feature_flags as:
//   key:         "default_sport_server"
//   enabled:     true/false (master on/off)
//   description: JSON array of { matchLink, serverIndex } entries

export const adminSetDefaultSportServer = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { password: string; matchLink: string; serverIndex: number; enabled: boolean }) => {
      if (
        typeof input?.password !== "string" ||
        typeof input?.matchLink !== "string" ||
        typeof input?.serverIndex !== "number" ||
        typeof input?.enabled !== "boolean"
      )
        throw new Error("Invalid input");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");

    // Load existing entries
    const { data: existing } = await supabaseAdmin
      .from("feature_flags")
      .select("description")
      .eq("key", "default_sport_server")
      .maybeSingle();

    let entries: Array<{ matchLink: string; serverIndex: number }> = [];
    try {
      if (existing?.description) entries = JSON.parse(existing.description);
    } catch {}

    // Upsert this match entry
    const idx = entries.findIndex((e) => e.matchLink === data.matchLink);
    if (idx >= 0) entries[idx] = { matchLink: data.matchLink, serverIndex: data.serverIndex };
    else entries.push({ matchLink: data.matchLink, serverIndex: data.serverIndex });

    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key: "default_sport_server",
          enabled: data.enabled,
          description: JSON.stringify(entries),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveSportServerEntry = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; matchLink: string }) => {
    if (typeof input?.password !== "string" || typeof input?.matchLink !== "string")
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { data: existing } = await supabaseAdmin
      .from("feature_flags")
      .select("description, enabled")
      .eq("key", "default_sport_server")
      .maybeSingle();
    let entries: Array<{ matchLink: string; serverIndex: number }> = [];
    try {
      if (existing?.description) entries = JSON.parse(existing.description);
    } catch {}
    entries = entries.filter((e) => e.matchLink !== data.matchLink);
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key: "default_sport_server",
          enabled: existing?.enabled ?? true,
          description: JSON.stringify(entries),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Recommended movie servers (🔥 badge) =====
// Stored in feature_flags as:
//   key:         "recommended_movie_servers"
//   enabled:     true => show fire badges; false => hide all
//   description: JSON array of provider IDs, e.g. ["videasy","vidsrcvip"]

export const adminSetRecommendedMovieServers = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; providers: string[]; enabled: boolean }) => {
    if (
      typeof input?.password !== "string" ||
      !Array.isArray(input?.providers) ||
      typeof input?.enabled !== "boolean"
    )
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const providers = Array.from(new Set(data.providers.filter((p) => typeof p === "string" && p)));
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key: "recommended_movie_servers",
          enabled: data.enabled,
          description: JSON.stringify(providers),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Recommended sport sources (🔥 badge, per match) =====
// Stored in feature_flags as:
//   key:         "recommended_sport_sources"
//   enabled:     master on/off
//   description: JSON array of { matchLink, indices: number[] } (1-based source numbers)

export const adminSetRecommendedSportSources = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; matchLink: string; indices: number[]; enabled: boolean }) => {
    if (
      typeof input?.password !== "string" ||
      typeof input?.matchLink !== "string" ||
      !Array.isArray(input?.indices) ||
      typeof input?.enabled !== "boolean"
    )
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { data: existing } = await supabaseAdmin
      .from("feature_flags")
      .select("description")
      .eq("key", "recommended_sport_sources")
      .maybeSingle();
    let entries: Array<{ matchLink: string; indices: number[] }> = [];
    try {
      if (existing?.description) entries = JSON.parse(existing.description);
    } catch {}
    const cleanIndices = Array.from(new Set(data.indices.filter((n) => Number.isFinite(n) && n >= 1).map((n) => Math.floor(n))));
    const idx = entries.findIndex((e) => e.matchLink === data.matchLink);
    if (cleanIndices.length === 0) {
      if (idx >= 0) entries.splice(idx, 1);
    } else if (idx >= 0) {
      entries[idx] = { matchLink: data.matchLink, indices: cleanIndices };
    } else {
      entries.push({ matchLink: data.matchLink, indices: cleanIndices });
    }
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key: "recommended_sport_sources",
          enabled: data.enabled,
          description: JSON.stringify(entries),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveRecommendedSportEntry = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; matchLink: string }) => {
    if (typeof input?.password !== "string" || typeof input?.matchLink !== "string")
      throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { data: existing } = await supabaseAdmin
      .from("feature_flags")
      .select("description, enabled")
      .eq("key", "recommended_sport_sources")
      .maybeSingle();
    let entries: Array<{ matchLink: string; indices: number[] }> = [];
    try {
      if (existing?.description) entries = JSON.parse(existing.description);
    } catch {}
    entries = entries.filter((e) => e.matchLink !== data.matchLink);
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(
        {
          key: "recommended_sport_sources",
          enabled: existing?.enabled ?? true,
          description: JSON.stringify(entries),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
