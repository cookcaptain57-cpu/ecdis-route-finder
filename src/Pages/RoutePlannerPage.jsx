/* eslint-disable */
// src/Pages/RoutePlannerPage.jsx
// ← CHANGED: removed PORTS_DB import — no longer used as fallback
import { useState, useEffect, useMemo } from "react";
import { buildAutoRoute } from "../routing";
import { recalcWaypoints, totalRouteNM, parseRTZ, exportRTZ, exportCSV, downloadFile } from "../utils";
import MapView from "../components/MapView";
import ETACalculator from "../components/ETACalculator";

function RoutePlannerPage({ notify, sheetRoutes = [], portsDb = [] }) {
  // ← CHANGED: always use portsDb directly — no fallback to hardcoded 41 ports
  const portsList = portsDb;
  const [panel, setPanel] = useState('auto');
  const [fromPort, setFromPort] = useState('');
  const [toPort, setToPort] = useState('');
  const [fromSugg, setFromSugg] = useState([]);
  const [toSugg, setToSugg] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [routeName, setRouteName] = useState('My Route');
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [clickAdd, setClickAdd] = useState(false);
  const [overlays, setOverlays] = useState({ eca: false, seca: false, marpol: false, piracy: false, layover: false, gebco: false, depthClick: false });
  const [mapMode, setMapMode] = useState('night');
  const [dbSuggestions, setDbSuggestions] = useState([]);
  const [showDbSugg, setShowDbSugg] = useState(false);
  const totalNM = useMemo(() => totalRouteNM(waypoints), [waypoints]);

  const searchPort = (q, setSugg) => {
    if (!q || q.trim().length < 2) { setSugg([]); return; }
    const ql = q.toLowerCase().trim();
    setSugg(portsList.filter(p => {
      const kw = (p.keywords || [p.name, p.city, p.country, p.id].filter(Boolean).join(' ')).toLowerCase();
      return p.name?.toLowerCase().includes(ql) || p.city?.toLowerCase().includes(ql) ||
        p.id?.toLowerCase().includes(ql) || p.country?.toLowerCase().includes(ql) || kw.includes(ql);
    }).slice(0, 8));
  };

  useEffect(() => searchPort(fromPort, setFromSugg), [fromPort, portsList]);
  useEffect(() => searchPort(toPort, setToSugg), [toPort, portsList]);

  const searchEcdisRoutes = (dep, arr) => {
    if (!dep && !arr) return [];
    const ql = (dep + ' ' + arr).toLowerCase().trim();
    return sheetRoutes.filter(r => {
      const hay = [r.fileName, r.portName, r.keywords, r.fileUrl,
        r['Route Name'], r['Port Name'], r['File Name'], r['Keywords'],
        Object.values(r).join(' ')].filter(Boolean).join(' ').toLowerCase();
      const depMatch = dep.length > 1 && hay.includes(dep.toLowerCase().substring(0, 4));
      const arrMatch = arr.length > 1 && hay.includes(arr.toLowerCase().substring(0, 4));
      return depMatch || arrMatch || hay.includes(ql.substring(0, 6));
    }).slice(0, 6);
  };

  const generateRoute = () => {
    const f = portsList.find(p => p.name?.toLowerCase() === fromPort.toLowerCase() || p.id?.toLowerCase() === fromPort.toLowerCase());
    const t = portsList.find(p => p.name?.toLowerCase() === toPort.toLowerCase() || p.id?.toLowerCase() === toPort.toLowerCase());
    if (!f || !t) { notify('Select valid departure and arrival ports from suggestions', 'error'); return; }
    const dbMatches = searchEcdisRoutes(f.name, t.name);
    if (dbMatches.length > 0) {
      setDbSuggestions(dbMatches); setShowDbSugg(true);
      notify(`Found ${dbMatches.length} route${dbMatches.length > 1 ? 's' : ''} in ECDIS database — select one or use Auto Route`, 'success');
      return;
    }
    setShowDbSugg(false);
    const wps = buildAutoRoute(f.id, t.id);
    if (wps.length < 2) { notify('Could not generate route for this port pair', 'error'); return; }
    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);
    notify(`Auto route: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(0)} NM`, 'success');
  };

  const fallbackAutoRoute = () => {
    const f = portsList.find(p => p.name?.toLowerCase() === fromPort.toLowerCase() || p.id?.toLowerCase() === fromPort.toLowerCase());
    const t = portsList.find(p => p.name?.toLowerCase() === toPort.toLowerCase() || p.id?.toLowerCase() === toPort.toLowerCase());
    if (!f || !t) return;
    const wps = buildAutoRoute(f.id, t.id);
    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);
    notify(`Auto route: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(0)} NM`, 'success');
  };

  const useDbRoute = (r) => {
    setShowDbSugg(false);
    const url = r.fileUrl || r['File URL'] || r['Download URL'] || r['Drive Link'] ||
      Object.values(r).find(v => typeof v === 'string' && v.includes('drive.google'));
    if (url) {
      notify('Loading route from ECDIS database…', 'success');
      let fetchUrl = url;
      const gdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (gdMatch) fetchUrl = `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;
      fetch(fetchUrl, { mode: 'cors' }).then(res => res.text()).then(text => {
        const result = parseRTZ(text);
        if (result && result.waypoints.length > 0) {
          setWaypoints(result.waypoints);
          const name = r.fileName || r['File Name'] || r['Route Name'] || 'ECDIS Route';
          setRouteName(name);
          notify(`Loaded: ${name} — ${result.waypoints.length} waypoints`, 'success');
        } else { notify('Could not parse RTZ — using auto route as fallback', 'error'); fallbackAutoRoute(); }
      }).catch(() => { notify('Could not fetch RTZ file — using auto route as fallback', 'error'); fallbackAutoRoute(); });
    } else { fallbackAutoRoute(); }
  };

  const handleRTZLoad = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = parseRTZ(ev.target.result);
      if (!result || result.waypoints.length === 0) { notify('Could not parse RTZ file', 'error'); return; }
      setWaypoints(result.waypoints); setRouteName(result.name);
      notify(`Loaded: ${result.name} — ${result.waypoints.length} waypoints`, 'success');
    };
    reader.readAsText(file);
  };

  const handleMapClick = (lat, lon) => {
    if (!clickAdd) return;
    setWaypoints(wps => recalcWaypoints([...wps, { lat: Math.round(lat * 10000) / 10000, lon: Math.round(lon * 10000) / 10000 }]));
  };

  const removeWP = (i) => setWaypoints(wps => recalcWaypoints(wps.filter((_, j) => j !== i)));
  const clearRoute = () => { setWaypoints([]); setPlaying(false); };
  const toggleOverlay = (k) => setOverlays(o => ({ ...o, [k]: !o[k] }));

  const ovCfg = [
    { k: 'eca',        label: 'ECA',           color: '#FF6B35', desc: 'Emission Control Area' },
    { k: 'seca',       label: 'SECA',          color: '#FFB347', desc: 'Sulphur ECA' },
    { k: 'marpol',     label: 'MARPOL',        color: '#9B59B6', desc: 'MARPOL Special Area' },
    { k: 'piracy',     label: 'Piracy',        color: '#E74C3C', desc: 'Piracy Risk Area' },
    { k: 'layover',    label: 'Anchorage',     color: '#3498DB', desc: 'Anchorage / Layover' },
    { k: 'gebco',      label: 'GEBCO Depth',   color: '#00B4D8', desc: 'GEBCO Bathymetry — colour-shaded sea depth (WMS)' },
    { k: 'depthClick', label: 'Depth on Click',color: '#00C896', desc: 'Click any ocean point to show depth in metres (GEBCO 2020)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Route Name + Export Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.7rem 1rem', background: 'var(--card)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <input className="fi" style={{ flex: 1, minWidth: 150, padding: '7px 12px', fontSize: '0.82rem' }} placeholder="Route Name…" value={routeName} onChange={e => setRouteName(e.target.value)} />
        {totalNM > 0 && <span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', color: 'var(--cyan)', whiteSpace: 'nowrap' }}>📏 {totalNM.toFixed(1)} NM</span>}
        <span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.72rem', color: 'var(--text2)' }}>{waypoints.length} WPTs</span>
        <button className="btn btn-gold" style={{ padding: '7px 12px', fontSize: '0.72rem' }} disabled={waypoints.length < 2}
          onClick={() => downloadFile(exportRTZ(routeName, waypoints), `${routeName.replace(/\s+/g, '-')}.rtz`, 'application/xml')}>⬇ RTZ</button>
        <button className="btn btn-green" style={{ padding: '7px 12px', fontSize: '0.72rem' }} disabled={waypoints.length < 2}
          onClick={() => downloadFile(exportCSV(waypoints), `${routeName.replace(/\s+/g, '-')}.csv`, 'text/csv')}>⬇ CSV</button>
        <button className="btn btn-danger" style={{ padding: '7px 12px', fontSize: '0.72rem' }} onClick={clearRoute}>🗑 Clear</button>
        <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['night', '🌙 Night'], ['dusk', '🌅 Dusk'], ['day', '☀️ Day']].map(([m, l]) => (
            <button key={m} onClick={() => setMapMode(m)}
              style={{ padding: '5px 10px', fontSize: '0.68rem', border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontWeight: 600, background: mapMode === m ? (m === 'night' ? '#0B1D35' : m === 'dusk' ? '#7C3A1A' : '#1565C0') : 'transparent', color: mapMode === m ? 'white' : 'var(--text2)', transition: 'all 0.2s' }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="planner-layout">
        {/* SIDEBAR */}
        <div className="planner-sidebar">
          <div className="p-tabs">
            {[['auto', '🗺 Auto'], ['load', '📂 Load RTZ'], ['eta', '⏱ ETA'], ['wpts', '📋 WPTs']].map(([k, l]) => (
              <button key={k} className={`p-tab ${panel === k ? 'active' : ''}`} onClick={() => setPanel(k)}>{l}</button>
            ))}
          </div>
          <div className="p-panel" style={{ overflowY: 'auto' }}>
            {panel === 'auto' && (
              <>
                <div className="p-section">
                  <span className="p-label">🛳 Departure Port</span>
                  <div style={{ position: 'relative' }}>
                    <input className="fi" placeholder="e.g. Mumbai, MUM" value={fromPort}
                      onChange={e => setFromPort(e.target.value)} onFocus={() => searchPort(fromPort, setFromSugg)} />
                    {fromSugg.length > 0 && (
                      <div className="ac" style={{ position: 'absolute', zIndex: 200 }}>
                        {fromSugg.map(p => <div key={p.id} className="ac-item" onClick={() => { setFromPort(p.name); setFromSugg([]); }}>
                          <span>📍</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.67rem', color: 'var(--text2)' }}>{p.city} · {p.country}</div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text3)' }}>{p.lat?.toFixed(4)}°N / {p.lon?.toFixed(4)}°E · {p.id}</div>
                          </div>
                        </div>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-section">
                  <span className="p-label">🏁 Arrival Port</span>
                  <div style={{ position: 'relative' }}>
                    <input className="fi" placeholder="e.g. Singapore, SIN" value={toPort}
                      onChange={e => setToPort(e.target.value)} onFocus={() => searchPort(toPort, setToSugg)} />
                    {toSugg.length > 0 && (
                      <div className="ac" style={{ position: 'absolute', zIndex: 200 }}>
                        {toSugg.map(p => <div key={p.id} className="ac-item" onClick={() => { setToPort(p.name); setToSugg([]); }}>
                          <span>🏁</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.67rem', color: 'var(--text2)' }}>{p.city} · {p.country}</div>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text3)' }}>{p.lat?.toFixed(4)}°N / {p.lon?.toFixed(4)}°E · {p.id}</div>
                          </div>
                        </div>)}
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: '0.6rem' }} onClick={generateRoute}>🗺 Generate Sea Route</button>

                {showDbSugg && dbSuggestions.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 10, padding: '10px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: 6 }}>✅ {dbSuggestions.length} route{dbSuggestions.length > 1 ? 's' : ''} found in your ECDIS database</div>
                    {dbSuggestions.map((r, i) => {
                      const allVals = Object.entries(r).filter(([k, v]) => v && typeof v === 'string' && v.trim().length > 2);
                      const nameCols = allVals.filter(([k]) => /(name|route|file|rtz|title)/i.test(k));
                      const portCols = allVals.filter(([k]) => /(port|from|to|dep|arr|desc)/i.test(k));
                      const name = r.fileName || r['File Name'] || r['Route Name'] || nameCols[0]?.[1] || allVals[0]?.[1] || `Route ${i + 1}`;
                      const port = r.portName || r['Port Name'] || r['From'] || portCols[0]?.[1] || '';
                      const hasUrl = !!(r.fileUrl || r['File URL'] || r['Drive Link'] || Object.values(r).find(v => typeof v === 'string' && v.includes('drive.google')));
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.2)', marginBottom: 5, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.04)' }} onClick={() => useDbRoute(r)}>
                          <span style={{ fontSize: '1.1rem' }}>{hasUrl ? '📥' : '🗺'}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            {port && <div style={{ fontSize: '0.68rem', color: 'var(--cyan)', marginTop: 1 }}>📍 {port}</div>}
                          </div>
                          <button style={{ background: 'var(--cyan)', color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>USE</button>
                        </div>
                      );
                    })}
                    <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.7rem', padding: '5px', marginTop: 4 }} onClick={() => { setShowDbSugg(false); fallbackAutoRoute(); }}>⚡ Skip — use Auto Route instead</button>
                  </div>
                )}

                <div className="p-section">
                  <span className="p-label">📍 Manual Waypoints</span>
                  <button className={`btn ${clickAdd ? 'btn-gold' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center' }} onClick={() => setClickAdd(c => !c)}>
                    {clickAdd ? '✅ Click map to add WP (ON)' : 'Click map to add WP'}
                  </button>
                </div>

                <div className="p-section">
                  <span className="p-label">🗺 Maritime Zone Overlays</span>
                  <div className="overlay-grid">
                    {ovCfg.map(ov => (
                      <button key={ov.k} className={`ov-btn ${overlays[ov.k] ? 'active' : ''}`}
                        style={{ color: overlays[ov.k] ? ov.color : 'var(--text2)', borderColor: overlays[ov.k] ? ov.color : 'var(--border)' }}
                        onClick={() => toggleOverlay(ov.k)} title={ov.desc}>{overlays[ov.k] ? '✓ ' : ''}{ov.label}</button>
                    ))}
                  </div>
                </div>

                <div className="p-section">
                  <span className="p-label">🚢 Ship Animation</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                    <button className={`btn ${playing ? 'btn-danger' : 'btn-green'}`} style={{ flex: 1, justifyContent: 'center' }}
                      disabled={waypoints.length < 2} onClick={() => setPlaying(p => !p)}>{playing ? '⏹ Stop' : '▶ Play'}</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>Speed:</span>
                    <input type="range" min="1" max="20" value={speed} onChange={e => setSpeed(+e.target.value)} style={{ flex: 1 }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontFamily: 'Orbitron,monospace', minWidth: 20 }}>{speed}x</span>
                  </div>
                </div>
              </>
            )}

            {panel === 'load' && (
              <>
                <div className="p-section">
                  <span className="p-label">📂 Load RTZ File from your ECDIS</span>
                  <div style={{ border: '2px dashed var(--border2)', borderRadius: 10, padding: '1.5rem', textAlign: 'center', background: 'var(--bg2)', marginBottom: '0.8rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 6 }}>📂</div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', marginBottom: 3 }}>Select RTZ File</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text2)' }}>Accepts .rtz and .rtzp files</div>
                    <input type="file" accept=".rtz,.rtzp" onChange={handleRTZLoad} style={{ display: 'block', marginTop: 10, width: '100%', fontSize: '0.75rem' }} />
                  </div>
                  {waypoints.length > 0 && <div className="ok-box" style={{ textAlign: 'center', fontSize: '0.78rem' }}>✅ {waypoints.length} waypoints loaded</div>}
                </div>
                <div className="p-section">
                  <span className="p-label">🗺 Zone Overlays</span>
                  <div className="overlay-grid">
                    {ovCfg.map(ov => (
                      <button key={ov.k} className={`ov-btn ${overlays[ov.k] ? 'active' : ''}`}
                        style={{ color: overlays[ov.k] ? ov.color : 'var(--text2)', borderColor: overlays[ov.k] ? ov.color : 'var(--border)' }}
                        onClick={() => toggleOverlay(ov.k)}>{overlays[ov.k] ? '✓ ' : ''}{ov.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {panel === 'eta' && <ETACalculator totalNM={totalNM} />}

            {panel === 'wpts' && (
              <>
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{waypoints.length} waypoints</span>
                  {waypoints.length > 0 && <button className="btn btn-danger" style={{ padding: '4px 9px', fontSize: '0.7rem' }} onClick={clearRoute}>Clear All</button>}
                </div>
                {waypoints.length === 0
                  ? <div className="empty"><div className="empty-icon">📋</div><div className="empty-t">No Waypoints</div><div className="empty-d">Generate a route or load an RTZ file</div></div>
                  : <div style={{ overflowX: 'auto' }}>
                    <table className="wp-table">
                      <thead><tr><th>WP</th><th>Lat</th><th>Lon</th><th>Crs°</th><th>NM</th><th>Del</th></tr></thead>
                      <tbody>{waypoints.map((wp, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--cyan)', fontFamily: 'Orbitron,monospace' }}>WP{String(i + 1).padStart(2, '0')}</td>
                          <td>{wp.lat.toFixed(4)}</td><td>{wp.lon.toFixed(4)}</td>
                          <td>{i > 0 ? (wp.bearing || 0).toFixed(0) : '—'}</td>
                          <td>{i > 0 ? (wp.distance || 0).toFixed(1) : '0'}</td>
                          <td><button onClick={() => removeWP(i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: '0.9rem' }}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div style={{ marginTop: 8, padding: '8px', background: 'var(--bg2)', borderRadius: 8, textAlign: 'center', fontFamily: 'Orbitron,monospace', fontSize: '0.76rem', color: 'var(--gold)' }}>Total: {totalNM.toFixed(1)} NM</div>
                  </div>
                }
              </>
            )}
          </div>
        </div>

        {/* MAP */}
        <MapView
          waypoints={waypoints}
          setWaypoints={setWaypoints}
          overlays={overlays}
          playing={playing}
          setPlaying={setPlaying}
          speed={speed}
          onMapClick={handleMapClick}
          mapMode={mapMode}
        />
      </div>
    </div>
  );
}

export default RoutePlannerPage;
