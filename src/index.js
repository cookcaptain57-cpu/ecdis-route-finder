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

// ── Register service worker for offline-first / 2G-friendly loading ──
// This makes the app shell load INSTANTLY on repeat visits (even fully
// offline), which matters on ship internet (VSAT/2G). Data (Firestore,
// Sheets, weather) still goes network-first with cache fallback so it
// stays fresh when a connection is available.
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('NavisphereX Marine is ready to work offline.');
  },
  onUpdate: (registration) => {
    // A new version was downloaded in the background. Activate it
    // immediately so the sailor always gets the latest build without
    // needing to manually clear cache.
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  },
});
