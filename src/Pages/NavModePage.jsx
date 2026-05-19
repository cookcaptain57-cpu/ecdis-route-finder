/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import ETACalculator from "../components/ETACalculator"; // Item 9

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const AISSTREAM_KEY = 'e66d76190c2bf6c206264e3cb894308b853d73df'; // Item 8

const DEFAULT_COLORS = {
  route:'#E74C3C', vector:'#00D4FF', ship:'#00D4FF', track:'#00FF88', xtd:'#FFB300',
};

// ── ITEM 1: DMS FORMAT HELPER ──────────────────────────────────────────────
const toDMS = (decimal, isLat) => {
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFull = (abs - deg) * 60;
  const min = Math.floor(minFull);
  const sec = ((minFull - min) * 60).toFixed(1);
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W');
  return `${deg}°${String(min).padStart(2,'0')}'${String(sec).padStart(4,'0')}"${dir}`;
};

// ── ITEM 7: ANTIMERIDIAN FIX ───────────────────────────────────────────────
// Makes consecutive longitudes continuous so routes don't break at 180°E/W.
const normalizeRouteCoords = (waypoints) => {
  if (!waypoints?.length) return waypoints;
  const out = [{ ...waypoints[0] }];
  for (let i = 1; i < waypoints.length; i++) {
    let lon = waypoints[i].lon;
    const prevLon = out[i - 1].lon;
    while (lon - prevLon > 180) lon -= 360;
    while (prevLon - lon > 180) lon += 360;
    out.push({ ...waypoints[i], lon });
  }
  return out;
};

