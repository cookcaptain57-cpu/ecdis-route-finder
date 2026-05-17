// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── MARITIME LIBRARY PAGE ────────────────────────────────────────────────────
function MaritimeLibraryPage({ setTab }) {
  const BOOKS = [
    {
      title: 'SOLAS 2020',
      full: 'International Convention for the Safety of Life at Sea',
      icon: '🛡', color: 'var(--cyan)', cat: 'Safety',
      desc: 'Consolidated edition covering all amendments up to 2020. Essential for all seafarers.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'MARPOL 2022',
      full: 'International Convention for the Prevention of Pollution from Ships',
      icon: '🌊', color: 'var(--green)', cat: 'Environment',
      desc: 'Annex I–VI covering oil, noxious liquids, garbage, air pollution and sewage.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'STCW 2017',
      full: 'Standards of Training, Certification and Watchkeeping',
      icon: '⚓', color: 'var(--gold)', cat: 'Certification',
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
      icon: '📋', color: 'var(--purple)', cat: 'Management',
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
      icon: '👷', color: 'var(--gold)', cat: 'Labour',
      desc: "Seafarers rights, working conditions, manning, wages and repatriation.",
      link: 'https://www.ilo.org/global/standards/maritime-labour-convention/lang--en/index.htm',
    },
    {
      title: 'ECDIS Manual',
      full: 'ECDIS Operation and Best Practices Guide',
      icon: '📡', color: 'var(--cyan)', cat: 'ECDIS',
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

  // ── NEW: Library Files state ──────────────────────────────────────────────
  const [libData,    setLibData]    = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError,   setLibError]   = useState(null);
  const [openFolders, setOpenFolders] = useState(new Set());
  const [previewFile, setPreviewFile] = useState(null); // { title, url, downloadUrl }

  useEffect(() => {
    let cancelled = false;
    setLibLoading(true);
    setLibError(null);
    fetchLibrarySheet()
      .then(rows => {
        if (!cancelled) {
          setLibData(rows);
          setLibLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setLibError(e.message || 'Failed to load library');
          setLibLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Group rows by category, preserving insertion order
  const grouped = libData.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {});
  const categories = Object.keys(grouped);

  const toggleFolder = (catName) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(catName) ? next.delete(catName) : next.add(catName);
      return next;
    });
  };

  // File icon based on title extension
  const fileIcon = (title = '', mimeType = '') => {
    const t = title.toLowerCase();
    if (t.endsWith('.pdf'))  return '📄';
    if (t.endsWith('.xlsx') || t.endsWith('.xls') || t.endsWith('.xlsm')) return '📊';
    if (t.endsWith('.docx') || t.endsWith('.doc')) return '📝';
    if (t.endsWith('.zip'))  return '🗜';
    if (t.endsWith('.exe'))  return '⚙️';
    if (t.endsWith('.jpg') || t.endsWith('.png') || t.endsWith('.jpeg')) return '🖼';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('compressed'))    return '🗜';
    if (mimeType.includes('msdownload')) return '⚙️';
    return '📄';
  };

  // Category colour accent
  const catColor = (catName) => {
    const map = {
      'IMO':                      '#60A5FA',
      'IMP REF. FOR NAVIGATORS':  '#34D399',
      'IMP TEST ANSWER':          '#FBBF24',
      'MANUALS':                  '#A78BFA',
      'MISC BOOKS':               '#FB923C',
      'SOLAS':                    '#F87171',
      'MARPOL':                   '#34D399',
      'STCW':                     '#FBBF24',
      'SAILORS USEFUL SOFTWARE':  '#22D3EE',
    };
    return map[catName] || 'var(--cyan)';
  };

  return (
    <div className="section">

      {/* ── NEW: Library Files Section ──────────────────────────────────── */}
      <div className="sec-hdr" style={{ marginBottom: '0.8rem' }}>
        <div className="sec-title">📁 Library Files</div>
        {!libLoading && !libError && (
          <span className="badge">{libData.length} files · {categories.length} folders</span>
        )}
      </div>

      <div className="info-box" style={{ marginBottom: '1rem' }}>
        🗂 Browse and preview files directly from the ship's library. Click a folder to expand, then Preview or Download any file.
      </div>

      {libLoading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', fontSize: '0.85rem' }}>
          ⏳ Loading library files…
        </div>
      )}

      {libError && !libLoading && (
        <div style={{
          padding: '1rem', borderRadius: 10, background: '#F871711A',
          border: '1px solid #F8717140', color: '#F87171', fontSize: '0.8rem', marginBottom: '1rem'
        }}>
          ⚠️ Could not load library files: {libError}
        </div>
      )}

      {!libLoading && !libError && categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)', fontSize: '0.85rem' }}>
          No library files found.
        </div>
      )}

      {!libLoading && categories.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
          {categories.map(catName => {
            const isOpen = openFolders.has(catName);
            const files  = grouped[catName];
            const color  = catColor(catName);
            return (
              <div key={catName} style={{
                background: 'var(--card)', border: `1px solid ${isOpen ? color : 'var(--border)'}`,
                borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s'
              }}>
                {/* Folder header row */}
                <div
                  onClick={() => toggleFolder(catName)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '0.85rem 1rem',
                    cursor: 'pointer', userSelect: 'none',
                    background: isOpen ? `${color}0D` : 'transparent',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
                  onMouseLeave={e => e.currentTarget.style.background = isOpen ? `${color}0D` : 'transparent'}
                >
                  <span style={{ fontSize: '1.2rem' }}>{isOpen ? '📂' : '📁'}</span>
                  <span style={{
                    flex: 1, fontFamily: 'Orbitron,monospace', fontSize: '0.72rem',
                    fontWeight: 700, color, letterSpacing: '0.04em'
                  }}>
                    {catName}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 600,
                    background: `${color}18`, color, border: `1px solid ${color}30`
                  }}>
                    {files.length} files
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: '0.75rem', marginLeft: 4 }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {/* File list */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${color}25` }}>
                    {files.map((file, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.6rem 1rem',
                        borderBottom: idx < files.length - 1 ? '1px solid var(--border)' : 'none',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                      }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                          {fileIcon(file.title, file.mimeType)}
                        </span>
                        <span style={{
                          flex: 1, fontSize: '0.74rem', color: 'var(--text2)',
                          lineHeight: 1.3, wordBreak: 'break-word'
                        }}>
                          {file.title}
                        </span>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {file.url && (
                            <button
                              onClick={() => setPreviewFile({ title: file.title, url: file.url, downloadUrl: file.downloadUrl })}
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}40`,
                                background: `${color}12`, color, fontSize: '0.68rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = `${color}25`}
                              onMouseLeave={e => e.currentTarget.style.background = `${color}12`}
                            >
                              👁 Preview
                            </button>
                          )}
                          {file.downloadUrl && (
                            <a
                              href={file.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                                background: 'rgba(255,255,255,0.05)', color: 'var(--text2)',
                                fontSize: '0.68rem', fontWeight: 600, textDecoration: 'none',
                                transition: 'all 0.15s', display: 'inline-block'
                              }}
                              onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.color = color; }}
                              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
                            >
                              ⬇ Download
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NEW: Preview Modal ───────────────────────────────────────────── */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16,
              width: '100%', maxWidth: 860, height: '88vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '0.9rem 1.1rem',
              borderBottom: '1px solid var(--border)', flexShrink: 0
            }}>
              <span style={{ fontSize: '1.1rem' }}>{fileIcon(previewFile.title)}</span>
              <span style={{
                flex: 1, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text1)',
                wordBreak: 'break-word', lineHeight: 1.3
              }}>
                {previewFile.title}
              </span>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {previewFile.downloadUrl && (
                  <a
                    href={previewFile.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '5px 12px', borderRadius: 7, border: '1px solid var(--cyan)',
                      background: 'var(--cyan)15', color: 'var(--cyan)', fontSize: '0.72rem',
                      fontWeight: 600, textDecoration: 'none'
                    }}
                  >
                    ⬇ Download
                  </a>
                )}
                <button
                  onClick={() => setPreviewFile(null)}
                  style={{
                    padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)',
                    background: 'rgba(255,255,255,0.06)', color: 'var(--text2)',
                    fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* iframe */}
            <iframe
              src={previewFile.url}
              title={previewFile.title}
              style={{ flex: 1, border: 'none', width: '100%' }}
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* ── EXISTING: Maritime Knowledge Hub (untouched below) ──────────── */}
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

            <p style={{ fontSize: '0.76rem', color: 'var(--text2)', lineHeight: 1.5, flex: 1 }}>
              {b.desc}
            </p>

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
