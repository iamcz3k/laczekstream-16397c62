import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const BASE = "https://www.fotmob.com/api/data";
const HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "application/json, text/plain, */*",
  "accept-language": "en-US,en;q=0.9",
  referer: "https://www.fotmob.com/",
  origin: "https://www.fotmob.com",
};

function ymd(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function fmFetch(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: HEADERS });
  if (!r.ok) throw new Error(`fotmob ${r.status}`);
  return r.json();
}

export const Route = createFileRoute("/api/public/fotmob")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("mode") || "matches";
        try {
          if (mode === "matches") {
            const date = url.searchParams.get("date") || ymd();
            const data = await fmFetch(`/matches?date=${encodeURIComponent(date)}&timezone=UTC`);
            return Response.json(
              { ok: true, data },
              { headers: { ...CORS, "cache-control": "public, max-age=30" } },
            );
          }
          if (mode === "match") {
            const id = url.searchParams.get("id");
            if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "bad id" }, { status: 400, headers: CORS });
            const data = await fmFetch(`/matchDetails?matchId=${id}`);
            return Response.json({ ok: true, data }, { headers: { ...CORS, "cache-control": "public, max-age=20" } });
          }
          if (mode === "league") {
            const id = url.searchParams.get("id");
            if (!id || !/^\d+$/.test(id)) return Response.json({ ok: false, error: "bad id" }, { status: 400, headers: CORS });
            const data = await fmFetch(`/leagues?id=${id}`);
            return Response.json({ ok: true, data }, { headers: { ...CORS, "cache-control": "public, max-age=120" } });
          }
          return Response.json({ ok: false, error: "unknown mode" }, { status: 400, headers: CORS });
        } catch (err: any) {
          return Response.json({ ok: false, error: String(err?.message || err) }, { status: 502, headers: CORS });
        }
      },
    },
  },
});
