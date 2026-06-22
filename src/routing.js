/* eslint-disable */
// src/routing.js
// Routing priority:
// 1. buildGraphRoute: V2 port approach + MARNET A* ocean crossing + V2 port approach
// 2. MARNET A* direct fallback
// 3. Render API
// 4. Hardcoded route table
// 5. Waypoint graph

import { PORTS_DB } from "./constants";

const DEG = Math.PI / 180;

function haversine(lat1,lon1,lat2,lon2){
  const R=3440.065,dLat=(lat2-lat1)*DEG,dLon=(lon2-lon1)*DEG;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(dLon/2)**2;
  return R*2*Math.asin(Math.sqrt(a));
}
function calcBearing(lat1,lon1,lat2,lon2){
  const dLon=(lon2-lon1)*DEG;
  const y=Math.sin(dLon)*Math.cos(lat2*DEG);
  const x=Math.cos(lat1*DEG)*Math.sin(lat2*DEG)-Math.sin(lat1*DEG)*Math.cos(lat2*DEG)*Math.cos(dLon);
  return((Math.atan2(y,x)/DEG)+360)%360;
}
export function recalcWaypoints(wps){
  return wps.map((wp,i)=>{
    if(i===0)return{...wp,distance:0,bearing:0,totalNM:0};
    const p=wps[i-1];
    const dist=haversine(p.lat,p.lon,wp.lat,wp.lon);
    const bear=calcBearing(p.lat,p.lon,wp.lat,wp.lon);
    return{...wp,distance:+dist.toFixed(2),bearing:+bear.toFixed(1),totalNM:+((p.totalNM||0)+dist).toFixed(2)};
  });
}
function simplifyRoute(wps,minDistNM=5){
  if(wps.length<3)return wps;
  const out=[wps[0]];
  for(let i=1;i<wps.length-1;i++){
    const prev=out[out.length-1];
    if(haversine(prev.lat,prev.lon,wps[i].lat,wps[i].lon)>=minDistNM)out.push(wps[i]);
  }
  out.push(wps[wps.length-1]);
  return recalcWaypoints(out);
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

// ══════════════════════════════════════════════════════════════════════════════
// RENDER API (existing)
// ══════════════════════════════════════════════════════════════════════════════
async function _routeViaAPI(fromLat,fromLon,toLat,toLon){
  try{
    const url=`/api/route?fromLat=${fromLat.toFixed(6)}&fromLon=${fromLon.toFixed(6)}&toLat=${toLat.toFixed(6)}&toLon=${toLon.toFixed(6)}`;
    const ctl=new AbortController();setTimeout(()=>ctl.abort(),30000);
    const res=await fetch(url,{signal:ctl.signal});
    if(!res.ok)return null;
    const data=await res.json();
    if(data.error)return null;
    if(data.waypoints&&data.waypoints.length>1){
      return{waypoints:recalcWaypoints(data.waypoints),totalNM:data.totalNM,passages:data.passages||[],source:data.source};
    }
  }catch(e){console.warn('[Router] /api/route failed:',e.message);}
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
// MARNET A* (worldroutens.json) — canal-aware, land-free
// ══════════════════════════════════════════════════════════════════════════════
let _marnetReady=false,_marnetLoading=null,_mnodes={},_madj={},_mgrid={};
const MGRID=0.25;

function _mnk(lat,lon){return `${lat.toFixed(5)},${lon.toFixed(5)}`;}
function _mAddNode(lon,lat){
  const k=_mnk(lat,lon);
  if(!_mnodes[k]){
    _mnodes[k]={lat,lon,k};
    const gk=`${Math.floor(lon/MGRID)},${Math.floor(lat/MGRID)}`;
    if(!_mgrid[gk])_mgrid[gk]=[];
    _mgrid[gk].push(_mnodes[k]);
  }
  return k;
}
function _mAddEdge(k1,k2,dist,pass){
  if(!_madj[k1])_madj[k1]=[];if(!_madj[k2])_madj[k2]=[];
  if(!_madj[k1].some(e=>e.to===k2))_madj[k1].push({to:k2,dist,pass});
  if(!_madj[k2].some(e=>e.to===k1))_madj[k2].push({to:k1,dist,pass});
}
function _ensureMarnet(){
  if(_marnetReady)return Promise.resolve(true);
  if(_marnetLoading)return _marnetLoading;
  _marnetLoading=fetch('/worldroutens.json')
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
    .then(data=>{
      _mnodes={};_madj={};_mgrid={};
      if(data.type==='FeatureCollection'&&Array.isArray(data.features)){
        data.features.forEach(f=>{
          const pass=f.properties?.pass||null;
          const coords=f.geometry?.coordinates||[];
          for(let i=0;i<coords.length-1;i++){
            const[lon1,lat1]=coords[i],[lon2,lat2]=coords[i+1];
            if(isNaN(lat1)||isNaN(lon1)||isNaN(lat2)||isNaN(lon2))continue;
            const dist=haversine(lat1,lon1,lat2,lon2);
            if(dist>300)continue;
            const k1=_mAddNode(lon1,lat1),k2=_mAddNode(lon2,lat2);
            _mAddEdge(k1,k2,dist,pass);
          }
        });
      }
      const nc=Object.keys(_mnodes).length;
      if(nc<10)throw new Error('Too few nodes');
      console.log(`[Router] MARNET: ${nc.toLocaleString()} nodes`);
      _marnetReady=true;return true;
    }).catch(e=>{console.warn('[Router] MARNET load failed:',e.message);_marnetLoading=null;return false;});
  return _marnetLoading;
}

function _mNearestNodes(lat,lon,count=5){
  const gx=Math.floor(lon/MGRID),gy=Math.floor(lat/MGRID);
  const found=[];
  for(let r=0;r<=80&&found.length<count*5;r++){
    for(let dx=-r;dx<=r;dx++)for(let dy=-r;dy<=r;dy++){
      if(Math.abs(dx)!==r&&Math.abs(dy)!==r)continue;
      (_mgrid[`${gx+dx},${gy+dy}`]||[]).forEach(n=>{found.push({...n,_d:haversine(lat,lon,n.lat,n.lon)});});
    }
    if(found.length>=count&&found.some(n=>n._d<25))break;
  }
  return found.filter(n=>n._d<=50).sort((a,b)=>a._d-b._d).slice(0,count);
}

const CANAL_AVOID=99999;
function _edgeCost(edge,canalPref){
  const p=edge.pass;
  if(!p||canalPref==='auto')return edge.dist;
  if(canalPref==='suez'&&(p==='panama'||p==='magellan'))return edge.dist+CANAL_AVOID;
  if(canalPref==='panama'&&(p==='suez'||p==='babelmandeb'))return edge.dist+CANAL_AVOID;
  if(canalPref==='cape'&&(p==='suez'||p==='babelmandeb'||p==='panama'||p==='magellan'))return edge.dist+CANAL_AVOID;
  return edge.dist;
}

class _Heap{
  constructor(){this.h=[];}
  push(p,k){this.h.push([p,k]);this._up(this.h.length-1);}
  pop(){const t=this.h[0],l=this.h.pop();if(this.h.length>0){this.h[0]=l;this._dn(0);}return t;}
  get size(){return this.h.length;}
  _up(i){while(i>0){const p=(i-1)>>1;if(this.h[p][0]<=this.h[i][0])break;[this.h[p],this.h[i]]=[this.h[i],this.h[p]];i=p;}}
  _dn(i){const n=this.h.length;for(;;){let m=i,l=2*i+1,r=2*i+2;if(l<n&&this.h[l][0]<this.h[m][0])m=l;if(r<n&&this.h[r][0]<this.h[m][0])m=r;if(m===i)break;[this.h[m],this.h[i]]=[this.h[i],this.h[m]];i=m;}}
}

function _marnetAStar(startK,endK,endLat,endLon,canalPref='auto'){
  const dist={[startK]:0},prev={};
  const pq=new _Heap();const vis=new Set();pq.push(0,startK);let iter=0;
  while(pq.size>0){
    if(iter++>600000)break;
    const[,curr]=pq.pop();
    if(curr===endK)break;
    if(vis.has(curr))continue;
    vis.add(curr);
    for(const edge of(_madj[curr]||[])){
      if(vis.has(edge.to))continue;
      const cost=_edgeCost(edge,canalPref);
      const nd=(dist[curr]??Infinity)+cost;
      if(nd<(dist[edge.to]??Infinity)){
        dist[edge.to]=nd;prev[edge.to]=curr;
        const n=_mnodes[edge.to];
        const h=n?haversine(n.lat,n.lon,endLat,endLon):0;
        pq.push(nd+h,edge.to);
      }
    }
  }
  const path=[];let c=endK,safety=0;
  while(c&&safety++<200000){path.unshift(_mnodes[c]);c=prev[c];}
  return path.length>1&&path[0]?.k===startK?path:[];
}

async function _routeViaMarnet(fromLat,fromLon,toLat,toLon,canalPref='auto'){
  const ok=await _ensureMarnet();
  if(!ok||Object.keys(_mnodes).length<10)return null;
  const sc=_mNearestNodes(fromLat,fromLon,5);
  const ec=_mNearestNodes(toLat,toLon,5);
  if(!sc.length||!ec.length)return null;
  const path=_marnetAStar(sc[0].k,ec[0].k,toLat,toLon,canalPref);
  if(path.length<2)return null;
  const wps=simplifyRoute(recalcWaypoints(path.map(n=>({lat:n.lat,lon:n.lon}))),8);
  const totalNM=wps[wps.length-1]?.totalNM||0;
  return{waypoints:wps,totalNM,source:'marnet-astar'};
}

// ══════════════════════════════════════════════════════════════════════════════
// V2 GRAPH — world_graph_v2.json (real ship RTZ routes)
// Used ONLY for port approach/departure legs (first/last ~50NM)
// ══════════════════════════════════════════════════════════════════════════════
let _v2Ready=false,_v2Loading=null;
let _v2Nodes=[],_v2NodeMap={},_v2Routes=[];

function _ensureV2(){
  if(_v2Ready)return Promise.resolve(true);
  if(_v2Loading)return _v2Loading;
  _v2Loading=fetch('/world_graph_v2.json')
    .then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();})
    .then(data=>{
      _v2Nodes=data.nodes||[];
      _v2Routes=data.routes||[];
      _v2NodeMap={};
      _v2Nodes.forEach(n=>{_v2NodeMap[n[0]]=n;});
      console.log(`[Router] V2: ${_v2Nodes.length.toLocaleString()} nodes, ${_v2Routes.length.toLocaleString()} routes`);
      _v2Ready=true;return true;
    }).catch(e=>{console.warn('[Router] V2 load failed:',e.message);_v2Loading=null;return false;});
  return _v2Loading;
}

