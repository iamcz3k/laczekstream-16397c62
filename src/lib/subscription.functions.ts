import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ADMIN_PASSWORD } from "@/lib/admin-shared";

export const redeemSubCode = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; device_id: string; device_label?: string }) =>
    z
      .object({
        code: z.string().min(3).max(64),
        device_id: z.string().min(6).max(80),
        device_label: z.string().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: row, error } = await supabaseAdmin
      .from("sub_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That code does not exist");
    if (!row.active) throw new Error("That code has been disabled");

    const { data: existing } = await supabaseAdmin
      .from("sub_redemptions")
      .select("*")
      .eq("code_id", row.id);
    const mine = (existing ?? []).find((r) => r.device_id === data.device_id);

    if (!mine && (existing?.length ?? 0) >= row.max_devices) {
      throw new Error(`This code is already used on ${row.max_devices} devices`);
    }

    const expires =
      row.duration_days > 0
        ? new Date(Date.now() + row.duration_days * 86400000).toISOString()
        : null;

    if (mine) {
      await supabaseAdmin
        .from("sub_redemptions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", mine.id);
      return {
        plan: row.plan,
        code,
        expires_at: mine.expires_at,
        devices_used: existing?.length ?? 1,
        max_devices: row.max_devices,
      };
    }

    const { error: insErr } = await supabaseAdmin.from("sub_redemptions").insert({
      code_id: row.id,
      device_id: data.device_id,
      device_label: data.device_label ?? null,
      expires_at: expires,
    });
    if (insErr) throw new Error(insErr.message);

    return {
      plan: row.plan,
      code,
      expires_at: expires,
      devices_used: (existing?.length ?? 0) + 1,
      max_devices: row.max_devices,
    };
  });

export const checkSubStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; device_id: string }) =>
    z.object({ code: z.string(), device_id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: row } = await supabaseAdmin
      .from("sub_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (!row || !row.active) return { valid: false as const };
    const { data: red } = await supabaseAdmin
      .from("sub_redemptions")
      .select("*")
      .eq("code_id", row.id)
      .eq("device_id", data.device_id)
      .maybeSingle();
    if (!red) return { valid: false as const };
    if (red.expires_at && new Date(red.expires_at).getTime() < Date.now()) {
      return { valid: false as const };
    }
    await supabaseAdmin
      .from("sub_redemptions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", red.id);
    return { valid: true as const, plan: row.plan, expires_at: red.expires_at };
  });

/* ------------------------------ admin side ------------------------------ */

function guard(password: string) {
  if (password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
}

export const subAdminOverview = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => z.object({ password: z.string() }).parse(input))
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [codes, redemptions, payments] = await Promise.all([
      supabaseAdmin.from("sub_codes").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("sub_redemptions").select("*").order("activated_at", { ascending: false }),
      supabaseAdmin.from("sub_payments").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    if (codes.error) throw new Error(codes.error.message);
    const pay = payments.data ?? [];
    return {
      codes: codes.data ?? [],
      redemptions: redemptions.data ?? [],
      payments: pay,
      totals: {
        codes: codes.data?.length ?? 0,
        activeCodes: (codes.data ?? []).filter((c) => c.active).length,
        devices: redemptions.data?.length ?? 0,
        paid: pay.filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount || 0), 0),
        pending: pay.filter((p) => p.status === "pending").length,
      },
    };
  });

export const subCreateCode = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      plan: string;
      duration_days: number;
      max_devices: number;
      quantity?: number;
      buyer_name?: string;
      buyer_contact?: string;
      note?: string;
    }) =>
      z
        .object({
          password: z.string(),
          plan: z.enum(["noads", "allaccess"]),
          duration_days: z.number().int().min(0).max(3650),
          max_devices: z.number().int().min(1).max(20),
          quantity: z.number().int().min(1).max(50).optional(),
          buyer_name: z.string().max(80).optional(),
          buyer_contact: z.string().max(80).optional(),
          note: z.string().max(200).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const make = () => {
      let s = "";
      for (let i = 0; i < 10; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
      return `LCZ-${s.slice(0, 5)}-${s.slice(5)}`;
    };
    const rows = Array.from({ length: data.quantity ?? 1 }, () => ({
      code: make(),
      plan: data.plan,
      duration_days: data.duration_days,
      max_devices: data.max_devices,
      buyer_name: data.buyer_name ?? null,
      buyer_contact: data.buyer_contact ?? null,
      note: data.note ?? null,
    }));
    const { error } = await supabaseAdmin.from("sub_codes").insert(rows);
    if (error) throw new Error(error.message);
    return { codes: rows.map((r) => r.code) };
  });

export const subToggleCode = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; active: boolean }) =>
    z.object({ password: z.string(), id: z.string(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sub_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const subDeleteCode = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sub_codes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const subRevokeDevice = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sub_redemptions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const subSavePayment = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      id?: string;
      buyer_name?: string;
      buyer_contact?: string;
      plan: string;
      amount: number;
      currency: string;
      method?: string;
      status: string;
      note?: string;
    }) =>
      z
        .object({
          password: z.string(),
          id: z.string().optional(),
          buyer_name: z.string().max(80).optional(),
          buyer_contact: z.string().max(80).optional(),
          plan: z.enum(["noads", "allaccess"]),
          amount: z.number().min(0),
          currency: z.string().min(1).max(8),
          method: z.string().max(40).optional(),
          status: z.enum(["pending", "paid", "refunded", "failed"]),
          note: z.string().max(300).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = {
      buyer_name: data.buyer_name ?? null,
      buyer_contact: data.buyer_contact ?? null,
      plan: data.plan,
      amount: data.amount,
      currency: data.currency,
      method: data.method ?? null,
      status: data.status,
      note: data.note ?? null,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("sub_payments").update(row).eq("id", data.id)
      : await supabaseAdmin.from("sub_payments").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const subDeletePayment = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    guard(data.password);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sub_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
