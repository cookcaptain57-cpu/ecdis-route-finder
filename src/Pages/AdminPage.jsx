/* eslint-disable */
import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import {
  collection, getDocs, addDoc, deleteDoc, doc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { ADMIN_EMAIL, ECDIS_BRANDS, ROUTE_TYPES, PORTS_DB } from "../constants";
import PortSearchPage from "./PortSearchPage";

function AdminPage({
  notify, routes, setRoutes, charts, setCharts,
  sheetRoutes, sheetCharts,
  refreshSheets, refreshRoutes, refreshCharts, refreshPorts,
  sheetLoading,
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

  useEffect(() => { const u = onAuthStateChanged(auth, u => setUser(u)); return () => u(); }, []);
  useEffect(() => { if (user && section === 'users') loadUsers(); }, [user, section]);

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
        <div className="ff">
          <label className="fl">Admin Email</label>
          <input className="fi" type="email" placeholder="admin@example.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        <div className="ff">
          <label className="fl">Password</label>
          <input className="fi" type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
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
      1. Upload file to Google Drive → Right click → Share → Anyone with link<br />
      2. Copy link: <code style={{ color: 'var(--cyan)' }}>drive.google.com/file/d/ID/view</code><br />
      3. Convert to: <code style={{ color: 'var(--green)' }}>drive.google.com/uc?export=download&id=ID</code>
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--green)' }}>🔥 Firebase + Google Drive</span>
                  <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.7rem' }} onClick={refreshSheets} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync All from Sheet'}
                  </button>
                </div>
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
              <div className="info-box">
                <strong style={{ color: 'var(--gold)' }}>📋 How syncing works:</strong><br />
                Upload files to Google Drive → App Script adds file name + link to Google Sheet automatically →
                Come here and click <strong>Sync Routes / Sync Charts / Sync Ports</strong> →
                Data saves to Firebase permanently → All users see updated data instantly. No repeated syncing needed.
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
                  <div className="ff" style={{ gridColumn: '1/-1' }}>
                    <label className="fl">📁 RTZ File Name *</label>
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
                    <label className="fl">🔍 Search Keywords</label>
                    <input className="fi" placeholder="mum sin india ocean" value={nr.keywords} onChange={e => setNr(r => ({ ...r, keywords: e.target.value }))} />
                  </div>
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
                <div className="ff">
                  <label className="fl">🖥 Select ECDIS Brand *</label>
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

          {/* ─── MANAGE CHARTS ─────────────────────────────────────────── */}
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

          {/* ─── SYNC ROUTES (Sheet → Firebase) ────────────────────────── */}
          {section === 'sheet-routes' && (
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Sync Routes — Sheet → Firebase</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge">{sheetRoutes.length} in Firebase</span>
                  {/* ✅ FIX: Only syncs routes, not everything */}
                  <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={refreshRoutes} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync Routes Now'}
                  </button>
                </div>
              </div>
              <div className="info-box" style={{ fontSize: '0.74rem' }}>
                📡 Fetches route file names + Google Drive links from your Google Sheet and saves them permanently to Firebase.
                All users will see updated routes immediately after sync.<br />
                <span style={{ color: 'var(--cyan)' }}>Sheet ID: {'{ROUTE_SHEET_ID}'}</span>
              </div>
              {sheetLoading
                ? <div className="loading"><div className="spin" /><span>Fetching routes from Google Sheet → Saving to Firebase…</span></div>
                : sheetRoutes.length === 0
                  ? <div className="empty"><div className="empty-icon">🗺</div><div className="empty-t">No Routes in Firebase Yet</div><div className="empty-d">Add rows to your Google Sheet then click Sync Routes Now</div></div>
                  : <div className="tw">
                    <table className="tbl">
                      <thead><tr><th>#</th>{Object.keys(sheetRoutes[0] || {}).map(col => <th key={col}>{col}</th>)}</tr></thead>
                      <tbody>{sheetRoutes.map((row, i) => (
                        <tr key={i}>
                          <td style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{i + 1}</td>
                          {Object.keys(sheetRoutes[0] || {}).map(col => (
                            <td key={col} style={{ fontSize: '0.76rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {col.toLowerCase().includes('url') || col.toLowerCase().includes('link')
                                ? row[col] ? <a href={row[col]} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✅ Link</a> : <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>❌</span>
                                : <span style={{ color: col.toLowerCase().includes('name') || col.toLowerCase().includes('file') ? 'var(--cyan)' : 'var(--text2)' }}>{row[col] || '—'}</span>}
                            </td>
                          ))}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
              }
            </>
          )}

          {/* ─── SYNC CHARTS (Sheet → Firebase) ────────────────────────── */}
          {section === 'sheet-charts' && (
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Sync Charts — Sheet → Firebase</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-gold">{sheetCharts.length} in Firebase</span>
                  {/* ✅ FIX: Only syncs charts, not everything */}
                  <button className="btn btn-gold" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={refreshCharts} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync Charts Now'}
                  </button>
                </div>
              </div>
              <div className="info-box" style={{ fontSize: '0.74rem' }}>
                📡 Fetches ECDIS chart file names + links from your Google Sheet and saves permanently to Firebase.
                All users see updated charts immediately after sync.
              </div>
              {sheetLoading
                ? <div className="loading"><div className="spin" /><span>Fetching charts from Google Sheet → Saving to Firebase…</span></div>
                : sheetCharts.length === 0
                  ? <div className="empty"><div className="empty-icon">📊</div><div className="empty-t">No Charts in Firebase Yet</div><div className="empty-d">Add rows to your ECDIS Charts Google Sheet then click Sync Charts Now</div></div>
                  : <div className="tw">
                    <table className="tbl">
                      <thead><tr><th>#</th>{Object.keys(sheetCharts[0] || {}).map(col => <th key={col}>{col}</th>)}</tr></thead>
                      <tbody>{sheetCharts.map((row, i) => {
                        const brandCol = Object.keys(row).find(k => k.toLowerCase().includes('brand') || k.toLowerCase().includes('ecdis'));
                        const brand = brandCol ? ECDIS_BRANDS.find(b => row[brandCol]?.toLowerCase().includes(b.name.toLowerCase()) || row[brandCol]?.toLowerCase().includes(b.id)) : null;
                        return (
                          <tr key={i}>
                            <td style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>{i + 1}</td>
                            {Object.keys(sheetCharts[0] || {}).map(col => (
                              <td key={col} style={{ fontSize: '0.76rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {col.toLowerCase().includes('url') || col.toLowerCase().includes('link')
                                  ? row[col] ? <a href={row[col]} target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontSize: '0.7rem' }}>✅ Link</a> : <span style={{ color: 'var(--red)', fontSize: '0.7rem' }}>❌</span>
                                  : col === brandCol && brand
                                    ? <span style={{ color: brand.color, fontWeight: 600 }}>{brand.emoji} {row[col]}</span>
                                    : <span style={{ color: col.toLowerCase().includes('name') || col.toLowerCase().includes('file') ? 'var(--gold)' : 'var(--text2)' }}>{row[col] || '—'}</span>}
                              </td>
                            ))}
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
              }
            </>
          )}

          {/* ─── SYNC PORTS (Sheet → Firebase) ─────────────────────────── */}
          {section === 'port-search' && (
            <>
              <div className="a-hdr">
                <div className="a-title">⚓ Sync Ports — Sheet → Firebase</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* ✅ FIX: Only syncs ports, not everything */}
                  <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.72rem' }} onClick={refreshPorts} disabled={sheetLoading}>
                    {sheetLoading ? '⏳ Syncing…' : '🔄 Sync Port Database'}
                  </button>
                </div>
              </div>
              <div className="info-box">
                📡 Fetches all 25,000+ ports from your Google Sheet and saves permanently to Firebase.
                Route Planner and Port Search will use this data for all users instantly after sync.
              </div>
              <PortSearchPage portsDb={PORTS_DB} sheetLoading={sheetLoading} refreshSheets={refreshPorts} />
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
              <div className="info-box">🛡 <strong style={{ color: 'var(--text)' }}>Access Control</strong> — Block suspicious users instantly. Blocked users are auto-logged out.</div>
              {users.length === 0
                ? <div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users appear here after they register</div></div>
                : <div className="tw">
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>{users.map((u, i) => (
                      <tr key={u.id} style={{ opacity: u.blocked ? 0.7 : 1, background: u.blocked ? 'rgba(255,60,60,0.04)' : 'transparent' }}>
                        <td style={{ color: 'var(--text3)' }}>{i + 1}</td>
                        <td style={{ color: u.blocked ? '#ff6b6b' : 'var(--cyan)', fontWeight: 600 }}>{u.blocked && <span style={{ marginRight: 4 }}>⛔</span>}{u.name || '—'}</td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.78rem' }}>{u.email}</td>
                        <td style={{ color: 'var(--gold)', fontSize: '0.78rem' }}>{u.phone || '—'}</td>
                        <td style={{ color: 'var(--text2)', fontSize: '0.72rem' }}>{u.createdAt?.toDate?.()?.toLocaleDateString() || '—'}</td>
                        <td>{u.blocked
                          ? <span style={{ background: 'rgba(255,60,60,0.15)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 5, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>⛔ BLOCKED</span>
                          : <span style={{ background: 'rgba(0,200,100,0.12)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.25)', borderRadius: 5, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>✅ ACTIVE</span>}
                        </td>
                        <td>{u.blocked
                          ? <button style={{ background: 'rgba(0,200,100,0.15)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => unblockUser(u)}>✅ Unblock</button>
                          : <button style={{ background: 'rgba(255,60,60,0.12)', color: '#ff6b6b', border: '1px solid rgba(255,60,60,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => { if (window.confirm(`Block ${u.name || u.email}?`)) blockUser(u); }}>⛔ Block</button>}
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