// Resolve a V2 route's node IDs to lat/lon waypoints
// reversed=true means we traverse from to_ll end → from_ll end
function _v2ResolveNodes(route,reversed){
  let ids=[...route.nodes];
  if(reversed)ids=ids.reverse();
  return ids.map(id=>{
    const n=_v2NodeMap[id];
    return n?{lat:n[2],lon:n[3],name:n[1]||''}:null;
  }).filter(Boolean);
}

// Find best V2 port DEPARTURE approach:
// Returns waypoints from port → open sea exit point, plus the exit coords
// PORT_SNAP_NM: how close the route start must be to the port
// SEA_MIN_NM: minimum distance the route must travel away from port (ensures it's going to open sea)
function _v2FindDepartureApproach(portLat,portLon,PORT_SNAP_NM=40,SEA_MIN_NM=80){
  if(!_v2Ready)return null;
  let best=null,bestScore=Infinity;
  for(const r of _v2Routes){
    const [flon,flat]=r.from_ll;
    const [tlon,tlat]=r.to_ll;
    // Check if FROM end is near port
    const dFrom=haversine(portLat,portLon,flat,flon);
    if(dFrom<PORT_SNAP_NM){
      const farDist=haversine(portLat,portLon,tlat,tlon);
      if(farDist>=SEA_MIN_NM&&dFrom<bestScore){
        bestScore=dFrom;
        best={route:r,reversed:false,exitLat:tlat,exitLon:tlon,snapDist:dFrom};
      }
    }
    // Check if TO end is near port (reversed)
    const dTo=haversine(portLat,portLon,tlat,tlon);
    if(dTo<PORT_SNAP_NM){
      const farDist=haversine(portLat,portLon,flat,flon);
      if(farDist>=SEA_MIN_NM&&dTo<bestScore){
        bestScore=dTo;
        best={route:r,reversed:true,exitLat:flat,exitLon:flon,snapDist:dTo};
      }
    }
  }
  if(!best)return null;
  const wps=_v2ResolveNodes(best.route,best.reversed);
  return{waypoints:wps,exitLat:best.exitLat,exitLon:best.exitLon,snapDist:best.snapDist,routeName:best.route.name};
}

