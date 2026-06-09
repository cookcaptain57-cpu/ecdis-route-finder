/* eslint-disable */

const IgSvg = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
  </svg>
);

const igLinkStyle = {
  display: "flex", alignItems: "center", gap: "6px",
  textDecoration: "none", color: "#8A9BBF",
  fontSize: "0.68rem", fontWeight: 400, letterSpacing: "0.03em",
  cursor: "pointer", flexShrink: 0,
};

const igIconStyle = {
  width: "22px", height: "22px", borderRadius: "6px",
  background: "linear-gradient(135deg,#405de6 0%,#833ab4 25%,#c13584 45%,#e1306c 60%,#fd1d1d 75%,#f77737 88%,#fcb045 100%)",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 2px 8px rgba(193,53,132,0.4)", flexShrink: 0,
};

const disclaimerStyle = {
  position: "relative", zIndex: 10,
  fontSize: "0.62rem", fontWeight: 300, color: "#4A5F80",
  letterSpacing: "0.03em", lineHeight: 1.5,
  marginTop: "6px", paddingTop: "6px",
  borderTop: "1px solid rgba(26,58,92,0.3)",
};

// ─── ADDED: footer nav links for new pages ────────────────────────────────────
const footerNavStyle = {
  position: "relative", zIndex: 10,
  display: "flex", alignItems: "center",
  flexWrap: "wrap", gap: "4px 2px",
  marginTop: "8px", paddingTop: "8px",
  borderTop: "1px solid rgba(26,58,92,0.3)",
};

const footerLinkStyle = {
  background: "none", border: "none",
  color: "#4A5F80", fontSize: "0.62rem",
  cursor: "pointer", padding: "2px 6px",
  fontFamily: "Exo 2, sans-serif",
  transition: "color 0.2s",
  textDecoration: "none",
};

// ─── ADDED: footer nav link items ─────────────────────────────────────────────
const FOOTER_LINKS = [
  { label: 'Contact Us', tab: 'contact' },
  { label: 'About',      tab: 'about'   },
  { label: 'Legal',      tab: 'legal'   },
  { label: 'FAQ',        tab: 'faq'     },
];

// ─── CHANGED: accept setTab prop for navigation ───────────────────────────────
export default function Footer({ setTab }) {
  return (
    <footer className="footer">
      <div className="wave wave1" />
      <div className="wave wave2" />
      <div className="wave wave3" />

      <div className="footer-row">
        <div className="footer-left">
          <div className="footer-brand">NavisphereX <span>Marine</span></div>
          <div className="footer-copy">Owner: Manish Bharti &nbsp;·&nbsp; © 2026</div>
        </div>
        <a href="https://instagram.com/manish_the_navigator" target="_blank" rel="noreferrer"
          aria-label="Contact Admin On Instagram" style={igLinkStyle}>
          <span style={igIconStyle}><IgSvg /></span>
          Contact Admin On Instagram
        </a>
      </div>

      {/* ─── ADDED: Footer nav links row ─────────────────────────────────── */}
      {setTab && (
        <div style={footerNavStyle}>
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.tab} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <span style={{ color: '#2a3a52', fontSize: '0.6rem', margin: '0 2px' }}>·</span>}
              <button
                style={footerLinkStyle}
                onClick={() => setTab(link.tab)}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
                onMouseLeave={e => e.currentTarget.style.color = '#4A5F80'}
              >
                {link.label}
              </button>
            </span>
          ))}
        </div>
      )}
      {/* ─── END ADDED ────────────────────────────────────────────────────── */}

      <div style={disclaimerStyle}>
        ⚠️ Content not to be used solely for navigation. Always verify with official sources.
      </div>
    </footer>
  );
}
