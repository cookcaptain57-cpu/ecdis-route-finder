/* eslint-disable */
// src/pages/VesselSearchPage.jsx
import { useState, useEffect, useRef } from "react";
import { idbGet, idbSet, csvToRows } from "../sheets";
import { db } from "../firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

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

// ── NEW: Firestore vessel cache helpers ────────────────────────────────
// Doc ID = imo_<IMO> when an IMO exists, else name_<normalised name>.
// Lets repeat searches (by anyone, on any device) hit Firestore for free
// instead of re-spending VesselAPI's monthly quota.
const vesselDocId = (v) => {
  const imo = v.imo || v.IMO;
  if (imo) return `imo_${imo}`;
  const n = (v.name || v.name_ais || '').toLowerCase().trim().replace(/\s+/g, '_');
  return `name_${n || 'unknown'}`;
};

const getCachedVessel = async (name) => {
  try {
    const ql = name.toLowerCase().trim();
    const qRef = query(collection(db, 'vessels'), where('name_lower', '==', ql));
    const snap = await getDocs(qRef);
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch (e) {
    console.warn('Firestore vessel cache read failed:', e.message);
  }
  return null;
};

const saveCachedVessel = async (vessel) => {
  const id = vesselDocId(vessel);
  const withLower = { ...vessel, name_lower: (vessel.name || vessel.name_ais || '').toLowerCase().trim() };
  try {
    await setDoc(doc(db, 'vessels', id), withLower, { merge: true });
  } catch (e) {
    console.warn('Firestore vessel cache write failed:', e.message);
  }
};

// ── NEW: known field order for API/manual-sourced vessels (real schema,
// confirmed against a live VesselAPI response — not a guess) ───────────
const API_PRIORITY_FIELDS = ['imo','mmsi','call_sign','vessel_type','country','year_built',
  'length','breadth','gross_tonnage','deadweight_tonnage','operating_status','class_society'];
const API_EXCLUDE_FIELDS  = ['source','verified','addedAt','name_lower','id','name','name_ais'];

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

  // ── NEW: live VesselAPI fallback state ─────────────────────────────────
  const [apiLoading,       setApiLoading]       = useState(false);
  const [apiCandidates,    setApiCandidates]    = useState([]);
  const [notFoundAnywhere, setNotFoundAnywhere] = useState(false);
  const [manualForm,       setManualForm]       = useState({ name: '' });
  const [manualSaving,     setManualSaving]     = useState(false);
  const missCacheRef = useRef(new Set()); // session-only "already tried, nothing" cache

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

  // ── NEW: fall back to live VesselAPI when local search comes up empty ──
  useEffect(() => {
    // CHANGED: no longer auto-fires on typing pause — that was burning API
    // quota on partial/in-progress text (e.g. pausing after "MSC" before
    // finishing "GULSUN"). Now this just clears stale results when the
    // query changes, so the search button reappears for the new text.
    setApiCandidates([]);
    setNotFoundAnywhere(false);
  }, [q]);

  const runLiveLookup = async (name) => {
    setApiLoading(true);
    setNotFoundAnywhere(false);
    try {
      // Check Firestore cache first — saves VesselAPI quota on repeat searches
      const cached = await getCachedVessel(name);
      if (cached) {
        setApiCandidates([cached]);
        setApiLoading(false);
        return;
      }
      const res  = await fetch(`/api/vessel-lookup?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (data.found && data.candidates?.length > 0) {
        setApiCandidates(data.candidates);
      } else {
        missCacheRef.current.add(name.toLowerCase());
        setNotFoundAnywhere(true);
        setApiCandidates([]);
      }
    } catch (e) {
      console.warn('Live vessel lookup failed:', e.message);
      missCacheRef.current.add(name.toLowerCase());
      setNotFoundAnywhere(true);
    }
    setApiLoading(false);
  };

  // ── NEW: user picks one of several API candidates ──────────────────────
  const selectApiCandidate = async (candidate) => {
    const vesselDoc = { ...candidate, source: 'vesselapi', verified: true, addedAt: Date.now() };
    await saveCachedVessel(vesselDoc);
    setSelected(vesselDoc);
    setQ(candidate.name || candidate.name_ais || q);
    setApiCandidates([]);
    setNotFoundAnywhere(false);
    setShowSugg(false);
  };

  // ── NEW: manual entry when nothing found anywhere ───────────────────────
  const submitManualVessel = async () => {
    if (!manualForm.name?.trim()) return;
    setManualSaving(true);
    const vesselDoc = { ...manualForm, source: 'user', verified: false, addedAt: Date.now() };
    await saveCachedVessel(vesselDoc);
    setSelected(vesselDoc);
    setNotFoundAnywhere(false);
    setManualForm({ name: '' });
    setManualSaving(false);
  };

  const selectShip = (ship) => {
    setSelected(ship);
    setQ(getRowName(ship, nameCol));
    setSugg([]);
    setShowSugg(false);
    // NEW: also clear any leftover live-search state from a previous query
    setApiCandidates([]);
    setNotFoundAnywhere(false);
  };

  const clearSearch = () => {
    setQ(''); setSelected(null); setSugg([]);
    // NEW: also clear live-search state
    setApiCandidates([]); setNotFoundAnywhere(false);
  };

  // ── Decide which columns are "important" to show prominently ──────────
  const importantKeys = headers.filter(h =>
    /imo|mmsi|flag|type|built|tonnage|gt|dwt|length|breadth|draft|class|owner|manager|port|status/i.test(h)
  );
  const otherKeys = headers.filter(h => !importantKeys.includes(h) && h !== nameCol);

  // ── NEW: same idea, but for API/manual-sourced vessels (known schema) ──
  const selectedIsApiShaped = selected && (selected.source === 'vesselapi' || selected.source === 'user');
  const apiKeys = selectedIsApiShaped
    ? Object.keys(selected).filter(k => !API_EXCLUDE_FIELDS.includes(k) && !k.endsWith('_unit'))
    : [];
  const apiImportantKeys = API_PRIORITY_FIELDS.filter(k => apiKeys.includes(k) && selected?.[k]);
  const apiOtherKeys = apiKeys.filter(k => !API_PRIORITY_FIELDS.includes(k) && selected?.[k]);

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

        {/* ── NEW: live-lookup button + status + API candidates + manual entry ── */}
        {!selected && q.trim().length >= 3 && sugg.length === 0 && (
          <div style={{ marginTop: 10 }}>

            {/* NEW: manual trigger — replaces the old auto-fire-on-pause behaviour */}
            {!apiLoading && !notFoundAnywhere && apiCandidates.length === 0 && (
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                onClick={() => runLiveLookup(q.trim())}>
                🔍 Search Live Database
              </button>
            )}

            {apiLoading && (
              <div className="info-box" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="spin" style={{ width: 14, height: 14 }} />
                Not in local list — checking live database…
              </div>
            )}

            {!apiLoading && apiCandidates.length > 0 && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', fontSize: '0.7rem', color: 'var(--text3)', borderBottom: '1px solid var(--border)' }}>
                  {apiCandidates.length > 1 ? `${apiCandidates.length} matches found — pick the right one:` : 'Found via live database:'}
                </div>
                {apiCandidates.map((c, i) => (
                  <div key={i} onClick={() => selectApiCandidate(c)}
                    style={{ padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--cyan)' }}>
                      {c.name || c.name_ais}
                      {c.operating_status && c.operating_status !== 'Active' ? `  (${c.operating_status})` : ''}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2 }}>
                      {[c.imo && `IMO ${c.imo}`, c.vessel_type, c.country, c.year_built && `Built ${c.year_built}`]
                        .filter(Boolean).join('  ·  ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!apiLoading && notFoundAnywhere && (
              <div style={{ background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, padding: '1rem' }}>
                <div className="info-box" style={{ marginBottom: '0.8rem' }}>
                  Not in our database yet. If you're looking at this ship, add what you know — it helps the next person who searches it.
                </div>
                <div className="ff">
                  <label className="fl">Ship Name *</label>
                  <input className="fi" value={manualForm.name || ''}
                    onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <div className="ff">
                    <label className="fl">IMO</label>
                    <input className="fi" value={manualForm.imo || ''}
                      onChange={e => setManualForm(f => ({ ...f, imo: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">MMSI</label>
                    <input className="fi" value={manualForm.mmsi || ''}
                      onChange={e => setManualForm(f => ({ ...f, mmsi: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Vessel Type</label>
                    <input className="fi" value={manualForm.vessel_type || ''}
                      onChange={e => setManualForm(f => ({ ...f, vessel_type: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Flag</label>
                    <input className="fi" value={manualForm.country || ''}
                      onChange={e => setManualForm(f => ({ ...f, country: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Length (m)</label>
                    <input className="fi" value={manualForm.length || ''}
                      onChange={e => setManualForm(f => ({ ...f, length: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Breadth (m)</label>
                    <input className="fi" value={manualForm.breadth || ''}
                      onChange={e => setManualForm(f => ({ ...f, breadth: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Gross Tonnage</label>
                    <input className="fi" value={manualForm.gross_tonnage || ''}
                      onChange={e => setManualForm(f => ({ ...f, gross_tonnage: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Deadweight</label>
                    <input className="fi" value={manualForm.deadweight_tonnage || ''}
                      onChange={e => setManualForm(f => ({ ...f, deadweight_tonnage: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary" disabled={!manualForm.name?.trim() || manualSaving}
                  onClick={submitManualVessel} style={{ marginTop: '0.6rem' }}>
                  {manualSaving ? 'Saving…' : '✅ Save & Add to Database'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected ship detail card — Sheet-sourced ships (original, untouched) */}
      {selected && !selectedIsApiShaped && (
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

      {/* ── NEW: detail card for VesselAPI / manually-sourced vessels ────── */}
      {selected && selectedIsApiShaped && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(0,180,216,0.3)',
          borderRadius: 16, padding: '1.4rem', marginBottom: '1.4rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '1.2rem', flexWrap: 'wrap' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'linear-gradient(135deg,var(--cyan),var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0 }}>
              🚢
            </div>
            <div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700,
                color: 'var(--cyan)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {selected.name || selected.name_ais}
                {selected.verified
                  ? <span className="badge badge-green" style={{ fontSize: '0.55rem' }}>✓ VERIFIED</span>
                  : <span className="badge badge-gold" style={{ fontSize: '0.55rem' }}>USER-SUBMITTED</span>}
              </div>
            </div>
          </div>

          {apiImportantKeys.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
              gap: '0.6rem', marginBottom: '1rem' }}>
              {apiImportantKeys.map(k => (
                <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: '0.58rem', color: 'var(--text3)', textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: 4 }}>{k.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>
                    {String(selected[k])}
                  </div>
                </div>
              ))}
            </div>
          )}

          {apiOtherKeys.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.8rem', marginTop: '0.4rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: '0.8rem' }}>Additional Details</div>
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                {apiOtherKeys.map(k => (
                  <div key={k} style={{ display: 'flex', gap: 10, padding: '6px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text3)', minWidth: 120,
                      textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                      {String(selected[k])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state — CHANGED: only shows when search box is empty now,
          so it doesn't overlap the new live-search / not-found messages */}
      {!selected && !loading && ships.length > 0 && q.trim().length === 0 && (
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
