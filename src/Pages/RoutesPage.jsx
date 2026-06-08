/* eslint-disable */
// src/pages/RoutesPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
    const maxPerDay = Number(limits.maxRoutesPerDay ?? 10);
    const counts    = countSnap.exists() ? countSnap.data() : {};
    const current   = Number(counts.routes ?? 0);
    return { allowed: current < maxPerDay, remaining: Math.max(0, maxPerDay - current), max: maxPerDay, current };
  } catch { return { allowed: true, remaining: 10, max: 10 }; }
};

const incrementDownloadCount = async (uid) => {
  try {
    const ref    = doc(db, 'download_counts', `${uid}_${getTodayKey()}`);
    const snap   = await getDoc(ref);
    const counts = snap.exists() ? snap.data() : {};
    await setDoc(ref, { ...counts, routes: Number(counts.routes ?? 0) + 1 }, { merge: true });
  } catch {}
};

// ── LocalStorage download history helpers ─────────────────────────────────
const HISTORY_KEY = 'mnav_route_dl_history';

const getTodayHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    const today = getTodayKey();
    return (data[today] || []);
  } catch { return []; }
};

const addToHistory = (filename) => {
  try {
    const raw   = localStorage.getItem(HISTORY_KEY);
    const data  = raw ? JSON.parse(raw) : {};
    const today = getTodayKey();
    const list  = data[today] || [];
    if (!list.includes(filename)) list.unshift(filename);
    // Keep only last 7 days
    const keys = Object.keys(data).sort().slice(-7);
    const pruned = {};
    keys.forEach(k => pruned[k] = data[k]);
    pruned[today] = list.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(pruned));
  } catch {}
};

