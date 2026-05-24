/* eslint-disable */
// src/pages/RoutesPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ADMIN_EMAIL } from "../constants";

// ── Download limit helpers ─────────────────────────────────────────────────
const getTodayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const checkDownloadLimit = async (uid, isAdminUser) => {
  if (isAdminUser) return { allowed: true, remaining: 9999, max: 9999 };
  try {
    const [limitsSnap, countSnap] = await Promise.all([
      getDoc(doc(db, 'app_config', 'limits')),
      getDoc(doc(db, 'download_counts', `${uid}_${getTodayKey()}`)),
    ]);
    const limits    = limitsSnap.exists() ? limitsSnap.data() : {};
    const maxPerDay = Number(limits.maxRoutesPerDay ?? 10);
    const counts    = countSnap.exists() ? countSnap.data() : {};
    const current   = Number(counts.routes ?? 0);
    return { allowed: current < maxPerDay, remaining: Math.max(0, maxPerDay - current), max: maxPerDay, current };
  } catch { return { allowed: true, remaining: 10, max: 10 }; } // fail open
};

const incrementDownloadCount = async (uid) => {
  try {
    const ref   = doc(db, 'download_counts', `${uid}_${getTodayKey()}`);
    const snap  = await getDoc(ref);
    const counts = snap.exists() ? snap.data() : {};
    await setDoc(ref, { ...counts, routes: Number(counts.routes ?? 0) + 1 }, { merge: true });
  } catch {}
};

// ──────────────────────────────────────────────────────────────────────────

