/* eslint-disable */
// src/Pages/FAQPage.jsx
import { useState } from "react";

const FAQ_CATEGORIES = [
  {
    category: '🚀 Getting Started',
    color: 'var(--cyan)',
    items: [
      {
        q: 'What is NavisphereX Marine?',
        a: 'NavisphereX Marine is a free, professional-grade maritime web application built by a serving 2nd Officer. It provides tools for route planning, port search, sea time calculation, certificate tracking, vessel search, and much more — all in one place.',
      },
      {
        q: 'Do I need to create an account to use the app?',
        a: 'Some features are available without an account, but most features require a free registered account. Creating an account takes less than a minute and gives you full access to all tools including Sea Time Calculator, Certificate Tracker, and Crew Journey.',
      },
      {
        q: 'Is NavisphereX Marine free to use?',
        a: 'Yes! NavisphereX Marine is completely free to use. There is a Free tier (default) and a Paid tier with extended download limits. Core tools like Sea Time, Port Search, and Certificate Tracker are always free.',
      },
      {
        q: 'What devices does it work on?',
        a: 'NavisphereX Marine is a web application — it works on any modern browser on desktop, laptop, tablet, or mobile phone. No app download is required.',
      },
    ],
  },
  {
    category: '⚓ Port & Route Features',
    color: 'var(--gold)',
    items: [
      {
        q: 'How many ports are in the database?',
        a: 'The port database contains 27,000+ world ports, sourced from UN/LOCODE and official maritime databases. Each port includes coordinates, country, and other details.',
      },
      {
        q: 'Can I plan an actual navigation route?',
        a: 'Yes! The Route Planner and Nav Mode provide ECDIS-style interactive route planning with waypoints, ETAs, and visual map display. However, these are planning tools only — always verify routes with official charts and publications.',
      },
      {
        q: 'How do I download ECDIS charts?',
        a: 'ECDIS charts are available in the Charts section after logging in. You can filter by brand (Furuno, JRC, Transas, etc.) and port. Download limits apply based on your account tier.',
      },
      {
        q: 'Why is a port missing from the database?',
        a: 'While we have 27,000+ ports, some smaller or newer ports may be missing. Please use the "Write to Us" contact form (category: Data Update Request) to report any missing ports and we will add them.',
      },
    ],
  },
  {
    category: '⏱ Sea Time & Certificates',
    color: 'var(--green)',
    items: [
      {
        q: 'How does the Sea Time Calculator work?',
        a: 'The Sea Time Calculator lets you add multiple voyages/contracts with start and end dates, vessel name, and rank. It automatically calculates total days, months, and years of sea service — useful for CoC applications and career tracking.',
      },
      {
        q: 'Is my sea time data safe?',
        a: 'Yes. Your sea time entries are saved to your personal Firestore account and are only accessible to you. The developer cannot access your sea time data.',
      },
      {
        q: 'Can I export my sea time records?',
        a: 'Yes, the Sea Time Calculator supports Excel export of your full service record. This is useful for MMD applications and interview preparation.',
      },
      {
        q: 'How does the Certificate Tracker work?',
        a: 'Add your certificates with their expiry dates and the tracker will alert you before they expire. You can set reminder periods (e.g. 3 months, 1 month before expiry) so you never miss a renewal.',
      },
    ],
  },
  {
    category: '🔐 Account & Security',
    color: 'var(--purple)',
    items: [
      {
        q: 'I forgot my password. What do I do?',
        a: 'On the Login page, click "Forgot Password" and enter your email address. A password reset link will be sent to your email. If you face issues, contact us at navispherex@gmail.com.',
      },
      {
        q: 'How do I change my profile information?',
        a: 'Go to My Account (accessible when logged in) to update your name, rank, ship name, phone, and other profile details.',
      },
      {
        q: 'Can I delete my account?',
        a: 'Yes. Contact us at navispherex@gmail.com or via the Contact Us page to request account deletion. All your data will be permanently removed within 7 days.',
      },
      {
        q: 'What is the difference between Free and Paid tier?',
        a: 'Free tier gives access to all core features with standard download limits for routes and charts. Paid tier increases download limits. Most tools (Sea Time, Port Search, Certificates, etc.) are unlimited on both tiers.',
      },
    ],
  },
  {
    category: '📱 Technical Issues',
    color: 'var(--red)',
    items: [
      {
        q: 'The app is loading slowly. What can I do?',
        a: 'NavisphereX loads a large port database (~27,000 ports) on first use, which may take a moment. After the initial load, data is cached in your browser for fast offline access. Try refreshing if it seems stuck.',
      },
      {
        q: 'The map is showing a blank/dark screen.',
        a: 'This is a known Leaflet map issue when switching tabs. Try clicking the refresh or back button, or navigate away and return to the map page. We have implemented fixes for this and continue to improve stability.',
      },
      {
        q: 'Will it work offline?',
        a: 'Partially. Once data is loaded, routes, charts, and port data are cached to your browser (IndexedDB) and accessible offline. However, features requiring live data (vessel search, sheet sync) need an internet connection.',
      },
      {
        q: 'I found a bug. How do I report it?',
        a: 'We really appreciate bug reports! Use the Contact Us / Write to Us page, select category "Bug / Error Report" and priority "Urgent" if it is critical. Include a screenshot if possible — it helps us fix issues faster.',
      },
    ],
  },
];

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden',
      marginBottom: '0.5rem', transition: 'all 0.2s',
      borderColor: open ? 'rgba(0,180,216,0.3)' : 'var(--border)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '0.9rem 1rem', background: open ? 'rgba(0,180,216,0.05)' : 'var(--card)',
          border: 'none', color: 'var(--text)', fontFamily: 'Exo 2,sans-serif',
          fontSize: '0.82rem', fontWeight: 600, textAlign: 'left', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          transition: 'all 0.2s',
        }}>
        <span style={{ flex: 1 }}>{q}</span>
        <span style={{
          fontSize: '1rem', color: 'var(--cyan)', transition: 'transform 0.25s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0,
        }}>▾</span>
      </button>
      {open && (
        <div style={{
          padding: '0 1rem 0.9rem', background: 'rgba(0,0,0,0.15)',
          fontSize: '0.78rem', color: 'var(--text2)', lineHeight: 1.8,
          borderTop: '1px solid rgba(0,180,216,0.1)',
          paddingTop: '0.8rem',
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage({ setTab }) {
  const [search, setSearch] = useState('');
  const [openCategory, setOpenCategory] = useState(null);

  const filtered = search.trim()
    ? FAQ_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(
          item => item.q.toLowerCase().includes(search.toLowerCase()) ||
                  item.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQ_CATEGORIES;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1.2rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '1.4rem', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '1.2rem', fontWeight: 900, marginBottom: 6, letterSpacing: '0.06em' }}>
          FREQUENTLY ASKED <span style={{ color: 'var(--cyan)' }}>QUESTIONS</span>
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>
          Find quick answers to common questions about NavisphereX Marine
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.4rem' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: 'var(--text3)', pointerEvents: 'none' }}>🔍</span>
        <input className="fi" placeholder="Search FAQs…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38 }} />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        )}
      </div>

      {/* Count */}
      {search && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text3)', marginBottom: '0.8rem' }}>
          {filtered.reduce((a, c) => a + c.items.length, 0)} result(s) for "{search}"
        </div>
      )}

      {/* FAQ Categories */}
      {filtered.length === 0
        ? (
          <div className="empty">
            <div className="empty-icon">❓</div>
            <div className="empty-t">No results found</div>
            <div className="empty-d">Try a different search term or browse categories below</div>
          </div>
        )
        : filtered.map((cat, ci) => {
          const isOpen = search ? true : (openCategory === ci || openCategory === null && ci === 0);
          return (
            <div key={cat.category} style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setOpenCategory(openCategory === ci ? null : ci)}
                style={{
                  width: '100%', padding: '0.8rem 1rem',
                  background: 'var(--card2)', border: '1px solid var(--border2)',
                  borderRadius: 12, cursor: 'pointer', color: cat.color,
                  fontFamily: 'Orbitron,monospace', fontSize: '0.76rem', fontWeight: 700,
                  textAlign: 'left', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 8,
                  transition: 'all 0.2s', marginBottom: isOpen ? 8 : 0,
                }}>
                <span>{cat.category}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.62rem', padding: '2px 8px', borderRadius: 100, background: 'rgba(255,255,255,0.07)', color: 'var(--text3)', fontFamily: 'Exo 2,sans-serif' }}>
                    {cat.items.length} questions
                  </span>
                  <span style={{ transition: 'transform 0.25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '0.9rem' }}>▾</span>
                </div>
              </button>
              {isOpen && cat.items.map((item, ii) => (
                <FAQItem key={ii} q={item.q} a={item.a} />
              ))}
            </div>
          );
        })
      }

      {/* Still need help */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(0,180,216,0.06),rgba(21,101,192,0.1))',
        border: '1px solid rgba(0,180,216,0.2)', borderRadius: 16,
        padding: '1.4rem', textAlign: 'center', marginTop: '1.4rem',
      }}>
        <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>💬</div>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 6 }}>
          Still Have a Question?
        </div>
        <div style={{ fontSize: '0.76rem', color: 'var(--text2)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Can't find what you're looking for? Reach out directly — we're happy to help!
        </div>
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}
          onClick={() => setTab('contact')}>
          ✉️ Contact Us
        </button>
      </div>

    </div>
  );
}
