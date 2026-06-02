/* eslint-disable */
// src/pages/AccountPage.jsx
import { useState, useEffect, useRef } from "react";
import { db, auth } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, query, getDocs, orderBy, limit } from "firebase/firestore";
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

const COUNTRY_CODES = [
  {dial:'+91',name:'India'},{dial:'+971',name:'UAE'},{dial:'+65',name:'Singapore'},
  {dial:'+63',name:'Philippines'},{dial:'+92',name:'Pakistan'},{dial:'+880',name:'Bangladesh'},
  {dial:'+60',name:'Malaysia'},{dial:'+86',name:'China'},{dial:'+81',name:'Japan'},
  {dial:'+82',name:'South Korea'},{dial:'+966',name:'Saudi Arabia'},{dial:'+974',name:'Qatar'},
  {dial:'+965',name:'Kuwait'},{dial:'+973',name:'Bahrain'},{dial:'+968',name:'Oman'},
  {dial:'+44',name:'United Kingdom'},{dial:'+1',name:'United States'},
  {dial:'+61',name:'Australia'},{dial:'+49',name:'Germany'},{dial:'+33',name:'France'},
  {dial:'+39',name:'Italy'},{dial:'+34',name:'Spain'},{dial:'+7',name:'Russia'},
  {dial:'+234',name:'Nigeria'},{dial:'+27',name:'South Africa'},{dial:'+20',name:'Egypt'},
  {dial:'+55',name:'Brazil'},{dial:'+52',name:'Mexico'},{dial:'+62',name:'Indonesia'},
  {dial:'+94',name:'Sri Lanka'},{dial:'+977',name:'Nepal'},{dial:'+66',name:'Thailand'},
  {dial:'+84',name:'Vietnam'},{dial:'+95',name:'Myanmar'},{dial:'+960',name:'Maldives'},
];