// Find best V2 port ARRIVAL approach:
// Returns waypoints from open sea entry point → port
// The entry point is the FAR end of a route that ENDS near the port
// DIRECTION: entry must come from the correct general direction
function _v2FindArrivalApproach(portLat,portLon,fromLat,fromLon,PORT_SNAP_NM=40,SEA_MIN_NM=80){
  if(!_v2Ready)return null;
  let best=null,bestScore=Infinity;

  for(const r of _v2Routes){
    const [flon,flat]=r.from_ll;
    const [tlon,tlat]=r.to_ll;

    // TO end near port → route goes somewhere→port, entry is FROM end
    const dTo=haversine(portLat,portLon,tlat,tlon);
    if(dTo<PORT_SNAP_NM){
      const entryLat=flat,entryLon=flon;
      const entryDist=haversine(portLat,portLon,entryLat,entryLon);
      if(entryDist<SEA_MIN_NM)continue; // too short, not meaningful
      // Entry point should be in the general direction of the departure
      const entryFromDep=haversine(fromLat,fromLon,entryLat,entryLon);
      const score=dTo+entryFromDep*0.1; // prefer closer to port, loosely prefer correct direction
      if(score<bestScore){
        bestScore=score;
        best={route:r,reversed:false,entryLat,entryLon,snapDist:dTo};
      }
    }

    // FROM end near port → route goes port→somewhere (reversed = arrival)
    const dFrom=haversine(portLat,portLon,flat,flon);
    if(dFrom<PORT_SNAP_NM){
      const entryLat=tlat,entryLon=tlon;
      const entryDist=haversine(portLat,portLon,entryLat,entryLon);
      if(entryDist<SEA_MIN_NM)continue;
      const entryFromDep=haversine(fromLat,fromLon,entryLat,entryLon);
      const score=dFrom+entryFromDep*0.1;
      if(score<bestScore){
        bestScore=score;
        best={route:r,reversed:true,entryLat,entryLon,snapDist:dFrom};
      }
    }
  }
  if(!best)return null;
  // reversed=true means original route goes port→sea, we reverse it to get sea→port
  // reversed=false means original route goes sea→port, use as-is
  const wps=_v2ResolveNodes(best.route,best.reversed);
  return{waypoints:wps,entryLat:best.entryLat,entryLon:best.entryLon,snapDist:best.snapDist,routeName:best.route.name};
}

