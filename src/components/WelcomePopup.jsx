/* eslint-disable */
// src/components/WelcomePopup.jsx
import { useState, useEffect } from "react";

function WelcomePopup({ type, name, rank, onClose }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]           = useState(false);

  const displayName = (rank ? `${rank} ` : '') + (name || 'Navigator');

  const fullText = type === 'new'
    ? `Welcome aboard, ${displayName}!\n\nNavisphereX Marine is your all-in-one maritime navigation companion.\n\nAccess 23,000+ RTZ routes, ECDIS charts for all major brands, global port database, route planner and maritime library — all in one place.\n\nSafe sailing ahead! ⚓`
    : `Welcome back to NavisphereX Marine!\n\nGood day, ${displayName}.\n\nYour maritime data is ready and up to date. Plan your voyages, download route files and explore the full fleet of navigation tools.\n\nSafe seas ahead! 🧭`;

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setDisplayed(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) { clearInterval(timer); setDone(true); }
    }, 28);
    return () => clearInterval(timer);
  }, [fullText]);

  // Auto-dismiss 6s after typing finishes
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const lines = displayed.split('\n');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)', zIndex: 9998,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
      animation: 'fadeIn 0.3s ease' }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
      <div style={{ background: 'linear-gradient(135deg,#040C1A,#071428)', border: '1px solid rgba(0,180,216,0.4)',
        borderRadius: 20, padding: '2rem', maxWidth: 420, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 40px rgba(0,180,216,0.1)' }}>

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <div style={{ fontSize: '2.8rem' }}>{type === 'new' ? '⚓' : '🧭'}</div>
        </div>

        {/* Title */}
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.88rem', fontWeight: 700,
          color: 'var(--cyan)', textAlign: 'center', marginBottom: '1.2rem', letterSpacing: '0.1em' }}>
          {type === 'new' ? 'WELCOME ABOARD' : 'WELCOME BACK'}
        </div>

        {/* Typewriter text */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.9,
          minHeight: '8rem', fontFamily: 'Exo 2,sans-serif' }}>
          {lines.map((line, i) => (
            <span key={i}>
              {line}
              {i < lines.length - 1 && <br />}
            </span>
          ))}
          {!done && (
            <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--cyan)',
              marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 0.7s infinite' }} />
          )}
        </div>

        {/* Button — shows after typing done */}
        {done && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center',
            marginTop: '1.4rem', fontSize: '0.82rem', padding: '12px', borderRadius: 10 }}
            onClick={onClose}>
            {type === 'new' ? '🚀 Start Exploring NavisphereX' : '✅ Continue to Dashboard'}
          </button>
        )}

        {/* Skip link — always visible */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--text3)', cursor: 'pointer',
            textDecoration: 'underline' }} onClick={onClose}>Skip</span>
        </div>
      </div>
    </div>
  );
}

export default WelcomePopup;
