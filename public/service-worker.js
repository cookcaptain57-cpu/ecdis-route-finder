/* eslint-disable no-restricted-globals */
// NavisphereX Marine — Service Worker
// Cache-first for the app shell (so it loads instantly even on 2G/offline),
// network-first-with-cache-fallback for API/data calls.

const CACHE_NAME = 'navispherex-shell-v1';
const DATA_CACHE_NAME = 'navispherex-data-v1';

// App shell files — cached on install, served instantly on every load.
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS).catch(() => {
        // Don't fail install if one optional asset is missing
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Never intercept Firebase/Firestore/Google Sheets API calls with cache-first —
  // those need network-first so data stays fresh, but fall back to cache when offline.
  const isDataRequest =
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('open-meteo.com');

  if (isDataRequest) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses for offline fallback
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell + static assets (JS, CSS, images, fonts) — cache-first.
  // This is what makes the app open INSTANTLY even on 2G or fully offline.
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache immediately; refresh cache in background
        fetch(request)
          .then((freshResponse) => {
            if (freshResponse && freshResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, freshResponse));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not cached yet — fetch from network, cache it, and return
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline and not cached — for navigation requests, fall back to index.html
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
