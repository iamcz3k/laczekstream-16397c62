// Global publish/pull for the Admin Panel v2 snapshot.
// The snapshot is a JSON blob of every `admin_v2_*` localStorage key.
// Admins call `publishGlobal()` to push their local config to the server.
// Every visitor calls `hydrateGlobal()` at app boot to pull the latest one
// and overlay it onto their own localStorage so the site behaves the same
// for everyone — no database, just a JSON file in storage.
import { exportAll, importAll } from "@/lib/admin-v2-store";

const ENDPOINT = "/api/public/admin-v2-config";
const HYDRATED_AT_KEY = "admin_v2_global_hydrated_at";
const PUBLISHED_AT_KEY = "admin_v2_global_published_at";

export async function publishGlobal(password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const snapshot = JSON.parse(exportAll());
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, snapshot }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j.error || `HTTP ${res.status}` };
    }
    try { localStorage.setItem(PUBLISHED_AT_KEY, new Date().toISOString()); } catch {}
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function pullGlobal(): Promise<{ ok: boolean; published_at?: string; error?: string }> {
  try {
    const res = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const j = await res.json();
    if (!j || j.missing || !j.snapshot) return { ok: false, error: "no snapshot yet" };
    importAll(JSON.stringify(j.snapshot));
    try {
      localStorage.setItem(HYDRATED_AT_KEY, new Date().toISOString());
      if (j.published_at) localStorage.setItem(PUBLISHED_AT_KEY, j.published_at);
    } catch {}
    return { ok: true, published_at: j.published_at };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Run once per page load; safe to call from RootComponent's effect.
let hydrating: Promise<void> | null = null;
export function hydrateGlobalOnce() {
  if (typeof window === "undefined") return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try { await pullGlobal(); } catch {}
  })();
  return hydrating;
}

export function getLastPublishedAt(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(PUBLISHED_AT_KEY); } catch { return null; }
}
export function getLastHydratedAt(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(HYDRATED_AT_KEY); } catch { return null; }
}
