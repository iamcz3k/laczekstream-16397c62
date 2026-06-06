import { createServerFn } from "@tanstack/react-start";

const ADMIN_PASSWORD = "czek2991";

export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((input: { session_key: string; user_name?: string | null; rating: number; message: string; user_agent?: string | null; country?: string | null }) => {
    if (!input?.session_key || typeof input.rating !== "number" || !input.message) throw new Error("Invalid input");
    if (input.rating < 1 || input.rating > 5) throw new Error("Rating must be 1-5");
    if (input.message.trim().length < 10) throw new Error("Message too short");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("site_reviews").insert({
      session_key: data.session_key,
      user_name: data.user_name || null,
      rating: data.rating,
      message: data.message.slice(0, 2000),
      user_agent: data.user_agent || null,
      country: data.country || null,
    });
    if (error) throw new Error(error.message);
    // mark any pending request as fulfilled
    await supabaseAdmin.from("review_requests").update({ fulfilled: true }).eq("session_key", data.session_key).eq("fulfilled", false);
    return { ok: true };
  });

export const checkReviewRequest = createServerFn({ method: "POST" })
  .inputValidator((input: { session_key: string }) => {
    if (!input?.session_key) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("review_requests")
      .select("id")
      .eq("session_key", data.session_key)
      .eq("fulfilled", false)
      .limit(1);
    return { requested: !!(rows && rows.length) };
  });

export const adminListReviews = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => {
    if (input?.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    return input;
  })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("site_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { reviews: data || [] };
  });

export const adminRequestReview = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; session_key: string }) => {
    if (input?.password !== ADMIN_PASSWORD) throw new Error("Invalid admin password");
    if (!input.session_key) throw new Error("Invalid input");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("review_requests").insert({ session_key: data.session_key, fulfilled: false });
    if (error) throw new Error(error.message);
    return { ok: true };
  });