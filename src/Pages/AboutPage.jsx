/* eslint-disable */
// src/Pages/AboutPage.jsx
import { useState, useEffect } from "react";

const FEATURES = [
  { icon: '🗺',  title: 'Route Planner',         desc: 'Interactive ECDIS-style route planning with waypoints' },
  { icon: '⚓',  title: 'Port Database',           desc: '27,000+ world ports with coordinates and details' },
  { icon: '📡',  title: 'ECDIS Charts',            desc: 'Digital chart files for major ECDIS brands' },
  { icon: '🛳',  title: 'Vessel Search',           desc: 'Search and track vessels worldwide' },
  { icon: '⏱',  title: 'Sea Time Calculator',     desc: 'Track and calculate sea service time accurately' },
  { icon: '📜',  title: 'Certificate Tracker',    desc: 'Never miss a certificate renewal again' },
  { icon: '🧮',  title: 'Voyage Calculator',       desc: 'Calculate ETA, fuel, distance and speed' },
  { icon: '📚',  title: 'Maritime Library',        desc: 'Reference publications and maritime documents' },
  { icon: '🔭',  title: 'Compass Error',           desc: 'Gyro and magnetic compass error calculations' },
  { icon: '🧭',  title: 'Nav Mode',               desc: 'Full-screen navigation and planning mode' },
  { icon: '📢',  title: 'Port Notices',            desc: 'Live port notices and maritime advisories' },
  { icon: '🪢',  title: 'Knots & Mooring',        desc: 'Visual guide to seamanship knots and mooring' },
  { icon: '🚨',  title: 'Emergency Reference',    desc: 'Quick-access emergency procedures and contacts' },
  { icon: '🧳',  title: 'Crew Journey',           desc: 'Track your career voyage and sea service' },
];

const MILESTONES = [
  { year: '2024', event: 'NavisphereX Marine — First version launched' },
  { year: '2025', event: 'Port Database expanded to 27,000+ entries' },
  { year: '2025', event: 'ECDIS Charts, Route Planner & Nav Mode added' },
  { year: '2026', event: 'Full redesign — Sea Time, Certificates, Crew Journey' },
];

