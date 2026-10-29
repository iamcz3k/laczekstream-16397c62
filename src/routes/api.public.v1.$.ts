import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key",
  "Access-Control-Max-Age": "86400",
};

const TMDB_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const STREAMED = "https://streamed.pk";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });
}

function mapMedia(m: any, kind: "movie" | "tv") {
  return {
    id: m.id,
    type: kind,
    title: m.title || m.name,
    overview: m.overview,
    year: (m.release_date || m.first_air_date || "").slice(0, 4) || null,
    rating: m.vote_average ?? null,
    poster: m.poster_path ? `${IMG}${m.poster_path}` : null,
    backdrop: m.backdrop_path ? `${IMG}${m.backdrop_path}` : null,
    watch_url: `https://laczekstream.lovable.app/watch/${kind}/${m.id}`,
  };
}

async function tmdb(path: string) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${TMDB}${path}${sep}api_key=${TMDB_KEY}`);
  if (!r.ok) throw new Error(`TMDB error ${r.status}`);
  return r.json();
}

const DOCS = {
  name: "LaCzek Stream Public API",
  version: "1.0.0",
  base_url: "https://laczekstream.lovable.app/api/public/v1",
  auth: "Send your key as ?key=YOUR_KEY or the X-Api-Key header.",
  endpoints: [
    { path: "/status", auth: false, description: "Health check + version info." },
    { path: "/docs", auth: false, description: "This machine-readable documentation." },
    { path: "/movies/trending", auth: true, description: "Trending movies this week." },
    { path: "/movies/popular?page=1", auth: true, description: "Popular movies." },
    { path: "/movies/search?q=friday", auth: true, description: "Search movies by title." },
    { path: "/tv/trending", auth: true, description: "Trending TV series this week." },
    { path: "/tv/search?q=breaking", auth: true, description: "Search TV series." },
    { path: "/search?q=avatar", auth: true, description: "Multi search (movies + series)." },
    { path: "/sports/matches", auth: true, description: "All upcoming/today sport matches." },
    { path: "/sports/live", auth: true, description: "Matches that are live right now." },
    { path: "/custom/{slug}", auth: true, description: "Admin-defined pass-through endpoint." },
  ],
};

async function resolveKey(key: string | null, path: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!key) return { ok: false as const, status: 401, message: "Missing API key. Pass ?key= or X-Api-Key header." };
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, key, active, request_count")
    .eq("key", key)
    .maybeSingle();
  if (error) return { ok: false as const, status: 503, message: "Key store unavailable" };
  if (!data) return { ok: false as const, status: 403, message: "Invalid API key" };
  if (!data.active) return { ok: false as const, status: 403, message: "API key disabled" };
  void supabaseAdmin
    .from("api_keys")
    .update({ request_count: Number(data.request_count || 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);
  void supabaseAdmin.from("api_request_logs").insert({ api_key: key, path, status: 200 }).then(() => undefined);
  return { ok: true as const };
}

async function handle(request: Request, splat: string) {
  const url = new URL(request.url);
  const path = "/" + (splat || "").replace(/^\/+/, "");
  const q = url.searchParams.get("q") || url.searchParams.get("query") || "";
  const page = url.searchParams.get("page") || "1";

  if (path === "/status" || path === "/")
    return json({ ok: true, service: DOCS.name, version: DOCS.version, time: new Date().toISOString() });
  if (path === "/docs") return json(DOCS);

  const key = url.searchParams.get("key") || request.headers.get("x-api-key");
  const auth = await resolveKey(key, path);
  if (!auth.ok) return json({ error: auth.message }, auth.status);

  try {
    if (path === "/movies/trending") {
      const d = await tmdb("/trending/movie/week");
      return json({ results: (d.results || []).map((m: any) => mapMedia(m, "movie")) });
    }
    if (path === "/movies/popular") {
      const d = await tmdb(`/movie/popular?page=${page}`);
      return json({ page: Number(page), results: (d.results || []).map((m: any) => mapMedia(m, "movie")) });
    }
    if (path === "/movies/search") {
      if (!q) return json({ error: "Missing ?q=" }, 400);
      const d = await tmdb(`/search/movie?query=${encodeURIComponent(q)}`);
      return json({ query: q, results: (d.results || []).map((m: any) => mapMedia(m, "movie")) });
    }
    if (path === "/tv/trending") {
      const d = await tmdb("/trending/tv/week");
      return json({ results: (d.results || []).map((m: any) => mapMedia(m, "tv")) });
    }
    if (path === "/tv/search") {
      if (!q) return json({ error: "Missing ?q=" }, 400);
      const d = await tmdb(`/search/tv?query=${encodeURIComponent(q)}`);
      return json({ query: q, results: (d.results || []).map((m: any) => mapMedia(m, "tv")) });
    }
    if (path === "/search") {
      if (!q) return json({ error: "Missing ?q=" }, 400);
      const d = await tmdb(`/search/multi?query=${encodeURIComponent(q)}&include_adult=false`);
      const results = (d.results || [])
        .filter((m: any) => m.media_type === "movie" || m.media_type === "tv")
        .map((m: any) => mapMedia(m, m.media_type));
      return json({ query: q, results });
    }
    if (path === "/sports/matches" || path === "/sports/live") {
      const target = path === "/sports/live" ? "/api/matches/live" : "/api/matches/all-today";
      const r = await fetch(`${STREAMED}${target}`, {
        headers: { "user-agent": "Mozilla/5.0", accept: "application/json" },
      });
      const list = r.ok ? await r.json() : [];
      return json({
        results: (Array.isArray(list) ? list : []).map((m: any) => ({
          id: m.id,
          title: m.title,
          category: m.category,
          date: m.date,
          teams: m.teams ?? null,
          poster: m.poster ? `${STREAMED}${String(m.poster).startsWith("/") ? "" : "/api/images/poster/"}${m.poster}` : null,
          watch_url: `https://laczekstream.lovable.app/football-stream/${m.id}`,
        })),
      });
    }
    if (path.startsWith("/custom/")) {
      const slug = path.slice("/custom/".length);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: ep } = await supabaseAdmin
        .from("api_endpoints")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!ep || !ep.active) return json({ error: "Custom endpoint not found" }, 404);
      const passthrough = new URL(ep.upstream_url);
      url.searchParams.forEach((v, k) => {
        if (k !== "key") passthrough.searchParams.set(k, v);
      });
      const headers: Record<string, string> = { accept: "application/json" };
      if (ep.upstream_header_name && ep.upstream_header_value)
        headers[ep.upstream_header_name] = ep.upstream_header_value;
      const r = await fetch(passthrough.toString(), { headers });
      const text = await r.text();
      void supabaseAdmin
        .from("api_endpoints")
        .update({ request_count: Number(ep.request_count || 0) + 1 })
        .eq("id", ep.id)
        .then(() => undefined);
      return new Response(text, {
        status: r.status,
        headers: { "content-type": r.headers.get("content-type") || "application/json", ...CORS },
      });
    }
  } catch (e) {
    return json({ error: (e as Error).message || "Upstream failure" }, 502);
  }

  return json({ error: `Unknown endpoint ${path}`, see: `${DOCS.base_url}/docs` }, 404);
}

export const Route = createFileRoute("/api/public/v1/$")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => handle(request, (params as { _splat?: string })._splat || ""),
    },
  },
});
