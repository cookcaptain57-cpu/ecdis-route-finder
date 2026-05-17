/* eslint-disable */

// Real Instagram camera SVG — white, matches official brand icon
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
    {/* outer rounded square */}
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    {/* lens circle */}
    <circle cx="12" cy="12" r="4" />
    {/* top-right dot */}
    <circle cx="17.5" cy="6.5" r="1" fill="white" stroke="none" />
  </svg>
);

const DISCLAIMER =
  "⚠ Content not to be used solely for navigation. Always verify with official sources.";

export default function Footer() {
  return (
    <>
      {/* ── DESKTOP FOOTER (hidden on mobile via CSS) ── */}
      <footer className="footer footer-desktop">
        <div className="footer-brand">
          Owner: <span>Manish Bharti</span>
        </div>
        <div className="footer-copy">© 2025 NavisphereX Marine</div>
        {/* disclaimer spans full width below, same quiet style as copyright */}
        <div className="footer-disclaimer">{DISCLAIMER}</div>
      </footer>

      {/* ── MOBILE WAVE DOCK (hidden on desktop via CSS) ── */}
      <div className="wave-dock">
        {/* waves sit behind all content */}
        <div className="wave wave1" />
        <div className="wave wave2" />
        <div className="wave wave3" />

        <div className="wave-content">
          <div className="dock-left">
            <div className="dock-title">NavisphereX</div>
            <div className="dock-sub">Contact Admin On Instagram</div>
          </div>

          {/* Instagram logo button — gradient rounded square + white SVG */}
          <a
            className="dock-ig-btn"
            href="https://instagram.com/manish_the_navigator"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow on Instagram"
          >
            <span className="ig-icon-wrap">
              <IgSvg />
            </span>
            Follow
          </a>
        </div>

        {/* disclaimer shows once, below the dock row */}
        <div className="dock-disclaimer">{DISCLAIMER}</div>
      </div>
    </>
  );
}
