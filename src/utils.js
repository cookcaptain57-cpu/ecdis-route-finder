/* eslint-disable */
// src/utils.js

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065, d = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * d / 2) ** 2 +
    Math.cos(lat1 * d) * Math.cos(lat2 * d) * Math.sin((lon2 - lon1) * d / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function bearing(lat1, lon1, lat2, lon2) {
  const d = Math.PI / 180, r = 180 / Math.PI;
  return (Math.atan2(
    Math.sin((lon2 - lon1) * d) * Math.cos(lat2 * d),
    Math.cos(lat1 * d) * Math.sin(lat2 * d) - Math.sin(lat1 * d) * Math.cos(lat2 * d) * Math.cos((lon2 - lon1) * d)
  ) * r + 360) % 360;
}

export function greatCircle(lat1, lon1, lat2, lon2, n = 10) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, d = Math.PI / 180, r = 180 / Math.PI;
    const la1 = lat1 * d, lo1 = lon1 * d, la2 = lat2 * d, lo2 = lon2 * d;
    const d12 = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    if (d12 < 0.0001) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1 - f) * d12) / Math.sin(d12), B = Math.sin(f * d12) / Math.sin(d12);
    const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
    const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
    const z = A * Math.sin(la1) + B * Math.sin(la2);
    pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) * r, Math.atan2(y, x) * r]);
  }
  return pts;
}

export function recalcWaypoints(wps) {
  let total = 0;
  return wps.map((wp, i) => {
    if (i === 0) return { ...wp, bearing: 0, distance: 0, totalNM: 0 };
    const dist = haversine(wps[i - 1].lat, wps[i - 1].lon, wp.lat, wp.lon);
    const brng = bearing(wps[i - 1].lat, wps[i - 1].lon, wp.lat, wp.lon);
    total += dist;
    return { ...wp, bearing: brng, distance: dist, totalNM: total };
  });
}

export function totalRouteNM(wps) {
  if (!wps || wps.length === 0) return 0;
  return wps[wps.length - 1]?.totalNM || 0;
}

export function parseRTZ(xmlText) {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const wps = xml.querySelectorAll('waypoint');
    const result = [];
    wps.forEach(wp => {
      const pos = wp.querySelector('position');
      if (pos) {
        result.push({
          lat: parseFloat(pos.getAttribute('lat') || 0),
          lon: parseFloat(pos.getAttribute('lon') || 0),
          name: wp.getAttribute('name') || undefined,
        });
      }
    });
    const routeInfo = xml.querySelector('routeInfo');
    const routeName = routeInfo?.getAttribute('routeName') || 'Loaded Route';
    return { waypoints: recalcWaypoints(result), name: routeName };
  } catch (e) { return null; }
}

export function exportRTZ(routeName, waypoints) {
  const wpsXml = waypoints.map((wp, i) => `
    <waypoint id="${i + 1}" name="${wp.name || `WP${String(i + 1).padStart(2, '0')}`}">
      <position lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}"/>
      <leg starboardXTD="0.1" portXTD="0.1" xtdUnit="NM"/>
    </waypoint>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<route version="1.0" xmlns="http://www.cirm.org/RTZ/1/0">
  <routeInfo routeName="${routeName}" vesselName="" vesselMMSI="" vesselIMO="" author="NavisphereX Marine" status="1" routeStatusEnum="1"/>
  <waypoints>${wpsXml}
  </waypoints>
</route>`;
}

export function exportCSV(waypoints) {
  const header = 'WP,Name,Latitude,Longitude,Bearing(°),Distance(NM),Total(NM)';
  const rows = waypoints.map((wp, i) =>
    `WP${String(i + 1).padStart(2, '0')},${wp.name || ''},${wp.lat.toFixed(6)},${wp.lon.toFixed(6)},${(wp.bearing || 0).toFixed(1)},${(wp.distance || 0).toFixed(1)},${(wp.totalNM || 0).toFixed(1)}`
  );
  return [header, ...rows].join('\n');
}

export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 3600000);
}

export function formatDateLocal(date, offsetHours) {
  const local = addHours(date, offsetHours);
  return local.toISOString().replace('T', ' ').substring(0, 16) + ` (UTC${offsetHours >= 0 ? '+' : ''}${offsetHours})`;
}

