import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ADMIN_PASSWORD, CHANGELOG_KINDS as KINDS } from "@/lib/admin-shared";


// ===== Public: anyone can read active entries =====
export const listChangelog = createServerFn({ method: "GET" }).handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("admin_changelog")
    .select("id,kind,title,detail,image_url,published_at")
    .eq("active", true)
    .order("published_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return { items: data || [] };
});

// ===== Admin =====
const createSchema = z.object({
  password: z.string(),
  kind: z.enum(KINDS),
  title: z.string().min(1).max(120),
  detail: z.string().max(2000).optional().nullable(),
  image_url: z.string().min(1).max(1024).optional().nullable(),
  image_path: z.string().max(512).regex(/^[a-zA-Z0-9._/-]+$/).optional().nullable(),
});

export const adminCreateChangelog = createServerFn({ method: "POST" })
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { data: row, error } = await supabaseAdmin
      .from("admin_changelog")
      .insert({
        kind: data.kind,
        title: data.title.trim(),
        detail: data.detail?.trim() || null,
        image_url: data.image_url || null,
        image_path: data.image_path || null,
        active: true,
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { id: (row as { id: string } | null)?.id ?? null };
  });

export const adminListChangelog = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { data: rows, error } = await supabaseAdmin
      .from("admin_changelog")
      .select("*")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: rows || [] };
  });

export const adminDeleteChangelog = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) => {
    if (typeof input?.password !== "string" || !input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    // Best-effort: also remove the uploaded preview pic if any.
    const { data: row } = await supabaseAdmin
      .from("admin_changelog")
      .select("image_path")
      .eq("id", data.id)
      .maybeSingle();
    const imagePath = (row as { image_path: string | null } | null)?.image_path;
    if (imagePath) {
      await supabaseAdmin.storage.from("changelog-images").remove([imagePath]).catch(() => {});
    }
    const { error } = await supabaseAdmin.from("admin_changelog").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleChangelog = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; active: boolean }) => {
    if (typeof input?.password !== "string" || !input?.id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { error } = await supabaseAdmin
      .from("admin_changelog")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ===== Admin: signed upload URL for the changelog-images bucket =====
const signSchema = z.object({
  password: z.string(),
  filename: z.string().min(1).max(120).regex(/^[a-zA-Z0-9._-]+$/),
});

export const adminSignChangelogImageUpload = createServerFn({ method: "POST" })
  .inputValidator((d) => signSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const ext = data.filename.includes(".") ? data.filename.split(".").pop() : "bin";
    const safeExt = (ext || "bin").toLowerCase().slice(0, 8);
    const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;
    const { data: signed, error } = await supabaseAdmin.storage
      .from("changelog-images")
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message || "sign failed");
    return {
      token: signed.token,
      path: signed.path,
      // Public proxy URL the user-facing overlay will hit.
      publicUrl: `/api/public/changelog-image?p=${encodeURIComponent(signed.path)}`,
    };
  });
