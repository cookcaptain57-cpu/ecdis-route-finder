/* eslint-disable */
// src/sheets.js — All Google Sheet fetch/search helpers

export const ROUTE_SHEET_ID = '1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE';
export const CHART_SHEET_ID = '1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA';
export const PORTS_SHEET_ID = '1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk';

// ─── IndexedDB config ──────────────────────────────────────────────────────
const IDB_NAME   = 'mnav_cache';
const IDB_VER    = 1;
const IDB_STORE  = 'sheets';
const IDB_ROUTES = 'mnav_sheet_routes';
const IDB_CHARTS = 'mnav_sheet_charts';
const IDB_PORTS  = 'mnav_sheet_ports';

function _idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess       = e => resolve(e.target.result);
    req.onerror         = e => reject(e.target.error);
  });
}

async function _idbRead(key) {
  try {
    const db = await _idbOpen();
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = e => resolve(e.target.result ?? null);
      req.onerror   = e => reject(e.target.error);
    });
  } catch { return null; }
}

async function _idbWrite(key, data) {
  try {
    const db = await _idbOpen();
    return new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(data, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch {}
}

async function _idbClear() {
  try {
    const db = await _idbOpen();
    return new Promise((resolve, reject) => {
      const tx    = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      [IDB_ROUTES, IDB_CHARTS, IDB_PORTS].forEach(k => store.delete(k));
      tx.oncomplete = () => resolve();
      tx.onerror    = e => reject(e.target.error);
    });
  } catch {}
}

// ─── Public cache clear — called by Admin "Sync Now" ──────────────────────
export const clearSheetCache = () => _idbClear();

// ─── Simple in-memory cache (5 min TTL) ───────────────────────────────────
export const searchCache = new Map();

export const csvToRows = (csv) => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  return lines.slice(1).map(line => {
    const vals = []; let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = (vals[i] || '').replace(/"/g, ''));
    return obj;
  }).filter(r => Object.values(r).some(v => v));
};

export const fetchSheetCSV = async (sheetId, tabName = 'Sheet1') => {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return csvToRows(await res.text());
};

// ─── searchSheetLive — CHANGED: checks IDB first, falls back to network ───
export const searchSheetLive = async (sheetId, query, tabNames = ['Sheet1'], maxResults = 50) => {
  if (!query || query.trim().length < 2) return [];
  const ql = query.toLowerCase().trim();
  const cacheKey = `${sheetId}:${ql}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return cached.data;

  // NEW: IDB-first — if this sheet's data is already cached locally, search it
  // instantly without any network call. Falls through to network only if IDB empty.
  const idbKey = sheetId === ROUTE_SHEET_ID ? IDB_ROUTES
               : sheetId === CHART_SHEET_ID ? IDB_CHARTS
               : null;
  if (idbKey) {
    const idbData = await _idbRead(idbKey);
    if (idbData && Array.isArray(idbData) && idbData.length > 0) {
      const results = idbData.filter(r => {
        const hay = Object.values(r).filter(Boolean).join(' ').toLowerCase();
        return hay.includes(ql);
      }).slice(0, maxResults);
      searchCache.set(cacheKey, { data: results, ts: Date.now() });
      return results;
    }
  }

  // EXISTING: network loop — runs only when IDB is empty (first load / after cache clear)
  let allRows = [];
  for (const tab of tabNames) {
    try {
      const rows = await fetchSheetCSV(sheetId, tab);
      allRows = [...allRows, ...rows.map(r => ({ ...r, _tab: tab }))];
      if (allRows.length > 5000) break;
    } catch { continue; }
  }
  const results = allRows.filter(r => {
    const hay = Object.values(r).filter(Boolean).join(' ').toLowerCase();
    return hay.includes(ql);
  }).slice(0, maxResults);
  searchCache.set(cacheKey, { data: results, ts: Date.now() });
  return results;
};

// ─── fetchRouteSheet — CHANGED: parallel Google-direct fetch via Promise.any ─
// Old: sequential reduce().catch() chain calling opensheet.elk.sh (slow 3rd party)
// New: all tabs fired in parallel via fetchSheetCSV (Google direct); first tab
//      that returns non-empty data wins. IDB cache logic unchanged.
const ROUTE_TABS = ['Sheet1', 'Routes', 'Route', 'Data', 'Sheet2'];
export const fetchRouteSheet = async () => {
  const cached = await _idbRead(IDB_ROUTES);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  try {
    const d = await Promise.any(
      ROUTE_TABS.map(tab =>
        fetchSheetCSV(ROUTE_SHEET_ID, tab)
          .then(rows => { if (!rows || rows.length === 0) throw new Error('empty'); return rows; })
      )
    );
    await _idbWrite(IDB_ROUTES, d);
    return d;
  } catch {
    return [];
  }
};

// ─── fetchChartSheet — CHANGED: parallel Google-direct fetch via Promise.any ─
// Same fix as fetchRouteSheet above.
const CHART_TABS = ['Sheet1', 'Charts', 'ECDIS Charts', 'Routes', 'Chart', 'Data', 'Sheet2'];
export const fetchChartSheet = async () => {
  const cached = await _idbRead(IDB_CHARTS);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  try {
    const d = await Promise.any(
      CHART_TABS.map(tab =>
        fetchSheetCSV(CHART_SHEET_ID, tab)
          .then(rows => { if (!rows || rows.length === 0) throw new Error('empty'); return rows; })
      )
    );
    await _idbWrite(IDB_CHARTS, d);
    return d;
  } catch {
    return [];
  }
};

// ─── fetchPortsFromSheet — IDB cache, fetch only if empty ─────────────────
export const fetchPortsFromSheet = async () => {
  const cached = await _idbRead(IDB_PORTS);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;

  const url = `https://docs.google.com/spreadsheets/d/${PORTS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=PORTDATA`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const csv = await r.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

    // Confirmed sheet column layout:
    //   0 → PORT CODE UNLCODE  (full LOCODE e.g. "INMUM")
    //   1 → PORT NAME          (e.g. "Mumbai")
    //   2 → COUNTRY            (e.g. "India")
    //   3 → LATTITUDE          (DMS format e.g. 42°32'60.0"N — note double-T typo in sheet)
    //   4 → LONGITUDE          (DMS format e.g. 1°34'48.0"E)
    //
    // colLat: 'lattitude'.includes('lat') → true, still found correctly despite typo
    const colLat = headers.findIndex(h => h.includes('lat'));
    const colLon = headers.findIndex(h => h.includes('lon') || h.includes('lng'));

    // NEW: DMS parser — coordinates in sheet are Degrees°Minutes'Seconds"Direction
    // parseFloat("42°32'60.0N") would return 42 (stops at °), losing all precision.
    // This converts correctly: 42°32'60.0"N → 42 + 32/60 + 60/3600 = 42.5500°
    const parseDMS = (str) => {
      if (!str) return NaN;
      const s = str.replace(/"/g, '').trim();
      // Try plain decimal first (handles any future decimal-format rows)
      const dec = parseFloat(s);
      if (!isNaN(dec) && !s.includes('°')) return dec;
      // DMS: degrees°minutes'seconds"direction — e.g. 42°32'60.0"N or 42°32'60.0N
      const m = s.match(/(\d+)[°](\d+)[']([0-9.]+)["]?\s*([NSEWnsew])?/);
      if (!m) return NaN;
      let decimal = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600;
      const dir = (m[4] || '').toUpperCase();
      if (dir === 'S' || dir === 'W') decimal = -decimal;
      return decimal;
    };

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = []; let cur = ''; let inQ = false;
      for (const ch of lines[i]) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      vals.push(cur.trim());

      // CHANGED — correct column positions (old code read them in wrong order):
      // vals[0] = PORT CODE UNLCODE → full LOCODE (was wrongly used as countryCode)
      // vals[1] = PORT NAME         (was wrongly used as locode)
      // vals[2] = COUNTRY           (was never read at all)
      const locode      = (vals[0] || '').replace(/"/g, '').trim();
      const portName    = (vals[1] || '').replace(/"/g, '').trim();
      const countryCode = (vals[2] || '').replace(/"/g, '').trim();

      // CHANGED — use parseDMS instead of parseFloat; coordinates are in DMS format
      const lat = colLat >= 0 ? parseDMS(vals[colLat] || '') : NaN;
      const lon = colLon >= 0 ? parseDMS(vals[colLon] || '') : NaN;

      if (!portName || !locode) continue;

      // CHANGED — locode from vals[0] is already the full LOCODE (e.g. "INMUM")
      // Old code tried to combine countryCode+locode when locode.length<=3, which
      // was wrong because it was reading PORT NAME into locode (6+ chars → no combine
      // → id became "MUMBAI" instead of "INMUM")
      const fullLocode = locode.toUpperCase();

      rows.push({
        id:       fullLocode,
        name:     portName,
        city:     portName,
        country:  countryCode,
        lat:      isNaN(lat) ? null : lat,
        lon:      isNaN(lon) ? null : lon,
        keywords: (portName + ' ' + countryCode + ' ' + fullLocode).toLowerCase(),
      });
    }
    await _idbWrite(IDB_PORTS, rows);
    return rows;
  } catch (e) {
    console.warn('Port sheet fetch failed:', e.message);
    return [];
  }
};
