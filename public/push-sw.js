/*
 * BreadTrans browser notifications (Web Push) only.
 *
 * Registered with scope "/push/", so it controls no page: no fetch handler and
 * no cache, unlike the old /sw.js (removed on 2026-10-20, still unregistered by
 * app/layout.tsx). Push events reach it whatever the scope.
 *
 * Payload from the backend (NotificationsService.sendPushToUser):
 * { title, body, icon, badge, url, data: { url } }
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }
  const url = (payload.data && payload.data.url) || payload.url || "/";
  event.waitUntil(
    self.registration.showNotification(payload.title || "BreadTrans", {
      body: payload.body || "",
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-192.png",
      data: { url },
    }),
  );
});

// A click opens the page in a new tab. An open BreadTrans tab is left alone:
// this worker controls no page, so it cannot navigate one, and moving a tab
// away could lose an exercise in progress.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  // Only ever open BreadTrans pages.
  if (target.origin !== self.location.origin) return;
  event.waitUntil(self.clients.openWindow(target.href));
});
