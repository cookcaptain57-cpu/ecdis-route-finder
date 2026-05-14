// src/pages/ChartsPage.jsx
import { useState, useEffect, useRef } from “react”;
import { searchSheetLive } from “../sheets”;
import { ECDIS_BRANDS } from “../constants”;

const CHART_SHEET_ID_2 = ‘1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA’;

// ─── CHARTS PAGE ──────────────────────────────────────────────────────────────
function ChartsPage({ charts, sheetCharts, notify, user, setTab, isAdmin }) {
const [selBrand, setSelBrand] = useState(null);
const [q, setQ] = useState(’’);
const [globalQ, setGlobalQ] = useState(’’);
const [globalResults, setGlobalResults] = useState([]);
const [globalSearching, setGlobalSearching] = useState(false);
const [globalSearched, setGlobalSearched] = useState(false);
const [showSugg, setShowSugg] = useState(false);
const debounceRef = useRef(null);

const CHART_TABS = [‘Sheet1’, ‘Charts’, ‘ECDIS Charts’, ‘Sheet2’, ‘Sheet3’];

// ── Global live search across ALL chart models ────────────────────────────
const doGlobalSearch = async (sq) => {
const s = (sq || globalQ).trim();
if (!s || s.length < 2) return;
setGlobalSearching(true); setGlobalSearched(true); setSelBrand(null);
try {
const res = await searchSheetLive(CHART_SHEET_ID_2, s, CHART_TABS, 50);
setGlobalResults(res);
} catch (e) { notify(’Search error: ’ + e.message, ‘error’); }
setGlobalSearching(false);
};

const handleGlobalChange = e => {
const v = e.target.value; setGlobalQ(v); setGlobalResults([]); setGlobalSearched(false);
clearTimeout(debounceRef.current);
if (v.trim().length >= 2) debounceRef.current = setTimeout(() => doGlobalSearch(v), 500);
};

// ── Per-brand live search ─────────────────────────────────────────────────
const [brandResults, setBrandResults] = useState([]);
const [brandSearching, setBrandSearching] = useState(false);
const debRef2 = useRef(null);

const sb = ECDIS_BRANDS.find(b => b.id === selBrand);

const doBrandSearch = async (sq, brand) => {
const s = (sq || q).trim();
const b = brand || sb;
if (!b) return;
setBrandSearching(true);
try {
const res = await searchSheetLive(CHART_SHEET_ID_2, (s ? s + ’ ’ : ‘’) + b.name, CHART_TABS, 50);
setBrandResults(res.filter(r => {
const hay = Object.values(r).join(’ ’).toLowerCase();
return hay.includes(b.name.toLowerCase()) || hay.includes(b.id);
}));
} catch { setBrandResults([]); }
setBrandSearching(false);
};

useEffect(() => {
if (selBrand) {
setQ(’’); setBrandResults([]);
doBrandSearch(’’, ECDIS_BRANDS.find(b => b.id === selBrand));
}
}, [selBrand]);

const handleBrandQ = e => {
const v = e.target.value; setQ(v);
clearTimeout(debRef2.current);
debRef2.current = setTimeout(() => doBrandSearch(v), 500);
};

const handleDL = async (c) => {
if (!user) { notify(‘Login required’, ‘error’); setTab(‘login’); return; }
const url = c[‘File URL’] || c.fileUrl || c[‘Drive Link’] ||
Object.values(c).find(v => typeof v === ‘string’ && v.includes(‘drive.google’));
if (!url) { notify(‘No download link’, ‘error’); return; }
notify(‘⬇ Downloading…’, ‘success’);
try {
const gd = url.match(//d/([a-zA-Z0-9_-]+)/);
const direct = gd ? `https://drive.google.com/uc?export=download&id=${gd[1]}` : url;
const res = await fetch(direct);
if (!res.ok) throw new Error(‘fetch’);
const blob = await res.blob();
const fname = c[‘File Name’] || c.fileName || ‘chart’;
const a = document.createElement(‘a’);
a.href = URL.createObjectURL(blob); a.download = fname;
document.body.appendChild(a); a.click(); document.body.removeChild(a);
URL.revokeObjectURL(a.href);
notify(‘✅ Downloaded’, ‘success’);
} catch { window.open(url, ‘_blank’); notify(‘Opened in browser — save the file’, ‘success’); }
};

const getName = r =>
r[‘File Name’] || r.fileName || r[‘Chart Name’] ||
Object.values(r).find(v => v && typeof v === ‘string’ && v.length > 2 && !v.startsWith(‘http’)) ||
‘Chart File’;

const getBrand = r => {
const hay = Object.values(r).join(’ ’).toLowerCase();
return ECDIS_BRANDS.find(b => hay.includes(b.name.toLowerCase()) || hay.includes(b.id)) || null;
};

const ResultCard = ({ r }) => {
const b = getBrand(r);
return (
<div className="file-card">
<div className="file-icon">📊</div>
<div className="file-name">{getName(r)}</div>
{b && <div style={{ fontSize: ‘0.7rem’, color: b.color, marginBottom: 4 }}>{b.emoji} {b.name}</div>}
<div className="file-tags">
<span className="ftag tag-chart">Chart File</span>
<span className=“ftag” style={{ background: ‘rgba(0,212,255,0.06)’, color: ‘var(–cyan)’, border: ‘1px solid rgba(0,212,255,0.15)’ }}>Live</span>
</div>
{user
? <button className=“dl-btn” onClick={() => handleDL(r)}>⬇ Download</button>
: <button className=“login-req” onClick={() => setTab(‘login’)}>🔐 Login to Download</button>
}
</div>
);
};

return (
<div className="section">
{/* ── GLOBAL SEARCH ── */}
<div className="sec-hdr">
<div className="sec-title">📊 ECDIS Charts</div>
{globalSearched && <span className="badge badge-gold">{globalResults.length} results</span>}
</div>

```
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
      <div className="siw" style={{ flex: 1 }}>
        <span className="si-ic">🔍</span>
        <input className="si" style={{ paddingLeft: 42 }}
          placeholder="Search ALL ECDIS user charts — port, model, file name…"
          value={globalQ} onChange={handleGlobalChange}
          onKeyDown={e => e.key === 'Enter' && doGlobalSearch()} />
      </div>
      <button className="btn btn-gold" style={{ padding: '0 14px' }} onClick={() => doGlobalSearch()}>Search</button>
      {globalQ && (
        <button className="btn btn-secondary" onClick={() => { setGlobalQ(''); setGlobalResults([]); setGlobalSearched(false); }}>✕</button>
      )}
    </div>
    {globalSearching && (
      <div className="loading" style={{ padding: '8px 0' }}><div className="spin" /><span>Searching all charts…</span></div>
    )}
    {globalSearched && !globalSearching && globalResults.length === 0 && (
      <div style={{ color: 'var(--text3)', fontSize: '0.78rem', padding: '6px 0', textAlign: 'center' }}>
        No charts found — try different keywords
      </div>
    )}
    {globalResults.length > 0 && (
      <div className="files-grid" style={{ marginTop: 8 }}>
        {globalResults.map((r, i) => <ResultCard key={i} r={r} />)}
      </div>
    )}
  </div>

  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
    <div style={{
      fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.8rem',
      textAlign: 'center', letterSpacing: '0.06em', textTransform: 'uppercase'
    }}>
      — Or browse by ECDIS model —
    </div>
  </div>

  {/* ── MODEL BROWSER ── */}
  {!selBrand && (
    <div className="brand-grid">
      {ECDIS_BRANDS.map(b => (
        <div key={b.id} className="brand-card" style={{ borderColor: b.color + '44' }}
          onClick={() => { setSelBrand(b.id); setGlobalQ(''); setGlobalResults([]); setGlobalSearched(false); }}>
          <div className="brand-emoji">{b.emoji}</div>
          <div className="brand-name" style={{ color: b.color }}>{b.name}</div>
          <div className="brand-models">{b.models}</div>
        </div>
      ))}
    </div>
  )}

  {/* ── BRAND DRILL-DOWN ── */}
  {selBrand && (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => { setSelBrand(null); setBrandResults([]); setQ(''); }}>← Back</button>
        <span style={{ fontSize: '1.4rem' }}>{sb?.emoji}</span>
        <div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.88rem', fontWeight: 700, color: sb?.color }}>{sb?.name}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>{sb?.models}</div>
        </div>
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
      {brandSearching && (
        <div className="loading"><div className="spin" /><span>Searching {sb?.name} charts…</span></div>
      )}
      {!brandSearching && brandResults.length === 0 && (
        <div className="empty">
          <div className="empty-icon">{sb?.emoji}</div>
          <div className="empty-t">No Charts Found</div>
          <div className="empty-d">Try a port name or leave blank to see all {sb?.name} charts</div>
        </div>
      )}
      {brandResults.length > 0 && (
        <div className="files-grid">
          {brandResults.map((r, i) => <ResultCard key={i} r={r} />)}
        </div>
      )}
    </>
  )}
</div>
```

);
}

export default ChartsPage;

