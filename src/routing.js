/* eslint-disable */
// src/routing.js
// PRIMARY: searoute-ts (Eurostat 2025 MARNET, Dijkstra, canal-aware, land-free)
// FALLBACK 1: Hardcoded route table (proven major routes)
// FALLBACK 2: Waypoint graph (_doRoute)

import { seaRoute } from 'searoute-ts';
import { PORTS_DB } from "./constants";

const DEG = Math.PI / 180;

// ── Haversine distance in NM ──────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * DEG, dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Bearing between two points ────────────────────────────────────────────────
function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * DEG;
  const y = Math.sin(dLon) * Math.cos(lat2*DEG);
  const x = Math.cos(lat1*DEG)*Math.sin(lat2*DEG) - Math.sin(lat1*DEG)*Math.cos(lat2*DEG)*Math.cos(dLon);
  return ((Math.atan2(y, x) / DEG) + 360) % 360;
}

// ── Recalculate waypoints with bearing, distance, totalNM ────────────────────
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
    const d = 2 * Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2 + Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if (d === 0) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1-f)*d)/Math.sin(d), B = Math.sin(f*d)/Math.sin(d);
    const x = A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG) + B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y = A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG) + B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z = A*Math.sin(lat1*DEG) + B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z, Math.sqrt(x*x+y*y))/DEG, Math.atan2(y,x)/DEG]);
  }
  return pts;
}

