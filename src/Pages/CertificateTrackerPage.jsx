/* eslint-disable */
// src/pages/CertificateTrackerPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CERT_TEMPLATES = [
  { name:'Certificate of Competency (CoC)',   validity:5,  category:'Competency' },
  { name:'GMDSS GOC / ROC',                   validity:5,  category:'Competency' },
  { name:'Medical Certificate (ENG1 / ML5)',  validity:2,  category:'Medical' },
  { name:'STCW Basic Safety Training (BST)',  validity:5,  category:'Safety' },
  { name:'Proficiency in Survival Craft (PSC)', validity:5, category:'Safety' },
  { name:'Advanced Fire Fighting (AFF)',       validity:5,  category:'Safety' },
  { name:'Medical First Aid (MEFA)',           validity:5,  category:'Medical' },
  { name:'Medical Care on Board (MCOB)',       validity:5,  category:'Medical' },
  { name:'ECDIS Type Specific',               validity:5,  category:'Navigation' },
  { name:'ARPA / Radar Certificate',          validity:5,  category:'Navigation' },
  { name:'Bridge Resource Management (BRM)',  validity:5,  category:'Navigation' },
  { name:'Engine Room Resource Management',   validity:5,  category:'Engineering' },
  { name:'Oil Tanker Certificate',            validity:5,  category:'Tanker' },
  { name:'Chemical Tanker Certificate',       validity:5,  category:'Tanker' },
  { name:'Gas Tanker Certificate',            validity:5,  category:'Tanker' },
  { name:'COLREGS / Rules of the Road',       validity:5,  category:'Navigation' },
  { name:'Crowd Management',                  validity:5,  category:'Safety' },
  { name:'Passenger Ship Safety',             validity:5,  category:'Safety' },
];

const STATUS = (expiryDate) => {
  if (!expiryDate) return { label:'Unknown', color:'var(--text3)', bg:'rgba(255,255,255,0.05)' };
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
  if (days < 0)   return { label:'EXPIRED',        color:'#ff4757', bg:'rgba(255,71,87,0.12)',    days };
  if (days < 30)  return { label:'EXPIRING SOON',  color:'#ff6b35', bg:'rgba(255,107,53,0.12)',   days };
  if (days < 90)  return { label:'DUE SOON',       color:'var(--gold)', bg:'rgba(240,165,0,0.1)', days };
  return              { label:'VALID',             color:'var(--green)', bg:'rgba(0,200,100,0.08)', days };
};

const CATEGORIES = ['All', 'Competency', 'Safety', 'Medical', 'Navigation', 'Engineering', 'Tanker'];

