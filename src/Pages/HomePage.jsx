/* eslint-disable */
// src/pages/HomePage.jsx — Reference design: hero + sidebar + cards + widgets
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, orderBy, limit, getDoc, doc } from "firebase/firestore";
import { idbGet } from "../sheets";

const MARITIME_TIPS = [
  "⚓ Always maintain a safe speed to allow adequate time to take avoiding action.",
  "🧭 Check gyro compass error against solar azimuth at least once per watch.",
  "📻 Monitor VHF Channel 16 at all times for distress, urgency and safety calls.",
  "🌊 A vessel not under command shows two all-round red lights vertically.",
  "⛽ Check bunker tanks before departure — fuel contamination causes most engine failures.",
  "🗺 Update charts to latest Notice to Mariners before departure.",
  "🌪 Northern Hemisphere cyclones rotate counter-clockwise. Dangerous semicircle is right of storm track.",
  "🔦 Test navigation lights before every departure — carry spare bulbs on ocean voyages.",
  "📋 STCW: minimum 10h rest in 24h, 77h rest in any 7-day period.",
  "⚠️ Rule 5 COLREGS: proper look-out at all times by sight, hearing and all available means.",
  "🌡 MARPOL Annex VI: sulphur limit 0.5% global, 0.1% in ECAs.",
  "🛢 Oil record book required for all machinery space operations on ships ≥400 GT.",
  "📡 AIS Class A transponders must be operational at all times when underway.",
  "⚓ Anchoring depth should not exceed 82m — beyond this anchor chain control is difficult.",
  "🧯 Fire drills must be conducted at least once a month (SOLAS Ch.III Reg.19).",
  "📦 Dangerous goods must be declared and stowed per IMDG Code requirements.",
  "🔐 ISM Code: every ship must have SMS and a Designated Person Ashore (DPA).",
  "🌐 GMDSS: all SOLAS ships must maintain continuous watch on distress frequencies.",
  "🚢 MARPOL Annex I: oily water discharge only if oil content is less than 15 ppm.",
  "💡 Magnetic compass error = Variation ± Deviation. Always apply before steering.",
];

const weatherIcon = (code) => {
  if (code === 0) return { icon:'☀️', desc:'Clear sky' };
  if (code <= 3)  return { icon:'🌤️', desc:'Partly cloudy' };
  if (code <= 48) return { icon:'🌫️', desc:'Foggy' };
  if (code <= 55) return { icon:'🌦️', desc:'Drizzle' };
  if (code <= 65) return { icon:'🌧️', desc:'Rain' };
  if (code <= 77) return { icon:'❄️',  desc:'Snow' };
  if (code <= 82) return { icon:'🌦️', desc:'Rain showers' };
  if (code <= 95) return { icon:'⛈️', desc:'Thunderstorm' };
  return { icon:'🌩️', desc:'Storm' };
};

const calcDays = (signOn, signOff) => {
  if (!signOn) return 0;
  const from = new Date(signOn), to = signOff ? new Date(signOff) : new Date();
  return Math.max(0, Math.floor((to - from) / 86400000));
};
const fmt = (d) => {
  const y=Math.floor(d/365),m=Math.floor((d%365)/30),r=d%30;
  return [y>0?`${y}y`:'',m>0?`${m}m`:'',`${r}d`].filter(Boolean).join(' ');
};

