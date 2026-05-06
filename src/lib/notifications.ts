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
  // Always store locally so an in-tab fallback fires even if SW or notifications are blocked.
  const list = JSON.parse(localStorage.getItem("laczek:notifs") || "[]");
  if (!list.find((n: { id: string }) => n.id === opts.id)) {
    list.push(opts);
    localStorage.setItem("laczek:notifs", JSON.stringify(list));
  }
  // In-page banner fallback always scheduled.
  const delay = Math.max(0, opts.when - Date.now());
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent("laczek:match-alert", { detail: { title: opts.title, url: opts.url } }));
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification(`⚽ ${opts.title}`, { body: "The match is starting now." }); } catch {}
    }
  }, delay);

  const perm = await requestNotifyPermission();
  const reg = await ensureSW();
  const target = reg?.active || navigator.serviceWorker.controller;
  if (target && perm === "granted") {
    target.postMessage({
      type: "schedule-match",
      title: `⚽ ${opts.title}`,
      body: "The match is starting now. Tap to watch.",
      when: opts.when,
      tag: opts.id,
      url: opts.url,
    });
  }
  return true; // always succeeds (banner fallback)
}

export function isMatchScheduled(id: string) {
  if (typeof window === "undefined") return false;
  const list = JSON.parse(localStorage.getItem("laczek:notifs") || "[]");
  return list.some((n: { id: string }) => n.id === id);
}