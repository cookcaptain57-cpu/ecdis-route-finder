/* eslint-disable */
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, deleteDoc, doc, setDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import * as XLSX from "xlsx";
import { ADMIN_EMAIL, ECDIS_BRANDS } from "../constants";
import { idbSet, fetchRouteSheet, fetchChartSheet } from "../sheets";
import PortSearchPage from "./PortSearchPage";

function AdminPage({
  notify, routes, setRoutes, charts, setCharts,
  sheetRoutes, sheetCharts,
  refreshRoutes, refreshCharts, refreshPorts,
  routesLoading, chartsLoading, portsLoading,
  portsDb = [],
  routesSyncProgress = 0,
  chartsSyncProgress = 0,
  portsSyncProgress  = 0,
}) {
  const [user, setUser]       = useState(null);
  const [email, setEmail]     = useState('');
  const [pass, setPass]       = useState('');
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('dashboard');
  const [users, setUsers]     = useState([]);

  // Firebase / Sheet view tabs
  const [routesView, setRoutesView] = useState('firebase');
  const [chartsView, setChartsView] = useState('firebase');
  const [portsView,  setPortsView]  = useState('firebase');

  // Download limits (loaded from Firestore app_config/limits)
  const [limits, setLimits]             = useState({ maxRoutesPerDay: 10, maxChartsPerDay: 10 });
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Port notices
  const [notices,     setNotices]     = useState([]);
  const [noticeForm,  setNoticeForm]  = useState({ title:'', portName:'', type:'info', description:'', expiryDate:'' });
  const [showNoticeForm, setShowNoticeForm] = useState(false);

  // Live sheet preview
  const [liveRoutes,        setLiveRoutes]        = useState([]);
  const [liveCharts,        setLiveCharts]        = useState([]);
  const [liveLoadingRoutes, setLiveLoadingRoutes] = useState(false);
  const [liveLoadingCharts, setLiveLoadingCharts] = useState(false);

  const loadLiveRoutes = async () => {
    if (liveRoutes.length > 0) return;
    setLiveLoadingRoutes(true);
    try { const d = await fetchRouteSheet(); setLiveRoutes(Array.isArray(d) ? d : []); }
    catch { setLiveRoutes([]); }
    setLiveLoadingRoutes(false);
  };
  const loadLiveCharts = async () => {
    if (liveCharts.length > 0) return;
    setLiveLoadingCharts(true);
    try { const d = await fetchChartSheet(); setLiveCharts(Array.isArray(d) ? d : []); }
    catch { setLiveCharts([]); }
    setLiveLoadingCharts(false);
  };

  // Load download limits from Firestore
  const loadLimits = async () => {
    try {
      const snap = await getDoc(doc(db, 'app_config', 'limits'));
      if (snap.exists()) setLimits(snap.data());
    } catch {}
  };

  // Save download limits to Firestore
  const saveLimits = async () => {
    setLimitsLoading(true);
    try {
      await setDoc(doc(db, 'app_config', 'limits'), {
        maxRoutesPerDay: Number(limits.maxRoutesPerDay),
        maxChartsPerDay: Number(limits.maxChartsPerDay),
        updatedAt: serverTimestamp(),
      });
      notify('✅ Download limits saved', 'success');
    } catch (e) { notify('Failed to save limits: ' + e.message, 'error'); }
    setLimitsLoading(false);
  };

  // Export all users to Excel
  const exportUsers = () => {
    if (users.length === 0) { notify('No users to export', 'error'); return; }
    const rows = users.map(u => ({
      'Name':       u.name     || '',
      'Email':      u.email    || '',
      'Phone':      u.phone    || '',
      'Rank':       u.rank     || '',
      'Ship Name':  u.shipName || '',
      'Address':    u.address  || '',
      'Tier':       u.tier     || 'free',
      'Joined':     u.createdAt?.toDate?.()?.toLocaleDateString() || '',
      'Status':     u.blocked  ? 'Blocked' : 'Active',
      'Note':       'Passwords are not stored/accessible (Firebase security)',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NavisphereX Users');
    XLSX.writeFile(wb, `NavisphereX_Users_${new Date().toISOString().slice(0,10)}.xlsx`);
    notify(`✅ Exported ${rows.length} users to Excel`, 'success');
  };

  // Send password reset email to a user
  const sendResetToUser = async (userEmail) => {
    try {
      await sendPasswordResetEmail(auth, userEmail);
      notify(`✅ Password reset email sent to ${userEmail}`, 'success');
    } catch (e) { notify('Failed to send reset: ' + e.message, 'error'); }
  };

  useEffect(() => { const u = onAuthStateChanged(auth, u => setUser(u)); return () => u(); }, []);
  useEffect(() => { if (user && section === 'users')   loadUsers();   }, [user, section]);
  useEffect(() => { if (user && section === 'settings') loadLimits();  }, [user, section]);
  useEffect(() => { if (user && section === 'notices') loadNotices(); }, [user, section]);

  const loadNotices = async () => {
    try {
      const snap = await getDocs(collection(db, 'notices'));
      setNotices(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)));
    } catch {}
  };

  const addNotice = async () => {
    if (!noticeForm.title) { notify('Enter a title', 'error'); return; }
    try {
      await addDoc(collection(db, 'notices'), { ...noticeForm, createdAt: serverTimestamp() });
      notify('✅ Notice published', 'success');
      setNoticeForm({ title:'', portName:'', type:'info', description:'', expiryDate:'' });
      setShowNoticeForm(false);
      loadNotices();
    } catch (e) { notify('Failed: ' + e.message, 'error'); }
  };

  const deleteNotice = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try { await deleteDoc(doc(db, 'notices', id)); loadNotices(); notify('Deleted', 'success'); }
    catch { notify('Delete failed', 'error'); }
  };

  // Confirmation wrappers
  const confirmAndRefreshRoutes = () => {
    if (!window.confirm('🔄 Sync Routes?\n\nFetches all routes from Google Sheet → saves to Firebase.\nContinue?')) return;
    refreshRoutes(); setLiveRoutes([]);
  };
  const confirmAndRefreshCharts = () => {
    if (!window.confirm('🔄 Sync Charts?\n\nFetches all charts from Google Sheet → saves to Firebase.\nContinue?')) return;
    refreshCharts(); setLiveCharts([]);
  };
  const confirmAndRefreshPorts = () => {
    if (!window.confirm('🔄 Sync Port Database?\n\nFetches all 27,000+ ports from Google Sheet → saves to Firebase.\nThis may take 1-2 minutes.\n\nContinue?')) return;
    refreshPorts();
  };

  // Cache clear
  const clearRoutesCache = async () => {
    if (!window.confirm('🗑 Clear Routes Cache?\n\nRoutes reload fresh from Firebase on next visit.\n\nContinue?')) return;
    try { await idbSet('routes_d', []); await idbSet('routes_v', ''); notify('✅ Routes cache cleared', 'success'); }
    catch { notify('Failed to clear routes cache', 'error'); }
  };
  const clearChartsCache = async () => {
    if (!window.confirm('🗑 Clear Charts Cache?\n\nCharts reload fresh from Firebase on next visit.\n\nContinue?')) return;
    try { await idbSet('charts_d', []); await idbSet('charts_v', ''); notify('✅ Charts cache cleared', 'success'); }
    catch { notify('Failed to clear charts cache', 'error'); }
  };
  const clearPortsCache = async () => {
    if (!window.confirm('🗑 Clear Ports Cache?\n\nPorts reload fresh from Firebase on next visit.\n\nContinue?')) return;
    try { await idbSet('ports_d', []); await idbSet('ports_v', ''); notify('✅ Ports cache cleared', 'success'); }
    catch { notify('Failed to clear ports cache', 'error'); }
  };

  const loadUsers = async () => {
    try { const snap = await getDocs(collection(db, 'users')); setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))); }
    catch { notify('Could not load users', 'error'); }
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
        <button className="submit-btn" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold2))', color: '#000' }} onClick={async () => {
          setLoading(true); setErr('');
          try {
            const c = await signInWithEmailAndPassword(auth, email, pass);
            if (c.user.email !== ADMIN_EMAIL) { await signOut(auth); setErr('❌ Access denied.'); }
          } catch { setErr('Invalid credentials.'); }
          setLoading(false);
        }} disabled={loading}>
          {loading ? 'Logging in…' : '🛡 ADMIN LOGIN'}
        </button>
      </div>
    </div>
  );

  // ─── Reusable progress bar ────────────────────────────────────────────────
  const SyncBar = ({ progress, loading, color = 'var(--cyan)' }) => {
    if (!loading && progress === 0) return null;
    const pct = progress;
    const isDone = pct >= 100;
    return (
      <div style={{ marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {isDone ? '✅ Sync complete' : loading ? `Syncing… ${pct}%` : ''}
          </span>
          <span style={{ fontSize: '0.7rem', fontFamily: 'Orbitron,monospace', color: isDone ? 'var(--green)' : color, fontWeight: 700 }}>{pct}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden' }}>
          {loading && pct < 5
            ? <div style={{ height: '100%', background: `linear-gradient(90deg,${color},${color}55,${color})`, backgroundSize: '200% 100%', animation: 'shimmer 1.4s linear infinite', borderRadius: 6 }} />
            : <div style={{ height: '100%', borderRadius: 6, transition: 'width 0.4s ease, background 0.3s', width: `${pct}%`, background: isDone ? 'var(--green)' : `linear-gradient(90deg,${color},${color}99)` }} />
          }
        </div>
      </div>
    );
  };

  // ─── Reusable Firebase/Sheet tab switcher ─────────────────────────────────
  const ViewTabs = ({ view, onFirebase, onSheet, firebaseCount, sheetCount, sheetLoading }) => (
    <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <button onClick={onFirebase} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s',
        background: view === 'firebase' ? 'linear-gradient(135deg,var(--cyan),var(--blue))' : 'transparent', color: view === 'firebase' ? 'white' : 'var(--text2)' }}>
        🔥 Firebase <span style={{ marginLeft: 5, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, background: view === 'firebase' ? 'rgba(255,255,255,0.2)' : 'rgba(0,180,216,0.15)', color: view === 'firebase' ? 'white' : 'var(--cyan)' }}>{firebaseCount}</span>
      </button>
      <button onClick={onSheet} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s',
        background: view === 'sheet' ? 'linear-gradient(135deg,var(--green),#00a87a)' : 'transparent', color: view === 'sheet' ? '#000' : 'var(--text2)' }}>
        📋 Google Sheet <span style={{ marginLeft: 5, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, background: view === 'sheet' ? 'rgba(0,0,0,0.2)' : 'rgba(0,200,150,0.15)', color: view === 'sheet' ? '#000' : 'var(--green)' }}>{sheetLoading ? '…' : sheetCount}</span>
      </button>
    </div>
  );

  // ─── Reusable data table ──────────────────────────────────────────────────
  const DataTable = ({ rows, loading, emptyIcon, emptyTitle, emptyDesc }) => {
    if (loading) return <div className="loading"><div className="spin" /><span>Fetching from Google Sheet…</span></div>;
    if (!rows?.length) return <div className="empty"><div className="empty-icon">{emptyIcon}</div><div className="empty-t">{emptyTitle}</div><div className="empty-d">{emptyDesc}</div></div>;
    const cols = Object.keys(rows[0] || {}).slice(0, 5);
    return (
      <div className="tw">
        <table className="tbl">
          <thead><tr><th>#</th>{cols.map(col => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>{rows.slice(0, 100).map((row, i) => (
            <tr key={i}>
              <td style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{i + 1}</td>
              {cols.map(col => <td key={col} style={{ fontSize: '0.76rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {col.toLowerCase().includes('url') || col.toLowerCase().includes('link')
                  ? row[col] ? <a href={row[col]} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✅ Link</a> : <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>❌</span>
                  : <span style={{ color: col.toLowerCase().includes('name') ? 'var(--cyan)' : 'var(--text2)' }}>{row[col] || '—'}</span>}
              </td>)}
            </tr>
          ))}</tbody>
        </table>
        {rows.length > 100 && <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text3)' }}>Showing first 100 of {rows.length} rows</div>}
      </div>
    );
  };

  const clearBtnStyle = { padding: '5px 12px', fontSize: '0.72rem', borderColor: 'rgba(255,71,87,0.4)', color: 'var(--red)' };

  // ─── Sidebar — removed Add Route + Add Chart ──────────────────────────────
  const sides = [
    { k: 'dashboard',    i: '📊', l: 'Dashboard' },
    { k: 'routes',       i: '📋', l: 'Manage Routes' },
    { k: 'charts',       i: '🗂', l: 'Manage Charts' },
    { k: 'sheet-routes', i: '🔄', l: 'Sync Routes' },
    { k: 'sheet-charts', i: '🔄', l: 'Sync Charts' },
    { k: 'port-search',  i: '⚓', l: 'Sync Ports' },
    { k: 'notices',      i: '📢', l: 'Port Notices' },
    { k: 'settings',     i: '⚙️', l: 'Settings' },
    { k: 'users',        i: '👥', l: 'User Database' },
  ];

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

              {/* Stats — removed RTZ Routes DB and Chart Files DB (empty) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: '0.8rem', marginBottom: '1.4rem' }}>
                {[
                  { l: 'Sheet Routes',  v: sheetRoutes.length, i: '🔄', c: 'var(--cyan)' },
                  { l: 'Sheet Charts',  v: sheetCharts.length, i: '🔄', c: 'var(--gold)' },
                  { l: 'World Ports',   v: portsDb.length,     i: '⚓', c: 'var(--green)' },
                  { l: 'ECDIS Brands',  v: ECDIS_BRANDS.length, i: '🖥', c: '#A78BFA' },
                ].map(s => (
                  <div key={s.l} className="file-card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.i}</div>
                    <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.5rem', fontWeight: 700, color: s.c }}>{s.v.toLocaleString()}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {/* Quick Sync with progress bars */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '0.8rem' }}>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', marginBottom: '1rem', color: 'var(--gold)' }}>⚡ Quick Sync — Confirmation required · Each independent</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <button className="btn btn-primary" onClick={confirmAndRefreshRoutes} disabled={routesLoading}>
                    {routesLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing Routes…</> : '🔄 Sync Routes'}
                  </button>
                  <button className="btn btn-gold" onClick={confirmAndRefreshCharts} disabled={chartsLoading}>
                    {chartsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing Charts…</> : '🔄 Sync Charts'}
                  </button>
                  <button className="btn btn-green" onClick={confirmAndRefreshPorts} disabled={portsLoading}>
                    {portsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing Ports…</> : '🔄 Sync Ports'}
                  </button>
                </div>
                {/* Progress bars — only visible during/after sync */}
                <SyncBar progress={routesSyncProgress} loading={routesLoading} color="var(--cyan)" />
                <SyncBar progress={chartsSyncProgress} loading={chartsLoading} color="var(--gold)" />
                <SyncBar progress={portsSyncProgress}  loading={portsLoading}  color="var(--green)" />
              </div>

              {/* Cache clear */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', marginBottom: '4px', color: 'var(--red)' }}>🗑 Clear Browser Cache — Each type independent</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginBottom: '0.8rem' }}>Forces fresh reload from Firebase on next visit.</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearRoutesCache}>🗑 Routes Cache</button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearChartsCache}>🗑 Charts Cache</button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearPortsCache}>🗑 Ports Cache</button>
                </div>
              </div>

              <div className="info-box">
                <strong style={{ color: 'var(--gold)' }}>📋 How it works:</strong><br />
                Google Sheet → Click Sync → Saves to Firebase in chunks → All users load instantly → Cached to browser IDB for offline use.
                Each sync is <strong style={{ color: 'var(--cyan)' }}>independent</strong>.
              </div>
            </>
          )}

          {/* ─── MANAGE ROUTES ─────────────────────────────────────────── */}
          {section === 'routes' && (
            <>
              <div className="a-hdr"><div className="a-title">📋 Manage Routes</div><span className="badge">{routes.length}</span></div>
              {routes.length === 0
                ? <div className="empty"><div className="empty-icon">🗺</div><div className="empty-t">No Manually Added Routes</div><div className="empty-d">Routes are synced automatically from Google Sheet via the Sync Routes tab.</div></div>
                : <div className="tw"><table className="tbl">
                  <thead><tr><th>File Name</th><th>Port/Route</th><th>Type</th><th>Link</th><th>Del</th></tr></thead>
                  <tbody>{routes.map(r => (
                    <tr key={r.id}>
                      <td><span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.68rem', color: 'var(--cyan)' }}>{r.fileName}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.76rem' }}>{r.portName || '—'}</td>
                      <td style={{ fontSize: '0.72rem', color: 'var(--green)' }}>{r.type || '—'}</td>
                      <td>{r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✅ Active</a> : <span style={{ color: 'var(--red)', fontSize: '0.72rem' }}>❌</span>}</td>
                      <td><button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => deleteRoute(r.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              }
            </>
          )}

          {/* ─── MANAGE CHARTS ─────────────────────────────────────────── */}
          {section === 'charts' && (
            <>
              <div className="a-hdr"><div className="a-title">🗂 Manage Charts</div><span className="badge badge-gold">{charts.length}</span></div>
              {charts.length === 0
                ? <div className="empty"><div className="empty-icon">📊</div><div className="empty-t">No Manually Added Charts</div><div className="empty-d">Charts are synced automatically from Google Sheet via the Sync Charts tab.</div></div>
                : <div className="tw"><table className="tbl">
                  <thead><tr><th>File Name</th><th>Port</th><th>Brand</th><th>Link</th><th>Del</th></tr></thead>
                  <tbody>{charts.map(c => (
                    <tr key={c.id}>
                      <td><span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.68rem', color: 'var(--gold)' }}>{c.fileName}</span></td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.76rem' }}>{c.portName || '—'}</td>
                      <td style={{ fontSize: '0.72rem', color: '#A78BFA' }}>{c.brand || '—'}</td>
                      <td>{c.fileUrl ? <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.72rem' }}>✅ Active</a> : <span style={{ color: 'var(--red)', fontSize: '0.72rem' }}>❌</span>}</td>
                      <td><button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => deleteChart(c.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>
              }
            </>
          )}

          {/* ─── SYNC ROUTES ─── Firebase / Sheet tabs + progress bar ───── */}
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
              <SyncBar progress={routesSyncProgress} loading={routesLoading} color="var(--cyan)" />
              <ViewTabs view={routesView} onFirebase={() => setRoutesView('firebase')} onSheet={() => { setRoutesView('sheet'); loadLiveRoutes(); }} firebaseCount={sheetRoutes.length} sheetCount={liveRoutes.length} sheetLoading={liveLoadingRoutes} />
              {routesView === 'firebase' ? (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>🔥 <strong style={{ color: 'var(--cyan)' }}>Firebase Data</strong> — What users currently receive.</div>
                  <DataTable rows={sheetRoutes} loading={routesLoading} emptyIcon="🗄" emptyTitle="No Routes in Firebase Yet" emptyDesc="Click Sync Sheet → Firebase to push routes." />
                </>
              ) : (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>
                    📋 <strong style={{ color: 'var(--green)' }}>Google Sheet Data</strong> — Live preview. Click Sync to push to Firebase.
                    <button className="btn btn-secondary" style={{ marginLeft: 10, padding: '3px 9px', fontSize: '0.68rem' }} onClick={() => { setLiveRoutes([]); loadLiveRoutes(); }}>↺ Refresh</button>
                  </div>
                  <DataTable rows={liveRoutes} loading={liveLoadingRoutes} emptyIcon="📋" emptyTitle="No Rows Found in Sheet" emptyDesc="Check your Google Sheet has data." />
                </>
              )}
            </>
          )}

          {/* ─── SYNC CHARTS ─── Firebase / Sheet tabs + progress bar ───── */}
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
              <SyncBar progress={chartsSyncProgress} loading={chartsLoading} color="var(--gold)" />
              <ViewTabs view={chartsView} onFirebase={() => setChartsView('firebase')} onSheet={() => { setChartsView('sheet'); loadLiveCharts(); }} firebaseCount={sheetCharts.length} sheetCount={liveCharts.length} sheetLoading={liveLoadingCharts} />
              {chartsView === 'firebase' ? (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>🔥 <strong style={{ color: 'var(--gold)' }}>Firebase Data</strong> — What users currently receive.</div>
                  <DataTable rows={sheetCharts} loading={chartsLoading} emptyIcon="🗄" emptyTitle="No Charts in Firebase Yet" emptyDesc="Click Sync Sheet → Firebase to push charts." />
                </>
              ) : (
                <>
                  <div className="info-box" style={{ fontSize: '0.74rem' }}>
                    📋 <strong style={{ color: 'var(--green)' }}>Google Sheet Data</strong> — Live preview. Click Sync to push to Firebase.
                    <button className="btn btn-secondary" style={{ marginLeft: 10, padding: '3px 9px', fontSize: '0.68rem' }} onClick={() => { setLiveCharts([]); loadLiveCharts(); }}>↺ Refresh</button>
                  </div>
                  <DataTable rows={liveCharts} loading={liveLoadingCharts} emptyIcon="📋" emptyTitle="No Rows Found in Sheet" emptyDesc="Check your ECDIS Charts Google Sheet has data." />
                </>
              )}
            </>
          )}

          {/* ─── SYNC PORTS ─── Firebase / Sheet tabs + progress bar ────── */}
          {section === 'port-search' && (
            <>
              <div className="a-hdr">
                <div className="a-title">⚓ Sync Ports</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-green">{portsDb.length.toLocaleString()} loaded</span>
                  <button className="btn btn-green" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={confirmAndRefreshPorts} disabled={portsLoading}>
                    {portsLoading ? <><div className="spin" style={{ width: 12, height: 12 }} /> Syncing…</> : '🔄 Sync Sheet → Firebase'}
                  </button>
                  <button className="btn btn-secondary" style={clearBtnStyle} onClick={clearPortsCache}>🗑 Clear Cache</button>
                </div>
              </div>
              <SyncBar progress={portsSyncProgress} loading={portsLoading} color="var(--green)" />
              <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <button onClick={() => setPortsView('firebase')} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s', background: portsView === 'firebase' ? 'linear-gradient(135deg,var(--cyan),var(--blue))' : 'transparent', color: portsView === 'firebase' ? 'white' : 'var(--text2)' }}>
                  🔥 Firebase <span style={{ marginLeft: 5, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, background: portsView === 'firebase' ? 'rgba(255,255,255,0.2)' : 'rgba(0,180,216,0.15)', color: portsView === 'firebase' ? 'white' : 'var(--cyan)' }}>{portsDb.length.toLocaleString()}</span>
                </button>
                <button onClick={() => setPortsView('sheet')} style={{ flex: 1, padding: '8px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.74rem', fontWeight: 600, transition: 'all 0.2s', background: portsView === 'sheet' ? 'linear-gradient(135deg,var(--green),#00a87a)' : 'transparent', color: portsView === 'sheet' ? '#000' : 'var(--text2)' }}>
                  📋 Google Sheet <span style={{ marginLeft: 5, padding: '1px 7px', borderRadius: 10, fontSize: '0.65rem', fontWeight: 700, background: portsView === 'sheet' ? 'rgba(0,0,0,0.2)' : 'rgba(0,200,150,0.15)', color: portsView === 'sheet' ? '#000' : 'var(--green)' }}>27,000+</span>
                </button>
              </div>
              {portsView === 'firebase' ? (
                <>
                  <div className="info-box">
                    🔥 <strong style={{ color: 'var(--cyan)' }}>Firebase Data</strong> — {portsDb.length.toLocaleString()} ports loaded.
                    {portsDb.length < 1000 && <span style={{ color: 'var(--red)', marginLeft: 6 }}>⚠️ Low count — sync recommended.</span>}
                  </div>
                  <PortSearchPage portsDb={portsDb} sheetLoading={portsLoading} refreshSheets={refreshPorts} />
                </>
              ) : (
                <>
                  <div className="info-box">
                    📋 <strong style={{ color: 'var(--green)' }}>Google Sheet Source</strong> — Your PORTDATA sheet has 27,000+ ports. Click "Sync Sheet → Firebase" to push all ports so users load instantly.
                  </div>
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.4rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>⚓</div>
                    <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.84rem', fontWeight: 700, color: 'var(--green)', marginBottom: '0.5rem' }}>PORTDATA Sheet Ready</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '1.2rem', lineHeight: 1.6 }}>
                      27,000+ world ports available in your Google Sheet.<br />
                      Sync to Firebase → users load instantly → cached to browser for offline use.
                    </div>
                    <button className="btn btn-green" style={{ justifyContent: 'center' }} onClick={confirmAndRefreshPorts} disabled={portsLoading}>
                      {portsLoading ? <><div className="spin" style={{ width: 14, height: 14 }} /> Syncing all ports…</> : '🔄 Sync All Ports to Firebase'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ─── PORT NOTICES ──────────────────────────────────────────── */}
          {section === 'notices' && (
            <>
              <div className="a-hdr">
                <div className="a-title">📢 Port Notices</div>
                <button className="btn btn-primary" style={{ padding:'5px 12px', fontSize:'0.72rem' }}
                  onClick={() => setShowNoticeForm(s => !s)}>
                  {showNoticeForm ? '✕ Cancel' : '+ New Notice'}
                </button>
              </div>

              {showNoticeForm && (
                <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)', borderRadius:12, padding:'1.2rem', marginBottom:'1rem' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
                      <label className="fl">Title *</label>
                      <input className="fi" placeholder="e.g. Mumbai Anchorage — Temporary Restriction"
                        value={noticeForm.title} onChange={e=>setNoticeForm(n=>({...n,title:e.target.value}))} />
                    </div>
                    <div className="ff" style={{ margin:0 }}>
                      <label className="fl">Port / Area</label>
                      <input className="fi" placeholder="e.g. Mumbai, Arabian Sea"
                        value={noticeForm.portName} onChange={e=>setNoticeForm(n=>({...n,portName:e.target.value}))} />
                    </div>
                    <div className="ff" style={{ margin:0 }}>
                      <label className="fl">Type</label>
                      <select className="fi" value={noticeForm.type} onChange={e=>setNoticeForm(n=>({...n,type:e.target.value}))}>
                        <option value="info">ℹ️ Info</option>
                        <option value="warning">⚠️ Warning</option>
                        <option value="closure">🚫 Closure</option>
                        <option value="restricted">⛔ Restricted</option>
                      </select>
                    </div>
                    <div className="ff" style={{ margin:0 }}>
                      <label className="fl">Expiry Date (optional)</label>
                      <input className="fi" type="date" value={noticeForm.expiryDate}
                        onChange={e=>setNoticeForm(n=>({...n,expiryDate:e.target.value}))} />
                    </div>
                    <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
                      <label className="fl">Description</label>
                      <textarea className="fi" rows={3} style={{ resize:'vertical' }}
                        placeholder="Detailed notice information…"
                        value={noticeForm.description} onChange={e=>setNoticeForm(n=>({...n,description:e.target.value}))} />
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ marginTop:10 }} onClick={addNotice}>
                    📢 Publish Notice
                  </button>
                </div>
              )}

              {notices.length === 0
                ? <div className="empty"><div className="empty-icon">📢</div><div className="empty-t">No Notices Yet</div><div className="empty-d">Click "+ New Notice" to publish a port notice.</div></div>
                : <div style={{ display:'grid', gap:'0.7rem' }}>
                  {notices.map(n => (
                    <div key={n.id} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1rem', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:'0.86rem', color:'var(--cyan)', marginBottom:4 }}>{n.title}</div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:'0.7rem', color:'var(--text3)' }}>
                          <span>Type: {n.type}</span>
                          {n.portName && <span>Port: {n.portName}</span>}
                          {n.expiryDate && <span>Expires: {n.expiryDate}</span>}
                        </div>
                        {n.description && <div style={{ fontSize:'0.74rem', color:'var(--text2)', marginTop:6 }}>{n.description}</div>}
                      </div>
                      <button className="btn btn-danger" style={{ padding:'4px 8px', fontSize:'0.7rem', flexShrink:0 }}
                        onClick={() => deleteNotice(n.id)}>🗑</button>
                    </div>
                  ))}
                </div>
              }
            </>
          )}

          {/* ─── SETTINGS — download limits ────────────────────────────── */}
          {section === 'settings' && (
            <>
              <div className="a-hdr"><div className="a-title">⚙️ App Settings</div></div>

              {/* Download limits */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.2rem', marginBottom: '1rem' }}>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.4rem' }}>📥 Download Limits (per user per day)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Free &amp; Paid user accounts are limited to X downloads per day. Admin account has unlimited access.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
                  <div className="ff" style={{ margin: 0 }}>
                    <label className="fl">🛤 Max Routes / Day</label>
                    <input className="fi" type="number" min="1" max="1000"
                      value={limits.maxRoutesPerDay}
                      onChange={e => setLimits(l => ({ ...l, maxRoutesPerDay: e.target.value }))} />
                  </div>
                  <div className="ff" style={{ margin: 0 }}>
                    <label className="fl">📊 Max Charts / Day</label>
                    <input className="fi" type="number" min="1" max="1000"
                      value={limits.maxChartsPerDay}
                      onChange={e => setLimits(l => ({ ...l, maxChartsPerDay: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-gold" onClick={saveLimits} disabled={limitsLoading}>
                  {limitsLoading ? 'Saving…' : '✅ Save Limits to Firebase'}
                </button>
              </div>

              <div className="info-box">
                💡 These limits apply to all <strong style={{ color: 'var(--cyan)' }}>Free</strong> and <strong style={{ color: 'var(--gold)' }}>Paid</strong> user accounts. Admin account is always unlimited. Limits reset at midnight each day.
              </div>
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
                  <button className="btn btn-green" style={{ padding: '5px 10px', fontSize: '0.72rem' }} onClick={exportUsers}>⬇ Export Excel</button>
                </div>
              </div>

              <div className="info-box" style={{ fontSize: '0.72rem' }}>
                🛡 <strong style={{ color: 'var(--text)' }}>Access Control</strong> — Block users instantly. &nbsp;
                🔒 <strong style={{ color: 'var(--gold)' }}>Passwords</strong> are never stored or accessible — Firebase encrypts them. Use "Reset" to help users change their password.
              </div>

              {users.length === 0
                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users appear here after they register</div></div>
                : <div className="tw"><table className="tbl">
                  <thead><tr><th>#</th><th>Name</th><th>Rank</th><th>Email</th><th>Phone</th><th>Tier</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{users.map((u, i) => (
                    <tr key={u.id} style={{ opacity: u.blocked ? 0.7 : 1 }}>
                      <td style={{ color: 'var(--text3)' }}>{i + 1}</td>
                      <td style={{ color: u.blocked ? '#ff6b6b' : 'var(--cyan)', fontWeight: 600 }}>{u.blocked && '⛔ '}{u.name || '—'}</td>
                      <td style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{u.rank || '—'}</td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.74rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--gold)', fontSize: '0.74rem' }}>{u.phone || '—'}</td>
                      <td><span style={{ padding: '2px 7px', borderRadius: 5, fontSize: '0.62rem', fontWeight: 700,
                        background: u.tier === 'paid' ? 'rgba(240,165,0,0.15)' : 'rgba(0,180,216,0.12)',
                        color: u.tier === 'paid' ? 'var(--gold)' : 'var(--cyan)',
                        border: `1px solid ${u.tier === 'paid' ? 'rgba(240,165,0,0.3)' : 'rgba(0,180,216,0.25)'}` }}>
                        {u.tier === 'paid' ? '⭐ Paid' : '🆓 Free'}
                      </span></td>
                      <td style={{ color: 'var(--text2)', fontSize: '0.7rem' }}>{u.createdAt?.toDate?.()?.toLocaleDateString() || '—'}</td>
                      <td>{u.blocked
                        ? <span style={{ background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 5, padding: '2px 7px', fontSize: '0.62rem', fontWeight: 700 }}>⛔ BLOCKED</span>
                        : <span style={{ background: 'rgba(0,200,100,0.12)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 5, padding: '2px 7px', fontSize: '0.62rem', fontWeight: 700 }}>✅ ACTIVE</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {u.blocked
                            ? <button style={{ background: 'rgba(0,200,100,0.15)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 5, padding: '3px 8px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => unblockUser(u)}>✅ Unblock</button>
                            : <button style={{ background: 'rgba(255,60,60,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 5, padding: '3px 8px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => { if (window.confirm(`Block ${u.name || u.email}?`)) blockUser(u); }}>⛔ Block</button>
                          }
                          <button style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.25)', borderRadius: 5, padding: '3px 8px', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => { if (window.confirm(`Send password reset to ${u.email}?`)) sendResetToUser(u.email); }}>🔑 Reset</button>
                        </div>
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
