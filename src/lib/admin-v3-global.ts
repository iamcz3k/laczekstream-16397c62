// v3 lives in Supabase already, so "publish/pull global" is effectively
// automatic on every read/write. These functions exist only to keep the
// V3 admin panel UI (cloned from v2) compiling and functional.
import { hydrateStore } from "./admin-v3-store";

export async function publishGlobal(_password: string): Promise<{ ok: boolean; error?: string }> {
  // Every write already syncs to Supabase live — nothing to push.
  return { ok: true };
}

export async function pullGlobal(): Promise<{ ok: boolean; published_at?: string; error?: string }> {
  try {
    await hydrateStore(true);
    return { ok: true, published_at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

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
  return null;
}
export function getLastHydratedAt(): string | null {
  return null;
}
