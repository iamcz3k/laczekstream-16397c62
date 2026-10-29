// Public read-through proxy for announcement preview images. The bucket is
// private (workspace blocks public buckets) so we stream bytes via the admin
// client. Path is restricted so the route only ever serves files inside the
// changelog-images bucket.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/changelog-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("p");
        if (!path || path.length > 512 || !/^[a-zA-Z0-9._/-]+$/.test(path)) {
          return new Response("bad path", { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage
          .from("changelog-images")
          .download(path);
        if (error || !data) return new Response("not found", { status: 404 });
        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": data.type || "image/jpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
