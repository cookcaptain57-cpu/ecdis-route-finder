/* eslint-disable */
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection, getDocs, addDoc, deleteDoc, doc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ADMIN_EMAIL, ECDIS_BRANDS, ROUTE_TYPES } from "../constants";
// ← CHANGED: added idbSet, fetchRouteSheet, fetchChartSheet for cache clear + sheet preview
import { idbSet, fetchRouteSheet, fetchChartSheet } from "../sheets";
import PortSearchPage from "./PortSearchPage";

function AdminPage({
  notify, routes, setRoutes, charts, setCharts,
  sheetRoutes, sheetCharts,
  refreshRoutes, refreshCharts, refreshPorts,
  routesLoading, chartsLoading, portsLoading,
  portsDb = [],
}) {
  const [user, setUser]       = useState(null);
  const [email, setEmail]     = useState('');
  const [pass, setPass]       = useState('');
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('dashboard');
  const [users, setUsers]     = useState([]);
  const [nr, setNr] = useState({ fileName: '', fileUrl: '', portName: '', keywords: '', type: 'Ocean' });
  const [nc, setNc] = useState({ fileName: '', fileUrl: '', portName: '', brand: 'furuno', region: '', keywords: '' });

  // ─── Firebase / Sheet view tabs per sync section ──────────────────────────
  const [routesView,  setRoutesView]  = useState('firebase'); // 'firebase' | 'sheet'
  const [chartsView,  setChartsView]  = useState('firebase');
  const [portsView,   setPortsView]   = useState('firebase');

  // Live sheet preview data (fetched on demand when user switches to Sheet tab)
  const [liveRoutes,        setLiveRoutes]        = useState([]);
  const [liveCharts,        setLiveCharts]        = useState([]);
  const [liveLoadingRoutes, setLiveLoadingRoutes] = useState(false);
  const [liveLoadingCharts, setLiveLoadingCharts] = useState(false);

  const loadLiveRoutes = async () => {
    if (liveRoutes.length > 0) return; // already loaded
    setLiveLoadingRoutes(true);
    try {
      const d = await fetchRouteSheet();
      setLiveRoutes(Array.isArray(d) ? d : []);
    } catch { setLiveRoutes([]); }
    setLiveLoadingRoutes(false);
  };

  const loadLiveCharts = async () => {
    if (liveCharts.length > 0) return;
    setLiveLoadingCharts(true);
    try {
      const d = await fetchChartSheet();
      setLiveCharts(Array.isArray(d) ? d : []);
    } catch { setLiveCharts([]); }
    setLiveLoadingCharts(false);
  };

  // Switch to sheet tab and trigger live fetch
  const switchToSheetRoutes = () => { setRoutesView('sheet'); loadLiveRoutes(); };
  const switchToSheetCharts = () => { setChartsView('sheet'); loadLiveCharts(); };

  useEffect(() => { const u = onAuthStateChanged(auth, u => setUser(u)); return () => u(); }, []);
  useEffect(() => { if (user && section === 'users') loadUsers(); }, [user, section]);

  // ─── Confirmation wrappers ────────────────────────────────────────────────
  const confirmAndRefreshRoutes = () => {
    if (!window.confirm('🔄 Sync Routes?\n\nFetches all routes from Google Sheet and saves to Firebase.\nExisting Firebase route data will be overwritten.\n\nContinue?')) return;
    refreshRoutes();
    setLiveRoutes([]); // reset preview so it re-fetches fresh after sync
  };
  const confirmAndRefreshCharts = () => {
    if (!window.confirm('🔄 Sync Charts?\n\nFetches all charts from Google Sheet and saves to Firebase.\nExisting Firebase chart data will be overwritten.\n\nContinue?')) return;
    refreshCharts();
    setLiveCharts([]);
  };
  const confirmAndRefreshPorts = () => {
    if (!window.confirm('🔄 Sync Port Database?\n\nFetches all 27,000+ ports from Google Sheet and saves to Firebase.\nThis may take 1-2 minutes.\n\nContinue?')) return;
    refreshPorts();
  };

  // ─── Cache clear ──────────────────────────────────────────────────────────
  const clearRoutesCache = async () => {
    if (!window.confirm('🗑 Clear Routes Cache?\n\nBrowser cached route data cleared.\nRoutes reload fresh from Firebase on next visit.\n\nContinue?')) return;
    try { await idbSet('routes_d', []); await idbSet('routes_v', ''); notify('✅ Routes cache cleared', 'success'); }
    catch { notify('Failed to clear routes cache', 'error'); }
  };
  const clearChartsCache = async () => {
    if (!window.confirm('🗑 Clear Charts Cache?\n\nBrowser cached chart data cleared.\nCharts reload fresh from Firebase on next visit.\n\nContinue?')) return;
    try { await idbSet('charts_d', []); await idbSet('charts_v', ''); notify('✅ Charts cache cleared', 'success'); }
    catch { notify('Failed to clear charts cache', 'error'); }
  };
  const clearPortsCache = async () => {
    if (!window.confirm('🗑 Clear Ports Cache?\n\nBrowser cached port data cleared.\nPorts reload fresh from Firebase on next visit.\n\nContinue?')) return;
    try { await idbSet('ports_d', []); await idbSet('ports_v', ''); notify('✅ Ports cache cleared', 'success'); }
    catch { notify('Failed to clear ports cache', 'error'); }
  };

  const login = async () => {
    setLoading(true); setErr('');
    try {
      const c = await signInWithEmailAndPassword(auth, email, pass);
      if (c.user.email !== ADMIN_EMAIL) { await signOut(auth); setErr('❌ Access denied.'); setLoading(false); return; }
    } catch { setErr('Invalid credentials.'); }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch { notify('Could not load users', 'error'); }
  };

  const saveRoute = async () => {
    if (!nr.fileName || !nr.fileUrl) { notify('File name and Google Drive link are required', 'error'); return; }
    try {
      const data = { ...nr, keywords: (nr.keywords + ' ' + nr.fileName + ' ' + nr.portName).toLowerCase().trim(), uploadedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'routes'), data);
      setRoutes(r => [...r, { id: ref.id, ...data }]);
      setNr({ fileName: '', fileUrl: '', portName: '', keywords: '', type: 'Ocean' });
      notify('Route saved ✅', 'success');
    } catch (e) { notify('Error: ' + e.message, 'error'); }
  };

  const saveChart = async () => {
    if (!nc.fileName || !nc.fileUrl || !nc.portName) { notify('File name, port name and link required', 'error'); return; }
    const brandName = ECDIS_BRANDS.find(b => b.id === nc.brand)?.name || nc.brand;
    try {
      const data = { ...nc, brand: brandName, brandId: nc.brand, keywords: (nc.keywords + ' ' + nc.portName + ' ' + brandName + ' ' + nc.fileName).toLowerCase().trim(), uploadedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'charts'), data);
      setCharts(c => [...c, { id: ref.id, ...data }]);
      setNc({ fileName: '', fileUrl: '', portName: '', brand: 'furuno', region: '', keywords: '' });
      notify('Chart saved ✅', 'success');
    } catch (e) { notify('Error: ' + e.message, 'error'); }
  };

  const deleteRoute = async id => {
    try { await deleteDoc(doc(db, 'routes', id)); setRoutes(r => r.filter(x => x.id !== id)); notify('Deleted', 'success'); }
    catch { notify('Delete failed', 'error'); }
  };
  const deleteChart = async id => {
    try { await deleteDoc(doc(db, 'charts', id)); setCharts(c => c.filter(x => x.id !== id)); notify('Deleted', 'success'); }
    catch { notify('Delete failed', 'error'); }
  };
  const blockUser = async (u) => {
    try {
      await setDoc(doc(db, 'users', u.id), { blocked: true, blockedAt: serverTimestamp() }, { merge: true });
      setUsers(us => us.map(x => x.id === u.id ? { ...x, blocked: true } : x));
      notify(`⛔ ${u.name || u.email} blocked`, 'success');
    } catch { notify('Failed to block user', 'error'); }
  };
  const unblockUser = async (u) => {
    try {
      await setDoc(doc(db, 'users', u.id), { blocked: false, blockedAt: null }, { merge: true });
      setUsers(us => us.map(x => x.id === u.id ? { ...x, blocked: false } : x));
      notify(`✅ ${u.name || u.email} unblocked`, 'success');
    } catch { notify('Failed to unblock user', 'error'); }
  };

  if (!user) return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold2))' }}>🛡</div>
          <div className="auth-title">Admin Portal</div>
          <div className="auth-sub">NavisphereX Marine — Admin Only</div>
        </div>
        <div className="ff"><label className="fl">Admin Email</label>
          <input className="fi" type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} /></div>
        <div className="ff"><label className="fl">Password</label>
          <input className="fi" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} /></div>
        {err && <div className="err-box">{err}</div>}
        <button className="submit-btn" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold2))', color: '#000' }} onClick={login} disabled={loading}>
          {loading ? 'Logging in…' : '🛡 ADMIN LOGIN'}
        </button>
      </div>
    </div>
  );

  const sides = [
    { k: 'dashboard',    i: '📊', l: 'Dashboard' },
    { k: 'add-route',    i: '🗺', l: 'Add Route' },
    { k: 'add-chart',    i: '📊', l: 'Add Chart' },
    { k: 'routes',       i: '📋', l: 'Manage Routes' },
    { k: 'charts',       i: '🗂', l: 'Manage Charts' },
    { k: 'sheet-routes', i: '🔄', l: 'Sync Routes' },
    { k: 'sheet-charts', i: '🔄', l: 'Sync Charts' },
    { k: 'port-search',  i: '⚓', l: 'Sync Ports' },
    { k: 'users',        i: '👥', l: 'User Database' },
  ];

  const GDriveHelp = () => (
    <div className="info-box" style={{ fontSize: '0.74rem' }}>
      📁 <strong style={{ color: 'var(--text)' }}>Google Drive Link Guide:</strong><br />
      1. Upload file → Right click → Share → Anyone with link → Copy link<br />
      2. Convert: <code style={{ color: 'var(--green)' }}>drive.google.com/uc?export=download&id=FILE_ID</code>
    </div>
  );

  const clearBtnStyle = { padding: '5px 12px', fontSize: '0.72rem', borderColor: 'rgba(255,71,87,0.4)', color: 'var(--red)' };

  // Reusable Firebase / Sheet tab switcher UI
  const ViewTabs = ({ view, onFirebase, onSheet, firebaseCount, sheetCount, sheetLoading }) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <button onClick={onFirebase}
        style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s',
          background: view === 'firebase' ? 'linear-gradient(135deg,var(--cyan),var(--blue))' : 'transparent',
          color: view === 'firebase' ? 'white' : 'var(--text2)' }}>
        🔥 Firebase
        <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
          background: view === 'firebase' ? 'rgba(255,255,255,0.2)' : 'rgba(0,180,216,0.15)', color: view === 'firebase' ? 'white' : 'var(--cyan)' }}>
          {firebaseCount}
        </span>
      </button>
      <button onClick={onSheet}
        style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s',
          background: view === 'sheet' ? 'linear-gradient(135deg,var(--green),#00a87a)' : 'transparent',
          color: view === 'sheet' ? '#000' : 'var(--text2)' }}>
        📋 Google Sheet
        <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
          background: view === 'sheet' ? 'rgba(0,0,0,0.2)' : 'rgba(0,200,150,0.15)', color: view === 'sheet' ? '#000' : 'var(--green)' }}>
          {sheetLoading ? '…' : sheetCount}
        </span>
      </button>
    </div>
  );

  // Reusable data table renderer for sheet/firebase rows
  const DataTable = ({ rows, loading, emptyIcon, emptyTitle, emptyDesc }) => {
    if (loading) return <div className="loading"><div className="spin" /><span>Fetching from Google Sheet…</span></div>;
    if (!rows || rows.length === 0) return (
      <div className="empty"><div className="empty-icon">{emptyIcon}</div>
        <div className="empty-t">{emptyTitle}</div>
        <div className="empty-d">{emptyDesc}</div></div>
    );
    const cols = Object.keys(rows[0] || {}).slice(0, 5);
    return (
      <div className="tw">
        <table className="tbl">
          <thead><tr><th>#</th>{cols.map(col => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 100).map((row, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{i + 1}</td>
              {cols.map(col => (
                <td key={col} style={{ fontSize: '0.76rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {col.toLowerCase().includes('url') || col.toLowerCase().includes('link')
                    ? row[col] ? <a href={row[col]} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✅ Link</a> : <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>❌</span>
                    : <span style={{ color: col.toLowerCase().includes('name') ? 'var(--cyan)' : 'var(--text2)' }}>{row[col] || '—'}</span>}
                </td>
              ))}
            </tr>
          ))}</tbody>
        </table>
        {rows.length > 100 && <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text3)' }}>Showing first 100 of {rows.length} rows</div>}
      </div>
    );
  };

  return (
    <div>
      <div className="adm-mob-tabs">
        {sides.map(s => <button key={s.k} className={`amtab ${section === s.k ? 'active' : ''}`} onClick={() => setSection(s.k)}>{s.i} {s.l}</button>)}
        <button className="amtab" onClick={() => signOut(auth)}>🚪 Logout</button>
      </div>

      <div className="adm-layout">
        <div className="adm-sidebar">
          <div style={{ marginBottom: '1.2rem' }}>
            <div className="s-label">Navigation</div>
            {sides.map(s => <div key={s.k} className={`s-item ${section === s.k ? 'active' : ''}`} onClick={() => setSection(s.k)}><span>{s.i}</span>{s.l}</div>)}
          </div>
          <div>
            <div className="s-label">Account</div>
            <div className="s-item" style={{ fontSize: '0.7rem', color: 'var(--text3)' }}><span>👥</span>{user.email}</div>
            <div className="s-item" onClick={() => signOut(auth)}><span>🚪</span>Logout</div>
          </div>
        </div>

        <div className="adm-content">

          {/* ─── DASHBOARD ─────────────────────────────────────────────── */}
          {section === 'dashboard' && (
            <>
              <div className="a-hdr">
                <div className="a-title">📊 Dashboard</div>
                <span style={{ fontSize: '0.72rem', color: 'var(--green)' }}>🔥 Firebase + Google Drive</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: '0.8rem', marginBottom: '1.4rem' }}>
                {[
                  { l: 'RTZ Routes (DB)',  v: routes.length,      i: '🗺', c: 'var(--cyan)' },
                  { l: 'Chart Files (DB)', v: charts.length,      i: '📊', c: 'var(--gold)' },
                  { l: 'Sheet Routes',     v: sheetRoutes.length, i: '🔄', c: 'var(--green)' },
                  { l: 'Sheet Charts',     v: sheetCharts.length, i: '🔄', c: '#A78BFA' },
                  { l: 'Links Active',     v: [...routes, ...charts].filter(f => f.fileUrl).length, i: '✅', c: 'var(--green)' },
                  { l: 'ECDIS Brands',     v: ECDIS_BRANDS.length, i: '🖥', c: 'var(--text2)' },
                  { l: 'World Ports',      v: portsDb.length,     i: '⚓', c: 'var(--cyan)' },
                ].map(s => (
                  <div key={s.l} className="file-card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.i}</div>
                    <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.5rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', marginBottom: '0.8rem', color: 'var(--gold)' }}>⚡ Quick Sync — Confirmation required · Each button independent</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={confirmAndRefreshRoutes} disabled={routesLoading}>
                    {routesLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Routes'}
                  </button>
                  <button className="btn btn-gold" onClick={confirmAndRefreshCharts} disabled={chartsLoading}>
                    {chartsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Charts'}
                  </button>
                  <button className="btn btn-green" onClick={confirmAndRefreshPorts} disabled={portsLoading}>
                    {portsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Ports'}
                  </button>
                </div>
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', marginBottom: '4px', color: 'var(--red)' }}>🗑 Clear Browser Cache — Each type independent</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: '0.8rem' }}>Forces fresh reload from Firebase on next visit. Only clears selected type.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearRoutesCache}>🗑 Routes Cache</button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearChartsCache}>🗑 Charts Cache</button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearPortsCache}>🗑 Ports Cache</button>
                </div>
              </div>
              <div className="info-box">
                <strong style={{ color: 'var(--gold)' }}>📋 How it works:</strong><br />
                Upload to Google Drive → App Script adds to Google Sheet → Click Sync → Saves to Firebase → All users get it instantly.
                Each sync is <strong style={{ color: 'var(--cyan)' }}>independent</strong>.
              </div>
            </>
          )}

          {/* ─── ADD ROUTE ─────────────────────────────────────────────── */}
          {section === 'add-route' && (
            <>
              <div className="a-hdr"><div className="a-title">🗺 Add RTZ Route</div></div>
              <GDriveHelp />
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ff" style={{ gridColumn: '1/-1' }}><label className="fl">📁 RTZ File Name *</label>
                    <input className="fi" placeholder="mumbaitosingapore.rtz" value={nr.fileName} onChange={e => setNr(r => ({ ...r, fileName: e.target.value }))} /></div>
                  <div className="ff" style={{ gridColumn: '1/-1' }}><label className="fl">🔗 Google Drive Direct Download Link *</label>
                    <input className="fi" placeholder="https://drive.google.com/uc?export=download&id=XXXX" value={nr.fileUrl} onChange={e => setNr(r => ({ ...r, fileUrl: e.target.value }))} /></div>
                  <div className="ff"><label className="fl">📍 Port / Route Description</label>
                    <input className="fi" placeholder="Mumbai to Singapore" value={nr.portName} onChange={e => setNr(r => ({ ...r, portName: e.target.value }))} /></div>
                  <div className="ff"><label className="fl">Route Type</label>
                    <select className="fi" value={nr.type} onChange={e => setNr(r => ({ ...r, type: e.target.value }))}>
                      {ROUTE_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div className="ff" style={{ gridColumn: '1/-1' }}><label className="fl">🔍 Search Keywords</label>
                    <input className="fi" placeholder="mum sin india ocean" value={nr.keywords} onChange={e => setNr(r => ({ ...r, keywords: e.target.value }))} /></div>
                </div>
                <button className="btn btn-primary" onClick={saveRoute}>✅ Save Route to Firebase</button>
              </div>
            </>
          )}

          {/* ─── ADD CHART ─────────────────────────────────────────────── */}
          {section === 'add-chart' && (
            <>
              <div className="a-hdr"><div className="a-title">📊 Add Chart File</div></div>
              <GDriveHelp />
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.2rem' }}>
                <div className="ff"><label className="fl">🖥 Select ECDIS Brand *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 5, marginBottom: 8 }}>
                    {ECDIS_BRANDS.map(b => (
                      <div key={b.id} onClick={() => setNc(c => ({ ...c, brand: b.id }))}
                        style={{ padding: '6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center', border: `2px solid ${nc.brand === b.id ? b.color : 'var(--border)'}`, background: nc.brand === b.id ? b.color + '22' : 'transparent', transition: 'all 0.2s' }}>
                        <div style={{ fontSize: '1.2rem' }}>{b.emoji}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: nc.brand === b.id ? b.color : 'var(--text2)', fontFamily: 'Orbitron,monospace' }}>{b.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ff"><label className="fl">📁 Chart File Name *</label><input className="fi" placeholder="mumbai_furuno.bin" value={nc.fileName} onChange={e => setNc(c => ({ ...c, fileName: e.target.value }))} /></div>
                  <div className="ff"><label className="fl">⚓ Port Name *</label><input className="fi" placeholder="Mumbai" value={nc.portName} onChange={e => setNc(c => ({ ...c, portName: e.target.value }))} /></div>
                  <div className="ff" style={{ gridColumn: '1/-1' }}><label className="fl">🔗 Google Drive Direct Download Link *</label><input className="fi" placeholder="https://drive.google.com/uc?export=download&id=XXXX" value={nc.fileUrl} onChange={e => setNc(c => ({ ...c, fileUrl: e.target.value }))} /></div>
                  <div className="ff"><label className="fl">Region</label><input className="fi" placeholder="Arabian Sea" value={nc.region} onChange={e => setNc(c => ({ ...c, region: e.target.value }))} /></div>
                  <div className="ff"><label className="fl">Extra Keywords</label><input className="fi" placeholder="west coast india" value={nc.keywords} onChange={e => setNc(c => ({ ...c, keywords: e.target.value }))} /></div>
                </div>
                <button className="btn btn-gold" onClick={saveChart}>✅ Save Chart to Firebase</button>
              </div>
            </>
          )}

          {/* ─── MANAGE ROUTES ─────────────────────────────────────────── */}
          {section === 'routes' && (
            <>
              <div className="a-hdr"><div className="a-title">📋 Manage Routes</div><span className="badge">{routes.length}</span></div>
              <div className="tw"><table className="tbl">
                <thead><tr><th>File Name</th><th>Port/Route</th><th>Type</th><th>Link</th><th>Del</th></tr></thead>
                <tbody>{routes.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No routes added yet</td></tr>
                  : routes.map(r => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.68rem', color: 'var(--cyan)' }}>{r.fileName}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.76rem' }}>{r.portName || '—'}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--green)' }}>{r.type || '—'}</td>
                      <td>{r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✅ Active</a> : <span style={{ color: 'var(--red)', fontSize: '0.72rem' }}>❌ Missing</span>}</td>
                      <td><button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => deleteRoute(r.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
              </table></div>
            </>
          )}

          {/* ─── MANAGE CHARTS ─────────────────────────────────────────── */}
          {section === 'charts' && (
            <>
              <div className="a-hdr"><div className="a-title">🗂 Manage Charts</div><span className="badge badge-gold">{charts.length}</span></div>
              <div className="tw"><table className="tbl">
                <thead><tr><th>File Name</th><th>Port</th><th>Brand</th><th>Link</th><th>Del</th></tr></thead>
                <tbody>{charts.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: '2rem' }}>No charts added yet</td></tr>
                  : charts.map(c => (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.68rem', color: 'var(--gold)' }}>{c.fileName}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.76rem' }}>{c.portName || '—'}</td>
                      <td style={{ fontSize: '0.72rem', color: '#A78BFA' }}>{c.brand || '—'}</td>
                      <td>{c.fileUrl ? <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✅ Active</a> : <span style={{ color: 'var(--red)', fontSize: '0.72rem' }}>❌ Missing</span>}</td>
                      <td><button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => deleteChart(c.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
              </table></div>
            </>
          )}

          {/* ─── SYNC ROUTES ─── Firebase / Sheet tabs ─────────────────── */}
          {section === 'sheet-routes' && (
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Sync Routes</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={confirmAndRefreshRoutes} disabled={routesLoading}>
                    {routesLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Sheet → Firebase'}
                  </button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearRoutesCache}>🗑 Clear Cache</button>
                </div>
              </div>

              {/* Firebase vs Sheet tab switcher */}
              <ViewTabs
                view={routesView}
                onFirebase={() => setRoutesView('firebase')}
                onSheet={switchToSheetRoutes}
                firebaseCount={sheetRoutes.length}
                sheetCount={liveRoutes.length}
                sheetLoading={liveLoadingRoutes}
              />

              {routesView === 'firebase' ? (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>
                    🔥 <strong style={{ color: 'var(--cyan)' }}>Firebase Data</strong> — What users currently receive. Click "Sync Sheet → Firebase" to update.
                  </div>
                  <DataTable
                    rows={sheetRoutes}
                    loading={routesLoading}
                    emptyIcon="🗄"
                    emptyTitle="No Routes in Firebase Yet"
                    emptyDesc="Click Sync Sheet → Firebase to push routes from your Google Sheet."
                  />
                </>
              ) : (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>
                    📋 <strong style={{ color: 'var(--green)' }}>Google Sheet Data</strong> — Live preview of what will be synced. Click "Sync Sheet → Firebase" to push this to Firebase.
                    <button className="btn btn-secondary" style={{ marginLeft: 10, padding: '3px 9px', fontSize: '0.68rem' }} onClick={() => { setLiveRoutes([]); loadLiveRoutes(); }}>↺ Refresh</button>
                  </div>
                  <DataTable
                    rows={liveRoutes}
                    loading={liveLoadingRoutes}
                    emptyIcon="📋"
                    emptyTitle="No Rows Found in Sheet"
                    emptyDesc="Check your Google Sheet has data and the sheet ID is correct."
                  />
                </>
              )}
            </>
          )}

          {/* ─── SYNC CHARTS ─── Firebase / Sheet tabs ─────────────────── */}
          {section === 'sheet-charts' && (
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Sync Charts</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-gold" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={confirmAndRefreshCharts} disabled={chartsLoading}>
                    {chartsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Sheet → Firebase'}
                  </button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearChartsCache}>🗑 Clear Cache</button>
                </div>
              </div>

              {/* Firebase vs Sheet tab switcher */}
              <ViewTabs
                view={chartsView}
                onFirebase={() => setChartsView('firebase')}
                onSheet={switchToSheetCharts}
                firebaseCount={sheetCharts.length}
                sheetCount={liveCharts.length}
                sheetLoading={liveLoadingCharts}
              />

              {chartsView === 'firebase' ? (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>
                    🔥 <strong style={{ color: 'var(--gold)' }}>Firebase Data</strong> — What users currently receive. Click "Sync Sheet → Firebase" to update.
                  </div>
                  <DataTable
                    rows={sheetCharts}
                    loading={chartsLoading}
                    emptyIcon="🗄"
                    emptyTitle="No Charts in Firebase Yet"
                    emptyDesc="Click Sync Sheet → Firebase to push charts from your Google Sheet."
                  />
                </>
              ) : (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>
                    📋 <strong style={{ color: 'var(--green)' }}>Google Sheet Data</strong> — Live preview of what will be synced. Click "Sync Sheet → Firebase" to push this to Firebase.
                    <button className="btn btn-secondary" style={{ marginLeft: 10, padding: '3px 9px', fontSize: '0.68rem' }} onClick={() => { setLiveCharts([]); loadLiveCharts(); }}>↺ Refresh</button>
                  </div>
                  <DataTable
                    rows={liveCharts}
                    loading={liveLoadingCharts}
                    emptyIcon="📋"
                    emptyTitle="No Rows Found in Sheet"
                    emptyDesc="Check your ECDIS Charts Google Sheet has data."
                  />
                </>
              )}
            </>
          )}

          {/* ─── SYNC PORTS ─── Firebase / Sheet tabs ──────────────────── */}
          {section === 'port-search' && (
            <>
              <div className="a-hdr">
                <div className="a-title">⚓ Sync Ports</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-green" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={confirmAndRefreshPorts} disabled={portsLoading}>
                    {portsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Sheet → Firebase'}
                  </button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearPortsCache}>🗑 Clear Cache</button>
                </div>
              </div>

              {/* Firebase vs Sheet tab switcher for ports */}
              <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <button onClick={() => setPortsView('firebase')}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s',
                    background: portsView === 'firebase' ? 'linear-gradient(135deg,var(--cyan),var(--blue))' : 'transparent',
                    color: portsView === 'firebase' ? 'white' : 'var(--text2)' }}>
                  🔥 Firebase
                  <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
                    background: portsView === 'firebase' ? 'rgba(255,255,255,0.2)' : 'rgba(0,180,216,0.15)', color: portsView === 'firebase' ? 'white' : 'var(--cyan)' }}>
                    {portsDb.length.toLocaleString()}
                  </span>
                </button>
                <button onClick={() => setPortsView('sheet')}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s',
                    background: portsView === 'sheet' ? 'linear-gradient(135deg,var(--green),#00a87a)' : 'transparent',
                    color: portsView === 'sheet' ? '#000' : 'var(--text2)' }}>
                  📋 Google Sheet
                  <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700,
                    background: portsView === 'sheet' ? 'rgba(0,0,0,0.2)' : 'rgba(0,200,150,0.15)', color: portsView === 'sheet' ? '#000' : 'var(--green)' }}>
                    27,000+
                  </span>
                </button>
              </div>

              {portsView === 'firebase' ? (
                <>
                  <div className="info-box">
                    🔥 <strong style={{ color: 'var(--cyan)' }}>Firebase Data</strong> — {portsDb.length.toLocaleString()} ports currently loaded from Firebase/IDB.
                    {portsDb.length < 1000 && <span style={{ color: 'var(--red)', marginLeft: 6 }}>⚠️ Low count — sync recommended.</span>}
                  </div>
                  <PortSearchPage portsDb={portsDb} sheetLoading={portsLoading} refreshSheets={refreshPorts} />
                </>
              ) : (
                <>
                  <div className="info-box">
                    📋 <strong style={{ color: 'var(--green)' }}>Google Sheet Source</strong> — Your PORTDATA sheet has 27,000+ ports. Click "Sync Sheet → Firebase" to push all ports to Firebase so users can access them instantly.
                  </div>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>⚓</div>
                    <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.84rem', fontWeight: 700, color: 'var(--green)', marginBottom: '0.5rem' }}>PORTDATA Sheet Ready</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '1.2rem', lineHeight: 1.6 }}>
                      Your Google Sheet contains 27,000+ world ports.<br />
                      Click the sync button above to save all ports to Firebase.<br />
                      Users will then load instantly from Firebase → cached to browser for offline use.
                    </div>
                    <button className="btn btn-green" style={{ justifyContent: 'center' }} onClick={confirmAndRefreshPorts} disabled={portsLoading}>
                      {portsLoading ? <><div className="spin" style={{ width: 14, height: 14 }} /> Syncing all ports…</> : '🔄 Sync All Ports to Firebase'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ─── USERS ─────────────────────────────────────────────────── */}
          {section === 'users' && (
            <>
              <div className="a-hdr">
                <div className="a-title">👥 User Database</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-green">{users.length} registered</span>
                  <span className="badge" style={{ background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)' }}>{users.filter(u => u.blocked).length} blocked</span>
                  <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.72rem' }} onClick={loadUsers}>🔄 Refresh</button>
                </div>
              </div>
              <div className="info-box">🛡 <strong style={{ color: 'var(--text)' }}>Access Control</strong> — Block suspicious users instantly.</div>
              {users.length === 0
                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users appear here after they register</div></div>
                : <div className="tw"><table className="tbl">
                  <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>{users.map((u, i) => (
                    <tr key={u.id} style={{ opacity: u.blocked ? 0.7 : 1 }}>
                      <td style={{ color: 'var(--text3)' }}>{i + 1}</td>
                      <td style={{ color: u.blocked ? '#ff6b6b' : 'var(--cyan)', fontWeight: 600 }}>{u.blocked && '⛔ '}{u.name || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>{u.phone || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.72rem' }}>{u.createdAt?.toDate?.()?.toLocaleDateString() || '—'}</td>
                      <td>{u.blocked
                        ? <span style={{ background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 5, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>⛔ BLOCKED</span>
                        : <span style={{ background: 'rgba(0,200,100,0.12)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>✅ ACTIVE</span>}</td>
                      <td>{u.blocked
                        ? <button style={{ background: 'rgba(0,200,100,0.15)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => unblockUser(u)}>✅ Unblock</button>
                        : <button style={{ background: 'rgba(255,60,60,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => { if (window.confirm(`Block ${u.name || u.email}?`)) blockUser(u); }}>⛔ Block</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table></div>
              }
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default AdminPage;
