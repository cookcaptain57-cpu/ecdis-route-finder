/* eslint-disable */

const IgSvg = () => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
  </svg>
);

// ── Inline style objects ─────────────────────────────────────────────────────
// Defined outside render so they are not re-created on every paint.

const igLinkStyle = {
  display        : "flex",
  alignItems     : "center",
  gap            : "6px",
  textDecoration : "none",        // kills browser blue underline
  color          : "#8A9BBF",     // kills browser blue text
  fontSize       : "0.68rem",
  fontWeight     : 400,
  letterSpacing  : "0.03em",
  cursor         : "pointer",
  flexShrink     : 0,
};

const igIconStyle = {
  width      : "34px",
  height     : "34px",
  borderRadius: "9px",
  background : "linear-gradient(135deg,#405de6 0%,#833ab4 25%,#c13584 45%,#e1306c 60%,#fd1d1d 75%,#f77737 88%,#fcb045 100%)",
  display    : "flex",
  alignItems : "center",
  justifyContent: "center",
  boxShadow  : "0 4px 16px rgba(193,53,132,0.55)",
  flexShrink : 0,
};

const disclaimerStyle = {
  position     : "relative",
  zIndex       : 10,
  fontSize     : "0.62rem",      // same as copyright line
  fontWeight   : 300,
  color        : "#4A5F80",      // var(--text3)
  letterSpacing: "0.03em",
  lineHeight   : 1.5,
  marginTop    : "6px",
  paddingTop   : "6px",
  borderTop    : "1px solid rgba(26,58,92,0.3)",
};

// ────────────────────────────────────────────────────────────────────────────

export default function Footer() {
  return (
    <footer className="footer">

      {/* waves stay behind content */}
      <div className="wave wave1" />
      <div className="wave wave2" />
      <div className="wave wave3" />

      {/* main row */}
      <div className="footer-row">
        <div className="footer-left">
          <div className="footer-brand">
            NavisphereX <span>Marine</span>
          </div>
          <div className="footer-copy">
            Owner: Manish Bharti &nbsp;·&nbsp; © 2026
          </div>
        </div>

        {/* inline styles guarantee no browser override */}
        <a
          href="https://instagram.com/manish_the_navigator"
          target="_blank"
          rel="noreferrer"
          aria-label="Contact Admin On Instagram"
          style={igLinkStyle}
        >
          <span style={igIconStyle}>
            <IgSvg />
          </span>
          Contact Admin On Instagram
        </a>
      </div>

      {/* disclaimer — inline size matches copyright */}
      <div style={disclaimerStyle}>
         ⚠️ Content not to be used solely for navigation. Always verify with official sources.
      </div>

    </footer>
  );
}
