/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const DEFAULT_COLORS = {
  route: '#E74C3C',   // Red  (user requested — was blue, clashed with vector)
  vector:'#00D4FF',   // Cyan
  ship:  '#00D4FF',   // Cyan
  track: '#00FF88',   // Green
  xtd:   '#FFB300',   // Amber
};

const TZ_LIST = [
  'UTC-12','UTC-11','UTC-10','UTC-9:30','UTC-9','UTC-8','UTC-7','UTC-6',
  'UTC-5','UTC-4','UTC-3:30','UTC-3','UTC-2','UTC-1','UTC',
  'UTC+1','UTC+2','UTC+3','UTC+3:30','UTC+4','UTC+4:30',
  'UTC+5','UTC+5:30','UTC+5:45','UTC+6','UTC+6:30','UTC+7',
  'UTC+8','UTC+8:45','UTC+9','UTC+9:30','UTC+10','UTC+10:30',
  'UTC+11','UTC+12','UTC+13','UTC+14',
];

// Parse "UTC+5:30" → offset in minutes
const tzMins = (tz) => {
  const m = tz.match(/UTC([+-]\d+(?::\d+)?)?/);
  if (!m || !m[1]) return 0;
  const neg = m[1].startsWith('-');
  const [h, mn = '0'] = m[1].replace(/[+-]/,'').split(':');
  return (parseInt(h)*60+parseInt(mn)) * (neg ? -1 : 1);
};

