/* eslint-disable */
// src/pages/VesselSearchPage.jsx
import { useState, useEffect, useRef } from "react";
import { idbGet, idbSet, csvToRows } from "../sheets";

const SHIPS_SHEET_ID = '1Af0vwMQTguWd8BTm7Gc1PS-UJHFeFhr7';
const IDB_KEY        = 'vessel_ships_v1';
const FETCH_URL      = `https://docs.google.com/spreadsheets/d/${SHIPS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=SHIPS`;

// Detect the best "name" column from headers
const detectNameCol = (headers) =>
  headers.find(h => /ship.?name|vessel.?name|^name$/i.test(h)) ||
  headers.find(h => /ship|vessel|name/i.test(h)) ||
  headers[0] || '';

// Get a readable row display value
const getRowName = (row, nameCol) => row[nameCol] || Object.values(row).find(v => v) || '—';

// Build a searchable keyword string from all columns
const keywords = (row) =>
  Object.values(row).filter(Boolean).join(' ').toLowerCase();

function VesselSearchPage() {
  const [ships,      setShips]      = useState([]);
  const [headers,    setHeaders]    = useState([]);
  const [nameCol,    setNameCol]    = useState('');
  const [loading,    setLoading]    = useState(true);
  const [q,          setQ]          = useState('');
  const [sugg,       setSugg]       = useState([]);
  const [showSugg,   setShowSugg]   = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [lastUpdated,setLastUpdated]= useState(null);
  const wRef = useRef();

  // ── Close suggestions on outside click ───────────────────────────────
  useEffect(() => {
    const h = e => { if (!wRef.current?.contains(e.target)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Load on mount: IDB first, then refresh from sheet ─────────────────
  useEffect(() => { loadShips(); }, []);

  const loadShips = async () => {
    // Show IDB cache instantly if available
    try {
      const cached = await idbGet(IDB_KEY);
      if (cached?.rows?.length > 0) {
        applyData(cached.rows);
        setLastUpdated(cached.ts);
        setLoading(false);
        fetchFresh(true); // silent background refresh
        return;
      }
    } catch {}
    await fetchFresh(false);
  };

  const fetchFresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(FETCH_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv  = await res.text();
      const rows = csvToRows(csv);
      if (rows.length > 0) {
        applyData(rows);
        const ts = Date.now();
        setLastUpdated(ts);
        await idbSet(IDB_KEY, { rows, ts });
      }
    } catch (e) {
      console.warn('Vessel sheet fetch failed:', e.message);
    }
    if (!silent) setLoading(false);
  };

  const applyData = (rows) => {
    setShips(rows);
    const hdrs = rows.length > 0 ? Object.keys(rows[0]) : [];
    setHeaders(hdrs);
    setNameCol(detectNameCol(hdrs));
  };

  // ── Live search / autocomplete ─────────────────────────────────────────
  useEffect(() => {
    if (!q || q.trim().length < 2) { setSugg([]); return; }
    const ql = q.toLowerCase().trim();
    setSugg(
      ships
        .filter(s => keywords(s).includes(ql))
        .slice(0, 10)
    );
  }, [q, ships]);

  const selectShip = (ship) => {
    setSelected(ship);
    setQ(getRowName(ship, nameCol));
    setSugg([]);
    setShowSugg(false);
  };

  const clearSearch = () => {
    setQ(''); setSelected(null); setSugg([]);
  };

  // ── Decide which columns are "important" to show prominently ──────────
  const importantKeys = headers.filter(h =>
    /imo|mmsi|flag|type|built|tonnage|gt|dwt|length|breadth|draft|class|owner|manager|port|status/i.test(h)
  );
  const otherKeys = headers.filter(h => !importantKeys.includes(h) && h !== nameCol);

  // ── Format last updated ────────────────────────────────────────────────
  const updatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : null;

  return (
    <div className="section">

      {/* Header */}
      <div className="sec-hdr">
        <div className="sec-title">🚢 Vessel Search</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {!loading && <span className="badge">{ships.length.toLocaleString()} ships</span>}
          {loading  && <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 6 }}><div className="spin" style={{ width: 12, height: 12 }} /> Loading…</span>}
          <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.7rem' }}
            onClick={() => fetchFresh(false)}>↺ Refresh</button>
        </div>
      </div>

      {updatedStr && (
        <div style={{ fontSize: '0.62rem', color: 'var(--text3)', marginBottom: '0.8rem' }}>
          Last updated: {updatedStr}
        </div>
      )}

      {/* Search box */}
      <div ref={wRef} style={{ position: 'relative', marginBottom: '1.4rem' }}>
        <div className="siw">
          <span className="si-ic">🔍</span>
          <input className="si" style={{ paddingLeft: 42 }}
            placeholder={loading ? 'Loading ship database…' : `Search by ship name, IMO, flag… (${ships.length.toLocaleString()} ships)`}
            value={q}
            disabled={loading}
            onChange={e => { setQ(e.target.value); setSelected(null); setShowSugg(true); }}
            onFocus={() => sugg.length > 0 && setShowSugg(true)}
          />
          {q && (
            <button onClick={clearSearch}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text3)', fontSize: '1.1rem', cursor: 'pointer' }}>
              ✕
            </button>
          )}
        </div>

        {/* Autocomplete suggestions */}
        {showSugg && sugg.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 300,
            background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)', overflow: 'hidden', maxHeight: 320, overflowY: 'auto' }}>
            {sugg.map((ship, i) => {
              const shipName = getRowName(ship, nameCol);
              // Show up to 3 secondary fields under the name
              const secondaryFields = importantKeys
                .filter(k => ship[k])
                .slice(0, 3)
                .map(k => `${k}: ${ship[k]}`)
                .join('  ·  ');
              return (
                <div key={i}
                  onMouseDown={() => selectShip(ship)}
                  style={{ padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>🚢</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--cyan)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {shipName}
                    </div>
                    {secondaryFields && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {secondaryFields}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected ship detail card */}
      {selected && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(0,180,216,0.3)',
          borderRadius: 16, padding: '1.4rem', marginBottom: '1.4rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

          {/* Ship name header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,var(--cyan),var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
              🚢
            </div>
            <div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700,
                color: 'var(--cyan)', marginBottom: 3 }}>
                {getRowName(selected, nameCol)}
              </div>
              {importantKeys.slice(0, 2).map(k => selected[k] && (
                <span key={k} style={{ marginRight: 12, fontSize: '0.74rem', color: 'var(--text2)' }}>
                  {k}: <strong style={{ color: 'var(--text)' }}>{selected[k]}</strong>
                </span>
              ))}
            </div>
          </div>

          {/* Important fields grid */}
          {importantKeys.filter(k => selected[k]).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
              gap: '0.6rem', marginBottom: '1rem' }}>
              {importantKeys.filter(k => selected[k]).map(k => (
                <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {selected[k]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All other columns — dynamically shown */}
          {otherKeys.filter(k => k !== nameCol && selected[k]).length > 0 && (
            <>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.8rem', marginTop: '0.4rem' }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase',
                  letterSpacing: '0.1em', marginBottom: '0.8rem' }}>Additional Details</div>
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  {[...([nameCol !== headers[0] ? [] : []]), ...otherKeys]
                    .filter(k => k !== nameCol && selected[k])
                    .map(k => (
                      <div key={k} style={{ display: 'flex', gap: 10, padding: '6px 0',
                        borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text3)', minWidth: 120,
                          textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{k}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                          {selected[k]}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {!selected && !loading && ships.length > 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚢</div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.82rem', marginBottom: 6, color: 'var(--text2)' }}>
            Search Any Vessel
          </div>
          <div style={{ fontSize: '0.76rem', lineHeight: 1.6 }}>
            Type a ship name, IMO number, flag state or any keyword above<br />
            <strong style={{ color: 'var(--cyan)' }}>{ships.length.toLocaleString()} vessels</strong> in the database
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="loading">
          <div className="spin" />
          <span>Loading vessel database from Google Sheet…</span>
        </div>
      )}
    </div>
  );
}

export default VesselSearchPage;
