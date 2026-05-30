/* eslint-disable */
// src/pages/AccountPage.jsx
import { useState, useEffect, useRef } from "react";   // ← FIXED: useRef added
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";

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

// All country dial codes
const COUNTRY_CODES = [
  {dial:'+91',name:'India'},{dial:'+971',name:'UAE'},{dial:'+65',name:'Singapore'},
  {dial:'+63',name:'Philippines'},{dial:'+92',name:'Pakistan'},{dial:'+880',name:'Bangladesh'},
  {dial:'+60',name:'Malaysia'},{dial:'+86',name:'China'},{dial:'+81',name:'Japan'},
  {dial:'+82',name:'South Korea'},{dial:'+966',name:'Saudi Arabia'},{dial:'+974',name:'Qatar'},
  {dial:'+965',name:'Kuwait'},{dial:'+973',name:'Bahrain'},{dial:'+968',name:'Oman'},
  {dial:'+44',name:'United Kingdom'},{dial:'+1',name:'United States'},
  {dial:'+61',name:'Australia'},{dial:'+49',name:'Germany'},{dial:'+33',name:'France'},
  {dial:'+39',name:'Italy'},{dial:'+34',name:'Spain'},{dial:'+31',name:'Netherlands'},
  {dial:'+30',name:'Greece'},{dial:'+47',name:'Norway'},{dial:'+46',name:'Sweden'},
  {dial:'+45',name:'Denmark'},{dial:'+358',name:'Finland'},{dial:'+7',name:'Russia'},
  {dial:'+234',name:'Nigeria'},{dial:'+27',name:'South Africa'},{dial:'+20',name:'Egypt'},
  {dial:'+55',name:'Brazil'},{dial:'+52',name:'Mexico'},{dial:'+54',name:'Argentina'},
  {dial:'+62',name:'Indonesia'},{dial:'+98',name:'Iran'},{dial:'+964',name:'Iraq'},
  {dial:'+961',name:'Lebanon'},{dial:'+962',name:'Jordan'},{dial:'+94',name:'Sri Lanka'},
  {dial:'+977',name:'Nepal'},{dial:'+66',name:'Thailand'},{dial:'+84',name:'Vietnam'},
  {dial:'+95',name:'Myanmar'},{dial:'+855',name:'Cambodia'},{dial:'+960',name:'Maldives'},
  {dial:'+48',name:'Poland'},{dial:'+351',name:'Portugal'},{dial:'+40',name:'Romania'},
  {dial:'+380',name:'Ukraine'},{dial:'+90',name:'Turkey'},{dial:'+972',name:'Israel'},
  {dial:'+353',name:'Ireland'},{dial:'+41',name:'Switzerland'},{dial:'+43',name:'Austria'},
  {dial:'+32',name:'Belgium'},{dial:'+420',name:'Czech Republic'},{dial:'+36',name:'Hungary'},
  {dial:'+7',name:'Kazakhstan'},{dial:'+998',name:'Uzbekistan'},{dial:'+254',name:'Kenya'},
  {dial:'+255',name:'Tanzania'},{dial:'+251',name:'Ethiopia'},{dial:'+216',name:'Tunisia'},
  {dial:'+212',name:'Morocco'},{dial:'+213',name:'Algeria'},{dial:'+218',name:'Libya'},
  {dial:'+967',name:'Yemen'},{dial:'+963',name:'Syria'},{dial:'+507',name:'Panama'},
  {dial:'+56',name:'Chile'},{dial:'+57',name:'Colombia'},{dial:'+51',name:'Peru'},
  {dial:'+58',name:'Venezuela'},{dial:'+64',name:'New Zealand'},{dial:'+679',name:'Fiji'},
];

// Parse "+91 9876543210" → { code: '+91', number: '9876543210' }
const parsePhone = (fullPhone) => {
  if (!fullPhone) return { code: '+91', number: '' };
  const match = fullPhone.match(/^(\+\d+)\s(.+)$/);
  if (match) return { code: match[1], number: match[2] };
  return { code: '+91', number: fullPhone };
};

