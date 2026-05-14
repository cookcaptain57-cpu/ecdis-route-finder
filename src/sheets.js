/* eslint-disable */
export const ROUTE_SHEET_ID = ‘1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE’;
export const CHART_SHEET_ID_2 = ‘1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA’;

const searchCache = new Map();
export { searchCache };

// Convert DMS (42°32’60.0”N) or decimal string to float
const parseLat = (str) => {
if (!str) return NaN;
str = String(str).trim();
// Already decimal
const dec = parseFloat(str);
if (!isNaN(dec) && !str.includes(‘°’)) return dec;
// DMS format: 42°32’60.0”N
const m = str.match(/(\d+)[°\s]+(\d+)[’\s]+([0-9.]+)[”\s]*([NSEW])?/i);
if (m) {
let val = parseFloat(m[1]) + parseFloat(m[2])/60 + parseFloat(m[3])/3600;
if (m[4] && (m[4].toUpperCase()===‘S’ || m[4].toUpperCase()===‘W’)) val = -val;
return val;
}
return NaN;
};

const parseLon = (str) => parseLat(str);

export const csvToRows = (csv) => {
const lines = csv.trim().split(’\n’);
if (lines.length < 2) return [];
const headers = lines[0].split(’,’).map(h => h.replace(/”/g,’’).trim());
return lines.slice(1).map(line => {
const vals = []; let cur = ‘’; let inQ = false;
for (const ch of line) {
if (ch === ‘”’) inQ = !inQ;
else if (ch === ‘,’ && !inQ) { vals.push(cur.trim()); cur = ‘’; }
else cur += ch;
}
vals.push(cur.trim());
const obj = {};
headers.forEach((h, i) => obj[h] = (vals[i] || ‘’).replace(/”/g, ‘’));
return obj;
}).filter(r => Object.values(r).some(v => v));
};

export const fetchSheetCSV = async (sheetId, tabName = ‘Sheet1’) => {
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
const res = await fetch(url);
if (!res.ok) throw new Error(`${res.status}`);
return csvToRows(await res.text());
};

export const searchSheetLive = async (sheetId, query, tabNames = [‘Sheet1’], maxResults = 50) => {
if (!query || query.trim().length < 2) return [];
const ql = query.toLowerCase().trim();
const cacheKey = `${sheetId}:${ql}`;
const cached = searchCache.get(cacheKey);
if (cached && Date.now() - cached.ts < 300000) return cached.data;
let allRows = [];
for (const tab of tabNames) {
try {
const rows = await fetchSheetCSV(sheetId, tab);
allRows = […allRows, …rows.map(r => ({…r, _tab: tab}))];
if (allRows.length > 5000) break;
} catch { continue; }
}
const results = allRows.filter(r => {
const hay = Object.values(r).filter(Boolean).join(’ ’).toLowerCase();
return hay.includes(ql);
}).slice(0, maxResults);
searchCache.set(cacheKey, { data: results, ts: Date.now() });
return results;
};

export const API_1 =
“https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/Sheet1”;

const CHART_SHEET_ID = “1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA”;
const CHART_TABS = [“Sheet1”,“Charts”,“ECDIS Charts”,“Routes”,“Chart”,“Data”,“Sheet2”];
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
const PORTS_SHEET_ID = “1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk”;

export const fetchPortsFromSheet = async () => {
const SHEET_ID = PORTS_SHEET_ID;
const TAB = ‘PORTDATA’;
let csv = null;

// Method 1: gviz CSV
try {
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${TAB}`;
const r = await fetch(url);
if (r.ok) csv = await r.text();
} catch(e) { console.warn(‘gviz CSV failed:’, e.message); }

// Method 2: opensheet JSON
if (!csv) {
try {
const url = `https://opensheet.elk.sh/${SHEET_ID}/${TAB}`;
const r = await fetch(url);
if (r.ok) {
const data = await r.json();
if (Array.isArray(data) && data.length > 0) {
// data is array of objects with headers as keys
const rows = data.map(row => {
// Find locode, name, country, lat, lon keys
const keys = Object.keys(row);
const findKey = (…searches) => keys.find(k => searches.some(s => k.toLowerCase().replace(/[\s_]/g,’’).includes(s)));
const locodeKey = findKey(‘portcode’,‘locode’,‘unlcode’,‘code’);
const nameKey   = findKey(‘portname’,‘name’,‘port’);
const countryKey= findKey(‘country’);
const latKey    = findKey(‘lattitude’,‘latitude’,‘lat’);
const lonKey    = findKey(‘longitude’,‘lon’,‘lng’);
const locode  = locodeKey  ? String(row[locodeKey]||’’).trim()  : ‘’;
const name    = nameKey    ? String(row[nameKey]||’’).trim()    : ‘’;
const country = countryKey ? String(row[countryKey]||’’).trim() : ‘’;
const lat     = latKey     ? parseLat(row[latKey])              : NaN;
const lon     = lonKey     ? parseLon(row[lonKey])              : NaN;
if (!name || !locode || isNaN(lat) || isNaN(lon)) return null;
return { id: locode.toUpperCase(), name, city: name, country, lat, lon,
keywords: (name+’ ‘+country+’ ’+locode).toLowerCase() };
}).filter(Boolean);
if (rows.length > 0) {
console.log(`NavisphereX: Loaded ${rows.length} ports via opensheet`);
return rows;
}
}
}
} catch(e) { console.warn(‘opensheet failed:’, e.message); }
}

