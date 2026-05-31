/* eslint-disable */
// src/Pages/CompassErrorPage.jsx

import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// MATH / ASTRONOMY UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

const toRad   = d => d * Math.PI / 180;
const toDeg   = r => r * 180 / Math.PI;
const norm360 = d => ((d % 360) + 360) % 360;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Julian Date from JS Date object
const julianDate = date => date.getTime() / 86400000 + 2440587.5;

// GHA of Aries (Greenwich Hour Angle of First Point of Aries)
const ghaAries = jd => {
  const T = (jd - 2451545.0) / 36525;
  return norm360(
    280.46061837 +
    360.98564736629 * (jd - 2451545) +
    0.000387933 * T * T -
    (T * T * T) / 38710000
  );
};

// ── Sun GHA and Declination (Jean Meeus Ch.25, low precision) ─────────────────
const sunGHADec = jd => {
  const T   = (jd - 2451545.0) / 36525;
  const L0  = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M   = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr  = toRad(M);
  const C   =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr);
  const sunLon = norm360(L0 + C);
  const omega  = 125.04 - 1934.136 * T;
  const lam    = toRad(sunLon - 0.00569 - 0.00478 * Math.sin(toRad(omega)));
  const eps    = toRad(23.4392911 - 0.013004167 * T);
  const RA     = norm360(toDeg(Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam))));
  const Dec    = toDeg(Math.asin(clamp(Math.sin(eps) * Math.sin(lam), -1, 1)));
  return { GHA: norm360(ghaAries(jd) - RA), Dec };
};

// ── Moon GHA and Declination (Meeus Ch.47, main terms) ────────────────────────
const moonGHADec = jd => {
  const T   = (jd - 2451545.0) / 36525;
  const L   = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T);
  const D   = norm360(297.8501921 + 445267.1114034  * T - 0.0018819 * T * T);
  const M   = norm360(357.5291092 + 35999.0502909   * T - 0.0001536 * T * T);
  const Mp  = norm360(134.9633964 + 477198.8675055  * T + 0.0087414 * T * T);
  const F   = norm360(93.2720950  + 483202.0175233  * T - 0.0036539 * T * T);
  const [Dr, Mr, Mpr, Fr] = [D, M, Mp, F].map(toRad);

  const dL =
    ( 6288774 * Math.sin(Mpr)              +
      1274027 * Math.sin(2*Dr - Mpr)       +
       658314 * Math.sin(2*Dr)             +
       213618 * Math.sin(2*Mpr)            -
       185116 * Math.sin(Mr)               -
       114332 * Math.sin(2*Fr)             +
        58793 * Math.sin(2*Dr - 2*Mpr)     +
        57066 * Math.sin(2*Dr - Mr - Mpr)  +
        53322 * Math.sin(2*Dr + Mpr)       +
        45758 * Math.sin(2*Dr - Mr) ) / 1e6;

  const dB =
    ( 5128122 * Math.sin(Fr)               +
       280602 * Math.sin(Mpr + Fr)         +
       277693 * Math.sin(Mpr - Fr)         +
       173237 * Math.sin(2*Dr - Fr)        +
        55413 * Math.sin(2*Dr - Mpr + Fr)  +
        46271 * Math.sin(2*Dr - Mpr - Fr) ) / 1e6;

  const lam = toRad(L + dL);
  const bet = toRad(dB);
  const eps = toRad(23.4392911 - 0.013004167 * T);
  const x   = Math.cos(bet) * Math.cos(lam);
  const y   = Math.cos(eps) * Math.cos(bet) * Math.sin(lam) - Math.sin(eps) * Math.sin(bet);
  const z   = Math.sin(eps) * Math.cos(bet) * Math.sin(lam) + Math.cos(eps) * Math.sin(bet);
  const RA  = norm360(toDeg(Math.atan2(y, x)));
  const Dec = toDeg(Math.asin(clamp(z, -1, 1)));
  return { GHA: norm360(ghaAries(jd) - RA), Dec };
};