// ══════════════════════════════════════════════════════════════════════════════
// PRIMARY: searoute-ts
// canalPref: 'auto' | 'suez' | 'panama' | 'cape'
// ══════════════════════════════════════════════════════════════════════════════
async function _routeViaSeaRouteTS(fromLat, fromLon, toLat, toLon, canalPref='auto', draft=10) {
  try {
    // Build restrictions based on canal preference
    const restrictions = [];
    if (canalPref === 'cape') {
      // Avoid Suez and Bab-el-Mandeb → forces Cape of Good Hope
      restrictions.push('suez', 'babelmandeb');
    } else if (canalPref === 'panama') {
      // Avoid Suez → forces Panama or trans-Pacific
      restrictions.push('suez', 'babelmandeb');
    }
    // 'auto' and 'suez' → no restrictions (library picks shortest = Suez for Asia-Europe)

    const options = {
      units: 'nauticalmiles',
      restrictions,
      vesselDraftMeters: draft,
      returnPassages: true,
      appendOriginDestination: true,
    };

    // searoute-ts takes [lon, lat] arrays
    const result = seaRoute(
      [fromLon, fromLat],
      [toLon, toLat],
      options
    );

    if (!result || !result.geometry || !result.geometry.coordinates) {
      console.warn('[searoute-ts] No result returned');
      return null;
    }

    const coords = result.geometry.coordinates; // [[lon,lat], ...]
    if (coords.length < 2) return null;

    const totalNM = result.properties?.length || 0;
    if (totalNM < 10) return null;

    // Convert [lon,lat] → {lat, lon, name}
    const wps = coords.map(([lon, lat], i) => ({
      lat: +lat.toFixed(5),
      lon: +lon.toFixed(5),
      name: i === 0 ? 'Departure' : i === coords.length - 1 ? 'Arrival' : '',
    }));

    const passages = result.properties?.passages || [];
    let via = 'direct';
    if (passages.includes('suez')) via = 'suez';
    else if (passages.includes('panama')) via = 'panama';
    else if (!passages.includes('suez') && !passages.includes('panama') && totalNM > 8000) via = 'cape';

    console.log(`[searoute-ts] ${wps.length} WPs, ${totalNM.toFixed(0)} NM, via=${via}, passages=${passages.join(',')}`);
    return { waypoints: wps, totalNM, via, passages, source: 'searoute-ts' };

  } catch (e) {
    console.warn('[searoute-ts] Error:', e.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CANAL SPECS (for vessel restriction checks)
// ══════════════════════════════════════════════════════════════════════════════
const CANAL_SPECS = {
  suez:   { name: 'Suez Canal',             beam: 77.0,  draft: 20.1, loa: 400, airDraft: 68 },
  panama: { name: 'Panama Canal Neopanamax', beam: 51.25, draft: 15.2, loa: 366, airDraft: 57.91 },
  kiel:   { name: 'Kiel Canal',             beam: 32.5,  draft: 9.5,  loa: 235, airDraft: 42 },
};
function _usesSuez(f, t)  { const eu=p=>(p.lon>-7&&p.lon<37&&p.lat>30&&p.lat<48)||(p.lat>48&&p.lon>-15&&p.lon<40); const as=p=>p.lon>37&&p.lon<180&&p.lat>-40&&p.lat<40; return(eu(f)&&as(t))||(eu(t)&&as(f)); }
function _usesPanama(f,t) { const atl=p=>p.lon>-98&&p.lon<-55&&p.lat>-60&&p.lat<55; const pac=p=>p.lon<-80||p.lon>100; return(atl(f)&&pac(t))||(pac(f)&&atl(t)); }
function _usesKiel(f, t)  { const bal=p=>p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66; const nth=p=>p.lon>-5&&p.lon<10&&p.lat>50&&p.lat<60; return(bal(f)&&nth(t))||(nth(f)&&bal(t)); }

export function checkCanalPassage(from, to, vp = {}) {
  const { draft=10, beam=32, loa=200, airDraft=50 } = vp;
  const result = [];
  const check = (spec, fn, alt) => {
    if (!fn(from, to)) return;
    const r = [];
    if (beam > spec.beam) r.push(`beam ${beam}m > max ${spec.beam}m`);
    if (draft > spec.draft) r.push(`draft ${draft}m > max ${spec.draft}m`);
    if (loa > spec.loa) r.push(`LOA ${loa}m > max ${spec.loa}m`);
    if (airDraft > spec.airDraft) r.push(`air draft ${airDraft}m > max ${spec.airDraft}m`);
    result.push({ canal: spec.name, status: r.length ? 'BLOCKED' : 'OK', reason: r.join('; ') || null, alternative: r.length ? alt : null, limits: `beam<${spec.beam}m draft<${spec.draft}m LOA<${spec.loa}m` });
  };
  check(CANAL_SPECS.suez,   _usesSuez,   'Auto-rerouted via Cape of Good Hope (+~3500 NM)');
  check(CANAL_SPECS.panama, _usesPanama, 'Auto-rerouted via Cape Horn (+~5000 NM)');
  check(CANAL_SPECS.kiel,   _usesKiel,   'Auto-rerouted via Skagen/North Sea (+~200 NM)');
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK WAYPOINT GRAPH + ROUTE TABLE
// ══════════════════════════════════════════════════════════════════════════════
export const SEA_WP = { SUEZ_N:{lat:31.27,lon:32.33},SUEZ_S:{lat:29.92,lon:32.55},RED_N:{lat:29.77,lon:32.55},RED_N2:{lat:28.0,lon:33.5},RED_C:{lat:24.0,lon:37.0},RED_S:{lat:15.0,lon:41.5},BAB:{lat:12.58,lon:43.38},ADEN_G:{lat:11.8,lon:45.5},ADEN_E:{lat:11.5,lon:50.0},SOCOTRA:{lat:12.0,lon:54.0},HORMUZ:{lat:26.58,lon:56.35},HORMUZ_E:{lat:23.5,lon:59.0},ARAB_NW:{lat:22.0,lon:60.0},ARAB_W:{lat:18.0,lon:60.0},IND_W:{lat:12.0,lon:62.0},IND_W2:{lat:8.0,lon:64.0},IND_W_COAST:{lat:14.0,lon:73.0},IND_SW:{lat:10.0,lon:74.8},IND_TIP_W:{lat:7.5,lon:76.5},IND_TIP:{lat:6.0,lon:77.5},PALK_W:{lat:7.5,lon:78.8},LANKA_SW:{lat:5.8,lon:79.8},LANKA_S:{lat:5.4,lon:80.6},LANKA_SE:{lat:6.0,lon:82.0},IND_NE:{lat:8.5,lon:84.5},IND_E_COAST:{lat:12.0,lon:81.5},BAY_SW:{lat:10.0,lon:83.0},BAY_C:{lat:13.5,lon:87.0},BAY_N:{lat:18.0,lon:90.0},BAY_E:{lat:12.0,lon:93.0},ANDAMAN_W:{lat:11.0,lon:92.0},ANDAMAN:{lat:10.5,lon:94.0},ANDAMAN_S:{lat:6.5,lon:95.0},MALACCA_NW:{lat:6.5,lon:98.8},MALACCA_N:{lat:3.09,lon:101.02},MALACCA_C1:{lat:2.9,lon:100.67},MALACCA_C:{lat:2.33,lon:101.35},MALACCA_S1:{lat:1.83,lon:101.8},MALACCA_S2:{lat:1.56,lon:102.39},MALACCA_S3:{lat:1.15,lon:103.41},MALACCA_S:{lat:1.18,lon:103.82},SCS_W:{lat:3.0,lon:108.0},SCS_C:{lat:8.0,lon:110.0},SCS_N:{lat:14.0,lon:112.0},PHILIP:{lat:10.0,lon:122.0},EAST_CHINA2:{lat:31.0,lon:124.0},EAST_CHINA:{lat:27.0,lon:124.0},KOREA_STR:{lat:34.5,lon:129.0},JAPAN_SEA:{lat:37.0,lon:132.0},EAST_CHINA_N:{lat:37.57,lon:122.61},TSUGARU:{lat:41.5,lon:140.8},PAC_NW:{lat:48.0,lon:-160.0},PAC_NE:{lat:40.0,lon:-150.0},PAC_C:{lat:5.0,lon:-140.0},PAC_SW:{lat:-20.0,lon:170.0},PAC_SE:{lat:-20.0,lon:-90.0},LOMBOK:{lat:-8.5,lon:115.8},SUNDA:{lat:-6.1,lon:105.7},TIMOR:{lat:-9.5,lon:127.0},ARAFURA:{lat:-12.0,lon:136.0},TORRES:{lat:-10.5,lon:142.5},AUS_N:{lat:-12.0,lon:127.0},AUS_W:{lat:-25.0,lon:108.0},AUS_SE:{lat:-38.5,lon:148.2},CORAL:{lat:-18.0,lon:152.0},TASMAN:{lat:-38.0,lon:157.0},NZ_N:{lat:-38.52,lon:174.63},GIBRALTAR:{lat:35.98,lon:-5.5},MED_W:{lat:37.5,lon:5.0},MED_W2:{lat:37.0,lon:10.0},MED_C:{lat:37.0,lon:15.0},MED_E:{lat:34.5,lon:24.0},MED_E2:{lat:33.5,lon:28.0},BLACK_W:{lat:43.0,lon:29.0},BASC:{lat:47.0,lon:-5.0},DOVER:{lat:51.05,lon:1.5},NORTH_SEA:{lat:56.0,lon:3.0},SKAGEN:{lat:57.72,lon:10.6},BALTIC_E:{lat:59.0,lon:21.5},ATLANTIC_N:{lat:45.0,lon:-30.0},ATLANTIC_C:{lat:20.0,lon:-35.0},ATLANTIC_S:{lat:-15.0,lon:-20.0},ATLANTIC_SW:{lat:-40.0,lon:-40.0},ATL_NW:{lat:50.0,lon:-20.0},ATL_MID:{lat:35.0,lon:-38.0},ATL_W_AFR:{lat:5.0,lon:-15.0},ATL_SA:{lat:-10.0,lon:-20.0},CAPE_GH:{lat:-34.5,lon:19.5},IND_S:{lat:-35.0,lon:50.0},IND_SW2:{lat:-25.0,lon:90.0},CAPE_HORN:{lat:-55.9,lon:-67.3},AFR_E:{lat:-10.0,lon:50.0},AFR_E2:{lat:-25.0,lon:40.0},PANAMA_P:{lat:8.9,lon:-79.5},PANAMA_A:{lat:9.38,lon:-79.9},CARIB:{lat:15.0,lon:-75.0},CARIB_E:{lat:12.0,lon:-63.0},EAST_US:{lat:35.0,lon:-71.0},EAST_US_N:{lat:40.0,lon:-70.0},WEST_US:{lat:35.0,lon:-121.0},WEST_US_N:{lat:48.0,lon:-125.0},SA_E:{lat:-23.5,lon:-43.5},SA_W:{lat:-33.0,lon:-71.5} };

const PORT_EXIT = { MUM:['IND_W_COAST'],KAN:['IND_W_COAST'],KOC:['IND_SW','IND_TIP_W'],CHE:['IND_E_COAST'],CTG:['BAY_N','BAY_C'],SIN:['MALACCA_S'],PKL:['MALACCA_S3','MALACCA_S'],DXB:['HORMUZ'],FUJ:['HORMUZ'],KWI:['HORMUZ'],BAH:['HORMUZ'],DOH:['HORMUZ'],MCT:['HORMUZ_E'],JED:['RED_S','BAB'],ADE:['BAB','ADEN_G'],PSD:['SUEZ_S','RED_N'],ROT:['DOVER','BASC'],HAM:['NORTH_SEA','DOVER'],ANT:['DOVER','BASC'],NYK:['EAST_CHINA_N','KOREA_STR'],BUS:['KOREA_STR'],YOK:['EAST_CHINA'],SHA:['EAST_CHINA2'],HKG:['SCS_N'],MAN:['PHILIP'],SYD:['CORAL'],JAK:['SUNDA'] };

const ROUTE_TABLE = {"MUM-SIN":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],"MUM-DXB":[[18.93,72.83],[20.0,67.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],"MUM-ROT":[[18.93,72.83],[14.0,73.0],[10.0,71.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.05,1.5],[51.92,4.48]],"SIN-MUM":[[1.29,103.85],[1.15,103.41],[2.33,101.35],[3.09,101.02],[5.0,99.2],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],"SIN-DXB":[[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],"SIN-ROT":[[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],"DXB-SIN":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],"DXB-MUM":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[20.0,67.0],[18.93,72.83]],"ROT-SIN":[[51.92,4.48],[51.05,1.5],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],"ROT-MUM":[[51.92,4.48],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],"SHA-SIN":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[8.0,110.0],[5.0,108.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],"SHA-ROT":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[8.0,110.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],"HKG-SIN":[[22.29,114.16],[18.0,115.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],"BUS-SIN":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],"YOK-SIN":[[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],"YOK-LAX":[[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-145.0],[33.74,-118.27]],"NYK-ROT":[[40.65,-74.07],[40.0,-68.0],[45.0,-40.0],[47.0,-25.0],[50.0,-10.0],[51.92,4.48]],"ROT-NYK":[[51.92,4.48],[50.0,-10.0],[47.0,-25.0],[45.0,-40.0],[40.0,-68.0],[40.65,-74.07]],"CHE-SIN":[[13.08,80.29],[10.0,81.5],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.29,103.85]],"JAK-SIN":[[-6.11,106.88],[-6.1,105.7],[1.15,103.41],[1.29,103.85]],"SYD-SIN":[[-33.86,151.21],[-30.0,135.0],[-18.0,120.0],[-8.5,115.8],[3.0,108.0],[1.29,103.85]],"PSD-DXB":[[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[11.8,45.5],[12.0,50.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],"PSD-MUM":[[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,54.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],"PSD-SIN":[[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],"KAR-SIN":[[24.86,67.01],[20.0,65.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],"KAR-DXB":[[24.86,67.01],[26.0,61.0],[26.58,56.35],[25.05,55.13]],"COL-SIN":[[6.94,79.85],[6.0,80.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.56,102.39],[1.29,103.85]],"COL-MUM":[[6.94,79.85],[7.5,78.8],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],"MOM-MUM":[[-4.05,39.67],[-7.0,42.0],[-5.0,45.0],[0.0,50.0],[8.0,58.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]]};

// Known port coords for proximity-based route table ID resolution (within 60 NM)
const _RT_PORTS = {
  SIN:{lat:1.29,lon:103.85}, ROT:{lat:51.92,lon:4.48},  MUM:{lat:18.93,lon:72.83},
  DXB:{lat:25.05,lon:55.13}, SHA:{lat:31.23,lon:121.47}, HKG:{lat:22.29,lon:114.16},
  YOK:{lat:35.45,lon:139.65},NYK:{lat:40.65,lon:-74.07}, BUS:{lat:35.10,lon:129.04},
  CHE:{lat:13.08,lon:80.29}, KAR:{lat:24.86,lon:67.01},  COL:{lat:6.94,lon:79.85},
  JAK:{lat:-6.11,lon:106.88},SYD:{lat:-33.86,lon:151.21},PSD:{lat:31.26,lon:32.31},
  MOM:{lat:-4.05,lon:39.67}, LAX:{lat:33.74,lon:-118.27},
};

function _resolveRouteId(portObj) {
  // Direct match first
  if (_RT_PORTS[portObj.id]) return portObj.id;
  // Proximity match within 60 NM
  let bestId = null, bestDist = 60;
  for (const [id, pos] of Object.entries(_RT_PORTS)) {
    const d = haversine(portObj.lat, portObj.lon, pos.lat, pos.lon);
    if (d < bestDist) { bestDist = d; bestId = id; }
  }
  return bestId;
}

function _doRouteTable(fromObj, toObj) {
  const fromId = _resolveRouteId(fromObj);
  const toId   = _resolveRouteId(toObj);
  if (!fromId || !toId) return null;

  const key = `${fromId}-${toId}`, keyR = `${toId}-${fromId}`;
  let pts = null;
  if (ROUTE_TABLE[key]) {
    pts = ROUTE_TABLE[key].map(([lat,lon]) => ({ lat, lon }));
  } else if (ROUTE_TABLE[keyR]) {
    pts = [...ROUTE_TABLE[keyR]].reverse().map(([lat,lon]) => ({ lat, lon }));
  }
  if (!pts) return null;

  // Anchor exact port coordinates at start and end
  pts[0] = { lat: fromObj.lat, lon: fromObj.lon, name: fromObj.name };
  pts[pts.length-1] = { lat: toObj.lat, lon: toObj.lon, name: toObj.name };
  const wps = recalcWaypoints(pts);
  const totalNM = wps[wps.length-1]?.totalNM || 0;
  if (totalNM < 10) return null;
  console.log(`[Route Table] ${fromId}->${toId}: ${totalNM.toFixed(0)} NM`);
  return { waypoints: wps, totalNM, via: 'table', source: 'route-table' };
}

function _doRoute(from, to) {
  const wps = [], add = (...ks) => ks.forEach(k => { if (SEA_WP[k]) wps.push({...SEA_WP[k]}); });
  const isWI=p=>p.lon>=69&&p.lon<77&&p.lat>=8&&p.lat<24,isEI=p=>p.lon>=77&&p.lon<88&&p.lat>=8&&p.lat<22,isBB=p=>p.lon>=79&&p.lon<99&&p.lat>=5&&p.lat<24,isIO=p=>p.lon>=44&&p.lon<80&&p.lat>=-10&&p.lat<25,isPG=p=>p.lon>=48&&p.lon<58&&p.lat>22,isRS=p=>p.lon>=32&&p.lon<44&&p.lat>=11&&p.lat<31,isSEA=p=>p.lon>=98&&p.lon<120&&p.lat>=-10&&p.lat<22,isFE=p=>p.lon>=108&&p.lat>=-5&&p.lat<45,isJK=p=>p.lon>=120&&p.lat>=28&&p.lat<46,isMed=p=>p.lon>-6&&p.lon<37&&p.lat>30&&p.lat<47,isEU=p=>(p.lon<20&&p.lat>40)||(p.lon>=-10&&p.lon<25&&p.lat>50),isUK=p=>p.lon>=-10&&p.lon<5&&p.lat>=55&&p.lat<62,isBal=p=>p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66,isBS=p=>p.lon>27&&p.lon<42&&p.lat>40&&p.lat<48,isEAf=p=>p.lon>=36&&p.lon<52&&p.lat>=-30&&p.lat<15,isWAf=p=>p.lon>=-20&&p.lon<10&&p.lat>=-10&&p.lat<20,isEUS=p=>p.lon>=-82&&p.lon<-65&&p.lat>=24&&p.lat<47,isWUS=p=>p.lon<=-100&&p.lat>=10&&p.lat<62,isCarib=p=>p.lon>=-88&&p.lon<-60&&p.lat>=8&&p.lat<24,isSA=p=>p.lon>=-85&&p.lon<-30&&p.lat<15,isSAtl=p=>p.lon>=-55&&p.lon<20&&p.lat<-10,isAus=p=>p.lon>=113&&p.lon<155&&p.lat>=-45&&p.lat<-10;
  const fromExit=PORT_EXIT[from.id]||[];fromExit.forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});
  const fromWI=isWI(from)||(isPG(from)&&!isSEA(to)&&!isFE(to)),toE=isEI(to)||isBB(to)||isSEA(to)||isFE(to)||isJK(to),fromE=isEI(from)||isBB(from)||isSEA(from)||isFE(from),rndTip=fromExit.includes('IND_TIP')||fromExit.includes('IND_TIP_W');
  if(fromWI&&toE&&!rndTip)add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE');if(fromE&&!fromExit.includes('IND_TIP'))if(!isWI(to)&&!isIO(to)&&!isPG(to)&&!isRS(to)&&!isEAf(to)&&!isMed(to)&&!isEU(to)){}else add('LANKA_S','IND_TIP','IND_TIP_W');
  const needsMal=(isIO(from)||isWI(from)||isBB(from)||isPG(from)||isRS(from)||isEAf(from)||isMed(from)||isEU(from))&&(isSEA(to)||isFE(to)||isJK(to)),needsMalR=(isSEA(from)||isFE(from)||isJK(from))&&(isIO(to)||isWI(to)||isBB(to)||isPG(to)||isRS(to)||isEAf(to)||isMed(to)||isEU(to));
  if(needsMal&&!fromExit.some(k=>['MALACCA_N','MALACCA_C','MALACCA_S'].includes(k))){if(!isBB(from)&&!isEI(from))add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');else add('ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');}
  if(needsMalR){if(!isBB(to)&&!isEI(to))add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W');else add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W');}
  const needsSuez=(isMed(from)||isEU(from)||isBal(from)||isUK(from)||isBS(from))&&(isIO(to)||isPG(to)||isEAf(to)||isBB(to)||isSEA(to)||isFE(to)||isWI(to)),needsSuezR=(isMed(to)||isEU(to)||isBal(to)||isUK(to)||isBS(to))&&(isIO(from)||isPG(from)||isEAf(from)||isBB(from)||isSEA(from)||isFE(from)||isWI(from));
  if(needsSuez){if(isBS(from))add('BLACK_W');if(isBal(from))add('NORTH_SEA','DOVER','BASC','GIBRALTAR');if(isUK(from))add('NORTH_SEA','DOVER','BASC','GIBRALTAR');if(isEU(from)&&!isMed(from)&&!isUK(from)&&!isBal(from))add('BASC','GIBRALTAR');add('MED_W','MED_E2','MED_E','SUEZ_N','SUEZ_S','RED_N','RED_N2','RED_C','RED_S','BAB','ADEN_G','ADEN_E','SOCOTRA');if(isPG(to))add('ARAB_W','ARAB_NW','HORMUZ_E','HORMUZ');else if(isEAf(to))add('AFR_E');else if(isWI(to)||isIO(to))add('IND_W2','IND_W');else if(isBB(to))add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE');else if(isSEA(to)||isFE(to))add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');}
  if(needsSuezR){if(isPG(from))add('HORMUZ','HORMUZ_E','ARAB_NW','ARAB_W');else if(isSEA(from)||isFE(from))add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');else if(isBB(from)||isEI(from))add('IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');else if(isWI(from))add('IND_W');add('SOCOTRA','ADEN_E','ADEN_G','BAB','RED_S','RED_C','RED_N2','RED_N','SUEZ_S','SUEZ_N','MED_E','MED_E2','MED_W');if(isBS(to))add('BLACK_W');if(isBal(to))add('GIBRALTAR','BASC','DOVER','NORTH_SEA','SKAGEN');if(isUK(to))add('GIBRALTAR','BASC','DOVER','NORTH_SEA');if(isEU(to)&&!isMed(to)&&!isUK(to)&&!isBal(to))add('GIBRALTAR','BASC');}
  const needsCape=!needsSuez&&!needsSuezR&&((isSAtl(from)||isWAf(from)||isSA(from))&&(isIO(to)||isEAf(to)||isSEA(to)||isFE(to)||isAus(to)))||((isSAtl(to)||isWAf(to)||isSA(to))&&(isIO(from)||isEAf(from)||isSEA(from)||isFE(from)||isAus(from)));
  if(needsCape){if(isIO(to)||isEAf(to)||isSEA(to)||isFE(to)||isAus(to))add('ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');else add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S');}
  const needsPan=!needsSuez&&!needsSuezR&&((isWUS(from)&&(isEUS(to)||isCarib(to)))||((isEUS(from)||isCarib(from))&&isWUS(to)));
  if(needsPan){if(isWUS(to))add('CARIB','PANAMA_A','PANAMA_P');else add('PANAMA_P','PANAMA_A','CARIB');}
  const needsPac=(isFE(from)||isJK(from))&&(isWUS(to)||isEUS(to)),needsPacR=(isFE(to)||isJK(to))&&(isWUS(from)||isEUS(from));
  if(needsPac)add('PAC_NW','PAC_NE');if(needsPacR)add('PAC_NE','PAC_NW');
  const approachE=isSEA(from)||isFE(from)||isBB(from)||isEI(from);
  if(isWI(to)&&approachE){const already=wps.some(w=>w.name&&(w.name.includes('Lanka')||w.name.includes('Mannar')));if(!already)['LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_TIP','IND_TIP_W','IND_SW'].forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});}
  const rawPts=[{lat:from.lat,lon:from.lon,name:from.name},...wps,{lat:to.lat,lon:to.lon,name:to.name}];
  const deduped=rawPts.filter((p,i)=>{if(i===0)return true;const prev=rawPts[i-1];return!(Math.abs(p.lat-prev.lat)<0.2&&Math.abs(p.lon-prev.lon)<0.2);});
  const allWPs=[];
  for(let i=0;i<deduped.length-1;i++){const a=deduped[i],b=deduped[i+1];const dist=haversine(a.lat,a.lon,b.lat,b.lon);const nPts=Math.max(2,Math.min(10,Math.floor(dist/300)));const seg=greatCircle(a.lat,a.lon,b.lat,b.lon,nPts);seg.forEach((pt,j)=>{if(i>0&&j===0)return;allWPs.push({lat:Math.round(pt[0]*10000)/10000,lon:Math.round(pt[1]*10000)/10000,name:(j===0&&deduped[i].name)?deduped[i].name:undefined});});}
  if(allWPs.length>0)allWPs[allWPs.length-1].name=to.name;
  return recalcWaypoints(allWPs);
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC EXPORTS (existing — untouched signatures)
// ══════════════════════════════════════════════════════════════════════════════
export function buildAutoRoute(fromPort, toPort) {
  const from = PORTS_DB.find(p => p.id === fromPort);
  const to   = PORTS_DB.find(p => p.id === toPort);
  if (!from || !to) return [];
  return _doRoute(from, to);
}

export function buildAutoRouteCoords(from, to) {
  if (!from || !to) return [];
  const lat1=Number(from.lat??from.latitude??0), lon1=Number(from.lon??from.longitude??from.lng??0);
  const lat2=Number(to.lat??to.latitude??0),   lon2=Number(to.lon??to.longitude??to.lng??0);
  if (!lat1||!lon1||!lat2||!lon2) return [];
  return _doRoute({id:from.id||'DEP',lat:lat1,lon:lon1,name:from.name||'Departure'},{id:to.id||'ARR',lat:lat2,lon:lon2,name:to.name||'Arrival'});
}

// buildGraphRoute — kept for import compatibility, delegates to buildProRoute
export async function buildGraphRoute(fromObj, toObj, canalPref='auto') {
  return buildProRoute(fromObj, toObj, {}, canalPref);
}

// ══════════════════════════════════════════════════════════════════════════════
// buildProRoute — MAIN ROUTING FUNCTION
// Priority: searoute-ts → route table → waypoint graph
// ══════════════════════════════════════════════════════════════════════════════
export async function buildProRoute(from, to, vesselParams={}, canalPref='auto') {
  const { draft=10, beam=32, loa=200, airDraft=50, vesselType='cargo' } = vesselParams;
  const fromObj = { id:from.id||'DEP', lat:Number(from.lat??from.latitude??0), lon:Number(from.lon??from.longitude??from.lng??0), name:from.name||'Departure' };
  const toObj   = { id:to.id||'ARR',   lat:Number(to.lat??to.latitude??0),   lon:Number(to.lon??to.longitude??to.lng??0),   name:to.name||'Arrival'   };

  if (!fromObj.lat||!fromObj.lon||!toObj.lat||!toObj.lon)
    return { waypoints:[], error:'Invalid port coordinates', canalInfo:[], warnings:[], routeSource:'error' };

  const canalInfo = checkCanalPassage(fromObj, toObj, { draft, beam, loa, airDraft });

  // ── 1. searoute-ts (PRIMARY) ───────────────────────────────────────────────
  let result = await _routeViaSeaRouteTS(fromObj.lat, fromObj.lon, toObj.lat, toObj.lon, canalPref, draft);

  // ── 2. Route table fallback ────────────────────────────────────────────────
  if (!result || !result.waypoints || result.waypoints.length < 2) {
    console.warn('[Router] searoute-ts failed, trying route table');
    const rt = _doRouteTable(fromObj, toObj);
    if (rt) result = rt;
  }

  // ── 3. Waypoint graph fallback ─────────────────────────────────────────────
  if (!result || !result.waypoints || result.waypoints.length < 2) {
    console.warn('[Router] route table failed, trying waypoint graph');
    const wps = _doRoute(fromObj, toObj);
    if (wps && wps.length > 1)
      result = { waypoints: wps, totalNM: wps[wps.length-1]?.totalNM||0, source: 'waypoint-graph' };
  }

  if (!result || !result.waypoints || result.waypoints.length < 2)
    return { waypoints:[], error:`Route not found for ${fromObj.name} → ${toObj.name}`, canalInfo, warnings:[], routeSource:'error' };

  // Anchor exact port coordinates
  const wps = result.waypoints;
  wps[0] = { ...wps[0], lat:fromObj.lat, lon:fromObj.lon, name:fromObj.name };
  wps[wps.length-1] = { ...wps[wps.length-1], lat:toObj.lat, lon:toObj.lon, name:toObj.name };
  const waypoints = recalcWaypoints(wps);
  const totalNM   = waypoints[waypoints.length-1]?.totalNM || 0;

  let approachStartIdx = waypoints.length-1, cumNM = 0;
  for (let i=waypoints.length-1; i>0; i--) {
    cumNM += (waypoints[i].distance||0);
    if (cumNM >= 20) { approachStartIdx = i; break; }
  }

  const src = result.source || 'unknown';
  const viaLabel = result.via && result.via !== 'auto' && result.via !== 'table' && result.via !== 'direct'
    ? ` via ${result.via.toUpperCase()}` : '';
  const confidence = src==='searoute-ts' ? `HIGH — Eurostat 2025 MARNET, land-free${viaLabel}`
    : src==='route-table' ? 'MEDIUM — validated route table'
    : 'LOW — waypoint graph fallback';

  const canalMsgs = canalInfo.map(c =>
    c.status==='OK' ? `✅ ${c.canal}: vessel fits` : `🚫 ${c.canal}: BLOCKED — ${c.reason} — ${c.alternative}`
  );

  return {
    waypoints, totalNM, canalInfo, confidence,
    routeSource: src,
    via: result.via || canalPref,
    approachStartIdx,
    warnings: ['⚠ Route NOT certified for navigation. Verify with official ENC.', ...canalMsgs, `📊 ${confidence}`],
    vesselParams: { draft, beam, loa, airDraft, vesselType },
    etaAt12kn: (totalNM/12).toFixed(1),
    etaAt15kn: (totalNM/15).toFixed(1),
  };
}
