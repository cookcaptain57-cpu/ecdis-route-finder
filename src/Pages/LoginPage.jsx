// src/pages/LoginPage.jsx
import { useState } from “react”;
import { auth, db } from “../firebase”;
import {
signInWithEmailAndPassword,
createUserWithEmailAndPassword,
signOut,
sendPasswordResetEmail,
} from “firebase/auth”;
import {
doc, setDoc, getDoc, serverTimestamp,
} from “firebase/firestore”;

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ notify, onLogin }) {
const [mode, setMode] = useState(‘login’);
const [email, setEmail] = useState(’’);
const [pass, setPass] = useState(’’);
const [name, setName] = useState(’’);
const [phone, setPhone] = useState(’’);
const [loading, setLoading] = useState(false);
const [err, setErr] = useState(’’);
const [ok, setOk] = useState(’’);

const doLogin = async () => {
setLoading(true); setErr(’’);
try {
const c = await signInWithEmailAndPassword(auth, email, pass);
// Check if user is blocked in Firestore
const snap = await getDoc(doc(db, ‘users’, c.user.uid));
if (snap.exists() && snap.data().blocked) {
await signOut(auth);
setErr(‘⚠️ ACCESS SUSPENDED — Suspicious login detected by admin. Contact owner on Instagram: @manish_the_navigator’);
setLoading(false); return;
}
notify(‘Welcome back! 👋’, ‘success’);
const intended = sessionStorage.getItem(‘intendedTab’);
sessionStorage.removeItem(‘intendedTab’);
onLogin(c.user, intended || ‘home’);
} catch (e) {
if (e.code === ‘auth/invalid-credential’ || e.code === ‘auth/wrong-password’ || e.code === ‘auth/user-not-found’)
setErr(‘Invalid email or password.’);
else if (!e.code)
setErr(‘⚠️ ACCESS SUSPENDED — Contact owner: @manish_the_navigator on Instagram’);
else
setErr(’Login error: ’ + e.message);
}
setLoading(false);
};

const doSignup = async () => {
if (!name.trim()) { setErr(‘Please enter your full name.’); return; }
if (!phone.trim()) { setErr(‘Please enter your phone number.’); return; }
if (!email || !pass) { setErr(‘Fill all fields.’); return; }
if (pass.length < 6) { setErr(‘Password min 6 characters.’); return; }
setLoading(true); setErr(’’);
try {
const c = await createUserWithEmailAndPassword(auth, email, pass);
await setDoc(doc(db, ‘users’, c.user.uid), {
email,
name: name.trim(),
phone: phone.trim(),
createdAt: serverTimestamp(),
role: ‘user’,
});
notify(‘Account created! 🎉’, ‘success’);
const intended2 = sessionStorage.getItem(‘intendedTab’);
sessionStorage.removeItem(‘intendedTab’);
onLogin(c.user, intended2 || ‘home’);
} catch (e) {
setErr(e.code === ‘auth/email-already-in-use’
? ‘Email already registered. Login instead.’
: ’Error: ’ + e.message);
}
setLoading(false);
};

const doReset = async () => {
if (!email) { setErr(‘Enter your email.’); return; }
setLoading(true); setErr(’’);
try {
await sendPasswordResetEmail(auth, email);
setOk(‘Reset email sent! Check your inbox.’);
} catch {
setErr(‘Email not found.’);
}
setLoading(false);
};

const handleKeyDown = (e) => {
if (e.key !== ‘Enter’) return;
if (mode === ‘login’) doLogin();
else if (mode === ‘signup’) doSignup();
else doReset();
};

return (
<div className="auth-wrap">
<div className="auth-card">
{/* Logo */}
<div className="auth-logo">
<div className="auth-icon">🧭</div>
<div className="auth-title">NavisphereX Marine</div>
<div className="auth-sub">
{mode === ‘reset’ ? ‘Reset Password’ : ‘Free account · Download all files’}
</div>
</div>

```
    {/* Login / Signup tabs */}
    {mode !== 'reset' && (
      <div className="auth-tabs">
        <button
          className={`atab ${mode === 'login' ? 'active' : ''}`}
          onClick={() => { setMode('login'); setErr(''); setOk(''); }}>
          Login
        </button>
        <button
          className={`atab ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => { setMode('signup'); setErr(''); setOk(''); }}>
          Create Account
        </button>
      </div>
    )}

    <div className="info-box" style={{ fontSize: '0.74rem' }}>
      🆓 Free account · Access all RTZ routes &amp; ECDIS charts
    </div>

    {/* Signup-only fields */}
    {mode === 'signup' && (
      <>
        <div className="ff">
          <label className="fl">Full Name *</label>
          <input className="fi" placeholder="Capt. Ahmed Khan"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="ff">
          <label className="fl">Phone Number *</label>
          <input className="fi" type="tel" placeholder="+91 9876543210"
            value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </>
    )}

    {/* Email */}
    <div className="ff">
      <label className="fl">Email</label>
      <input className="fi" type="email" placeholder="officer@ship.com"
        value={email} onChange={e => setEmail(e.target.value)}
        onKeyDown={handleKeyDown} />
    </div>

    {/* Password */}
    {mode !== 'reset' && (
      <div className="ff">
        <label className="fl">Password</label>
        <input className="fi" type="password" placeholder="Min 6 characters"
          value={pass} onChange={e => setPass(e.target.value)}
          onKeyDown={handleKeyDown} />
      </div>
    )}

    {/* Error / Success messages */}
    {err && <div className="err-box">{err}</div>}
    {ok  && <div className="ok-box">{ok}</div>}

    {/* Submit */}
    <button className="submit-btn" disabled={loading}
      onClick={mode === 'login' ? doLogin : mode === 'signup' ? doSignup : doReset}>
      {loading
        ? 'Please wait…'
        : mode === 'login'   ? '🔐 LOGIN'
        : mode === 'signup'  ? '✅ CREATE FREE ACCOUNT'
        :                      '📧 SEND RESET EMAIL'}
    </button>

    {/* Footer links */}
    {mode === 'login' && (
      <div className="link-txt" onClick={() => { setMode('reset'); setErr(''); setOk(''); }}>
        Forgot password?
      </div>
    )}
    {mode === 'reset' && (
      <div className="link-txt" onClick={() => { setMode('login'); setErr(''); setOk(''); }}>
        ← Back to login
      </div>
    )}
  </div>
</div>
```

);
}


