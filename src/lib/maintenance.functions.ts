import { createServerFn } from "@tanstack/react-start";

// ===== Maintenance Mode =====

export type MaintenanceSettings = {
  enabled: boolean;
  message: string;
};

export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const admin = supabaseAdmin as any;

  const { data, error } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "maintenance_mode")
    .single();

  if (error || !data) {
    return { enabled: false, message: "The site is under maintenance. Please try again later." };
  }

  const value = data.value as MaintenanceSettings;
  return { enabled: value.enabled ?? false, message: value.message ?? "" };
});

export const adminSetMaintenanceMode = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; enabled: boolean; message?: string }) => {
    if (typeof input?.password !== "string" || typeof input?.enabled !== "boolean") {
      throw new Error("Invalid input");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
    if (!ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD environment variable is not set");
    if (data.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { error } = await admin
      .from("site_settings")
      .update({
        value: {
          enabled: data.enabled,
          message: data.message ?? "The site is under maintenance. Please try again later.",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("key", "maintenance_mode");

    if (error) throw new Error(error.message);
    return { ok: true };
  });
