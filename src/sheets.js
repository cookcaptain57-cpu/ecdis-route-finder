/* eslint-disable */
// ─── LIVE GOOGLE SHEET SEARCH API ─────────────────────────────────────────────
export const ROUTE_SHEET_ID = '1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE';
export const CHART_SHEET_ID_2 = '1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA';

// Simple search cache to avoid re-fetching same queries
const searchCache = new Map();
export { searchCache };

export const csvToRows = (csv) => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim());
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

// Search Google Sheet live — debounced, cached, paginated
export const searchSheetLive = async (sheetId, query, tabNames = ['Sheet1'], maxResults = 50) => {
  if (!query || query.trim().length < 2) return [];
  const ql = query.toLowerCase().trim();
  const cacheKey = `${sheetId}:${ql}`;

  // Return cached result (5 min TTL)
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) return cached.data;

  let allRows = [];
  for (const tab of tabNames) {
    try {
      const rows = await fetchSheetCSV(sheetId, tab);
      allRows = [...allRows, ...rows.map(r => ({...r, _tab: tab}))];
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

// ─── GOOGLE SHEET APIs ─────────────────────────────────────────────────────────
export const API_1 =
  "https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/Sheet1";

// Chart sheet — try multiple likely tab names
const CHART_SHEET_ID = "1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA";
const CHART_TABS = ["Sheet1","Charts","ECDIS Charts","Routes","Chart","Data","Sheet2"];
export const fetchChartSheet = () =>
  CHART_TABS.reduce(
    (chain, tab) =>
      chain.catch(() =>
        fetch(`https://opensheet.elk.sh/${CHART_SHEET_ID}/${tab}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => { if (!Array.isArray(d) || d.length === 0) throw new Error(); return d; })
      ),
    Promise.reject()
  ).catch(() => []);

// ─── PORTS SHEET ────────────────────────────────────────────────────────────────
const PORTS_SHEET_ID = "1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk";

// Fetch ALL rows from Google Sheet using CSV export (no 1000-row limit)
export const fetchPortsFromSheet = async () => {
  const url = `https://docs.google.com/spreadsheets/d/${PORTS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=PORTDATA`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const csv = await r.text();
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.replace(/"/g,'').trim().toLowerCase());
    const colC = headers.indexOf('port name') >= 0 ? headers.indexOf('port name') :
                 headers.indexOf('portname')  >= 0 ? headers.indexOf('portname')  :
                 headers.indexOf('name')       >= 0 ? headers.indexOf('name')      : 2;
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
      const countryCode = (vals[0]||'').replace(/"/g,'').trim();
      const locode      = (vals[1]||'').replace(/"/g,'').trim();
      const portName    = (vals[2]||'').replace(/"/g,'').trim();
      const lat         = colLat >= 0 ? parseFloat(vals[colLat]||'') : NaN;
      const lon         = colLon >= 0 ? parseFloat(vals[colLon]||'') : NaN;
      if (!portName || !locode) continue;
      const fullLocode = locode.length <= 3 ? (countryCode + locode) : locode;
      rows.push({
        id: fullLocode.toUpperCase(),
        name: portName,
        city: portName,
        country: countryCode,
        lat: isNaN(lat) ? null : lat,
        lon: isNaN(lon) ? null : lon,
        keywords: (portName + ' ' + countryCode + ' ' + fullLocode).toLowerCase(),
      });
    }
    console.log('NavisphereX: Loaded ' + rows.length + ' ports from PORTDATA tab');
    return rows;
  } catch (e) {
    console.warn('Port sheet fetch failed:', e.message);
    return [];
  }
};

// ─── NORMALIZE GOOGLE SHEET ROW → STANDARD FILE OBJECT ───────────────────────
export function normalizeSheetRow(row, idx, tag) {
  const pick = (...keys) => {
    for (const k of keys) {
      const col = Object.keys(row).find(c => c.toLowerCase().replace(/[\s_\-]/g,'').includes(k.toLowerCase().replace(/[\s_\-]/g,'')));
      if (col && row[col]?.trim()) return row[col].trim();
    }
    return '';
  };
  const fileName   = pick('filename','name','routename','file','title')   || Object.values(row)[0]||'';
  const fileUrl    = pick('fileurl','downloadurl','drivelink','googlelink','link','url','download') || '';
  const portName   = pick('portname','port','route','routedesc','description','from','departure','ports') || '';
  const keywords   = pick('keywords','keyword','tags','search')            || '';
  const type       = pick('type','routetype','category')                  || '';
  const brand      = pick('brand','ecdisbrand','manufacturer','make')     || '';
  const model      = pick('model','ecdismodel','version','series')        || '';
  const region     = pick('region','area','sea','ocean','zone')           || '';
  const allKw = [fileName,portName,keywords,type,brand,model,region].filter(Boolean).join(' ').toLowerCase();
  return {id:`${tag}-${idx}`,fileName,fileUrl,portName,keywords:allKw,type,brand,model,region,source:'sheet'};
}

// ─── NORMALIZE PORT ROW from Google Sheet ─────────────────────────────────────
export function normalizePortRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const col = Object.keys(row).find(c => c.toLowerCase().replace(/[\s_\-]/g,'') === k.toLowerCase().replace(/[\s_\-]/g,''));
      if (col && row[col] !== undefined && row[col] !== '') return String(row[col]).trim();
    }
    return '';
  };
  const lat = parseFloat(get('latitude','lat','Latitude','LAT'));
  const lon = parseFloat(get('longitude','lon','long','Longitude','LON','LONG'));
  if (isNaN(lat) || isNaN(lon)) return null;
  const name = get('portname','name','port','PortName','Port Name','PORT') || get('city','City','CITY') || '';
  if (!name) return null;
  const city    = get('city','City','CITY') || name;
  const country = get('country','Country','COUNTRY','nation') || '';
  const code    = get('locode','code','portcode','PortCode','LOCODE','unlocode') || name.substring(0,3).toUpperCase();
  const keywords = [name,city,country,code].filter(Boolean).join(' ').toLowerCase();
  return {id:code, name, city, country, lat, lon, keywords};
}
