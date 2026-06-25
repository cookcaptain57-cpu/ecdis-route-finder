/* eslint-disable */
// src/pages/ChartsPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
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

// ── LocalStorage download history helpers ─────────────────────────────────
const HISTORY_KEY = 'mnav_chart_dl_history';

const getTodayHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return data[getTodayKey()] || [];
  } catch { return []; }
};

const addToHistory = (filename) => {
  try {
    const raw   = localStorage.getItem(HISTORY_KEY);
    const data  = raw ? JSON.parse(raw) : {};
    const today = getTodayKey();
    const list  = data[today] || [];
    if (!list.includes(filename)) list.unshift(filename);
    const keys   = Object.keys(data).sort().slice(-7);
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
  const fileId = row['Fileid'] || row['fileId'] || row['FileID'];
  if (fileId && fileId.trim()) {
    return `https://drive.google.com/uc?export=download&id=${fileId.trim()}&confirm=t`;
  }
  const url = row['Fileurl'] || row['fileUrl'] || row['File URL'] || row['Drive Link'] ||
    Object.values(row).find(v => typeof v === 'string' && v.includes('drive.google'));
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}&confirm=t`;
  return url;
};

// ── Silent iframe download — no CORS, no Drive page jump ──────────────────
// Creates a hidden iframe pointed at the export URL.
// The browser's download manager intercepts the content-disposition header
// and saves the file directly — zero page navigation, zero Drive viewer.
const triggerIframeDownload = (driveUrl) => {
  return new Promise((resolve) => {
    const old = document.getElementById('__mnav_dl_frame');
    if (old) old.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__mnav_dl_frame';
    iframe.style.display = 'none';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.src = driveUrl;
    document.body.appendChild(iframe);

    // Resolve after safe delay — iframe gives no download progress events
    setTimeout(() => {
      resolve();
    }, 3500);
  });
};

// ── Simulated progress bar during iframe download ─────────────────────────
const useSimulatedProgress = () => {
  const [progress, setProgress] = useState(null);
  const timerRef = useRef(null);

  const startProgress = useCallback(() => {
    setProgress(0);
    let current = 0;
    timerRef.current = setInterval(() => {
      current += current < 30 ? 8 : current < 60 ? 5 : current < 85 ? 2 : 0;
      setProgress(Math.min(current, 90));
    }, 150);
  }, []);

  const completeProgress = useCallback(() => {
    clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => setProgress(null), 2200);
  }, []);

  const resetProgress = useCallback(() => {
    clearInterval(timerRef.current);
    setProgress(null);
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  return { progress, startProgress, completeProgress, resetProgress };
};

// ── Progress Bar Component ─────────────────────────────────────────────────
const ProgressBar = ({ progress, filename }) => (
  <div style={{
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
    background: 'var(--card)', borderTop: '1px solid var(--border)',
    padding: '10px 16px', boxShadow: '0 -4px 24px rgba(0,0,0,0.4)'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.72rem' }}>
      <span style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>⬇ {filename}</span>
      <span style={{ color: 'var(--text2)' }}>{progress < 100 ? 'Downloading…' : '✅ Done!'}</span>
    </div>
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 4,
        background: progress < 100 ? 'var(--gold)' : 'var(--green)',
        width: `${progress}%`,
        transition: 'width 0.25s ease'
      }} />
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 100;

function ChartsPage({ notify, user, setTab, isAdmin: isAdminProp, sheetCharts = [], sheetLoading }) {
  const [selBrand, setSelBrand]           = useState(null);
  const [q, setQ]                         = useState('');
  const [globalQ, setGlobalQ]             = useState('');
  const [globalResults, setGlobalResults] = useState([]);
  const [globalSearching, setGlobalSearching] = useState(false);
  const [globalSearched,  setGlobalSearched]  = useState(false);
  const [brandResults,    setBrandResults]    = useState([]);
  const [brandSearching,  setBrandSearching]  = useState(false);

  // Pagination
  const [globalVisible, setGlobalVisible] = useState(PAGE_SIZE);
  const [brandVisible,  setBrandVisible]  = useState(PAGE_SIZE);

  // Download state
  const [dlFilename,  setDlFilename]  = useState('');
  const [dlLoadingId, setDlLoadingId] = useState(null);
  const { progress: dlProgress, startProgress, completeProgress, resetProgress } = useSimulatedProgress();

  // Download history
  const [dlHistory, setDlHistory] = useState(() => getTodayHistory());

  // ── Live daily limit (for notice text) — fetched from Firestore ─────────
  const [maxChartsPerDay, setMaxChartsPerDay] = useState(10);

  const debounceRef = useRef(null);
  const debRef2     = useRef(null);

  const isAdmin = isAdminProp || user?.email === ADMIN_EMAIL;
  const sb = ECDIS_BRANDS.find(b => b.id === selBrand);

  const doGlobalSearch = (sq) => {
    const s = (sq !== undefined ? sq : globalQ).trim();
    if (!s || s.length < 2) return;
    setGlobalSearching(true); setGlobalSearched(true); setSelBrand(null);
    const ql = normalizeStr(s);
    const res = sheetCharts.filter(r => {
      const hay = normalizeStr(
        Object.values(r).filter(v => v && typeof v === 'string').join(' ')
      );
      return hay.includes(ql);
    });
    setGlobalResults(res);
    setGlobalVisible(PAGE_SIZE);
    setGlobalSearching(false);
  };

  const handleGlobalChange = e => {
    const v = e.target.value;
    setGlobalQ(v); setGlobalResults([]); setGlobalSearched(false);
    clearTimeout(debounceRef.current);
    if (v.trim().length >= 2) debounceRef.current = setTimeout(() => doGlobalSearch(v), 200);
  };

  // ── Fetch live download limit for notice text display ───────────────────
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'limits'));
        if (snap.exists()) {
          const data = snap.data();
          setMaxChartsPerDay(Number(data.maxChartsPerDay ?? 10));
        }
      } catch {}
    })();
  }, []);

  const doBrandSearch = (sq, brand) => {
    const s = (sq !== undefined ? sq : q).trim();
    const b = brand || sb;
    if (!b) return;
    setBrandSearching(true);
    const ql = normalizeStr(s);
    const res = sheetCharts.filter(r => {
      const hay = normalizeStr(
        Object.values(r).filter(v => v && typeof v === 'string').join(' ')
      );
      const brandMatch = hay.includes(normalizeStr(b.name)) || hay.includes(b.id.toLowerCase());
      const queryMatch = !s || hay.includes(ql);
      return brandMatch && queryMatch;
    });
    setBrandResults(res);
    setBrandVisible(PAGE_SIZE);
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

  // ── Main download handler — iframe silent download, no Drive page jump ────
  const handleDL = async (c) => {
    if (!user) { notify('Login required to download', 'error'); setTab('login'); return; }

    const limit = await checkDownloadLimit(user.uid, isAdmin);
    if (!limit.allowed) {
      notify(`⛔ Daily limit reached (${limit.max} charts/day). Try again tomorrow or contact admin: @manish_the_navigator`, 'error');
      return;
    }

    const fname = (c['Filename'] || c['File Name'] || c.fileName || c['Chart Name'] || 'chart').trim();
    const driveUrl = buildDriveUrl(c);
    if (!driveUrl) { notify('No download link for this file', 'error'); return; }

    const cardId = c['Fileid'] || c['Fileurl'] || fname;
    setDlLoadingId(cardId);
    setDlFilename(fname);
    startProgress();

    try {
      // ── FIXED: iframe silent download ──────────────────────────────────
      // Bypasses CORS entirely. Browser download manager intercepts the
      // content-disposition header and saves the file — no Drive page opens.
      await triggerIframeDownload(driveUrl);

      completeProgress();

      if (!isAdmin) await incrementDownloadCount(user.uid);

      addToHistory(fname);
      setDlHistory(getTodayHistory());

      notify(
        `✅ Downloading: ${fname}${isAdmin ? '' : ` — ${limit.remaining - 1} left today`}`,
        'success'
      );

    } catch (err) {
      // ── FIXED fallback: anchor download WITHOUT target='_blank' ────────
      // No target means browser handles it as a download, not navigation.
      resetProgress();
      console.warn('iframe download error, using anchor fallback:', err?.message);

      try {
        const a = document.createElement('a');
        a.href = driveUrl;
        a.download = fname;
        // NOTE: NO a.target — omitting target prevents Drive page from opening
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        if (!isAdmin) await incrementDownloadCount(user.uid);
        addToHistory(fname);
        setDlHistory(getTodayHistory());
        notify(`⬇ Download started: ${fname} — check your Downloads folder`, 'success');
      } catch {
        notify('❌ Download failed. Check your connection and try again.', 'error');
      }
    } finally {
      setTimeout(() => setDlLoadingId(null), 2500);
    }
  };

  const getName = r => r['Filename'] || r['File Name'] || r.fileName || r['Chart Name'] ||
    Object.values(r).find(v => v && typeof v === 'string' && v.length > 2 && !v.startsWith('http')) || 'Chart File';

  const getBrand = r => {
    const hay = normalizeStr(Object.values(r).filter(v => v && typeof v === 'string').join(' '));
    return ECDIS_BRANDS.find(b =>
      hay.includes(normalizeStr(b.name)) || hay.includes(b.id.toLowerCase())
    ) || null;
  };

  const ResultCard = ({ r }) => {
    const b         = getBrand(r);
    const fname     = getName(r);
    const cardId    = r['Fileid'] || r['Fileurl'] || fname;
    const isLoading = dlLoadingId === cardId;
    const alreadyDl = dlHistory.includes(fname);

    return (
      <div className="file-card" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        <div className="file-icon">📊</div>
        <div className="file-name">{fname}</div>
        {b && <div style={{ fontSize: '0.7rem', color: b.color, marginBottom: 4 }}>{b.emoji} {b.name}</div>}
        <div className="file-tags">
          <span className="ftag tag-chart">Chart File</span>
          <span className="ftag" style={{ background: 'rgba(0,200,100,0.07)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>Firebase</span>
          {alreadyDl && (
            <span className="ftag" style={{ background: 'rgba(240,165,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,165,0,0.25)' }}>✓ Today</span>
          )}
        </div>
        {/* Inline progress bar for active card */}
        {isLoading && dlProgress !== null && (
          <div style={{ margin: '6px 0 4px', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--gold)', width: `${dlProgress}%`, transition: 'width 0.25s ease', borderRadius: 3 }} />
          </div>
        )}
        {user
          ? <button
              className="dl-btn"
              onClick={() => handleDL(r)}
              disabled={isLoading}
              style={{ opacity: isLoading ? 0.6 : 1 }}>
              {isLoading ? '⬇ Downloading…' : '⬇ Download'}
            </button>
          : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>
        }
      </div>
    );
  };

  return (
    <div className="section">
      {/* Progress bar overlay */}
      {dlProgress !== null && (
        <ProgressBar progress={dlProgress} filename={dlFilename} />
      )}

      <div className="sec-hdr">
        <div className="sec-title">📊 ECDIS Charts</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {sheetCharts.length > 0 && <span className="badge badge-gold">{sheetCharts.length.toLocaleString()} in database</span>}
          {globalSearched && <span className="badge badge-gold">{globalResults.length} results</span>}
          {sheetLoading && <span className="badge" style={{ background: 'rgba(0,180,216,0.08)', color: 'var(--cyan)' }}>⏳ Loading…</span>}
        </div>
      </div>

      {/* Download limit notice */}
      {user && !isAdmin && (
        <div style={{ background: 'rgba(240,165,0,0.06)', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.8rem' }}>
          📥 Free account: up to <strong style={{ color: 'var(--gold)' }}>{maxChartsPerDay} chart downloads per day</strong>. Resets at midnight.
        </div>
      )}
      {isAdmin && (
        <div style={{ background: 'rgba(0,200,100,0.06)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--green)', marginBottom: '0.8rem' }}>
          🛡 Admin account — unlimited downloads
        </div>
      )}

      {/* Download history panel */}
      {dlHistory.length > 0 && (
        <div style={{ background: 'rgba(240,165,0,0.04)', border: '1px solid rgba(240,165,0,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: '0.8rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
            📂 Downloaded today ({dlHistory.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {dlHistory.slice(0, 10).map((f, i) => (
              <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(240,165,0,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,165,0,0.2)', borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>
                {f}
              </span>
            ))}
            {dlHistory.length > 10 && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>+{dlHistory.length - 10} more</span>
            )}
          </div>
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

        {/* Paginated global results */}
        {globalResults.length > 0 && (
          <>
            <div className="files-grid" style={{ marginTop: 8 }}>
              {globalResults.slice(0, globalVisible).map((r, i) => <ResultCard key={i} r={r} />)}
            </div>
            {globalResults.length > globalVisible && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setGlobalVisible(v => v + PAGE_SIZE)}
                  style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
                  Load More ({globalResults.length - globalVisible} remaining)
                </button>
              </div>
            )}
            <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text3)', marginTop: 8 }}>
              Showing {Math.min(globalVisible, globalResults.length)} of {globalResults.length} results
            </div>
          </>
        )}
      </div>

      {/* Brand browse */}
      {sheetCharts.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.8rem', textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            — Or browse by ECDIS brand —
          </div>

          {!selBrand && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
              }}
            >
              {ECDIS_BRANDS.map(b => {
                const cnt = sheetCharts.filter(r => {
                  const hay = normalizeStr(Object.values(r).filter(v => v && typeof v === 'string').join(' '));
                  return hay.includes(normalizeStr(b.name)) || hay.includes(b.id.toLowerCase());
                }).length;
                return (
                  <div
                    key={b.id}
                    onClick={() => { setSelBrand(b.id); setGlobalQ(''); setGlobalResults([]); setGlobalSearched(false); }}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 10,
                      border: `1px solid ${b.color}44`,
                      background: 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease, border-color 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${b.color}18`; e.currentTarget.style.borderColor = `${b.color}88`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = `${b.color}44`; }}
                  >
                    <div style={{ fontSize: '1.3rem', flexShrink: 0 }}>{b.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: b.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                      {cnt > 0 && <div style={{ fontSize: '0.6rem', color: 'var(--green)', fontWeight: 700, marginTop: 1 }}>{cnt} charts</div>}
                    </div>
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

              {/* Paginated brand results */}
              {brandResults.length > 0 && (
                <>
                  <div className="files-grid">
                    {brandResults.slice(0, brandVisible).map((r, i) => <ResultCard key={i} r={r} />)}
                  </div>
                  {brandResults.length > brandVisible && (
                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setBrandVisible(v => v + PAGE_SIZE)}
                        style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
                        Load More ({brandResults.length - brandVisible} remaining)
                      </button>
                    </div>
                  )}
                  <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text3)', marginTop: 8 }}>
                    Showing {Math.min(brandVisible, brandResults.length)} of {brandResults.length} results
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ChartsPage;