export default function HomePage({ routes, charts, onSearch, setTab, user, portsDb=[], userProfile=null }) {
  const [q,           setQ]           = useState('');
  const [qResults,    setQResults]    = useState([]);
  const [tipIndex,    setTipIndex]    = useState(() => Math.floor(Date.now()/86400000) % MARITIME_TIPS.length);
  const [portNotice,  setPortNotice]  = useState(null);
  const [weather,     setWeather]     = useState(null);
  const [weatherQ,    setWeatherQ]    = useState('');
  const [weatherSugg, setWeatherSugg] = useState([]);
  const [isOffline,   setIsOffline]   = useState(false);
  const [seaTimeDays, setSeaTimeDays] = useState(null);
  const [expCerts,    setExpCerts]    = useState([]);
  const [cachedRoutes,setCachedRoutes]= useState([]);
  const [cachedCharts,setCachedCharts]= useState([]);
  const wRef = useRef();

  useEffect(() => {
    idbGet('routes_d').then(d => { if (Array.isArray(d) && d.length>0) { setIsOffline(true); setCachedRoutes(d); } }).catch(()=>{});
    idbGet('charts_d').then(d => { if (Array.isArray(d) && d.length>0) setCachedCharts(d); }).catch(()=>{});
    loadPortNotice();
    if (user) { loadSeaTime(); loadCerts(); }
    const h = e => { if (!wRef.current?.contains(e.target)) { setQResults([]); setWeatherSugg([]); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [user?.uid]);

  useEffect(() => { if (!weatherQ || weatherQ.length < 2) { setWeatherSugg([]); return; }
    const ql = weatherQ.toLowerCase();
    setWeatherSugg(portsDb.filter(p=>p.lat&&p.lon&&(p.name||'').toLowerCase().includes(ql)).slice(0,6));
  }, [weatherQ, portsDb]);

  const loadPortNotice = async () => {
    try {
      const snap = await getDocs(query(collection(db,'notices'), orderBy('createdAt','desc'), limit(1)));
      if (!snap.empty) { const n={id:snap.docs[0].id,...snap.docs[0].data()};
        if (!n.expiryDate || new Date(n.expiryDate)>=new Date()) setPortNotice(n); }
    } catch {}
  };
  const loadSeaTime = async () => {
    try { const s=await getDoc(doc(db,'seatime',user.uid));
      if (s.exists()) setSeaTimeDays((s.data().entries||[]).reduce((t,e)=>t+calcDays(e.signOn,e.signOff),0)); } catch {}
  };
  const loadCerts = async () => {
    try { const s=await getDoc(doc(db,'certificates',user.uid));
      if (s.exists()) setExpCerts((s.data().list||[]).filter(c=>{
        if(!c.expiryDate) return false;
        const d=Math.floor((new Date(c.expiryDate)-new Date())/86400000);
        return d>=0&&d<=90;
      })); } catch {}
  };

  const fetchWeather = async (port) => {
    if (!port?.lat || !port?.lon) return;
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${port.lat}&longitude=${port.lon}&current=temperature_2m,wind_speed_10m,weather_code&wind_speed_unit=kn&timezone=auto`);
      const d = await r.json(); const c = d.current;
      setWeather({ temp:Math.round(c.temperature_2m), wind:Math.round(c.wind_speed_10m), code:c.weather_code, port:port.name });
      setWeatherQ(''); setWeatherSugg([]);
    } catch {}
  };

  const doSearch = (sq) => {
    const s = (sq!==undefined?sq:q).trim();
    if (!s||s.length<2) { setQResults([]); return; }
    const ql = s.toLowerCase();
    const allRoutes = [...cachedRoutes, ...routes];
    const allCharts = [...cachedCharts, ...charts];
    const rr = allRoutes.filter(r=>Object.values(r).join(' ').toLowerCase().includes(ql)).slice(0,4).map(r=>({type:'route',label:r['File Name']||r.fileName||'Route',sub:r['Port Name']||r.portName||''}));
    const cr = allCharts.filter(c=>Object.values(c).join(' ').toLowerCase().includes(ql)).slice(0,4).map(c=>({type:'chart',label:c['File Name']||c.fileName||'Chart',sub:c['Port Name']||c.portName||''}));
    const pr = portsDb.filter(p=>(p.name||'').toLowerCase().includes(ql)).slice(0,4).map(p=>({type:'port',label:p.name,sub:p.country||''}));
    setQResults([...rr,...cr,...pr]);
  };

  const wc = weather ? weatherIcon(weather.code) : null;

  const FEATURES = [
    { icon:'🚢', label:'ROUTES',          desc:'Browse, search & download routes in multiple formats.',  tab:'routes',  color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#1565C0)' },
    { icon:'📡', label:'ECDIS CHARTS',    desc:'Access charts for all major ECDIS brands.',             tab:'charts',  color:'#F0A500', bg:'linear-gradient(135deg,#F0A500,#D4900A)' },
    { icon:'📐', label:'ROUTE PLANNER',   desc:'Plan optimised routes with advanced tools.',            tab:'planner', color:'#00C896', bg:'linear-gradient(135deg,#00C896,#00a87a)' },
    { icon:'🧭', label:'NAV MODE',        desc:'Navigate with precision using smart nav mode.',         tab:'navmode', color:'#A78BFA', bg:'linear-gradient(135deg,#7C3AED,#A78BFA)', badge:'NEW' },
    { icon:'⚓', label:'PORTS DATABASE',  desc:'Explore 27,000+ global ports with coordinates.',       tab:'ports',   color:'#00B4D8', bg:'linear-gradient(135deg,#00B4D8,#0070cc)' },
    { icon:'📚', label:'MARITIME LIBRARY',desc:'SOLAS, MARPOL, IMO, STCW & more reference books.',    tab:'library', color:'#F0A500', bg:'linear-gradient(135deg,#F0A500,#b07000)' },
  ];

  const KNOWLEDGE = [
    { icon:'⚓', label:'SOLAS',        sub:'Safety of Life at Sea',        tab:'library' },
    { icon:'🌊', label:'MARPOL',       sub:'Pollution Prevention',         tab:'library' },
    { icon:'🎓', label:'STCW',         sub:'Standards of Training',        tab:'library' },
    { icon:'🏛', label:'IMO CIRCULARS',sub:'Latest IMO Circulars',         tab:'library' },
    { icon:'🖥', label:'ECDIS MANUALS',sub:'User Manuals & Guides',        tab:'library' },
  ];

  return (
    <div style={{ background:'var(--bg)', minHeight:'calc(100vh - 56px)' }}>

      {/* ── Hero Section ── */}
      <div style={{ position:'relative', background:'linear-gradient(135deg,#020810 0%,#040C1A 40%,#071428 70%,#0a1e3a 100%)',
        overflow:'hidden', padding:'2rem 1.5rem 2.5rem', borderBottom:'1px solid var(--border)' }}>

        {/* Animated grid overlay */}
        <div style={{ position:'absolute', inset:0, opacity:0.15,
          backgroundImage:'linear-gradient(rgba(0,180,216,0.3) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.3) 1px,transparent 1px)',
          backgroundSize:'40px 40px', pointerEvents:'none' }} />

        {/* Live Data badge */}
        <div style={{ position:'absolute', top:16, right:16, display:'flex', alignItems:'center', gap:6,
          fontSize:'0.7rem', color:'var(--green)' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)', animation:'pulse 2s infinite', display:'inline-block' }} />
          Live Data
        </div>

        {/* Port notice */}
        {portNotice && (
          <div onClick={() => setTab('notices')} style={{ background:'rgba(255,107,53,0.1)', border:'1px solid rgba(255,107,53,0.3)',
            borderRadius:8, padding:'8px 12px', marginBottom:'1rem', cursor:'pointer',
            display:'flex', alignItems:'center', gap:8, fontSize:'0.74rem' }}>
            <span>⚠️</span>
            <span style={{ color:'var(--text2)', flex:1 }}>
              <strong style={{ color:'#ff6b35' }}>Port Notice:</strong> {portNotice.title}
            </span>
            <span style={{ color:'#ff6b35', fontSize:'0.68rem' }}>View all →</span>
          </div>
        )}

        <div style={{ display:'flex', alignItems:'flex-start', gap:'1.5rem', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:240 }}>
            {/* Tagline */}
            <div style={{ fontSize:'0.6rem', color:'var(--text3)', letterSpacing:'0.18em', marginBottom:'0.5rem',
              textTransform:'uppercase', display:'flex', gap:6, flexWrap:'wrap' }}>
              {'SMART NAVIGATION · ROUTES · CHARTS · PORTS · MARITIME LIBRARY'.split('·').map((t,i) => (
                <span key={i}>{t.trim()}{i<4?' ·':''}</span>
              ))}
            </div>

            {/* Main heading */}
            <h1 style={{ fontFamily:'Orbitron,monospace', fontSize:'clamp(1.4rem,4vw,2.2rem)', fontWeight:900,
              letterSpacing:'0.04em', margin:'0 0 0.6rem', lineHeight:1.15 }}>
              NAVISPHERE<span style={{ color:'var(--cyan)' }}>X</span> MARINE
            </h1>

            {/* Welcome message */}
            <p style={{ fontSize:'0.86rem', color:'var(--text2)', lineHeight:1.6, marginBottom:'1.2rem', maxWidth:480 }}>
              Your all-in-one maritime platform for planning, navigation and knowledge.
              {user && <span style={{ color:'var(--cyan)' }}> Welcome{userProfile?.rank ? `, ${userProfile.rank} ` : ', '}{userProfile?.name?.split(' ')[0] || user.email.split('@')[0]}!</span>}
            </p>

            {/* CTA buttons */}
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:'1.2rem' }}>
              <button onClick={() => setTab('routes')} style={{ display:'flex', alignItems:'center', gap:8,
                padding:'11px 18px', background:'rgba(0,180,216,0.12)', border:'1px solid rgba(0,180,216,0.4)',
                borderRadius:10, cursor:'pointer', color:'var(--text)', fontFamily:'Exo 2,sans-serif',
                fontSize:'0.82rem', fontWeight:600, transition:'all 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.22)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(0,180,216,0.12)'}>
                <span style={{ fontSize:'1.1rem' }}>🔍</span>
                <div style={{ textAlign:'left' }}>
                  <div>Search Routes / Ports</div>
                  <div style={{ fontSize:'0.66rem', color:'var(--text3)' }}>Search anything…</div>
                </div>
                <span style={{ color:'var(--cyan)', marginLeft:4 }}>→</span>
              </button>
              <button onClick={() => setTab('planner')} style={{ display:'flex', alignItems:'center', gap:8,
                padding:'11px 18px', background:'rgba(0,200,150,0.12)', border:'1px solid rgba(0,200,150,0.4)',
                borderRadius:10, cursor:'pointer', color:'var(--text)', fontFamily:'Exo 2,sans-serif',
                fontSize:'0.82rem', fontWeight:600, transition:'all 0.2s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,200,150,0.22)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(0,200,150,0.12)'}>
                <span style={{ fontSize:'1.1rem' }}>📐</span>
                <div style={{ textAlign:'left' }}>
                  <div>Open Route Planner</div>
                  <div style={{ fontSize:'0.66rem', color:'var(--text3)' }}>Plan your voyage</div>
                </div>
                <span style={{ color:'var(--green)', marginLeft:4 }}>→</span>
              </button>
            </div>

            {/* Unified search */}
            <div ref={wRef} style={{ position:'relative', maxWidth:500 }}>
              <div style={{ display:'flex', gap:8 }}>
                <div className="siw" style={{ flex:1 }}>
                  <span className="si-ic">🔍</span>
                  <input className="si" style={{ paddingLeft:40, fontSize:'0.86rem' }}
                    placeholder="Search routes, charts, ports… type anything"
                    value={q}
                    onChange={e => { setQ(e.target.value); doSearch(e.target.value); }} />
                </div>
                <button className="btn btn-primary" style={{ padding:'0 16px', fontSize:'0.8rem', flexShrink:0 }}
                  onClick={() => { if (q.trim()) onSearch(q); }}>Search</button>
              </div>
              {qResults.length > 0 && (
                <div style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:300,
                  background:'var(--card)', border:'1px solid var(--border)', borderRadius:12,
                  boxShadow:'0 12px 40px rgba(0,0,0,0.6)', overflow:'hidden' }}>
                  {['route','chart','port'].map(type => {
                    const items = qResults.filter(r=>r.type===type);
                    if (!items.length) return null;
                    const cols = {route:'var(--cyan)',chart:'var(--gold)',port:'var(--green)'};
                    const lbls = {route:'Routes',chart:'Charts',port:'Ports'};
                    return (<div key={type}>
                      <div style={{ padding:'5px 12px', fontSize:'0.58rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)' }}>{lbls[type]}</div>
                      {items.map((r,i) => (
                        <div key={i} onMouseDown={()=>{ setQ(''); setQResults([]); onSearch(r.label); }}
                          style={{ padding:'8px 12px', cursor:'pointer', display:'flex', gap:8, alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.07)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <span style={{ width:7, height:7, borderRadius:'50%', background:cols[type], flexShrink:0 }} />
                          <div><div style={{ fontSize:'0.8rem' }}>{r.label}</div>{r.sub&&<div style={{ fontSize:'0.66rem', color:'var(--text3)' }}>{r.sub}</div>}</div>
                        </div>
                      ))}
                    </div>);
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Ship visual */}
          <div style={{ flexShrink:0, width:160, display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', paddingTop:'0.5rem' }}>
            <div style={{ position:'relative', width:140, height:140, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ position:'absolute', inset:0, borderRadius:'50%',
                background:'radial-gradient(circle,rgba(0,180,216,0.15) 0%,transparent 70%)',
                animation:'pulse 3s ease-in-out infinite' }} />
              <div style={{ fontSize:'4.5rem', filter:'drop-shadow(0 0 20px rgba(0,180,216,0.6))',
                animation:'float 4s ease-in-out infinite' }}>🚢</div>
            </div>
            <div style={{ fontSize:'0.6rem', color:'var(--cyan)', letterSpacing:'0.1em', marginTop:4 }}>LIVE TRACKING</div>
          </div>
        </div>
      </div>

      <div style={{ padding:'1.4rem 1.2rem', maxWidth:1100, margin:'0 auto' }}>

        {/* ── Personal widgets (logged-in users) ── */}
        {user && (seaTimeDays !== null || expCerts.length > 0 || isOffline) && (
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:'1.4rem' }}>
            {seaTimeDays !== null && (
              <div onClick={()=>setTab('seatime')} style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.25)', borderRadius:12, padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, flex:'1', minWidth:140 }}>
                <div style={{ fontSize:'1.6rem' }}>⏱</div>
                <div><div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)' }}>{fmt(seaTimeDays)}</div>
                <div style={{ fontSize:'0.6rem', color:'var(--text3)', textTransform:'uppercase' }}>Sea Time</div></div>
              </div>
            )}
            {expCerts.length > 0 && (
              <div onClick={()=>setTab('certs')} style={{ background:'rgba(255,71,87,0.06)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:12, padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, flex:'1', minWidth:140 }}>
                <div style={{ fontSize:'1.6rem' }}>📜</div>
                <div><div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700, color:'#ff4757' }}>{expCerts.length} Expiring</div>
                <div style={{ fontSize:'0.6rem', color:'#ff4757', textTransform:'uppercase' }}>Certificates</div></div>
              </div>
            )}
            {isOffline && (
              <div style={{ background:'rgba(0,200,100,0.06)', border:'1px solid rgba(0,200,100,0.25)', borderRadius:12, padding:'10px 14px', display:'flex', alignItems:'center', gap:10, minWidth:120 }}>
                <div style={{ fontSize:'1.6rem' }}>✅</div>
                <div><div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', fontWeight:700, color:'var(--green)' }}>Available</div>
                <div style={{ fontSize:'0.6rem', color:'var(--green)', textTransform:'uppercase' }}>Offline</div></div>
              </div>
            )}
          </div>
        )}

        {/* ── Explore section ── */}
        <div style={{ marginBottom:'0.6rem', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:4, height:22, background:'linear-gradient(180deg,var(--cyan),var(--blue))', borderRadius:2 }} />
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700, letterSpacing:'0.06em' }}>Explore NavisphereX Marine</div>
        </div>

        {/* Feature cards — 3 per row desktop, 2 mobile */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'0.8rem', marginBottom:'1.4rem' }}>
          {FEATURES.map((f,i) => (
            <div key={i} onClick={()=>setTab(f.tab)}
              style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
                padding:'1.2rem', cursor:'pointer', transition:'all 0.25s', position:'relative',
                overflow:'hidden', display:'flex', flexDirection:'column', gap:10 }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color+'55';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.5),0 0 20px ${f.color}18`;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none';}}>
              {/* Background glow */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:f.bg, opacity:0.6 }} />
              {f.badge && (
                <span style={{ position:'absolute', top:10, right:10, padding:'2px 7px', borderRadius:6, fontSize:'0.56rem',
                  fontWeight:700, background:'rgba(0,200,100,0.15)', color:'var(--green)', border:'1px solid rgba(0,200,100,0.3)' }}>{f.badge}</span>
              )}
              {/* Icon container */}
              <div style={{ width:52, height:52, borderRadius:14, background:f.bg, display:'flex',
                alignItems:'center', justifyContent:'center', fontSize:'1.7rem',
                boxShadow:`0 6px 20px ${f.color}40` }}>
                {f.icon}
              </div>
              <div>
                <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', fontWeight:700,
                  color:f.color, letterSpacing:'0.06em', marginBottom:4 }}>{f.label}</div>
                <div style={{ fontSize:'0.74rem', color:'var(--text2)', lineHeight:1.5 }}>{f.desc}</div>
              </div>
              <div style={{ marginTop:'auto', fontSize:'0.7rem', color:f.color, display:'flex', alignItems:'center', gap:4 }}>
                Explore <span>→</span>
              </div>
            </div>
          ))}
        </div>

        {/* My Account wide card */}
        {user && (
          <div onClick={()=>setTab('account')} style={{ background:'linear-gradient(135deg,var(--card) 0%,#0F2444 100%)',
            border:'1px solid rgba(0,180,216,0.2)', borderRadius:16, padding:'1.2rem',
            cursor:'pointer', display:'flex', alignItems:'center', gap:16, marginBottom:'1.4rem',
            transition:'all 0.2s', position:'relative', overflow:'hidden' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,180,216,0.4)';e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.4)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(0,180,216,0.2)';e.currentTarget.style.boxShadow='none';}}>
            <div style={{ width:50, height:50, borderRadius:'50%', background:'linear-gradient(135deg,var(--cyan),var(--blue))',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.5rem', flexShrink:0 }}>
              👤
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)', marginBottom:2 }}>MY ACCOUNT</div>
              <div style={{ fontSize:'0.74rem', color:'var(--text2)' }}>
                {userProfile?.name ? `${userProfile?.rank?userProfile.rank+' ':''}${userProfile.name}` : 'Login, save routes, manage your data.'}
              </div>
            </div>
            <div style={{ fontSize:'1.2rem', color:'var(--cyan)', flexShrink:0 }}>→</div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ marginBottom:'0.6rem', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:4, height:22, background:'linear-gradient(180deg,var(--gold),var(--gold2))', borderRadius:2 }} />
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700, letterSpacing:'0.06em' }}>Quick Actions</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginBottom:'1.4rem' }}>
          {[
            { icon:'⬇️', label:'Download Latest', sub:'Get latest updates',  tab:'routes',  color:'var(--green)' },
            { icon:'📊', label:'New Charts',      sub:'Explore new charts',  tab:'charts',  color:'var(--gold)' },
            { icon:'🚢', label:'Vessel Search',   sub:'IMO / MMSI lookup',   tab:'vessel',  color:'#A78BFA' },
            { icon:'🧮', label:'Voyage Calc',     sub:'Distance & duration', tab:'voyage',  color:'var(--cyan)' },
          ].map((a,i) => (
            <button key={i} onClick={()=>setTab(a.tab)} style={{ padding:'10px', borderRadius:10,
              border:`1px solid ${a.color}33`, background:`${a.color}0a`, cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'flex-start', gap:4,
              fontFamily:'Exo 2,sans-serif', transition:'all 0.2s' }}
              onMouseEnter={e=>e.currentTarget.style.background=`${a.color}18`}
              onMouseLeave={e=>e.currentTarget.style.background=`${a.color}0a`}>
              <div style={{ width:36, height:36, borderRadius:9, background:a.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem' }}>{a.icon}</div>
              <div style={{ fontSize:'0.74rem', fontWeight:600, color:a.color, textAlign:'left' }}>{a.label}</div>
              <div style={{ fontSize:'0.62rem', color:'var(--text3)' }}>{a.sub}</div>
            </button>
          ))}
        </div>

        {/* Maritime Knowledge Hub */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.8rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:4, height:22, background:'linear-gradient(180deg,#A78BFA,#7C3AED)', borderRadius:2 }} />
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700 }}>Maritime Knowledge Hub</div>
          </div>
          <button onClick={()=>setTab('library')} style={{ fontSize:'0.72rem', color:'var(--cyan)', background:'none', border:'none', cursor:'pointer' }}>View all →</button>
        </div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, marginBottom:'1.4rem', scrollbarWidth:'none' }}>
          {KNOWLEDGE.map((k,i) => (
            <div key={i} onClick={()=>setTab(k.tab)} style={{ flexShrink:0, width:130, background:'var(--card)',
              border:'1px solid var(--border)', borderRadius:12, padding:'1rem', cursor:'pointer', transition:'all 0.2s' }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(167,139,250,0.4)';e.currentTarget.style.transform='translateY(-2px)';}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='translateY(0)';}}>
              <div style={{ fontSize:'1.8rem', marginBottom:6 }}>{k.icon}</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.64rem', fontWeight:700, color:'#A78BFA', marginBottom:4 }}>{k.label}</div>
              <div style={{ fontSize:'0.64rem', color:'var(--text3)', lineHeight:1.4 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Tip of the Day + Weather side by side */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem', marginBottom:'1.4rem' }}>

          {/* Tip */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.6rem' }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,var(--gold),var(--gold2))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem' }}>💡</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.65rem', color:'var(--gold)', letterSpacing:'0.08em' }}>TIP OF THE DAY</div>
            </div>
            <div style={{ fontSize:'0.78rem', color:'var(--text2)', lineHeight:1.7, minHeight:'3.5rem' }}>{MARITIME_TIPS[tipIndex]}</div>
            <button className="btn btn-secondary" style={{ marginTop:'0.8rem', padding:'4px 10px', fontSize:'0.66rem' }}
              onClick={()=>setTipIndex(i=>(i+1)%MARITIME_TIPS.length)}>Next tip →</button>
          </div>

          {/* Weather */}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'0.6rem' }}>
              <div style={{ width:28, height:28, borderRadius:7, background:'linear-gradient(135deg,var(--cyan),var(--blue))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.9rem' }}>🌊</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.65rem', color:'var(--cyan)', letterSpacing:'0.08em' }}>PORT WEATHER</div>
            </div>
            <div style={{ position:'relative', marginBottom:'0.6rem' }}>
              <div className="siw">
                <span className="si-ic" style={{ fontSize:'0.8rem' }}>⚓</span>
                <input className="si" style={{ paddingLeft:32, fontSize:'0.78rem', padding:'7px 7px 7px 30px' }}
                  placeholder="Search port for weather…" value={weatherQ}
                  onChange={e=>setWeatherQ(e.target.value)} />
              </div>
              {weatherSugg.length > 0 && (
                <div style={{ position:'absolute', top:'calc(100%+4px)', left:0, right:0, zIndex:200,
                  background:'var(--card)', border:'1px solid var(--border)', borderRadius:8,
                  boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden', maxHeight:150, overflowY:'auto' }}>
                  {weatherSugg.map((p,i)=>(
                    <div key={i} onMouseDown={()=>fetchWeather(p)}
                      style={{ padding:'7px 10px', cursor:'pointer', fontSize:'0.76rem', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.08)'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      {p.name} <span style={{ color:'var(--text3)', fontSize:'0.66rem' }}>{p.country}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {weather ? (
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:'2.2rem' }}>{wc?.icon}</div>
                <div>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.1rem', fontWeight:700, color:'var(--cyan)' }}>{weather.temp}°C</div>
                  <div style={{ fontSize:'0.7rem', color:'var(--text2)' }}>💨 {weather.wind} kts · {wc?.desc}</div>
                  <div style={{ fontSize:'0.64rem', color:'var(--text3)', marginTop:2 }}>⚓ {weather.port}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize:'0.72rem', color:'var(--text3)', textAlign:'center', padding:'0.5rem 0' }}>Search a port to see live weather</div>
            )}
          </div>
        </div>

        {/* Bottom search */}
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1rem', display:'flex', gap:8 }}>
          <div className="siw" style={{ flex:1 }}>
            <span className="si-ic">🔍</span>
            <input className="si" style={{ paddingLeft:42 }}
              placeholder="Search routes, ports, charts, books…"
              value={q} onChange={e=>{ setQ(e.target.value); doSearch(e.target.value); }}
              onKeyDown={e=>e.key==='Enter'&&q.trim()&&onSearch(q)} />
          </div>
          <button className="btn btn-primary" style={{ padding:'0 18px', flexShrink:0 }} onClick={()=>q.trim()&&onSearch(q)}>Search</button>
        </div>

        {/* Footer info */}
        <div style={{ textAlign:'center', marginTop:'1.4rem', paddingTop:'1rem', borderTop:'1px solid var(--border)',
          fontSize:'0.64rem', color:'var(--text3)', lineHeight:1.8 }}>
          <strong style={{ color:'var(--text2)' }}>NavisphereX Marine</strong> · Owner: Manish Bharti · © 2026
          <br />Follow for maritime updates: <span style={{ color:'#e1306c' }}>@Manish_the_navigator</span>
          {isOffline && <span style={{ color:'var(--green)', marginLeft:8 }}>· ✅ Available offline</span>}
        </div>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
    </div>
  );
}
