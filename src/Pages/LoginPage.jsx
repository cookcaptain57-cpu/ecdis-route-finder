/* eslint-disable */
// src/pages/LoginPage.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const MARITIME_RANKS = [
  'Captain / Master',
  'Chief Officer (1st Officer)',
  '2nd Officer',
  '3rd Officer',
  'Chief Engineer',
  '2nd Engineer',
  '3rd Engineer',
  '4th Engineer',
  'Electrical Officer (ETO)',
  'Bosun',
  'AB Seaman (Rating)',
  'Ordinary Seaman (OS)',
  'Deck Cadet',
  'Engine Cadet',
  'Shore-based / Other',
];

function LoginPage({ notify, onLogin }) {
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [pass, setPass]         = useState('');
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [rank, setRank]         = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState('');
  const [ok, setOk]             = useState('');

  const doLogin = async () => {
    setLoading(true); setErr('');
    try {
      const c = await signInWithEmailAndPassword(auth, email, pass);
      const snap = await getDoc(doc(db, 'users', c.user.uid));
      if (snap.exists() && snap.data().blocked) {
        await signOut(auth);
        setErr('⚠️ ACCESS SUSPENDED — Suspicious login detected by admin. Contact owner on Instagram: @manish_the_navigator');
        setLoading(false); return;
      }
      notify('Welcome back! 👋', 'success');
      const intended = sessionStorage.getItem('intendedTab');
      sessionStorage.removeItem('intendedTab');
      onLogin(c.user, intended || 'home');
    } catch (e) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')
        setErr('Invalid email or password.');
      else if (!e.code)
        setErr('⚠️ ACCESS SUSPENDED — Contact owner: @manish_the_navigator on Instagram');
      else
        setErr('Login error: ' + e.message);
    }
    setLoading(false);
  };

  const doSignup = async () => {
    if (!name.trim())  { setErr('Please enter your full name.'); return; }
    if (!phone.trim()) { setErr('Please enter your phone number.'); return; }
    if (!rank)         { setErr('Please select your rank.'); return; }
    if (!email || !pass) { setErr('Fill all fields.'); return; }
    if (pass.length < 6) { setErr('Password min 6 characters.'); return; }
    if (!agreeTerms)   { setErr('Please accept Terms & Conditions to continue.'); return; }
    setLoading(true); setErr('');
    try {
      const c = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(db, 'users', c.user.uid), {
        email, name: name.trim(), phone: phone.trim(), rank,
        createdAt: serverTimestamp(), role: 'user',
      });
      notify('Account created! 🎉', 'success');
      const intended2 = sessionStorage.getItem('intendedTab');
      sessionStorage.removeItem('intendedTab');
      onLogin(c.user, intended2 || 'home');
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

  const resetForm = (m) => { setMode(m); setErr(''); setOk(''); setAgreeTerms(false); };

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
              {/* ← CHANGED: placeholder now shows owner's name as example */}
              <input className="fi" placeholder="e.g. Manish Bharti" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="ff">
              <label className="fl">Phone Number *</label>
              {/* ← CHANGED: placeholder updated */}
              <input className="fi" type="tel" placeholder="e.g. 7870025XXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            {/* ← CHANGED: added Rank dropdown */}
            <div className="ff">
              <label className="fl">Rank / Designation *</label>
              <select className="fi" value={rank} onChange={e => setRank(e.target.value)}>
                <option value="">— Select your rank —</option>
                {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="ff">
          <label className="fl">Email</label>
          {/* ← CHANGED: placeholder updated */}
          <input className="fi" type="email" placeholder="e.g. manishbharti339@gmail.com" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : mode === 'signup' ? doSignup() : doReset())} />
        </div>

        {mode !== 'reset' && (
          <div className="ff">
            <label className="fl">Password</label>
            <input className="fi" type="password" placeholder="Min 6 characters" value={pass} onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : doSignup())} />
          </div>
        )}

        {/* ← CHANGED: Terms & Conditions checkbox — only shown on signup */}
        {mode === 'signup' && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: '1rem', cursor: 'pointer' }} onClick={() => setAgreeTerms(a => !a)}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${agreeTerms ? 'var(--cyan)' : 'var(--border2)'}`, background: agreeTerms ? 'var(--cyan)' : 'transparent', flexShrink: 0, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
              {agreeTerms && <span style={{ color: '#000', fontSize: '0.75rem', fontWeight: 900, lineHeight: 1 }}>✓</span>}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text2)', lineHeight: 1.5 }}>
              I agree to the{' '}
              <span style={{ color: 'var(--cyan)', textDecoration: 'underline' }}>Terms &amp; Conditions</span>
              {' '}and{' '}
              <span style={{ color: 'var(--cyan)', textDecoration: 'underline' }}>Privacy Policy</span>.
              Content is not for sole navigation use — always verify with official sources.
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

        {mode === 'login'  && <div className="link-txt" onClick={() => resetForm('reset')}>Forgot password?</div>}
        {mode === 'reset'  && <div className="link-txt" onClick={() => resetForm('login')}>← Back to login</div>}
      </div>
    </div>
  );
}

export default LoginPage;
