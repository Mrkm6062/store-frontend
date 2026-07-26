const CACHE_NAME = 'gb-pwa-cache-v2'; // Incremented version to clear old stale caches
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Store</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; text-align: center; padding: 50px 20px; background: #F8FAFC; color: #334155; }
    .card { background: white; max-width: 400px; margin: 0 auto; padding: 40px 30px; border-radius: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0; }
    h1 { font-size: 24px; font-weight: 800; color: #1E293B; margin-bottom: 8px; }
    p { font-size: 14px; color: #64748B; line-height: 1.5; margin-bottom: 24px; }
    .btn { background: #76b900; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: 700; border-radius: 12px; cursor: pointer; text-decoration: none; display: inline-block; transition: background 0.2s; }
    .btn:hover { background: #659e00; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size: 48px; margin-bottom: 16px;">📶</div>
    <h1>You are offline</h1>
    <p>Please check your internet connection and try reloading the page to access the store.</p>
    <button onclick="window.location.reload()" class="btn">Retry Connection</button>
  </div>
</body>
</html>
`;

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event - claim clients and clean up old caches dynamically
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Clearing old stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin and non-GET requests to prevent service worker errors
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  // Network-first for navigation pages (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          });
        })
    );
    return;
  }

  // Cache-first for JS, CSS, Fonts, and Images
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Quietly update the cache in the background
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {}); // Ignore background updates failure when offline
          
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch((err) => {
            // Return a valid Response to prevent "Failed to convert value to Response" browser crashes
            return new Response('Asset not available offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});
