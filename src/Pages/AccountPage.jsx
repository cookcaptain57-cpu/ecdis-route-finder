/* eslint-disable */
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";

const MARITIME_RANKS = [
  'Captain / Master','Superintendent','Chief Officer (1st Officer)','2nd Officer',
  '3rd Officer','Navigating Officer','Chief Engineer','2nd Engineer','3rd Engineer',
  '4th Engineer','Engine Rating','Electrical Officer (ETO)','Bosun',
  'AB Seaman (Rating)','Ordinary Seaman (OS)','Sailor','Deck Cadet','Engine Cadet',
  'Shore-based / Other',
];

const RANK_EMOJI = {
  'Captain / Master':'🎖️','Superintendent':'🏢','Chief Officer (1st Officer)':'🔱',
  '2nd Officer':'⭐','3rd Officer':'⭐','Navigating Officer':'🧭',
  'Chief Engineer':'⚙️','2nd Engineer':'⚙️','3rd Engineer':'⚙️','4th Engineer':'⚙️',
  'Engine Rating':'🔧','Electrical Officer (ETO)':'⚡','Bosun':'⚓',
  'AB Seaman (Rating)':'🌊','Ordinary Seaman (OS)':'🌊','Sailor':'⛵',
  'Deck Cadet':'🎓','Engine Cadet':'🎓','Shore-based / Other':'🏢',
};

