/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import ETACalculator from "../components/ETACalculator";
import aisService from "../services/aisService";

const VESSEL_API_KEY = '7da0c40c639a5f2a7532e75d9cdad6156b65f61932d778c1ce8580f9786e4506';
const AISSTREAM_KEY  = 'e66d76190c2bf6c206264e3cb894308b853d73df';
const DEFAULT_COLORS = { route:'#E74C3C', vector:'#00D4FF', ship:'#00D4FF', track:'#00FF88', xtd:'#FFB300', chart:'#FF2020' };

const AIS_SOURCES = {
  safepilot:{ label:'SafePilot P3', color:'#00FF88', hosts:['ws://192.168.1.1:4002','ws://10.0.0.1:4002','ws://10.0.1.1:4002','ws://192.168.1.1:4001'] },
  bridge:   { label:'Local Bridge',  color:'#00D4FF', hosts:['ws://localhost:4002','ws://127.0.0.1:4002'] },
  internet: { label:'Internet AIS',  color:'#FFD700', hosts:[] },
  off:      { label:'Off',           color:'#4A6080', hosts:[] },
};

const DEPTH_SOURCES = [
  { id:'usa',        label:'USA',        emoji:'🇺🇸', desc:'NOAA ENC — S-57 chart detail' },
  { id:'europe',     label:'Europe',     emoji:'🇪🇺', desc:'EMODnet — high-res coastal' },
  { id:'global',     label:'Global',     emoji:'🌍', desc:'GEBCO — worldwide coverage' },
  { id:'soundings',  label:'Soundings',  emoji:'📊', desc:'ESRI depth numbers (zoom 9+)' },
  { id:'nz',         label:'NZ',         emoji:'🇳🇿', desc:'LINZ — New Zealand hydrographic' },
  { id:'norway',     label:'Norway',     emoji:'🇳🇴', desc:'Kartverket — Norwegian coastal' },
  { id:'australia',  label:'Australia',  emoji:'🇦🇺', desc:'Geoscience Australia bathymetry' },
  { id:'canada',     label:'Canada',     emoji:'🇨🇦', desc:'CHS — Canadian hydrographic' },
];

const toDMS = (d, isLat) => {
  const a=Math.abs(d), deg=Math.floor(a), mf=(a-deg)*60, min=Math.floor(mf);
  const sec=((mf-min)*60).toFixed(1), dir=isLat?(d>=0?'N':'S'):(d>=0?'E':'W');
  return `${deg}°${String(min).padStart(2,'0')}'${String(sec).padStart(4,'0')}"${dir}`;
};

const normalizeRoute = (wps) => {
  if (!wps?.length) return wps;
  const out=[{...wps[0]}];
  for(let i=1;i<wps.length;i++){
    let lon=wps[i].lon; const p=out[i-1].lon;
    while(lon-p>180) lon-=360; while(lon-p<-180) lon+=360;
    out.push({...wps[i],lon});
  }
  return out;
};

