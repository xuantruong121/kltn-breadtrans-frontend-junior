// Service Worker for BreadTrans Junior PWA & Web Push Notification

const CACHE_NAME = 'breadtrans-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/logo.png',
];

// 1. Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: StaleWhileRevalidate for static assets, network-first for pages, bypass API & sockets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass API requests, WebSocket, and dynamic user queries
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/socket.io') ||
    url.pathname.includes('/arena') ||
    url.pathname.includes('/daily') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Push Event: Show native Web Push Notification
self.addEventListener('push', (event) => {
  let data = {
    title: 'BreadTrans Junior 🍞',
    body: 'Bạn có thông báo mới từ BreadTrans!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const title = data.title || 'BreadTrans Junior 🍞';
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || data.data?.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      {
        action: 'open_app',
        title: 'Mở Ứng Dụng 🚀',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event: Navigate to target URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window client is already open, focus and navigate it
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
