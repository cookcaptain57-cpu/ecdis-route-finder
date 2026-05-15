// src/pages/RoutePlannerPage.jsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { PORTS_DB } from "../constants";
import { buildAutoRoute } from "../routing";
import { recalcWaypoints, totalRouteNM, parseRTZ } from "../utils";
import MapView from "../components/MapView";
import ETACalculator from "../components/ETACalculator";

function RoutePlannerPage({ notify, sheetRoutes = [], portsDb = [] }) {
  const portsList = portsDb.length > 88 ? portsDb : PORTS_DB;

  const [fromPort, setFromPort] = useState("");
  const [toPort, setToPort] = useState("");
  const [waypoints, setWaypoints] = useState([]);
  const [routeName, setRouteName] = useState("My Route");
  const [clickAdd, setClickAdd] = useState(false);
  const [dbSuggestions, setDbSuggestions] = useState([]);
  const [showDbSugg, setShowDbSugg] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'from' | 'to'
  const [shipPosition, setShipPosition] = useState(null);

  const totalNM = useMemo(() => totalRouteNM(waypoints), [waypoints]);

  // ───────── PORT SEARCH ─────────
  // ✅ FIXED: wrapped in useCallback so it can be safely added to useEffect deps
  const searchPort = useCallback((q, setSugg) => {
    if (!q || q.trim().length < 2) { setSugg([]); return; }
    const ql = q.toLowerCase().trim();
    setSugg(
      portsList
        .filter((p) => {
          const kw = (
            p.keywords || [p.name, p.city, p.country, p.id].filter(Boolean).join(" ")
          ).toLowerCase();
          return (
            p.name?.toLowerCase().includes(ql) ||
            p.city?.toLowerCase().includes(ql) ||
            p.id?.toLowerCase().includes(ql) ||
            p.country?.toLowerCase().includes(ql) ||
            kw.includes(ql)
          );
        })
        .slice(0, 8)
    );
  }, [portsList]);

  // ✅ FIXED: searchPort added to dependency arrays
  useEffect(() => {
    setActiveField("from");
    setShowDbSugg(true);
    searchPort(fromPort, setDbSuggestions);
  }, [fromPort, searchPort]);

  useEffect(() => {
    setActiveField("to");
    setShowDbSugg(true);
    searchPort(toPort, setDbSuggestions);
  }, [toPort, searchPort]);

  // ───────── AUTO SHIP PREVIEW (ECDIS STYLE) ─────────
  useEffect(() => {
    if (!waypoints.length) return;
    setShipPosition({ lat: waypoints[0].lat, lon: waypoints[0].lon, speed: 12, cog: 90 });
  }, [waypoints]);

  // ───────── ROUTE GENERATION ─────────
  // ✅ FIXED: now called from the Generate Route button in JSX
  const generateRoute = () => {
    const f = portsList.find(
      (p) => p.name?.toLowerCase() === fromPort.toLowerCase() || p.id?.toLowerCase() === fromPort.toLowerCase()
    );
    const t = portsList.find(
      (p) => p.name?.toLowerCase() === toPort.toLowerCase() || p.id?.toLowerCase() === toPort.toLowerCase()
    );
    if (!f || !t) { notify("Select valid departure and arrival ports", "error"); return; }
    const wps = buildAutoRoute(f.id, t.id);
    if (!wps.length) { notify("Could not generate route", "error"); return; }
    setWaypoints(wps);
    setRouteName(`${f.name} → ${t.name}`);
    notify(`Route generated: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(0)} NM`, "success");
  };

  // ───────── RTZ LOAD ─────────
  // ✅ FIXED: now wired to a file input in JSX
  const handleRTZLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseRTZ(ev.target.result);
      if (!result?.waypoints?.length) { notify("Invalid RTZ file", "error"); return; }
      setWaypoints(result.waypoints);
      setRouteName(result.name);
      notify(`Loaded: ${result.name} (${result.waypoints.length} WPs)`, "success");
    };
    reader.readAsText(file);
  };

  // ───────── MAP CLICK ADD WAYPOINT ─────────
  const handleMapClick = (lat, lon) => {
    if (!clickAdd) return;
    setWaypoints((wps) =>
      recalcWaypoints([
        ...wps,
        { lat: Math.round(lat * 10000) / 10000, lon: Math.round(lon * 10000) / 10000 },
      ])
    );
  };

  // ───────── CLEAR ROUTE ─────────
  // ✅ FIXED: now called from the Clear button in JSX
  const clearRoute = () => {
    setWaypoints([]);
    setShipPosition(null);
    setFromPort("");
    setToPort("");
    setRouteName("My Route");
  };

  // ───────── SELECT PORT FROM SUGGESTION ─────────
  const selectPort = (port) => {
    if (activeField === "from") setFromPort(port.name);
    else setToPort(port.name);
    setDbSuggestions([]);
    setShowDbSugg(false);
  };

  return (
    <div className="section">
      {/* ── HEADER ── */}
      <div className="sec-hdr">
        <div className="sec-title">⚓ Route Planner</div>
        {routeName !== "My Route" && (
          <span className="badge badge-gold">{routeName}</span>
        )}
      </div>

      {/* ── PORT INPUTS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        {/* FROM */}
        <div className="siw" style={{ flex: 1, position: "relative" }}>
          <span className="si-ic">🛫</span>
          <input
            className="si"
            style={{ paddingLeft: 42 }}
            placeholder="From port…"
            value={fromPort}
            onChange={(e) => { setFromPort(e.target.value); setShowDbSugg(true); }}
            onBlur={() => setTimeout(() => setShowDbSugg(false), 150)}
          />
          {showDbSugg && activeField === "from" && dbSuggestions.length > 0 && (
            <div className="sugg-list">
              {dbSuggestions.map((p, i) => (
                <div key={i} className="sugg-item" onMouseDown={() => selectPort(p)}>
                  {p.name}{" "}
                  <span style={{ color: "var(--text3)", fontSize: "0.7rem" }}>{p.country}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* TO */}
        <div className="siw" style={{ flex: 1, position: "relative" }}>
          <span className="si-ic">🛬</span>
          <input
            className="si"
            style={{ paddingLeft: 42 }}
            placeholder="To port…"
            value={toPort}
            onChange={(e) => { setToPort(e.target.value); setShowDbSugg(true); }}
            onBlur={() => setTimeout(() => setShowDbSugg(false), 150)}
          />
          {showDbSugg && activeField === "to" && dbSuggestions.length > 0 && (
            <div className="sugg-list">
              {dbSuggestions.map((p, i) => (
                <div key={i} className="sugg-item" onMouseDown={() => selectPort(p)}>
                  {p.name}{" "}
                  <span style={{ color: "var(--text3)", fontSize: "0.7rem" }}>{p.country}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── ACTION BUTTONS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn btn-gold" onClick={generateRoute}>
          ⚓ Generate Route
        </button>

        <button
          className={`btn ${clickAdd ? "btn-gold" : "btn-secondary"}`}
          onClick={() => setClickAdd((v) => !v)}
        >
          {clickAdd ? "✅ Click to Add WP" : "➕ Add Waypoints"}
        </button>

        {/* RTZ file loader — label acts as the button */}
        <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
          📂 Load RTZ
          <input
            type="file"
            accept=".rtz"
            style={{ display: "none" }}
            onChange={handleRTZLoad}
          />
        </label>

        {waypoints.length > 0 && (
          <button className="btn btn-secondary" onClick={clearRoute}>
            🗑 Clear Route
          </button>
        )}
      </div>

      {/* ⚓ ECDIS MAP ENGINE */}
      <MapView
        waypoints={waypoints}
        onMapClick={handleMapClick}
        navMode={false}
        shipPosition={shipPosition}
      />

      {/* ⚓ ETA PANEL */}
      <ETACalculator totalNM={totalNM} />
    </div>
  );
}

export default RoutePlannerPage;