// ── Planet GHA and Declination (simplified orbital elements, Meeus Ch.31) ─────
const planetGHADec = (name, jd) => {
  const T = (jd - 2451545.0) / 36525;
  // [L0, L1, a, e, i, w, O]
  const ELEM = {
    Venus:   [181.979801, 58519.212948, 0.72333, 0.006773, 3.3947, 131.5637, 76.6799],
    Mars:    [355.433275, 19141.696551, 1.52368, 0.093405, 1.8497, 336.0602, 49.5581],
    Jupiter: [ 34.351519,  3036.302374, 5.20260, 0.048498, 1.3053,  14.3313,100.4644],
    Saturn:  [ 50.077444,  1223.511285, 9.55491, 0.055508, 2.4848,  93.0572,113.6655],
  };
  const el = ELEM[name];
  if (!el) return null;
  const [L0, L1, a, e, i, w, O] = el;

  // Mean anomaly
  const Mv = toRad(norm360(L0 + L1 * T - w));
  // Eccentric anomaly (Newton iteration)
  let E = Mv;
  for (let k = 0; k < 8; k++) E = Mv + e * Math.sin(E);
  // True anomaly
  const v  = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r  = a * (1 - e * Math.cos(E));
  const u  = toRad(norm360(toDeg(v) + w - O));
  const Or = toRad(O), ir = toRad(i);

  // Heliocentric ecliptic coords
  const xh = r * (Math.cos(Or) * Math.cos(u) - Math.sin(Or) * Math.sin(u) * Math.cos(ir));
  const yh = r * (Math.sin(Or) * Math.cos(u) + Math.cos(Or) * Math.sin(u) * Math.cos(ir));
  const zh = r * Math.sin(u) * Math.sin(ir);

  // Earth heliocentric (from Sun)
  const Ms = toRad(norm360(357.52911 + 35999.05029 * T));
  const Cs = 1.9146 * Math.sin(Ms) + 0.0200 * Math.sin(2 * Ms);
  const sL = toRad(norm360(280.46646 + 36000.76983 * T + Cs));
  const Re = 1.00014 - 0.01671 * Math.cos(Ms) - 0.00014 * Math.cos(2 * Ms);
  const xe = Re * Math.cos(sL + Math.PI);
  const ye = Re * Math.sin(sL + Math.PI);

  // Geocentric ecliptic → equatorial
  const eps  = toRad(23.4392911 - 0.013004167 * T);
  const xg = xh + xe, yg = yh + ye, zg = zh;
  const xeq  = xg;
  const yeq  = yg * Math.cos(eps) - zg * Math.sin(eps);
  const zeq  = yg * Math.sin(eps) + zg * Math.cos(eps);
  const dist = Math.sqrt(xeq*xeq + yeq*yeq + zeq*zeq);
  const RA   = norm360(toDeg(Math.atan2(yeq, xeq)));
  const Dec  = toDeg(Math.asin(clamp(zeq / dist, -1, 1)));
  return { GHA: norm360(ghaAries(jd) - RA), Dec };
};

