/* eslint-disable */
import { useState, useRef, useEffect } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const COUNTRY_CODES = [
  {dial:'+93',name:'Afghanistan'},{dial:'+355',name:'Albania'},{dial:'+213',name:'Algeria'},
  {dial:'+1684',name:'American Samoa'},{dial:'+376',name:'Andorra'},{dial:'+244',name:'Angola'},
  {dial:'+1264',name:'Anguilla'},{dial:'+1268',name:'Antigua and Barbuda'},{dial:'+54',name:'Argentina'},
  {dial:'+374',name:'Armenia'},{dial:'+297',name:'Aruba'},{dial:'+61',name:'Australia'},
  {dial:'+43',name:'Austria'},{dial:'+994',name:'Azerbaijan'},{dial:'+1242',name:'Bahamas'},
  {dial:'+973',name:'Bahrain'},{dial:'+880',name:'Bangladesh'},{dial:'+1246',name:'Barbados'},
  {dial:'+375',name:'Belarus'},{dial:'+32',name:'Belgium'},{dial:'+501',name:'Belize'},
  {dial:'+229',name:'Benin'},{dial:'+1441',name:'Bermuda'},{dial:'+975',name:'Bhutan'},
  {dial:'+591',name:'Bolivia'},{dial:'+387',name:'Bosnia and Herzegovina'},{dial:'+267',name:'Botswana'},
  {dial:'+55',name:'Brazil'},{dial:'+246',name:'British Indian Ocean Territory'},{dial:'+1284',name:'British Virgin Islands'},
  {dial:'+673',name:'Brunei'},{dial:'+359',name:'Bulgaria'},{dial:'+226',name:'Burkina Faso'},
  {dial:'+257',name:'Burundi'},{dial:'+238',name:'Cabo Verde'},{dial:'+855',name:'Cambodia'},
  {dial:'+237',name:'Cameroon'},{dial:'+1',name:'Canada'},{dial:'+1345',name:'Cayman Islands'},
  {dial:'+236',name:'Central African Republic'},{dial:'+235',name:'Chad'},{dial:'+56',name:'Chile'},
  {dial:'+86',name:'China'},{dial:'+57',name:'Colombia'},{dial:'+269',name:'Comoros'},
  {dial:'+242',name:'Congo'},{dial:'+243',name:'Congo (DRC)'},{dial:'+682',name:'Cook Islands'},
  {dial:'+506',name:'Costa Rica'},{dial:'+385',name:'Croatia'},{dial:'+53',name:'Cuba'},
  {dial:'+599',name:'Curaçao'},{dial:'+357',name:'Cyprus'},{dial:'+420',name:'Czech Republic'},
  {dial:'+45',name:'Denmark'},{dial:'+253',name:'Djibouti'},{dial:'+1767',name:'Dominica'},
  {dial:'+1809',name:'Dominican Republic'},{dial:'+593',name:'Ecuador'},{dial:'+20',name:'Egypt'},
  {dial:'+503',name:'El Salvador'},{dial:'+240',name:'Equatorial Guinea'},{dial:'+291',name:'Eritrea'},
  {dial:'+372',name:'Estonia'},{dial:'+268',name:'Eswatini'},{dial:'+251',name:'Ethiopia'},
  {dial:'+500',name:'Falkland Islands'},{dial:'+298',name:'Faroe Islands'},{dial:'+679',name:'Fiji'},
  {dial:'+358',name:'Finland'},{dial:'+33',name:'France'},{dial:'+594',name:'French Guiana'},
  {dial:'+689',name:'French Polynesia'},{dial:'+241',name:'Gabon'},{dial:'+220',name:'Gambia'},
  {dial:'+995',name:'Georgia'},{dial:'+49',name:'Germany'},{dial:'+233',name:'Ghana'},
  {dial:'+350',name:'Gibraltar'},{dial:'+30',name:'Greece'},{dial:'+299',name:'Greenland'},
  {dial:'+1473',name:'Grenada'},{dial:'+590',name:'Guadeloupe'},{dial:'+1671',name:'Guam'},
  {dial:'+502',name:'Guatemala'},{dial:'+224',name:'Guinea'},{dial:'+245',name:'Guinea-Bissau'},
  {dial:'+592',name:'Guyana'},{dial:'+509',name:'Haiti'},{dial:'+504',name:'Honduras'},
  {dial:'+852',name:'Hong Kong'},{dial:'+36',name:'Hungary'},{dial:'+354',name:'Iceland'},
  {dial:'+91',name:'India'},{dial:'+62',name:'Indonesia'},{dial:'+98',name:'Iran'},
  {dial:'+964',name:'Iraq'},{dial:'+353',name:'Ireland'},{dial:'+972',name:'Israel'},
  {dial:'+39',name:'Italy'},{dial:'+1876',name:'Jamaica'},{dial:'+81',name:'Japan'},
  {dial:'+962',name:'Jordan'},{dial:'+7',name:'Kazakhstan'},{dial:'+254',name:'Kenya'},
  {dial:'+686',name:'Kiribati'},{dial:'+850',name:'North Korea'},{dial:'+82',name:'South Korea'},
  {dial:'+965',name:'Kuwait'},{dial:'+996',name:'Kyrgyzstan'},{dial:'+856',name:'Laos'},
  {dial:'+371',name:'Latvia'},{dial:'+961',name:'Lebanon'},{dial:'+266',name:'Lesotho'},
  {dial:'+231',name:'Liberia'},{dial:'+218',name:'Libya'},{dial:'+423',name:'Liechtenstein'},
  {dial:'+370',name:'Lithuania'},{dial:'+352',name:'Luxembourg'},{dial:'+853',name:'Macao'},
  {dial:'+261',name:'Madagascar'},{dial:'+265',name:'Malawi'},{dial:'+60',name:'Malaysia'},
  {dial:'+960',name:'Maldives'},{dial:'+223',name:'Mali'},{dial:'+356',name:'Malta'},
  {dial:'+692',name:'Marshall Islands'},{dial:'+222',name:'Mauritania'},{dial:'+230',name:'Mauritius'},
  {dial:'+52',name:'Mexico'},{dial:'+691',name:'Micronesia'},{dial:'+373',name:'Moldova'},
  {dial:'+377',name:'Monaco'},{dial:'+976',name:'Mongolia'},{dial:'+382',name:'Montenegro'},
  {dial:'+1664',name:'Montserrat'},{dial:'+212',name:'Morocco'},{dial:'+258',name:'Mozambique'},
  {dial:'+95',name:'Myanmar'},{dial:'+264',name:'Namibia'},{dial:'+674',name:'Nauru'},
  {dial:'+977',name:'Nepal'},{dial:'+31',name:'Netherlands'},{dial:'+687',name:'New Caledonia'},
  {dial:'+64',name:'New Zealand'},{dial:'+505',name:'Nicaragua'},{dial:'+227',name:'Niger'},
  {dial:'+234',name:'Nigeria'},{dial:'+47',name:'Norway'},{dial:'+968',name:'Oman'},
  {dial:'+92',name:'Pakistan'},{dial:'+680',name:'Palau'},{dial:'+970',name:'Palestine'},
  {dial:'+507',name:'Panama'},{dial:'+675',name:'Papua New Guinea'},{dial:'+595',name:'Paraguay'},
  {dial:'+51',name:'Peru'},{dial:'+63',name:'Philippines'},{dial:'+48',name:'Poland'},
  {dial:'+351',name:'Portugal'},{dial:'+1787',name:'Puerto Rico'},{dial:'+974',name:'Qatar'},
  {dial:'+40',name:'Romania'},{dial:'+7',name:'Russia'},{dial:'+250',name:'Rwanda'},
  {dial:'+1869',name:'Saint Kitts and Nevis'},{dial:'+1758',name:'Saint Lucia'},
  {dial:'+1784',name:'Saint Vincent'},{dial:'+685',name:'Samoa'},{dial:'+378',name:'San Marino'},
  {dial:'+966',name:'Saudi Arabia'},{dial:'+221',name:'Senegal'},{dial:'+381',name:'Serbia'},
  {dial:'+248',name:'Seychelles'},{dial:'+232',name:'Sierra Leone'},{dial:'+65',name:'Singapore'},
  {dial:'+421',name:'Slovakia'},{dial:'+386',name:'Slovenia'},{dial:'+677',name:'Solomon Islands'},
  {dial:'+252',name:'Somalia'},{dial:'+27',name:'South Africa'},{dial:'+211',name:'South Sudan'},
  {dial:'+34',name:'Spain'},{dial:'+94',name:'Sri Lanka'},{dial:'+249',name:'Sudan'},
  {dial:'+597',name:'Suriname'},{dial:'+46',name:'Sweden'},{dial:'+41',name:'Switzerland'},
  {dial:'+963',name:'Syria'},{dial:'+886',name:'Taiwan'},{dial:'+992',name:'Tajikistan'},
  {dial:'+255',name:'Tanzania'},{dial:'+66',name:'Thailand'},{dial:'+670',name:'Timor-Leste'},
  {dial:'+228',name:'Togo'},{dial:'+676',name:'Tonga'},{dial:'+1868',name:'Trinidad and Tobago'},
  {dial:'+216',name:'Tunisia'},{dial:'+90',name:'Turkey'},{dial:'+993',name:'Turkmenistan'},
  {dial:'+688',name:'Tuvalu'},{dial:'+256',name:'Uganda'},{dial:'+380',name:'Ukraine'},
  {dial:'+971',name:'UAE'},{dial:'+44',name:'United Kingdom'},{dial:'+1',name:'United States'},
  {dial:'+598',name:'Uruguay'},{dial:'+998',name:'Uzbekistan'},{dial:'+678',name:'Vanuatu'},
  {dial:'+58',name:'Venezuela'},{dial:'+84',name:'Vietnam'},{dial:'+967',name:'Yemen'},
  {dial:'+260',name:'Zambia'},{dial:'+263',name:'Zimbabwe'},
];

