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
  if (!wps || wps.length < 2) return 0;
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
    <waypoint id="${i + 1}" name="WP${String(i + 1).padStart(2, '0')}">
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
