/* ════════════════════════════════════════════════════════
   MapView.jsx — TRUE ECDIS MASTER (MERGED)
════════════════════════════════════════════════════════ */

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

  const depth = (lat, lng) => {
    const v = Math.abs(Math.sin(lat * 0.1) * Math.cos(lng * 0.1));
    return 10 + v * 6000;
  };

  const encColor = (d) => {
    if (d < 20) return "#ff3b30";
    if (d < 50) return "#ff9500";
    if (d < 200) return "#ffd60a";
    if (d < 1000) return "#34c759";
    return "#0a84ff";
  };

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

    layersRef.current.base = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    ).addTo(map);

    layersRef.current.seamark = L.tileLayer(
      "https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png",
      { opacity: 0.6 }
    ).addTo(map);

    map.on("click", (e) => {
      const d = depth(e.latlng.lat, e.latlng.lng);

      L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="font-family:monospace;font-size:12px">
            ⚓ ECDIS SOUNDING<br/>
            Depth: <b>${d.toFixed(0)} m</b><br/>
            ${d < 30 ? "⚠ SHALLOW WATER" : "✓ SAFE WATER"}
          </div>
        `)
        .openOn(map);

      onMapClick?.(e.latlng.lat, e.latlng.lng);
    });

    setReady(true);
  };

  // ───── ROUTE + DEPTH AWARE RENDER ─────
  useEffect(() => {
    if (!ready || !window.L || !mapRef.current) return;

    const L = window.L;
    const map = mapRef.current;

    if (routeRef.current) routeRef.current.remove();
    if (!waypoints.length) return;

    const latlngs = waypoints.map((w) => [w.lat, w.lon]);

    const routeLine = L.polyline(latlngs, {
      color: "#00B4D8",
      weight: 3,
      opacity: 0.9,
    });

    const corridor = L.polyline(latlngs, {
      color: "#1565C0",
      weight: 10,
      opacity: 0.12,
    });

    const wpMarkers = waypoints.map((w, i) => {
      const d = depth(w.lat, w.lon);

      return L.circleMarker([w.lat, w.lon], {
        radius: 5,
        color: encColor(d),
        fillOpacity: 1,
      }).bindPopup(
        `WP ${i + 1}<br/>Depth: ${d.toFixed(0)}m<br/>${
          d < 25 ? "⚠ UNSAFE" : "✓ SAFE"
        }`
      );
    });

    routeRef.current = L.layerGroup([
      corridor,
      routeLine,
      ...wpMarkers,
    ]).addTo(map);

    map.fitBounds(routeLine.getBounds(), {
      padding: [50, 50],
    });

    // safety alert
    const unsafe = waypoints.some((w) => depth(w.lat, w.lon) < 25);
    if (unsafe) console.warn("⚠ ECDIS ALERT: Shallow water detected");
  }, [waypoints, ready]);

  // ───── SHIP NAVIGATION ─────
  useEffect(() => {
    if (!ready || !shipPosition || !window.L) return;

    const L = window.L;
    const map = mapRef.current;

    if (!shipRef.current) {
      shipRef.current = L.circleMarker(
        [shipPosition.lat, shipPosition.lon],
        {
          radius: 8,
          color: "#F0A500",
          fillColor: "#F0A500",
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

  // ───── BATHY GRID ─────
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
            fillOpacity: 0.12,
          }
        ).addTo(group);
      }
    }

    group.addTo(map);
    layersRef.current.bathy = group;
  }, [ready]);

  // ───── INIT ─────
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
        <div>MODE: {navMode ? "NAV ACTIVE" : "PLANNING"}</div>
        <div>STATUS: OK</div>
      </div>

      <div ref={containerRef} className="ecdis-map" />
    </div>
  );
}
