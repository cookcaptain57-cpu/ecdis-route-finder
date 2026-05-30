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

const BLANK = { shipName:'', shipType:'Container Ship', signOn:'', signOff:'', rank:'', notes:'' };

function SeaTimeCalculatorPage({ user, notify }) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [form,     setForm]     = useState({ ...BLANK });
  const [filter,   setFilter]   = useState('all'); // all | active | completed

  useEffect(() => { if (user) loadEntries(); else setLoading(false); }, [user?.uid]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'seatime', user.uid));
      if (snap.exists()) setEntries(snap.data().entries || []);
    } catch {}
    setLoading(false);
  };

  const saveEntries = async (updated) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'seatime', user.uid), { entries: updated, updatedAt: new Date().toISOString() });
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
      updated = entries.map(e => e.id === editId ? { ...form, id: editId } : e);
      notify('✅ Entry updated', 'success');
    } else {
      const newEntry = { ...form, id: Date.now().toString() };
      updated = [newEntry, ...entries];
      notify('✅ Ship entry added', 'success');
    }
    await saveEntries(updated);
    setForm({ ...BLANK }); setShowForm(false); setEditId(null);
  };

  const startEdit = (entry) => {
    setForm({ ...entry }); setEditId(entry.id); setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this sea service entry?')) return;
    await saveEntries(entries.filter(e => e.id !== id));
    notify('Deleted', 'success');
  };

  // Totals
  const totalDays   = entries.reduce((s, e) => s + calcDays(e.signOn, e.signOff), 0);
  const activeDays  = entries.filter(e => !e.signOff).reduce((s,e) => s + calcDays(e.signOn,''), 0);

  const filtered = entries.filter(e => {
    if (filter === 'active')    return !e.signOff;
    if (filter === 'completed') return !!e.signOff;
    return true;
  });

  if (!user) return (
    <div className="section">
      <div className="empty"><div className="empty-icon">🔐</div>
        <div className="empty-t">Login Required</div>
        <div className="empty-d">Please log in to track your sea time.</div></div>
    </div>
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

      {/* Total sea time summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',
        gap:10, marginBottom:'1.2rem' }}>
        {[
          { icon:'⏱', label:'Total Sea Time',  value: formatDuration(totalDays),  color:'var(--cyan)' },
          { icon:'📅', label:'Total Days',      value: totalDays.toLocaleString(), color:'var(--green)' },
          { icon:'🚢', label:'Ships',           value: entries.length,             color:'#A78BFA' },
          { icon:'⚓', label:'Currently Onboard', value: activeDays > 0 ? formatDuration(activeDays) : '—', color:'var(--gold)' },
        ].map((s,i) => (
          <div key={i} style={{ background:'var(--card)', border:'1px solid var(--border)',
            borderRadius:12, padding:'0.9rem', textAlign:'center' }}>
            <div style={{ fontSize:'1.4rem', marginBottom:3 }}>{s.icon}</div>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:'0.62rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)',
          borderRadius:14, padding:'1.3rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'1rem' }}>
            {editId ? '✏️ Edit Entry' : '+ Add Ship Entry'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Ship Name *</label>
              <input className="fi" placeholder="e.g. MV Pacific Star" value={form.shipName}
                onChange={e => setForm(f => ({...f, shipName:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Ship Type *</label>
              <select className="fi" value={form.shipType}
                onChange={e => setForm(f => ({...f, shipType:e.target.value}))}>
                {SHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Rank on this Ship</label>
              <input className="fi" placeholder="e.g. 2nd Officer" value={form.rank}
                onChange={e => setForm(f => ({...f, rank:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Sign-On Date *</label>
              <input className="fi" type="date" value={form.signOn}
                onChange={e => setForm(f => ({...f, signOn:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Sign-Off Date (leave blank if current)</label>
              <input className="fi" type="date" value={form.signOff}
                onChange={e => setForm(f => ({...f, signOff:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Notes</label>
              <input className="fi" placeholder="Flag, IMO, company…" value={form.notes}
                onChange={e => setForm(f => ({...f, notes:e.target.value}))} />
            </div>
            {/* Duration preview */}
            {form.signOn && (
              <div style={{ gridColumn:'1/-1', background:'rgba(0,180,216,0.07)',
                border:'1px solid rgba(0,180,216,0.2)', borderRadius:8, padding:'8px 12px',
                fontSize:'0.78rem', color:'var(--cyan)' }}>
                ⏱ Duration: <strong>{formatDuration(calcDays(form.signOn, form.signOff))}</strong>
                {' '}({calcDays(form.signOn, form.signOff)} days)
                {!form.signOff && ' — currently onboard'}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving…' : editId ? '✅ Update Entry' : '✅ Add Entry'}
            </button>
            <button className="btn btn-secondary"
              onClick={() => { setShowForm(false); setEditId(null); setForm({...BLANK}); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="fbar" style={{ marginBottom:'1rem' }}>
        {[{k:'all',l:`All (${entries.length})`},{k:'active',l:'Currently Onboard'},{k:'completed',l:'Completed'}].map(f => (
          <button key={f.k} className={`fbtn ${filter===f.k?'active':''}`} onClick={() => setFilter(f.k)}>{f.l}</button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spin"/><span>Loading sea time records…</span></div>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">⚓</div>
          <div className="empty-t">No Sea Service Records</div>
          <div className="empty-d">Click "+ Add Ship" to start recording your sea time. All data is saved to your account.</div>
        </div>
      )}

      {/* Entries list */}
      <div style={{ display:'grid', gap:'0.8rem' }}>
        {filtered.map(e => {
          const days = calcDays(e.signOn, e.signOff);
          const active = !e.signOff;
          return (
            <div key={e.id} style={{ background:'var(--card)',
              border:`1px solid ${active?'rgba(0,180,216,0.35)':'var(--border)'}`,
              borderRadius:14, padding:'1rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', fontWeight:700, color:'var(--cyan)' }}>
                      {e.shipName}
                    </span>
                    {active && (
                      <span style={{ padding:'2px 8px', borderRadius:10, fontSize:'0.62rem', fontWeight:700,
                        background:'rgba(0,180,216,0.12)', color:'var(--cyan)',
                        border:'1px solid rgba(0,180,216,0.3)' }}>⚓ ONBOARD</span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:'0.72rem', color:'var(--text2)' }}>
                    <span>🚢 {e.shipType}</span>
                    {e.rank && <span>🎖 {e.rank}</span>}
                  </div>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:'0.72rem', color:'var(--text3)', marginTop:4 }}>
                    <span>📅 Sign-on: <strong style={{ color:'var(--text)' }}>{e.signOn}</strong></span>
                    <span>📅 Sign-off: <strong style={{ color:'var(--text)' }}>{e.signOff || 'Present'}</strong></span>
                  </div>
                  {e.notes && <div style={{ fontSize:'0.7rem', color:'var(--text3)', marginTop:4 }}>📝 {e.notes}</div>}
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1rem', fontWeight:700, color:active?'var(--cyan)':'var(--green)' }}>
                    {formatDuration(days)}
                  </div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text3)' }}>{days} days</div>
                  <div style={{ display:'flex', gap:4, marginTop:6, justifyContent:'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding:'3px 8px', fontSize:'0.66rem' }}
                      onClick={() => startEdit(e)}>✏️ Edit</button>
                    <button className="btn btn-secondary" style={{ padding:'3px 8px', fontSize:'0.66rem', color:'var(--red)', borderColor:'rgba(255,71,87,0.3)' }}
                      onClick={() => deleteEntry(e.id)}>🗑</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {entries.length > 0 && (
        <div className="info-box" style={{ marginTop:'1.2rem', fontSize:'0.72rem' }}>
          🔒 Sea time records are securely saved to your account and sync across all your devices.
        </div>
      )}
    </div>
  );
}

export default SeaTimeCalculatorPage;
