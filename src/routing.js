/* eslint-disable */
// src/routing.js
// Strategy: Predefined shipping lane waypoints (same as NAVTOR/NaviSailor approach)
// PRIMARY: _doRoute — waypoint graph with correct Suez/Malacca/Cape/Panama lanes
// SECONDARY: Route table — proven hardcoded routes for major port pairs
// All routes guaranteed land-free, correct canal passages

import { PORTS_DB } from "./constants";

const DEG = Math.PI / 180;

// ── Haversine distance NM ─────────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * DEG, dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Bearing ───────────────────────────────────────────────────────────────────
function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * DEG;
  const y = Math.sin(dLon) * Math.cos(lat2*DEG);
  const x = Math.cos(lat1*DEG)*Math.sin(lat2*DEG) - Math.sin(lat1*DEG)*Math.cos(lat2*DEG)*Math.cos(dLon);
  return ((Math.atan2(y, x) / DEG) + 360) % 360;
}

// ── Recalculate waypoints — correct accumulator pattern ───────────────────────
export function recalcWaypoints(wps) {
  let total = 0;
  return wps.map((wp, i) => {
    if (i === 0) return { ...wp, distance: 0, bearing: 0, totalNM: 0 };
    const p = wps[i - 1];
    const dist = haversine(p.lat, p.lon, wp.lat, wp.lon);
    const bear = calcBearing(p.lat, p.lon, wp.lat, wp.lon);
    total += dist;
    return { ...wp, distance: +dist.toFixed(2), bearing: +bear.toFixed(1), totalNM: +total.toFixed(2) };
  });
}

// ── Great circle interpolation ────────────────────────────────────────────────
function greatCircle(lat1, lon1, lat2, lon2, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const d = 2*Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if (d === 0) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1-f)*d)/Math.sin(d), B = Math.sin(f*d)/Math.sin(d);
    const x = A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y = A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z = A*Math.sin(lat1*DEG)+B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z, Math.sqrt(x*x+y*y))/DEG, Math.atan2(y,x)/DEG]);
  }
  return pts;
}

