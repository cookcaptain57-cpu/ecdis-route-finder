/* eslint-disable */

import { recalcWaypoints, haversine, greatCircle } from "./utils";
import { PORTS_DB } from "./constants";

// ─────────────────────────────────────────────────────────────
// SEA WAYPOINT NETWORK
// ─────────────────────────────────────────────────────────────
export const SEA_WP = {
  SUEZ_N: { lat: 31.27, lon: 32.33, name: "SUEZ N" },
  SUEZ_S: { lat: 29.92, lon: 32.55, name: "SUEZ S" },
  RED_N: { lat: 29.77, lon: 32.55, name: "RED N" },
  RED_S: { lat: 15.0, lon: 41.5, name: "RED S" },
  BAB: { lat: 12.58, lon: 43.38, name: "BAB" },
  ADEN_G: { lat: 11.8, lon: 45.5, name: "ADEN G" },

  HORMUZ: { lat: 26.58, lon: 56.35, name: "HORMUZ" },
  HORMUZ_E: { lat: 23.5, lon: 59.0, name: "HORMUZ E" },

  IND_W_COAST: { lat: 14.0, lon: 73.0, name: "IND W COAST" },
  IND_TIP: { lat: 6.0, lon: 77.5, name: "IND TIP" },

  LANKA_S: { lat: 5.4, lon: 80.6, name: "LANKA S" },
  LANKA_SE: { lat: 6.0, lon: 82.0, name: "LANKA SE" },

  ANDAMAN: { lat: 10.5, lon: 94.0, name: "ANDAMAN" },
  MALACCA_C: { lat: 2.33, lon: 101.35, name: "MALACCA C" },
  MALACCA_S: { lat: 1.18, lon: 103.82, name: "MALACCA S" },

  S_CHINA_N: { lat: 14.0, lon: 112.0, name: "S CHINA N" },
  S_CHINA_S: { lat: 3.0, lon: 108.0, name: "S CHINA S" },

  PAC_NW: { lat: 48.0, lon: -160.0, name: "PAC NW" },
  PAC_NE: { lat: 40.0, lon: -150.0, name: "PAC NE" },

  ATLANTIC_C: { lat: 20.0, lon: -35.0, name: "ATLANTIC C" },
  ATLANTIC_S: { lat: -15.0, lon: -20.0, name: "ATLANTIC S" },
};

// ─────────────────────────────────────────────────────────────
// PORT EXIT CORRIDORS (simplified but stable)
// ─────────────────────────────────────────────────────────────
export const PORT_EXIT = {
  MUM: ["IND_W_COAST", "IND_TIP"],
  KOC: ["IND_W_COAST", "IND_TIP"],
  CHE: ["IND_TIP"],
  COL: ["LANKA_S"],
  SIN: ["MALACCA_S"],
  HKG: ["S_CHINA_N"],
  SHA: ["S_CHINA_N"],
  DXB: ["HORMUZ"],
  JED: ["RED_S"],
};

// ─────────────────────────────────────────────────────────────
// ROUTE TABLE (explicit overrides only)
// ─────────────────────────────────────────────────────────────
export const ROUTE_TABLE = {
  "MUM-SIN": [
    [18.93, 72.83],
    [14.0, 73.0],
    [10.0, 74.8],
    [6.0, 77.5],
    [5.8, 79.8],
    [3.09, 101.02],
    [1.29, 103.85],
  ],
};

// ─────────────────────────────────────────────────────────────
// HELPERS (ECDIS-LIKE ROUTING CORE)
// ─────────────────────────────────────────────────────────────

const add = (list, ...keys) =>
  keys.forEach((k) => SEA_WP[k] && list.push({ ...SEA_WP[k] }));

const dedupe = (arr) =>
  arr.filter(
    (p, i, a) =>
      i === 0 ||
      Math.abs(p.lat - a[i - 1].lat) > 0.15 ||
      Math.abs(p.lon - a[i - 1].lon) > 0.15
  );

// ─────────────────────────────────────────────────────────────
// MAIN ROUTE ENGINE (ECDIS-STYLE SIMPLIFIED)
// ─────────────────────────────────────────────────────────────
export function buildAutoRoute(fromPort, toPort) {
  const from = PORTS_DB.find((p) => p.id === fromPort);
  const to = PORTS_DB.find((p) => p.id === toPort);
  if (!from || !to) return [];

  const key = `${fromPort}-${toPort}`;
  const keyR = `${toPort}-${fromPort}`;

  // 1. USE PREDEFINED ROUTES (HIGHEST PRIORITY)
  const direct = ROUTE_TABLE[key] || ROUTE_TABLE[keyR];
  if (direct) {
    const pts = direct.map(([lat, lon], i, arr) => ({
      lat,
      lon,
      name: i === 0 ? from.name : i === arr.length - 1 ? to.name : undefined,
    }));
    return recalcWaypoints(pts);
  }

  const wps = [];

  // 2. PORT EXIT CONTROL (real shipping departure lanes)
  const fromExit = PORT_EXIT[from.id] || [];
  add(wps, ...fromExit);

  // 3. SIMPLE ZONE LOGIC (keeps routing maritime-safe)
  const isIndianOcean = (p) => p.lon > 40 && p.lon < 100 && p.lat > -40 && p.lat < 30;
  const isSEAsia = (p) => p.lon > 95 && p.lon < 120 && p.lat > -10 && p.lat < 25;
  const isEurope = (p) => p.lon < 30 && p.lat > 35;

  const fromIO = isIndianOcean(from);
  const toSEA = isSEAsia(to);
  const fromSEA = isSEAsia(from);
  const toIO = isIndianOcean(to);

  // 4. MAJOR SHIPPING CORRIDORS
  if (fromIO && toSEA) {
    add(wps, "IND_TIP", "LANKA_S", "ANDAMAN", "MALACCA_S");
  }

  if (fromSEA && toIO) {
    add(wps, "MALACCA_S", "ANDAMAN", "LANKA_S", "IND_TIP");
  }

  // 5. PACIFIC ROUTES (simplified great-circle corridor)
  const isPacific = (p) => p.lon > 120 || p.lon < -120;

  if (isPacific(from) || isPacific(to)) {
    add(wps, "PAC_NE", "PAC_NW");
  }

  // 6. BUILD FINAL ROUTE
  const raw = [
    { lat: from.lat, lon: from.lon, name: from.name },
    ...wps,
    { lat: to.lat, lon: to.lon, name: to.name },
  ];

  const cleaned = dedupe(raw);

  // 7. GREAT CIRCLE SEGMENTATION (ECDIS STYLE SMOOTHING)
  const finalRoute = [];

  for (let i = 0; i < cleaned.length - 1; i++) {
    const a = cleaned[i];
    const b = cleaned[i + 1];

    const dist = haversine(a.lat, a.lon, b.lat, b.lon);
    const steps = Math.max(3, Math.min(14, Math.floor(dist / 250)));

    const seg = greatCircle(a.lat, a.lon, b.lat, b.lon, steps);

    seg.forEach((pt, j) => {
      if (i > 0 && j === 0) return;
      finalRoute.push({
        lat: +pt[0].toFixed(4),
        lon: +pt[1].toFixed(4),
        name: j === 0 ? a.name : undefined,
      });
    });
  }

  if (finalRoute.length) finalRoute[finalRoute.length - 1].name = to.name;

  return recalcWaypoints(finalRoute);
}
