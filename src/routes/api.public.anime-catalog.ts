import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const querySchema = z.object({
  provider: z.enum(["kitsu", "jikan"]),
  path: z.string().min(1).max(500).refine((value) => value.startsWith("/")),
});

const PROVIDERS = {
  kitsu: "https://kitsu.io/api/edge",
  jikan: "https://api.jikan.moe/v4",
} as const;

export const Route = createFileRoute("/api/public/anime-catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = querySchema.safeParse({
          provider: url.searchParams.get("provider"),
          path: url.searchParams.get("path"),
        });
        if (!parsed.success) return Response.json({ error: "Invalid anime request" }, { status: 400 });

        const upstreamUrl = `${PROVIDERS[parsed.data.provider]}${parsed.data.path}`;
        try {
          const response = await fetch(upstreamUrl, {
            headers: { accept: "application/vnd.api+json, application/json" },
            signal: AbortSignal.timeout(8000),
          });
          const body = await response.text();
          return new Response(body, {
            status: response.status,
            headers: {
              "content-type": response.headers.get("content-type") || "application/json",
              "cache-control": response.ok ? "public, max-age=300, s-maxage=1800" : "no-store",
            },
          });
        } catch {
          return Response.json({ error: "Anime provider unavailable" }, { status: 502 });
        }
      },
    },
  },
});