// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── Virtual List ─────────────────────────────────────────────────────────────
const ROW_H = 44;
const OVERSCAN = 8;

function VirtualList({ items, renderRow, height = 460 }) {
  const [scrollTop, setScrollTop] = useState(0);
  const onScroll = useCallback(e => setScrollTop(e.currentTarget.scrollTop), []);
  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const visible  = Math.ceil(height / ROW_H) + OVERSCAN * 2;
  const endIdx   = Math.min(items.length, startIdx + visible);
  const totalH   = items.length * ROW_H;
  const offsetY  = startIdx * ROW_H;
  return (
    <div onScroll={onScroll} style={{ height, overflowY:'auto', position:'relative' }}>
      <div style={{ height:totalH, position:'relative' }}>
        <div style={{ position:'absolute', top:offsetY, left:0, right:0 }}>
          {items.slice(startIdx, endIdx).map((item, i) => renderRow(item, startIdx + i))}
        </div>
      </div>
    </div>
  );
}

// ─── Viewer URL builder ───────────────────────────────────────────────────────
const getViewerInfo = (title = '', url = '', fileId = '', mimeType = '') => {
  const t = title.toLowerCase();
  const isPdf      = t.endsWith('.pdf') || mimeType.includes('pdf');
  const isImage    = t.endsWith('.jpg') || t.endsWith('.jpeg') || t.endsWith('.png') || t.endsWith('.gif');
  const isOffice   = t.endsWith('.docx') || t.endsWith('.doc') || t.endsWith('.xlsx') ||
                     t.endsWith('.xls')  || t.endsWith('.xlsm')|| t.endsWith('.pptx') ||
                     mimeType.includes('officedocument') || mimeType.includes('ms-excel');
  const isNoPreview= t.endsWith('.zip') || t.endsWith('.exe') ||
                     mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('msdownload');
  if (isNoPreview) return { type:'none', src:'' };
  if (isPdf && fileId) {
    const direct = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    return { type:'pdf', src:`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(direct)}` };
  }
  if (isImage && fileId) return { type:'image', src:`https://drive.google.com/uc?export=view&id=${fileId}` };
  if (isOffice && fileId) {
    const direct = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    return { type:'office', src:`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(direct)}` };
  }
  if (url) return { type:'drive', src:url };
  return { type:'none', src:'' };
};

// ─── File helpers ─────────────────────────────────────────────────────────────
const EXT_ICONS = { pdf:'📄', xlsx:'📊', xls:'📊', xlsm:'📊', docx:'📝', doc:'📝', pptx:'📊', zip:'🗜', exe:'⚙️', jpg:'🖼', jpeg:'🖼', png:'🖼', gif:'🖼' };
const EXT_BADGE = {
  pdf:  { label:'PDF',   bg:'rgba(248,113,113,0.15)', color:'#F87171', border:'rgba(248,113,113,0.3)' },
  xlsx: { label:'EXCEL', bg:'rgba(52,211,153,0.15)',  color:'#34D399', border:'rgba(52,211,153,0.3)'  },
  xls:  { label:'EXCEL', bg:'rgba(52,211,153,0.15)',  color:'#34D399', border:'rgba(52,211,153,0.3)'  },
  xlsm: { label:'EXCEL', bg:'rgba(52,211,153,0.15)',  color:'#34D399', border:'rgba(52,211,153,0.3)'  },
  docx: { label:'WORD',  bg:'rgba(96,165,250,0.15)',  color:'#60A5FA', border:'rgba(96,165,250,0.3)'  },
  doc:  { label:'WORD',  bg:'rgba(96,165,250,0.15)',  color:'#60A5FA', border:'rgba(96,165,250,0.3)'  },
  pptx: { label:'PPT',   bg:'rgba(251,146,60,0.15)',  color:'#FB923C', border:'rgba(251,146,60,0.3)'  },
  zip:  { label:'ZIP',   bg:'rgba(167,139,250,0.15)', color:'#A78BFA', border:'rgba(167,139,250,0.3)' },
  exe:  { label:'APP',   bg:'rgba(167,139,250,0.15)', color:'#A78BFA', border:'rgba(167,139,250,0.3)' },
  jpg:  { label:'IMAGE', bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.3)'  },
  jpeg: { label:'IMAGE', bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.3)'  },
  png:  { label:'IMAGE', bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.3)'  },
};
const getExt    = (t = '') => t.split('.').pop().toLowerCase();
const fileIcon  = (title = '', mime = '') => EXT_ICONS[getExt(title)] || (mime.includes('excel') ? '📊' : mime.includes('zip') ? '🗜' : '📄');
const fileBadge = (title = '') => EXT_BADGE[getExt(title)] || { label:'FILE', bg:'rgba(0,180,216,0.12)', color:'var(--cyan)', border:'rgba(0,180,216,0.25)' };
const CAT_COLORS = {
  'IMO':'#60A5FA','IMP REF. FOR NAVIGATORS':'#34D399','IMP TEST ANSWER':'#FBBF24',
  'MANUALS':'#A78BFA','MISC BOOKS':'#FB923C','SOLAS':'#F87171','MARPOL':'#34D399',
  'STCW':'#FBBF24','SAILORS USEFUL SOFTWARE':'#22D3EE',
};
const catColor = c => CAT_COLORS[c] || 'var(--cyan)';

