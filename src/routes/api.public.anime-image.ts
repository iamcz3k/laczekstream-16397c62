import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, Range",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/anime-image")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url") || "";
        if (!/^https:\/\/[^/]*otakudesu\.[^/]+\//i.test(url)) {
          return new Response("Blocked", { status: 400, headers: CORS_HEADERS });
        }

        const upstream = await fetch(url, {
          headers: {
            "user-agent": "Mozilla/5.0",
            referer: "https://otakudesu.blog/",
            accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          },
        });

        const headers = new Headers(CORS_HEADERS);
        headers.set("content-type", upstream.headers.get("content-type") || "image/jpeg");
        headers.set("cache-control", "public, max-age=86400");
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});