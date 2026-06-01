/* eslint-disable */
// src/Pages/CompassErrorPage.jsx  — Full Enhanced Version v2
// Excel reference verified: ABC method, GHA Aries + SHA → LHA → azimuth
// All 8 improvements applied. Login required (enforced in App.jsx).

import { useState, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// § 1. MATH UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
const toRad   = d => d * Math.PI / 180;
const toDeg   = r => r * 180 / Math.PI;
const norm360 = d => ((d % 360) + 360) % 360;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ══════════════════════════════════════════════════════════════════════════════
// § 2. ASTRONOMICAL ENGINE  (verified vs Excel reference)
// ══════════════════════════════════════════════════════════════════════════════
const julianDate = date => date.getTime() / 86400000 + 2440587.5;

const ghaAries = jd => {
  const T = (jd - 2451545.0) / 36525;
  return norm360(
    280.46061837 + 360.98564736629 * (jd - 2451545) +
    0.000387933 * T * T - (T * T * T) / 38710000
  );
};

const sunGHADec = jd => {
  const T  = (jd - 2451545.0) / 36525;
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M  = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = toRad(M);
  const C  = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(Mr)
           + (0.019993 - 0.000101*T)*Math.sin(2*Mr)
           + 0.000289*Math.sin(3*Mr);
  const sunLon = norm360(L0 + C);
  const omega  = 125.04 - 1934.136*T;
  const lam    = toRad(sunLon - 0.00569 - 0.00478*Math.sin(toRad(omega)));
  const eps    = toRad(23.4392911 - 0.013004167*T);
  const RA     = norm360(toDeg(Math.atan2(Math.cos(eps)*Math.sin(lam), Math.cos(lam))));
  const Dec    = toDeg(Math.asin(clamp(Math.sin(eps)*Math.sin(lam), -1, 1)));
  return { GHA: norm360(ghaAries(jd) - RA), Dec };
};

const moonGHADec = jd => {
  const T  = (jd - 2451545.0) / 36525;
  const L  = norm360(218.3164477 + 481267.88123421*T - 0.0015786*T*T);
  const D  = norm360(297.8501921 + 445267.1114034*T  - 0.0018819*T*T);
  const M  = norm360(357.5291092 + 35999.0502909*T   - 0.0001536*T*T);
  const Mp = norm360(134.9633964 + 477198.8675055*T  + 0.0087414*T*T);
  const F  = norm360(93.2720950  + 483202.0175233*T  - 0.0036539*T*T);
  const [Dr,Mr,Mpr,Fr] = [D,M,Mp,F].map(toRad);
  const dL = ( 6288774*Math.sin(Mpr) + 1274027*Math.sin(2*Dr-Mpr)
             + 658314*Math.sin(2*Dr) + 213618*Math.sin(2*Mpr)
             - 185116*Math.sin(Mr)  - 114332*Math.sin(2*Fr)
             + 58793*Math.sin(2*Dr-2*Mpr) + 57066*Math.sin(2*Dr-Mr-Mpr)
             + 53322*Math.sin(2*Dr+Mpr) + 45758*Math.sin(2*Dr-Mr) ) / 1e6;
  const dB = ( 5128122*Math.sin(Fr) + 280602*Math.sin(Mpr+Fr)
             + 277693*Math.sin(Mpr-Fr) + 173237*Math.sin(2*Dr-Fr)
             + 55413*Math.sin(2*Dr-Mpr+Fr) + 46271*Math.sin(2*Dr-Mpr-Fr) ) / 1e6;
  const lam2 = toRad(L + dL), bet = toRad(dB);
  const eps  = toRad(23.4392911 - 0.013004167*T);
  const x    = Math.cos(bet)*Math.cos(lam2);
  const y    = Math.cos(eps)*Math.cos(bet)*Math.sin(lam2) - Math.sin(eps)*Math.sin(bet);
  const z    = Math.sin(eps)*Math.cos(bet)*Math.sin(lam2) + Math.cos(eps)*Math.sin(bet);
  const RA   = norm360(toDeg(Math.atan2(y, x)));
  const Dec  = toDeg(Math.asin(clamp(z, -1, 1)));
  return { GHA: norm360(ghaAries(jd) - RA), Dec };
};

const planetGHADec = (name, jd) => {
  const T  = (jd - 2451545.0) / 36525;
  const EL = {
    Venus:   [181.979801,58519.212948,0.72333,0.006773,3.3947,131.5637,76.6799],
    Mars:    [355.433275,19141.696551,1.52368,0.093405,1.8497,336.0602,49.5581],
    Jupiter: [ 34.351519, 3036.302374,5.20260,0.048498,1.3053, 14.3313,100.4644],
    Saturn:  [ 50.077444, 1223.511285,9.55491,0.055508,2.4848, 93.0572,113.6655],
  };
  const el = EL[name]; if (!el) return null;
  const [L0,L1,a,e,i,w,O] = el;
  const Mv = toRad(norm360(L0 + L1*T - w));
  let E = Mv;
  for (let k=0; k<8; k++) E = Mv + e*Math.sin(E);
  const v  = 2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2), Math.sqrt(1-e)*Math.cos(E/2));
  const r  = a*(1 - e*Math.cos(E));
  const u  = toRad(norm360(toDeg(v)+w-O));
  const Or=toRad(O), ir=toRad(i);
  const xh = r*(Math.cos(Or)*Math.cos(u) - Math.sin(Or)*Math.sin(u)*Math.cos(ir));
  const yh = r*(Math.sin(Or)*Math.cos(u) + Math.cos(Or)*Math.sin(u)*Math.cos(ir));
  const zh = r*Math.sin(u)*Math.sin(ir);
  const Ms = toRad(norm360(357.52911+35999.05029*T));
  const Cs = 1.9146*Math.sin(Ms)+0.0200*Math.sin(2*Ms);
  const sL = toRad(norm360(280.46646+36000.76983*T+Cs));
  const Re = 1.00014-0.01671*Math.cos(Ms)-0.00014*Math.cos(2*Ms);
  const xe = Re*Math.cos(sL+Math.PI), ye = Re*Math.sin(sL+Math.PI);
  const eps = toRad(23.4392911-0.013004167*T);
  const xg  = xh+xe, yg = yh+ye;
  const xeq = xg;
  const yeq = yg*Math.cos(eps) - zh*Math.sin(eps);
  const zeq = yg*Math.sin(eps) + zh*Math.cos(eps);
  const dist= Math.sqrt(xeq*xeq+yeq*yeq+zeq*zeq);
  const RA  = norm360(toDeg(Math.atan2(yeq, xeq)));
  const Dec = toDeg(Math.asin(clamp(zeq/dist, -1, 1)));
  return { GHA: norm360(ghaAries(jd)-RA), Dec };
};

