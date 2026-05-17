/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";

export default function NavModePage({
  notify,
  sheetRoutes = [],
  portsDb = [],
  setTab,
}) {
  const mapRef       = useRef(null);   // DOM container ref
  const leafRef      = useRef(null);   // Leaflet map instance ref
  const baseTileRef  = useRef(null);   // current base tile layer ref
  const seamarkRef   = useRef(null);   // OpenSeaMap layer ref — kept on top always
  const gebcoRefTile = useRef(null);   // ESRI Ocean Reference layer (labels on ocean base)

  const layersRef = useRef({
    route: null, vessel: null, vector: null,
    ais: {}, trailLine: null, trail: [],
  });

  const aisWsRef        = useRef(null);
  const invalidateTimers = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [gpsOn,    setGpsOn]    = useState(false);
  const [aisOn,    setAisOn]    = useState(false);
  const [gebcoOn,  setGebcoOn]  = useState(false);  // ESRI Ocean depth tiles toggle

  const [aisTargets,   setAisTargets]   = useState({});
  const [autoCenter,   setAutoCenterRaw] = useState(true);

  // ───────────────── SAFE MAP INVALIDATE ─────────────────
  const safeInvalidate = useCallback(() => {
    invalidateTimers.current.forEach(clearTimeout);
    invalidateTimers.current = [];
    const fix = () => { try { leafRef.current?.invalidateSize({ animate: false }); } catch {} };
    fix();
    invalidateTimers.current = [100, 300, 600, 1000, 1800].map(t => setTimeout(fix, t));
  }, []);

  // ───────────────── Haversine (NM) ─────────────────
  const distanceNM = (lat1, lon1, lat2, lon2) => {
    const R = 3440.065, d = Math.PI / 180;
    const a = Math.sin(((lat2-lat1)*d)/2)**2 + Math.cos(lat1*d)*Math.cos(lat2*d)*Math.sin(((lon2-lon1)*d)/2)**2;
    return 2*R*Math.asin(Math.sqrt(a));
  };

  // ───────────────── CPA / TCPA ENGINE ─────────────────
  const calcCPA = (own, tgt) => {
    const dx = tgt.lon - own.lon, dy = tgt.lat - own.lat;
    const tcpaHours = ((dx*tgt.cog - dy*own.cog) || 0) / 1000;
    const cpa = distanceNM(own.lat, own.lon, tgt.lat, tgt.lon);
    return { cpa, tcpa: Math.max(tcpaHours, 0) };
  };

  // ───────────────── COLREG CLASSIFIER ─────────────────
  const getCOLREG = (own, tgt) => {
    const bearing = (Math.atan2(tgt.lon-own.lon, tgt.lat-own.lat)*180)/Math.PI + 360;
    const rel = (bearing - own.cog + 360) % 360;
    if (rel > 345 || rel < 15)      return "HEAD-ON ⚠";
    if (rel > 112.5 && rel < 247.5) return "OVERTAKING ⚠";
    if (rel > 15 && rel < 112.5)    return "CROSSING (STARBOARD GIVE WAY)";
    if (rel > 247.5 && rel < 345)   return "CROSSING (YOU GIVE WAY)";
    return "SAFE";
  };

  // ───────────────── AIS STREAM ─────────────────
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
        setAisTargets(prev => ({ ...prev, [m.MMSI]: { mmsi: m.MMSI, lat: p.Latitude, lon: p.Longitude, cog: p.CourseOverGround||0, sog: p.SpeedOverGround||0 } }));
      } catch {}
    };
    ws.onerror = () => notify("AIS stream error", "error");
    return () => ws.close();
  }, [aisOn]);

  // ───────────────── GPS FIX ─────────────────
  useEffect(() => {
    if (!gpsOn) return;
    if (!navigator.geolocation) { notify("GPS not supported", "error"); return; }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude, lon = pos.coords.longitude;
        if (!leafRef.current) return;
        if (!layersRef.current.vessel) {
          layersRef.current.vessel = window.L.circleMarker([lat, lon], { radius: 8, color: "#00D4FF", fillColor: "#00D4FF", fillOpacity: 1 }).addTo(leafRef.current);
        } else { layersRef.current.vessel.setLatLng([lat, lon]); }
        if (autoCenter) leafRef.current.panTo([lat, lon]);
      },
      () => notify("GPS error", "error"),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gpsOn]);

  // ───────────────── AIS RENDER + CPA ALERT ─────────────────
  useEffect(() => {
    if (!leafRef.current || !window.L) return;
    const L = window.L;
    Object.values(layersRef.current.ais).forEach(m => leafRef.current.removeLayer(m));
    layersRef.current.ais = {};
    Object.values(aisTargets).forEach(v => {
      if (!v.lat || !v.lon) return;
      const own      = layersRef.current.vessel?.getLatLng();
      const cpaData  = own ? calcCPA({ lat: own.lat, lon: own.lng, cog: 0 }, v) : null;
      const colreg   = own ? getCOLREG({ lat: own.lat, lon: own.lng, cog: 0 }, v) : "N/A";
      const color    = cpaData?.cpa < 1 ? "#ff3b30" : cpaData?.cpa < 5 ? "#ff9500" : "#00D4FF";
      const marker   = L.circleMarker([v.lat, v.lon], { radius: 5, color, fillOpacity: 1 })
        .bindPopup(`<b>AIS Vessel</b><br/>MMSI: ${v.mmsi}<br/>SOG: ${v.sog}<br/>COG: ${v.cog}<br/>CPA: ${cpaData?.cpa?.toFixed(2)||"-"} NM<br/>COLREG: ${colreg}`)
        .addTo(leafRef.current);
      layersRef.current.ais[v.mmsi] = marker;
      if (cpaData?.cpa < 1.5) notify(`⚠ Collision Risk: MMSI ${v.mmsi}`, "error");
    });
  }, [aisTargets]);

  // CHANGED: GEBCO toggle — swaps base tile between CartoDB dark and ESRI Ocean.
  // Old approach: added GEBCO WMS layer in load() which renders server-side on demand (very slow).
  // New approach: ESRI Ocean tiles are pre-rendered and cached on ESRI CDN (~200ms load).
  useEffect(() => {
    if (!mapReady || !leafRef.current || !window.L) return;
    const L = window.L, map = leafRef.current;

    // Remove current base and gebco reference layers
    if (baseTileRef.current)  { map.removeLayer(baseTileRef.current);  baseTileRef.current  = null; }
    if (gebcoRefTile.current) { map.removeLayer(gebcoRefTile.current); gebcoRefTile.current = null; }

    if (gebcoOn) {
      // ESRI Ocean Base: colour-shaded bathymetry — darker blue = deeper ocean
      baseTileRef.current = L.tileLayer(
        'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: 'Tiles © Esri — GEBCO, NOAA, National Geographic' }
      ).addTo(map);
      // ESRI Ocean Reference: port names, country labels on top of ocean base
      gebcoRefTile.current = L.tileLayer(
        'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: '' }
      ).addTo(map);
    } else {
      baseTileRef.current = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        { subdomains: 'abcd', attribution: '© CARTO' }
      ).addTo(map);
    }

    // Always bring OpenSeaMap back to front after swapping base
    if (seamarkRef.current) seamarkRef.current.bringToFront();
  }, [gebcoOn, mapReady]);

  // ───────────────── INIT MAP ─────────────────
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

      // OpenSeaMap nautical overlay — depth contours, buoys, traffic lanes
      seamarkRef.current = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        opacity: 0.55, maxZoom: 18, attribution: '© OpenSeaMap',
      }).addTo(leafRef.current);

      // CHANGED: depth on click — shows "⏳ Fetching depth…" immediately,
      // then replaces with actual value or error message.
      // Old code: silent catch {} — user saw nothing for 3+ seconds then nothing on failure.
      leafRef.current.on('click', async (e) => {
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

  // ───────────────── UI ─────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: "#040C1A", position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: 10, color: "#00D4FF", fontWeight: 700, flexShrink: 0 }}>
        NAV MODE — AIS · CPA · COLREG · DEPTH
      </div>

      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

      <div style={{ position: "absolute", top: 60, right: 10, background: "#0A1A2F", padding: '10px 12px', borderRadius: 10, color: "#fff", zIndex: 500, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 140, border: '1px solid rgba(0,180,216,0.2)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={gpsOn} onChange={e => setGpsOn(e.target.checked)} />
          📍 GPS
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={aisOn} onChange={e => setAisOn(e.target.checked)} />
          📡 AIS Live
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={gebcoOn} onChange={e => setGebcoOn(e.target.checked)} />
          🌊 Ocean Depth
        </label>
        <div style={{ fontSize: '0.62rem', color: '#4A5F80', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6, lineHeight: 1.5 }}>
          Tap map → shows<br/>depth in metres
        </div>
      </div>
    </div>
  );
}
