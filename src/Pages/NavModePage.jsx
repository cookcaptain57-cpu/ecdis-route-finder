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

  const layersRef = useRef({
    route: null,
    vessel: null,
    vector: null,
    ais: {},
    trailLine: null,
    trail: [],
  });

  const wsRef = useRef(null);
  const gpsRef = useRef(null);
  const rotationRef = useRef(0);
  const invalidateTimers = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [aisOn, setAisOn] = useState(false);

  const [autoCenter, setAutoCenterRaw] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("nm_autoCenter") ?? "true"
      );
    } catch {
      return true;
    }
  });

  const [vectorTime, setVectorTimeRaw] = useState(() => {
    try {
      return parseInt(
        localStorage.getItem("nm_vectorTime") || "6"
      );
    } catch {
      return 6;
    }
  });

  const [mapMode, setMapModeRaw] = useState(
    () => localStorage.getItem("nm_mapMode") || "night"
  );

  const [orientMode, setOrientModeRaw] = useState(
    () => localStorage.getItem("nm_orientMode") || "north"
  );

  const [panelOpen, setPanelOpenRaw] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("nm_panelOpen") ?? "true"
      );
    } catch {
      return true;
    }
  });

  const [activeTab, setActiveTabRaw] = useState(
    () => localStorage.getItem("nm_activeTab") || "route"
  );

  // SAFE LOCAL STORAGE SETTERS

  const setAutoCenter = (v) => {
    const value =
      typeof v === "function"
        ? v(autoCenter)
        : v;

    setAutoCenterRaw(value);

    localStorage.setItem(
      "nm_autoCenter",
      JSON.stringify(value)
    );
  };

  const setVectorTime = (v) => {
    const value =
      typeof v === "function"
        ? v(vectorTime)
        : v;

    setVectorTimeRaw(value);

    localStorage.setItem(
      "nm_vectorTime",
      String(value)
    );
  };

  const setMapMode = (v) => {
    const value =
      typeof v === "function"
        ? v(mapMode)
        : v;

    setMapModeRaw(value);

    localStorage.setItem("nm_mapMode", value);
  };

  const setOrientMode = (v) => {
    const value =
      typeof v === "function"
        ? v(orientMode)
        : v;

    setOrientModeRaw(value);

    localStorage.setItem(
      "nm_orientMode",
      value
    );
  };

  const setPanelOpen = (v) => {
    const value =
      typeof v === "function"
        ? v(panelOpen)
        : v;

    setPanelOpenRaw(value);

    localStorage.setItem(
      "nm_panelOpen",
      JSON.stringify(value)
    );
  };

  const setActiveTab = (v) => {
    const value =
      typeof v === "function"
        ? v(activeTab)
        : v;

    setActiveTabRaw(value);

    localStorage.setItem(
      "nm_activeTab",
      value
    );
  };

  const [ownShip, setOwnShip] = useState(null);

  const [navRoute, setNavRouteRaw] = useState(() => {
    try {
      const s = localStorage.getItem("nm_route");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const setNavRoute = (v) => {
    setNavRouteRaw(v);

    try {
      if (v) {
        localStorage.setItem(
          "nm_route",
          JSON.stringify(v)
        );
      } else {
        localStorage.removeItem("nm_route");
      }
    } catch {}
  };

  const [routeSearch, setRouteSearch] = useState("");
  const [routeSuggs, setRouteSuggs] = useState([]);
  const [aisTargets, setAisTargets] = useState({});

  // SAFE INVALIDATE

  const safeInvalidate = useCallback(() => {
    invalidateTimers.current.forEach(clearTimeout);

    invalidateTimers.current = [];

    const fix = () => {
      try {
        leafRef.current?.invalidateSize({
          animate: false,
        });
      } catch {}
    };

    fix();

    invalidateTimers.current = [
      100,
      300,
      600,
      1000,
      1800,
    ].map((t) => setTimeout(fix, t));
  }, []);

  // MATH

  const haverNM = (
    la1,
    lo1,
    la2,
    lo2
  ) => {
    const R = 3440.065;
    const d = Math.PI / 180;

    const a =
      Math.sin(((la2 - la1) * d) / 2) ** 2 +
      Math.cos(la1 * d) *
        Math.cos(la2 * d) *
        Math.sin(((lo2 - lo1) * d) / 2) ** 2;

    return (
      2 *
      R *
      Math.asin(Math.sqrt(a))
    );
  };

  const cogBetween = (
    la1,
    lo1,
    la2,
    lo2
  ) => {
    const d = Math.PI / 180;
    const r = 180 / Math.PI;

    return (
      (Math.atan2(
        Math.sin((lo2 - lo1) * d) *
          Math.cos(la2 * d),
        Math.cos(la1 * d) *
          Math.sin(la2 * d) -
          Math.sin(la1 * d) *
            Math.cos(la2 * d) *
            Math.cos((lo2 - lo1) * d)
      ) *
        r +
        360) %
      360
    );
  };

  // TILES

  const TILES = {
    night: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      sub: "abcd",
    },
    day: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      sub: "abcd",
    },
    dusk: {
      url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
      sub: "abcd",
    },
  };

  // MAP INIT

  useEffect(() => {
    const load = () => {
      if (leafRef.current) return;

      if (!mapRef.current) {
        setTimeout(load, 100);
        return;
      }

      const L = window.L;

      leafRef.current = L.map(
        mapRef.current,
        {
          center: [20, 70],
          zoom: 4,
          preferCanvas: true,
          zoomControl: false,
          attributionControl: false,
        }
      );

      baseTileRef.current =
        L.tileLayer(
          TILES[mapMode]?.url ||
            TILES.night.url,
          {
            subdomains: "abcd",
            maxZoom: 20,
          }
        ).addTo(leafRef.current);

      L.control
        .zoom({
          position: "topleft",
        })
        .addTo(leafRef.current);

      requestAnimationFrame(() => {
        leafRef.current?.invalidateSize({
          animate: false,
        });

        setMapReady(true);
      });
    };

    if (window.L) {
      setTimeout(load, 80);
    }

    return () => {
      invalidateTimers.current.forEach(
        clearTimeout
      );

      if (leafRef.current) {
        leafRef.current.remove();
        leafRef.current = null;
      }
    };
  }, []);

  // UI

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        background: "#040C1A",
        position: "relative",
      }}
    >
      <div
        style={{
          height: 44,
          background:
            "rgba(4,12,26,0.92)",
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          gap: 8,
        }}
      >
        <button
          onClick={() =>
            setTab?.("home")
          }
          style={{
            background:
              "rgba(0,212,255,0.1)",
            border:
              "1px solid rgba(0,212,255,0.25)",
            borderRadius: 8,
            color: "#00D4FF",
            padding: "5px 11px",
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ← Menu
        </button>

        <span
          style={{
            color: "#00D4FF",
            fontWeight: 700,
          }}
        >
          NAV MODE
        </span>
      </div>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height:
            "calc(100vh - 44px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 60,
          right: 10,
          width: 240,
          background:
            "rgba(4,12,26,0.92)",
          border:
            "1px solid rgba(0,212,255,0.2)",
          borderRadius: 12,
          padding: 10,
        }}
      >
        <div
          style={{
            color: "#00D4FF",
            fontWeight: 700,
            marginBottom: 10,
          }}
        >
          Controls
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              color:
                "rgba(255,255,255,0.7)",
            }}
          >
            GPS
          </span>

          <input
            type="checkbox"
            checked={gpsOn}
            onChange={(e) =>
              setGpsOn(
                e.target.checked
              )
            }
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
          }}
        >
          <span
            style={{
              color:
                "rgba(255,255,255,0.7)",
            }}
          >
            AIS
          </span>

          <input
            type="checkbox"
            checked={aisOn}
            onChange={(e) =>
              setAisOn(
                e.target.checked
              )
            }
          />
        </div>
      </div>
    </div>
  );
}
