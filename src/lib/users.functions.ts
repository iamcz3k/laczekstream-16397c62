import { createServerFn } from "@tanstack/react-start";

const ADMIN_PASSWORD = "czek2991";

export type AdminUserRow = {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_blocked: boolean;
  blocked_at: string | null;
  blocked_reason: string | null;
  created_at: string;
  is_admin: boolean;
  sessions: number;
  total_seconds: number;
  last_seen: string | null;
};

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (typeof input?.password !== "string") throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }): Promise<{ users: AdminUserRow[] }> => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, rolesRes, sessionsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("visitor_sessions").select("user_id, duration_seconds, last_seen_at").not("user_id", "is", null),
    ]);
    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const adminSet = new Set<string>(((rolesRes.data || []) as Array<{ user_id: string; role: string }>).filter((r) => r.role === "admin").map((r) => r.user_id));
    const sessAgg = new Map<string, { sessions: number; total: number; last: string | null }>();
    for (const s of (sessionsRes.data || []) as Array<{ user_id: string; duration_seconds: number | null; last_seen_at: string }>) {
      if (!s.user_id) continue;
      const cur = sessAgg.get(s.user_id) || { sessions: 0, total: 0, last: null };
      cur.sessions += 1;
      cur.total += s.duration_seconds || 0;
      if (!cur.last || new Date(s.last_seen_at) > new Date(cur.last)) cur.last = s.last_seen_at;
      sessAgg.set(s.user_id, cur);
    }

    const users: AdminUserRow[] = ((profilesRes.data || []) as Array<Record<string, unknown>>).map((p) => {
      const id = String(p.id);
      const agg = sessAgg.get(id);
      return {
        id,
        email: String(p.email || ""),
        username: String(p.username || ""),
        full_name: String(p.full_name || ""),
        is_blocked: Boolean(p.is_blocked),
        blocked_at: typeof p.blocked_at === "string" ? p.blocked_at : null,
        blocked_reason: typeof p.blocked_reason === "string" ? p.blocked_reason : null,
        created_at: String(p.created_at || ""),
        is_admin: adminSet.has(id),
        sessions: agg?.sessions || 0,
        total_seconds: agg?.total || 0,
        last_seen: agg?.last || null,
      };
    });
    return { users };
  });

export const adminSetBlocked = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; user_id: string; blocked: boolean; reason?: string }) => {
    if (typeof input?.password !== "string" || !input?.user_id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_blocked: data.blocked,
        blocked_at: data.blocked ? new Date().toISOString() : null,
        blocked_reason: data.blocked ? (data.reason ?? null) : null,
      })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetRole = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; user_id: string; admin: boolean }) => {
    if (typeof input?.password !== "string" || !input?.user_id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { error } = await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; user_id: string }) => {
    if (typeof input?.password !== "string" || !input?.user_id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkMyBlockStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { user_id: string }) => {
    if (!input?.user_id) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("profiles")
      .select("is_blocked, blocked_reason")
      .eq("id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { blocked: Boolean(p?.is_blocked), reason: p?.blocked_reason ?? null };
  });