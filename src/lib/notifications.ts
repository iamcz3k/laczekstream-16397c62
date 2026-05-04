// Helper to register the SW and schedule local notifications for match kickoffs.

function isInIframe() {
  try { return window.self !== window.top; } catch { return true; }
}
function isPreviewHost() {
  return /id-preview--|lovableproject\.com/.test(window.location.hostname);
}

export async function ensureSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  // Skip registration in preview/iframe — Lovable's preview runs inside an iframe and
  // service workers cause stale-content issues there.
  if (isInIframe() || isPreviewHost()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestNotifyPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "default") return await Notification.requestPermission();
  return Notification.permission;
}

export async function scheduleMatchNotification(opts: { id: string; title: string; when: number; url: string }) {
  const perm = await requestNotifyPermission();
  if (perm !== "granted") return false;
  const reg = await ensureSW();
  // Persist locally as a fallback (in-tab timer if SW not available)
  const list = JSON.parse(localStorage.getItem("laczek:notifs") || "[]");
  if (!list.find((n: { id: string }) => n.id === opts.id)) {
    list.push(opts);
    localStorage.setItem("laczek:notifs", JSON.stringify(list));
  }
  const target = reg?.active || navigator.serviceWorker.controller;
  if (target) {
    target.postMessage({
      type: "schedule-match",
      title: `⚽ ${opts.title}`,
      body: "The match is starting now. Tap to watch.",
      when: opts.when,
      tag: opts.id,
      url: opts.url,
    });
  } else {
    // Fallback: in-tab timer
    const delay = Math.max(0, opts.when - Date.now());
    window.setTimeout(() => {
      if (Notification.permission === "granted") {
        new Notification(`⚽ ${opts.title}`, { body: "The match is starting now." });
      }
    }, delay);
  }
  return true;
}

export function isMatchScheduled(id: string) {
  if (typeof window === "undefined") return false;
  const list = JSON.parse(localStorage.getItem("laczek:notifs") || "[]");
  return list.some((n: { id: string }) => n.id === id);
}