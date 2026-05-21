/* eslint-disable */
// src/pages/VesselSearchPage.jsx

function VesselSearchPage() {
  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">🛢 Vessel Search</div>
        <span className="badge" style={{ background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.3)', color: 'var(--gold)' }}>Coming Soon</span>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '2rem', textAlign: 'center', marginBottom: '1.4rem' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🛢</div>
        <div style={{ fontFamily: 'Orbitron,monospace', fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '0.6rem', letterSpacing: '0.08em' }}>VESSEL DATABASE</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.7, maxWidth: 380, margin: '0 auto 1.4rem' }}>
          Search vessels by IMO number, MMSI, vessel name or flag state. Full AIS data and vessel particulars database loading soon.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: '0.7rem', maxWidth: 500, margin: '0 auto' }}>
          {[
            { icon: '🔢', label: 'IMO Search' },
            { icon: '📡', label: 'MMSI Lookup' },
            { icon: '🚢', label: 'Vessel Name' },
            { icon: '🏳', label: 'Flag State' },
          ].map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.8rem', opacity: 0.5 }}>
              <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{f.icon}</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="info-box">
        📌 Vessel database will be linked here once available. Stay tuned for updates.
      </div>
    </div>
  );
}

export default VesselSearchPage;
