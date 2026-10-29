// Public read / admin-protected write for the global Admin Panel v2 snapshot.
// The file is stored in the private `admin-v2-public` storage bucket as
// `config.json` and is served back through this proxy so every visitor can
// pull the latest snapshot at boot — no database tables involved.
import { createFileRoute } from "@tanstack/react-router";

const ADMIN_PASSWORD = "20071030";
const BUCKET = "admin-v2-public";
const FILE = "config.json";

export const Route = createFileRoute("/api/public/admin-v2-config")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(FILE);
        if (error || !data) {
          return Response.json({ snapshot: null, missing: true }, {
            headers: { "cache-control": "public, max-age=30" },
          });
        }
        const text = await data.text();
        try {
          const parsed = JSON.parse(text);
          return Response.json(parsed, {
            headers: { "cache-control": "public, max-age=30" },
          });
        } catch {
          return Response.json({ snapshot: null, missing: true }, { status: 200 });
        }
      },
      POST: async ({ request }) => {
        let body: { password?: string; snapshot?: unknown };
        try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
        if (!body || body.password !== ADMIN_PASSWORD) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        if (!body.snapshot || typeof body.snapshot !== "object") {
          return Response.json({ error: "missing snapshot" }, { status: 400 });
        }
        const payload = JSON.stringify({
          snapshot: body.snapshot,
          published_at: new Date().toISOString(),
        });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(FILE, new Blob([payload], { type: "application/json" }), {
            upsert: true,
            contentType: "application/json",
          });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true, bytes: payload.length });
      },
    },
  },
});
