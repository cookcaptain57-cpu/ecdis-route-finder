/* eslint-disable */

// Instagram camera SVG — white strokes, matches official icon shape
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

export default function Footer() {
  return (
    <footer className="footer">

      {/* ── Animated waves — behind all content ── */}
      <div className="wave wave1" />
      <div className="wave wave2" />
      <div className="wave wave3" />

      {/* ── Main row: brand left, Instagram right ── */}
      <div className="footer-row">
        <div className="footer-left">
          <div className="footer-brand">
            NavisphereX <span>Marine</span>
          </div>
          <div className="footer-copy">
            Owner: Manish Bharti &nbsp;·&nbsp; © 2026
          </div>
        </div>

        <a
          className="dock-ig-btn"
          href="https://instagram.com/manish_the_navigator"
          target="_blank"
          rel="noreferrer"
          aria-label="👆Contact Admin on Instagram"
        >
          <span className="ig-icon-wrap">
            <IgSvg />
          </span>
          Follow
        </a>
      </div>

      {/* ── Disclaimer — shown once, same on all screens ── */}
      <div className="footer-disclaimer">
        ⚠️ Content not to be used solely for navigation. Always verify with official sources.
      </div>

    </footer>
  );
}
