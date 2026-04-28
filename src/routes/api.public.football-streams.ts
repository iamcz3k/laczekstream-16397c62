import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/public/football-streams")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams;
        const mode = params.get("mode") === "detail" ? "detail" : "matches";
        const id = params.get("id") || "";
        if (mode === "detail" && !/^[a-z0-9-]{3,180}$/i.test(id)) {
          return Response.json({ success: false, data: null }, { status: 400, headers: CORS_HEADERS });
        }

        const upstreamUrl = `https://api.sportsrc.org/?data=${mode}&category=football${mode === "detail" ? `&id=${encodeURIComponent(id)}` : ""}`;
        const upstream = await fetch(upstreamUrl, { headers: { "user-agent": "Mozilla/5.0", accept: "application/json" } });
        const body = await upstream.text();
        return new Response(body, {
          status: upstream.status,
          headers: { ...CORS_HEADERS, "content-type": "application/json", "cache-control": "public, max-age=30" },
        });
      },
    },
  },
});