// ── 57 Navigational Stars (SHA & Dec ~2025 from Nautical Almanac) ─────────────
const NAV_STARS = [
  { name: 'Acamar',         SHA: 315.5, Dec: -40.3 },
  { name: 'Achernar',       SHA: 335.5, Dec: -57.2 },
  { name: 'Acrux',          SHA: 173.3, Dec: -63.1 },
  { name: 'Adhara',         SHA: 255.3, Dec: -28.9 },
  { name: 'Aldebaran',      SHA: 291.2, Dec:  16.5 },
  { name: 'Alioth',         SHA: 166.6, Dec:  55.9 },
  { name: 'Alkaid',         SHA: 153.2, Dec:  49.3 },
  { name: "Al Na'ir",       SHA:  28.1, Dec: -47.0 },
  { name: 'Alnilam',        SHA: 276.1, Dec:  -1.2 },
  { name: 'Alphard',        SHA: 218.2, Dec:  -8.7 },
  { name: 'Alphecca',       SHA: 126.3, Dec:  26.7 },
  { name: 'Alpheratz',      SHA: 358.0, Dec:  29.1 },
  { name: 'Altair',         SHA:  62.3, Dec:   8.9 },
  { name: 'Ankaa',          SHA: 353.5, Dec: -42.3 },
  { name: 'Antares',        SHA: 112.6, Dec: -26.4 },
  { name: 'Arcturus',       SHA: 146.2, Dec:  19.2 },
  { name: 'Atria',          SHA: 108.0, Dec: -69.0 },
  { name: 'Avior',          SHA: 234.3, Dec: -59.5 },
  { name: 'Bellatrix',      SHA: 279.0, Dec:   6.3 },
  { name: 'Betelgeuse',     SHA: 271.2, Dec:   7.4 },
  { name: 'Canopus',        SHA: 264.1, Dec: -52.7 },
  { name: 'Capella',        SHA: 281.1, Dec:  46.0 },
  { name: 'Deneb',          SHA:  49.7, Dec:  45.3 },
  { name: 'Denebola',       SHA: 182.9, Dec:  14.6 },
  { name: 'Diphda',         SHA: 349.2, Dec: -18.0 },
  { name: 'Dubhe',          SHA: 194.2, Dec:  61.8 },
  { name: 'Elnath',         SHA: 278.7, Dec:  28.6 },
  { name: 'Eltanin',        SHA:  90.7, Dec:  51.5 },
  { name: 'Enif',           SHA:  34.1, Dec:   9.9 },
  { name: 'Fomalhaut',      SHA:  15.5, Dec: -29.7 },
  { name: 'Gacrux',         SHA: 172.2, Dec: -57.1 },
  { name: 'Gienah',         SHA: 176.2, Dec: -17.5 },
  { name: 'Hadar',          SHA: 149.2, Dec: -60.3 },
  { name: 'Hamal',          SHA: 328.3, Dec:  23.5 },
  { name: 'Kaus Australis', SHA:  84.1, Dec: -34.4 },
  { name: 'Kochab',         SHA: 137.3, Dec:  74.1 },
  { name: 'Markab',         SHA:  14.0, Dec:  15.2 },
  { name: 'Menkar',         SHA: 314.4, Dec:   4.1 },
  { name: 'Menkent',        SHA: 148.3, Dec: -36.3 },
  { name: 'Miaplacidus',    SHA: 221.9, Dec: -69.7 },
  { name: 'Mirfak',         SHA: 309.2, Dec:  49.9 },
  { name: 'Nunki',          SHA:  76.3, Dec: -26.3 },
  { name: 'Peacock',        SHA:  54.0, Dec: -56.8 },
  { name: 'Pollux',         SHA: 243.8, Dec:  28.0 },
  { name: 'Procyon',        SHA: 245.2, Dec:   5.2 },
  { name: 'Rasalhague',     SHA:  96.4, Dec:  12.6 },
  { name: 'Regulus',        SHA: 208.0, Dec:  12.0 },
  { name: 'Rigel',          SHA: 281.3, Dec:  -8.2 },
  { name: 'Rigil Kent.',    SHA: 140.2, Dec: -60.8 },
  { name: 'Sabik',          SHA: 102.4, Dec: -15.7 },
  { name: 'Schedar',        SHA: 350.0, Dec:  56.5 },
  { name: 'Shaula',         SHA:  96.8, Dec: -37.1 },
  { name: 'Sirius',         SHA: 258.9, Dec: -16.7 },
  { name: 'Spica',          SHA: 158.8, Dec: -11.2 },
  { name: 'Suhail',         SHA: 223.1, Dec: -43.4 },
  { name: 'Vega',           SHA:  80.9, Dec:  38.8 },
  { name: 'Zubenelgenubi',  SHA: 137.4, Dec: -16.0 },
];

// Route all body lookups through one function
const getBodyPos = (body, jd) => {
  if (body === 'Sun')  return sunGHADec(jd);
  if (body === 'Moon') return moonGHADec(jd);
  if (['Venus', 'Mars', 'Jupiter', 'Saturn'].includes(body)) return planetGHADec(body, jd);
  const s = NAV_STARS.find(x => x.name === body);
  return s ? { GHA: norm360(ghaAries(jd) + s.SHA), Dec: s.Dec } : null;
};

// Azimuth + altitude from GHA / Dec and observer position
const calcAzimuth = (lat, lon, GHA, Dec) => {
  const LHA  = norm360(GHA + lon);            // lon: +E, −W
  const latR = toRad(lat), decR = toRad(Dec), lhaR = toRad(LHA);
  const sinH = clamp(
    Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(lhaR),
    -1, 1
  );
  const H    = Math.asin(sinH);
  const cosZ = clamp(
    (Math.sin(decR) - Math.sin(latR) * sinH) / (Math.cos(latR) * Math.cos(H)),
    -1, 1
  );
  const Z    = toDeg(Math.acos(cosZ));
  return {
    azimuth:  norm360(Math.sin(lhaR) > 0 ? 360 - Z : Z),
    altitude: toDeg(H),
    LHA,
    GHA,
    Dec,
  };
};

// Normalise error angle to [−180, +180]
const normErr = e => ((e + 180) % 360 + 360) % 360 - 180;

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const p2 = n => String(Math.floor(Math.abs(n))).padStart(2, '0');

const fmtUTC = d =>
  `${d.getUTCDate()} ` +
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()] +
  ` ${d.getUTCFullYear()} ` +
  `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;

const fmtLMT = (d, lon) => {
  const ms  = d.getTime() + (lon / 15) * 3600000;
  const lmt = new Date(ms);
  return `${p2(lmt.getUTCHours())}:${p2(lmt.getUTCMinutes())}:${p2(lmt.getUTCSeconds())} LMT`;
};

const fmtLat = lat => {
  const d = Math.floor(Math.abs(lat));
  const m = ((Math.abs(lat) - d) * 60).toFixed(1);
  return `Lat: ${d}° ${m}'${lat >= 0 ? 'N' : 'S'}`;
};

