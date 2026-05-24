/* eslint-disable */
// src/pages/LoginPage.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// ── All country dial codes ─────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code:'IN', dial:'+91',  name:'India' },
  { code:'AE', dial:'+971', name:'UAE' },
  { code:'SG', dial:'+65',  name:'Singapore' },
  { code:'PH', dial:'+63',  name:'Philippines' },
  { code:'PK', dial:'+92',  name:'Pakistan' },
  { code:'BD', dial:'+880', name:'Bangladesh' },
  { code:'MY', dial:'+60',  name:'Malaysia' },
  { code:'CN', dial:'+86',  name:'China' },
  { code:'JP', dial:'+81',  name:'Japan' },
  { code:'KR', dial:'+82',  name:'South Korea' },
  { code:'SA', dial:'+966', name:'Saudi Arabia' },
  { code:'QA', dial:'+974', name:'Qatar' },
  { code:'KW', dial:'+965', name:'Kuwait' },
  { code:'BH', dial:'+973', name:'Bahrain' },
  { code:'OM', dial:'+968', name:'Oman' },
  { code:'GB', dial:'+44',  name:'United Kingdom' },
  { code:'US', dial:'+1',   name:'United States' },
  { code:'CA', dial:'+1',   name:'Canada' },
  { code:'AU', dial:'+61',  name:'Australia' },
  { code:'DE', dial:'+49',  name:'Germany' },
  { code:'FR', dial:'+33',  name:'France' },
  { code:'IT', dial:'+39',  name:'Italy' },
  { code:'ES', dial:'+34',  name:'Spain' },
  { code:'NL', dial:'+31',  name:'Netherlands' },
  { code:'GR', dial:'+30',  name:'Greece' },
  { code:'NO', dial:'+47',  name:'Norway' },
  { code:'SE', dial:'+46',  name:'Sweden' },
  { code:'DK', dial:'+45',  name:'Denmark' },
  { code:'FI', dial:'+358', name:'Finland' },
  { code:'RU', dial:'+7',   name:'Russia' },
  { code:'NG', dial:'+234', name:'Nigeria' },
  { code:'ZA', dial:'+27',  name:'South Africa' },
  { code:'EG', dial:'+20',  name:'Egypt' },
  { code:'BR', dial:'+55',  name:'Brazil' },
  { code:'MX', dial:'+52',  name:'Mexico' },
  { code:'AF', dial:'+93',  name:'Afghanistan' },
  { code:'AL', dial:'+355', name:'Albania' },
  { code:'DZ', dial:'+213', name:'Algeria' },
  { code:'AS', dial:'+1684',name:'American Samoa' },
  { code:'AD', dial:'+376', name:'Andorra' },
  { code:'AO', dial:'+244', name:'Angola' },
  { code:'AI', dial:'+1264',name:'Anguilla' },
  { code:'AG', dial:'+1268',name:'Antigua and Barbuda' },
  { code:'AR', dial:'+54',  name:'Argentina' },
  { code:'AM', dial:'+374', name:'Armenia' },
  { code:'AW', dial:'+297', name:'Aruba' },
  { code:'AT', dial:'+43',  name:'Austria' },
  { code:'AZ', dial:'+994', name:'Azerbaijan' },
  { code:'BS', dial:'+1242',name:'Bahamas' },
  { code:'BB', dial:'+1246',name:'Barbados' },
  { code:'BY', dial:'+375', name:'Belarus' },
  { code:'BE', dial:'+32',  name:'Belgium' },
  { code:'BZ', dial:'+501', name:'Belize' },
  { code:'BJ', dial:'+229', name:'Benin' },
  { code:'BM', dial:'+1441',name:'Bermuda' },
  { code:'BT', dial:'+975', name:'Bhutan' },
  { code:'BO', dial:'+591', name:'Bolivia' },
  { code:'BA', dial:'+387', name:'Bosnia and Herzegovina' },
  { code:'BW', dial:'+267', name:'Botswana' },
  { code:'IO', dial:'+246', name:'British Indian Ocean Territory' },
  { code:'VG', dial:'+1284',name:'British Virgin Islands' },
  { code:'BN', dial:'+673', name:'Brunei' },
  { code:'BG', dial:'+359', name:'Bulgaria' },
  { code:'BF', dial:'+226', name:'Burkina Faso' },
  { code:'BI', dial:'+257', name:'Burundi' },
  { code:'CV', dial:'+238', name:'Cabo Verde' },
  { code:'KH', dial:'+855', name:'Cambodia' },
  { code:'CM', dial:'+237', name:'Cameroon' },
  { code:'KY', dial:'+1345',name:'Cayman Islands' },
  { code:'CF', dial:'+236', name:'Central African Republic' },
  { code:'TD', dial:'+235', name:'Chad' },
  { code:'CL', dial:'+56',  name:'Chile' },
  { code:'CO', dial:'+57',  name:'Colombia' },
  { code:'KM', dial:'+269', name:'Comoros' },
  { code:'CG', dial:'+242', name:'Congo' },
  { code:'CD', dial:'+243', name:'Congo (DRC)' },
  { code:'CK', dial:'+682', name:'Cook Islands' },
  { code:'CR', dial:'+506', name:'Costa Rica' },
  { code:'HR', dial:'+385', name:'Croatia' },
  { code:'CU', dial:'+53',  name:'Cuba' },
  { code:'CW', dial:'+599', name:'Curaçao' },
  { code:'CY', dial:'+357', name:'Cyprus' },
  { code:'CZ', dial:'+420', name:'Czech Republic' },
  { code:'DJ', dial:'+253', name:'Djibouti' },
  { code:'DM', dial:'+1767',name:'Dominica' },
  { code:'DO', dial:'+1809',name:'Dominican Republic' },
  { code:'EC', dial:'+593', name:'Ecuador' },
  { code:'SV', dial:'+503', name:'El Salvador' },
  { code:'GQ', dial:'+240', name:'Equatorial Guinea' },
  { code:'ER', dial:'+291', name:'Eritrea' },
  { code:'EE', dial:'+372', name:'Estonia' },
  { code:'SZ', dial:'+268', name:'Eswatini' },
  { code:'ET', dial:'+251', name:'Ethiopia' },
  { code:'FK', dial:'+500', name:'Falkland Islands' },
  { code:'FO', dial:'+298', name:'Faroe Islands' },
  { code:'FJ', dial:'+679', name:'Fiji' },
  { code:'GF', dial:'+594', name:'French Guiana' },
  { code:'PF', dial:'+689', name:'French Polynesia' },
  { code:'GA', dial:'+241', name:'Gabon' },
  { code:'GM', dial:'+220', name:'Gambia' },
  { code:'GE', dial:'+995', name:'Georgia' },
  { code:'GH', dial:'+233', name:'Ghana' },
  { code:'GI', dial:'+350', name:'Gibraltar' },
  { code:'GL', dial:'+299', name:'Greenland' },
  { code:'GD', dial:'+1473',name:'Grenada' },
  { code:'GP', dial:'+590', name:'Guadeloupe' },
  { code:'GU', dial:'+1671',name:'Guam' },
  { code:'GT', dial:'+502', name:'Guatemala' },
  { code:'GN', dial:'+224', name:'Guinea' },
  { code:'GW', dial:'+245', name:'Guinea-Bissau' },
  { code:'GY', dial:'+592', name:'Guyana' },
  { code:'HT', dial:'+509', name:'Haiti' },
  { code:'HN', dial:'+504', name:'Honduras' },
  { code:'HK', dial:'+852', name:'Hong Kong' },
  { code:'HU', dial:'+36',  name:'Hungary' },
  { code:'IS', dial:'+354', name:'Iceland' },
  { code:'ID', dial:'+62',  name:'Indonesia' },
  { code:'IR', dial:'+98',  name:'Iran' },
  { code:'IQ', dial:'+964', name:'Iraq' },
  { code:'IE', dial:'+353', name:'Ireland' },
  { code:'IL', dial:'+972', name:'Israel' },
  { code:'JM', dial:'+1876',name:'Jamaica' },
  { code:'JO', dial:'+962', name:'Jordan' },
  { code:'KZ', dial:'+7',   name:'Kazakhstan' },
  { code:'KE', dial:'+254', name:'Kenya' },
  { code:'KI', dial:'+686', name:'Kiribati' },
  { code:'KP', dial:'+850', name:'North Korea' },
  { code:'KG', dial:'+996', name:'Kyrgyzstan' },
  { code:'LA', dial:'+856', name:'Laos' },
  { code:'LV', dial:'+371', name:'Latvia' },
  { code:'LB', dial:'+961', name:'Lebanon' },
  { code:'LS', dial:'+266', name:'Lesotho' },
  { code:'LR', dial:'+231', name:'Liberia' },
  { code:'LY', dial:'+218', name:'Libya' },
  { code:'LI', dial:'+423', name:'Liechtenstein' },
  { code:'LT', dial:'+370', name:'Lithuania' },
  { code:'LU', dial:'+352', name:'Luxembourg' },
  { code:'MO', dial:'+853', name:'Macao' },
  { code:'MG', dial:'+261', name:'Madagascar' },
  { code:'MW', dial:'+265', name:'Malawi' },
  { code:'MV', dial:'+960', name:'Maldives' },
  { code:'ML', dial:'+223', name:'Mali' },
  { code:'MT', dial:'+356', name:'Malta' },
  { code:'MH', dial:'+692', name:'Marshall Islands' },
  { code:'MR', dial:'+222', name:'Mauritania' },
  { code:'MU', dial:'+230', name:'Mauritius' },
  { code:'MX', dial:'+52',  name:'Mexico' },
  { code:'FM', dial:'+691', name:'Micronesia' },
  { code:'MD', dial:'+373', name:'Moldova' },
  { code:'MC', dial:'+377', name:'Monaco' },
  { code:'MN', dial:'+976', name:'Mongolia' },
  { code:'ME', dial:'+382', name:'Montenegro' },
  { code:'MS', dial:'+1664',name:'Montserrat' },
  { code:'MA', dial:'+212', name:'Morocco' },
  { code:'MZ', dial:'+258', name:'Mozambique' },
  { code:'MM', dial:'+95',  name:'Myanmar' },
  { code:'NA', dial:'+264', name:'Namibia' },
  { code:'NR', dial:'+674', name:'Nauru' },
  { code:'NP', dial:'+977', name:'Nepal' },
  { code:'NC', dial:'+687', name:'New Caledonia' },
  { code:'NZ', dial:'+64',  name:'New Zealand' },
  { code:'NI', dial:'+505', name:'Nicaragua' },
  { code:'NE', dial:'+227', name:'Niger' },
  { code:'NU', dial:'+683', name:'Niue' },
  { code:'MK', dial:'+389', name:'North Macedonia' },
  { code:'MP', dial:'+1670',name:'Northern Mariana Islands' },
  { code:'PW', dial:'+680', name:'Palau' },
  { code:'PS', dial:'+970', name:'Palestine' },
  { code:'PA', dial:'+507', name:'Panama' },
  { code:'PG', dial:'+675', name:'Papua New Guinea' },
  { code:'PY', dial:'+595', name:'Paraguay' },
  { code:'PE', dial:'+51',  name:'Peru' },
  { code:'PN', dial:'+64',  name:'Pitcairn Islands' },
  { code:'PL', dial:'+48',  name:'Poland' },
  { code:'PT', dial:'+351', name:'Portugal' },
  { code:'PR', dial:'+1787',name:'Puerto Rico' },
  { code:'RE', dial:'+262', name:'Réunion' },
  { code:'RO', dial:'+40',  name:'Romania' },
  { code:'RW', dial:'+250', name:'Rwanda' },
  { code:'KN', dial:'+1869',name:'Saint Kitts and Nevis' },
  { code:'LC', dial:'+1758',name:'Saint Lucia' },
  { code:'PM', dial:'+508', name:'Saint Pierre and Miquelon' },
  { code:'VC', dial:'+1784',name:'Saint Vincent and the Grenadines' },
  { code:'WS', dial:'+685', name:'Samoa' },
  { code:'SM', dial:'+378', name:'San Marino' },
  { code:'ST', dial:'+239', name:'São Tomé and Príncipe' },
  { code:'SN', dial:'+221', name:'Senegal' },
  { code:'RS', dial:'+381', name:'Serbia' },
  { code:'SC', dial:'+248', name:'Seychelles' },
  { code:'SL', dial:'+232', name:'Sierra Leone' },
  { code:'SX', dial:'+1721',name:'Sint Maarten' },
  { code:'SK', dial:'+421', name:'Slovakia' },
  { code:'SI', dial:'+386', name:'Slovenia' },
  { code:'SB', dial:'+677', name:'Solomon Islands' },
  { code:'SO', dial:'+252', name:'Somalia' },
  { code:'SS', dial:'+211', name:'South Sudan' },
  { code:'LK', dial:'+94',  name:'Sri Lanka' },
  { code:'SD', dial:'+249', name:'Sudan' },
  { code:'SR', dial:'+597', name:'Suriname' },
  { code:'CH', dial:'+41',  name:'Switzerland' },
  { code:'SY', dial:'+963', name:'Syria' },
  { code:'TW', dial:'+886', name:'Taiwan' },
  { code:'TJ', dial:'+992', name:'Tajikistan' },
  { code:'TZ', dial:'+255', name:'Tanzania' },
  { code:'TH', dial:'+66',  name:'Thailand' },
  { code:'TL', dial:'+670', name:'Timor-Leste' },
  { code:'TG', dial:'+228', name:'Togo' },
  { code:'TO', dial:'+676', name:'Tonga' },
  { code:'TT', dial:'+1868',name:'Trinidad and Tobago' },
  { code:'TN', dial:'+216', name:'Tunisia' },
  { code:'TR', dial:'+90',  name:'Turkey' },
  { code:'TM', dial:'+993', name:'Turkmenistan' },
  { code:'TC', dial:'+1649',name:'Turks and Caicos Islands' },
  { code:'TV', dial:'+688', name:'Tuvalu' },
  { code:'UG', dial:'+256', name:'Uganda' },
  { code:'UA', dial:'+380', name:'Ukraine' },
  { code:'UY', dial:'+598', name:'Uruguay' },
  { code:'UZ', dial:'+998', name:'Uzbekistan' },
  { code:'VU', dial:'+678', name:'Vanuatu' },
  { code:'VA', dial:'+379', name:'Vatican City' },
  { code:'VE', dial:'+58',  name:'Venezuela' },
  { code:'VN', dial:'+84',  name:'Vietnam' },
  { code:'VI', dial:'+1340',name:'Virgin Islands (US)' },
  { code:'WF', dial:'+681', name:'Wallis and Futuna' },
  { code:'YE', dial:'+967', name:'Yemen' },
  { code:'ZM', dial:'+260', name:'Zambia' },
  { code:'ZW', dial:'+263', name:'Zimbabwe' },
];