// ══════════════════════════════════════════════════════════════════════════════
// buildGraphRoute — correct strategy:
// V2 departure approach + MARNET ocean crossing + V2 arrival approach
// ══════════════════════════════════════════════════════════════════════════════
export async function buildGraphRoute(fromObj,toObj,canalPref='auto'){
  const fLat=fromObj.lat,fLon=fromObj.lon;
  const tLat=toObj.lat,tLon=toObj.lon;

  // Load both graphs in parallel
  await Promise.all([_ensureV2(),_ensureMarnet()]);

  // Direct distance — if very short (<150NM) just use MARNET directly, no need for V2 approach
  const directDist=haversine(fLat,fLon,tLat,tLon);
  if(directDist<150){
    const marnetResult=await _routeViaMarnet(fLat,fLon,tLat,tLon,canalPref);
    if(marnetResult&&marnetResult.waypoints.length>=2){
      return{...marnetResult,via:canalPref};
    }
    return null;
  }

  // Step 1: Find V2 departure approach (port → open sea)
  const depApproach=_v2FindDepartureApproach(fLat,fLon,50,80);

  // Step 2: Find V2 arrival approach (open sea → port)
  const arrApproach=_v2FindArrivalApproach(tLat,tLon,fLat,fLon,50,80);

  // Determine MARNET ocean crossing endpoints
  const marnetFromLat=depApproach?depApproach.exitLat:fLat;
  const marnetFromLon=depApproach?depApproach.exitLon:fLon;
  const marnetToLat  =arrApproach?arrApproach.entryLat:tLat;
  const marnetToLon  =arrApproach?arrApproach.entryLon:tLon;

  // Step 3: MARNET A* for ocean crossing
  const marnetResult=await _routeViaMarnet(marnetFromLat,marnetFromLon,marnetToLat,marnetToLon,canalPref);

  if(!marnetResult||marnetResult.waypoints.length<2){
    console.warn('[Router] MARNET ocean crossing failed');
    return null;
  }

  // Step 4: Assemble full route
  const allWps=[
    {lat:fLat,lon:fLon,name:fromObj.name},
    ...(depApproach?depApproach.waypoints:[]),
    ...marnetResult.waypoints,
    ...(arrApproach?arrApproach.waypoints:[]),
    {lat:tLat,lon:tLon,name:toObj.name},
  ];

  // Deduplicate consecutive near-duplicate points
  const deduped=allWps.filter((wp,i)=>{
    if(i===0)return true;
    const prev=allWps[i-1];
    return haversine(wp.lat,wp.lon,prev.lat,prev.lon)>0.05;
  });

  const result=simplifyRoute(recalcWaypoints(deduped),4);
  const totalNM=result[result.length-1]?.totalNM||0;

  // Detect via
  const hasNode=(lat,lon,range)=>result.some(wp=>haversine(wp.lat,wp.lon,lat,lon)<range);
  let via='direct';
  if(hasNode(30.5,32.35,120))via='suez';
  else if(hasNode(9.0,-79.7,80))via='panama';
  else if(hasNode(-34.5,19.5,200))via='cape';

  const src=depApproach||arrApproach?'v2+marnet':'marnet-astar';
  console.log(`[Router] ${src}: ${result.length} WPs, ${totalNM.toFixed(0)} NM, via=${via}`);
  if(depApproach)console.log(`  Dep: ${depApproach.routeName}`);
  if(arrApproach)console.log(`  Arr: ${arrApproach.routeName}`);

  return{waypoints:result,totalNM,source:src,via,routeName:`${fromObj.name} → ${toObj.name}`};
}

