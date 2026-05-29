/* eslint-disable */
// src/pages/VoyageCalculatorPage.jsx
import { useState, useRef, useEffect } from "react";

// Haversine formula — great circle distance between two lat/lon points
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const formatDuration = (hours) => {
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  if (d === 0) return `${h}h`;
  return `${d}d ${h}h`;
};

function PortSearchBox({ label, value, onChange, onSelect, portsDb }) {
  const [q, setQ]         = useState(value?.name || '');
  const [sugg, setSugg]   = useState([]);
  const [show, setShow]   = useState(false);
  const ref               = useRef();

  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => { if (value?.name) setQ(value.name); }, [value]);

  const handleChange = e => {
    const v = e.target.value; setQ(v); onChange(null);
    if (v.length < 2) { setSugg([]); return; }
    const ql = v.toLowerCase();
    const results = portsDb
      .filter(p => p.lat != null && p.lon != null)
      .filter(p => (p.name||'').toLowerCase().includes(ql) || (p.city||'').toLowerCase().includes(ql))
      .slice(0, 8);
    setSugg(results); setShow(true);
  };

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <label className="fl">{label}</label>
      <div className="siw">
        <span className="si-ic">⚓</span>
        <input className="si" style={{ paddingLeft: 38 }} placeholder="Search port name…"
          value={q} onChange={handleChange} onFocus={() => sugg.length > 0 && setShow(true)} />
        {q && <button onClick={() => { setQ(''); onChange(null); setSugg([]); }}
          style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
            background:'none', border:'none', color:'var(--text3)', cursor:'pointer' }}>✕</button>}
      </div>
      {show && sugg.length > 0 && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:300,
          background:'var(--card)', border:'1px solid var(--border)', borderRadius:10,
          boxShadow:'0 8px 28px rgba(0,0,0,0.5)', overflow:'hidden' }}>
          {sugg.map((p, i) => (
            <div key={i} onMouseDown={() => { onSelect(p); setQ(p.name); setShow(false); setSugg([]); }}
              style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)',
                display:'flex', justifyContent:'space-between', alignItems:'center' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,180,216,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <span style={{ fontSize:'0.84rem', color:'var(--cyan)' }}>{p.name}</span>
              <span style={{ fontSize:'0.7rem', color:'var(--text3)' }}>{p.country}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VoyageCalculatorPage({ portsDb = [] }) {
  const [fromPort, setFromPort]   = useState(null);
  const [toPort,   setToPort]     = useState(null);
  const [speed,    setSpeed]      = useState('14');
  const [fuelRate, setFuelRate]   = useState('');
  const [result,   setResult]     = useState(null);
  const [err,      setErr]        = useState('');

  const calculate = () => {
    setErr(''); setResult(null);
    if (!fromPort) { setErr('Please select departure port'); return; }
    if (!toPort)   { setErr('Please select arrival port'); return; }
    if (!speed || Number(speed) <= 0) { setErr('Enter a valid ship speed'); return; }
    if (fromPort.id === toPort.id)    { setErr('Departure and arrival ports are the same'); return; }

    const distNm   = haversine(fromPort.lat, fromPort.lon, toPort.lat, toPort.lon);
    const speedKts = Number(speed);
    const hours    = distNm / speedKts;
    const days     = hours / 24;
    const fuel     = fuelRate ? days * Number(fuelRate) : null;

    setResult({ distNm: Math.round(distNm), hours, days, fuel, speedKts });
  };

  const StatCard = ({ label, value, unit, color = 'var(--cyan)', icon }) => (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12,
      padding:'1rem', textAlign:'center' }}>
      {icon && <div style={{ fontSize:'1.6rem', marginBottom:4 }}>{icon}</div>}
      <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.3rem', fontWeight:700, color }}>{value}</div>
      <div style={{ fontSize:'0.68rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{unit}</div>
      <div style={{ fontSize:'0.7rem', color:'var(--text2)', marginTop:2 }}>{label}</div>
    </div>
  );

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">🧮 Voyage Calculator</div>
        <span className="badge badge-green">Great Circle</span>
      </div>

      <div className="info-box" style={{ fontSize:'0.74rem', marginBottom:'1.2rem' }}>
        📐 Calculates <strong style={{ color:'var(--cyan)' }}>great circle distance</strong> between two ports.
        Actual passage distance may vary due to traffic separation schemes, weather routing and port approaches.
      </div>

      {/* Port inputs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1rem' }}>
        <PortSearchBox label="🟢 Departure Port" value={fromPort} onChange={setFromPort} onSelect={setFromPort} portsDb={portsDb} />
        <PortSearchBox label="🔴 Arrival Port"   value={toPort}   onChange={setToPort}   onSelect={setToPort}   portsDb={portsDb} />
      </div>

      {/* Speed + fuel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1rem' }}>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">🚢 Ship Speed (knots)</label>
          <input className="fi" type="number" min="1" max="50" placeholder="e.g. 14"
            value={speed} onChange={e => setSpeed(e.target.value)} />
        </div>
        <div className="ff" style={{ margin:0 }}>
          <label className="fl">⛽ Fuel Consumption (MT/day) — optional</label>
          <input className="fi" type="number" min="0" placeholder="e.g. 35"
            value={fuelRate} onChange={e => setFuelRate(e.target.value)} />
        </div>
      </div>

      {err && <div className="err-box" style={{ marginBottom:'0.8rem' }}>{err}</div>}

      <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center',
        padding:'12px', fontSize:'0.84rem', marginBottom:'1.4rem' }} onClick={calculate}>
        🧮 Calculate Voyage
      </button>

      {/* Results */}
      {result && (
        <>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', color:'var(--text3)',
            marginBottom:'0.8rem', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {fromPort?.name} → {toPort?.name}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:'1rem' }}>
            <StatCard icon="📏" label="Distance" value={result.distNm.toLocaleString()} unit="Nautical Miles" color="var(--cyan)" />
            <StatCard icon="⏱" label="Est. Duration" value={formatDuration(result.hours)} unit="at sea" color="var(--green)" />
            <StatCard icon="🚢" label="Speed" value={result.speedKts} unit="Knots" color="#A78BFA" />
            {result.fuel && <StatCard icon="⛽" label="Fuel Estimate" value={Math.round(result.fuel)} unit="Metric Tons" color="var(--gold)" />}
          </div>

          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--gold)', marginBottom:'0.6rem' }}>
              ⚠️ DISCLAIMER
            </div>
            <div style={{ fontSize:'0.72rem', color:'var(--text3)', lineHeight:1.6 }}>
              This is a theoretical great circle calculation. Actual voyage distance and duration will vary based on
              weather routing, traffic separation schemes, port approaches, canal transits, and company instructions.
              Always refer to official voyage planning documents.
            </div>
          </div>
        </>
      )}

      {/* Quick reference speed table */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12,
        padding:'1rem', marginTop:'1.2rem' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--text2)', marginBottom:'0.8rem' }}>
          📊 TYPICAL SHIP SPEEDS
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.4rem', fontSize:'0.74rem' }}>
          {[
            ['VLCC / Tanker','12-15 kts'],['Bulk Carrier','11-14 kts'],
            ['Container Ship','18-24 kts'],['General Cargo','12-16 kts'],
            ['Chemical Tanker','13-15 kts'],['LNG Carrier','18-19 kts'],
          ].map(([type, spd], i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'5px 8px',
              background:'rgba(255,255,255,0.03)', borderRadius:6 }}>
              <span style={{ color:'var(--text2)' }}>{type}</span>
              <span style={{ color:'var(--cyan)', fontWeight:700 }}>{spd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VoyageCalculatorPage;
