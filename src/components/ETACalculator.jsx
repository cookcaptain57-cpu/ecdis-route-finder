// ════════════════════════════════════════════════════════════════
// components/ETACalculator.jsx
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useMemo } from "react";
import { TIMEZONES } from "../constants";           // ✅
import { addHours, formatDateLocal } from "../utils"; // ✅

export default function ETACalculator({ totalNM }) {
  const [mode, setMode] = useState("speed");
  const [speed, setSpeed] = useState("");
  const [depDate, setDepDate] = useState("");
  const [depTZ, setDepTZ] = useState("0");
  const [arrDate, setArrDate] = useState("");
  const [arrTZ, setArrTZ] = useState("0");
  const [extraHours, setExtraHours] = useState("0");
  const [distance, setDistance] = useState(
    totalNM ? totalNM.toFixed(1) : ""
  );

  useEffect(() => {
    if (totalNM > 0) setDistance(totalNM.toFixed(1));
  }, [totalNM]);

  const calc = useMemo(() => {
    const D = parseFloat(distance) || 0;
    const sp = parseFloat(speed) || 0;
    const extra = parseFloat(extraHours) || 0;
    const depOffset = parseFloat(depTZ) || 0;
    const arrOffset = parseFloat(arrTZ) || 0;

    const formatTime = (hrs) => {
      const days = Math.floor(hrs / 24);
      const hours = Math.floor(hrs % 24);
      const mins = Math.round((hrs % 1) * 60);
      return `${days}d ${hours}h ${mins}m`;
    };

    if (mode === "speed" && sp > 0 && D > 0 && depDate) {
      const sailHrs = D / sp;
      const totalHrs = sailHrs + extra;

      const depUTC = addHours(new Date(depDate), -depOffset);
      const arrUTC = addHours(depUTC, totalHrs);

      return {
        sailingTime: formatTime(sailHrs),
        totalTime: `${Math.floor(totalHrs / 24)}d ${Math.floor(
          totalHrs % 24
        )}h`,
        etaLocal: formatDateLocal(arrUTC, arrOffset),
        etaUTC:
          arrUTC.toISOString().replace("T", " ").substring(0, 16) +
          " UTC",
        depUTC:
          depUTC.toISOString().replace("T", " ").substring(0, 16) +
          " UTC",
        speedKt: sp.toFixed(1),
      };
    }

    if (mode === "arrival" && depDate && arrDate && D > 0) {
      const depUTC = addHours(new Date(depDate), -depOffset);
      const arrUTC = addHours(new Date(arrDate), -arrOffset);

      const diffHrs = (arrUTC - depUTC) / 3600000 - extra;

      if (diffHrs <= 0) {
        return {
          error: "Invalid time range",
        };
      }

      const reqSpeed = D / diffHrs;

      return {
        requiredSpeed: `${reqSpeed.toFixed(2)} knots`,
        totalTime: formatTime(diffHrs),
        feasible: reqSpeed < 25 ? "✅ Feasible" : "⚠️ Too fast",
        depUTC:
          depUTC.toISOString().replace("T", " ").substring(0, 16) +
          " UTC",
        etaUTC:
          arrUTC.toISOString().replace("T", " ").substring(0, 16) +
          " UTC",
      };
    }

    return null;
  }, [mode, speed, depDate, depTZ, arrDate, arrTZ, extraHours, distance]);

  return (
    <div>
      {/* MODE SWITCH */}
      <div className="eta-mode-tabs">
        {[
          ["speed", "Speed → ETA"],
          ["arrival", "Arrival → Speed"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={`emt ${mode === k ? "active" : ""}`}
            onClick={() => setMode(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {/* DISTANCE */}
      <div className="ff">
        <label className="fl">📏 Distance (NM)</label>
        <input
          className="fi"
          type="number"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
        />
      </div>

      {/* EXTRA HOURS */}
      <div className="ff">
        <label className="fl">🕐 Waiting / Port Stay (hrs)</label>
        <input
          className="fi"
          type="number"
          value={extraHours}
          onChange={(e) => setExtraHours(e.target.value)}
        />
      </div>

      {/* SPEED */}
      {mode === "speed" && (
        <div className="ff">
          <label className="fl">⚡ Speed (knots)</label>
          <input
            className="fi"
            type="number"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
          />
        </div>
      )}

      {/* DEP */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="ff">
          <label className="fl">🛳 Departure</label>
          <input
            className="fi"
            type="datetime-local"
            value={depDate}
            onChange={(e) => setDepDate(e.target.value)}
          />
        </div>

        <div className="ff">
          <label className="fl">🌍 Dep TZ</label>
          <select
            className="fi"
            value={depTZ}
            onChange={(e) => setDepTZ(e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.label} value={tz.offset}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ARRIVAL MODE */}
      {mode === "arrival" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div className="ff">
            <label className="fl">🏁 Arrival</label>
            <input
              className="fi"
              type="datetime-local"
              value={arrDate}
              onChange={(e) => setArrDate(e.target.value)}
            />
          </div>

          <div className="ff">
            <label className="fl">🌍 Arr TZ</label>
            <select
              className="fi"
              value={arrTZ}
              onChange={(e) => setArrTZ(e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.label} value={tz.offset}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* RESULT */}
      {calc && !calc.error && (
        <div className="eta-result">
          {mode === "speed" && (
            <>
              <div className="eta-row">
                <span className="eta-key">Speed</span>
                <span className="eta-val">{calc.speedKt} kn</span>
              </div>

              <div className="eta-row">
                <span className="eta-key">Sailing</span>
                <span className="eta-val gold">{calc.sailingTime}</span>
              </div>

              <div className="eta-row">
                <span className="eta-key">Total</span>
                <span className="eta-val gold">{calc.totalTime}</span>
              </div>

              <div className="eta-row">
                <span className="eta-key">ETA UTC</span>
                <span className="eta-val">{calc.etaUTC}</span>
              </div>
            </>
          )}

          {mode === "arrival" && (
            <>
              <div className="eta-row">
                <span className="eta-key">Req Speed</span>
                <span className="eta-val gold">
                  {calc.requiredSpeed}
                </span>
              </div>

              <div className="eta-row">
                <span className="eta-key">Time</span>
                <span className="eta-val">{calc.totalTime}</span>
              </div>

              <div className="eta-row">
                <span className="eta-key">Status</span>
                <span className="eta-val green">
                  {calc.feasible}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
