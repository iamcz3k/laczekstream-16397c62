import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ADMIN_PASSWORD, isTransientBackendError } from "@/lib/admin-shared";



// ===== Public: list active broadcasts targeted at the current visitor =====

const listSchema = z.object({
  session_key: z.string().min(4),
  name: z.string().nullable().optional(),
});

type BroadcastRow = {
  id: string;
  kind: string;
  message: string;
  target_name: string | null;
  target_session_key?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  created_at: string;
};

export const listMyBroadcasts = createServerFn({ method: "POST" })
  .inputValidator((d) => listSchema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: visitor } = await supabaseAdmin
        .from("visitor_sessions")
        .select("started_at")
        .eq("session_key", data.session_key)
        .maybeSingle();

      const { data: rows, error } = await supabaseAdmin
        .from("admin_broadcasts")
        .select("id,kind,message,target_name,target_session_key,image_url,image_path,created_at")
        .eq("active", true)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      const trimmedName = (data.name || "").trim();
      const ageMs = visitor?.started_at
        ? Date.now() - new Date(visitor.started_at as string).getTime()
        : 0;
      const oldEnoughForGeneralPopups = !!visitor?.started_at && ageMs >= 2 * 60 * 60 * 1000;
      const eligible = (rows || []).filter((r: BroadcastRow) => {
        if (r.target_session_key) {
          if (r.target_session_key !== data.session_key) return false;
          return r.kind === "review" ? oldEnoughForGeneralPopups : true;
        }
        if (!oldEnoughForGeneralPopups) return false;
        return !r.target_name || r.target_name.toLowerCase() === trimmedName.toLowerCase();
      });
      if (eligible.length === 0) return { items: [] as typeof eligible };
      const { data: resp, error: respError } = await supabaseAdmin
        .from("admin_broadcast_responses")
        .select("broadcast_id")
        .eq("session_key", data.session_key)
        .in(
          "broadcast_id",
          eligible.map((e) => e.id),
        );
      if (respError) throw new Error(respError.message);
      const seen = new Set((resp || []).map((r: { broadcast_id: string }) => r.broadcast_id));
      return { items: eligible.filter((e) => !seen.has(e.id)) };
    } catch (error) {
      if (!isTransientBackendError(error)) {
        console.warn("[broadcasts] listMyBroadcasts failed", error);
      }
      return { items: [] as BroadcastRow[] };
    }
  });

const respondSchema = z.object({
  broadcast_id: z.string().uuid(),
  session_key: z.string().min(4),
  name: z.string().max(80).nullable().optional(),
  response_text: z.string().max(2000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  dismissed: z.boolean().optional(),
});

export const respondBroadcast = createServerFn({ method: "POST" })
  .inputValidator((d) => respondSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("admin_broadcast_responses").upsert(
      {
        broadcast_id: data.broadcast_id,
        session_key: data.session_key,
        name: data.name ?? null,
        response_text: data.response_text ?? null,
        rating: data.rating ?? null,
        dismissed: data.dismissed ?? false,
      },
      { onConflict: "broadcast_id,session_key" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Admin =====

export const adminCreateBroadcast = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      kind: "notification" | "question" | "review";
      message: string;
      target_name?: string | null;
      target_session_key?: string | null;
      image_url?: string | null;
      image_path?: string | null;
    }) => {
      if (
        typeof input?.password !== "string" ||
        !["notification", "question", "review"].includes(input?.kind) ||
        typeof input?.message !== "string" ||
        input.message.trim().length === 0
      )
        throw new Error("Invalid input");
      return input;
    },
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    if (data.kind === "review" && data.target_session_key?.trim()) {
      const { data: visitor, error: visitorError } = await supabaseAdmin
        .from("visitor_sessions")
        .select("started_at")
        .eq("session_key", data.target_session_key.trim())
        .maybeSingle();
      if (visitorError) throw new Error(visitorError.message);
      const ageMs = visitor?.started_at
        ? Date.now() - new Date(visitor.started_at as string).getTime()
        : 0;
      if (ageMs < 2 * 60 * 60 * 1000) {
        throw new Error(
          "Review requests can only be sent to visitors who are at least 2 hours old.",
        );
      }
    }
    const { data: row, error } = await supabaseAdmin
      .from("admin_broadcasts")
      .insert({
        kind: data.kind,
        message: data.message.trim(),
        target_name: data.target_name?.trim() || null,
        target_session_key: data.target_session_key?.trim() || null,
        image_url: data.image_url?.trim() || null,
        image_path: data.image_path?.trim() || null,
        active: true,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string } | null)?.id ?? null };
  });

// Signed upload URL for broadcast preview images. Reuses the changelog-images
// bucket; objects live under `broadcasts/...` and are served via the same
// /api/public/changelog-image proxy.
export const adminSignBroadcastImageUpload = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; filename: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    if (!input?.filename || !/^[a-zA-Z0-9._-]+$/.test(input.filename))
      throw new Error("Invalid filename");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const ext = data.filename.includes(".") ? data.filename.split(".").pop() : "bin";
    const path = `broadcasts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("changelog-images")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message || "Failed to sign upload");
    return {
      path: signed.path,
      token: signed.token,
      publicUrl: `/api/public/changelog-image?p=${encodeURIComponent(signed.path)}`,
    };
  });

export const adminListBroadcasts = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const [bRes, rRes] = await Promise.all([
      supabaseAdmin.from("admin_broadcasts").select("*").order("created_at", { ascending: false }),
      supabaseAdmin
        .from("admin_broadcast_responses")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    if (bRes.error) throw new Error(bRes.error.message);
    if (rRes.error) throw new Error(rRes.error.message);
    return { broadcasts: bRes.data || [], responses: rRes.data || [] };
  });

export const adminDeleteBroadcast = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => {
    if (typeof input?.password !== "string" || !input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin.from("admin_broadcasts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleBroadcast = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; active: boolean }) => {
    if (typeof input?.password !== "string" || !input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin
      .from("admin_broadcasts")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
