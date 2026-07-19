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
  const fileId = row['Fileid'] || row['fileId'] || row['FileID'];
  if (fileId && fileId.trim()) {
    return `https://drive.usercontent.google.com/download?id=${fileId.trim()}&export=download&authuser=0&confirm=t`;
  }
  const url = row['Fileurl'] || row['fileUrl'] || row['File URL'] || row['Drive Link'] ||
    Object.values(row).find(v => typeof v === 'string' && v.includes('drive.google'));
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.usercontent.google.com/download?id=${match[1]}&export=download&authuser=0&confirm=t`;
  return url;
};

// ── Platform detection ─────────────────────────────────────────────────────
// iOS = iPhone/iPad/iPod — ALL browsers on iOS use WebKit and cannot
// trigger native file downloads. Must use blob → window.open() → Share Sheet.
const isIOS = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Android PWA standalone — anchor click works, iframe does not
const isStandalonePWA = () =>
  !isIOS() && (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );

// ── Smart download trigger — 3-way platform handling ──────────────────────
//
//  iOS (any browser)    → fetch blob → window.open(blobURL) → Share Sheet
//                         User taps "Save to Files" — only option Apple allows
//
//  Android PWA          → anchor click → Android download manager intercepts
//
//  Desktop / Android    → hidden iframe → silent background download
//  browser
//
const triggerDownload = async (driveUrl, fname) => {
  // ── iOS: blob fetch → Share Sheet ───────────────────────────────────────
  if (isIOS()) {
    const response = await fetch(driveUrl);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    // window.open on iOS opens the blob in Safari → triggers Share Sheet
    const newTab = window.open(objectUrl, '_blank');
    if (!newTab) {
      // Popup blocked fallback — use anchor
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = fname || '';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Revoke after delay to keep blob alive long enough for Share Sheet
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
    return;
  }

  // ── Android PWA: anchor click ────────────────────────────────────────────
  if (isStandalonePWA()) {
    return new Promise((resolve) => {
      const a = document.createElement('a');
      a.href = driveUrl;
      a.download = fname || '';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => resolve(), 1000);
    });
  }

  // ── Desktop / Android browser: hidden iframe ─────────────────────────────
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
    setTimeout(() => resolve(), 3500);
  });
};

// ── Port fragment matching ─────────────────────────────────────────────────
const normalizePortStr = (str) =>
  normalizeStr(str || '').replace(/[^a-z]/g, '');

const matchesPortFragment = (normalizedFilename, rawFragment) => {
  const frag = normalizePortStr(rawFragment);
  if (!frag) return true;
  if (normalizedFilename.includes(frag)) return true;
  if (frag.length === 5) {
    const last3 = frag.slice(2);
    if (normalizedFilename.includes(last3)) return true;
  }
  return false;
};

// ── Get top N ports from route data ───────────────────────────────────────
const getTopPorts = (routes, n = 8) => {
  const freq = {};
  routes.forEach(r => {
    const port = (r['Portname'] || r['Port Name'] || r.portName || '').trim();
    if (port && port.length > 1) {
      const key = port.split(/[\s,]/)[0];
      if (key.length > 2) freq[key] = (freq[key] || 0) + 1;
    }
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name]) => name);
};

// ── Simulated progress bar ─────────────────────────────────────────────────
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
      <span style={{ color: 'var(--cyan)', fontFamily: 'monospace' }}>⬇ {filename}</span>
      <span style={{ color: 'var(--text2)' }}>{progress < 100 ? 'Downloading…' : '✅ Done!'}</span>
    </div>
    <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 4,
        background: progress < 100 ? 'var(--cyan)' : 'var(--green)',
        width: `${progress}%`, transition: 'width 0.25s ease'
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

  const [dlFilename, setDlFilename]   = useState('');
  const [dlLoadingId, setDlLoadingId] = useState(null);
  const { progress: dlProgress, startProgress, completeProgress, resetProgress } = useSimulatedProgress();

  const [dlHistory, setDlHistory] = useState(() => getTodayHistory());
  const [topPorts, setTopPorts]   = useState([]);
  const [maxRoutesPerDay, setMaxRoutesPerDay] = useState(10);

  const [depPort, setDepPort]           = useState('');
  const [arrPort, setArrPort]           = useState('');
  const [portSearchDone, setPortSearchDone] = useState(false);
  const [portTier1, setPortTier1]       = useState([]);
  const [portTier2, setPortTier2]       = useState([]);
  const [portTier3, setPortTier3]       = useState([]);
  const [portVisible1, setPortVisible1] = useState(PAGE_SIZE);
  const [portVisible2, setPortVisible2] = useState(PAGE_SIZE);
  const [portVisible3, setPortVisible3] = useState(PAGE_SIZE);

  const debounceRef = useRef(null);
  const debPortRef  = useRef(null);
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (sheetRoutes.length > 0) setTopPorts(getTopPorts(sheetRoutes, 8));
  }, [sheetRoutes]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'limits'));
        if (snap.exists()) setMaxRoutesPerDay(Number(snap.data().maxRoutesPerDay ?? 10));
      } catch {}
    })();
  }, []);

  const liveSearch = useCallback((searchQ) => {
    const sq = (searchQ !== undefined ? searchQ : q).trim();
    if (!sq || sq.length < 2) { setResults([]); setSearched(false); return; }
    setSearching(true); setSearched(true); setShowSugg(false);
    const ql = normalizeStr(sq);
    const res = sheetRoutes.filter(r => {
      const hay = normalizeStr(Object.values(r).filter(v => v && typeof v === 'string').join(' '));
      return hay.includes(ql);
    });
    setResults(res);
    setVisibleCount(PAGE_SIZE);
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

    const fname    = (r['Filename'] || r['File Name'] || r.fileName || 'route').trim();
    const driveUrl = buildDriveUrl(r);
    if (!driveUrl) { notify('No download link for this file', 'error'); return; }

    const cardId = r['Fileid'] || r['Fileurl'] || fname;
    setDlLoadingId(cardId);
    setDlFilename(fname);
    startProgress();

    try {
      await triggerDownload(driveUrl, fname);

      completeProgress();
      if (!isAdmin) await incrementDownloadCount(user.uid);
      addToHistory(fname);
      setDlHistory(getTodayHistory());

      // iOS-specific guidance in toast
      if (isIOS()) {
        notify(`📂 Tap Share → "Save to Files" to save: ${fname}`, 'success');
      } else {
        notify(
          `✅ Downloading: ${fname}${isAdmin ? '' : ` — ${limit.remaining - 1} left today`}`,
          'success'
        );
      }

    } catch (err) {
      resetProgress();
      console.warn('Download error, trying fallback:', err?.message);
      try {
        const a = document.createElement('a');
        a.href = driveUrl;
        a.download = fname;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (!isAdmin) await incrementDownloadCount(user.uid);
        addToHistory(fname);
        setDlHistory(getTodayHistory());
        notify(isIOS()
          ? `📂 Tap Share → "Save to Files" to save: ${fname}`
          : `⬇ Download started: ${fname} — check your Downloads folder`,
          'success'
        );
      } catch {
        notify('❌ Download failed. Check your connection and try again.', 'error');
      }
    } finally {
      setTimeout(() => setDlLoadingId(null), 2500);
    }
  };

  // ── Departure/Arrival port search ─────────────────────────────────────────
  const getName = r => r['Filename'] || r['File Name'] || r.fileName || r['Route Name'] ||
    Object.values(r).find(v => v && typeof v === 'string' && v.length > 2 && !v.startsWith('http')) || 'Route File';
  const getPort = r => r['Portname'] || r['Port Name'] || r.portName || r['From'] || r['Route Description'] || '';
  const getType = r => r['Type'] || r['type'] || '';

  const runPortSearch = useCallback((dep, arr) => {
    const d = (dep !== undefined ? dep : depPort).trim();
    const a = (arr !== undefined ? arr : arrPort).trim();
    if (!d && !a) { setPortSearchDone(false); setPortTier1([]); setPortTier2([]); setPortTier3([]); return; }
    setPortSearchDone(true);
    const tier1 = [], tier2 = [], tier3 = [];
    sheetRoutes.forEach(r => {
      const norm   = normalizePortStr(getName(r));
      const matchD = d ? matchesPortFragment(norm, d) : false;
      const matchA = a ? matchesPortFragment(norm, a) : false;
      if (d && a) {
        if (matchD && matchA) tier1.push(r);
        else if (matchD) tier2.push(r);
        else if (matchA) tier3.push(r);
      } else if (d && matchD) { tier1.push(r); }
        else if (a && matchA) { tier1.push(r); }
    });
    setPortTier1(tier1); setPortTier2(tier2); setPortTier3(tier3);
    setPortVisible1(PAGE_SIZE); setPortVisible2(PAGE_SIZE); setPortVisible3(PAGE_SIZE);
  }, [depPort, arrPort, sheetRoutes]);

  const handleDepChange = e => {
    const v = e.target.value; setDepPort(v);
    clearTimeout(debPortRef.current);
    debPortRef.current = setTimeout(() => runPortSearch(v, arrPort), 250);
  };
  const handleArrChange = e => {
    const v = e.target.value; setArrPort(v);
    clearTimeout(debPortRef.current);
    debPortRef.current = setTimeout(() => runPortSearch(depPort, v), 250);
  };
  const clearPortSearch = () => {
    setDepPort(''); setArrPort('');
    setPortSearchDone(false);
    setPortTier1([]); setPortTier2([]); setPortTier3([]);
  };

  useEffect(() => {
    if ((depPort || arrPort) && sheetRoutes.length > 0) runPortSearch(depPort, arrPort);
  }, [sheetRoutes]);

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = results.length > visibleCount;

  // ── Shared route card renderer ─────────────────────────────────────────────
  const renderRouteCard = (r, i) => {
    const cardId    = r['Fileid'] || r['Fileurl'] || getName(r);
    const isLoading = dlLoadingId === cardId;
    const fname     = getName(r);
    const alreadyDl = dlHistory.includes(fname);
    return (
      <div key={i} className="file-card" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
        <div className="file-icon">🛤</div>
        <div className="file-name">{fname}</div>
        {getPort(r) && <div className="file-port">📍 {getPort(r)}</div>}
        {getType(r) && <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginBottom: 3 }}>🌊 {getType(r)}</div>}
        <div className="file-tags">
          <span className="ftag tag-rtz">Route File</span>
          <span className="ftag" style={{ background: 'rgba(0,200,100,0.07)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>Firebase</span>
          {alreadyDl && <span className="ftag" style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.25)' }}>✓ Today</span>}
        </div>
        {isLoading && dlProgress !== null && (
          <div style={{ margin: '6px 0 4px', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--cyan)', width: `${dlProgress}%`, transition: 'width 0.25s ease', borderRadius: 3 }} />
          </div>
        )}
        {user
          ? <button className="dl-btn" onClick={() => handleDL(r)} disabled={isLoading} style={{ opacity: isLoading ? 0.6 : 1 }}>
              {isLoading ? '⬇ Downloading…' : '⬇ Download'}
            </button>
          : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>
        }
      </div>
    );
  };

  return (
    <div className="section">
      {dlProgress !== null && <ProgressBar progress={dlProgress} filename={dlFilename} />}

      <div className="sec-hdr">
        <div className="sec-title">🛤 Route Files</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {sheetRoutes.length > 0 && <span className="badge">{sheetRoutes.length.toLocaleString()} in database</span>}
          {results.length > 0 && <span className="badge" style={{ background: 'rgba(0,200,100,0.1)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>{results.length} results</span>}
          {sheetLoading && <span className="badge" style={{ background: 'rgba(0,180,216,0.08)', color: 'var(--cyan)' }}>⏳ Loading…</span>}
        </div>
      </div>

      {/* iOS download notice */}
      {isIOS() && user && (
        <div style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.8rem' }}>
          🍎 <strong style={{ color: 'var(--cyan)' }}>iOS tip:</strong> After tapping Download, tap <strong>Share → Save to Files</strong> to save the file.
        </div>
      )}

      {user && !isAdmin && (
        <div style={{ background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.18)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.8rem' }}>
          📥 Free account: up to <strong style={{ color: 'var(--cyan)' }}>{maxRoutesPerDay} route downloads per day</strong>. Resets at midnight.
        </div>
      )}
      {isAdmin && (
        <div style={{ background: 'rgba(0,200,100,0.06)', border: '1px solid rgba(0,200,100,0.2)', borderRadius: 8, padding: '7px 12px', fontSize: '0.7rem', color: 'var(--green)', marginBottom: '0.8rem' }}>
          🛡 Admin account — unlimited downloads
        </div>
      )}

      {dlHistory.length > 0 && (
        <div style={{ background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.12)', borderRadius: 8, padding: '8px 12px', marginBottom: '0.8rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>📂 Downloaded today ({dlHistory.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {dlHistory.slice(0, 10).map((f, i) => (
              <span key={i} style={{ fontSize: '0.65rem', background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 4, padding: '2px 7px', fontFamily: 'monospace' }}>{f}</span>
            ))}
            {dlHistory.length > 10 && <span style={{ fontSize: '0.65rem', color: 'var(--text3)' }}>+{dlHistory.length - 10} more</span>}
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

      {/* Departure / Arrival Port Search */}
      <div style={{ background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: '0.8rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em' }}>🧭 Search by Departure / Arrival Port</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="si" style={{ flex: '1 1 140px', minWidth: 120 }} placeholder="Departure port or code"
            value={depPort} onChange={handleDepChange} onKeyDown={e => e.key === 'Enter' && runPortSearch(depPort, arrPort)} />
          <input className="si" style={{ flex: '1 1 140px', minWidth: 120 }} placeholder="Arrival port or code"
            value={arrPort} onChange={handleArrChange} onKeyDown={e => e.key === 'Enter' && runPortSearch(depPort, arrPort)} />
          <button className="btn btn-primary" style={{ padding: '0 16px' }} onClick={() => runPortSearch(depPort, arrPort)}>Search</button>
          {(depPort || arrPort) && <button className="btn btn-secondary" onClick={clearPortSearch}>✕</button>}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--text3)', marginTop: 6, lineHeight: 1.4 }}>
          Search by port name or port code (e.g. Mundra or INMUN). Fill both boxes for an exact route, or just one to browse all routes via that port.
        </div>
      </div>

      {portSearchDone && (
        <div style={{ marginBottom: '1rem' }}>
          {portTier1.length === 0 && portTier2.length === 0 && portTier3.length === 0 && (
            <div className="empty"><div className="empty-icon">🔍</div><div className="empty-t">No Routes Found</div><div className="empty-d">Try a different port name or code</div></div>
          )}
          {portTier1.length > 0 && (
            <>
              <div style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700, margin: '10px 0 8px' }}>✅ Best Matches ({portTier1.length})</div>
              <div className="files-grid">{portTier1.slice(0, portVisible1).map((r, i) => renderRouteCard(r, `t1-${i}`))}</div>
              {portTier1.length > portVisible1 && (
                <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
                  <button className="btn btn-secondary" onClick={() => setPortVisible1(v => v + PAGE_SIZE)} style={{ padding: '10px 28px', fontSize: '0.8rem' }}>Load More ({portTier1.length - portVisible1} remaining)</button>
                </div>
              )}
            </>
          )}
          {portTier2.length > 0 && (
            <>
              <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', fontWeight: 700, margin: '14px 0 8px' }}>🛫 Departure Port Matches ({portTier2.length})</div>
              <div className="files-grid">{portTier2.slice(0, portVisible2).map((r, i) => renderRouteCard(r, `t2-${i}`))}</div>
              {portTier2.length > portVisible2 && (
                <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
                  <button className="btn btn-secondary" onClick={() => setPortVisible2(v => v + PAGE_SIZE)} style={{ padding: '10px 28px', fontSize: '0.8rem' }}>Load More ({portTier2.length - portVisible2} remaining)</button>
                </div>
              )}
            </>
          )}
          {portTier3.length > 0 && (
            <>
              <div style={{ fontSize: '0.7rem', color: 'var(--gold)', fontWeight: 700, margin: '14px 0 8px' }}>🛬 Arrival Port Matches ({portTier3.length})</div>
              <div className="files-grid">{portTier3.slice(0, portVisible3).map((r, i) => renderRouteCard(r, `t3-${i}`))}</div>
              {portTier3.length > portVisible3 && (
                <div style={{ textAlign: 'center', marginTop: '0.8rem' }}>
                  <button className="btn btn-secondary" onClick={() => setPortVisible3(v => v + PAGE_SIZE)} style={{ padding: '10px 28px', fontSize: '0.8rem' }}>Load More ({portTier3.length - portVisible3} remaining)</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Quick-filter buttons */}
      <div className="fbar" style={{ marginBottom: '0.8rem' }}>
        {(topPorts.length > 0 ? topPorts : ['Mumbai','Singapore','Dubai','Rotterdam','Colombo','Karachi','Fujairah','Shanghai']).map(p => (
          <button key={p} className={`fbtn ${q === p ? 'active' : ''}`} onClick={() => { setQ(p); liveSearch(p); }}>{p}</button>
        ))}
      </div>

      {sheetLoading && !searched && <div className="loading"><div className="spin" /><span>Loading route database from Firebase…</span></div>}
      {!sheetLoading && sheetRoutes.length === 0 && !searched && (
        <div className="empty"><div className="empty-icon">🗄</div><div className="empty-t">No Data in Firebase Yet</div><div className="empty-d">Admin needs to sync routes from Google Sheet to Firebase first.</div></div>
      )}
      {!searched && !searching && sheetRoutes.length > 0 && (
        <div className="empty"><div className="empty-icon">🛤</div><div className="empty-t">Search {sheetRoutes.length.toLocaleString()} Route Files</div><div className="empty-d">Type a port name or keyword above — results appear instantly</div></div>
      )}
      {searching && <div className="loading"><div className="spin" /><span>Searching…</span></div>}
      {searched && !searching && results.length === 0 && (
        <div className="empty"><div className="empty-icon">🔍</div><div className="empty-t">No Routes Found</div><div className="empty-d">Try different keywords or partial port name</div></div>
      )}

      {visibleResults.length > 0 && (
        <>
          <div className="files-grid">
            {visibleResults.map((r, i) => {
              const cardId    = r['Fileid'] || r['Fileurl'] || getName(r);
              const isLoading = dlLoadingId === cardId;
              const fname     = getName(r);
              const alreadyDl = dlHistory.includes(fname);
              return (
                <div key={i} className="file-card" style={{ opacity: isLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                  <div className="file-icon">🛤</div>
                  <div className="file-name">{fname}</div>
                  {getPort(r) && <div className="file-port">📍 {getPort(r)}</div>}
                  {getType(r) && <div style={{ fontSize: '0.65rem', color: 'var(--text3)', marginBottom: 3 }}>🌊 {getType(r)}</div>}
                  <div className="file-tags">
                    <span className="ftag tag-rtz">Route File</span>
                    <span className="ftag" style={{ background: 'rgba(0,200,100,0.07)', color: 'var(--green)', border: '1px solid rgba(0,200,100,0.2)' }}>Firebase</span>
                    {alreadyDl && <span className="ftag" style={{ background: 'rgba(0,180,216,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,180,216,0.25)' }}>✓ Today</span>}
                  </div>
                  {isLoading && dlProgress !== null && (
                    <div style={{ margin: '6px 0 4px', height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--cyan)', width: `${dlProgress}%`, transition: 'width 0.25s ease', borderRadius: 3 }} />
                    </div>
                  )}
                  {user
                    ? <button className="dl-btn" onClick={() => handleDL(r)} disabled={isLoading} style={{ opacity: isLoading ? 0.6 : 1 }}>
                        {isLoading ? '⬇ Downloading…' : '⬇ Download'}
                      </button>
                    : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>
                  }
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setVisibleCount(v => v + PAGE_SIZE)} style={{ padding: '10px 28px', fontSize: '0.8rem' }}>
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
