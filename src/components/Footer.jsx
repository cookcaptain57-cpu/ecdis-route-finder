/* eslint-disable */

const FOOTER_LINKS = [
  { label: 'Contact Us', tab: 'contact' },
  { label: 'About',      tab: 'about'   },
  { label: 'Legal',      tab: 'legal'   },
  { label: 'FAQ',        tab: 'faq'     },
];

export default function Footer({ setTab }) {
  return (
    <footer style={{
      padding: '0.7rem 1.2rem',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: '2px 4px',
      background: 'rgba(4,12,26,0.7)',
    }}>
      {FOOTER_LINKS.map((link, i) => (
        <span key={link.tab} style={{ display: 'flex', alignItems: 'center' }}>
          {i > 0 && (
            <span style={{ color: '#2a3a52', fontSize: '0.6rem', margin: '0 3px' }}>·</span>
          )}
          <button
            onClick={() => setTab && setTab(link.tab)}
            style={{
              background: 'none', border: 'none',
              color: '#4A5F80', fontSize: '0.64rem',
              cursor: 'pointer', padding: '3px 5px',
              fontFamily: 'Exo 2, sans-serif',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--cyan)'}
            onMouseLeave={e => e.currentTarget.style.color = '#4A5F80'}
          >
            {link.label}
          </button>
        </span>
      ))}
    </footer>
  );
}
