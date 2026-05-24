// api/route.js  ←  Vercel Serverless Function
// This file goes in the ROOT of your project in an /api folder.
// Vercel detects it automatically and exposes it at /api/route
//
// It tries two backends in order:
//   1. Your free Render.com Python service (searoute with land mask)
//   2. Searoutes.com commercial API (if SEAROUTES_KEY set in Vercel env)
//
// Set these in Vercel Dashboard → Settings → Environment Variables:
//   ROUTER_URL    = https://maritime-router.onrender.com   (your Render service URL)
//   SEAROUTES_KEY = your_key_here                          (optional, from searoutes.com)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { fromLon, fromLat, toLon, toLat } = req.query;
  if (!fromLon || !fromLat || !toLon || !toLat) {
    return res.status(400).json({ error: 'fromLon, fromLat, toLon, toLat required' });
  }

  // ── Option 1: Free Python service on Render.com ───────────────────────────
  const routerUrl = process.env.ROUTER_URL;
  if (routerUrl) {
    try {
      const url = `${routerUrl}/route?fromLon=${fromLon}&fromLat=${fromLat}&toLon=${toLon}&toLat=${toLat}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (response.ok) {
        const data = await response.json();
        if (data.waypoints && data.waypoints.length > 1) {
          return res.status(200).json({ ...data, source: 'render-python' });
        }
      }
    } catch (e) {
      console.warn('[route.js] Render service failed:', e.message);
    }
  }

  // ── Option 2: Searoutes.com commercial API ───────────────────────────────
  const searoutesKey = process.env.SEAROUTES_KEY;
  if (searoutesKey) {
    try {
      const url = `https://api.searoutes.com/route/v2/sea/${fromLon},${fromLat};${toLon},${toLat}?speed=12`;
      const response = await fetch(url, {
        headers: { 'x-api-key': searoutesKey, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000),
      });
      if (response.ok) {
        const data = await response.json();
        // Searoutes returns GeoJSON FeatureCollection
        const feature = data.features?.[0];
        const coords  = feature?.geometry?.coordinates;
        if (coords && coords.length > 1) {
          return res.status(200).json({
            waypoints: coords.map(([lon, lat]) => ({ lat, lon })),
            totalNM:   Math.round((feature.properties?.distance || 0) / 1852),
            passages:  feature.properties?.passages || [],
            source:    'searoutes-com',
          });
        }
      }
    } catch (e) {
      console.warn('[route.js] Searoutes.com failed:', e.message);
    }
  }

  // ── No backend available ──────────────────────────────────────────────────
  return res.status(503).json({
    error: 'No routing backend configured. Set ROUTER_URL or SEAROUTES_KEY in Vercel env vars.',
    setup:  'See README for setup instructions.',
  });
}
