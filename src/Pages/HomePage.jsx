/* eslint-disable */
// src/pages/HomePage.jsx
// ← CHANGED: removed PORTS_DB import — no longer used as fallback
import { useState, useEffect, useRef } from "react";
import { ECDIS_BRANDS } from "../constants";

function HomePage({ routes, charts, onSearch, setTab, user, portsDb = [], userProfile = null }) {
  const [q, setQ] = useState('');
  const [sugg, setSugg] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const wRef = useRef();

  useEffect(() => {
    const h = e => { if (!wRef.current?.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setSugg([]); return; }
    const ql = q.toLowerCase();
    const hits = new Set();
    [...routes, ...charts].forEach(f => [f.fileName, f.portName, f.keywords, f.brand].filter(Boolean).forEach(s => { if (s.toLowerCase().includes(ql)) hits.add(s); }));
    // ← CHANGED: always use portsDb directly — no fallback to hardcoded 41 ports
    portsDb.forEach(p => { if (p.name?.toLowerCase().includes(ql)) hits.add(p.name); });
    setSugg([...hits].slice(0, 7));
  }, [q, routes, charts, portsDb]);

  const doSearch = (val) => { const v = val || q; if (v.trim()) { onSearch(v); setShowSugg(false); } };

  const FEATURE_CARDS = [
    { icon: '🗺', title: 'ROUTES', desc: 'Browse, search & download routes in multiple formats.', tab: 'routes', color: 'var(--cyan)' },
    { icon: '📊', title: 'ECDIS CHARTS', desc: 'Access charts, formats & user charts.', tab: 'charts', color: 'var(--gold)' },
    { icon: '✏️', title: 'ROUTE PLANNER', desc: 'Plan optimised routes with advanced tools.', tab: 'planner', color: 'var(--green)' },
    { icon: '🧭', title: 'NAV MODE', desc: 'Navigate with precision using smart nav mode.', tab: 'navmode', color: '#A78BFA', badge: 'NEW' },
    { icon: '⚓', title: 'PORTS DATABASE', desc: 'Explore global ports with details & coordinates.', tab: 'ports', color: 'var(--cyan)' },
    { icon: '🛢', title: 'VESSEL SEARCH', desc: 'Search vessels by IMO, MMSI or flag state.', tab: 'vessel', color: 'var(--gold)', badge: 'SOON' },
    { icon: '📚', title: 'MARITIME LIBRARY', desc: 'SOLAS, MARPOL, IMO, STCW & more books.', tab: 'library', color: 'var(--gold)' },
  ];

  const QUICK_ACTIONS = [
    { icon: '👤', title: 'My Account', desc: 'Profile & saved items', tab: 'account', color: 'var(--cyan)' },
    { icon: '⬇️', title: 'Download Latest', desc: 'Get latest updates', tab: 'routes', color: 'var(--green)' },
    { icon: '📊', title: 'New Charts', desc: 'Explore new charts', tab: 'charts', color: 'var(--gold)' },
    { icon: '🛢', title: 'Vessel Search', desc: 'Search by IMO / MMSI', tab: 'vessel', color: '#A78BFA' },
  ];

  const KNOWLEDGE = [
    { title: 'SOLAS', desc: 'Safety of Life at Sea', icon: '🛡', color: 'var(--cyan)' },
    { title: 'MARPOL', desc: 'Pollution Prevention Regulations', icon: '🌊', color: 'var(--green)' },
    { title: 'STCW', desc: 'Standards of Training & Certification', icon: '⚓', color: 'var(--gold)' },
    { title: 'IMO CIRCULARS', desc: 'Latest IMO Circulars', icon: '🏛', color: 'var(--purple)' },
    { title: 'ECDIS MANUALS', desc: 'User Manuals & Guides', icon: '📡', color: 'var(--cyan)' },
  ];

  // ← CHANGED: always use portsDb directly — no fallback to hardcoded 41 ports
  const db = portsDb;

  return (
    <div style={{ flex: 1 }}>
      <div style={{ background: 'linear-gradient(135deg,#040C1A 0%,#071428 40%,#0B1D35 100%)', borderBottom: '1px solid var(--border)', padding: '2rem 1.4rem 1.6rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '45%', background: 'linear-gradient(to left,rgba(0,180,216,0.04),transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '6rem', opacity: 0.08, userSelect: 'none', pointerEvents: 'none' }}>🚢</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.6rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--green)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', animation: 'pulse 2s infinite', display: 'inline-block' }} />Live Data
          </span>
        </div>
        <div style={{ marginBottom: '0.4rem' }}>
          <h1 style={{ fontFamily: 'Orbitron,monospace', fontSize: 'clamp(1.4rem,5vw,2.4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
            NAVISPHERE<span style={{ color: 'var(--cyan)' }}>X</span> MARINE
          </h1>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--text3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
            {['Smart Navigation', 'Routes', 'Charts', 'Ports', 'Maritime Library'].map((t, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{i > 0 && <span style={{ color: 'var(--border2)' }}>•</span>}{t}</span>
            ))}
          </div>
          <p style={{ color: 'var(--text2)', fontSize: '0.86rem', maxWidth: 420, lineHeight: 1.6, marginBottom: '1.4rem' }}>
            Your all-in-one maritime platform for planning, navigation and knowledge.
            {user && (
              <span style={{ color: 'var(--cyan)' }}>
                {' '}Welcome, {userProfile?.rank ? `${userProfile.rank} ` : ''}{userProfile?.name || user.email.split('@')[0]}!
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
          <button onClick={() => setShowSugg(true)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, color: 'var(--text)', fontFamily: 'Exo 2,sans-serif', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600 }}>
            <span style={{ fontSize: '1.1rem' }}>🔍</span>
            <div style={{ textAlign: 'left' }}><div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Search Routes / Ports</div><div style={{ fontSize: '0.66rem', color: 'var(--text3)' }}>Search anything...</div></div>
            <span style={{ color: 'var(--cyan)', marginLeft: 'auto' }}>→</span>
          </button>
          <button onClick={() => setTab('planner')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'linear-gradient(135deg,rgba(0,180,216,0.15),rgba(21,101,192,0.2))', border: '1px solid rgba(0,180,216,0.35)', borderRadius: 12, color: 'var(--cyan)', fontFamily: 'Exo 2,sans-serif', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600 }}>
            <span style={{ fontSize: '1.1rem' }}>🧭</span>
            <div style={{ textAlign: 'left' }}><div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Open Route Planner</div><div style={{ fontSize: '0.66rem', color: 'rgba(0,180,216,0.7)' }}>Plan your voyage</div></div>
            <span style={{ marginLeft: 'auto' }}>→</span>
          </button>
        </div>
        <div ref={wRef} style={{ position: 'relative', maxWidth: 600 }}>
          <div className="siw">
            <span className="si-ic">🔍</span>
            <input className="si" style={{ paddingLeft: 42 }}
              placeholder="Search port, route or file name… e.g. Mumbai, MUM, Singapore"
              value={q} onChange={e => { setQ(e.target.value); setShowSugg(true); }}
              onFocus={() => setShowSugg(true)}
              onKeyDown={e => e.key === 'Enter' && doSearch()} />
            <button onClick={() => doSearch()} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '6px 14px', background: 'linear-gradient(135deg,var(--cyan),var(--blue))', border: 'none', borderRadius: 7, color: 'white', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Search</button>
          </div>
          {showSugg && sugg.length > 0 && (
            <div className="ac">
              {sugg.map((s, i) => <div key={i} className="ac-item" onClick={() => { setQ(s); doSearch(s); }}><span>🔎</span><span>{s}</span></div>)}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '1.4rem', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        {/* ← CHANGED: removed stats grid (RTZ Routes, Chart Files, ECDIS Brands, World Ports) */}

        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <div style={{ width: 4, height: 18, background: 'var(--cyan)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', fontWeight: 700 }}>Explore NavisphereX Marine</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '0.8rem' }}>
            {FEATURE_CARDS.map((c, i) => (
              <div key={i} onClick={() => setTab(c.tab)}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.2rem', cursor: 'pointer', transition: 'all 0.22s', position: 'relative' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = c.color; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                {c.badge && <span style={{ position: 'absolute', top: 10, right: 10, background: c.color, color: '#000', padding: '1px 6px', borderRadius: 4, fontSize: '0.55rem', fontWeight: 800 }}>{c.badge}</span>}
                <div style={{ fontSize: '2rem', marginBottom: '0.7rem' }}>{c.icon}</div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.68rem', fontWeight: 700, color: c.color, marginBottom: '0.4rem' }}>{c.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '0.8rem' }}>{c.desc}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${c.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color, fontSize: '0.8rem' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div onClick={() => setTab(user ? 'home' : 'login')} style={{ background: 'linear-gradient(135deg,rgba(11,29,53,1),rgba(15,36,68,0.8))', border: '1px solid var(--border)', borderRadius: 14, padding: '1.2rem 1.4rem', cursor: 'pointer', marginBottom: '1.6rem', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>{user ? '👥' : '🔐'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', fontWeight: 700, marginBottom: 2 }}>MY ACCOUNT</div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text2)' }}>{user ? `Logged in as ${user.email}` : 'Login, save routes, manage your data.'}</div>
          </div>
          <span style={{ color: 'var(--cyan)', fontSize: '1.1rem' }}>→</span>
        </div>

        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
            <div style={{ width: 4, height: 18, background: 'var(--gold)', borderRadius: 2 }} />
            <span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', fontWeight: 700 }}>Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '0.7rem' }}>
            {QUICK_ACTIONS.map((a, i) => (
              <div key={i} onClick={() => setTab(a.tab)} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{a.icon}</div>
                <div><div style={{ fontSize: '0.76rem', fontWeight: 700 }}>{a.title}</div><div style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>{a.desc}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 4, height: 18, background: 'var(--purple)', borderRadius: 2 }} />
              <span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', fontWeight: 700 }}>Maritime Knowledge Hub</span>
            </div>
            <span style={{ fontSize: '0.74rem', color: 'var(--cyan)', cursor: 'pointer' }} onClick={() => setTab('library')}>View all →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: '0.7rem' }}>
            {KNOWLEDGE.map((k, i) => (
              <div key={i} onClick={() => setTab('library')} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = k.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ fontSize: '1.6rem', marginBottom: 8 }}>{k.icon}</div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.62rem', fontWeight: 700, color: k.color, marginBottom: 4 }}>{k.title}</div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text2)', lineHeight: 1.4 }}>{k.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