function RoutesPage({ searchQuery, notify, user, setTab, sheetRoutes = [], sheetLoading }) {
  const [q, setQ]               = useState(searchQuery || '');
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sugg, setSugg]         = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const debounceRef             = useRef(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const liveSearch = useCallback((searchQ) => {
    const sq = (searchQ !== undefined ? searchQ : q).trim();
    if (!sq || sq.length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true); setSearched(true); setShowSugg(false);
    const ql = sq.toLowerCase();
    const res = sheetRoutes.filter(r => {
      const hay = Object.values(r).filter(v => v && typeof v === 'string').join(' ').toLowerCase();
      return hay.includes(ql);
    }).slice(0, 50);
    setResults(res);
    setSearching(false);
  }, [q, sheetRoutes]);

  useEffect(() => {
    if (searchQuery && searchQuery.trim()) { setQ(searchQuery); liveSearch(searchQuery); }
  }, [searchQuery]);

  useEffect(() => {
    if (q && q.trim().length >= 2 && sheetRoutes.length > 0) liveSearch(q);
  }, [sheetRoutes]);

  const handleChange = e => {
    const v = e.target.value;
    setQ(v); setResults([]); setSearched(false);
    clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setSugg([]); setShowSugg(false); return; }
    const ql = v.toLowerCase();
    const names = new Set();
    sheetRoutes.forEach(r => {
      const nm = r['File Name'] || r['Route Name'] || r.fileName || '';
      if (nm && nm.toLowerCase().includes(ql)) names.add(nm);
    });
    setSugg([...names].slice(0, 8));
    setShowSugg(true);
    debounceRef.current = setTimeout(() => liveSearch(v), 200);
  };

  const handleDL = async (r) => {
    if (!user) { notify('Login required to download', 'error'); setTab('login'); return; }

    // ── Check daily download limit ──────────────────────────────────────
    const limit = await checkDownloadLimit(user.uid, isAdmin);
    if (!limit.allowed) {
      notify(
        `⛔ Daily limit reached (${limit.max} routes/day). Try again tomorrow or contact admin on Instagram: @manish_the_navigator`,
        'error'
      );
      return;
    }

    const url = r['File URL'] || r.fileUrl || r['Drive Link'] || r['Download URL'] ||
      Object.values(r).find(v => typeof v === 'string' && (v.includes('drive.google') || v.includes('googleapis')));
    if (!url) { notify('No download link for this file', 'error'); return; }

    notify(`⬇ Downloading… (${isAdmin ? '∞' : limit.remaining - 1} remaining today)`, 'success');
    try {
      const gd = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      const direct = gd ? `https://drive.google.com/uc?export=download&id=${gd[1]}` : url;
      const res = await fetch(direct);
      if (!res.ok) throw new Error('fetch failed');
      const blob  = await res.blob();
      const fname = r['File Name'] || r.fileName || gd?.[1] || 'route';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = fname;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(a.href);
      // ── Increment count after successful download ───────────────────
      if (!isAdmin) await incrementDownloadCount(user.uid);
      notify(`✅ Downloaded: ${fname}${isAdmin ? '' : ` (${limit.remaining - 1} left today)`}`, 'success');
    } catch {
      window.open(url, '_blank');
      if (!isAdmin) await incrementDownloadCount(user.uid);
      notify('Opened in browser — save the file', 'success');
    }
  };

  const getName = r => r['File Name'] || r.fileName || r['Route Name'] ||
    Object.values(r).find(v => v && typeof v === 'string' && v.length > 2 && !v.startsWith('http')) || 'Route File';
  const getPort = r => r['Port Name'] || r.portName || r['From'] || r['Route Description'] || '';

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">🛤 Route Files</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {sheetRoutes.length > 0 && <span className="badge">{sheetRoutes.length.toLocaleString()} in database</span>}
          {results.length > 0 && <span className="badge" style={{ background: 'rgba(0,200,100,0.1)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>{results.length} results</span>}
          {sheetLoading && <span className="badge" style={{ background: 'rgba(0,180,216,0.08)', color: 'var(--cyan)' }}>⏳ Loading…</span>}
        </div>
      </div>

      {/* Download limit notice for non-admin */}
      {user && !isAdmin && (
        <div style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.18)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.8rem' }}>
          📥 Free account: up to <strong style={{ color: 'var(--cyan)' }}>10 route downloads per day</strong>. Resets at midnight.
        </div>
      )}
      {isAdmin && (
        <div style={{ background: 'rgba(0,200,100,0.06)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--green)', marginBottom: '0.8rem' }}>
          🛡 Admin account — unlimited downloads
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="siw" style={{ flex: 1 }}>
            <span className="si-ic">🔍</span>
            <input className="si" style={{ paddingLeft: 42 }} autoFocus
              placeholder={sheetRoutes.length > 0 ? `Search ${sheetRoutes.length.toLocaleString()} route files…` : 'Search route files by port, name, keyword…'}
              value={q} onChange={handleChange}
              onFocus={() => sugg.length > 0 && setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 180)}
              onKeyDown={e => e.key === 'Enter' && liveSearch()} />
          </div>
          <button className="btn btn-primary" style={{ padding: '0 16px' }} onClick={() => liveSearch()}>Search</button>
          {q && <button className="btn btn-secondary" onClick={() => { setQ(''); setResults([]); setSugg([]); setSearched(false); }}>✕</button>}
        </div>

        {showSugg && sugg.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 28px rgba(0,0,0,0.5)', marginTop: 4, overflow: 'hidden' }}>
            {sugg.map((s, i) => (
              <div key={i} onMouseDown={() => { setQ(s); setShowSugg(false); liveSearch(s); }}
                style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--cyan)' }}>🔎</span>
                <span style={{ fontSize: '0.84rem' }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="fbar" style={{ marginBottom: '0.8rem' }}>
        {['Mumbai','Singapore','Dubai','Rotterdam','Colombo','Karachi','Fujairah','Shanghai'].map(p => (
          <button key={p} className={`fbtn ${q === p ? 'active' : ''}`} onClick={() => { setQ(p); liveSearch(p); }}>{p}</button>
        ))}
      </div>

      {sheetLoading && !searched && (
        <div className="loading"><div className="spin" /><span>Loading route database from Firebase…</span></div>
      )}
      {!sheetLoading && sheetRoutes.length === 0 && !searched && (
        <div className="empty">
          <div className="empty-icon">🗄</div>
          <div className="empty-t">No Data in Firebase Yet</div>
          <div className="empty-d">Admin needs to sync routes from Google Sheet to Firebase first.</div>
        </div>
      )}
      {!searched && !searching && sheetRoutes.length > 0 && (
        <div className="empty">
          <div className="empty-icon">🛤</div>
          <div className="empty-t">Search {sheetRoutes.length.toLocaleString()} Route Files</div>
          <div className="empty-d">Type a port name or keyword above — results appear instantly</div>
        </div>
      )}
      {searching && <div className="loading"><div className="spin" /><span>Searching…</span></div>}
      {searched && !searching && results.length === 0 && (
        <div className="empty"><div className="empty-icon">🔍</div><div className="empty-t">No Routes Found</div><div className="empty-d">Try different keywords or partial port name</div></div>
      )}

      {results.length > 0 && (
        <div className="files-grid">
          {results.map((r, i) => (
            <div key={i} className="file-card">
              <div className="file-icon">🛤</div>
              <div className="file-name">{getName(r)}</div>
              {getPort(r) && <div className="file-port">📍 {getPort(r)}</div>}
              <div className="file-tags">
                <span className="ftag tag-rtz">Route File</span>
                <span className="ftag" style={{ background: 'rgba(0,200,100,0.07)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>Firebase</span>
              </div>
              {user
                ? <button className="dl-btn" onClick={() => handleDL(r)}>⬇ Download</button>
                : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoutesPage;
