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
    routeMarkers: [],   // ADD: waypoint markers for loaded route
    rbLine:   null,     // ADD: range-bearing line on map
    rbMarker: null,     // ADD: range-bearing target dot
  });

  const aisWsRef         = useRef(null);
  const invalidateTimers = useRef([]);

  // ADD: refs that mirror state values — needed inside map click handler (set up once on mount)
  const rbModeRef  = useRef(false);
  const livePosRef = useRef(null);

  // ── EXISTING STATE ──
  const [mapReady,   setMapReady]      = useState(false);
  const [gpsOn,      setGpsOn]         = useState(false);
  const [aisOn,      setAisOn]         = useState(false);
  const [gebcoOn,    setGebcoOn]       = useState(false);
  const [aisTargets, setAisTargets]    = useState({});
  const [autoCenter, setAutoCenterRaw] = useState(true);

  // ── NEW STATE ──
  // Map tile style — persists across sessions
  const [mapMode, setMapMode] = useState(
    () => localStorage.getItem('nav_mapMode') || 'night'
  );
  // Orientation mode: north up | course up | head up
  const [displayMode, setDisplayMode] = useState('north');
  // Loaded route — restored from localStorage on mount
  const [activeRoute, setActiveRoute] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nav_activeRoute') || 'null'); } catch { return null; }
  });
  // Live GPS data including SOG/COG/heading
  const [livePos, setLivePos] = useState(null); // {lat,lon,sog,cog,heading,acc}
  // Which waypoint to calculate ETA to
  const [selectedWpIdx, setSelectedWpIdx] = useState(0);
  // Range & bearing toggle
  const [rbMode, setRbMode] = useState(false);
  // Range & bearing result from last map tap
  const [rbResult, setRbResult] = useState(null); // {rangeNM,bearing,lat,lon}
  // Calculated ETA
  const [etaResult, setEtaResult] = useState(null); // {remainNM,hrs,mins,wpName}
  // Which side panel is open
  const [activePanel, setActivePanel] = useState('nav'); // 'nav'|'route'|'rb'

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

  // ADD: true bearing A→B for range-bearing function
  const calcBearing = (lat1, lon1, lat2, lon2) => {
    const DEG = Math.PI / 180;
    const dLon = (lon2 - lon1) * DEG;
    const y = Math.sin(dLon) * Math.cos(lat2 * DEG);
    const x = Math.cos(lat1 * DEG) * Math.sin(lat2 * DEG)
            - Math.sin(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.cos(dLon);
    return ((Math.atan2(y, x) / DEG) + 360) % 360;
  };

  // ADD: load route from a local JSON or CSV file chosen by the user
  const loadRouteFromFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let route;
        const text = ev.target.result;
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          // Accept {name,waypoints:[{lat,lon}]}, {waypoints:[...]}, or plain array
          route = Array.isArray(parsed)
            ? { name: file.name, waypoints: parsed }
            : parsed;
        } else {
          // CSV: lat,lon or lat,lon,name per line — # lines ignored
          const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
          const waypoints = lines.map((l, i) => {
            const parts = l.split(',');
            return {
              lat:  parseFloat(parts[0]),
              lon:  parseFloat(parts[1]),
              name: parts[2]?.trim() || `WP${String(i+1).padStart(2,'0')}`,
            };
          }).filter(w => !isNaN(w.lat) && !isNaN(w.lon));
          route = { name: file.name, waypoints };
        }
        if (!route?.waypoints?.length) throw new Error('No valid waypoints found');
        setActiveRoute(route);
        setSelectedWpIdx(route.waypoints.length - 1); // default ETA → final WP
        notify(`✓ Route loaded: ${route.name}`, 'error');
      } catch (err) {
        notify(`Load failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-picked
  };

  // ── EXISTING: AIS STREAM ──
  useEffect(() => {
    if (!aisOn) { aisWsRef.current?.close(); aisWsRef.current = null; return; }
    const ws = new WebSocket("wss://stream.aisstream.io/v0/stream");
    aisWsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({
      Apikey: "FREE_TIER",
      BoundingBoxes: [[-90,-180],[90,180]],
      FilterMessageTypes: ["PositionReport"],
    }));
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const p = data?.Message?.PositionReport, m = data?.MetaData;
        if (!p || !m) return;
        setAisTargets(prev => ({
          ...prev,
          [m.MMSI]: { mmsi: m.MMSI, lat: p.Latitude, lon: p.Longitude, cog: p.CourseOverGround||0, sog: p.SpeedOverGround||0 },
        }));
      } catch {}
    };
    ws.onerror = () => notify("AIS stream error", "error");
    return () => ws.close();
  }, [aisOn]);

  // ── MODIFIED: GPS FIX ──
  // ADDED: captures SOG / COG / heading / accuracy from GPS coords.
  // CHANGED: vessel marker is now a directional SVG triangle rotated to COG
  //          (was: circleMarker — replaced to show heading visually, per user request).
  // ADDED: 6-minute COG vector line extending from ship position.
  useEffect(() => {
    if (!gpsOn) return;
    if (!navigator.geolocation) { notify("GPS not supported", "error"); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat     = pos.coords.latitude;
        const lon     = pos.coords.longitude;
        const sog     = (pos.coords.speed ?? 0) * 1.94384;   // ADD: m/s → knots
        const cog     = pos.coords.heading ?? 0;              // ADD: course over ground °T
        const heading = pos.coords.heading ?? 0;              // ADD: gyro heading (same source)
        const acc     = pos.coords.accuracy ?? 0;             // ADD: GPS accuracy metres

        // ADD: update livePos state + ref (ref used inside map click handler)
        const fix = { lat, lon, sog, cog, heading, acc };
        setLivePos(fix);
        livePosRef.current = fix;

        if (!leafRef.current) return;
        const L = window.L;

        // CHANGED: directional ship triangle icon, rotated to COG.
        // Previous circleMarker showed no direction — replaced with SVG triangle per user request.
        const shipIcon = L.divIcon({
          html: `<div style="transform:rotate(${cog}deg);transform-origin:center;width:20px;height:28px;display:flex;align-items:center;justify-content:center;">
            <svg width="20" height="28" viewBox="0 0 20 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <polygon points="10,1 19,27 10,21 1,27" fill="#00D4FF" stroke="#ffffff" stroke-width="1.5"/>
            </svg>
          </div>`,
          className: '', iconSize: [20, 28], iconAnchor: [10, 14],
        });

        if (!layersRef.current.vessel) {
          layersRef.current.vessel = L.marker([lat, lon], { icon: shipIcon, zIndexOffset: 1000 }).addTo(leafRef.current);
        } else {
          layersRef.current.vessel.setLatLng([lat, lon]);
          layersRef.current.vessel.setIcon(shipIcon); // ADD: refresh icon each fix for COG rotation
        }

        // ADD: COG vector — dashed line showing predicted path for next 6 minutes
        const RAD = Math.PI / 180;
        const lookNM = Math.max(sog, 0.3) * (6 / 60);
        const vLat = lat + (lookNM / 60) * Math.cos(cog * RAD);
        const vLon = lon + (lookNM / 60) * Math.sin(cog * RAD);
        if (layersRef.current.vector) {
          layersRef.current.vector.setLatLngs([[lat, lon], [vLat, vLon]]);
        } else {
          layersRef.current.vector = L.polyline([[lat, lon], [vLat, vLon]], {
            color: '#00D4FF', weight: 2, opacity: 0.85, dashArray: '5 3',
          }).addTo(leafRef.current);
        }

        // EXISTING: auto-pan
        if (autoCenter) leafRef.current.panTo([lat, lon]);
      },
      () => notify("GPS error", "error"),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gpsOn]);

  // ── EXISTING: AIS RENDER + CPA ALERT ──
  useEffect(() => {
    if (!leafRef.current || !window.L) return;
    const L = window.L;
    Object.values(layersRef.current.ais).forEach(m => leafRef.current.removeLayer(m));
    layersRef.current.ais = {};
    Object.values(aisTargets).forEach(v => {
      if (!v.lat || !v.lon) return;
      const own    = layersRef.current.vessel?.getLatLng();
      const cpaData = own ? calcCPA({ lat: own.lat, lon: own.lng, cog: 0 }, v) : null;
      const colreg  = own ? getCOLREG({ lat: own.lat, lon: own.lng, cog: 0 }, v) : "N/A";
      const color   = cpaData?.cpa < 1 ? "#ff3b30" : cpaData?.cpa < 5 ? "#ff9500" : "#00D4FF";
      const marker  = L.circleMarker([v.lat, v.lon], { radius: 5, color, fillOpacity: 1 })
        .bindPopup(`<b>AIS Vessel</b><br/>MMSI: ${v.mmsi}<br/>SOG: ${v.sog}<br/>COG: ${v.cog}<br/>CPA: ${cpaData?.cpa?.toFixed(2)||"-"} NM<br/>COLREG: ${colreg}`)
        .addTo(leafRef.current);
      layersRef.current.ais[v.mmsi] = marker;
      if (cpaData?.cpa < 1.5) notify(`⚠ Collision Risk: MMSI ${v.mmsi}`, "error");
    });
  }, [aisTargets]);

  // ── MODIFIED: TILE / GEBCO TOGGLE ──
  // CHANGED: added mapMode to dependency array → night/day/dusk tiles switch correctly.
  // CHANGED: GEBCO mode now uses Carto Voyager (light, no shading) + ESRI Ocean Reference
  //          (depth soundings as numbers at zoom ≥9). Old ESRI Ocean Base caused
  //          "Map data not yet available" tiles in some regions — removed.
  // CHANGED: OpenSeaMap opacity raised to 0.85 in ECDIS mode for better seamark visibility.
  useEffect(() => {
    if (!mapReady || !leafRef.current || !window.L) return;
    const L = window.L, map = leafRef.current;

    if (baseTileRef.current)  { map.removeLayer(baseTileRef.current);  baseTileRef.current  = null; }
    if (gebcoRefTile.current) { map.removeLayer(gebcoRefTile.current); gebcoRefTile.current = null; }
    if (seamarkRef.current)   { map.removeLayer(seamarkRef.current);   seamarkRef.current   = null; }

    const TILES = {
      night: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',                     attr: '© CARTO' },
      day:   { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',          attr: '© CARTO' },
      dusk:  { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', attr: '© CARTO' },
    };

    if (gebcoOn) {
      // Light chart background — no colour shading, depth numbers appear at zoom ≥9
      baseTileRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', attribution: '© CARTO', maxZoom: 19 }
      ).addTo(map);
      // ESRI Ocean Reference — depth soundings (metres), port names, shipping lanes
      gebcoRefTile.current = L.tileLayer(
        'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: 'Tiles © Esri — GEBCO, NOAA, National Geographic', opacity: 1.0 }
      ).addTo(map);
    } else {
      const cfg = TILES[mapMode] || TILES.night;
      baseTileRef.current = L.tileLayer(cfg.url, { subdomains: 'abcd', attribution: cfg.attr, maxZoom: 19 }).addTo(map);
    }

    // OpenSeaMap — higher opacity in ECDIS/depth mode for better visibility
    seamarkRef.current = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
      opacity: gebcoOn ? 0.85 : 0.55, maxZoom: 18, attribution: '© OpenSeaMap',
    }).addTo(map);

  }, [gebcoOn, mapMode, mapReady]); // CHANGED: added mapMode

  // ADD: keep rbModeRef in sync with rbMode state (ref readable inside map click handler)
  useEffect(() => { rbModeRef.current = rbMode; }, [rbMode]);

  // ADD: persist map tile mode across sessions and app restarts
  useEffect(() => { localStorage.setItem('nav_mapMode', mapMode); }, [mapMode]);

  // ADD: persist active route — survives page refresh and app restart
  useEffect(() => {
    if (activeRoute) localStorage.setItem('nav_activeRoute', JSON.stringify(activeRoute));
    else localStorage.removeItem('nav_activeRoute');
  }, [activeRoute]);

  // ADD: render active route waypoints and polyline on the map
  useEffect(() => {
    if (!mapReady || !leafRef.current || !window.L) return;
    const L = window.L, map = leafRef.current, lrs = layersRef.current;

    // Clear previous route layers before drawing new ones
    if (lrs.route) { map.removeLayer(lrs.route); lrs.route = null; }
    lrs.routeMarkers?.forEach(m => { try { map.removeLayer(m); } catch {} });
    lrs.routeMarkers = [];

    if (!activeRoute?.waypoints?.length) return;

    const wps = activeRoute.waypoints;
    lrs.route = L.polyline(wps.map(w => [w.lat, w.lon]), {
      color: '#00B4D8', weight: 2, opacity: 0.9, dashArray: '8 4',
    }).addTo(map);

    wps.forEach((wp, i) => {
      const isFirst = i === 0, isLast = i === wps.length - 1;
      const color = isFirst ? '#00C896' : isLast ? '#FF4757' : '#00B4D8';
      const size  = isFirst || isLast ? 12 : 7;
      const icon  = L.divIcon({
        html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${size}px;height:${size}px;"></div>`,
        className: '', iconSize: [size, size], iconAnchor: [size/2, size/2],
      });
      const m = L.marker([wp.lat, wp.lon], { icon })
        .bindPopup(`<div style="font-size:12px"><b style="color:#00B4D8">WP${String(i+1).padStart(2,'0')}${wp.name?' — '+wp.name:''}</b><br/>Lat: ${(+wp.lat).toFixed(5)}°<br/>Lon: ${(+wp.lon).toFixed(5)}°</div>`)
        .addTo(map);
      lrs.routeMarkers.push(m);
    });

    map.fitBounds(lrs.route.getBounds(), { padding: [60, 60] });
  }, [activeRoute, mapReady]);

  // ADD: ETA calculation — recomputes whenever GPS position, route, or target WP changes
  useEffect(() => {
    if (!livePos || !activeRoute?.waypoints?.length) { setEtaResult(null); return; }
    if (livePos.sog < 0.2) { setEtaResult(null); return; } // too slow for meaningful ETA

    const wps = activeRoute.waypoints;
    const safeIdx = Math.min(Math.max(selectedWpIdx, 0), wps.length - 1);
    const remainNM = distanceNM(livePos.lat, livePos.lon, wps[safeIdx].lat, wps[safeIdx].lon);
    const hours = remainNM / livePos.sog;
    const hrs   = Math.floor(hours);
    const mins  = Math.round((hours - hrs) * 60);
    setEtaResult({
      remainNM: remainNM.toFixed(1),
      hrs, mins,
      wpName: wps[safeIdx].name || `WP${String(safeIdx+1).padStart(2,'0')}`,
    });
  }, [livePos, activeRoute, selectedWpIdx]);

  // ADD: map rotation for Course Up / Head Up display modes.
  // Rotates tile + overlay panes only; marker pane untouched so ship triangle stays upright.
  // North Up = 0° (no rotation, standard behaviour).
  useEffect(() => {
    if (!mapReady || !leafRef.current) return;
    const angle = displayMode === 'north'  ? 0
      : displayMode === 'course' ? -(livePos?.cog || 0)
      : -(livePos?.heading || livePos?.cog || 0);
    const panes = leafRef.current.getPanes();
    ['tilePane', 'overlayPane', 'shadowPane'].forEach(p => {
      if (panes[p]) panes[p].style.transform = `rotate(${angle}deg)`;
    });
  }, [displayMode, livePos?.cog, livePos?.heading, mapReady]);

  // ── EXISTING: INIT MAP — click handler extended for range-bearing ──
  useEffect(() => {
    if (leafRef.current) return;

    const load = () => {
      if (!mapRef.current || !window.L) return;
      const L = window.L;

      leafRef.current = L.map(mapRef.current, { center: [20, 70], zoom: 4 });

      baseTileRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', attribution: '© CARTO' }
      ).addTo(leafRef.current);

      seamarkRef.current = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        opacity: 0.55, maxZoom: 18, attribution: '© OpenSeaMap',
      }).addTo(leafRef.current);

      // MODIFIED: click handler — range-bearing mode intercepts first;
      // if not active, falls through to existing depth fetch (unchanged).
      leafRef.current.on('click', async (e) => {

        // ADD: range-bearing mode — calculates distance and bearing from ship to tapped point
        if (rbModeRef.current) {
          const pos = livePosRef.current;
          if (!pos) { notify('Enable GPS first for Range/Bearing', 'error'); return; }
          const rangeNM = distanceNM(pos.lat, pos.lon, e.latlng.lat, e.latlng.lng);
          const bearing = calcBearing(pos.lat, pos.lon, e.latlng.lat, e.latlng.lng);
          setRbResult({
            rangeNM: rangeNM.toFixed(2),
            bearing: bearing.toFixed(1),
            lat: e.latlng.lat.toFixed(5),
            lon: e.latlng.lng.toFixed(5),
          });
          // Draw/update RB line and target marker on map
          if (layersRef.current.rbLine)   leafRef.current.removeLayer(layersRef.current.rbLine);
          if (layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
          layersRef.current.rbLine = L.polyline(
            [[pos.lat, pos.lon], [e.latlng.lat, e.latlng.lng]],
            { color: '#FFD700', weight: 1.5, dashArray: '5 4', opacity: 0.85 }
          ).addTo(leafRef.current);
          layersRef.current.rbMarker = L.circleMarker(
            [e.latlng.lat, e.latlng.lng],
            { radius: 4, color: '#FFD700', fillColor: '#FFD700', fillOpacity: 1 }
          ).addTo(leafRef.current);
          return; // skip depth fetch in R/B mode
        }

        // EXISTING: depth fetch on click
        const popup = L.popup({ closeOnClick: false, autoClose: false })
          .setLatLng(e.latlng)
          .setContent('<div style="font-size:12px;padding:2px 4px">⏳ Fetching depth…</div>')
          .openOn(leafRef.current);
        try {
          const res  = await fetch(`https://api.opentopodata.org/v1/gebco2020?locations=${e.latlng.lat},${e.latlng.lng}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const elev = data?.results?.[0]?.elevation;
          if (elev === undefined || elev === null) throw new Error('No data returned');
          const label = elev <= 0
            ? `🌊 Depth: <b style="color:#00D4FF">${Math.abs(elev).toFixed(0)} m</b>`
            : `⛰ Elevation: <b style="color:#00C896">${elev.toFixed(0)} m</b>`;
          popup.setContent(
            `<div style="font-size:12px;min-width:170px;line-height:1.7">
              ${label}<br/>
              <span style="color:#aaa;font-size:11px">${e.latlng.lat.toFixed(5)}°N&nbsp;${e.latlng.lng.toFixed(5)}°E</span><br/>
              <span style="color:#666;font-size:10px">Source: GEBCO 2020</span>
            </div>`
          );
        } catch (err) {
          popup.setContent(
            `<div style="font-size:12px;color:#ff6b6b;min-width:130px">
              ⚠ Depth unavailable<br/>
              <span style="font-size:10px;color:#aaa">${err.message}</span>
            </div>`
          );
        }
      });

      setMapReady(true);
      safeInvalidate();
      [100, 300, 600, 1200].forEach(t => setTimeout(() => {
        try { leafRef.current?.invalidateSize({ animate: false }); } catch {}
      }, t));
    };

    if (window.L) { load(); return; }

    if (!document.getElementById('lcss')) {
      const c = document.createElement('link'); c.id = 'lcss'; c.rel = 'stylesheet';
      c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(c);
    }
    if (!document.getElementById('ljs')) {
      const s = document.createElement('script'); s.id = 'ljs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = load; document.head.appendChild(s);
    } else {
      const retry = setInterval(() => { if (window.L) { clearInterval(retry); load(); } }, 50);
      setTimeout(() => clearInterval(retry), 5000);
    }

    return () => {
      invalidateTimers.current.forEach(clearTimeout);
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }
    };
  }, []);

  // ─────────────────────────────────────────────────────────
  // ── UI ──
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:'#040C1A', position:'relative', overflow:'hidden', minHeight:0 }}>

      {/* ── ECDIS HEADER BAR ── */}
      <div style={{ height:46, display:'flex', alignItems:'center', padding:'0 10px', background:'#020810', borderBottom:'1px solid rgba(0,180,216,0.18)', flexShrink:0, gap:6 }}>
        <span style={{ color:'#00D4FF', fontWeight:700, fontSize:'0.76rem', letterSpacing:1, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          ⚓ NAV MODE
        </span>

        {/* Orientation toggle — North Up / Course Up / Head Up */}
        <div style={{ display:'flex', gap:2 }}>
          {[['north','N↑'],['course','C↑'],['head','H↑']].map(([m, l]) => (
            <button key={m} onClick={() => setDisplayMode(m)} style={{
              background: displayMode===m ? 'rgba(0,212,255,0.18)' : 'transparent',
              border: `1px solid ${displayMode===m ? '#00D4FF' : '#152030'}`,
              color: displayMode===m ? '#00D4FF' : '#2A4055',
              borderRadius: 4, padding: '2px 6px', fontSize: '0.58rem', cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>

        {/* Map mode toggle — Night / Day / Dusk */}
        <div style={{ display:'flex', gap:2 }}>
          {[['night','🌙'],['day','☀️'],['dusk','🌆']].map(([m, l]) => (
            <button key={m} onClick={() => setMapMode(m)} style={{
              background: mapMode===m ? 'rgba(255,215,0,0.14)' : 'transparent',
              border: `1px solid ${mapMode===m ? '#FFD700' : '#152030'}`,
              color: mapMode===m ? '#FFD700' : '#2A4055',
              borderRadius: 4, padding: '2px 5px', fontSize: '0.65rem', cursor: 'pointer',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── MAP ── */}
      <div ref={mapRef} style={{ flex:1, minHeight:0 }} />

      {/* ── ECDIS SIDE PANEL ── */}
      <div style={{
        position:'absolute', top:54, right:8,
        background:'rgba(2,8,16,0.94)',
        border:'1px solid rgba(0,212,255,0.2)',
        borderRadius:9, padding:'8px 9px', zIndex:500, width:158,
        backdropFilter:'blur(8px)',
      }}>
        {/* Panel tab bar */}
        <div style={{ display:'flex', gap:3, marginBottom:8 }}>
          {[['nav','NAV'],['route','ROUTE'],['rb','R/B']].map(([p, l]) => (
            <button key={p} onClick={() => setActivePanel(p)} style={{
              flex:1,
              background: activePanel===p ? 'rgba(0,212,255,0.15)' : 'transparent',
              border: `1px solid ${activePanel===p ? '#00D4FF' : '#152030'}`,
              color: activePanel===p ? '#00D4FF' : '#2A4055',
              borderRadius:4, padding:'2px 3px', fontSize:'0.57rem', cursor:'pointer',
            }}>{l}</button>
          ))}
        </div>

        {/* ════════ NAV PANEL ════════ */}
        {activePanel === 'nav' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>

            {/* Existing checkboxes — unchanged labels and logic */}
            {[
              [gpsOn,    setGpsOn,    '📍 GPS'],
              [aisOn,    setAisOn,    '📡 AIS Live'],
              [gebcoOn,  setGebcoOn,  '🌊 Ocean Depth'],
            ].map(([val, setter, label]) => (
              <label key={label} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.74rem', color:'#b0c8d8' }}>
                <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)} />
                {label}
              </label>
            ))}

            {/* ADD: live position + ship data — visible only when GPS is on and has a fix */}
            {livePos && (
              <div style={{ borderTop:'1px solid rgba(0,212,255,0.14)', paddingTop:6, marginTop:1 }}>
                {/* Lat / Lon */}
                <div style={{ color:'#00D4FF', fontFamily:'monospace', fontSize:'0.67rem', lineHeight:1.7 }}>
                  {Math.abs(livePos.lat).toFixed(5)}°{livePos.lat >= 0 ? 'N' : 'S'}<br/>
                  {Math.abs(livePos.lon).toFixed(5)}°{livePos.lon >= 0 ? 'E' : 'W'}
                </div>
                {/* SOG / COG / HDG / ACC grid */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 6px', marginTop:5 }}>
                  {[
                    ['SOG', `${livePos.sog.toFixed(1)} kn`, '#00FF88'],
                    ['COG', `${livePos.cog.toFixed(0)}°T`,  '#00FF88'],
                    ['HDG', `${livePos.heading.toFixed(0)}°`, '#FFD700'],
                    ['ACC', `${livePos.acc.toFixed(0)} m`,  '#FFD700'],
                  ].map(([k, v, c]) => (
                    <div key={k}>
                      <div style={{ color:'#2A4055', fontSize:'0.5rem', letterSpacing:0.5 }}>{k}</div>
                      <div style={{ color:c, fontFamily:'monospace', fontSize:'0.78rem', fontWeight:700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {gpsOn && !livePos && (
              <div style={{ color:'#2A4055', fontSize:'0.63rem', fontStyle:'italic' }}>Acquiring GPS…</div>
            )}
            {!gpsOn && (
              <div style={{ color:'#1A2A38', fontSize:'0.59rem', borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:5, marginTop:1, lineHeight:1.5 }}>
                Tap map → depth in metres
              </div>
            )}
          </div>
        )}

        {/* ════════ ROUTE PANEL ════════ */}
        {activePanel === 'route' && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>

            {/* Saved routes from sheetRoutes prop */}
            {sheetRoutes.length > 0 && (
              <div>
                <div style={{ color:'#2A4055', fontSize:'0.54rem', letterSpacing:0.5, marginBottom:3 }}>SAVED ROUTES</div>
                <div style={{ maxHeight:88, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
                  {sheetRoutes.map((r, i) => (
                    <button key={i} onClick={() => {
                      setActiveRoute(r);
                      setSelectedWpIdx((r.waypoints?.length || 1) - 1);
                      notify(`✓ Route: ${r.name || 'Route ' + (i+1)}`, 'error');
                    }} style={{
                      background: activeRoute?.name === r.name ? 'rgba(0,212,255,0.1)' : '#060F1C',
                      border: `1px solid ${activeRoute?.name === r.name ? '#00D4FF' : '#152030'}`,
                      color: activeRoute?.name === r.name ? '#00D4FF' : '#6A8898',
                      borderRadius:4, padding:'4px 6px', fontSize:'0.63rem', cursor:'pointer', textAlign:'left',
                    }}>
                      {r.name || `Route ${i+1}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Load from local device */}
            <div>
              <div style={{ color:'#2A4055', fontSize:'0.54rem', letterSpacing:0.5, marginBottom:3 }}>FROM DEVICE</div>
              <label style={{
                background:'#060F1C', border:'1px solid #152030', color:'#6A8898',
                borderRadius:4, padding:'5px 8px', fontSize:'0.63rem',
                cursor:'pointer', display:'block', textAlign:'center',
              }}>
                📂 Load JSON / CSV
                <input type="file" accept=".json,.csv" style={{ display:'none' }} onChange={loadRouteFromFile} />
              </label>
            </div>

            {/* Active route info + ETA */}
            {activeRoute?.waypoints?.length > 0 && (
              <div style={{ borderTop:'1px solid rgba(0,212,255,0.14)', paddingTop:6 }}>
                <div style={{ color:'#00D4FF', fontSize:'0.64rem', fontWeight:600, marginBottom:1 }}>
                  {activeRoute.name || 'Active Route'}
                </div>
                <div style={{ color:'#2A4055', fontSize:'0.56rem', marginBottom:6 }}>
                  {activeRoute.waypoints.length} waypoints
                </div>

                {/* ETA waypoint selector */}
                <div style={{ color:'#2A4055', fontSize:'0.52rem', letterSpacing:0.5, marginBottom:2 }}>ETA TO WAYPOINT</div>
                <select
                  value={selectedWpIdx}
                  onChange={e => setSelectedWpIdx(Number(e.target.value))}
                  style={{ width:'100%', background:'#060F1C', color:'#00D4FF', border:'1px solid #152030', borderRadius:4, padding:'3px 4px', fontSize:'0.62rem', marginBottom:6 }}
                >
                  {activeRoute.waypoints.map((wp, i) => (
                    <option key={i} value={i}>
                      WP{String(i+1).padStart(2,'0')}{wp.name ? ' ' + wp.name : ''}
                    </option>
                  ))}
                </select>

                {/* ETA result */}
                {etaResult ? (
                  <div style={{ background:'#020810', borderRadius:5, padding:'6px 8px', border:'1px solid rgba(0,255,136,0.18)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      {[['REMAIN', etaResult.remainNM + ' NM'], ['ETA', etaResult.hrs + 'h ' + etaResult.mins + 'm']].map(([k, v]) => (
                        <div key={k}>
                          <div style={{ color:'#2A4055', fontSize:'0.5rem' }}>{k}</div>
                          <div style={{ color:'#00FF88', fontFamily:'monospace', fontSize:'0.82rem', fontWeight:700 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ color:'#2A4055', fontSize:'0.53rem', marginTop:3 }}>→ {etaResult.wpName}</div>
                  </div>
                ) : (
                  <div style={{ color:'#2A4055', fontSize:'0.59rem', fontStyle:'italic' }}>
                    {!livePos ? 'Enable GPS for ETA' : livePos.sog < 0.2 ? 'Speed too low for ETA' : 'Calculating…'}
                  </div>
                )}

                <button
                  onClick={() => { setActiveRoute(null); setEtaResult(null); setSelectedWpIdx(0); }}
                  style={{ marginTop:7, width:'100%', background:'transparent', border:'1px solid rgba(255,71,87,0.45)', color:'#FF4757', borderRadius:4, padding:'4px', fontSize:'0.59rem', cursor:'pointer' }}
                >
                  ✕ Clear Route
                </button>
              </div>
            )}

            {!activeRoute && sheetRoutes.length === 0 && (
              <div style={{ color:'#1A2A38', fontSize:'0.59rem', lineHeight:1.6 }}>
                No saved routes.<br/>Load a JSON or CSV file from your device.
              </div>
            )}
          </div>
        )}

        {/* ════════ RANGE / BEARING PANEL ════════ */}
        {activePanel === 'rb' && (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', fontSize:'0.74rem', color:'#b0c8d8' }}>
              <input type="checkbox" checked={rbMode} onChange={e => {
                const on = e.target.checked;
                setRbMode(on);
                if (!on) {
                  // Clear RB layers when mode is turned off
                  setRbResult(null);
                  if (leafRef.current) {
                    if (layersRef.current.rbLine)   leafRef.current.removeLayer(layersRef.current.rbLine);
                    if (layersRef.current.rbMarker) leafRef.current.removeLayer(layersRef.current.rbMarker);
                    layersRef.current.rbLine = null;
                    layersRef.current.rbMarker = null;
                  }
                }
              }} />
              📐 Range & Bearing
            </label>

            <div style={{ color: rbMode ? '#FFD700' : '#2A4055', fontSize:'0.61rem', lineHeight:1.6 }}>
              {rbMode ? '⬡ Tap any point on map' : 'Enable then tap map'}
            </div>

            {rbResult && (
              <div style={{ background:'#020810', borderRadius:5, padding:'7px 8px', border:'1px solid rgba(255,215,0,0.28)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:6 }}>
                  {[['RANGE', rbResult.rangeNM + ' NM'], ['BRG', rbResult.bearing + '°T']].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color:'#2A4055', fontSize:'0.5rem' }}>{k}</div>
                      <div style={{ color:'#FFD700', fontFamily:'monospace', fontSize:'0.88rem', fontWeight:700 }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ color:'#2A4055', fontSize:'0.54rem', marginTop:4 }}>
                  {rbResult.lat}° {rbResult.lon}°
                </div>
              </div>
            )}

            {rbMode && !livePos && (
              <div style={{ color:'#FF4757', fontSize:'0.6rem' }}>⚠ Enable GPS first</div>
            )}

            <div style={{ color:'#1A2A38', fontSize:'0.56rem', lineHeight:1.5, borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:5 }}>
              Measures from your ship position to tapped point.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