// Parse CSV
if (csv) {
try {
const lines = csv.trim().split(’\n’);
if (lines.length < 2) return [];
const headers = lines[0].split(’,’).map(h => h.replace(/”/g,’’).trim().toLowerCase());

```
  // Find column indices
  const colLocode  = headers.findIndex(h => h.includes('code') || h.includes('locode') || h.includes('unlcode'));
  const colName    = headers.findIndex(h => h.includes('port name') || h === 'port name' || h.includes('portname') || h === 'name');
  const colCountry = headers.findIndex(h => h.includes('country'));
  const colLat     = headers.findIndex(h => h.includes('lat'));
  const colLon     = headers.findIndex(h => h.includes('lon') || h.includes('lng'));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = []; let cur = ''; let inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') inQ = !inQ;
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    vals.push(cur.trim());
    const clean = v => (v||'').replace(/"/g,'').trim();
    const locode  = clean(vals[colLocode >= 0 ? colLocode : 0]);
    const name    = clean(vals[colName    >= 0 ? colName    : 1]);
    const country = clean(vals[colCountry >= 0 ? colCountry : 2]);
    const lat     = parseLat(clean(vals[colLat >= 0 ? colLat : 3]));
    const lon     = parseLon(clean(vals[colLon >= 0 ? colLon : 4]));
    if (!name || !locode || isNaN(lat) || isNaN(lon)) continue;
    rows.push({
      id: locode.toUpperCase(),
      name, city: name, country, lat, lon,
      keywords: (name+' '+country+' '+locode).toLowerCase(),
    });
  }
  console.log(`NavisphereX: Loaded ${rows.length} ports via CSV`);
  return rows;
} catch(e) {
  console.warn('CSV parse failed:', e.message);
}
```

}

console.warn(‘All port fetch methods failed’);
return [];
};

export function normalizeSheetRow(row, idx, tag) {
const pick = (…keys) => {
for (const k of keys) {
const col = Object.keys(row).find(c => c.toLowerCase().replace(/[\s_-]/g,’’).includes(k.toLowerCase().replace(/[\s_-]/g,’’)));
if (col && row[col]?.trim()) return row[col].trim();
}
return ‘’;
};
const fileName   = pick(‘filename’,‘name’,‘routename’,‘file’,‘title’)   || Object.values(row)[0]||’’;
const fileUrl    = pick(‘fileurl’,‘downloadurl’,‘drivelink’,‘googlelink’,‘link’,‘url’,‘download’) || ‘’;
const portName   = pick(‘portname’,‘port’,‘route’,‘routedesc’,‘description’,‘from’,‘departure’,‘ports’) || ‘’;
const keywords   = pick(‘keywords’,‘keyword’,‘tags’,‘search’)            || ‘’;
const type       = pick(‘type’,‘routetype’,‘category’)                  || ‘’;
const brand      = pick(‘brand’,‘ecdisbrand’,‘manufacturer’,‘make’)     || ‘’;
const model      = pick(‘model’,‘ecdismodel’,‘version’,‘series’)        || ‘’;
const region     = pick(‘region’,‘area’,‘sea’,‘ocean’,‘zone’)           || ‘’;
const allKw = [fileName,portName,keywords,type,brand,model,region].filter(Boolean).join(’ ’).toLowerCase();
return {id:`${tag}-${idx}`,fileName,fileUrl,portName,keywords:allKw,type,brand,model,region,source:‘sheet’};
}

export function normalizePortRow(row) {
const get = (…keys) => {
for (const k of keys) {
const col = Object.keys(row).find(c => c.toLowerCase().replace(/[\s_-]/g,’’) === k.toLowerCase().replace(/[\s_-]/g,’’));
if (col && row[col] !== undefined && row[col] !== ‘’) return String(row[col]).trim();
}
return ‘’;
};
const lat = parseLat(get(‘lattitude’,‘latitude’,‘lat’,‘LAT’,‘LATTITUDE’));
const lon = parseLon(get(‘longitude’,‘lon’,‘long’,‘LON’,‘LONG’));
if (isNaN(lat) || isNaN(lon)) return null;
const name = get(‘portname’,‘name’,‘port’,‘PORT NAME’,‘PORT’) || get(‘city’,‘City’,‘CITY’) || ‘’;
if (!name) return null;
const city    = get(‘city’,‘City’,‘CITY’) || name;
const country = get(‘country’,‘Country’,‘COUNTRY’,‘nation’) || ‘’;
const code    = get(‘locode’,‘code’,‘portcode’,‘PORT CODE UNLCODE’,‘PORTCODE’) || name.substring(0,3).toUpperCase();
const keywords = [name,city,country,code].filter(Boolean).join(’ ’).toLowerCase();
return {id:code, name, city, country, lat, lon, keywords};
}