// Format arrival Date in a given timezone string
const fmtArrival = (etaHours, tz) => {
  const ms = Date.now() + etaHours * 3600000;
  const arrival = new Date(ms);
  const off = (tzMins(tz) - arrival.getTimezoneOffset()) * 60000;
  const d = new Date(ms + off);
  const p = n => String(n).padStart(2,'0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${p(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}  ${p(d.getHours())}:${p(d.getMinutes())} ${tz}`;
};

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function NavModePage({ notify, sheetRoutes=[], portsDb=[], setTab }) {

  // ── EXISTING REFS ──
  const mapRef        = useRef(null);
  const leafRef       = useRef(null);
  const baseTileRef   = useRef(null);
  const seamarkRef    = useRef(null);
  const gebcoRefTile  = useRef(null);
  const emodnetTileRef = useRef(null);
  const encTileRef    = useRef(null);

  const layersRef = useRef({
    route:null, vessel:null, vector:null,
    ais:{}, trailLine:null, trail:[],
    routeMarkers:[], rbLine:null, rbMarker:null,
    xtdPort:null, xtdStbd:null, xtdFill:null,
    pastTrack: null,   // ADD: past track polyline layer
  });

  const chartLayersRef   = useRef([]);   // ADD: [{id,layer}] chart overlay layers
  const aisWsRef         = useRef(null);
  const invalidateTimers = useRef([]);
  const pastTrackRef     = useRef([]);   // ADD: [{lat,lon,t}] raw track points (max 24h)

  // ADD: refs for values readable inside once-registered map callbacks
  const rbModeRef     = useRef(false);
  const livePosRef    = useRef(null);
  const vectorMinsRef = useRef(6);
  const colorsRef     = useRef(DEFAULT_COLORS);  // mirrors colors state
  const rbTargetRef   = useRef(null);            // stores {lat,lon} of last R/B tap
  const trackHoursRef = useRef(0);               // mirrors trackHours state
  const autoCenterRef = useRef(true);            // mirrors autoCenter state
  const hudDragRef    = useRef(null);            // drag start offset for HUD

  // ── EXISTING STATE (all now persisted) ──
  const [mapReady,   setMapReady]      = useState(false);
  const [gpsOn,      setGpsOn]         = useState(() => localStorage.getItem('nav_gpsOn')==='true');
  const [aisOn,      setAisOn]         = useState(() => localStorage.getItem('nav_aisOn')==='true');
  const [gebcoOn,    setGebcoOn]       = useState(() => localStorage.getItem('nav_gebcoOn')==='true');
  const [aisTargets, setAisTargets]    = useState({});
  const [autoCenter, setAutoCenterRaw] = useState(() => localStorage.getItem('nav_autoCenter')!=='false');

  // ── NEW STATE ──
  const [mapMode,      setMapMode]      = useState(() => localStorage.getItem('nav_mapMode')||'night');
  const [displayMode,  setDisplayMode]  = useState(() => localStorage.getItem('nav_displayMode')||'north');
  const [activeRoute,  setActiveRoute]  = useState(() => { try{return JSON.parse(localStorage.getItem('nav_activeRoute')||'null');}catch{return null;} });
  const [livePos,      setLivePos]      = useState(null);
  const [selectedWpIdx,setSelectedWpIdx]= useState(0);
  const [rbMode,       setRbMode]       = useState(false);
  const [rbResult,     setRbResult]     = useState(null);
  const [etaResult,    setEtaResult]    = useState(null);
  const [activePanel,  setActivePanel]  = useState('nav');
  const [vectorMins,   setVectorMins]   = useState(() => Number(localStorage.getItem('nav_vectorMins')||6));
  const [routeSearch,  setRouteSearch]  = useState('');
  // Item 1 — colors
  const [colors, setColors] = useState(() => { try{return JSON.parse(localStorage.getItem('nav_colors')||'null')||DEFAULT_COLORS;}catch{return DEFAULT_COLORS;} });
  // Item 2 — draggable HUD
  const [hudCollapsed,setHudCollapsed]  = useState(() => localStorage.getItem('nav_hudCollapsed')==='true');
  const [hudPos,      setHudPos]        = useState(() => { try{return JSON.parse(localStorage.getItem('nav_hudPos')||'{"x":8,"y":54}');}catch{return {x:8,y:54};} });
  // Item 3 — ETA enhancements
  const [etaTimezone, setEtaTimezone]   = useState(() => localStorage.getItem('nav_etaTz')||'UTC');
  const [etaTargetDT, setEtaTargetDT]  = useState('');  // target arrival datetime for req speed
  // Item 4 — past track
  const [trackHours,  setTrackHours]    = useState(() => Number(localStorage.getItem('nav_trackHours')||0));
  // Item 8 — saved routes
  const [savedRoutes, setSavedRoutes]   = useState(() => { try{return JSON.parse(localStorage.getItem('nav_savedRoutes')||'[]');}catch{return [];} });
  const [savedSearch, setSavedSearch]   = useState('');
  // Item 10 — chart overlays
  const [chartOverlays,setChartOverlays]= useState([]);
  // Menu
  const [showMenu,    setShowMenu]      = useState(false);
  const [menuCat,     setMenuCat]       = useState('colors');

  // ── EXISTING: SAFE MAP INVALIDATE ──
  const safeInvalidate = useCallback(() => {
    invalidateTimers.current.forEach(clearTimeout);
    invalidateTimers.current = [];
    const fix = () => { try{leafRef.current?.invalidateSize({animate:false});}catch{} };
    fix();
    invalidateTimers.current = [100,300,600,1000,1800].map(t=>setTimeout(fix,t));
  },[]);

  // ── EXISTING: HAVERSINE (NM) ──
  const distanceNM = (lat1,lon1,lat2,lon2) => {
    const R=3440.065,d=Math.PI/180;
    const a=Math.sin(((lat2-lat1)*d)/2)**2+Math.cos(lat1*d)*Math.cos(lat2*d)*Math.sin(((lon2-lon1)*d)/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  };

  // ── EXISTING: CPA / TCPA ENGINE ──
  const calcCPA = (own,tgt) => {
    const dx=tgt.lon-own.lon,dy=tgt.lat-own.lat;
    const tcpaHours=((dx*tgt.cog-dy*own.cog)||0)/1000;
    return { cpa:distanceNM(own.lat,own.lon,tgt.lat,tgt.lon), tcpa:Math.max(tcpaHours,0) };
  };

  // ── EXISTING: COLREG CLASSIFIER ──
  const getCOLREG = (own,tgt) => {
    const bearing=(Math.atan2(tgt.lon-own.lon,tgt.lat-own.lat)*180)/Math.PI+360;
    const rel=(bearing-own.cog+360)%360;
    if(rel>345||rel<15)      return "HEAD-ON ⚠";
    if(rel>112.5&&rel<247.5) return "OVERTAKING ⚠";
    if(rel>15&&rel<112.5)    return "CROSSING (STARBOARD GIVE WAY)";
    if(rel>247.5&&rel<345)   return "CROSSING (YOU GIVE WAY)";
    return "SAFE";
  };

  // ── ADD: TRUE BEARING ──
  const calcBearing = (lat1,lon1,lat2,lon2) => {
    const D=Math.PI/180,dLon=(lon2-lon1)*D;
    const y=Math.sin(dLon)*Math.cos(lat2*D);
    const x=Math.cos(lat1*D)*Math.sin(lat2*D)-Math.sin(lat1*D)*Math.cos(lat2*D)*Math.cos(dLon);
    return ((Math.atan2(y,x)/D)+360)%360;
  };

  // ── ADD: GREAT-CIRCLE OFFSET POINT (for XTD) ──
  const offsetPoint = (lat,lon,bearingDeg,distNM) => {
    const R=3440.065,d=distNM/R,b=bearingDeg*Math.PI/180;
    const φ1=lat*Math.PI/180,λ1=lon*Math.PI/180;
    const φ2=Math.asin(Math.sin(φ1)*Math.cos(d)+Math.cos(φ1)*Math.sin(d)*Math.cos(b));
    const λ2=λ1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(φ1),Math.cos(d)-Math.sin(φ1)*Math.sin(φ2));
    return [φ2*180/Math.PI,λ2*180/Math.PI];
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── ADD: SAVED ROUTES ──
  // ─────────────────────────────────────────────────────────────────────────
  const saveCurrentRoute = () => {
    if (!activeRoute) return;
    setSavedRoutes(prev => {
      const idx = prev.findIndex(r=>r.name===activeRoute.name);
      const updated = idx>=0
        ? prev.map((r,i)=>i===idx?activeRoute:r)
        : [activeRoute,...prev].slice(0,100);
      localStorage.setItem('nav_savedRoutes',JSON.stringify(updated));
      return updated;
    });
    notify(`✓ Saved: ${activeRoute.name}`,'error');
  };

  const deleteSavedRoute = (name) => {
    setSavedRoutes(prev => {
      const updated = prev.filter(r=>r.name!==name);
      localStorage.setItem('nav_savedRoutes',JSON.stringify(updated));
      return updated;
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── EXISTING: UNIVERSAL ECDIS ROUTE FILE PARSER ──
  // ─────────────────────────────────────────────────────────────────────────
  const tryParseXml = (text,filename) => {
    try {
      const doc=new DOMParser().parseFromString(text,'application/xml');
      if(doc.querySelector('parsererror')) return null;
      const wps=[];
      doc.querySelectorAll('waypoint,Waypoint').forEach(w=>{
        const pos=w.querySelector('position,Position'); if(!pos) return;
        const lat=parseFloat(pos.getAttribute('lat')||pos.getAttribute('Lat'));
        const lon=parseFloat(pos.getAttribute('lon')||pos.getAttribute('Lon'));
        const name=w.getAttribute('name')||w.getAttribute('Name')||'';
        if(!isNaN(lat)&&!isNaN(lon)) wps.push({lat,lon,name});
      });
      if(!wps.length) doc.querySelectorAll('rtept,wpt,trkpt').forEach(pt=>{
        const lat=parseFloat(pt.getAttribute('lat')),lon=parseFloat(pt.getAttribute('lon'));
        const name=pt.querySelector('name')?.textContent?.trim()||'';
        if(!isNaN(lat)&&!isNaN(lon)) wps.push({lat,lon,name});
      });
      if(!wps.length) doc.querySelectorAll('WP,wp,Point,point,Wpt').forEach(el=>{
        const lat=parseFloat(el.getAttribute('Lat')||el.getAttribute('lat')||el.getAttribute('latitude'));
        const lon=parseFloat(el.getAttribute('Lon')||el.getAttribute('lon')||el.getAttribute('longitude'));
        const name=el.getAttribute('Name')||el.getAttribute('name')||el.getAttribute('id')||'';
        if(!isNaN(lat)&&!isNaN(lon)) wps.push({lat,lon,name});
      });
      if(!wps.length) doc.querySelectorAll('[lat][lon],[Lat][Lon],[latitude][longitude]').forEach(el=>{
        const lat=parseFloat(el.getAttribute('lat')||el.getAttribute('Lat')||el.getAttribute('latitude'));
        const lon=parseFloat(el.getAttribute('lon')||el.getAttribute('Lon')||el.getAttribute('longitude'));
        if(!isNaN(lat)&&!isNaN(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)
          wps.push({lat,lon,name:el.getAttribute('name')||el.getAttribute('Name')||''});
      });
      if(!wps.length) return null;
      const routeName=doc.querySelector('route,Route')?.getAttribute('name')||doc.querySelector('route,Route')?.getAttribute('Name')||doc.querySelector('gpx>metadata>name,rte>name')?.textContent?.trim()||filename;
      return {name:routeName,waypoints:wps};
    } catch{return null;}
  };
  const tryParseJson = (text,filename) => {
    try {
      const p=JSON.parse(text);
      if(Array.isArray(p)){const wps=p.filter(x=>x.lat!=null&&x.lon!=null);if(wps.length) return {name:filename,waypoints:wps};}
      const wps=p.waypoints||p.Waypoints||p.route?.waypoints||p.Route?.Waypoints;
      if(wps?.length) return {name:p.name||p.Name||filename,waypoints:wps};
      return null;
    }catch{return null;}
  };
  const tryParseDelimited = (text,filename) => {
    try {
      const lines=text.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')&&!l.startsWith('//'));
      const wps=[];
      for(const line of lines){
        if(/^(lat|lon|name|waypoint|wp|no\.|id|#)/i.test(line)) continue;
        const parts=line.split(/[,\t;|]+/).map(p=>p.replace(/["']/g,'').trim());
        if(parts.length<2) continue;
        let lat=parseFloat(parts[0]),lon=parseFloat(parts[1]),name=parts[2]||'';
        if(!isNaN(parseFloat(parts[0]))&&isNaN(parseFloat(parts[1]))&&parts.length>=3){lat=parseFloat(parts[1]);lon=parseFloat(parts[2]);name=parts[3]||'';}
        if(!isNaN(lat)&&!isNaN(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180) wps.push({lat,lon,name});
      }
      if(!wps.length) return null;
      return {name:filename,waypoints:wps};
    }catch{return null;}
  };
  const parseRouteFile = (text,filename) => {
    const ext=filename.toLowerCase().split('.').pop();
    if(ext==='rtzp') throw new Error('RTZP is zipped — unzip and load the .rtz inside.');
    if(ext==='xlsx') throw new Error('XLSX binary — export as CSV from your ECDIS.');
    if(text.trim().startsWith('<')||['rtz','gpx','rte','rt3','rt4','rtx','rtu','xml','wpt'].includes(ext)){const r=tryParseXml(text,filename);if(r) return r;}
    if(ext==='json'||text.trim().startsWith('{')||text.trim().startsWith('[')){const r=tryParseJson(text,filename);if(r) return r;}
    const r1=tryParseXml(text,filename);if(r1) return r1;
    const r2=tryParseJson(text,filename);if(r2) return r2;
    const r3=tryParseDelimited(text,filename);if(r3) return r3;
    throw new Error('No waypoints found — check file format.');
  };
  const loadRouteFromFile = (e) => {
    const file=e.target.files?.[0];if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const route=parseRouteFile(ev.target.result,file.name);
        if(!route?.waypoints?.length) throw new Error('No valid waypoints found');
        setActiveRoute(route);setSelectedWpIdx(route.waypoints.length-1);
        notify(`✓ Loaded: ${route.name} (${route.waypoints.length} WPs)`,'error');
      }catch(err){notify(`Load failed: ${err.message}`,'error');}
    };
    reader.readAsText(file);e.target.value='';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ── ADD: CHART OVERLAY PARSER (Item 10) ──
  // Supports GeoJSON, KML, GPX tracks — renders as Leaflet overlay layers.
  // Note: raw S-57/ENC binary files cannot be rendered in a browser directly.
  // Download chart files from ChartsPage first, then load them here.
  // ─────────────────────────────────────────────────────────────────────────
  const tryParseGeoJSON = (text,filename) => {
    try{
      const d=JSON.parse(text);
      const types=['FeatureCollection','Feature','Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon','GeometryCollection'];
      if(types.includes(d.type)) return {type:'geojson',name:filename,data:d};
      return null;
    }catch{return null;}
  };
  const tryParseKML = (text,filename) => {
    try{
      const doc=new DOMParser().parseFromString(text,'application/xml');
      if(doc.querySelector('parsererror')) return null;
      const features=[];
      const pCoords=(str)=>str.trim().split(/\s+/).map(p=>{const[lo,la]=p.split(',').map(Number);return(!isNaN(la)&&!isNaN(lo))?[lo,la]:null;}).filter(Boolean);
      doc.querySelectorAll('Placemark').forEach(pm=>{
        const name=pm.querySelector('name')?.textContent?.trim()||'';
        const ptEl=pm.querySelector('Point coordinates');
        if(ptEl){pCoords(ptEl.textContent).forEach(([lo,la])=>features.push({type:'Feature',properties:{name},geometry:{type:'Point',coordinates:[lo,la]}}));}
        const lsEl=pm.querySelector('LineString coordinates');
        if(lsEl){const c=pCoords(lsEl.textContent);if(c.length) features.push({type:'Feature',properties:{name},geometry:{type:'LineString',coordinates:c}});}
        const pgEl=pm.querySelector('Polygon outerBoundaryIs LinearRing coordinates');
        if(pgEl){const c=pCoords(pgEl.textContent);if(c.length) features.push({type:'Feature',properties:{name},geometry:{type:'Polygon',coordinates:[c]}});}
      });
      if(!features.length) return null;
      const docName=doc.querySelector('Document>name')?.textContent?.trim()||filename;
      return {type:'geojson',name:docName,data:{type:'FeatureCollection',features}};
    }catch{return null;}
  };
  const parseChartFile = (text,filename) => {
    const ext=filename.toLowerCase().split('.').pop();
    const gj=tryParseGeoJSON(text,filename); if(gj) return gj;
    if(text.trim().startsWith('<')||['kml','kmz','xml'].includes(ext)){const k=tryParseKML(text,filename);if(k) return k;}
    if(['gpx'].includes(ext)||text.includes('<gpx')){
      try{
        const doc=new DOMParser().parseFromString(text,'application/xml');
        const trkPts=[],rtePts=[];
        doc.querySelectorAll('trkpt').forEach(pt=>{const la=parseFloat(pt.getAttribute('lat')),lo=parseFloat(pt.getAttribute('lon'));if(!isNaN(la)&&!isNaN(lo)) trkPts.push([lo,la]);});
        doc.querySelectorAll('rtept').forEach(pt=>{const la=parseFloat(pt.getAttribute('lat')),lo=parseFloat(pt.getAttribute('lon'));if(!isNaN(la)&&!isNaN(lo)) rtePts.push([lo,la]);});
        const coords=trkPts.length?trkPts:rtePts;
        if(coords.length) return {type:'geojson',name:filename,data:{type:'Feature',properties:{name:filename},geometry:{type:'LineString',coordinates:coords}}};
      }catch{}
    }
    throw new Error('Unsupported chart format. Use GeoJSON, KML, or GPX.');
  };
  const loadChartFile = (e) => {
    const file=e.target.files?.[0];if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const overlay=parseChartFile(ev.target.result,file.name);
        if(leafRef.current&&window.L){
          const L=window.L;
          const c=colorsRef.current;
          const layer=L.geoJSON(overlay.data,{
            style:{color:'#00FFFF',weight:1.5,opacity:0.85,fillColor:'#00FFFF',fillOpacity:0.08},
            pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:5,color:'#00FFFF',fillOpacity:0.9}).bindPopup(f.properties?.name||file.name),
            onEachFeature:(f,l)=>{if(f.properties?.name) l.bindTooltip(f.properties.name);}
          }).addTo(leafRef.current);
          chartLayersRef.current.push({id:overlay.name,layer});
        }
        setChartOverlays(prev=>[...prev,{name:overlay.name,visible:true}]);
        notify(`✓ Chart loaded: ${overlay.name}`,'error');
      }catch(err){notify(`Chart load failed: ${err.message}`,'error');}
    };
    reader.readAsText(file);e.target.value='';
  };
  const removeChart = (name) => {
    const idx=chartLayersRef.current.findIndex(c=>c.id===name);
    if(idx>=0){try{leafRef.current?.removeLayer(chartLayersRef.current[idx].layer);}catch{}chartLayersRef.current.splice(idx,1);}
    setChartOverlays(prev=>prev.filter(c=>c.name!==name));
  };

  // ── EXISTING: AIS STREAM ──
  useEffect(()=>{
    if(!aisOn){aisWsRef.current?.close();aisWsRef.current=null;return;}
    const ws=new WebSocket("wss://stream.aisstream.io/v0/stream");
    aisWsRef.current=ws;
    ws.onopen=()=>ws.send(JSON.stringify({Apikey:"FREE_TIER",BoundingBoxes:[[-90,-180],[90,180]],FilterMessageTypes:["PositionReport"]}));
    ws.onmessage=(msg)=>{try{const data=JSON.parse(msg.data);const p=data?.Message?.PositionReport,m=data?.MetaData;if(!p||!m) return;setAisTargets(prev=>({...prev,[m.MMSI]:{mmsi:m.MMSI,lat:p.Latitude,lon:p.Longitude,cog:p.CourseOverGround||0,sog:p.SpeedOverGround||0}}));}catch{}};
    ws.onerror=()=>notify("AIS stream error","error");
    return()=>ws.close();
  },[aisOn]);

  // ── MODIFIED: GPS FIX ──
  // ADDED: past track recording, dynamic R/B update from current position,
  //        look-ahead pan offset, COG vector using colorsRef,
  //        ship icon color from colorsRef.
  useEffect(()=>{
    if(!gpsOn) return;
    if(!navigator.geolocation){notify("GPS not supported","error");return;}
    const id=navigator.geolocation.watchPosition(
      (pos)=>{
        try{
          const lat=pos.coords.latitude,lon=pos.coords.longitude;
          const sog=(pos.coords.speed!=null?pos.coords.speed:0)*1.94384;
          const cog=pos.coords.heading!=null?pos.coords.heading:0;
          const heading=pos.coords.heading!=null?pos.coords.heading:0;
          const acc=pos.coords.accuracy!=null?pos.coords.accuracy:0;
          const fix={lat,lon,sog,cog,heading,acc};
          setLivePos(fix);livePosRef.current=fix;

          // ADD: record past track point
          const now=Date.now();
          pastTrackRef.current.push({lat,lon,t:now});
          // Trim to 24h max
          const cut24=now-24*3600000;
          pastTrackRef.current=pastTrackRef.current.filter(p=>p.t>cut24);

          if(!leafRef.current||!window.L) return;
          const L=window.L;
          const c=colorsRef.current;

          // Ship triangle — color from colorsRef
          const shipIcon=L.divIcon({
            html:`<div style="transform:rotate(${cog}deg);transform-origin:center;width:20px;height:28px;">
              <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                <polygon points="10,1 19,27 10,21 1,27" fill="${c.ship}" stroke="#fff" stroke-width="1.5"/>
              </svg>
            </div>`,
            className:'',iconSize:[20,28],iconAnchor:[10,14],
          });
          if(!layersRef.current.vessel){
            layersRef.current.vessel=L.marker([lat,lon],{icon:shipIcon,zIndexOffset:1000}).addTo(leafRef.current);
          }else{
            layersRef.current.vessel.setLatLng([lat,lon]);
            layersRef.current.vessel.setIcon(shipIcon);
          }

          // COG vector — color from colorsRef
          const RAD=Math.PI/180,lookNM=Math.max(sog,0.3)*(vectorMinsRef.current/60);
          const vLat=lat+(lookNM/60)*Math.cos(cog*RAD),vLon=lon+(lookNM/60)*Math.sin(cog*RAD);
          if(layersRef.current.vector){
            layersRef.current.vector.setLatLngs([[lat,lon],[vLat,vLon]]);
            layersRef.current.vector.setStyle({color:c.vector});
          }else{
            layersRef.current.vector=L.polyline([[lat,lon],[vLat,vLon]],{color:c.vector,weight:2,opacity:0.85,dashArray:'5 3'}).addTo(leafRef.current);
          }

          // ADD: draw / update past track
          const th=trackHoursRef.current;
          if(th>0){
            const cutoff=now-th*3600000;
            const pts=pastTrackRef.current.filter(p=>p.t>cutoff).map(p=>[p.lat,p.lon]);
            if(pts.length>1){
              if(layersRef.current.pastTrack){layersRef.current.pastTrack.setLatLngs(pts);layersRef.current.pastTrack.setStyle({color:c.track});}
              else{layersRef.current.pastTrack=L.polyline(pts,{color:c.track,weight:2,opacity:0.7}).addTo(leafRef.current);}
            }
          }else if(layersRef.current.pastTrack){
            leafRef.current.removeLayer(layersRef.current.pastTrack);layersRef.current.pastTrack=null;
          }

          // ADD: dynamically update R/B from current ship position (Item 7)
          if(rbModeRef.current&&rbTargetRef.current){
            const tgt=rbTargetRef.current;
            const rangeNM=distanceNM(lat,lon,tgt.lat,tgt.lon);
            const bearing=calcBearing(lat,lon,tgt.lat,tgt.lon);
            setRbResult({rangeNM:rangeNM.toFixed(2),bearing:bearing.toFixed(1),lat:tgt.lat.toFixed(5),lon:tgt.lon.toFixed(5)});
            if(layersRef.current.rbLine) layersRef.current.rbLine.setLatLngs([[lat,lon],[tgt.lat,tgt.lon]]);
          }

          // Item 6 — center / look-ahead
          if(autoCenterRef.current){
            // Look-ahead: keep ship in lower third of visible area
            try{
              const map=leafRef.current;
              const sz=map.getSize();
              const pt=map.project([lat,lon],map.getZoom());
              const ahead=pt.subtract([0, sz.y*0.2]); // offset upward so ship appears lower
              map.panTo(map.unproject(ahead,map.getZoom()),{animate:true,duration:0.3});
            }catch{leafRef.current.panTo([lat,lon]);}
          }
        }catch(err){console.warn('[NavMode GPS]',err);}
      },
      ()=>notify("GPS error","error"),
      {enableHighAccuracy:true,maximumAge:0,timeout:30000}
    );
    return()=>navigator.geolocation.clearWatch(id);
  },[gpsOn]);

  // ── EXISTING: AIS RENDER + CPA ALERT ──
  useEffect(()=>{
    if(!leafRef.current||!window.L) return;
    const L=window.L;
    Object.values(layersRef.current.ais).forEach(m=>leafRef.current.removeLayer(m));
    layersRef.current.ais={};
    Object.values(aisTargets).forEach(v=>{
      if(!v.lat||!v.lon) return;
      const own=layersRef.current.vessel?.getLatLng();
      const cpaData=own?calcCPA({lat:own.lat,lon:own.lng,cog:0},v):null;
      const colreg=own?getCOLREG({lat:own.lat,lon:own.lng,cog:0},v):"N/A";
      const color=cpaData?.cpa<1?"#ff3b30":cpaData?.cpa<5?"#ff9500":"#00D4FF";
      const marker=L.circleMarker([v.lat,v.lon],{radius:5,color,fillOpacity:1})
        .bindPopup(`<b>AIS Vessel</b><br/>MMSI:${v.mmsi}<br/>SOG:${v.sog}<br/>COG:${v.cog}<br/>CPA:${cpaData?.cpa?.toFixed(2)||"-"} NM<br/>COLREG:${colreg}`)
        .addTo(leafRef.current);
      layersRef.current.ais[v.mmsi]=marker;
      if(cpaData?.cpa<1.5) notify(`⚠ Collision Risk: MMSI ${v.mmsi}`,"error");
    });
  },[aisTargets]);

  // ── MODIFIED: TILE SWAP — mapMode + GEBCO ECDIS layers ──
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L,map=leafRef.current;
    [baseTileRef,gebcoRefTile,seamarkRef,emodnetTileRef,encTileRef].forEach(r=>{if(r.current){map.removeLayer(r.current);r.current=null;}});
    const TILES={
      night:{url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',attr:'© CARTO'},
      day:  {url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',attr:'© CARTO'},
      dusk: {url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',attr:'© CARTO'},
    };
    if(gebcoOn){
      baseTileRef.current=L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',attribution:'© CARTO',maxZoom:19}).addTo(map);
      emodnetTileRef.current=L.tileLayer('https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png',{attribution:'© EMODnet',maxZoom:11,opacity:0.55,errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}).addTo(map);
      gebcoRefTile.current=L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,attribution:'Tiles © Esri — GEBCO, NOAA',opacity:1.0}).addTo(map);
      try{encTileRef.current=L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer',{layers:'0,1,2,3,4,5,6,7',format:'image/png',transparent:true,version:'1.3.0',attribution:'© NOAA ENC',opacity:0.85,maxZoom:18}).addTo(map);}catch{}
    }else{
      const cfg=TILES[mapMode]||TILES.night;
      baseTileRef.current=L.tileLayer(cfg.url,{subdomains:'abcd',attribution:cfg.attr,maxZoom:19}).addTo(map);
    }
    seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:gebcoOn?0.85:0.55,maxZoom:18,attribution:'© OpenSeaMap'}).addTo(map);
  },[gebcoOn,mapMode,mapReady]);

  // ADD: sync refs (readable inside once-registered callbacks)
  useEffect(()=>{ rbModeRef.current=rbMode; },[rbMode]);
  useEffect(()=>{ vectorMinsRef.current=vectorMins; },[vectorMins]);
  useEffect(()=>{ colorsRef.current=colors; },[colors]);
  useEffect(()=>{ trackHoursRef.current=trackHours; },[trackHours]);
  useEffect(()=>{ autoCenterRef.current=autoCenter; },[autoCenter]);

  // ADD: persist ALL preferences (Item 9)
  useEffect(()=>{ localStorage.setItem('nav_mapMode',mapMode); },[mapMode]);
  useEffect(()=>{ localStorage.setItem('nav_displayMode',displayMode); },[displayMode]);
  useEffect(()=>{ localStorage.setItem('nav_gpsOn',gpsOn); },[gpsOn]);
  useEffect(()=>{ localStorage.setItem('nav_aisOn',aisOn); },[aisOn]);
  useEffect(()=>{ localStorage.setItem('nav_gebcoOn',gebcoOn); },[gebcoOn]);
  useEffect(()=>{ localStorage.setItem('nav_autoCenter',autoCenter); },[autoCenter]);
  useEffect(()=>{ localStorage.setItem('nav_vectorMins',vectorMins); },[vectorMins]);
  useEffect(()=>{ localStorage.setItem('nav_trackHours',trackHours); },[trackHours]);
  useEffect(()=>{ localStorage.setItem('nav_etaTz',etaTimezone); },[etaTimezone]);
  useEffect(()=>{ localStorage.setItem('nav_hudCollapsed',hudCollapsed); },[hudCollapsed]);
  useEffect(()=>{ localStorage.setItem('nav_hudPos',JSON.stringify(hudPos)); },[hudPos]);
  useEffect(()=>{ localStorage.setItem('nav_colors',JSON.stringify(colors)); },[colors]);
  useEffect(()=>{
    if(activeRoute) localStorage.setItem('nav_activeRoute',JSON.stringify(activeRoute));
    else localStorage.removeItem('nav_activeRoute');
  },[activeRoute]);

  // ADD: render route + XTD corridor
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L,map=leafRef.current,lrs=layersRef.current;
    if(lrs.route){map.removeLayer(lrs.route);lrs.route=null;}
    lrs.routeMarkers?.forEach(m=>{try{map.removeLayer(m);}catch{}});lrs.routeMarkers=[];
    if(lrs.xtdPort){map.removeLayer(lrs.xtdPort);lrs.xtdPort=null;}
    if(lrs.xtdStbd){map.removeLayer(lrs.xtdStbd);lrs.xtdStbd=null;}
    if(lrs.xtdFill){map.removeLayer(lrs.xtdFill);lrs.xtdFill=null;}
    if(!activeRoute?.waypoints?.length) return;
    const wps=activeRoute.waypoints;
    const c=colors;
    lrs.route=L.polyline(wps.map(w=>[w.lat,w.lon]),{color:c.route,weight:2.5,opacity:0.9,dashArray:'8 4'}).addTo(map);
    wps.forEach((wp,i)=>{
      const isFirst=i===0,isLast=i===wps.length-1;
      const col=isFirst?'#00C896':isLast?'#FF4757':c.route,sz=isFirst||isLast?12:7;
      const icon=L.divIcon({html:`<div style="background:${col};border:2px solid #fff;border-radius:50%;width:${sz}px;height:${sz}px;"></div>`,className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      const m=L.marker([wp.lat,wp.lon],{icon}).bindPopup(`<div style="font-size:12px"><b style="color:${c.route}">WP${String(i+1).padStart(2,'0')}${wp.name?' — '+wp.name:''}</b><br/>Lat:${(+wp.lat).toFixed(5)}°<br/>Lon:${(+wp.lon).toFixed(5)}°</div>`).addTo(map);
      lrs.routeMarkers.push(m);
    });
    if(wps.length>=2){
      const XTD=1.0,portPts=[],stbdPts=[];
      wps.forEach((wp,i)=>{
        let brg;
        if(i===0) brg=calcBearing(wp.lat,wp.lon,wps[1].lat,wps[1].lon);
        else if(i===wps.length-1) brg=calcBearing(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon);
        else{const b1=calcBearing(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon),b2=calcBearing(wp.lat,wp.lon,wps[i+1].lat,wps[i+1].lon),diff=((b2-b1+540)%360)-180;brg=(b1+diff/2+360)%360;}
        portPts.push(offsetPoint(wp.lat,wp.lon,(brg-90+360)%360,XTD));
        stbdPts.push(offsetPoint(wp.lat,wp.lon,(brg+90)%360,XTD));
      });
      lrs.xtdPort=L.polyline(portPts,{color:c.xtd,weight:1.5,opacity:0.8,dashArray:'10 6'}).addTo(map);
      lrs.xtdStbd=L.polyline(stbdPts,{color:c.xtd,weight:1.5,opacity:0.8,dashArray:'10 6'}).addTo(map);
      lrs.xtdFill=L.polygon([...portPts,...[...stbdPts].reverse()],{color:'transparent',fillColor:c.xtd,fillOpacity:0.06,weight:0}).addTo(map);
    }
    map.fitBounds(lrs.route.getBounds(),{padding:[60,60]});
  },[activeRoute,mapReady,colors]);

  // ADD: ETA calculation
  useEffect(()=>{
    if(!livePos||!activeRoute?.waypoints?.length){setEtaResult(null);return;}
    if(livePos.sog<0.2){setEtaResult(null);return;}
    const wps=activeRoute.waypoints,idx=Math.min(Math.max(selectedWpIdx,0),wps.length-1);
    const remainNM=distanceNM(livePos.lat,livePos.lon,wps[idx].lat,wps[idx].lon);
    const hours=remainNM/livePos.sog;
    const hrs=Math.floor(hours),mins=Math.round((hours%1)*60);
    setEtaResult({remainNM:remainNM.toFixed(1),hours,hrs,mins,wpName:wps[idx].name||`WP${String(idx+1).padStart(2,'0')}`});
  },[livePos,activeRoute,selectedWpIdx]);

  // ADD: map bearing / Course Up / Head Up (Item 5)
  // Uses leaflet-rotate plugin if loaded, falls back to CSS pane rotation
  useEffect(()=>{
    if(!mapReady||!leafRef.current) return;
    const angle=displayMode==='north'?0:displayMode==='course'?(livePos?.cog||0):(livePos?.heading||livePos?.cog||0);
    const map=leafRef.current;
    if(typeof map.setBearing==='function'){
      map.setBearing(angle); // leaflet-rotate plugin
    } else {
      // Fallback: rotate tile and overlay panes
      const panes=map.getPanes();
      ['tilePane','overlayPane','shadowPane'].forEach(p=>{if(panes[p]) panes[p].style.transform=`rotate(${-angle}deg)`;});
    }
  },[displayMode,livePos?.cog,livePos?.heading,mapReady]);

  // ── EXISTING: INIT MAP — with leaflet-rotate plugin + R/B click handler ──
  useEffect(()=>{
    if(leafRef.current) return;
    const initMap=()=>{
      if(!mapRef.current||!window.L) return;
      const L=window.L;
      // Use rotate:true if leaflet-rotate plugin is loaded
      const mapOpts={center:[20,70],zoom:4};
      if(typeof L.Map.prototype.setBearing==='function'||typeof L.map.prototype?.setBearing==='function'){
        try{mapOpts.rotate=true;mapOpts.rotateControl=false;}catch{}
      }
      leafRef.current=L.map(mapRef.current,mapOpts);
      baseTileRef.current=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',attribution:'© CARTO'}).addTo(leafRef.current);
      seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18,attribution:'© OpenSeaMap'}).addTo(leafRef.current);

      // Click: R/B only (depth fetch removed — was non-functional)
      leafRef.current.on('click',(e)=>{
        if(!rbModeRef.current) return;
        const pos=livePosRef.current;
        if(!pos){notify('Enable GPS first for Range/Bearing','error');return;}
        // Store target for dynamic updates on each GPS fix
        rbTargetRef.current={lat:e.latlng.lat,lon:e.latlng.lng};
        const rangeNM=distanceNM(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);
        const bearing=calcBearing(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);
        setRbResult({rangeNM:rangeNM.toFixed(2),bearing:bearing.toFixed(1),lat:e.latlng.lat.toFixed(5),lon:e.latlng.lng.toFixed(5)});
        if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);
        if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
        layersRef.current.rbLine=window.L.polyline([[pos.lat,pos.lon],[e.latlng.lat,e.latlng.lng]],{color:'#FFD700',weight:1.5,dashArray:'5 4',opacity:0.85}).addTo(leafRef.current);
        layersRef.current.rbMarker=window.L.circleMarker([e.latlng.lat,e.latlng.lng],{radius:4,color:'#FFD700',fillColor:'#FFD700',fillOpacity:1}).addTo(leafRef.current);
      });
      setMapReady(true);safeInvalidate();
      [100,300,600,1200].forEach(t=>setTimeout(()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}},t));
    };

    // Load: Leaflet CSS → Leaflet JS → leaflet-rotate → init map
    const loadPluginThenInit=()=>{
      if(!document.getElementById('lrotate')){
        const r=document.createElement('script');r.id='lrotate';
        r.src='https://cdn.jsdelivr.net/npm/leaflet-rotate@0.3.0/dist/leaflet-rotate-src.js';
        r.onload=initMap;r.onerror=initMap; // init even if plugin fails
        document.head.appendChild(r);
      }else{initMap();}
    };

    if(window.L){loadPluginThenInit();return;}
    if(!document.getElementById('lcss')){const c=document.createElement('link');c.id='lcss';c.rel='stylesheet';c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);}
    if(!document.getElementById('ljs')){const s=document.createElement('script');s.id='ljs';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=loadPluginThenInit;document.head.appendChild(s);}
    else{const retry=setInterval(()=>{if(window.L){clearInterval(retry);loadPluginThenInit();}},50);setTimeout(()=>clearInterval(retry),5000);}
    return()=>{invalidateTimers.current.forEach(clearTimeout);if(leafRef.current){leafRef.current.remove();leafRef.current=null;}};
  },[]);

  // ── DERIVED ──
  const filteredSavedRoutes = savedRoutes.filter(r=>!savedSearch.trim()||(r.name||'').toLowerCase().includes(savedSearch.toLowerCase())).slice(0,100);
  const filteredSheetRoutes = (sheetRoutes||[]).filter(r=>!savedSearch.trim()||(r.name||'').toLowerCase().includes(savedSearch.toLowerCase())).slice(0,50);
  const reqSpeed = (() => {
    if(!etaTargetDT||!etaResult) return null;
    const hoursLeft=(new Date(etaTargetDT)-Date.now())/3600000;
    if(hoursLeft<=0) return null;
    return (parseFloat(etaResult.remainNM)/hoursLeft).toFixed(1);
  })();

  // ── HUD DRAG HANDLERS ──
  const onHudTouchStart=(e)=>{
    const t=e.touches[0];
    hudDragRef.current={dx:t.clientX-hudPos.x,dy:t.clientY-hudPos.y};
  };
  const onHudTouchMove=(e)=>{
    if(!hudDragRef.current) return;
    e.stopPropagation();
    const t=e.touches[0];
    const x=Math.max(0,Math.min(window.innerWidth-180,t.clientX-hudDragRef.current.dx));
    const y=Math.max(50,Math.min(window.innerHeight-200,t.clientY-hudDragRef.current.dy));
    setHudPos({x,y});
  };
  const onHudTouchEnd=()=>{hudDragRef.current=null;};

  // ── BUTTON STYLE HELPER ──
  const btn=(active,activeColor='#00D4FF',size='0.58rem')=>({
    background:active?`rgba(${activeColor==='#00D4FF'?'0,212,255':'255,215,0'},0.18)`:'transparent',
    border:`1px solid ${active?activeColor:'#152030'}`,
    color:active?activeColor:'#2A4055',
    borderRadius:4,padding:'2px 5px',fontSize:size,cursor:'pointer',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'#040C1A',position:'relative',overflow:'hidden',minHeight:0}}>

      {/* ── HEADER ── */}
      <div style={{height:46,display:'flex',alignItems:'center',padding:'0 10px',background:'#020810',borderBottom:'1px solid rgba(0,180,216,0.18)',flexShrink:0,gap:5}}>
        <span style={{color:'#00D4FF',fontWeight:700,fontSize:'0.76rem',letterSpacing:1,flex:1}}>⚓ NAV MODE</span>
        {/* Orientation */}
        <div style={{display:'flex',gap:2}}>
          {[['north','N↑'],['course','C↑'],['head','H↑']].map(([m,l])=>(
            <button key={m} onClick={()=>setDisplayMode(m)} style={btn(displayMode===m)}>{l}</button>
          ))}
        </div>
        {/* Map mode */}
        <div style={{display:'flex',gap:2}}>
          {[['night','🌙'],['day','☀️'],['dusk','🌆']].map(([m,l])=>(
            <button key={m} onClick={()=>setMapMode(m)} style={btn(mapMode===m,'#FFD700','0.65rem')}>{l}</button>
          ))}
        </div>
        {/* Menu button */}
        <button onClick={()=>setShowMenu(v=>!v)} style={{...btn(showMenu),'fontSize':'1rem',padding:'2px 7px'}}>☰</button>
      </div>

      {/* ── MAP ── */}
      <div ref={mapRef} style={{flex:1,minHeight:0}}/>

      {/* ── DRAGGABLE HUD (Item 2) ── */}
      <div
        style={{position:'absolute',left:hudPos.x,top:hudPos.y,zIndex:600,background:'rgba(2,8,16,0.93)',border:`1px solid ${gpsOn?'rgba(0,212,255,0.3)':'rgba(42,64,85,0.5)'}`,borderRadius:9,minWidth:170,backdropFilter:'blur(8px)',touchAction:'none'}}
        onTouchStart={onHudTouchStart} onTouchMove={onHudTouchMove} onTouchEnd={onHudTouchEnd}
      >
        {/* HUD top bar — drag handle + collapse */}
        <div style={{display:'flex',alignItems:'center',padding:'5px 8px',gap:6,cursor:'grab',borderBottom:'1px solid rgba(0,212,255,0.1)'}}>
          <span style={{color:'#2A4055',fontSize:'0.65rem',flex:1}}>⠿ SHIP DATA</span>
          <button onClick={()=>setAutoCenterRaw(v=>!v)} style={{...btn(autoCenter,'#00FF88','0.55rem'),padding:'1px 4px'}}>{autoCenter?'CTR':'FREE'}</button>
          <button onClick={()=>setHudCollapsed(v=>!v)} style={{background:'transparent',border:'none',color:'#2A4055',fontSize:'0.75rem',cursor:'pointer',padding:'0 2px'}}>{hudCollapsed?'▼':'▲'}</button>
        </div>

        <div style={{padding:'7px 9px'}}>
          {/* GPS / AIS / Depth toggles — always visible */}
          <div style={{display:'flex',flexDirection:'column',gap:5}}>
            {[[gpsOn,setGpsOn,'📍 GPS'],[aisOn,setAisOn,'📡 AIS'],[gebcoOn,setGebcoOn,'🌊 Depth']].map(([v,s,lb])=>(
              <label key={lb} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.72rem',color:'#b0c8d8'}}>
                <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)}/>{lb}
              </label>
            ))}
          </div>

          {/* Lat/Lon + SOG/COG — always visible */}
          {livePos && (
            <div style={{marginTop:6,borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
              <div style={{color:'#00D4FF',fontFamily:'monospace',fontSize:'0.66rem',lineHeight:1.7}}>
                {Math.abs(livePos.lat).toFixed(5)}°{livePos.lat>=0?'N':'S'}<br/>
                {Math.abs(livePos.lon).toFixed(5)}°{livePos.lon>=0?'E':'W'}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 6px',marginTop:4}}>
                {[['SOG',`${livePos.sog.toFixed(1)} kn`,'#00FF88'],['COG',`${livePos.cog.toFixed(0)}°T`,'#00FF88']].map(([k,v,c])=>(
                  <div key={k}><div style={{color:'#2A4055',fontSize:'0.5rem'}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.76rem',fontWeight:700}}>{v}</div></div>
                ))}
              </div>
            </div>
          )}
          {gpsOn&&!livePos&&<div style={{color:'#2A4055',fontSize:'0.62rem',fontStyle:'italic',marginTop:5}}>Acquiring GPS…</div>}

          {/* Expanded section */}
          {!hudCollapsed && livePos && (
            <div style={{marginTop:5,borderTop:'1px solid rgba(0,212,255,0.08)',paddingTop:5}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 6px'}}>
                {[['HDG',`${livePos.heading.toFixed(0)}°`,'#FFD700'],['ACC',`${livePos.acc.toFixed(0)} m`,'#FFD700']].map(([k,v,c])=>(
                  <div key={k}><div style={{color:'#2A4055',fontSize:'0.5rem'}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.76rem',fontWeight:700}}>{v}</div></div>
                ))}
              </div>
              {/* Vector toggle */}
              <div style={{marginTop:5}}>
                <div style={{color:'#2A4055',fontSize:'0.5rem',marginBottom:2}}>COG VECTOR</div>
                <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
                  {[6,12,20,30,60].map(m=>(
                    <button key={m} onClick={()=>setVectorMins(m)} style={{...btn(vectorMins===m,'#00D4FF','0.54rem'),padding:'1px 3px'}}>{m}m</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ETA quick view when route loaded */}
          {!hudCollapsed && etaResult && (
            <div style={{marginTop:5,borderTop:'1px solid rgba(0,255,136,0.15)',paddingTop:5}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:6}}>
                <div><div style={{color:'#2A4055',fontSize:'0.5rem'}}>REMAIN</div><div style={{color:'#00FF88',fontFamily:'monospace',fontSize:'0.76rem',fontWeight:700}}>{etaResult.remainNM} NM</div></div>
                <div><div style={{color:'#2A4055',fontSize:'0.5rem'}}>ETA</div><div style={{color:'#00FF88',fontFamily:'monospace',fontSize:'0.76rem',fontWeight:700}}>{etaResult.hrs}h {etaResult.mins}m</div></div>
              </div>
              <div style={{color:'#2A4055',fontSize:'0.53rem',marginTop:2}}>→ {etaResult.wpName}</div>
              <div style={{color:'#FFD700',fontSize:'0.56rem',marginTop:2,fontFamily:'monospace'}}>{fmtArrival(etaResult.hours,etaTimezone)}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── SIDE PANEL (ROUTE / R/B / CHARTS) ── */}
      <div style={{position:'absolute',top:54,right:8,background:'rgba(2,8,16,0.93)',border:'1px solid rgba(0,212,255,0.2)',borderRadius:9,padding:'8px 9px',zIndex:500,width:162,backdropFilter:'blur(8px)',maxHeight:'80vh',overflowY:'auto'}}>
        {/* Tabs */}
        <div style={{display:'flex',gap:2,marginBottom:8}}>
          {[['route','ROUTE'],['rb','R/B'],['charts','CHARTS']].map(([p,l])=>(
            <button key={p} onClick={()=>setActivePanel(p)} style={{flex:1,background:activePanel===p?'rgba(0,212,255,0.15)':'transparent',border:`1px solid ${activePanel===p?'#00D4FF':'#152030'}`,color:activePanel===p?'#00D4FF':'#2A4055',borderRadius:4,padding:'2px 3px',fontSize:'0.57rem',cursor:'pointer'}}>{l}</button>
          ))}
        </div>

        {/* ══ ROUTE ══ */}
        {activePanel==='route'&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {/* Load from device */}
            <label style={{background:'#060F1C',border:'1px solid #152030',color:'#6A8898',borderRadius:4,padding:'5px 8px',fontSize:'0.63rem',cursor:'pointer',display:'block',textAlign:'center'}}>
              📂 Load Route File
              <input type="file" style={{display:'none'}} onChange={loadRouteFromFile}/>
            </label>
            <div style={{color:'#1A2A38',fontSize:'0.5rem',lineHeight:1.4}}>RTZ·GPX·RTE·RT3·RT4·RTX·RTU·WPT·CSV·TXT·JSON·BVS</div>

            {/* Active route */}
            {activeRoute?.waypoints?.length>0&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.14)',paddingTop:6}}>
                <div style={{color:'#00D4FF',fontSize:'0.63rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeRoute.name}</div>
                <div style={{color:'#FFB300',fontSize:'0.53rem',marginBottom:4}}>⬜ XTD ±1 NM active · {activeRoute.waypoints.length} WPs</div>
                {/* Save to folder */}
                <button onClick={saveCurrentRoute} style={{width:'100%',background:'transparent',border:'1px solid rgba(0,212,255,0.4)',color:'#00D4FF',borderRadius:4,padding:'3px',fontSize:'0.59rem',cursor:'pointer',marginBottom:4}}>💾 Save to My Routes</button>
                {/* ETA waypoint selector */}
                <div style={{color:'#2A4055',fontSize:'0.52rem',marginBottom:2}}>ETA TO</div>
                <select value={selectedWpIdx} onChange={e=>setSelectedWpIdx(Number(e.target.value))} style={{width:'100%',background:'#060F1C',color:'#00D4FF',border:'1px solid #152030',borderRadius:4,padding:'3px',fontSize:'0.6rem',marginBottom:5}}>
                  {activeRoute.waypoints.map((wp,i)=><option key={i} value={i}>WP{String(i+1).padStart(2,'0')}{wp.name?' '+wp.name:''}</option>)}
                </select>
                <button onClick={()=>{setActiveRoute(null);setEtaResult(null);setSelectedWpIdx(0);}} style={{width:'100%',background:'transparent',border:'1px solid rgba(255,71,87,0.4)',color:'#FF4757',borderRadius:4,padding:'3px',fontSize:'0.59rem',cursor:'pointer'}}>✕ Clear Route</button>
              </div>
            )}

            {/* Saved routes folder (Item 8) */}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:5}}>
              <div style={{color:'#2A4055',fontSize:'0.52rem',letterSpacing:0.5,marginBottom:3}}>MY SAVED ROUTES ({savedRoutes.length}/100)</div>
              <input type="text" placeholder="Search…" value={savedSearch} onChange={e=>setSavedSearch(e.target.value)}
                style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:'#b0c8d8',border:'1px solid #152030',borderRadius:4,padding:'3px 6px',fontSize:'0.6rem',outline:'none',marginBottom:3}}/>
              <div style={{maxHeight:100,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
                {filteredSavedRoutes.map((r,i)=>(
                  <div key={i} style={{display:'flex',gap:2,alignItems:'center'}}>
                    <button onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);notify(`✓ ${r.name}`,'error');}}
                      style={{flex:1,background:activeRoute?.name===r.name?'rgba(0,212,255,0.1)':'#060F1C',border:`1px solid ${activeRoute?.name===r.name?'#00D4FF':'#152030'}`,color:activeRoute?.name===r.name?'#00D4FF':'#6A8898',borderRadius:4,padding:'3px 5px',fontSize:'0.6rem',cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {r.name||'—'}
                    </button>
                    <button onClick={()=>deleteSavedRoute(r.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.3)',color:'#FF4757',borderRadius:3,padding:'2px 4px',fontSize:'0.6rem',cursor:'pointer',flexShrink:0}}>✕</button>
                  </div>
                ))}
                {filteredSavedRoutes.length===0&&<div style={{color:'#2A4055',fontSize:'0.58rem',fontStyle:'italic'}}>No saved routes</div>}
              </div>
            </div>

            {/* Sheet routes */}
            {sheetRoutes.length>0&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:5}}>
                <div style={{color:'#2A4055',fontSize:'0.52rem',letterSpacing:0.5,marginBottom:3}}>DATABASE ({sheetRoutes.length})</div>
                <div style={{maxHeight:80,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
                  {filteredSheetRoutes.map((r,i)=>(
                    <button key={i} onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);notify(`✓ ${r.name}`,'error');}}
                      style={{background:'#060F1C',border:'1px solid #152030',color:'#6A8898',borderRadius:4,padding:'3px 5px',fontSize:'0.6rem',cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {r.name||'—'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ R/B ══ */}
        {activePanel==='rb'&&(
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.74rem',color:'#b0c8d8'}}>
              <input type="checkbox" checked={rbMode} onChange={e=>{
                const on=e.target.checked;
                rbModeRef.current=on;setRbMode(on);
                if(!on){
                  rbTargetRef.current=null;setRbResult(null);
                  if(leafRef.current){
                    if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);
                    if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
                    layersRef.current.rbLine=null;layersRef.current.rbMarker=null;
                  }
                }
              }}/>
              📐 Range & Bearing
            </label>
            <div style={{color:rbMode?'#FFD700':'#2A4055',fontSize:'0.61rem',lineHeight:1.5}}>
              {rbMode?'⬡ Tap map — updates live as ship moves':'Enable then tap any map point'}
            </div>
            {rbResult&&(
              <div style={{background:'#020810',borderRadius:5,padding:'7px 8px',border:'1px solid rgba(255,215,0,0.28)'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  {[['RANGE',rbResult.rangeNM+' NM'],['BRG',rbResult.bearing+'°T']].map(([k,v])=>(
                    <div key={k}><div style={{color:'#2A4055',fontSize:'0.5rem'}}>{k}</div><div style={{color:'#FFD700',fontFamily:'monospace',fontSize:'0.88rem',fontWeight:700}}>{v}</div></div>
                  ))}
                </div>
                <div style={{color:'#2A4055',fontSize:'0.54rem',marginTop:3}}>{rbResult.lat}° {rbResult.lon}°</div>
              </div>
            )}
            {rbMode&&!livePos&&<div style={{color:'#FF4757',fontSize:'0.6rem'}}>⚠ Enable GPS first</div>}
          </div>
        )}

        {/* ══ CHARTS ══ */}
        {activePanel==='charts'&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{color:'#2A4055',fontSize:'0.52rem',lineHeight:1.4,marginBottom:2}}>Load GeoJSON, KML, or GPX overlay files. Download ECDIS charts from the Charts page first, then load them here.</div>
            <label style={{background:'#060F1C',border:'1px solid #152030',color:'#6A8898',borderRadius:4,padding:'5px 8px',fontSize:'0.63rem',cursor:'pointer',display:'block',textAlign:'center'}}>
              🗺️ Load Chart Overlay
              <input type="file" style={{display:'none'}} onChange={loadChartFile}/>
            </label>
            <div style={{color:'#1A2A38',fontSize:'0.5rem'}}>GeoJSON · KML · GPX</div>
            {chartOverlays.length>0&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:5,display:'flex',flexDirection:'column',gap:3}}>
                <div style={{color:'#2A4055',fontSize:'0.52rem'}}>LOADED ({chartOverlays.length})</div>
                {chartOverlays.map((c,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:3}}>
                    <span style={{flex:1,color:'#00FFFF',fontSize:'0.6rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                    <button onClick={()=>removeChart(c.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.3)',color:'#FF4757',borderRadius:3,padding:'1px 4px',fontSize:'0.6rem',cursor:'pointer'}}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {chartOverlays.length===0&&<div style={{color:'#1A2A38',fontSize:'0.58rem',fontStyle:'italic'}}>No chart overlays loaded</div>}
          </div>
        )}
      </div>

      {/* ── ☰ SETTINGS MENU SHEET (Item 1,3,4,6 categories) ── */}
      {showMenu&&(
        <div style={{position:'absolute',inset:0,zIndex:800,background:'rgba(0,0,0,0.55)'}} onClick={()=>setShowMenu(false)}>
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#030A15',borderTop:'1px solid rgba(0,212,255,0.2)',borderRadius:'14px 14px 0 0',padding:'14px 16px',maxHeight:'75vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>

            {/* Category tabs */}
            <div style={{display:'flex',gap:4,marginBottom:14}}>
              {[['colors','🎨 Colors'],['track','📍 Track'],['eta','⏱ ETA'],['display','🗺️ Display']].map(([c,l])=>(
                <button key={c} onClick={()=>setMenuCat(c)} style={{flex:1,background:menuCat===c?'rgba(0,212,255,0.15)':'#060F1C',border:`1px solid ${menuCat===c?'#00D4FF':'#152030'}`,color:menuCat===c?'#00D4FF':'#4A6080',borderRadius:6,padding:'5px 3px',fontSize:'0.6rem',cursor:'pointer'}}>{l}</button>
              ))}
            </div>

            {/* 🎨 COLORS (Item 1) */}
            {menuCat==='colors'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{color:'#2A4055',fontSize:'0.6rem',letterSpacing:0.5}}>TAP SWATCH TO CHANGE COLOR</div>
                {[['route','Route / Track Line'],['vector','COG Vector'],['ship','Ship Icon'],['track','Past Track'],['xtd','XTD Corridor']].map(([key,label])=>(
                  <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:16,height:16,borderRadius:3,background:colors[key],border:'1px solid rgba(255,255,255,0.2)'}}/>
                      <span style={{color:'#b0c8d8',fontSize:'0.74rem'}}>{label}</span>
                    </div>
                    <input type="color" value={colors[key]} onChange={e=>{
                      const nc={...colors,[key]:e.target.value};
                      setColors(nc);localStorage.setItem('nav_colors',JSON.stringify(nc));
                    }} style={{width:36,height:26,border:'none',borderRadius:5,cursor:'pointer',background:'transparent'}}/>
                  </div>
                ))}
                <button onClick={()=>{setColors(DEFAULT_COLORS);localStorage.setItem('nav_colors',JSON.stringify(DEFAULT_COLORS));}} style={{marginTop:4,background:'transparent',border:'1px solid #1A3050',color:'#4A6080',borderRadius:5,padding:'5px',fontSize:'0.62rem',cursor:'pointer'}}>↺ Reset to defaults</button>
              </div>
            )}

            {/* 📍 TRACK (Item 4) */}
            {menuCat==='track'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{color:'#2A4055',fontSize:'0.6rem',letterSpacing:0.5}}>PAST TRACK DURATION</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {[[0,'OFF'],[1,'1 HR'],[2,'2 HR'],[6,'6 HR'],[12,'12 HR'],[24,'24 HR']].map(([h,l])=>(
                    <button key={h} onClick={()=>{setTrackHours(h);localStorage.setItem('nav_trackHours',h);}} style={{...btn(trackHours===h,'#00FF88','0.65rem'),padding:'5px 10px',borderRadius:6}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{color:'#2A4055',fontSize:'0.6rem',lineHeight:1.5}}>Track is stored in memory only. Clears on page reload. Up to 24h of positions are kept internally at all times — select a window to display.</div>
              </div>
            )}

            {/* ⏱ ETA (Item 3) */}
            {menuCat==='eta'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {etaResult?(
                  <>
                    <div style={{background:'#020810',borderRadius:7,padding:'10px 12px',border:'1px solid rgba(0,255,136,0.2)'}}>
                      <div style={{color:'#2A4055',fontSize:'0.55rem',marginBottom:4}}>ESTIMATED ARRIVAL</div>
                      <div style={{color:'#00FF88',fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700,lineHeight:1.7}}>
                        {fmtArrival(etaResult.hours,etaTimezone)}<br/>
                        <span style={{fontSize:'0.65rem',color:'#00D4FF'}}>Remain: {etaResult.remainNM} NM · {etaResult.hrs}h {etaResult.mins}m</span>
                      </div>
                    </div>
                    <div>
                      <div style={{color:'#2A4055',fontSize:'0.6rem',marginBottom:4}}>DISPLAY TIMEZONE</div>
                      <select value={etaTimezone} onChange={e=>{setEtaTimezone(e.target.value);localStorage.setItem('nav_etaTz',e.target.value);}} style={{width:'100%',background:'#060F1C',color:'#00D4FF',border:'1px solid #152030',borderRadius:5,padding:'5px',fontSize:'0.68rem'}}>
                        {TZ_LIST.map(tz=><option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{color:'#2A4055',fontSize:'0.6rem',marginBottom:4}}>REQUIRED SPEED CALCULATOR</div>
                      <div style={{color:'#4A6080',fontSize:'0.58rem',marginBottom:4}}>Set target arrival time → calculates required SOG</div>
                      <input type="datetime-local" value={etaTargetDT} onChange={e=>setEtaTargetDT(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:'#b0c8d8',border:'1px solid #152030',borderRadius:5,padding:'5px',fontSize:'0.65rem',marginBottom:6}}/>
                      {reqSpeed&&(
                        <div style={{background:'#020810',borderRadius:5,padding:'8px 10px',border:'1px solid rgba(255,215,0,0.25)'}}>
                          <div style={{color:'#2A4055',fontSize:'0.55rem'}}>REQUIRED SPEED</div>
                          <div style={{color:'#FFD700',fontFamily:'monospace',fontSize:'1.1rem',fontWeight:700}}>{reqSpeed} kn</div>
                        </div>
                      )}
                      {etaTargetDT&&!reqSpeed&&<div style={{color:'#FF4757',fontSize:'0.6rem'}}>Target time is in the past</div>}
                    </div>
                  </>
                ):(
                  <div style={{color:'#2A4055',fontSize:'0.65rem',fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Load a route and enable GPS to see ETA</div>
                )}
              </div>
            )}

            {/* 🗺️ DISPLAY (Item 5, 6) */}
            {menuCat==='display'&&(
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div>
                  <div style={{color:'#2A4055',fontSize:'0.6rem',marginBottom:4}}>MAP ORIENTATION</div>
                  <div style={{display:'flex',gap:4}}>
                    {[['north','N↑ North Up'],['course','C↑ Course Up'],['head','H↑ Head Up']].map(([m,l])=>(
                      <button key={m} onClick={()=>setDisplayMode(m)} style={{...btn(displayMode===m,'#00D4FF','0.63rem'),flex:1,padding:'6px 4px',borderRadius:6}}>{l}</button>
                    ))}
                  </div>
                  <div style={{color:'#2A4055',fontSize:'0.57rem',marginTop:4}}>Course/Head Up uses leaflet-rotate plugin. Enable GPS first for bearing.</div>
                </div>
                <div>
                  <div style={{color:'#2A4055',fontSize:'0.6rem',marginBottom:4}}>MAP STYLE</div>
                  <div style={{display:'flex',gap:4}}>
                    {[['night','🌙 Night'],['day','☀️ Day'],['dusk','🌆 Dusk']].map(([m,l])=>(
                      <button key={m} onClick={()=>setMapMode(m)} style={{...btn(mapMode===m,'#FFD700','0.63rem'),flex:1,padding:'6px 4px',borderRadius:6}}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{color:'#2A4055',fontSize:'0.6rem',marginBottom:4}}>GPS CENTER MODE (Item 6)</div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setAutoCenterRaw(true)} style={{...btn(autoCenter,'#00FF88','0.65rem'),flex:1,padding:'6px',borderRadius:6}}>🎯 Look-Ahead</button>
                    <button onClick={()=>setAutoCenterRaw(false)} style={{...btn(!autoCenter,'#FFD700','0.65rem'),flex:1,padding:'6px',borderRadius:6}}>🖐 Free Nav</button>
                  </div>
                  <div style={{color:'#2A4055',fontSize:'0.57rem',marginTop:4}}>Free Nav: drag map freely. Look-Ahead: ship kept in lower portion of screen for better ahead-view.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
