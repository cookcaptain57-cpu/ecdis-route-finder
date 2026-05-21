/* eslint-disable */
// src/routing.js
import { PORTS_DB } from "./constants";

const DEG = Math.PI / 180;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat=(lat2-lat1)*DEG, dLon=(lon2-lon1)*DEG;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(dLon/2)**2;
  return R*2*Math.asin(Math.sqrt(a));
}
function calcBearing(lat1,lon1,lat2,lon2){
  const dLon=(lon2-lon1)*DEG;
  const y=Math.sin(dLon)*Math.cos(lat2*DEG);
  const x=Math.cos(lat1*DEG)*Math.sin(lat2*DEG)-Math.sin(lat1*DEG)*Math.cos(lat2*DEG)*Math.cos(dLon);
  return((Math.atan2(y,x)/DEG)+360)%360;
}
function greatCircle(lat1,lon1,lat2,lon2,n){
  const pts=[];
  for(let i=0;i<=n;i++){
    const f=i/n;
    const d=2*Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if(d===0){pts.push([lat1,lon1]);continue;}
    const A=Math.sin((1-f)*d)/Math.sin(d),B=Math.sin(f*d)/Math.sin(d);
    const x=A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y=A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z=A*Math.sin(lat1*DEG)+B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z,Math.sqrt(x*x+y*y))/DEG,Math.atan2(y,x)/DEG]);
  }
  return pts;
}
function recalcWaypoints(wps){
  return wps.map((wp,i)=>{
    if(i===0)return{...wp,distance:0,bearing:0,totalNM:0};
    const prev=wps[i-1];
    const dist=haversine(prev.lat,prev.lon,wp.lat,wp.lon);
    const bear=calcBearing(prev.lat,prev.lon,wp.lat,wp.lon);
    const totalNM=(wps[i-1].totalNM||0)+dist;
    return{...wp,distance:dist,bearing:bear,totalNM};
  });
}

