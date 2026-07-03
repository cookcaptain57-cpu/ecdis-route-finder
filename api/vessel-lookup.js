// /api/vessel-lookup.js
// Place this at your PROJECT ROOT, as a sibling to /src — NOT inside /src.
// Vercel auto-deploys anything under /api as a serverless function at
// https://<yourdomain>/api/vessel-lookup
//
// Reads VESSEL_API_KEY from the server-side environment only.
// The browser never sees the key or the real VesselAPI URL.

export default async function handler(req, res) {
  const { name } = req.query;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'name query param required (min 2 chars)' });
  }

  const key = process.env.VESSEL_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'VESSEL_API_KEY not configured on server' });
  }

  const authHeader = { Authorization: `Bearer ${key}` };

  try {
    // Step 1: name search → candidate matches
    const searchUrl = `https://api.vesselapi.com/v1/search/vessels?filter.name=${encodeURIComponent(name.trim())}`;
    const searchRes  = await fetch(searchUrl, { headers: authHeader });

    if (searchRes.status === 429) {
      return res.status(429).json({ error: 'quota', message: 'VesselAPI monthly quota reached' });
    }
    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: 'search_failed' });
    }

    const searchJson = await searchRes.json();
    const candidates  = searchJson?.data || searchJson?.vessels || searchJson?.results || [];
    if (candidates.length === 0) {
      return res.status(200).json({ found: false, candidates: [] });
    }

    // NOTE: search results already contain full particulars (GT, DWT, etc) —
    // no second "detail" call needed. This is what cut quota use in half.
    return res.status(200).json({ found: true, candidates });

  } catch (e) {
    return res.status(502).json({ error: 'upstream_failed', message: e.message });
  }
}