// 57 Navigational Stars + Polaris  (SHA & Dec epoch ~2025)
const NAV_STARS = [
  { name:'Acamar',         SHA:315.5,  Dec:-40.3 },
  { name:'Achernar',       SHA:335.5,  Dec:-57.2 },
  { name:'Acrux',          SHA:173.3,  Dec:-63.1 },
  { name:'Adhara',         SHA:255.3,  Dec:-28.9 },
  { name:'Aldebaran',      SHA:291.2,  Dec: 16.5 },
  { name:'Alioth',         SHA:166.6,  Dec: 55.9 },
  { name:'Alkaid',         SHA:153.2,  Dec: 49.3 },
  { name:"Al Na'ir",       SHA: 28.1,  Dec:-47.0 },
  { name:'Alnilam',        SHA:276.1,  Dec: -1.2 },
  { name:'Alphard',        SHA:218.2,  Dec: -8.7 },
  { name:'Alphecca',       SHA:126.3,  Dec: 26.7 },
  { name:'Alpheratz',      SHA:358.0,  Dec: 29.1 },
  { name:'Altair',         SHA: 62.3,  Dec:  8.9 },
  { name:'Ankaa',          SHA:353.5,  Dec:-42.3 },
  { name:'Antares',        SHA:112.6,  Dec:-26.4 },
  { name:'Arcturus',       SHA:146.2,  Dec: 19.2 },
  { name:'Atria',          SHA:108.0,  Dec:-69.0 },
  { name:'Avior',          SHA:234.3,  Dec:-59.5 },
  { name:'Bellatrix',      SHA:279.0,  Dec:  6.3 },
  { name:'Betelgeuse',     SHA:271.2,  Dec:  7.4 },
  { name:'Canopus',        SHA:264.1,  Dec:-52.7 },
  { name:'Capella',        SHA:281.1,  Dec: 46.0 },
  { name:'Deneb',          SHA: 49.7,  Dec: 45.3 },
  { name:'Denebola',       SHA:182.9,  Dec: 14.6 },
  { name:'Diphda',         SHA:349.2,  Dec:-18.0 },
  { name:'Dubhe',          SHA:194.2,  Dec: 61.8 },
  { name:'Elnath',         SHA:278.7,  Dec: 28.6 },
  { name:'Eltanin',        SHA: 90.7,  Dec: 51.5 },
  { name:'Enif',           SHA: 34.1,  Dec:  9.9 },
  { name:'Fomalhaut',      SHA: 15.5,  Dec:-29.7 },
  { name:'Gacrux',         SHA:172.2,  Dec:-57.1 },
  { name:'Gienah',         SHA:176.2,  Dec:-17.5 },
  { name:'Hadar',          SHA:149.2,  Dec:-60.3 },
  { name:'Hamal',          SHA:328.3,  Dec: 23.5 },
  { name:'Kaus Australis', SHA: 84.1,  Dec:-34.4 },
  { name:'Kochab',         SHA:137.3,  Dec: 74.1 },
  { name:'Markab',         SHA: 14.0,  Dec: 15.2 },
  { name:'Menkar',         SHA:314.4,  Dec:  4.1 },
  { name:'Menkent',        SHA:148.3,  Dec:-36.3 },
  { name:'Miaplacidus',    SHA:221.9,  Dec:-69.7 },
  { name:'Mirfak',         SHA:309.2,  Dec: 49.9 },
  { name:'Nunki',          SHA: 76.3,  Dec:-26.3 },
  { name:'Peacock',        SHA: 54.0,  Dec:-56.8 },
  { name:'Pollux',         SHA:243.8,  Dec: 28.0 },
  { name:'Procyon',        SHA:245.2,  Dec:  5.2 },
  { name:'Rasalhague',     SHA: 96.4,  Dec: 12.6 },
  { name:'Regulus',        SHA:208.0,  Dec: 12.0 },
  { name:'Rigel',          SHA:281.3,  Dec: -8.2 },
  { name:'Rigil Kent.',    SHA:140.2,  Dec:-60.8 },
  { name:'Sabik',          SHA:102.4,  Dec:-15.7 },
  { name:'Schedar',        SHA:350.0,  Dec: 56.5 },
  { name:'Shaula',         SHA: 96.8,  Dec:-37.1 },
  { name:'Sirius',         SHA:258.9,  Dec:-16.7 },
  { name:'Spica',          SHA:158.8,  Dec:-11.2 },
  { name:'Suhail',         SHA:223.1,  Dec:-43.4 },
  { name:'Vega',           SHA: 80.9,  Dec: 38.8 },
  { name:'Zubenelgenubi',  SHA:137.4,  Dec:-16.0 },
  // Polaris — special: Dec ≈ 89.0° makes azimuth ≈ 000° (used in Polaris tab)
  { name:'Polaris ⭐',    SHA:318.7,  Dec: 89.0 },
];

const getBodyPos = (body, jd) => {
  if (body === 'Sun')  return sunGHADec(jd);
  if (body === 'Moon') return moonGHADec(jd);
  if (['Venus','Mars','Jupiter','Saturn'].includes(body)) return planetGHADec(body, jd);
  const s = NAV_STARS.find(x => x.name === body);
  return s ? { GHA: norm360(ghaAries(jd)+s.SHA), Dec: s.Dec } : null;
};

const calcAzimuth = (lat, lon, GHA, Dec) => {
  const LHA    = norm360(GHA + lon);
  const latR   = toRad(lat), decR = toRad(Dec), lhaR = toRad(LHA);
  const sinH   = clamp(Math.sin(latR)*Math.sin(decR)+Math.cos(latR)*Math.cos(decR)*Math.cos(lhaR), -1, 1);
  const H      = Math.asin(sinH);
  const cosZ   = clamp((Math.sin(decR)-Math.sin(latR)*sinH)/(Math.cos(latR)*Math.cos(H)), -1, 1);
  const Z      = toDeg(Math.acos(cosZ));
  return {
    azimuth:  norm360(Math.sin(lhaR) > 0 ? 360-Z : Z),
    altitude: toDeg(H),
    LHA, GHA, Dec,
  };
};

// § Atmospheric Refraction (Bennett formula) — applied to true altitude display
const refraction = alt => {
  if (alt < -5) return 0;
  return 1.02 / Math.tan(toRad(alt + 10.3/(alt+5.11))) / 60; // degrees
};

// § Amplitude — for bodies rising/setting on visible horizon
const calcAmplitude = (lat, Dec) => {
  const cosLat = Math.cos(toRad(lat));
  if (Math.abs(cosLat) < 1e-6) return null;
  const sinA = clamp(Math.sin(toRad(Dec)) / cosLat, -1, 1);
  return toDeg(Math.asin(sinA)); // degrees, positive = same name as latitude
};

// § WMM-2025 Dipole Offline Fallback (n=1 terms only, ±5-15° accuracy)
// Source: WMM2025 Gauss coefficients (NOAA 2024)
const wmmDipole = (lat, lon) => {
  const theta = toRad(90 - lat); // colatitude
  const sinT  = Math.sin(theta), cosT = Math.cos(theta);
  const cosL  = Math.cos(toRad(lon)), sinL = Math.sin(toRad(lon));
  // WMM2025 n=1 coefficients (nT)
  const g10 = -29351.8, g11 = -1410.8, h11 = 4545.4;
  const X = -g10*sinT + cosT*(g11*cosL + h11*sinL); // northward component
  const Y =  g11*sinL - h11*cosL;                   // eastward component
  return toDeg(Math.atan2(Y, X));
};

const normErr = e => ((e+180)%360+360)%360-180;

// ══════════════════════════════════════════════════════════════════════════════
// § 3. FORMAT HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const p2   = n => String(Math.floor(Math.abs(n))).padStart(2,'0');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtUTC = d =>
  `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} `+
  `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;

const fmtLMT = (d, lon) => {
  const ms  = d.getTime() + (lon/15)*3600000;
  const lmt = new Date(ms);
  return `${p2(lmt.getUTCHours())}:${p2(lmt.getUTCMinutes())}:${p2(lmt.getUTCSeconds())} LMT`;
};

const fmtPos = (lat, lon) => {
  const fmtD = (v, posL, negL) => {
    const d = Math.floor(Math.abs(v)), m = ((Math.abs(v)-d)*60).toFixed(1);
    return `${d}° ${m}' ${v>=0?posL:negL}`;
  };
  return `Lat: ${fmtD(lat,'N','S')}   Long: ${fmtD(lon,'E','W')}`;
};

const fmtBrg  = v => `${norm360(v).toFixed(1)}°`;
const fmtErr  = v => v===null||isNaN(v) ? '—' : `${Math.abs(v).toFixed(1)}° ${v>=0?'E':'W'}`;
const errClrDk= v => v===null ? 'var(--text)' : v>=0 ? 'var(--green)' : 'var(--red)';
const errClrLt= v => v===null ? '#0a1628'     : v>=0 ? '#007a50'      : '#cc2233';