// Searchable country code dropdown
function CountryCodePicker({ value, onChange }) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const [manual, setManual]       = useState(false);
  const [manualVal, setManualVal] = useState('');
  const ref = useRef();   // useRef is now properly imported above

  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = COUNTRY_CODES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  );
  const selected = COUNTRY_CODES.find(c => c.dial === value);

  if (manual) return (
    <div style={{ display:'flex', gap:4, width:130, flexShrink:0 }}>
      <input className="fi" placeholder="+xx" style={{ flex:1, padding:'10px 8px' }}
        value={manualVal} onChange={e => { setManualVal(e.target.value); onChange(e.target.value); }} />
      <button className="btn btn-secondary" style={{ padding:'0 8px', fontSize:'0.7rem' }}
        onClick={() => { setManual(false); onChange('+91'); setManualVal(''); }}>✕</button>
    </div>
  );

  return (
    <div ref={ref} style={{ position:'relative', width:130, flexShrink:0 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'10px 10px', background:'var(--bg2)',
          border:'1px solid var(--border2)', borderRadius:9, color:'var(--text)',
          fontFamily:'Exo 2,sans-serif', fontSize:'0.82rem', cursor:'pointer',
          textAlign:'left', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span><strong>{value}</strong> {selected?.name?.slice(0,8)}{(selected?.name?.length||0)>8?'…':''}</span>
        <span style={{ color:'var(--text3)', fontSize:'0.7rem' }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:500, width:240,
          background:'var(--card)', border:'1px solid var(--border2)', borderRadius:10,
          boxShadow:'0 12px 40px rgba(0,0,0,0.6)', overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)' }}>
            <input className="fi" autoFocus placeholder="Search country or code…"
              style={{ margin:0, padding:'7px 10px', fontSize:'0.8rem' }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight:200, overflowY:'auto' }}>
            {filtered.slice(0,80).map((c,i) => (
              <div key={i} onMouseDown={() => { onChange(c.dial); setOpen(false); setSearch(''); }}
                style={{ padding:'8px 12px', cursor:'pointer', fontSize:'0.8rem',
                  display:'flex', justifyContent:'space-between',
                  borderBottom:'1px solid rgba(255,255,255,0.03)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(0,180,216,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <span style={{ color:'var(--text2)' }}>{c.name}</span>
                <span style={{ color:'var(--cyan)', fontWeight:700 }}>{c.dial}</span>
              </div>
            ))}
            <div onMouseDown={() => { setManual(true); setOpen(false); setSearch(''); }}
              style={{ padding:'10px 12px', cursor:'pointer', fontSize:'0.78rem',
                color:'var(--gold)', borderTop:'1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(240,165,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              ✏️ Enter code manually
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AccountPage component ────────────────────────────────────────────
function AccountPage({ user, userProfile, setUserProfile, notify, setTab }) {
  const [editing, setEditing]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [fetching, setFetching]         = useState(false);
  const [name, setName]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [countryCode, setCountryCode]   = useState('+91');  // ← ADDED: country code state
  const [address, setAddress]           = useState('');
  const [shipName, setShipName]         = useState('');
  const [rank, setRank]                 = useState('');
  const [customRank, setCustomRank]     = useState('');
  const [showCustomRank, setShowCustomRank] = useState(false);

  // Always fetch profile fresh from Firebase on open
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
      if (userProfile) populateForm(userProfile);
      setFetching(false);
    });
  }, [user?.uid]);

  const populateForm = (d) => {
    setName(d.name || '');
    // ← ADDED: parse stored phone to split country code + number
    const parsed = parsePhone(d.phone || '');
    setCountryCode(parsed.code);
    setPhone(parsed.number);
    setAddress(d.address || '');
    setShipName(d.shipName || '');
    const r = d.rank || '';
    if (r && MARITIME_RANKS.includes(r)) { setRank(r); setShowCustomRank(false); }
    else if (r) { setCustomRank(r); setShowCustomRank(true); }
    else { setRank(''); setShowCustomRank(false); }
  };

  const finalRank = showCustomRank ? customRank : rank;

  const saveProfile = async () => {
    if (!user) return;
    if (!name.trim()) { notify('Name cannot be empty', 'error'); return; }
    setLoading(true);
    try {
      // ← ADDED: combine country code + phone number when saving
      const fullPhone = phone.trim() ? `${countryCode} ${phone.trim()}` : '';
      const updates = {
        name: name.trim(), phone: fullPhone,
        address, shipName, rank: finalRank,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updates }));
      setEditing(false);
      notify('✅ Profile updated', 'success');
    } catch (e) { notify('Update failed: ' + e.message, 'error'); }
    setLoading(false);
  };

  const deleteAccount = async () => {
    const password = window.prompt(
      'DELETE ACCOUNT\n\nThis permanently removes all your data.\nEnter your password to confirm:'
    );
    if (!password) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      notify('Account deleted. Goodbye! 👋', 'info');
      setTab('home');
    } catch (e) {
      if (e.code === 'auth/wrong-password') notify('Wrong password. Account not deleted.', 'error');
      else notify('Delete failed: ' + e.message, 'error');
    }
  };

  const rankEmoji = RANK_EMOJI[finalRank] || RANK_EMOJI[userProfile?.rank] || '👤';

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
            <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
              <label className="fl">Full Name *</label>
              <input className="fi" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="ff" style={{ margin:0 }}>
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
                <input className="fi" style={{ marginTop:6 }} placeholder="Enter your rank…"
                  value={customRank} onChange={e => setCustomRank(e.target.value)} />
              )}
            </div>
            {/* ← ADDED: Phone with country code picker */}
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Phone Number</label>
              <div style={{ display:'flex', gap:8 }}>
                <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                <input className="fi" type="tel" placeholder="Phone number"
                  value={phone} onChange={e => setPhone(e.target.value)} style={{ flex:1 }} />
              </div>
              <div style={{ fontSize:'0.62rem', color:'var(--text3)', marginTop:3 }}>
                Code: <strong style={{ color:'var(--cyan)' }}>{countryCode}</strong>
              </div>
            </div>
            <div className="ff" style={{ margin:0 }}>
              <label className="fl">Ship Name</label>
              <input className="fi" placeholder="MV / MT / MSV…" value={shipName} onChange={e => setShipName(e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
              <label className="fl">Address</label>
              <input className="fi" placeholder="City, Country" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
              <label className="fl">Email (cannot be changed here)</label>
              <input className="fi" value={user?.email || ''} disabled style={{ opacity:0.5, cursor:'not-allowed' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>
              {loading ? 'Saving…' : '✅ Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); populateForm(userProfile||{}); }}>Cancel</button>
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
              { label:'Tier',       value:userProfile?.tier==='paid'?'⭐ Paid':'🆓 Free', icon:'🎫' },
            ].map((row,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center',
                padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ width:20, textAlign:'center', flexShrink:0 }}>{row.icon}</span>
                <span style={{ fontSize:'0.7rem', color:'var(--text3)', textTransform:'uppercase',
                  letterSpacing:'0.08em', width:70, flexShrink:0 }}>{row.label}</span>
                <span style={{ fontSize:'0.82rem',
                  color:row.value?'var(--text)':'var(--text3)',
                  fontStyle:row.value?'normal':'italic' }}>
                  {row.value || 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Routes placeholder */}
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

      {/* Saved Charts placeholder */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.8rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'var(--gold)' }}>📊 Saved Charts</div>
          <span className="badge" style={{ background:'rgba(240,165,0,0.12)', color:'var(--gold)', border:'1px solid rgba(240,165,0,0.3)' }}>Coming Soon</span>
        </div>
        <div style={{ textAlign:'center', padding:'1rem 0', color:'var(--text3)', fontSize:'0.76rem' }}>
          <div style={{ fontSize:'1.8rem', marginBottom:6 }}>📊</div>Save favourite ECDIS charts for quick access.
        </div>
      </div>

      {/* GDPR — Delete account */}
      <div style={{ background:'rgba(255,71,87,0.05)', border:'1px solid rgba(255,71,87,0.2)',
        borderRadius:14, padding:'1.2rem', marginTop:'1rem' }}>
        <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--red)', marginBottom:'0.4rem' }}>
          🗑 Delete Account (GDPR)
        </div>
        <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginBottom:'0.8rem', lineHeight:1.5 }}>
          Permanently removes your account and all personal data. This cannot be undone.
        </div>
        <button className="btn btn-secondary"
          style={{ padding:'6px 14px', fontSize:'0.72rem', color:'var(--red)', borderColor:'rgba(255,71,87,0.4)' }}
          onClick={deleteAccount}>
          🗑 Delete My Account
        </button>
      </div>
    </div>
  );
}

export default AccountPage;