// ─── BOOKS ────────────────────────────────────────────────────────────────────
const BOOKS = [
  { title:'SOLAS 2020',    full:'International Convention for the Safety of Life at Sea',                             icon:'🛡', color:'var(--cyan)',   cat:'Safety',       desc:'Consolidated edition covering all amendments up to 2020. Essential for all seafarers.',                     link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'MARPOL 2022',   full:'International Convention for the Prevention of Pollution from Ships',                icon:'🌊', color:'var(--green)',  cat:'Environment',  desc:'Annex I–VI covering oil, noxious liquids, garbage, air pollution and sewage.',                            link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'STCW 2017',     full:'Standards of Training, Certification and Watchkeeping',                              icon:'⚓', color:'var(--gold)',   cat:'Certification',desc:'Manila amendments consolidated edition including STCW Code Parts A and B.',                               link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'COLREGS',       full:'Convention on the International Regulations for Preventing Collisions at Sea',       icon:'💡', color:'#F87171',       cat:'Navigation',   desc:'72 COLREGS with all amendments. Rules of the road for all vessels.',                                      link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'IAMSAR Manual', full:'International Aeronautical and Maritime Search and Rescue Manual',                   icon:'🆘', color:'#FB923C',       cat:'Safety',       desc:'Volume I, II and III covering SAR services, mission coordination and mobile facilities.',                 link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'ISM Code',      full:'International Safety Management Code',                                               icon:'📋', color:'var(--purple)', cat:'Management',   desc:'Requirements for the safe management and operation of ships and pollution prevention.',                   link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'ISPS Code',     full:'International Ship and Port Facility Security Code',                                 icon:'🔒', color:'#A78BFA',       cat:'Security',     desc:'Security framework for ships and ports. Part A mandatory, Part B recommended.',                           link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'MLC 2006',      full:'Maritime Labour Convention',                                                         icon:'👷', color:'var(--gold)',   cat:'Labour',       desc:"Seafarers rights, working conditions, manning, wages and repatriation.",                                 link:'https://www.ilo.org/global/standards/maritime-labour-convention/lang--en/index.htm' },
  { title:'ECDIS Manual',  full:'ECDIS Operation and Best Practices Guide',                                           icon:'📡', color:'var(--cyan)',   cat:'ECDIS',        desc:'General guide to ECDIS operation, chart updates, route planning and passage monitoring.',                link:'https://www.nautinst.org/' },
  { title:'IMO Circulars', full:'Latest IMO MSC/MEPC Circulars',                                                      icon:'🏛', color:'#60A5FA',       cat:'Regulations',  desc:'Latest Marine Safety Committee and Marine Environment Protection Committee circulars.',                 link:'https://www.imo.org/en/OurWork/Pages/Home.aspx' },
];
const BOOK_CATS = ['All','Safety','Environment','Navigation','Certification','ECDIS','Regulations','Security','Management','Labour'];

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  const [iframeError, setIframeError] = useState(false);
  useEffect(() => { setIframeError(false); }, [file]);
  if (!file) return null;
  const viewer = getViewerInfo(file.title, file.url, file.fileId, file.mimeType);

  const renderContent = () => {
    if (viewer.type === 'none' || iframeError) return (
      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'2rem',color:'var(--text3)' }}>
        <span style={{ fontSize:'3.5rem' }}>{fileIcon(file.title, file.mimeType)}</span>
        <p style={{ fontSize:'0.85rem',textAlign:'center',color:'var(--text2)' }}>
          {iframeError ? 'Preview could not load in this browser.' : 'Preview not available for this file type.'}
        </p>
        <p style={{ fontSize:'0.74rem',color:'var(--text3)',textAlign:'center' }}>Use the Download button to open this file.</p>
        {file.url && (
          <a href={file.url} target="_blank" rel="noreferrer"
            style={{ padding:'8px 18px',borderRadius:8,border:'1px solid var(--cyan)',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',fontSize:'0.76rem',fontWeight:600,textDecoration:'none' }}>
            🔗 Open in Google Drive
          </a>
        )}
      </div>
    );
    if (viewer.type === 'image') return (
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem',background:'#000',overflow:'auto' }}>
        <img src={viewer.src} alt={file.title}
          style={{ maxWidth:'100%',maxHeight:'100%',objectFit:'contain',borderRadius:4 }}
          onError={() => setIframeError(true)} />
      </div>
    );
    return (
      <iframe key={viewer.src} src={viewer.src} title={file.title}
        style={{ flex:1,border:'none',width:'100%' }} allow="autoplay"
        onError={() => setIframeError(true)} />
    );
  };

  return (
    <div onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--card)',border:'1px solid var(--border2)',borderRadius:16,width:'100%',maxWidth:960,height:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'0.85rem 1rem',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap',background:'var(--bg2)' }}>
          <span style={{ fontSize:'1.2rem' }}>{fileIcon(file.title, file.mimeType)}</span>
          <span style={{ flex:1,fontSize:'0.78rem',fontWeight:600,color:'var(--text)',wordBreak:'break-word',lineHeight:1.3,minWidth:100 }}>{file.title}</span>
          {(() => { const b = fileBadge(file.title); return (
            <span style={{ padding:'2px 8px',borderRadius:4,fontSize:'0.6rem',fontWeight:700,background:b.bg,color:b.color,border:`1px solid ${b.border}`,flexShrink:0 }}>{b.label}</span>
          ); })()}
          <div style={{ display:'flex',gap:8,flexShrink:0,flexWrap:'wrap' }}>
            {file.fileId && (
              <a href={`https://drive.google.com/uc?export=download&confirm=t&id=${file.fileId}`} target="_blank" rel="noreferrer"
                style={{ padding:'5px 12px',borderRadius:7,border:'1px solid var(--cyan)',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',fontSize:'0.72rem',fontWeight:600,textDecoration:'none' }}>
                ⬇ Download
              </a>
            )}
            {file.url && (
              <a href={file.url} target="_blank" rel="noreferrer"
                style={{ padding:'5px 12px',borderRadius:7,border:'1px solid var(--border)',background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.72rem',fontWeight:600,textDecoration:'none' }}>
                🔗 Drive
              </a>
            )}
            <button onClick={onClose}
              style={{ padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.72rem',fontWeight:600,cursor:'pointer' }}>
              ✕ Close
            </button>
          </div>
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>{renderContent()}</div>
      </div>
    </div>
  );
}

// ─── File Manager ─────────────────────────────────────────────────────────────
function FileManager({ libData, libLoading, libError }) {
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [search,         setSearch]         = useState('');
  const [previewFile,    setPreviewFile]     = useState(null);
  const [sortBy,         setSortBy]         = useState('name');
  const [viewMode,       setViewMode]       = useState('list');

  const grouped = useMemo(() => libData.reduce((acc, row) => {
    const cat = row.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(row);
    return acc;
  }, {}), [libData]);

  const folders    = useMemo(() => Object.keys(grouped), [grouped]);
  const totalFiles = libData.length;

  const visibleFiles = useMemo(() => {
    let pool = selectedFolder ? (grouped[selectedFolder] || []) : libData;
    const q  = search.trim().toLowerCase();
    if (q) pool = pool.filter(f => (f.title||'').toLowerCase().includes(q) || (f.category||'').toLowerCase().includes(q));
    return [...pool].sort((a,b) => {
      if (sortBy==='name')   return (a.title||'').localeCompare(b.title||'');
      if (sortBy==='type')   return getExt(a.title).localeCompare(getExt(b.title));
      if (sortBy==='folder') return (a.category||'').localeCompare(b.category||'');
      return 0;
    });
  }, [libData, grouped, selectedFolder, search, sortBy]);

  const openPreview = useCallback(f => setPreviewFile(f), []);

  const renderRow = useCallback((file, idx) => {
    const badge = fileBadge(file.title);
    const color = catColor(file.category);
    return (
      <div key={`${file.fileId||file.title}-${idx}`}
        style={{ height:ROW_H,display:'flex',alignItems:'center',gap:10,padding:'0 12px',
          borderBottom:'1px solid rgba(255,255,255,0.04)',
          background: idx%2===0 ? 'transparent' : 'rgba(255,255,255,0.015)',
          transition:'background 0.12s' }}
        onMouseEnter={e => e.currentTarget.style.background='rgba(0,180,216,0.07)'}
        onMouseLeave={e => e.currentTarget.style.background=idx%2===0?'transparent':'rgba(255,255,255,0.015)'}>
        <span style={{ fontSize:'0.95rem',flexShrink:0,width:22,textAlign:'center' }}>{fileIcon(file.title, file.mimeType)}</span>
        <span title={file.title}
          style={{ flex:1,fontSize:'0.73rem',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0 }}>
          {file.title}
        </span>
        <span style={{ padding:'1px 6px',borderRadius:4,fontSize:'0.57rem',fontWeight:700,
          background:badge.bg,color:badge.color,border:`1px solid ${badge.border}`,flexShrink:0,whiteSpace:'nowrap' }}>
          {badge.label}
        </span>
        {!selectedFolder && (
          <span title={file.category}
            style={{ padding:'1px 7px',borderRadius:4,fontSize:'0.57rem',fontWeight:600,
              background:`${color}18`,color,border:`1px solid ${color}30`,
              flexShrink:0,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
            {file.category}
          </span>
        )}
        <div style={{ display:'flex',gap:5,flexShrink:0 }}>
          {file.url && (
            <button onClick={() => openPreview({ title:file.title,url:file.url,downloadUrl:file.downloadUrl,fileId:file.fileId,mimeType:file.mimeType })}
              style={{ padding:'3px 9px',borderRadius:5,border:'1px solid rgba(0,180,216,0.35)',
                background:'rgba(0,180,216,0.08)',color:'var(--cyan)',fontSize:'0.64rem',
                fontWeight:600,cursor:'pointer',transition:'all 0.15s',whiteSpace:'nowrap' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(0,180,216,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(0,180,216,0.08)'}>
              👁 Preview
            </button>
          )}
          {file.fileId && (
            <a href={`https://drive.google.com/uc?export=download&confirm=t&id=${file.fileId}`}
              target="_blank" rel="noreferrer"
              style={{ padding:'3px 9px',borderRadius:5,border:'1px solid var(--border)',
                background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.64rem',
                fontWeight:600,textDecoration:'none',transition:'all 0.15s',whiteSpace:'nowrap',display:'inline-block' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--cyan)'; e.currentTarget.style.color='var(--cyan)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
              ⬇
            </a>
          )}
        </div>
      </div>
    );
  }, [selectedFolder, openPreview]);

  const renderCard = (file, idx) => {
    const badge = fileBadge(file.title);
    return (
      <div key={`${file.fileId||file.title}-${idx}`}
        style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:11,
          padding:'0.85rem',display:'flex',flexDirection:'column',gap:8,transition:'all 0.2s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(0,180,216,0.4)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
        <div style={{ display:'flex',alignItems:'flex-start',gap:8 }}>
          <span style={{ fontSize:'1.4rem' }}>{fileIcon(file.title, file.mimeType)}</span>
          <div style={{ flex:1,fontSize:'0.7rem',fontWeight:600,color:'var(--text)',lineHeight:1.3,
            overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' }}>
            {file.title}
          </div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:5 }}>
          <span style={{ padding:'1px 6px',borderRadius:4,fontSize:'0.57rem',fontWeight:700,
            background:badge.bg,color:badge.color,border:`1px solid ${badge.border}` }}>{badge.label}</span>
          {!selectedFolder && (
            <span style={{ fontSize:'0.58rem',color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{file.category}</span>
          )}
        </div>
        <div style={{ display:'flex',gap:5,marginTop:'auto' }}>
          {file.url && (
            <button onClick={() => openPreview({ title:file.title,url:file.url,downloadUrl:file.downloadUrl,fileId:file.fileId,mimeType:file.mimeType })}
              style={{ flex:1,padding:'5px',borderRadius:6,border:'1px solid rgba(0,180,216,0.3)',
                background:'rgba(0,180,216,0.08)',color:'var(--cyan)',fontSize:'0.64rem',fontWeight:600,cursor:'pointer' }}>
              👁 Preview
            </button>
          )}
          {file.fileId && (
            <a href={`https://drive.google.com/uc?export=download&confirm=t&id=${file.fileId}`}
              target="_blank" rel="noreferrer"
              style={{ padding:'5px 8px',borderRadius:6,border:'1px solid var(--border)',
                background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.64rem',
                fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center' }}>
              ⬇
            </a>
          )}
        </div>
      </div>
    );
  };

  if (libLoading) return (
    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:12,padding:'3rem',color:'var(--text2)' }}>
      <div className="spin" style={{ width:20,height:20 }} />
      <span style={{ fontSize:'0.84rem' }}>Loading library…</span>
    </div>
  );
  if (libError) return (
    <div style={{ padding:'1rem',borderRadius:10,background:'rgba(248,113,113,0.1)',
      border:'1px solid rgba(248,113,113,0.3)',color:'#F87171',fontSize:'0.8rem',margin:'1rem 0' }}>
      ⚠️ Could not load library: {libError}
    </div>
  );

  return (
    <>
      <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      <div style={{ display:'flex',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',
        background:'var(--card)',marginBottom:'2rem',minHeight:520 }}>

        {/* Sidebar */}
        <div style={{ width:210,flexShrink:0,borderRight:'1px solid var(--border)',
          overflowY:'auto',background:'var(--bg2)',display:'flex',flexDirection:'column' }}>
          <div style={{ padding:'10px 12px',borderBottom:'1px solid var(--border)',
            fontFamily:'Orbitron,monospace',fontSize:'0.62rem',fontWeight:700,
            color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase' }}>
            📁 Folders
          </div>
          {/* All Files */}
          <div onClick={() => setSelectedFolder(null)}
            style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 12px',cursor:'pointer',
              background:selectedFolder===null?'rgba(0,180,216,0.12)':'transparent',
              borderLeft:selectedFolder===null?'3px solid var(--cyan)':'3px solid transparent',
              transition:'all 0.15s' }}
            onMouseEnter={e => { if(selectedFolder!==null) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if(selectedFolder!==null) e.currentTarget.style.background='transparent'; }}>
            <span style={{ fontSize:'0.9rem' }}>🗂</span>
            <span style={{ flex:1,fontSize:'0.72rem',fontWeight:600,
              color:selectedFolder===null?'var(--cyan)':'var(--text2)' }}>All Files</span>
            <span style={{ fontSize:'0.6rem',color:'var(--text3)',background:'rgba(255,255,255,0.07)',padding:'1px 5px',borderRadius:4 }}>
              {totalFiles}
            </span>
          </div>
          {/* Folder list */}
          {folders.map(folder => {
            const active = selectedFolder===folder;
            const color  = catColor(folder);
            return (
              <div key={folder} onClick={() => setSelectedFolder(folder)}
                style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',cursor:'pointer',
                  background:active?`${color}15`:'transparent',
                  borderLeft:active?`3px solid ${color}`:'3px solid transparent',
                  transition:'all 0.15s' }}
                onMouseEnter={e => { if(!active) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if(!active) e.currentTarget.style.background='transparent'; }}>
                <span style={{ fontSize:'0.85rem' }}>{active?'📂':'📁'}</span>
                <span title={folder}
                  style={{ flex:1,fontSize:'0.69rem',fontWeight:active?700:400,
                    color:active?color:'var(--text2)',lineHeight:1.3,wordBreak:'break-word' }}>
                  {folder}
                </span>
                <span style={{ fontSize:'0.58rem',color:active?color:'var(--text3)',
                  background:active?`${color}20`:'rgba(255,255,255,0.06)',padding:'1px 5px',borderRadius:4,flexShrink:0 }}>
                  {grouped[folder]?.length||0}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main */}
        <div style={{ flex:1,display:'flex',flexDirection:'column',minWidth:0 }}>
          {/* Toolbar */}
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
            borderBottom:'1px solid var(--border)',flexWrap:'wrap',background:'var(--bg2)' }}>
            {/* Breadcrumb */}
            <div style={{ display:'flex',alignItems:'center',gap:5,fontSize:'0.72rem',color:'var(--text3)' }}>
              <span style={{ cursor:'pointer',color:'var(--cyan)' }} onClick={() => setSelectedFolder(null)}>Library</span>
              {selectedFolder && (<><span>›</span><span style={{ color:catColor(selectedFolder),fontWeight:600 }}>{selectedFolder}</span></>)}
            </div>
            <div style={{ flex:1 }} />
            {/* Search */}
            <div style={{ position:'relative',flexShrink:0 }}>
              <span style={{ position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',fontSize:'0.8rem',color:'var(--text3)',pointerEvents:'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
                style={{ padding:'5px 28px 5px 28px',background:'var(--bg)',border:'1px solid var(--border2)',
                  borderRadius:7,color:'var(--text)',fontFamily:'Exo 2,sans-serif',fontSize:'0.74rem',
                  outline:'none',width:190,transition:'all 0.2s' }}
                onFocus={e => e.target.style.borderColor='var(--cyan)'}
                onBlur={e  => e.target.style.borderColor='var(--border2)'} />
              {search && (
                <span onClick={() => setSearch('')}
                  style={{ position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
                    cursor:'pointer',color:'var(--text3)',fontSize:'0.8rem' }}>✕</span>
              )}
            </div>
            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding:'5px 8px',background:'var(--bg)',border:'1px solid var(--border2)',
                borderRadius:7,color:'var(--text2)',fontFamily:'Exo 2,sans-serif',fontSize:'0.7rem',outline:'none',cursor:'pointer' }}>
              <option value="name">Sort: Name</option>
              <option value="type">Sort: Type</option>
              <option value="folder">Sort: Folder</option>
            </select>
            {/* View toggle */}
            <div style={{ display:'flex',border:'1px solid var(--border)',borderRadius:7,overflow:'hidden' }}>
              {[['list','☰'],['grid','⊞']].map(([m,icon]) => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{ padding:'4px 9px',border:'none',
                    background:viewMode===m?'rgba(0,180,216,0.15)':'transparent',
                    color:viewMode===m?'var(--cyan)':'var(--text3)',cursor:'pointer',fontSize:'0.9rem',transition:'all 0.15s' }}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Count bar */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'5px 14px',borderBottom:'1px solid var(--border)',flexShrink:0,background:'rgba(0,0,0,0.15)' }}>
            <span style={{ fontSize:'0.66rem',color:'var(--text3)' }}>
              {visibleFiles.length.toLocaleString()} {visibleFiles.length===1?'file':'files'}
              {search && ` matching "${search}"`}
              {selectedFolder && ` in ${selectedFolder}`}
            </span>
            {search && <span style={{ fontSize:'0.64rem',color:'var(--cyan)',cursor:'pointer' }} onClick={() => setSearch('')}>Clear</span>}
          </div>

          {/* Empty */}
          {visibleFiles.length===0 && (
            <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',color:'var(--text3)',gap:10,padding:'2rem' }}>
              <span style={{ fontSize:'2.5rem' }}>🔍</span>
              <span style={{ fontSize:'0.82rem',color:'var(--text2)' }}>No files found</span>
              {search && <span style={{ fontSize:'0.72rem' }}>Try a different search term</span>}
            </div>
          )}

          {/* List view — virtual scroll */}
          {visibleFiles.length>0 && viewMode==='list' && (
            <VirtualList items={visibleFiles} renderRow={renderRow} height={460} />
          )}

          {/* Grid view */}
          {visibleFiles.length>0 && viewMode==='grid' && (
            <div style={{ overflowY:'auto',flex:1,padding:'12px 14px' }}>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(195px,1fr))',gap:'0.7rem' }}>
                {visibleFiles.map((f,i) => renderCard(f,i))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function MaritimeLibraryPage({ setTab }) {
  const [libData,    setLibData]    = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError,   setLibError]   = useState(null);
  const [bookCat,    setBookCat]    = useState('All');
  const filtered = bookCat==='All' ? BOOKS : BOOKS.filter(b => b.cat===bookCat);

  useEffect(() => {
    let cancelled = false;
    setLibLoading(true); setLibError(null);
    fetchLibrarySheet()
      .then(rows => { if(!cancelled) { setLibData(rows); setLibLoading(false); } })
      .catch(e   => { if(!cancelled) { setLibError(e.message||'Failed to load library'); setLibLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="section">

      {/* File Manager */}
      <div className="sec-hdr" style={{ marginBottom:'0.8rem' }}>
        <div className="sec-title">📁 Library File Manager</div>
        {!libLoading && !libError && <span className="badge">{libData.length.toLocaleString()} files</span>}
      </div>
      <div className="info-box" style={{ marginBottom:'1rem' }}>
        🗂 Click any folder in the sidebar, use global search to find any file instantly, switch List ☰ or Grid ⊞ view, then Preview or Download.
      </div>
      <FileManager libData={libData} libLoading={libLoading} libError={libError} />

      {/* Maritime Knowledge Hub */}
      <div className="sec-hdr">
        <div className="sec-title">📚 Maritime Knowledge Hub</div>
        <span className="badge">{BOOKS.length} publications</span>
      </div>
      <div className="info-box" style={{ marginBottom:'1rem' }}>
        📖 Essential maritime publications — SOLAS, MARPOL, STCW, COLREGS and more. Links open official IMO/ILO resources.
      </div>
      <div className="fbar" style={{ marginBottom:'1.2rem' }}>
        {BOOK_CATS.map(c => (
          <button key={c} className={`fbtn ${bookCat===c?'active':''}`} onClick={() => setBookCat(c)}>{c}</button>
        ))}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'0.9rem' }}>
        {filtered.map((b,i) => (
          <div key={i}
            style={{ background:'var(--card)',border:'1px solid var(--border)',borderRadius:14,
              padding:'1.2rem',transition:'all 0.2s',display:'flex',flexDirection:'column',gap:8 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor=b.color; e.currentTarget.style.transform='translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)'; }}>
            <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
              <div style={{ width:46,height:46,borderRadius:12,background:'rgba(0,0,0,0.2)',
                border:`1px solid ${b.color}33`,display:'flex',alignItems:'center',
                justifyContent:'center',fontSize:'1.4rem',flexShrink:0 }}>{b.icon}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:'flex',alignItems:'center',gap:6,flexWrap:'wrap' }}>
                  <span style={{ fontFamily:'Orbitron,monospace',fontSize:'0.72rem',fontWeight:700,color:b.color }}>{b.title}</span>
                  <span style={{ padding:'1px 6px',borderRadius:4,fontSize:'0.58rem',fontWeight:600,
                    background:`${b.color}15`,color:b.color,border:`1px solid ${b.color}30` }}>{b.cat}</span>
                </div>
                <div style={{ fontSize:'0.68rem',color:'var(--text3)',marginTop:2,lineHeight:1.3 }}>{b.full}</div>
              </div>
            </div>
            <p style={{ fontSize:'0.76rem',color:'var(--text2)',lineHeight:1.5,flex:1 }}>{b.desc}</p>
            <a href={b.link} target="_blank" rel="noreferrer"
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'8px',
                background:`${b.color}10`,border:`1px solid ${b.color}30`,borderRadius:8,
                color:b.color,fontSize:'0.74rem',fontWeight:600,textDecoration:'none',transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background=`${b.color}20`}
              onMouseLeave={e => e.currentTarget.style.background=`${b.color}10`}>
              📖 Open Publication →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
