import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/anime-video")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url).searchParams.get("url") || "";
        if (!/^https:\/\/(www\.)?mp4upload\.com\/embed-/i.test(url)) {
          return Response.json({ url: "" }, { status: 400 });
        }

        try {
          const res = await fetch(url, {
            headers: {
              "user-agent": "Mozilla/5.0",
              accept: "text/html,application/xhtml+xml",
            },
          });
          if (!res.ok) {
            console.warn("[anime-video] upstream returned", res.status);
            return Response.json({ url: "" }, { status: 502 });
          }
          const html = await res.text();
          const direct = html.match(/https?:\/\/[^"']+\/video\.mp4[^"']*/i)?.[0] || "";
          return Response.json({ url: direct });
        } catch (err) {
          console.error("[anime-video] proxy error", err);
          return Response.json({ url: "", error: "Upstream fetch failed" }, { status: 502 });
        }
      },
    },
  },
});