// ── COMPONENT ──────────────────────────────────────────────────────────────
export default function NavModePage({ notify, sheetRoutes = [], portsDb = [], setTab }) {

  // ── EXISTING REFS ──
  const mapRef         = useRef(null);
  const leafRef        = useRef(null);
  const baseTileRef    = useRef(null);
  const seamarkRef     = useRef(null);
  const gebcoRefTile   = useRef(null);
  const emodnetTileRef = useRef(null);
  const encTileRef     = useRef(null);

  const layersRef = useRef({
    route:null, vessel:null, vector:null,
    ais:{}, trailLine:null, trail:[],
    routeMarkers:[], rbLine:null, rbMarker:null,
    xtdPort:null, xtdStbd:null, xtdFill:null,
    pastTrack:null,
  });

  const chartLayersRef    = useRef([]);
  const aisWsRef          = useRef(null);
  const invalidateTimers  = useRef([]);
  const pastTrackRef      = useRef([]);

  // Refs readable inside once-registered callbacks
  const rbModeRef         = useRef(false);
  const livePosRef        = useRef(null);
  const vectorMinsRef     = useRef(6);
  const colorsRef         = useRef(DEFAULT_COLORS);
  const rbTargetRef       = useRef(null);
  const trackHoursRef     = useRef(0);
  const autoCenterRef     = useRef(true);
  const hudDragRef        = useRef(null);
  const mapBearingRef     = useRef(0);   // ADD Item 6: track current map bearing
  const depthCheckOnRef   = useRef(false); // ADD Item 3: depth check mode
  const contoursRef       = useRef({ shallow:10, safety:20, deep:200 }); // ADD Item 3
  const aisRangeRef       = useRef(0);   // ADD Item 8: current AIS range filter

  // ── EXISTING STATE ──
  const [mapReady,    setMapReady]     = useState(false);
  const [gpsOn,       setGpsOn]        = useState(() => localStorage.getItem('nav_gpsOn')==='true');
  const [aisOn,       setAisOn]        = useState(() => localStorage.getItem('nav_aisOn')==='true');
  const [gebcoOn,     setGebcoOn]      = useState(() => localStorage.getItem('nav_gebcoOn')==='true');
  const [aisTargets,  setAisTargets]   = useState({});
  const [autoCenter,  setAutoCenterRaw]= useState(() => localStorage.getItem('nav_autoCenter')!=='false');

  // ── NEW STATE ──
  const [mapMode,       setMapMode]      = useState(() => localStorage.getItem('nav_mapMode')||'night');
  const [displayMode,   setDisplayMode]  = useState(() => localStorage.getItem('nav_displayMode')||'north');
  const [activeRoute,   setActiveRoute]  = useState(() => { try{return JSON.parse(localStorage.getItem('nav_activeRoute')||'null');}catch{return null;} });
  const [livePos,       setLivePos]      = useState(null);
  const [selectedWpIdx, setSelectedWpIdx]= useState(0);
  const [rbMode,        setRbMode]       = useState(false);
  const [rbResult,      setRbResult]     = useState(null);
  const [etaResult,     setEtaResult]    = useState(null);
  const [activePanel,   setActivePanel]  = useState('route');
  const [vectorMins,    setVectorMins]   = useState(() => Number(localStorage.getItem('nav_vectorMins')||6));
  const [colors,        setColors]       = useState(() => { try{return JSON.parse(localStorage.getItem('nav_colors')||'null')||DEFAULT_COLORS;}catch{return DEFAULT_COLORS;} });
  const [hudCollapsed,  setHudCollapsed] = useState(() => localStorage.getItem('nav_hudCollapsed')==='true');
  const [togCollapsed,  setTogCollapsed] = useState(() => localStorage.getItem('nav_togCollapsed')==='true'); // Item 5
  const [panelCollapsed,setPanelCollapsed]= useState(false); // Item 5
  const [hudPos,        setHudPos]       = useState(() => { try{return JSON.parse(localStorage.getItem('nav_hudPos')||'{"x":8,"y":54}');}catch{return {x:8,y:54};} });
  const [trackHours,    setTrackHours]   = useState(() => Number(localStorage.getItem('nav_trackHours')||0));
  const [savedRoutes,   setSavedRoutes]  = useState(() => { try{return JSON.parse(localStorage.getItem('nav_savedRoutes')||'[]');}catch{return [];} });
  const [savedSearch,   setSavedSearch]  = useState('');
  const [dbSearch,      setDbSearch]     = useState('');  // Item 2: separate DB search state
  const [chartOverlays, setChartOverlays]= useState([]);
  const [showMenu,      setShowMenu]     = useState(false);
  const [menuCat,       setMenuCat]      = useState('colors');
  // Item 8: AIS range filter
  const [aisRange,      setAisRange]     = useState(() => Number(localStorage.getItem('nav_aisRange')||0));
  // Item 3: depth contours
  const [shallowDepth,  setShallowDepth] = useState(() => Number(localStorage.getItem('nav_shallowDepth')||10));
  const [safetyDepth,   setSafetyDepth]  = useState(() => Number(localStorage.getItem('nav_safetyDepth')||20));
  const [deepDepth,     setDeepDepth]    = useState(() => Number(localStorage.getItem('nav_deepDepth')||200));
  const [shipDraft,     setShipDraft]    = useState(() => Number(localStorage.getItem('nav_draft')||6));
  const [depthCheckOn,  setDepthCheckOn] = useState(false);

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

  // ── EXISTING: CPA / TCPA ──
  const calcCPA = (own,tgt) => {
    const dx=tgt.lon-own.lon,dy=tgt.lat-own.lat;
    const tcpaHours=((dx*tgt.cog-dy*own.cog)||0)/1000;
    return {cpa:distanceNM(own.lat,own.lon,tgt.lat,tgt.lon),tcpa:Math.max(tcpaHours,0)};
  };

  // ── EXISTING: COLREG ──
  const getCOLREG = (own,tgt) => {
    const bearing=(Math.atan2(tgt.lon-own.lon,tgt.lat-own.lat)*180)/Math.PI+360;
    const rel=(bearing-own.cog+360)%360;
    if(rel>345||rel<15)      return "HEAD-ON ⚠";
    if(rel>112.5&&rel<247.5) return "OVERTAKING ⚠";
    if(rel>15&&rel<112.5)    return "CROSSING (STBD GIVE WAY)";
    if(rel>247.5&&rel<345)   return "CROSSING (YOU GIVE WAY)";
    return "SAFE";
  };

  const calcBearing = (lat1,lon1,lat2,lon2) => {
    const D=Math.PI/180,dLon=(lon2-lon1)*D;
    const y=Math.sin(dLon)*Math.cos(lat2*D);
    const x=Math.cos(lat1*D)*Math.sin(lat2*D)-Math.sin(lat1*D)*Math.cos(lat2*D)*Math.cos(dLon);
    return ((Math.atan2(y,x)/D)+360)%360;
  };

  const offsetPoint = (lat,lon,bearingDeg,distNM) => {
    const R=3440.065,d=distNM/R,b=bearingDeg*Math.PI/180;
    const φ1=lat*Math.PI/180,λ1=lon*Math.PI/180;
    const φ2=Math.asin(Math.sin(φ1)*Math.cos(d)+Math.cos(φ1)*Math.sin(d)*Math.cos(b));
    const λ2=λ1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(φ1),Math.cos(d)-Math.sin(φ1)*Math.sin(φ2));
    return [φ2*180/Math.PI,λ2*180/Math.PI];
  };

  // ── SAVED ROUTES ──
  const saveCurrentRoute = () => {
    if(!activeRoute) return;
    setSavedRoutes(prev=>{
      const idx=prev.findIndex(r=>r.name===activeRoute.name);
      const updated=idx>=0?prev.map((r,i)=>i===idx?activeRoute:r):[activeRoute,...prev].slice(0,100);
      localStorage.setItem('nav_savedRoutes',JSON.stringify(updated));
      return updated;
    });
    notify(`✓ Saved: ${activeRoute.name}`,'error');
  };
  const deleteSavedRoute = (name) => {
    setSavedRoutes(prev=>{const u=prev.filter(r=>r.name!==name);localStorage.setItem('nav_savedRoutes',JSON.stringify(u));return u;});
  };

  // ── ROUTE FILE PARSERS ──
  const tryParseXml = (text,filename) => {
    try {
      const doc=new DOMParser().parseFromString(text,'application/xml');
      if(doc.querySelector('parsererror')) return null;
      const wps=[];
      doc.querySelectorAll('waypoint,Waypoint').forEach(w=>{
        const pos=w.querySelector('position,Position');if(!pos) return;
        const lat=parseFloat(pos.getAttribute('lat')||pos.getAttribute('Lat'));
        const lon=parseFloat(pos.getAttribute('lon')||pos.getAttribute('Lon'));
        if(!isNaN(lat)&&!isNaN(lon)) wps.push({lat,lon,name:w.getAttribute('name')||w.getAttribute('Name')||''});
      });
      if(!wps.length) doc.querySelectorAll('rtept,wpt,trkpt').forEach(pt=>{
        const lat=parseFloat(pt.getAttribute('lat')),lon=parseFloat(pt.getAttribute('lon'));
        if(!isNaN(lat)&&!isNaN(lon)) wps.push({lat,lon,name:pt.querySelector('name')?.textContent?.trim()||''});
      });
      if(!wps.length) doc.querySelectorAll('WP,wp,Point,point,Wpt').forEach(el=>{
        const lat=parseFloat(el.getAttribute('Lat')||el.getAttribute('lat')||el.getAttribute('latitude'));
        const lon=parseFloat(el.getAttribute('Lon')||el.getAttribute('lon')||el.getAttribute('longitude'));
        if(!isNaN(lat)&&!isNaN(lon)) wps.push({lat,lon,name:el.getAttribute('Name')||el.getAttribute('name')||''});
      });
      if(!wps.length) return null;
      const nm=doc.querySelector('route,Route')?.getAttribute('name')||doc.querySelector('route,Route')?.getAttribute('Name')||doc.querySelector('gpx>metadata>name,rte>name')?.textContent?.trim()||filename;
      return {name:nm,waypoints:wps};
    } catch{return null;}
  };
  const tryParseJson = (text,filename) => {
    try{const p=JSON.parse(text);if(Array.isArray(p)){const w=p.filter(x=>x.lat!=null&&x.lon!=null);if(w.length) return {name:filename,waypoints:w};}const w=p.waypoints||p.Waypoints||p.route?.waypoints;if(w?.length) return {name:p.name||p.Name||filename,waypoints:w};return null;}catch{return null;}
  };
  const tryParseDelimited = (text,filename) => {
    try{
      const lines=text.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
      const wps=[];
      for(const line of lines){
        if(/^(lat|lon|name|waypoint|wp|no\.|id)/i.test(line)) continue;
        const parts=line.split(/[,\t;|]+/).map(p=>p.replace(/["']/g,'').trim());
        if(parts.length<2) continue;
        let lat=parseFloat(parts[0]),lon=parseFloat(parts[1]),name=parts[2]||'';
        if(!isNaN(parseFloat(parts[0]))&&isNaN(parseFloat(parts[1]))&&parts.length>=3){lat=parseFloat(parts[1]);lon=parseFloat(parts[2]);name=parts[3]||'';}
        if(!isNaN(lat)&&!isNaN(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180) wps.push({lat,lon,name});
      }
      return wps.length?{name:filename,waypoints:wps}:null;
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
    reader.onload=(ev)=>{try{const route=parseRouteFile(ev.target.result,file.name);if(!route?.waypoints?.length) throw new Error('No waypoints');setActiveRoute(route);setSelectedWpIdx(route.waypoints.length-1);notify(`✓ ${route.name} (${route.waypoints.length} WPs)`,'error');}catch(err){notify(`Load failed: ${err.message}`,'error');}};
    reader.readAsText(file);e.target.value='';
  };

  // ── CHART FILE PARSERS ──
  const tryParseGeoJSON=(text,filename)=>{try{const d=JSON.parse(text);if(['FeatureCollection','Feature','Point','LineString','Polygon','MultiPoint','MultiLineString','MultiPolygon'].includes(d.type)) return {type:'geojson',name:filename,data:d};return null;}catch{return null;}};
  const tryParseKML=(text,filename)=>{
    try{
      const doc=new DOMParser().parseFromString(text,'application/xml');
      if(doc.querySelector('parsererror')) return null;
      const features=[],pc=str=>str.trim().split(/\s+/).map(p=>{const[lo,la]=p.split(',').map(Number);return(!isNaN(la)&&!isNaN(lo))?[lo,la]:null;}).filter(Boolean);
      doc.querySelectorAll('Placemark').forEach(pm=>{
        const name=pm.querySelector('name')?.textContent?.trim()||'';
        const ptEl=pm.querySelector('Point coordinates');if(ptEl){pc(ptEl.textContent).forEach(([lo,la])=>features.push({type:'Feature',properties:{name},geometry:{type:'Point',coordinates:[lo,la]}}));}
        const lsEl=pm.querySelector('LineString coordinates');if(lsEl){const c=pc(lsEl.textContent);if(c.length) features.push({type:'Feature',properties:{name},geometry:{type:'LineString',coordinates:c}});}
        const pgEl=pm.querySelector('Polygon outerBoundaryIs LinearRing coordinates');if(pgEl){const c=pc(pgEl.textContent);if(c.length) features.push({type:'Feature',properties:{name},geometry:{type:'Polygon',coordinates:[c]}});}
      });
      if(!features.length) return null;
      return {type:'geojson',name:doc.querySelector('Document>name')?.textContent?.trim()||filename,data:{type:'FeatureCollection',features}};
    }catch{return null;}
  };
  const loadChartFile=(e)=>{
    const file=e.target.files?.[0];if(!file) return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const text=ev.target.result;
        const overlay=tryParseGeoJSON(text,file.name)||tryParseKML(text,file.name);
        if(!overlay) throw new Error('Unsupported format. Use GeoJSON or KML.');
        if(leafRef.current&&window.L){const L=window.L;const layer=L.geoJSON(overlay.data,{style:{color:'#00FFFF',weight:1.5,opacity:0.85,fillColor:'#00FFFF',fillOpacity:0.08},pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:5,color:'#00FFFF',fillOpacity:0.9}).bindPopup(f.properties?.name||file.name),onEachFeature:(f,l)=>{if(f.properties?.name) l.bindTooltip(f.properties.name);}}).addTo(leafRef.current);chartLayersRef.current.push({id:overlay.name,layer});}
        setChartOverlays(prev=>[...prev,{name:overlay.name}]);notify(`✓ Chart: ${overlay.name}`,'error');
      }catch(err){notify(`Chart failed: ${err.message}`,'error');}
    };
    reader.readAsText(file);e.target.value='';
  };
  const removeChart=(name)=>{const idx=chartLayersRef.current.findIndex(c=>c.id===name);if(idx>=0){try{leafRef.current?.removeLayer(chartLayersRef.current[idx].layer);}catch{}chartLayersRef.current.splice(idx,1);}setChartOverlays(prev=>prev.filter(c=>c.name!==name));};

  // ── EXISTING: AIS STREAM — Item 8: real key, world bbox, client-side range filter ──
  useEffect(()=>{
    if(!aisOn){aisWsRef.current?.close();aisWsRef.current=null;return;}
    const ws=new WebSocket("wss://stream.aisstream.io/v0/stream");
    aisWsRef.current=ws;
    ws.onopen=()=>ws.send(JSON.stringify({
      APIkey: AISSTREAM_KEY,                        // correct casing per aisstream docs
      BoundingBoxes:[[[-90,-180],[90,180]]],        // triple-nested: [[ [sw], [ne] ]]
      FilterMessageTypes:["PositionReport"],
    }));
    ws.onmessage=(msg)=>{try{const d=JSON.parse(msg.data);const p=d?.Message?.PositionReport,m=d?.MetaData;if(!p||!m) return;setAisTargets(prev=>({...prev,[m.MMSI]:{mmsi:m.MMSI,lat:p.Latitude,lon:p.Longitude,cog:p.CourseOverGround||0,sog:p.SpeedOverGround||0,name:m.ShipName||''}}));}catch{}};
    ws.onerror=()=>notify("AIS connection error","error");
    ws.onclose=(e)=>{if(e.code!==1000) notify("AIS stream closed","error");};
    return()=>ws.close();
  },[aisOn]);

  // ── MODIFIED: GPS FIX — Item 6: compensate ship icon for map bearing ──
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

          const now=Date.now();
          pastTrackRef.current.push({lat,lon,t:now});
          pastTrackRef.current=pastTrackRef.current.filter(p=>p.t>now-24*3600000);

          if(!leafRef.current||!window.L) return;
          const L=window.L,c=colorsRef.current;

          // Item 6 FIX: compensate icon rotation for current map bearing
          // Without this, Course Up / Head Up causes double-rotation on the ship symbol
          const iconRotation=(cog-mapBearingRef.current+360)%360;
          const shipIcon=L.divIcon({
            html:`<div style="transform:rotate(${iconRotation}deg);transform-origin:center;width:20px;height:28px;">
              <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                <polygon points="10,1 19,27 10,21 1,27" fill="${c.ship}" stroke="#fff" stroke-width="1.5"/>
              </svg>
            </div>`,
            className:'',iconSize:[20,28],iconAnchor:[10,14],
          });

          if(!layersRef.current.vessel){layersRef.current.vessel=L.marker([lat,lon],{icon:shipIcon,zIndexOffset:1000}).addTo(leafRef.current);}
          else{layersRef.current.vessel.setLatLng([lat,lon]);layersRef.current.vessel.setIcon(shipIcon);}

          const RAD=Math.PI/180,lookNM=Math.max(sog,0.3)*(vectorMinsRef.current/60);
          const vLat=lat+(lookNM/60)*Math.cos(cog*RAD),vLon=lon+(lookNM/60)*Math.sin(cog*RAD);
          if(layersRef.current.vector){layersRef.current.vector.setLatLngs([[lat,lon],[vLat,vLon]]);layersRef.current.vector.setStyle({color:c.vector});}
          else{layersRef.current.vector=L.polyline([[lat,lon],[vLat,vLon]],{color:c.vector,weight:2,opacity:0.85,dashArray:'5 3'}).addTo(leafRef.current);}

          const th=trackHoursRef.current;
          if(th>0){
            const cutoff=now-th*3600000;
            const pts=pastTrackRef.current.filter(p=>p.t>cutoff).map(p=>[p.lat,p.lon]);
            if(pts.length>1){if(layersRef.current.pastTrack){layersRef.current.pastTrack.setLatLngs(pts);layersRef.current.pastTrack.setStyle({color:c.track});}else{layersRef.current.pastTrack=L.polyline(pts,{color:c.track,weight:2,opacity:0.7}).addTo(leafRef.current);}}
          }else if(layersRef.current.pastTrack){leafRef.current.removeLayer(layersRef.current.pastTrack);layersRef.current.pastTrack=null;}

          if(rbModeRef.current&&rbTargetRef.current){
            const tgt=rbTargetRef.current;
            const rangeNM=distanceNM(lat,lon,tgt.lat,tgt.lon);
            const bearing=calcBearing(lat,lon,tgt.lat,tgt.lon);
            setRbResult({rangeNM:rangeNM.toFixed(2),bearing:bearing.toFixed(1),lat:tgt.lat.toFixed(5),lon:tgt.lon.toFixed(5)});
            if(layersRef.current.rbLine) layersRef.current.rbLine.setLatLngs([[lat,lon],[tgt.lat,tgt.lon]]);
          }

          if(autoCenterRef.current){
            try{const map=leafRef.current,sz=map.getSize(),pt=map.project([lat,lon],map.getZoom());map.panTo(map.unproject(pt.subtract([0,sz.y*0.2]),map.getZoom()),{animate:true,duration:0.3});}
            catch{leafRef.current.panTo([lat,lon]);}
          }
        }catch(err){console.warn('[NavMode GPS]',err);}
      },
      ()=>notify("GPS error","error"),
      {enableHighAccuracy:true,maximumAge:0,timeout:30000}
    );
    return()=>navigator.geolocation.clearWatch(id);
  },[gpsOn]);

  // ── EXISTING: AIS RENDER — Item 8: range filter, fixed CPA with actual own COG/SOG ──
  useEffect(()=>{
    if(!leafRef.current||!window.L) return;
    const L=window.L;
    Object.values(layersRef.current.ais).forEach(m=>{try{leafRef.current.removeLayer(m);}catch{}});
    layersRef.current.ais={};
    const range=aisRangeRef.current;
    const pos=livePosRef.current;
    Object.values(aisTargets).forEach(v=>{
      if(!v.lat||!v.lon) return;
      // Item 8: client-side range filter
      if(range>0&&pos){const d=distanceNM(pos.lat,pos.lon,v.lat,v.lon);if(d>range) return;}
      const ownLL=layersRef.current.vessel?.getLatLng();
      // Fix: use actual COG and SOG from livePosRef (was passing cog:0)
      const cpaData=ownLL&&pos?calcCPA({lat:ownLL.lat,lon:ownLL.lng,cog:pos.cog,sog:pos.sog},v):null;
      const colreg=ownLL&&pos?getCOLREG({lat:ownLL.lat,lon:ownLL.lng,cog:pos.cog},v):"N/A";
      const color=cpaData?.cpa<1?"#FF3030":cpaData?.cpa<3?"#FF9500":"#00D4FF";
      const rangeToTarget=ownLL&&pos?distanceNM(pos.lat,pos.lon,v.lat,v.lon).toFixed(1):'—';
      const marker=L.circleMarker([v.lat,v.lon],{radius:7,color,fillColor:color,fillOpacity:0.7,weight:2})
        .bindPopup(`<div style="font-size:13px;min-width:190px;line-height:1.7;padding:4px">
          <b style="color:${color}">🚢 ${v.name||'AIS Vessel'}</b><br/>
          <span style="font-size:11px;color:#aaa">MMSI: ${v.mmsi}</span><br/>
          <b>SOG</b>: ${v.sog?.toFixed(1)} kn &nbsp; <b>COG</b>: ${v.cog?.toFixed(0)}°<br/>
          <b>Range</b>: ${rangeToTarget} NM<br/>
          <hr style="margin:4px 0;border-color:#333"/>
          <b>CPA</b>: ${cpaData?.cpa?.toFixed(2)||'—'} NM &nbsp;
          <b>TCPA</b>: ${cpaData?.tcpa?.toFixed(1)||'—'} h<br/>
          <b>COLREG</b>: ${colreg}<br/>
          ${cpaData?.cpa<1.5?'<span style="color:#FF3030;font-weight:700">⚠ COLLISION RISK</span>':''}
        </div>`)
        .addTo(leafRef.current);
      layersRef.current.ais[v.mmsi]=marker;
      if(cpaData?.cpa<1.5) notify(`⚠ CPA Risk: MMSI ${v.mmsi} — ${cpaData?.cpa?.toFixed(1)} NM`,"error");
    });
  },[aisTargets,livePos]); // livePos dep ensures range filter updates as ship moves

  // ── TILE SWAP — new layered architecture ──
  // Base map ALWAYS uses mapMode (night/day/dusk) — never overridden.
  // Depth layers (EMODnet + ESRI Reference + NOAA ENC) are ADDED ON TOP when gebcoOn.
  // This fixes night/day/dusk being stuck when depth was toggled on.
  //
  // Layer order (bottom → top):
  //   1. OSM/Carto base (night / day / dusk)        — always
  //   2. EMODnet depth shading                       — when gebcoOn, Europe+global
  //   3. ESRI Ocean Reference (depth numbers, z≥9)  — when gebcoOn, global
  //   4. NOAA ENC WMS (detailed, z≥7)              — when gebcoOn, USA waters
  //   5. OpenSeaMap seamarks                         — always on top
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L, map=leafRef.current;

    // Remove all depth + seamark layers — base tile stays unless mapMode changed
    [gebcoRefTile,seamarkRef,emodnetTileRef,encTileRef].forEach(r=>{
      if(r.current){try{map.removeLayer(r.current);}catch{}r.current=null;}
    });
    // Remove base only if mode changed (baseTileRef tracks last mapMode url)
    const TILES={
      night:{url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',          attr:'© CARTO © OpenStreetMap'},
      day:  {url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',attr:'© CARTO © OpenStreetMap'},
      dusk: {url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',attr:'© CARTO © OpenStreetMap'},
    };
    const cfg=TILES[mapMode]||TILES.night;
    if(baseTileRef.current) { try{map.removeLayer(baseTileRef.current);}catch{} baseTileRef.current=null; }
    // Layer 1: base map — always mapMode, never overridden by depth toggle
    baseTileRef.current=L.tileLayer(cfg.url,{
      subdomains:'abcd', attribution:cfg.attr, maxZoom:20,
    }).addTo(map);

    if(gebcoOn){
      // Layer 2: EMODnet bathymetry — worldwide depth colour zones
      // Global coverage via GEBCO-based EMODnet mosaic. Caps at zoom 11 (overview).
      try{
        emodnetTileRef.current=L.tileLayer(
          'https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png',
          {attribution:'© EMODnet Bathymetry',maxZoom:11,opacity:0.55,
           errorTileUrl:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}
        ).addTo(map);
      }catch{}

      // Layer 3: ESRI Ocean Reference — depth soundings (numbers) at zoom ≥9, global
      // Shows individual metre values, shipping lanes, port names worldwide.
      gebcoRefTile.current=L.tileLayer(
        'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        {maxZoom:18,attribution:'Tiles © Esri — GEBCO NOAA National Geographic',opacity:1.0}
      ).addTo(map);

      // Layer 4: NOAA ENC WMS — detailed S-57 ENC rendering for USA waters
      // Automatically invisible outside US coverage area (transparent tiles).
      try{
        encTileRef.current=L.tileLayer.wms(
          'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer',
          {layers:'0,1,2,3,4,5,6,7',format:'image/png',transparent:true,
           version:'1.3.0',attribution:'© NOAA ENC Online',opacity:0.9,maxZoom:18}
        ).addTo(map);
      }catch{}
    }

    // Layer 5: OpenSeaMap seamarks — always on top (depth contours, buoys, lights)
    seamarkRef.current=L.tileLayer(
      'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      {opacity:gebcoOn?0.9:0.6,maxZoom:18,attribution:'© OpenSeaMap'}
    ).addTo(map);

  },[gebcoOn,mapMode,mapReady]);

  // ── REF SYNCS ──
  useEffect(()=>{rbModeRef.current=rbMode;},[rbMode]);
  useEffect(()=>{vectorMinsRef.current=vectorMins;},[vectorMins]);
  useEffect(()=>{colorsRef.current=colors;},[colors]);
  useEffect(()=>{trackHoursRef.current=trackHours;},[trackHours]);
  useEffect(()=>{autoCenterRef.current=autoCenter;},[autoCenter]);
  useEffect(()=>{aisRangeRef.current=aisRange;},[aisRange]);
  useEffect(()=>{depthCheckOnRef.current=depthCheckOn;},[depthCheckOn]);
  useEffect(()=>{contoursRef.current={shallow:shallowDepth,safety:safetyDepth,deep:deepDepth,draft:shipDraft};},[shallowDepth,safetyDepth,deepDepth,shipDraft]);

  // ── PERSIST ALL PREFERENCES (Item 9) ──
  useEffect(()=>{localStorage.setItem('nav_mapMode',mapMode);},[mapMode]);
  useEffect(()=>{localStorage.setItem('nav_displayMode',displayMode);},[displayMode]);
  useEffect(()=>{localStorage.setItem('nav_gpsOn',gpsOn);},[gpsOn]);
  useEffect(()=>{localStorage.setItem('nav_aisOn',aisOn);},[aisOn]);
  useEffect(()=>{localStorage.setItem('nav_gebcoOn',gebcoOn);},[gebcoOn]);
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
  useEffect(()=>{if(activeRoute) localStorage.setItem('nav_activeRoute',JSON.stringify(activeRoute));else localStorage.removeItem('nav_activeRoute');},[activeRoute]);

  // ── ROUTE RENDER — Item 7: antimeridian normalization ──
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L,map=leafRef.current,lrs=layersRef.current;
    if(lrs.route){map.removeLayer(lrs.route);lrs.route=null;}
    lrs.routeMarkers?.forEach(m=>{try{map.removeLayer(m);}catch{}});lrs.routeMarkers=[];
    [lrs.xtdPort,lrs.xtdStbd,lrs.xtdFill].forEach(l=>{if(l) try{map.removeLayer(l);}catch{}});
    lrs.xtdPort=lrs.xtdStbd=lrs.xtdFill=null;
    if(!activeRoute?.waypoints?.length) return;
    // Item 7: normalize coordinates across the antimeridian
    const wps=normalizeRouteCoords(activeRoute.waypoints);
    const c=colors;
    lrs.route=L.polyline(wps.map(w=>[w.lat,w.lon]),{color:c.route,weight:2.5,opacity:0.9,dashArray:'8 4'}).addTo(map);
    wps.forEach((wp,i)=>{
      const isFirst=i===0,isLast=i===wps.length-1;
      const col=isFirst?'#00C896':isLast?'#FF4757':c.route,sz=isFirst||isLast?14:8;
      const icon=L.divIcon({html:`<div style="background:${col};border:2px solid #fff;border-radius:50%;width:${sz}px;height:${sz}px;"></div>`,className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      const m=L.marker([wp.lat,wp.lon],{icon}).bindPopup(`<div style="font-size:13px;min-width:150px"><b style="color:${c.route}">WP${String(i+1).padStart(2,'0')}${wp.name?' — '+wp.name:''}</b><br/>Lat: ${toDMS(wp.lat,true)}<br/>Lon: ${toDMS(wp.lon,false)}</div>`).addTo(map);
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

  // ── ETA CALC — route-following distance (not direct line) ──
  // Previous bug: distanceNM(ship → waypoint) is a great-circle shortcut.
  // For a 4200 NM multi-leg route this gave ~4125 NM (the straight-line chord).
  // Fix: find nearest upcoming waypoint, then sum leg-by-leg to target.
  useEffect(()=>{
    if(!livePos||!activeRoute?.waypoints?.length){setEtaResult(null);return;}
    if(livePos.sog<0.2){setEtaResult(null);return;}
    const wps=activeRoute.waypoints;
    const targetIdx=Math.min(Math.max(selectedWpIdx,0),wps.length-1);

    // Find nearest waypoint (most likely the next one to reach)
    let nearIdx=0, nearDist=Infinity;
    wps.forEach((wp,i)=>{ const d=distanceNM(livePos.lat,livePos.lon,wp.lat,wp.lon); if(d<nearDist){nearDist=d;nearIdx=i;} });

    // Sum: ship → nearIdx → nearIdx+1 → ... → targetIdx
    let remainNM=distanceNM(livePos.lat,livePos.lon,wps[nearIdx].lat,wps[nearIdx].lon);
    for(let i=nearIdx;i<targetIdx;i++){
      remainNM+=distanceNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
    }

    const hours=remainNM/livePos.sog;
    setEtaResult({remainNM:remainNM.toFixed(1),hours,hrs:Math.floor(hours),mins:Math.round((hours%1)*60),wpName:wps[targetIdx].name||`WP${String(targetIdx+1).padStart(2,'0')}`});
  },[livePos,activeRoute,selectedWpIdx]);

  // ── Item 6: MAP ORIENTATION — Course Up / Head Up ──
  // Rotates the map CONTAINER div (mapRef) with CSS transform.
  // HUD and side panel are in the parent div so they stay upright.
  // mapBearingRef is updated so ship icon compensates: iconRotation = cog - mapBearing.
  // Note: in rotated modes, R/B tap coordinates may be slightly offset from visual.
  useEffect(()=>{
    if(!mapReady||!mapRef.current||!leafRef.current) return;
    const bearing = displayMode==='north'  ? 0
      : displayMode==='course' ? (livePos?.cog||0)
      : (livePos?.heading||livePos?.cog||0);
    mapBearingRef.current = bearing;

    // Try leaflet-rotate plugin (proper — corrects click coordinates)
    if(typeof leafRef.current.setBearing==='function'){
      try{ leafRef.current.setBearing(bearing); return; }catch{}
    }
    // Fallback: CSS rotate the map container div
    // Works visually for Course Up / Head Up without plugin
    mapRef.current.style.transform = bearing!==0 ? `rotate(${bearing}deg)` : '';
    mapRef.current.style.transformOrigin = 'center center';
    setTimeout(()=>{ try{leafRef.current?.invalidateSize({animate:false});}catch{} },100);
  },[displayMode,livePos?.cog,livePos?.heading,mapReady]);

  // ── INIT MAP ──
  useEffect(()=>{
    if(leafRef.current) return;
    const initMap=()=>{
      if(!mapRef.current||!window.L) return;
      const L=window.L;
      const opts={center:[20,70],zoom:4};
      if(typeof L.Map.prototype.setBearing==='function'){try{opts.rotate=true;opts.rotateControl=false;}catch{}}
      leafRef.current=L.map(mapRef.current,opts);
      baseTileRef.current=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',attribution:'© CARTO'}).addTo(leafRef.current);
      seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18,attribution:'© OpenSeaMap'}).addTo(leafRef.current);

      leafRef.current.on('click',(e)=>{
        // R/B mode
        if(rbModeRef.current){
          const pos=livePosRef.current;if(!pos){notify('Enable GPS first','error');return;}
          rbTargetRef.current={lat:e.latlng.lat,lon:e.latlng.lng};
          const rNM=distanceNM(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);
          const brg=calcBearing(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);
          setRbResult({rangeNM:rNM.toFixed(2),bearing:brg.toFixed(1),lat:e.latlng.lat.toFixed(5),lon:e.latlng.lng.toFixed(5)});
          if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);
          if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
          layersRef.current.rbLine=L.polyline([[pos.lat,pos.lon],[e.latlng.lat,e.latlng.lng]],{color:'#FFD700',weight:1.5,dashArray:'5 4',opacity:0.85}).addTo(leafRef.current);
          layersRef.current.rbMarker=L.circleMarker([e.latlng.lat,e.latlng.lng],{radius:5,color:'#FFD700',fillColor:'#FFD700',fillOpacity:1}).addTo(leafRef.current);
          return;
        }
        // Depth check — tile-based approach (no per-click API fetch)
        // Real depth values are shown by ESRI Ocean Reference tiles at zoom ≥9.
        // Enable "🌊 Ocean Depth" in the HUD controls, then zoom in to see soundings.
        if(depthCheckOnRef.current){
          const ct=contoursRef.current;
          const popup=L.popup({closeOnClick:true,autoClose:true})
            .setLatLng(e.latlng)
            .setContent(`<div style="font-size:13px;min-width:170px;line-height:1.8;padding:4px">
              <b style="color:#00D4FF">📍 ${toDMS(e.latlng.lat,true)}</b><br/>
              <b style="color:#00D4FF">${toDMS(e.latlng.lng,false)}</b><br/>
              <hr style="margin:4px 0;border-color:#333"/>
              <span style="color:#FFB300">🌊 Depth check — zoom in ≥9</span><br/>
              <span style="color:#888;font-size:11px">ESRI Ocean Reference shows depth<br/>
              soundings (metres) at zoom ≥9.<br/>
              NOAA ENC shows detailed data<br/>in USA waters.</span><br/>
              <hr style="margin:4px 0;border-color:#333"/>
              <span style="font-size:11px">
                🔴 Shallow &lt;${ct.shallow}m &nbsp;
                🟡 Safety &lt;${ct.safety}m<br/>
                🟢 Safe ≥${ct.safety}m &nbsp;
                🔵 Deep &gt;${ct.deep}m
              </span>
            </div>`)
            .openOn(leafRef.current);
          return;
        }
      });

      setMapReady(true);safeInvalidate();
      [100,300,600,1200].forEach(t=>setTimeout(()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}},t));
    };

    const loadPluginThenInit=()=>{
      if(!document.getElementById('lrotate')){const r=document.createElement('script');r.id='lrotate';r.src='https://cdn.jsdelivr.net/npm/leaflet-rotate@0.3.0/dist/leaflet-rotate-src.js';r.onload=initMap;r.onerror=initMap;document.head.appendChild(r);}
      else initMap();
    };

    if(window.L){loadPluginThenInit();return;}
    if(!document.getElementById('lcss')){const c=document.createElement('link');c.id='lcss';c.rel='stylesheet';c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);}
    if(!document.getElementById('ljs')){const s=document.createElement('script');s.id='ljs';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=loadPluginThenInit;document.head.appendChild(s);}
    else{const r=setInterval(()=>{if(window.L){clearInterval(r);loadPluginThenInit();}},50);setTimeout(()=>clearInterval(r),5000);}
    return()=>{invalidateTimers.current.forEach(clearTimeout);if(leafRef.current){leafRef.current.remove();leafRef.current=null;}};
  },[]);

  // ── DERIVED VALUES ──
  // Item 2: multi-field DB search
  const filteredSheetRoutes=(sheetRoutes||[]).filter(r=>{
    if(!dbSearch.trim()) return true;
    const kw=dbSearch.toLowerCase();
    const hay=[r.name,r.Name,r['Route Name'],r['File Name'],r.routeName,r.from,r.to,r.From,r.To,r.origin,r.destination].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(kw);
  }).slice(0,50);

  const filteredSavedRoutes=savedRoutes.filter(r=>!savedSearch.trim()||(r.name||'').toLowerCase().includes(savedSearch.toLowerCase())).slice(0,100);

  const aisCount=Object.keys(aisTargets).length;

  // HUD drag handlers
  const onHudTS=(e)=>{const t=e.touches[0];hudDragRef.current={dx:t.clientX-hudPos.x,dy:t.clientY-hudPos.y};};
  const onHudTM=(e)=>{if(!hudDragRef.current) return;e.stopPropagation();const t=e.touches[0];setHudPos({x:Math.max(0,Math.min(window.innerWidth-180,t.clientX-hudDragRef.current.dx)),y:Math.max(50,Math.min(window.innerHeight-200,t.clientY-hudDragRef.current.dy))});};
  const onHudTE=()=>{hudDragRef.current=null;};

  // ── UI ──────────────────────────────────────────────────────────────────
  // Mobile-first sizing — Item 4: brighter, larger, higher contrast
  const S = {
    panelBg:  'rgba(4,12,26,0.97)',
    border:   'rgba(0,212,255,0.28)',
    text:     '#D0E8F8',       // brighter text (was #b0c8d8)
    dim:      '#5A7A90',       // brighter dim (was #2A4055)
    vDim:     '#243850',
    cyan:     '#00D4FF',
    green:    '#00FF88',
    gold:     '#FFD700',
    red:      '#FF4757',
    fSm:      '0.78rem',       // font-size small (was 0.63rem)
    fXs:      '0.68rem',       // font-size extra small (was 0.54rem)
    fLabel:   '0.58rem',       // label (was 0.5rem)
  };

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'#040C1A',position:'relative',overflow:'hidden',minHeight:0}}>

      {/* ── HEADER ── */}
      <div style={{height:48,display:'flex',alignItems:'center',padding:'0 10px',background:'#020810',borderBottom:`1px solid ${S.border}`,flexShrink:0,gap:5}}>
        <span style={{color:S.cyan,fontWeight:700,fontSize:'0.82rem',letterSpacing:1,flex:1}}>⚓ NAV MODE</span>
        <div style={{display:'flex',gap:2}}>
          {[['north','N↑'],['course','C↑'],['head','H↑']].map(([m,l])=>(
            <button key={m} onClick={()=>setDisplayMode(m)} style={{background:displayMode===m?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${displayMode===m?S.cyan:S.vDim}`,color:displayMode===m?S.cyan:S.dim,borderRadius:5,padding:'3px 7px',fontSize:'0.65rem',cursor:'pointer'}}>{l}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:2}}>
          {[['night','🌙'],['day','☀️'],['dusk','🌆']].map(([m,l])=>(
            <button key={m} onClick={()=>setMapMode(m)} style={{background:mapMode===m?'rgba(255,215,0,0.18)':'transparent',border:`1px solid ${mapMode===m?S.gold:S.vDim}`,color:mapMode===m?S.gold:S.dim,borderRadius:5,padding:'3px 6px',fontSize:'0.72rem',cursor:'pointer'}}>{l}</button>
          ))}
        </div>
        <button onClick={()=>setShowMenu(v=>!v)} style={{background:showMenu?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${showMenu?S.cyan:S.vDim}`,color:showMenu?S.cyan:S.dim,borderRadius:5,padding:'3px 9px',fontSize:'1rem',cursor:'pointer'}}>☰</button>
      </div>

      {/* ── MAP ── */}
      <div ref={mapRef} style={{flex:1,minHeight:0}}/>

      {/* ── DRAGGABLE HUD — Item 1 DMS, Item 4 visibility, Item 5 collapsible ── */}
      <div
        style={{position:'absolute',left:hudPos.x,top:hudPos.y,zIndex:600,background:S.panelBg,border:`1px solid ${gpsOn?S.border:'rgba(42,64,85,0.4)'}`,borderRadius:10,minWidth:178,touchAction:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}}
        onTouchStart={onHudTS} onTouchMove={onHudTM} onTouchEnd={onHudTE}
      >
        {/* Drag bar */}
        <div style={{display:'flex',alignItems:'center',padding:'6px 10px',gap:6,cursor:'grab',borderBottom:`1px solid rgba(0,212,255,0.12)`}}>
          <span style={{color:S.dim,fontSize:'0.7rem',flex:1}}>⠿ SHIP DATA</span>
          <button onClick={()=>setTogCollapsed(v=>!v)} style={{background:'transparent',border:`1px solid ${S.vDim}`,color:S.dim,borderRadius:4,padding:'1px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{togCollapsed?'▼ CTRL':'▲ CTRL'}</button>
          <button onClick={()=>setAutoCenterRaw(v=>!v)} style={{background:autoCenter?'rgba(0,255,136,0.15)':'transparent',border:`1px solid ${autoCenter?S.green:S.vDim}`,color:autoCenter?S.green:S.dim,borderRadius:4,padding:'1px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{autoCenter?'CTR':'FREE'}</button>
          <button onClick={()=>setHudCollapsed(v=>!v)} style={{background:'transparent',border:'none',color:S.dim,fontSize:'0.8rem',cursor:'pointer',padding:'0 2px'}}>{hudCollapsed?'▼':'▲'}</button>
        </div>

        <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:6}}>

          {/* Item 5: Collapsible controls section */}
          {!togCollapsed && (
            <div style={{display:'flex',flexDirection:'column',gap:5,paddingBottom:5,borderBottom:`1px solid rgba(0,212,255,0.1)`}}>
              {[[gpsOn,setGpsOn,'📍 GPS'],[aisOn,setAisOn,`📡 AIS${aisCount?` (${aisCount})`:''}  `],[gebcoOn,setGebcoOn,'🌊 Depth'],[depthCheckOn,setDepthCheckOn,'🔍 Depth Check']].map(([v,s,lb])=>(
                <label key={lb} style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.fSm,color:S.text,minHeight:26}}>
                  <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)}/>{lb}
                </label>
              ))}
              {/* Vector toggle */}
              {gpsOn && (
                <div>
                  <div style={{color:S.dim,fontSize:S.fLabel,marginBottom:3,letterSpacing:0.5}}>COG VECTOR</div>
                  <div style={{display:'flex',gap:3}}>
                    {[6,12,20,30,60].map(m=>(
                      <button key={m} onClick={()=>setVectorMins(m)} style={{background:vectorMins===m?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${vectorMins===m?S.cyan:S.vDim}`,color:vectorMins===m?S.cyan:S.dim,borderRadius:4,padding:'2px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{m}m</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Item 1: DMS position — always visible */}
          {livePos ? (
            <div>
              <div style={{color:S.cyan,fontFamily:'monospace',fontSize:'0.75rem',lineHeight:1.8}}>
                {toDMS(livePos.lat,true)}<br/>
                {toDMS(livePos.lon,false)}
              </div>
              {/* SOG and COG always visible */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 8px',marginTop:5}}>
                {[['SOG',`${livePos.sog.toFixed(1)} kn`,S.green],['COG',`${livePos.cog.toFixed(0)}°T`,S.green]].map(([k,v,c])=>(
                  <div key={k}><div style={{color:S.dim,fontSize:S.fLabel}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>
                ))}
              </div>
              {!hudCollapsed && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 8px',marginTop:4}}>
                  {[['HDG',`${livePos.heading.toFixed(0)}°`,S.gold],['ACC',`${livePos.acc.toFixed(0)} m`,S.gold]].map(([k,v,c])=>(
                    <div key={k}><div style={{color:S.dim,fontSize:S.fLabel}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>
                  ))}
                </div>
              )}
              {!hudCollapsed && etaResult && (
                <div style={{marginTop:6,borderTop:`1px solid rgba(0,255,136,0.15)`,paddingTop:5}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    {[['REMAIN',etaResult.remainNM+' NM'],['ETA',etaResult.hrs+'h '+etaResult.mins+'m']].map(([k,v])=>(
                      <div key={k}><div style={{color:S.dim,fontSize:S.fLabel}}>{k}</div><div style={{color:S.green,fontFamily:'monospace',fontSize:'0.8rem',fontWeight:700}}>{v}</div></div>
                    ))}
                  </div>
                  <div style={{color:S.dim,fontSize:'0.6rem',marginTop:2}}>→ {etaResult.wpName}</div>
                </div>
              )}
            </div>
          ) : (
            gpsOn ? <div style={{color:S.dim,fontSize:S.fSm,fontStyle:'italic'}}>Acquiring GPS…</div>
            : <div style={{color:S.vDim,fontSize:S.fXs}}>Enable GPS to track vessel</div>
          )}
        </div>
      </div>

      {/* ── SIDE PANEL — Item 5: collapsible ── */}
      {panelCollapsed ? (
        <button onClick={()=>setPanelCollapsed(false)} style={{position:'absolute',top:'50%',right:0,transform:'translateY(-50%)',background:'rgba(4,12,26,0.95)',border:`1px solid ${S.border}`,color:S.cyan,borderRadius:'8px 0 0 8px',padding:'12px 6px',fontSize:'0.7rem',cursor:'pointer',zIndex:500,writingMode:'vertical-rl'}}>◀ PANEL</button>
      ) : (
        <div style={{position:'absolute',top:56,right:8,background:S.panelBg,border:`1px solid ${S.border}`,borderRadius:10,padding:'8px 10px',zIndex:500,width:170,backdropFilter:'blur(10px)',maxHeight:'82vh',overflowY:'auto',boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}}>
          {/* Panel header with collapse button */}
          <div style={{display:'flex',alignItems:'center',marginBottom:8,gap:4}}>
            {[['route','ROUTE'],['rb','R/B'],['charts','CHARTS'],['eta','ETA']].map(([p,l])=>(
              <button key={p} onClick={()=>setActivePanel(p)} style={{flex:1,background:activePanel===p?'rgba(0,212,255,0.18)':'transparent',border:`1px solid ${activePanel===p?S.cyan:S.vDim}`,color:activePanel===p?S.cyan:S.dim,borderRadius:5,padding:'3px 2px',fontSize:'0.62rem',cursor:'pointer'}}>{l}</button>
            ))}
            <button onClick={()=>setPanelCollapsed(true)} style={{background:'transparent',border:`1px solid ${S.vDim}`,color:S.dim,borderRadius:5,padding:'3px 5px',fontSize:'0.65rem',cursor:'pointer'}}>▶</button>
          </div>

          {/* ══ ROUTE ══ */}
          {activePanel==='route' && (
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              <label style={{background:'#060F1C',border:`1px solid ${S.vDim}`,color:S.text,borderRadius:6,padding:'7px 10px',fontSize:S.fSm,cursor:'pointer',display:'block',textAlign:'center'}}>
                📂 Load Route File
                <input type="file" style={{display:'none'}} onChange={loadRouteFromFile}/>
              </label>
              <div style={{color:S.vDim,fontSize:'0.55rem',lineHeight:1.4}}>RTZ·GPX·RTE·RT3·RT4·RTX·CSV·JSON·BVS…</div>

              {activeRoute?.waypoints?.length>0 && (
                <div style={{borderTop:`1px solid rgba(0,212,255,0.15)`,paddingTop:7}}>
                  <div style={{color:S.cyan,fontSize:S.fSm,fontWeight:600,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeRoute.name}</div>
                  <div style={{color:S.dim,fontSize:S.fXs,marginBottom:5}}>{activeRoute.waypoints.length} WPs · XTD ±1 NM</div>
                  <button onClick={saveCurrentRoute} style={{width:'100%',background:'transparent',border:`1px solid rgba(0,212,255,0.4)`,color:S.cyan,borderRadius:5,padding:'5px',fontSize:S.fXs,cursor:'pointer',marginBottom:5}}>💾 Save to My Routes</button>
                  <div style={{color:S.dim,fontSize:S.fLabel,marginBottom:3}}>ETA TO WAYPOINT</div>
                  <select value={selectedWpIdx} onChange={e=>setSelectedWpIdx(Number(e.target.value))} style={{width:'100%',background:'#060F1C',color:S.cyan,border:`1px solid ${S.vDim}`,borderRadius:5,padding:'5px',fontSize:S.fXs,marginBottom:5}}>
                    {activeRoute.waypoints.map((wp,i)=><option key={i} value={i}>WP{String(i+1).padStart(2,'0')}{wp.name?' '+wp.name:''}</option>)}
                  </select>
                  <button onClick={()=>{setActiveRoute(null);setEtaResult(null);setSelectedWpIdx(0);}} style={{width:'100%',background:'transparent',border:'1px solid rgba(255,71,87,0.45)',color:S.red,borderRadius:5,padding:'5px',fontSize:S.fXs,cursor:'pointer'}}>✕ Clear Route</button>
                </div>
              )}

              {/* Saved routes folder */}
              <div style={{borderTop:`1px solid rgba(0,212,255,0.12)`,paddingTop:6}}>
                <div style={{color:S.dim,fontSize:S.fLabel,letterSpacing:0.5,marginBottom:4}}>MY ROUTES ({savedRoutes.length}/100)</div>
                <input placeholder="Search saved…" value={savedSearch} onChange={e=>setSavedSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.text,border:`1px solid ${S.vDim}`,borderRadius:5,padding:'5px 7px',fontSize:S.fXs,outline:'none',marginBottom:4}}/>
                <div style={{maxHeight:110,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
                  {filteredSavedRoutes.map((r,i)=>(
                    <div key={i} style={{display:'flex',gap:3}}>
                      <button onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);}} style={{flex:1,background:'#060F1C',border:`1px solid ${activeRoute?.name===r.name?S.cyan:S.vDim}`,color:activeRoute?.name===r.name?S.cyan:S.text,borderRadius:5,padding:'4px 6px',fontSize:S.fXs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name||'—'}</button>
                      <button onClick={()=>deleteSavedRoute(r.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.red,borderRadius:4,padding:'3px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button>
                    </div>
                  ))}
                  {filteredSavedRoutes.length===0&&<div style={{color:S.vDim,fontSize:S.fXs,fontStyle:'italic'}}>No saved routes</div>}
                </div>
              </div>

              {/* Item 2: Fixed DB route search with separate state + multi-field filter */}
              {sheetRoutes.length>0 && (
                <div style={{borderTop:`1px solid rgba(0,212,255,0.12)`,paddingTop:6}}>
                  <div style={{color:S.dim,fontSize:S.fLabel,letterSpacing:0.5,marginBottom:4}}>DATABASE ({sheetRoutes.length})</div>
                  <input placeholder="Search by name, port, route…" value={dbSearch} onChange={e=>setDbSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.text,border:`1px solid ${S.vDim}`,borderRadius:5,padding:'5px 7px',fontSize:S.fXs,outline:'none',marginBottom:4}}/>
                  <div style={{maxHeight:110,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
                    {filteredSheetRoutes.length===0&&<div style={{color:S.vDim,fontSize:S.fXs,fontStyle:'italic'}}>{dbSearch?`No match for "${dbSearch}"`:'No routes in database'}</div>}
                    {filteredSheetRoutes.map((r,i)=>(
                      <button key={i} onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);setDbSearch('');}} style={{background:'#060F1C',border:`1px solid ${S.vDim}`,color:S.text,borderRadius:5,padding:'5px 7px',fontSize:S.fXs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {r.name||r.Name||r['Route Name']||r['File Name']||'Unnamed Route'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ R/B ══ */}
          {activePanel==='rb' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.fSm,color:S.text,minHeight:28}}>
                <input type="checkbox" checked={rbMode} onChange={e=>{const on=e.target.checked;rbModeRef.current=on;setRbMode(on);if(!on){rbTargetRef.current=null;setRbResult(null);if(leafRef.current){if(layersRef.current.rbLine) leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=null;layersRef.current.rbMarker=null;}}}}/>
                📐 Range & Bearing
              </label>
              <div style={{color:rbMode?S.gold:S.dim,fontSize:S.fXs,lineHeight:1.6}}>
                {rbMode?'⬡ Tap map — updates live as ship moves':'Enable then tap map point'}
              </div>
              {rbResult && (
                <div style={{background:'#020810',borderRadius:7,padding:'8px 10px',border:'1px solid rgba(255,215,0,0.3)'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    {[['RANGE',rbResult.rangeNM+' NM'],['BRG',rbResult.bearing+'°T']].map(([k,v])=>(
                      <div key={k}><div style={{color:S.dim,fontSize:S.fLabel}}>{k}</div><div style={{color:S.gold,fontFamily:'monospace',fontSize:'0.9rem',fontWeight:700}}>{v}</div></div>
                    ))}
                  </div>
                  <div style={{color:S.dim,fontSize:S.fXs,marginTop:4}}>{toDMS(parseFloat(rbResult.lat),true)}<br/>{toDMS(parseFloat(rbResult.lon),false)}</div>
                </div>
              )}
              {rbMode&&!livePos&&<div style={{color:S.red,fontSize:S.fXs}}>⚠ Enable GPS first</div>}
            </div>
          )}

          {/* ══ CHARTS ══ */}
          {activePanel==='charts' && (
            <div style={{display:'flex',flexDirection:'column',gap:7}}>
              <label style={{background:'#060F1C',border:`1px solid ${S.vDim}`,color:S.text,borderRadius:6,padding:'7px 10px',fontSize:S.fSm,cursor:'pointer',display:'block',textAlign:'center'}}>
                🗺️ Load Chart Overlay
                <input type="file" style={{display:'none'}} onChange={loadChartFile}/>
              </label>
              <div style={{color:S.vDim,fontSize:'0.55rem'}}>GeoJSON · KML · GPX</div>
              <div style={{color:S.dim,fontSize:S.fXs,lineHeight:1.5}}>Download chart files from the Charts page first, then load them here as map overlays.</div>
              {chartOverlays.map((c,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:4}}>
                  <span style={{flex:1,color:'#00FFFF',fontSize:S.fXs,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🗺 {c.name}</span>
                  <button onClick={()=>removeChart(c.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.red,borderRadius:4,padding:'2px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button>
                </div>
              ))}
              {chartOverlays.length===0&&<div style={{color:S.vDim,fontSize:S.fXs,fontStyle:'italic'}}>No overlays loaded</div>}
            </div>
          )}

          {/* ══ ETA — Item 9: full ETACalculator ══ */}
          {activePanel==='eta' && (
            <div>
              {activeRoute?.waypoints?.length>0 ? (
                <ETACalculator totalNM={etaResult?.remainNM ? parseFloat(etaResult.remainNM) : 0} />
              ) : (
                <div style={{color:S.dim,fontSize:S.fSm,fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Load a route to use the ETA calculator</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ☰ SETTINGS MENU ── */}
      {showMenu && (
        <div style={{position:'absolute',inset:0,zIndex:800,background:'rgba(0,0,0,0.6)'}} onClick={()=>setShowMenu(false)}>
          <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#030A15',borderTop:`1px solid ${S.border}`,borderRadius:'14px 14px 0 0',padding:'14px 16px',maxHeight:'78vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            {/* Category tabs */}
            <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>
              {[['colors','🎨'],['track','📍'],['ais','📡'],['contours','🌊'],['display','🗺️']].map(([c,l])=>(
                <button key={c} onClick={()=>setMenuCat(c)} style={{flex:1,minWidth:52,background:menuCat===c?'rgba(0,212,255,0.18)':'#060F1C',border:`1px solid ${menuCat===c?S.cyan:S.vDim}`,color:menuCat===c?S.cyan:S.dim,borderRadius:7,padding:'7px 4px',fontSize:'0.72rem',cursor:'pointer'}}>{l}</button>
              ))}
            </div>

            {/* 🎨 COLORS */}
            {menuCat==='colors' && (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[['route','Route Line'],['vector','COG Vector'],['ship','Ship Icon'],['track','Past Track'],['xtd','XTD Corridor']].map(([key,label])=>(
                  <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:18,height:18,borderRadius:4,background:colors[key],border:'1px solid rgba(255,255,255,0.25)'}}/><span style={{color:S.text,fontSize:S.fSm}}>{label}</span></div>
                    <input type="color" value={colors[key]} onChange={e=>{const nc={...colors,[key]:e.target.value};setColors(nc);}} style={{width:40,height:28,border:'none',borderRadius:6,cursor:'pointer',background:'transparent'}}/>
                  </div>
                ))}
                <button onClick={()=>setColors(DEFAULT_COLORS)} style={{marginTop:4,background:'transparent',border:`1px solid ${S.vDim}`,color:S.dim,borderRadius:6,padding:'7px',fontSize:S.fXs,cursor:'pointer'}}>↺ Reset to defaults</button>
              </div>
            )}

            {/* 📍 TRACK */}
            {menuCat==='track' && (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{color:S.dim,fontSize:S.fXs,letterSpacing:0.5}}>PAST TRACK DURATION</div>
                <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                  {[[0,'OFF'],[1,'1H'],[2,'2H'],[6,'6H'],[12,'12H'],[24,'24H']].map(([h,l])=>(
                    <button key={h} onClick={()=>setTrackHours(h)} style={{background:trackHours===h?'rgba(0,255,136,0.18)':'#060F1C',border:`1px solid ${trackHours===h?S.green:S.vDim}`,color:trackHours===h?S.green:S.text,borderRadius:7,padding:'7px 12px',fontSize:S.fSm,cursor:'pointer'}}>{l}</button>
                  ))}
                </div>
              </div>
            )}

            {/* 📡 AIS — Item 8: range filter */}
            {menuCat==='ais' && (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{color:S.dim,fontSize:S.fXs,letterSpacing:0.5}}>AIS TARGET RANGE FILTER</div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {[[0,'World'],[10,'10 NM'],[20,'20 NM'],[50,'50 NM'],[100,'100 NM']].map(([r,l])=>(
                    <button key={r} onClick={()=>setAisRange(r)} style={{background:aisRange===r?'rgba(0,212,255,0.2)':'#060F1C',border:`1px solid ${aisRange===r?S.cyan:S.vDim}`,color:aisRange===r?S.cyan:S.text,borderRadius:7,padding:'7px 10px',fontSize:S.fSm,cursor:'pointer'}}>{l}</button>
                  ))}
                </div>
                <div style={{color:S.dim,fontSize:S.fXs,lineHeight:1.6}}>Targets shown: <b style={{color:S.cyan}}>{Object.keys(aisTargets).length}</b> total. {aisRange>0?`Showing within ${aisRange} NM.`:'Showing all world traffic.'}</div>
                <div style={{color:S.vDim,fontSize:S.fXs,lineHeight:1.5}}>Tap any AIS target on the map to see CPA, TCPA and COLREG classification based on your ship's course and speed.</div>
              </div>
            )}

            {/* 🌊 CONTOURS — Item 3 */}
            {menuCat==='contours' && (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{color:S.dim,fontSize:S.fXs,letterSpacing:0.5}}>DEPTH CONTOUR SETTINGS</div>
                {[
                  [shipDraft,setShipDraft,'nav_draft','⚓ Ship Draft (m)','Your vessel\'s draft'],
                  [shallowDepth,setShallowDepth,'nav_shallowDepth','🔴 Shallow Contour (m)','Depths less than this = danger'],
                  [safetyDepth,setSafetyDepth,'nav_safetyDepth','🟡 Safety Contour (m)','Minimum safe depth'],
                  [deepDepth,setDeepDepth,'nav_deepDepth','🔵 Deep Contour (m)','Depths greater than this = deep'],
                ].map(([val,setter,key,label,desc])=>(
                  <div key={key}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                      <span style={{color:S.text,fontSize:S.fSm}}>{label}</span>
                      <input type="number" value={val} onChange={e=>{setter(Number(e.target.value));localStorage.setItem(key,e.target.value);}} style={{width:70,background:'#060F1C',color:S.cyan,border:`1px solid ${S.vDim}`,borderRadius:5,padding:'4px 7px',fontSize:S.fSm,textAlign:'right'}}/>
                    </div>
                    <div style={{color:S.dim,fontSize:'0.6rem'}}>{desc}</div>
                  </div>
                ))}
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:S.fSm,color:S.text,padding:'4px 0'}}>
                  <input type="checkbox" checked={depthCheckOn} onChange={e=>setDepthCheckOn(e.target.checked)}/>
                  🔍 Depth Check Mode (tap map to check depth)
                </label>
                {depthCheckOn && <div style={{background:'#020810',borderRadius:6,padding:'8px',border:'1px solid rgba(0,212,255,0.2)',fontSize:S.fXs,color:S.text,lineHeight:1.7}}>
                  🔴 &lt;{shallowDepth}m Danger<br/>
                  🟡 {shallowDepth}–{safetyDepth}m Caution<br/>
                  🟢 {safetyDepth}–{deepDepth}m Safe<br/>
                  🔵 &gt;{deepDepth}m Deep
                </div>}
              </div>
            )}

            {/* 🗺️ DISPLAY */}
            {menuCat==='display' && (
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <div>
                  <div style={{color:S.dim,fontSize:S.fXs,marginBottom:6}}>MAP ORIENTATION</div>
                  <div style={{display:'flex',gap:4}}>
                    {[['north','N↑ North Up'],['course','C↑ Course Up'],['head','H↑ Head Up']].map(([m,l])=>(
                      <button key={m} onClick={()=>setDisplayMode(m)} style={{flex:1,background:displayMode===m?'rgba(0,212,255,0.2)':'#060F1C',border:`1px solid ${displayMode===m?S.cyan:S.vDim}`,color:displayMode===m?S.cyan:S.text,borderRadius:7,padding:'8px 4px',fontSize:'0.68rem',cursor:'pointer'}}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{color:S.dim,fontSize:S.fXs,marginBottom:6}}>MAP STYLE</div>
                  <div style={{display:'flex',gap:4}}>
                    {[['night','🌙 Night'],['day','☀️ Day'],['dusk','🌆 Dusk']].map(([m,l])=>(
                      <button key={m} onClick={()=>setMapMode(m)} style={{flex:1,background:mapMode===m?'rgba(255,215,0,0.18)':'#060F1C',border:`1px solid ${mapMode===m?S.gold:S.vDim}`,color:mapMode===m?S.gold:S.text,borderRadius:7,padding:'8px 4px',fontSize:'0.68rem',cursor:'pointer'}}>{l}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{color:S.dim,fontSize:S.fXs,marginBottom:6}}>GPS CENTER MODE</div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>setAutoCenterRaw(true)} style={{flex:1,background:autoCenter?'rgba(0,255,136,0.18)':'#060F1C',border:`1px solid ${autoCenter?S.green:S.vDim}`,color:autoCenter?S.green:S.text,borderRadius:7,padding:'8px',fontSize:'0.68rem',cursor:'pointer'}}>🎯 Look-Ahead</button>
                    <button onClick={()=>setAutoCenterRaw(false)} style={{flex:1,background:!autoCenter?'rgba(255,215,0,0.18)':'#060F1C',border:`1px solid ${!autoCenter?S.gold:S.vDim}`,color:!autoCenter?S.gold:S.text,borderRadius:7,padding:'8px',fontSize:'0.68rem',cursor:'pointer'}}>🖐 Free Nav</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
