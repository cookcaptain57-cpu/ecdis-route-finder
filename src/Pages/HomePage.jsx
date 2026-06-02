/* eslint-disable */
// src/pages/HomePage.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from "firebase/firestore";
import { idbGet } from "../sheets";

// Maritime tips of the day
const MARITIME_TIPS = [
  "⚓ Always maintain a safe speed to allow adequate time to take avoiding action in restricted visibility.",
  "🧭 Check gyro compass error against solar azimuth or stellar observation at least once per watch.",
  "📻 Monitor VHF Channel 16 at all times when underway for distress, urgency and safety calls.",
  "🌊 A vessel not under command should show two all-round red lights in a vertical line.",
  "⛽ Bunker tanks should be fully checked before departure — fuel contamination causes most engine failures.",
  "🗺 Always update charts to the latest Notice to Mariners before departure.",
  "🌪 In the Northern Hemisphere, tropical cyclones rotate counter-clockwise. The dangerous semicircle is on the right of the storm's path.",
  "🔦 Test navigation lights before every departure — carry spare bulbs on all ocean voyages.",
  "📋 STCW rest hours minimum: 10 hours rest in any 24-hour period, 77 hours in any 7-day period.",
  "⚠️ Rule 5 of COLREGS requires a proper look-out at all times by sight, hearing and all available means.",
  "🌡 MARPOL Annex VI limits sulphur content in fuel to 0.5% globally and 0.1% in ECAs.",
  "🛢 Oil record book must be maintained for all machinery space operations on ships ≥400 GT.",
  "📡 AIS Class A transponders must be maintained operational at all times when underway.",
  "⚓ The anchoring depth should not exceed 82 metres — beyond this, anchor chain control becomes difficult.",
  "🧯 Fire drills must be conducted at least once a month under SOLAS Chapter III Reg 19.",
  "🌊 Load line regulations — a ship must never be loaded beyond its assigned load line marks.",
  "📦 Dangerous goods must be declared, properly labelled and stowed as per IMDG Code requirements.",
  "🔐 ISM Code requires every ship to have a Safety Management System and a Designated Person Ashore (DPA).",
  "🌐 GMDSS — all SOLAS ships must maintain a continuous radio watch on appropriate distress frequencies.",
  "🚢 Under MARPOL Annex I, no ship may discharge oily mixture unless oil content is less than 15 ppm.",
];

// WMO weather codes to icons and descriptions
const weatherIcon = (code) => {
  if (code === 0) return { icon:'☀️', desc:'Clear sky' };
  if (code <= 3)  return { icon:'🌤️', desc:'Partly cloudy' };
  if (code <= 48) return { icon:'🌫️', desc:'Foggy' };
  if (code <= 55) return { icon:'🌦️', desc:'Drizzle' };
  if (code <= 65) return { icon:'🌧️', desc:'Rain' };
  if (code <= 77) return { icon:'❄️', desc:'Snow' };
  if (code <= 82) return { icon:'🌦️', desc:'Rain showers' };
  if (code <= 95) return { icon:'⛈️', desc:'Thunderstorm' };
  return { icon:'🌩️', desc:'Heavy storm' };
};

const calcDays = (signOn, signOff) => {
  if (!signOn) return 0;
  const from = new Date(signOn);
  const to   = signOff ? new Date(signOff) : new Date();
  return Math.max(0, Math.floor((to - from) / 86400000));
};
const formatDuration = (d) => {
  const y = Math.floor(d/365), m = Math.floor((d%365)/30), r = d%30;
  return [y>0?`${y}y`:'', m>0?`${m}m`:'', `${r}d`].filter(Boolean).join(' ');
};

