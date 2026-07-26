const CACHE_NAME = 'gb-pwa-cache-v1';
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

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Only handle local HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) return;

  // Network-first for HTML pages (so visitors always see latest price / stock updates)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache a copy of the page
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If offline, try loading page from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If page is not in cache, show beautiful offline fallback page
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        })
    );
    return;
  }

  // Cache-first for JS, CSS, Fonts, Images, and static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {}); // ignore network update errors when offline

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