// ── Point-in-Polygon (ray casting) — used by route safety check ──────────────
export function pointInPolygon(lat, lon, polygon) {
  // polygon: array of [lat, lon] pairs
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// ── IndexedDB helpers — persist routes and preferences across sessions ────────
const _IDB_NAME = 'maritime-planner-v1';
const _IDB_VER  = 1;

function _openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_IDB_NAME, _IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('routes'))
        db.createObjectStore('routes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('prefs'))
        db.createObjectStore('prefs', { keyPath: 'key' });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function idbSaveRoute(route) {
  const db = await _openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('routes', 'readwrite');
    tx.objectStore('routes').put(route);
    tx.oncomplete = () => res(true);
    tx.onerror    = e => rej(e.target.error);
  });
}

export async function idbLoadRoutes() {
  const db = await _openIDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction('routes', 'readonly');
    const req = tx.objectStore('routes').getAll();
    req.onsuccess = e => res(e.target.result || []);
    req.onerror   = e => rej(e.target.error);
  });
}

export async function idbDeleteRoute(id) {
  const db = await _openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('routes', 'readwrite');
    tx.objectStore('routes').delete(id);
    tx.oncomplete = () => res(true);
    tx.onerror    = e => rej(e.target.error);
  });
}

export async function idbSavePref(key, value) {
  const db = await _openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction('prefs', 'readwrite');
    tx.objectStore('prefs').put({ key, value });
    tx.oncomplete = () => res(true);
    tx.onerror    = e => rej(e.target.error);
  });
}

export async function idbLoadPref(key, fallback = null) {
  const db = await _openIDB();
  return new Promise((res, rej) => {
    const tx  = db.transaction('prefs', 'readonly');
    const req = tx.objectStore('prefs').get(key);
    req.onsuccess = e => res(e.target.result ? e.target.result.value : fallback);
    req.onerror   = e => rej(e.target.error);
  });
}

// ── ECDIS / Navigation Export Formats ────────────────────────────────────────