// ── Accent-insensitive normalize ───────────────────────────────────────────
const normalizeStr = (str) =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// ── Build Google Drive direct download URL ─────────────────────────────────
const buildDriveUrl = (row) => {
  // Prefer Fileid column (most reliable)
  const fileId = row['Fileid'] || row['fileId'] || row['FileID'];
  if (fileId && fileId.trim()) {
    return `https://drive.google.com/uc?export=download&id=${fileId.trim()}&confirm=t`;
  }
  // Fallback: extract from Fileurl
  const url = row['Fileurl'] || row['fileUrl'] || row['File URL'] || row['Drive Link'] ||
    Object.values(row).find(v => typeof v === 'string' && v.includes('drive.google'));
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}&confirm=t`;
  return url;
};

// ── Fetch with retry (1 retry on failure) ─────────────────────────────────
const fetchWithRetry = async (url, opts = {}, retries = 1) => {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1200));
      return fetchWithRetry(url, opts, retries - 1);
    }
    throw err;
  }
};

// ── Large-file Drive virus-scan bypass ────────────────────────────────────
// Drive returns an HTML confirmation page for files >100MB.
// We detect this and extract the confirm token to re-fetch.
const fetchDriveFile = async (driveUrl, onProgress) => {
  const res1 = await fetchWithRetry(driveUrl);
  const contentType = res1.headers.get('content-type') || '';

  // If Drive returned HTML → it's the virus-scan warning page
  if (contentType.includes('text/html')) {
    const html = await res1.text();
    // Extract confirm token from the warning page form
    const tokenMatch = html.match(/confirm=([0-9A-Za-z_\-]+)/);
    const uuidMatch  = html.match(/uuid=([0-9A-Za-z_\-]+)/);
    if (tokenMatch) {
      const confirmUrl = `${driveUrl}&confirm=${tokenMatch[1]}${uuidMatch ? `&uuid=${uuidMatch[1]}` : ''}`;
      const res2 = await fetchWithRetry(confirmUrl);
      return await readWithProgress(res2, onProgress);
    }
    throw new Error('Drive blocked: virus scan page, no token found');
  }

  return await readWithProgress(res1, onProgress);
};

// ── Stream response with progress tracking ────────────────────────────────
const readWithProgress = async (response, onProgress) => {
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || total === 0) {
    // No streaming support or unknown size — just return blob
    onProgress && onProgress(50); // show 50% for indeterminate
    const blob = await response.blob();
    onProgress && onProgress(100);
    return { blob, size: blob.size };
  }

  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (onProgress && total > 0) {
      onProgress(Math.round((received / total) * 100));
    }
  }

  const blob = new Blob(chunks);
  onProgress && onProgress(100);
  return { blob, size: received };
};

// ── Format file size ───────────────────────────────────────────────────────
const fmtSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── Get top N ports from route data ───────────────────────────────────────
const getTopPorts = (routes, n = 8) => {
  const freq = {};
  routes.forEach(r => {
    const port = (r['Portname'] || r['Port Name'] || r.portName || '').trim();
    if (port && port.length > 1) {
      // Extract first word/city from port name
      const key = port.split(/[\s,]/)[0];
      if (key.length > 2) freq[key] = (freq[key] || 0) + 1;
    }
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
};

// ── Progress Bar Component ─────────────────────────────────────────────────
const ProgressBar = ({ progress, filename }) => (
  <div style={{
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
    background: 'var(--card)', borderTop: '1px solid var(--border)',
    padding: '10px 16px', boxShadow: '0 -4px 24px rgba(0,0,0,0.4)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.72rem' }}>
      <span style={{ color: 'var(--cyan)', fontFamily: 'monospace' }}>⬇ {filename}</span>
      <span style={{ color: 'var(--text2)' }}>{progress < 100 ? `${progress}%` : '✅ Done!'}</span>
    </div>
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 4,
        background: progress < 100 ? 'var(--cyan)' : 'var(--green)',
        width: `${progress}%`,
        transition: 'width 0.3s ease'
      }} />
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

function RoutesPage({ searchQuery, notify, user, setTab, sheetRoutes = [], sheetLoading }) {
  const [q, setQ]                   = useState(searchQuery || '');
  const [results, setResults]       = useState([]);
  const [searching, setSearching]   = useState(false);
  const [searched, setSearched]     = useState(false);
  const [sugg, setSugg]             = useState([]);
  const [showSugg, setShowSugg]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Download progress state
  const [dlProgress, setDlProgress]   = useState(null); // null = hidden, 0-100 = active
  const [dlFilename, setDlFilename]   = useState('');
  const [dlLoadingId, setDlLoadingId] = useState(null); // which card is loading

  // Download history (today only, localStorage)
  const [dlHistory, setDlHistory] = useState(() => getTodayHistory());

  // Dynamic quick-filter ports
  const [topPorts, setTopPorts] = useState([]);

  const debounceRef = useRef(null);
  const isAdmin = user?.email === ADMIN_EMAIL;

  // ── Build dynamic top ports when data loads ──────────────────────────────
  useEffect(() => {
    if (sheetRoutes.length > 0) {
      setTopPorts(getTopPorts(sheetRoutes, 8));
    }
  }, [sheetRoutes]);

  const liveSearch = useCallback((searchQ) => {
    const sq = (searchQ !== undefined ? searchQ : q).trim();
    if (!sq || sq.length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true); setSearched(true); setShowSugg(false);
    // FIX 5: accent-insensitive search using normalize
    const ql = normalizeStr(sq);
    const res = sheetRoutes.filter(r => {
      const hay = normalizeStr(
        Object.values(r).filter(v => v && typeof v === 'string').join(' ')
      );
      return hay.includes(ql);
    }); // FIX 6: no slice here — pagination handles display limit
    setResults(res);
    setVisibleCount(PAGE_SIZE); // reset pagination on new search
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
    const ql = normalizeStr(v);
    const names = new Set();
    sheetRoutes.forEach(r => {
      const nm = r['Filename'] || r['File Name'] || r['Route Name'] || r.fileName || '';
      if (nm && normalizeStr(nm).includes(ql)) names.add(nm);
    });
    setSugg([...names].slice(0, 8));
    setShowSugg(true);
    debounceRef.current = setTimeout(() => liveSearch(v), 200);
  };

  // ── Main download handler ─────────────────────────────────────────────────
  const handleDL = async (r) => {
    if (!user) { notify('Login required to download', 'error'); setTab('login'); return; }

    const limit = await checkDownloadLimit(user.uid, isAdmin);
    if (!limit.allowed) {
      notify(`⛔ Daily limit reached (${limit.max} routes/day). Try again tomorrow or contact admin: @manish_the_navigator`, 'error');
      return;
    }

    // Get exact filename from sheet (already has extension)
    const fname = (r['Filename'] || r['File Name'] || r.fileName || 'route').trim();

    // Build Drive URL using Fileid column (most reliable)
    const driveUrl = buildDriveUrl(r);
    if (!driveUrl) { notify('No download link for this file', 'error'); return; }

    // Show loading state on this card
    const cardId = r['Fileid'] || r['Fileurl'] || fname;
    setDlLoadingId(cardId);
    setDlFilename(fname);
    setDlProgress(0);

    let downloadSuccess = false;

    try {
      // FIX 3 + 4: fetch with large-file bypass + progress tracking
      const { blob, size } = await fetchDriveFile(driveUrl, (pct) => {
        setDlProgress(pct);
      });

      // Create object URL and trigger native download to file manager
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fname; // exact filename from sheet — preserves extension
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Revoke after short delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);

      downloadSuccess = true;

      // FIX 1: only increment count on success
      if (!isAdmin) await incrementDownloadCount(user.uid);

      // FIX 9: add to local download history
      addToHistory(fname);
      setDlHistory(getTodayHistory());

      const sizeStr = fmtSize(size);
      notify(
        `✅ Saved: ${fname}${sizeStr ? ` (${sizeStr})` : ''}${isAdmin ? '' : ` — ${limit.remaining - 1} left today`}`,
        'success'
      );

      // Hide progress bar after 2s
      setTimeout(() => { setDlProgress(null); setDlLoadingId(null); }, 2000);

    } catch (err) {
      // FIX 1: do NOT increment count on failure
      // FIX: fallback — open Drive export URL directly (Android download manager picks it up)
      setDlProgress(null);
      setDlLoadingId(null);
      console.warn('Blob download failed, trying direct link:', err.message);

      try {
        // Last resort: open the export URL directly — browser/Android download manager handles it
        const a = document.createElement('a');
        a.href = driveUrl;
        a.download = fname;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Only count if we got this far without throwing
        if (!isAdmin) await incrementDownloadCount(user.uid);
        addToHistory(fname);
        setDlHistory(getTodayHistory());
        notify(`⬇ Download started: ${fname} — check your Downloads folder`, 'success');
      } catch {
        notify('❌ Download failed. Check your connection and try again.', 'error');
      }
    }
  };

  const getName = r => r['Filename'] || r['File Name'] || r.fileName || r['Route Name'] ||
    Object.values(r).find(v => v && typeof v === 'string' && v.length > 2 && !v.startsWith('http')) || 'Route File';
  const getPort = r => r['Portname'] || r['Port Name'] || r.portName || r['From'] || r['Route Description'] || '';
  const getType = r => r['Type'] || r['type'] || '';

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = results.length > visibleCount;

  return (
    <div className="section">
      {/* Progress bar overlay */}
      {dlProgress !== null && (
        <ProgressBar progress={dlProgress} filename={dlFilename} />
      )}

      <div className="sec-hdr">
        <div className="sec-title">🛤 Route Files</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {sheetRoutes.length > 0 && <span className="badge">{sheetRoutes.length.toLocaleString()} in database</span>}
          {results.length > 0 && <span className="badge" style={{ background: 'rgba(0,200,100,0.1)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>{results.length} results</span>}
          {sheetLoading && <span className="badge" style={{ background: 'rgba(0,180,216,0.08)', color: 'var(--cyan)' }}>⏳ Loading…</span>}
        </div>
      </div>

      {/* Download limit notice */}
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

      {/* FIX 9: Download history panel */}
      {dlHistory.length > 0 && (
        <div style={{ background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: '0.8rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            📂 Downloaded today ({dlHistory.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {dlHistory.slice(0, 10).map((f, i) => (
              <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>
                {f}
              </span>
            ))}
            {dlHistory.length > 10 && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>+{dlHistory.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      {/* Search bar */}
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

      {/* FIX 8: Dynamic quick-filter buttons from top ports in database */}
      <div className="fbar" style={{ marginBottom: '0.8rem' }}>
        {(topPorts.length > 0 ? topPorts : ['Mumbai','Singapore','Dubai','Rotterdam','Colombo','Karachi','Fujairah','Shanghai']).map(p => (
          <button key={p} className={`fbtn ${q === p ? 'active' : ''}`}
            onClick={() => { setQ(p); liveSearch(p); }}>
            {p}
          </button>
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
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-t">No Routes Found</div>
          <div className="empty-d">Try different keywords or partial port name</div>
        </div>
      )}

      {/* FIX 6: paginated results with Load More */}
      {visibleResults.length > 0 && (
        <>
          <div className="files-grid">
            {visibleResults.map((r, i) => {
              const cardId  = r['Fileid'] || r['Fileurl'] || getName(r);
              const isLoading = dlLoadingId === cardId;
              const fname   = getName(r);
              const alreadyDl = dlHistory.includes(fname);
              return (
                <div key={i} className="file-card" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                  <div className="file-icon">🛤</div>
                  <div className="file-name">{fname}</div>
                  {getPort(r) && <div className="file-port">📍 {getPort(r)}</div>}
                  {getType(r) && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginBottom: 3 }}>
                      🌊 {getType(r)}
                    </div>
                  )}
                  <div className="file-tags">
                    <span className="ftag tag-rtz">Route File</span>
                    <span className="ftag" style={{ background: 'rgba(0,200,100,0.07)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>Firebase</span>
                    {/* FIX 9: show if already downloaded today */}
                    {alreadyDl && (
                      <span className="ftag" style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.25)' }}>✓ Today</span>
                    )}
                  </div>
                  {/* FIX 2: progress bar per card when loading */}
                  {isLoading && dlProgress !== null && (
                    <div style={{ margin: '6px 0 4px', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--cyan)', width: `${dlProgress}%`, transition: 'width 0.3s ease', borderRadius: 3 }} />
                    </div>
                  )}
                  {user
                    ? <button
                        className="dl-btn"
                        onClick={() => handleDL(r)}
                        disabled={isLoading}
                        style={{ opacity: isLoading ? 0.6 : 1 }}>
                        {isLoading
                          ? dlProgress !== null && dlProgress < 100
                            ? `⬇ ${dlProgress}%…`
                            : '⬇ Saving…'
                          : '⬇ Download'}
                      </button>
                    : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>
                  }
                </div>
              );
            })}
          </div>

          {/* FIX 6: Load More button */}
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
                Load More ({results.length - visibleCount} remaining)
              </button>
            </div>
          )}

          <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text3)', marginTop: 8 }}>
            Showing {Math.min(visibleCount, results.length)} of {results.length} results
          </div>
        </>
      )}
    </div>
  );
}

export default RoutesPage;
