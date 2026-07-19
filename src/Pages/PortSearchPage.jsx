/* eslint-disable */
// src/pages/PortSearchPage.jsx
//
// CHANGED: this page now searches the Port & Terminal Database sheet directly
// instead of the old ports sheet (fetchPortsFromSheet/PORTS_SHEET_ID). That old
// sheet is untouched in sheets.js and stays wired for RoutePlannerPage — it's
// just no longer used here, so there's no cross-matching between two sheets
// with different naming conventions (Antwerp vs Antwerpen etc.) — search,
// suggestions, and the terminal list all come from one dataset now.
import { useState, useEffect, useRef, useMemo } from "react";
import { fetchTerminalsFromSheet } from "../sheets";

function PortSearchPage({ portsDb = [], sheetLoading, refreshSheets }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [sugg, setSugg] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const wRef = useRef();

  const [terminals, setTerminals] = useState([]);
  const [terminalsLoading, setTerminalsLoading] = useState(true);
  useEffect(() => {
    fetchTerminalsFromSheet()
      .then(rows => { if (rows && rows.length > 0) setTerminals(rows); })
      .finally(() => setTerminalsLoading(false));
  }, []);

  // One row per unique port name, derived from the terminal dataset — the
  // port-level LOCODE is taken from the prefix before the dash on any of its
  // terminal LOCODEs (e.g. "KRPUS-0192" -> "KRPUS"), and lat/lon is filled
  // from whichever terminal row under that port happens to have it, since
  // coverage is roughly half the rows.
  const ports = useMemo(() => {
    const map = new Map();
    for (const t of terminals) {
      const existing = map.get(t.portLower);
      if (!existing) {
        map.set(t.portLower, {
          name: t.port,
          portLower: t.portLower,
          country: t.country,
          lat: t.lat,
          lon: t.lon,
          id: (t.locode || '').split('-')[0] || '',
          terminalCount: 1,
        });
      } else {
        existing.terminalCount++;
        if (existing.lat == null && t.lat != null) { existing.lat = t.lat; existing.lon = t.lon; }
      }
    }
    return Array.from(map.values());
  }, [terminals]);

  const [expandedTerminal, setExpandedTerminal] = useState(null);
  useEffect(() => { setExpandedTerminal(null); }, [selected]);

  // Terminals for the selected port — direct match on the same dataset now,
  // no substring/country-fallback matching needed since there's only one source.
  const matchedTerminals = useMemo(() => {
    if (!selected) return [];
    return terminals.filter(t => t.portLower === selected.portLower);
  }, [selected, terminals]);

  useEffect(() => {
    const h = e => { if (!wRef.current?.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (!q.trim() || q.length < 2) { setSugg([]); return; }
    const ql = q.toLowerCase().trim();
    setSugg(ports.filter(p =>
      p.name?.toLowerCase().includes(ql) || p.country?.toLowerCase().includes(ql) || p.id?.toLowerCase().includes(ql)
    ).slice(0, 10));
  }, [q, ports]);

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">⚓ Ports Database</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge">{ports.length.toLocaleString()} ports</span>
          {terminalsLoading && <span style={{ fontSize: '0.68rem', color: 'var(--text3)' }}>⏳ Loading…</span>}
        </div>
      </div>
      <div style={{ fontSize: '0.76rem', color: 'var(--text3)', marginBottom: '1rem' }}>Port database with terminal details for every port</div>
      <div ref={wRef} style={{ position: 'relative', marginBottom: '1.4rem' }}>
        <div className="siw">
          <span className="si-ic">🔍</span>
          <input className="si" style={{ paddingLeft: 42, fontSize: '0.92rem' }} autoFocus
            placeholder="Search by port name, country, LOCODE… e.g. Mumbai, Busan, Rotterdam"
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
                  <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{p.country}{p.terminalCount ? ` · ${p.terminalCount} terminal${p.terminalCount === 1 ? '' : 's'}` : ''}</div>
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
              <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{selected.country}</div>
            </div>
            {selected.id && <span style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem', fontFamily: 'monospace', fontWeight: 700 }}>{selected.id}</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>LATITUDE</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--green)' }}>{selected.lat != null ? `${Number(selected.lat).toFixed(5)}°${selected.lat >= 0 ? 'N' : 'S'}` : '—'}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>LONGITUDE</div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>{selected.lon != null ? `${Number(selected.lon).toFixed(5)}°${selected.lon >= 0 ? 'E' : 'W'}` : '—'}</div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border2)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>🏗️ Terminals</div>
              <span className="badge">{matchedTerminals.length}</span>
            </div>
            {terminalsLoading ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text3)', padding: '0.6rem 0' }}>⏳ Loading terminal data…</div>
            ) : matchedTerminals.length === 0 ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--text3)', padding: '0.6rem 0' }}>No terminal records found for this port.</div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {matchedTerminals.map((t, i) => {
                  const tKey = `${t.locode}|${i}`;
                  const isOpen = expandedTerminal === tKey;
                  return (
                    <div key={tKey} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, marginBottom: 8, padding: '10px 12px' }}>
                      <div onClick={() => setExpandedTerminal(isOpen ? null : tKey)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{t.terminal}</div>
                        {t.locode && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 5, padding: '1px 7px', fontSize: '0.6rem', fontFamily: 'monospace' }}>{t.locode}</span>
                          </div>
                        )}
                      </div>
                      {isOpen && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.74rem', color: 'var(--text2)', lineHeight: 1.6 }}>
                          {t.description && <div style={{ marginBottom: 6 }}>{t.description}</div>}
                          {t.lat != null && t.lon != null && (
                            <div style={{ color: 'var(--text3)' }}>{t.lat.toFixed(4)}°{t.lat >= 0 ? 'N' : 'S'}, {t.lon.toFixed(4)}°{t.lon >= 0 ? 'E' : 'W'}</div>
                          )}
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
          <div style={{ fontSize: '0.76rem', lineHeight: 1.6 }}>Type a port name, country or LOCODE above<br /><strong style={{ color: 'var(--cyan)' }}>{ports.length.toLocaleString()} world ports</strong> in the database</div>
        </div>
      )}
    </div>
  );
}

export default PortSearchPage;
