import { RemixBrowser } from '@remix-run/react';
import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';

/*
 * Register service worker to inject CORP headers on Firebase auth iframe
 * responses, which are blocked by COEP: credentialless otherwise.
 */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/auth-sw.js').catch((err) => {
    console.warn('Auth service worker registration failed:', err);
  });
}

startTransition(() => {
  hydrateRoot(document.getElementById('root')!, <RemixBrowser />);
});
