// Lightweight localStorage tracker for one-tap external mirror downloads.
// (Engine-based offline downloads live separately in /lib/downloads.)

export type DownloadHistoryItem = {
  id: string;            // unique key
  title: string;
  kind: "movie" | "tv" | "anime";
  season?: number;
  episode?: number;
  filename: string;
  url: string;
  poster?: string | null;
  size_bytes?: number;
  status: "completed" | "started" | "opened" | "failed";
  created_at: number;
};

const KEY = "laczek:download-history";

function read(): DownloadHistoryItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DownloadHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function write(items: DownloadHistoryItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200))); } catch {}
  try { window.dispatchEvent(new CustomEvent("laczek:download-history-change")); } catch {}
}

export const downloadHistory = {
  list(): DownloadHistoryItem[] {
    return read().sort((a, b) => b.created_at - a.created_at);
  },
  add(item: Omit<DownloadHistoryItem, "id" | "created_at"> & { id?: string }): DownloadHistoryItem {
    const items = read();
    const id = item.id || `${item.kind}-${item.filename}-${Date.now()}`;
    const next: DownloadHistoryItem = { ...item, id, created_at: Date.now() };
    const filtered = items.filter((i) => i.id !== id);
    filtered.unshift(next);
    write(filtered);
    return next;
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};
