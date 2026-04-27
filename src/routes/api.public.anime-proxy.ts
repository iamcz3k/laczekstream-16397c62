import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/anime-proxy")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url") || "";
        if (!/^https:\/\/[^/]*mp4upload\.com(?::\d+)?\/d\//i.test(url)) {
          return new Response("Blocked", { status: 400 });
        }

        const range = request.headers.get("range") || undefined;
        const upstream = await fetch(url, {
          headers: {
            "user-agent": "Mozilla/5.0",
            referer: "https://www.mp4upload.com/",
            origin: "https://www.mp4upload.com",
            accept: "video/webm,video/mp4,video/*;q=0.9,*/*;q=0.8",
            ...(range ? { range } : {}),
          },
        });

        const headers = new Headers();
        for (const key of ["content-type", "content-length", "content-range", "accept-ranges"])
          if (upstream.headers.get(key)) headers.set(key, upstream.headers.get(key)!);
        headers.set("cache-control", "public, max-age=3600");
        return new Response(upstream.body, { status: upstream.status, headers });
      },
    },
  },
});