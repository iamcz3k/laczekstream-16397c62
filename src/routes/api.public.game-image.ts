import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = /^https:\/\/(www\.)?freetogame\.com\//i;

export const Route = createFileRoute("/api/public/game-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const target = new URL(request.url).searchParams.get("u") || "";
        if (!ALLOWED.test(target)) return new Response("Bad request", { status: 400 });
        try {
          const upstream = await fetch(target, {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
              accept: "image/avif,image/webp,image/*,*/*;q=0.8",
            },
          });
          if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
          return new Response(upstream.body, {
            headers: {
              "content-type": upstream.headers.get("content-type") || "image/jpeg",
              "cache-control": "public, max-age=86400, immutable",
              "access-control-allow-origin": "*",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
