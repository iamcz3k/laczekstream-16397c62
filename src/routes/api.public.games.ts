import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export type Game = {
  id: number;
  slug: string;
  title: string;
  url: string;
  image: string | null;
  cover: string | null;
  version: string | null;
  size: string | null;
  year: string | null;
  release_date: string | null;
  genres: string[];
  overview?: string | null;
};

type Upstream = {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
  developer: string;
  release_date: string;
};

const CATALOGUE = "https://www.freetogame.com/api/games";
const TTL = 60 * 60_000;

let cache: { at: number; games: Game[] } | null = null;
let inflight: Promise<Game[]> | null = null;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Artwork is served through our own endpoint so the browser only talks to this app. */
function proxied(url: string | null): string | null {
  if (!url) return null;
  return `/api/public/game-image?u=${encodeURIComponent(url)}`;
}

function normalise(row: Upstream): Game | null {
  if (!row?.title || !row?.game_url) return null;
  const image = proxied(row.thumbnail || null);
  const year = (row.release_date || "").slice(0, 4) || null;
  return {
    id: row.id,
    slug: slugify(row.title) || String(row.id),
    title: row.title.trim(),
    url: row.game_url,
    image,
    cover: image,
    version: row.platform?.includes("Browser") ? "Browser" : "PC",
    size: null,
    year: year && /^\d{4}$/.test(year) ? year : null,
    release_date: row.release_date || null,
    genres: row.genre ? [row.genre.trim()] : [],
    overview: row.short_description || null,
  };
}

async function load(): Promise<Game[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const r = await fetch(CATALOGUE, { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error(`catalogue ${r.status}`);
    const rows = (await r.json()) as Upstream[];
    const games = (Array.isArray(rows) ? rows : [])
      .map(normalise)
      .filter((g): g is Game => Boolean(g))
      .sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""));
    if (games.length) cache = { at: Date.now(), games };
    return games;
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matches(game: Game, q: string): boolean {
  const cq = compact(q);
  if (!cq) return true;
  const acronym = game.title
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toLowerCase())
    .join("");
  return (
    compact(game.title).includes(cq) ||
    compact(game.overview || "").includes(cq) ||
    game.genres.some((g) => compact(g).includes(cq)) ||
    acronym.includes(cq)
  );
}

function score(game: Game, q: string): number {
  const t = game.title.toLowerCase();
  const query = q.toLowerCase().trim();
  if (t === query) return 0;
  if (t.startsWith(query)) return 1;
  if (t.includes(query)) return 2;
  return 5;
}

export const Route = createFileRoute("/api/public/games")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const q = (new URL(request.url).searchParams.get("q") || "").trim();
        const now = Date.now();
        let games = cache?.games ?? [];

        if (!cache || now - cache.at > TTL) {
          try {
            const fresh = await load();
            if (fresh.length) games = fresh;
          } catch {
            /* keep whatever is cached */
          }
        }

        if (!games.length) {
          return Response.json(
            { ok: false, error: "The game library is temporarily unavailable — try again shortly.", games: [], total: 0 },
            { headers: CORS },
          );
        }

        const result = q
          ? games.filter((g) => matches(g, q)).sort((a, b) => score(a, q) - score(b, q))
          : games;

        return Response.json(
          { ok: true, search: Boolean(q), games: result, total: result.length },
          { headers: { ...CORS, "cache-control": "public, max-age=900" } },
        );
      },
    },
  },
});
