/* eslint-disable */
// src/components/MapView.jsx
import { useEffect, useRef, useState } from "react";
import { ECA_ZONES, SECA_ZONES, MARPOL_ZONES, PIRACY_ZONES, LAYOVER_ZONES } from "../constants";
import { recalcWaypoints } from "../utils";

function greatCircle(lat1, lon1, lat2, lon2, n) {
  const DEG = Math.PI / 180;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const d = 2*Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if (d === 0) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1-f)*d)/Math.sin(d), B = Math.sin(f*d)/Math.sin(d);
    const x = A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y = A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z = A*Math.sin(lat1*DEG)+B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z,Math.sqrt(x*x+y*y))/DEG, Math.atan2(y,x)/DEG]);
  }
  return pts;
}

function MapView({ waypoints, setWaypoints, overlays, playing, setPlaying, speed, onMapClick, mapMode }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // gebcoTile holds ESRI Ocean Reference layer when gebco is ON
  const layersRef = useRef({ route: null, markers: [], zones: {}, ship: null, trail: null, baseTile: null, seamarkTile: null, gebcoTile: null });
  const animRef = useRef(null);
  const animIdxRef = useRef(0);
  const animPtsRef = useRef([]);
  const [ready, setReady] = useState(false);

  const MAP_TILES = {
    night: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',              attr: '© OpenStreetMap © CARTO' },
    day:   { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',   attr: '© OpenStreetMap © CARTO' },
    dusk:  { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap © CARTO', filter: 'sepia(40%) saturate(70%) brightness(70%)' },
  };

  // CHANGED: ECDIS-style depth display — no colour shading, depth values as numbers
  //
  // OLD behaviour (gebco ON):
  //   Layer 1 → ESRI Ocean Base  (heavy blue/green colour shading)   ← user did NOT want this
  //   Layer 2 → ESRI Ocean Reference (depth numbers, port names)
  //
  // NEW behaviour (gebco ON):
  //   Layer 1 → Carto Voyager light basemap (clean white/chart background, no shading)
  //   Layer 2 → ESRI Ocean Reference only   (depth soundings in metres at zoom ≥9,
  //              shipping lanes, port labels — looks like ECDIS at higher zoom levels)
  //   Layer 3 → OpenSeaMap at opacity 0.85  (seamarks, buoys, depth contours — more visible)
  //
  // ESRI Ocean Reference depth numbers appear at zoom 9+.
  // Zoom in past zoom 9 to see individual metre values like a real ENC chart.
  useEffect(() => {
    if (!ready || !window.L || !mapRef.current) return;
    const L = window.L, map = mapRef.current, lrs = layersRef.current;

    if (lrs.baseTile)    { lrs.baseTile.remove();    lrs.baseTile    = null; }
    if (lrs.seamarkTile) { lrs.seamarkTile.remove(); lrs.seamarkTile = null; }
    if (lrs.gebcoTile)   { lrs.gebcoTile.remove();   lrs.gebcoTile   = null; }

    if (overlays?.gebco) {
      // CHANGED: Light Carto Voyager base — white/chart-like background, no colour shading.
      // Replaces ESRI Ocean Base which caused the blue/green depth shading the user didn't want.
      lrs.baseTile = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 }
      ).addTo(map);
      if (containerRef.current) containerRef.current.style.filter = 'none';

      // UNCHANGED url — ESRI Ocean Reference layer.
      // This layer contains: depth soundings (metres) at zoom ≥9, shipping separation
      // schemes, port names, maritime boundaries — the ECDIS-style info the user wants.
      // opacity raised to 1.0 (was implicit 1.0 before, now explicit for clarity).
      lrs.gebcoTile = L.tileLayer(
        'https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: 'Tiles © Esri — GEBCO, NOAA, National Geographic', opacity: 1.0 }
      ).addTo(map);
    } else {
      const cfg = MAP_TILES[mapMode] || MAP_TILES.night;
      lrs.baseTile = L.tileLayer(cfg.url, { attribution: cfg.attr, subdomains: 'abcd', maxZoom: 19 }).addTo(map);
      if (containerRef.current) containerRef.current.style.filter = cfg.filter || 'none';
    }

    // CHANGED: OpenSeaMap opacity is now 0.85 when GEBCO/ECDIS mode is ON (was fixed 0.55).
    // Higher opacity makes seamarks, buoys and depth contour lines more readable
    // against the light chart background — closer to real ENC display.
    // Reverts to 0.55 in normal (dark/dusk) map modes so marks don't overpower the basemap.
    const seamarkOpacity = overlays?.gebco ? 0.85 : 0.55;
    lrs.seamarkTile = L.tileLayer(
      'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      { opacity: seamarkOpacity, maxZoom: 18 }
    ).addTo(map);

  }, [mapMode, ready, overlays?.gebco]);

  const initMap = () => {
    if (mapRef.current || !containerRef.current) return;
    const L = window.L;
    mapRef.current = L.map(containerRef.current, { center: [15, 70], zoom: 3, preferCanvas: true, zoomControl: true });
    layersRef.current.baseTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(mapRef.current);
    layersRef.current.seamarkTile = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { opacity: 0.55, maxZoom: 18 }).addTo(mapRef.current);
    mapRef.current.on('click', e => { onMapClick && onMapClick(e.latlng.lat, e.latlng.lng); });
    setReady(true);
    // FIX: invalidateSize — container may be 0px tall in flex layout at init time
    [100, 300, 600, 1200].forEach(t => setTimeout(() => {
      try { mapRef.current?.invalidateSize({ animate: false }); } catch {}
    }, t));
  };

  useEffect(() => {
    if (window.L) { initMap(); return; }
    if (!document.getElementById('lcss')) {
      const c = document.createElement('link'); c.id = 'lcss'; c.rel = 'stylesheet';
      c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(c);
    }
    if (!document.getElementById('ljs')) {
      const s = document.createElement('script'); s.id = 'ljs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = initMap; document.head.appendChild(s);
    } else {
      if (window.L) { initMap(); }
      else {
        const retry = setInterval(() => { if (window.L) { clearInterval(retry); initMap(); } }, 50);
        setTimeout(() => clearInterval(retry), 5000);
      }
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      // FIX: reset layersRef on unmount — prevents stale Leaflet refs crashing on remount
      layersRef.current = { route: null, markers: [], zones: {}, ship: null, trail: null, baseTile: null, seamarkTile: null, gebcoTile: null };
    };
  }, []);

  useEffect(() => {
    if (!ready || !window.L) return;
    const L = window.L, map = mapRef.current, lrs = layersRef.current;
    if (lrs.route) { lrs.route.remove(); lrs.route = null; }
    lrs.markers.forEach(m => m.remove()); lrs.markers = [];
    if (lrs.ship) { lrs.ship.remove(); lrs.ship = null; }
    if (waypoints.length === 0) return;
    const latlngs = waypoints.map(w => [w.lat, w.lon]);
    lrs.route = L.polyline(latlngs, { color: '#00B4D8', weight: 2.5, opacity: 0.9, dashArray: '8 4' }).addTo(map);
    waypoints.forEach((wp, i) => {
      const isFirst = i === 0, isLast = i === waypoints.length - 1;
      const color = isFirst ? '#00C896' : isLast ? '#FF4757' : '#00B4D8';
      const size = isFirst || isLast ? 14 : 9;
      const icon = L.divIcon({
        html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${size}px;height:${size}px;cursor:pointer;"></div>`,
        className: '', iconSize: [size, size], iconAnchor: [size/2, size/2]
      });
      const m = L.marker([wp.lat, wp.lon], { icon, draggable: true, zIndexOffset: isFirst || isLast ? 100 : 0 });
      const popupHtml = `<div style="font-size:12px;min-width:130px;"><b style="color:#00B4D8">WP${String(i+1).padStart(2,'0')}${wp.name ? ` — ${wp.name}` : ''}</b><br/>Lat: ${wp.lat.toFixed(5)}°<br/>Lon: ${wp.lon.toFixed(5)}°${i > 0 ? `<br/>Course: ${(wp.bearing||0).toFixed(1)}°<br/>Leg: ${(wp.distance||0).toFixed(1)} NM` : ''}${wp.totalNM ? `<br/>Total: ${wp.totalNM.toFixed(1)} NM` : ''}</div>`;
      m.bindPopup(popupHtml);
      m.on('dragend', e => {
        const { lat, lng } = e.target.getLatLng();
        setWaypoints(wps => { const u = [...wps]; u[i] = { ...u[i], lat, lon: lng }; return recalcWaypoints(u); });
      });
      m.addTo(map); lrs.markers.push(m);
    });
    if (waypoints.length > 1) map.fitBounds(lrs.route.getBounds(), { padding: [50, 50] });
    const pts = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const seg = greatCircle(waypoints[i].lat, waypoints[i].lon, waypoints[i+1].lat, waypoints[i+1].lon, 30);
      pts.push(...(i > 0 ? seg.slice(1) : seg));
    }
    animPtsRef.current = pts; animIdxRef.current = 0;
  }, [waypoints, ready]);

  useEffect(() => {
    if (!ready || !window.L) return;
    const L = window.L, map = mapRef.current, lrs = layersRef.current;
    Object.values(lrs.zones).forEach(l => l.remove()); lrs.zones = {};
    const cfg = {
      eca:     { zones: ECA_ZONES,     color: '#FF6B35', label: 'ECA Area'      },
      seca:    { zones: SECA_ZONES,    color: '#FFB347', label: 'SECA Area'     },
      marpol:  { zones: MARPOL_ZONES,  color: '#9B59B6', label: 'MARPOL Area'   },
      piracy:  { zones: PIRACY_ZONES,  color: '#E74C3C', label: 'Piracy Area'   },
      layover: { zones: LAYOVER_ZONES, color: '#3498DB', label: 'Anchorage'     },
    };
    Object.entries(cfg).forEach(([k, c]) => {
      if (!overlays?.[k]) return;
      const lg = L.layerGroup();
      c.zones.forEach(z => {
        L.polygon(z.coords.map(p => Array.isArray(p) ? p : [p[0], p[1]]),
          { color: c.color, fillColor: c.color, fillOpacity: 0.18, weight: 1.5, opacity: 0.8 })
          .bindPopup(`<b>${z.name}</b><br/>${c.label}`).addTo(lg);
      });
      lg.addTo(map); lrs.zones[k] = lg;
    });
  }, [overlays, ready]);

  useEffect(() => {
    if (!ready || !window.L) return;
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    if (!playing) { if (layersRef.current.ship) { layersRef.current.ship.remove(); layersRef.current.ship = null; } animIdxRef.current = 0; return; }
    const L = window.L, map = mapRef.current, pts = animPtsRef.current;
    if (pts.length < 2) return;
    const shipIcon = L.divIcon({ html: `<div style="font-size:22px;line-height:1;">🚢</div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
    if (!layersRef.current.ship) layersRef.current.ship = L.marker(pts[0], { icon: shipIcon, zIndexOffset: 500 }).addTo(map);
    let idx = animIdxRef.current;
    const ms = Math.max(30, 1500 / Math.max(1, speed));
    animRef.current = setInterval(() => {
      if (idx >= pts.length) { clearInterval(animRef.current); setPlaying(false); animIdxRef.current = 0; return; }
      layersRef.current.ship && layersRef.current.ship.setLatLng(pts[idx]);
      idx++; animIdxRef.current = idx;
    }, ms);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [playing, speed, ready]);

  // Depth on click — shows "⏳ Fetching depth…" popup immediately,
  // then replaces content with result or error.
  // Uses opentopodata.org GEBCO 2020 dataset — CORS-safe, free, browser-compatible.
  // Depth values are negative for ocean (converted to positive metres in display).
  useEffect(() => {
    if (!ready || !window.L || !mapRef.current) return;
    const map = mapRef.current;
    const L = window.L;

    const handleDepthClick = async (e) => {
      // Show loading popup immediately so user has instant feedback
      const popup = L.popup({ closeOnClick: false, autoClose: false })
        .setLatLng(e.latlng)
        .setContent('<div style="font-size:12px;padding:2px 4px">⏳ Fetching depth…</div>')
        .openOn(map);
      try {
        const res = await fetch(
          `https://api.opentopodata.org/v1/gebco2020?locations=${e.latlng.lat},${e.latlng.lng}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const elev = data?.results?.[0]?.elevation;
        if (elev === undefined || elev === null) throw new Error('No data returned');
        const isOcean = elev <= 0;
        const label = isOcean
          ? `🌊 Depth: <b style="color:#00B4D8">${Math.abs(elev).toFixed(0)} m</b>`
          : `⛰ Elevation: <b style="color:#00C896">${elev.toFixed(0)} m</b>`;
        popup.setContent(
          `<div style="font-size:12px;min-width:170px;line-height:1.7">
            ${label}<br/>
            <span style="color:#888;font-size:11px">${e.latlng.lat.toFixed(5)}°N&nbsp;&nbsp;${e.latlng.lng.toFixed(5)}°E</span><br/>
            <span style="color:#555;font-size:10px">Source: GEBCO 2020</span>
          </div>`
        );
      } catch (err) {
        popup.setContent(
          `<div style="font-size:12px;color:#ff6b6b;min-width:140px">
            ⚠ Depth unavailable<br/>
            <span style="font-size:10px;color:#aaa">${err.message}</span>
          </div>`
        );
      }
    };

    if (overlays?.depthClick) map.on('click', handleDepthClick);
    return () => map.off('click', handleDepthClick);
  }, [overlays?.depthClick, ready]);

  const activeOverlays = Object.entries(overlays || {}).filter(([, v]) => v);
  const legendColors = { eca: '#FF6B35', seca: '#FFB347', marpol: '#9B59B6', piracy: '#E74C3C', layover: '#3498DB', gebco: '#00B4D8', depthClick: '#00C896' };
  const legendNames  = { eca: 'ECA', seca: 'SECA', marpol: 'MARPOL', piracy: 'Piracy', layover: 'Anchorage', gebco: 'Ocean Depth', depthClick: 'Depth Click' };

  return (
    <div className="planner-map">
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 400 }} />
      {!ready && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', zIndex: 10 }}>
        <div className="loading"><div className="spin" /><span>Loading nautical map…</span></div>
      </div>}
      {activeOverlays.length > 0 && (
        <div className="map-legend">
          {activeOverlays.map(([k]) => legendColors[k] ? (
            <div key={k} className="leg-item">
              <div className="leg-dot" style={{ background: legendColors[k] }} />
              <span style={{ color: 'var(--text2)' }}>{legendNames[k]}</span>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

export default MapView;
