// Admin-only signed upload URL issuer. The downloads bucket is private and
// only the service role can write — we use a one-shot signed upload URL so the
// browser can upload large MP4s directly without proxying bytes through our
// server. Protected by the admin password.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const ADMIN_PASSWORD = "20071030";

const schema = z.object({
  password: z.string(),
  path: z.string().min(1).max(512).regex(/^[a-zA-Z0-9._/-]+$/),
});

export const Route = createFileRoute("/api/public/admin-storage-sign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
        const parsed = schema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "bad input" }, { status: 400 });
        if (parsed.data.password !== ADMIN_PASSWORD) return Response.json({ error: "unauthorized" }, { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .storage.from("downloads")
          .createSignedUploadUrl(parsed.data.path);
        if (error || !data) return Response.json({ error: error?.message || "sign failed" }, { status: 500 });
        return Response.json({ token: data.token, path: data.path });
      },
    },
  },
});
