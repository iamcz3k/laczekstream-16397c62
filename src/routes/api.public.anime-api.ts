import { createFileRoute } from "@tanstack/react-router";

// Server-side proxy to the anime catalogue used by the working LACZEK clone.
const UPSTREAM = "https://wajik-anime-api.vercel.app/oploverz";

function isAllowedPath(path: string) {
  try {
    const url = new URL(path, "https://anime.local");
    if (url.origin !== "https://anime.local") return false;
    if (!/^\/(home|search|anime\/[a-z0-9-]+|episode\/[a-z0-9-]+|server\/[a-z0-9-]+)$/i.test(url.pathname)) return false;
    return [...url.searchParams.keys()].every((key) => key === "q");
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/anime-api")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path") || "";
        if (!isAllowedPath(path)) {
          return new Response(JSON.stringify({ error: "bad path" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }
        try {
          const upstream = await fetch(`${UPSTREAM}${path}`, {
            headers: {
              "user-agent": "Mozilla/5.0",
              accept: "application/json,*/*;q=0.8",
            },
            signal: AbortSignal.timeout(12000),
          });
          const body = await upstream.text();
          return new Response(body, {
            status: upstream.status,
            headers: {
              "content-type": upstream.headers.get("content-type") || "application/json",
              "cache-control": "public, max-age=300, s-maxage=300",
            },
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: "upstream failed", detail: String(err) }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
