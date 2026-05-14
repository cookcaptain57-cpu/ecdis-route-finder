/* eslint-disable */

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEG = Math.PI / 180;
const R = 3440.065; // NM

const toRad = (d) => d * DEG;
const toDeg = (r) => r / DEG;

// ─── MATH CORE ────────────────────────────────────────────────────────────────
export function haversine(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const a =
    sinDLat * sinDLat +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      sinDLon *
      sinDLon;

  return R * 2 * Math.asin(Math.sqrt(a));
}

export function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);

  const lat1R = toRad(lat1);
  const lat2R = toRad(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2R);
  const x =
    Math.cos(lat1R) * Math.sin(lat2R) -
    Math.sin(lat1R) *
      Math.cos(lat2R) *
      Math.cos(dLon);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// ─── GREAT CIRCLE (HEAVY OPTIMIZATION) ───────────────────────────────────────
export function greatCircle(lat1, lon1, lat2, lon2, n) {
  const pts = [];

  const lat1R = toRad(lat1);
  const lon1R = toRad(lon1);
  const lat2R = toRad(lat2);
  const lon2R = toRad(lon2);

  const dLat = lat2R - lat1R;
  const dLon = lon2R - lon1R;

  const sinLat1 = Math.sin(lat1R);
  const cosLat1 = Math.cos(lat1R);
  const sinLat2 = Math.sin(lat2R);
  const cosLat2 = Math.cos(lat2R);

  const sinDLat2 = Math.sin(dLat / 2);
  const sinDLon2 = Math.sin(dLon / 2);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        sinDLat2 * sinDLat2 +
          cosLat1 * cosLat2 * sinDLon2 * sinDLon2
      )
    );

  if (d === 0) return [[lat1, lon1]];

  const sinD = Math.sin(d);

  for (let i = 0; i <= n; i++) {
    const f = i / n;

    const A = Math.sin((1 - f) * d) / sinD;
    const B = Math.sin(f * d) / sinD;

    const x =
      A * cosLat1 * Math.cos(lon1R) +
      B * cosLat2 * Math.cos(lon2R);

    const y =
      A * cosLat1 * Math.sin(lon1R) +
      B * cosLat2 * Math.sin(lon2R);

    const z = A * sinLat1 + B * sinLat2;

    pts.push([
      toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))),
      toDeg(Math.atan2(y, x)),
    ]);
  }

  return pts;
}

// ─── WAYPOINTS (FAST LOOP) ────────────────────────────────────────────────────
export function recalcWaypoints(wps = []) {
  const len = wps.length;
  if (!len) return [];

  const out = new Array(len);

  let total = 0;

  for (let i = 0; i < len; i++) {
    const wp = wps[i];

    if (i === 0) {
      out[i] = {
        ...wp,
        distance: 0,
        bearing: 0,
        totalNM: 0,
      };
      continue;
    }

    const prev = wps[i - 1];

    const dist = haversine(
      prev.lat,
      prev.lon,
      wp.lat,
      wp.lon
    );

    const bear = calcBearing(
      prev.lat,
      prev.lon,
      wp.lat,
      wp.lon
    );

    total += dist;

    out[i] = {
      ...wp,
      distance: dist,
      bearing: bear,
      totalNM: total,
    };
  }

  return out;
}

export function totalRouteNM(wps = []) {
  let sum = 0;
  for (let i = 0; i < wps.length; i++) {
    sum += wps[i].distance || 0;
  }
  return sum;
}

// ─── RTZ PARSER (DOM OPTIMIZED) ───────────────────────────────────────────────
export function parseRTZ(xmlText) {
  try {
    const xml = new DOMParser().parseFromString(
      xmlText,
      "text/xml"
    );

    const nodes = xml.getElementsByTagName("waypoint");

    const result = [];

    for (let i = 0; i < nodes.length; i++) {
      const wp = nodes[i];
      const pos = wp.getElementsByTagName("position")[0];

      if (!pos) continue;

      const lat = +pos.getAttribute("lat") || 0;
      const lon = +pos.getAttribute("lon") || 0;

      result.push({
        lat,
        lon,
        name: wp.getAttribute("name") || undefined,
      });
    }

    const routeInfo =
      xml.getElementsByTagName("routeInfo")[0];

    const routeName =
      routeInfo?.getAttribute("routeName") ||
      "Loaded Route";

    return {
      waypoints: recalcWaypoints(result),
      name: routeName,
    };
  } catch {
    return null;
  }
}

// ─── EXPORT RTZ (STRING BUILD OPTIMIZED) ─────────────────────────────────────
export function exportRTZ(routeName, waypoints = []) {
  const parts = [];

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];

    parts.push(
      `<waypoint id="${i + 1}" name="WP${String(
        i + 1
      ).padStart(2, "0")}">
      <position lat="${wp.lat.toFixed(
        6
      )}" lon="${wp.lon.toFixed(6)}"/>
      <leg starboardXTD="0.1" portXTD="0.1" xtdUnit="NM"/>
    </waypoint>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<route version="1.0" xmlns="http://www.cirm.org/RTZ/1/0">
  <routeInfo routeName="${routeName}" vesselName="" vesselMMSI="" vesselIMO="" author="NavisphereX Marine" status="1" routeStatusEnum="1"/>
  <waypoints>
${parts.join("")}
  </waypoints>
</route>`;
}

// ─── CSV (FASTER STRING BUILD) ────────────────────────────────────────────────
export function exportCSV(waypoints = []) {
  const rows = new Array(waypoints.length + 1);

  rows[0] =
    "WP,Name,Latitude,Longitude,Bearing(°),Distance(NM),Total(NM)";

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];

    rows[i + 1] =
      `WP${String(i + 1).padStart(2, "0")},` +
      `${wp.name || ""},` +
      `${(+wp.lat).toFixed(6)},` +
      `${(+wp.lon).toFixed(6)},` +
      `${(wp.bearing || 0).toFixed(1)},` +
      `${(wp.distance || 0).toFixed(1)},` +
      `${(wp.totalNM || 0).toFixed(1)}`;
  }

  return rows.join("\n");
}

// ─── DOWNLOAD (NO CHANGE, ALREADY OPTIMAL) ───────────────────────────────────
export function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// ─── TIME HELPERS ─────────────────────────────────────────────────────────────
export const addHours = (date, hours) =>
  new Date(date.getTime() + hours * 3600000);

export function formatDateLocal(date, offsetHours) {
  const local = addHours(date, offsetHours);
  return (
    local
      .toISOString()
      .replace("T", " ")
      .substring(0, 16) +
    ` (UTC${offsetHours >= 0 ? "+" : ""}${offsetHours})`
  );
}

// ─── SMART MATCH (FAST EARLY EXIT) ────────────────────────────────────────────
export function smartMatch(file = {}, q = "") {
  if (!q) return true;

  const ql = q.toLowerCase().trim();

  const fields = [
    file.fileName,
    file.portName,
    file.keywords,
    file.brand,
    file.type,
    file.region,
    file.description,
  ];

  for (let i = 0; i < fields.length; i++) {
    const v = fields[i];
    if (v && String(v).toLowerCase().includes(ql)) {
      return true;
    }
  }

  return false;
}
