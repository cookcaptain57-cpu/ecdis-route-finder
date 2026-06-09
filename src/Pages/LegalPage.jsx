/* eslint-disable */
// src/Pages/LegalPage.jsx
import { useState } from "react";

const DISCLAIMER_SECTIONS = [
  {
    icon: '⚠️',
    title: 'For Reference Only',
    content: 'NavisphereX Marine is designed as a reference and planning tool for maritime professionals. All information, data, routes, charts, and calculations provided are for reference purposes only and must not be relied upon as the sole source for navigation decisions.',
  },
  {
    icon: '🧭',
    title: 'Not a Substitute for Official Sources',
    content: 'This application is NOT a substitute for official ECDIS systems, paper charts, nautical publications (NtM, Pilots, Sailing Directions), GMDSS, or any other official navigational tool or publication. Always cross-check all data with official sources before use at sea.',
  },
  {
    icon: '📊',
    title: 'Data Accuracy',
    content: 'Port data, route information, vessel details, and all other data within NavisphereX Marine may not be 100% accurate, complete, or current. Data is sourced from publicly available databases and may contain errors or outdated information. Users must verify all data against official publications.',
  },
  {
    icon: '⚖️',
    title: 'No Liability',
    content: 'The developer (Manish Bharti) accepts no responsibility or liability for any navigational decisions, incidents, accidents, losses, or damages arising from the use of this application. By using NavisphereX Marine, you accept full responsibility for verifying all information independently.',
  },
  {
    icon: '🔄',
    title: 'Data Currency',
    content: 'Maritime data changes frequently — port restrictions, traffic schemes, regulations, and notices. NavisphereX Marine may not reflect the most current state of any port, route, or maritime zone. Always check current Notice to Mariners (NtM) and local port authority notices.',
  },
  {
    icon: '✅',
    title: 'Acceptance',
    content: 'Use of this application implies full acceptance of this disclaimer. If you do not agree with these terms, please discontinue use of NavisphereX Marine immediately.',
  },
];

const TC_SECTIONS = [
  {
    icon: '👥',
    title: '1. Who Can Use This App',
    content: 'NavisphereX Marine is intended for maritime professionals (deck officers, engineer officers, ratings), maritime students, shore-based maritime personnel, and anyone with a legitimate interest in maritime information. Users must be 16 years of age or older to register.',
  },
  {
    icon: '📝',
    title: '2. Account Registration',
    content: 'To access certain features, you must create an account with a valid email address and password. You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate information during registration. One account per user. Do not share your account with others.',
  },
  {
    icon: '✅',
    title: '3. Acceptable Use',
    content: 'You agree to use NavisphereX Marine only for lawful purposes. You must not: attempt to scrape, copy, or redistribute app data or content; use the app to harass, harm, or defraud others; attempt to gain unauthorized access to any part of the app; use automated tools or bots to access the app; upload malicious content or attempt to compromise app security.',
  },
  {
    icon: '🔒',
    title: '4. Data Privacy',
    content: 'We collect and store: your name, email address, rank, ship name, and profile information you provide; sea time entries and certificate data you enter; usage logs for app improvement. We do NOT sell your data to third parties. Your password is encrypted by Firebase and is never accessible to the developer. Contact us entries are stored securely to allow us to respond to your queries.',
  },
  {
    icon: '📦',
    title: '5. Intellectual Property',
    content: 'All content, design, code, and features of NavisphereX Marine are the intellectual property of Manish Bharti. You may not redistribute, resell, or commercially exploit any part of this application or its content without explicit written permission. Personal, non-commercial use is permitted and encouraged.',
  },
  {
    icon: '🔄',
    title: '6. Changes to the App',
    content: 'NavisphereX Marine is a continuously evolving platform. Features may be added, modified, or removed at any time without prior notice. The app may undergo maintenance periods causing temporary unavailability. These Terms & Conditions may be updated at any time — continued use of the app constitutes acceptance of any changes.',
  },
  {
    icon: '🛡',
    title: '7. Account Suspension',
    content: 'The developer reserves the right to suspend or terminate any user account at any time, with or without notice, for violations of these Terms & Conditions, misuse of the application, fraudulent activity, or any behavior deemed harmful to other users or the application.',
  },
  {
    icon: '⚖️',
    title: '8. Governing Law',
    content: 'These Terms & Conditions are governed by the laws of India. Any disputes arising from the use of NavisphereX Marine shall be subject to the exclusive jurisdiction of the courts of India. By using this application, you consent to this jurisdiction.',
  },
  {
    icon: '📧',
    title: '9. Contact for Legal Queries',
    content: 'For any questions regarding these Terms & Conditions or our Privacy Policy, please contact us at navispherex@gmail.com or via the Contact Us page. We will endeavour to respond within 48 hours.',
  },
];

function Section({ icon, title, content, index }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '1rem 1.2rem', marginBottom: '0.7rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 2 }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.72rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 6 }}>
            {title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.8 }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LegalPage({ setTab }) {
  const [activeTab, setActiveTab] = useState('disclaimer');

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.4rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.2rem', fontWeight: 900, marginBottom: 6, letterSpacing: '0.06em' }}>
          LEGAL <span style={{ color: 'var(--cyan)' }}>& TERMS</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>
          Please read carefully before using NavisphereX Marine
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 6, marginBottom: '1.2rem', gap: 6,
      }}>
        {[
          { k: 'disclaimer', icon: '⚠️', label: 'Disclaimer' },
          { k: 'terms',      icon: '📋', label: 'Terms & Conditions' },
        ].map(t => (
          <button key={t.k}
            onClick={() => setActiveTab(t.k)}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 9, border: 'none',
              cursor: 'pointer', fontFamily: 'Exo 2,sans-serif', fontSize: '0.8rem',
              fontWeight: 600, transition: 'all 0.2s',
              background: activeTab === t.k ? 'linear-gradient(135deg,var(--cyan),var(--blue))' : 'transparent',
              color: activeTab === t.k ? 'white' : 'var(--text2)',
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Last updated */}
      <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginBottom: '1rem', textAlign: 'right' }}>
        Last updated: June 2026
      </div>

      {/* Disclaimer Tab */}
      {activeTab === 'disclaimer' && (
        <>
          <div className="info-box" style={{ marginBottom: '1rem', borderColor: 'rgba(240,165,0,0.3)', color: 'var(--gold)' }}>
            ⚠️ <strong>Important:</strong> NavisphereX Marine is for reference and planning only.
            It must never be used as the sole source for navigation at sea.
          </div>
          {DISCLAIMER_SECTIONS.map((s, i) => <Section key={i} {...s} index={i} />)}
        </>
      )}

      {/* Terms Tab */}
      {activeTab === 'terms' && (
        <>
          <div className="info-box" style={{ marginBottom: '1rem' }}>
            📋 By creating an account and using NavisphereX Marine, you agree to all terms listed below.
          </div>
          {TC_SECTIONS.map((s, i) => <Section key={i} {...s} index={i} />)}
        </>
      )}

      {/* Bottom actions */}
      <div style={{ marginTop: '1.4rem', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-secondary" onClick={() => setTab('contact')} style={{ fontSize: '0.76rem' }}>
          📧 Legal Queries — Contact Us
        </button>
        <button className="btn btn-secondary" onClick={() => setTab('about')} style={{ fontSize: '0.76rem' }}>
          🧭 About NavisphereX
        </button>
      </div>

    </div>
  );
}
