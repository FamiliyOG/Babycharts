const CACHE_NAME_PREFIX = 'babycharts-v';
const BUILD_VERSION = '__SW_CACHE_VERSION__';
const CACHE_NAME = `${CACHE_NAME_PREFIX}${BUILD_VERSION}`;

// Static application shell assets (never caches user data, profiles or API responses)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/offline.html',
  '/favicon.svg',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Do not force skipWaiting so active users get prompt to reload
});

self.addEventListener('message', (event) => {
  // Snyk / CodeQL CWE-20: Ensure message is received strictly from same origin
  if (event.origin !== self.location.origin && event.origin !== '') {
    return;
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_USER_DATA') {
    // Logout cache invalidation (BC-298)
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key.startsWith(CACHE_NAME_PREFIX)) {
              return caches.delete(key);
            }
          })
        );
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key.startsWith(CACHE_NAME_PREFIX)) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // SECURITY (BC-139 / BC-298): NEVER cache API requests, sensitive endpoints, or non-GET methods
  if (
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET' ||
    url.protocol.startsWith('chrome-extension')
  ) {
    return;
  }

  // Network-First for HTML navigation to ensure fresh deployment versions, with graceful offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches
            .match(event.request)
            .then(
              (res) =>
                res ||
                caches.match('/index.html') ||
                caches.match('/offline.html') ||
                fetch('/offline.html')
            );
        })
    );
    return;
  }

  // Cache-First with Network Background Refresh for hashed static assets (/assets/*) and app shell
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse?.status === 200 &&
            networkResponse?.type === 'basic' &&
            (url.pathname.startsWith('/assets/') || STATIC_ASSETS.includes(url.pathname))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request));
    })
  );
});
