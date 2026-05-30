/* eslint-disable */
// src/sheets.js — Google Sheet fetch + Firestore sync + IndexedDB cache

import { db } from './firebase';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

export const ROUTE_SHEET_ID = '1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE';
export const CHART_SHEET_ID = '1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA';
export const PORTS_SHEET_ID = '1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk';

// ─── Firestore collection + chunk size ─────────────────────────────────────
const CACHE_COL  = 'app_cache';
const CHUNK_SIZE = 500;

// ─── Firestore: write chunks ───────────────────────────────────────────────
const _writeChunks = async (prefix, arr) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += CHUNK_SIZE) chunks.push(arr.slice(i, i + CHUNK_SIZE));
  const BATCH_LIMIT = 400;
  for (let b = 0; b < chunks.length; b += BATCH_LIMIT) {
    const batch = writeBatch(db);
    chunks.slice(b, b + BATCH_LIMIT).forEach((chunk, j) => {
      batch.set(doc(db, CACHE_COL, `${prefix}_${b + j}`), {
        i: b + j,
        d: JSON.stringify(chunk),
      });
    });
    await batch.commit();
  }
  return chunks.length;
};

// ─── Firestore: read chunks ────────────────────────────────────────────────
const _readChunks = async (prefix, count) => {
  const snaps = await Promise.all(
    Array.from({ length: count }, (_, i) => getDoc(doc(db, CACHE_COL, `${prefix}_${i}`)))
  );
  return snaps.flatMap(s => (s.exists() ? JSON.parse(s.data().d) : []));
};

// ─── Firestore meta (version document) ────────────────────────────────────
export const getFirestoreMeta = async () => {
  try {
    const snap = await getDoc(doc(db, CACHE_COL, 'meta'));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
};

// ─── Admin: Sync routes → Firestore ───────────────────────────────────────
export const syncRoutesToFirestore = async (routes) => {
  const rc = await _writeChunks('routes', routes);
  await setDoc(doc(db, CACHE_COL, 'meta'), { rv: String(Date.now()), rc }, { merge: true });
  return rc;
};

// ─── Admin: Sync charts → Firestore ───────────────────────────────────────
export const syncChartsToFirestore = async (charts) => {
  const cc = await _writeChunks('charts', charts);
  await setDoc(doc(db, CACHE_COL, 'meta'), { cv: String(Date.now()), cc }, { merge: true });
  return cc;
};

// ─── Admin: Sync ports → Firestore ────────────────────────────────────────
export const syncPortsToFirestore = async (ports) => {
  const pc = await _writeChunks('ports', ports);
  await setDoc(doc(db, CACHE_COL, 'meta'), { pv: String(Date.now()), pc }, { merge: true });
  return pc;
};

// ─── Users: Load from Firestore ───────────────────────────────────────────
export const loadRoutesFromFirestore = (count) => _readChunks('routes', count);
export const loadChartsFromFirestore = (count) => _readChunks('charts', count);
export const loadPortsFromFirestore  = (count) => _readChunks('ports',  count);

// ─── IndexedDB cache ───────────────────────────────────────────────────────
const IDB_NAME  = 'mnav_db';
const IDB_STORE = 'cache';

function _idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE, { keyPath: 'k' });
    r.onsuccess = e => res(e.target.result);
    r.onerror   = () => rej(r.error);
  });
}

export async function idbGet(key) {
  try {
    const db = await _idbOpen();
    return new Promise((res, rej) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result?.v ?? null);
      req.onerror   = () => rej(req.error);
    });
  } catch { return null; }
}

export async function idbSet(key, value) {
  try {
    const db = await _idbOpen();
    return new Promise((res, rej) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put({ k: key, v: value });
      tx.oncomplete = res;
      tx.onerror    = () => rej(tx.error);
    });
  } catch {}
}

// ─── Existing helpers (unchanged) ─────────────────────────────────────────
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

// ─── Parallel tab fetcher ──────────────────────────────────────────────────
const _fetchTab = (sheetId, tab) =>
  fetch(`https://opensheet.elk.sh/${sheetId}/${tab}`)
    .then(r => { if (!r.ok) throw new Error(); return r.json(); })
    .then(d => { if (!Array.isArray(d) || d.length === 0) throw new Error(); return d; });

const CHART_TABS = ['Sheet1', 'Charts', 'ECDIS Charts', 'Routes', 'Chart', 'Data', 'Sheet2'];
export const fetchChartSheet = () =>
  Promise.any(CHART_TABS.map(tab => _fetchTab(CHART_SHEET_ID, tab))).catch(() => []);

export const fetchRouteSheet = () => {
  const ROUTE_TABS = ['Sheet1', 'Routes', 'Route', 'Data', 'Sheet2'];
  return Promise.any(ROUTE_TABS.map(tab => _fetchTab(ROUTE_SHEET_ID, tab))).catch(() => []);
};