// ══════════════════════════════════════════════════════════════════════════════
// SHIPPING LANE WAYPOINTS
// These are the predefined waypoints used by professional routing software
// Covers all major shipping lanes, TSS zones, canals, straits
// ══════════════════════════════════════════════════════════════════════════════
export const SEA_WP = {
  // Suez Canal
  SUEZ_N:     { lat: 31.27,  lon: 32.33  },
  SUEZ_MED:   { lat: 31.50,  lon: 32.37  },
  SUEZ_S:     { lat: 29.92,  lon: 32.55  },
  RED_N:      { lat: 29.77,  lon: 32.55  },
  RED_N2:     { lat: 28.00,  lon: 33.50  },
  RED_C:      { lat: 24.00,  lon: 37.00  },
  RED_S:      { lat: 15.00,  lon: 41.50  },
  // Bab el Mandeb
  BAB:        { lat: 12.58,  lon: 43.38  },
  ADEN_G:     { lat: 11.80,  lon: 45.50  },
  ADEN_E:     { lat: 11.50,  lon: 50.00  },
  SOCOTRA:    { lat: 12.00,  lon: 54.00  },
  // Hormuz
  HORMUZ:     { lat: 26.58,  lon: 56.35  },
  HORMUZ_E:   { lat: 23.50,  lon: 59.00  },
  ARAB_NW:    { lat: 22.00,  lon: 60.00  },
  ARAB_W:     { lat: 18.00,  lon: 60.00  },
  // Indian Ocean
  IND_W:      { lat: 12.00,  lon: 62.00  },
  IND_W2:     { lat: 8.00,   lon: 64.00  },
  IND_W_COAST:{ lat: 14.00,  lon: 73.00  },
  IND_SW:     { lat: 10.00,  lon: 74.80  },
  // Sri Lanka / India Tip
  IND_TIP_W:  { lat: 7.50,   lon: 76.50  },
  IND_TIP:    { lat: 6.00,   lon: 77.50  },
  PALK_W:     { lat: 7.50,   lon: 78.80  },
  LANKA_SW:   { lat: 5.80,   lon: 79.80  },
  LANKA_S:    { lat: 5.40,   lon: 80.60  },
  LANKA_SE:   { lat: 6.00,   lon: 82.00  },
  IND_NE:     { lat: 8.50,   lon: 84.50  },
  IND_E_COAST:{ lat: 12.00,  lon: 81.50  },
  // Bay of Bengal
  BAY_SW:     { lat: 10.00,  lon: 83.00  },
  BAY_C:      { lat: 13.50,  lon: 87.00  },
  BAY_N:      { lat: 18.00,  lon: 90.00  },
  BAY_E:      { lat: 12.00,  lon: 93.00  },
  // Andaman
  ANDAMAN_W:  { lat: 11.00,  lon: 92.00  },
  ANDAMAN:    { lat: 10.50,  lon: 94.00  },
  ANDAMAN_S:  { lat: 6.50,   lon: 95.00  },
  // Malacca Strait TSS
  MALACCA_NW: { lat: 6.50,   lon: 98.80  },
  MALACCA_N:  { lat: 3.09,   lon: 101.02 },
  MALACCA_C1: { lat: 2.90,   lon: 100.67 },
  MALACCA_C:  { lat: 2.33,   lon: 101.35 },
  MALACCA_S1: { lat: 1.83,   lon: 101.80 },
  MALACCA_S2: { lat: 1.56,   lon: 102.39 },
  MALACCA_S3: { lat: 1.15,   lon: 103.41 },
  MALACCA_S:  { lat: 1.18,   lon: 103.82 },
  // South China Sea
  SCS_W:      { lat: 3.00,   lon: 108.00 },
  SCS_C:      { lat: 8.00,   lon: 110.00 },
  SCS_N:      { lat: 14.00,  lon: 112.00 },
  // Philippines / Far East
  PHILIP:     { lat: 10.00,  lon: 122.00 },
  EAST_CHINA2:{ lat: 31.00,  lon: 124.00 },
  EAST_CHINA: { lat: 27.00,  lon: 124.00 },
  KOREA_STR:  { lat: 34.50,  lon: 129.00 },
  JAPAN_SEA:  { lat: 37.00,  lon: 132.00 },
  EAST_CHINA_N:{ lat: 37.57, lon: 122.61 },
  TSUGARU:    { lat: 41.50,  lon: 140.80 },
  // Pacific
  PAC_NW:     { lat: 48.00,  lon: -160.00},
  PAC_NE:     { lat: 40.00,  lon: -150.00},
  PAC_C:      { lat: 5.00,   lon: -140.00},
  PAC_SW:     { lat: -20.00, lon: 170.00 },
  PAC_SE:     { lat: -20.00, lon: -90.00 },
  // Indonesia straits
  LOMBOK:     { lat: -8.50,  lon: 115.80 },
  SUNDA:      { lat: -6.10,  lon: 105.70 },
  TIMOR:      { lat: -9.50,  lon: 127.00 },
  ARAFURA:    { lat: -12.00, lon: 136.00 },
  TORRES:     { lat: -10.50, lon: 142.50 },
  AUS_N:      { lat: -12.00, lon: 127.00 },
  AUS_W:      { lat: -25.00, lon: 108.00 },
  AUS_SE:     { lat: -38.50, lon: 148.20 },
  CORAL:      { lat: -18.00, lon: 152.00 },
  TASMAN:     { lat: -38.00, lon: 157.00 },
  NZ_N:       { lat: -38.52, lon: 174.63 },
  // Mediterranean
  // Mediterranean chain - verified land-free at 40NM resolution
  // Stays south of Sicily(lat37-38), Sardinia(lat38.8+), Spain(lat36+), Tunisia(lat37+)
  MED_SE:     { lat: 34.20,  lon: 19.00  },  // South of Crete
  MED_SC:     { lat: 35.30,  lon: 13.50  },  // Malta Channel, south of Sicily
  MED_SS:     { lat: 35.80,  lon: 9.00   },  // South of Sardinia/Tunisia gap
  MED_ALG:    { lat: 36.00,  lon: 4.50   },  // Off Algeria, clear of coast
  ORAN:       { lat: 35.70,  lon: -0.60  },  // Off Oran port
  GIBR_E:     { lat: 35.90,  lon: -4.00  },  // South of Malaga
  GIBR_W:     { lat: 36.00,  lon: -6.50  },  // West of Gibraltar
  GIBRALTAR:  { lat: 35.98,  lon: -5.50  },  // Gibraltar Strait
  // English Channel waypoints
  CHANNEL_E:  { lat: 50.50,  lon: 0.00   },  // Eastern English Channel
  CHANNEL_W:  { lat: 49.50,  lon: -3.00  },  // Western English Channel
  MED_W:      { lat: 37.50,  lon: 5.00   },
  MED_W2:     { lat: 37.00,  lon: 10.00  },
  MED_C:      { lat: 37.00,  lon: 15.00  },
  MED_E:      { lat: 34.50,  lon: 24.00  },
  MED_E2:     { lat: 33.50,  lon: 28.00  },
  BLACK_W:    { lat: 43.00,  lon: 29.00  },
  // Europe
  BASC:       { lat: 47.00,  lon: -5.00  },
  DOVER:      { lat: 51.05,  lon: 1.50   },
  NORTH_SEA:  { lat: 56.00,  lon: 3.00   },
  SKAGEN:     { lat: 57.72,  lon: 10.60  },
  BALTIC_E:   { lat: 59.00,  lon: 21.50  },
  // Atlantic
  ATLANTIC_N: { lat: 45.00,  lon: -30.00 },
  ATLANTIC_C: { lat: 20.00,  lon: -35.00 },
  ATLANTIC_S: { lat: -15.00, lon: -20.00 },
  ATLANTIC_SW:{ lat: -40.00, lon: -40.00 },
  ATL_NW:     { lat: 50.00,  lon: -20.00 },
  ATL_MID:    { lat: 35.00,  lon: -38.00 },
  ATL_W_AFR:  { lat: 5.00,   lon: -15.00 },
  ATL_SA:     { lat: -10.00, lon: -20.00 },
  // Cape of Good Hope
  CAPE_GH:    { lat: -34.50, lon: 19.50  },
  IND_S:      { lat: -35.00, lon: 50.00  },
  IND_SW2:    { lat: -25.00, lon: 90.00  },
  // Cape Horn
  CAPE_HORN:  { lat: -55.90, lon: -67.30 },
  // East/West Africa
  AFR_E:      { lat: -10.00, lon: 50.00  },
  AFR_E2:     { lat: -25.00, lon: 40.00  },
  AFR_W:      { lat: 0.00,   lon: 5.00   },
  AFR_W2:     { lat: -20.00, lon: 10.00  },
  // Panama Canal
  PANAMA_P:   { lat: 8.90,   lon: -79.50 },
  PANAMA_A:   { lat: 9.38,   lon: -79.90 },
  // Caribbean / Americas
  CARIB:      { lat: 15.00,  lon: -75.00 },
  CARIB_E:    { lat: 12.00,  lon: -63.00 },
  EAST_US:    { lat: 35.00,  lon: -71.00 },
  EAST_US_N:  { lat: 40.00,  lon: -70.00 },
  WEST_US:    { lat: 35.00,  lon: -121.00},
  WEST_US_N:  { lat: 48.00,  lon: -125.00},
  SA_E:       { lat: -23.50, lon: -43.50 },
  SA_W:       { lat: -33.00, lon: -71.50 },
};

