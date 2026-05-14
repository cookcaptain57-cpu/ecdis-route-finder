/* eslint-disable */

// ─── MATH HELPERS ─────────────────────────────────────────────────────────────
export const DEG = Math.PI / 180;

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // NM
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * DEG;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG);
  const x = Math.cos(lat1*DEG)*Math.sin(lat2*DEG) - Math.sin(lat1*DEG)*Math.cos(lat2*DEG)*Math.cos(dLon);
  return ((Math.atan2(y, x) / DEG) + 360) % 360;
}

export function greatCircle(lat1, lon1, lat2, lon2, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const d = 2*Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if (d === 0) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1-f)*d)/Math.sin(d);
    const B = Math.sin(f*d)/Math.sin(d);
    const x = A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y = A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z = A*Math.sin(lat1*DEG)+B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z,Math.sqrt(x*x+y*y))/DEG, Math.atan2(y,x)/DEG]);
  }
  return pts;
}

export function recalcWaypoints(wps) {
  return wps.map((wp, i) => {
    if (i === 0) return { ...wp, distance: 0, bearing: 0, totalNM: 0 };
    const prev = wps[i-1];
    const dist = haversine(prev.lat, prev.lon, wp.lat, wp.lon);
    const bear = calcBearing(prev.lat, prev.lon, wp.lat, wp.lon);
    const totalNM = (wps[i-1].totalNM || 0) + dist;
    return { ...wp, distance: dist, bearing: bear, totalNM };
  });
}

export function totalRouteNM(wps) {
  return wps.reduce((s, w) => s + (w.distance || 0), 0);
}

// ─── RTZ PARSE / EXPORT ───────────────────────────────────────────────────────
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
  } catch (e) {
    return null;
  }
}

export function exportRTZ(routeName, waypoints) {
  const wpsXml = waypoints.map((wp, i) => `
    <waypoint id="${i+1}" name="WP${String(i+1).padStart(2,'0')}">
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
    `WP${String(i+1).padStart(2,'0')},${wp.name||''},${wp.lat.toFixed(6)},${wp.lon.toFixed(6)},${(wp.bearing||0).toFixed(1)},${(wp.distance||0).toFixed(1)},${(wp.totalNM||0).toFixed(1)}`
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

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────
export function addHours(date, hours) {
  return new Date(date.getTime() + hours * 3600000);
}

export function formatDateLocal(date, offsetHours) {
  const local = addHours(date, offsetHours);
  return local.toISOString().replace('T',' ').substring(0,16) + ` (UTC${offsetHours>=0?'+':''}${offsetHours})`;
}

// ─── SMART MATCH ─────────────────────────────────────────────────────────────
export function smartMatch(file, q) {
  if (!q.trim()) return true;
  const ql = q.toLowerCase().trim();
  return [file.fileName,file.portName,file.keywords,file.brand,file.type,file.region,file.description]
    .filter(Boolean).map(s => s.toLowerCase()).some(t => t.includes(ql));
}