const fmtLon = lon => {
  const d = Math.floor(Math.abs(lon));
  const m = ((Math.abs(lon) - d) * 60).toFixed(1);
  return `Long: ${d}° ${m}'${lon >= 0 ? 'E' : 'W'}`;
};

const fmtBrg = v => `${norm360(v).toFixed(1)}°`;

const fmtErr = v => {
  if (v === null || isNaN(v)) return '—';
  return `${Math.abs(v).toFixed(1)}° ${v >= 0 ? 'E' : 'W'}`;
};

// ══════════════════════════════════════════════════════════════════════════════
// STATIC DATA
// ══════════════════════════════════════════════════════════════════════════════

const BODY_OPTS = [
  { group: '☀️ Solar System', items: ['Sun', 'Moon', 'Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { group: '⭐ 57 Navigational Stars', items: NAV_STARS.map(s => s.name) },
];

const BODY_ICON = { Sun:'☀️', Moon:'🌙', Venus:'♀', Mars:'♂', Jupiter:'♃', Saturn:'♄' };

// Light-card styles (output panel)
const LT = {
  card: {
    background: '#f2f7fc',
    border: '1px solid #ccd8e8',
    borderRadius: 14,
    padding: '1.2rem',
    color: '#0a1628',
    fontFamily: "'Exo 2', sans-serif",
  },
  secHdr: {
    fontWeight: 700,
    fontSize: '0.85rem',
    color: '#0a1628',
    textAlign: 'center',
    margin: '0.8rem 0 0.35rem',
    paddingBottom: '0.3rem',
    borderBottom: '1.5px solid #ccd8e8',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #e2ecf5',
  },
  lbl: { fontSize: '0.83rem', color: '#2a3a5a' },
  val: { fontFamily: "'Orbitron', monospace", fontSize: '0.87rem', color: '#0a1628', fontWeight: 600 },
  adjBtn: {
    padding: '5px 10px',
    background: '#e2ecf5',
    border: '1px solid #b0c2d4',
    borderRadius: 7,
    color: '#2a3a5a',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 700,
    lineHeight: 1,
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function CompassErrorPage() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pos,      setPos]      = useState(null);
  const [posErr,   setPosErr]   = useState('');
  const [now,      setNow]      = useState(new Date());
  const [body,     setBody]     = useState('Sun');

  // Ship headings
  const [gyroHdg,  setGyroHdg]  = useState('000.0');
  const [stdHdg,   setStdHdg]   = useState('000.0');

  // Gyro bearing of the observed body
  const [gyroObs,  setGyroObs]  = useState('');
  const [gyroLock, setGyroLock] = useState(false); // true = user entered manually

  // Magnetic variation
  const [varMag,   setVarMag]   = useState('0.0');
  const [varDir,   setVarDir]   = useState('W');
  const [varSrc,   setVarSrc]   = useState('manual'); // 'noaa' | 'manual'

  // Responsive
  const [isMob, setIsMob] = useState(window.innerWidth < 720);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onR = () => setIsMob(window.innerWidth < 720);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  // Live clock — 1-second tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // GPS — single fetch on mount
  useEffect(() => {
    if (!navigator.geolocation) { setPosErr('GPS not available'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      e => setPosErr(e.message || 'GPS denied'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  // NOAA Geomag API for magnetic variation
  useEffect(() => {
    if (!pos || varSrc === 'noaa') return;
    (async () => {
      try {
        const url =
          `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination` +
          `?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&resultFormat=json`;
        const res = await fetch(url);
        const dat = await res.json();
        const dec = dat?.result?.[0]?.declination;
        if (dec !== undefined && !isNaN(dec)) {
          setVarMag(Math.abs(dec).toFixed(1));
          setVarDir(dec >= 0 ? 'E' : 'W');
          setVarSrc('noaa');
        }
      } catch { /* stay on manual */ }
    })();
  }, [pos]);                           // only re-run if position changes

  // ── Astronomical calculations ──────────────────────────────────────────────
  const jd  = julianDate(now);
  const bp  = pos ? getBodyPos(body, jd) : null;
  const az  = bp && pos ? calcAzimuth(pos.lat, pos.lon, bp.GHA, bp.Dec) : null;

  const trueBrg   = az ? az.azimuth  : null;
  const altitude  = az ? az.altitude : null;
  const ghaDeg    = az ? az.GHA      : null;
  const lhaDeg    = az ? az.LHA      : null;
  const decDeg    = az ? az.Dec      : null;

  // Gyro bearing of object: user-entered or falls back to true bearing as reference
  const gyroBrgNum  = gyroLock && gyroObs !== ''
    ? parseFloat(gyroObs)
    : (trueBrg ?? 0);

  // Standard (magnetic compass) bearing derived from heading difference
  const ghNum    = parseFloat(gyroHdg) || 0;
  const shNum    = parseFloat(stdHdg)  || 0;
  const stdBrg   = norm360(gyroBrgNum + (shNum - ghNum));

  // Variation signed (+E / −W)
  const varSigned = (parseFloat(varMag) || 0) * (varDir === 'E' ? 1 : -1);

  // Errors and deviation
  const gyroErr  = trueBrg !== null ? normErr(trueBrg - gyroBrgNum) : null;
  const stdErr   = trueBrg !== null ? normErr(trueBrg - stdBrg)     : null;
  const deviation = stdErr !== null ? stdErr - varSigned              : null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const adjGyro = delta => {
    setGyroLock(true);
    setGyroObs(prev =>
      norm360((parseFloat(prev !== '' ? prev : (trueBrg ?? 0)) + delta)).toFixed(1)
    );
  };

  const adjVar = delta => {
    const nxt = Math.max(0, parseFloat(((parseFloat(varMag) || 0) + delta).toFixed(1)));
    setVarMag(nxt.toFixed(1));
  };

  const resetGyro = () => { setGyroLock(false); setGyroObs(''); };

  const errColor  = v => v === null ? '#0a1628' : v >= 0 ? '#007a50' : '#cc2233';
  const errColorDark = v => v === null ? 'var(--text)' : v >= 0 ? 'var(--green)' : 'var(--red)';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '1rem', maxWidth: 980, margin: '0 auto', width: '100%' }}>

      {/* ── Page header ── */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:'1.2rem', flexWrap:'wrap' }}>
        <div style={{
          width:44, height:44, borderRadius:11,
          background:'linear-gradient(135deg,#00B4D8,#1565C0)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.4rem', flexShrink:0,
          boxShadow:'0 0 22px rgba(0,180,216,0.4)',
        }}>🧭</div>
        <div>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', fontWeight:700, letterSpacing:'0.08em' }}>
            COMPASS ERROR CALCULATOR
          </div>
          <div style={{ fontSize:'0.62rem', color:'var(--cyan)', letterSpacing:'0.14em', textTransform:'uppercase' }}>
            Celestial Navigation · Nautical Almanac Method
          </div>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{
            padding:'3px 9px', borderRadius:100, fontSize:'0.62rem',
            background: pos ? 'rgba(0,200,150,0.1)' : 'rgba(240,165,0,0.1)',
            border:`1px solid ${pos ? 'rgba(0,200,150,0.3)' : 'rgba(240,165,0,0.3)'}`,
            color: pos ? 'var(--green)' : 'var(--gold)',
          }}>
            {pos ? '📡 GPS Active' : posErr ? `⚠️ ${posErr}` : '⏳ Getting GPS…'}
          </span>
          {varSrc === 'noaa' && (
            <span style={{ padding:'3px 9px', borderRadius:100, fontSize:'0.62rem', background:'rgba(0,180,216,0.1)', border:'1px solid rgba(0,180,216,0.3)', color:'var(--cyan)' }}>
              🔵 NOAA WMM
            </span>
          )}
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div style={{ display:'grid', gridTemplateColumns: isMob ? '1fr' : '1fr 1fr', gap:'1rem' }}>

        {/* ════════════════ LEFT — INPUT PANEL ════════════════ */}
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>

          {/* Auto Time & Position */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.67rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.65rem' }}>
              🕐 AUTO DATE · TIME · POSITION
            </div>
            <div style={{ fontFamily:'monospace', fontSize:'0.78rem', lineHeight:2.1 }}>
              <div style={{ color:'var(--text)', fontWeight:600 }}>{fmtUTC(now)}</div>
              {pos && <div style={{ color:'var(--text2)' }}>{fmtLMT(now, pos.lon)}</div>}
              <div style={{ color: pos ? 'var(--text)' : 'var(--text3)', marginTop:2 }}>
                {pos ? `${fmtLat(pos.lat)}  ${fmtLon(pos.lon)}` : posErr || 'Fetching GPS position…'}
              </div>
            </div>
          </div>

          {/* Celestial Body Selector */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.67rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.65rem' }}>
              {BODY_ICON[body] || '⭐'} CELESTIAL BODY
            </div>
            <select
              value={body}
              onChange={e => { setBody(e.target.value); resetGyro(); }}
              style={{
                width:'100%', padding:'9px 12px',
                background:'var(--bg2)', border:'1px solid var(--border2)',
                borderRadius:8, color:'var(--text)',
                fontFamily:"'Exo 2',sans-serif", fontSize:'0.86rem',
                outline:'none', cursor:'pointer',
              }}
            >
              {BODY_OPTS.map(g => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map(it => <option key={it} value={it}>{it}</option>)}
                </optgroup>
              ))}
            </select>

            {/* Computed body stats */}
            {az && (
              <div style={{ marginTop:'0.7rem', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0.4rem' }}>
                {[
                  { l:'TRUE BRG', v: fmtBrg(trueBrg),            c:'var(--cyan)' },
                  { l:'ALTITUDE', v: `${altitude.toFixed(1)}°`,   c: altitude < 0 ? 'var(--red)' : 'var(--green)' },
                  { l:'DEC',      v: `${decDeg.toFixed(1)}°`,     c:'var(--text)' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background:'var(--bg2)', borderRadius:7, padding:'6px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.55rem', color:'var(--text3)', marginBottom:2, letterSpacing:'0.06em' }}>{l}</div>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', color:c, fontWeight:700 }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {altitude !== null && altitude < 0 && (
              <div style={{ marginTop:8, padding:'7px 10px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:8, fontSize:'0.7rem', color:'var(--red)' }}>
                ⚠️ {body} is below the horizon — bearings shown for reference only
              </div>
            )}
          </div>

          {/* Ship's Heading */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.67rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.65rem' }}>
              🚢 SHIP'S HEADING
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.7rem' }}>
              {[
                { label:'Gyro Compass', val:gyroHdg, set:setGyroHdg },
                { label:'Standard (Mag.)', val:stdHdg, set:setStdHdg },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={{ display:'block', fontSize:'0.59rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>
                    {label}
                  </label>
                  <input
                    type="number" min="0" max="360" step="0.1"
                    value={val}
                    onChange={e => set(e.target.value)}
                    style={{
                      width:'100%', padding:'9px 6px',
                      background:'var(--bg2)', border:'1px solid var(--border2)',
                      borderRadius:8, color:'var(--text)',
                      fontFamily:'Orbitron,monospace', fontSize:'0.92rem',
                      outline:'none', textAlign:'center',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Gyro Bearing of Observed Body */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.65rem' }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.67rem', fontWeight:700, color:'var(--cyan)' }}>
                🔭 GYRO BRG OF {body.toUpperCase()}
              </div>
              {gyroLock && (
                <button
                  onClick={resetGyro}
                  style={{ fontSize:'0.59rem', padding:'3px 9px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:6, color:'var(--red)', cursor:'pointer' }}
                >
                  ↺ Reset
                </button>
              )}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                type="number" min="0" max="360" step="0.1"
                value={gyroLock ? gyroObs : (trueBrg !== null ? norm360(gyroBrgNum).toFixed(1) : '')}
                onChange={e => { setGyroLock(true); setGyroObs(e.target.value); }}
                placeholder="Enter observed"
                style={{
                  flex:1, padding:'9px 6px',
                  background:'var(--bg2)', border:'1.5px solid var(--cyan)',
                  borderRadius:8, color:'var(--cyan)',
                  fontFamily:'Orbitron,monospace', fontSize:'0.92rem',
                  outline:'none', textAlign:'center',
                }}
              />
              <button onClick={() => adjGyro(-0.1)} style={{ padding:'9px 12px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:7, color:'var(--text2)', cursor:'pointer', fontSize:'1rem', fontWeight:700 }}>‹</button>
              <button onClick={() => adjGyro( 0.1)} style={{ padding:'9px 12px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:7, color:'var(--text2)', cursor:'pointer', fontSize:'1rem', fontWeight:700 }}>›</button>
            </div>
            <div style={{ marginTop:7, fontSize:'0.67rem', color:'var(--text3)' }}>
              {gyroLock
                ? '✏️ User-entered — adjust with ‹ › to match gyro readout'
                : '🔄 Showing true azimuth — tap to enter observed gyro bearing'}
            </div>
          </div>

          {/* Magnetic Variation */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.65rem' }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.67rem', fontWeight:700, color:'var(--cyan)' }}>
                🧲 VARIATION
              </div>
              <span style={{ fontSize:'0.6rem', color: varSrc==='noaa' ? 'var(--green)' : 'var(--text3)' }}>
                {varSrc === 'noaa' ? '✓ NOAA WMM auto-fetched' : 'Enter manually'}
              </span>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input
                type="number" min="0" max="90" step="0.1"
                value={varMag}
                onChange={e => { setVarMag(e.target.value); setVarSrc('manual'); }}
                style={{
                  flex:1, padding:'9px 6px',
                  background:'var(--bg2)', border:'1.5px solid var(--border2)',
                  borderRadius:8, color:'var(--text)',
                  fontFamily:'Orbitron,monospace', fontSize:'0.92rem',
                  outline:'none', textAlign:'center',
                }}
              />
              {/* E/W toggle */}
              <button
                onClick={() => setVarDir(d => d === 'E' ? 'W' : 'E')}
                style={{
                  padding:'9px 14px',
                  background: varDir === 'W' ? 'rgba(240,165,0,0.12)' : 'rgba(0,200,150,0.12)',
                  border:`1px solid ${varDir === 'W' ? 'var(--gold)' : 'var(--green)'}`,
                  borderRadius:8, cursor:'pointer',
                  fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700,
                  color: varDir === 'W' ? 'var(--gold)' : 'var(--green)',
                }}
              >{varDir}</button>
              <button onClick={() => adjVar(-0.1)} style={{ padding:'9px 12px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:7, color:'var(--text2)', cursor:'pointer', fontSize:'1rem', fontWeight:700 }}>‹</button>
              <button onClick={() => adjVar( 0.1)} style={{ padding:'9px 12px', background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:7, color:'var(--text2)', cursor:'pointer', fontSize:'1rem', fontWeight:700 }}>›</button>
            </div>
          </div>
        </div>

        {/* ════════════════ RIGHT — OUTPUT CARD (light theme) ════════════════ */}
        <div>
          <div style={LT.card}>

            {/* Card header */}
            <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:'0.75rem', paddingBottom:'0.75rem', borderBottom:'1.5px solid #ccd8e8' }}>
              <div style={{ width:34, height:34, borderRadius:8, background:'linear-gradient(135deg,#1565C0,#003d99)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.15rem', flexShrink:0 }}>🧭</div>
              <div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700, color:'#0a1628' }}>Compass Error</div>
                <div style={{ fontSize:'0.62rem', color:'#3a4a6a', marginTop:1 }}>{fmtUTC(now)}</div>
              </div>
            </div>

            {pos ? (
              <>
                {/* Position */}
                <div style={{ fontSize:'0.73rem', color:'#2a3a5a', fontFamily:'monospace', marginBottom:'0.1rem', lineHeight:1.8 }}>
                  {fmtLat(pos.lat)}  {fmtLon(pos.lon)}
                </div>

                {/* Ship's heading */}
                <div style={LT.secHdr}>Ship's heading:</div>
                <div style={LT.row}>
                  <span style={LT.lbl}>Gyro:</span>
                  <span style={LT.val}>{fmtBrg(parseFloat(gyroHdg) || 0)}</span>
                </div>
                <div style={LT.row}>
                  <span style={LT.lbl}>Standard:</span>
                  <span style={LT.val}>{fmtBrg(parseFloat(stdHdg) || 0)}</span>
                </div>

                {/* Bearing */}
                <div style={LT.secHdr}>Bearing (object: {body}):</div>

                {/* True */}
                <div style={LT.row}>
                  <span style={LT.lbl}>True:</span>
                  <span style={{ ...LT.val, color:'#0055aa' }}>
                    {trueBrg !== null ? fmtBrg(trueBrg) : '—'}
                  </span>
                </div>

                {/* Gyro bearing — editable with ‹ › */}
                <div style={LT.row}>
                  <span style={LT.lbl}>Gyro:</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ ...LT.val, minWidth:64, textAlign:'right' }}>
                      {fmtBrg(gyroBrgNum)}
                    </span>
                    <button onClick={() => adjGyro(-0.1)} style={LT.adjBtn}>‹</button>
                    <button onClick={() => adjGyro( 0.1)} style={LT.adjBtn}>›</button>
                  </div>
                </div>

                {/* Standard */}
                <div style={LT.row}>
                  <span style={LT.lbl}>Standard:</span>
                  <span style={LT.val}>{fmtBrg(stdBrg)}</span>
                </div>

                {/* Error */}
                <div style={LT.secHdr}>Error:</div>
                <div style={LT.row}>
                  <span style={LT.lbl}>Gyro:</span>
                  <span style={{ ...LT.val, color: errColor(gyroErr) }}>{fmtErr(gyroErr)}</span>
                </div>
                <div style={LT.row}>
                  <span style={LT.lbl}>Standard:</span>
                  <span style={{ ...LT.val, color: errColor(stdErr) }}>{fmtErr(stdErr)}</span>
                </div>

                {/* Variation — editable inline */}
                <div style={{ ...LT.row, flexWrap:'wrap', gap:4 }}>
                  <span style={{ ...LT.lbl }}>Variation:</span>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <input
                      type="number" min="0" max="90" step="0.1"
                      value={varMag}
                      onChange={e => { setVarMag(e.target.value); setVarSrc('manual'); }}
                      style={{
                        width:58, padding:'4px 6px',
                        border:'1.5px solid #0070cc', borderRadius:6,
                        fontFamily:'Orbitron,monospace', fontSize:'0.8rem',
                        color:'#0055aa', background:'#fff',
                        textAlign:'center', outline:'none',
                      }}
                    />
                    <button
                      onClick={() => setVarDir(d => d === 'E' ? 'W' : 'E')}
                      style={{
                        padding:'4px 9px',
                        background: varDir === 'W' ? '#fff8e6' : '#e8f6ee',
                        border:`1px solid ${varDir === 'W' ? '#a06000' : '#007a50'}`,
                        borderRadius:6, cursor:'pointer',
                        fontFamily:'Orbitron,monospace', fontSize:'0.72rem', fontWeight:700,
                        color: varDir === 'W' ? '#a06000' : '#007a50',
                      }}
                    >{varDir}</button>
                    <button onClick={() => adjVar(-0.1)} style={LT.adjBtn}>‹</button>
                    <button onClick={() => adjVar( 0.1)} style={LT.adjBtn}>›</button>
                  </div>
                </div>

                {/* Deviation */}
                <div style={LT.secHdr}>Deviation:</div>
                <div style={{ ...LT.row, borderBottom:'none' }}>
                  <span style={LT.lbl}>Standard:</span>
                  <span style={{ ...LT.val, color: errColor(deviation), fontWeight:700, fontSize:'0.9rem' }}>
                    {fmtErr(deviation)}
                  </span>
                </div>

                {/* Extra almanac data */}
                <div style={{ marginTop:'0.9rem', paddingTop:'0.75rem', borderTop:'1px solid #d5e2ee', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px', fontSize:'0.67rem', color:'#4a5a7a', fontFamily:'monospace' }}>
                  {ghaDeg  !== null && <div>GHA: {ghaDeg.toFixed(2)}°</div>}
                  {lhaDeg  !== null && <div>LHA: {lhaDeg.toFixed(2)}°</div>}
                  {decDeg  !== null && <div>Dec: {decDeg.toFixed(2)}°</div>}
                  {altitude!== null && <div>Alt: {altitude.toFixed(2)}°</div>}
                </div>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'#6a7a9a' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:10 }}>📡</div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', marginBottom:6, color:'#2a3a5a' }}>
                  {posErr ? 'GPS Unavailable' : 'Awaiting GPS…'}
                </div>
                <div style={{ fontSize:'0.72rem', lineHeight:1.6 }}>
                  {posErr || 'Allow location access to begin calculations'}
                </div>
              </div>
            )}
          </div>

          {/* Formula quick-reference */}
          <div style={{ marginTop:'0.75rem', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'0.9rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.64rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.55rem' }}>
              📐 FORMULAE
            </div>
            <div style={{ fontSize:'0.69rem', color:'var(--text2)', lineHeight:2.1, fontFamily:'monospace' }}>
              <div>Std Brg = Gyro Brg + (Std Hdg − Gyro Hdg)</div>
              <div>Gyro Error = True Brg − Gyro Brg</div>
              <div>Compass Error = True Brg − Std Brg</div>
              <div>Deviation = Compass Error − Variation</div>
              <div style={{ color:'var(--text3)', fontSize:'0.62rem', marginTop:2 }}>
                Positive (+) = East &nbsp;·&nbsp; Negative (−) = West
              </div>
            </div>
          </div>

          {/* Almanac summary row */}
          {az && (
            <div style={{ marginTop:'0.75rem', background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'0.9rem' }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.64rem', fontWeight:700, color:'var(--cyan)', marginBottom:'0.55rem' }}>
                📖 ALMANAC DATA — {body.toUpperCase()}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.35rem', fontSize:'0.7rem', color:'var(--text2)' }}>
                {[
                  ['True Bearing', fmtBrg(trueBrg)],
                  ['Altitude',     `${altitude.toFixed(2)}°`],
                  ['GHA',          `${ghaDeg.toFixed(2)}°`],
                  ['LHA',          `${lhaDeg.toFixed(2)}°`],
                  ['Declination',  `${decDeg.toFixed(2)}°`],
                  ['Variation',    fmtErr(varSigned)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', gap:4, padding:'3px 0', borderBottom:'1px solid var(--border)' }}>
                    <span style={{ color:'var(--text3)' }}>{k}:</span>
                    <span style={{ fontFamily:'Orbitron,monospace', fontSize:'0.69rem', color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
