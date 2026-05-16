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

export const searchSheetLive = async (sheetId, query, tabNames = ['Sheet1'], maxResults = 50) => {
  if (!query || query.trim().length < 2) return [];
  const ql = query.toLowerCase().trim();
  const cacheKey = `${sheetId}:${ql}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return cached.data;
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

// ─── fetchRouteSheet — IDB cache, fetch only if empty ─────────────────────
const ROUTE_TABS = ['Sheet1', 'Routes', 'Route', 'Data', 'Sheet2'];
export const fetchRouteSheet = async () => {
  const cached = await _idbRead(IDB_ROUTES);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  return ROUTE_TABS.reduce(
    (chain, tab) =>
      chain.catch(() =>
        fetch(`https://opensheet.elk.sh/${ROUTE_SHEET_ID}/${tab}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => { if (!Array.isArray(d) || d.length === 0) throw new Error(); return d; })
      ),
    Promise.reject()
  ).then(async d => { await _idbWrite(IDB_ROUTES, d); return d; })
   .catch(() => []);
};

// ─── fetchChartSheet — IDB cache, fetch only if empty ─────────────────────
const CHART_TABS = ['Sheet1', 'Charts', 'ECDIS Charts', 'Routes', 'Chart', 'Data', 'Sheet2'];
export const fetchChartSheet = async () => {
  const cached = await _idbRead(IDB_CHARTS);
  if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  return CHART_TABS.reduce(
    (chain, tab) =>
      chain.catch(() =>
        fetch(`https://opensheet.elk.sh/${CHART_SHEET_ID}/${tab}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => { if (!Array.isArray(d) || d.length === 0) throw new Error(); return d; })
      ),
    Promise.reject()
  ).then(async d => { await _idbWrite(IDB_CHARTS, d); return d; })
   .catch(() => []);
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
    const colC = headers.indexOf('port name') >= 0 ? headers.indexOf('port name') :
      headers.indexOf('portname') >= 0 ? headers.indexOf('portname') :
        headers.indexOf('name') >= 0 ? headers.indexOf('name') : 2;
    const colLat = headers.findIndex(h => h.includes('lat'));
    const colLon = headers.findIndex(h => h.includes('lon') || h.includes('lng'));
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = []; let cur = ''; let inQ = false;
      for (const ch of lines[i]) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      vals.push(cur.trim());
      const countryCode = (vals[0] || '').replace(/"/g, '').trim();
      const locode      = (vals[1] || '').replace(/"/g, '').trim();
      const portName    = (vals[colC] || '').replace(/"/g, '').trim();
      const lat         = colLat >= 0 ? parseFloat(vals[colLat] || '') : NaN;
      const lon         = colLon >= 0 ? parseFloat(vals[colLon] || '') : NaN;
      if (!portName || !locode) continue;
      const fullLocode = locode.length <= 3 ? (countryCode + locode) : locode;
      rows.push({
        id:       fullLocode.toUpperCase(),
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
