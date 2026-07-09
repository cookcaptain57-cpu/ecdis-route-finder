import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline-first caching.
// After first load online, ALL app assets (JS chunks, CSS, HTML) are
// cached in the browser. Subsequent visits — including fully offline —
// load instantly from cache without any network request.
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('NavisphereX: cached for offline use.');
  },
  onUpdate: (registration) => {
    // New version available — activate it silently without forcing
    // a reload (which was breaking the offline experience).
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Do NOT call window.location.reload() — let user stay on current page.
    // They'll get the new version on their next natural navigation.
    console.log('NavisphereX: updated in background.');
  },
});
