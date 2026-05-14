// src/pages/RoutePlannerPage.jsx

import { useState, useEffect, useMemo } from "react";
import { PORTS_DB } from "../constants";
import { buildAutoRoute, recalcWaypoints, totalRouteNM } from "../routing";
import { parseRTZ, exportRTZ, exportCSV, downloadFile } from "../utils";
import MapView from "../components/MapView";
import ETACalculator from "../components/ETACalculator";

function RoutePlannerPage({ notify, sheetRoutes = [], portsDb = [] }) {
  const portsList = portsDb.length > 88 ? portsDb : PORTS_DB;

  const [panel, setPanel] = useState("auto");
  const [fromPort, setFromPort] = useState("");
  const [toPort, setToPort] = useState("");
  const [fromSugg, setFromSugg] = useState([]);
  const [toSugg, setToSugg] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [routeName, setRouteName] = useState("My Route");
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [clickAdd, setClickAdd] = useState(false);

  const [overlays, setOverlays] = useState({
    eca: false,
    seca: false,
    marpol: false,
    piracy: false,
    layover: false,
  });

  const [mapMode, setMapMode] = useState("night");
  const [dbSuggestions, setDbSuggestions] = useState([]);
  const [showDbSugg, setShowDbSugg] = useState(false);

  const totalNM = useMemo(() => totalRouteNM(waypoints), [waypoints]);

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
    searchPort(fromPort, setFromSugg);
  }, [fromPort]);

  useEffect(() => {
    searchPort(toPort, setToSugg);
  }, [toPort]);

  const searchEcdisRoutes = (dep, arr) => {
    if (!dep && !arr) return [];

    const ql = `${dep} ${arr}`.toLowerCase().trim();

    return sheetRoutes
      .filter((r) => {
        const hay = [
          r.fileName,
          r.portName,
          r.keywords,
          r.fileUrl,
          r["Route Name"],
          r["Port Name"],
          r["File Name"],
          r["Keywords"],
          Object.values(r).join(" "),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const depMatch =
          dep.length > 1 &&
          hay.includes(dep.toLowerCase().substring(0, 4));

        const arrMatch =
          arr.length > 1 &&
          hay.includes(arr.toLowerCase().substring(0, 4));

        return depMatch || arrMatch || hay.includes(ql.substring(0, 6));
      })
      .slice(0, 6);
  };

  const fallbackAutoRoute = () => {
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

    if (!f || !t) return;

    const wps = buildAutoRoute(f.id, t.id);

    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);

    notify(
      `Auto route: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(
        0
      )} NM`,
      "success"
    );
  };

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
      notify(
        "Select valid departure and arrival ports from suggestions",
        "error"
      );
      return;
    }

    const dbMatches = searchEcdisRoutes(f.name, t.name);

    if (dbMatches.length > 0) {
      setDbSuggestions(dbMatches);
      setShowDbSugg(true);

      notify(
        `Found ${dbMatches.length} route${
          dbMatches.length > 1 ? "s" : ""
        } in ECDIS database`,
        "success"
      );

      return;
    }

    setShowDbSugg(false);

    const wps = buildAutoRoute(f.id, t.id);

    if (wps.length < 2) {
      notify("Could not generate route for this port pair", "error");
      return;
    }

    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);

    notify(
      `Auto route: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(
        0
      )} NM`,
      "success"
    );
  };

  const useDbRoute = (r) => {
    setShowDbSugg(false);

    const url =
      r.fileUrl ||
      r["File URL"] ||
      r["Download URL"] ||
      r["Drive Link"] ||
      Object.values(r).find(
        (v) => typeof v === "string" && v.includes("drive.google")
      );

    if (!url) {
      fallbackAutoRoute();
      return;
    }

    notify("Loading route from ECDIS database…", "success");

    let fetchUrl = url;

    const gdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);

    if (gdMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;
    }

    fetch(fetchUrl, { mode: "cors" })
      .then((r) => r.text())
      .then((text) => {
        const result = parseRTZ(text);

        if (result && result.waypoints.length > 0) {
          setWaypoints(result.waypoints);

          const name =
            r.fileName ||
            r["File Name"] ||
            r["Route Name"] ||
            "ECDIS Route";

          setRouteName(name);

          notify(
            `Loaded: ${name} — ${result.waypoints.length} waypoints`,
            "success"
          );
        } else {
          notify(
            "Could not parse RTZ — using auto route fallback",
            "error"
          );

          fallbackAutoRoute();
        }
      })
      .catch(() => {
        notify(
          "Could not fetch RTZ file — using auto route fallback",
          "error"
        );

        fallbackAutoRoute();
      });
  };

  const handleRTZLoad = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      const result = parseRTZ(ev.target.result);

      if (!result || result.waypoints.length === 0) {
        notify("Could not parse RTZ file", "error");
        return;
      }

      setWaypoints(result.waypoints);
      setRouteName(result.name);

      notify(
        `Loaded: ${result.name} — ${result.waypoints.length} waypoints`,
        "success"
      );
    };

    reader.readAsText(file);
  };

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

  const removeWP = (i) => {
    setWaypoints((wps) =>
      recalcWaypoints(wps.filter((_, j) => j !== i))
    );
  };

  const clearRoute = () => {
    setWaypoints([]);
    setPlaying(false);
  };

  const toggleOverlay = (k) => {
    setOverlays((o) => ({
      ...o,
      [k]: !o[k],
    }));
  };

  return (
    <div>
      <MapView
        waypoints={waypoints}
        setWaypoints={setWaypoints}
        overlays={overlays}
        playing={playing}
        setPlaying={setPlaying}
        speed={speed}
        onMapClick={handleMapClick}
        mapMode={mapMode}
      />

      <ETACalculator totalNM={totalNM} />
    </div>
  );
}

export default RoutePlannerPage;
