/* eslint-disable */
// src/pages/SeaTimeCalculatorPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SHIP_TYPES = [
  'Container Ship','Oil Tanker (VLCC/ULCC)','Oil Tanker (Aframax/Suezmax)',
  'Product Tanker','Chemical Tanker','LNG Carrier','LPG Carrier',
  'Bulk Carrier','General Cargo','Ro-Ro','Passenger / Cruise',
  'Offshore (AHTS / PSV)','Dredger','Car Carrier','Reefer','Other',
];

const FLAG_STATES = [
  'Panama','Liberia','Marshall Islands','Bahamas','Malta','Cyprus','Antigua & Barbuda',
  'Hong Kong','Singapore','Isle of Man','Norway','Greece','Italy','Germany','Japan',
  'China','India','United Kingdom','United States','Philippines','South Korea',
  'Denmark','Netherlands','Bermuda','Cayman Islands','Vanuatu','Tuvalu','Other',
];

// Common CoC / endorsement requirements (days)
const SEA_TIME_REQUIREMENTS = [
  { id:'oow_deck',    label:'OOW Deck (CoC)',               days:365,  rank:'3rd/2nd Officer' },
  { id:'chief_mate',  label:'Chief Mate (CoC)',              days:365,  rank:'Chief Officer' },
  { id:'master',      label:'Master (CoC)',                  days:730,  rank:'Master' },
  { id:'oow_engine',  label:'OOW Engine (CoC)',              days:365,  rank:'4th/3rd Engineer' },
  { id:'chief_eng',   label:'Chief Engineer (CoC)',          days:730,  rank:'Chief Engineer' },
  { id:'2nd_eng',     label:'2nd Engineer (CoC)',            days:365,  rank:'2nd Engineer' },
  { id:'electro',     label:'Electro-Technical Officer',     days:365,  rank:'ETO' },
  { id:'custom',      label:'Custom Target',                 days:null, rank:'' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const calcDays = (signOn, signOff) => {
  if (!signOn) return 0;
  const from = new Date(signOn);
  const to   = signOff ? new Date(signOff) : new Date();
  return Math.max(0, Math.floor((to - from) / 86400000));
};

const formatDuration = (totalDays) => {
  const years  = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const days   = totalDays % 30;
  const parts  = [];
  if (years  > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  parts.push(`${days}d`);
  return parts.join(' ');
};

// Check if a month (year, monthIndex 0-11) overlaps with a sea service period
const monthOverlaps = (year, month, signOn, signOff) => {
  const mStart = new Date(year, month, 1);
  const mEnd   = new Date(year, month + 1, 0);
  const from   = new Date(signOn);
  const to     = signOff ? new Date(signOff) : new Date();
  return from <= mEnd && to >= mStart;
};

const BLANK = { shipName:'', companyName:'', shipType:'Container Ship', flagState:'Panama',
  signOn:'', signOff:'', rank:'', watchHoursPerDay:'', notes:'' };

function SeaTimeCalculatorPage({ user, notify }) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({ ...BLANK });
  const [filter,   setFilter]   = useState('all');
  const [activeTab, setActiveTab] = useState('list'); // list | monthly | progress | export
  const [selReq,   setSelReq]   = useState('oow_deck');
  const [customDays, setCustomDays] = useState(180);
  const [exportName, setExportName] = useState('');

  useEffect(() => { if (user) loadEntries(); else setLoading(false); }, [user?.uid]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'seatime', user.uid));
      if (snap.exists()) {
        setEntries(snap.data().entries || []);
        setExportName(snap.data().holderName || '');
      }
    } catch {}
    setLoading(false);
  };

  const saveEntries = async (updated) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'seatime', user.uid), { entries:updated, updatedAt:new Date().toISOString(), holderName:exportName });
      setEntries(updated);
    } catch (e) { notify('Save failed: ' + e.message, 'error'); }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!form.shipName.trim()) { notify('Enter ship name', 'error'); return; }
    if (!form.signOn)          { notify('Enter sign-on date', 'error'); return; }
    if (form.signOff && form.signOff < form.signOn) { notify('Sign-off cannot be before sign-on', 'error'); return; }
    let updated;
    if (editId) {
      updated = entries.map(e => e.id === editId ? { ...form, id:editId } : e);
      notify('✅ Entry updated', 'success');
    } else {
      updated = [{ ...form, id:Date.now().toString() }, ...entries];
      notify('✅ Ship entry added', 'success');
    }
    await saveEntries(updated);
    setForm({ ...BLANK }); setShowForm(false); setEditId(null);
  };

  const startEdit = (e) => { setForm({ ...e }); setEditId(e.id); setShowForm(true); window.scrollTo({ top:0, behavior:'smooth' }); };
  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await saveEntries(entries.filter(e => e.id !== id));
    notify('Deleted', 'success');
  };

  // Totals
  const totalDays = entries.reduce((s,e) => s + calcDays(e.signOn, e.signOff), 0);
  const totalWatchHours = entries.reduce((s,e) => {
    const d = calcDays(e.signOn, e.signOff);
    const h = parseFloat(e.watchHoursPerDay) || 0;
    return s + (h > 0 ? d * h : 0);
  }, 0);

  const filtered = entries.filter(e => {
    if (filter==='active')    return !e.signOff;
    if (filter==='completed') return !!e.signOff;
    return true;
  });

  // Progress bar
  const reqObj = SEA_TIME_REQUIREMENTS.find(r => r.id === selReq) || SEA_TIME_REQUIREMENTS[0];
  const targetDays = selReq === 'custom' ? Number(customDays) : reqObj.days;
  const progress = targetDays ? Math.min(100, Math.round((totalDays / targetDays) * 100)) : 0;
  const remaining = Math.max(0, targetDays - totalDays);

  // Monthly summary
  const currentYear = new Date().getFullYear();
  const [summaryYear, setSummaryYear] = useState(currentYear);

  // CDC / Certificate print
  const printCDC = () => {
    const printWindow = window.open('', '_blank');
    const holderName = exportName || user?.email?.split('@')[0] || 'Seafarer';
    const rows = entries.map(e => {
      const d = calcDays(e.signOn, e.signOff);
      return `<tr>
        <td>${e.shipName}</td>
        <td>${e.shipType}</td>
        <td>${e.flagState||'—'}</td>
        <td>${e.companyName||'—'}</td>
        <td>${e.rank||'—'}</td>
        <td>${e.signOn}</td>
        <td>${e.signOff||'Present'}</td>
        <td>${d}</td>
        <td>${e.watchHoursPerDay ? d * parseFloat(e.watchHoursPerDay) + 'h' : '—'}</td>
      </tr>`;
    }).join('');
    printWindow.document.write(`
      <html><head><title>Sea Service Record</title>
      <style>
        body{font-family:Arial,sans-serif;font-size:11px;margin:20px;}
        h1{font-size:16px;text-align:center;border-bottom:2px solid #000;padding-bottom:8px;}
        h2{font-size:13px;margin-top:16px;}
        .header-info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;padding:10px;border:1px solid #ccc;}
        .header-info div{padding:4px;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        th,td{border:1px solid #999;padding:5px 7px;text-align:left;font-size:10px;}
        th{background:#f0f0f0;font-weight:bold;}
        .total{margin-top:16px;font-weight:bold;font-size:12px;padding:8px;border:1px solid #000;}
        .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;}
        .sig-line{border-top:1px solid #000;padding-top:4px;text-align:center;}
        @media print{body{margin:10mm;}}
      </style></head>
      <body>
        <h1>SEA SERVICE RECORD — DISCHARGE BOOK FORMAT</h1>
        <div class="header-info">
          <div><strong>Name of Seafarer:</strong> ${holderName}</div>
          <div><strong>Date of Issue:</strong> ${new Date().toLocaleDateString('en-IN')}</div>
          <div><strong>Total Sea Service:</strong> ${formatDuration(totalDays)} (${totalDays} days)</div>
          <div><strong>Total Watch Hours:</strong> ${totalWatchHours > 0 ? totalWatchHours + ' hrs' : 'Not recorded'}</div>
        </div>
        <h2>Sea Service Entries</h2>
        <table>
          <thead><tr>
            <th>Ship Name</th><th>Ship Type</th><th>Flag</th><th>Company</th>
            <th>Rank</th><th>Sign-On</th><th>Sign-Off</th><th>Days</th><th>Watch Hrs</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="total">TOTAL SEA SERVICE: ${formatDuration(totalDays)} | ${totalDays} Days | ${entries.length} Ships</div>
        <div class="footer">
          <div><div class="sig-line">Signature of Seafarer</div></div>
          <div><div class="sig-line">Stamp & Signature of Authority</div></div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const printCertificate = () => {
    const printWindow = window.open('', '_blank');
    const holderName = exportName || user?.email?.split('@')[0] || 'Seafarer';
    printWindow.document.write(`
      <html><head><title>Sea Service Certificate</title>
      <style>
        body{font-family:'Times New Roman',serif;margin:40px;font-size:12px;line-height:1.8;}
        .cert{max-width:700px;margin:0 auto;border:3px double #000;padding:40px;}
        h1{text-align:center;font-size:20px;text-transform:uppercase;letter-spacing:3px;margin-bottom:4px;}
        .subtitle{text-align:center;font-size:13px;margin-bottom:30px;letter-spacing:2px;}
        p{margin:12px 0;text-align:justify;}
        .details{width:100%;border-collapse:collapse;margin:20px 0;}
        .details td{padding:6px 12px;border-bottom:1px solid #ccc;vertical-align:top;}
        .details td:first-child{font-weight:bold;width:40%;}
        .sig{margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:60px;}
        .sig-box{text-align:center;}
        .sig-line{border-top:1px solid #000;margin-top:40px;padding-top:6px;}
        @media print{body{margin:10mm;}}
      </style></head>
      <body>
        <div class="cert">
          <h1>Sea Service Certificate</h1>
          <div class="subtitle">NavisphereX Marine Systems</div>
          <p>This is to certify that the details of sea service as recorded below have been furnished by the seafarer and are accurate to the best of knowledge.</p>
          <table class="details">
            <tr><td>Name of Seafarer:</td><td>${holderName}</td></tr>
            <tr><td>Total Sea Service:</td><td>${formatDuration(totalDays)} (${totalDays} days)</td></tr>
            <tr><td>Number of Ships:</td><td>${entries.length}</td></tr>
            <tr><td>Total Watch Hours:</td><td>${totalWatchHours > 0 ? totalWatchHours + ' hours' : 'Not recorded'}</td></tr>
            <tr><td>Date of Issue:</td><td>${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</td></tr>
          </table>
          <p><strong>Summary of Sea Service:</strong></p>
          <p>${entries.map(e => `${e.rank||'Officer'} aboard ${e.shipName} (${e.flagState||''} flag, ${e.companyName||''}): ${e.signOn} to ${e.signOff||'Present'} — ${calcDays(e.signOn,e.signOff)} days`).join('; ')}</p>
          <p>⚠️ <em>This document is self-certified. For official CoC applications, sea service must be certified by the Master/Chief Engineer and endorsed by the relevant authority.</em></p>
          <div class="sig">
            <div class="sig-box"><div class="sig-line">Signature of Seafarer<br/><small>${holderName}</small></div></div>
            <div class="sig-box"><div class="sig-line">Date<br/><small>${new Date().toLocaleDateString('en-IN')}</small></div></div>
          </div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!user) return (
    <div className="section"><div className="empty">
      <div className="empty-icon">🔐</div><div className="empty-t">Login Required</div>
      <div className="empty-d">Please log in to track your sea time.</div>
    </div></div>
  );

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">⏱ Sea Time Calculator</div>
        <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:'0.74rem' }}
          onClick={() => { setForm({...BLANK}); setEditId(null); setShowForm(s => !s); }}>
          {showForm && !editId ? '✕ Cancel' : '+ Add Ship'}
        </button>
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:'1.2rem' }}>
        {[
          { icon:'⏱', label:'Total Sea Time',   value:formatDuration(totalDays),    color:'var(--cyan)' },
          { icon:'📅', label:'Total Days',       value:totalDays.toLocaleString(),   color:'var(--green)' },
          { icon:'🚢', label:'Ships',            value:entries.length,               color:'#A78BFA' },
          { icon:'👁', label:'Watch Hours',      value:totalWatchHours > 0 ? totalWatchHours+'h' : '—', color:'var(--gold)' },
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'0.9rem', textAlign:'center' }}>
            <div style={{ fontSize:'1.4rem', marginBottom:3 }}>{s.icon}</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)', borderRadius:14, padding:'1.3rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'1rem' }}>
            {editId ? '✏️ Edit Entry' : '+ Add Ship Entry'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Ship Name *</label>
              <input className="fi" placeholder="e.g. MV Pacific Star" value={form.shipName} onChange={e => setForm(f=>({...f,shipName:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Company Name</label>
              <input className="fi" placeholder="e.g. Maersk Line" value={form.companyName} onChange={e => setForm(f=>({...f,companyName:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Ship Type</label>
              <select className="fi" value={form.shipType} onChange={e => setForm(f=>({...f,shipType:e.target.value}))}>
                {SHIP_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Flag State</label>
              <select className="fi" value={form.flagState} onChange={e => setForm(f=>({...f,flagState:e.target.value}))}>
                {FLAG_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Rank on this Ship</label>
              <input className="fi" placeholder="e.g. 2nd Officer" value={form.rank} onChange={e => setForm(f=>({...f,rank:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Watch Hours / Day (optional)</label>
              <input className="fi" type="number" min="0" max="24" placeholder="e.g. 8" value={form.watchHoursPerDay} onChange={e => setForm(f=>({...f,watchHoursPerDay:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Sign-On Date *</label>
              <input className="fi" type="date" value={form.signOn} onChange={e => setForm(f=>({...f,signOn:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Sign-Off Date (blank = onboard now)</label>
              <input className="fi" type="date" value={form.signOff} onChange={e => setForm(f=>({...f,signOff:e.target.value}))} />
            </div>
            <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
              <label className="fl">Notes</label>
              <input className="fi" placeholder="IMO number, voyage notes…" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} />
            </div>
            {form.signOn && (
              <div style={{ gridColumn:'1/-1', background:'rgba(0,180,216,0.07)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:8, padding:'8px 12px', fontSize:'0.78rem', color:'var(--cyan)' }}>
                ⏱ Duration: <strong>{formatDuration(calcDays(form.signOn,form.signOff))}</strong> ({calcDays(form.signOn,form.signOff)} days)
                {form.watchHoursPerDay && ` · Watch hours: ${calcDays(form.signOn,form.signOff) * parseFloat(form.watchHoursPerDay)}h`}
                {!form.signOff && ' — currently onboard'}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : editId ? '✅ Update Entry' : '✅ Add Entry'}</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); setForm({...BLANK}); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Main tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'1rem', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
        {[['list','📋 Records'],['monthly','📅 Monthly View'],['progress','📊 Progress'],['export','📄 Export']].map(([k,l]) => (
          <button key={k} onClick={() => setActiveTab(k)}
            style={{ padding:'8px 14px', border:'none', background:'transparent', cursor:'pointer',
              fontFamily:'Exo 2,sans-serif', fontSize:'0.78rem', color: activeTab===k?'var(--cyan)':'var(--text2)',
              borderBottom: activeTab===k?'2px solid var(--cyan)':'2px solid transparent',
              transition:'all 0.2s' }}>{l}</button>
        ))}
      </div>

      {/* ── RECORDS TAB ── */}
      {activeTab === 'list' && (
        <>
          <div className="fbar" style={{ marginBottom:'1rem' }}>
            {[{k:'all',l:`All (${entries.length})`},{k:'active',l:'Onboard'},{k:'completed',l:'Completed'}].map(f => (
              <button key={f.k} className={`fbtn ${filter===f.k?'active':''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
            ))}
          </div>
          {loading && <div className="loading"><div className="spin"/><span>Loading…</span></div>}
          {!loading && filtered.length === 0 && (
            <div className="empty"><div className="empty-icon">⚓</div>
              <div className="empty-t">No Records Yet</div>
              <div className="empty-d">Click "+ Add Ship" to start recording your sea time.</div></div>
          )}
          <div style={{ display:'grid', gap:'0.8rem' }}>
            {filtered.map(e => {
              const days = calcDays(e.signOn, e.signOff);
              const active = !e.signOff;
              const watchHrs = e.watchHoursPerDay ? days * parseFloat(e.watchHoursPerDay) : 0;
              return (
                <div key={e.id} style={{ background:'var(--card)', border:`1px solid ${active?'rgba(0,180,216,0.35)':'var(--border)'}`, borderRadius:14, padding:'1rem' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', fontWeight:700, color:'var(--cyan)' }}>{e.shipName}</span>
                        {active && <span style={{ padding:'2px 8px', borderRadius:10, fontSize:'0.62rem', fontWeight:700, background:'rgba(0,180,216,0.12)', color:'var(--cyan)', border:'1px solid rgba(0,180,216,0.3)' }}>⚓ ONBOARD</span>}
                        {e.flagState && <span style={{ fontSize:'0.68rem', color:'var(--text3)', background:'rgba(255,255,255,0.05)', padding:'2px 7px', borderRadius:6 }}>🏳 {e.flagState}</span>}
                      </div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:'0.72rem', color:'var(--text2)' }}>
                        <span>🚢 {e.shipType}</span>
                        {e.rank && <span>🎖 {e.rank}</span>}
                        {e.companyName && <span>🏢 {e.companyName}</span>}
                      </div>
                      <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:'0.72rem', color:'var(--text3)', marginTop:4 }}>
                        <span>📅 {e.signOn} → {e.signOff||'Present'}</span>
                        {watchHrs > 0 && <span>👁 {watchHrs}h watch</span>}
                      </div>
                      {e.notes && <div style={{ fontSize:'0.7rem', color:'var(--text3)', marginTop:4 }}>📝 {e.notes}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:active?'var(--cyan)':'var(--green)' }}>{formatDuration(days)}</div>
                      <div style={{ fontSize:'0.62rem', color:'var(--text3)' }}>{days} days</div>
                      <div style={{ display:'flex', gap:4, marginTop:6, justifyContent:'flex-end' }}>
                        <button className="btn btn-secondary" style={{ padding:'3px 8px', fontSize:'0.66rem' }} onClick={() => startEdit(e)}>✏️</button>
                        <button className="btn btn-secondary" style={{ padding:'3px 8px', fontSize:'0.66rem', color:'var(--red)', borderColor:'rgba(255,71,87,0.3)' }} onClick={() => deleteEntry(e.id)}>🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── MONTHLY VIEW TAB ── */}
      {activeTab === 'monthly' && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'1rem' }}>
            <button className="btn btn-secondary" style={{ padding:'5px 10px' }} onClick={() => setSummaryYear(y=>y-1)}>◀</button>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', color:'var(--cyan)', flex:1, textAlign:'center' }}>{summaryYear}</div>
            <button className="btn btn-secondary" style={{ padding:'5px 10px' }} onClick={() => setSummaryYear(y=>y+1)}>▶</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6, marginBottom:'1rem' }}>
            {MONTHS.map((m, mi) => {
              const atSea = entries.some(e => monthOverlaps(summaryYear, mi, e.signOn, e.signOff));
              return (
                <div key={mi} style={{ background:atSea?'rgba(0,180,216,0.15)':'rgba(255,255,255,0.03)',
                  border:`1px solid ${atSea?'rgba(0,180,216,0.4)':'var(--border)'}`,
                  borderRadius:8, padding:'8px 4px', textAlign:'center', transition:'all 0.2s' }}>
                  <div style={{ fontSize:'0.72rem', fontFamily:'Orbitron,monospace', color:atSea?'var(--cyan)':'var(--text3)' }}>{m}</div>
                  <div style={{ fontSize:'1.2rem', marginTop:2 }}>{atSea ? '🚢' : '🏠'}</div>
                  <div style={{ fontSize:'0.58rem', color:atSea?'var(--cyan)':'var(--text3)', marginTop:2 }}>{atSea?'At Sea':'Ashore'}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:'flex', gap:12, fontSize:'0.74rem', color:'var(--text2)', justifyContent:'center' }}>
            <span>🚢 <strong style={{ color:'var(--cyan)' }}>{MONTHS.filter((_,mi)=>entries.some(e=>monthOverlaps(summaryYear,mi,e.signOn,e.signOff))).length}</strong> months at sea</span>
            <span>🏠 <strong style={{ color:'var(--text3)' }}>{12 - MONTHS.filter((_,mi)=>entries.some(e=>monthOverlaps(summaryYear,mi,e.signOn,e.signOff))).length}</strong> months ashore</span>
          </div>
        </>
      )}

      {/* ── PROGRESS TAB ── */}
      {activeTab === 'progress' && (
        <>
          <div style={{ marginBottom:'1rem' }}>
            <label className="fl">Select Requirement / Target</label>
            <select className="fi" value={selReq} onChange={e=>setSelReq(e.target.value)}>
              {SEA_TIME_REQUIREMENTS.map(r => <option key={r.id} value={r.id}>{r.label}{r.rank?' — '+r.rank:''}</option>)}
            </select>
          </div>
          {selReq === 'custom' && (
            <div className="ff">
              <label className="fl">Custom Target (days)</label>
              <input className="fi" type="number" min="1" value={customDays} onChange={e=>setCustomDays(e.target.value)} />
            </div>
          )}
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.4rem', marginBottom:'1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.8rem' }}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.8rem', color:'var(--cyan)' }}>
                {reqObj.label}
              </div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, color: progress>=100?'var(--green)':'var(--cyan)' }}>
                {progress}%
              </div>
            </div>
            <div style={{ height:16, background:'rgba(255,255,255,0.06)', borderRadius:8, overflow:'hidden', marginBottom:'0.8rem' }}>
              <div style={{ height:'100%', borderRadius:8, transition:'width 0.5s ease',
                width:`${progress}%`,
                background: progress>=100?'linear-gradient(90deg,var(--green),#00a87a)':'linear-gradient(90deg,var(--cyan),var(--blue))' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, textAlign:'center' }}>
              {[
                { label:'Achieved', value:formatDuration(totalDays), color:'var(--cyan)' },
                { label:'Required', value:formatDuration(targetDays), color:'var(--text2)' },
                { label:'Remaining', value:remaining>0?formatDuration(remaining):'✅ Done!', color:remaining>0?'var(--gold)':'var(--green)' },
              ].map((s,i) => (
                <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'8px' }}>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.82rem', fontWeight:700, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text3)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {progress >= 100 && (
              <div style={{ marginTop:'1rem', background:'rgba(0,200,100,0.08)', border:'1px solid rgba(0,200,100,0.25)', borderRadius:8, padding:'10px 14px', textAlign:'center', fontSize:'0.82rem', color:'var(--green)' }}>
                🎉 <strong>Congratulations!</strong> You have met the required sea service for {reqObj.label}.
              </div>
            )}
          </div>
          <div className="info-box" style={{ fontSize:'0.72rem' }}>
            ⚠️ Sea time requirements vary by flag state, classification society and issuing authority. Always verify with the relevant maritime administration (DG Shipping, MCA, AMSA, etc.) before applying.
          </div>
        </>
      )}

      {/* ── EXPORT TAB ── */}
      {activeTab === 'export' && (
        <>
          <div className="ff">
            <label className="fl">Your Full Name (for export documents)</label>
            <input className="fi" placeholder="e.g. Manish Bharti" value={exportName}
              onChange={e => setExportName(e.target.value)}
              onBlur={() => saveEntries(entries)} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:'1rem' }}>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.2rem', textAlign:'center' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>📋</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'var(--cyan)', marginBottom:6 }}>CDC / DISCHARGE BOOK FORMAT</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', marginBottom:'1rem', lineHeight:1.5 }}>
                Printable sea service record in MMD / DG Shipping discharge book format for CoC applications.
              </div>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={printCDC} disabled={entries.length===0}>
                🖨️ Print / Download PDF
              </button>
            </div>
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.2rem', textAlign:'center' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>📜</div>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'var(--gold)', marginBottom:6 }}>SEA SERVICE CERTIFICATE</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text2)', marginBottom:'1rem', lineHeight:1.5 }}>
                Formatted sea service certificate letter for company or DG Shipping submissions.
              </div>
              <button className="btn btn-gold" style={{ width:'100%', justifyContent:'center' }} onClick={printCertificate} disabled={entries.length===0}>
                🖨️ Print / Download PDF
              </button>
            </div>
          </div>
          <div className="info-box" style={{ fontSize:'0.72rem' }}>
            💡 Use <strong>Print → Save as PDF</strong> in the print dialog to get a PDF file. For official submissions, documents must be certified by the Master / Chief Engineer and endorsed by the maritime authority.
          </div>
        </>
      )}
    </div>
  );
}

export default SeaTimeCalculatorPage;
