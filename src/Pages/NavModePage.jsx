/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";

export default function NavModePage({
  notify,
  sheetRoutes = [],
  portsDb = [],
  setTab,
}) {
  // ── EXISTING REFS ──
  const mapRef       = useRef(null);
  const leafRef      = useRef(null);
  const baseTileRef  = useRef(null);
  const seamarkRef   = useRef(null);
  const gebcoRefTile = useRef(null);

  const layersRef = useRef({
    route: null, vessel: null, vector: null,
    ais: {}, trailLine: null, trail: [],
    routeMarkers: [],
    rbLine:   null,
    rbMarker: null,
    xtdPort:  null,   // ADD: port-side XTD limit line
    xtdStbd:  null,   // ADD: starboard-side XTD limit line
    xtdFill:  null,   // ADD: corridor fill polygon
  });

  const aisWsRef         = useRef(null);
  const invalidateTimers = useRef([]);

  // ADD: refs readable inside once-registered callbacks
  const rbModeRef     = useRef(false);
  const livePosRef    = useRef(null);
  const vectorMinsRef = useRef(6);

  // ── EXISTING STATE ──
  const [mapReady,   setMapReady]      = useState(false);
  const [gpsOn,      setGpsOn]         = useState(false);
  const [aisOn,      setAisOn]         = useState(false);
  const [gebcoOn,    setGebcoOn]       = useState(false);
  const [aisTargets, setAisTargets]    = useState({});
  const [autoCenter, setAutoCenterRaw] = useState(true);

  // ── NEW STATE ──
  const [mapMode,       setMapMode]      = useState(() => localStorage.getItem('nav_mapMode') || 'night');
  const [displayMode,   setDisplayMode]  = useState('north');
  const [activeRoute,   setActiveRoute]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('nav_activeRoute') || 'null'); } catch { return null; }
  });
  const [livePos,       setLivePos]      = useState(null);
  const [selectedWpIdx, setSelectedWpIdx] = useState(0);
  const [rbMode,        setRbMode]       = useState(false);
  const [rbResult,      setRbResult]     = useState(null);
  const [etaResult,     setEtaResult]    = useState(null);
  const [activePanel,   setActivePanel]  = useState('nav');
  const [vectorMins,    setVectorMins]   = useState(6);
  const [routeSearch,   setRouteSearch]  = useState('');

  // ── EXISTING: SAFE MAP INVALIDATE ──
  const safeInvalidate = useCallback(() => {
    invalidateTimers.current.forEach(clearTimeout);
    invalidateTimers.current = [];
    const fix = () => { try { leafRef.current?.invalidateSize({ animate: false }); } catch {} };
    fix();
    invalidateTimers.current = [100, 300, 600, 1000, 1800].map(t => setTimeout(fix, t));
  }, []);

  // ── EXISTING: HAVERSINE (NM) ──
  const distanceNM = (lat1, lon1, lat2, lon2) => {
    const R = 3440.065, d = Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*d)/2)**2 + Math.cos(lat1*d)*Math.cos(lat2*d)*Math.sin(((lon2-lon1)*d)/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  };

  // ── EXISTING: CPA / TCPA ENGINE ──
  const calcCPA = (own, tgt) => {
    const dx = tgt.lon - own.lon, dy = tgt.lat - own.lat;
    const tcpaHours = ((dx*tgt.cog - dy*own.cog) || 0) / 1000;
    const cpa = distanceNM(own.lat, own.lon, tgt.lat, tgt.lon);
    return { cpa, tcpa: Math.max(tcpaHours, 0) };
  };

  // ── EXISTING: COLREG CLASSIFIER ──
  const getCOLREG = (own, tgt) => {
    const bearing = (Math.atan2(tgt.lon-own.lon, tgt.lat-own.lat)*180)/Math.PI + 360;
    const rel = (bearing - own.cog + 360) % 360;
    if (rel > 345 || rel < 15)      return "HEAD-ON ⚠";
    if (rel > 112.5 && rel < 247.5) return "OVERTAKING ⚠";
    if (rel > 15 && rel < 112.5)    return "CROSSING (STARBOARD GIVE WAY)";
    if (rel > 247.5 && rel < 345)   return "CROSSING (YOU GIVE WAY)";
    return "SAFE";
  };

  // ADD: true bearing A→B (degrees)
  const calcBearing = (lat1, lon1, lat2, lon2) => {
    const D = Math.PI / 180;
    const dLon = (lon2 - lon1) * D;
    const y = Math.sin(dLon) * Math.cos(lat2 * D);
    const x = Math.cos(lat1*D)*Math.sin(lat2*D) - Math.sin(lat1*D)*Math.cos(lat2*D)*Math.cos(dLon);
    return ((Math.atan2(y, x) / D) + 360) % 360;
  };

  // ADD: offset a point by distNM in a given bearing (great-circle)
  // Used to build XTD corridor lines ±1 NM perpendicular to each leg
  const offsetPoint = (lat, lon, bearingDeg, distNM) => {
    const R  = 3440.065;                    // Earth radius in NM
    const d  = distNM / R;                  // angular distance (radians)
    const b  = bearingDeg * Math.PI / 180;
    const φ1 = lat * Math.PI / 180;
    const λ1 = lon * Math.PI / 180;
    const φ2 = Math.asin(
      Math.sin(φ1)*Math.cos(d) + Math.cos(φ1)*Math.sin(d)*Math.cos(b)
    );
    const λ2 = λ1 + Math.atan2(
      Math.sin(b)*Math.sin(d)*Math.cos(φ1),
      Math.cos(d) - Math.sin(φ1)*Math.sin(φ2)
    );
    return [φ2 * 180/Math.PI, λ2 * 180/Math.PI];
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ADD: UNIVERSAL ECDIS ROUTE FILE PARSER
  // RTZ · GPX · RTE · RT3 · RT4 · RTX · RTU · WPT · CSV · TXT · JSON · BVS
  // RTZP = zipped (user must unzip first)   XLSX = binary (export as CSV)
  // ─────────────────────────────────────────────────────────────────────────

  const tryParseXml = (text, filename) => {
    try {
      const doc = new DOMParser().parseFromString(text, 'application/xml');
      if (doc.querySelector('parsererror')) return null;
      const wps = [];

      // RTZ (IEC 61174): <waypoint name="…"><position lat="" lon=""/></waypoint>
      doc.querySelectorAll('waypoint,Waypoint').forEach(w => {
        const pos = w.querySelector('position,Position');
        if (!pos) return;
        const lat = parseFloat(pos.getAttribute('lat') || pos.getAttribute('Lat'));
        const lon = parseFloat(pos.getAttribute('lon') || pos.getAttribute('Lon'));
        const name = w.getAttribute('name') || w.getAttribute('Name') || '';
        if (!isNaN(lat) && !isNaN(lon)) wps.push({ lat, lon, name });
      });

      // GPX: <rtept> | <wpt> | <trkpt>
      if (!wps.length) {
        doc.querySelectorAll('rtept,wpt,trkpt').forEach(pt => {
          const lat = parseFloat(pt.getAttribute('lat'));
          const lon = parseFloat(pt.getAttribute('lon'));
          const name = pt.querySelector('name')?.textContent?.trim() || '';
          if (!isNaN(lat) && !isNaN(lon)) wps.push({ lat, lon, name });
        });
      }

      // Transas RT3/RT4, Simrad RTX/RTU — varied element names
      if (!wps.length) {
        doc.querySelectorAll('WP,wp,Point,point,Wpt').forEach(el => {
          const lat = parseFloat(el.getAttribute('Lat')||el.getAttribute('lat')||el.getAttribute('latitude'));
          const lon = parseFloat(el.getAttribute('Lon')||el.getAttribute('lon')||el.getAttribute('longitude'));
          const name = el.getAttribute('Name')||el.getAttribute('name')||el.getAttribute('id')||'';
          if (!isNaN(lat) && !isNaN(lon)) wps.push({ lat, lon, name });
        });
      }

      // Generic fallback: any element with [lat][lon] attributes
      if (!wps.length) {
        doc.querySelectorAll('[lat][lon],[Lat][Lon],[latitude][longitude]').forEach(el => {
          const lat = parseFloat(el.getAttribute('lat')||el.getAttribute('Lat')||el.getAttribute('latitude'));
          const lon = parseFloat(el.getAttribute('lon')||el.getAttribute('Lon')||el.getAttribute('longitude'));
          if (!isNaN(lat)&&!isNaN(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)
            wps.push({ lat, lon, name: el.getAttribute('name')||el.getAttribute('Name')||'' });
        });
      }

      if (!wps.length) return null;
      const routeName =
        doc.querySelector('route,Route')?.getAttribute('name') ||
        doc.querySelector('route,Route')?.getAttribute('Name') ||
        doc.querySelector('gpx>metadata>name,rte>name')?.textContent?.trim() ||
        filename;
      return { name: routeName, waypoints: wps };
    } catch { return null; }
  };

  const tryParseJson = (text, filename) => {
    try {
      const p = JSON.parse(text);
      if (Array.isArray(p)) {
        const wps = p.filter(x => x.lat != null && x.lon != null);
        if (wps.length) return { name: filename, waypoints: wps };
      }
      const wps = p.waypoints||p.Waypoints||p.route?.waypoints||p.Route?.Waypoints;
      if (wps?.length) return { name: p.name||p.Name||filename, waypoints: wps };
      return null;
    } catch { return null; }
  };

  const tryParseDelimited = (text, filename) => {
    try {
      const lines = text.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')&&!l.startsWith('//'));
      const wps = [];
      for (const line of lines) {
        if (/^(lat|lon|name|waypoint|wp|no\.|id|#)/i.test(line)) continue;
        const parts = line.split(/[,\t;|]+/).map(p=>p.replace(/["']/g,'').trim());
        if (parts.length < 2) continue;
        let lat = parseFloat(parts[0]), lon = parseFloat(parts[1]), name = parts[2]||'';
        if (!isNaN(parseFloat(parts[0])) && isNaN(parseFloat(parts[1])) && parts.length >= 3) {
          lat = parseFloat(parts[1]); lon = parseFloat(parts[2]); name = parts[3]||'';
        }
        if (!isNaN(lat)&&!isNaN(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180)
          wps.push({ lat, lon, name });
      }
      if (!wps.length) return null;
      return { name: filename, waypoints: wps };
    } catch { return null; }
  };

  const parseRouteFile = (text, filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext==='rtzp') throw new Error('RTZP is zipped — unzip and load the .rtz inside.');
    if (ext==='xlsx') throw new Error('XLSX binary not supported — export as CSV from your ECDIS.');
    if (text.trim().startsWith('<')||['rtz','gpx','rte','rt3','rt4','rtx','rtu','xml','wpt'].includes(ext)) {
      const r = tryParseXml(text, filename); if (r) return r;
    }
    if (ext==='json'||text.trim().startsWith('{')||text.trim().startsWith('[')) {
      const r = tryParseJson(text, filename); if (r) return r;
    }
    const r1=tryParseXml(text,filename); if(r1) return r1;
    const r2=tryParseJson(text,filename); if(r2) return r2;
    const r3=tryParseDelimited(text,filename); if(r3) return r3;
    throw new Error('No waypoints found — check file format.');
  };

  const loadRouteFromFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const route = parseRouteFile(ev.target.result, file.name);
        if (!route?.waypoints?.length) throw new Error('No valid waypoints found');
        setActiveRoute(route);
        setSelectedWpIdx(route.waypoints.length - 1);
        notify(`✓ Loaded: ${route.name} (${route.waypoints.length} WPs)`, 'error');
      } catch (err) { notify(`Load failed: ${err.message}`, 'error'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── EXISTING: AIS STREAM ──
  useEffect(() => {
    if (!aisOn) { aisWsRef.current?.close(); aisWsRef.current = null; return; }
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    aisWsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({
      Apikey: "FREE_TIER", BoundingBoxes:[[-90,-180],[90,180]], FilterMessageTypes:["PositionReport"],
    }));
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const p = data?.Message?.PositionReport, m = data?.MetaData;
        if (!p||!m) return;
        setAisTargets(prev => ({
          ...prev,
          [m.MMSI]:{ mmsi:m.MMSI, lat:p.Latitude, lon:p.Longitude, cog:p.CourseOverGround||0, sog:p.SpeedOverGround||0 },
        }));
      } catch {}
    };
    ws.onerror = () => notify("AIS stream error","error");
    return () => ws.close();
  }, [aisOn]);

  // ── MODIFIED: GPS FIX ──
  useEffect(() => {
    if (!gpsOn) return;
    if (!navigator.geolocation) { notify("GPS not supported","error"); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        try {
          const lat     = pos.coords.latitude;
          const lon     = pos.coords.longitude;
          const sog     = (pos.coords.speed   != null ? pos.coords.speed   : 0) * 1.94384;
          const cog     = pos.coords.heading  != null ? pos.coords.heading  : 0;
          const heading = pos.coords.heading  != null ? pos.coords.heading  : 0;
          const acc     = pos.coords.accuracy != null ? pos.coords.accuracy : 0;
          const fix = { lat, lon, sog, cog, heading, acc };
          setLivePos(fix);
          livePosRef.current = fix;
          if (!leafRef.current || !window.L) return;
          const L = window.L;
          const shipIcon = L.divIcon({
            html:`<div style="transform:rotate(${cog}deg);transform-origin:center;width:20px;height:28px;">
              <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                <polygon points="10,1 19,27 10,21 1,27" fill="#00D4FF" stroke="#fff" stroke-width="1.5"/>
              </svg>
            </div>`,
            className:'', iconSize:[20,28], iconAnchor:[10,14],
          });
          if (!layersRef.current.vessel) {
            layersRef.current.vessel = L.marker([lat,lon],{icon:shipIcon,zIndexOffset:1000}).addTo(leafRef.current);
          } else {
            layersRef.current.vessel.setLatLng([lat,lon]);
            layersRef.current.vessel.setIcon(shipIcon);
          }
          const RAD=Math.PI/180, lookNM=Math.max(sog,0.3)*(vectorMinsRef.current/60);
          const vLat=lat+(lookNM/60)*Math.cos(cog*RAD), vLon=lon+(lookNM/60)*Math.sin(cog*RAD);
          if (layersRef.current.vector) { layersRef.current.vector.setLatLngs([[lat,lon],[vLat,vLon]]); }
          else { layersRef.current.vector=L.polyline([[lat,lon],[vLat,vLon]],{color:'#00D4FF',weight:2,opacity:0.85,dashArray:'5 3'}).addTo(leafRef.current); }
          if (autoCenter) leafRef.current.panTo([lat,lon]);
        } catch(err) { console.warn('[NavMode GPS]',err); }
      },
      ()=>notify("GPS error","error"),
      { enableHighAccuracy:true, maximumAge:0, timeout:30000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gpsOn]);

  // ── EXISTING: AIS RENDER + CPA ALERT ──
  useEffect(() => {
    if (!leafRef.current||!window.L) return;
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
  }, [aisTargets]);

  // ── MODIFIED: TILE SWAP ──
  // ─────────────────────────────────────────────────────────────────────────────
// NAVMODE PATCH — replace ONLY the "── MODIFIED: TILE SWAP ──" useEffect block
// Find this comment in NavModePage.jsx:
//   // ── MODIFIED: TILE SWAP ──
// Replace the entire useEffect (from that comment to its closing }, [gebcoOn,mapMode,mapReady]);)
// with the block below. Everything else in NavModePage.jsx stays identical.
// ─────────────────────────────────────────────────────────────────────────────

// ADD: new refs at the top of the component (add alongside existing gebcoRefTile ref):
//   const emodnetTileRef = useRef(null);
//   const encTileRef     = useRef(null);

// ── MODIFIED: TILE SWAP ──
// CHANGED: gebcoOn now loads EMODnet bathymetry + NOAA ENC WMS in addition to
// existing ESRI Ocean Reference layer. Zero existing logic removed.
useEffect(() => {
  if (!mapReady || !leafRef.current || !window.L) return;
  const L = window.L, map = leafRef.current;

  // Remove existing tiles
  if (baseTileRef.current)   { map.removeLayer(baseTileRef.current);   baseTileRef.current   = null; }
  if (gebcoRefTile.current)  { map.removeLayer(gebcoRefTile.current);  gebcoRefTile.current  = null; }
  if (seamarkRef.current)    { map.removeLayer(seamarkRef.current);    seamarkRef.current    = null; }
  if (emodnetTileRef.current){ map.removeLayer(emodnetTileRef.current);emodnetTileRef.current= null; } // NEW
  if (encTileRef.current)    { map.removeLayer(encTileRef.current);    encTileRef.current    = null; } // NEW

  const TILES = {
    night: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',            attr: '© CARTO' },
    day:   { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', attr: '© CARTO' },
    dusk:  { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', attr: '© CARTO' },
  };

  if (gebcoOn) {
    // Layer 1: Light chart base
    baseTileRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      { subdomains: 'abcd', attribution: '© CARTO', maxZoom: 19 }
    ).addTo(map);

    // NEW Layer 2: EMODnet Bathymetry — worldwide depth colour zones + contours
    emodnetTileRef.current = L.tileLayer(
      'https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png',
      {
        attribution: '© EMODnet Bathymetry',
        maxZoom: 11,
        opacity: 0.55,
        errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      }
    ).addTo(map);

    // Layer 3: ESRI Ocean Reference — depth numbers at zoom ≥9 (unchanged)
    gebcoRefTile.current = L.tileLayer(
      'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 18, attribution: 'Tiles © Esri — GEBCO, NOAA', opacity: 1.0 }
    ).addTo(map);

    // NEW Layer 4: NOAA ENC Online WMS — real ENC depth soundings + shipping lanes worldwide
    encTileRef.current = L.tileLayer.wms(
      'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer',
      {
        layers:      '0,1,2,3,4,5,6,7',
        format:      'image/png',
        transparent: true,
        version:     '1.3.0',
        attribution: '© NOAA ENC Online',
        opacity:     0.85,
        maxZoom:     18,
      }
    ).addTo(map);

  } else {
    const cfg = TILES[mapMode] || TILES.night;
    baseTileRef.current = L.tileLayer(
      cfg.url, { subdomains: 'abcd', attribution: cfg.attr, maxZoom: 19 }
    ).addTo(map);
  }

  seamarkRef.current = L.tileLayer(
    'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
    { opacity: gebcoOn ? 0.85 : 0.55, maxZoom: 18, attribution: '© OpenSeaMap' }
  ).addTo(map);

}, [gebcoOn, mapMode, mapReady]);


  // ADD: sync vectorMinsRef (ref used in GPS callback, no restart needed)
  useEffect(()=>{ vectorMinsRef.current=vectorMins; },[vectorMins]);

  // ADD: persist settings
  useEffect(()=>{ localStorage.setItem('nav_mapMode',mapMode); },[mapMode]);
  useEffect(()=>{
    if(activeRoute) localStorage.setItem('nav_activeRoute',JSON.stringify(activeRoute));
    else localStorage.removeItem('nav_activeRoute');
  },[activeRoute]);

  // ADD: render route + XTD corridor when activeRoute changes
  useEffect(() => {
    if(!mapReady||!leafRef.current||!window.L) return;
    const L=window.L, map=leafRef.current, lrs=layersRef.current;

    // Clear route layers
    if(lrs.route){map.removeLayer(lrs.route);lrs.route=null;}
    lrs.routeMarkers?.forEach(m=>{try{map.removeLayer(m);}catch{}});
    lrs.routeMarkers=[];

    // CHANGED: also clear XTD layers before redrawing
    if(lrs.xtdPort){map.removeLayer(lrs.xtdPort);lrs.xtdPort=null;}
    if(lrs.xtdStbd){map.removeLayer(lrs.xtdStbd);lrs.xtdStbd=null;}
    if(lrs.xtdFill){map.removeLayer(lrs.xtdFill);lrs.xtdFill=null;}

    if(!activeRoute?.waypoints?.length) return;
    const wps=activeRoute.waypoints;

    // Route centre line
    lrs.route=L.polyline(wps.map(w=>[w.lat,w.lon]),{color:'#00B4D8',weight:2,opacity:0.9,dashArray:'8 4'}).addTo(map);

    // Waypoint markers
    wps.forEach((wp,i)=>{
      const isFirst=i===0,isLast=i===wps.length-1;
      const color=isFirst?'#00C896':isLast?'#FF4757':'#00B4D8',size=isFirst||isLast?12:7;
      const icon=L.divIcon({html:`<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${size}px;height:${size}px;"></div>`,className:'',iconSize:[size,size],iconAnchor:[size/2,size/2]});
      const m=L.marker([wp.lat,wp.lon],{icon})
        .bindPopup(`<div style="font-size:12px"><b style="color:#00B4D8">WP${String(i+1).padStart(2,'0')}${wp.name?' — '+wp.name:''}</b><br/>Lat:${(+wp.lat).toFixed(5)}°<br/>Lon:${(+wp.lon).toFixed(5)}°</div>`)
        .addTo(map);
      lrs.routeMarkers.push(m);
    });

    // ── ADD: XTD CORRIDOR LINES ±1 NM ──────────────────────────────────────
    // For each waypoint, compute the perpendicular direction (port and starboard).
    // At intermediate WPs, use average of incoming + outgoing bearing so the
    // corridor flows smoothly around corners.
    // Port  = left of vessel heading  (bearing - 90°)
    // Stbd  = right of vessel heading (bearing + 90°)
    if (wps.length >= 2) {
      const XTD_NM = 1.0;
      const portPts = [], stbdPts = [];

      wps.forEach((wp, i) => {
        let brg;
        if (i === 0) {
          brg = calcBearing(wp.lat, wp.lon, wps[1].lat, wps[1].lon);
        } else if (i === wps.length - 1) {
          brg = calcBearing(wps[i-1].lat, wps[i-1].lon, wp.lat, wp.lon);
        } else {
          // Average incoming + outgoing bearing (handles wrap-around)
          const b1 = calcBearing(wps[i-1].lat, wps[i-1].lon, wp.lat, wp.lon);
          const b2 = calcBearing(wp.lat, wp.lon, wps[i+1].lat, wps[i+1].lon);
          const diff = ((b2 - b1 + 540) % 360) - 180;
          brg = (b1 + diff / 2 + 360) % 360;
        }
        portPts.push(offsetPoint(wp.lat, wp.lon, (brg - 90 + 360) % 360, XTD_NM));
        stbdPts.push(offsetPoint(wp.lat, wp.lon, (brg + 90) % 360,       XTD_NM));
      });

      // Dashed amber lines — standard ECDIS track limit appearance
      lrs.xtdPort = L.polyline(portPts, { color:'#FFB300', weight:1.5, opacity:0.8, dashArray:'10 6' }).addTo(map);
      lrs.xtdStbd = L.polyline(stbdPts, { color:'#FFB300', weight:1.5, opacity:0.8, dashArray:'10 6' }).addTo(map);

      // Very light fill so the safe corridor is visually obvious
      lrs.xtdFill = L.polygon([...portPts, ...[...stbdPts].reverse()], {
        color:'transparent', fillColor:'#FFB300', fillOpacity:0.06, weight:0,
      }).addTo(map);

      // XTD labels at first and last WP
      [0, wps.length-1].forEach(idx => {
        L.marker(portPts[idx], {
          icon: L.divIcon({ html:`<div style="font-size:9px;color:#FFB300;white-space:nowrap;font-weight:600">◁ 1NM</div>`, className:'', iconAnchor:[0,6] }),
          zIndexOffset:-10, interactive:false,
        }).addTo(map);
        L.marker(stbdPts[idx], {
          icon: L.divIcon({ html:`<div style="font-size:9px;color:#FFB300;white-space:nowrap;font-weight:600">1NM ▷</div>`, className:'', iconAnchor:[0,6] }),
          zIndexOffset:-10, interactive:false,
        }).addTo(map);
      });
    }
    // ── END XTD ────────────────────────────────────────────────────────────

    map.fitBounds(lrs.route.getBounds(), { padding:[60,60] });
  }, [activeRoute, mapReady]);

  // ADD: ETA
  useEffect(()=>{
    if(!livePos||!activeRoute?.waypoints?.length){setEtaResult(null);return;}
    if(livePos.sog<0.2){setEtaResult(null);return;}
    const wps=activeRoute.waypoints,idx=Math.min(Math.max(selectedWpIdx,0),wps.length-1);
    const remainNM=distanceNM(livePos.lat,livePos.lon,wps[idx].lat,wps[idx].lon);
    const hours=remainNM/livePos.sog;
    setEtaResult({remainNM:remainNM.toFixed(1),hrs:Math.floor(hours),mins:Math.round((hours%1)*60),wpName:wps[idx].name||`WP${String(idx+1).padStart(2,'0')}`});
  },[livePos,activeRoute,selectedWpIdx]);

  // ADD: map rotation
  useEffect(()=>{
    if(!mapReady||!leafRef.current) return;
    const angle=displayMode==='north'?0:displayMode==='course'?-(livePos?.cog||0):-(livePos?.heading||livePos?.cog||0);
    const panes=leafRef.current.getPanes();
    ['tilePane','overlayPane','shadowPane'].forEach(p=>{if(panes[p]) panes[p].style.transform=`rotate(${angle}deg)`;});
  },[displayMode,livePos?.cog,livePos?.heading,mapReady]);

  // ── EXISTING: INIT MAP ──
  // CHANGED: click handler now ONLY handles Range/Bearing.
  // REMOVED: depth fetch (was non-functional and intercepting R/B clicks).
  // FIX: rbModeRef updated synchronously in toggle handler (see UI), not via useEffect,
  //      eliminating the timing gap that caused R/B to miss the first click.
  useEffect(() => {
    if(leafRef.current) return;
    const load = () => {
      if(!mapRef.current||!window.L) return;
      const L=window.L;
      leafRef.current=L.map(mapRef.current,{center:[20,70],zoom:4});
      baseTileRef.current=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',attribution:'© CARTO'}).addTo(leafRef.current);
      seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18,attribution:'© OpenSeaMap'}).addTo(leafRef.current);

      // CHANGED: click handler — R/B only, depth fetch removed
      leafRef.current.on('click', (e) => {
        if (!rbModeRef.current) return; // do nothing when R/B is off
        const pos = livePosRef.current;
        if (!pos) { notify('Enable GPS first for Range/Bearing','error'); return; }
        const rangeNM = distanceNM(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);
        const bearing = calcBearing(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);
        setRbResult({ rangeNM:rangeNM.toFixed(2), bearing:bearing.toFixed(1), lat:e.latlng.lat.toFixed(5), lon:e.latlng.lng.toFixed(5) });
        if(layersRef.current.rbLine)   leafRef.current.removeLayer(layersRef.current.rbLine);
        if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
        layersRef.current.rbLine   = L.polyline([[pos.lat,pos.lon],[e.latlng.lat,e.latlng.lng]],{color:'#FFD700',weight:1.5,dashArray:'5 4',opacity:0.85}).addTo(leafRef.current);
        layersRef.current.rbMarker = L.circleMarker([e.latlng.lat,e.latlng.lng],{radius:4,color:'#FFD700',fillColor:'#FFD700',fillOpacity:1}).addTo(leafRef.current);
      });

      setMapReady(true);
      safeInvalidate();
      [100,300,600,1200].forEach(t=>setTimeout(()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}},t));
    };

    if(window.L){load();return;}
    if(!document.getElementById('lcss')){const c=document.createElement('link');c.id='lcss';c.rel='stylesheet';c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(c);}
    if(!document.getElementById('ljs')){const s=document.createElement('script');s.id='ljs';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=load;document.head.appendChild(s);}
    else{const retry=setInterval(()=>{if(window.L){clearInterval(retry);load();}},50);setTimeout(()=>clearInterval(retry),5000);}
    return()=>{invalidateTimers.current.forEach(clearTimeout);if(leafRef.current){leafRef.current.remove();leafRef.current=null;}};
  },[]);

  const filteredRoutes=(sheetRoutes||[]).filter(r=>!routeSearch.trim()||(r.name||'').toLowerCase().includes(routeSearch.toLowerCase())).slice(0,50);

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'#040C1A',position:'relative',overflow:'hidden',minHeight:0}}>

      {/* ECDIS Header */}
      <div style={{height:46,display:'flex',alignItems:'center',padding:'0 10px',background:'#020810',borderBottom:'1px solid rgba(0,180,216,0.18)',flexShrink:0,gap:5}}>
        <span style={{color:'#00D4FF',fontWeight:700,fontSize:'0.76rem',letterSpacing:1,flex:1}}>⚓ NAV MODE</span>
        <div style={{display:'flex',gap:2}}>
          {[['north','N↑'],['course','C↑'],['head','H↑']].map(([m,l])=>(
            <button key={m} onClick={()=>setDisplayMode(m)} style={{background:displayMode===m?'rgba(0,212,255,0.18)':'transparent',border:`1px solid ${displayMode===m?'#00D4FF':'#152030'}`,color:displayMode===m?'#00D4FF':'#2A4055',borderRadius:4,padding:'2px 5px',fontSize:'0.58rem',cursor:'pointer'}}>{l}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:2}}>
          {[['night','🌙'],['day','☀️'],['dusk','🌆']].map(([m,l])=>(
            <button key={m} onClick={()=>setMapMode(m)} style={{background:mapMode===m?'rgba(255,215,0,0.14)':'transparent',border:`1px solid ${mapMode===m?'#FFD700':'#152030'}`,color:mapMode===m?'#FFD700':'#2A4055',borderRadius:4,padding:'2px 4px',fontSize:'0.65rem',cursor:'pointer'}}>{l}</button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{flex:1,minHeight:0}}/>

      {/* ECDIS Panel */}
      <div style={{position:'absolute',top:54,right:8,background:'rgba(2,8,16,0.94)',border:'1px solid rgba(0,212,255,0.2)',borderRadius:9,padding:'8px 9px',zIndex:500,width:162,backdropFilter:'blur(8px)'}}>
        <div style={{display:'flex',gap:3,marginBottom:8}}>
          {[['nav','NAV'],['route','ROUTE'],['rb','R/B']].map(([p,l])=>(
            <button key={p} onClick={()=>setActivePanel(p)} style={{flex:1,background:activePanel===p?'rgba(0,212,255,0.15)':'transparent',border:`1px solid ${activePanel===p?'#00D4FF':'#152030'}`,color:activePanel===p?'#00D4FF':'#2A4055',borderRadius:4,padding:'2px 3px',fontSize:'0.57rem',cursor:'pointer'}}>{l}</button>
          ))}
        </div>

        {/* ══ NAV ══ */}
        {activePanel==='nav'&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {[[gpsOn,setGpsOn,'📍 GPS'],[aisOn,setAisOn,'📡 AIS Live'],[gebcoOn,setGebcoOn,'🌊 Ocean Depth']].map(([v,s,lb])=>(
              <label key={lb} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.74rem',color:'#b0c8d8'}}>
                <input type="checkbox" checked={v} onChange={e=>s(e.target.checked)}/>{lb}
              </label>
            ))}
            {gpsOn&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:5}}>
                <div style={{color:'#2A4055',fontSize:'0.52rem',marginBottom:3,letterSpacing:0.5}}>COG VECTOR</div>
                <div style={{display:'flex',gap:2,flexWrap:'wrap'}}>
                  {[6,12,20,30,60].map(m=>(
                    <button key={m} onClick={()=>setVectorMins(m)} style={{background:vectorMins===m?'rgba(0,212,255,0.18)':'transparent',border:`1px solid ${vectorMins===m?'#00D4FF':'#152030'}`,color:vectorMins===m?'#00D4FF':'#2A4055',borderRadius:3,padding:'2px 4px',fontSize:'0.56rem',cursor:'pointer'}}>{m}m</button>
                  ))}
                </div>
              </div>
            )}
            {livePos&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.14)',paddingTop:6}}>
                <div style={{color:'#00D4FF',fontFamily:'monospace',fontSize:'0.67rem',lineHeight:1.7}}>
                  {Math.abs(livePos.lat).toFixed(5)}°{livePos.lat>=0?'N':'S'}<br/>
                  {Math.abs(livePos.lon).toFixed(5)}°{livePos.lon>=0?'E':'W'}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 6px',marginTop:5}}>
                  {[['SOG',`${livePos.sog.toFixed(1)} kn`,'#00FF88'],['COG',`${livePos.cog.toFixed(0)}°T`,'#00FF88'],['HDG',`${livePos.heading.toFixed(0)}°`,'#FFD700'],['ACC',`${livePos.acc.toFixed(0)} m`,'#FFD700']].map(([k,v,c])=>(
                    <div key={k}><div style={{color:'#2A4055',fontSize:'0.5rem'}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.78rem',fontWeight:700}}>{v}</div></div>
                  ))}
                </div>
              </div>
            )}
            {gpsOn&&!livePos&&<div style={{color:'#2A4055',fontSize:'0.63rem',fontStyle:'italic'}}>Acquiring GPS…</div>}
            {!gpsOn&&<div style={{color:'#1A2A38',fontSize:'0.58rem',borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:4,marginTop:2,lineHeight:1.5}}>Enable GPS to track your vessel</div>}
          </div>
        )}

        {/* ══ ROUTE ══ */}
        {activePanel==='route'&&(
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {sheetRoutes.length>0&&(
              <div>
                <div style={{color:'#2A4055',fontSize:'0.52rem',letterSpacing:0.5,marginBottom:3}}>SEARCH ROUTES ({sheetRoutes.length})</div>
                <input type="text" placeholder="Search by name…" value={routeSearch} onChange={e=>setRouteSearch(e.target.value)}
                  style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:'#b0c8d8',border:'1px solid #152030',borderRadius:4,padding:'4px 6px',fontSize:'0.63rem',outline:'none',marginBottom:4}}/>
                <div style={{maxHeight:110,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
                  {filteredRoutes.length===0&&<div style={{color:'#2A4055',fontSize:'0.6rem',fontStyle:'italic'}}>No match</div>}
                  {filteredRoutes.map((r,i)=>(
                    <button key={i} onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);setRouteSearch('');notify(`✓ ${r.name}`,'error');}}
                      style={{background:activeRoute?.name===r.name?'rgba(0,212,255,0.1)':'#060F1C',border:`1px solid ${activeRoute?.name===r.name?'#00D4FF':'#152030'}`,color:activeRoute?.name===r.name?'#00D4FF':'#6A8898',borderRadius:4,padding:'4px 6px',fontSize:'0.63rem',cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {r.name||'—'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div style={{color:'#2A4055',fontSize:'0.52rem',letterSpacing:0.5,marginBottom:2}}>FROM DEVICE</div>
              <div style={{color:'#1A2A38',fontSize:'0.52rem',lineHeight:1.4,marginBottom:4}}>RTZ · GPX · RTE · RT3 · RT4 · RTX · RTU · WPT · CSV · TXT · JSON · BVS</div>
              <label style={{background:'#060F1C',border:'1px solid #152030',color:'#6A8898',borderRadius:4,padding:'5px 8px',fontSize:'0.65rem',cursor:'pointer',display:'block',textAlign:'center'}}>
                📂 Load Route File
                <input type="file" style={{display:'none'}} onChange={loadRouteFromFile}/>
              </label>
            </div>
            {activeRoute?.waypoints?.length>0&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.14)',paddingTop:6}}>
                <div style={{color:'#00D4FF',fontSize:'0.65rem',fontWeight:600,marginBottom:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeRoute.name}</div>
                <div style={{color:'#2A4055',fontSize:'0.56rem',marginBottom:2}}>{activeRoute.waypoints.length} waypoints</div>
                {/* XTD indicator */}
                <div style={{color:'#FFB300',fontSize:'0.55rem',marginBottom:6}}>⬜ XTD ±1 NM corridor active</div>
                <div style={{color:'#2A4055',fontSize:'0.52rem',letterSpacing:0.5,marginBottom:2}}>ETA TO WAYPOINT</div>
                <select value={selectedWpIdx} onChange={e=>setSelectedWpIdx(Number(e.target.value))}
                  style={{width:'100%',background:'#060F1C',color:'#00D4FF',border:'1px solid #152030',borderRadius:4,padding:'3px 4px',fontSize:'0.62rem',marginBottom:6}}>
                  {activeRoute.waypoints.map((wp,i)=>(
                    <option key={i} value={i}>WP{String(i+1).padStart(2,'0')}{wp.name?' '+wp.name:''}</option>
                  ))}
                </select>
                {etaResult?(
                  <div style={{background:'#020810',borderRadius:5,padding:'6px 8px',border:'1px solid rgba(0,255,136,0.18)'}}>
                    <div style={{display:'flex',justifyContent:'space-between'}}>
                      {[['REMAIN',etaResult.remainNM+' NM'],['ETA',etaResult.hrs+'h '+etaResult.mins+'m']].map(([k,v])=>(
                        <div key={k}><div style={{color:'#2A4055',fontSize:'0.5rem'}}>{k}</div><div style={{color:'#00FF88',fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>
                      ))}
                    </div>
                    <div style={{color:'#2A4055',fontSize:'0.53rem',marginTop:3}}>→ {etaResult.wpName}</div>
                  </div>
                ):(
                  <div style={{color:'#2A4055',fontSize:'0.59rem',fontStyle:'italic'}}>
                    {!livePos?'Enable GPS for ETA':livePos.sog<0.2?'Speed too low':'Calculating…'}
                  </div>
                )}
                <button onClick={()=>{setActiveRoute(null);setEtaResult(null);setSelectedWpIdx(0);}}
                  style={{marginTop:7,width:'100%',background:'transparent',border:'1px solid rgba(255,71,87,0.4)',color:'#FF4757',borderRadius:4,padding:'4px',fontSize:'0.59rem',cursor:'pointer'}}>
                  ✕ Clear Route
                </button>
              </div>
            )}
            {!activeRoute&&sheetRoutes.length===0&&<div style={{color:'#1A2A38',fontSize:'0.59rem',lineHeight:1.6}}>No saved routes.<br/>Load a route file from your device.</div>}
          </div>
        )}

        {/* ══ R/B ══ */}
        {activePanel==='rb'&&(
          <div style={{display:'flex',flexDirection:'column',gap:7}}>
            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.74rem',color:'#b0c8d8'}}>
              {/* FIX: rbModeRef updated synchronously here (not via useEffect) so the
                  map click handler always reads the correct value immediately */}
              <input type="checkbox" checked={rbMode} onChange={e=>{
                const on=e.target.checked;
                rbModeRef.current=on;  // sync ref BEFORE state (prevents timing gap)
                setRbMode(on);
                if(!on){
                  setRbResult(null);
                  if(leafRef.current){
                    if(layersRef.current.rbLine)   leafRef.current.removeLayer(layersRef.current.rbLine);
                    if(layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
                    layersRef.current.rbLine=null; layersRef.current.rbMarker=null;
                  }
                }
              }}/>
              📐 Range & Bearing
            </label>
            <div style={{color:rbMode?'#FFD700':'#2A4055',fontSize:'0.61rem',lineHeight:1.6}}>
              {rbMode?'⬡ Tap any point on map':'Enable then tap map'}
            </div>
            {rbResult&&(
              <div style={{background:'#020810',borderRadius:5,padding:'7px 8px',border:'1px solid rgba(255,215,0,0.28)'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  {[['RANGE',rbResult.rangeNM+' NM'],['BRG',rbResult.bearing+'°T']].map(([k,v])=>(
                    <div key={k}><div style={{color:'#2A4055',fontSize:'0.5rem'}}>{k}</div><div style={{color:'#FFD700',fontFamily:'monospace',fontSize:'0.88rem',fontWeight:700}}>{v}</div></div>
                  ))}
                </div>
                <div style={{color:'#2A4055',fontSize:'0.54rem',marginTop:4}}>{rbResult.lat}° {rbResult.lon}°</div>
              </div>
            )}
            {rbMode&&!livePos&&<div style={{color:'#FF4757',fontSize:'0.6rem'}}>⚠ Enable GPS first</div>}
            <div style={{color:'#1A2A38',fontSize:'0.55rem',borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:5,lineHeight:1.5}}>Measures from your ship to tapped point.</div>
          </div>
        )}
      </div>
    </div>
  );
}