export default function HomePage({ routes, charts, onSearch, setTab, user, portsDb = [], userProfile = null }) {
  const [q,           setQ]           = useState('');
  const [qResults,    setQResults]    = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [tipIndex,    setTipIndex]    = useState(() => Math.floor(Math.random() * MARITIME_TIPS.length));
  const [portNotice,  setPortNotice]  = useState(null);
  const [weather,     setWeather]     = useState(null);
  const [weatherPort, setWeatherPort] = useState('');
  const [weatherQ,    setWeatherQ]    = useState('');
  const [weatherSugg, setWeatherSugg] = useState([]);
  const [isOffline,   setIsOffline]   = useState(false);
  const [seaTimeDays, setSeaTimeDays] = useState(null);
  const [expiringCerts, setExpiringCerts] = useState([]);
  const [sheetRoutes,   setSheetRoutes]   = useState([]);
  const [sheetCharts,   setSheetCharts]   = useState([]);
  const wRef = useRef();

  // Check if data is cached (offline capable)
  useEffect(() => {
    idbGet('routes_d').then(d => setIsOffline(Array.isArray(d) && d.length > 0)).catch(()=>{});
    idbGet('routes_d').then(d => setSheetRoutes(Array.isArray(d) ? d : [])).catch(()=>{});
    idbGet('charts_d').then(d => setSheetCharts(Array.isArray(d) ? d : [])).catch(()=>{});
  }, []);

  // Rotate tip daily
  useEffect(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % MARITIME_TIPS.length;
    setTipIndex(dayIndex);
  }, []);

  // Load port notice and user data on mount
  useEffect(() => {
    loadPortNotice();
    if (user) { loadSeaTime(); loadCerts(); }
  }, [user?.uid]);

  const loadPortNotice = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt','desc'), limit(1)));
      if (!snap.empty) {
        const n = { id:snap.docs[0].id, ...snap.docs[0].data() };
        const isActive = !n.expiryDate || new Date(n.expiryDate) >= new Date();
        if (isActive) setPortNotice(n);
      }
    } catch {}
  };

  const loadSeaTime = async () => {
    try {
      const snap = await getDoc(doc(db, 'seatime', user.uid));
      if (snap.exists()) {
        const total = (snap.data().entries||[]).reduce((s,e) => s + calcDays(e.signOn,e.signOff), 0);
        setSeaTimeDays(total);
      }
    } catch {}
  };

  const loadCerts = async () => {
    try {
      const snap = await getDoc(doc(db, 'certificates', user.uid));
      if (snap.exists()) {
        const list = snap.data().list || [];
        const expiring = list.filter(c => {
          if (!c.expiryDate) return false;
          const d = Math.floor((new Date(c.expiryDate)-new Date())/86400000);
          return d >= 0 && d <= 90;
        });
        setExpiringCerts(expiring);
      }
    } catch {}
  };

  // Weather fetch using OpenMeteo (free, no API key)
  const fetchWeather = async (port) => {
    if (!port?.lat || !port?.lon) return;
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${port.lat}&longitude=${port.lon}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kn&timezone=auto`;
      const res  = await fetch(url);
      const data = await res.json();
      const c    = data.current;
      setWeather({ temp:Math.round(c.temperature_2m), wind:Math.round(c.wind_speed_10m), code:c.weather_code, port:port.name });
      setWeatherPort(port.name);
    } catch { setWeather(null); }
  };

  // Weather port autocomplete
  useEffect(() => {
    if (!weatherQ || weatherQ.length < 2) { setWeatherSugg([]); return; }
    const ql = weatherQ.toLowerCase();
    setWeatherSugg(portsDb.filter(p => p.lat && p.lon && (p.name||'').toLowerCase().includes(ql)).slice(0,6));
  }, [weatherQ, portsDb]);

  // Global search across routes + charts + ports
  const doSearch = (sq) => {
    const s = (sq!==undefined ? sq : q).trim();
    if (!s || s.length < 2) { setQResults([]); return; }
    setSearching(true);
    const ql = s.toLowerCase();
    const rr = sheetRoutes.filter(r=>Object.values(r).join(' ').toLowerCase().includes(ql)).slice(0,5).map(r=>({ type:'route', label:r['File Name']||r.fileName||'Route', sub:r['Port Name']||r.portName||'' }));
    const cr = sheetCharts.filter(c=>Object.values(c).join(' ').toLowerCase().includes(ql)).slice(0,5).map(c=>({ type:'chart', label:c['File Name']||c.fileName||'Chart', sub:c['Port Name']||c.portName||'' }));
    const pr = portsDb.filter(p=>(p.name||'').toLowerCase().includes(ql)).slice(0,5).map(p=>({ type:'port',  label:p.name, sub:p.country||'' }));
    setQResults([...rr,...cr,...pr]);
    setSearching(false);
  };

  const selectResult = (r) => {
    if (r.type==='route' || r.type==='chart') { onSearch(r.label); }
    else { setTab('ports'); }
    setQ(''); setQResults([]);
  };

  const FEATURE_CARDS = [
    { icon:'🗺',  title:'ROUTES',          desc:'Browse, search & download 23,000+ RTZ routes.',   tab:'routes',  color:'var(--cyan)' },
    { icon:'📊',  title:'ECDIS CHARTS',    desc:'Access charts for all major ECDIS brands.',        tab:'charts',  color:'var(--gold)' },
    { icon:'✏️',  title:'ROUTE PLANNER',   desc:'Plan optimised routes with advanced tools.',       tab:'planner', color:'var(--green)' },
    { icon:'🧭',  title:'NAV MODE',        desc:'Navigate with precision.',                         tab:'navmode', color:'#A78BFA', badge:'NEW' },
    { icon:'⚓',  title:'PORTS DATABASE',  desc:'27,000+ global ports with coordinates.',           tab:'ports',   color:'var(--cyan)' },
    { icon:'🚢',  title:'VESSEL SEARCH',   desc:'Search by IMO, MMSI or flag state.',               tab:'vessel',  color:'var(--gold)', badge:'NEW' },
    { icon:'🧮',  title:'VOYAGE CALC',     desc:'Calculate distance, duration and fuel.',           tab:'voyage',  color:'var(--green)' },
    { icon:'📜',  title:'CERTIFICATES',    desc:'Track STCW certificate expiry dates.',             tab:'certs',   color:'#A78BFA' },
    { icon:'⏱',  title:'SEA TIME',        desc:'Log sea service time across all ships.',           tab:'seatime', color:'var(--cyan)' },
    { icon:'📢',  title:'PORT NOTICES',    desc:'Closures, restrictions and navigational warnings.',tab:'notices', color:'var(--gold)' },
    { icon:'📚',  title:'LIBRARY',         desc:'SOLAS, MARPOL, IMO, STCW & more.',                tab:'library', color:'var(--gold)' },
  ];

  const wc = weather ? weatherIcon(weather.code) : null;

  return (
    <div style={{ padding:'1.2rem', maxWidth:1100, margin:'0 auto', width:'100%' }}>

      {/* ── Port Notice Banner ── */}
      {portNotice && (
        <div style={{ background:'rgba(255,107,53,0.08)', border:'1px solid rgba(255,107,53,0.3)', borderRadius:10,
          padding:'10px 14px', marginBottom:'1rem', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', cursor:'pointer' }}
          onClick={() => setTab('notices')}>
          <span>⚠️</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text2)', fontWeight:500 }}>
            <strong style={{ color:'#ff6b35' }}>Port Notice:</strong> {portNotice.title}
            {portNotice.portName && ` — ${portNotice.portName}`}
          </span>
          <span style={{ marginLeft:'auto', fontSize:'0.68rem', color:'#ff6b35' }}>View all →</span>
        </div>
      )}

      {/* ── Welcome + search ── */}
      <div style={{ marginBottom:'1.4rem' }}>
        <div style={{ marginBottom:'0.6rem' }}>
          <span style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--text3)', letterSpacing:'0.12em' }}>
            NAVISPHERE<span style={{ color:'var(--cyan)' }}>X</span> MARINE
          </span>
          {user && (
            <span style={{ color:'var(--cyan)' }}>
              {' '}— Welcome{userProfile?.name ? `, ${userProfile?.rank?userProfile.rank+' ':''}${userProfile.name.split(' ')[0]}` : ' back'}!
            </span>
          )}
        </div>

        {/* Quick unified search */}
        <div ref={wRef} style={{ position:'relative' }}>
          <div className="siw">
            <span className="si-ic">🔍</span>
            <input className="si" style={{ paddingLeft:42, fontSize:'0.9rem' }}
              placeholder="Search routes, charts, ports… type anything"
              value={q}
              onChange={e => { setQ(e.target.value); doSearch(e.target.value); }}
              onKeyDown={e => e.key==='Enter' && onSearch(q)} />
            {q && (
              <button onClick={() => { setQ(''); setQResults([]); }}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1.1rem' }}>✕</button>
            )}
          </div>
          {/* Search results dropdown */}
          {qResults.length > 0 && (
            <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:300,
              background:'var(--card)', border:'1px solid var(--border)', borderRadius:12,
              boxShadow:'0 12px 40px rgba(0,0,0,0.5)', overflow:'hidden' }}>
              {['route','chart','port'].map(type => {
                const items = qResults.filter(r=>r.type===type);
                if (!items.length) return null;
                const colors = { route:'var(--cyan)', chart:'var(--gold)', port:'var(--green)' };
                const labels = { route:'Routes', chart:'Charts', port:'Ports' };
                return (
                  <div key={type}>
                    <div style={{ padding:'6px 14px', fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)' }}>
                      {labels[type]}
                    </div>
                    {items.map((r,i) => (
                      <div key={i} onMouseDown={() => selectResult(r)}
                        style={{ padding:'9px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:colors[type], flexShrink:0 }} />
                        <div>
                          <div style={{ fontSize:'0.82rem', color:'var(--text)' }}>{r.label}</div>
                          {r.sub && <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>{r.sub}</div>}
                        </div>
                        <span style={{ marginLeft:'auto', fontSize:'0.62rem', color:colors[type] }}>{labels[type].slice(0,-1)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Personal widgets row (logged-in users) ── */}
      {user && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:10, marginBottom:'1.4rem' }}>
          {seaTimeDays !== null && (
            <div onClick={() => setTab('seatime')} style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.25)', borderRadius:12, padding:'0.9rem', cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='rgba(0,180,216,0.5)'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(0,180,216,0.25)'}>
              <div style={{ fontSize:'1.3rem', marginBottom:3 }}>⏱</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, color:'var(--cyan)' }}>{formatDuration(seaTimeDays)}</div>
              <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Sea Time</div>
            </div>
          )}
          {expiringCerts.length > 0 && (
            <div onClick={() => setTab('certs')} style={{ background:'rgba(255,71,87,0.06)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:12, padding:'0.9rem', cursor:'pointer' }}>
              <div style={{ fontSize:'1.3rem', marginBottom:3 }}>📜</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, color:'#ff4757' }}>{expiringCerts.length}</div>
              <div style={{ fontSize:'0.62rem', color:'#ff4757', textTransform:'uppercase', letterSpacing:'0.06em' }}>Certs Expiring</div>
            </div>
          )}
          {isOffline && (
            <div style={{ background:'rgba(0,200,100,0.06)', border:'1px solid rgba(0,200,100,0.25)', borderRadius:12, padding:'0.9rem' }}>
              <div style={{ fontSize:'1.3rem', marginBottom:3 }}>✅</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', fontWeight:700, color:'var(--green)' }}>Available</div>
              <div style={{ fontSize:'0.62rem', color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Offline</div>
            </div>
          )}
        </div>
      )}

      {/* ── Feature cards grid ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'0.8rem', marginBottom:'1.4rem' }}>
        {FEATURE_CARDS.map((f,i) => (
          <div key={i} onClick={() => setTab(f.tab)}
            style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:13,
              padding:'1.1rem', cursor:'pointer', transition:'all 0.25s', position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+'66';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.4)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
            {f.badge && (
              <span style={{ position:'absolute', top:8, right:8, padding:'2px 6px', borderRadius:6, fontSize:'0.55rem',
                fontWeight:700, background:f.badge==='NEW'?'rgba(0,200,100,0.15)':'rgba(240,165,0,0.15)',
                color:f.badge==='NEW'?'var(--green)':'var(--gold)',
                border:`1px solid ${f.badge==='NEW'?'rgba(0,200,100,0.3)':'rgba(240,165,0,0.3)'}` }}>{f.badge}</span>
            )}
            <div style={{ fontSize:'1.8rem', marginBottom:'0.5rem' }}>{f.icon}</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.66rem', fontWeight:700, color:f.color, marginBottom:4, letterSpacing:'0.06em' }}>{f.title}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text2)', lineHeight:1.5 }}>{f.desc}</div>
            <div style={{ marginTop:8, fontSize:'0.68rem', color:f.color }}>Explore →</div>
          </div>
        ))}
      </div>

      {/* ── Bottom widgets row ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'1rem', marginBottom:'1.4rem' }}>

        {/* Tip of the Day */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.1rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--gold)', marginBottom:'0.6rem', letterSpacing:'0.08em' }}>💡 TIP OF THE DAY</div>
          <div style={{ fontSize:'0.8rem', color:'var(--text2)', lineHeight:1.7 }}>{MARITIME_TIPS[tipIndex]}</div>
          <button className="btn btn-secondary" style={{ marginTop:'0.8rem', padding:'4px 10px', fontSize:'0.66rem' }}
            onClick={() => setTipIndex(i => (i+1) % MARITIME_TIPS.length)}>Next tip →</button>
        </div>

        {/* Weather Widget */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.1rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--cyan)', marginBottom:'0.6rem', letterSpacing:'0.08em' }}>🌊 PORT WEATHER</div>
          <div style={{ position:'relative', marginBottom:'0.8rem' }}>
            <div className="siw">
              <span className="si-ic" style={{ fontSize:'0.9rem' }}>⚓</span>
              <input className="si" style={{ paddingLeft:36, fontSize:'0.8rem', padding:'8px 8px 8px 34px' }}
                placeholder="Search port…" value={weatherQ}
                onChange={e => setWeatherQ(e.target.value)} />
            </div>
            {weatherSugg.length > 0 && (
              <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200,
                background:'var(--card)', border:'1px solid var(--border)', borderRadius:8,
                boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden', maxHeight:160, overflowY:'auto' }}>
                {weatherSugg.map((p,i) => (
                  <div key={i} onMouseDown={() => { fetchWeather(p); setWeatherQ(''); setWeatherSugg([]); }}
                    style={{ padding:'8px 12px', cursor:'pointer', fontSize:'0.78rem', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    {p.name} <span style={{ color:'var(--text3)', fontSize:'0.68rem' }}>{p.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {weather ? (
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ fontSize:'2.5rem' }}>{wc?.icon}</div>
              <div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.1rem', fontWeight:700, color:'var(--cyan)' }}>{weather.temp}°C</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text2)' }}>💨 {weather.wind} knots · {wc?.desc}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginTop:2 }}>⚓ {weather.port}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize:'0.74rem', color:'var(--text3)', textAlign:'center', padding:'0.5rem 0' }}>
              Search a port above to see current weather conditions
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.1rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--text2)', marginBottom:'0.6rem', letterSpacing:'0.08em' }}>⚡ QUICK ACTIONS</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              { icon:'👤', label:'My Account',    tab:'account',  color:'var(--cyan)' },
              { icon:'⬇️', label:'Download',      tab:'routes',   color:'var(--green)' },
              { icon:'📊', label:'New Charts',    tab:'charts',   color:'var(--gold)' },
              { icon:'🚢', label:'Vessel Search', tab:'vessel',   color:'#A78BFA' },
              { icon:'🧮', label:'Voyage Calc',   tab:'voyage',   color:'var(--green)' },
              { icon:'📢', label:'Notices',       tab:'notices',  color:'#ff6b35' },
            ].map((a,i) => (
              <button key={i} onClick={() => setTab(a.tab)}
                style={{ padding:'8px', borderRadius:8, border:`1px solid ${a.color}33`, background:`${a.color}0a`,
                  cursor:'pointer', display:'flex', alignItems:'center', gap:6, transition:'all 0.2s', fontFamily:'Exo 2,sans-serif', fontSize:'0.72rem', color:a.color }}
                onMouseEnter={e=>e.currentTarget.style.background=`${a.color}18`}
                onMouseLeave={e=>e.currentTarget.style.background=`${a.color}0a`}>
                <span>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Maritime Library quick links ── */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1rem', marginBottom:'1rem', cursor:'pointer' }}
        onClick={() => setTab('library')}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--gold)', marginBottom:'0.6rem' }}>📚 MARITIME LIBRARY</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['SOLAS','MARPOL','STCW','ISM Code','COLREGS','IMDG','MLC','UNCLOS'].map(b => (
            <span key={b} style={{ padding:'3px 9px', borderRadius:6, background:'rgba(240,165,0,0.08)', border:'1px solid rgba(240,165,0,0.2)', fontSize:'0.68rem', color:'var(--gold)' }}>{b}</span>
          ))}
          <span style={{ fontSize:'0.72rem', color:'var(--text3)', alignSelf:'center' }}>→ View all</span>
        </div>
      </div>

      {/* Offline indicator */}
      {isOffline && (
        <div style={{ fontSize:'0.66rem', color:'var(--green)', textAlign:'center', opacity:0.7 }}>
          ✅ App data available offline — cached locally
        </div>
      )}
    </div>
  );
}