export default function NavModePage({notify,sheetRoutes=[],portsDb=[],setTab}){
  // ─── REFS ───────────────────────────────────────────────────────────────
  const mapRef=useRef(null), leafRef=useRef(null);
  const baseTileRef=useRef(null), seamarkRef=useRef(null);
  const gebcoRefTile=useRef(null), emodnetTileRef=useRef(null);
  const encTileRef=useRef(null), esriBaseRef=useRef(null), gebcoWmsRef=useRef(null);
  const layersRef=useRef({route:null,vessel:null,vector:null,ais:{},routeMarkers:[],rbLine:null,rbMarker:null,xtdPort:null,xtdStbd:null,xtdFill:null,pastTrack:null});
  const chartLayersRef=useRef([]), aisWsRef=useRef(null), aisIntervalRef=useRef(null);
  const invalidateTimers=useRef([]), pastTrackRef=useRef([]);
  const rbModeRef=useRef(false), livePosRef=useRef(null), vectorMinsRef=useRef(6);
  const colorsRef=useRef(DEFAULT_COLORS), rbTargetRef=useRef(null), trackHoursRef=useRef(0);
  const autoCenterRef=useRef(true), hudDragRef=useRef(null), mapBearingRef=useRef(0);
  const depthCheckOnRef=useRef(false), contoursRef=useRef({shallow:10,safety:20,deep:200,draft:6});
  const aisRangeRef=useRef(0), aisSourceRef=useRef('internet');

  // ─── STATE ──────────────────────────────────────────────────────────────
  const ls = k => localStorage.getItem(k);
  const [mapReady,setMapReady]=useState(false);
  const [gpsOn,setGpsOn]=useState(()=>ls('nav_gpsOn')==='true');
  const [aisTargets,setAisTargets]=useState({});
  const [autoCenter,setAutoCenterRaw]=useState(()=>ls('nav_autoCenter')!=='false');
  const [mapMode,setMapMode]=useState(()=>ls('nav_mapMode')||'night');
  const [displayMode,setDisplayMode]=useState(()=>ls('nav_displayMode')||'north');
  const [depthSources,setDepthSources]=useState(()=>{try{const a=JSON.parse(ls('nav_depthSources')||'[]');return new Set(Array.isArray(a)?a:[]);}catch{return new Set();}});
  const [activeRoute,setActiveRoute]=useState(()=>{try{return JSON.parse(ls('nav_activeRoute')||'null');}catch{return null;}});
  const [livePos,setLivePos]=useState(null);
  const [selectedWpIdx,setSelectedWpIdx]=useState(0);
  const [rbMode,setRbMode]=useState(false), [rbResult,setRbResult]=useState(null);
  const [etaResult,setEtaResult]=useState(null), [activePanel,setActivePanel]=useState('route');
  const [vectorMins,setVectorMins]=useState(()=>Number(ls('nav_vectorMins')||6));
  const [colors,setColors]=useState(()=>{try{return JSON.parse(ls('nav_colors')||'null')||DEFAULT_COLORS;}catch{return DEFAULT_COLORS;}});
  const [hudCollapsed,setHudCollapsed]=useState(()=>ls('nav_hudCollapsed')==='true');
  const [togCollapsed,setTogCollapsed]=useState(()=>ls('nav_togCollapsed')==='true');
  const [panelCollapsed,setPanelCollapsed]=useState(false);
  const [hudPos,setHudPos]=useState(()=>{try{return JSON.parse(ls('nav_hudPos')||'{"x":8,"y":54}');}catch{return{x:8,y:54};}});
  const [trackHours,setTrackHours]=useState(()=>Number(ls('nav_trackHours')||0));
  const [savedRoutes,setSavedRoutes]=useState(()=>{try{return JSON.parse(ls('nav_savedRoutes')||'[]');}catch{return[];}});
  const [savedCharts,setSavedCharts]=useState(()=>{try{return JSON.parse(ls('nav_savedCharts')||'[]');}catch{return[];}});
  const [chartSearch,setChartSearch]=useState(''), [chartDbSearch,setChartDbSearch]=useState('');
  const [savedSearch,setSavedSearch]=useState(''), [dbSearch,setDbSearch]=useState('');
  const [chartOverlays,setChartOverlays]=useState([]);
  const [showMenu,setShowMenu]=useState(false), [menuCat,setMenuCat]=useState('colors');
  const [aisRange,setAisRange]=useState(()=>Number(ls('nav_aisRange')||0));
  const [shallowDepth,setShallowDepth]=useState(()=>Number(ls('nav_shallowDepth')||10));
  const [safetyDepth,setSafetyDepth]=useState(()=>Number(ls('nav_safetyDepth')||20));
  const [deepDepth,setDeepDepth]=useState(()=>Number(ls('nav_deepDepth')||200));
  const [shipDraft,setShipDraft]=useState(()=>Number(ls('nav_draft')||6));
  const [depthCheckOn,setDepthCheckOn]=useState(false);
  const [xtdNM,setXtdNM]=useState(()=>Number(ls('nav_xtdNM')||1.0));
  const [aisSource,setAisSource]=useState(()=>ls('nav_aisSource')||'internet');
  const [aisStatus,setAisStatus]=useState('off');
  const [localAisStatus,setLocalAisStatus]=useState('off');
  const [localAisCount,setLocalAisCount]=useState(0);
  const [localAisHost,setLocalAisHost]=useState(()=>ls('nav_localAisHost')||'ws://localhost:4002');
  const [localAisAlert,setLocalAisAlert]=useState(null);

  // ─── HELPERS ────────────────────────────────────────────────────────────
  const safeInvalidate=useCallback(()=>{
    invalidateTimers.current.forEach(clearTimeout); invalidateTimers.current=[];
    const f=()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}};
    f(); invalidateTimers.current=[100,300,600,1000,1800].map(t=>setTimeout(f,t));
  },[]);

  const distNM=(a,b,c,d)=>{const R=3440.065,r=Math.PI/180,x=Math.sin(((d-b)*r)/2)**2+Math.cos(b*r)*Math.cos(d*r)*Math.sin(((c-a)*r)/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  const brg=(a,b,c,d)=>{const r=Math.PI/180,dl=(d-b)*r,y=Math.sin(dl)*Math.cos(d*r),x=Math.cos(a*r)*Math.sin(d*r)-Math.sin(a*r)*Math.cos(d*r)*Math.cos(dl);return((Math.atan2(y,x)/r)+360)%360;};
  const calcCPA=(o,t)=>{const dx=t.lon-o.lon,dy=t.lat-o.lat,h=((dx*t.cog-dy*o.cog)||0)/1000;return{cpa:distNM(o.lat,o.lon,t.lat,t.lon),tcpa:Math.max(h,0)};};
  const colreg=(o,t)=>{const b=(Math.atan2(t.lon-o.lon,t.lat-o.lat)*180/Math.PI+360)%360,r=(b-o.cog+360)%360;if(r>345||r<15) return "HEAD-ON";if(r>112.5&&r<247.5) return "OVERTAKING";if(r>15&&r<112.5) return "CROSSING-STBD";return "CROSSING-PORT";};
  const offsetPt=(lat,lon,bd,dn)=>{const R=3440.065,d=dn/R,b=bd*Math.PI/180,p1=lat*Math.PI/180,l1=lon*Math.PI/180,p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(b)),l2=l1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));return[p2*180/Math.PI,l2*180/Math.PI];};

  const renderShip=(fix)=>{
    if(!leafRef.current||!window.L) return;
    const L=window.L,c=colorsRef.current,rot=(fix.cog-mapBearingRef.current+360)%360;
    const icon=L.divIcon({html:`<div style="transform:rotate(${rot}deg);transform-origin:center;width:20px;height:28px;"><svg width="20" height="28" viewBox="0 0 20 28" fill="none"><polygon points="10,1 19,27 10,21 1,27" fill="${c.ship}" stroke="#fff" stroke-width="1.5"/></svg></div>`,className:'',iconSize:[20,28],iconAnchor:[10,14]});
    if(!layersRef.current.vessel) layersRef.current.vessel=L.marker([fix.lat,fix.lon],{icon,zIndexOffset:9999}).addTo(leafRef.current);
    else{layersRef.current.vessel.setLatLng([fix.lat,fix.lon]);layersRef.current.vessel.setIcon(icon);layersRef.current.vessel.setZIndexOffset(9999);}
    const r=Math.PI/180,nm=Math.max(fix.sog,0.3)*(vectorMinsRef.current/60);
    const vl=fix.lat+(nm/60)*Math.cos(fix.cog*r),vn=fix.lon+(nm/60)*Math.sin(fix.cog*r);
    if(layersRef.current.vector){layersRef.current.vector.setLatLngs([[fix.lat,fix.lon],[vl,vn]]);layersRef.current.vector.setStyle({color:c.vector});}
    else layersRef.current.vector=L.polyline([[fix.lat,fix.lon],[vl,vn]],{color:c.vector,weight:2,opacity:0.85,dashArray:'5 3'}).addTo(leafRef.current);
    if(autoCenterRef.current){try{const m=leafRef.current,s=m.getSize(),p=m.project([fix.lat,fix.lon],m.getZoom());m.panTo(m.unproject(p.subtract([0,s.y*0.2]),m.getZoom()),{animate:true,duration:0.3});}catch{leafRef.current.panTo([fix.lat,fix.lon]);}}
  };

  // ─── ROUTE PARSERS ──────────────────────────────────────────────────────
  const tryXml=(t,f)=>{try{const d=new DOMParser().parseFromString(t,'application/xml');if(d.querySelector('parsererror')) return null;const w=[];d.querySelectorAll('waypoint,Waypoint').forEach(e=>{const p=e.querySelector('position,Position');if(!p) return;const la=parseFloat(p.getAttribute('lat')||p.getAttribute('Lat')),lo=parseFloat(p.getAttribute('lon')||p.getAttribute('Lon'));if(!isNaN(la)&&!isNaN(lo)) w.push({lat:la,lon:lo,name:e.getAttribute('name')||e.getAttribute('Name')||''});});if(!w.length) d.querySelectorAll('rtept,wpt,trkpt').forEach(e=>{const la=parseFloat(e.getAttribute('lat')),lo=parseFloat(e.getAttribute('lon'));if(!isNaN(la)&&!isNaN(lo)) w.push({lat:la,lon:lo,name:e.querySelector('name')?.textContent?.trim()||''});});if(!w.length) return null;const n=d.querySelector('route,Route')?.getAttribute('name')||d.querySelector('gpx>metadata>name,rte>name')?.textContent?.trim()||f;return{name:n,waypoints:w};}catch{return null;}};
  const tryJson=(t,f)=>{try{const p=JSON.parse(t);if(Array.isArray(p)){const w=p.filter(x=>x.lat!=null&&x.lon!=null);if(w.length) return{name:f,waypoints:w};}const w=p.waypoints||p.Waypoints;if(w?.length) return{name:p.name||f,waypoints:w};return null;}catch{return null;}};
  const tryDelim=(t,f)=>{try{const w=[];for(const l of t.split('\n').map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'))){if(/^(lat|lon|name|wp)/i.test(l)) continue;const p=l.split(/[,\t;|]+/).map(x=>x.replace(/["']/g,'').trim());if(p.length<2) continue;let la=parseFloat(p[0]),lo=parseFloat(p[1]);if(!isNaN(la)&&!isNaN(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180) w.push({lat:la,lon:lo,name:p[2]||''});}return w.length?{name:f,waypoints:w}:null;}catch{return null;}};
  const parseRoute=(t,f)=>{const e=f.toLowerCase().split('.').pop();if(e==='rtzp') throw new Error('RTZP: unzip and load .rtz inside');if(t.trim().startsWith('<')||'rtz gpx rte rt3 rt4 rtx xml wpt'.includes(e)){const r=tryXml(t,f);if(r) return r;}const r2=tryJson(t,f);if(r2) return r2;const r3=tryXml(t,f);if(r3) return r3;const r4=tryDelim(t,f);if(r4) return r4;throw new Error('No waypoints found');};
  const loadRoute=(e)=>{const fi=e.target.files?.[0];if(!fi) return;const r=new FileReader();r.onload=ev=>{try{const rt=parseRoute(ev.target.result,fi.name);if(!rt?.waypoints?.length) throw new Error('No waypoints');setActiveRoute(rt);setSelectedWpIdx(rt.waypoints.length-1);notify(`✓ ${rt.name} (${rt.waypoints.length} WPs)`,'error');}catch(er){notify(`Load failed: ${er.message}`,'error');}};r.readAsText(fi);e.target.value='';};
  const saveRoute=()=>{if(!activeRoute) return;setSavedRoutes(prev=>{const i=prev.findIndex(r=>r.name===activeRoute.name);const u=i>=0?prev.map((r,j)=>j===i?activeRoute:r):[activeRoute,...prev].slice(0,100);localStorage.setItem('nav_savedRoutes',JSON.stringify(u));return u;});notify(`✓ Saved: ${activeRoute.name}`,'error');};
  const delRoute=(n)=>{setSavedRoutes(prev=>{const u=prev.filter(r=>r.name!==n);localStorage.setItem('nav_savedRoutes',JSON.stringify(u));return u;});};

  // ─── CHART PARSERS ──────────────────────────────────────────────────────
  const tryUserChart=(t,f)=>{try{const d=new DOMParser().parseFromString(t,'application/xml');if(d.querySelector('parsererror')||!d.querySelector('userchart')) return null;const name=d.querySelector('userchart').getAttribute('name')||f,ft=[];d.querySelectorAll('lines > line').forEach(el=>{const a=el.querySelector('attribute'),tp=el.querySelector('type'),lt=parseInt(a?.getAttribute('lineType')||'1'),cd=tp?.getAttribute('checkDanger')==='1',co=[];el.querySelectorAll('vertex').forEach(v=>{const la=parseFloat(v.getAttribute('latitude')),lo=parseFloat(v.getAttribute('longitude'));if(!isNaN(la)&&!isNaN(lo)) co.push([lo,la]);});if(co.length>=2) ft.push({type:'Feature',properties:{featureType:'line',name:el.getAttribute('name')||'',lineType:lt,checkDanger:cd},geometry:{type:'LineString',coordinates:co}});});d.querySelectorAll('labels > label').forEach(el=>{const a=el.querySelector('attribute'),tp=el.querySelector('type'),lt=a?.getAttribute('labelText')||'',cd=tp?.getAttribute('checkDanger')==='1',v=el.querySelector('vertex');if(!v) return;const la=parseFloat(v.getAttribute('latitude')),lo=parseFloat(v.getAttribute('longitude'));if(!isNaN(la)&&!isNaN(lo)) ft.push({type:'Feature',properties:{featureType:'label',labelText:lt,checkDanger:cd},geometry:{type:'Point',coordinates:[lo,la]}});});d.querySelectorAll('polygons > polygon, areas > area').forEach(el=>{const tp=el.querySelector('type'),cd=tp?.getAttribute('checkDanger')==='1',co=[];el.querySelectorAll('vertex').forEach(v=>{const la=parseFloat(v.getAttribute('latitude')),lo=parseFloat(v.getAttribute('longitude'));if(!isNaN(la)&&!isNaN(lo)) co.push([lo,la]);});if(co.length>=3){if(co[0][0]!==co[co.length-1][0]) co.push(co[0]);ft.push({type:'Feature',properties:{featureType:'polygon',name:el.getAttribute('name')||'',checkDanger:cd},geometry:{type:'Polygon',coordinates:[co]}});}});if(!ft.length) return null;const lines=ft.filter(x=>x.properties.featureType==='line').length,labels=ft.filter(x=>x.properties.featureType==='label').length;return{name,summary:`${lines} lines · ${labels} labels`,data:{type:'FeatureCollection',features:ft}};}catch{return null;}};
  const tryGeoJSON=(t,f)=>{try{const d=JSON.parse(t);if(['FeatureCollection','Feature','Point','LineString','Polygon'].includes(d.type)) return{name:f,data:d};return null;}catch{return null;}};
  const tryKML=(t,f)=>{try{const d=new DOMParser().parseFromString(t,'application/xml');if(d.querySelector('parsererror')) return null;const ft=[],pc=s=>s.trim().split(/\s+/).map(p=>{const[lo,la]=p.split(',').map(Number);return(!isNaN(la)&&!isNaN(lo))?[lo,la]:null;}).filter(Boolean);d.querySelectorAll('Placemark').forEach(pm=>{const n=pm.querySelector('name')?.textContent?.trim()||'';const pt=pm.querySelector('Point coordinates');if(pt) pc(pt.textContent).forEach(([lo,la])=>ft.push({type:'Feature',properties:{name:n,featureType:'point'},geometry:{type:'Point',coordinates:[lo,la]}}));const ls=pm.querySelector('LineString coordinates');if(ls){const c=pc(ls.textContent);if(c.length) ft.push({type:'Feature',properties:{name:n,featureType:'line'},geometry:{type:'LineString',coordinates:c}});}});if(!ft.length) return null;return{name:f,data:{type:'FeatureCollection',features:ft}};}catch{return null;}};
  const loadChart=(e)=>{const fi=e.target.files?.[0];if(!fi) return;const r=new FileReader();r.onload=ev=>{try{const t=ev.target.result;const ov=tryUserChart(t,fi.name)||tryGeoJSON(t,fi.name)||tryKML(t,fi.name);if(!ov) throw new Error('Unsupported format. Supported: ECDIS XML, GeoJSON, KML');if(leafRef.current&&window.L){const L=window.L,m=leafRef.current;if(!m.getPane('chartPane')){const cp=m.createPane('chartPane');cp.style.zIndex='450';cp.style.pointerEvents='none';}const layer=L.geoJSON(ov.data,{pane:'chartPane',style:ft=>{const p=ft.properties,dg=p.checkDanger,da=p.lineType===2?'8 5':p.lineType===3?'3 5':null;const cc=colorsRef.current.chart||'#FF2020';return{color:dg?'#FF2020':cc,weight:3,opacity:1,dashArray:da,fillColor:dg?'#FF2020':cc,fillOpacity:0.12};},pointToLayer:(ft,ll)=>{const p=ft.properties;if(p.featureType==='label') return L.marker(ll,{icon:L.divIcon({html:`<div style="background:rgba(0,0,80,0.75);color:${p.checkDanger?'#FF6060':'#FFF'};font-size:11px;font-weight:700;white-space:nowrap;font-family:monospace;padding:1px 4px;border-radius:3px;pointer-events:none;line-height:1.3;">${p.labelText||''}</div>`,className:'',iconAnchor:[0,8]}),interactive:false,zIndexOffset:300});const cc=colorsRef.current.chart||'#FF2020';return L.circleMarker(ll,{radius:6,color:cc,fillOpacity:0.85,weight:2}).bindPopup(`<b>${p.name||''}</b>`);},onEachFeature:(ft,l)=>{if(ft.properties.name&&ft.properties.featureType!=='label') l.bindPopup(`<b>${ft.properties.name}</b><br/>${ft.properties.checkDanger?'Danger':'Feature'}`);}}).addTo(m);layer.bringToFront();chartLayersRef.current.push({id:ov.name,layer});try{const b=layer.getBounds();if(b.isValid()) m.fitBounds(b,{padding:[40,40]});}catch{}}setChartOverlays(prev=>[...prev,{name:ov.name,summary:ov.summary||''}]);notify(`✓ ${ov.name}${ov.summary?' ('+ov.summary+')':''}`,'error');}catch(er){notify(`Chart failed: ${er.message}`,'error');}};r.readAsText(fi);e.target.value='';};
  const removeChart=(n)=>{const i=chartLayersRef.current.findIndex(c=>c.id===n);if(i>=0){try{leafRef.current?.removeLayer(chartLayersRef.current[i].layer);}catch{}chartLayersRef.current.splice(i,1);}setChartOverlays(prev=>prev.filter(c=>c.name!==n));};
  const saveChart=(ov)=>{if(!ov) return;setSavedCharts(prev=>{const i=prev.findIndex(c=>c.name===ov.name);const u=i>=0?prev.map((c,j)=>j===i?ov:c):[ov,...prev].slice(0,50);localStorage.setItem('nav_savedCharts',JSON.stringify(u));return u;});notify(`✓ Chart saved: ${ov.name}`,'error');};
  const delSavedChart=(n)=>{setSavedCharts(prev=>{const u=prev.filter(c=>c.name!==n);localStorage.setItem('nav_savedCharts',JSON.stringify(u));return u;});};
  const loadSavedChart=(saved)=>{if(!saved?.data||!leafRef.current||!window.L) return;const L=window.L,m=leafRef.current;if(!m.getPane('chartPane')){const cp=m.createPane('chartPane');cp.style.zIndex='450';cp.style.pointerEvents='none';}const cc=colorsRef.current.chart||'#FF2020';const layer=L.geoJSON(saved.data,{pane:'chartPane',style:ft=>{const p=ft.properties,dg=p.checkDanger,da=p.lineType===2?'8 5':p.lineType===3?'3 5':null;return{color:dg?'#FF2020':cc,weight:3,opacity:1,dashArray:da,fillColor:dg?'#FF2020':cc,fillOpacity:0.12};},pointToLayer:(ft,ll)=>{const p=ft.properties;if(p.featureType==='label') return L.marker(ll,{icon:L.divIcon({html:`<div style="background:rgba(0,0,80,0.75);color:${p.checkDanger?'#FF6060':'#FFF'};font-size:11px;font-weight:700;white-space:nowrap;font-family:monospace;padding:1px 4px;border-radius:3px;pointer-events:none;line-height:1.3;">${p.labelText||''}</div>`,className:'',iconAnchor:[0,8]}),interactive:false,zIndexOffset:300});return L.circleMarker(ll,{radius:6,color:cc,fillOpacity:0.85,weight:2}).bindPopup(`<b>${p.name||''}</b>`);},onEachFeature:(ft,l)=>{if(ft.properties.name&&ft.properties.featureType!=='label') l.bindPopup(`<b>${ft.properties.name}</b><br/>${ft.properties.checkDanger?'Danger':'Feature'}`);}}).addTo(m);layer.bringToFront();chartLayersRef.current.push({id:saved.name,layer});try{const b=layer.getBounds();if(b.isValid()) m.fitBounds(b,{padding:[40,40]});}catch{}setChartOverlays(prev=>{if(prev.find(c=>c.name===saved.name)) return prev;return[...prev,{name:saved.name,summary:saved.summary||''}];});notify(`✓ ${saved.name}`,'error');};

  // ─── AIS SOURCE EFFECT ──────────────────────────────────────────────────
  useEffect(()=>{
    aisSourceRef.current=aisSource;
    aisService.stop(); aisWsRef.current?.close(); aisWsRef.current=null;
    clearInterval(aisIntervalRef.current); aisIntervalRef.current=null;
    setAisStatus('off'); setLocalAisStatus('off'); setLocalAisCount(0);
    if(aisSource==='off'){setAisTargets({});return;}

    if(aisSource==='safepilot'||aisSource==='bridge'){
      const hosts=aisSource==='bridge'?[localAisHost,...AIS_SOURCES.bridge.hosts]:AIS_SOURCES.safepilot.hosts;
      aisService.start(hosts);
      if(livePosRef.current) aisService.setOwnShip(livePosRef.current);
      const off1=aisService.on('status',({status,targets})=>{setLocalAisStatus(status||'connected');setLocalAisCount(typeof targets==='number'?targets:(targets?.size||0));});
      const off2=aisService.on('alert',al=>{setLocalAisAlert(al);notify(`⚠ COLLISION: ${al?.name||al?.mmsi} CPA ${al?.cpa}NM`,'error');setTimeout(()=>setLocalAisAlert(null),30000);});
      const off3=aisService.on('update',({target,targets})=>{if(!target?.lat||!target?.lon) return;setAisTargets(prev=>({...prev,[target.mmsi]:{mmsi:target.mmsi,lat:target.lat,lon:target.lon,cog:target.cog||0,sog:target.sog||0,name:target.name||'',cpa:target.cpa,tcpa:target.tcpa,ts:Date.now()}}));setLocalAisCount(targets?.size||0);});
      return()=>{try{off1();off2();off3();}catch{}aisService.stop();};
    }

    if(aisSource==='internet'){
      let retry=null;
      const fetchAPI=async()=>{
        const pos=livePosRef.current,range=aisRangeRef.current||50,la=pos?.lat||0,ln=pos?.lon||0;
        for(const url of[`https://api.vesselapi.com/v1/vessel/list?lat=${la}&lng=${ln}&radius=${range}`,`https://api.vesselapi.com/v1/vessels?lat=${la}&lng=${ln}&radius=${range}`]){
          try{const r=await fetch(url,{headers:{'Authorization':VESSEL_API_KEY,'x-api-key':VESSEL_API_KEY}});if(!r.ok) continue;const data=await r.json();const v=data?.vessels||data?.data||data?.results||(Array.isArray(data)?data:[]);if(Array.isArray(v)&&v.length>0){setAisStatus('connected');const t={};v.forEach(x=>{const m=x.mmsi||x.MMSI;const la=parseFloat(x.lat||x.latitude||0),ln=parseFloat(x.lon||x.lng||x.longitude||0);if(m&&la&&ln) t[m]={mmsi:m,lat:la,lon:ln,cog:parseFloat(x.cog||0),sog:parseFloat(x.sog||x.speed||0),name:(x.name||x.shipName||'').trim(),ts:Date.now()};});setAisTargets(t);return;}}catch{}}
        setAisStatus('connecting');
        if(aisWsRef.current?.readyState===WebSocket.OPEN) return;
        const ws=new WebSocket("wss://stream.aisstream.io/v0/stream");
        aisWsRef.current=ws;
        ws.onopen=()=>{setAisStatus('connected');ws.send(JSON.stringify({APIKey:AISSTREAM_KEY,BoundingBoxes:[[[-90,-180],[90,180]]],FilterMessageTypes:["PositionReport"]}));};
        ws.onmessage=msg=>{try{const d=JSON.parse(msg.data);const p=d?.Message?.PositionReport,m=d?.MetaData;if(!p||!m||p.Latitude===0) return;setAisTargets(prev=>({...prev,[m.MMSI]:{mmsi:m.MMSI,name:(m.ShipName||'').trim(),lat:p.Latitude,lon:p.Longitude,cog:p.CourseOverGround||0,sog:p.SpeedOverGround||0,ts:Date.now()}}));}catch{}};
        ws.onerror=()=>setAisStatus('error');
        ws.onclose=ev=>{if(ev.code!==1000){setAisStatus('connecting');retry=setTimeout(()=>{if(aisSourceRef.current==='internet') fetchAPI();},5000);}};
      };
      setAisStatus('connecting'); fetchAPI();
      aisIntervalRef.current=setInterval(fetchAPI,30000);
      return()=>{clearTimeout(retry);clearInterval(aisIntervalRef.current);aisWsRef.current?.close();};
    }
  },[aisSource,localAisHost]);

  // SafePilot own position from $GPRMC
  useEffect(()=>{
    if(aisSource!=='safepilot'&&aisSource!=='bridge') return;
    const off=aisService.on('ownPos',pos=>{if(!pos?.lat) return;const fix={lat:pos.lat,lon:pos.lon,sog:pos.sog||0,cog:pos.cog||0,heading:pos.hdg||pos.cog||0,acc:5,fromSafePilot:true};setLivePos(fix);livePosRef.current=fix;aisService.setOwnShip(fix);renderShip(fix);const now=Date.now();pastTrackRef.current.push({lat:fix.lat,lon:fix.lon,t:now});pastTrackRef.current=pastTrackRef.current.filter(p=>p.t>now-86400000);});
    return()=>{try{off();}catch{}};
  },[aisSource]);

  useEffect(()=>{if(livePos&&(aisSource==='safepilot'||aisSource==='bridge')) aisService.setOwnShip(livePos);},[livePos,aisSource]);

  // GPS
  useEffect(()=>{
    if(!gpsOn) return;
    if(!navigator.geolocation){notify("GPS not supported","error");return;}
    const id=navigator.geolocation.watchPosition(pos=>{
      try{
        if((aisSourceRef.current==='safepilot'||aisSourceRef.current==='bridge')&&livePosRef.current?.fromSafePilot) return;
        const la=pos.coords.latitude,ln=pos.coords.longitude;
        const sog=(pos.coords.speed||0)*1.94384,cog=pos.coords.heading||0,acc=pos.coords.accuracy||0;
        const fix={lat:la,lon:ln,sog,cog,heading:cog,acc};
        setLivePos(fix);livePosRef.current=fix;
        const now=Date.now();pastTrackRef.current.push({lat:la,lon:ln,t:now});pastTrackRef.current=pastTrackRef.current.filter(p=>p.t>now-86400000);
        renderShip(fix);
        if(trackHoursRef.current>0&&window.L){const cut=now-trackHoursRef.current*3600000,pts=pastTrackRef.current.filter(p=>p.t>cut).map(p=>[p.lat,p.lon]);if(pts.length>1){const L=window.L,c=colorsRef.current;if(layersRef.current.pastTrack){layersRef.current.pastTrack.setLatLngs(pts);layersRef.current.pastTrack.setStyle({color:c.track});}else layersRef.current.pastTrack=L.polyline(pts,{color:c.track,weight:2,opacity:0.7}).addTo(leafRef.current);}}
        else if(layersRef.current.pastTrack){leafRef.current?.removeLayer(layersRef.current.pastTrack);layersRef.current.pastTrack=null;}
        if(rbModeRef.current&&rbTargetRef.current){const t=rbTargetRef.current;setRbResult({rangeNM:distNM(la,ln,t.lat,t.lon).toFixed(2),bearing:brg(la,ln,t.lat,t.lon).toFixed(1),lat:t.lat.toFixed(5),lon:t.lon.toFixed(5)});if(layersRef.current.rbLine) layersRef.current.rbLine.setLatLngs([[la,ln],[t.lat,t.lon]]);}
      }catch(e){console.warn('[GPS]',e);}
    },()=>notify("GPS error","error"),{enableHighAccuracy:true,maximumAge:0,timeout:30000});
    return()=>navigator.geolocation.clearWatch(id);
  },[gpsOn]);

  // AIS render
  useEffect(()=>{
    if(!leafRef.current||!window.L) return;
    const L=window.L;
    Object.values(layersRef.current.ais).forEach(m=>{try{leafRef.current.removeLayer(m);}catch{}});
    layersRef.current.ais={};
    const rng=aisRangeRef.current,pos=livePosRef.current;
    Object.values(aisTargets).forEach(v=>{
      if(!v.lat||!v.lon) return;
      if(rng>0&&pos&&distNM(pos.lat,pos.lon,v.lat,v.lon)>rng) return;
      const own=layersRef.current.vessel?.getLatLng();
      const cp=own&&pos?calcCPA({lat:own.lat,lon:own.lng,cog:pos.cog,sog:pos.sog},v):null;
      const col=cp?.cpa<1?'#FF3030':cp?.cpa<3?'#FF9500':'#00D4FF';
      const rng2=own&&pos?distNM(pos.lat,pos.lon,v.lat,v.lon).toFixed(1):'-';
      const cl=own&&pos?colreg({lat:own.lat,lon:own.lng,cog:pos.cog},v):'N/A';
      const mk=L.circleMarker([v.lat,v.lon],{radius:7,color:col,fillColor:col,fillOpacity:0.7,weight:2})
        .bindPopup(`<div style="font-size:13px;min-width:180px;line-height:1.7"><b style="color:${col}">${v.name||'AIS Vessel'}</b><br/><small>MMSI: ${v.mmsi}</small><br/>SOG: ${v.sog?.toFixed(1)}kn COG: ${v.cog?.toFixed(0)}°<br/>Range: ${rng2}NM<br/>CPA: ${cp?.cpa?.toFixed(2)||'-'}NM TCPA: ${cp?.tcpa?.toFixed(1)||'-'}h<br/>COLREG: ${cl}${cp?.cpa<1.5?'<br/><b style="color:#FF3030">⚠ COLLISION RISK</b>':''}</div>`)
        .addTo(leafRef.current);
      layersRef.current.ais[v.mmsi]=mk;
      if(cp?.cpa<1.5) notify(`⚠ CPA: MMSI ${v.mmsi} ${cp.cpa.toFixed(1)}NM`,'error');
    });
  },[aisTargets,livePos]);

  // ─── MULTI-SELECT DEPTH TILE SWAP ──────────────────────────────────────────
  // Multiple sources can be active simultaneously — each loads only its layers
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L,m=leafRef.current;
    [baseTileRef,esriBaseRef,emodnetTileRef,gebcoWmsRef,gebcoRefTile,encTileRef,seamarkRef].forEach(r=>{if(r.current){try{m.removeLayer(r.current);}catch{}r.current=null;}});
    const TILES={night:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',day:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',dusk:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'};
    baseTileRef.current=L.tileLayer(TILES[mapMode]||TILES.night,{subdomains:'abcd',maxZoom:20,zIndex:1,attribution:'© CARTO'}).addTo(m);
    const ds=depthSources;
    const hasAny=ds.size>0;
    if(ds.has('usa')){
      esriBaseRef.current=L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:13,opacity:0.7,zIndex:2,attribution:'© Esri'}).addTo(m);
      try{encTileRef.current=L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer',{layers:'0,1,2,3,4,5,6,7',format:'image/png',transparent:true,version:'1.3.0',opacity:0.9,zIndex:6,attribution:'© NOAA'}).addTo(m);}catch(e){console.warn('[ENC]',e);}
    }
    if(ds.has('europe')){
      try{emodnetTileRef.current=L.tileLayer.wms('https://ows.emodnet-bathymetry.eu/wms',{layers:'emodnet:mean_atlas_land,emodnet:mean_rainbowcolour',format:'image/png',transparent:true,version:'1.3.0',opacity:0.6,zIndex:3,attribution:'© EMODnet'}).addTo(m);}catch(e){console.warn('[EMODnet]',e);}
    }
    if(ds.has('global')){
      try{gebcoWmsRef.current=L.tileLayer.wms('https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv',{layers:'GEBCO_LATEST_2',format:'image/png',transparent:true,version:'1.3.0',opacity:0.45,zIndex:4,attribution:'© GEBCO'}).addTo(m);}catch(e){console.warn('[GEBCO]',e);}
    }
    if(ds.has('soundings')){
      gebcoRefTile.current=L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,opacity:1.0,zIndex:5,attribution:'© Esri'}).addTo(m);
    }
    if(ds.has('nz')){
      try{L.tileLayer.wms('https://data.linz.govt.nz/services;key=insert-linz-key/wms',{layers:'layer-50448',format:'image/png',transparent:true,version:'1.1.1',opacity:0.7,zIndex:7,attribution:'© LINZ'}).addTo(m);}catch(e){console.warn('[LINZ]',e);}
    }
    if(ds.has('norway')){
      try{L.tileLayer.wms('https://wms.geonorge.no/skwms1/wms.havbunn_grunnkart',{layers:'havbunn_grunnkart',format:'image/png',transparent:true,version:'1.3.0',opacity:0.65,zIndex:7,attribution:'© Kartverket'}).addTo(m);}catch(e){console.warn('[Kartverket]',e);}
    }
    if(ds.has('australia')){
      try{L.tileLayer.wms('https://services.ga.gov.au/gis/bathymetry/wms',{layers:'Australian_Bathymetry_and_Topography_Grid_2023',format:'image/png',transparent:true,version:'1.3.0',opacity:0.6,zIndex:7,attribution:'© Geoscience Australia'}).addTo(m);}catch(e){console.warn('[GA]',e);}
    }
    if(ds.has('canada')){
      try{L.tileLayer.wms('https://datacube.services.geo.ca/ows/bathymetry',{layers:'bathymetry',format:'image/png',transparent:true,version:'1.3.0',opacity:0.65,zIndex:7,attribution:'© CHS/NRCan'}).addTo(m);}catch(e){console.warn('[CHS]',e);}
    }
    seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:hasAny?0.9:0.55,maxZoom:18,zIndex:10,attribution:'© OpenSeaMap'}).addTo(m);
  },[depthSources,mapMode,mapReady]);

  // Ref syncs
  useEffect(()=>{rbModeRef.current=rbMode;},[rbMode]);
  useEffect(()=>{vectorMinsRef.current=vectorMins;},[vectorMins]);
  useEffect(()=>{colorsRef.current=colors;},[colors]);
  useEffect(()=>{trackHoursRef.current=trackHours;},[trackHours]);
  useEffect(()=>{autoCenterRef.current=autoCenter;},[autoCenter]);
  useEffect(()=>{aisRangeRef.current=aisRange;},[aisRange]);
  useEffect(()=>{depthCheckOnRef.current=depthCheckOn;},[depthCheckOn]);
  useEffect(()=>{contoursRef.current={shallow:shallowDepth,safety:safetyDepth,deep:deepDepth,draft:shipDraft};},[shallowDepth,safetyDepth,deepDepth,shipDraft]);
  useEffect(()=>{aisSourceRef.current=aisSource;},[aisSource]);

  // Persist
  useEffect(()=>{localStorage.setItem('nav_mapMode',mapMode);},[mapMode]);
  useEffect(()=>{localStorage.setItem('nav_displayMode',displayMode);},[displayMode]);
  useEffect(()=>{localStorage.setItem('nav_gpsOn',gpsOn);},[gpsOn]);
  useEffect(()=>{localStorage.setItem('nav_depthSources',JSON.stringify([...depthSources]));},[depthSources]);
  useEffect(()=>{localStorage.setItem('nav_autoCenter',autoCenter);},[autoCenter]);
  useEffect(()=>{localStorage.setItem('nav_vectorMins',vectorMins);},[vectorMins]);
  useEffect(()=>{localStorage.setItem('nav_trackHours',trackHours);},[trackHours]);
  useEffect(()=>{localStorage.setItem('nav_hudCollapsed',hudCollapsed);},[hudCollapsed]);
  useEffect(()=>{localStorage.setItem('nav_togCollapsed',togCollapsed);},[togCollapsed]);
  useEffect(()=>{localStorage.setItem('nav_hudPos',JSON.stringify(hudPos));},[hudPos]);
  useEffect(()=>{localStorage.setItem('nav_colors',JSON.stringify(colors));},[colors]);
  useEffect(()=>{localStorage.setItem('nav_aisRange',aisRange);},[aisRange]);
  useEffect(()=>{localStorage.setItem('nav_shallowDepth',shallowDepth);},[shallowDepth]);
  useEffect(()=>{localStorage.setItem('nav_safetyDepth',safetyDepth);},[safetyDepth]);
  useEffect(()=>{localStorage.setItem('nav_deepDepth',deepDepth);},[deepDepth]);
  useEffect(()=>{localStorage.setItem('nav_draft',shipDraft);},[shipDraft]);
  useEffect(()=>{localStorage.setItem('nav_xtdNM',xtdNM);},[xtdNM]);
  useEffect(()=>{localStorage.setItem('nav_aisSource',aisSource);},[aisSource]);
  useEffect(()=>{localStorage.setItem('nav_localAisHost',localAisHost);},[localAisHost]);
  useEffect(()=>{if(activeRoute) localStorage.setItem('nav_activeRoute',JSON.stringify(activeRoute));else localStorage.removeItem('nav_activeRoute');},[activeRoute]);

  // Route render
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L,m=leafRef.current,lrs=layersRef.current;
    if(lrs.route){m.removeLayer(lrs.route);lrs.route=null;}
    lrs.routeMarkers?.forEach(x=>{try{m.removeLayer(x);}catch{}});lrs.routeMarkers=[];
    [lrs.xtdPort,lrs.xtdStbd,lrs.xtdFill].forEach(l=>{if(l) try{m.removeLayer(l);}catch{}});
    lrs.xtdPort=lrs.xtdStbd=lrs.xtdFill=null;
    if(!activeRoute?.waypoints?.length) return;
    const wps=normalizeRoute(activeRoute.waypoints),c=colors;
    lrs.route=L.polyline(wps.map(w=>[w.lat,w.lon]),{color:c.route,weight:2.5,opacity:0.9,dashArray:'8 4',noClip:true}).addTo(m);
    wps.forEach((wp,i)=>{
      const first=i===0,last=i===wps.length-1,col=first?'#00C896':last?'#FF4757':c.route,sz=first||last?14:8;
      const di=L.divIcon({html:`<div style="background:${col};border:2.5px solid #fff;border-radius:50%;width:${sz}px;height:${sz}px;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      const lbl=`WP${String(i+1).padStart(2,'0')}${wp.name?' '+wp.name:''}`;
      const li=L.divIcon({html:`<div style="color:#fff;font-size:10px;font-weight:700;font-family:monospace;white-space:nowrap;text-shadow:1px 1px 2px #000,-1px -1px 2px #000;pointer-events:none;">${lbl}</div>`,className:'',iconSize:[0,0],iconAnchor:[-4,-sz/2-2]});
      const mk=L.marker([wp.lat,wp.lon],{icon:di}).bindPopup(`<div style="font-size:13px;min-width:150px"><b style="color:${col}">${lbl}</b><br/>${toDMS(wp.lat,true)}<br/>${toDMS(wp.lon,false)}${i>0?`<hr style="margin:4px 0"/>Leg ${i}: ${brg(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon).toFixed(1)}°T · ${distNM(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon).toFixed(1)} NM`:''}</div>`).addTo(m);
      const ll=L.marker([wp.lat,wp.lon],{icon:li,interactive:false,zIndexOffset:200}).addTo(m);
      lrs.routeMarkers.push(mk,ll);
    });
    for(let i=0;i<wps.length-1;i++){
      const mid=[(wps[i].lat+wps[i+1].lat)/2,(wps[i].lon+wps[i+1].lon)/2];
      const bd=brg(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon),dn=distNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
      const li=L.divIcon({html:`<div style="background:rgba(0,0,0,0.65);color:#FFD700;font-size:10px;font-weight:600;font-family:monospace;white-space:nowrap;padding:1px 4px;border-radius:3px;pointer-events:none;">${bd.toFixed(0)}°T · ${dn.toFixed(1)} NM</div>`,className:'',iconSize:[0,0],iconAnchor:[-4,8]});
      lrs.routeMarkers.push(L.marker(mid,{icon:li,interactive:false,zIndexOffset:100}).addTo(m));
    }
    if(wps.length>=2){const X=xtdNM,pp=[],sp=[];wps.forEach((wp,i)=>{let b;if(i===0) b=brg(wp.lat,wp.lon,wps[1].lat,wps[1].lon);else if(i===wps.length-1) b=brg(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon);else{const b1=brg(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon),b2=brg(wp.lat,wp.lon,wps[i+1].lat,wps[i+1].lon),df=((b2-b1+540)%360)-180;b=(b1+df/2+360)%360;}pp.push(offsetPt(wp.lat,wp.lon,(b-90+360)%360,X));sp.push(offsetPt(wp.lat,wp.lon,(b+90)%360,X));});lrs.xtdPort=L.polyline(pp,{color:c.xtd,weight:1.5,opacity:0.8,dashArray:'10 6'}).addTo(m);lrs.xtdStbd=L.polyline(sp,{color:c.xtd,weight:1.5,opacity:0.8,dashArray:'10 6'}).addTo(m);lrs.xtdFill=L.polygon([...pp,...[...sp].reverse()],{color:'transparent',fillColor:c.xtd,fillOpacity:0.06,weight:0}).addTo(m);}
    m.fitBounds(lrs.route.getBounds(),{padding:[60,60]});
  },[activeRoute,mapReady,colors,xtdNM]);

  // ETA — FIXED: route-following leg-by-leg distance (not direct line)
  useEffect(()=>{
    if(!livePos||!activeRoute?.waypoints?.length){setEtaResult(null);return;}
    if(livePos.sog<0.2){setEtaResult(null);return;}
    const wps=activeRoute.waypoints,ti=Math.min(Math.max(selectedWpIdx,0),wps.length-1);
    const legSum=(a,b)=>{let d=0;for(let i=a;i<b;i++) d+=distNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);return d;};
    // For each WP 0..target, compute ship->WP[i] + legSum(i,target). Minimum = correct remaining.
    let rem=Infinity;
    for(let i=0;i<=ti;i++){const d=distNM(livePos.lat,livePos.lon,wps[i].lat,wps[i].lon)+legSum(i,ti);if(d<rem) rem=d;}
    const hrs=rem/livePos.sog,h=Math.floor(hrs),mn=Math.round((hrs%1)*60);
    const arr=new Date(Date.now()+hrs*3600000),pd=n=>String(n).padStart(2,'0');
    const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][arr.getMonth()];
    setEtaResult({remainNM:rem.toFixed(1),hrs:h,mins:mn,wpName:wps[ti].name||`WP${String(ti+1).padStart(2,'0')}`,arrivalStr:`${pd(arr.getDate())} ${mo} ${arr.getFullYear()} ${pd(arr.getHours())}:${pd(arr.getMinutes())} LT`});
  },[livePos,activeRoute,selectedWpIdx]);

  // Map orientation
  useEffect(()=>{
    if(!mapReady||!mapRef.current||!leafRef.current) return;
    const b=displayMode==='north'?0:displayMode==='course'?(livePos?.cog||0):(livePos?.heading||livePos?.cog||0);
    mapBearingRef.current=b;
    if(typeof leafRef.current.setBearing==='function'){try{leafRef.current.setBearing(b);return;}catch{}}
    mapRef.current.style.transform=b!==0?`rotate(${b}deg)`:'';
    mapRef.current.style.transformOrigin='center center';
    setTimeout(()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}},100);
  },[displayMode,livePos?.cog,livePos?.heading,mapReady]);

  // Init map
  useEffect(()=>{
    if(leafRef.current) return;
    const init=()=>{
      if(!mapRef.current||!window.L) return;
      const L=window.L,opts={center:[20,70],zoom:4,worldCopyJump:true};
      if(typeof L.Map.prototype.setBearing==='function'){try{opts.rotate=true;opts.rotateControl=false;}catch{}}
      leafRef.current=L.map(mapRef.current,opts);
      baseTileRef.current=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',attribution:'© CARTO'}).addTo(leafRef.current);
      seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18,attribution:'© OpenSeaMap'}).addTo(leafRef.current);
      leafRef.current.on('click',e=>{
        if(rbModeRef.current){const pos=livePosRef.current;if(!pos){notify('Enable GPS first','error');return;}rbTargetRef.current={lat:e.latlng.lat,lon:e.latlng.lng};const rn=distNM(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng),bg=brg(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);setRbResult({rangeNM:rn.toFixed(2),bearing:bg.toFixed(1),lat:e.latlng.lat.toFixed(5),lon:e.latlng.lng.toFixed(5)});if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=L.polyline([[pos.lat,pos.lon],[e.latlng.lat,e.latlng.lng]],{color:'#FFD700',weight:1.5,dashArray:'5 4'}).addTo(leafRef.current);layersRef.current.rbMarker=L.circleMarker([e.latlng.lat,e.latlng.lng],{radius:5,color:'#FFD700',fillColor:'#FFD700',fillOpacity:1}).addTo(leafRef.current);return;}
        if(depthCheckOnRef.current){const ct=contoursRef.current;L.popup({closeOnClick:true}).setLatLng(e.latlng).setContent(`<div style="font-size:13px;padding:4px"><b style="color:#00D4FF">${toDMS(e.latlng.lat,true)}</b><br/><b style="color:#00D4FF">${toDMS(e.latlng.lng,false)}</b><hr style="margin:4px 0"/>Enable depth layer + zoom ≥9 to see soundings<br/><small>🔴&lt;${ct.shallow}m 🟡&lt;${ct.safety}m 🟢≥${ct.safety}m</small></div>`).openOn(leafRef.current);return;}
      });
      setMapReady(true);safeInvalidate();[100,300,600,1200].forEach(t=>setTimeout(()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}},t));
    };
    const load=()=>{if(!document.getElementById('lrotate')){const s=document.createElement('script');s.id='lrotate';s.src='https://cdn.jsdelivr.net/npm/leaflet-rotate@0.3.0/dist/leaflet-rotate-src.js';s.onload=init;s.onerror=init;document.head.appendChild(s);}else init();};
    if(window.L){load();return;}
    if(!document.getElementById('lcss')){const l=document.createElement('link');l.id='lcss';l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);}
    if(!document.getElementById('ljs')){const s=document.createElement('script');s.id='ljs';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=load;document.head.appendChild(s);}
    else{const r=setInterval(()=>{if(window.L){clearInterval(r);load();}},50);setTimeout(()=>clearInterval(r),5000);}
    return()=>{invalidateTimers.current.forEach(clearTimeout);if(leafRef.current){leafRef.current.remove();leafRef.current=null;}};
  },[]);

  // Derived
  const filteredSaved=savedRoutes.filter(r=>!savedSearch.trim()||(r.name||'').toLowerCase().includes(savedSearch.toLowerCase())).slice(0,100);
  const filteredDB=(sheetRoutes||[]).filter(r=>{if(!dbSearch.trim()) return true;const k=dbSearch.toLowerCase(),h=[r.name,r.Name,r['Route Name'],r.from,r.to,r.origin,r.destination].filter(Boolean).join(' ').toLowerCase();return h.includes(k);}).slice(0,50);
  const onTS=e=>{const t=e.touches[0];hudDragRef.current={dx:t.clientX-hudPos.x,dy:t.clientY-hudPos.y};};
  const onTM=e=>{if(!hudDragRef.current) return;e.stopPropagation();const t=e.touches[0];setHudPos({x:Math.max(0,Math.min(window.innerWidth-185,t.clientX-hudDragRef.current.dx)),y:Math.max(50,Math.min(window.innerHeight-200,t.clientY-hudDragRef.current.dy))});};
  const onTE=()=>{hudDragRef.current=null;};

  const S={bg:'rgba(4,12,26,0.97)',bd:'rgba(0,212,255,0.28)',tx:'#D0E8F8',dm:'#5A7A90',vd:'#243850',cy:'#00D4FF',gn:'#00FF88',gd:'#FFD700',rd:'#FF4757',sm:'0.78rem',xs:'0.68rem',lb:'0.58rem'};

  // AIS Source Selector UI
  const AisSrc=()=>{
    const src=[['safepilot','🛡 SafePilot P3','#00FF88'],['bridge','🖥 Local Bridge','#00D4FF'],['internet','🌐 Internet','#FFD700'],['off','⭕ Off','#4A6080']];
    const st=aisSource==='internet'?aisStatus:localAisStatus;
    const cn=aisSource==='internet'?Object.keys(aisTargets).length:localAisCount;
    return(
      <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:6,marginTop:4}}>
        <div style={{color:S.dm,fontSize:S.lb,letterSpacing:0.5,marginBottom:4}}>AIS SOURCE</div>
        {src.map(([id,lb,col])=>(<label key={id} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.72rem',color:aisSource===id?col:S.dm,background:aisSource===id?`${col}18`:'transparent',border:`1px solid ${aisSource===id?col+'50':'transparent'}`,borderRadius:5,padding:'3px 6px',marginBottom:2,minHeight:24}}>
          <input type="radio" name="aisSource" value={id} checked={aisSource===id} onChange={()=>setAisSource(id)} style={{accentColor:col}}/>
          <span style={{flex:1}}>{lb}</span>
          {aisSource===id&&id!=='off'&&<span style={{fontSize:'0.6rem',color:st==='connected'?'#00FF88':st.startsWith('conn')?'#FFD700':'#FF4757'}}>{st==='connected'?`✅${cn}`:st.startsWith('conn')?'⏳':'❌'}</span>}
        </label>))}
        {aisSource==='bridge'&&<input value={localAisHost} onChange={e=>setLocalAisHost(e.target.value)} placeholder="ws://localhost:4002" style={{width:'100%',boxSizing:'border-box',background:'#06101C',color:S.cy,border:'1px solid #1A3050',borderRadius:4,padding:'4px 6px',fontSize:'0.63rem',outline:'none',marginTop:3}}/>}
        {localAisAlert&&(<div style={{marginTop:4,background:'rgba(255,32,32,0.15)',border:'1px solid #FF3030',borderRadius:5,padding:'5px 7px',cursor:'pointer'}} onClick={()=>setLocalAisAlert(null)}><div style={{color:'#FF5050',fontSize:'0.72rem',fontWeight:700}}>⚠ CPA {localAisAlert?.cpa}NM — {localAisAlert?.name||localAisAlert?.mmsi}</div><div style={{color:'#3A2020',fontSize:'0.55rem'}}>Tap to dismiss</div></div>)}
      </div>
    );
  };

  // Depth Source Selector UI — multi-select toggles
  const toggleDepth=(id)=>{
    setDepthSources(prev=>{
      const next=new Set(prev);
      if(next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const DepthSrc=()=>(
    <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:6,marginTop:4}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
        <div style={{color:S.dm,fontSize:S.lb,letterSpacing:0.5}}>ENC DEPTH {depthSources.size>0&&<span style={{color:S.cy}}>({depthSources.size})</span>}</div>
        {depthSources.size>0&&<button onClick={()=>setDepthSources(new Set())} style={{background:'transparent',border:'none',color:S.rd,fontSize:'0.55rem',cursor:'pointer',padding:'0 2px'}}>⭕ Off</button>}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:2}}>
        {DEPTH_SOURCES.map(d=>{
          const on=depthSources.has(d.id);
          return(<button key={d.id} onClick={()=>toggleDepth(d.id)} title={d.desc} style={{display:'flex',alignItems:'center',gap:5,background:on?'rgba(0,212,255,0.15)':'transparent',border:`1px solid ${on?S.cy:S.vd}`,color:on?S.cy:S.dm,borderRadius:5,padding:'3px 6px',fontSize:'0.65rem',cursor:'pointer',textAlign:'left',width:'100%'}}>
            <span style={{fontSize:'0.8rem'}}>{d.emoji}</span>
            <span style={{flex:1}}>{d.label}</span>
            {on&&<span style={{color:S.cy,fontSize:'0.6rem'}}>✓</span>}
          </button>);
        })}
      </div>
      {depthSources.size>0&&<div style={{color:S.dm,fontSize:'0.54rem',marginTop:3,lineHeight:1.4}}>{[...depthSources].map(id=>DEPTH_SOURCES.find(d=>d.id===id)?.desc).filter(Boolean).join(' · ')}</div>}
    </div>
  );

  // ─── UI ─────────────────────────────────────────────────────────────────
  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'#040C1A',position:'relative',overflow:'hidden',minHeight:0}}>

      {/* HEADER */}
      <div style={{height:48,display:'flex',alignItems:'center',padding:'0 10px',background:'#020810',borderBottom:`1px solid ${S.bd}`,flexShrink:0,gap:5}}>
        <span style={{color:S.cy,fontWeight:700,fontSize:'0.82rem',letterSpacing:1,flex:1}}>⚓ NAV MODE</span>
        <div style={{display:'flex',gap:2}}>{[['north','N↑'],['course','C↑'],['head','H↑']].map(([v,l])=>(<button key={v} onClick={()=>setDisplayMode(v)} style={{background:displayMode===v?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${displayMode===v?S.cy:S.vd}`,color:displayMode===v?S.cy:S.dm,borderRadius:5,padding:'3px 7px',fontSize:'0.65rem',cursor:'pointer'}}>{l}</button>))}</div>
        <div style={{display:'flex',gap:2}}>{[['night','🌙'],['day','☀'],['dusk','🏇']].map(([v,l])=>(<button key={v} onClick={()=>setMapMode(v)} style={{background:mapMode===v?'rgba(255,215,0,0.18)':'transparent',border:`1px solid ${mapMode===v?S.gd:S.vd}`,color:mapMode===v?S.gd:S.dm,borderRadius:5,padding:'3px 6px',fontSize:'0.72rem',cursor:'pointer'}}>{l}</button>))}</div>
        <button onClick={()=>setShowMenu(v=>!v)} style={{background:showMenu?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${showMenu?S.cy:S.vd}`,color:showMenu?S.cy:S.dm,borderRadius:5,padding:'3px 9px',fontSize:'1rem',cursor:'pointer'}}>☰</button>
      </div>

      {/* MAP */}
      <div ref={mapRef} style={{flex:1,minHeight:0}}/>

      {/* HUD */}
      <div style={{position:'absolute',left:hudPos.x,top:hudPos.y,zIndex:600,background:S.bg,border:`1px solid ${gpsOn?S.bd:'rgba(42,64,85,0.4)'}`,borderRadius:10,minWidth:182,touchAction:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}>
        <div style={{display:'flex',alignItems:'center',padding:'6px 10px',gap:5,cursor:'grab',borderBottom:'1px solid rgba(0,212,255,0.12)'}}>
          <span style={{color:S.dm,fontSize:'0.7rem',flex:1}}>⠸ SHIP DATA</span>
          <button onClick={()=>setTogCollapsed(v=>!v)} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:4,padding:'1px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{togCollapsed?'▼':'▲'} CTRL</button>
          <button onClick={()=>setAutoCenterRaw(v=>!v)} style={{background:autoCenter?'rgba(0,255,136,0.15)':'transparent',border:`1px solid ${autoCenter?S.gn:S.vd}`,color:autoCenter?S.gn:S.dm,borderRadius:4,padding:'1px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{autoCenter?'CTR':'FREE'}</button>
          <button onClick={()=>setHudCollapsed(v=>!v)} style={{background:'transparent',border:'none',color:S.dm,fontSize:'0.8rem',cursor:'pointer'}}>{hudCollapsed?'▼':'▲'}</button>
        </div>
        <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:5}}>
          {!togCollapsed&&(
            <div style={{display:'flex',flexDirection:'column',gap:4,paddingBottom:6,borderBottom:'1px solid rgba(0,212,255,0.1)'}}>
              <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:S.tx,minHeight:26}}><input type="checkbox" checked={gpsOn} onChange={e=>setGpsOn(e.target.checked)}/>📍 GPS</label>
              <AisSrc/>
              <DepthSrc/>
              <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:depthCheckOn?S.cy:S.tx,minHeight:24,marginTop:2}}><input type="checkbox" checked={depthCheckOn} onChange={e=>setDepthCheckOn(e.target.checked)}/>🔍 Depth Check</label>
              <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:rbMode?S.gd:S.tx,minHeight:24,borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:4}}>
                <input type="checkbox" checked={rbMode} onChange={e=>{const on=e.target.checked;rbModeRef.current=on;setRbMode(on);if(!on){rbTargetRef.current=null;setRbResult(null);if(leafRef.current){if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=null;layersRef.current.rbMarker=null;}}}}/>
                📐 {rbMode?'Tap map → R/B':'Range & Bearing'}
              </label>
              {rbResult&&rbMode&&(<div style={{background:'rgba(0,0,0,0.4)',borderRadius:5,padding:'5px 7px',border:'1px solid rgba(255,215,0,0.3)'}}>
                <div style={{display:'flex',gap:10}}>
                  {[['RNG',rbResult.rangeNM+' NM',S.gd],['BRG',rbResult.bearing+'°T',S.gd]].map(([k,v,c])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.78rem',fontWeight:700}}>{v}</div></div>))}
                  {livePos?.sog>0.2&&<div><div style={{color:S.dm,fontSize:S.lb}}>TTG</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.78rem',fontWeight:700}}>{(()=>{const h=parseFloat(rbResult.rangeNM)/livePos.sog,hr=Math.floor(h),mn=Math.round((h-hr)*60);return hr>0?`${hr}h${mn}m`:`${mn}m`;})()}</div></div>}
                </div>
              </div>)}
              {gpsOn&&(<div><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>COG VECTOR</div><div style={{display:'flex',gap:3}}>{[6,12,20,30,60].map(n=>(<button key={n} onClick={()=>setVectorMins(n)} style={{background:vectorMins===n?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${vectorMins===n?S.cy:S.vd}`,color:vectorMins===n?S.cy:S.dm,borderRadius:4,padding:'2px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{n}m</button>))}</div></div>)}
              {activeRoute&&(<div><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>XTD</div><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{[0.1,0.25,0.5,1.0,2.0].map(n=>(<button key={n} onClick={()=>setXtdNM(n)} style={{background:xtdNM===n?'rgba(255,179,0,0.2)':'transparent',border:`1px solid ${xtdNM===n?S.gd:S.vd}`,color:xtdNM===n?S.gd:S.dm,borderRadius:4,padding:'2px 5px',fontSize:'0.58rem',cursor:'pointer'}}>{n}NM</button>))}</div></div>)}
            </div>
          )}
          {livePos?(
            <div>
              <div style={{color:S.cy,fontFamily:'monospace',fontSize:'0.75rem',lineHeight:1.8}}>{toDMS(livePos.lat,true)}<br/>{toDMS(livePos.lon,false)}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px',marginTop:4}}>{[['SOG',`${livePos.sog.toFixed(1)} kn`,S.gn],['COG',`${livePos.cog.toFixed(0)}°T`,S.gn]].map(([k,v,c])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>))}</div>
              {!hudCollapsed&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px',marginTop:3}}>{[['HDG',`${livePos.heading.toFixed(0)}°`,S.gd],['ACC',`${livePos.acc.toFixed(0)}m`,S.gd]].map(([k,v,c])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>))}</div>)}
              {!hudCollapsed&&etaResult&&(<div style={{marginTop:5,borderTop:'1px solid rgba(0,255,136,0.15)',paddingTop:4}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>{[['REMAIN',etaResult.remainNM+' NM'],['ETA',etaResult.hrs+'h '+etaResult.mins+'m']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.8rem',fontWeight:700}}>{v}</div></div>))}</div>
                <div style={{color:S.dm,fontSize:'0.58rem',marginTop:2}}>→ {etaResult.wpName}</div>
                {etaResult.arrivalStr&&<div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.62rem',marginTop:2}}>🕐 {etaResult.arrivalStr}</div>}
              </div>)}
            </div>
          ):(gpsOn?<div style={{color:S.dm,fontSize:S.sm,fontStyle:'italic'}}>Acquiring GPS…</div>:<div style={{color:S.vd,fontSize:S.xs}}>Enable GPS to track vessel</div>)}
        </div>
      </div>

      {/* SIDE PANEL */}
      {panelCollapsed?(
        <button onClick={()=>setPanelCollapsed(false)} style={{position:'absolute',top:'50%',right:0,transform:'translateY(-50%)',background:'rgba(4,12,26,0.95)',border:`1px solid ${S.bd}`,color:S.cy,borderRadius:'8px 0 0 8px',padding:'12px 6px',fontSize:'0.7rem',cursor:'pointer',zIndex:500,writingMode:'vertical-rl'}}>◀ PANEL</button>
      ):(
        <div style={{position:'absolute',top:56,right:8,background:S.bg,border:`1px solid ${S.bd}`,borderRadius:10,padding:'8px 10px',zIndex:500,width:172,backdropFilter:'blur(10px)',maxHeight:'82vh',overflowY:'auto',boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:8,gap:4}}>
            {[['route','ROUTE'],['rb','R/B'],['charts','CHARTS'],['eta','ETA']].map(([p,l])=>(<button key={p} onClick={()=>setActivePanel(p)} style={{flex:1,background:activePanel===p?'rgba(0,212,255,0.18)':'transparent',border:`1px solid ${activePanel===p?S.cy:S.vd}`,color:activePanel===p?S.cy:S.dm,borderRadius:5,padding:'3px 2px',fontSize:'0.62rem',cursor:'pointer'}}>{l}</button>))}
            <button onClick={()=>setPanelCollapsed(true)} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:5,padding:'3px 5px',fontSize:'0.65rem',cursor:'pointer'}}>▶</button>
          </div>

          {activePanel==='route'&&(
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <label style={{background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:6,padding:'7px 10px',fontSize:S.sm,cursor:'pointer',display:'block',textAlign:'center'}}>📂 Load Route File<input type="file" style={{display:'none'}} onChange={loadRoute}/></label>
              <div style={{color:S.vd,fontSize:'0.55rem'}}>RTZ·GPX·RTE·CSV·JSON…</div>
              {activeRoute?.waypoints?.length>0&&(<div style={{borderTop:'1px solid rgba(0,212,255,0.15)',paddingTop:6}}>
                <div style={{color:S.cy,fontSize:S.sm,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{activeRoute.name}</div>
                <div style={{color:S.dm,fontSize:S.xs,marginBottom:4}}>{activeRoute.waypoints.length} WPs · XTD ±{xtdNM}NM</div>
                <button onClick={saveRoute} style={{width:'100%',background:'transparent',border:'1px solid rgba(0,212,255,0.4)',color:S.cy,borderRadius:5,padding:'5px',fontSize:S.xs,cursor:'pointer',marginBottom:4}}>💾 Save to My Routes</button>
                <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>ETA TO WAYPOINT</div>
                <select value={selectedWpIdx} onChange={e=>setSelectedWpIdx(Number(e.target.value))} style={{width:'100%',background:'#060F1C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px',fontSize:S.xs,marginBottom:4}}>
                  {activeRoute.waypoints.map((w,i)=><option key={i} value={i}>WP{String(i+1).padStart(2,'0')}{w.name?' '+w.name:''}</option>)}
                </select>
                {etaResult&&(<div style={{background:'#020810',borderRadius:5,padding:'6px 8px',border:'1px solid rgba(0,255,136,0.18)',marginBottom:4}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>{[['REMAIN',etaResult.remainNM+' NM'],['ETA',etaResult.hrs+'h '+etaResult.mins+'m']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:'0.5rem'}}>{k}</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>))}</div>
                  {etaResult.arrivalStr&&<div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.62rem',marginTop:3}}>🕐 {etaResult.arrivalStr}</div>}
                  <div style={{color:S.dm,fontSize:'0.52rem',marginTop:2}}>→ {etaResult.wpName}</div>
                </div>)}
                <button onClick={()=>{setActiveRoute(null);setEtaResult(null);setSelectedWpIdx(0);}} style={{width:'100%',background:'transparent',border:'1px solid rgba(255,71,87,0.45)',color:S.rd,borderRadius:5,padding:'5px',fontSize:S.xs,cursor:'pointer'}}>✕ Clear Route</button>
              </div>)}
              <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
                <div style={{color:S.dm,fontSize:S.lb,letterSpacing:0.5,marginBottom:3}}>MY ROUTES ({savedRoutes.length}/100)</div>
                <input placeholder="Search saved…" value={savedSearch} onChange={e=>setSavedSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.tx,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.xs,outline:'none',marginBottom:3}}/>
                <div style={{maxHeight:100,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
                  {filteredSaved.map((r,i)=>(<div key={i} style={{display:'flex',gap:3}}><button onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);}} style={{flex:1,background:'#060F1C',border:`1px solid ${activeRoute?.name===r.name?S.cy:S.vd}`,color:activeRoute?.name===r.name?S.cy:S.tx,borderRadius:5,padding:'4px 6px',fontSize:S.xs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name||'—'}</button><button onClick={()=>delRoute(r.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.rd,borderRadius:4,padding:'3px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button></div>))}
                  {filteredSaved.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>No saved routes</div>}
                </div>
              </div>
              {sheetRoutes.length>0&&(<div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
                <div style={{color:S.dm,fontSize:S.lb,letterSpacing:0.5,marginBottom:3}}>DATABASE ({sheetRoutes.length})</div>
                <input placeholder="Search by name, port…" value={dbSearch} onChange={e=>setDbSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.tx,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.xs,outline:'none',marginBottom:3}}/>
                <div style={{maxHeight:100,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
                  {filteredDB.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>{dbSearch?`No match for "${dbSearch}"`:''}</div>}
                  {filteredDB.map((r,i)=>(<button key={i} onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);setDbSearch('');}} style={{background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:5,padding:'5px 7px',fontSize:S.xs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name||r.Name||r['Route Name']||'Unnamed'}</button>))}
                </div>
              </div>)}
            </div>
          )}

          {activePanel==='rb'&&(<div style={{display:'flex',flexDirection:'column',gap:7}}>
            <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:S.tx}}><input type="checkbox" checked={rbMode} onChange={e=>{const on=e.target.checked;rbModeRef.current=on;setRbMode(on);if(!on){rbTargetRef.current=null;setRbResult(null);if(leafRef.current){if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=null;layersRef.current.rbMarker=null;}}}}/>📐 Range & Bearing</label>
            <div style={{color:rbMode?S.gd:S.dm,fontSize:S.xs}}>{rbMode?'⭡ Tap map — live updates':'Enable then tap map'}</div>
            {rbResult&&(<div style={{background:'#020810',borderRadius:7,padding:'8px 10px',border:'1px solid rgba(255,215,0,0.3)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>{[['RANGE',rbResult.rangeNM+' NM'],['BRG',rbResult.bearing+'°T']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.9rem',fontWeight:700}}>{v}</div></div>))}</div>
              {livePos?.sog>0.2&&(<div style={{borderTop:'1px solid rgba(255,215,0,0.2)',paddingTop:4,marginBottom:4}}><div style={{color:S.dm,fontSize:S.lb}}>TTG @ {livePos.sog.toFixed(1)}kn</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{(()=>{const h=parseFloat(rbResult.rangeNM)/livePos.sog,hr=Math.floor(h),mn=Math.round((h-hr)*60);return hr>0?`${hr}h ${mn}m`:`${mn} min`;})()}</div></div>)}
              <div style={{color:S.dm,fontSize:S.xs}}>{toDMS(parseFloat(rbResult.lat),true)}<br/>{toDMS(parseFloat(rbResult.lon),false)}</div>
            </div>)}
          </div>)}

          {activePanel==='charts'&&(<div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:6,padding:'7px 10px',fontSize:S.sm,cursor:'pointer',display:'block',textAlign:'center'}}>🗺️ Load Chart File<input type="file" accept=".xml,.geojson,.json,.kml,.gpx" style={{display:'none'}} onChange={loadChart}/></label>
            <div style={{color:S.vd,fontSize:'0.55rem',lineHeight:1.5}}>ECDIS XML · GeoJSON · KML · GPX</div>
            {/* Active overlays */}
            {chartOverlays.length>0&&(<div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>ACTIVE ({chartOverlays.length})</div>
              {chartOverlays.map((c,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:3,marginBottom:2}}>
                <div style={{flex:1,overflow:'hidden'}}><div style={{color:'#00E5FF',fontSize:S.xs,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🗺 {c.name}</div>{c.summary&&<div style={{color:S.dm,fontSize:'0.55rem'}}>{c.summary}</div>}</div>
                <button onClick={()=>{const found=chartLayersRef.current.find(x=>x.id===c.name);if(found) saveChart({name:c.name,summary:c.summary,data:found.layer.toGeoJSON?.()});}} style={{background:'transparent',border:'1px solid rgba(0,212,255,0.4)',color:S.cy,borderRadius:4,padding:'2px 5px',fontSize:'0.6rem',cursor:'pointer'}} title="Save chart">💾</button>
                <button onClick={()=>removeChart(c.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.rd,borderRadius:4,padding:'2px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button>
              </div>))}
            </div>)}
            {chartOverlays.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic',textAlign:'center',padding:'4px 0'}}>No overlays loaded</div>}
            {/* Saved charts */}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
              <div style={{color:S.dm,fontSize:S.lb,letterSpacing:0.5,marginBottom:3}}>MY CHARTS ({savedCharts.length}/50)</div>
              <input placeholder="Search saved charts…" value={chartSearch} onChange={e=>setChartSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.tx,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.xs,outline:'none',marginBottom:3}}/>
              <div style={{maxHeight:90,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
                {savedCharts.filter(c=>!chartSearch.trim()||(c.name||'').toLowerCase().includes(chartSearch.toLowerCase())).slice(0,50).map((c,i)=>(<div key={i} style={{display:'flex',gap:3}}>
                  <button onClick={()=>loadSavedChart(c)} style={{flex:1,background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:5,padding:'4px 6px',fontSize:S.xs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={c.summary||c.name}>🗺 {c.name}</button>
                  <button onClick={()=>delSavedChart(c.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.rd,borderRadius:4,padding:'3px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button>
                </div>))}
                {savedCharts.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>No saved charts</div>}
              </div>
            </div>
            {/* Chart overlay color hint */}
            <div style={{color:S.dm,fontSize:'0.54rem',borderTop:'1px solid rgba(0,212,255,0.08)',paddingTop:4}}>Chart color: <span style={{color:colors.chart||'#FF2020'}}>■</span> — change in 🎨 Settings → Colors</div>
          </div>)}

          {activePanel==='eta'&&(<div>{activeRoute?.waypoints?.length>0?<ETACalculator totalNM={etaResult?.remainNM?parseFloat(etaResult.remainNM):0}/>:<div style={{color:S.dm,fontSize:S.sm,fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Load a route first</div>}</div>)}
        </div>
      )}

      {/* SETTINGS */}
      {showMenu&&(<div style={{position:'absolute',inset:0,zIndex:800,background:'rgba(0,0,0,0.6)'}} onClick={()=>setShowMenu(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#030A15',borderTop:`1px solid ${S.bd}`,borderRadius:'14px 14px 0 0',padding:'14px 16px',maxHeight:'78vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
            {[['colors','🎨'],['track','📍'],['ais','📡'],['contours','🌊'],['display','🗺️']].map(([c,l])=>(<button key={c} onClick={()=>setMenuCat(c)} style={{flex:1,minWidth:52,background:menuCat===c?'rgba(0,212,255,0.18)':'#060F1C',border:`1px solid ${menuCat===c?S.cy:S.vd}`,color:menuCat===c?S.cy:S.dm,borderRadius:7,padding:'7px 4px',fontSize:'0.72rem',cursor:'pointer'}}>{l}</button>))}
          </div>
          {menuCat==='colors'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>{[['route','Route Line'],['vector','COG Vector'],['ship','Ship Icon'],['track','Past Track'],['xtd','XTD Corridor'],['chart','Chart Overlay']].map(([k,lb])=>(<div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:18,height:18,borderRadius:4,background:colors[k],border:'1px solid rgba(255,255,255,0.25)'}}/><span style={{color:S.tx,fontSize:S.sm}}>{lb}</span></div><input type="color" value={colors[k]} onChange={e=>setColors({...colors,[k]:e.target.value})} style={{width:40,height:28,border:'none',borderRadius:6,cursor:'pointer',background:'transparent'}}/></div>))}<button onClick={()=>setColors(DEFAULT_COLORS)} style={{marginTop:4,background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:6,padding:'7px',fontSize:S.xs,cursor:'pointer'}}>↺ Reset defaults</button></div>)}
          {menuCat==='track'&&(<div style={{display:'flex',flexDirection:'column',gap:10}}><div style={{color:S.dm,fontSize:S.xs}}>PAST TRACK DURATION</div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{[[0,'OFF'],[1,'1H'],[2,'2H'],[6,'6H'],[12,'12H'],[24,'24H']].map(([h,l])=>(<button key={h} onClick={()=>setTrackHours(h)} style={{background:trackHours===h?'rgba(0,255,136,0.18)':'#060F1C',border:`1px solid ${trackHours===h?S.gn:S.vd}`,color:trackHours===h?S.gn:S.tx,borderRadius:7,padding:'7px 12px',fontSize:S.sm,cursor:'pointer'}}>{l}</button>))}</div></div>)}
          {menuCat==='ais'&&(<div style={{display:'flex',flexDirection:'column',gap:10}}><div style={{color:S.dm,fontSize:S.xs}}>AIS RANGE FILTER</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{[[0,'World'],[