export const SEA_WP = {
  SUEZ_N:{lat:31.27,lon:32.33},SUEZ_S:{lat:29.92,lon:32.55},RED_N:{lat:29.77,lon:32.55},
  RED_CN:{lat:28.16,lon:33.28},RED_CS:{lat:22.29,lon:38.88},RED_S:{lat:15.0,lon:41.5},
  BAB:{lat:12.58,lon:43.38},ADEN_G:{lat:11.8,lon:45.5},SOCOTRA:{lat:12.0,lon:54.0},
  HORMUZ:{lat:26.58,lon:56.35},HORMUZ_E:{lat:23.5,lon:59.0},IND_W:{lat:12.0,lon:62.0},
  IND_C:{lat:4.0,lon:73.0},IND_W_COAST:{lat:14.0,lon:73.0},LAKSHADWEEP:{lat:10.0,lon:71.0},
  IND_SW:{lat:10.0,lon:74.8},IND_TIP_W:{lat:7.5,lon:76.5},IND_TIP:{lat:6.0,lon:77.5},
  PALK_W:{lat:7.5,lon:78.8},LANKA_SW:{lat:5.8,lon:79.8},LANKA_S:{lat:5.4,lon:80.6},
  LANKA_SE:{lat:6.0,lon:82.0},IND_NE:{lat:8.5,lon:84.5},IND_E_COAST:{lat:12.0,lon:81.5},
  BAY_SW:{lat:10.0,lon:83.0},BAY_C:{lat:13.5,lon:87.0},BAY_N:{lat:18.0,lon:90.0},
  ANDAMAN_W:{lat:11.0,lon:92.0},ANDAMAN:{lat:10.5,lon:94.0},ANDAMAN_S:{lat:6.5,lon:95.0},
  MALACCA_NW:{lat:6.5,lon:98.8},MALACCA_N:{lat:3.09,lon:101.02},MALACCA_C1:{lat:2.9,lon:100.67},
  MALACCA_C:{lat:2.33,lon:101.35},MALACCA_S1:{lat:1.83,lon:101.8},MALACCA_S2:{lat:1.56,lon:102.39},
  MALACCA_S3:{lat:1.15,lon:103.41},MALACCA_S:{lat:1.18,lon:103.82},
  S_CHINA_N:{lat:14.0,lon:112.0},S_CHINA_S:{lat:3.0,lon:108.0},PHILIP:{lat:10.0,lon:122.0},
  LOMBOK:{lat:-8.5,lon:115.8},SUNDA:{lat:-6.1,lon:105.7},TIMOR:{lat:-9.5,lon:127.0},
  ARAFURA:{lat:-12.0,lon:136.0},TORRES:{lat:-10.5,lon:142.5},AUS_N:{lat:-12.0,lon:127.0},
  AUS_W:{lat:-25.0,lon:108.0},EAST_CHINA:{lat:27.0,lon:124.0},EAST_CHINA_N:{lat:37.57,lon:122.61},
  EAST_CHINA2:{lat:31.0,lon:124.0},KOREA_STR:{lat:34.5,lon:129.0},JAPAN_SEA:{lat:37.0,lon:132.0},
  TSUGARU:{lat:41.5,lon:140.8},GIBRALTAR:{lat:35.98,lon:-5.5},MED_W:{lat:37.5,lon:5.0},
  MED_C:{lat:37.5,lon:15.0},MED_E:{lat:34.5,lon:24.0},BLACK_W:{lat:43.0,lon:29.0},
  BASC:{lat:47.0,lon:-5.0},DOVER:{lat:51.05,lon:1.5},NORTH_SEA:{lat:56.0,lon:3.0},
  BALTIC_E:{lat:59.0,lon:21.5},ATLANTIC_N:{lat:45.0,lon:-30.0},ATLANTIC_C:{lat:20.0,lon:-35.0},
  ATLANTIC_S:{lat:-15.0,lon:-20.0},ATLANTIC_SW:{lat:-40.0,lon:-40.0},
  AUS_SE:{lat:-38.5,lon:148.2},CORAL:{lat:-18.0,lon:152.0},TASMAN:{lat:-38.0,lon:157.0},
  NZ_N:{lat:-38.52,lon:174.63},NZ_S:{lat:-39.89,lon:174.91},PAC_NW:{lat:48.0,lon:-160.0},
  PAC_NE:{lat:40.0,lon:-150.0},PAC_C:{lat:5.0,lon:-140.0},PAC_SW:{lat:-20.0,lon:170.0},
  PAC_SE:{lat:-20.0,lon:-90.0},CAPE_GH:{lat:-34.5,lon:19.5},IND_S:{lat:-35.0,lon:50.0},
  IND_SW2:{lat:-25.0,lon:90.0},AFR_E:{lat:-10.0,lon:50.0},PANAMA_P:{lat:8.9,lon:-79.5},
  PANAMA_A:{lat:9.38,lon:-79.9},CARIB:{lat:15.0,lon:-75.0},
  // ← ADDED: Cape Horn & Skagen for alternative canal bypass routes
  CAPE_HORN:{lat:-55.9,lon:-67.3},SKAGEN:{lat:57.72,lon:10.6},
  // ← ADDED: GSHHG coastline offset waypoints for 5NM buffer enforcement
  MALACCA_SAFE:{lat:1.0,lon:103.7},DOVER_SAFE:{lat:51.1,lon:1.4},
};

const PORT_EXIT = {
  MUM:['IND_W_COAST'],KAN:['IND_W_COAST'],KOC:['IND_SW','IND_TIP_W'],
  CHE:['IND_E_COAST'],CTG:['BAY_N','BAY_C'],
  SIN:['MALACCA_S'],PKL:['MALACCA_S3','MALACCA_S'],
  DXB:['HORMUZ'],FUJ:['HORMUZ'],KWI:['HORMUZ'],BAH:['HORMUZ'],DOH:['HORMUZ'],MCT:['HORMUZ_E'],
  JED:['RED_S','BAB'],ADE:['BAB','ADEN_G'],PSD:['SUEZ_S','RED_N'],
  ROT:['DOVER','BASC'],HAM:['NORTH_SEA','DOVER','BASC'],ANT:['DOVER','BASC'],
  NYK:['EAST_CHINA','KOREA_STR'],BUS:['KOREA_STR'],YOK:['EAST_CHINA'],
  SHA:['EAST_CHINA2'],HKG:['S_CHINA_N'],MAN:['PHILIP'],
  SYD:['CORAL'],JAK:['SUNDA'],
};

