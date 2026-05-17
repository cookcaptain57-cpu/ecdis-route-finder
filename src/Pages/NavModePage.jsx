/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";

export default function NavModePage({
  notify,
  sheetRoutes = [],
  portsDb = [],
  setTab,
}) {
  const mapRef = useRef(null);
  const leafRef = useRef(null);
  const baseTileRef = useRef(null);
  // NEW: ref to track GEBCO layer so it can be toggled on/off
  const gebcoLayerRef = useRef(null);

  const layersRef = useRef({
    route: null,
    vessel: null,
    vector: null,
    ais: {},
    trailLine: null,
    trail: [],
  });

  const aisWsRef = useRef(null);
  const invalidateTimers = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [aisOn, setAisOn] = useState(false);
  // NEW: toggles for GEBCO bathymetry layer
  const [gebcoOn, setGebcoOn] = useState(false);

  const [aisTargets, setAisTargets] = useState({});
  const [autoCenter, setAutoCenterRaw] = useState(true);
  const [mapMode] = useState("night");

  // ───────────────── SAFE MAP INVALIDATE ─────────────────
  const safeInvalidate = useCallback(() => {
    invalidateTimers.current.forEach(clearTimeout);
    invalidateTimers.current = [];
    const fix = () => {
      try { leafRef.current?.invalidateSize({ animate: false }); } catch {}
    };
    fix();
    invalidateTimers.current = [100, 300, 600, 1000, 1800].map((t) => setTimeout(fix, t));
  }, []);

  // ───────────────── Haversine (NM) ─────────────────
  const distanceNM = (lat1, lon1, lat2, lon2) => {
    const R = 3440.065;
    const d = Math.PI / 180;
    const a =
      Math.sin(((lat2 - lat1) * d) / 2) ** 2 +
      Math.cos(lat1 * d) * Math.cos(lat2 * d) *
        Math.sin(((lon2 - lon1) * d) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // ───────────────── CPA / TCPA ENGINE ─────────────────
  const calcCPA = (own, tgt) => {
    const dx = tgt.lon - own.lon;
    const dy = tgt.lat - own.lat;
    const tcpaHours = ((dx * tgt.cog - dy * own.cog) || 0) / 1000;
    const cpa = distanceNM(own.lat, own.lon, tgt.lat, tgt.lon);
    return { cpa, tcpa: Math.max(tcpaHours, 0) };
  };

  // ───────────────── COLREG CLASSIFIER ─────────────────
  const getCOLREG = (own, tgt) => {
    const bearing =
      (Math.atan2(tgt.lon - own.lon, tgt.lat - own.lat) * 180) / Math.PI + 360;
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
    ws.onopen = () => {
      ws.send(JSON.stringify({
        Apikey: "FREE_TIER",
        BoundingBoxes: [[-90, -180], [90, 180]],
        FilterMessageTypes: ["PositionReport"],
      }));
    };
    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);
        const p = data?.Message?.PositionReport;
        const m = data?.MetaData;
        if (!p || !m) return;
        const vessel = { mmsi: m.MMSI, lat: p.Latitude, lon: p.Longitude, cog: p.CourseOverGround || 0, sog: p.SpeedOverGround || 0 };
        setAisTargets((prev) => ({ ...prev, [vessel.mmsi]: vessel }));
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
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        if (!leafRef.current) return;
        if (!layersRef.current.vessel) {
          const L = window.L;
          layersRef.current.vessel = L.circleMarker([lat, lon], {
            radius: 8, color: "#00D4FF", fillColor: "#00D4FF", fillOpacity: 1,
          }).addTo(leafRef.current);
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
    Object.values(layersRef.current.ais).forEach((m) => leafRef.current.removeLayer(m));
    layersRef.current.ais = {};
    Object.values(aisTargets).forEach((v) => {
      if (!v.lat || !v.lon) return;
      const own = layersRef.current.vessel?.getLatLng();
      const cpaData = own ? calcCPA({ lat: own.lat, lon: own.lng, cog: 0 }, v) : null;
      const colreg  = own ? getCOLREG({ lat: own.lat, lon: own.lng, cog: 0 }, v) : "N/A";
      const color   = cpaData?.cpa < 1 ? "#ff3b30" : cpaData?.cpa < 5 ? "#ff9500" : "#00D4FF";
      const marker  = L.circleMarker([v.lat, v.lon], { radius: 5, color, fillOpacity: 1 })
        .bindPopup(`<b>AIS Vessel</b><br/>MMSI: ${v.mmsi}<br/>SOG: ${v.sog}<br/>COG: ${v.cog}<br/>CPA: ${cpaData?.cpa?.toFixed(2) || "-"} NM<br/>COLREG: ${colreg}`)
        .addTo(leafRef.current);
      layersRef.current.ais[v.mmsi] = marker;
      if (cpaData?.cpa < 1.5) notify(`⚠ Collision Risk: MMSI ${v.mmsi}`, "error");
    });
  }, [aisTargets]);

  // NEW: toggle GEBCO layer when gebcoOn state changes
  useEffect(() => {
    if (!leafRef.current || !window.L) return;
    const L = window.L;
    if (gebcoLayerRef.current) { leafRef.current.removeLayer(gebcoLayerRef.current); gebcoLayerRef.current = null; }
    if (gebcoOn) {
      gebcoLayerRef.current = L.tileLayer.wms(
        'https://www.gebco.net/data_and_products/gebco_web_services/web_map_service/mapserv',
        { layers: 'GEBCO_LATEST', format: 'image/jpeg', version: '1.3.0', opacity: 0.55, attribution: '© GEBCO', maxZoom: 18 }
      ).addTo(leafRef.current);
    }
  }, [gebcoOn, mapReady]);

  // ───────────────── INIT MAP ─────────────────
  // CHANGED: added full Leaflet CSS+JS loading — was missing entirely.
  // Old code: just did `if (window.L) load()` with no loading logic,
  // so NavMode showed a blank page whenever visited before RoutePlannerPage.
  useEffect(() => {
    if (leafRef.current) return;

    const load = () => {
      if (!mapRef.current || !window.L) return;
      const L = window.L;

      leafRef.current = L.map(mapRef.current, { center: [20, 70], zoom: 4 });

      baseTileRef.current = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { subdomains: 'abcd', attribution: '© CARTO' }
      ).addTo(leafRef.current);

      // NEW: OpenSeaMap nautical overlay — always on in Nav Mode
      // Shows depth contours, buoys, traffic separation, wrecks
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        opacity: 0.55, maxZoom: 18, attribution: '© OpenSeaMap',
      }).addTo(leafRef.current);

      // NEW: depth on click — queries GEBCO 2020 via OpenTopoData
      // Always active in Nav Mode; shows depth popup when user taps ocean
      leafRef.current.on('click', async (e) => {
        try {
          const res  = await fetch(`https://api.opentopodata.org/v1/gebco2020?locations=${e.latlng.lat},${e.latlng.lng}`);
          const data = await res.json();
          const elev = data?.results?.[0]?.elevation;
          if (elev === undefined || elev === null) return;
          const label = elev <= 0
            ? `🌊 Depth: <b style="color:#00D4FF">${Math.abs(elev).toFixed(0)} m</b>`
            : `⛰ Elevation: <b style="color:#00C896">${elev.toFixed(0)} m</b>`;
          L.popup()
            .setLatLng(e.latlng)
            .setContent(
              `<div style="font-size:12px;min-width:170px;line-height:1.6">
                ${label}<br/>
                <span style="color:#aaa;font-size:11px">${e.latlng.lat.toFixed(5)}°N&nbsp;&nbsp;${e.latlng.lng.toFixed(5)}°E</span><br/>
                <span style="color:#666;font-size:10px">Source: GEBCO 2020</span>
              </div>`
            )
            .openOn(leafRef.current);
        } catch {}
      });

      setMapReady(true);

      // FIX: invalidateSize — Leaflet measures the container at creation time.
      // Inside a flex layout the container may have 0 height at that moment.
      safeInvalidate();
      [100, 300, 600, 1200].forEach(t => setTimeout(() => {
        try { leafRef.current?.invalidateSize({ animate: false }); } catch {}
      }, t));
    };

    // FIX: load Leaflet CSS + JS if not already present
    if (window.L) { load(); return; }

    if (!document.getElementById('lcss')) {
      const c = document.createElement('link'); c.id = 'lcss'; c.rel = 'stylesheet';
      c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(c);
    }
    if (!document.getElementById('ljs')) {
      const s = document.createElement('script'); s.id = 'ljs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = load;
      document.head.appendChild(s);
    } else {
      // Script tag exists but window.L may not be ready yet — retry
      const retry = setInterval(() => { if (window.L) { clearInterval(retry); load(); } }, 50);
      setTimeout(() => clearInterval(retry), 5000);
    }

    return () => {
      invalidateTimers.current.forEach(clearTimeout);
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }
    };
  }, []);

  // ───────────────── UI ─────────────────
  // CHANGED: container style — was `height: 100vh` which overflowed the app's flex layout.
  // Now uses flex: 1 + position: relative so the absolute controls panel anchors correctly.
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: "#040C1A", position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <div style={{ height: 44, display: "flex", alignItems: "center", padding: 10, color: "#00D4FF", fontWeight: 700, flexShrink: 0 }}>
        NAV MODE (AIS + CPA + COLREG)
      </div>

      {/* CHANGED: map div uses flex: 1 instead of calc(100vh - 44px) */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

      <div style={{ position: "absolute", top: 60, right: 10, background: "#0A1A2F", padding: 10, borderRadius: 10, color: "#fff", zIndex: 500, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={gpsOn} onChange={(e) => setGpsOn(e.target.checked)} />
          📍 GPS
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={aisOn} onChange={(e) => setAisOn(e.target.checked)} />
          📡 AIS LIVE
        </label>
        {/* NEW: GEBCO toggle checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem' }}>
          <input type="checkbox" checked={gebcoOn} onChange={(e) => setGebcoOn(e.target.checked)} />
          🌊 GEBCO Depth
        </label>
        <div style={{ fontSize: '0.65rem', color: '#4A5F80', marginTop: 2, lineHeight: 1.4 }}>
          Click map for depth
        </div>
      </div>
    </div>
  );
}