export default function AboutPage({ setTab }) {
  const [appVersion, setAppVersion] = useState('');
  const [visibleCards, setVisibleCards] = useState(0);

  useEffect(() => {
    // ── CHANGE: removed import.meta (Vite-only, not supported in CRA/webpack) ──
    setAppVersion('2.0.0');

    // Stagger feature card reveal
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleCards(i);
      if (i >= FEATURES.length) clearInterval(t);
    }, 60);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.2rem' }}>

      {/* ── Hero ── */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(0,180,216,0.08),rgba(21,101,192,0.12))',
        border: '1px solid var(--border2)', borderRadius: 20,
        padding: '2.5rem 2rem', textAlign: 'center',
        marginBottom: '1.8rem', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,180,216,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.03) 1px,transparent 1px)', backgroundSize: '30px 30px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧭</div>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.08em', marginBottom: 4 }}>
            NAVISPHERE<span style={{ color: 'var(--cyan)' }}>X</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
            MARINE SYSTEMS
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text2)', lineHeight: 1.8, maxWidth: 560, margin: '0 auto', marginBottom: 20 }}>
            A professional maritime web platform built by a serving officer,
            designed for navigators, officers, and maritime students worldwide.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 14px', borderRadius: 100, background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.25)', color: 'var(--cyan)', fontSize: '0.7rem', fontFamily: 'Orbitron,monospace' }}>
              v{appVersion}
            </span>
            <span style={{ padding: '4px 14px', borderRadius: 100, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', color: 'var(--green)', fontSize: '0.7rem' }}>
              🆓 Free to Use
            </span>
            <span style={{ padding: '4px 14px', borderRadius: 100, background: 'rgba(240,165,0,0.1)', border: '1px solid rgba(240,165,0,0.25)', color: 'var(--gold)', fontSize: '0.7rem' }}>
              ⚓ Built for Seafarers
            </span>
          </div>
        </div>
      </div>

      {/* ── What is NavisphereX ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.4rem', marginBottom: '1.4rem' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.84rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          🌊 What is NavisphereX Marine?
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.9 }}>
          NavisphereX Marine is a <strong style={{ color: 'var(--text)' }}>free, web-based maritime tool suite</strong> designed
          to solve real problems faced by seafarers onboard and ashore. From planning routes to tracking
          sea time, from searching ports to managing certificates — everything a navigator needs,
          in one place.
          NavisphereX Marine supports:
          ✅ Android phones and tablets
          ✅ Apple Iphones and Ipads
          ✅ Windows laptops  
          ✅ MacBook

           For AIS connectivity, 
         NavisphereX Bridge app required
        (Android/Windows/Mac — free download)

         iOS coming soon via hardware adapter.
          <br /><br />
          Unlike generic apps, NavisphereX is built by someone who actually uses it at sea. Every feature
          comes from a real need encountered onboard, making it <strong style={{ color: 'var(--cyan)' }}>practical, accurate, and constantly evolving</strong>.
        </div>
      </div>

      {/* ── Features Grid ── */}
      <div style={{ marginBottom: '1.4rem' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.84rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          ⚡ Features
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '0.7rem' }}>
          {FEATURES.map((f, i) => (
            <div key={f.title}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '0.9rem',
                opacity: i < visibleCards ? 1 : 0,
                transform: i < visibleCards ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.35s ease',
              }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.62rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text3)', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why This App ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.4rem', marginBottom: '1.4rem' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.84rem', fontWeight: 700, color: 'var(--green)', marginBottom: '0.9rem' }}>
          💡 Why NavisphereX?
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '0.8rem' }}>
          {[
            { icon: '🛳', title: 'Real Sea Experience', desc: 'Built by a serving officer who faces these challenges daily onboard.' },
            { icon: '🔧', title: 'Solves Real Problems', desc: 'Every feature addresses an actual pain point in maritime operations.' },
            { icon: '🆓', title: 'Free & Accessible', desc: 'No paywalls, no ads. Free for all maritime professionals and students.' },
            { icon: '🔄', title: 'Constantly Improving', desc: 'Regular updates based on user feedback and new requirements at sea.' },
          ].map(r => (
            <div key={r.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{r.icon}</div>
              <div>
                <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.66rem', fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{r.title}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text3)', lineHeight: 1.5 }}>{r.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Timeline ── */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.4rem', marginBottom: '1.4rem' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.84rem', fontWeight: 700, color: 'var(--purple)', marginBottom: '0.9rem' }}>
          📅 Journey So Far
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {MILESTONES.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                flexShrink: 0, width: 60,
                fontFamily: 'Orbitron,monospace', fontSize: '0.65rem', fontWeight: 700,
                color: 'var(--cyan)', paddingTop: 2,
              }}>{m.year}</div>
              <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', marginTop: 4, flexShrink: 0, boxShadow: '0 0 8px var(--cyan)' }} />
                <div style={{ fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.5 }}>{m.event}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Developer Card ── */}
      <div style={{
        background: 'linear-gradient(135deg,var(--card),rgba(21,101,192,0.15))',
        border: '1px solid rgba(0,180,216,0.3)', borderRadius: 16,
        padding: '1.6rem', marginBottom: '1.4rem',
        display: 'flex', gap: '1.4rem', alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,var(--cyan),var(--blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.2rem', boxShadow: '0 0 24px rgba(0,180,216,0.4)',
        }}>🧭</div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            MANISH BHARTI
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--gold)', marginBottom: 6 }}>2nd Officer · NavisphereX Developer</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: 10 }}>
            A serving maritime officer who builds tools to solve real problems at sea.
            NavisphereX Marine is a passion project born from the need for practical,
            accessible tools for the maritime community.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href="https://instagram.com/manish_the_navigator" target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', color: 'white', textDecoration: 'none', fontSize: '0.72rem', fontWeight: 700 }}>
              📸 @manish_the_navigator
            </a>
            <a href="mailto:navispherex@gmail.com"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.3)', color: 'var(--cyan)', textDecoration: 'none', fontSize: '0.72rem' }}>
              📧 navispherex@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* ── Bottom Links ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: '⚖️ Legal & Terms', tab: 'legal' },
          { label: '❓ FAQ', tab: 'faq' },
          { label: '✉️ Contact Us', tab: 'contact' },
        ].map(l => (
          <button key={l.tab} className="btn btn-secondary"
            onClick={() => setTab(l.tab)}
            style={{ fontSize: '0.76rem' }}>
            {l.label}
          </button>
        ))}
      </div>

    </div>
  );
}