export function exportGPX(routeName, waypoints) {
  const wpts = waypoints.map((wp, i) =>
    `  <wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">\n    <name>${wp.name || `WP${String(i+1).padStart(2,'0')}`}</name>\n    <desc>${i>0?`Crs:${(wp.bearing||0).toFixed(1)}deg Dist:${(wp.distance||0).toFixed(2)}NM`:''}</desc>\n  </wpt>`
  ).join('\n');
  const rtePts = waypoints.map((wp, i) =>
    `      <rtept lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">\n        <name>${wp.name || `WP${String(i+1).padStart(2,'0')}`}</name>\n      </rtept>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="NavisphereX Marine" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${routeName}</name><time>${new Date().toISOString()}</time></metadata>
${wpts}
  <rte>
    <name>${routeName}</name>
${rtePts}
  </rte>
</gpx>`;
}

export function exportNMEAWPL(routeName, waypoints) {
  const lines = [`// Route: ${routeName}`, `// Generated: ${new Date().toISOString()}`, ''];
  waypoints.forEach((wp, i) => {
    const name = (wp.name || `WP${String(i+1).padStart(2,'0')}`).replace(/\s+/g,'').substring(0,15);
    const laA = Math.abs(wp.lat), loA = Math.abs(wp.lon);
    const laD = Math.floor(laA), loD = Math.floor(loA);
    const laM = (laA - laD) * 60, loM = (loA - loD) * 60;
    const body = `GPWPL,${String(laD).padStart(2,'0')}${laM.toFixed(4)},${wp.lat>=0?'N':'S'},${String(loD).padStart(3,'0')}${loM.toFixed(4)},${wp.lon>=0?'E':'W'},${name}`;
    let cs = 0;
    for (let c = 0; c < body.length; c++) cs ^= body.charCodeAt(c);
    lines.push(`$${body}*${cs.toString(16).toUpperCase().padStart(2,'0')}`);
  });
  return lines.join('\n');
}

export function exportFurunoCSV(routeName, waypoints) {
  const rows = [
    `ROUTE NAME,${routeName}`,
    `CREATED,${new Date().toISOString().split('T')[0]}`,
    `TOTAL NM,${(waypoints[waypoints.length-1]?.totalNM||0).toFixed(1)}`,
    '',
    'No,Name,Latitude,Longitude,Course,Distance(NM),Cumulative(NM),Speed,TurnRadius,PortXTD,StbdXTD',
  ];
  waypoints.forEach((wp, i) => {
    const la = Math.abs(wp.lat), lo = Math.abs(wp.lon);
    const laD = Math.floor(la), loD = Math.floor(lo);
    const laS = `${String(laD).padStart(2,'0')}${((la-laD)*60).toFixed(3)}'${wp.lat>=0?'N':'S'}`;
    const loS = `${String(loD).padStart(3,'0')}${((lo-loD)*60).toFixed(3)}'${wp.lon>=0?'E':'W'}`;
    rows.push([
      String(i+1).padStart(3,'0'),
      wp.name || `WP${String(i+1).padStart(3,'0')}`,
      laS, loS,
      i>0?(wp.bearing||0).toFixed(1):'',
      i>0?(wp.distance||0).toFixed(2):'0.00',
      (wp.totalNM||0).toFixed(2),
      '', '0.30', '0.10', '0.10',
    ].join(','));
  });
  return rows.join('\r\n');
}

export function exportJRCCSV(routeName, waypoints) {
  const rows = [
    `;;JRC Route File`,
    `;;Route:${routeName}`,
    `;;Date:${new Date().toISOString()}`,
    `;;Waypoints:${waypoints.length}`,
    '',
    `;WP;Name;Lat;Lon;Speed;XTD_P;XTD_S;Radius;Course;Distance`,
  ];
  waypoints.forEach((wp, i) => {
    rows.push([
      'WP', String(i).padStart(4,'0'),
      wp.name || `WP${String(i+1).padStart(3,'0')}`,
      wp.lat.toFixed(7), wp.lon.toFixed(7),
      '0.0', '0.100', '0.100', '0.300',
      i>0?(wp.bearing||0).toFixed(2):'0.00',
      i>0?(wp.distance||0).toFixed(3):'0.000',
    ].join(';'));
  });
  return rows.join('\r\n');
}

export function exportTransasXML(routeName, waypoints) {
  const wpsXml = waypoints.map((wp, i) =>
    `\n    <waypoint id="${i}" name="${wp.name||`WP${String(i+1).padStart(3,'0')}`}" revision="1" radius="0.300">\n      <position lat="${wp.lat.toFixed(7)}" lon="${wp.lon.toFixed(7)}"/>\n      <leg portXTD="0.100" starboardXTD="0.100" safetyContour="30.000" geometryType="Loxodrome"/>\n    </waypoint>`
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<route version="1.0" xmlns="http://www.cirm.org/RTZ/1/0">
  <routeInfo routeName="${routeName}" author="NavisphereX Marine" validityTime="${new Date().toISOString()}" status="1"/>
  <waypoints>${wpsXml}
  </waypoints>
  <extensions>
    <extension manufacturer="Transas" name="RouteExtension" version="1.0">
      <chartDatum>WGS84</chartDatum>
    </extension>
  </extensions>
</route>`;
}

export function exportKML(routeName, waypoints) {
  const coords = waypoints.map(wp => `${wp.lon.toFixed(6)},${wp.lat.toFixed(6)},0`).join(' ');
  const pmarks = waypoints.map((wp, i) =>
    `    <Placemark>\n      <name>${wp.name||`WP${String(i+1).padStart(2,'0')}`}</name>\n      <description>Leg ${i+1}${i>0?` | Crs: ${(wp.bearing||0).toFixed(1)}deg | Dist: ${(wp.distance||0).toFixed(1)} NM`:''}</description>\n      <Point><coordinates>${wp.lon.toFixed(6)},${wp.lat.toFixed(6)},0</coordinates></Point>\n    </Placemark>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${routeName}</name>
  <Folder>
    <name>Route Line</name>
    <Placemark>
      <name>${routeName}</name>
      <Style><LineStyle><color>ff00b4d8</color><width>3</width></LineStyle></Style>
      <LineString><coordinates>${coords}</coordinates></LineString>
    </Placemark>
  </Folder>
  <Folder>
    <name>Waypoints</name>
${pmarks}
  </Folder>
</Document>
</kml>`;
}