const MARITIME_RANKS = [
  'Captain / Master','Superintendent','Chief Officer (1st Officer)','2nd Officer',
  '3rd Officer','Navigating Officer','Chief Engineer','2nd Engineer','3rd Engineer',
  '4th Engineer','Engine Rating','Electrical Officer (ETO)','Bosun',
  'AB Seaman (Rating)','Ordinary Seaman (OS)','Sailor','Deck Cadet','Engine Cadet',
  'Shore-based / Other',
];

// Searchable country code dropdown component
function CountryCodePicker({ value, onChange }) {
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState('');
  const [manual, setManual]     = useState(false);
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

  return (
    <div ref={ref} style={{ position: 'relative', width: 130, flexShrink: 0 }}>
      {manual ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <input className="fi" placeholder="+xx" style={{ flex: 1, padding: '10px 8px' }}
            value={manualVal} onChange={e => { setManualVal(e.target.value); onChange(e.target.value); }} />
          <button className="btn btn-secondary" style={{ padding: '0 8px', fontSize: '0.7rem' }}
            onClick={() => { setManual(false); onChange('+91'); setManualVal(''); }}>✕</button>
        </div>
      ) : (
        <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '10px 10px',
          background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9,
          color: 'var(--text)', fontFamily: 'Exo 2,sans-serif', fontSize: '0.84rem',
          cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span><strong>{value}</strong> {selected?.name?.slice(0,10)}{(selected?.name?.length||0)>10?'…':''}</span>
          <span style={{ color: 'var(--text3)', fontSize: '0.7rem' }}>▾</span>
        </button>
      )}

      {open && !manual && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 500, width: 240,
          background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input className="fi" autoFocus placeholder="Search country or code…"
              style={{ margin: 0, padding: '7px 10px', fontSize: '0.8rem' }}
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.slice(0, 80).map((c, i) => (
              <div key={i} onMouseDown={() => { onChange(c.dial); setOpen(false); setSearch(''); }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '0.8rem',
                  display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,180,216,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ color: 'var(--text2)' }}>{c.name}</span>
                <span style={{ color: 'var(--cyan)', fontWeight: 700 }}>{c.dial}</span>
              </div>
            ))}
            <div onMouseDown={() => { setManual(true); setOpen(false); setSearch(''); }}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: '0.78rem',
                color: 'var(--gold)', borderTop: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,165,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              ✏️ Enter code manually
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPage({ notify, onLogin }) {
  const [mode, setMode]             = useState('login');
  const [email, setEmail]           = useState('');
  const [pass, setPass]             = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [rank, setRank]             = useState('');
  const [customRank, setCustomRank] = useState('');
  const [showCustomRank, setShowCustomRank] = useState(false);
  const [tier, setTier]             = useState('free');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState('');
  const [ok, setOk]                 = useState('');

  const resetForm = m => { setMode(m); setErr(''); setOk(''); setAgreeTerms(false); };

  const finalRank = showCustomRank ? customRank : rank;

  const doLogin = async () => {
    setLoading(true); setErr('');
    try {
      const c = await signInWithEmailAndPassword(auth, email, pass);
      if (!c.user.emailVerified) {
        await signOut(auth);
        setErr('⚠️ Email not verified. Check your inbox and click the link, then log in again.');
        setLoading(false); return;
      }
      const snap = await getDoc(doc(db, 'users', c.user.uid));
      if (snap.exists() && snap.data().blocked) {
        await signOut(auth);
        setErr('⚠️ ACCESS SUSPENDED — Contact: @manish_the_navigator on Instagram');
        setLoading(false); return;
      }
      notify('Welcome back! 👋', 'success');
      const intended = sessionStorage.getItem('intendedTab');
      sessionStorage.removeItem('intendedTab');
      const profile = snap.exists() ? snap.data() : {};
      onLogin(c.user, intended || 'home', false, profile.name, profile.rank);
    } catch (e) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')
        setErr('Invalid email or password.');
      else setErr('Login error: ' + e.message);
    }
    setLoading(false);
  };

  const doSignup = async () => {
    if (!name.trim())     { setErr('Please enter your full name.'); return; }
    if (!phone.trim())    { setErr('Please enter your phone number.'); return; }
    if (!finalRank)       { setErr('Please select or enter your rank.'); return; }
    if (!email || !pass)  { setErr('Fill all fields.'); return; }
    if (pass.length < 6)  { setErr('Password min 6 characters.'); return; }
    if (!agreeTerms)      { setErr('Please accept Terms & Conditions.'); return; }
    setLoading(true); setErr('');
    try {
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, 'users', c.user.uid), {
        email, name: name.trim(), phone: `${countryCode} ${phone.trim()}`,
        rank: finalRank, tier, createdAt: serverTimestamp(), role: 'user',
      });
      await sendEmailVerification(c.user);
      await signOut(auth);
      setMode('verify');
      notify('Verification email sent! 📧', 'success');
    } catch (e) {
      setErr(e.code === 'auth/email-already-in-use' ? 'Email already registered. Login instead.' : 'Error: ' + e.message);
    }
    setLoading(false);
  };

  const doReset = async () => {
    if (!email) { setErr('Enter your email.'); return; }
    setLoading(true); setErr('');
    try { await sendPasswordResetEmail(auth, email); setOk('Reset email sent! Check your inbox.'); }
    catch { setErr('Email not found.'); }
    setLoading(false);
  };

  const resendVerification = async () => {
    if (!email || !pass) { setErr('Enter email and password to resend.'); return; }
    setLoading(true); setErr('');
    try {
      const c = await signInWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(c.user); await signOut(auth);
      setOk('Verification email resent! Check your inbox.');
    } catch { setErr('Could not resend. Check your credentials.'); }
    setLoading(false);
  };

  if (mode === 'verify') return (
    <div className="auth-wrap"><div className="auth-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
      <div className="auth-title" style={{ marginBottom: '0.5rem' }}>Verify Your Email</div>
      <div className="auth-sub" style={{ marginBottom: '1.4rem', lineHeight: 1.7 }}>
        A link was sent to<br /><strong style={{ color: 'var(--cyan)' }}>{email}</strong><br />
        Click it, then come back to log in.
      </div>
      <div className="info-box" style={{ textAlign: 'left', fontSize: '0.74rem' }}>
        📌 Check your <strong>spam/junk</strong> folder if you don't see it.
      </div>
      {err && <div className="err-box">{err}</div>}
      {ok  && <div className="ok-box">{ok}</div>}
      <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
        onClick={resendVerification} disabled={loading}>
        {loading ? 'Sending…' : '🔄 Resend Verification Email'}
      </button>
      <button className="submit-btn" onClick={() => resetForm('login')}>✅ Go to Login</button>
    </div></div>
  );

  return (
    <div className="auth-wrap"><div className="auth-card">
      <div className="auth-logo">
        <div className="auth-icon">🧭</div>
        <div className="auth-title">NavisphereX Marine</div>
        <div className="auth-sub">{mode === 'reset' ? 'Reset Password' : 'Free account · Download all files'}</div>
      </div>

      {mode !== 'reset' && (
        <div className="auth-tabs">
          <button className={`atab ${mode==='login'?'active':''}`} onClick={() => resetForm('login')}>Login</button>
          <button className={`atab ${mode==='signup'?'active':''}`} onClick={() => resetForm('signup')}>Create Account</button>
        </div>
      )}

      <div className="info-box" style={{ fontSize: '0.74rem' }}>🆓 Free account · Access all RTZ routes &amp; ECDIS charts</div>

      {mode === 'signup' && (<>
        <div className="ff">
          <label className="fl">Full Name *</label>
          <input className="fi" placeholder="e.g. Manish Bharti" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="ff">
          <label className="fl">Phone Number *</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <CountryCodePicker value={countryCode} onChange={setCountryCode} />
            <input className="fi" type="tel" placeholder="Phone number" value={phone}
              onChange={e => setPhone(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--text3)', marginTop: 4 }}>
            Code: <strong style={{ color: 'var(--cyan)' }}>{countryCode}</strong>
          </div>
        </div>

        <div className="ff">
          <label className="fl">Rank / Designation *</label>
          <select className="fi" value={showCustomRank ? '__other__' : rank}
            onChange={e => {
              if (e.target.value === '__other__') { setShowCustomRank(true); setRank(''); }
              else { setShowCustomRank(false); setRank(e.target.value); }
            }}>
            <option value="">— Select your rank —</option>
            {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
            <option value="__other__">✏️ Other — type below</option>
          </select>
          {showCustomRank && (
            <input className="fi" style={{ marginTop: 6 }}
              placeholder="Enter your rank or designation…"
              value={customRank} onChange={e => setCustomRank(e.target.value)} />
          )}
        </div>

        <div className="ff">
          <label className="fl">Access Tier *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{val:'free',icon:'🆓',label:'Free',desc:'Basic access'},{val:'paid',icon:'⭐',label:'Paid',desc:'Full access'}].map(t => (
              <div key={t.val} onClick={() => setTier(t.val)}
                style={{ padding: '10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                  border: `2px solid ${tier===t.val?'var(--cyan)':'var(--border)'}`,
                  background: tier===t.val?'rgba(0,180,216,0.08)':'transparent', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 2 }}>{t.icon}</div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.62rem', fontWeight: 700,
                  color: tier===t.val?'var(--cyan)':'var(--text2)' }}>{t.label}</div>
                <div style={{ fontSize: '0.58rem', color: 'var(--text3)' }}>{t.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      <div className="ff">
        <label className="fl">Email</label>
        <input className="fi" type="email" placeholder="e.g. manishbharti339@gmail.com" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key==='Enter'&&(mode==='login'?doLogin():mode==='signup'?doSignup():doReset())} />
      </div>

      {mode !== 'reset' && (
        <div className="ff">
          <label className="fl">Password</label>
          <input className="fi" type="password" placeholder="Min 6 characters" value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key==='Enter'&&(mode==='login'?doLogin():doSignup())} />
        </div>
      )}

      {mode === 'signup' && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:'1rem', cursor:'pointer' }}
          onClick={() => setAgreeTerms(a=>!a)}>
          <div style={{ width:18, height:18, borderRadius:4, flexShrink:0, marginTop:2,
            border:`2px solid ${agreeTerms?'var(--cyan)':'var(--border2)'}`,
            background:agreeTerms?'var(--cyan)':'transparent',
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
            {agreeTerms && <span style={{ color:'#000', fontSize:'0.7rem', fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontSize:'0.72rem', color:'var(--text2)', lineHeight:1.5 }}>
            I agree to the <span style={{ color:'var(--cyan)' }}>Terms &amp; Conditions</span> and{' '}
            <span style={{ color:'var(--cyan)' }}>Privacy Policy</span>. Content not for sole navigation use.
          </span>
        </div>
      )}

      {err && <div className="err-box">{err}</div>}
      {ok  && <div className="ok-box">{ok}</div>}

      <button className="submit-btn"
        onClick={mode==='login'?doLogin:mode==='signup'?doSignup:doReset}
        disabled={loading||(mode==='signup'&&!agreeTerms)}>
        {loading?'Please wait…':mode==='login'?'🔐 LOGIN':mode==='signup'?'✅ CREATE FREE ACCOUNT':'📧 SEND RESET EMAIL'}
      </button>

      {mode==='login'  && <div className="link-txt" onClick={() => resetForm('reset')}>Forgot password?</div>}
      {mode==='reset'  && <div className="link-txt" onClick={() => resetForm('login')}>← Back to login</div>}
      {mode==='login'  && (
        <div style={{ textAlign:'center', marginTop:8 }}>
          <span style={{ fontSize:'0.7rem', color:'var(--text3)', cursor:'pointer' }}
            onClick={() => resetForm('verify')}>Didn't receive verification email?</span>
        </div>
      )}
    </div></div>
  );
}

export default LoginPage;
