/* eslint-disable */
// src/pages/LoginPage.jsx
import { useState } from "react";
import { auth, db } from "../firebase";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, sendEmailVerification, signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

const MARITIME_RANKS = [
  'Captain / Master', 'Chief Officer (1st Officer)', '2nd Officer', '3rd Officer',
  'Chief Engineer', '2nd Engineer', '3rd Engineer', '4th Engineer',
  'Electrical Officer (ETO)', 'Bosun', 'AB Seaman (Rating)', 'Ordinary Seaman (OS)',
  'Deck Cadet', 'Engine Cadet', 'Shore-based / Other',
];

function LoginPage({ notify, onLogin }) {
  const [mode, setMode]           = useState('login');
  const [email, setEmail]         = useState('');
  const [pass, setPass]           = useState('');
  const [name, setName]           = useState('');
  const [phone, setPhone]         = useState('');
  const [rank, setRank]           = useState('');
  const [tier, setTier]           = useState('free');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState('');
  const [ok, setOk]               = useState('');

  const resetForm = (m) => { setMode(m); setErr(''); setOk(''); setAgreeTerms(false); };

  // ── Login ──────────────────────────────────────────────────────────────
  const doLogin = async () => {
    setLoading(true); setErr('');
    try {
      const c = await signInWithEmailAndPassword(auth, email, pass);

      // Block unverified accounts
      if (!c.user.emailVerified) {
        await signOut(auth);
        setErr('⚠️ Email not verified. Check your inbox and click the verification link. Then try logging in again.');
        setLoading(false); return;
      }

      // Block suspended accounts
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
      // Pass name + rank so App.jsx can show the welcome popup
      onLogin(c.user, intended || 'home', false, profile.name, profile.rank);
    } catch (e) {
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')
        setErr('Invalid email or password.');
      else setErr('Login error: ' + e.message);
    }
    setLoading(false);
  };

  // ── Sign up ────────────────────────────────────────────────────────────
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
      // Save profile to Firestore
      await setDoc(doc(db, 'users', c.user.uid), {
        email, name: name.trim(), phone: phone.trim(), rank, tier,
        createdAt: serverTimestamp(), role: 'user',
      });
      // Send email verification
      await sendEmailVerification(c.user);
      // Sign out — user must verify before accessing app
      await signOut(auth);
      setMode('verify');
      notify('Verification email sent! 📧', 'success');
    } catch (e) {
      setErr(e.code === 'auth/email-already-in-use'
        ? 'Email already registered. Login instead.'
        : 'Error: ' + e.message);
    }
    setLoading(false);
  };

  // ── Reset password ─────────────────────────────────────────────────────
  const doReset = async () => {
    if (!email) { setErr('Enter your email.'); return; }
    setLoading(true); setErr('');
    try { await sendPasswordResetEmail(auth, email); setOk('Reset email sent! Check your inbox.'); }
    catch { setErr('Email not found.'); }
    setLoading(false);
  };

  // ── Resend verification ────────────────────────────────────────────────
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

  // ── Verify screen ──────────────────────────────────────────────────────
  if (mode === 'verify') return (
    <div className="auth-wrap">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
        <div className="auth-title" style={{ marginBottom: '0.5rem' }}>Verify Your Email</div>
        <div className="auth-sub" style={{ marginBottom: '1.4rem', lineHeight: 1.7 }}>
          A verification link was sent to<br />
          <strong style={{ color: 'var(--cyan)' }}>{email}</strong><br />
          Click the link in the email, then come back to log in.
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
            <div className="ff">
              <label className="fl">Phone Number *</label>
              <input className="fi" type="tel" placeholder="e.g. 7870025XXX" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="ff">
              <label className="fl">Rank / Designation *</label>
              <select className="fi" value={rank} onChange={e => setRank(e.target.value)}>
                <option value="">— Select your rank —</option>
                {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Access Tier selection */}
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

        {/* T&C checkbox — signup only */}
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
        {mode === 'login'  && (
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
