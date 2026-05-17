/* eslint-disable */
// src/sheets.js — All Google Sheet fetch/search helpers

import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

// ─── searchSheetLive — checks IDB first, falls back to network ────────────
export const searchSheetLive = async (sheetId, query, tabNames = ['Sheet1'], maxResults = 50) => {
  if (!query || query.trim().length < 2) return [];
  const ql = query.toLowerCase().trim();
  const cacheKey = `${sheetId}:${ql}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return cached.data;

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

// ─── fetchRouteSheet — IDB first, then Google Sheet ───────────────────────
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

// ─── fetchChartSheet — IDB first, then Google Sheet ───────────────────────
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

// ─── fetchPortsFromSheet — IDB first, then Google Sheet ───────────────────
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

    const colLat = headers.findIndex(h => h.includes('lat'));
    const colLon = headers.findIndex(h => h.includes('lon') || h.includes('lng'));

    const parseDMS = (str) => {
      if (!str) return NaN;
      const s = str.replace(/"/g, '').trim();
      const dec = parseFloat(s);
      if (!isNaN(dec) && !s.includes('°')) return dec;
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

      const locode      = (vals[0] || '').replace(/"/g, '').trim();
      const portName    = (vals[1] || '').replace(/"/g, '').trim();
      const countryCode = (vals[2] || '').replace(/"/g, '').trim();
      const lat = colLat >= 0 ? parseDMS(vals[colLat] || '') : NaN;
      const lon = colLon >= 0 ? parseDMS(vals[colLon] || '') : NaN;

      if (!portName || !locode) continue;

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

// ─── NEW: pushSheetsToFirestore ────────────────────────────────────────────
// Called ONLY by Admin Sync Now button after fresh Google Sheet fetch.
// Saves all 3 datasets to Firestore so every user gets them instantly.
// Nothing else calls this function.
export const pushSheetsToFirestore = async (routes, charts, ports) => {
  try {
    await Promise.all([
      routes && routes.length > 0
        ? setDoc(doc(db, 'sheetCache', 'routes'), { data: routes, updatedAt: Date.now() })
        : Promise.resolve(),
      charts && charts.length > 0
        ? setDoc(doc(db, 'sheetCache', 'charts'), { data: charts, updatedAt: Date.now() })
        : Promise.resolve(),
      ports && ports.length > 0
        ? setDoc(doc(db, 'sheetCache', 'ports'),  { data: ports,  updatedAt: Date.now() })
        : Promise.resolve(),
    ]);
    console.log('✅ Sheets pushed to Firestore successfully');
    return true;
  } catch (e) {
    console.warn('Firestore push failed:', e.message);
    return false;
  }
};

// ─── NEW: loadSheetsFromFirestore ──────────────────────────────────────────
// Called by App on startup BEFORE hitting Google Sheet.
// Priority order: IDB (instant) → Firestore (fast) → Google Sheet (slow)
// Returns { routes, charts, ports } — same structure App expects.
// Nothing about existing functions changes — this is purely additive.
export const loadSheetsFromFirestore = async () => {
  try {
    const [rSnap, cSnap, pSnap] = await Promise.all([
      getDoc(doc(db, 'sheetCache', 'routes')),
      getDoc(doc(db, 'sheetCache', 'charts')),
      getDoc(doc(db, 'sheetCache', 'ports')),
    ]);
    const routes = rSnap.exists() ? (rSnap.data().data || []) : [];
    const charts = cSnap.exists() ? (cSnap.data().data || []) : [];
    const ports  = pSnap.exists() ? (pSnap.data().data || []) : [];

    // Also save to IDB so next visit is even faster (offline too)
    if (routes.length > 0) await _idbWrite(IDB_ROUTES, routes);
    if (charts.length > 0) await _idbWrite(IDB_CHARTS, charts);
    if (ports.length  > 0) await _idbWrite(IDB_PORTS,  ports);

    return { routes, charts, ports };
  } catch (e) {
    console.warn('Firestore load failed:', e.message);
    return { routes: [], charts: [], ports: [] };
  }
};
// ─── Maritime Library Sheet IDs ────────────────────────────────────────────
export const LIBRARY_SHEET_ID  = '16FLiXlhpbHja6y7esH-UsWYB0JQoB5Kr_x5hqbiJIQw';
export const SOFTWARE_SHEET_ID = '1ckCXVUzubcHlCy76JZgAImGDQTRNBUEwn2uX1C237rw';

// ─── fetchLibrarySheet — fetches Maritime Library + Sailors Software ───────
// Returns merged array of { category, title, url, downloadUrl, fileId, mimeType }
// No existing functions are changed.
export const fetchLibrarySheet = async () => {
  try {
    const [libRows, swRows] = await Promise.allSettled([
      fetchSheetCSV(LIBRARY_SHEET_ID, 'Sheet1'),
      fetchSheetCSV(SOFTWARE_SHEET_ID, 'Sheet1'),
    ]);

    const lib = libRows.status === 'fulfilled' ? libRows.value : [];
    const sw  = swRows.status  === 'fulfilled' ? swRows.value  : [];

    // Normalise software rows: previewUrl → url, keep mimeType
    const swNorm = sw.map(r => ({
      category:    r.category    || 'SAILORS USEFUL SOFTWARE',
      title:       r.title       || '',
      url:         r.previewUrl  || r.url || '',
      downloadUrl: r.downloadUrl || '',
      fileId:      r.fileId      || '',
      mimeType:    r.mimeType    || '',
    }));

    // Normalise library rows
    const libNorm = lib.map(r => ({
      category:    r.category    || '',
      title:       r.title       || '',
      url:         r.url         || '',
      downloadUrl: r.downloadUrl || '',
      fileId:      r.fileId      || '',
      mimeType:    '',
    }));

    return [...libNorm, ...swNorm].filter(r => r.title && r.category);
  } catch (e) {
    console.warn('fetchLibrarySheet failed:', e.message);
    return [];
  }
};
