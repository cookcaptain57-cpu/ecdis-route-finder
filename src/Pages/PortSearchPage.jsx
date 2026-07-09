/* eslint-disable */
// src/pages/PortSearchPage.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { PORTS_DB } from "../constants";
import { fetchPortsFromSheet, fetchTerminalsFromSheet } from "../sheets"; // NEW: IDB port loader + terminal loader

function PortSearchPage({ portsDb = [], sheetLoading, refreshSheets }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [sugg, setSugg] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const wRef = useRef();

  // NEW: load ports from IDB on mount — fetchPortsFromSheet returns IDB data
  // instantly if already cached, or fetches+caches on first load.
  // Priority: idbPorts → portsDb prop → hardcoded PORTS_DB (existing fallback unchanged)
  const [idbPorts, setIdbPorts] = useState([]);
  useEffect(() => {
    fetchPortsFromSheet().then(rows => {
      if (rows && rows.length > 0) setIdbPorts(rows);
    });
  }, []);

  // CHANGED: idbPorts is now preferred source; existing prop/constant fallback preserved
  const db = idbPorts.length > 0 ? idbPorts : portsDb.length > 0 ? portsDb : PORTS_DB;

  // NEW: load port+terminal database on mount — separate dataset from the
  // ports search above (fetchTerminalsFromSheet / TERMINAL_SHEET_ID). Does
  // not touch idbPorts, portsDb, or PORTS_DB, so RoutePlannerPage is unaffected.
  const [terminals, setTerminals] = useState([]);
  useEffect(() => {
    fetchTerminalsFromSheet().then(rows => {
      if (rows && rows.length > 0) setTerminals(rows);
    });
  }, []);

  // NEW: which terminal row (if any) is expanded to show full detail
  const [expandedTerminal, setExpandedTerminal] = useState(null);
  useEffect(() => { setExpandedTerminal(null); }, [selected]);

  // NEW: terminals matching the selected port. Primary match is a case-
  // insensitive substring check on port/city name (handles spelling variants
  // like "Antwerp" vs the terminal sheet's "Antwerpen"). Falls back to
  // country-name match for the few ports where the terminal sheet has no
  // row under that exact name (e.g. Bahrain, Kuwait — real entries are named
  // after the specific terminal/anchorage, not the country's capital).
  const matchedTerminals = useMemo(() => {
    if (!selected || terminals.length === 0) return [];
    const nameKey = (selected.name || '').toLowerCase().trim();
    const cityKey = (selected.city || '').toLowerCase().trim();
    const countryKey = (selected.country || '').toLowerCase().trim();
    if (!nameKey) return [];

    const byName = terminals.filter(t =>
      t.portLower.includes(nameKey) || nameKey.includes(t.portLower) ||
      (cityKey && (t.portLower.includes(cityKey) || cityKey.includes(t.portLower)))
    );
    if (byName.length > 0) return byName;

    if (countryKey) {
      return terminals.filter(t => (t.country || '').toLowerCase().trim() === countryKey);
    }
    return [];
  }, [selected, terminals]);

  useEffect(() => {
    const h = e => { if (!wRef.current?.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!q.trim() || q.length < 2) { setSugg([]); return; }
    const ql = q.toLowerCase().trim();
    setSugg(db.filter(p => {
      const kw = (p.keywords || [p.name, p.city, p.country, p.id].filter(Boolean).join(' ')).toLowerCase();
      return p.name?.toLowerCase().includes(ql) || p.city?.toLowerCase().includes(ql) ||
        p.id?.toLowerCase().includes(ql) || p.country?.toLowerCase().includes(ql) || kw.includes(ql);
    }).slice(0, 10));
  }, [q, db]);

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">⚓ Ports Database</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge">{db.length.toLocaleString()} ports</span>
          {sheetLoading && <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>⏳ Loading…</span>}
        </div>
      </div>
      <div ref={wRef} style={{ position: 'relative', marginBottom: '1.4rem' }}>
        <div className="siw">
          <span className="si-ic">🔍</span>
          <input className="si" style={{ paddingLeft: 42, fontSize: '0.92rem' }} autoFocus
            placeholder="Search by port name, country, LOCODE… e.g. Mumbai, SIN, Rotterdam"
            value={q} onChange={e => { setQ(e.target.value); setSelected(null); setShowSugg(true); }}
            onFocus={() => q.length >= 2 && setShowSugg(true)} />
          {q && <button onClick={() => { setQ(''); setSugg([]); setSelected(null); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>}
        </div>
        {showSugg && sugg.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 300, background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
            {sugg.map((p, i) => (
              <div key={i} onMouseDown={() => { setSelected(p); setQ(p.name); setShowSugg(false); }}
                style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: '1.1rem' }}>📍</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--cyan)' }}>{p.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{p.city && p.city !== p.name ? `${p.city} · ` : ''}{p.country}</div>
                </div>
                <span style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 5, padding: '1px 7px', fontSize: '0.63rem', fontFamily: 'monospace', flexShrink: 0 }}>{p.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected ? (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(0,180,216,0.3)', borderRadius: 16, padding: '1.4rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>{selected.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{selected.city && selected.city !== selected.name ? `${selected.city} · ` : ''}{selected.country}</div>
            </div>
            <span style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}>{selected.id}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>LATITUDE</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>{Number(selected.lat).toFixed(5)}°{selected.lat >= 0 ? 'N' : 'S'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>LONGITUDE</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>{Number(selected.lon).toFixed(5)}°{selected.lon >= 0 ? 'E' : 'W'}</div>
            </div>
          </div>

          {/* NEW: Terminals for this port — separate dataset (fetchTerminalsFromSheet), additive only */}
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border2)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>🏗️ Terminals</div>
              <span className="badge">{matchedTerminals.length}</span>
            </div>
            {terminals.length === 0 ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text3)', padding: '0.6rem 0' }}>⏳ Loading terminal data…</div>
            ) : matchedTerminals.length === 0 ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text3)', padding: '0.6rem 0' }}>No terminal records found for this port.</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {matchedTerminals.map((t, i) => {
                  const tKey = `${t.locode}|${t.terminal}|${i}`;
                  const isOpen = expandedTerminal === tKey;
                  return (
                    <div key={tKey} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedTerminal(isOpen ? null : tKey)}
                        style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text2)', flex: 1, minWidth: 0 }}>{t.terminal}</div>
                        {t.locode && <span style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 5, padding: '1px 7px', fontSize: '0.6rem', fontFamily: 'monospace', flexShrink: 0 }}>{t.locode}</span>}
                      </div>
                      {isOpen && (
                        <div style={{ padding: '0 12px 12px', fontSize: '0.74rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                          {t.description && <div style={{ marginBottom: 6 }}>{t.description}</div>}
                          <div style={{ color: 'var(--text3)' }}>
                            {t.port}{t.country ? `, ${t.country}` : ''}
                            {t.lat != null && t.lon != null ? ` · ${t.lat.toFixed(4)}°${t.lat >= 0 ? 'N' : 'S'}, ${t.lon.toFixed(4)}°${t.lon >= 0 ? 'E' : 'W'}` : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚓</div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', marginBottom: 6 }}>Search Any Port</div>
          <div style={{ fontSize: '0.76rem', lineHeight: 1.6 }}>Type a port name, country or LOCODE above<br /><strong style={{ color: 'var(--cyan)' }}>{db.length.toLocaleString()} world ports</strong> in the database</div>
        </div>
      )}
    </div>
  );
}

export default PortSearchPage;
