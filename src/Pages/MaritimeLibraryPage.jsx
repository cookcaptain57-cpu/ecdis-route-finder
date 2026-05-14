// src/pages/MaritimeLibraryPage.jsx
import { useState } from "react";

// ─── MARITIME LIBRARY PAGE ────────────────────────────────────────────────────
function MaritimeLibraryPage({ setTab }) {
  const BOOKS = [
    {
      title: 'SOLAS 2020',
      full: 'International Convention for the Safety of Life at Sea',
      icon: '🛡', color: 'var(--cyan)', cat: 'Safety',       // ✅ fixed
      desc: 'Consolidated edition covering all amendments up to 2020. Essential for all seafarers.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'MARPOL 2022',
      full: 'International Convention for the Prevention of Pollution from Ships',
      icon: '🌊', color: 'var(--green)', cat: 'Environment', // ✅ fixed
      desc: 'Annex I–VI covering oil, noxious liquids, garbage, air pollution and sewage.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'STCW 2017',
      full: 'Standards of Training, Certification and Watchkeeping',
      icon: '⚓', color: 'var(--gold)', cat: 'Certification', // ✅ fixed
      desc: 'Manila amendments consolidated edition including STCW Code Parts A and B.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'COLREGS',
      full: 'Convention on the International Regulations for Preventing Collisions at Sea',
      icon: '💡', color: '#F87171', cat: 'Navigation',
      desc: '72 COLREGS with all amendments. Rules of the road for all vessels.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'IAMSAR Manual',
      full: 'International Aeronautical and Maritime Search and Rescue Manual',
      icon: '🆘', color: '#FB923C', cat: 'Safety',
      desc: 'Volume I, II and III covering SAR services, mission coordination and mobile facilities.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'ISM Code',
      full: 'International Safety Management Code',
      icon: '📋', color: 'var(--purple)', cat: 'Management', // ✅ fixed
      desc: 'Requirements for the safe management and operation of ships and pollution prevention.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'ISPS Code',
      full: 'International Ship and Port Facility Security Code',
      icon: '🔒', color: '#A78BFA', cat: 'Security',
      desc: 'Security framework for ships and ports. Part A mandatory, Part B recommended.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'MLC 2006',
      full: 'Maritime Labour Convention',
      icon: '👷', color: 'var(--gold)', cat: 'Labour',       // ✅ fixed
      desc: "Seafarers rights, working conditions, manning, wages and repatriation.",
      link: 'https://www.ilo.org/global/standards/maritime-labour-convention/lang--en/index.htm', // ✅ fixed
    },
    {
      title: 'ECDIS Manual',
      full: 'ECDIS Operation and Best Practices Guide',
      icon: '📡', color: 'var(--cyan)', cat: 'ECDIS',        // ✅ fixed
      desc: 'General guide to ECDIS operation, chart updates, route planning and passage monitoring.',
      link: 'https://www.nautinst.org/',
    },
    {
      title: 'IMO Circulars',
      full: 'Latest IMO MSC/MEPC Circulars',
      icon: '🏛', color: '#60A5FA', cat: 'Regulations',
      desc: 'Latest Marine Safety Committee and Marine Environment Protection Committee circulars.',
      link: 'https://www.imo.org/en/OurWork/Pages/Home.aspx',
    },
  ];

  const [cat, setCat] = useState('All');
  const cats = ['All', 'Safety', 'Environment', 'Navigation', 'Certification', 'ECDIS', 'Regulations', 'Security', 'Management', 'Labour'];
  const filtered = cat === 'All' ? BOOKS : BOOKS.filter(b => b.cat === cat);

  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">📚 Maritime Knowledge Hub</div>
        <span className="badge">{BOOKS.length} publications</span>
      </div>

      <div className="info-box" style={{ marginBottom: '1rem' }}>
        📖 Essential maritime publications — SOLAS, MARPOL, STCW, COLREGS and more. Links open official IMO/ILO resources.
      </div>

      {/* Category filter chips */}
      <div className="fbar" style={{ marginBottom: '1.2rem' }}>
        {cats.map(c => (
          <button key={c} className={`fbtn ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Book cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '0.9rem' }}>
        {filtered.map((b, i) => (
          <div key={i} style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14,
            padding: '1.2rem', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 8
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}>

            {/* Header row: icon + title + category badge */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: 'rgba(0,0,0,0.2)',
                border: `1px solid ${b.color}33`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0
              }}>
                {b.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.72rem', fontWeight: 700, color: b.color }}>
                    {b.title}
                  </span>
                  <span style={{
                    padding: '1px 6px', borderRadius: 4, fontSize: '0.58rem', fontWeight: 600,
                    background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}30`
                  }}>
                    {b.cat}
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text3)', marginTop: 2, lineHeight: 1.3 }}>
                  {b.full}
                </div>
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.76rem', color: 'var(--text2)', lineHeight: 1.5, flex: 1 }}>
              {b.desc}
            </p>

            {/* Open link button */}
            <a href={b.link} target="_blank" rel="noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '8px', background: `${b.color}10`, border: `1px solid ${b.color}30`,
                borderRadius: 8, color: b.color, fontSize: '0.74rem', fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${b.color}20`}
              onMouseLeave={e => e.currentTarget.style.background = `${b.color}10`}>
              📖 Open Publication →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MaritimeLibraryPage;