const parsePhone = (fullPhone) => {
  if (!fullPhone) return { code:'+91', number:'' };
  const match = fullPhone.match(/^(\+\d+)\s(.+)$/);
  if (match) return { code:match[1], number:match[2] };
  return { code:'+91', number:fullPhone };
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

const calcDays = (signOn, signOff) => {
  if (!signOn) return 0;
  const from = new Date(signOn);
  const to   = signOff ? new Date(signOff) : new Date();
  return Math.max(0, Math.floor((to - from) / 86400000));
};

function CountryCodePicker({ value, onChange }) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState('');
  const [manual, setManual]       = useState(false);
  const [manualVal, setManualVal] = useState('');
  const ref = useRef();
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
      <button onClick={() => setOpen(o=>!o)} style={{ width:'100%', padding:'10px 10px',
        background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:9, color:'var(--text)',
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
                  display:'flex', justifyContent:'space-between', borderBottom:'1px solid rgba(255,255,255,0.03)' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{ color:'var(--text2)' }}>{c.name}</span>
                <span style={{ color:'var(--cyan)', fontWeight:700 }}>{c.dial}</span>
              </div>
            ))}
            <div onMouseDown={() => { setManual(true); setOpen(false); setSearch(''); }}
              style={{ padding:'10px 12px', cursor:'pointer', fontSize:'0.78rem', color:'var(--gold)', borderTop:'1px solid var(--border)' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(240,165,0,0.06)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              ✏️ Enter code manually
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountPage({ user, userProfile, setUserProfile, notify, setTab }) {
  const [editing, setEditing]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [fetching, setFetching]         = useState(false);
  const [name, setName]                 = useState('');
  const [phone, setPhone]               = useState('');
  const [countryCode, setCountryCode]   = useState('+91');
  const [address, setAddress]           = useState('');
  const [shipName, setShipName]         = useState('');
  const [rank, setRank]                 = useState('');
  const [customRank, setCustomRank]     = useState('');
  const [showCustomRank, setShowCustomRank] = useState(false);

  // Extra data
  const [seaTimeData,   setSeaTimeData]   = useState(null);
  const [certsData,     setCertsData]     = useState([]);
  const [dlHistory,     setDlHistory]     = useState([]);
  const [notifPrefs,    setNotifPrefs]    = useState({ newRoutes:true, portNotices:true, certReminders:true });
  const [activeSection, setActiveSection] = useState('profile');

  // Referral code = first 8 chars of UID
  const referralCode = user?.uid?.slice(0,8).toUpperCase() || '—';

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDoc(doc(db, 'seatime', user.uid)),
      getDoc(doc(db, 'certificates', user.uid)),
    ]).then(([userSnap, stSnap, certSnap]) => {
      if (userSnap.exists()) {
        const d = userSnap.data();
        setUserProfile(prev => ({ ...prev, ...d }));
        populateForm(d);
        if (d.notifPrefs) setNotifPrefs(d.notifPrefs);
      }
      if (stSnap.exists()) setSeaTimeData(stSnap.data());
      if (certSnap.exists()) setCertsData(certSnap.data().list || []);
      setFetching(false);
    }).catch(() => {
      if (userProfile) populateForm(userProfile);
      setFetching(false);
    });
    // Load download history
    loadDownloadHistory();
  }, [user?.uid]);

  const loadDownloadHistory = async () => {
    try {
      const today = new Date().toISOString().slice(0,10);
      const snap = await getDoc(doc(db, 'download_counts', `${user.uid}_${today}`));
      if (snap.exists()) {
        const d = snap.data();
        setDlHistory([{ date: today, routes: d.routes||0, charts: d.charts||0 }]);
      }
    } catch {}
  };

  const populateForm = (d) => {
    setName(d.name || '');
    const parsed = parsePhone(d.phone || '');
    setCountryCode(parsed.code); setPhone(parsed.number);
    setAddress(d.address || ''); setShipName(d.shipName || '');
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
      const fullPhone = phone.trim() ? `${countryCode} ${phone.trim()}` : '';
      const updates = { name:name.trim(), phone:fullPhone, address, shipName, rank:finalRank, updatedAt:new Date().toISOString() };
      await setDoc(doc(db, 'users', user.uid), updates, { merge:true });
      setUserProfile(prev => ({ ...prev, ...updates }));
      setEditing(false); notify('✅ Profile updated', 'success');
    } catch (e) { notify('Update failed: ' + e.message, 'error'); }
    setLoading(false);
  };

  const saveNotifPrefs = async (prefs) => {
    setNotifPrefs(prefs);
    try { await setDoc(doc(db, 'users', user.uid), { notifPrefs:prefs }, { merge:true }); notify('✅ Preferences saved', 'success'); }
    catch {}
  };

  const deleteAccount = async () => {
    const password = window.prompt('DELETE ACCOUNT\n\nThis permanently removes all your data.\nEnter your password to confirm:');
    if (!password) return;
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await deleteDoc(doc(db, 'users', user.uid));
      await deleteUser(user);
      notify('Account deleted. Goodbye! 👋', 'info');
      setTab('home');
    } catch (e) {
      if (e.code === 'auth/wrong-password') notify('Wrong password.', 'error');
      else notify('Delete failed: ' + e.message, 'error');
    }
  };

  const rankEmoji = RANK_EMOJI[finalRank] || RANK_EMOJI[userProfile?.rank] || '👤';

  // Sea time summary
  const totalSeaDays = seaTimeData?.entries?.reduce((s,e) => s + calcDays(e.signOn, e.signOff), 0) || 0;
  const shipCount    = seaTimeData?.entries?.length || 0;

  // Cert expiry alerts
  const expiringCerts = certsData.filter(c => {
    if (!c.expiryDate) return false;
    const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
    return days >= 0 && days <= 90;
  });

  // Last login
  const lastLogin = user?.metadata?.lastSignInTime;

  const sections = [
    { k:'profile',    l:'👤 Profile' },
    { k:'security',   l:'🔒 Security' },
    { k:'seatime',    l:'⏱ Sea Time' },
    { k:'certs',      l:'📜 Certificates' },
    { k:'downloads',  l:'📥 Downloads' },
    { k:'notifs',     l:'🔔 Notifications' },
    { k:'referral',   l:'🎁 Referral' },
  ];

  if (fetching) return (
    <div className="section"><div className="loading"><div className="spin"/><span>Loading your profile…</span></div></div>
  );

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">👤 My Account</div>
        <button className="btn btn-secondary" style={{ padding:'5px 12px', fontSize:'0.72rem', color:'var(--red)', borderColor:'rgba(255,71,87,0.4)' }}
          onClick={() => { signOut(auth); notify('Logged out','info'); setTab('home'); }}>🚪 Logout</button>
      </div>

      {/* Profile card */}
      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
        padding:'1.2rem', marginBottom:'1rem', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <div style={{ width:58, height:58, borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,var(--cyan),var(--blue))',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem' }}>
          {rankEmoji}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.88rem', fontWeight:700, color:'var(--cyan)', marginBottom:2 }}>
            {userProfile?.name || user?.email?.split('@')[0] || 'User'}
          </div>
          {userProfile?.rank && <div style={{ fontSize:'0.76rem', color:'var(--gold)', marginBottom:2 }}>{userProfile.rank}</div>}
          {userProfile?.shipName && <div style={{ fontSize:'0.72rem', color:'var(--text2)' }}>🚢 {userProfile.shipName}</div>}
          <div style={{ fontSize:'0.68rem', color:'var(--text3)' }}>{user?.email}</div>
        </div>
        {/* Quick stats */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {totalSeaDays > 0 && (
            <div style={{ background:'rgba(0,180,216,0.08)', border:'1px solid rgba(0,180,216,0.2)', borderRadius:8, padding:'6px 10px', textAlign:'center', cursor:'pointer' }} onClick={() => setTab('seatime')}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'var(--cyan)' }}>{formatDuration(totalSeaDays)}</div>
              <div style={{ fontSize:'0.58rem', color:'var(--text3)' }}>SEA TIME</div>
            </div>
          )}
          {expiringCerts.length > 0 && (
            <div style={{ background:'rgba(255,71,87,0.1)', border:'1px solid rgba(255,71,87,0.3)', borderRadius:8, padding:'6px 10px', textAlign:'center', cursor:'pointer' }} onClick={() => setTab('certs')}>
              <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', fontWeight:700, color:'#ff4757' }}>{expiringCerts.length}</div>
              <div style={{ fontSize:'0.58rem', color:'#ff4757' }}>EXPIRING</div>
            </div>
          )}
        </div>
      </div>

      {/* Certificate expiry alert */}
      {expiringCerts.length > 0 && (
        <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:10, padding:'0.8rem 1rem', marginBottom:'1rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.7rem', color:'#ff4757', marginBottom:'0.4rem' }}>⚠️ CERTIFICATE EXPIRY ALERT</div>
          {expiringCerts.map((c,i) => {
            const days = Math.floor((new Date(c.expiryDate) - new Date()) / 86400000);
            return <div key={i} style={{ fontSize:'0.74rem', color:'var(--text2)', padding:'2px 0' }}>
              {c.name} — <strong style={{ color:days<30?'#ff4757':'var(--gold)' }}>{days} days left</strong> (expires {c.expiryDate})
            </div>;
          })}
          <button className="btn btn-secondary" style={{ marginTop:8, padding:'4px 10px', fontSize:'0.68rem' }} onClick={() => setTab('certs')}>
            View Certificates →
          </button>
        </div>
      )}

      {/* Section tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:'1.2rem', flexWrap:'wrap', borderBottom:'1px solid var(--border)', paddingBottom:4 }}>
        {sections.map(s => (
          <button key={s.k} onClick={() => setActiveSection(s.k)}
            style={{ padding:'6px 11px', border:'none', background:'transparent', cursor:'pointer',
              fontFamily:'Exo 2,sans-serif', fontSize:'0.72rem',
              color:activeSection===s.k?'var(--cyan)':'var(--text2)',
              borderBottom:activeSection===s.k?'2px solid var(--cyan)':'2px solid transparent',
              transition:'all 0.2s', whiteSpace:'nowrap' }}>{s.l}</button>
        ))}
      </div>

      {/* ── PROFILE SECTION ── */}
      {activeSection === 'profile' && (
        <>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'0.8rem' }}>
            <button className="btn btn-primary" style={{ padding:'6px 14px', fontSize:'0.74rem' }} onClick={() => setEditing(e=>!e)}>
              {editing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>
          {editing ? (
            <div style={{ background:'var(--card)', border:'1px solid rgba(0,180,216,0.3)', borderRadius:14, padding:'1.2rem', marginBottom:'1rem' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
                  <label className="fl">Full Name *</label>
                  <input className="fi" value={name} onChange={e=>setName(e.target.value)} />
                </div>
                <div className="ff" style={{ margin:0 }}>
                  <label className="fl">Rank</label>
                  <select className="fi" value={showCustomRank?'__other__':rank} onChange={e=>{ if(e.target.value==='__other__'){setShowCustomRank(true);setRank('');}else{setShowCustomRank(false);setRank(e.target.value);}}}>
                    <option value="">— Select —</option>
                    {MARITIME_RANKS.map(r=><option key={r} value={r}>{r}</option>)}
                    <option value="__other__">✏️ Other</option>
                  </select>
                  {showCustomRank && <input className="fi" style={{ marginTop:6 }} placeholder="Enter rank…" value={customRank} onChange={e=>setCustomRank(e.target.value)} />}
                </div>
                <div className="ff" style={{ margin:0 }}>
                  <label className="fl">Phone</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                    <input className="fi" type="tel" placeholder="Phone number" value={phone} onChange={e=>setPhone(e.target.value)} style={{ flex:1 }} />
                  </div>
                </div>
                <div className="ff" style={{ margin:0 }}>
                  <label className="fl">Ship Name</label>
                  <input className="fi" value={shipName} onChange={e=>setShipName(e.target.value)} />
                </div>
                <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
                  <label className="fl">Address</label>
                  <input className="fi" value={address} onChange={e=>setAddress(e.target.value)} />
                </div>
                <div className="ff" style={{ gridColumn:'1/-1', margin:0 }}>
                  <label className="fl">Email (cannot be changed)</label>
                  <input className="fi" value={user?.email||''} disabled style={{ opacity:0.5 }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10 }}>
                <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>{loading?'Saving…':'✅ Save'}</button>
                <button className="btn btn-secondary" onClick={()=>{setEditing(false);populateForm(userProfile||{});}}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
              {[
                {l:'Full Name', v:userProfile?.name, i:'👤'},
                {l:'Rank',      v:userProfile?.rank, i:rankEmoji},
                {l:'Ship',      v:userProfile?.shipName, i:'🚢'},
                {l:'Phone',     v:userProfile?.phone, i:'📱'},
                {l:'Email',     v:user?.email, i:'✉️'},
                {l:'Address',   v:userProfile?.address, i:'📍'},
                {l:'Tier',      v:userProfile?.tier==='paid'?'⭐ Paid':'🆓 Free', i:'🎫'},
              ].map((row,i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ width:20, textAlign:'center', flexShrink:0 }}>{row.i}</span>
                  <span style={{ fontSize:'0.68rem', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', width:60, flexShrink:0 }}>{row.l}</span>
                  <span style={{ fontSize:'0.8rem', color:row.v?'var(--text)':'var(--text3)', fontStyle:row.v?'normal':'italic' }}>{row.v||'Not set'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── SECURITY SECTION ── */}
      {activeSection === 'security' && (
        <div style={{ display:'grid', gap:'0.8rem' }}>
          <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:12, padding:'1.1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--text2)', marginBottom:'0.8rem' }}>🔒 Account Security</div>
            {[
              {l:'Email', v:user?.email, i:'✉️'},
              {l:'Last Login', v:lastLogin ? new Date(lastLogin).toLocaleString() : '—', i:'🕐'},
              {l:'Account Created', v:userProfile?.createdAt ? new Date(userProfile.createdAt?.seconds*1000).toLocaleDateString() : '—', i:'📅'},
              {l:'Email Verified', v:user?.emailVerified ? '✅ Verified' : '❌ Not Verified', i:'🛡'},
            ].map((row,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ width:20, textAlign:'center', flexShrink:0 }}>{row.i}</span>
                <span style={{ fontSize:'0.68rem', color:'var(--text3)', width:110, flexShrink:0 }}>{row.l}</span>
                <span style={{ fontSize:'0.78rem', color:'var(--text)' }}>{row.v}</span>
              </div>
            ))}
          </div>
          <div style={{ background:'rgba(255,71,87,0.05)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:12, padding:'1.1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--red)', marginBottom:'0.4rem' }}>🗑 Delete Account (GDPR)</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text3)', marginBottom:'0.8rem' }}>Permanently removes your account and all data. Cannot be undone.</div>
            <button className="btn btn-secondary" style={{ padding:'6px 14px', fontSize:'0.72rem', color:'var(--red)', borderColor:'rgba(255,71,87,0.4)' }} onClick={deleteAccount}>🗑 Delete My Account</button>
          </div>
        </div>
      )}

      {/* ── SEA TIME SECTION ── */}
      {activeSection === 'seatime' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
          {seaTimeData?.entries?.length > 0 ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:'1rem' }}>
                {[
                  {l:'Total Sea Time', v:formatDuration(totalSeaDays), c:'var(--cyan)'},
                  {l:'Ships Served', v:shipCount, c:'#A78BFA'},
                  {l:'Total Days', v:totalSeaDays, c:'var(--green)'},
                ].map((s,i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,0.03)', borderRadius:8, padding:'10px', textAlign:'center' }}>
                    <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.9rem', fontWeight:700, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:'0.62rem', color:'var(--text3)', marginTop:2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={() => setTab('seatime')}>
                ⏱ View Full Sea Time Records →
              </button>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'1.5rem 0', color:'var(--text3)' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>⏱</div>
              <div style={{ fontSize:'0.8rem', marginBottom:'1rem' }}>No sea time recorded yet.</div>
              <button className="btn btn-primary" onClick={() => setTab('seatime')}>+ Start Recording Sea Time</button>
            </div>
          )}
        </div>
      )}

      {/* ── CERTIFICATES SECTION ── */}
      {activeSection === 'certs' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
          {certsData.length > 0 ? (
            <>
              {expiringCerts.length > 0 && (
                <div style={{ background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.25)', borderRadius:8, padding:'8px 12px', marginBottom:'1rem', fontSize:'0.74rem', color:'#ff4757' }}>
                  ⚠️ {expiringCerts.length} certificate(s) expiring within 90 days
                </div>
              )}
              {certsData.slice(0,5).map((c,i) => {
                const days = c.expiryDate ? Math.floor((new Date(c.expiryDate)-new Date())/86400000) : null;
                const color = days===null?'var(--text2)':days<0?'#ff4757':days<30?'#ff6b35':days<90?'var(--gold)':'var(--green)';
                return (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)', alignItems:'center' }}>
                    <span style={{ fontSize:'0.78rem', color:'var(--text2)' }}>{c.name}</span>
                    <span style={{ fontSize:'0.7rem', color, fontWeight:600 }}>
                      {days===null?'—':days<0?'EXPIRED':`${days}d left`}
                    </span>
                  </div>
                );
              })}
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginTop:'0.8rem' }} onClick={() => setTab('certs')}>
                📜 View All Certificates →
              </button>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'1.5rem 0', color:'var(--text3)' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>📜</div>
              <div style={{ fontSize:'0.8rem', marginBottom:'1rem' }}>No certificates tracked yet.</div>
              <button className="btn btn-primary" onClick={() => setTab('certs')}>+ Track Certificates</button>
            </div>
          )}
        </div>
      )}

      {/* ── DOWNLOADS SECTION ── */}
      {activeSection === 'downloads' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--text2)', marginBottom:'0.8rem' }}>📥 Today's Downloads</div>
          {dlHistory.length > 0 ? dlHistory.map((d,i) => (
            <div key={i}>
              <div style={{ display:'flex', gap:16, fontSize:'0.82rem', color:'var(--text2)' }}>
                <span>🛤 Route files: <strong style={{ color:'var(--cyan)' }}>{d.routes}</strong></span>
                <span>📊 Chart files: <strong style={{ color:'var(--gold)' }}>{d.charts}</strong></span>
              </div>
              <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginTop:4 }}>Date: {d.date}</div>
            </div>
          )) : (
            <div style={{ fontSize:'0.78rem', color:'var(--text3)', textAlign:'center', padding:'1rem 0' }}>No downloads today. Visit Routes or Charts to download files.</div>
          )}
          <div className="info-box" style={{ marginTop:'1rem', fontSize:'0.72rem' }}>
            📊 Full download history will be available in a future update.
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS SECTION ── */}
      {activeSection === 'notifs' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.2rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.72rem', color:'var(--text2)', marginBottom:'1rem' }}>🔔 Notification Preferences</div>
          {[
            { k:'newRoutes',     l:'New Routes Added',            d:'Get notified when admin adds new route files' },
            { k:'portNotices',   l:'Port Notices & Warnings',     d:'Alerts for port closures and navigational warnings' },
            { k:'certReminders', l:'Certificate Expiry Reminders',d:'Reminders when your STCW certificates are due' },
          ].map(pref => (
            <div key={pref.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <div style={{ fontSize:'0.82rem', color:'var(--text)', fontWeight:500 }}>{pref.l}</div>
                <div style={{ fontSize:'0.68rem', color:'var(--text3)', marginTop:2 }}>{pref.d}</div>
              </div>
              <div onClick={() => saveNotifPrefs({...notifPrefs, [pref.k]:!notifPrefs[pref.k]})}
                style={{ width:44, height:24, borderRadius:12, background:notifPrefs[pref.k]?'var(--cyan)':'rgba(255,255,255,0.1)',
                  cursor:'pointer', position:'relative', transition:'all 0.3s', flexShrink:0 }}>
                <div style={{ width:18, height:18, borderRadius:'50%', background:'white',
                  position:'absolute', top:3, left:notifPrefs[pref.k]?22:3, transition:'left 0.3s' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── REFERRAL SECTION ── */}
      {activeSection === 'referral' && (
        <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:'1.4rem' }}>
          <div style={{ fontFamily:'Orbitron,monospace', fontSize:'0.76rem', color:'var(--gold)', marginBottom:'0.8rem' }}>🎁 Your Referral Code</div>
          <div style={{ background:'rgba(240,165,0,0.08)', border:'1px solid rgba(240,165,0,0.3)', borderRadius:12, padding:'1.2rem', textAlign:'center', marginBottom:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace', fontSize:'1.6rem', fontWeight:900, color:'var(--gold)', letterSpacing:'0.15em', marginBottom:6 }}>
              {referralCode}
            </div>
            <div style={{ fontSize:'0.72rem', color:'var(--text3)' }}>Your unique referral code</div>
          </div>
          <button className="btn btn-gold" style={{ width:'100%', justifyContent:'center', marginBottom:'0.8rem' }}
            onClick={() => { navigator.clipboard?.writeText(referralCode); notify('✅ Referral code copied!', 'success'); }}>
            📋 Copy Code
          </button>
          <div className="info-box" style={{ fontSize:'0.72rem' }}>
            🎁 Share this code with fellow mariners. When they sign up using your code, you may be upgraded to the Paid tier. Referral rewards are managed by admin.
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountPage;
