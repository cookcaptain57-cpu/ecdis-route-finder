// src/pages/RoutesPage.jsx
import { useState, useEffect, useRef, useCallback } from “react”;
import { searchSheetLive } from “../sheets”;

const ROUTE_SHEET_ID = ‘1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE’;
const searchCache = new Map(); // shared cache — move to sheets.js if preferred

// ─── ROUTES PAGE ──────────────────────────────────────────────────────────────
function RoutesPage({ searchQuery, notify, user, setTab }) {
const [q, setQ] = useState(searchQuery || ‘’);
const [results, setResults] = useState([]);
const [searching, setSearching] = useState(false);
const [searched, setSearched] = useState(false);
const [sugg, setSugg] = useState([]);
const [showSugg, setShowSugg] = useState(false);
const debounceRef = useRef(null);

useEffect(() => {
if (searchQuery && searchQuery.trim()) { setQ(searchQuery); liveSearch(searchQuery); }
}, [searchQuery]);

const ROUTE_TABS = [‘Sheet1’, ‘Routes’, ‘Sheet2’, ‘Sheet3’, ‘Sheet4’];

const liveSearch = useCallback(async (searchQ) => {
const sq = (searchQ || q).trim();
if (!sq || sq.length < 2) { setResults([]); setSearched(false); return; }
setSearching(true); setSearched(true); setShowSugg(false);
try {
const res = await searchSheetLive(ROUTE_SHEET_ID, sq, ROUTE_TABS, 50);
setResults(res);
} catch (e) { notify(’Search error: ’ + e.message, ‘error’); setResults([]); }
setSearching(false);
}, [q]);

// Debounced suggestions while typing
const handleChange = e => {
const v = e.target.value; setQ(v); setResults([]); setSearched(false);
clearTimeout(debounceRef.current);
if (v.trim().length < 2) { setSugg([]); setShowSugg(false); return; }
// Show suggestions from local searchCache first
const ql = v.toLowerCase();
const cached = […searchCache.entries()]
.filter(([k]) => k.startsWith(ROUTE_SHEET_ID + ‘:’) && k.includes(ql))
.flatMap(([, v]) => v.data || []);
if (cached.length > 0) {
const names = new Set();
cached.forEach(r => {
const nm = r[‘File Name’] || r[‘Route Name’] || r.fileName || ‘’;
if (nm && nm.toLowerCase().includes(ql)) names.add(nm);
});
setSugg([…names].slice(0, 8)); setShowSugg(true);
}
debounceRef.current = setTimeout(() => liveSearch(v), 500);
};

const handleDL = async (r) => {
if (!user) { notify(‘Login required’, ‘error’); setTab(‘login’); return; }
const url = r[‘File URL’] || r.fileUrl || r[‘Drive Link’] || r[‘Download URL’] ||
Object.values(r).find(v => typeof v === ‘string’ && (v.includes(‘drive.google’) || v.includes(‘googleapis’)));
if (!url) { notify(‘No download link for this file’, ‘error’); return; }
notify(‘⬇ Downloading…’, ‘success’);
try {
const gd = url.match(//d/([a-zA-Z0-9_-]+)/);
const direct = gd ? `https://drive.google.com/uc?export=download&id=${gd[1]}` : url;
const res = await fetch(direct);
if (!res.ok) throw new Error(‘fetch failed’);
const blob = await res.blob();
const fname = r[‘File Name’] || r.fileName || gd?.[1] || ‘route’;
const a = document.createElement(‘a’);
a.href = URL.createObjectURL(blob); a.download = fname;
document.body.appendChild(a); a.click();
document.body.removeChild(a); URL.revokeObjectURL(a.href);
notify(’✅ Downloaded: ’ + fname, ‘success’);
} catch { window.open(url, ‘_blank’); notify(‘Opened — save from browser’, ‘success’); }
};

const getName = r =>
r[‘File Name’] || r.fileName || r[‘Route Name’] ||
Object.values(r).find(v => v && typeof v === ‘string’ && v.length > 2 && !v.startsWith(‘http’)) ||
‘Route File’;

const getPort = r =>
r[‘Port Name’] || r.portName || r[‘From’] || r[‘Route Description’] || ‘’;

return (
<div className="section">
<div className="sec-hdr">
<div className="sec-title">🛤 Route Files</div>
{results.length > 0 && <span className="badge">{results.length} results</span>}
{searching && (
<span className=“badge” style={{ background: ‘rgba(0,212,255,0.1)’, color: ‘var(–cyan)’ }}>
🔍 Searching…
</span>
)}
</div>

```
  <div style={{ position: 'relative', marginBottom: '0.8rem' }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <div className="siw" style={{ flex: 1 }}>
        <span className="si-ic">🔍</span>
        <input className="si" style={{ paddingLeft: 42 }} autoFocus
          placeholder="Search route files by port, name, keyword…"
          value={q} onChange={handleChange}
          onFocus={() => sugg.length > 0 && setShowSugg(true)}
          onBlur={() => setTimeout(() => setShowSugg(false), 180)}
          onKeyDown={e => e.key === 'Enter' && liveSearch()} />
      </div>
      <button className="btn btn-primary" style={{ padding: '0 16px' }} onClick={() => liveSearch()}>Search</button>
      {q && (
        <button className="btn btn-secondary" onClick={() => { setQ(''); setResults([]); setSugg([]); setSearched(false); }}>
          ✕
        </button>
      )}
    </div>

    {showSugg && sugg.length > 0 && (
      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
        boxShadow: '0 8px 28px rgba(0,0,0,0.5)', marginTop: 4, overflow: 'hidden'
      }}>
        {sugg.map((s, i) => (
          <div key={i} onMouseDown={() => { setQ(s); setShowSugg(false); liveSearch(s); }}
            style={{
              padding: '10px 14px', cursor: 'pointer', display: 'flex', gap: 10,
              borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background .15s', alignItems: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ color: 'var(--cyan)' }}>🔎</span>
            <span style={{ fontSize: '0.84rem' }}>{s}</span>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Quick filter chips */}
  <div className="fbar" style={{ marginBottom: '0.8rem' }}>
    {['Mumbai', 'Singapore', 'Dubai', 'Rotterdam', 'Colombo', 'Karachi', 'Fujairah', 'Shanghai'].map(p => (
      <button key={p} className={`fbtn ${q === p ? 'active' : ''}`} onClick={() => { setQ(p); liveSearch(p); }}>
        {p}
      </button>
    ))}
  </div>

  {!searched && !searching && (
    <div className="empty">
      <div className="empty-icon">🛤</div>
      <div className="empty-t">Search Route Files</div>
      <div className="empty-d">Searches live from database — type a port name or keyword</div>
    </div>
  )}
  {searching && (
    <div className="loading"><div className="spin" /><span>Searching live database…</span></div>
  )}
  {searched && !searching && results.length === 0 && (
    <div className="empty">
      <div className="empty-icon">🔍</div>
      <div className="empty-t">No Routes Found</div>
      <div className="empty-d">Try different keywords or partial port name</div>
    </div>
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
            <span className="ftag" style={{
              background: 'rgba(0,212,255,0.06)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.15)'
            }}>Live</span>
          </div>
          {user
            ? <button className="dl-btn" onClick={() => handleDL(r)}>⬇ Download</button>
            : <button className="login-req" onClick={() => setTab('login')}>🔐 Login to Download</button>
          }
        </div>
      ))}
    </div>
  )}
</div>

);
}
export default RoutesPage;