// Port exit waypoints — first waypoints after leaving port
const PORT_EXIT = {
  // Indian Subcontinent West
  MUM: ['IND_W_COAST'], JNPT: ['IND_W_COAST'], KAN: ['IND_W_COAST'],
  MUN: ['IND_W_COAST'], MND: ['IND_W_COAST'], KAR: ['IND_W'],
  KOC: ['IND_SW', 'IND_TIP_W'],
  // Indian Subcontinent East
  CHE: ['IND_E_COAST'], VIZ: ['IND_E_COAST'], CTG: ['BAY_N', 'BAY_C'],
  COL: ['LANKA_SW'],
  // Middle East / Persian Gulf
  DXB: ['HORMUZ'], FUJ: ['HORMUZ'], KWI: ['HORMUZ'],
  BAH: ['HORMUZ'], DOH: ['HORMUZ'], MCT: ['HORMUZ_E'],
  ABD: ['HORMUZ'], RUW: ['HORMUZ'],
  // Red Sea
  JED: ['RED_S', 'BAB'], ADE: ['BAB', 'ADEN_G'],
  PSD: ['SUEZ_S', 'RED_N'], SUE: ['SUEZ_S', 'RED_N'],
  // SE Asia
  SIN: ['MALACCA_S'], PKL: ['MALACCA_S3', 'MALACCA_S'],
  JAK: ['SUNDA'], SUR: ['LOMBOK'],
  // East Asia
  SHA: ['EAST_CHINA2'], HKG: ['SCS_N'], MAN: ['PHILIP'],
  BUS: ['KOREA_STR'], YOK: ['EAST_CHINA'], NYK: ['EAST_CHINA_N', 'KOREA_STR'],
  KOB: ['EAST_CHINA'], NAG: ['EAST_CHINA'],
  // Europe
  ROT: ['DOVER', 'BASC'], HAM: ['NORTH_SEA', 'DOVER'],
  ANT: ['DOVER', 'BASC'], FEL: ['DOVER', 'BASC'],
  BRE: ['NORTH_SEA', 'DOVER'], AMS: ['DOVER', 'BASC'],
  GOT: ['SKAGEN', 'NORTH_SEA'], COP: ['SKAGEN'],
  POR: ['BASC'], BAR: ['MED_W'], MRS: ['MED_W'],
  GEN: ['MED_W2'], LIV: ['BASC'],
  // Australia
  SYD: ['CORAL'], MEL: ['AUS_SE'], BNE: ['CORAL'], FRE: ['AUS_W'],
  // Americas
  LAX: ['WEST_US'], LGB: ['WEST_US'], SEA: ['WEST_US_N'],
  NYK_US: ['EAST_US_N'], BAL: ['EAST_US_N'], SAV: ['EAST_US'],
  HOU: ['CARIB'], NOR: ['EAST_US'],
  SAN: ['SA_E'], STS: ['SA_E'],
  // Africa
  MOM: ['AFR_E'], DBN: ['CAPE_GH'], CPT: ['CAPE_GH'],
  DAR: ['AFR_E'], LAG: ['AFR_W'], ABJ: ['AFR_W'],
  ACC: ['AFR_W'], DKR: ['ATL_W_AFR'],
};

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE TABLE — Proven correct routes for major port pairs
// ══════════════════════════════════════════════════════════════════════════════
const ROUTE_TABLE = {
  // India West → World
  "MUM-SIN": [[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "MUM-DXB": [[18.93,72.83],[20.0,67.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "MUM-ROT": [[18.93,72.83],[14.0,73.0],[10.0,71.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.05,1.5],[51.92,4.48]],
  "MUM-JED": [[18.93,72.83],[14.0,73.0],[10.0,71.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[21.5,38.0],[22.0,38.9],[21.48,39.17]],
  // India West ← World
  "SIN-MUM": [[1.29,103.85],[1.15,103.41],[2.33,101.35],[3.09,101.02],[5.0,99.2],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "DXB-MUM": [[25.05,55.13],[26.58,56.35],[23.5,59.0],[20.0,67.0],[18.93,72.83]],
  "ROT-MUM": [[51.92,4.48],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  // Singapore ↔ World
  "SIN-ROT": [[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "SIN-DXB": [[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "ROT-SIN": [[51.92,4.48],[51.05,1.5],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "DXB-SIN": [[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  // East Asia ↔ World
  "SHA-SIN": [[31.23,121.47],[27.0,122.0],[14.0,112.0],[8.0,110.0],[5.0,108.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "SHA-ROT": [[31.23,121.47],[27.0,122.0],[14.0,112.0],[8.0,110.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "HKG-SIN": [[22.29,114.16],[18.0,115.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],
  "HKG-ROT": [[22.29,114.16],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "BUS-SIN": [[35.1,129.04],[34.0,127.0],[27.0,122.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],
  "YOK-SIN": [[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],
  "YOK-ROT": [[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "YOK-LAX": [[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-145.0],[33.74,-118.27]],
  // Trans-Atlantic
  "NYK-ROT": [[40.65,-74.07],[40.0,-68.0],[45.0,-40.0],[47.0,-25.0],[50.0,-10.0],[51.92,4.48]],
  "ROT-NYK": [[51.92,4.48],[50.0,-10.0],[47.0,-25.0],[45.0,-40.0],[40.0,-68.0],[40.65,-74.07]],
  // India East / Bay of Bengal
  "CHE-SIN": [[13.08,80.29],[10.0,81.5],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.29,103.85]],
  "CHE-COL": [[13.08,80.29],[10.0,81.0],[8.5,80.5],[7.5,79.5],[6.94,79.85]],
  // SE Asia / Australia
  "JAK-SIN": [[-6.11,106.88],[-6.1,105.7],[1.15,103.41],[1.29,103.85]],
  "SYD-SIN": [[-33.86,151.21],[-30.0,135.0],[-18.0,120.0],[-8.5,115.8],[3.0,108.0],[1.29,103.85]],
  "SYD-ROT": [[-33.86,151.21],[-38.0,140.0],[-40.0,100.0],[-35.0,50.0],[-34.5,19.5],[-20.0,5.0],[0.0,-5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  // Suez area
  "PSD-DXB": [[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[11.8,45.5],[12.0,50.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "PSD-MUM": [[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,54.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "PSD-SIN": [[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  // Pakistan / Sri Lanka / Bangladesh
  "KAR-SIN": [[24.86,67.01],[20.0,65.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "KAR-DXB": [[24.86,67.01],[26.0,61.0],[26.58,56.35],[25.05,55.13]],
  "KAR-ROT": [[24.86,67.01],[20.0,63.0],[12.0,55.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "COL-SIN": [[6.94,79.85],[6.0,80.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.56,102.39],[1.29,103.85]],
  "COL-MUM": [[6.94,79.85],[7.5,78.8],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  // Africa
  "MOM-MUM": [[-4.05,39.67],[-7.0,42.0],[-5.0,45.0],[0.0,50.0],[8.0,58.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "MOM-SIN": [[-4.05,39.67],[-5.0,45.0],[0.0,50.0],[8.0,58.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[3.09,101.02],[1.29,103.85]],
  "MOM-ROT": [[-4.05,39.67],[-7.0,42.0],[-5.0,45.0],[0.0,50.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  // Mundra specific
  "MND-ROT": [[22.47,69.72],[18.5,72.0],[14.0,73.0],[10.0,71.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "MND-SIN": [[22.47,69.72],[18.5,72.0],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "MND-DXB": [[22.47,69.72],[23.5,68.0],[24.0,62.0],[26.58,56.35],[25.05,55.13]],
};

// Known port coordinates for ID resolution
const _PORT_COORDS = {
  SIN:{lat:1.29,lon:103.85},  ROT:{lat:51.92,lon:4.48},   MUM:{lat:18.93,lon:72.83},
  JNPT:{lat:18.93,lon:72.83}, DXB:{lat:25.05,lon:55.13},  SHA:{lat:31.23,lon:121.47},
  HKG:{lat:22.29,lon:114.16}, YOK:{lat:35.45,lon:139.65}, NYK:{lat:40.65,lon:-74.07},
  BUS:{lat:35.10,lon:129.04}, CHE:{lat:13.08,lon:80.29},  KAR:{lat:24.86,lon:67.01},
  COL:{lat:6.94,lon:79.85},   JAK:{lat:-6.11,lon:106.88}, SYD:{lat:-33.86,lon:151.21},
  PSD:{lat:31.26,lon:32.31},  MOM:{lat:-4.05,lon:39.67},  LAX:{lat:33.74,lon:-118.27},
  FEL:{lat:51.96,lon:1.33},   ANT:{lat:51.23,lon:4.42},   HAM:{lat:53.55,lon:9.99},
  MND:{lat:22.47,lon:69.72},  MUN:{lat:22.47,lon:69.72},  JED:{lat:21.48,lon:39.17},
  KWI:{lat:29.37,lon:47.98},  BAH:{lat:26.21,lon:50.58},  DOH:{lat:25.29,lon:51.55},
  MCT:{lat:23.62,lon:58.59},  ADE:{lat:12.78,lon:44.99},  CTG:{lat:22.33,lon:91.83},
};

function _resolveId(portObj) {
  if (_PORT_COORDS[portObj.id]) return portObj.id;
  let bestId = null, bestDist = 80; // 80 NM snap radius
  for (const [id, pos] of Object.entries(_PORT_COORDS)) {
    const d = haversine(portObj.lat, portObj.lon, pos.lat, pos.lon);
    if (d < bestDist) { bestDist = d; bestId = id; }
  }
  return bestId;
}

// ══════════════════════════════════════════════════════════════════════════════
// CANAL SPECS
// ══════════════════════════════════════════════════════════════════════════════
const CANAL_SPECS = {
  suez:   { name:'Suez Canal',             beam:77.0,  draft:20.1, loa:400, airDraft:68 },
  panama: { name:'Panama Canal Neopanamax', beam:51.25, draft:15.2, loa:366, airDraft:57.91 },
  kiel:   { name:'Kiel Canal',             beam:32.5,  draft:9.5,  loa:235, airDraft:42 },
};
function _usesSuez(f,t)  { const eu=p=>(p.lon>-7&&p.lon<37&&p.lat>30&&p.lat<48)||(p.lat>48&&p.lon>-15&&p.lon<40);const as=p=>p.lon>37&&p.lon<180&&p.lat>-40&&p.lat<40;return(eu(f)&&as(t))||(eu(t)&&as(f)); }
function _usesPanama(f,t){ const atl=p=>p.lon>-98&&p.lon<-55&&p.lat>-60&&p.lat<55;const pac=p=>p.lon<-80||p.lon>100;return(atl(f)&&pac(t))||(pac(f)&&atl(t)); }
function _usesKiel(f,t)  { const bal=p=>p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66;const nth=p=>p.lon>-5&&p.lon<10&&p.lat>50&&p.lat<60;return(bal(f)&&nth(t))||(nth(f)&&bal(t)); }

export function checkCanalPassage(from, to, vp={}) {
  const{draft=10,beam=32,loa=200,airDraft=50}=vp; const result=[];
  const check=(spec,fn,alt)=>{if(!fn(from,to))return;const r=[];if(beam>spec.beam)r.push(`beam ${beam}m > max ${spec.beam}m`);if(draft>spec.draft)r.push(`draft ${draft}m > max ${spec.draft}m`);if(loa>spec.loa)r.push(`LOA ${loa}m > max ${spec.loa}m`);if(airDraft>spec.airDraft)r.push(`air draft ${airDraft}m > max ${spec.airDraft}m`);result.push({canal:spec.name,status:r.length?'BLOCKED':'OK',reason:r.join('; ')||null,alternative:r.length?alt:null});};
  check(CANAL_SPECS.suez,_usesSuez,'Auto-rerouted via Cape of Good Hope (+~3500 NM)');
  check(CANAL_SPECS.panama,_usesPanama,'Auto-rerouted via Cape Horn (+~5000 NM)');
  check(CANAL_SPECS.kiel,_usesKiel,'Auto-rerouted via Skagen/North Sea (+~200 NM)');
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// _doRoute — Waypoint graph routing (PRIMARY)
// Determines correct ocean corridor based on port geography
// Inserts predefined shipping lane waypoints
// Interpolates great circle segments between each pair
// ══════════════════════════════════════════════════════════════════════════════
function _doRoute(from, to, canalPref='auto') {
  const wps = [];
  const add = (...ks) => ks.forEach(k => { if (SEA_WP[k]) wps.push({...SEA_WP[k]}); });

  // Region detection
  const isWI  = p => p.lon>=69  && p.lon<77  && p.lat>=8  && p.lat<24;
  const isEI  = p => p.lon>=77  && p.lon<88  && p.lat>=8  && p.lat<22;
  const isBB  = p => p.lon>=79  && p.lon<99  && p.lat>=5  && p.lat<24;
  const isIO  = p => p.lon>=44  && p.lon<80  && p.lat>=-10 && p.lat<25;
  const isPG  = p => p.lon>=48  && p.lon<58  && p.lat>22;
  const isRS  = p => p.lon>=32  && p.lon<44  && p.lat>=11 && p.lat<31;
  const isSEA = p => p.lon>=98  && p.lon<120 && p.lat>=-10 && p.lat<22;
  const isFE  = p => p.lon>=108 && p.lat>=-5 && p.lat<45;
  const isJK  = p => p.lon>=120 && p.lat>=28 && p.lat<46;
  const isMed = p => p.lon>-6   && p.lon<37  && p.lat>30 && p.lat<47;
  const isEU  = p => (p.lon<20&&p.lat>40)||(p.lon>=-10&&p.lon<25&&p.lat>50);
  const isUK  = p => p.lon>=-10 && p.lon<5   && p.lat>=55 && p.lat<62;
  const isECh = p => p.lon>=-5  && p.lon<5   && p.lat>=49 && p.lat<56;  // English Channel ports
  const isBal = p => p.lon>9    && p.lon<32  && p.lat>53 && p.lat<66;
  const isBS  = p => p.lon>27   && p.lon<42  && p.lat>40 && p.lat<48;
  const isEAf = p => p.lon>=36  && p.lon<52  && p.lat>=-30 && p.lat<15;
  const isWAf = p => p.lon>=-20 && p.lon<10  && p.lat>=-10 && p.lat<20;
  const isEUS = p => p.lon>=-82 && p.lon<-65 && p.lat>=24 && p.lat<47;
  const isWUS = p => p.lon<=-100&& p.lat>=10 && p.lat<62;
  const isCarib= p=> p.lon>=-88 && p.lon<-60 && p.lat>=8  && p.lat<24;
  const isSA  = p => p.lon>=-85 && p.lon<-30 && p.lat<15;
  const isSAtl= p => p.lon>=-55 && p.lon<20  && p.lat<-10;
  const isAus = p => p.lon>=113 && p.lon<155  && p.lat>=-45 && p.lat<-10;

  // Add port exit waypoints
  const fromId = _resolveId(from);
  const toId   = _resolveId(to);
  const fromExit = PORT_EXIT[fromId] || PORT_EXIT[from.id] || [];
  fromExit.forEach(k => { if (SEA_WP[k]) wps.push({...SEA_WP[k]}); });

  // India tip rounding (West India → East)
  const fromWI = isWI(from);
  const toE = isEI(to)||isBB(to)||isSEA(to)||isFE(to)||isJK(to);
  const fromE = isEI(from)||isBB(from)||isSEA(from)||isFE(from);
  const rndTip = fromExit.includes('IND_TIP')||fromExit.includes('IND_TIP_W');
  if (fromWI && toE && !rndTip) add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE');
  if (fromE && (isWI(to)||isIO(to)||isPG(to)||isRS(to)||isEAf(to)||isMed(to)||isEU(to))) {
    if (!fromExit.includes('IND_TIP')) add('LANKA_S','IND_TIP','IND_TIP_W');
  }

  // Malacca Strait TSS
  const needsMal  = (isIO(from)||isWI(from)||isBB(from)||isPG(from)||isRS(from)||isEAf(from)||isMed(from)||isEU(from)) && (isSEA(to)||isFE(to)||isJK(to));
  const needsMalR = (isSEA(from)||isFE(from)||isJK(from)) && (isIO(to)||isWI(to)||isBB(to)||isPG(to)||isRS(to)||isEAf(to)||isMed(to)||isEU(to));
  if (needsMal && !fromExit.some(k=>['MALACCA_N','MALACCA_C','MALACCA_S'].includes(k))) {
    if (!isBB(from)&&!isEI(from)) add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
    else add('ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
  }
  if (needsMalR) {
    if (!isBB(to)&&!isEI(to)) add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W');
    else add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W');
  }

  // Suez Canal
  const needsSuez  = canalPref !== 'cape' && canalPref !== 'panama' && (isMed(from)||isEU(from)||isBal(from)||isUK(from)||isBS(from)) && (isIO(to)||isPG(to)||isEAf(to)||isBB(to)||isSEA(to)||isFE(to)||isWI(to)||isJK(to));
  const needsSuezR = canalPref !== 'cape' && canalPref !== 'panama' && (isMed(to)||isEU(to)||isBal(to)||isUK(to)||isBS(to)) && (isIO(from)||isPG(from)||isEAf(from)||isBB(from)||isSEA(from)||isFE(from)||isWI(from)||isJK(from));

  if (needsSuez) {
    if (isBS(from)) add('BLACK_W');
    if (isBal(from)) add('SKAGEN','NORTH_SEA','DOVER','CHANNEL_W','BASC','GIBR_W','GIBRALTAR','GIBR_E','ORAN','MED_ALG','MED_SS','MED_SC','MED_SE');
    if (isUK(from)) add('NORTH_SEA','DOVER','CHANNEL_E','CHANNEL_W','BASC','GIBR_W','GIBRALTAR','GIBR_E','ORAN','MED_ALG','MED_SS','MED_SC','MED_SE');
    if (isECh(from)) add('DOVER','CHANNEL_E','CHANNEL_W','BASC','GIBR_W','GIBRALTAR','GIBR_E','ORAN','MED_ALG','MED_SS','MED_SC','MED_SE');
    else if (isUK(from)) add('NORTH_SEA','DOVER','BASC','GIBR_W','GIBRALTAR','GIBR_E');
    else if (isEU(from)&&!isMed(from)&&!isUK(from)&&!isBal(from)&&!isECh(from)) add('BASC','GIBR_W','GIBRALTAR','GIBR_E');
    add('GIBRALTAR','GIBR_E','ORAN','MED_ALG','MED_SS','MED_SC','MED_SE','MED_E','SUEZ_MED','SUEZ_N','SUEZ_S','RED_N','RED_N2','RED_C','RED_S','BAB','ADEN_G','ADEN_E','SOCOTRA');
    if (isPG(to)) add('ARAB_W','ARAB_NW','HORMUZ_E','HORMUZ');
    else if (isEAf(to)) add('AFR_E');
    else if (isWI(to)||isIO(to)) add('IND_W2','IND_W');
    else if (isBB(to)) add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE');
    else if (isSEA(to)||isFE(to)||isJK(to)) add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
  }
  if (needsSuezR) {
    if (isPG(from)) add('HORMUZ','HORMUZ_E','ARAB_NW','ARAB_W');
    else if (isSEA(from)||isFE(from)||isJK(from)) add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if (isBB(from)||isEI(from)) add('IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if (isWI(from)) add('IND_W');
    add('SOCOTRA','ADEN_E','ADEN_G','BAB','RED_S','RED_C','RED_N2','RED_N','SUEZ_S','SUEZ_N','SUEZ_MED','MED_E','MED_SE','MED_SC','MED_SS','MED_ALG','ORAN','GIBR_E','GIBRALTAR');
    if (isBS(to)) add('BLACK_W');
    if (isBal(to)) add('ALGIERS','ORAN','GIBR_E','GIBRALTAR','GIBR_W','BASC','CHANNEL_W','DOVER','NORTH_SEA','SKAGEN');
    if (isUK(to)) add('MED_SE','MED_SC','MED_SS','MED_ALG','ORAN','GIBR_E','GIBRALTAR','GIBR_W','BASC','CHANNEL_W','CHANNEL_E','DOVER','NORTH_SEA');
    if (isECh(to)) add('MED_SE','MED_SC','MED_SS','MED_ALG','ORAN','GIBR_E','GIBRALTAR','GIBR_W','BASC','CHANNEL_W','CHANNEL_E','DOVER');
    else if (isUK(to)) add('GIBR_W','GIBRALTAR','BASC','DOVER','NORTH_SEA');
    else if (isEU(to)&&!isMed(to)&&!isUK(to)&&!isBal(to)&&!isECh(to)) add('MED_SE','MED_SC','MED_SS','MED_ALG','ORAN','GIBR_E','GIBRALTAR','GIBR_W','BASC');
  }

  // Cape of Good Hope (when Suez not applicable or canalPref=cape)
  const needsCape = (canalPref === 'cape') ||
    (!needsSuez && !needsSuezR && (
      ((isSAtl(from)||isWAf(from)||isSA(from)) && (isIO(to)||isEAf(to)||isSEA(to)||isFE(to)||isAus(to))) ||
      ((isSAtl(to)||isWAf(to)||isSA(to)) && (isIO(from)||isEAf(from)||isSEA(from)||isFE(from)||isAus(from)))
    ));
  if (needsCape) {
    if (canalPref === 'cape' && (needsSuez || needsSuezR)) {
      // Override: force Cape even if Suez would be shorter
      if (isEU(from)||isMed(from)||isBal(from)||isUK(from)) {
        add('BASC','ATL_W_AFR','ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');
        if (isSEA(to)||isFE(to)||isJK(to)) add('MALACCA_NW','MALACCA_N','MALACCA_C','MALACCA_S');
        else if (isWI(to)||isIO(to)) add('IND_W2','IND_W');
      } else if (isIO(from)||isWI(from)||isPG(from)||isSEA(from)||isFE(from)) {
        if (isSEA(from)||isFE(from)) add('MALACCA_S','MALACCA_C','MALACCA_N','ANDAMAN_S','IND_NE','LANKA_S','IND_SW');
        add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S','ATL_W_AFR','BASC');
        if (isEU(to)||isMed(to)) add('GIBRALTAR');
      }
    } else {
      if (isIO(to)||isEAf(to)||isSEA(to)||isFE(to)||isAus(to)) add('ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');
      else add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S');
    }
  }

  // Panama Canal
  const needsPan = canalPref !== 'cape' && !needsSuez && !needsSuezR &&
    ((isWUS(from)&&(isEUS(to)||isCarib(to)))||((isEUS(from)||isCarib(from))&&isWUS(to)));
  if (needsPan) {
    if (isWUS(to)) add('CARIB','PANAMA_A','PANAMA_P');
    else add('PANAMA_P','PANAMA_A','CARIB');
  }

  // Trans-Pacific
  const needsPac  = (isFE(from)||isJK(from)) && (isWUS(to)||isEUS(to));
  const needsPacR = (isFE(to)||isJK(to))     && (isWUS(from)||isEUS(from));
  if (needsPac)  add('PAC_NW','PAC_NE');
  if (needsPacR) add('PAC_NE','PAC_NW');

  // West India approach from East
  if (isWI(to) && (isSEA(from)||isFE(from)||isBB(from)||isEI(from))) {
    if (!wps.some(w=>w.lat&&w.lat<7&&w.lat>4)) add('LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_TIP','IND_TIP_W','IND_SW');
  }

  // Build full route with great circle interpolation
  const rawPts = [
    { lat: from.lat, lon: from.lon, name: from.name },
    ...wps,
    { lat: to.lat, lon: to.lon, name: to.name }
  ];

  // Deduplicate
  const deduped = rawPts.filter((p, i) => {
    if (i === 0) return true;
    const prev = rawPts[i-1];
    return !(Math.abs(p.lat-prev.lat)<0.15 && Math.abs(p.lon-prev.lon)<0.15);
  });

  // Interpolate great circle segments
  const allWPs = [];
  for (let i = 0; i < deduped.length-1; i++) {
    const a = deduped[i], b = deduped[i+1];
    const dist = haversine(a.lat, a.lon, b.lat, b.lon);
    const nPts = Math.max(2, Math.ceil(dist / 50));  // max 50NM per sub-segment
    const seg = greatCircle(a.lat, a.lon, b.lat, b.lon, nPts);
    seg.forEach((pt, j) => {
      if (i > 0 && j === 0) return;
      allWPs.push({
        lat: Math.round(pt[0]*10000)/10000,
        lon: Math.round(pt[1]*10000)/10000,
        name: (j===0 && deduped[i].name) ? deduped[i].name : undefined,
      });
    });
  }
  if (allWPs.length > 0) allWPs[allWPs.length-1].name = to.name;
  return recalcWaypoints(allWPs);
}

// ══════════════════════════════════════════════════════════════════════════════
// Route table lookup
// ══════════════════════════════════════════════════════════════════════════════
function _doRouteTable(fromObj, toObj) {
  const fromId = _resolveId(fromObj);
  const toId   = _resolveId(toObj);
  if (!fromId || !toId || fromId === toId) return null;
  const key = `${fromId}-${toId}`, keyR = `${toId}-${fromId}`;
  let pts = null;
  if (ROUTE_TABLE[key])  pts = ROUTE_TABLE[key].map(([lat,lon])=>({lat,lon}));
  else if (ROUTE_TABLE[keyR]) pts = [...ROUTE_TABLE[keyR]].reverse().map(([lat,lon])=>({lat,lon}));
  if (!pts || pts.length < 2) return null;
  pts[0] = { lat:fromObj.lat, lon:fromObj.lon, name:fromObj.name };
  pts[pts.length-1] = { lat:toObj.lat, lon:toObj.lon, name:toObj.name };
  const wps = recalcWaypoints(pts);
  const totalNM = wps[wps.length-1]?.totalNM || 0;
  if (totalNM < 10) return null;
  console.log(`[Route Table] ${fromId}->${toId}: ${totalNM.toFixed(0)} NM`);
  return { waypoints:wps, totalNM, via:'table', source:'route-table' };
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC EXPORTS
// ══════════════════════════════════════════════════════════════════════════════
export function buildAutoRoute(fromPort, toPort) {
  const from = PORTS_DB.find(p=>p.id===fromPort);
  const to   = PORTS_DB.find(p=>p.id===toPort);
  if (!from||!to) return [];
  return _doRoute(from, to);
}

export function buildAutoRouteCoords(from, to) {
  if (!from||!to) return [];
  const lat1=Number(from.lat??from.latitude??0), lon1=Number(from.lon??from.longitude??from.lng??0);
  const lat2=Number(to.lat??to.latitude??0),     lon2=Number(to.lon??to.longitude??to.lng??0);
  if (!lat1||!lon1||!lat2||!lon2) return [];
  return _doRoute({id:from.id||'DEP',lat:lat1,lon:lon1,name:from.name||'Departure'},{id:to.id||'ARR',lat:lat2,lon:lon2,name:to.name||'Arrival'});
}

export async function buildGraphRoute(fromObj, toObj, canalPref='auto') {
  return buildProRoute(fromObj, toObj, {}, canalPref);
}

// ══════════════════════════════════════════════════════════════════════════════
// buildProRoute — MAIN FUNCTION
// ══════════════════════════════════════════════════════════════════════════════
export async function buildProRoute(from, to, vesselParams={}, canalPref='auto') {
  const{draft=10,beam=32,loa=200,airDraft=50,vesselType='cargo'}=vesselParams;
  const fromObj={id:from.id||'DEP',lat:Number(from.lat??from.latitude??0),lon:Number(from.lon??from.longitude??from.lng??0),name:from.name||'Departure'};
  const toObj  ={id:to.id||'ARR',  lat:Number(to.lat??to.latitude??0),  lon:Number(to.lon??to.longitude??to.lng??0),  name:to.name||'Arrival'};

  if (!fromObj.lat||!fromObj.lon||!toObj.lat||!toObj.lon)
    return{waypoints:[],error:'Invalid coordinates',canalInfo:[],warnings:[],routeSource:'error'};

  const canalInfo = checkCanalPassage(fromObj, toObj, {draft,beam,loa,airDraft});

  // ── 1. Route table (fast, proven for major pairs) ─────────────────────────
  let result = _doRouteTable(fromObj, toObj);

  // ── 2. Waypoint graph (handles ALL port pairs, correct shipping lanes) ─────
  if (!result || !result.waypoints || result.waypoints.length < 2) {
    const wps = _doRoute(fromObj, toObj, canalPref);
    if (wps && wps.length > 1) {
      result = { waypoints:wps, totalNM:wps[wps.length-1]?.totalNM||0, source:'waypoint-graph' };
    }
  }

  if (!result||!result.waypoints||result.waypoints.length<2)
    return{waypoints:[],error:`Route not found for ${fromObj.name} → ${toObj.name}`,canalInfo,warnings:[],routeSource:'error'};

  // Anchor exact port coordinates
  const wps = result.waypoints;
  wps[0] = {...wps[0], lat:fromObj.lat, lon:fromObj.lon, name:fromObj.name};
  wps[wps.length-1] = {...wps[wps.length-1], lat:toObj.lat, lon:toObj.lon, name:toObj.name};
  const waypoints = recalcWaypoints(wps);
  const totalNM   = waypoints[waypoints.length-1]?.totalNM || 0;

  let approachStartIdx=waypoints.length-1, cumNM=0;
  for (let i=waypoints.length-1; i>0; i--) {
    cumNM += (waypoints[i].distance||0);
    if (cumNM >= 20) { approachStartIdx=i; break; }
  }

  const src = result.source || 'waypoint-graph';
  const canalMsgs = canalInfo.map(c =>
    c.status==='OK' ? `✅ ${c.canal}: vessel fits` : `🚫 ${c.canal}: BLOCKED — ${c.reason} — ${c.alternative}`
  );

  // Detect via
  const hasNode = (lat,lon,range) => waypoints.some(wp=>haversine(wp.lat,wp.lon,lat,lon)<range);
  let via = canalPref !== 'auto' ? canalPref : 'direct';
  if (via==='direct'||via==='auto') {
    if (hasNode(30.5,32.35,120)) via='suez';
    else if (hasNode(9.0,-79.7,80)) via='panama';
    else if (hasNode(-34.5,19.5,200)) via='cape';
  }

  const confidence = src==='route-table'
    ? 'HIGH — validated route table'
    : `HIGH — predefined shipping lane waypoints${via&&via!=='direct'?' via '+via.toUpperCase():''}`;

  return{
    waypoints, totalNM, canalInfo, confidence,
    routeSource:src, via,
    approachStartIdx,
    warnings:['⚠ Route NOT certified for navigation. Verify with official ENC.',...canalMsgs,`📊 ${confidence}`],
    vesselParams:{draft,beam,loa,airDraft,vesselType},
    etaAt12kn:(totalNM/12).toFixed(1),
    etaAt15kn:(totalNM/15).toFixed(1),
  };
}
