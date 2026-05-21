/* eslint-disable */
// src/pages/AccountPage.jsx
import { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";

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

const RANK_EMOJI = {
  'Captain / Master': '🎖️',
  'Chief Officer (1st Officer)': '🔱',
  '2nd Officer': '⭐',
  '3rd Officer': '⭐',
  'Chief Engineer': '⚙️',
  '2nd Engineer': '⚙️',
  '3rd Engineer': '⚙️',
  '4th Engineer': '⚙️',
  'Electrical Officer (ETO)': '⚡',
  'Bosun': '⚓',
  'AB Seaman (Rating)': '🌊',
  'Ordinary Seaman (OS)': '🌊',
  'Deck Cadet': '🎓',
  'Engine Cadet': '🎓',
  'Shore-based / Other': '🏢',
};

function AccountPage({ user, userProfile, setUserProfile, notify, setTab }) {
  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [address, setAddress]   = useState('');
  const [shipName, setShipName] = useState('');
  const [rank, setRank]         = useState('');

  // Populate form whenever userProfile changes
  useEffect(() => {
    setName(userProfile?.name     || '');
    setPhone(userProfile?.phone   || '');
    setAddress(userProfile?.address  || '');
    setShipName(userProfile?.shipName || '');
    setRank(userProfile?.rank     || '');
  }, [userProfile]);

  const saveProfile = async () => {
    if (!user) return;
    if (!name.trim()) { notify('Name cannot be empty', 'error'); return; }
    setLoading(true);
    try {
      const updates = {
        name: name.trim(), phone: phone.trim(),
        address: address.trim(), shipName: shipName.trim(), rank,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
      setUserProfile(prev => ({ ...prev, ...updates }));
      setEditing(false);
      notify('✅ Profile updated', 'success');
    } catch (e) { notify('Update failed: ' + e.message, 'error'); }
    setLoading(false);
  };

  const rankEmoji = RANK_EMOJI[userProfile?.rank] || '👤';

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">👤 My Account</div>
        <button className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '0.72rem', color: 'var(--red)', borderColor: 'rgba(255,71,87,0.4)' }}
          onClick={() => { signOut(auth); notify('Logged out', 'info'); setTab('home'); }}>
          🚪 Logout
        </button>
      </div>

      {/* ── Profile card ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.4rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,var(--cyan),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', flexShrink: 0 }}>
          {rankEmoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.92rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 2 }}>
            {userProfile?.name || user?.email?.split('@')[0] || 'User'}
          </div>
          {userProfile?.rank && <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginBottom: 2 }}>{userProfile.rank}</div>}
          {userProfile?.shipName && <div style={{ fontSize: '0.74rem', color: 'var(--text2)' }}>🚢 {userProfile.shipName}</div>}
          <div style={{ fontSize: '0.7rem', color: 'var(--text3)', marginTop: 4 }}>{user?.email}</div>
        </div>
        <button className="btn btn-primary" style={{ padding: '7px 14px', fontSize: '0.74rem' }} onClick={() => setEditing(e => !e)}>
          {editing ? '✕ Cancel' : '✏️ Edit Profile'}
        </button>
      </div>

      {/* ── Edit form ─────────────────────────────────────────────────── */}
      {editing && (
        <div style={{ background: 'var(--card)', border: '1px solid rgba(0,180,216,0.3)', borderRadius: 14, padding: '1.3rem', marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: '1rem' }}>✏️ Edit Profile</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="ff" style={{ gridColumn: '1/-1' }}>
              <label className="fl">Full Name *</label>
              <input className="fi" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="ff">
              <label className="fl">Rank / Designation</label>
              <select className="fi" value={rank} onChange={e => setRank(e.target.value)}>
                <option value="">— Select rank —</option>
                {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="ff">
              <label className="fl">Phone Number</label>
              <input className="fi" type="tel" placeholder="Your phone" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="ff">
              <label className="fl">Ship Name</label>
              <input className="fi" placeholder="MV / MT / MSV..." value={shipName} onChange={e => setShipName(e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn: '1/-1' }}>
              <label className="fl">Address</label>
              <input className="fi" placeholder="City, Country" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="ff" style={{ gridColumn: '1/-1' }}>
              <label className="fl">Email</label>
              <input className="fi" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={saveProfile} disabled={loading}>{loading ? 'Saving…' : '✅ Save Changes'}</button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Account details (read-only view) ──────────────────────────── */}
      {!editing && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.2rem', marginBottom: '1.2rem' }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.76rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)' }}>📋 Profile Details</div>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {[
              { label: 'Full Name',  value: userProfile?.name,     icon: '👤' },
              { label: 'Rank',       value: userProfile?.rank,     icon: rankEmoji },
              { label: 'Ship Name',  value: userProfile?.shipName, icon: '🚢' },
              { label: 'Phone',      value: userProfile?.phone,    icon: '📱' },
              { label: 'Email',      value: user?.email,           icon: '✉️' },
              { label: 'Address',    value: userProfile?.address,  icon: '📍' },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', width: 70, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: '0.82rem', color: row.value ? 'var(--text)' : 'var(--text3)', fontStyle: row.value ? 'normal' : 'italic' }}>
                  {row.value || 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Saved Routes placeholder ───────────────────────────────────── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.2rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.76rem', fontWeight: 700, color: 'var(--cyan)' }}>🛤 Saved Routes</div>
          <span className="badge" style={{ background: 'rgba(240,165,0,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,165,0,0.3)' }}>Coming Soon</span>
        </div>
        <div style={{ textAlign: 'center', padding: '1.2rem 0', color: 'var(--text3)', fontSize: '0.76rem' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🛤</div>
          Save your favourite routes here for quick access.
        </div>
      </div>

      {/* ── Saved Charts placeholder ───────────────────────────────────── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.76rem', fontWeight: 700, color: 'var(--gold)' }}>📊 Saved Charts</div>
          <span className="badge" style={{ background: 'rgba(240,165,0,0.12)', color: 'var(--gold)', border: '1px solid rgba(240,165,0,0.3)' }}>Coming Soon</span>
        </div>
        <div style={{ textAlign: 'center', padding: '1.2rem 0', color: 'var(--text3)', fontSize: '0.76rem' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>📊</div>
          Save your favourite ECDIS charts here for quick access.
        </div>
      </div>
    </div>
  );
}

export default AccountPage;
