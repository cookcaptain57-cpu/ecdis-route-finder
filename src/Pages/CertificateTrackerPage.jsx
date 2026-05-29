/* eslint-disable */
// src/pages/CertificateTrackerPage.jsx
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const CERT_TEMPLATES = [
  { name:'Certificate of Competency (CoC)',     validity:5,  category:'Competency' },
  { name:'GMDSS GOC / ROC',                     validity:5,  category:'Competency' },
  { name:'Medical Certificate (ENG1 / ML5)',    validity:2,  category:'Medical' },
  { name:'STCW Basic Safety Training (BST)',    validity:5,  category:'Safety' },
  { name:'Proficiency in Survival Craft (PSC)', validity:5,  category:'Safety' },
  { name:'Advanced Fire Fighting (AFF)',         validity:5,  category:'Safety' },
  { name:'Medical First Aid (MEFA)',             validity:5,  category:'Medical' },
  { name:'Medical Care on Board (MCOB)',         validity:5,  category:'Medical' },
  { name:'ECDIS Type Specific',                 validity:5,  category:'Navigation' },
  { name:'ARPA / Radar Certificate',            validity:5,  category:'Navigation' },
  { name:'Bridge Resource Management (BRM)',    validity:5,  category:'Navigation' },
  { name:'Engine Room Resource Management',     validity:5,  category:'Engineering' },
  { name:'Oil Tanker Certificate',              validity:5,  category:'Tanker' },
  { name:'Chemical Tanker Certificate',         validity:5,  category:'Tanker' },
  { name:'Gas Tanker Certificate',              validity:5,  category:'Tanker' },
  { name:'COLREGS / Rules of the Road',         validity:5,  category:'Navigation' },
  { name:'Crowd Management',                    validity:5,  category:'Safety' },
  { name:'Passenger Ship Safety',               validity:5,  category:'Safety' },
  // Personal Documents
  { name:'Passport',                            validity:10, category:'Personal' },
  { name:'CDC / Seaman\'s Book',                validity:5,  category:'Personal' },
  { name:'SID - Seafarer Identity Document',    validity:5,  category:'Personal' },
  { name:'Visa',                                validity:2,  category:'Personal' },
  // Medical
  { name:'Yellow Fever Certificate',            validity:99, category:'Medical' },
  // Competency
  { name:'Flag State Certificate / Endorsement',validity:5,  category:'Competency' },
  { name:'STCW Endorsement',                    validity:5,  category:'Competency' },
  { name:'National Endorsement',               validity:5,  category:'Competency' },
];

const KNOWN_CATEGORIES = ['Competency','Safety','Medical','Navigation','Engineering','Tanker','Personal','Others'];

const STATUS = (expiryDate) => {
  if (!expiryDate) return { label:'Unknown', color:'var(--text3)', bg:'rgba(255,255,255,0.05)' };
  if (expiryDate === 'unlimited') return { label:'UNLIMITED', color:'#00b4d8', bg:'rgba(0,180,216,0.1)' };
  const days = Math.floor((new Date(expiryDate) - new Date()) / 86400000);
  if (days < 0)  return { label:'EXPIRED',       color:'#ff4757', bg:'rgba(255,71,87,0.12)',    days };
  if (days < 30) return { label:'EXPIRING SOON', color:'#ff6b35', bg:'rgba(255,107,53,0.12)',   days };
  if (days < 90) return { label:'DUE SOON',      color:'var(--gold)', bg:'rgba(240,165,0,0.1)', days };
  return             { label:'VALID',            color:'var(--green)', bg:'rgba(0,200,100,0.08)', days };
};

const CATEGORIES = ['All', ...KNOWN_CATEGORIES];

