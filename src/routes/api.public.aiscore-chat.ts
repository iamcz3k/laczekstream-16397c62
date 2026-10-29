import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type Msg = { id: string; name: string; message: string; created_at: string };

// Cache per (home,away) — aiscore search/scrape costs Firecrawl credits.
const cache = new Map<string, { at: number; data: { messages: Msg[]; sourceUrl: string | null } }>();
const TTL = 2_500;

// Also cache the resolved aiscore URL for a much longer period (URLs don't change).
const urlCache = new Map<string, { at: number; url: string | null }>();
const URL_TTL = 6 * 60 * 60 * 1000;

async function firecrawl<T = unknown>(path: string, body: unknown): Promise<T> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) throw new Error("FIRECRAWL_API_KEY not configured");
  const r = await fetch(`https://api.firecrawl.dev/v2${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`firecrawl ${r.status}: ${await r.text().catch(() => "")}`);
  return r.json() as Promise<T>;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function findAiscoreUrl(home: string, away: string): Promise<string | null> {
  const cacheKey = `${norm(home)}__${norm(away)}`;
  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() - cached.at < URL_TTL) return cached.url;

  const queries = [
    `aiscore ${home} vs ${away}`,
    `aiscore.com ${home} ${away} live`,
  ];
  const hHome = norm(home);
  const hAway = norm(away);
  for (const q of queries) {
    try {
      const j = await firecrawl<{ data?: { web?: Array<{ url?: string; title?: string }> } }>("/search", {
        query: q,
        limit: 8,
      });
      const list = j?.data?.web || [];
      // Prefer /match-<...>/<slug> live pages (not h2h, not head-to-head).
      const candidates = list
        .map((r) => r.url || "")
        .filter((u) => /aiscore\.com\/match-/.test(u))
        .filter((u) => !/\/(h2h|head-to-head|lineups|prediction|standings)/.test(u))
        .map((u) => u.replace("www.aiscore.com", "m.aiscore.com"));
      // Score candidates by containing both team tokens in path.
      const ranked = candidates
        .map((u) => {
          const path = norm(new URL(u).pathname);
          let score = 0;
          for (const t of hHome.split(" ")) if (t && path.includes(t)) score++;
          for (const t of hAway.split(" ")) if (t && path.includes(t)) score++;
          return { u, score };
        })
        .sort((a, b) => b.score - a.score);
      if (ranked[0]) {
        urlCache.set(cacheKey, { at: Date.now(), url: ranked[0].u });
        return ranked[0].u;
      }
    } catch {}
  }
  urlCache.set(cacheKey, { at: Date.now(), url: null });
  return null;
}

function parseChatFromHtml(html: string): Msg[] {
  const out: Msg[] = [];
  if (!html) return out;
  // Each chat message in aiscore looks like:
  //   <span ... class="name">USERNAME :</span> <span ... class="text">MESSAGE</span>
  // class="text" may contain <img> emoji tags — strip them and keep alt-like text.
  const re = /class="name"[^>]*>([^<]+?)\s*:?\s*<\/span>\s*<span[^>]*class="text"[^>]*>([\s\S]*?)<\/span>/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(html)) !== null) {
    const name = m[1].replace(/\s+/g, " ").trim();
    let raw = m[2];
    // replace emoji images with a short token from filename
    raw = raw.replace(/<img[^>]*chat_emoji\/([a-z0-9_-]+)\.[a-z]+[^>]*>/gi, (_x, n) => ` :${n}: `);
    // strip remaining tags
    const text = raw
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    if (!name || !text) continue;
    if (text.length > 400) continue;
    out.push({
      id: `as-${i++}`,
      name: name.slice(0, 40),
      message: text,
      created_at: new Date().toISOString(),
    });
  }
  return out.slice(-80);
}

async function scrapeChat(url: string): Promise<Msg[]> {
  // Click the Chat tab (2nd .van-tab), wait for messages to load, then scrape HTML.
  const body = {
    url,
    formats: ["html"],
    onlyMainContent: false,
    waitFor: 1200,
    actions: [
      { type: "click", selector: ".van-tab:nth-of-type(2)" },
      { type: "wait", milliseconds: 2500 },
      { type: "scrape" },
    ],
  };
  try {
    const j = await firecrawl<{
      success?: boolean;
      data?: { html?: string };
      html?: string;
    }>("/scrape", body);
    const html = j?.data?.html || j?.html || "";
    return parseChatFromHtml(html);
  } catch {
    // Retry once without actions in case Chat tab missing (chat embedded inline)
    try {
      const j = await firecrawl<{ data?: { html?: string }; html?: string }>("/scrape", {
        url: url.endsWith("/chat") ? url : `${url}/chat`,
        formats: ["html"],
        onlyMainContent: false,
        waitFor: 6000,
      });
      const html = j?.data?.html || j?.html || "";
      return parseChatFromHtml(html);
    } catch {
      return [];
    }
  }
}

export const Route = createFileRoute("/api/public/aiscore-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const home = (url.searchParams.get("home") || "").trim();
        const away = (url.searchParams.get("away") || "").trim();
        if (!home || !away) {
          return Response.json({ ok: false, error: "home & away required" }, { status: 400, headers: CORS });
        }
        const key = `${norm(home)}__${norm(away)}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < TTL) {
          return Response.json({ ok: true, cached: true, ...hit.data }, { headers: CORS });
        }
        try {
          const sourceUrl = await findAiscoreUrl(home, away);
          if (!sourceUrl) {
            const data = { messages: [], sourceUrl: null };
            cache.set(key, { at: Date.now(), data });
            return Response.json({ ok: true, ...data, note: "no aiscore match found" }, { headers: CORS });
          }
          const messages = await scrapeChat(sourceUrl);
          const data = { messages, sourceUrl };
          cache.set(key, { at: Date.now(), data });
          return Response.json(
            { ok: true, ...data },
            { headers: { ...CORS, "cache-control": "public, max-age=30" } },
          );
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          return Response.json(
            { ok: false, error: err, messages: [], sourceUrl: null },
            { status: 200, headers: CORS },
          );
        }
      },
    },
  },
});
