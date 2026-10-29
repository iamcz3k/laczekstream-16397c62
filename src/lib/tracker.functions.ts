import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isTransientBackendError, logTrackerError } from "@/lib/admin-shared";



const startSchema = z.object({
  session_key: z.string().min(4),
  name: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  ip: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  device: z.string().nullable().optional(),
  current_path: z.string().nullable().optional(),
});

export const startVisit = createServerFn({ method: "POST" })
  .inputValidator((d) => startSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("visitor_sessions")
        .upsert(
          {
            ...data,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "session_key" },
        )
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!row) return { id: null as string | null };
      return { id: (row as { id: string }).id };
    } catch (error) {
      logTrackerError("startVisit", error);
      return { id: null as string | null };
    }
  });

const beatSchema = z.object({
  session_key: z.string(),
  duration_seconds: z.number().int().nonnegative(),
  current_path: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
});

export const heartbeat = createServerFn({ method: "POST" })
  .inputValidator((d) => beatSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("visitor_sessions")
        .update({
          duration_seconds: data.duration_seconds,
          last_seen_at: new Date().toISOString(),
          current_path: data.current_path ?? undefined,
          name: data.name ?? undefined,
        })
        .eq("session_key", data.session_key);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      logTrackerError("heartbeat", error);
      return { ok: false };
    }
  });

const pathSchema = z.object({ session_key: z.string(), current_path: z.string(), label: z.string().optional() });
export const trackPath = createServerFn({ method: "POST" })
  .inputValidator((d) => pathSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error: readError } = await supabaseAdmin
        .from("visitor_sessions")
        .select("page_views, path_log")
        .eq("session_key", data.session_key)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      const log = Array.isArray(row?.path_log) ? (row!.path_log as unknown[]) : [];
      log.unshift({ path: data.current_path, label: data.label || data.current_path, at: new Date().toISOString() });
      const { error } = await supabaseAdmin
        .from("visitor_sessions")
        .update({
          current_path: data.current_path,
          page_views: (row?.page_views ?? 0) + 1,
          last_seen_at: new Date().toISOString(),
          path_log: log.slice(0, 200) as never,
        })
        .eq("session_key", data.session_key);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      logTrackerError("trackPath", error);
      return { ok: false };
    }
  });

const watchSchema = z.object({
  session_key: z.string(),
  entry: z.object({ kind: z.string(), id: z.string(), title: z.string().optional() }),
});
export const trackWatchFn = createServerFn({ method: "POST" })
  .inputValidator((d) => watchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error: readError } = await supabaseAdmin
        .from("visitor_sessions")
        .select("watched")
        .eq("session_key", data.session_key)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      const watched = Array.isArray(row?.watched) ? (row!.watched as unknown[]) : [];
      watched.unshift({ ...data.entry, at: new Date().toISOString() });
      const { error } = await supabaseAdmin
        .from("visitor_sessions")
        .update({ watched: watched.slice(0, 50) as never })
        .eq("session_key", data.session_key);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      logTrackerError("trackWatch", error);
      return { ok: false };
    }
  });

const searchSchema = z.object({ session_key: z.string(), q: z.string().min(1) });
export const trackSearchFn = createServerFn({ method: "POST" })
  .inputValidator((d) => searchSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error: readError } = await supabaseAdmin
        .from("visitor_sessions")
        .select("searches")
        .eq("session_key", data.session_key)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      const searches = Array.isArray(row?.searches) ? (row!.searches as unknown[]) : [];
      searches.unshift({ q: data.q, at: new Date().toISOString() });
      const { error } = await supabaseAdmin
        .from("visitor_sessions")
        .update({ searches: searches.slice(0, 30) as never })
        .eq("session_key", data.session_key);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      logTrackerError("trackSearch", error);
      return { ok: false };
    }
  });

const eventSchema = z.object({
  session_key: z.string(),
  label: z.string().min(1).max(200),
  category: z.string().max(40).optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});
export const trackEventFn = createServerFn({ method: "POST" })
  .inputValidator((d) => eventSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error: readError } = await supabaseAdmin
        .from("visitor_sessions")
        .select("events")
        .eq("session_key", data.session_key)
        .maybeSingle();
      if (readError) throw new Error(readError.message);
      const events = Array.isArray((row as { events?: unknown[] } | null)?.events)
        ? ((row as { events: unknown[] }).events as unknown[])
        : [];
      events.unshift({
        label: data.label,
        category: data.category || "action",
        meta: data.meta || null,
        at: new Date().toISOString(),
      });
      const { error } = await supabaseAdmin
        .from("visitor_sessions")
        .update({ events: events.slice(0, 150) as never, last_seen_at: new Date().toISOString() })
        .eq("session_key", data.session_key);
      if (error) throw new Error(error.message);
      return { ok: true };
    } catch (error) {
      logTrackerError("trackEvent", error);
      return { ok: false };
    }
  });