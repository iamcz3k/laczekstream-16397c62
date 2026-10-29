import { useEffect, useState } from "react";
import { Film, Plus, Trash2, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminCreateDownloadableTitle, adminDeleteDownloadableTitle, listDownloadableTitles } from "@/lib/downloads.functions";
import { formatBytes } from "./StorageMeter";

type Row = {
  id: string;
  title: string;
  kind: "movie" | "tv" | "anime";
  tmdb_id?: string | null;
  season?: number | null;
  episode?: number | null;
  storage_path: string;
  size_bytes: number;
  mime: string;
  poster_url?: string | null;
};

export function UploadVideoForm({ password }: { password: string }) {
  const [list, setList] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    kind: "movie" as "movie" | "tv" | "anime",
    tmdb_id: "",
    season: "",
    episode: "",
    poster_url: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);

  async function refresh() {
    const r = await listDownloadableTitles({ data: {} });
    setList((r.titles || []) as Row[]);
  }
  useEffect(() => { void refresh(); }, []);

  async function submit() {
    setError(null);
    if (!file || !form.title) { setError("Pick a file and enter a title"); return; }
    setBusy(true);
    setProgress(0);
    try {
      const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
      const path = `${form.kind}/${Date.now()}-${safeName}`;
      // Upload directly with the admin's user session client. Bucket allows
      // service_role only by default — we rely on storage policies via admin.
      // Workaround: use signed upload URL from the server.
      const sign = await fetch("/api/public/admin-storage-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, path }),
      });
      const signed = await sign.json();
      if (!signed?.token) throw new Error(signed?.error || "Could not get upload URL");

      const { error: upErr } = await supabase.storage
        .from("downloads")
        .uploadToSignedUrl(path, signed.token, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw upErr;
      setProgress(100);

      await adminCreateDownloadableTitle({
        data: {
          password,
          title: form.title,
          kind: form.kind,
          tmdb_id: form.tmdb_id || undefined,
          season: form.season ? Number(form.season) : undefined,
          episode: form.episode ? Number(form.episode) : undefined,
          storage_path: path,
          size_bytes: file.size,
          mime: file.type || "video/mp4",
          poster_url: form.poster_url || null,
          description: form.description || null,
        },
      });

      setFile(null);
      setForm({ title: "", kind: "movie", tmdb_id: "", season: "", episode: "", poster_url: "", description: "" });
      await refresh();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this downloadable title and its file?")) return;
    await adminDeleteDownloadableTitle({ data: { password, id } });
    await refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black uppercase tracking-wider">Downloadable videos</h2>
      </div>

      <div className="grid gap-2 rounded-2xl border border-border bg-secondary/40 p-3 sm:grid-cols-2">
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className="rounded-lg bg-background px-3 py-2 text-xs" />
        <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as any })} className="rounded-lg bg-background px-3 py-2 text-xs">
          <option value="movie">Movie</option>
          <option value="tv">TV episode</option>
          <option value="anime">Anime episode</option>
        </select>
        <input value={form.tmdb_id} onChange={(e) => setForm({ ...form, tmdb_id: e.target.value })} placeholder="TMDB id (links to streaming title)" className="rounded-lg bg-background px-3 py-2 text-xs" />
        <input value={form.poster_url} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} placeholder="Poster URL (optional)" className="rounded-lg bg-background px-3 py-2 text-xs" />
        {form.kind !== "movie" && (
          <>
            <input value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} placeholder="Season #" className="rounded-lg bg-background px-3 py-2 text-xs" />
            <input value={form.episode} onChange={(e) => setForm({ ...form, episode: e.target.value })} placeholder="Episode #" className="rounded-lg bg-background px-3 py-2 text-xs" />
          </>
        )}
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="sm:col-span-2 rounded-lg bg-background px-3 py-2 text-xs" rows={2} />
        <label className="sm:col-span-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-3 text-xs font-bold text-muted-foreground hover:border-primary hover:text-foreground">
          <Upload className="h-3.5 w-3.5" />
          {file ? `${file.name} (${formatBytes(file.size)})` : "Pick MP4 file"}
          <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {busy && (
          <div className="sm:col-span-2 text-xs text-muted-foreground">
            <Loader2 className="mr-2 inline h-3.5 w-3.5 animate-spin" /> Uploading… {progress}%
          </div>
        )}
        {error && <p className="sm:col-span-2 text-xs text-destructive">{error}</p>}
        <button onClick={submit} disabled={busy} className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">
          <Plus className="h-3 w-3" /> Upload &amp; publish
        </button>
      </div>

      <ul className="divide-y divide-border">
        {list.length === 0 && <p className="py-3 text-center text-xs text-muted-foreground">No downloadable titles yet</p>}
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2">
            {r.poster_url ? <img src={r.poster_url} className="h-12 w-9 rounded object-cover" alt="" /> : <div className="h-12 w-9 rounded bg-secondary" />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{r.title}</p>
              <p className="text-[11px] text-muted-foreground">
                {r.kind}{r.season ? ` · S${r.season}E${r.episode}` : ""} · {formatBytes(r.size_bytes)} · {r.mime}
              </p>
            </div>
            <button onClick={() => remove(r.id)} className="rounded-full bg-secondary p-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
          </li>
        ))}
      </ul>
    </section>
  );
}
