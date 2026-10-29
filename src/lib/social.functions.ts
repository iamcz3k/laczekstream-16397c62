import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ADMIN_PASSWORD } from "@/lib/admin-shared";
import { newSocialCode, type SocialOrder } from "@/lib/social-shared";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabaseAdmin as any).from("social_orders");
}
function guard(pw: string) {
  if (pw !== ADMIN_PASSWORD) throw new Error("Wrong password");
}

export const socialTrack = createServerFn({ method: "GET" })
  .inputValidator((i: { code: string }) => z.object({ code: z.string().min(3).max(20) }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await (await db())
      .select("code,platform,service,target_url,quantity,delivered,status,reason,network,created_at,updated_at")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as Omit<SocialOrder, "id" | "customer" | "note"> | null;
  });

const publicOrderSchema = z.object({
  platform: z.enum(["TikTok", "Instagram", "X", "YouTube"]),
  service: z.enum(["Followers", "Likes", "Comments", "Subscribers"]),
  target_url: z.string().url().max(500),
  quantity: z.number().int().min(1).max(10_000_000),
});

export const socialPublicCreate = createServerFn({ method: "POST" })
  .inputValidator((i: { platform: string; service: string; target_url: string; quantity: number }) => publicOrderSchema.parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await (await db())
      .insert({
        ...data,
        code: newSocialCode(),
        delivered: 0,
        status: "pending",
        reason: "Request received and awaiting processing",
        network: "Global",
        customer: null,
        note: null,
      })
      .select("code,platform,service,target_url,quantity,delivered,status,reason,network,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);
    return row as Omit<SocialOrder, "id" | "customer" | "note">;
  });

export const socialList = createServerFn({ method: "POST" })
  .inputValidator((i: { pw: string }) => z.object({ pw: z.string() }).parse(i))
  .handler(async ({ data }) => {
    guard(data.pw);
    const { data: rows, error } = await (await db()).select("*").order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return (rows ?? []) as SocialOrder[];
  });

const orderSchema = z.object({
  platform: z.string().min(1).max(20),
  service: z.string().min(1).max(30),
  target_url: z.string().url().max(500),
  quantity: z.number().int().min(1).max(10_000_000),
  delivered: z.number().int().min(0).max(10_000_000),
  status: z.string().max(20),
  reason: z.string().max(200).nullable(),
  network: z.string().max(40).nullable(),
  customer: z.string().max(120).nullable(),
  note: z.string().max(500).nullable(),
});

export const socialCreate = createServerFn({ method: "POST" })
  .inputValidator((i: { pw: string; order: z.infer<typeof orderSchema> }) =>
    z.object({ pw: z.string(), order: orderSchema }).parse(i),
  )
  .handler(async ({ data }) => {
    guard(data.pw);
    const { data: row, error } = await (await db())
      .insert({ ...data.order, code: newSocialCode() })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as SocialOrder;
  });

export const socialUpdate = createServerFn({ method: "POST" })
  .inputValidator((i: { pw: string; id: string; patch: Partial<z.infer<typeof orderSchema>> }) =>
    z.object({ pw: z.string(), id: z.string().uuid(), patch: orderSchema.partial() }).parse(i),
  )
  .handler(async ({ data }) => {
    guard(data.pw);
    const { error } = await (await db())
      .update({ ...data.patch, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const socialDelete = createServerFn({ method: "POST" })
  .inputValidator((i: { pw: string; id: string }) => z.object({ pw: z.string(), id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    guard(data.pw);
    const { error } = await (await db()).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
