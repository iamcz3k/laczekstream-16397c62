// LACZEK STREAM service worker — used only for scheduled match notifications.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Receive scheduling messages from the page and fire a notification at kickoff.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "schedule-match") return;
  const { title, body, when, tag, url } = data;
  const delay = Math.max(0, when - Date.now());
  setTimeout(() => {
    self.registration.showNotification(title || "Match starting", {
      body: body || "Tap to watch the live stream.",
      tag: tag || "laczek-match",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      vibrate: [200, 100, 200],
      data: { url: url || "/" },
      requireInteraction: false,
    });
  }, delay);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.openWindow(url));
});