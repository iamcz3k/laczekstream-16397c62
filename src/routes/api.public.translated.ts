// Catalogue browser for the Ugandan translated-movie library published at
// jtzmag.com. This endpoint only reads the public listing/detail pages and
// returns catalogue metadata (title, poster, VJ, genre, year, rating,
// synopsis). Playback stays on the source site — no media files are proxied
// or re-hosted here.
import { createFileRoute } from "@tanstack/react-router";

const ORIGIN = "https://jtzmag.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export type TranslatedItem = {
  id: string;
  title: string;
  poster: string | null;
  vj: string | null;
  genre: string | null;
  year: string | null;
  rating: number | null;
  isNew: boolean;
  hd: boolean;
};

export type TranslatedDetail = TranslatedItem & {
  description: string | null;
  status: string | null;
  sourceUrl: string;
  related: TranslatedItem[];
};

const cache = new Map<string, { at: number; body: string }>();
const TTL = 10 * 60 * 1000;

async function getPage(path: string): Promise<string> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.body;
  const res = await fetch(`${ORIGIN}/${path}`, {
    headers: { "user-agent": UA, accept: "text/html" },
  });
  if (!res.ok) throw new Error(`source responded ${res.status}`);
  const body = await res.text();
  cache.set(path, { at: Date.now(), body });
  if (cache.size > 120) cache.delete(cache.keys().next().value as string);
  return body;
}

function decode(s: string): string {
  return s
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function strip(html: string): string {
  return decode(html.replace(/<[^>]+>/g, " "));
}

const CARD_RE = /<a href="movie_details\.php\?id=(\d+)"[^>]*class="movie-card"[\s\S]*?<\/a>/g;

function parseCards(html: string): TranslatedItem[] {
  const out: TranslatedItem[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(CARD_RE)) {
    const id = m[1];
    const block = m[0];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const poster = /class="movie-poster"[^>]*src="([^"]+)"/.exec(block)?.[1] ?? null;
    const title = strip(/class="movie-title"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1] ?? "");
    const vj = strip(/class="movie-vj"[^>]*>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "") || null;
    const genre = strip(/class="movie-genre-tag"[^>]*>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "") || null;
    const year = strip(/class="movie-year"[^>]*>([\s\S]*?)<\/span>/.exec(block)?.[1] ?? "") || null;
    const ratingRaw = /class="badge-rating"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1];
    const rating = ratingRaw ? Number(strip(ratingRaw).replace(/[^\d.]/g, "")) || null : null;
    if (!title) continue;
    out.push({
      id,
      title,
      poster,
      vj,
      genre,
      year,
      rating,
      isNew: /badge-new/.test(block),
      hd: /badge-hd/.test(block),
    });
  }
  return out;
}

function parsePages(html: string): number {
  let max = 1;
  for (const m of html.matchAll(/[?&]page=(\d+)/g)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}

function listPath(source: string, value: string, page: number): string {
  const p = page > 1 ? `&page=${page}` : "";
  switch (source) {
    case "genre":
      return `genre.php?name=${encodeURIComponent(value)}${p}`;
    case "vj":
      return `vj.php?name=${encodeURIComponent(value)}${p}`;
    case "search":
      return `allfilms.php?search=${encodeURIComponent(value)}${p}`;
    case "latest":
      return page > 1 ? `allfilms.php?page=${page}` : "index.php";
    default:
      return `allfilms.php?page=${page}`;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
}

export const Route = createFileRoute("/api/public/translated")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const type = url.searchParams.get("type") ?? "list";

        try {
          if (type === "detail") {
            const id = (url.searchParams.get("id") ?? "").replace(/\D/g, "");
            if (!id) return json({ ok: false, error: "missing id" }, 400);
            const html = await getPage(`movie_details.php?id=${id}`);
            const body = html.slice(Math.max(0, html.indexOf('<div class="page-body"')));

            const meta: Record<string, string> = {};
            for (const m of html.matchAll(
              /<span class="label">([^<]+)<\/span>\s*<span class="value[^"]*">([\s\S]*?)<\/span>/g,
            )) {
              meta[decode(m[1] ?? "").toLowerCase()] = strip(m[2] ?? "");
            }

            const title = strip(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html)?.[1] ?? "");
            const poster = /poster="([^"]+)"/.exec(html)?.[1] ?? null;
            const ratingRaw = /class="num">([\d.]+)</.exec(html)?.[1];
            const descRaw = /class="desc-block"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/.exec(body)?.[1];

            const detail: TranslatedDetail = {
              id,
              title: title || "Untitled",
              poster,
              vj: meta["vj / narrator"] ?? meta["vj"] ?? null,
              genre: meta["genre"] ?? null,
              year: meta["year"] ?? null,
              rating: ratingRaw ? Number(ratingRaw) : null,
              isNew: /New Release/i.test(meta["status"] ?? ""),
              hd: true,
              description: descRaw ? strip(descRaw) : null,
              status: meta["status"] ?? null,
              sourceUrl: `${ORIGIN}/movie_details.php?id=${id}`,
              related: parseCards(html).filter((i) => i.id !== id).slice(0, 12),
            };
            return json({ ok: true, movie: detail });
          }

          const source = url.searchParams.get("source") ?? "latest";
          const value = (url.searchParams.get("value") ?? "").slice(0, 80);
          const page = Math.min(Math.max(Number(url.searchParams.get("page") ?? 1) || 1, 1), 200);
          const html = await getPage(listPath(source, value, page));
          const items = parseCards(html);
          return json({ ok: true, page, totalPages: parsePages(html), count: items.length, items });
        } catch (err) {
          return json(
            { ok: false, error: err instanceof Error ? err.message : "failed", items: [] },
            502,
          );
        }
      },
    },
  },
});
