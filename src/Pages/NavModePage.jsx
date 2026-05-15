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

  const aisWsRef = useRef(null);

  const invalidateTimers = useRef([]);

  const [mapReady, setMapReady] = useState(false);
  const [gpsOn, setGpsOn] = useState(false);
  const [aisOn, setAisOn] = useState(false);

  const [aisTargets, setAisTargets] = useState({});

  const [autoCenter, setAutoCenterRaw] = useState(true);
  const [mapMode] = useState("night");

  // ───────────────── SAFE MAP INVALIDATE ─────────────────
  const safeInvalidate = useCallback(() => {
    invalidateTimers.current.forEach(clearTimeout);
    invalidateTimers.current = [];

    const fix = () => {
      try {
        leafRef.current?.invalidateSize({ animate: false });
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

  // ───────────────── Haversine (NM) ─────────────────
  const distanceNM = (lat1, lon1, lat2, lon2) => {
    const R = 3440.065;
    const d = Math.PI / 180;

    const a =
      Math.sin(((lat2 - lat1) * d) / 2) ** 2 +
      Math.cos(lat1 * d) *
        Math.cos(lat2 * d) *
        Math.sin(((lon2 - lon1) * d) / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // ───────────────── CPA / TCPA ENGINE ─────────────────
  const calcCPA = (own, tgt) => {
    const speedToNMhr = (sog) => sog || 0;

    const dx = tgt.lon - own.lon;
    const dy = tgt.lat - own.lat;

    const tcpaHours =
      ((dx * tgt.cog - dy * own.cog) || 0) / 1000;

    const cpa = distanceNM(
      own.lat,
      own.lon,
      tgt.lat,
      tgt.lon
    );

    return {
      cpa,
      tcpa: Math.max(tcpaHours, 0),
    };
  };

  // ───────────────── COLREG CLASSIFIER ─────────────────
  const getCOLREG = (own, tgt) => {
    const bearing =
      (Math.atan2(
        tgt.lon - own.lon,
        tgt.lat - own.lat
      ) *
        180) /
        Math.PI +
      360;

    const rel = (bearing - own.cog + 360) % 360;

    if (rel > 345 || rel < 15)
      return "HEAD-ON ⚠";
    if (rel > 112.5 && rel < 247.5)
      return "OVERTAKING ⚠";
    if (rel > 15 && rel < 112.5)
      return "CROSSING (STARBOARD GIVE WAY)";
    if (rel > 247.5 && rel < 345)
      return "CROSSING (YOU GIVE WAY)";

    return "SAFE";
  };

  // ───────────────── AIS STREAM (FREE) ─────────────────
  useEffect(() => {
    if (!aisOn) {
      aisWsRef.current?.close();
      aisWsRef.current = null;
      return;
    }

    const ws = new WebSocket(
      "wss://stream.aisstream.io/v0/stream"
    );

    aisWsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          Apikey: "FREE_TIER",
          BoundingBoxes: [
            [-90, -180],
            [90, 180],
          ],
          FilterMessageTypes: ["PositionReport"],
        })
      );
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        const p =
          data?.Message?.PositionReport;
        const m = data?.MetaData;

        if (!p || !m) return;

        const vessel = {
          mmsi: m.MMSI,
          lat: p.Latitude,
          lon: p.Longitude,
          cog: p.CourseOverGround || 0,
          sog: p.SpeedOverGround || 0,
        };

        setAisTargets((prev) => ({
          ...prev,
          [vessel.mmsi]: vessel,
        }));
      } catch {}
    };

    ws.onerror = () => notify("AIS stream error", "error");

    return () => ws.close();
  }, [aisOn]);

  // ───────────────── GPS FIX (NO CRASH) ─────────────────
  useEffect(() => {
    if (!gpsOn) return;

    if (!navigator.geolocation) {
      notify("GPS not supported", "error");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!leafRef.current) return;

        if (!layersRef.current.vessel) {
          const L = window.L;
          layersRef.current.vessel = L.circleMarker(
            [lat, lon],
            {
              radius: 8,
              color: "#00D4FF",
              fillColor: "#00D4FF",
              fillOpacity: 1,
            }
          ).addTo(leafRef.current);
        } else {
          layersRef.current.vessel.setLatLng([
            lat,
            lon,
          ]);
        }

        if (autoCenter) {
          leafRef.current.panTo([lat, lon]);
        }
      },
      () => notify("GPS error", "error"),
      {
        enableHighAccuracy: true,
      }
    );

    return () =>
      navigator.geolocation.clearWatch(id);
  }, [gpsOn]);

  // ───────────────── AIS RENDER + CPA ALERT ─────────────────
  useEffect(() => {
    if (!leafRef.current || !window.L) return;

    const L = window.L;

    // clear old AIS markers
    Object.values(layersRef.current.ais).forEach((m) =>
      leafRef.current.removeLayer(m)
    );

    layersRef.current.ais = {};

    Object.values(aisTargets).forEach((v) => {
      if (!v.lat || !v.lon) return;

      const own = layersRef.current.vessel?.getLatLng();

      const cpaData = own
        ? calcCPA(
            {
              lat: own.lat,
              lon: own.lng,
              cog: 0,
            },
            v
          )
        : null;

      const colreg = own
        ? getCOLREG(
            {
              lat: own.lat,
              lon: own.lng,
              cog: 0,
            },
            v
          )
        : "N/A";

      const color =
        cpaData?.cpa < 1
          ? "#ff3b30"
          : cpaData?.cpa < 5
          ? "#ff9500"
          : "#00D4FF";

      const marker = L.circleMarker(
        [v.lat, v.lon],
        {
          radius: 5,
          color,
          fillOpacity: 1,
        }
      )
        .bindPopup(
          `
        <b>AIS Vessel</b><br/>
        MMSI: ${v.mmsi}<br/>
        SOG: ${v.sog}<br/>
        COG: ${v.cog}<br/>
        CPA: ${cpaData?.cpa?.toFixed(2) || "-"} NM<br/>
        COLREG: ${colreg}
        `
        )
        .addTo(leafRef.current);

      layersRef.current.ais[v.mmsi] = marker;

      // ⚠ ALERT
      if (cpaData?.cpa < 1.5) {
        notify(
          `⚠ Collision Risk: MMSI ${v.mmsi}`,
          "error"
        );
      }
    });
  }, [aisTargets]);

  // ───────────────── INIT MAP ─────────────────
  useEffect(() => {
    if (leafRef.current) return;

    const load = () => {
      const L = window.L;

      leafRef.current = L.map(mapRef.current, {
        center: [20, 70],
        zoom: 4,
      });

      baseTileRef.current = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      ).addTo(leafRef.current);

      setMapReady(true);
    };

    if (window.L) load();
  }, []);

  // ───────────────── UI ─────────────────
  return (
    <div style={{ height: "100vh", background: "#040C1A" }}>
      <div
        style={{
          height: 44,
          display: "flex",
          alignItems: "center",
          padding: 10,
          color: "#00D4FF",
          fontWeight: 700,
        }}
      >
        NAV MODE (AIS + CPA + COLREG)
      </div>

      <div
        ref={mapRef}
        style={{ height: "calc(100vh - 44px)" }}
      />

      <div
        style={{
          position: "absolute",
          top: 60,
          right: 10,
          background: "#0A1A2F",
          padding: 10,
          borderRadius: 10,
          color: "#fff",
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={gpsOn}
            onChange={(e) =>
              setGpsOn(e.target.checked)
            }
          />
          GPS
        </label>

        <br />

        <label>
          <input
            type="checkbox"
            checked={aisOn}
            onChange={(e) =>
              setAisOn(e.target.checked)
            }
          />
          AIS LIVE
        </label>
      </div>
    </div>
  );
}
