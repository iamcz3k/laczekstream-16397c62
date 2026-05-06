import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
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
    await supabaseAdmin
      .from("visitor_sessions")
      .update({
        duration_seconds: data.duration_seconds,
        last_seen_at: new Date().toISOString(),
        current_path: data.current_path ?? undefined,
        name: data.name ?? undefined,
      })
      .eq("session_key", data.session_key);
    return { ok: true };
  });

const pathSchema = z.object({ session_key: z.string(), current_path: z.string(), label: z.string().optional() });
export const trackPath = createServerFn({ method: "POST" })
  .inputValidator((d) => pathSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("visitor_sessions")
      .select("page_views, path_log")
      .eq("session_key", data.session_key)
      .maybeSingle();
    const log = Array.isArray(row?.path_log) ? (row!.path_log as unknown[]) : [];
    log.unshift({ path: data.current_path, label: data.label || data.current_path, at: new Date().toISOString() });
    await supabaseAdmin
      .from("visitor_sessions")
      .update({
        current_path: data.current_path,
        page_views: (row?.page_views ?? 0) + 1,
        last_seen_at: new Date().toISOString(),
        path_log: log.slice(0, 200) as never,
      })
      .eq("session_key", data.session_key);
    return { ok: true };
  });

const watchSchema = z.object({
  session_key: z.string(),
  entry: z.object({ kind: z.string(), id: z.string(), title: z.string().optional() }),
});
export const trackWatchFn = createServerFn({ method: "POST" })
  .inputValidator((d) => watchSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("visitor_sessions")
      .select("watched")
      .eq("session_key", data.session_key)
      .maybeSingle();
    const watched = Array.isArray(row?.watched) ? (row!.watched as unknown[]) : [];
    watched.unshift({ ...data.entry, at: new Date().toISOString() });
    await supabaseAdmin
      .from("visitor_sessions")
      .update({ watched: watched.slice(0, 50) as never })
      .eq("session_key", data.session_key);
    return { ok: true };
  });

const searchSchema = z.object({ session_key: z.string(), q: z.string().min(1) });
export const trackSearchFn = createServerFn({ method: "POST" })
  .inputValidator((d) => searchSchema.parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("visitor_sessions")
      .select("searches")
      .eq("session_key", data.session_key)
      .maybeSingle();
    const searches = Array.isArray(row?.searches) ? (row!.searches as unknown[]) : [];
    searches.unshift({ q: data.q, at: new Date().toISOString() });
    await supabaseAdmin
      .from("visitor_sessions")
      .update({ searches: searches.slice(0, 30) as never })
      .eq("session_key", data.session_key);
    return { ok: true };
  });