function AccountPage({ user, userProfile, setUserProfile, notify, setTab }) {
  const [editing, setEditing]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [fetching, setFetching]     = useState(false);
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [address, setAddress]       = useState('');
  const [shipName, setShipName]     = useState('');
  const [rank, setRank]             = useState('');
  const [customRank, setCustomRank] = useState('');
  const [showCustomRank, setShowCustomRank] = useState(false);

  // Always fetch profile fresh from Firebase — not from cache or IDB
  // This ensures data persists across device changes and browser clears
  useEffect(() => {
    if (!user) return;
    setFetching(true);
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setUserProfile(prev => ({ ...prev, ...d }));
        populateForm(d);
      }
      setFetching(false);
    }).catch(() => {
      // Fallback to prop data if fetch fails
      if (userProfile) populateForm(userProfile);
      setFetching(false);
    });
  }, [user?.uid]);

  const populateForm = (d) => {
    setName(d.name || '');
    setPhone(d.phone || '');
    setAddress(d.address || '');
    setShipName(d.shipName || '');
    const r = d.rank || '';
    if (r && MARITIME_RANKS.includes(r)) { setRank(r); setShowCustomRank(false); }
    else if (r) { setCustomRank(r); setShowCustomRank(true); }
  };

  const finalRank = showCustomRank ? customRank : rank;

  const saveProfile = async () => {
    if (!user) return;
    if (!name.trim()) { notify('Name cannot be empty', 'error'); return; }
    setLoading(true);
    try {
      const updates = { name: name.trim(), phone, address, shipName, rank: finalRank, updatedAt: serverTimestamp() };
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updates }));
      setEditing(false);
      notify('✅ Profile updated', 'success');
    } catch (e) { notify('Update failed: ' + e.message, 'error'); }
    setLoading(false);
  };

  const rankEmoji = RANK_EMOJI[userProfile?.rank] || RANK_EMOJI[customRank] || '👤';

  if (fetching) return (
    <div className="section">
      <div className="loading"><div className="spin" /><span>Loading your profile from Firebase…</span></div>
    </div>
  );

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">👤 My Account</div>
        <button className="btn btn-secondary"
          style={{ padding:'5px 12px', fontSize:'0.72rem', color:'var(--red)', borderColor:'rgba(255,71,87,0.4)' }}
          onClick={() => { signOut(auth); notify('Logged out', 'info'); setTab('home'); }}>
          🚪 Logout
        </button>
      </div>

      {/* Profile card */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
        padding:'1.4rem', marginBottom:'1.2rem', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,var(--cyan),var(--blue))',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem' }}>
          {rankEmoji}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.92rem', fontWeight:700, color:'var(--cyan)', marginBottom:2 }}>
            {userProfile?.name || user?.email?.split('@')[0] || 'User'}
          </div>
          {userProfile?.rank && <div style={{ fontSize:'0.78rem', color:'var(--gold)', marginBottom:2 }}>{userProfile.rank}</div>}
          {userProfile?.shipName && <div style={{ fontSize:'0.74rem', color:'var(--text2)' }}>🚢 {userProfile.shipName}</div>}
          <div style={{ fontSize:'0.7rem', color:'var(--text3)', marginTop:4 }}>{user?.email}</div>
        </div>
        <button className="btn btn-primary" style={{ padding:'7px 14px', fontSize:'0.74rem' }}
          onClick={() => setEditing(e => !e)}>
          {editing ? '✕ Cancel' : '✏️ Edit Profile'}
        </button>
      </div>

      {/* Edit form */}
      {editing && (
        <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)',
          borderRadius:14, padding:'1.3rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.78rem', fontWeight:700,
            color:'var(--cyan)', marginBottom:'1rem' }}>✏️ Edit Profile</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="ff" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Full Name *</label>
              <input className="fi" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="ff">
              <label className="fl">Rank / Designation</label>
              <select className="fi" value={showCustomRank ? '__other__' : rank}
                onChange={e => {
                  if (e.target.value === '__other__') { setShowCustomRank(true); setRank(''); }
                  else { setShowCustomRank(false); setRank(e.target.value); }
                }}>
                <option value="">— Select rank —</option>
                {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                <option value="__other__">✏️ Other — type below</option>
              </select>
              {showCustomRank && (
                <input className="fi" style={{ marginTop:6 }}
                  placeholder="Enter your rank…" value={customRank}
                  onChange={e => setCustomRank(e.target.value)} />
              )}
            </div>
            <div className="ff">
              <label className="fl">Phone Number</label>
              <input className="fi" type="tel" placeholder="Your phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="ff">
              <label className="fl">Ship Name</label>
              <input className="fi" placeholder="MV / MT / MSV…" value={shipName} onChange={e => setShipName(e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Address</label>
              <input className="fi" placeholder="City, Country" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn:'1/-1' }}>
              <label className="fl">Email (cannot be changed)</label>
              <input className="fi" value={user?.email || ''} disabled style={{ opacity:0.5, cursor:'not-allowed' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>
              {loading ? 'Saving…' : '✅ Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); populateForm(userProfile || {}); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Read-only profile view */}
      {!editing && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14,
          padding:'1.2rem', marginBottom:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700,
            marginBottom:'1rem', color:'var(--text2)' }}>📋 Profile Details</div>
          <div style={{ display:'grid', gap:'0.6rem' }}>
            {[
              { label:'Full Name',  value:userProfile?.name,     icon:'👤' },
              { label:'Rank',       value:userProfile?.rank,     icon:rankEmoji },
              { label:'Ship Name',  value:userProfile?.shipName, icon:'🚢' },
              { label:'Phone',      value:userProfile?.phone,    icon:'📱' },
              { label:'Email',      value:user?.email,           icon:'✉️' },
              { label:'Address',    value:userProfile?.address,  icon:'📍' },
              { label:'Tier',       value:userProfile?.tier === 'paid' ? '⭐ Paid' : '🆓 Free', icon:'🎫' },
            ].map((row, i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center',
                padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ width:20, textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                <span style={{ fontSize:'0.7rem', color:'var(--text3)', textTransform:'uppercase',
                  letterSpacing:'0.08em', width:70, flexShrink:0 }}>{row.label}</span>
                <span style={{ fontSize:'0.82rem', color:row.value?'var(--text)':'var(--text3)',
                  fontStyle:row.value?'normal':'italic' }}>
                  {row.value || 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved items placeholders */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14,
        padding:'1.2rem', marginBottom:'1rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.8rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'var(--cyan)' }}>🛤 Saved Routes</div>
          <span className="badge" style={{ background:'rgba(240,165,0,0.12)', color:'var(--gold)', border:'1px solid rgba(240,165,0,0.3)' }}>Coming Soon</span>
        </div>
        <div style={{ textAlign:'center', padding:'1rem 0', color:'var(--text3)', fontSize:'0.76rem' }}>
          <div style={{ fontSize:'1.8rem', marginBottom:6 }}>🛤</div>Save favourite routes for quick access.
        </div>
      </div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.8rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'var(--gold)' }}>📊 Saved Charts</div>
          <span className="badge" style={{ background:'rgba(240,165,0,0.12)', color:'var(--gold)', border:'1px solid rgba(240,165,0,0.3)' }}>Coming Soon</span>
        </div>
        <div style={{ textAlign:'center', padding:'1rem 0', color:'var(--text3)', fontSize:'0.76rem' }}>
          <div style={{ fontSize:'1.8rem', marginBottom:6 }}>📊</div>Save favourite ECDIS charts for quick access.
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
