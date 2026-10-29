// Server functions for the downloads feature. Imports of @/integrations/supabase/client.server
// are deferred to inside .handler() so client bundles don't pull service-role into the graph.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_PASSWORD } from "@/lib/admin-shared";

type DownloadableTitleRow = {
  id: string;
  title: string;
  kind: "movie" | "tv" | "anime";
  season: number | null;
  episode: number | null;
  storage_path: string;
  size_bytes: number;
  mime: string;
  poster_url: string | null;
};

type DownloadableTitleInsert = Omit<DownloadableTitleRow, "id"> & {
  tmdb_id?: string;
  description?: string | null;
};

export const listDownloadableTitles = createServerFn({ method: "GET" })
  .inputValidator((d) =>
    z.object({ kind: z.string().optional(), tmdb_id: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("downloadable_titles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.tmdb_id) q = q.eq("tmdb_id", data.tmdb_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { titles: rows || [] };
  });

export const getSignedDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: title, error } = await supabaseAdmin
      .from("downloadable_titles")
      .select("storage_path, size_bytes, mime, title")
      .eq("id", data.title_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!title) throw new Error("Title not found");

    const row = title as unknown as DownloadableTitleRow;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("downloads")
      .createSignedUrl(row.storage_path, 60 * 60);
    if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "Could not sign URL");

    // Record the user is downloading this title (idempotent upsert).
    await supabaseAdmin.from("user_downloads").upsert(
      {
        user_id: context.userId,
        title_id: data.title_id,
        status: "downloading",
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id,title_id" },
    );

    return { url: signed.signedUrl, size_bytes: row.size_bytes, mime: row.mime };
  });

export const getBrowserDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        kind: z.enum(["movie", "tv", "anime"]),
        tmdb_id: z.string().min(1).max(40),
        season: z.number().int().positive().optional(),
        episode: z.number().int().positive().optional(),
        filename: z.string().min(1).max(180),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("downloadable_titles")
      .select("id, title, kind, season, episode, storage_path, size_bytes, mime, poster_url")
      .eq("kind", data.kind)
      .eq("tmdb_id", data.tmdb_id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data.kind === "tv" || data.kind === "anime") {
      if (data.season) q = q.eq("season", data.season);
      if (data.episode) q = q.eq("episode", data.episode);
    }
    const { data: title, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    const cleanName = data.filename.replace(/[\\/\0]/g, "_");

    if (!title) {
      // No file in our storage bucket — return a public mirror URL so the
      // browser can still start a native download. Client treats this as
      // a successful download start.
      const fallbackUrl =
        data.kind === "tv"
          ? `https://dl.vidsrc.vip/tv/${data.tmdb_id}/${data.season ?? 1}/${data.episode ?? 1}`
          : `https://dl.vidsrc.vip/movie/${data.tmdb_id}`;
      return {
        url: fallbackUrl,
        title_id: "",
        title: cleanName.replace(/\.mp4$/i, ""),
        size_bytes: 0,
        mime: "video/mp4",
        poster_url: null,
        fallback: true as const,
      };
    }
    const row = title as unknown as DownloadableTitleRow;

    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from("downloads")
      .createSignedUrl(row.storage_path, 60 * 60 * 6, { download: cleanName });
    if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "Could not start download");


    return {
      url: signed.signedUrl,
      title_id: row.id,
      title: row.title,
      size_bytes: Number(row.size_bytes || 0),
      mime: row.mime || "video/mp4",
      poster_url: row.poster_url || null,
    };
  });

export const markDownloadComplete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title_id: z.string().uuid(), bytes: z.number().int().nonnegative() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_downloads")
      .update({ status: "completed", bytes_downloaded: data.bytes, completed_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("title_id", data.title_id);
    return { ok: true };
  });

export const removeUserDownload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ title_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_downloads")
      .delete()
      .eq("user_id", context.userId)
      .eq("title_id", data.title_id);
    return { ok: true };
  });

export const listUserDownloads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_downloads")
      .select("*, downloadable_titles(*)")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { downloads: data || [] };
  });


export const adminCreateDownloadableTitle = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        password: z.string(),
        kind: z.enum(["movie", "tv", "anime"]),
        title: z.string().min(1).max(255),
        tmdb_id: z.string().optional(),
        season: z.number().int().optional(),
        episode: z.number().int().optional(),
        storage_path: z.string().min(1),
        size_bytes: z.number().int().nonnegative(),
        mime: z.string().default("video/mp4"),
        poster_url: z.string().url().optional().nullable(),
        description: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { password: _pw, ...row } = data;
    const { data: inserted, error } = await supabaseAdmin
      .from("downloadable_titles")
      .insert(row as DownloadableTitleInsert)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { title: inserted };
  });

export const adminDeleteDownloadableTitle = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Best-effort: get path, then delete row + storage object.
    const { data: t } = await supabaseAdmin.from("downloadable_titles").select("storage_path").eq("id", data.id).maybeSingle();
    const title = t as unknown as Pick<DownloadableTitleRow, "storage_path"> | null;
    if (title?.storage_path) {
      await supabaseAdmin.storage.from("downloads").remove([title.storage_path]);
    }
    const { error } = await supabaseAdmin.from("downloadable_titles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
