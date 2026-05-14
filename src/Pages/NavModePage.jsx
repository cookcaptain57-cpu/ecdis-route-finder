/* eslint-disable */
import { useState, useEffect, useRef, useMemo, useCallback } from “react”;
import { auth, db } from “./firebase”;

// ─── NavModePage ───────────────────────────────────────────────────────────────
function NavModePage({notify,sheetRoutes=[],portsDb=[],setTab}){
const mapRef=useRef(null);
const leafRef=useRef(null);
const baseTileRef=useRef(null);
const layersRef=useRef({route:null,vessel:null,vector:null,ais:{},trailLine:null,trail:[]});
const wsRef=useRef(null);
const gpsRef=useRef(null);
const rotationRef=useRef(0);

const [mapReady,setMapReady]=useState(false);
const [gpsOn,setGpsOn]=useState(false);
const [aisOn,setAisOn]=useState(false);

// Persisted user preferences — survive refresh
const [autoCenter,setAutoCenterRaw]=useState(()=>{try{return JSON.parse(localStorage.getItem(‘nm_autoCenter’)??‘true’);}catch{return true;}});
const [vectorTime,setVectorTimeRaw]=useState(()=>{try{return parseInt(localStorage.getItem(‘nm_vectorTime’)||‘6’);}catch{return 6;}});
const [mapMode,setMapModeRaw]=useState(()=>localStorage.getItem(‘nm_mapMode’)||‘night’);
const [orientMode,setOrientModeRaw]=useState(()=>localStorage.getItem(‘nm_orientMode’)||‘north’);
const [panelOpen,setPanelOpenRaw]=useState(()=>{try{return JSON.parse(localStorage.getItem(‘nm_panelOpen’)??‘true’);}catch{return true;}});
const [activeTab,setActiveTabRaw]=useState(()=>localStorage.getItem(‘nm_activeTab’)||‘route’);

// Persist wrappers
const setAutoCenter=v=>{setAutoCenterRaw(v);localStorage.setItem(‘nm_autoCenter’,JSON.stringify(v));};
const setVectorTime=v=>{setVectorTimeRaw(v);localStorage.setItem(‘nm_vectorTime’,String(v));};
const setMapMode=v=>{setMapModeRaw(v);localStorage.setItem(‘nm_mapMode’,v);};
const setOrientMode=v=>{setOrientModeRaw(v);localStorage.setItem(‘nm_orientMode’,v);};
const setPanelOpen=v=>{setPanelOpenRaw(v);localStorage.setItem(‘nm_panelOpen’,JSON.stringify(v));};
const setActiveTab=v=>{setActiveTabRaw(v);localStorage.setItem(‘nm_activeTab’,v);};

const [ownShip,setOwnShip]=useState(null);

// Persist loaded route across refresh
const [navRoute,setNavRouteRaw]=useState(()=>{
try{const s=localStorage.getItem(‘nm_route’);return s?JSON.parse(s):null;}catch{return null;}
});
const setNavRoute=v=>{
setNavRouteRaw(v);
try{if(v)localStorage.setItem(‘nm_route’,JSON.stringify(v));else localStorage.removeItem(‘nm_route’);}catch{}
};

const [routeSearch,setRouteSearch]=useState(’’);
const [routeSuggs,setRouteSuggs]=useState([]);
const [aisTargets,setAisTargets]=useState({});

// ── MATH ─────────────────────────────────────────────────────────────────
const haverNM=(la1,lo1,la2,lo2)=>{
const R=3440.065,d=Math.PI/180;
const a=Math.sin((la2-la1)*d/2)**2+Math.cos(la1*d)*Math.cos(la2*d)*Math.sin((lo2-lo1)*d/2)**2;
return 2*R*Math.asin(Math.sqrt(a));
};
const cogBetween=(la1,lo1,la2,lo2)=>{
const d=Math.PI/180,r=180/Math.PI;
return(Math.atan2(Math.sin((lo2-lo1)*d)*Math.cos(la2*d),
Math.cos(la1*d)*Math.sin(la2*d)-Math.sin(la1*d)*Math.cos(la2*d)*Math.cos((lo2-lo1)*d))*r+360)%360;
};
const predictPos=(lat,lon,cog,sog,min)=>{
const d=Math.PI/180,r=180/Math.PI,R=3440.065,nm=sog*(min/60);
const la2=Math.asin(Math.sin(lat*d)*Math.cos(nm/R)+Math.cos(lat*d)*Math.sin(nm/R)*Math.cos(cog*d));
const lo2=lon*d+Math.atan2(Math.sin(cog*d)*Math.sin(nm/R)*Math.cos(lat*d),Math.cos(nm/R)-Math.sin(lat*d)*Math.sin(la2));
return{lat:la2*r,lon:lo2*r};
};
const calcCPATCPA=(own,tgt)=>{
if(!own||!tgt||!tgt.lat) return{cpa:’—’,tcpa:’—’};
const d=Math.PI/180,ms=0.514444;
const lr=((own.lat+tgt.lat)/2)*d;
const dx=(tgt.lon-own.lon)*d*Math.cos(lr)*6371000;
const dy=(tgt.lat-own.lat)*d*6371000;
const rvx=(tgt.sog||0)*ms*Math.sin((tgt.cog||0)*d)-own.sog*ms*Math.sin(own.cog*d);
const rvy=(tgt.sog||0)*ms*Math.cos((tgt.cog||0)*d)-own.sog*ms*Math.cos(own.cog*d);
const vv=rvx*rvx+rvy*rvy;
const pv=dx*rvx+dy*rvy;
if(vv<0.0001){return{cpa:(Math.sqrt(dx*dx+dy*dy)/1852).toFixed(2)+’ NM’,tcpa:’—’};}
const ts=-pv/vv;
if(ts<0) return{cpa:‘Passed’,tcpa:’—’};
const cpaM=Math.sqrt((dx+rvx*ts)**2+(dy+rvy*ts)**2);
return{cpa:(cpaM/1852).toFixed(2)+’ NM’,tcpa:ts<3600?(ts/60).toFixed(1)+’ min’:(ts/3600).toFixed(1)+’ hr’};
};

// ── MAP TILES ─────────────────────────────────────────────────────────────
const TILES={
night:{url:‘https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png’,sub:‘abcd’},
day:  {url:‘https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png’,sub:‘abcd’},
dusk: {url:‘https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png’,sub:‘abcd’},
};

// ── MAP INIT ─────────────────────────────────────────────────────────────
useEffect(()=>{
const load=()=>{
if(leafRef.current) return;
if(!mapRef.current){ setTimeout(load,100); return; }
// CRITICAL: wait until container has actual pixel height
if(mapRef.current.offsetHeight < 100){ setTimeout(load,150); return; }
const L=window.L;
leafRef.current=L.map(mapRef.current,{
center:[20,70],zoom:4,preferCanvas:true,
zoomControl:false,attributionControl:false
});
baseTileRef.current=L.tileLayer(TILES[mapMode]?.url||TILES.night.url,{subdomains:‘abcd’,maxZoom:20}).addTo(leafRef.current);
L.tileLayer(‘https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png’,{opacity:0.7,maxZoom:18}).addTo(leafRef.current);
L.control.zoom({position:‘topleft’}).addTo(leafRef.current);
// Force layout then invalidate
requestAnimationFrame(()=>{
leafRef.current?.invalidateSize({animate:false});
setMapReady(true);
// Extra invalidations for mobile
[200,500,1000].forEach(t=>setTimeout(()=>leafRef.current?.invalidateSize({animate:false}),t));
});
};
if(window.L){ setTimeout(load,80); }
else{
if(!document.querySelector(‘link[href*=“leaflet”]’)){
const link=document.createElement(‘link’);
link.rel=‘stylesheet’;link.href=‘https://unpkg.com/leaflet@1.9.4/dist/leaflet.css’;
document.head.appendChild(link);
}
if(!document.querySelector(‘script[src*=“leaflet”]’)){
const s=document.createElement(‘script’);
s.src=‘https://unpkg.com/leaflet@1.9.4/dist/leaflet.js’;
s.onload=()=>setTimeout(load,80);
document.head.appendChild(s);
} else { const t=setInterval(()=>{if(window.L){clearInterval(t);setTimeout(load,80);}},50); }
}
return()=>{ stopGPS();stopAIS();if(leafRef.current){leafRef.current.remove();leafRef.current=null;} };
},[]);

// Fix blank map on GPS toggle / panel toggle / any layout change
useEffect(()=>{
if(!mapReady||!leafRef.current) return;
const fix=()=>leafRef.current?.invalidateSize({animate:false});
fix();
const ids=[100,300,700,1200].map(t=>setTimeout(fix,t));
return()=>ids.forEach(clearTimeout);
},[mapReady,gpsOn,panelOpen]);

// ── SWAP TILE on mapMode change ───────────────────────────────────────────
useEffect(()=>{
if(!mapReady||!leafRef.current||!baseTileRef.current) return;
const L=window.L;
baseTileRef.current.remove();
const cfg=TILES[mapMode]||TILES.night;
baseTileRef.current=L.tileLayer(cfg.url,{subdomains:cfg.sub||‘abcd’,maxZoom:20}).addTo(leafRef.current);
baseTileRef.current.setZIndex(1);
// Apply dusk filter
if(mapRef.current) mapRef.current.style.filter=mapMode===‘dusk’?‘sepia(30%) saturate(60%) brightness(65%)’:‘none’;
},[mapMode,mapReady]);

// ── ORIENTATION (North-up / Course-up / Head-up) ──────────────────────────
useEffect(()=>{
if(!mapReady||!leafRef.current) return;
if(orientMode===‘north’){ leafRef.current.setBearing&&leafRef.current.setBearing(0); rotationRef.current=0; }
else if(orientMode===‘course’&&ownShip){ rotationRef.current=ownShip.cog; leafRef.current.setBearing&&leafRef.current.setBearing(-ownShip.cog); }
else if(orientMode===‘head’&&ownShip){ rotationRef.current=ownShip.heading||ownShip.cog; leafRef.current.setBearing&&leafRef.current.setBearing(-(ownShip.heading||ownShip.cog)); }
// CSS rotation fallback for standard Leaflet (no rotation plugin)
const container=mapRef.current?.querySelector(’.leaflet-map-pane’);
if(container&&!leafRef.current.setBearing){
const deg=orientMode===‘north’?0:orientMode===‘course’?-(ownShip?.cog||0):-(ownShip?.heading||ownShip?.cog||0);
container.style.transform=`rotate(${deg}deg)`;container.style.transformOrigin=‘center center’;
}
},[orientMode,ownShip,mapReady]);

// ── VESSEL ICON ───────────────────────────────────────────────────────────
const makeVesselIcon=(cog=0,color=’#00D4FF’,sz=34)=>{
const L=window.L;
return L.divIcon({
html:`<svg width="${sz}" height="${sz}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${cog}deg);filter:drop-shadow(0 0 4px ${color})"><polygon points="16,2 22,28 16,24 10,28" fill="${color}" stroke="#000" stroke-width="1.5"/></svg>`,
iconSize:[sz,sz],iconAnchor:[sz/2,sz/2],className:’’
});
};
const makeAISIcon=(cog=0)=>window.L.divIcon({
html:`<svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${cog}deg)"><polygon points="11,1 15,20 11,17 7,20" fill="#FFB300" stroke="#000" stroke-width="1"/></svg>`,
iconSize:[20,20],iconAnchor:[10,10],className:’’
});

// ── ROUTE DISPLAY ─────────────────────────────────────────────────────────
useEffect(()=>{
if(!mapReady||!leafRef.current||!window.L) return;
const L=window.L,lrs=layersRef.current;
if(lrs.route){lrs.route.remove();lrs.route=null;}
if(!navRoute?.waypoints?.length) return;
const pts=navRoute.waypoints.map(w=>[w.lat,w.lon]);
lrs.route=L.layerGroup().addTo(leafRef.current);
L.polyline(pts,{color:’#00D4FF’,weight:3,opacity:0.9,dashArray:‘8,4’}).addTo(lrs.route);
navRoute.waypoints.forEach((w,i)=>{
const first=i===0,last=i===navRoute.waypoints.length-1;
L.circleMarker([w.lat,w.lon],{radius:first||last?8:5,color:first?’#00FF88’:last?’#FF4444’:’#00D4FF’,fillColor:first?’#00FF88’:last?’#FF4444’:’#00D4FF’,fillOpacity:1,weight:2}).addTo(lrs.route)
.bindTooltip(w.name||`WP ${i+1}`,{permanent:false,direction:‘top’});
});
leafRef.current.fitBounds(pts,{padding:[50,50]});
},[navRoute,mapReady]);

// ── GPS ───────────────────────────────────────────────────────────────────
const stopGPS=()=>{
if(gpsRef.current!=null){navigator.geolocation?.clearWatch(gpsRef.current);gpsRef.current=null;}
const lrs=layersRef.current;
[‘vessel’,‘vector’,‘trailLine’].forEach(k=>{if(lrs[k]){lrs[k].remove();lrs[k]=null;}});
lrs.trail=[];
};

const startGPS=()=>{
if(!navigator.geolocation){notify(‘GPS not available on this device’,‘error’);setGpsOn(false);return;}
notify(‘📍 Requesting location access…’,‘success’);
// invalidateSize fixes blank tiles when GPS toggle causes layout shift
setTimeout(()=>{ if(leafRef.current){ leafRef.current.invalidateSize(); } },100);
setTimeout(()=>{ if(leafRef.current){ leafRef.current.invalidateSize(); } },500);
let lastPos=null;
// First do a one-time getCurrentPosition to get initial fix fast
navigator.geolocation.getCurrentPosition(
(pos)=>{
const{latitude:lat,longitude:lon}=pos.coords;
if(leafRef.current) leafRef.current.setView([lat,lon],13);
[200,600].forEach(t=>setTimeout(()=>leafRef.current?.invalidateSize(),t));
},
()=>{},
{enableHighAccuracy:true,timeout:10000}
);
gpsRef.current=navigator.geolocation.watchPosition(pos=>{
const{latitude:lat,longitude:lon,speed,heading}=pos.coords;
const sog=speed!=null&&speed>=0?speed*1.944:0;
const cog=heading!=null&&heading>=0?heading:lastPos?cogBetween(lastPos.lat,lastPos.lon,lat,lon):0;
lastPos={lat,lon};
const ship={lat,lon,cog,sog,heading:heading!=null&&heading>=0?heading:cog,ts:Date.now()};
setOwnShip(ship);
if(autoCenter&&leafRef.current) leafRef.current.setView([lat,lon],Math.max(leafRef.current.getZoom(),13));
if(!window.L||!leafRef.current) return;
const L=window.L,lrs=layersRef.current;
if(lrs.vessel) lrs.vessel.remove();
lrs.vessel=L.marker([lat,lon],{icon:makeVesselIcon(cog),zIndexOffset:1000}).addTo(leafRef.current);
lrs.trail=[…lrs.trail.slice(-120),[lat,lon]];
if(lrs.trailLine) lrs.trailLine.remove();
if(lrs.trail.length>1) lrs.trailLine=L.polyline(lrs.trail,{color:’#00D4FF’,weight:1.5,opacity:0.35,dashArray:‘3,4’}).addTo(leafRef.current);
},{enableHighAccuracy:true,maximumAge:2000,timeout:20000},
err=>{
const msgs={1:‘⚠️ Location access denied.\nOpen browser Settings → Site permissions → Allow Location for this site.’,2:‘GPS signal unavailable. Ensure device GPS is on and try outdoors.’,3:‘GPS timeout. Move to open area with clear sky view.’};
notify(msgs[err.code]||’GPS error: ’+err.message,‘error’);
setGpsOn(false);
});
};

useEffect(()=>{
if(gpsOn) startGPS(); else stopGPS();
return ()=>stopGPS();
},[gpsOn]);

// Fix blank map when GPS toggled - Leaflet needs explicit size refresh
useEffect(()=>{
if(!mapReady) return;
const fix=()=>leafRef.current?.invalidateSize({animate:false});
fix();const t=setTimeout(fix,300);const t2=setTimeout(fix,800);
return()=>{clearTimeout(t);clearTimeout(t2);};
},[gpsOn,mapReady]);

// ── VECTOR ────────────────────────────────────────────────────────────────
useEffect(()=>{
if(!mapReady||!leafRef.current||!window.L) return;
const L=window.L,lrs=layersRef.current;
if(lrs.vector){lrs.vector.remove();lrs.vector=null;}
if(!ownShip||ownShip.sog<0.1) return;
const e=predictPos(ownShip.lat,ownShip.lon,ownShip.cog,ownShip.sog,vectorTime);
lrs.vector=L.layerGroup([
L.polyline([[ownShip.lat,ownShip.lon],[e.lat,e.lon]],{color:’#FFB300’,weight:2.5,opacity:0.9,dashArray:‘10,5’}),
L.circleMarker([e.lat,e.lon],{radius:5,color:’#FFB300’,fillColor:’#FFB300’,fillOpacity:0.7,weight:1.5}).bindTooltip(`+${vectorTime}m`,{permanent:false})
]).addTo(leafRef.current);
},[ownShip,vectorTime,mapReady]);

// ── AIS ───────────────────────────────────────────────────────────────────
const stopAIS=()=>{
if(wsRef.current){
if(typeof wsRef.current.close===‘function’) wsRef.current.close();
else clearInterval(wsRef.current);
wsRef.current=null;
}
Object.values(layersRef.current.ais).forEach(l=>l?.remove&&l.remove());
layersRef.current.ais={};
setAisTargets({});
};

const startAIS=(lat,lon)=>{
if(wsRef.current) return;
// Use provided position or own ship or broad global fallback
const clat=lat||ownShip?.lat||20;
const clon=lon||ownShip?.lon||70;
const delta=5; // 5° = ~550km radius
try{
const ws=new WebSocket(‘wss://stream.aisstream.io/v0/stream’);
let opened=false;
const watchdog=setTimeout(()=>{
if(!opened){
ws.close();
notify(‘AIS: No response in 12s. Check connection.’,‘error’);
setAisOn(false);
}
},12000);
ws.onopen=()=>{
opened=true;
clearTimeout(watchdog);
const payload={
APIKey:‘732d8c6a956ecc8cdb7d1654028c8e09f65521eb’,
BoundingBoxes:[[[clat-delta,clon-delta],[clat+delta,clon+delta]]],
FilterMessageTypes:[‘PositionReport’,‘ShipStaticData’]
};
ws.send(JSON.stringify(payload));
console.log(‘AIS subscribed bbox:’,clat-delta,clon-delta,‘→’,clat+delta,clon+delta);
notify(‘✅ AIS stream connected’,‘success’);
};
ws.onmessage=e=>{
try{
const msg=JSON.parse(e.data);
if(msg.error||msg.Error){
console.error(‘AIS server error:’,msg.error||msg.Error);
notify(‘AIS error: ‘+(msg.error||msg.Error),‘error’);
return;
}
const mmsi=String(msg.MetaData?.MMSI_String||msg.MetaData?.MMSI||’’);
if(!mmsi||mmsi===‘undefined’||mmsi===‘0’) return;
setAisTargets(prev=>{
const t={…prev[mmsi]||{mmsi,name:’’}};
const pr=msg.Message?.PositionReport;
const ss=msg.Message?.ShipStaticData;
if(pr&&pr.Latitude!=null&&Math.abs(pr.Latitude)<=90&&Math.abs(pr.Longitude)<=180){
t.lat=pr.Latitude; t.lon=pr.Longitude;
t.cog=pr.Cog>=0&&pr.Cog<=360?pr.Cog:0;
t.sog=pr.Sog>=0&&pr.Sog<100?pr.Sog:0;
t.heading=pr.TrueHeading>0&&pr.TrueHeading<360?pr.TrueHeading:t.cog;
}
if(ss?.Name) t.name=ss.Name.trim();
if(msg.MetaData?.ShipName) t.name=msg.MetaData.ShipName.trim();
t.ts=Date.now();
return{…prev,[mmsi]:t};
});
}catch(err){console.warn(‘AIS parse error’,err);}
};
ws.onerror=(err)=>{
clearTimeout(watchdog);
console.error(‘AIS WS error’,err);
wsRef.current=null;
setAisOn(false);
};
ws.onclose=(ev)=>{
console.log(‘AIS closed code:’,ev.code,‘reason:’,ev.reason);
if(wsRef.current===ws) wsRef.current=null;
};
wsRef.current=ws;
}catch(e){
notify(’AIS failed: ’+e.message,‘error’);
setAisOn(false);
}
};

useEffect(()=>{ if(aisOn) startAIS(); else stopAIS(); },[aisOn]);

useEffect(()=>{
if(!mapReady||!leafRef.current||!window.L) return;
const L=window.L,lrs=layersRef.current,now=Date.now();
Object.entries(aisTargets).forEach(([mmsi,t])=>{
if(!t.lat||!t.lon||now-t.ts>300000) return;
const{cpa,tcpa}=calcCPATCPA(ownShip,t);
if(lrs.ais[mmsi]) lrs.ais[mmsi].remove();
lrs.ais[mmsi]=L.marker([t.lat,t.lon],{icon:makeAISIcon(t.cog||0),zIndexOffset:500}).addTo(leafRef.current)
.bindPopup(`<div style="font:13px/1.6 monospace;min-width:170px"><b>${t.name||'Unknown'}</b><br/>MMSI: ${mmsi}<br/>SOG: ${(t.sog||0).toFixed(1)} kt · COG: ${(t.cog||0).toFixed(0)}°<hr style="margin:4px 0"/><b>CPA:</b> ${cpa}<br/><b>TCPA:</b> ${tcpa}</div>`);
});
},[aisTargets,mapReady,ownShip]);

// ── ROUTE SEARCH ─────────────────────────────────────────────────────────
useEffect(()=>{
if(!routeSearch.trim()){setRouteSuggs([]);return;}
const ql=routeSearch.toLowerCase();
setRouteSuggs(sheetRoutes.filter(r=>{
const hay=Object.values(r).filter(Boolean).join(’ ’).toLowerCase();
return hay.includes(ql);
}).slice(0,6));
},[routeSearch,sheetRoutes]);

// ── UNIVERSAL WAYPOINT PARSER (any format) ───────────────────────────────
const extractWaypoints=(text,filename=’’)=>{
// RTZ / XML / RT3 / ROUTE formats
if(text.includes(’<route’)||text.includes(’<waypoint’)||text.includes(’<rtept’)||
text.includes(’<Waypoint’)||text.includes(’<?xml’)||filename?.match(/.(rtz|rt3|rt4|rta|rtm|rtn|route|xml|rtu)$/i)){
const parsed=parseRTZ(text);
if(parsed?.waypoints?.length>1) return parsed.waypoints;
}
// GPX
if(text.includes(’<gpx’)||text.includes(’<trkpt’)||text.includes(’<rtept’)){
const doc=new DOMParser().parseFromString(text,‘text/xml’);
const pts=[…doc.querySelectorAll(‘rtept,trkpt,wpt’)].map(n=>({
lat:parseFloat(n.getAttribute(‘lat’)),lon:parseFloat(n.getAttribute(‘lon’)),
name:n.querySelector(‘name’)?.textContent||’’
})).filter(w=>!isNaN(w.lat)&&!isNaN(w.lon));
if(pts.length>1) return pts;
}
// CSV: lat,lon or lon,lat
const lines=text.trim().split(’\n’).filter(l=>l.trim());
const csvPts=[];
for(const l of lines.slice(lines[0].match(/[a-zA-Z]/)?1:0)){
const p=l.split(/[,\t;]/);
const a=parseFloat(p[0]),b=parseFloat(p[1]);
if(!isNaN(a)&&!isNaN(b)&&Math.abs(a)<=90&&Math.abs(b)<=180)
csvPts.push({lat:a,lon:b,name:p[2]?.trim()||’’});
}
if(csvPts.length>1) return csvPts;
// JSON array [{lat,lon}]
try{
const j=JSON.parse(text);
const arr=Array.isArray(j)?j:j.waypoints||j.points||[];
const jPts=arr.map(r=>({lat:parseFloat(r.lat||r.latitude||r.Latitude),lon:parseFloat(r.lon||r.lng||r.longitude||r.Longitude),name:r.name||r.Name||’’  })).filter(w=>!isNaN(w.lat)&&!isNaN(w.lon));
if(jPts.length>1) return jPts;
}catch{}
return null;
};

const loadRouteFromDB=async(r)=>{
const url=r.fileUrl||r[‘File URL’]||r[‘Drive Link’]||Object.values(r).find(v=>typeof v===‘string’&&v.includes(‘drive.google’));
if(!url){notify(‘No file link in this record’,‘error’);return;}
notify(‘Loading route…’,‘success’);
try{
const gd=url.match(//d/([a-zA-Z0-9_-]+)/);
const fetchUrl=gd?`https://drive.google.com/uc?export=download&id=${gd[1]}`:url;
const text=await fetch(fetchUrl,{mode:‘cors’}).then(r=>r.text());
const wps=extractWaypoints(text);
if(wps&&wps.length>1){
const name=r.fileName||r[‘File Name’]||r[‘Route Name’]||‘Route’;
setNavRoute({name,waypoints:wps});
setRouteSuggs([]);setRouteSearch(’’);
notify(`Loaded "${name}" — ${wps.length} waypoints`,‘success’);
}else notify(‘Could not extract waypoints from file’,‘error’);
}catch(e){notify(’Failed to load route: ’+e.message,‘error’);}
};

const loadRouteFromFile=async(file)=>{
const text=await file.text();
const wps=extractWaypoints(text,file.name);
if(wps&&wps.length>1){
setNavRoute({name:file.name.replace(/.[^.]+$/,’’),waypoints:wps});
notify(`Loaded "${file.name}" — ${wps.length} waypoints`,‘success’);
}else notify(‘No waypoints found. Supported: RTZ, GPX, CSV, JSON’,‘error’);
};

// ── STYLES ────────────────────────────────────────────────────────────────
const NS=`.nm-wrap{position:fixed;inset:0;z-index:200;background:#040C1A;display:flex;flex-direction:column;} .nm-topbar{height:44px;min-height:44px;flex-shrink:0;background:rgba(4,12,26,0.92);border-bottom:1px solid rgba(0,212,255,0.15);display:flex;align-items:center;padding:0 10px;gap:8px;z-index:600;} .nm-map{flex:1;position:relative;overflow:hidden;width:100%;} .nm-map>div{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;} .nm-map .leaflet-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;background:#040C1A!important;} .nm-map .leaflet-tile-pane{will-change:transform;} .nm-panel{position:absolute;top:8px;right:8px;z-index:500;width:256px; background:rgba(4,12,26,0.93);border:1px solid rgba(0,212,255,0.22); border-radius:13px;backdrop-filter:blur(14px);overflow:visible;} .nm-ph{display:flex;align-items:center;justify-content:space-between;padding:9px 12px; border-bottom:1px solid rgba(0,212,255,0.12);cursor:pointer;} .nm-tabs{display:flex;background:rgba(0,0,0,0.2);} .nm-tab{flex:1;padding:7px 2px;font-size:0.58rem;font-weight:700;text-align:center;cursor:pointer; color:rgba(255,255,255,0.35);letter-spacing:0.06em;border-bottom:2px solid transparent;transition:all 0.2s;} .nm-tab.act{color:#00D4FF;border-bottom-color:#00D4FF;background:rgba(0,212,255,0.05);} .nm-body{padding:10px;max-height:340px;overflow-y:auto;} .nm-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05);} .nm-lbl{font-size:0.72rem;color:rgba(255,255,255,0.65);} .nm-sw{position:relative;width:38px;height:20px;cursor:pointer;} .nm-sw input{opacity:0;width:0;height:0;} .nm-sw span{position:absolute;inset:0;background:#1a2744;border-radius:20px;transition:.3s;border:1px solid rgba(255,255,255,0.08);} .nm-sw input:checked+span{background:#00D4FF;} .nm-sw span:before{content:'';position:absolute;width:14px;height:14px;left:2px;bottom:2px;background:white;border-radius:50%;transition:.3s;} .nm-sw input:checked+span:before{transform:translateX(18px);} .nm-data{background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.12);border-radius:8px;padding:9px;margin-top:7px;} .nm-dr{display:flex;justify-content:space-between;font-size:0.71rem;margin-bottom:3px;} .nm-dl{color:rgba(255,255,255,0.45);} .nm-dv{color:#00D4FF;font-weight:700;font-family:monospace;} .nm-ri{padding:8px 9px;border-radius:7px;cursor:pointer;margin-bottom:3px; background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1); font-size:0.72rem;color:rgba(255,255,255,0.8);transition:all .15s;} .nm-ri:hover{background:rgba(0,212,255,0.12);border-color:rgba(0,212,255,0.28);} .nm-vb{flex:1;padding:5px;border-radius:6px;border:1px solid rgba(255,179,0,0.22); background:transparent;color:rgba(255,179,0,0.55);font-size:0.68rem;font-weight:700;cursor:pointer;transition:all .2s;} .nm-vb.act{background:rgba(255,179,0,0.18);color:#FFB300;border-color:#FFB300;} .nm-hud{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:400;pointer-events:none;} .nm-hc{background:rgba(4,12,26,0.88);border:1px solid rgba(0,212,255,0.2);border-radius:9px; padding:7px 12px;text-align:center;backdrop-filter:blur(8px);min-width:72px;} .nm-hv{font-size:1.05rem;font-weight:700;color:#00D4FF;font-family:monospace;} .nm-hl{font-size:0.52rem;color:rgba(255,255,255,0.38);text-transform:uppercase;letter-spacing:.1em;} .nm-fab{position:absolute;right:8px;z-index:400;width:38px;height:38px;border-radius:50%; background:rgba(4,12,26,0.88);border:1px solid rgba(0,212,255,0.25); color:#00D4FF;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;} .nm-mode-btn{padding:3px 8px;border-radius:6px;border:1px solid rgba(0,212,255,0.2); background:transparent;color:rgba(255,255,255,0.4);font-size:0.6rem;font-weight:700;cursor:pointer;transition:all .2s;} .nm-mode-btn.act{background:rgba(0,212,255,0.15);color:#00D4FF;border-color:#00D4FF;} .nm-orient-btn{padding:3px 7px;border-radius:5px;border:1px solid rgba(0,212,255,0.15); background:transparent;color:rgba(255,255,255,0.4);font-size:0.58rem;font-weight:700;cursor:pointer;transition:all .2s;} .nm-orient-btn.act{background:rgba(0,212,255,0.12);color:#00D4FF;border-color:#00D4FF;}`;

return(
<div className="nm-wrap">
<style>{NS}</style>

```
  {/* TOP BAR */}
  <div className="nm-topbar">
    <button onClick={()=>setTab('home')}
      style={{background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.25)',borderRadius:8,
        color:'#00D4FF',padding:'5px 11px',fontSize:'0.72rem',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:5}}>
      ← Menu
    </button>
    <span style={{fontFamily:'Orbitron,monospace',fontSize:'0.72rem',fontWeight:700,color:'#00D4FF',letterSpacing:'0.08em'}}>
      NAV MODE
    </span>
    {navRoute&&<span style={{background:'rgba(0,255,136,0.12)',color:'#00FF88',border:'1px solid rgba(0,255,136,0.25)',borderRadius:5,padding:'2px 7px',fontSize:'0.6rem',fontWeight:700,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
      {navRoute.name}
    </span>}
    <div style={{display:'flex',gap:3,marginLeft:'auto'}}>
      {gpsOn&&<span style={{background:'rgba(0,212,255,0.12)',color:'#00D4FF',border:'1px solid rgba(0,212,255,0.25)',borderRadius:4,padding:'2px 5px',fontSize:'0.55rem',fontWeight:700}}>GPS</span>}
      {aisOn&&<span style={{background:'rgba(255,179,0,0.12)',color:'#FFB300',border:'1px solid rgba(255,179,0,0.25)',borderRadius:4,padding:'2px 5px',fontSize:'0.55rem',fontWeight:700}}>AIS</span>}
      {/* Map mode */}
      {['night','dusk','day'].map(m=>(
        <button key={m} className={`nm-mode-btn ${mapMode===m?'act':''}`} onClick={()=>setMapMode(m)}>
          {m==='night'?'N':m==='dusk'?'D':'☀'}
        </button>
      ))}
    </div>
  </div>

  {/* MAP */}
  <div className="nm-map" ref={mapRef}/>

  {/* ORIENTATION buttons (bottom-left) */}
  <div style={{position:'absolute',bottom:72,left:8,z:400,display:'flex',flexDirection:'column',gap:4}}>
    {[['north','N-UP'],['course','C-UP'],['head','H-UP']].map(([k,l])=>(
      <button key={k} className={`nm-orient-btn ${orientMode===k?'act':''}`} onClick={()=>setOrientMode(k)}>{l}</button>
    ))}
  </div>

  {/* CENTER button */}
  <button className="nm-fab" style={{bottom:12,right:52}} onClick={()=>{
    if(ownShip&&leafRef.current) leafRef.current.setView([ownShip.lat,ownShip.lon]);
    else if(navRoute&&leafRef.current) leafRef.current.fitBounds(navRoute.waypoints.map(w=>[w.lat,w.lon]),{padding:[40,40]});
  }}>⌖</button>

  {/* PANEL */}
  <div className="nm-panel">
    <div className="nm-ph" onClick={()=>setPanelOpen(o=>!o)}>
      <span style={{fontSize:'0.72rem',fontWeight:700,color:'#00D4FF'}}>Controls</span>
      <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.8rem'}}>{panelOpen?'▲':'▼'}</span>
    </div>
    {panelOpen&&<>
      <div className="nm-tabs">
        {[['route','ROUTE'],['gps','GPS'],['vector','VECT'],['ais','AIS']].map(([k,l])=>(
          <div key={k} className={`nm-tab ${activeTab===k?'act':''}`} onClick={()=>setActiveTab(k)}>{l}</div>
        ))}
      </div>
      <div className="nm-body">

        {/* ── ROUTE TAB ── */}
        {activeTab==='route'&&<>
          {navRoute&&<div style={{background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.18)',borderRadius:8,padding:'8px',marginBottom:8}}>
            <div style={{fontSize:'0.7rem',fontWeight:700,color:'#00FF88'}}>{navRoute.name}</div>
            <div style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.45)'}}>{navRoute.waypoints.length} waypoints</div>
            <button onClick={()=>setNavRoute(null)} style={{marginTop:5,width:'100%',padding:'4px',background:'rgba(255,60,60,0.12)',color:'#FF6B6B',border:'1px solid rgba(255,60,60,0.2)',borderRadius:6,fontSize:'0.65rem',cursor:'pointer',fontWeight:700}}>✕ Clear Route</button>
          </div>}
          <div style={{position:'relative',marginBottom:7}}>
            <input value={routeSearch} onChange={e=>setRouteSearch(e.target.value)}
              placeholder="Search route by name or port…"
              style={{width:'100%',padding:'7px 9px',background:'rgba(0,212,255,0.05)',border:'1px solid rgba(0,212,255,0.18)',borderRadius:7,color:'white',fontSize:'0.71rem',boxSizing:'border-box'}}/>
            {routeSuggs.length>0&&<div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:700,
              background:'rgba(4,12,26,0.97)',border:'1px solid rgba(0,212,255,0.18)',borderRadius:8,marginTop:2,maxHeight:160,overflowY:'auto'}}>
              {routeSuggs.map((r,i)=>{
                const nm=r.fileName||r['File Name']||r['Route Name']||Object.values(r).find(v=>v&&typeof v==='string'&&v.length>2&&!v.includes('http'))||`Route ${i+1}`;
                const port=r.portName||r['Port Name']||r['From']||'';
                return<div key={i} className="nm-ri" onClick={()=>loadRouteFromDB(r)}>
                  <div style={{fontWeight:600}}>{nm}</div>
                  {port&&<div style={{fontSize:'0.62rem',color:'rgba(0,212,255,0.6)'}}>{port}</div>}
                </div>;
              })}
            </div>}
          </div>
          <label style={{display:'flex',alignItems:'center',gap:7,padding:'8px 9px',
            background:'rgba(0,212,255,0.04)',border:'1px dashed rgba(0,212,255,0.2)',
            borderRadius:7,cursor:'pointer',fontSize:'0.7rem',color:'rgba(255,255,255,0.55)'}}>
            📁 Open route file
            <input type="file" accept=".rtz,.rt3,.rt4,.rta,.rtm,.rtn,.route,.vp,.rte,.rut,.rux,.rou,.rtu,.xml,.csv,.gpx,.wpt,.json,.txt,*" style={{display:'none'}} onChange={e=>e.target.files[0]&&loadRouteFromFile(e.target.files[0])}/>
          </label>
          <div style={{fontSize:'0.58rem',color:'rgba(255,255,255,0.25)',marginTop:4,textAlign:'center'}}>RTZ · RT3 · GPX · CSV · XML · JSON and more</div>
        </>}

        {/* ── GPS TAB ── */}
        {activeTab==='gps'&&<>
          <div className="nm-row">
            <span className="nm-lbl">GPS Tracking</span>
            <label className="nm-sw"><input type="checkbox" checked={gpsOn} onChange={e=>setGpsOn(e.target.checked)}/><span/></label>
          </div>
          <div className="nm-row">
            <span className="nm-lbl">Auto-Center</span>
            <label className="nm-sw"><input type="checkbox" checked={autoCenter} onChange={e=>setAutoCenter(e.target.checked)}/><span/></label>
          </div>
          {ownShip?<div className="nm-data">
            {[['Latitude',ownShip.lat.toFixed(5)+'°'],['Longitude',ownShip.lon.toFixed(5)+'°'],['COG',ownShip.cog.toFixed(1)+'°'],['SOG',ownShip.sog.toFixed(1)+' kt']].map(([l,v])=>(
              <div key={l} className="nm-dr"><span className="nm-dl">{l}</span><span className="nm-dv">{v}</span></div>
            ))}
          </div>:<div style={{textAlign:'center',padding:'14px 0',color:'rgba(255,255,255,0.28)',fontSize:'0.7rem'}}>Enable GPS to track vessel</div>}
        </>}

        {/* ── VECTOR TAB ── */}
        {activeTab==='vector'&&<>
          <div style={{fontSize:'0.67rem',color:'rgba(255,255,255,0.45)',marginBottom:7}}>Prediction time:</div>
          <div style={{display:'flex',gap:4,marginBottom:10}}>
            {[3,6,12,30].map(t=><button key={t} className={`nm-vb ${vectorTime===t?'act':''}`} onClick={()=>setVectorTime(t)}>{t}m</button>)}
          </div>
          {ownShip&&ownShip.sog>0.1?(()=>{const p=predictPos(ownShip.lat,ownShip.lon,ownShip.cog,ownShip.sog,vectorTime);return(
            <div className="nm-data">
              <div style={{fontSize:'0.62rem',color:'#FFB300',fontWeight:700,marginBottom:5}}>+{vectorTime} min position</div>
              {[['Lat',p.lat.toFixed(5)+'°'],['Lon',p.lon.toFixed(5)+'°'],['Dist',(ownShip.sog*(vectorTime/60)).toFixed(2)+' NM']].map(([l,v])=>(
                <div key={l} className="nm-dr"><span className="nm-dl">{l}</span><span className="nm-dv" style={{color:'#FFB300'}}>{v}</span></div>
              ))}
            </div>
          );})():<div style={{textAlign:'center',padding:'14px 0',color:'rgba(255,255,255,0.28)',fontSize:'0.7rem'}}>Enable GPS and move to see vector</div>}
        </>}

        {/* ── AIS TAB ── */}
        {activeTab==='ais'&&<>
          <div className="nm-row">
            <span className="nm-lbl">AIS Overlay</span>
            <label className="nm-sw"><input type="checkbox" checked={aisOn} onChange={e=>setAisOn(e.target.checked)}/><span/></label>
          </div>
          {aisOn&&<>
            <div style={{fontSize:'0.63rem',color:'rgba(255,255,255,0.35)',margin:'6px 0 3px'}}>{Object.keys(aisTargets).length} targets</div>
            <div style={{maxHeight:180,overflowY:'auto'}}>
              {Object.values(aisTargets).filter(t=>t.lat).slice(0,12).map(t=>{
                const{cpa,tcpa}=calcCPATCPA(ownShip,t);
                return<div key={t.mmsi} style={{padding:'6px 8px',borderRadius:7,marginBottom:3,background:'rgba(255,179,0,0.05)',border:'1px solid rgba(255,179,0,0.1)',fontSize:'0.67rem',cursor:'pointer'}}
                  onClick={()=>leafRef.current?.setView([t.lat,t.lon],14)}>
                  <div style={{fontWeight:700,color:'#FFB300'}}>{t.name||t.mmsi}</div>
                  <div style={{color:'rgba(255,255,255,0.4)',fontSize:'0.6rem'}}>SOG:{(t.sog||0).toFixed(1)}kt · CPA:{cpa} · TCPA:{tcpa}</div>
                </div>;
              })}
            </div>
          </>}
          {!aisOn&&<div style={{textAlign:'center',padding:'12px 0',color:'rgba(255,255,255,0.28)',fontSize:'0.68rem'}}>Enable AIS to see nearby vessels</div>}
        </>}
      </div>
    </>}
  </div>

  {/* HUD */}
  {ownShip&&<div className="nm-hud">
    <div className="nm-hc"><div className="nm-hv">{ownShip.sog.toFixed(1)}</div><div className="nm-hl">SOG kt</div></div>
    <div className="nm-hc"><div className="nm-hv">{ownShip.cog.toFixed(0)}°</div><div className="nm-hl">COG</div></div>
    {navRoute&&(()=>{const next=navRoute.waypoints.find(w=>haverNM(ownShip.lat,ownShip.lon,w.lat,w.lon)>0.05);const d=next?haverNM(ownShip.lat,ownShip.lon,next.lat,next.lon):null;return d!=null?<div className="nm-hc"><div className="nm-hv">{d.toFixed(1)}</div><div className="nm-hl">NM WP</div></div>:null;})()}
    <div className="nm-hc"><div className="nm-hv" style={{color:'#FFB300'}}>{vectorTime}m</div><div className="nm-hl">VECTOR</div></div>
    <div className="nm-hc"><div className="nm-hv" style={{fontSize:'0.65rem'}}>{orientMode.toUpperCase()}</div><div className="nm-hl">ORIENT</div></div>
  </div>}
</div>
```

);
}

──────────────────────────────────────────────────
