/* eslint-disable */
// src/pages/ChartsPage.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ECDIS_BRANDS } from "../constants";
import { ADMIN_EMAIL } from "../constants";

// ── Download limit helpers ─────────────────────────────────────────────────
const getTodayKey = () => new Date().toISOString().slice(0, 10);

const checkDownloadLimit = async (uid, isAdminUser) => {
  if (isAdminUser) return { allowed: true, remaining: 9999, max: 9999 };
  try {
    const [limitsSnap, countSnap] = await Promise.all([
      getDoc(doc(db, 'app_config', 'limits')),
      getDoc(doc(db, 'download_counts', `${uid}_${getTodayKey()}`)),
    ]);
    const limits    = limitsSnap.exists() ? limitsSnap.data() : {};
    const maxPerDay = Number(limits.maxChartsPerDay ?? 10);
    const counts    = countSnap.exists() ? countSnap.data() : {};
    const current   = Number(counts.charts ?? 0);
    return { allowed: current < maxPerDay, remaining: Math.max(0, maxPerDay - current), max: maxPerDay, current };
  } catch { return { allowed: true, remaining: 10, max: 10 }; }
};

const incrementDownloadCount = async (uid) => {
  try {
    const ref    = doc(db, 'download_counts', `${uid}_${getTodayKey()}`);
    const snap   = await getDoc(ref);
    const counts = snap.exists() ? snap.data() : {};
    await setDoc(ref, { ...counts, charts: Number(counts.charts ?? 0) + 1 }, { merge: true });
  } catch {}
};

// ──────────────────────────────────────────────────────────────────────────

