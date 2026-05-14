/* eslint-disable */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { auth, db } from "./firebase";
import {
  collection, getDocs, addDoc, deleteDoc, doc, setDoc, serverTimestamp, getDoc, query, orderBy
} from "firebase/firestore";

// ✅ FIXED: Added missing Firebase Auth imports
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

// ─── TODO: Import or define these constants from your constants/config file ───
// import { ADMIN_EMAIL, ECDIS_BRANDS, ROUTE_TYPES, PORTS_DB } from "./constants";
// import PortSearchPage from "./PortSearchPage";
// ─────────────────────────────────────────────────────────────────────────────

// ─── AdminPage ─────────────────────────────────────────────────────────────────
function AdminPage({ notify, routes, setRoutes, charts, setCharts, sheetRoutes, sheetCharts, refreshSheets, sheetLoading }) {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('dashboard');
  const [users, setUsers] = useState([]);

  // New route form
  const [nr, setNr] = useState({ fileName: '', fileUrl: '', portName: '', keywords: '', type: 'Ocean' });
  // New chart form
  const [nc, setNc] = useState({ fileName: '', fileUrl: '', portName: '', brand: 'furuno', region: '', keywords: '' });

  useEffect(() => { const u = onAuthStateChanged(auth, u => setUser(u)); return () => u(); }, []);
  useEffect(() => { if (user && section === 'users') loadUsers(); }, [user, section]);

  const login = async () => {
    setLoading(true); setErr('');
    try {
      const c = await signInWithEmailAndPassword(auth, email, pass);
      if (c.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setErr('❌ Access denied. This portal is for admins only.');
        setLoading(false); return;
      }
    }
    catch { setErr('Invalid credentials.'); }
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const snap = await getDocs(collection(db, 'users'));
      // ✅ FIXED: spread operator … → ...
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    catch { notify('Could not load users', 'error'); }
  };

  const saveRoute = async () => {
    if (!nr.fileName || !nr.fileUrl) { notify('File name and Google Drive link are required', 'error'); return; }
    try {
      // ✅ FIXED: spread operator … → ...
      const data = { ...nr, keywords: (nr.keywords + ' ' + nr.fileName + ' ' + nr.portName).toLowerCase().trim(), uploadedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'routes'), data);
      // ✅ FIXED: spread operator … → ...
      setRoutes(r => [...r, { id: ref.id, ...data }]);
      setNr({ fileName: '', fileUrl: '', portName: '', keywords: '', type: 'Ocean' });
      notify('Route saved ✅', 'success');
    } catch (e) { notify('Error: ' + e.message, 'error'); }
  };

  const saveChart = async () => {
    if (!nc.fileName || !nc.fileUrl || !nc.portName) { notify('File name, port name and link required', 'error'); return; }
    const brandName = ECDIS_BRANDS.find(b => b.id === nc.brand)?.name || nc.brand;
    try {
      // ✅ FIXED: spread operator … → ...
      const data = { ...nc, brand: brandName, brandId: nc.brand, keywords: (nc.keywords + ' ' + nc.portName + ' ' + brandName + ' ' + nc.fileName).toLowerCase().trim(), uploadedAt: serverTimestamp() };
      const ref = await addDoc(collection(db, 'charts'), data);
      // ✅ FIXED: spread operator … → ...
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
      // ✅ FIXED: spread operator … → ...
      setUsers(us => us.map(x => x.id === u.id ? { ...x, blocked: true } : x));
      notify(`⛔ ${u.name || u.email} blocked`, 'success');
    } catch { notify('Failed to block user', 'error'); }
  };

  const unblockUser = async (u) => {
    try {
      await setDoc(doc(db, 'users', u.id), { blocked: false, blockedAt: null }, { merge: true });
      // ✅ FIXED: spread operator … → ...
      setUsers(us => us.map(x => x.id === u.id ? { ...x, blocked: false } : x));
      notify(`✅ ${u.name || u.email} unblocked`, 'success');
    } catch { notify('Failed to unblock user', 'error'); }
  };

  if (!user) return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          {/* ✅ FIXED: var(--gold) and var(--gold2) em dash → double dash */}
          <div className="auth-icon" style={{ background: 'linear-gradient(135deg,var(--gold),var(--gold2))' }}>🛡</div>
          <div className="auth-title">Admin Portal</div>
          <div className="auth-sub">NavisphereX Marine — Admin Only</div>
        </div>
        <div className="ff">
          <label className="fl">Admin Email</label>
          <input className="fi" type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        <div className="ff">
          <label className="fl">Password</label>
          <input className="fi" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        {err && <div className="err-box">{err}</div>}
        {/* ✅ FIXED: var(--gold) and var(--gold2) */}
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
    { k: 'sheet-routes', i: '🔄', l: 'Sheet Routes' },
    { k: 'sheet-charts', i: '🔄', l: 'Sheet Charts' },
    { k: 'port-search',  i: '⚓', l: 'Port Search' },
    { k: 'users',        i: '👥', l: 'User Database' },
  ];

  const GDriveHelp = () => (
    <div className="info-box" style={{ fontSize: '0.74rem' }}>
      📁 <strong style={{ color: 'var(--text)' }}>Google Drive Link Guide:</strong><br />  {/* ✅ FIXED: var(--text) */}
      1. Upload file to <strong>drive.google.com</strong> (ecdisroutes@gmail.com)<br />
      2. Right click → Share → Anyone with link<br />
      3. Copy link: <code style={{ color: 'var(--cyan)' }}>drive.google.com/file/d/ID/view</code><br />  {/* ✅ FIXED */}
      4. Convert to: <code style={{ color: 'var(--green)' }}>drive.google.com/uc?export=download&id=ID</code>  {/* ✅ FIXED */}
    </div>
  );

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
            {/* ✅ FIXED: var(--text3) */}
            <div className="s-item" style={{ fontSize: '0.7rem', color: 'var(--text3)' }}><span>👥</span>{user.email}</div>
            <div className="s-item" onClick={() => signOut(auth)}><span>🚪</span>Logout</div>
          </div>
        </div>

        <div className="adm-content">

          {section === 'dashboard' && (
            <>
              <div className="a-hdr">
                <div className="a-title">📊 Dashboard</div>
                <span style={{ fontSize: '0.72rem', color: 'var(--green)' }}>🔥 Firebase + Google Drive</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(145px,1fr))', gap: '0.8rem', marginBottom: '1.4rem' }}>
                {[
                  { l: 'RTZ Routes (DB)',  v: routes.length,       i: '🗺', c: 'var(--cyan)' },
                  { l: 'Chart Files (DB)', v: charts.length,       i: '📊', c: 'var(--gold)' },
                  { l: 'Sheet Routes',     v: sheetRoutes.length,  i: '🔄', c: 'var(--green)' },
                  { l: 'Sheet Charts',     v: sheetCharts.length,  i: '🔄', c: '#A78BFA' },
                  { l: 'Links Active',     v: [...routes, ...charts].filter(f => f.fileUrl).length, i: '✅', c: 'var(--green)' },
                  { l: 'ECDIS Brands',     v: ECDIS_BRANDS.length, i: '🖥', c: 'var(--text2)' },
                ].map(s => (
                  <div key={s.l} className="file-card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.i}</div>
                    <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.5rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', marginBottom: '0.8rem', color: 'var(--gold)' }}>📋 How to Add Files</div>
                {[
                  '1. FIREBASE (manual): Upload .rtz or chart to Google Drive, get direct link → use Add Route / Add Chart',
                  '2. GOOGLE SHEET (auto): Add rows to your Google Sheet → App Script syncs → click Sheet Routes or Sheet Charts',
                  '3. Sheet data updates live — click Sync Now in Sheet sections to pull latest',
                  '4. Firebase routes/charts need login to download — see User Database tab',
                  '5. Google Sheet rows are shown as-is from the sheet data',
                ].map((t, i) => <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '0.79rem', color: 'var(--text2)' }}>{t}</div>)}
              </div>
            </>
          )}

          {section === 'add-route' && (
            <>
              <div className="a-hdr"><div className="a-title">🗺 Add RTZ Route</div></div>
              <GDriveHelp />
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ff" style={{ gridColumn: '1/-1' }}>
                    <label className="fl">📁 RTZ File Name * (exact name)</label>
                    <input className="fi" placeholder="mumbaitosingapore.rtz" value={nr.fileName} onChange={e => setNr(r => ({ ...r, fileName: e.target.value }))} />
                  </div>
                  <div className="ff" style={{ gridColumn: '1/-1' }}>
                    <label className="fl">🔗 Google Drive Direct Download Link *</label>
                    <input className="fi" placeholder="https://drive.google.com/uc?export=download&id=XXXX" value={nr.fileUrl} onChange={e => setNr(r => ({ ...r, fileUrl: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">📍 Port / Route Description</label>
                    <input className="fi" placeholder="Mumbai to Singapore" value={nr.portName} onChange={e => setNr(r => ({ ...r, portName: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Route Type</label>
                    <select className="fi" value={nr.type} onChange={e => setNr(r => ({ ...r, type: e.target.value }))}>
                      {ROUTE_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="ff" style={{ gridColumn: '1/-1' }}>
                    <label className="fl">🔍 Search Keywords (space separated)</label>
                    <input className="fi" placeholder="mum sin india ocean" value={nr.keywords} onChange={e => setNr(r => ({ ...r, keywords: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={saveRoute}>✅ Save Route to Firebase</button>
              </div>
            </>
          )}

          {section === 'add-chart' && (
            <>
              <div className="a-hdr"><div className="a-title">📊 Add Chart File</div></div>
              <GDriveHelp />
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '1.2rem' }}>
                <div className="ff">
                  <label className="fl">🖥 Select ECDIS Brand *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 5, marginBottom: 8 }}>
                    {ECDIS_BRANDS.map(b => (
                      <div key={b.id} onClick={() => setNc(c => ({ ...c, brand: b.id }))}
                        style={{
                          padding: '6px', borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                          border: `2px solid ${nc.brand === b.id ? b.color : 'var(--border)'}`,
                          background: nc.brand === b.id ? b.color + '22' : 'transparent', transition: 'all 0.2s'
                        }}>
                        <div style={{ fontSize: '1.2rem' }}>{b.emoji}</div>
                        <div style={{ fontSize: '0.6rem', fontWeight: 700, color: nc.brand === b.id ? b.color : 'var(--text2)', fontFamily: 'Orbitron,monospace' }}>{b.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div className="ff">
                    <label className="fl">📁 Chart File Name *</label>
                    <input className="fi" placeholder="mumbai_furuno.bin" value={nc.fileName} onChange={e => setNc(c => ({ ...c, fileName: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">⚓ Port Name *</label>
                    <input className="fi" placeholder="Mumbai" value={nc.portName} onChange={e => setNc(c => ({ ...c, portName: e.target.value }))} />
                  </div>
                  <div className="ff" style={{ gridColumn: '1/-1' }}>
                    <label className="fl">🔗 Google Drive Direct Download Link *</label>
                    <input className="fi" placeholder="https://drive.google.com/uc?export=download&id=XXXX" value={nc.fileUrl} onChange={e => setNc(c => ({ ...c, fileUrl: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Region</label>
                    <input className="fi" placeholder="Arabian Sea" value={nc.region} onChange={e => setNc(c => ({ ...c, region: e.target.value }))} />
                  </div>
                  <div className="ff">
                    <label className="fl">Extra Keywords</label>
                    <input className="fi" placeholder="west coast india" value={nc.keywords} onChange={e => setNc(c => ({ ...c, keywords: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-gold" onClick={saveChart}>✅ Save Chart to Firebase</button>
              </div>
            </>
          )}

          {section === 'routes' && (
            <>
              <div className="a-hdr"><div className="a-title">📋 Manage Routes</div><span className="badge">{routes.length}</span></div>
              <div className="tw">
                <table className="tbl">
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
                </table>
              </div>
            </>
          )}

          {section === 'charts' && (
            <>
              <div className="a-hdr"><div className="a-title">🗂 Manage Charts</div><span className="badge badge-gold">{charts.length}</span></div>
              <div className="tw">
                <table className="tbl">
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
                </table>
              </div>
            </>
          )}

          {section === 'sheet-routes' && (
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Google Sheet — ECDIS Routes</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge">{sheetRoutes.length} rows</span>
                  <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={refreshSheets} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync Now'}
                  </button>
                </div>
              </div>
              <div className="info-box" style={{ fontSize: '0.74rem' }}>
                📡 <strong style={{ color: 'var(--text)' }}>Live Google Sheet Database</strong> — auto-refreshes from your Google Sheet via App Script. Click <strong>Sync Now</strong> to pull the latest data. Rows appear here as soon as you add them to the sheet.<br />
                <span style={{ color: 'var(--cyan)' }}>Sheet ID: 1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE</span>
              </div>
              {sheetLoading
                ? <div className="loading"><div className="spin" /><span>Fetching from Google Sheet…</span></div>
                : sheetRoutes.length === 0
                  ? <div className="empty"><div className="empty-icon">🗺</div><div className="empty-t">No Rows Found</div><div className="empty-d">Add rows to your Google Sheet and click Sync Now</div></div>
                  : <div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>#</th>
                          {Object.keys(sheetRoutes[0] || {}).map(col => <th key={col}>{col}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetRoutes.map((row, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{i + 1}</td>
                            {Object.keys(sheetRoutes[0] || {}).map(col => (
                              <td key={col} style={{ fontSize: '0.76rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {col.toLowerCase().includes('url') || col.toLowerCase().includes('link')
                                  ? row[col]
                                    ? <a href={row[col]} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✅ Link</a>
                                    : <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>❌</span>
                                  : <span style={{ color: col.toLowerCase().includes('name') || col.toLowerCase().includes('file') ? 'var(--cyan)' : 'var(--text2)' }}>{row[col] || '—'}</span>
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
              <div style={{ marginTop: '1rem', padding: '0.9rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.76rem', color: 'var(--text2)' }}>
                💡 <strong style={{ color: 'var(--gold)' }}>How to add routes:</strong> Open your Google Sheet → Add a new row with file name, Google Drive link, port name, type, keywords → The sheet auto-updates via App Script → Click <strong>Sync Now</strong> to reflect here.
              </div>
            </>
          )}

          {section === 'sheet-charts' && (
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Google Sheet — ECDIS Charts</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-gold">{sheetCharts.length} rows</span>
                  <button className="btn btn-gold" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={refreshSheets} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync Now'}
                  </button>
                </div>
              </div>
              <div className="info-box" style={{ fontSize: '0.74rem' }}>
                📡 <strong style={{ color: 'var(--text)' }}>Live Google Sheet Database</strong> — includes ECDIS model info. Auto-refreshes from your Google Drive / App Script pipeline.<br />
                <span style={{ color: 'var(--gold)' }}>Sheet ID: 1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA</span>
              </div>
              {sheetLoading
                ? <div className="loading"><div className="spin" /><span>Fetching from Google Sheet…</span></div>
                : sheetCharts.length === 0
                  ? <div className="empty"><div className="empty-icon">📊</div><div className="empty-t">No Rows Found</div><div className="empty-d">Add rows to your ECDIS Charts Google Sheet and click Sync Now</div></div>
                  : <>
                    {/* Brand summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 6, marginBottom: '1rem' }}>
                      {ECDIS_BRANDS.map(b => {
                        const brandCol = Object.keys(sheetCharts[0] || {}).find(k => k.toLowerCase().includes('brand') || k.toLowerCase().includes('ecdis'));
                        const cnt = brandCol ? sheetCharts.filter(r => r[brandCol]?.toLowerCase().includes(b.name.toLowerCase()) || r[brandCol]?.toLowerCase().includes(b.id)).length : 0;
                        if (cnt === 0) return null;
                        return (
                          <div key={b.id} style={{ padding: '8px', borderRadius: 9, border: `1px solid ${b.color}55`, background: `${b.color}11`, textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem' }}>{b.emoji}</div>
                            <div style={{ fontSize: '0.58rem', fontFamily: 'Orbitron,monospace', fontWeight: 700, color: b.color }}>{b.name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--green)', fontWeight: 700 }}>{cnt} chart{cnt > 1 ? 's' : ''}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="tw">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>#</th>
                            {Object.keys(sheetCharts[0] || {}).map(col => <th key={col}>{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetCharts.map((row, i) => {
                            const brandCol = Object.keys(row).find(k => k.toLowerCase().includes('brand') || k.toLowerCase().includes('ecdis'));
                            const brand = brandCol ? ECDIS_BRANDS.find(b => row[brandCol]?.toLowerCase().includes(b.name.toLowerCase()) || row[brandCol]?.toLowerCase().includes(b.id)) : null;
                            return (
                              <tr key={i}>
                                <td style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{i + 1}</td>
                                {Object.keys(sheetCharts[0] || {}).map(col => (
                                  <td key={col} style={{ fontSize: '0.76rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {col.toLowerCase().includes('url') || col.toLowerCase().includes('link')
                                      ? row[col]
                                        ? <a href={row[col]} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✅ Link</a>
                                        : <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>❌</span>
                                      : col === brandCol && brand
                                        ? <span style={{ color: brand.color, fontWeight: 600 }}>{brand.emoji} {row[col]}</span>
                                        : <span style={{ color: col.toLowerCase().includes('model') ? '#A78BFA' : col.toLowerCase().includes('name') || col.toLowerCase().includes('file') ? 'var(--gold)' : 'var(--text2)' }}>{row[col] || '—'}</span>
                                    }
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
              }
              <div style={{ marginTop: '1rem', padding: '0.9rem', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.76rem', color: 'var(--text2)' }}>
                💡 <strong style={{ color: 'var(--gold)' }}>How to add charts:</strong> Open your ECDIS Charts Google Sheet → Add a row with file name, brand, ECDIS model, port, Google Drive link → App Script updates the sheet → Click <strong>Sync Now</strong> here.
              </div>
            </>
          )}

          {section === 'port-search' && (
            <>
              <div className="a-hdr">
                <div className="a-title">⚓ Port Search Database</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="badge">{sheetRoutes.length > 0 || sheetCharts.length > 0 ? 'Synced' : 'Not synced'}</span>
                  <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={refreshSheets} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync Port Database'}
                  </button>
                </div>
              </div>
              <div className="info-box">
                📡 Syncs all 3000+ ports from your Google Sheet into the Port Search and Route Planner. Click <strong>Sync Port Database</strong> to reload all port data from your sheet.
                <br /><span style={{ color: 'var(--cyan)', fontSize: '0.72rem' }}>Sheet ID: 1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk</span>
              </div>
              <PortSearchPage portsDb={sheetRoutes.length > 0 ? PORTS_DB : []} sheetLoading={sheetLoading} refreshSheets={refreshSheets} />
            </>
          )}

          {section === 'users' && (
            <>
              <div className="a-hdr">
                <div className="a-title">👥 User Database</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-green">{users.length} registered</span>
                  <span className="badge" style={{ background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)' }}>
                    {users.filter(u => u.blocked).length} blocked
                  </span>
                  <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '0.72rem' }} onClick={loadUsers}>🔄 Refresh</button>
                </div>
              </div>
              <div className="info-box">
                🛡 <strong style={{ color: 'var(--text)' }}>Access Control</strong> — Block suspicious users instantly. Blocked users are auto-logged out and shown a warning with your contact info when they try to login again.
              </div>
              {users.length === 0
                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users appear here after they register</div></div>
                : <div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>{users.map((u, i) => (
                      <tr key={u.id} style={{ opacity: u.blocked ? 0.7 : 1, background: u.blocked ? 'rgba(255,60,60,0.04)' : 'transparent' }}>
                        <td style={{ color: 'var(--text3)' }}>{i + 1}</td>
                        <td style={{ color: u.blocked ? '#ff6b6b' : 'var(--cyan)', fontWeight: 600 }}>
                          {u.blocked && <span style={{ marginRight: 4 }}>⛔</span>}{u.name || '—'}
                        </td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{u.email}</td>
                        <td style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>{u.phone || '—'}</td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.72rem' }}>{u.createdAt?.toDate?.()?.toLocaleDateString() || '—'}</td>
                        <td>
                          {u.blocked
                            ? <span style={{ background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 5, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>⛔ BLOCKED</span>
                            : <span style={{ background: 'rgba(0,200,100,0.12)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>✅ ACTIVE</span>
                          }
                        </td>
                        <td>
                          {u.blocked
                            ? <button
                              style={{ background: 'rgba(0,200,100,0.15)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => unblockUser(u)}>
                              ✅ Unblock
                            </button>
                            : <button
                              style={{ background: 'rgba(255,60,60,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => { if (window.confirm(`Block ${u.name || u.email}? They will be logged out immediately.`)) blockUser(u); }}>
                              ⛔ Block
                            </button>
                          }
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              }
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default AdminPage;