const EXPIRY_TIERS = [
  { key:'expired', label:'Expired',      color:'#ff4757', test: d => d < 0 },
  { key:'1mo',     label:'< 1 Month',    color:'#ff5252', test: d => d >= 0  && d < 30  },
  { key:'2mo',     label:'< 2 Months',   color:'#ff6b35', test: d => d >= 30 && d < 60  },
  { key:'3mo',     label:'< 3 Months',   color:'#ff9f43', test: d => d >= 60 && d < 90  },
  { key:'6mo',     label:'< 6 Months',   color:'#ffa502', test: d => d >= 90 && d < 180 },
  { key:'12mo',    label:'< 12 Months',  color:'#f0a500', test: d => d >= 180 && d < 365 },
];

const EMPTY_CERT = { name:'', certNo:'', issueDate:'', expiryDate:'', category:'Safety', notes:'' };

function CertificateTrackerPage({ user, notify }) {
  const [certs,     setCerts]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showAdd,   setShowAdd]   = useState(false);
  const [catFilter, setCatFilter] = useState('All');
  const [newCert,   setNewCert]   = useState({ ...EMPTY_CERT });
  const [customName, setCustomName] = useState(false);

  // --- NEW STATE ---
  const [unlimitedExpiry,    setUnlimitedExpiry]    = useState(false);
  const [customCategory,     setCustomCategory]     = useState(false);

  const [editId,              setEditId]             = useState(null);
  const [editData,            setEditData]           = useState(null);
  const [editCustomName,      setEditCustomName]     = useState(false);
  const [editCustomCategory,  setEditCustomCategory] = useState(false);
  const [editUnlimited,       setEditUnlimited]      = useState(false);

  const [quickId,             setQuickId]            = useState(null);
  const [quickData,           setQuickData]          = useState({ certNo:'', expiryDate:'' });
  const [quickUnlimited,      setQuickUnlimited]     = useState(false);

  const [showExpDash,         setShowExpDash]        = useState(false);
  const [activeTier,          setActiveTier]         = useState(null);
  // -----------------

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
    const name = newCert.name;
    if (!name)                                    { notify('Enter certificate name', 'error'); return; }
    const finalExpiry = unlimitedExpiry ? 'unlimited' : newCert.expiryDate;
    if (!finalExpiry)                             { notify('Enter expiry date or select Unlimited', 'error'); return; }
    const entry = { ...newCert, expiryDate: finalExpiry, id: Date.now().toString() };
    await saveCerts([...certs, entry]);
    setNewCert({ ...EMPTY_CERT });
    setShowAdd(false); setCustomName(false); setCustomCategory(false); setUnlimitedExpiry(false);
    notify('✅ Certificate added', 'success');
  };

  const deleteCert = async (id) => {
    if (!window.confirm('Delete this certificate?')) return;
    await saveCerts(certs.filter(c => c.id !== id));
    notify('Deleted', 'success');
  };

  // --- NEW: Edit ---
  const startEdit = (cert) => {
    setEditId(cert.id);
    setEditData({ ...cert });
    setEditUnlimited(cert.expiryDate === 'unlimited');
    setEditCustomName(!CERT_TEMPLATES.find(t => t.name === cert.name));
    setEditCustomCategory(!KNOWN_CATEGORIES.includes(cert.category));
    setQuickId(null);
  };

  const cancelEdit = () => {
    setEditId(null); setEditData(null);
    setEditCustomName(false); setEditCustomCategory(false); setEditUnlimited(false);
  };

  const saveEdit = async () => {
    if (!editData.name)  { notify('Enter certificate name', 'error'); return; }
    const finalExpiry = editUnlimited ? 'unlimited' : editData.expiryDate;
    if (!finalExpiry)    { notify('Enter expiry date or select Unlimited', 'error'); return; }
    const updated = certs.map(c => c.id === editId ? { ...editData, expiryDate: finalExpiry } : c);
    await saveCerts(updated);
    cancelEdit();
    notify('✅ Certificate updated', 'success');
  };

  // --- NEW: Quick Renew ---
  const startQuick = (cert) => {
    setQuickId(cert.id);
    setQuickData({ certNo: cert.certNo || '', expiryDate: cert.expiryDate === 'unlimited' ? '' : (cert.expiryDate || '') });
    setQuickUnlimited(cert.expiryDate === 'unlimited');
    setEditId(null); cancelEdit();
  };

  const saveQuick = async (id) => {
    const finalExpiry = quickUnlimited ? 'unlimited' : quickData.expiryDate;
    if (!finalExpiry) { notify('Enter new expiry date or select Unlimited', 'error'); return; }
    const updated = certs.map(c => c.id === id
      ? { ...c, expiryDate: finalExpiry, certNo: quickData.certNo || c.certNo }
      : c
    );
    await saveCerts(updated);
    setQuickId(null);
    notify('✅ Certificate renewed', 'success');
  };

  // --- NEW: Tier helper ---
  const getCertsByTier = (tier) =>
    certs.filter(c => {
      if (!c.expiryDate || c.expiryDate === 'unlimited') return false;
      const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
      return tier.test(days);
    });

  const filtered  = catFilter === 'All' ? certs : certs.filter(c => c.category === catFilter);
  const expiring  = certs.filter(c => {
    if (!c.expiryDate || c.expiryDate === 'unlimited') return false;
    const s = STATUS(c.expiryDate);
    return s.days !== undefined && s.days < 90;
  });

  if (!user) return (
    <div className="section">
      <div className="empty">
        <div className="empty-icon">🔐</div>
        <div className="empty-t">Login Required</div>
        <div className="empty-d">Please log in to track your certificates.</div>
      </div>
    </div>
  );

  // Shared form renderer (used by Add form & inline Edit panel)
  const renderFormFields = (data, setData, isCN, setIsCN, isCC, setIsCC, isUnlim, setIsUnlim) => (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>

      {/* Name */}
      <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
        <label className="fl">Certificate / Document Name *</label>
        <select className="fi"
          value={isCN ? '__custom__' : (CERT_TEMPLATES.find(t => t.name === data.name) ? data.name : data.name ? '__custom__' : '')}
          onChange={e => {
            if (e.target.value === '__custom__') {
              setIsCN(true); setData(n => ({ ...n, name:'' }));
            } else {
              const t = CERT_TEMPLATES.find(c => c.name === e.target.value);
              setIsCN(false);
              setData(n => ({ ...n, name: e.target.value, category: t?.category || n.category }));
            }
          }}>
          <option value="">— Select certificate / document —</option>
          {CERT_TEMPLATES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          <option value="__custom__">✏️ Enter custom name…</option>
        </select>
        {isCN && (
          <input className="fi" style={{ marginTop:6 }}
            placeholder="Type custom certificate or course name…"
            value={data.name}
            onChange={e => setData(n => ({ ...n, name: e.target.value }))} />
        )}
      </div>

      {/* Cert No */}
      <div className="ff" style={{ margin:0 }}>
        <label className="fl">Certificate / Document Number</label>
        <input className="fi" placeholder="e.g. INE-12345"
          value={data.certNo}
          onChange={e => setData(n => ({ ...n, certNo: e.target.value }))} />
      </div>

      {/* Category */}
      <div className="ff" style={{ margin:0 }}>
        <label className="fl">Category</label>
        {!isCC ? (
          <select className="fi" value={data.category}
            onChange={e => {
              if (e.target.value === '__custom_cat__') {
                setIsCC(true); setData(n => ({ ...n, category:'' }));
              } else {
                setData(n => ({ ...n, category: e.target.value }));
              }
            }}>
            {KNOWN_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            <option value="__custom_cat__">✏️ Custom category…</option>
          </select>
        ) : (
          <div style={{ display:'flex', gap:6 }}>
            <input className="fi" placeholder="Custom category name…"
              value={data.category}
              onChange={e => setData(n => ({ ...n, category: e.target.value }))} />
            <button
              style={{ background:'none', border:'1px solid var(--border)', borderRadius:6,
                color:'var(--text3)', cursor:'pointer', padding:'0 8px', fontSize:'0.8rem' }}
              onClick={() => { setIsCC(false); setData(n => ({ ...n, category:'Others' })); }}>✕</button>
          </div>
        )}
      </div>

      {/* Issue Date */}
      <div className="ff" style={{ margin:0 }}>
        <label className="fl">Issue Date</label>
        <input className="fi" type="date" value={data.issueDate}
          onChange={e => setData(n => ({ ...n, issueDate: e.target.value }))} />
      </div>

      {/* Expiry Date with Unlimited toggle */}
      <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
        <label className="fl">Expiry Date *</label>
        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer',
          fontSize:'0.75rem', color:'var(--cyan)', marginBottom:6 }}>
          <input type="checkbox" checked={isUnlim}
            onChange={e => setIsUnlim(e.target.checked)}
            style={{ accentColor:'var(--cyan)' }} />
          ∞ &nbsp;No Expiry / Unlimited Validity
        </label>
        {!isUnlim && (
          <input className="fi" type="date" value={data.expiryDate}
            onChange={e => setData(n => ({ ...n, expiryDate: e.target.value }))} />
        )}
      </div>

      {/* Notes */}
      <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
        <label className="fl">Notes</label>
        <input className="fi" placeholder="Issuing authority, flag state, endorsements…"
          value={data.notes}
          onChange={e => setData(n => ({ ...n, notes: e.target.value }))} />
      </div>
    </div>
  );

  return (
    <div className="section">

      {/* Header */}
      <div className="sec-hdr">
        <div className="sec-title">📜 Certificate Tracker</div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          {expiring.length > 0 && (
            <span style={{ background:'rgba(255,71,87,0.15)', color:'#ff4757',
              border:'1px solid rgba(255,71,87,0.3)', borderRadius:20, padding:'3px 10px',
              fontSize:'0.7rem', fontWeight:700 }}>
              ⚠️ {expiring.length} expiring
            </span>
          )}
          <button
            style={{ padding:'6px 14px', fontSize:'0.74rem', background:'rgba(0,180,216,0.1)',
              color:'var(--cyan)', border:'1px solid rgba(0,180,216,0.3)', borderRadius:8, cursor:'pointer' }}
            onClick={() => { setShowExpDash(s => !s); setActiveTier(null); }}>
            {showExpDash ? '✕ Timeline' : '📅 Expiry Timeline'}
          </button>
          <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:'0.74rem' }}
            onClick={() => setShowAdd(s => !s)}>
            {showAdd ? '✕ Cancel' : '+ Add Certificate'}
          </button>
        </div>
      </div>

      {/* Expiry alerts (existing) */}
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

      {/* NEW: Expiry Timeline Dashboard */}
      {showExpDash && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.2)',
          borderRadius:14, padding:'1.2rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'1rem' }}>
            📅 CERTIFICATE EXPIRY TIMELINE
          </div>

          {/* Tier overview cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))', gap:8, marginBottom:'1rem' }}>
            {EXPIRY_TIERS.map(tier => {
              const count = getCertsByTier(tier).length;
              const isActive = activeTier === tier.key;
              return (
                <div key={tier.key} onClick={() => setActiveTier(isActive ? null : tier.key)}
                  style={{ background: isActive ? `${tier.color}22` : `${tier.color}0d`,
                    border:`1px solid ${isActive ? tier.color : tier.color+'44'}`,
                    borderRadius:10, padding:'0.75rem 0.5rem', cursor:'pointer',
                    textAlign:'center', transition:'all 0.2s' }}>
                  <div style={{ fontSize:'1.5rem', fontWeight:900, color: count > 0 ? tier.color : 'var(--text3)' }}>
                    {count}
                  </div>
                  <div style={{ fontSize:'0.62rem', color:'var(--text3)', marginTop:2, lineHeight:1.3 }}>
                    {tier.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected tier list */}
          {activeTier && (() => {
            const tier = EXPIRY_TIERS.find(t => t.key === activeTier);
            const tierCerts = getCertsByTier(tier);
            return (
              <div style={{ borderTop:`1px solid ${tier.color}33`, paddingTop:'0.8rem' }}>
                <div style={{ fontSize:'0.72rem', color: tier.color, fontWeight:700,
                  fontFamily:'Orbitron,monospace', marginBottom:'0.6rem' }}>
                  {tier.label} — {tierCerts.length} certificate{tierCerts.length !== 1 ? 's' : ''}
                </div>
                {tierCerts.length === 0 ? (
                  <div style={{ fontSize:'0.74rem', color:'var(--text3)', textAlign:'center', padding:'0.8rem' }}>
                    ✅ No certificates in this range
                  </div>
                ) : (
                  <div style={{ display:'grid', gap:6 }}>
                    {tierCerts.map(c => {
                      const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
                      return (
                        <div key={c.id} style={{ display:'flex', justifyContent:'space-between',
                          alignItems:'center', background:'rgba(255,255,255,0.03)',
                          border:`1px solid ${tier.color}22`, borderRadius:8, padding:'0.5rem 0.8rem' }}>
                          <div>
                            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text)' }}>{c.name}</div>
                            <div style={{ fontSize:'0.65rem', color:'var(--text3)' }}>{c.category}</div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:'0.72rem', color: tier.color, fontWeight:700 }}>
                              {days < 0 ? 'EXPIRED' : `${days}d left`}
                            </div>
                            <div style={{ fontSize:'0.65rem', color:'var(--text3)' }}>{c.expiryDate}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {EXPIRY_TIERS.every(t => getCertsByTier(t).length === 0) && (
            <div style={{ textAlign:'center', fontSize:'0.74rem', color:'var(--green)', padding:'0.4rem' }}>
              ✅ All certificates valid for more than 12 months
            </div>
          )}
        </div>
      )}

      {/* Add certificate form */}
      {showAdd && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)',
          borderRadius:14, padding:'1.3rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', color:'var(--cyan)', marginBottom:'1rem' }}>
            + Add New Certificate / Document
          </div>
          {renderFormFields(
            newCert,   setNewCert,
            customName, setCustomName,
            customCategory, setCustomCategory,
            unlimitedExpiry, setUnlimitedExpiry
          )}
          <button className="btn btn-primary" style={{ marginTop:10 }} onClick={addCert} disabled={saving}>
            {saving ? 'Saving…' : '✅ Add Certificate'}
          </button>
        </div>
      )}

      {/* Category filter */}
      <div className="fbar" style={{ marginBottom:'1rem' }}>
        {CATEGORIES.map(c => (
          <button key={c} className={`fbtn ${catFilter===c?'active':''}`} onClick={() => setCatFilter(c)}>{c}</button>
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
            const isEditing     = editId    === c.id;
            const isQuickUpdate = quickId   === c.id;

            return (
              <div key={c.id} style={{ background:'var(--card)', border:`1px solid ${s.color}33`,
                borderRadius:12, padding:'1rem', display:'flex', flexDirection:'column', gap:0 }}>

                {/* ── Card body row ── */}
                <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
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
                      {c.certNo && (
                        <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>
                          No: <strong style={{ color:'var(--cyan)' }}>{c.certNo}</strong>
                        </span>
                      )}
                      {c.issueDate && (
                        <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Issued: {c.issueDate}</span>
                      )}
                      {c.expiryDate && c.expiryDate !== 'unlimited' && (
                        <span style={{ fontSize:'0.72rem', color:'var(--text3)' }}>
                          Expires: <strong style={{ color:s.color }}>{c.expiryDate}</strong>
                        </span>
                      )}
                      {c.expiryDate === 'unlimited' && (
                        <span style={{ fontSize:'0.72rem', color:'#00b4d8' }}>∞ Unlimited Validity</span>
                      )}
                      <span style={{ fontSize:'0.62rem', color:'var(--text3)',
                        background:'rgba(255,255,255,0.05)', padding:'1px 7px', borderRadius:10 }}>
                        {c.category}
                      </span>
                    </div>
                    {c.notes && (
                      <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginTop:4 }}>📝 {c.notes}</div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                    <button
                      onClick={() => isQuickUpdate ? setQuickId(null) : startQuick(c)}
                      style={{ background: isQuickUpdate ? 'rgba(0,200,100,0.15)' : 'rgba(0,180,216,0.08)',
                        border:`1px solid ${isQuickUpdate ? 'rgba(0,200,100,0.4)' : 'rgba(0,180,216,0.3)'}`,
                        color: isQuickUpdate ? 'var(--green)' : 'var(--cyan)',
                        borderRadius:6, cursor:'pointer', fontSize:'0.63rem', padding:'4px 8px', fontWeight:700, whiteSpace:'nowrap' }}>
                      🔄 Renew
                    </button>
                    <button
                      onClick={() => isEditing ? cancelEdit() : startEdit(c)}
                      style={{ background: isEditing ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.05)',
                        border:`1px solid ${isEditing ? 'rgba(240,165,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: isEditing ? 'var(--gold)' : 'var(--text2)',
                        borderRadius:6, cursor:'pointer', fontSize:'0.63rem', padding:'4px 8px', fontWeight:700 }}>
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => deleteCert(c.id)}
                      style={{ background:'none', border:'1px solid rgba(255,71,87,0.25)',
                        color:'#ff4757', borderRadius:6, cursor:'pointer', fontSize:'0.63rem', padding:'4px 8px' }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* ── Quick Renew panel ── */}
                {isQuickUpdate && (
                  <div style={{ borderTop:'1px solid rgba(0,200,100,0.2)', marginTop:10, paddingTop:10 }}>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--green)', marginBottom:8 }}>
                      🔄 QUICK RENEWAL
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      <div className="ff" style={{ margin:0 }}>
                        <label className="fl">New Certificate No.</label>
                        <input className="fi" placeholder="Updated cert number…"
                          value={quickData.certNo}
                          onChange={e => setQuickData(d => ({ ...d, certNo: e.target.value }))} />
                      </div>
                      <div className="ff" style={{ margin:0 }}>
                        <label className="fl">New Expiry Date</label>
                        <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer',
                          fontSize:'0.72rem', color:'var(--cyan)', marginBottom:5 }}>
                          <input type="checkbox" checked={quickUnlimited}
                            onChange={e => setQuickUnlimited(e.target.checked)}
                            style={{ accentColor:'var(--cyan)' }} />
                          ∞ Unlimited
                        </label>
                        {!quickUnlimited && (
                          <input className="fi" type="date" value={quickData.expiryDate}
                            onChange={e => setQuickData(d => ({ ...d, expiryDate: e.target.value }))} />
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6, marginTop:8 }}>
                      <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'5px 12px' }}
                        onClick={() => saveQuick(c.id)} disabled={saving}>
                        {saving ? 'Saving…' : '✅ Save Renewal'}
                      </button>
                      <button
                        style={{ background:'none', border:'1px solid var(--border)', borderRadius:7,
                          color:'var(--text3)', cursor:'pointer', fontSize:'0.72rem', padding:'5px 10px' }}
                        onClick={() => setQuickId(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Full Edit panel ── */}
                {isEditing && !isQuickUpdate && editData && (
                  <div style={{ borderTop:'1px solid rgba(240,165,0,0.25)', marginTop:10, paddingTop:10 }}>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.68rem', color:'var(--gold)', marginBottom:8 }}>
                      ✏️ EDIT CERTIFICATE
                    </div>
                    {renderFormFields(
                      editData, setEditData,
                      editCustomName, setEditCustomName,
                      editCustomCategory, setEditCustomCategory,
                      editUnlimited, setEditUnlimited
                    )}
                    <div style={{ display:'flex', gap:6, marginTop:10 }}>
                      <button className="btn btn-primary" style={{ fontSize:'0.72rem', padding:'5px 12px' }}
                        onClick={saveEdit} disabled={saving}>
                        {saving ? 'Saving…' : '✅ Save Changes'}
                      </button>
                      <button
                        style={{ background:'none', border:'1px solid var(--border)', borderRadius:7,
                          color:'var(--text3)', cursor:'pointer', fontSize:'0.72rem', padding:'5px 10px' }}
                        onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
