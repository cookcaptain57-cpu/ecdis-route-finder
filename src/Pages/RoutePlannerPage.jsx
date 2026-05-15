// src/pages/RoutePlannerPage.jsx

import { useState, useEffect, useMemo } from "react";
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
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [clickAdd, setClickAdd] = useState(false);

  const [dbSuggestions, setDbSuggestions] = useState([]);
  const [showDbSugg, setShowDbSugg] = useState(false);

  // ⚓ ECDIS ship preview state (for MapView compatibility)
  const [shipPosition, setShipPosition] = useState(null);

  const totalNM = useMemo(() => totalRouteNM(waypoints), [waypoints]);

  // ───────── PORT SEARCH ─────────
  const searchPort = (q, setSugg) => {
    if (!q || q.trim().length < 2) {
      setSugg([]);
      return;
    }

    const ql = q.toLowerCase().trim();

    setSugg(
      portsList
        .filter((p) => {
          const kw = (
            p.keywords ||
            [p.name, p.city, p.country, p.id]
              .filter(Boolean)
              .join(" ")
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
  };

  useEffect(() => {
    searchPort(fromPort, setDbSuggestions);
  }, [fromPort]);

  useEffect(() => {
    searchPort(toPort, setDbSuggestions);
  }, [toPort]);

  // ───────── AUTO SHIP PREVIEW (ECDIS STYLE) ─────────
  useEffect(() => {
    if (!waypoints.length) return;

    setShipPosition({
      lat: waypoints[0].lat,
      lon: waypoints[0].lon,
      speed: 12,
      cog: 90,
    });
  }, [waypoints]);

  // ───────── ROUTE GENERATION ─────────
  const generateRoute = () => {
    const f = portsList.find(
      (p) =>
        p.name?.toLowerCase() === fromPort.toLowerCase() ||
        p.id?.toLowerCase() === fromPort.toLowerCase()
    );

    const t = portsList.find(
      (p) =>
        p.name?.toLowerCase() === toPort.toLowerCase() ||
        p.id?.toLowerCase() === toPort.toLowerCase()
    );

    if (!f || !t) {
      notify("Select valid departure and arrival ports", "error");
      return;
    }

    const wps = buildAutoRoute(f.id, t.id);

    if (!wps.length) {
      notify("Could not generate route", "error");
      return;
    }

    setWaypoints(wps);
    setRouteName(`${f.name} → ${t.name}`);

    notify(
      `Route generated: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(0)} NM`,
      "success"
    );
  };

  // ───────── RTZ LOAD ─────────
  const handleRTZLoad = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      const result = parseRTZ(ev.target.result);

      if (!result?.waypoints?.length) {
        notify("Invalid RTZ file", "error");
        return;
      }

      setWaypoints(result.waypoints);
      setRouteName(result.name);

      notify(
        `Loaded: ${result.name} (${result.waypoints.length} WPs)`,
        "success"
      );
    };

    reader.readAsText(file);
  };

  // ───────── MAP CLICK ADD WAYPOINT ─────────
  const handleMapClick = (lat, lon) => {
    if (!clickAdd) return;

    setWaypoints((wps) =>
      recalcWaypoints([
        ...wps,
        {
          lat: Math.round(lat * 10000) / 10000,
          lon: Math.round(lon * 10000) / 10000,
        },
      ])
    );
  };

  // ───────── CLEAR ROUTE ─────────
  const clearRoute = () => {
    setWaypoints([]);
    setPlaying(false);
    setShipPosition(null);
  };

  return (
    <div>
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
