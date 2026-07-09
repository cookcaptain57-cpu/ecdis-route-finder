/* eslint-disable no-restricted-globals */
// NavisphereX Marine — Service Worker v2
// Caches ALL app assets dynamically on first load.
// Works with Vercel's hashed filenames (main.abc123.js etc).

const CACHE_VERSION = 'nx-v2';
const CACHE_NAME = `navispherex-${CACHE_VERSION}`;

// On install — claim immediately, don't wait
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// On activate — delete ALL old caches, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests from our own origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin &&
      !url.hostname.includes('fonts.googleapis.com') &&
      !url.hostname.includes('fonts.gstatic.com')) return;

  // Never cache Firebase, Firestore, API calls — always network
  const isApiCall =
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('openrouter.ai') ||
    url.pathname.includes('/v1/');

  if (isApiCall) {
    event.respondWith(fetch(request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Everything else (JS chunks, CSS, HTML, images, fonts):
  // Stale-while-revalidate — serve from cache instantly if available,
  // update cache in background so next visit gets fresh version.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => null);

        // Return cached immediately if available, otherwise wait for network
        return cached || networkFetch;
      })
    )
  );
});