// ══════════════════════════════════════════════════════════════════════════════
// § 4. STATIC DATA
// ══════════════════════════════════════════════════════════════════════════════
const BODY_GROUPS = [
  { group:'☀️ Solar System', items:['Sun','Moon','Venus','Mars','Jupiter','Saturn'] },
  { group:'⭐ 57 Nav Stars + Polaris', items: NAV_STARS.map(s=>s.name) },
];
const BODY_ICON = { Sun:'☀️', Moon:'🌙', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄', 'Polaris ⭐':'⭐' };

const DEV_HDGS = [0,45,90,135,180,225,270,315];
const LS_HIST  = 'cmp_history_v2';
const LS_DEVC  = 'cmp_devcard_v2';

// ══════════════════════════════════════════════════════════════════════════════
// § 5. LIGHT-CARD OUTPUT STYLES
// ══════════════════════════════════════════════════════════════════════════════
const LT = {
  card:   { background:'#f2f7fc', border:'1px solid #ccd8e8', borderRadius:14, padding:'1.2rem', color:'#0a1628', fontFamily:"'Exo 2',sans-serif" },
  secHdr: { fontWeight:700, fontSize:'0.85rem', color:'#0a1628', textAlign:'center', margin:'0.8rem 0 0.35rem', paddingBottom:'0.3rem', borderBottom:'1.5px solid #ccd8e8' },
  row:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid #e2ecf5' },
  lbl:    { fontSize:'0.83rem', color:'#2a3a5a' },
  val:    { fontFamily:"'Orbitron',monospace", fontSize:'0.87rem', color:'#0a1628', fontWeight:600 },
  adjBtn: { padding:'4px 9px', background:'#e2ecf5', border:'1px solid #b0c2d4', borderRadius:6, color:'#2a3a5a', cursor:'pointer', fontSize:'0.9rem', fontWeight:700 },
};

// Dark input card style helper
const DC = {
  card:  { background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem', marginBottom:'0.75rem' },
  hdr:   { fontFamily:"'Orbitron',monospace", fontSize:'0.67rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.65rem' },
  input: { width:'100%', padding:'9px 6px', background:'var(--bg2)', border:'1.5px solid var(--border2)', borderRadius:8, color:'var(--text)', fontFamily:"'Orbitron',monospace", fontSize:'0.9rem', outline:'none', textAlign:'center' },
};

// ══════════════════════════════════════════════════════════════════════════════
// § 6. DEVIATION CARD SVG CHART
// ══════════════════════════════════════════════════════════════════════════════
function DeviationChart({ deviations }) {
  const W=340, H=160, padL=36, padR=10, padT=10, padB=28;
  const iW = W-padL-padR, iH = H-padT-padB;
  const maxDev = 15;
  const xs = DEV_HDGS.map((_,i) => padL + (i/(DEV_HDGS.length-1))*iW);
  const ys = deviations.map(d => {
    const v = parseFloat(d)||0;
    return padT + iH/2 - (v/maxDev)*(iH/2);
  });
  const points = xs.map((x,i)=>`${x},${ys[i]}`).join(' ');
  const zeroY  = padT + iH/2;
  return (
    <svg width={W} height={H} style={{ display:'block', margin:'0 auto', overflow:'visible' }}>
      {/* Grid lines */}
      {[-10,-5,0,5,10].map(v => {
        const y = padT + iH/2 - (v/maxDev)*(iH/2);
        return <g key={v}>
          <line x1={padL} y1={y} x2={W-padR} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={v===0?1.5:0.7}/>
          <text x={padL-4} y={y+4} textAnchor="end" fontSize="9" fill="var(--text3)">{v>0?'+':''}{v}°</text>
        </g>;
      })}
      {/* Heading labels */}
      {DEV_HDGS.map((h,i) => (
        <text key={h} x={xs[i]} y={H-4} textAnchor="middle" fontSize="9" fill="var(--text3)">{h}°</text>
      ))}
      {/* Zero axis */}
      <line x1={padL} y1={zeroY} x2={W-padR} y2={zeroY} stroke="var(--text3)" strokeWidth={1} strokeDasharray="3,3"/>
      {/* Deviation fill */}
      <polyline points={`${xs[0]},${zeroY} ${points} ${xs[xs.length-1]},${zeroY}`} fill="rgba(0,180,216,0.08)" stroke="none"/>
      {/* Deviation line */}
      <polyline points={points} fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
      {/* Points */}
      {xs.map((x,i) => {
        const v = parseFloat(deviations[i])||0;
        return <circle key={i} cx={x} cy={ys[i]} r={4}
          fill={v>=0?'var(--green)':'var(--red)'} stroke="var(--bg)" strokeWidth={1.5}/>;
      })}
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// § 7. MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CompassErrorPage() {
  // ── Core state ────────────────────────────────────────────────────────────
  const [activeTab,  setActiveTab]  = useState('calc');   // calc|amplitude|polaris|history|devcard
  const [pos,        setPos]        = useState(null);
  const [posErr,     setPosErr]     = useState('');
  const [now,        setNow]        = useState(new Date());
  const [body,       setBody]       = useState('Sun');

  // Ship headings
  const [gyroHdg,  setGyroHdg]  = useState('000.0');
  const [stdHdg,   setStdHdg]   = useState('000.0');

  // Gyro observed bearing of the body
  const [gyroObs,  setGyroObs]  = useState('');
  const [gyroLock, setGyroLock] = useState(false);

  // Variation
  const [varMag,    setVarMag]    = useState('0.0');
  const [varDir,    setVarDir]    = useState('W');
  const [varRate,   setVarRate]   = useState(null);   // arcmin/year from NOAA
  const [varSrc,    setVarSrc]    = useState('manual'); // 'noaa'|'wmm'|'manual'

  // Amplitude tab
  const [ampRising,  setAmpRising]  = useState(true);
  const [ampCmpBrg,  setAmpCmpBrg] = useState('');
  const [ampGyroBrg, setAmpGyroBrg]= useState('');

  // Polaris tab
  const [polCmpBrg,  setPolCmpBrg] = useState('');
  const [polGyroBrg, setPolGyroBrg]= useState('');

  // History
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_HIST)||'[]'); } catch { return []; }
  });

  // Deviation card — 8 entries for DEV_HDGS
  const [devCard, setDevCard] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_DEVC)||'null');
      return saved || Array(8).fill('');
    } catch { return Array(8).fill(''); }
  });

  const [isMob, setIsMob] = useState(window.innerWidth < 720);
  const [copied, setCopied] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onR = () => setIsMob(window.innerWidth < 720);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setPosErr('GPS not available in browser'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      e => setPosErr(e.message || 'GPS access denied'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // NOAA Geomag → with WMM offline fallback
  useEffect(() => {
    if (!pos) return;
    (async () => {
      try {
        const url = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination`+
          `?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&resultFormat=json`;
        const res = await fetch(url);
        const dat = await res.json();
        const r   = dat?.result?.[0];
        if (r && !isNaN(r.declination)) {
          setVarMag(Math.abs(r.declination).toFixed(1));
          setVarDir(r.declination >= 0 ? 'E' : 'W');
          setVarRate(r.declinationchange !== undefined ? r.declinationchange : null);
          setVarSrc('noaa');
          return;
        }
      } catch { /* fall through to WMM offline */ }
      // WMM-2025 Dipole Offline Fallback
      try {
        const dec = wmmDipole(pos.lat, pos.lon);
        if (!isNaN(dec)) {
          setVarMag(Math.abs(dec).toFixed(1));
          setVarDir(dec >= 0 ? 'E' : 'W');
          setVarSrc('wmm');
        }
      } catch { setVarSrc('manual'); }
    })();
  }, [pos]);

  // ── Calculations ──────────────────────────────────────────────────────────
  const jd       = julianDate(now);
  const ghaAr    = ghaAries(jd);
  const bp       = pos ? getBodyPos(body, jd)    : null;
  const az       = bp && pos ? calcAzimuth(pos.lat, pos.lon, bp.GHA, bp.Dec) : null;
  const trueBrg  = az ? az.azimuth  : null;
  const altitude = az ? az.altitude : null;
  const altApp   = altitude !== null ? altitude + refraction(altitude) : null; // apparent alt

  // Gyro bearing (observed or falls back to true)
  const gyroBrgNum = gyroLock && gyroObs !== '' ? parseFloat(gyroObs) : (trueBrg ?? 0);

  // Standard bearing derived from heading difference
  const ghNum  = parseFloat(gyroHdg)||0;
  const shNum  = parseFloat(stdHdg)||0;
  const stdBrg = norm360(gyroBrgNum + (shNum - ghNum));

  // Signed variation (+E / -W)
  const varSigned = (parseFloat(varMag)||0) * (varDir === 'E' ? 1 : -1);

  // Errors
  const gyroErr   = trueBrg !== null ? normErr(trueBrg - gyroBrgNum) : null;
  const stdErr    = trueBrg !== null ? normErr(trueBrg - stdBrg)     : null;
  const deviation = stdErr  !== null ? stdErr - varSigned             : null;

  // ── Amplitude calculations ─────────────────────────────────────────────────
  const ampA       = bp && pos ? calcAmplitude(pos.lat, bp.Dec) : null;
  const ampTrueBrg = ampA !== null ? (() => {
    // True bearing from amplitude angle + rising/setting
    const absA = Math.abs(ampA);
    if (ampRising) return norm360(bp.Dec >= 0 ? 90 - absA : 90 + absA);
    else           return norm360(bp.Dec >= 0 ? 270 + absA : 270 - absA);
  })() : null;
  const ampCmpErr  = ampCmpBrg  && ampTrueBrg !== null ? normErr(ampTrueBrg - parseFloat(ampCmpBrg))  : null;
  const ampGyroErr = ampGyroBrg && ampTrueBrg !== null ? normErr(ampTrueBrg - parseFloat(ampGyroBrg)) : null;
  const ampStdDev  = ampCmpErr  !== null ? ampCmpErr - varSigned : null;
  const ampDirStr  = ampA !== null ? (ampRising ? 'E' : 'W') + (bp.Dec >= 0 ? 'N' : 'S') : null;
  const isNearHorizon = altApp !== null && altApp > -3 && altApp < 5;

  // ── Polaris calculations ───────────────────────────────────────────────────
  const polBp  = pos ? getBodyPos('Polaris ⭐', jd) : null;
  const polAz  = polBp && pos ? calcAzimuth(pos.lat, pos.lon, polBp.GHA, polBp.Dec) : null;
  const polTrue= polAz ? polAz.azimuth : null;
  const polCmpErr  = polCmpBrg  && polTrue !== null ? normErr(polTrue - parseFloat(polCmpBrg))  : null;
  const polGyroErr = polGyroBrg && polTrue !== null ? normErr(polTrue - parseFloat(polGyroBrg)) : null;
  const polStdDev  = polCmpErr  !== null ? polCmpErr - varSigned : null;
  const polVisible = polAz && polAz.altitude > 5;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const adjGyro = delta => {
    setGyroLock(true);
    setGyroObs(p => norm360((parseFloat(p!==''?p:(trueBrg??0)) + delta)).toFixed(1));
  };
  const adjVar = delta => setVarMag(p => Math.max(0, parseFloat(((parseFloat(p)||0)+delta).toFixed(1))).toFixed(1));
  const resetGyro = () => { setGyroLock(false); setGyroObs(''); };

  // Save observation to history
  const saveToHistory = () => {
    if (!pos || trueBrg === null) return;
    const entry = {
      id:       Date.now(),
      dt:       fmtUTC(now),
      pos:      fmtPos(pos.lat, pos.lon),
      body,
      trueBrg:  trueBrg.toFixed(1),
      gyroErr:  fmtErr(gyroErr),
      stdErr:   fmtErr(stdErr),
      dev:      fmtErr(deviation),
      varStr:   `${varMag}° ${varDir}`,
      gyroHdg:  ghNum.toFixed(1),
      stdHdg:   shNum.toFixed(1),
    };
    const newHist = [entry, ...history].slice(0, 10);
    setHistory(newHist);
    localStorage.setItem(LS_HIST, JSON.stringify(newHist));
  };

  // Copy plain-text log entry
  const copyLog = () => {
    if (!pos || trueBrg === null) return;
    const txt = [
      `===== COMPASS ERROR OBSERVATION =====`,
      `Date/Time : ${fmtUTC(now)}`,
      `LMT       : ${fmtLMT(now, pos.lon)}`,
      `Position  : ${fmtPos(pos.lat, pos.lon)}`,
      `Body      : ${body}`,
      ``,
      `SHIP'S HEADING`,
      `  Gyro    : ${ghNum.toFixed(1)}°`,
      `  Std     : ${shNum.toFixed(1)}°`,
      ``,
      `BEARING OF ${body.toUpperCase()}`,
      `  True    : ${fmtBrg(trueBrg)}`,
      `  Gyro    : ${fmtBrg(gyroBrgNum)}`,
      `  Std     : ${fmtBrg(stdBrg)}`,
      ``,
      `ERROR`,
      `  Gyro    : ${fmtErr(gyroErr)}`,
      `  Std     : ${fmtErr(stdErr)}`,
      ``,
      `Variation : ${varMag}° ${varDir}`,
      `Deviation : ${fmtErr(deviation)}`,
      `=====================================`,
    ].join('\n');
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  // Deviation card
  const updateDevCard = (i, val) => {
    const next = [...devCard]; next[i] = val;
    setDevCard(next);
    localStorage.setItem(LS_DEVC, JSON.stringify(next));
  };

  // ── Common input styles ────────────────────────────────────────────────────
  const numInput = (value, onChange, extra={}) => (
    <input type="number" min="0" max="360" step="0.1" value={value} onChange={e=>onChange(e.target.value)}
      style={{ ...DC.input, ...extra }} />
  );

  const adjButton = (label, onClick) => (
    <button onClick={onClick} style={{ padding:'9px 13px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:7, color:'var(--text2)', cursor:'pointer', fontSize:'1rem', fontWeight:700 }}>{label}</button>
  );

  // Tab button style
  const tabBtn = (k, icon, label) => (
    <button key={k} onClick={() => setActiveTab(k)} style={{
      padding:'8px 12px', border:'none', borderBottom:`2px solid ${activeTab===k?'var(--cyan)':'transparent'}`,
      background:'transparent', color: activeTab===k ? 'var(--cyan)' : 'var(--text3)',
      fontFamily:"'Exo 2',sans-serif", fontSize:'0.7rem', fontWeight:600, cursor:'pointer',
      textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:5,
      whiteSpace:'nowrap', transition:'all 0.2s',
    }}>{icon} {label}</button>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding:'1rem', maxWidth:980, margin:'0 auto', width:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1rem', flexWrap:'wrap' }}>
        <div style={{ width:44, height:44, borderRadius:11, background:'linear-gradient(135deg,#00B4D8,#1565C0)',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0,
          boxShadow:'0 0 22px rgba(0,180,216,0.4)' }}>🧭</div>
        <div>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.88rem', fontWeight:700, letterSpacing:'0.08em' }}>
            COMPASS ERROR CALCULATOR
          </div>
          <div style={{ fontSize:'0.62rem', color:'var(--cyan)', letterSpacing:'0.14em', textTransform:'uppercase' }}>
            Nautical Almanac · ABC Method · Celestial Navigation
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap' }}>
          <span style={{ padding:'3px 9px', borderRadius:100, fontSize:'0.62rem',
            background: pos ? 'rgba(0,200,150,0.1)' : 'rgba(240,165,0,0.1)',
            border:`1px solid ${pos ? 'rgba(0,200,150,0.3)' : 'rgba(240,165,0,0.3)'}`,
            color: pos ? 'var(--green)' : 'var(--gold)' }}>
            {pos ? '📡 GPS Active' : posErr ? `⚠️ ${posErr}` : '⏳ GPS…'}
          </span>
          <span style={{ padding:'3px 9px', borderRadius:100, fontSize:'0.62rem',
            background: varSrc==='noaa' ? 'rgba(0,200,150,0.1)' : varSrc==='wmm' ? 'rgba(240,165,0,0.1)' : 'rgba(255,255,255,0.05)',
            border:`1px solid ${varSrc==='noaa'?'rgba(0,200,150,0.3)':varSrc==='wmm'?'rgba(240,165,0,0.3)':'var(--border)'}`,
            color: varSrc==='noaa' ? 'var(--green)' : varSrc==='wmm' ? 'var(--gold)' : 'var(--text3)' }}>
            {varSrc==='noaa' ? '🔵 NOAA WMM' : varSrc==='wmm' ? '⚡ WMM Offline' : '✏️ Manual Var'}
          </span>
        </div>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:'1rem', overflowX:'auto', gap:2 }}>
        {tabBtn('calc',      '🧭', 'Azimuth')}
        {tabBtn('amplitude', '🌅', 'Amplitude')}
        {tabBtn('polaris',   '⭐', 'Polaris')}
        {tabBtn('history',   '📋', 'History')}
        {tabBtn('devcard',   '📊', 'Dev Card')}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: MAIN AZIMUTH CALCULATOR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'calc' && (
        <div style={{ display:'grid', gridTemplateColumns: isMob ? '1fr' : '1fr 1fr', gap:'1rem' }}>

          {/* ── LEFT: Inputs ── */}
          <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>

            {/* Auto Time & Position */}
            <div style={DC.card}>
              <div style={DC.hdr}>🕐 AUTO DATE · TIME · POSITION</div>
              <div style={{ fontFamily:'monospace', fontSize:'0.78rem', lineHeight:2.1 }}>
                <div style={{ color:'var(--text)', fontWeight:600 }}>{fmtUTC(now)}</div>
                {pos && <div style={{ color:'var(--cyan)' }}>{fmtLMT(now, pos.lon)}</div>}
                <div style={{ color: pos ? 'var(--text2)' : 'var(--text3)', marginTop:2 }}>
                  {pos ? fmtPos(pos.lat, pos.lon) : posErr || 'Fetching GPS…'}
                </div>
              </div>
            </div>

            {/* Body Selector */}
            <div style={DC.card}>
              <div style={DC.hdr}>{BODY_ICON[body]||'⭐'} CELESTIAL BODY</div>
              <select value={body} onChange={e => { setBody(e.target.value); resetGyro(); }}
                style={{ ...DC.input, cursor:'pointer' }}>
                {BODY_GROUPS.map(g => (
                  <optgroup key={g.group} label={g.group}>
                    {g.items.map(it => <option key={it} value={it}>{it}</option>)}
                  </optgroup>
                ))}
              </select>
              {az && (
                <div style={{ marginTop:'0.7rem', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.4rem' }}>
                  {[
                    { l:'TRUE BRG', v:fmtBrg(trueBrg),         c:'var(--cyan)' },
                    { l:'APP. ALT', v:`${(altApp??0).toFixed(1)}°`, c: (altApp??0)<-0.6?'var(--red)':'var(--green)' },
                    { l:'DEC',      v:`${bp.Dec.toFixed(1)}°`,  c:'var(--text)' },
                  ].map(({l,v,c})=>(
                    <div key={l} style={{ background:'var(--bg2)', borderRadius:7, padding:'6px 8px', textAlign:'center' }}>
                      <div style={{ fontSize:'0.55rem', color:'var(--text3)', marginBottom:2 }}>{l}</div>
                      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.76rem', color:c, fontWeight:700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}
              {altApp !== null && altApp < -0.6 && (
                <div style={{ marginTop:8, padding:'7px 10px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:8, fontSize:'0.7rem', color:'var(--red)' }}>
                  ⚠️ {body} is below horizon (app. alt {(altApp).toFixed(1)}°) — azimuth shown for reference
                </div>
              )}
            </div>

            {/* Ship's Heading */}
            <div style={DC.card}>
              <div style={DC.hdr}>🚢 SHIP'S HEADING</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem' }}>
                {[{l:'Gyro Compass',val:gyroHdg,set:setGyroHdg},{l:'Standard (Mag.)',val:stdHdg,set:setStdHdg}].map(({l,val,set})=>(
                  <div key={l}>
                    <label style={{ display:'block', fontSize:'0.59rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{l}</label>
                    {numInput(val, set)}
                  </div>
                ))}
              </div>
            </div>

            {/* Gyro Bearing of Body */}
            <div style={DC.card}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.65rem' }}>
                <div style={DC.hdr}>🔭 GYRO BRG OF {body.toUpperCase().slice(0,12)}</div>
                {gyroLock && (
                  <button onClick={resetGyro} style={{ fontSize:'0.59rem', padding:'3px 9px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:6, color:'var(--red)', cursor:'pointer' }}>↺ Reset</button>
                )}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="number" min="0" max="360" step="0.1"
                  value={gyroLock ? gyroObs : (trueBrg !== null ? norm360(gyroBrgNum).toFixed(1) : '')}
                  onChange={e => { setGyroLock(true); setGyroObs(e.target.value); }}
                  placeholder="Enter observed"
                  style={{ ...DC.input, flex:1, border:'1.5px solid var(--cyan)', color:'var(--cyan)' }} />
                {adjButton('‹', () => adjGyro(-0.1))}
                {adjButton('›', () => adjGyro( 0.1))}
              </div>
              <div style={{ marginTop:6, fontSize:'0.67rem', color:'var(--text3)' }}>
                {gyroLock ? '✏️ User-entered' : '🔄 Showing computed true bearing (enter observed gyro value)'}
              </div>
            </div>

            {/* Variation */}
            <div style={DC.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.65rem' }}>
                <div style={DC.hdr}>🧲 VARIATION</div>
                <span style={{ fontSize:'0.6rem', color: varSrc==='noaa'?'var(--green)':varSrc==='wmm'?'var(--gold)':'var(--text3)' }}>
                  {varSrc==='noaa'?'✓ NOAA WMM live':varSrc==='wmm'?'⚡ WMM offline (~5° acc)':'✏️ Manual'}
                </span>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="number" min="0" max="90" step="0.1" value={varMag}
                  onChange={e => { setVarMag(e.target.value); setVarSrc('manual'); }}
                  style={{ ...DC.input, flex:1 }} />
                <button onClick={() => setVarDir(d=>d==='E'?'W':'E')}
                  style={{ padding:'9px 14px', background: varDir==='W'?'rgba(240,165,0,0.12)':'rgba(0,200,150,0.12)',
                    border:`1px solid ${varDir==='W'?'var(--gold)':'var(--green)'}`,
                    borderRadius:8, cursor:'pointer', fontFamily:"'Orbitron',monospace", fontSize:'0.82rem', fontWeight:700,
                    color: varDir==='W'?'var(--gold)':'var(--green)' }}>
                  {varDir}
                </button>
                {adjButton('‹', () => adjVar(-0.1))}
                {adjButton('›', () => adjVar( 0.1))}
              </div>
              {varRate !== null && (
                <div style={{ marginTop:6, fontSize:'0.67rem', color:'var(--text3)' }}>
                  📈 Annual change: <span style={{ color:'var(--cyan)' }}>{varRate > 0 ? '+' : ''}{(varRate*60).toFixed(1)}′/yr</span>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Output Card (light theme) ── */}
          <div>
            <div style={LT.card}>
              {/* Card Header */}
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:'0.75rem', paddingBottom:'0.75rem', borderBottom:'1.5px solid #ccd8e8' }}>
                <div style={{ width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#1565C0,#003d99)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.15rem', flexShrink:0 }}>🧭</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.78rem', fontWeight:700, color:'#0a1628' }}>Compass Error</div>
                  <div style={{ fontSize:'0.62rem', color:'#3a4a6a', marginTop:1 }}>{fmtUTC(now)}</div>
                </div>
                {/* Copy Log Button */}
                <button onClick={copyLog} disabled={!pos||trueBrg===null}
                  style={{ padding:'6px 12px', background: copied?'#e8f6ee':'#e2ecf5',
                    border:`1px solid ${copied?'#007a50':'#b0c2d4'}`, borderRadius:8,
                    color: copied?'#007a50':'#2a3a5a', fontSize:'0.69rem', fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>
                  {copied ? '✅ Copied!' : '📋 Copy Log'}
                </button>
              </div>

              {pos ? (<>
                <div style={{ fontSize:'0.73rem', color:'#2a3a5a', fontFamily:'monospace', marginBottom:'0.4rem', lineHeight:1.8 }}>
                  {fmtPos(pos.lat, pos.lon)}
                </div>

                {/* Ship's Heading */}
                <div style={LT.secHdr}>Ship's heading:</div>
                <div style={LT.row}><span style={LT.lbl}>Gyro:</span><span style={LT.val}>{fmtBrg(ghNum)}</span></div>
                <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Standard:</span><span style={LT.val}>{fmtBrg(shNum)}</span></div>

                {/* Bearing */}
                <div style={LT.secHdr}>Bearing (object: {body}):</div>
                <div style={LT.row}><span style={LT.lbl}>True:</span><span style={{...LT.val,color:'#0055aa'}}>{trueBrg!==null?fmtBrg(trueBrg):'—'}</span></div>
                <div style={LT.row}>
                  <span style={LT.lbl}>Gyro:</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{...LT.val,minWidth:60,textAlign:'right'}}>{fmtBrg(gyroBrgNum)}</span>
                    <button onClick={()=>adjGyro(-0.1)} style={LT.adjBtn}>‹</button>
                    <button onClick={()=>adjGyro( 0.1)} style={LT.adjBtn}>›</button>
                  </div>
                </div>
                <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Standard:</span><span style={LT.val}>{fmtBrg(stdBrg)}</span></div>

                {/* Error */}
                <div style={LT.secHdr}>Error:</div>
                <div style={LT.row}><span style={LT.lbl}>Gyro:</span><span style={{...LT.val,color:errClrLt(gyroErr)}}>{fmtErr(gyroErr)}</span></div>
                <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Standard:</span><span style={{...LT.val,color:errClrLt(stdErr)}}>{fmtErr(stdErr)}</span></div>

                {/* Variation — editable inline */}
                <div style={LT.secHdr}>Variation:</div>
                <div style={{...LT.row,flexWrap:'wrap',gap:4,borderBottom:'none'}}>
                  <span style={LT.lbl}>{varRate!==null?`${varMag}° ${varDir} (${varRate>0?'+':''}${(varRate*60).toFixed(1)}′/yr)`:`${varMag}° ${varDir}`}</span>
                  <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                    <input type="number" min="0" max="90" step="0.1" value={varMag}
                      onChange={e=>{setVarMag(e.target.value);setVarSrc('manual');}}
                      style={{ width:55, padding:'4px 5px', border:'1.5px solid #0070cc', borderRadius:6,
                        fontFamily:"'Orbitron',monospace", fontSize:'0.78rem', color:'#0055aa', background:'#fff', textAlign:'center', outline:'none' }}/>
                    <button onClick={()=>setVarDir(d=>d==='E'?'W':'E')}
                      style={{ padding:'4px 9px', background:varDir==='W'?'#fff8e6':'#e8f6ee',
                        border:`1px solid ${varDir==='W'?'#a06000':'#007a50'}`, borderRadius:6, cursor:'pointer',
                        fontFamily:"'Orbitron',monospace", fontSize:'0.7rem', fontWeight:700, color:varDir==='W'?'#a06000':'#007a50' }}>
                      {varDir}
                    </button>
                    <button onClick={()=>adjVar(-0.1)} style={LT.adjBtn}>‹</button>
                    <button onClick={()=>adjVar( 0.1)} style={LT.adjBtn}>›</button>
                  </div>
                </div>

                {/* Deviation */}
                <div style={LT.secHdr}>Deviation:</div>
                <div style={{...LT.row,borderBottom:'none'}}>
                  <span style={LT.lbl}>Standard:</span>
                  <span style={{...LT.val,color:errClrLt(deviation),fontSize:'0.92rem',fontWeight:700}}>{fmtErr(deviation)}</span>
                </div>

                {/* Almanac extras */}
                {az && (
                  <div style={{ marginTop:'0.9rem', paddingTop:'0.7rem', borderTop:'1px solid #d5e2ee', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 10px', fontSize:'0.66rem', color:'#5a6a8a', fontFamily:'monospace' }}>
                    <div>GHA: {az.GHA.toFixed(2)}°</div>
                    <div>LHA: {az.LHA.toFixed(2)}°</div>
                    <div>Dec: {az.Dec.toFixed(2)}°</div>
                    <div>Alt: {altApp!==null?(altApp).toFixed(2)+'°':'—'}</div>
                    <div>GHA♈: {ghaAr.toFixed(2)}°</div>
                    <div>Refr: {altitude!==null?refraction(altitude).toFixed(3)+'°':'—'}</div>
                  </div>
                )}

                {/* Save to History */}
                <button onClick={saveToHistory} disabled={!pos||trueBrg===null}
                  style={{ marginTop:'0.9rem', width:'100%', padding:'10px', background:'linear-gradient(135deg,#1565C0,#003d99)',
                    border:'none', borderRadius:9, color:'white', fontFamily:"'Orbitron',monospace", fontSize:'0.72rem',
                    fontWeight:700, cursor:'pointer', letterSpacing:'0.08em', opacity: (!pos||trueBrg===null)?0.4:1 }}>
                  💾 Save to Observation History
                </button>
              </>) : (
                <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'#6a7a9a' }}>
                  <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📡</div>
                  <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.76rem', color:'#2a3a5a', marginBottom:6 }}>
                    {posErr ? 'GPS Unavailable' : 'Awaiting GPS Position…'}
                  </div>
                  <div style={{ fontSize:'0.72rem', lineHeight:1.6 }}>
                    {posErr || 'Please allow location access to begin calculations'}
                  </div>
                </div>
              )}
            </div>

            {/* Formulae card */}
            <div style={{ ...DC.card, marginTop:'0.75rem', marginBottom:0 }}>
              <div style={DC.hdr}>📐 FORMULAE (ABC METHOD)</div>
              <div style={{ fontSize:'0.68rem', color:'var(--text2)', lineHeight:2.1, fontFamily:'monospace' }}>
                <div>A = tan(Lat) / tan(LHA)   [contrary to lat if LHA 0-180]</div>
                <div>B = tan(Dec) / sin(LHA)   [same as Dec name]</div>
                <div>C = A ± B → tan(Z) = 1/(C × cos Lat)</div>
                <div>Std Brg = Gyro Brg + (Std Hdg − Gyro Hdg)</div>
                <div>Error = True − Compass   (+)E  (−)W</div>
                <div>Deviation = Std Error − Variation</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: AMPLITUDE METHOD
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'amplitude' && (
        <div style={{ display:'grid', gridTemplateColumns: isMob?'1fr':'1fr 1fr', gap:'1rem' }}>
          <div>
            {/* Info box */}
            <div style={{ ...DC.card, background:'rgba(0,180,216,0.06)', border:'1px solid rgba(0,180,216,0.2)' }}>
              <div style={{ fontSize:'0.75rem', color:'var(--text2)', lineHeight:1.8 }}>
                <strong style={{ color:'var(--cyan)' }}>Amplitude Method</strong> is used when a celestial body is on the rational horizon (altitude ≈ 0°).
                Observe the compass/gyro bearing exactly when the body's lower limb touches the visible horizon.
                Best accuracy: Sun, Moon at sunrise/sunset.
              </div>
            </div>

            {/* Body & position display */}
            <div style={DC.card}>
              <div style={DC.hdr}>{BODY_ICON[body]||'⭐'} SELECTED BODY: {body.toUpperCase()}</div>
              {bp && pos ? (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginBottom:'0.7rem' }}>
                    {[
                      { l:'Declination', v:`${bp.Dec.toFixed(2)}°`, c: bp.Dec>=0?'var(--green)':'var(--red)' },
                      { l:'Apparent Alt', v:`${(altApp??0).toFixed(2)}°`, c: isNearHorizon?'var(--gold)':'var(--text2)' },
                      { l:'True Amplitude', v: ampA!==null?`${ampDirStr} ${Math.abs(ampA).toFixed(1)}°`:'—', c:'var(--cyan)' },
                      { l:'True Bearing', v: ampTrueBrg!==null?fmtBrg(ampTrueBrg):'—', c:'var(--cyan)' },
                    ].map(({l,v,c})=>(
                      <div key={l} style={{ background:'var(--bg2)', borderRadius:8, padding:'8px 10px' }}>
                        <div style={{ fontSize:'0.58rem', color:'var(--text3)', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</div>
                        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.82rem', color:c, fontWeight:700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {!isNearHorizon && (
                    <div style={{ padding:'8px 10px', background:'rgba(240,165,0,0.08)', border:'1px solid rgba(240,165,0,0.25)', borderRadius:8, fontSize:'0.7rem', color:'var(--gold)' }}>
                      ⚠️ Body not near horizon (app. alt = {(altApp??0).toFixed(1)}°). Amplitude is most accurate at altitude −3° to +5°.
                    </div>
                  )}
                </>
              ) : <div style={{ color:'var(--text3)', fontSize:'0.78rem' }}>Awaiting GPS and body data…</div>}
            </div>

            {/* Rising / Setting */}
            <div style={DC.card}>
              <div style={DC.hdr}>🌅 RISING OR SETTING</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.6rem' }}>
                {[{l:'🌅 Rising (E)', v:true},{l:'🌇 Setting (W)', v:false}].map(({l,v})=>(
                  <button key={l} onClick={()=>setAmpRising(v)}
                    style={{ padding:'12px', borderRadius:9, border:`1.5px solid ${ampRising===v?'var(--cyan)':'var(--border)'}`,
                      background: ampRising===v?'rgba(0,180,216,0.1)':'transparent',
                      color: ampRising===v?'var(--cyan)':'var(--text2)', fontFamily:"'Exo 2',sans-serif",
                      fontSize:'0.78rem', fontWeight:600, cursor:'pointer' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Observed bearings */}
            <div style={DC.card}>
              <div style={DC.hdr}>📏 OBSERVED BEARINGS ON HORIZON</div>
              {[
                {l:'Compass (Standard) Bearing',val:ampCmpBrg,set:setAmpCmpBrg},
                {l:'Gyro Bearing',               val:ampGyroBrg,set:setAmpGyroBrg},
              ].map(({l,val,set})=>(
                <div key={l} style={{ marginBottom:'0.7rem' }}>
                  <label style={{ display:'block', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:5 }}>{l}</label>
                  {numInput(val, set, { border:'1.5px solid var(--border2)' })}
                </div>
              ))}
            </div>
          </div>

          {/* Amplitude Output Card */}
          <div style={LT.card}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.78rem', fontWeight:700, color:'#0a1628', textAlign:'center', marginBottom:'0.8rem', paddingBottom:'0.6rem', borderBottom:'1.5px solid #ccd8e8' }}>
              🌅 AMPLITUDE RESULTS
            </div>
            {pos && bp ? (<>
              <div style={{ fontSize:'0.72rem', color:'#3a4a6a', marginBottom:'0.6rem', fontFamily:'monospace' }}>{fmtPos(pos.lat,pos.lon)}</div>
              <div style={{ fontSize:'0.72rem', color:'#3a4a6a', marginBottom:'0.8rem' }}>{fmtUTC(now)}</div>

              {[
                { s:'Body', rows:[
                  {l:'Name', v:body},
                  {l:'Declination', v:`${Math.abs(bp.Dec).toFixed(1)}° ${bp.Dec>=0?'N':'S'}`},
                  {l:'Latitude', v:`${Math.abs(pos.lat).toFixed(1)}° ${pos.lat>=0?'N':'S'}`},
                ], border:true },
                { s:'Amplitude', rows:[
                  {l:'True Amplitude', v: ampA!==null?`${ampDirStr} ${Math.abs(ampA).toFixed(1)}°`:'—', bold:true},
                  {l:'True Bearing',   v: ampTrueBrg!==null?fmtBrg(ampTrueBrg):'—', bold:true, c:'#0055aa'},
                ], border:true },
                { s:'Compass Error', rows:[
                  {l:'Std Compass',   v:ampCmpBrg?`${parseFloat(ampCmpBrg).toFixed(1)}°`:'—'},
                  {l:'Std Error',     v:fmtErr(ampCmpErr),  c:errClrLt(ampCmpErr),  bold:true},
                  {l:'Gyro',          v:ampGyroBrg?`${parseFloat(ampGyroBrg).toFixed(1)}°`:'—'},
                  {l:'Gyro Error',    v:fmtErr(ampGyroErr), c:errClrLt(ampGyroErr), bold:true},
                ], border:true },
                { s:'Deviation', rows:[
                  {l:'Variation',  v:`${varMag}° ${varDir}`},
                  {l:'Std Dev.',   v:fmtErr(ampStdDev), c:errClrLt(ampStdDev), bold:true},
                ], border:false },
              ].map(({s,rows,border})=>(
                <div key={s} style={{ marginBottom:'0.5rem' }}>
                  <div style={LT.secHdr}>{s}:</div>
                  {rows.map(({l,v,bold,c})=>(
                    <div key={l} style={{...LT.row, borderBottom:border?'1px solid #e2ecf5':'none'}}>
                      <span style={LT.lbl}>{l}:</span>
                      <span style={{...LT.val, color:c||'#0a1628', fontWeight:bold?700:600}}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div style={{ marginTop:'0.8rem', padding:'8px 10px', background:'#e8f6ee', border:'1px solid #9dc8b0', borderRadius:8, fontSize:'0.68rem', color:'#2a6a4a', lineHeight:1.7 }}>
                <strong>Formula:</strong> True Amp = sin⁻¹(sin Dec / cos Lat)<br/>
                Rising → E prefix · Setting → W prefix<br/>
                Dec N → N suffix · Dec S → S suffix
              </div>
            </>) : (
              <div style={{ textAlign:'center', padding:'2rem', color:'#6a7a9a', fontSize:'0.78rem' }}>
                📡 Awaiting GPS position…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: POLARIS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'polaris' && (
        <div style={{ display:'grid', gridTemplateColumns: isMob?'1fr':'1fr 1fr', gap:'1rem' }}>
          <div>
            <div style={{ ...DC.card, background:'rgba(0,180,216,0.06)', border:'1px solid rgba(0,180,216,0.2)' }}>
              <div style={{ fontSize:'0.75rem', color:'var(--text2)', lineHeight:1.8 }}>
                <strong style={{ color:'var(--cyan)' }}>Polaris (North Star)</strong> — Always within ~1° of true north.
                Observe the compass/gyro bearing to Polaris. Any deviation from the calculated true bearing gives compass error directly.
                <br/><strong style={{ color:'var(--gold)' }}>Best for: Lat 15°N–75°N, body visible &gt;5° altitude.</strong>
              </div>
            </div>

            {/* Polaris computed data */}
            <div style={DC.card}>
              <div style={DC.hdr}>⭐ POLARIS — COMPUTED POSITION</div>
              {polAz && pos ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.4rem', marginBottom:'0.6rem' }}>
                  {[
                    { l:'True Bearing', v:fmtBrg(polTrue??0), c:'var(--cyan)' },
                    { l:'Altitude',     v:`${polAz.altitude.toFixed(2)}°`, c: polVisible?'var(--green)':'var(--red)' },
                    { l:'GHA',          v:`${polAz.GHA.toFixed(2)}°`,      c:'var(--text)' },
                    { l:'LHA Aries',    v:`${ghaAr.toFixed(2)}°`,          c:'var(--text)' },
                  ].map(({l,v,c})=>(
                    <div key={l} style={{ background:'var(--bg2)', borderRadius:7, padding:'8px 10px', textAlign:'center' }}>
                      <div style={{ fontSize:'0.57rem', color:'var(--text3)', marginBottom:3, textTransform:'uppercase' }}>{l}</div>
                      <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.8rem', color:c, fontWeight:700 }}>{v}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color:'var(--text3)', fontSize:'0.78rem' }}>Awaiting GPS…</div>}
              {polAz && !polVisible && (
                <div style={{ padding:'8px 10px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:8, fontSize:'0.7rem', color:'var(--red)' }}>
                  ⚠️ Polaris altitude {polAz.altitude.toFixed(1)}° — may be below horizon or obscured. Visible only in Northern Hemisphere.
                </div>
              )}
            </div>

            {/* Observed bearings */}
            <div style={DC.card}>
              <div style={DC.hdr}>📏 OBSERVED BEARINGS TO POLARIS</div>
              {[
                {l:'Compass (Standard) Bearing to Polaris',val:polCmpBrg,set:setPolCmpBrg},
                {l:'Gyro Bearing to Polaris',              val:polGyroBrg,set:setPolGyroBrg},
              ].map(({l,val,set})=>(
                <div key={l} style={{ marginBottom:'0.7rem' }}>
                  <label style={{ display:'block', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.09em', marginBottom:5 }}>{l}</label>
                  {numInput(val, set)}
                </div>
              ))}
            </div>
          </div>

          {/* Polaris Output Card */}
          <div style={LT.card}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.78rem', fontWeight:700, color:'#0a1628', textAlign:'center', marginBottom:'0.8rem', paddingBottom:'0.6rem', borderBottom:'1.5px solid #ccd8e8' }}>
              ⭐ POLARIS RESULTS
            </div>
            {pos && polAz ? (<>
              <div style={{ fontSize:'0.72rem', color:'#3a4a6a', marginBottom:'0.6rem', fontFamily:'monospace' }}>{fmtPos(pos.lat,pos.lon)}</div>
              <div style={{ fontSize:'0.72rem', color:'#3a4a6a', marginBottom:'0.8rem' }}>{fmtUTC(now)}</div>

              <div style={LT.secHdr}>Polaris True Bearing:</div>
              <div style={{...LT.row}}>
                <span style={LT.lbl}>Computed True:</span>
                <span style={{...LT.val,color:'#0055aa',fontWeight:700,fontSize:'0.96rem'}}>{polTrue!==null?fmtBrg(polTrue):'—'}</span>
              </div>
              <div style={{...LT.row,borderBottom:'none'}}>
                <span style={LT.lbl}>Altitude:</span>
                <span style={{...LT.val,color:polVisible?'#007a50':'#cc2233'}}>{polAz.altitude.toFixed(2)}°</span>
              </div>

              <div style={LT.secHdr}>Compass Error:</div>
              <div style={LT.row}>
                <span style={LT.lbl}>Std Compass:</span>
                <span style={LT.val}>{polCmpBrg?`${parseFloat(polCmpBrg).toFixed(1)}°`:'—'}</span>
              </div>
              <div style={LT.row}>
                <span style={LT.lbl}>Std Error:</span>
                <span style={{...LT.val,color:errClrLt(polCmpErr),fontWeight:700}}>{fmtErr(polCmpErr)}</span>
              </div>
              <div style={LT.row}>
                <span style={LT.lbl}>Gyro:</span>
                <span style={LT.val}>{polGyroBrg?`${parseFloat(polGyroBrg).toFixed(1)}°`:'—'}</span>
              </div>
              <div style={{...LT.row,borderBottom:'none'}}>
                <span style={LT.lbl}>Gyro Error:</span>
                <span style={{...LT.val,color:errClrLt(polGyroErr),fontWeight:700}}>{fmtErr(polGyroErr)}</span>
              </div>

              <div style={LT.secHdr}>Deviation:</div>
              <div style={{...LT.row,borderBottom:'none'}}>
                <span style={LT.lbl}>Variation {varMag}° {varDir}</span>
                <span style={{...LT.val,color:errClrLt(polStdDev),fontWeight:700,fontSize:'0.94rem'}}>{fmtErr(polStdDev)}</span>
              </div>

              <div style={{ marginTop:'0.9rem', padding:'8px 10px', background:'#e8f6ee', border:'1px solid #9dc8b0', borderRadius:8, fontSize:'0.67rem', color:'#2a6a4a', lineHeight:1.7 }}>
                Polaris true bearing is computed using full almanac (SHA 318.7°, Dec 89.0°, epoch 2025).
                Accuracy: ±0.1°. Error = True − Observed bearing.
              </div>
            </>) : (
              <div style={{ textAlign:'center', padding:'2rem', color:'#6a7a9a', fontSize:'0.78rem' }}>
                📡 Awaiting GPS position…
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: HISTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.9rem' }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)' }}>
              📋 OBSERVATION HISTORY <span style={{ fontSize:'0.62rem', color:'var(--text3)', marginLeft:8 }}>Last 10 · Device only</span>
            </div>
            {history.length > 0 && (
              <button onClick={()=>{setHistory([]);localStorage.removeItem(LS_HIST);}}
                style={{ padding:'5px 12px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:7, color:'var(--red)', fontSize:'0.69rem', fontWeight:600, cursor:'pointer' }}>
                🗑 Clear All
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div style={{ textAlign:'center', padding:'3rem', color:'var(--text3)' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📋</div>
              <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.78rem', marginBottom:6 }}>No Saved Observations</div>
              <div style={{ fontSize:'0.72rem' }}>Go to Azimuth tab → complete a calculation → click "Save to Observation History"</div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
              {history.map((h, i) => (
                <div key={h.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6, marginBottom:'0.6rem' }}>
                    <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.68rem', color:'var(--cyan)' }}>
                      #{history.length - i} · {h.dt}
                    </div>
                    <div style={{ fontSize:'0.65rem', color:'var(--text3)' }}>{h.pos}</div>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:'0.4rem' }}>
                    {[
                      {l:'Body',       v:h.body,    c:'var(--text)'},
                      {l:'True Brg',   v:`${h.trueBrg}°`, c:'var(--cyan)'},
                      {l:'Gyro Hdg',   v:`${h.gyroHdg}°`, c:'var(--text2)'},
                      {l:'Std Hdg',    v:`${h.stdHdg}°`,  c:'var(--text2)'},
                      {l:'Gyro Err',   v:h.gyroErr, c:h.gyroErr.includes('E')?'var(--green)':'var(--red)'},
                      {l:'Std Error',  v:h.stdErr,  c:h.stdErr.includes('E')?'var(--green)':'var(--red)'},
                      {l:'Variation',  v:h.varStr,  c:'var(--text2)'},
                      {l:'Deviation',  v:h.dev,     c:h.dev==='—'?'var(--text3)':h.dev.includes('E')?'var(--green)':'var(--red)'},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{ background:'var(--bg2)', borderRadius:7, padding:'6px 8px', textAlign:'center' }}>
                        <div style={{ fontSize:'0.55rem', color:'var(--text3)', marginBottom:2, textTransform:'uppercase' }}>{l}</div>
                        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.72rem', color:c, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DEVIATION CARD
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'devcard' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.9rem', flexWrap:'wrap', gap:8 }}>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)' }}>
              📊 DEVIATION CARD BUILDER
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>{const n=Array(8).fill('');setDevCard(n);localStorage.setItem(LS_DEVC,JSON.stringify(n));}}
                style={{ padding:'5px 12px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:7, color:'var(--red)', fontSize:'0.69rem', fontWeight:600, cursor:'pointer' }}>
                🗑 Clear
              </button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMob?'1fr':'1fr 1fr', gap:'1rem' }}>
            {/* Input table */}
            <div style={DC.card}>
              <div style={DC.hdr}>✏️ ENTER DEVIATION FOR EACH STANDARD HEADING</div>
              <div style={{ fontSize:'0.67rem', color:'var(--text3)', marginBottom:'0.7rem' }}>
                Enter deviation in degrees. Use negative (−) for West, positive (+) for East.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto', gap:'0.5rem', alignItems:'center' }}>
                <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', textAlign:'center' }}>Heading</div>
                <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', textAlign:'center' }}>Deviation (+ E / − W)</div>
                <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', textAlign:'center' }}>Result</div>
                {DEV_HDGS.map((h, i) => {
                  const v = parseFloat(devCard[i])||0;
                  return [
                    <div key={`h${i}`} style={{ background:'var(--bg2)', borderRadius:6, padding:'7px 10px', textAlign:'center', fontFamily:"'Orbitron',monospace", fontSize:'0.78rem', color:'var(--text)' }}>{String(h).padStart(3,'0')}°</div>,
                    <input key={`v${i}`} type="number" step="0.1" value={devCard[i]} onChange={e=>updateDevCard(i,e.target.value)}
                      style={{ ...DC.input, border:`1.5px solid ${v>0?'rgba(0,200,150,0.5)':v<0?'rgba(255,71,87,0.5)':'var(--border2)'}`, color:v>0?'var(--green)':v<0?'var(--red)':'var(--text)' }}/>,
                    <div key={`r${i}`} style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.72rem', color:v>=0?'var(--green)':'var(--red)', textAlign:'center', minWidth:40 }}>
                      {v!==0 ? `${v>0?'+':''}${v.toFixed(1)}°${v>=0?'E':'W'}` : '—'}
                    </div>
                  ];
                })}
              </div>
            </div>

            {/* Chart + summary */}
            <div>
              <div style={DC.card}>
                <div style={DC.hdr}>📈 DEVIATION CURVE</div>
                <DeviationChart deviations={devCard} />
                <div style={{ display:'flex', justifyContent:'center', gap:18, marginTop:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', color:'var(--text3)' }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:'var(--green)' }}/>East
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.65rem', color:'var(--text3)' }}>
                    <div style={{ width:12, height:12, borderRadius:'50%', background:'var(--red)' }}/>West
                  </div>
                </div>
              </div>
              <div style={DC.card}>
                <div style={DC.hdr}>📋 DEVIATION CARD SUMMARY</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'0.35rem' }}>
                  {DEV_HDGS.map((h,i)=>{
                    const v = parseFloat(devCard[i])||0;
                    return (
                      <div key={h} style={{ background:'var(--bg2)', borderRadius:7, padding:'7px 6px', textAlign:'center' }}>
                        <div style={{ fontSize:'0.6rem', color:'var(--text3)' }}>{String(h).padStart(3,'0')}°</div>
                        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:'0.76rem', fontWeight:700, color:v>=0?'var(--green)':'var(--red)', marginTop:2 }}>
                          {v!==0 ? `${v>0?'+':''}${v.toFixed(1)}` : '0.0'}
                        </div>
                        <div style={{ fontSize:'0.55rem', color: v>=0?'var(--green)':'var(--red)' }}>{v>=0?'E':'W'}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop:'0.7rem', padding:'8px 10px', background:'rgba(0,180,216,0.06)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:8, fontSize:'0.67rem', color:'var(--text2)', lineHeight:1.7 }}>
                  Max dev: <span style={{ color:'var(--cyan)' }}>{Math.max(...devCard.map(v=>Math.abs(parseFloat(v)||0))).toFixed(1)}°</span>
                  &nbsp;·&nbsp;
                  Max E: <span style={{ color:'var(--green)' }}>{Math.max(0,...devCard.map(v=>parseFloat(v)||0)).toFixed(1)}°</span>
                  &nbsp;·&nbsp;
                  Max W: <span style={{ color:'var(--red)' }}>{Math.abs(Math.min(0,...devCard.map(v=>parseFloat(v)||0))).toFixed(1)}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
