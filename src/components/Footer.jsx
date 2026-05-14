/* eslint-disable */

export default function Footer() {
  return (
    <>
      {/* DESKTOP FOOTER (optional keep simple) */}
      <footer className="footer footer-desktop">
        <div className="footer-brand">
          Owner: <span>Manish Bharti</span>
        </div>
        <div className="footer-copy">
          © 2024 NavisphereX Marine
        </div>
      </footer>

      {/* MOBILE WAVE DOCK */}
      <div className="wave-dock">
        <div className="wave-content">
          <div className="dock-left">
            <div className="dock-title">NavisphereX</div>
            <div className="dock-sub">Marine System</div>
          </div>

          <a
            className="dock-btn"
            href="https://instagram.com/manish_the_navigator"
            target="_blank"
            rel="noreferrer"
          >
            📷 Follow
          </a>
        </div>

        {/* WAVES */}
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>
    </>
  );
}
