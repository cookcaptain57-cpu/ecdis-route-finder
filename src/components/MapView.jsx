/* ════════════════════════════════════════════════════════
   MapView.jsx
   IMO-STYLE ECDIS UI (WEB SIMULATION)
════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";

export default function MapView({ waypoints = [], onMapClick }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef({});
  const [ready, setReady] = useState(false);
  const [watchMode] = useState("NAV");

  // ───────── ENC STYLE DEPTH MODEL ─────────
  const depth = (lat, lng) => {
    const v = Math.abs(Math.sin(lat * 0.1) * Math.cos(lng * 0.1));
    return 10 + v * 6000;
  };

  const encColor = (d) => {
    if (d < 20) return "#ff3b30";   // danger shallow
    if (d < 50) return "#ff9500";
    if (d < 200) return "#ffd60a";
    if (d < 1000) return "#34c759";
    return "#0a84ff";
  };

  // ───────── INIT MAP ─────────
  const init = () => {
    if (mapRef.current) return;

    const L = window.L;

    const map = L.map(containerRef.current, {
      center: [20, 70],
      zoom: 3,
      zoomControl: true,
      preferCanvas: true,
    });

    mapRef.current = map;

    // DARK ECDIS BASE (IMO STYLE)
    layersRef.current.base = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "ECDIS SIMULATION © OpenStreetMap" }
    ).addTo(map);

    // SEAMARK LAYER (NAV AIDS)
    layersRef.current.seamark = L.tileLayer(
      "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      { opacity: 0.65 }
    ).addTo(map);

    // CLICK SOUNDING (ECDIS FEATURE)
    map.on("click", (e) => {
      const d = depth(e.latlng.lat, e.latlng.lng);

      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="font-family: monospace; font-size:12px">
            ⚓ <b>ECDIS SOUNDING</b><br/>
            Depth: <b>${d.toFixed(0)} m</b><br/>
            ${d < 30 ? "⚠ SHALLOW WATER" : "✓ SAFE WATER"}
          </div>
        `)
        .openOn(map);

      onMapClick?.(e.latlng.lat, e.latlng.lng);
    });

    setReady(true);
  };

  // ───────── BATHYMETRY GRID (IMO STYLE VISUAL) ─────────
  useEffect(() => {
    if (!ready || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    if (layersRef.current.bathy) {
      map.removeLayer(layersRef.current.bathy);
    }

    const group = L.layerGroup();

    // ENC GRID (SIMPLIFIED BATHY LAYERS)
    for (let lat = -70; lat < 80; lat += 2.5) {
      for (let lng = -180; lng < 180; lng += 2.5) {
        const d = depth(lat, lng);

        L.rectangle(
          [
            [lat, lng],
            [lat + 2.5, lng + 2.5],
          ],
          {
            color: encColor(d),
            weight: 0,
            fillOpacity: 0.15,
          }
        ).addTo(group);
      }
    }

    group.addTo(map);
    layersRef.current.bathy = group;
  }, [ready]);

  // ───────── ROUTE SAFETY ENGINE ─────────
  useEffect(() => {
    if (!ready || !waypoints.length) return;

    const unsafe = waypoints.some((w) => depth(w.lat, w.lon) < 25);

    if (unsafe) {
      console.warn("⚠ ECDIS ALERT: Shallow water detected on route");
    }
  }, [waypoints, ready]);

  // ───────── LOAD LEAFLET ─────────
  useEffect(() => {
    if (window.L) return init();

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src =
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = init;
    document.head.appendChild(js);
  }, []);

  return (
    <div className="ecdis-container">
      {/* TOP NAV BAR (IMO STYLE) */}
      <div className="ecdis-topbar">
        <div>⚓ ECDIS SIMULATOR</div>
        <div>MODE: {watchMode}</div>
        <div>STATUS: NAV OK</div>
      </div>

      {/* MAP */}
      <div ref={containerRef} className="ecdis-map" />
    </div>
  );
}
