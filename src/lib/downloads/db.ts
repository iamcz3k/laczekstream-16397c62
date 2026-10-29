// Tiny IndexedDB wrapper for download metadata + blob chunks.
// Stores: meta (DownloadMeta keyed by id), files (single Blob per id).
import type { DownloadMeta } from "./types";

const DB_NAME = "laczek-downloads";
const DB_VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T = unknown>(store: "meta" | "files", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const s = tx.objectStore(store);
        const req = fn(s);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const downloadsDB = {
  async listMeta(): Promise<DownloadMeta[]> {
    return run<DownloadMeta[]>("meta", "readonly", (s) => s.getAll());
  },
  async getMeta(id: string): Promise<DownloadMeta | undefined> {
    return run<DownloadMeta | undefined>("meta", "readonly", (s) => s.get(id));
  },
  async putMeta(meta: DownloadMeta): Promise<void> {
    await run("meta", "readwrite", (s) => s.put(meta));
  },
  async removeMeta(id: string): Promise<void> {
    await run("meta", "readwrite", (s) => s.delete(id));
  },
  async getBlob(id: string): Promise<Blob | undefined> {
    return run<Blob | undefined>("files", "readonly", (s) => s.get(id));
  },
  async putBlob(id: string, blob: Blob): Promise<void> {
    await run("files", "readwrite", (s) => s.put(blob, id));
  },
  async removeBlob(id: string): Promise<void> {
    await run("files", "readwrite", (s) => s.delete(id));
  },
  async clear(): Promise<void> {
    await Promise.all([
      run("meta", "readwrite", (s) => s.clear()),
      run("files", "readwrite", (s) => s.clear()),
    ]);
  },
};

export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}

export async function requestPersistent(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {}
  return false;
}
