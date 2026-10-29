import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ADMIN_PASSWORD } from "@/lib/admin-shared";
import type { ApiKeyRow, ApiEndpointRow, ApiRequestLogRow } from "@/lib/api-admin-types";

export const apiAdminOverview = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => z.object({ password: z.string() }).parse(input))
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const [keys, endpoints, logs] = await Promise.all([
      db.from("api_keys").select("*").order("created_at", { ascending: false }),
      db.from("api_endpoints").select("*").order("created_at", { ascending: false }),
      db
        .from("api_request_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (keys.error) throw new Error(keys.error.message);
    return {
      keys: (keys.data ?? []) as ApiKeyRow[],
      endpoints: (endpoints.data ?? []) as ApiEndpointRow[],
      logs: (logs.data ?? []) as ApiRequestLogRow[],
      totals: {
        keys: keys.data?.length ?? 0,
        activeKeys: (keys.data ?? []).filter((k: ApiKeyRow) => k.active).length,
        endpoints: endpoints.data?.length ?? 0,
        requests: (keys.data ?? []).reduce((a: number, k: ApiKeyRow) => a + Number(k.request_count || 0), 0),
      },
    };
  });

export const apiCreateKey = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; label: string; owner?: string; limit?: number }) =>
    z
      .object({
        password: z.string(),
        label: z.string().min(1),
        owner: z.string().optional(),
        limit: z.number().int().positive().max(1000000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const key = `lcz_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await db.from("api_keys").insert({
      key,
      label: data.label,
      owner_name: data.owner ?? null,
      rate_limit_per_hour: data.limit ?? 1000,
    });
    if (error) throw new Error(error.message);
    return { key };
  });

export const apiToggleKey = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; active: boolean }) =>
    z.object({ password: z.string(), id: z.string(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const { error } = await db
      .from("api_keys")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apiDeleteKey = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const { error } = await db.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apiSaveEndpoint = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      password: string;
      id?: string;
      slug: string;
      description?: string;
      upstream_url: string;
      upstream_header_name?: string;
      upstream_header_value?: string;
    }) =>
      z
        .object({
          password: z.string(),
          id: z.string().optional(),
          slug: z
            .string()
            .min(1)
            .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes"),
          description: z.string().optional(),
          upstream_url: z.string().url(),
          upstream_header_name: z.string().optional(),
          upstream_header_value: z.string().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const row = {
      slug: data.slug,
      description: data.description ?? null,
      upstream_url: data.upstream_url,
      upstream_header_name: data.upstream_header_name || null,
      upstream_header_value: data.upstream_header_value || null,
    };
    const { error } = data.id
      ? await db.from("api_endpoints").update(row).eq("id", data.id)
      : await db.from("api_endpoints").insert(row);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apiToggleEndpoint = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string; active: boolean }) =>
    z.object({ password: z.string(), id: z.string(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const { error } = await db
      .from("api_endpoints")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apiDeleteEndpoint = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; id: string }) =>
    z.object({ password: z.string(), id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (table: string) => any };
    const { error } = await db.from("api_endpoints").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
