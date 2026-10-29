// Browser/PWA download engine with pause/resume/retry/cancel + auto-resume on reconnect.
// Uses HTTP Range requests against signed Supabase Storage URLs.
import { downloadsDB } from "./db";
import type { DownloadMeta, DownloadProgress, DownloadStatus } from "./types";

const CHUNK = 4 * 1024 * 1024; // 4 MB
const MAX_CONCURRENT = 2;
const MAX_RETRIES = 3;

type SignedUrlFetcher = (titleId: string) => Promise<string>;

type Job = {
  id: string;
  controller: AbortController;
  paused: boolean;
  cancelled: boolean;
  loaded: number;
  total: number;
  lastSampleAt: number;
  lastSampleBytes: number;
  speedBps: number;
};

class DownloadEngine extends EventTarget {
  private getSignedUrl: SignedUrlFetcher = async () => {
    throw new Error("getSignedUrl not configured");
  };
  private queue: string[] = [];
  private jobs = new Map<string, Job>();
  private onComplete?: (id: string) => void;

  configure(opts: { getSignedUrl: SignedUrlFetcher; onComplete?: (id: string) => void }) {
    this.getSignedUrl = opts.getSignedUrl;
    this.onComplete = opts.onComplete;
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.resumeAll());
      window.addEventListener("offline", () => this.pauseAllActive("offline"));
    }
  }

  /** Boot persisted queue + resume in-flight downloads on app start. */
  async boot() {
    const all = await downloadsDB.listMeta();
    for (const m of all) {
      if (m.status === "downloading" || m.status === "queued") {
        this.queue.push(m.id);
      }
    }
    this.pump();
  }

  async listMeta() {
    return downloadsDB.listMeta();
  }

  async enqueue(meta: Omit<DownloadMeta, "bytes_downloaded" | "status" | "created_at" | "updated_at">) {
    const existing = await downloadsDB.getMeta(meta.id);
    if (existing && (existing.status === "completed" || existing.status === "downloading" || existing.status === "queued")) {
      return existing;
    }
    const m: DownloadMeta = {
      ...meta,
      bytes_downloaded: existing?.bytes_downloaded ?? 0,
      status: "queued",
      created_at: existing?.created_at ?? Date.now(),
      updated_at: Date.now(),
    };
    await downloadsDB.putMeta(m);
    this.queue.push(m.id);
    this.emit({ id: m.id, loaded: m.bytes_downloaded, total: m.size_bytes, speedBps: 0, etaSec: 0, status: "queued" });
    this.pump();
    return m;
  }

  async pause(id: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.paused = true;
      job.controller.abort();
    }
    const m = await downloadsDB.getMeta(id);
    if (m && m.status !== "completed") {
      m.status = "paused";
      m.updated_at = Date.now();
      await downloadsDB.putMeta(m);
      this.emit({ id, loaded: m.bytes_downloaded, total: m.size_bytes, speedBps: 0, etaSec: 0, status: "paused" });
    }
  }

  async resume(id: string) {
    const m = await downloadsDB.getMeta(id);
    if (!m || m.status === "completed") return;
    m.status = "queued";
    m.updated_at = Date.now();
    await downloadsDB.putMeta(m);
    if (!this.queue.includes(id) && !this.jobs.has(id)) this.queue.push(id);
    this.emit({ id, loaded: m.bytes_downloaded, total: m.size_bytes, speedBps: 0, etaSec: 0, status: "queued" });
    this.pump();
  }

  async retry(id: string) {
    const m = await downloadsDB.getMeta(id);
    if (!m) return;
    if (m.status === "failed") return this.resume(id);
    return this.resume(id);
  }

  async cancel(id: string) {
    const job = this.jobs.get(id);
    if (job) {
      job.cancelled = true;
      job.controller.abort();
      this.jobs.delete(id);
    }
    this.queue = this.queue.filter((q) => q !== id);
    await downloadsDB.removeBlob(id);
    await downloadsDB.removeMeta(id);
    this.emit({ id, loaded: 0, total: 0, speedBps: 0, etaSec: 0, status: "cancelled" });
    this.pump();
  }

  async remove(id: string) {
    return this.cancel(id);
  }

  async getOfflineUrl(id: string): Promise<string | null> {
    const blob = await downloadsDB.getBlob(id);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }

  private pauseAllActive(_reason: string) {
    for (const id of [...this.jobs.keys()]) this.pause(id);
  }

  private resumeAll() {
    downloadsDB.listMeta().then((all) => {
      for (const m of all) {
        if (m.status === "paused" || m.status === "failed") this.resume(m.id);
      }
    });
  }

  private pump() {
    while (this.jobs.size < MAX_CONCURRENT && this.queue.length) {
      const id = this.queue.shift()!;
      if (this.jobs.has(id)) continue;
      void this.run(id);
    }
  }

  private emit(p: DownloadProgress) {
    this.dispatchEvent(new CustomEvent("progress", { detail: p }));
  }

  private async run(id: string) {
    const meta = await downloadsDB.getMeta(id);
    if (!meta) return;
    let attempt = 0;
    while (attempt <= MAX_RETRIES) {
      attempt++;
      try {
        await this.runOnce(meta);
        return;
      } catch (err: any) {
        const job = this.jobs.get(id);
        if (job?.cancelled) return;
        if (job?.paused) {
          this.jobs.delete(id);
          return;
        }
        if (attempt > MAX_RETRIES) {
          meta.status = "failed";
          meta.error = err?.message || String(err);
          meta.updated_at = Date.now();
          await downloadsDB.putMeta(meta);
          this.jobs.delete(id);
          this.emit({ id, loaded: meta.bytes_downloaded, total: meta.size_bytes, speedBps: 0, etaSec: 0, status: "failed", error: meta.error });
          this.pump();
          return;
        }
        // backoff
        await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      }
    }
  }

  private async runOnce(meta: DownloadMeta) {
    const controller = new AbortController();
    const job: Job = {
      id: meta.id,
      controller,
      paused: false,
      cancelled: false,
      loaded: meta.bytes_downloaded,
      total: meta.size_bytes,
      lastSampleAt: Date.now(),
      lastSampleBytes: meta.bytes_downloaded,
      speedBps: 0,
    };
    this.jobs.set(meta.id, job);

    meta.status = "downloading";
    meta.error = null;
    meta.updated_at = Date.now();
    await downloadsDB.putMeta(meta);
    this.emit({ id: meta.id, loaded: job.loaded, total: meta.size_bytes, speedBps: 0, etaSec: 0, status: "downloading" });

    const url = await this.getSignedUrl(meta.id);

    // Resume any existing partial blob.
    const existing = (await downloadsDB.getBlob(meta.id)) ?? new Blob([], { type: meta.mime });
    let acc = existing;
    let offset = meta.bytes_downloaded || existing.size;
    if (offset !== existing.size) {
      // Stored offset disagrees with stored blob → trust the blob.
      offset = existing.size;
    }

    // First request gets total size if unknown.
    while (true) {
      if (job.cancelled || job.paused) throw new Error("interrupted");
      const end = meta.size_bytes ? Math.min(offset + CHUNK - 1, meta.size_bytes - 1) : offset + CHUNK - 1;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Range: `bytes=${offset}-${end}` },
      });
      if (!res.ok && res.status !== 206 && res.status !== 200) {
        throw new Error(`HTTP ${res.status}`);
      }
      // Parse Content-Range to learn total.
      const cr = res.headers.get("content-range");
      if (cr) {
        const m = /\/(\d+)$/.exec(cr);
        if (m) job.total = Number(m[1]);
      } else if (!meta.size_bytes) {
        const cl = res.headers.get("content-length");
        if (cl) job.total = offset + Number(cl);
      }
      if (job.total && !meta.size_bytes) meta.size_bytes = job.total;

      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) break;
      acc = new Blob([acc, buf], { type: meta.mime });
      offset += buf.byteLength;
      job.loaded = offset;

      // Persist every chunk so we survive reloads.
      await downloadsDB.putBlob(meta.id, acc);
      meta.bytes_downloaded = offset;
      meta.updated_at = Date.now();
      await downloadsDB.putMeta(meta);

      // Speed (EWMA over ~2s window).
      const now = Date.now();
      const dt = (now - job.lastSampleAt) / 1000;
      if (dt > 0.5) {
        const inst = (offset - job.lastSampleBytes) / dt;
        job.speedBps = job.speedBps ? job.speedBps * 0.6 + inst * 0.4 : inst;
        job.lastSampleAt = now;
        job.lastSampleBytes = offset;
      }
      const eta = job.speedBps > 0 ? Math.max(0, (job.total - offset) / job.speedBps) : 0;
      this.emit({ id: meta.id, loaded: offset, total: job.total || meta.size_bytes, speedBps: job.speedBps, etaSec: eta, status: "downloading" });

      if (job.total && offset >= job.total) break;
    }

    meta.status = "completed";
    meta.bytes_downloaded = offset;
    meta.size_bytes = job.total || offset;
    meta.updated_at = Date.now();
    await downloadsDB.putMeta(meta);
    this.jobs.delete(meta.id);
    this.emit({ id: meta.id, loaded: offset, total: meta.size_bytes, speedBps: 0, etaSec: 0, status: "completed" });
    this.onComplete?.(meta.id);
    this.pump();
  }
}

export const downloadEngine = new DownloadEngine();

export function onDownloadProgress(cb: (p: DownloadProgress) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<DownloadProgress>).detail);
  downloadEngine.addEventListener("progress", handler);
  return () => downloadEngine.removeEventListener("progress", handler);
}

export type { DownloadStatus };