const MARITIME_RANKS = [
  'Captain / Master','Chief Officer (1st Officer)','2nd Officer','3rd Officer',
  'Chief Engineer','2nd Engineer','3rd Engineer','4th Engineer',
  'Electrical Officer (ETO)','Bosun','AB Seaman (Rating)','Ordinary Seaman (OS)',
  'Deck Cadet','Engine Cadet','Shore-based / Other',
];

function LoginPage({ notify, onLogin }) {
  const [mode, setMode]             = useState('login');
  const [email, setEmail]           = useState('');
  const [pass, setPass]             = useState('');
  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [countryCode, setCountryCode] = useState('+91'); // default India
  const [rank, setRank]             = useState('');
  const [tier, setTier]             = useState('free');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [err, setErr]               = useState('');
  const [ok, setOk]                 = useState('');

  const resetForm = (m) => { setMode(m); setErr(''); setOk(''); setAgreeTerms(false); };

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
        setErr('⚠️ ACCESS SUSPENDED — Contact owner: @manish_the_navigator on Instagram');
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
    if (!name.trim())       { setErr('Please enter your full name.'); return; }
    if (!phone.trim())      { setErr('Please enter your phone number.'); return; }
    if (!rank)              { setErr('Please select your rank.'); return; }
    if (!email || !pass)    { setErr('Fill all fields.'); return; }
    if (pass.length < 6)    { setErr('Password min 6 characters.'); return; }
    if (!agreeTerms)        { setErr('Please accept Terms & Conditions to continue.'); return; }
    setLoading(true); setErr('');
    try {
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      const fullPhone = `${countryCode} ${phone.trim()}`;
      await setDoc(doc(db, 'users', c.user.uid), {
        email, name: name.trim(), phone: fullPhone, rank, tier,
        createdAt: serverTimestamp(), role: 'user',
      });
      await sendEmailVerification(c.user);
      await signOut(auth);
      setMode('verify');
      notify('Verification email sent! 📧', 'success');
    } catch (e) {
      setErr(e.code === 'auth/email-already-in-use'
        ? 'Email already registered. Login instead.' : 'Error: ' + e.message);
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
      await sendEmailVerification(c.user);
      await signOut(auth);
      setOk('Verification email resent! Check your inbox.');
    } catch { setErr('Could not resend. Check your email and password.'); }
    setLoading(false);
  };

  if (mode === 'verify') return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
        <div className="auth-title" style={{ marginBottom: '0.5rem' }}>Verify Your Email</div>
        <div className="auth-sub" style={{ marginBottom: '1.4rem', lineHeight: 1.7 }}>
          A verification link was sent to<br />
          <strong style={{ color: 'var(--cyan)' }}>{email}</strong><br />
          Click the link in your email, then come back to log in.
        </div>
        <div className="info-box" style={{ textAlign: 'left', fontSize: '0.74rem' }}>
          📌 Check your spam/junk folder if you don't see it.
        </div>
        {err && <div className="err-box">{err}</div>}
        {ok  && <div className="ok-box">{ok}</div>}
        <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}
          onClick={resendVerification} disabled={loading}>
          {loading ? 'Sending…' : '🔄 Resend Verification Email'}
        </button>
        <button className="submit-btn" onClick={() => resetForm('login')}>✅ Go to Login</button>
      </div>
    </div>
  );

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon">🧭</div>
          <div className="auth-title">NavisphereX Marine</div>
          <div className="auth-sub">{mode === 'reset' ? 'Reset Password' : 'Free account · Download all files'}</div>
        </div>

        {mode !== 'reset' && (
          <div className="auth-tabs">
            <button className={`atab ${mode === 'login' ? 'active' : ''}`} onClick={() => resetForm('login')}>Login</button>
            <button className={`atab ${mode === 'signup' ? 'active' : ''}`} onClick={() => resetForm('signup')}>Create Account</button>
          </div>
        )}

        <div className="info-box" style={{ fontSize: '0.74rem' }}>🆓 Free account · Access all RTZ routes &amp; ECDIS charts</div>

        {mode === 'signup' && (
          <>
            <div className="ff">
              <label className="fl">Full Name *</label>
              <input className="fi" placeholder="e.g. Manish Bharti" value={name} onChange={e => setName(e.target.value)} />
            </div>

            {/* Phone with country code */}
            <div className="ff">
              <label className="fl">Phone Number *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <select className="fi" style={{ width: 120, flexShrink: 0, padding: '10px 6px' }}
                  value={countryCode} onChange={e => setCountryCode(e.target.value)}>
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code + c.dial} value={c.dial}>
                      {c.dial} {c.name}
                    </option>
                  ))}
                </select>
                <input className="fi" type="tel" placeholder="Phone number"
                  value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', marginTop: 4 }}>
                Selected: <strong style={{ color: 'var(--cyan)' }}>{countryCode}</strong> — {COUNTRY_CODES.find(c => c.dial === countryCode)?.name}
              </div>
            </div>

            <div className="ff">
              <label className="fl">Rank / Designation *</label>
              <select className="fi" value={rank} onChange={e => setRank(e.target.value)}>
                <option value="">— Select your rank —</option>
                {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="ff">
              <label className="fl">Access Tier *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { val: 'free', icon: '🆓', label: 'Free', desc: 'Basic access' },
                  { val: 'paid', icon: '⭐', label: 'Paid', desc: 'Full access' },
                ].map(t => (
                  <div key={t.val} onClick={() => setTier(t.val)}
                    style={{ padding: '10px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${tier === t.val ? 'var(--cyan)' : 'var(--border)'}`,
                      background: tier === t.val ? 'rgba(0,180,216,0.08)' : 'transparent', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 2 }}>{t.icon}</div>
                    <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.62rem', fontWeight: 700,
                      color: tier === t.val ? 'var(--cyan)' : 'var(--text2)' }}>{t.label}</div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--text3)' }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="ff">
          <label className="fl">Email</label>
          <input className="fi" type="email" placeholder="e.g. manishbharti339@gmail.com" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : mode === 'signup' ? doSignup() : doReset())} />
        </div>

        {mode !== 'reset' && (
          <div className="ff">
            <label className="fl">Password</label>
            <input className="fi" type="password" placeholder="Min 6 characters" value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : doSignup())} />
          </div>
        )}

        {mode === 'signup' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1rem', cursor: 'pointer' }}
            onClick={() => setAgreeTerms(a => !a)}>
            <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
              border: `2px solid ${agreeTerms ? 'var(--cyan)' : 'var(--border2)'}`,
              background: agreeTerms ? 'var(--cyan)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {agreeTerms && <span style={{ color: '#000', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text2)', lineHeight: 1.5 }}>
              I agree to the <span style={{ color: 'var(--cyan)' }}>Terms &amp; Conditions</span> and{' '}
              <span style={{ color: 'var(--cyan)' }}>Privacy Policy</span>.
              Content is not for sole navigation use.
            </span>
          </div>
        )}

        {err && <div className="err-box">{err}</div>}
        {ok  && <div className="ok-box">{ok}</div>}

        <button className="submit-btn"
          onClick={mode === 'login' ? doLogin : mode === 'signup' ? doSignup : doReset}
          disabled={loading || (mode === 'signup' && !agreeTerms)}>
          {loading ? 'Please wait…' : mode === 'login' ? '🔐 LOGIN' : mode === 'signup' ? '✅ CREATE FREE ACCOUNT' : '📧 SEND RESET EMAIL'}
        </button>

        {mode === 'login' && <div className="link-txt" onClick={() => resetForm('reset')}>Forgot password?</div>}
        {mode === 'reset' && <div className="link-txt" onClick={() => resetForm('login')}>← Back to login</div>}
        {mode === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text3)', cursor: 'pointer' }}
              onClick={() => resetForm('verify')}>Didn't receive verification email?</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
