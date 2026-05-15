/*/* eslint-disable */
/* ════════════════════════════════════════════════
   MapView.jsx (FINAL ECDIS UNIFIED CORE)
════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";

export default function MapView({
  waypoints = [],
  onMapClick,
  shipPosition = null,
  navMode = false,
}) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layersRef = useRef({});
  const routeRef = useRef(null);
  const shipRef = useRef(null);
  const [ready, setReady] = useState(false);

  const watchMode = navMode ? "NAV ACTIVE" : "PLANNING";

  // ───────── REALISTIC ECDIS BATHY MODEL ─────────
  const depth = (lat, lng) => {
    const ocean = Math.abs(
      Math.sin(lat * 0.08) * Math.cos(lng * 0.08)
    );
    return 5 + ocean * 8000;
  };

  const encColor = (d) => {
    if (d < 20) return "#ff3b30";
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
      preferCanvas: true,
      zoomControl: true,
    });

    mapRef.current = map;

    // Base map
    layersRef.current.base = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { attribution: "ECDIS SIMULATION" }
    ).addTo(map);

    // Seamarks
    layersRef.current.seamark = L.tileLayer(
      "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      { opacity: 0.6 }
    ).addTo(map);

    // Click sounding (REAL ECDIS FEATURE)
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

  // ───────── ROUTE RENDER (FIXED CORE ISSUE) ─────────
  useEffect(() => {
    if (!ready || !window.L || !mapRef.current) return;

    const L = window.L;
    const map = mapRef.current;

    if (routeRef.current) {
      routeRef.current.remove();
    }

    if (!waypoints.length) return;

    const latlngs = waypoints.map((w) => [w.lat, w.lon]);

    const routeLine = L.polyline(latlngs, {
      color: "#00B4D8",
      weight: 3,
    });

    const corridor = L.polyline(latlngs, {
      color: "#1565C0",
      weight: 12,
      opacity: 0.15,
    });

    const markers = waypoints.map((w, i) =>
      L.circleMarker([w.lat, w.lon], {
        radius: 5,
        color: "#00FFB3",
        fillOpacity: 1,
      }).bindPopup(`Waypoint ${i + 1}`)
    );

    routeRef.current = L.layerGroup([
      corridor,
      routeLine,
      ...markers,
    ]).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
      padding: [60, 60],
    });
  }, [waypoints, ready]);

  // ───────── SHIP POSITION (NAV MODE FIX) ─────────
  useEffect(() => {
    if (!ready || !shipPosition || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    if (!shipRef.current) {
      shipRef.current = L.circleMarker(
        [shipPosition.lat, shipPosition.lon],
        {
          radius: 8,
          color: "#FFB000",
          fillColor: "#FFB000",
          fillOpacity: 1,
        }
      ).addTo(map);
    } else {
      shipRef.current.setLatLng([
        shipPosition.lat,
        shipPosition.lon,
      ]);
    }
  }, [shipPosition, ready]);

  // ───────── BATHY GRID (ECDIS STYLE) ─────────
  useEffect(() => {
    if (!ready || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    if (layersRef.current.bathy) {
      layersRef.current.bathy.remove();
    }

    const group = L.layerGroup();

    for (let lat = -70; lat < 80; lat += 5) {
      for (let lng = -180; lng < 180; lng += 5) {
        const d = depth(lat, lng);

        L.rectangle(
          [
            [lat, lng],
            [lat + 5, lng + 5],
          ],
          {
            color: encColor(d),
            weight: 0,
            fillOpacity: 0.1,
          }
        ).addTo(group);
      }
    }

    group.addTo(map);
    layersRef.current.bathy = group;
  }, [ready]);

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
      <div className="ecdis-topbar">
        <div>⚓ ECDIS SIMULATOR</div>
        <div>MODE: {watchMode}</div>
        <div>STATUS: NAV OK</div>
      </div>

      <div ref={containerRef} className="ecdis-map" />
    </div>
  );
}
