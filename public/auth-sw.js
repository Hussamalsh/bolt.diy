// Service worker that injects Cross-Origin-Resource-Policy: cross-origin on
// Firebase auth iframe responses. This allows the iframe to load under COEP:
// credentialless (required by WebContainers) without Firebase changing their
// response headers.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept Firebase auth iframe requests
  if (
    (url.hostname.endsWith('.firebaseapp.com') || url.hostname.endsWith('.firebase.com')) &&
    url.pathname.startsWith('/__/auth/')
  ) {
    event.respondWith(
      fetch(event.request).then((response) => {
        // Clone and add the CORP header so COEP: credentialless allows it
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }),
    );
  }
});