function ChartsPage({ notify, user, setTab, isAdmin: isAdminProp, sheetCharts = [], sheetLoading }) {
  const [selBrand, setSelBrand]           = useState(null);
  const [q, setQ]                         = useState('');
  const [globalQ, setGlobalQ]             = useState('');
  const [globalResults, setGlobalResults] = useState([]);
  const [globalSearching, setGlobalSearching] = useState(false);
  const [globalSearched,  setGlobalSearched]  = useState(false);
  const [brandResults,    setBrandResults]    = useState([]);
  const [brandSearching,  setBrandSearching]  = useState(false);
  const debounceRef = useRef(null);
  const debRef2     = useRef(null);

  const isAdmin = isAdminProp || user?.email === ADMIN_EMAIL;
  const sb = ECDIS_BRANDS.find(b => b.id === selBrand);

  const doGlobalSearch = (sq) => {
    const s = (sq !== undefined ? sq : globalQ).trim();
    if (!s || s.length < 2) return;
    setGlobalSearching(true); setGlobalSearched(true); setSelBrand(null);
    const ql = s.toLowerCase();
    const res = sheetCharts.filter(r => {
      const hay = Object.values(r).filter(v => v && typeof v === 'string').join(' ').toLowerCase();
      return hay.includes(ql);
    }).slice(0, 50);
    setGlobalResults(res);
    setGlobalSearching(false);
  };

  const handleGlobalChange = e => {
    const v = e.target.value;
    setGlobalQ(v); setGlobalResults([]); setGlobalSearched(false);
    clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) debounceRef.current = setTimeout(() => doGlobalSearch(v), 200);
  };

  const doBrandSearch = (sq, brand) => {
    const s = (sq !== undefined ? sq : q).trim();
    const b = brand || sb;
    if (!b) return;
    setBrandSearching(true);
    const ql  = s.toLowerCase();
    const res = sheetCharts.filter(r => {
      const hay = Object.values(r).filter(v => v && typeof v === 'string').join(' ').toLowerCase();
      const brandMatch = hay.includes(b.name.toLowerCase()) || hay.includes(b.id.toLowerCase());
      const queryMatch = !s || hay.includes(ql);
      return brandMatch && queryMatch;
    }).slice(0, 50);
    setBrandResults(res);
    setBrandSearching(false);
  };

  useEffect(() => {
    if (selBrand) { setQ(''); setBrandResults([]); doBrandSearch('', ECDIS_BRANDS.find(b => b.id === selBrand)); }
  }, [selBrand, sheetCharts]);

  useEffect(() => {
    if (globalQ && globalQ.trim().length >= 2 && sheetCharts.length > 0) doGlobalSearch(globalQ);
    if (selBrand && sheetCharts.length > 0) doBrandSearch(q, ECDIS_BRANDS.find(b => b.id === selBrand));
  }, [sheetCharts]);

  const handleBrandQ = e => {
    const v = e.target.value; setQ(v);
    clearTimeout(debRef2.current);
    debRef2.current = setTimeout(() => doBrandSearch(v), 200);
  };

  const handleDL = async (c) => {
    if (!user) { notify('Login required to download', 'error'); setTab('login'); return; }

    // ── Check daily download limit ──────────────────────────────────────
    const limit = await checkDownloadLimit(user.uid, isAdmin);
    if (!limit.allowed) {
      notify(
        `⛔ Daily limit reached (${limit.max} charts/day). Try again tomorrow or contact admin: @manish_the_navigator`,
        'error'
      );
      return;
    }

    const url = c['File URL'] || c.fileUrl || c['Drive Link'] ||
      Object.values(c).find(v => typeof v === 'string' && v.includes('drive.google'));
    if (!url) { notify('No download link', 'error'); return; }

    notify(`⬇ Downloading… (${isAdmin ? '∞' : limit.remaining - 1} remaining today)`, 'success');
    try {
      const gd = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const direct = gd ? `https://drive.google.com/uc?export=download&id=${gd[1]}` : url;
      const res = await fetch(direct);
      if (!res.ok) throw new Error('fetch');
      const blob  = await res.blob();
      const fname = c['File Name'] || c.fileName || 'chart';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      if (!isAdmin) await incrementDownloadCount(user.uid);
      notify(`✅ Downloaded${isAdmin ? '' : ` (${limit.remaining - 1} left today)`}`, 'success');
    } catch {
      window.open(url, '_blank');
      if (!isAdmin) await incrementDownloadCount(user.uid);
      notify('Opened in browser — save the file', 'success');
    }
  };

  const getName = r => r['File Name'] || r.fileName || r['Chart Name'] ||
    Object.values(r).find(v => v && typeof v === 'string' && v.length > 2 && !v.startsWith('http')) || 'Chart File';

  const getBrand = r => {
    const hay = Object.values(r).filter(v => v && typeof v === 'string').join(' ').toLowerCase();
    return ECDIS_BRANDS.find(b => hay.includes(b.name.toLowerCase()) || hay.includes(b.id)) || null;
  };

  const ResultCard = ({ r }) => {
    const b = getBrand(r);
    return (
      <div className="file-card">
        <div className="file-icon">📊</div>
        <div className="file-name">{getName(r)}</div>
        {b && <div style={{ fontSize: '0.7rem', color: b.color, marginBottom: 4 }}>{b.emoji} {b.name}</div>}
        <div className="file-tags">
          <span className="ftag tag-chart">Chart File</span>
          <span className="ftag" style={{ background: 'rgba(0,200,100,0.07)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>Firebase</span>
        </div>
        {user
          ? <button className="dl-btn" onClick={() => handleDL(r)}>⬇ Download</button>
          : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>}
      </div>
    );
  };

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">📊 ECDIS Charts</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {sheetCharts.length > 0 && <span className="badge badge-gold">{sheetCharts.length.toLocaleString()} in database</span>}
          {globalSearched && <span className="badge badge-gold">{globalResults.length} results</span>}
          {sheetLoading && <span className="badge" style={{ background: 'rgba(0,180,216,0.08)', color: 'var(--cyan)' }}>⏳ Loading…</span>}
        </div>
      </div>

      {/* Download limit notice */}
      {user && !isAdmin && (
        <div style={{ background: 'rgba(240,165,0,0.06)', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.8rem' }}>
          📥 Free account: up to <strong style={{ color: 'var(--gold)' }}>10 chart downloads per day</strong>. Resets at midnight.
        </div>
      )}
      {isAdmin && (
        <div style={{ background: 'rgba(0,200,100,0.06)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--green)', marginBottom: '0.8rem' }}>
          🛡 Admin account — unlimited downloads
        </div>
      )}

      {/* Global search */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <div className="siw" style={{ flex: 1 }}>
            <span className="si-ic">🔍</span>
            <input className="si" style={{ paddingLeft: 42 }}
              placeholder={sheetCharts.length > 0 ? `Search ${sheetCharts.length.toLocaleString()} ECDIS charts — port, model, file name…` : 'Search ECDIS charts…'}
              value={globalQ} onChange={handleGlobalChange}
              onKeyDown={e => e.key === 'Enter' && doGlobalSearch()} />
          </div>
          <button className="btn btn-gold" style={{ padding: '0 14px' }} onClick={() => doGlobalSearch()}>Search</button>
          {globalQ && <button className="btn btn-secondary" onClick={() => { setGlobalQ(''); setGlobalResults([]); setGlobalSearched(false); }}>✕</button>}
        </div>

        {sheetLoading && !globalSearched && (
          <div className="loading" style={{ padding: '8px 0' }}><div className="spin" /><span>Loading chart database from Firebase…</span></div>
        )}
        {!sheetLoading && sheetCharts.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🗄</div>
            <div className="empty-t">No Charts in Firebase Yet</div>
            <div className="empty-d">Admin needs to sync charts from Google Sheet to Firebase first.</div>
          </div>
        )}
        {globalSearching && <div className="loading" style={{ padding: '8px 0' }}><div className="spin" /><span>Searching…</span></div>}
        {globalSearched && !globalSearching && globalResults.length === 0 && (
          <div style={{ color: 'var(--text3)', fontSize: '0.78rem', padding: '6px 0', textAlign: 'center' }}>No charts found — try different keywords</div>
        )}
        {globalResults.length > 0 && (
          <div className="files-grid" style={{ marginTop: 8 }}>
            {globalResults.map((r, i) => <ResultCard key={i} r={r} />)}
          </div>
        )}
      </div>

      {/* Brand browse */}
      {sheetCharts.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.8rem', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            — Or browse by ECDIS brand —
          </div>

          {!selBrand && (
            <div className="brand-grid">
              {ECDIS_BRANDS.map(b => {
                const cnt = sheetCharts.filter(r => {
                  const hay = Object.values(r).filter(v => v && typeof v === 'string').join(' ').toLowerCase();
                  return hay.includes(b.name.toLowerCase()) || hay.includes(b.id.toLowerCase());
                }).length;
                return (
                  <div key={b.id} className="brand-card" style={{ borderColor: b.color + '44' }}
                    onClick={() => { setSelBrand(b.id); setGlobalQ(''); setGlobalResults([]); setGlobalSearched(false); }}>
                    <div className="brand-emoji">{b.emoji}</div>
                    <div className="brand-name" style={{ color: b.color }}>{b.name}</div>
                    <div className="brand-models">{b.models}</div>
                    {cnt > 0 && <div style={{ fontSize: '0.62rem', color: 'var(--green)', marginTop: 4, fontWeight: 700 }}>{cnt} charts</div>}
                  </div>
                );
              })}
            </div>
          )}

          {selBrand && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={() => { setSelBrand(null); setBrandResults([]); setQ(''); }}>← Back</button>
                <span style={{ fontSize: '1.4rem' }}>{sb?.emoji}</span>
                <div>
                  <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.88rem', fontWeight: 700, color: sb?.color }}>{sb?.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{sb?.models}</div>
                </div>
                <span className="badge badge-gold">{brandResults.length} charts</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: '0.8rem' }}>
                <div className="siw" style={{ flex: 1 }}>
                  <span className="si-ic">🔍</span>
                  <input className="si" style={{ paddingLeft: 42 }} autoFocus
                    placeholder={`Search ${sb?.name} charts by port or file name…`}
                    value={q} onChange={handleBrandQ}
                    onKeyDown={e => e.key === 'Enter' && doBrandSearch(q)} />
                </div>
                {q && <button className="btn btn-secondary" onClick={() => { setQ(''); doBrandSearch(''); }}>✕</button>}
              </div>
              {brandSearching && <div className="loading"><div className="spin" /><span>Searching {sb?.name} charts…</span></div>}
              {!brandSearching && brandResults.length === 0 && (
                <div className="empty">
                  <div className="empty-icon">{sb?.emoji}</div>
                  <div className="empty-t">No {sb?.name} Charts Found</div>
                  <div className="empty-d">Try a port name or leave blank to see all {sb?.name} charts</div>
                </div>
              )}
              {brandResults.length > 0 && (
                <div className="files-grid">{brandResults.map((r, i) => <ResultCard key={i} r={r} />)}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChartsPage;