function CertificateTrackerPage({ user, notify }) {
  const [certs,    setCerts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [showAdd,  setShowAdd]  = useState(false);
  const [catFilter,setCatFilter]= useState('All');
  const [newCert,  setNewCert]  = useState({ name:'', certNo:'', issueDate:'', expiryDate:'', category:'Safety', notes:'' });
  const [customName, setCustomName] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadCerts();
  }, [user?.uid]);

  const loadCerts = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'certificates', user.uid));
      if (snap.exists()) setCerts(snap.data().list || []);
    } catch {}
    setLoading(false);
  };

  const saveCerts = async (updated) => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'certificates', user.uid), { list: updated, updatedAt: new Date().toISOString() });
      setCerts(updated);
    } catch (e) { notify('Save failed: ' + e.message, 'error'); }
    setSaving(false);
  };

  const addCert = async () => {
    const name = customName ? newCert.name : newCert.name;
    if (!name)             { notify('Enter certificate name', 'error'); return; }
    if (!newCert.expiryDate) { notify('Enter expiry date', 'error'); return; }
    const entry = { ...newCert, id: Date.now().toString(), name };
    await saveCerts([...certs, entry]);
    setNewCert({ name:'', certNo:'', issueDate:'', expiryDate:'', category:'Safety', notes:'' });
    setShowAdd(false); setCustomName(false);
    notify('✅ Certificate added', 'success');
  };

  const deleteCert = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    await saveCerts(certs.filter(c => c.id !== id));
    notify('Deleted', 'success');
  };

  const filtered = catFilter === 'All' ? certs : certs.filter(c => c.category === catFilter);
  const expiring = certs.filter(c => { const s = STATUS(c.expiryDate); return s.days !== undefined && s.days < 90; });

  if (!user) return (
    <div className="section">
      <div className="empty"><div className="empty-icon">🔐</div>
        <div className="empty-t">Login Required</div>
        <div className="empty-d">Please log in to track your certificates.</div></div>
    </div>
  );

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">📜 Certificate Tracker</div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {expiring.length > 0 && (
            <span style={{ background:'rgba(255,71,87,0.15)', color:'#ff4757',
              border:'1px solid rgba(255,71,87,0.3)', borderRadius:20, padding:'3px 10px',
              fontSize:'0.7rem', fontWeight:700 }}>
              ⚠️ {expiring.length} expiring
            </span>
          )}
          <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:'0.74rem' }}
            onClick={() => setShowAdd(s => !s)}>
            {showAdd ? '✕ Cancel' : '+ Add Certificate'}
          </button>
        </div>
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)',
          borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'#ff4757', marginBottom:'0.4rem' }}>
            ⚠️ ACTION REQUIRED
          </div>
          {expiring.map((c, i) => {
            const s = STATUS(c.expiryDate);
            return (
              <div key={i} style={{ fontSize:'0.74rem', color:'var(--text2)', padding:'3px 0' }}>
                <span style={{ color: s.color, fontWeight:700 }}>{s.label}</span> — {c.name}
                {s.days >= 0 ? ` (${s.days} days left)` : ' (renewal overdue)'}
              </div>
            );
          })}
        </div>
      )}

      {/* Add certificate form */}
      {showAdd && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)',
          borderRadius:14, padding:'1.3rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'1rem' }}>
            + Add New Certificate
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
              <label className="fl">Certificate Name *</label>
              <select className="fi" value={customName ? '__custom__' : newCert.name}
                onChange={e => {
                  if (e.target.value === '__custom__') { setCustomName(true); setNewCert(n=>({...n,name:''})); }
                  else {
                    const t = CERT_TEMPLATES.find(c=>c.name===e.target.value);
                    setCustomName(false);
                    setNewCert(n=>({...n, name:e.target.value, category:t?.category||n.category}));
                  }
                }}>
                <option value="">— Select certificate —</option>
                {CERT_TEMPLATES.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
                <option value="__custom__">✏️ Other (type below)</option>
              </select>
              {customName && (
                <input className="fi" style={{ marginTop:6 }} placeholder="Certificate name…"
                  value={newCert.name} onChange={e=>setNewCert(n=>({...n,name:e.target.value}))} />
              )}
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Certificate Number</label>
              <input className="fi" placeholder="e.g. INE-12345" value={newCert.certNo}
                onChange={e=>setNewCert(n=>({...n,certNo:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Category</label>
              <select className="fi" value={newCert.category}
                onChange={e=>setNewCert(n=>({...n,category:e.target.value}))}>
                {['Competency','Safety','Medical','Navigation','Engineering','Tanker'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Issue Date</label>
              <input className="fi" type="date" value={newCert.issueDate}
                onChange={e=>setNewCert(n=>({...n,issueDate:e.target.value}))} />
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Expiry Date *</label>
              <input className="fi" type="date" value={newCert.expiryDate}
                onChange={e=>setNewCert(n=>({...n,expiryDate:e.target.value}))} />
            </div>
            <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
              <label className="fl">Notes</label>
              <input className="fi" placeholder="Issuing authority, endorsements…" value={newCert.notes}
                onChange={e=>setNewCert(n=>({...n,notes:e.target.value}))} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop:10 }} onClick={addCert} disabled={saving}>
            {saving ? 'Saving…' : '✅ Add Certificate'}
          </button>
        </div>
      )}

      {/* Category filter */}
      <div className="fbar" style={{ marginBottom:'1rem' }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`fbtn ${catFilter===c?'active':''}`} onClick={()=>setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {loading && <div className="loading"><div className="spin"/><span>Loading certificates…</span></div>}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <div className="empty-icon">📜</div>
          <div className="empty-t">No Certificates Added Yet</div>
          <div className="empty-d">Click "+ Add Certificate" to start tracking your STCW certificates and renewal dates.</div>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display:'grid', gap:'0.7rem' }}>
          {filtered.map(c => {
            const s = STATUS(c.expiryDate);
            return (
              <div key={c.id} style={{ background:'var(--card)', border:`1px solid ${s.color}33`,
                borderRadius:12, padding:'1rem', display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:8, borderRadius:4, alignSelf:'stretch', background:s.color, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:6 }}>
                    <div style={{ fontWeight:700, fontSize:'0.86rem', color:'var(--text)' }}>{c.name}</div>
                    <span style={{ padding:'2px 10px', borderRadius:20, fontSize:'0.62rem', fontWeight:700,
                      background:s.bg, color:s.color, border:`1px solid ${s.color}44`, flexShrink:0 }}>
                      {s.label}{s.days >= 0 ? ` · ${s.days}d left` : ''}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:16, marginTop:4, flexWrap:'wrap' }}>
                    {c.certNo && <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>No: <strong style={{ color:'var(--cyan)' }}>{c.certNo}</strong></span>}
                    {c.issueDate  && <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Issued: {c.issueDate}</span>}
                    {c.expiryDate && <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Expires: <strong style={{ color:s.color }}>{c.expiryDate}</strong></span>}
                    <span style={{ fontSize:'0.62rem', color:'var(--text3)', background:'rgba(255,255,255,0.05)', padding:'1px 7px', borderRadius:10 }}>{c.category}</span>
                  </div>
                  {c.notes && <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginTop:4 }}>📝 {c.notes}</div>}
                </div>
                <button onClick={() => deleteCert(c.id)}
                  style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:'1rem', flexShrink:0, padding:4 }}>🗑</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="info-box" style={{ marginTop:'1.2rem', fontSize:'0.72rem' }}>
        🔒 Your certificates are securely stored in Firebase and sync across all your devices. Data is only visible to you.
      </div>
    </div>
  );
}

export default CertificateTrackerPage;