// ─── parseDMS ─────────────────────────────────────────────────────────────
const parseDMS = (str) => {
  if (!str) return NaN;
  const s = str.replace(/"/g, '').trim();
  const m = s.match(/^(\d+)[°\s]+(\d+)['\s]+(\d+(?:\.\d+)?)\s*["']?\s*([NSEWnsew])/);
  if (m) {
    const decimal = parseFloat(m[1]) + parseFloat(m[2]) / 60 + parseFloat(m[3]) / 3600;
    return /[SWsw]/.test(m[4]) ? -decimal : decimal;
  }
  return parseFloat(s);
};

// ─── fetchPortsFromSheet ───────────────────────────────────────────────────
export const fetchPortsFromSheet = async () => {
  const PAGE_SIZE = 3000;

  const parseLine = (line) => {
    const vals = []; let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    vals.push(cur.trim());
    return vals;
  };

  const allRows = [];
  let offset = 0;
  let colC = 2, colLat = -1, colLon = -1;
  let headersFound = false;

  try {
    while (true) {
      const tq  = encodeURIComponent(`select * limit ${PAGE_SIZE + 1} offset ${offset}`);
      const url = `https://docs.google.com/spreadsheets/d/${PORTS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=PORTDATA&tq=${tq}`;
      const r   = await fetch(url);
      if (!r.ok) break;

      const csv   = await r.text();
      const lines = csv.trim().split('\n');
      if (lines.length < 2) break;

      if (!headersFound) {
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
        colC   = headers.indexOf('port name') >= 0 ? headers.indexOf('port name') :
                 headers.indexOf('portname')  >= 0 ? headers.indexOf('portname')  :
                 headers.indexOf('name')       >= 0 ? headers.indexOf('name') : 2;
        colLat = headers.findIndex(h => h.includes('lat'));
        colLon = headers.findIndex(h => h.includes('lon') || h.includes('lng'));
        headersFound = true;
      }

      const dataLineCount = lines.length - 1;
      for (let i = 1; i < lines.length; i++) {
        const vals        = parseLine(lines[i]);
        const countryCode = (vals[0] || '').replace(/"/g, '').trim();
        const locode      = (vals[1] || '').replace(/"/g, '').trim();
        const portName    = (vals[colC] || '').replace(/"/g, '').trim();
        const lat = colLat >= 0 ? parseDMS(vals[colLat] || '') : NaN;
        const lon = colLon >= 0 ? parseDMS(vals[colLon] || '') : NaN;
        if (!portName || !locode) continue;
        const fullLocode  = locode.length <= 3 ? (countryCode + locode) : locode;
        allRows.push({
          id:       fullLocode.toUpperCase(),
          name:     portName,
          city:     portName,
          country:  countryCode,
          lat:      isNaN(lat) ? null : lat,
          lon:      isNaN(lon) ? null : lon,
          keywords: (portName + ' ' + countryCode + ' ' + fullLocode).toLowerCase(),
        });
      }

      if (dataLineCount < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return allRows;
  } catch (e) {
    console.warn('Port sheet fetch failed:', e.message);
    return allRows.length > 0 ? allRows : [];
  }
};

// ─── Maritime Library Sheet IDs ────────────────────────────────────────────
export const LIBRARY_SHEET_ID  = '16FLiXlhpbHja6y7esH-UsWYB0JQoB5Kr_x5hqbiJIQw';
export const SOFTWARE_SHEET_ID = '1ckCXVUzubcHlCy76JZgAImGDQTRNBUEwn2uX1C237rw';

const IDB_LIBRARY = 'mnav_library';

// ─── fetchLibrarySheet ────────────────────────────────────────────────────
// FIX: library rows now read mimeType from sheet (was hardcoded as '' before).
// Both sheets are fetched in parallel; result is merged, IDB-cached as fallback.
export const fetchLibrarySheet = async () => {

  const normalise = (lib, sw) => {
    // ── Library sheet rows (LIBRARY_SHEET_ID / Sheet1) ──────────────────
    // AppScript columns: category | title | url | downloadUrl | fileId | mimeType | updatedAt
    const libNorm = lib.map(r => ({
      category:    (r.category    || '').trim(),
      title:       (r.title       || '').trim(),
      url:         (r.url         || '').trim(),
      downloadUrl: (r.downloadUrl || '').trim(),
      fileId:      (r.fileId      || '').trim(),
      // ← FIXED: was hardcoded '' — now reads from sheet so PDF/Office/image
      //   detection works for all library folders, not just Software sheet
      mimeType:    (r.mimeType    || '').trim(),
    }));

    // ── Software sheet rows (SOFTWARE_SHEET_ID / Sheet1) ────────────────
    const swNorm = sw.map(r => ({
      category:    (r.category    || 'SAILORS USEFUL SOFTWARE').trim(),
      title:       (r.title       || '').trim(),
      url:         (r.previewUrl  || r.url || '').trim(),
      downloadUrl: (r.downloadUrl || '').trim(),
      fileId:      (r.fileId      || '').trim(),
      mimeType:    (r.mimeType    || '').trim(),
    }));

    return [...libNorm, ...swNorm].filter(r => r.title && r.category);
  };

  // 1. Try network — both sheets in parallel
  try {
    const [libRes, swRes] = await Promise.allSettled([
      fetchSheetCSV(LIBRARY_SHEET_ID,  'Sheet1'),
      fetchSheetCSV(SOFTWARE_SHEET_ID, 'Sheet1'),
    ]);
    const lib    = libRes.status === 'fulfilled' ? libRes.value : [];
    const sw     = swRes.status  === 'fulfilled' ? swRes.value  : [];

    // Warn in dev console if either sheet returned nothing
    if (lib.length === 0) console.warn('fetchLibrarySheet: LIBRARY sheet returned 0 rows — check Sheet1 tab name and sharing');
    if (sw.length  === 0) console.warn('fetchLibrarySheet: SOFTWARE sheet returned 0 rows');

    const merged = normalise(lib, sw);
    if (merged.length > 0) {
      try { await idbSet(IDB_LIBRARY, merged); } catch {}
    }
    return merged;

  } catch (networkErr) {
    console.warn('fetchLibrarySheet network failed, trying IDB cache:', networkErr.message);
  }

  // 2. Network failed — IDB cache fallback
  try {
    const cached = await idbGet(IDB_LIBRARY);
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  } catch {}

  return [];
};
