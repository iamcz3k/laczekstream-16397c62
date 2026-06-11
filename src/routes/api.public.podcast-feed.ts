import { createFileRoute } from "@tanstack/react-router";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
};

function isSafeUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    // Block private/internal IPs and loopback
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "[::1]" ||
      /^0\./.test(host) ||
      host === "metadata.google.internal" ||
      host === "169.254.169.254"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/podcast-feed")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url") || "";
        if (!/^https?:\/\//i.test(url) || url.length > 2000 || !isSafeUrl(url)) {
          return Response.json(
            { error: "Invalid feed URL" },
            { status: 400, headers: CORS_HEADERS },
          );
        }
        try {
          const upstream = await fetch(url, {
            headers: {
              accept: "application/rss+xml, application/xml, text/xml, */*",
              "user-agent": "LACZEK STREAM podcast player",
            },
          });
          if (!upstream.ok)
            return Response.json(
              { error: "Feed unavailable" },
              { status: upstream.status, headers: CORS_HEADERS },
            );
          const text = await upstream.text();
          return new Response(text, {
            headers: {
              ...CORS_HEADERS,
              "content-type": "application/xml; charset=utf-8",
              "cache-control": "public, max-age=300",
            },
          });
        } catch {
          return Response.json(
            { error: "Feed unavailable" },
            { status: 502, headers: CORS_HEADERS },
          );
        }
      },
    },
  },
});