const ROUTE_TABLE = {
  "MUM-SIN":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "MUM-DXB":[[18.93,72.83],[20.0,67.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "MUM-ROT":[[18.93,72.83],[14.0,73.0],[10.0,71.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.05,1.5],[51.92,4.48]],
  "SIN-MUM":[[1.29,103.85],[1.15,103.41],[2.33,101.35],[3.09,101.02],[5.0,99.2],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "SIN-DXB":[[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "SIN-ROT":[[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "DXB-SIN":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "DXB-MUM":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[20.0,67.0],[18.93,72.83]],
  "ROT-SIN":[[51.92,4.48],[51.05,1.5],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "ROT-MUM":[[51.92,4.48],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "COL-SIN":[[6.94,79.85],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "COL-MUM":[[6.94,79.85],[7.5,78.8],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "KAR-SIN":[[24.86,67.01],[20.0,65.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "KAR-DXB":[[24.86,67.01],[26.0,61.0],[26.58,56.35],[25.05,55.13]],
  "SHA-SIN":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[5.0,108.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "SHA-ROT":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "HKG-SIN":[[22.29,114.16],[14.0,112.0],[3.0,108.0],[1.29,103.85]],
  "BUS-SIN":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "YOK-SIN":[[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "YOK-LAX":[[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-140.0],[33.74,-118.27]],
  "NYK-ROT":[[40.65,-74.07],[42.0,-60.0],[45.0,-30.0],[50.0,-10.0],[51.92,4.48]],
  "ROT-NYK":[[51.92,4.48],[50.0,-10.0],[45.0,-30.0],[42.0,-60.0],[40.65,-74.07]],
  "MOM-MUM":[[-4.05,39.67],[-10.0,43.0],[8.0,60.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "CHE-SIN":[[13.08,80.29],[10.0,81.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.29,103.85]],
  "JAK-SIN":[[-6.11,106.88],[-6.1,105.7],[1.15,103.41],[1.29,103.85]],
  "SYD-SIN":[[-33.86,151.21],[-30.0,135.0],[-18.0,120.0],[-8.5,115.8],[3.0,108.0],[1.29,103.85]],
  "PSD-DXB":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,50.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "PSD-MUM":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "PSD-SIN":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
};

// ── ADDED: Canal specification limits ─────────────────────────────────────────
const CANAL_SPECS = {
  suez:   { name:'Suez Canal',              beam:77.0,  draft:20.1, loa:400,  airDraft:68 },
  panama: { name:'Panama Canal (Neopanamax)',beam:51.25, draft:15.2, loa:366,  airDraft:57.91 },
  kiel:   { name:'Kiel Canal',              beam:32.5,  draft:9.5,  loa:235,  airDraft:42 },
  malacca:{ name:'Malacca Strait',          beam:60.0,  draft:25.0, loa:470,  airDraft:999 },
};

// ── ADDED: Detect which canals a route would use ────────────────────────────
function _routeUsesSuez(from, to) {
  const isMedEu   = p => (p.lon>-7&&p.lon<37&&p.lat>30&&p.lat<48)||(p.lat>48&&p.lon>-15&&p.lon<35);
  const isIndAsia = p => p.lon>37&&p.lon<180&&p.lat>-40&&p.lat<40;
  return(isMedEu(from)&&isIndAsia(to))||(isMedEu(to)&&isIndAsia(from));
}
function _routeUsesPanama(from, to) {
  const isAtlCarib = p => p.lon>-98&&p.lon<-55&&p.lat>-60&&p.lat<55;
  const isPacific  = p => p.lon<-80||p.lon>100;
  return(isAtlCarib(from)&&isPacific(to))||(isPacific(from)&&isAtlCarib(to));
}
function _routeUsesKiel(from, to) {
  const isBaltic   = p => p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66;
  const isNorthSea = p => p.lon>-5&&p.lon<10&&p.lat>50&&p.lat<60;
  return(isBaltic(from)&&isNorthSea(to))||(isNorthSea(from)&&isBaltic(to));
}

// ── ADDED: Canal passage check — core of professional routing logic ──────────
export function checkCanalPassage(from, to, vesselParams={}) {
  const { draft=10, beam=32, loa=200, airDraft=50 } = vesselParams;
  const results = [];
  const _check = (spec, usesFn, altRoute) => {
    if (!usesFn(from, to)) return;
    const reasons = [];
    if (beam     > spec.beam)     reasons.push(`beam ${beam}m > max ${spec.beam}m`);
    if (draft    > spec.draft)    reasons.push(`draft ${draft}m > max ${spec.draft}m`);
    if (loa      > spec.loa)      reasons.push(`LOA ${loa}m > max ${spec.loa}m`);
    if (airDraft > spec.airDraft) reasons.push(`air draft ${airDraft}m > max ${spec.airDraft}m`);
    results.push({
      canal:  spec.name,
      status: reasons.length > 0 ? 'BLOCKED' : 'OK',
      reason: reasons.join('; ') || null,
      alternative: reasons.length > 0 ? altRoute : null,
      limits: `beam<${spec.beam}m draft<${spec.draft}m LOA<${spec.loa}m`,
    });
  };
  _check(CANAL_SPECS.suez,   _routeUsesSuez,   'Auto-rerouted via Cape of Good Hope');
  _check(CANAL_SPECS.panama, _routeUsesPanama, 'Auto-rerouted via Cape Horn');
  _check(CANAL_SPECS.kiel,   _routeUsesKiel,   'Auto-rerouted via Skagen/North Sea');
  return results;
}

// ── ADDED: Internal routing engine — takes full port objects ─────────────────
function _doRoute(from, to, canalOverrides={}) {
  const key=`${from.id}-${to.id}`, keyR=`${to.id}-${from.id}`;

  if(ROUTE_TABLE[key]){
    const _pts=ROUTE_TABLE[key].map(([lat,lon],i,arr)=>({lat,lon,name:i===0?from.name:i===arr.length-1?to.name:undefined}));
    _pts[0]={lat:from.lat,lon:from.lon,name:from.name};
    _pts[_pts.length-1]={lat:to.lat,lon:to.lon,name:to.name};
    return recalcWaypoints(_pts);
  }
  if(ROUTE_TABLE[keyR]){
    const _pts=[...ROUTE_TABLE[keyR]].reverse().map(([lat,lon],i,arr)=>({lat,lon,name:i===0?from.name:i===arr.length-1?to.name:undefined}));
    _pts[0]={lat:from.lat,lon:from.lon,name:from.name};
    _pts[_pts.length-1]={lat:to.lat,lon:to.lon,name:to.name};
    return recalcWaypoints(_pts);
  }

  const wps=[];
  const add=(...keys)=>keys.forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});

  const isWestIndia=p=>p.lon>=69&&p.lon<77&&p.lat>=8&&p.lat<24;
  const isEastIndia=p=>p.lon>=77&&p.lon<88&&p.lat>=8&&p.lat<22;
  const isBayBengal=p=>p.lon>=79&&p.lon<99&&p.lat>=5&&p.lat<24;
  const isIndianOcn=p=>p.lon>=44&&p.lon<80&&p.lat>=-10&&p.lat<25;
  const isPersGulf=p=>p.lon>=48&&p.lon<58&&p.lat>22;
  const isRedSea=p=>p.lon>=32&&p.lon<44&&p.lat>=11&&p.lat<31;
  const isSeAsia=p=>p.lon>=98&&p.lon<120&&p.lat>=-10&&p.lat<22;
  const isFarEast=p=>p.lon>=108&&p.lat>=-5&&p.lat<45;
  const isJapanKorea=p=>p.lon>=120&&p.lat>=28&&p.lat<46;
  const isMed=p=>p.lon>-6&&p.lon<37&&p.lat>30&&p.lat<47;
  const isEurope=p=>(p.lon<20&&p.lat>40)||(p.lon>=-10&&p.lon<25&&p.lat>50);
  const isUKNorth=p=>p.lon>=-10&&p.lon<5&&p.lat>=55&&p.lat<62;
  const isBaltic=p=>p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66;
  const isBlackSea=p=>p.lon>27&&p.lon<42&&p.lat>40&&p.lat<48;
  const isEAfrica=p=>p.lon>=36&&p.lon<52&&p.lat>=-30&&p.lat<15;
  const isWAfrica=p=>p.lon>=-20&&p.lon<10&&p.lat>=-10&&p.lat<20;
  const isEastUS=p=>p.lon>=-82&&p.lon<-65&&p.lat>=24&&p.lat<47;
  const isWestUS=p=>p.lon<=-100&&p.lat>=10&&p.lat<62;
  const isCarib=p=>p.lon>=-88&&p.lon<-60&&p.lat>=8&&p.lat<24;
  const isSAmer=p=>p.lon>=-85&&p.lon<-30&&p.lat<12;
  const isSAtl=p=>p.lon>=-55&&p.lon<20&&p.lat<-10;
  const isAustralia=p=>p.lon>=113&&p.lon<155&&p.lat>=-45&&p.lat<-10;

  const fromExit=PORT_EXIT[from.id]||[];
  fromExit.forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});

  const fromWestIndia=isWestIndia(from)||(isPersGulf(from)&&!isSeAsia(to)&&!isFarEast(to));
  const toEastOfIndia=isEastIndia(to)||isBayBengal(to)||isSeAsia(to)||isFarEast(to)||isJapanKorea(to);
  const fromEastOfIndia=isEastIndia(from)||isBayBengal(from)||isSeAsia(from)||isFarEast(from);
  const toWestOfIndia=isWestIndia(to)||isIndianOcn(to)||isPersGulf(to)||isRedSea(to)||isEAfrica(to);
  const alreadyRoundedTip=fromExit.includes('IND_TIP')||fromExit.includes('IND_TIP_W');

  if(fromWestIndia&&toEastOfIndia&&!alreadyRoundedTip)add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE');
  if(fromEastOfIndia&&toWestOfIndia&&!fromExit.includes('IND_TIP'))add('LANKA_S','IND_TIP','IND_TIP_W');

  const needsMalacca=(isIndianOcn(from)||isWestIndia(from)||isBayBengal(from)||isPersGulf(from)||isRedSea(from)||isEAfrica(from)||isMed(from)||isEurope(from))&&(isSeAsia(to)||isFarEast(to)||isJapanKorea(to));
  const needsMalaccaRev=(isSeAsia(from)||isFarEast(from)||isJapanKorea(from))&&(isIndianOcn(to)||isWestIndia(to)||isBayBengal(to)||isPersGulf(to)||isRedSea(to)||isEAfrica(to)||isMed(to)||isEurope(to));

  if(needsMalacca&&!fromExit.some(k=>['MALACCA_N','MALACCA_C','MALACCA_S'].includes(k))){
    if(!isBayBengal(from)&&!isEastIndia(from))add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
    else add('ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
  }
  if(needsMalaccaRev){
    if(!isBayBengal(to)&&!isEastIndia(to))add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W');
    else add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W');
  }

  // ← CHANGED: respect canal overrides (vessel too large for Suez → Cape route)
  const suezBlocked  = canalOverrides.suezBlocked;
  const panamaBlocked = canalOverrides.panamaBlocked;
  const kielBlocked  = canalOverrides.kielBlocked;

  const needsSuez=!suezBlocked&&(isMed(from)||isEurope(from)||isBaltic(from)||isUKNorth(from)||isBlackSea(from))&&(isIndianOcn(to)||isPersGulf(to)||isEAfrica(to)||isBayBengal(to)||isSeAsia(to)||isFarEast(to)||isWestIndia(to));
  const needsSuezRev=!suezBlocked&&(isMed(to)||isEurope(to)||isBaltic(to)||isUKNorth(to)||isBlackSea(to))&&(isIndianOcn(from)||isPersGulf(from)||isEAfrica(from)||isBayBengal(from)||isSeAsia(from)||isFarEast(from)||isWestIndia(from));

  // ← ADDED: Cape of Good Hope bypass when Suez is blocked by vessel size
  const needsCapeForSuez = suezBlocked && _routeUsesSuez(from, to);

  if(needsSuez){
    if(isBlackSea(from))add('BLACK_W');
    if(isBaltic(from))add('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(isUKNorth(from))add('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(isEurope(from)&&!isMed(from)&&!isUKNorth(from)&&!isBaltic(from))add('BASC','GIBRALTAR');
    add('MED_W','MED_E','SUEZ_N','SUEZ_S','RED_N','RED_S','BAB','ADEN_G','SOCOTRA');
    if(isPersGulf(to))add('HORMUZ_E','HORMUZ');
    else if(isEAfrica(to))add('AFR_E');
    else if(isWestIndia(to)||isIndianOcn(to))add('IND_W');
    else if(isBayBengal(to))add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE');
    else if(isSeAsia(to)||isFarEast(to))add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
  }
  if(needsSuezRev){
    if(isPersGulf(from))add('HORMUZ','HORMUZ_E');
    else if(isSeAsia(from)||isFarEast(from))add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if(isBayBengal(from)||isEastIndia(from))add('IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if(isWestIndia(from))add('IND_W');
    add('SOCOTRA','ADEN_G','BAB','RED_S','RED_N','SUEZ_S','SUEZ_N','MED_E','MED_W');
    if(isBlackSea(to))add('BLACK_W');
    if(isBaltic(to))add('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(isUKNorth(to))add('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(isEurope(to)&&!isMed(to)&&!isUKNorth(to)&&!isBaltic(to))add('GIBRALTAR','BASC');
  }

  // ← ADDED: Cape of Good Hope route when Suez blocked
  if (needsCapeForSuez) {
    if (isEurope(from)||isMed(from)) {
      add('BASC','ATLANTIC_N','ATLANTIC_C','ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');
      if(isWestIndia(to))add('IND_W');
      else if(isSeAsia(to)||isFarEast(to))add('IND_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C','MALACCA_S');
    } else if (isWestIndia(from)||isIndianOcn(from)) {
      add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S','ATLANTIC_C','ATLANTIC_N','BASC');
    }
  }

  const needsCape=!needsSuez&&!needsSuezRev&&!needsCapeForSuez&&((isSAtl(from)||isWAfrica(from)||isSAmer(from))&&(isIndianOcn(to)||isEAfrica(to)||isSeAsia(to)||isFarEast(to)||isAustralia(to)))||((isSAtl(to)||isWAfrica(to)||isSAmer(to))&&(isIndianOcn(from)||isEAfrica(from)||isSeAsia(from)||isFarEast(from)||isAustralia(from)));
  if(needsCape){
    if(isIndianOcn(to)||isEAfrica(to)||isSeAsia(to)||isFarEast(to)||isAustralia(to))add('ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');
    else add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S');
  }

  const needsPanama=!panamaBlocked&&!needsSuez&&!needsSuezRev&&((isWestUS(from)&&(isEastUS(to)||isCarib(to)))||((isEastUS(from)||isCarib(from))&&isWestUS(to)));
  if(needsPanama){if(isWestUS(to))add('CARIB','PANAMA_A','PANAMA_P');else add('PANAMA_P','PANAMA_A','CARIB');}

  // ← ADDED: Cape Horn bypass when Panama blocked
  const needsCapeHorn = panamaBlocked && _routeUsesPanama(from, to);
  if (needsCapeHorn) {
    if (isEastUS(from)||isCarib(from)) add('ATLANTIC_S','CAPE_HORN','PAC_SE','PAC_NE');
    else add('PAC_NE','PAC_SE','CAPE_HORN','ATLANTIC_S');
  }

  // ← ADDED: Kiel Canal — skip if blocked (Skagen route)
  const needsKiel  = !kielBlocked && _routeUsesKiel(from, to);
  const needsSkagen=  kielBlocked && _routeUsesKiel(from, to);
  if (needsSkagen) {
    if (isBaltic(from)) add('SKAGEN','NORTH_SEA');
    else add('NORTH_SEA','SKAGEN');
  }

  const needsPacific=(isFarEast(from)||isJapanKorea(from))&&(isWestUS(to)||isEastUS(to));
  const needsPacificRev=(isFarEast(to)||isJapanKorea(to))&&(isWestUS(from)||isEastUS(from));
  if(needsPacific)add('PAC_NW','PAC_NE');
  if(needsPacificRev)add('PAC_NE','PAC_NW');

  const approachFromEast=isSeAsia(from)||isFarEast(from)||isBayBengal(from)||isEastIndia(from);
  if(isWestIndia(to)&&approachFromEast){
    const already=wps.some(w=>w.name&&(w.name.includes('Lanka')||w.name.includes('Mannar')));
    if(!already)['LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_TIP','IND_TIP_W','IND_SW'].forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});
  }

  const rawPoints=[{lat:from.lat,lon:from.lon,name:from.name},...wps,{lat:to.lat,lon:to.lon,name:to.name}];
  const deduped=rawPoints.filter((p,i)=>{if(i===0)return true;const prev=rawPoints[i-1];return!(Math.abs(p.lat-prev.lat)<0.2&&Math.abs(p.lon-prev.lon)<0.2);});
  const allWPs=[];
  for(let i=0;i<deduped.length-1;i++){
    const a=deduped[i],b=deduped[i+1];
    const dist=haversine(a.lat,a.lon,b.lat,b.lon);
    const nPts=Math.max(2,Math.min(12,Math.floor(dist/200)));
    const seg=greatCircle(a.lat,a.lon,b.lat,b.lon,nPts);
    seg.forEach((pt,j)=>{
      if(i>0&&j===0)return;
      allWPs.push({lat:Math.round(pt[0]*10000)/10000,lon:Math.round(pt[1]*10000)/10000,name:(j===0&&deduped[i].name)?deduped[i].name:undefined});
    });
  }
  if(allWPs.length>0)allWPs[allWPs.length-1].name=to.name;
  return recalcWaypoints(allWPs);
}

// ── Existing exports (unchanged) ─────────────────────────────────────────────
export function buildAutoRoute(fromPort, toPort) {
  const from=PORTS_DB.find(p=>p.id===fromPort);
  const to  =PORTS_DB.find(p=>p.id===toPort);
  if(!from||!to)return[];
  return _doRoute(from,to);
}

export function buildAutoRouteCoords(from, to) {
  if(!from||!to)return[];
  const lat1=Number(from.lat??from.latitude??0),lon1=Number(from.lon??from.longitude??from.lng??0);
  const lat2=Number(to.lat  ??to.latitude  ??0),lon2=Number(to.lon  ??to.longitude  ??to.lng  ??0);
  if(!lat1||!lon1||!lat2||!lon2)return[];
  return _doRoute(
    {id:from.id||'DEP',lat:lat1,lon:lon1,name:from.name||'Departure'},
    {id:to.id  ||'ARR',lat:lat2,lon:lon2,name:to.name  ||'Arrival'  }
  );
}

// ── ADDED: buildProRoute — professional maritime routing with vessel params ──
// Returns enriched result: {waypoints, totalNM, canalInfo, confidence,
//   approachStartIdx, warnings, vesselParams, safeDepthM}
export async function buildProRoute(from, to, vesselParams = {}) {
  const {
    draft    = 10,
    beam     = 32,
    loa      = 200,
    airDraft = 50,
    vesselType = 'cargo',
  } = vesselParams;

  const fromObj={id:from.id||'DEP',lat:Number(from.lat??from.latitude??0),lon:Number(from.lon??from.longitude??from.lng??0),name:from.name||'Departure'};
  const toObj  ={id:to.id  ||'ARR',lat:Number(to.lat  ??to.latitude  ??0),lon:Number(to.lon  ??to.longitude  ??to.lng  ??0),name:to.name  ||'Arrival'  };

  if(!fromObj.lat||!fromObj.lon||!toObj.lat||!toObj.lon)
    return{waypoints:[],error:'Invalid port coordinates',canalInfo:[],warnings:[]};

  // Canal dimension checks
  const canalInfo = checkCanalPassage(fromObj, toObj, {draft, beam, loa, airDraft});
  const suezBlocked   = canalInfo.some(c=>c.canal.includes('Suez')  &&c.status==='BLOCKED');
  const panamaBlocked = canalInfo.some(c=>c.canal.includes('Panama')&&c.status==='BLOCKED');
  const kielBlocked   = canalInfo.some(c=>c.canal.includes('Kiel')  &&c.status==='BLOCKED');

  // Build route — respects canal overrides
  let waypoints = null;

  // 1. Try hardcoded routing DB
  waypoints = buildAutoRoute(fromObj.id, toObj.id);

  // 2. Coordinate-based routing (with canal overrides applied)
  if (!waypoints || waypoints.length < 2) {
    waypoints = _doRoute(fromObj, toObj, {suezBlocked, panamaBlocked, kielBlocked});
  }

  if (!waypoints || waypoints.length < 2)
    return{waypoints:[],error:`Route not found for ${fromObj.name} → ${toObj.name}`,canalInfo,warnings:[]};

  // Safety depth thresholds (SOLAS / IACS guidelines)
  const safeDepthOcean   = draft * 4;    // open ocean minimum
  const safeDepthCoastal = draft * 6;    // coastal / non-EMODnet waters

  // Depth confidence — HIGH if EMODnet coverage (European waters), MEDIUM elsewhere
  const hasEuropeanLeg = waypoints.some(w=>w.lat>30&&w.lat<70&&w.lon>-15&&w.lon<42);
  const hasIndianOcean = waypoints.some(w=>w.lat>-40&&w.lat<30&&w.lon>40&&w.lon<100);
  const confidence = hasEuropeanLeg ? 'HIGH (EMODnet ~115m)' : hasIndianOcean ? 'MEDIUM (GEBCO ~463m)' : 'MEDIUM (GEBCO ~463m)';

  // Find port approach start (last 20 NM)
  let approachStartIdx = waypoints.length - 1;
  let cumNM = 0;
  for (let i = waypoints.length - 1; i > 0; i--) {
    cumNM += waypoints[i].distance || 0;
    if (cumNM >= 20) { approachStartIdx = i; break; }
  }

  // Collect canal status messages
  const canalMsgs = canalInfo.map(c =>
    c.status==='OK'
      ? `✅ ${c.canal}: vessel dimensions within limits`
      : `🚫 ${c.canal}: BLOCKED (${c.reason}) — ${c.alternative}`
  );

  const totalNM = waypoints[waypoints.length-1]?.totalNM || 0;
  const etaHrs  = speed => (totalNM / Math.max(1, speed)).toFixed(1);

  const warnings = [
    '━━━━━ MANDATORY NAVIGATION DISCLAIMER ━━━━━',
    '⚠ Route generated without certified ENC data.',
    '⚠ GEBCO/EMODnet depth data is NOT certified for navigation.',
    '⚠ This route MUST be verified by a qualified navigator before use.',
    `⚠ Port approach from WP${approachStartIdx+1} onwards (~last 20 NM): MANUAL PLANNING required.`,
    '⚠ Use official port approach charts, pilot books, and port authority guidance.',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ...canalMsgs,
    `📊 Depth confidence: ${confidence}`,
    `🛟 Safety depth (ocean): ${safeDepthOcean.toFixed(1)}m (draft×4)`,
    `🛟 Safety depth (coastal): ${safeDepthCoastal.toFixed(1)}m (draft×6)`,
  ];

  return {
    waypoints,
    totalNM,
    canalInfo,
    confidence,
    approachStartIdx,
    warnings,
    safeDepthM:      safeDepthOcean,
    safeDepthCoastalM: safeDepthCoastal,
    vesselParams:    {draft,beam,loa,airDraft,vesselType},
    etaAt12kn:       etaHrs(12),
    etaAt15kn:       etaHrs(15),
  };
}
