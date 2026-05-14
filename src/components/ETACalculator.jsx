// ════════════════════════════════════════════════════════════════
// components/ETACalculator.jsx
// To update: add new modes, change timezone list, change output fields
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo } from "react";
import { TIMEZONES, addHours, formatDateLocal } from "../constants";

export default function ETACalculator({ totalNM }) {
  const [mode, setMode]           = useState('speed');
  const [speed, setSpeed]         = useState('');
  const [depDate, setDepDate]     = useState('');
  const [depTZ, setDepTZ]         = useState('0');
  const [arrDate, setArrDate]     = useState('');
  const [arrTZ, setArrTZ]         = useState('0');
  const [extraHours, setExtraHours] = useState('0');
  const [distance, setDistance]   = useState(totalNM ? totalNM.toFixed(1) : '');

  useEffect(() => { if (totalNM > 0) setDistance(totalNM.toFixed(1)); }, [totalNM]);

  const calc = useMemo(() => {
    const D          = parseFloat(distance) || 0;
    const sp         = parseFloat(speed) || 0;
    const extra      = parseFloat(extraHours) || 0;
    const depOffset  = parseFloat(depTZ) || 0;
    const arrOffset  = parseFloat(arrTZ) || 0;

    if (mode === 'speed' && sp > 0 && D > 0 && depDate) {
      const sailHrs  = D / sp;
      const totalHrs = sailHrs + extra;
      const depUTC   = addHours(new Date(depDate), -depOffset);
      const arrUTC   = addHours(depUTC, totalHrs);
      return {
        sailingTime: `${Math.floor(sailHrs/24)}d ${Math.floor(sailHrs%24)}h ${Math.round((sailHrs%1)*60)}m`,
        totalTime:   `${Math.floor(totalHrs/24)}d ${Math.floor(totalHrs%24)}h`,
        etaLocal:    formatDateLocal(arrUTC, arrOffset),
        etaUTC:      arrUTC.toISOString().replace('T',' ').substring(0,16) + ' UTC',
        depUTC:      depUTC.toISOString().replace('T',' ').substring(0,16) + ' UTC',
        speedKt:     sp.toFixed(1),
      };
    }
    if (mode === 'arrival' && depDate && arrDate && D > 0) {
      const depUTC   = addHours(new Date(depDate), -depOffset);
      const arrUTC   = addHours(new Date(arrDate), -arrOffset);
      const diffHrs  = (arrUTC - depUTC) / 3600000 - extra;
      const reqSpeed = D / Math.max(0.1, diffHrs);
      return {
        requiredSpeed: `${reqSpeed.toFixed(2)} knots`,
        totalTime:     `${Math.floor(diffHrs/24)}d ${Math.floor(diffHrs%24)}h`,
        feasible:      reqSpeed < 25 ? '✅ Feasible' : '⚠️ Check vessel max speed',
        depUTC:        depUTC.toISOString().replace('T',' ').substring(0,16) + ' UTC',
        etaUTC:        arrUTC.toISOString().replace('T',' ').substring(0,16) + ' UTC',
      };
    }
    return null;
  }, [mode, speed, depDate, depTZ, arrDate, arrTZ, extraHours, distance]);

  return (
    <div>
      {/* Mode tabs */}
      <div className="eta-mode-tabs">
        {[['speed','Speed → ETA'], ['arrival','Arrival → Speed']].map(([k, l]) => (
          <button key={k} className={`emt ${mode === k ? 'active' : ''}`} onClick={() => setMode(k)}>{l}</button>
        ))}
      </div>

      <div className="ff">
        <label className="fl">📏 Total Distance (NM)</label>
        <input className="fi" type="number" placeholder="Auto-filled from route" value={distance} onChange={e => setDistance(e.target.value)} />
      </div>
      <div className="ff">
        <label className="fl">🕐 Port Stay / Waiting (hours)</label>
        <input className="fi" type="number" placeholder="0" value={extraHours} onChange={e => setExtraHours(e.target.value)} />
      </div>

      {mode === 'speed' && (
        <div className="ff">
          <label className="fl">⚡ Ship Speed (knots)</label>
          <input className="fi" type="number" placeholder="e.g. 14.5" value={speed} onChange={e => setSpeed(e.target.value)} />
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <div className="ff">
          <label className="fl">🛳 Departure Date/Time</label>
          <input className="fi" type="datetime-local" value={depDate} onChange={e => setDepDate(e.target.value)} />
        </div>
        <div className="ff">
          <label className="fl">🌍 Departure Timezone</label>
          <select className="fi" value={depTZ} onChange={e => setDepTZ(e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz.label} value={tz.offset}>{tz.label}</option>)}
          </select>
        </div>
      </div>

      {mode === 'arrival' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div className="ff">
            <label className="fl">🏁 Required Arrival</label>
            <input className="fi" type="datetime-local" value={arrDate} onChange={e => setArrDate(e.target.value)} />
          </div>
          <div className="ff">
            <label className="fl">🌍 Arrival Timezone</label>
            <select className="fi" value={arrTZ} onChange={e => setArrTZ(e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz.label} value={tz.offset}>{tz.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {calc && (
        <div className="eta-result">
          {mode === 'speed' && <>
            <div className="eta-row"><span className="eta-key">Speed</span><span className="eta-val">{calc.speedKt} kn</span></div>
            <div className="eta-row"><span className="eta-key">Sailing Time</span><span className="eta-val gold">{calc.sailingTime}</span></div>
            <div className="eta-row"><span className="eta-key">Total Voyage</span><span className="eta-val gold">{calc.totalTime}</span></div>
            <div className="eta-row"><span className="eta-key">Dep (UTC)</span><span className="eta-val" style={{ fontSize:'0.72rem' }}>{calc.depUTC}</span></div>
            <div className="eta-row"><span className="eta-key">ETA (UTC)</span><span className="eta-val" style={{ fontSize:'0.72rem' }}>{calc.etaUTC}</span></div>
            <div className="eta-row"><span className="eta-key">ETA Local</span><span className="eta-val green" style={{ fontSize:'0.72rem' }}>{calc.etaLocal}</span></div>
          </>}
          {mode === 'arrival' && <>
            <div className="eta-row"><span className="eta-key">Required Speed</span><span className="eta-val gold">{calc.requiredSpeed}</span></div>
            <div className="eta-row"><span className="eta-key">Total Time</span><span className="eta-val">{calc.totalTime}</span></div>
            <div className="eta-row"><span className="eta-key">Feasibility</span><span className="eta-val green" style={{ fontSize:'0.76rem' }}>{calc.feasible}</span></div>
            <div className="eta-row"><span className="eta-key">Dep UTC</span><span className="eta-val" style={{ fontSize:'0.72rem' }}>{calc.depUTC}</span></div>
            <div className="eta-row"><span className="eta-key">Arr UTC</span><span className="eta-val" style={{ fontSize:'0.72rem' }}>{calc.etaUTC}</span></div>
          </>}
        </div>
      )}
    </div>
  );
}