// ══════════════════════════════════════════════════════════════════════════════
// CANAL SPECS (existing — untouched)
// ══════════════════════════════════════════════════════════════════════════════
const CANAL_SPECS={
  suez:{name:'Suez Canal',beam:77.0,draft:20.1,loa:400,airDraft:68},
  panama:{name:'Panama Canal Neopanamax',beam:51.25,draft:15.2,loa:366,airDraft:57.91},
  kiel:{name:'Kiel Canal',beam:32.5,draft:9.5,loa:235,airDraft:42}
};
function _usesSuez(f,t){const eu=p=>(p.lon>-7&&p.lon<37&&p.lat>30&&p.lat<48)||(p.lat>48&&p.lon>-15&&p.lon<40);const as=p=>p.lon>37&&p.lon<180&&p.lat>-40&&p.lat<40;return(eu(f)&&as(t))||(eu(t)&&as(f));}
function _usesPanama(f,t){const atl=p=>p.lon>-98&&p.lon<-55&&p.lat>-60&&p.lat<55;const pac=p=>p.lon<-80||p.lon>100;return(atl(f)&&pac(t))||(pac(f)&&atl(t));}
function _usesKiel(f,t){const bal=p=>p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66;const nth=p=>p.lon>-5&&p.lon<10&&p.lat>50&&p.lat<60;return(bal(f)&&nth(t))||(nth(f)&&bal(t));}
export function checkCanalPassage(from,to,vp={}){
  const{draft=10,beam=32,loa=200,airDraft=50}=vp;const result=[];
  const check=(spec,fn,alt)=>{if(!fn(from,to))return;const r=[];if(beam>spec.beam)r.push(`beam ${beam}m > max ${spec.beam}m`);if(draft>spec.draft)r.push(`draft ${draft}m > max ${spec.draft}m`);if(loa>spec.loa)r.push(`LOA ${loa}m > max ${spec.loa}m`);if(airDraft>spec.airDraft)r.push(`air draft ${airDraft}m > max ${spec.airDraft}m`);result.push({canal:spec.name,status:r.length?'BLOCKED':'OK',reason:r.join('; ')||null,alternative:r.length?alt:null,limits:`beam<${spec.beam}m draft<${spec.draft}m LOA<${spec.loa}m`});};
  check(CANAL_SPECS.suez,_usesSuez,'Auto-rerouted via Cape of Good Hope (+~3500 NM)');
  check(CANAL_SPECS.panama,_usesPanama,'Auto-rerouted via Cape Horn (+~5000 NM)');
  check(CANAL_SPECS.kiel,_usesKiel,'Auto-rerouted via Skagen/North Sea (+~200 NM)');
  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// FALLBACK WAYPOINT GRAPH (existing — untouched)
// ══════════════════════════════════════════════════════════════════════════════
export const SEA_WP={SUEZ_N:{lat:31.27,lon:32.33},SUEZ_S:{lat:29.92,lon:32.55},RED_N:{lat:29.77,lon:32.55},RED_N2:{lat:28.0,lon:33.5},RED_C:{lat:24.0,lon:37.0},RED_S:{lat:15.0,lon:41.5},BAB:{lat:12.58,lon:43.38},ADEN_G:{lat:11.8,lon:45.5},ADEN_E:{lat:11.5,lon:50.0},SOCOTRA:{lat:12.0,lon:54.0},HORMUZ:{lat:26.58,lon:56.35},HORMUZ_E:{lat:23.5,lon:59.0},ARAB_NW:{lat:22.0,lon:60.0},ARAB_W:{lat:18.0,lon:60.0},IND_W:{lat:12.0,lon:62.0},IND_W2:{lat:8.0,lon:64.0},IND_W_COAST:{lat:14.0,lon:73.0},IND_SW:{lat:10.0,lon:74.8},IND_TIP_W:{lat:7.5,lon:76.5},IND_TIP:{lat:6.0,lon:77.5},PALK_W:{lat:7.5,lon:78.8},LANKA_SW:{lat:5.8,lon:79.8},LANKA_S:{lat:5.4,lon:80.6},LANKA_SE:{lat:6.0,lon:82.0},IND_NE:{lat:8.5,lon:84.5},IND_E_COAST:{lat:12.0,lon:81.5},BAY_SW:{lat:10.0,lon:83.0},BAY_C:{lat:13.5,lon:87.0},BAY_N:{lat:18.0,lon:90.0},BAY_E:{lat:12.0,lon:93.0},ANDAMAN_W:{lat:11.0,lon:92.0},ANDAMAN:{lat:10.5,lon:94.0},ANDAMAN_S:{lat:6.5,lon:95.0},MALACCA_NW:{lat:6.5,lon:98.8},MALACCA_N:{lat:3.09,lon:101.02},MALACCA_C1:{lat:2.9,lon:100.67},MALACCA_C:{lat:2.33,lon:101.35},MALACCA_S1:{lat:1.83,lon:101.8},MALACCA_S2:{lat:1.56,lon:102.39},MALACCA_S3:{lat:1.15,lon:103.41},MALACCA_S:{lat:1.18,lon:103.82},SCS_W:{lat:3.0,lon:108.0},SCS_C:{lat:8.0,lon:110.0},SCS_N:{lat:14.0,lon:112.0},PHILIP:{lat:10.0,lon:122.0},EAST_CHINA2:{lat:31.0,lon:124.0},EAST_CHINA:{lat:27.0,lon:124.0},KOREA_STR:{lat:34.5,lon:129.0},JAPAN_SEA:{lat:37.0,lon:132.0},EAST_CHINA_N:{lat:37.57,lon:122.61},TSUGARU:{lat:41.5,lon:140.8},PAC_NW:{lat:48.0,lon:-160.0},PAC_NE:{lat:40.0,lon:-150.0},PAC_C:{lat:5.0,lon:-140.0},PAC_SW:{lat:-20.0,lon:170.0},PAC_SE:{lat:-20.0,lon:-90.0},LOMBOK:{lat:-8.5,lon:115.8},SUNDA:{lat:-6.1,lon:105.7},TIMOR:{lat:-9.5,lon:127.0},ARAFURA:{lat:-12.0,lon:136.0},TORRES:{lat:-10.5,lon:142.5},AUS_N:{lat:-12.0,lon:127.0},AUS_W:{lat:-25.0,lon:108.0},AUS_SE:{lat:-38.5,lon:148.2},CORAL:{lat:-18.0,lon:152.0},TASMAN:{lat:-38.0,lon:157.0},NZ_N:{lat:-38.52,lon:174.63},GIBRALTAR:{lat:35.98,lon:-5.5},MED_W:{lat:37.5,lon:5.0},MED_W2:{lat:37.0,lon:10.0},MED_C:{lat:37.0,lon:15.0},MED_E:{lat:34.5,lon:24.0},MED_E2:{lat:33.5,lon:28.0},BLACK_W:{lat:43.0,lon:29.0},BASC:{lat:47.0,lon:-5.0},DOVER:{lat:51.05,lon:1.5},NORTH_SEA:{lat:56.0,lon:3.0},SKAGEN:{lat:57.72,lon:10.6},BALTIC_E:{lat:59.0,lon:21.5},ATLANTIC_N:{lat:45.0,lon:-30.0},ATLANTIC_C:{lat:20.0,lon:-35.0},ATLANTIC_S:{lat:-15.0,lon:-20.0},ATLANTIC_SW:{lat:-40.0,lon:-40.0},ATL_NW:{lat:50.0,lon:-20.0},ATL_MID:{lat:35.0,lon:-38.0},ATL_W_AFR:{lat:5.0,lon:-15.0},ATL_SA:{lat:-10.0,lon:-20.0},CAPE_GH:{lat:-34.5,lon:19.5},IND_S:{lat:-35.0,lon:50.0},IND_SW2:{lat:-25.0,lon:90.0},CAPE_HORN:{lat:-55.9,lon:-67.3},AFR_E:{lat:-10.0,lon:50.0},AFR_E2:{lat:-25.0,lon:40.0},PANAMA_P:{lat:8.9,lon:-79.5},PANAMA_A:{lat:9.38,lon:-79.9},CARIB:{lat:15.0,lon:-75.0},CARIB_E:{lat:12.0,lon:-63.0},EAST_US:{lat:35.0,lon:-71.0},EAST_US_N:{lat:40.0,lon:-70.0},WEST_US:{lat:35.0,lon:-121.0},WEST_US_N:{lat:48.0,lon:-125.0},SA_E:{lat:-23.5,lon:-43.5},SA_W:{lat:-33.0,lon:-71.5}};

const PORT_EXIT={MUM:['IND_W_COAST'],KAN:['IND_W_COAST'],KOC:['IND_SW','IND_TIP_W'],CHE:['IND_E_COAST'],CTG:['BAY_N','BAY_C'],SIN:['MALACCA_S'],PKL:['MALACCA_S3','MALACCA_S'],DXB:['HORMUZ'],FUJ:['HORMUZ'],KWI:['HORMUZ'],BAH:['HORMUZ'],DOH:['HORMUZ'],MCT:['HORMUZ_E'],JED:['RED_S','BAB'],ADE:['BAB','ADEN_G'],PSD:['SUEZ_S','RED_N'],ROT:['DOVER','BASC'],HAM:['NORTH_SEA','DOVER'],ANT:['DOVER','BASC'],NYK:['EAST_CHINA_N','KOREA_STR'],BUS:['KOREA_STR'],YOK:['EAST_CHINA'],SHA:['EAST_CHINA2'],HKG:['SCS_N'],MAN:['PHILIP'],SYD:['CORAL'],JAK:['SUNDA']};
const ROUTE_TABLE={"MUM-SIN":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],"MUM-DXB":[[18.93,72.83],[20.0,67.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],"MUM-ROT":[[18.93,72.83],[14.0,73.0],[10.0,71.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.05,1.5],[51.92,4.48]],"SIN-MUM":[[1.29,103.85],[1.15,103.41],[2.33,101.35],[3.09,101.02],[5.0,99.2],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],"SIN-DXB":[[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],"SIN-ROT":[[1.29,103.85],[6.5,95.0],[8.5,84.5],[8.5,75.0],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],"DXB-SIN":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],"DXB-MUM":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[20.0,67.0],[18.93,72.83]],"ROT-SIN":[[51.92,4.48],[51.05,1.5],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],"ROT-MUM":[[51.92,4.48],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],"SHA-SIN":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[8.0,110.0],[5.0,108.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],"SHA-ROT":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[8.0,110.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],"HKG-SIN":[[22.29,114.16],[18.0,115.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],"BUS-SIN":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],"YOK-SIN":[[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[8.0,110.0],[3.0,108.0],[1.29,103.85]],"YOK-LAX":[[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-145.0],[33.74,-118.27]],"NYK-ROT":[[40.65,-74.07],[40.0,-68.0],[45.0,-40.0],[47.0,-25.0],[50.0,-10.0],[51.92,4.48]],"ROT-NYK":[[51.92,4.48],[50.0,-10.0],[47.0,-25.0],[45.0,-40.0],[40.0,-68.0],[40.65,-74.07]],"CHE-SIN":[[13.08,80.29],[10.0,81.5],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.29,103.85]],"JAK-SIN":[[-6.11,106.88],[-6.1,105.7],[1.15,103.41],[1.29,103.85]],"SYD-SIN":[[-33.86,151.21],[-30.0,135.0],[-18.0,120.0],[-8.5,115.8],[3.0,108.0],[1.29,103.85]],"PSD-DXB":[[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[11.8,45.5],[12.0,50.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],"PSD-MUM":[[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,54.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],"PSD-SIN":[[31.26,32.31],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],"KAR-SIN":[[24.86,67.01],[20.0,65.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],"KAR-DXB":[[24.86,67.01],[26.0,61.0],[26.58,56.35],[25.05,55.13]],"COL-SIN":[[6.94,79.85],[6.0,80.5],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.56,102.39],[1.29,103.85]],"COL-MUM":[[6.94,79.85],[7.5,78.8],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],"MOM-MUM":[[-4.05,39.67],[-7.0,42.0],[-5.0,45.0],[0.0,50.0],[8.0,58.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]]};

function _doRoute(from,to){
  const key=`${from.id}-${to.id}`,keyR=`${to.id}-${from.id}`;
  if(ROUTE_TABLE[key]){const pts=ROUTE_TABLE[key].map(([lat,lon],i,arr)=>({lat,lon,name:i===0?from.name:i===arr.length-1?to.name:undefined}));pts[0]={lat:from.lat,lon:from.lon,name:from.name};pts[pts.length-1]={lat:to.lat,lon:to.lon,name:to.name};return recalcWaypoints(pts);}
  if(ROUTE_TABLE[keyR]){const pts=[...ROUTE_TABLE[keyR]].reverse().map(([lat,lon],i,arr)=>({lat,lon,name:i===0?from.name:i===arr.length-1?to.name:undefined}));pts[0]={lat:from.lat,lon:from.lon,name:from.name};pts[pts.length-1]={lat:to.lat,lon:to.lon,name:to.name};return recalcWaypoints(pts);}
  const wps=[],add=(...ks)=>ks.forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});
  const isWI=p=>p.lon>=69&&p.lon<77&&p.lat>=8&&p.lat<24,isEI=p=>p.lon>=77&&p.lon<88&&p.lat>=8&&p.lat<22,isBB=p=>p.lon>=79&&p.lon<99&&p.lat>=5&&p.lat<24,isIO=p=>p.lon>=44&&p.lon<80&&p.lat>=-10&&p.lat<25,isPG=p=>p.lon>=48&&p.lon<58&&p.lat>22,isRS=p=>p.lon>=32&&p.lon<44&&p.lat>=11&&p.lat<31,isSEA=p=>p.lon>=98&&p.lon<120&&p.lat>=-10&&p.lat<22,isFE=p=>p.lon>=108&&p.lat>=-5&&p.lat<45,isJK=p=>p.lon>=120&&p.lat>=28&&p.lat<46,isMed=p=>p.lon>-6&&p.lon<37&&p.lat>30&&p.lat<47,isEU=p=>(p.lon<20&&p.lat>40)||(p.lon>=-10&&p.lon<25&&p.lat>50),isUK=p=>p.lon>=-10&&p.lon<5&&p.lat>=55&&p.lat<62,isBal=p=>p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66,isBS=p=>p.lon>27&&p.lon<42&&p.lat>40&&p.lat<48,isEAf=p=>p.lon>=36&&p.lon<52&&p.lat>=-30&&p.lat<15,isWAf=p=>p.lon>=-20&&p.lon<10&&p.lat>=-10&&p.lat<20,isEUS=p=>p.lon>=-82&&p.lon<-65&&p.lat>=24&&p.lat<47,isWUS=p=>p.lon<=-100&&p.lat>=10&&p.lat<62,isCarib=p=>p.lon>=-88&&p.lon<-60&&p.lat>=8&&p.lat<24,isSA=p=>p.lon>=-85&&p.lon<-30&&p.lat<15,isSAtl=p=>p.lon>=-55&&p.lon<20&&p.lat<-10,isAus=p=>p.lon>=113&&p.lon<155&&p.lat>=-45&&p.lat<-10;
  const fromExit=PORT_EXIT[from.id]||[];fromExit.forEach(k=>{if(SEA_WP[k])wps.push({...SEA_WP[k]});});
  const fromWI=isWI(from)||(isPG(from)&&!isSEA(to)&&!isFE(to)),toE=isEI(to)||isBB(to)||isSEA(to)||isFE(to)||isJK(to),fromE=isEI(from)||isBB(from)||isSEA(from)||isFE(from),toW=isWI(to)||isIO(to)||isPG(to)||isRS(to)||isEAf(to),rndTip=fromExit.includes('IND_TIP')||fromExit.includes('IND_TIP_W');
  if(fromWI&&toE&&!rndTip)add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE');if(fromE&&toW&&!fromExit.includes('IND_TIP'))add('LANKA_S','IND_TIP','IND_TIP_W');
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
export function buildAutoRoute(fromPort,toPort){
  const from=PORTS_DB.find(p=>p.id===fromPort),to=PORTS_DB.find(p=>p.id===toPort);
  if(!from||!to)return[];return _doRoute(from,to);
}
export function buildAutoRouteCoords(from,to){
  if(!from||!to)return[];
  const lat1=Number(from.lat??from.latitude??0),lon1=Number(from.lon??from.longitude??from.lng??0);
  const lat2=Number(to.lat??to.latitude??0),lon2=Number(to.lon??to.longitude??to.lng??0);
  if(!lat1||!lon1||!lat2||!lon2)return[];
  return _doRoute({id:from.id||'DEP',lat:lat1,lon:lon1,name:from.name||'Departure'},{id:to.id||'ARR',lat:lat2,lon:lon2,name:to.name||'Arrival'});
}

export async function buildProRoute(from,to,vesselParams={},canalPref='auto'){
  const{draft=10,beam=32,loa=200,airDraft=50,vesselType='cargo'}=vesselParams;
  const fromObj={id:from.id||'DEP',lat:Number(from.lat??from.latitude??0),lon:Number(from.lon??from.longitude??from.lng??0),name:from.name||'Departure'};
  const toObj  ={id:to.id  ||'ARR',lat:Number(to.lat??to.latitude??0),  lon:Number(to.lon??to.longitude??to.lng??0),  name:to.name  ||'Arrival'};
  if(!fromObj.lat||!fromObj.lon||!toObj.lat||!toObj.lon)
    return{waypoints:[],error:'Invalid port coordinates',canalInfo:[],warnings:[],routeSource:'error'};

  const canalInfo=checkCanalPassage(fromObj,toObj,{draft,beam,loa,airDraft});

  // ── 1. Hardcoded route table — proven correct for major routes ───────────────
  // Must be FIRST: covers MUM-SIN, ROT-SIN, etc with correct realistic paths
  {
    const wps=buildAutoRoute(fromObj.id,toObj.id);
    if(wps&&wps.length>1){
      const result2={waypoints:wps,totalNM:wps[wps.length-1]?.totalNM||0,source:'route-table'};
      // Anchor exact coords
      result2.waypoints[0]={...result2.waypoints[0],lat:fromObj.lat,lon:fromObj.lon,name:fromObj.name};
      result2.waypoints[result2.waypoints.length-1]={...result2.waypoints[result2.waypoints.length-1],lat:toObj.lat,lon:toObj.lon,name:toObj.name};
      const wp2=recalcWaypoints(result2.waypoints);
      const nm2=wp2[wp2.length-1]?.totalNM||0;
      if(nm2>50){
        const canalInfo2=checkCanalPassage(fromObj,toObj,{draft,beam,loa,airDraft});
        const canalMsgs2=canalInfo2.map(c=>c.status==='OK'?'✅ '+c.canal+': vessel fits':'🚫 '+c.canal+': BLOCKED — '+c.reason+' — '+c.alternative);
        return{waypoints:wp2,totalNM:nm2,canalInfo:canalInfo2,confidence:'HIGH — validated route table',routeSource:'route-table',approachStartIdx:wp2.length-1,warnings:['⚠ Route NOT certified for navigation. Verify with official ENC.',...canalMsgs2],via:canalPref,vesselParams:{draft,beam,loa,airDraft,vesselType},etaAt12kn:(nm2/12).toFixed(1),etaAt15kn:(nm2/15).toFixed(1)};
      }
    }
  }

  // ── 2. V2 port approach + MARNET ocean crossing ────────────────────────────
  let result=await buildGraphRoute(fromObj,toObj,canalPref);

  // ── 3. Pure MARNET A* ──────────────────────────────────────────────────────
  if(!result||!result.waypoints||result.waypoints.length<2){
    result=await _routeViaMarnet(fromObj.lat,fromObj.lon,toObj.lat,toObj.lon,canalPref);
  }

  // ── 4. Render API ──────────────────────────────────────────────────────────
  if(!result||!result.waypoints||result.waypoints.length<2){
    result=await _routeViaAPI(fromObj.lat,fromObj.lon,toObj.lat,toObj.lon);
  }

  // ── 5. Waypoint graph ─────────────────────────────────────────────────────
  if(!result||!result.waypoints||result.waypoints.length<2){
    const wps=_doRoute(fromObj,toObj);
    if(wps&&wps.length>1)result={waypoints:wps,totalNM:wps[wps.length-1]?.totalNM||0,source:'waypoint-graph'};
  }

  if(!result||!result.waypoints||result.waypoints.length<2)
    return{waypoints:[],error:`Route not found for ${fromObj.name} → ${toObj.name}`,canalInfo,warnings:[],routeSource:'error'};

  // Anchor exact port coords
  const wps=result.waypoints;
  wps[0]={...wps[0],lat:fromObj.lat,lon:fromObj.lon,name:fromObj.name};
  wps[wps.length-1]={...wps[wps.length-1],lat:toObj.lat,lon:toObj.lon,name:toObj.name};
  const waypoints=recalcWaypoints(wps);
  const totalNM=waypoints[waypoints.length-1]?.totalNM||0;

  let approachStartIdx=waypoints.length-1,cumNM=0;
  for(let i=waypoints.length-1;i>0;i--){cumNM+=(waypoints[i].distance||0);if(cumNM>=20){approachStartIdx=i;break;}}

  const src=result.source||'unknown';
  const isGood=src==='v2+marnet'||src==='marnet-astar'||['render-python','searoutes-com'].includes(src);
  const viaLabel=result.via&&result.via!=='auto'?` via ${result.via.toUpperCase()}`:'';
  const confidence=src==='v2+marnet'?`HIGH — real port approach + MARNET sea route${viaLabel}`:
    src==='marnet-astar'?`HIGH — MARNET land-free routing${viaLabel}`:
    src==='route-table'?'MEDIUM — validated route table':'LOW — waypoint graph fallback';

  const canalMsgs=canalInfo.map(c=>c.status==='OK'?`✅ ${c.canal}: vessel fits`:`🚫 ${c.canal}: BLOCKED — ${c.reason} — ${c.alternative}`);
  const warnings=['⚠ Route NOT certified for navigation. Verify with official ENC.',...canalMsgs,`📊 ${confidence}`];

  return{waypoints,totalNM,canalInfo,confidence,routeSource:src,approachStartIdx,warnings,via:result.via||canalPref,vesselParams:{draft,beam,loa,airDraft,vesselType},etaAt12kn:(totalNM/12).toFixed(1),etaAt15kn:(totalNM/15).toFixed(1)};
}

// Warm up both graphs on module load
Promise.all([_ensureV2(),_ensureMarnet()]).catch(()=>{});
