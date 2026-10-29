// Looks up a freely downloadable copy of a film in the Internet Archive's
// public "feature_films" collection (public-domain / openly licensed films).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type ArchiveDoc = { identifier: string; title?: string; year?: string | number };
type ArchiveFile = { name: string; format?: string; size?: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const findArchiveDownload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().min(1).max(200), year: z.string().max(10).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const wanted = norm(data.title);
    const q = `title:(${wanted}) AND collection:feature_films AND mediatype:movies`;
    const url =
      `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}` +
      `&fl[]=identifier&fl[]=title&fl[]=year&rows=15&output=json`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return { found: false as const };
      const json = (await res.json()) as { response?: { docs?: ArchiveDoc[] } };
      const docs = (json.response?.docs ?? []).filter((d) => d.title && norm(d.title) === wanted);
      const year = data.year?.slice(0, 4);
      docs.sort((a, b) => {
        const ay = String(a.year ?? "") === year ? 0 : 1;
        const by = String(b.year ?? "") === year ? 0 : 1;
        return ay - by;
      });
      for (const doc of docs.slice(0, 5)) {
        const meta = await fetch(`https://archive.org/metadata/${encodeURIComponent(doc.identifier)}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!meta.ok) continue;
        const m = (await meta.json()) as { files?: ArchiveFile[] };
        const videos = (m.files ?? []).filter((f) => /\.mp4$/i.test(f.name));
        if (!videos.length) continue;
        const best =
          videos.find((f) => f.format === "h.264") ??
          videos.find((f) => /h\.264/i.test(f.format ?? "")) ??
          videos[0];
        return {
          found: true as const,
          url: `https://archive.org/download/${encodeURIComponent(doc.identifier)}/${best.name
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
          pageUrl: `https://archive.org/details/${encodeURIComponent(doc.identifier)}`,
          sizeBytes: Number(best.size ?? 0) || null,
        };
      }
      return { found: false as const };
    } catch {
      return { found: false as const };
    }
  });
