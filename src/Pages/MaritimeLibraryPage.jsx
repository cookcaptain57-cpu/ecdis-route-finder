/* eslint-disable */
// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── Build nested tree ────────────────────────────────────────────────────────
function buildTree(files) {
  const root = { children: {}, files: [] };
  files.forEach(file => {
    const parts = (file.category || 'Uncategorized')
      .split(/\s*\/\s*/).map(p => p.trim()).filter(Boolean);
    let node = root;
    for (const part of parts) {
      if (!node.children[part]) node.children[part] = { children: {}, files: [] };
      node = node.children[part];
    }
    node.files.push(file);
  });
  return root;
}

function countAll(node) {
  let c = node.files.length;
  for (const ch of Object.values(node.children)) c += countAll(ch);
  return c;
}

// ─── File type helpers ────────────────────────────────────────────────────────
const EXT_ICONS = {
  pdf:'📄',xlsx:'📊',xls:'📊',xlsm:'📊',docx:'📝',doc:'📝',
  pptx:'📊',zip:'🗜',exe:'⚙️',jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼'
};
const EXT_BADGE = {
  pdf:  { label:'PDF',   bg:'rgba(248,113,113,0.15)', color:'#F87171', border:'rgba(248,113,113,0.35)' },
  xlsx: { label:'EXCEL', bg:'rgba(52,211,153,0.15)',  color:'#34D399', border:'rgba(52,211,153,0.35)'  },
  xls:  { label:'EXCEL', bg:'rgba(52,211,153,0.15)',  color:'#34D399', border:'rgba(52,211,153,0.35)'  },
  xlsm: { label:'EXCEL', bg:'rgba(52,211,153,0.15)',  color:'#34D399', border:'rgba(52,211,153,0.35)'  },
  docx: { label:'WORD',  bg:'rgba(96,165,250,0.15)',  color:'#60A5FA', border:'rgba(96,165,250,0.35)'  },
  doc:  { label:'WORD',  bg:'rgba(96,165,250,0.15)',  color:'#60A5FA', border:'rgba(96,165,250,0.35)'  },
  pptx: { label:'PPT',   bg:'rgba(251,146,60,0.15)',  color:'#FB923C', border:'rgba(251,146,60,0.35)'  },
  zip:  { label:'ZIP',   bg:'rgba(167,139,250,0.15)', color:'#A78BFA', border:'rgba(167,139,250,0.35)' },
  exe:  { label:'APP',   bg:'rgba(167,139,250,0.15)', color:'#A78BFA', border:'rgba(167,139,250,0.35)' },
  jpg:  { label:'IMG',   bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.35)'  },
  jpeg: { label:'IMG',   bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.35)'  },
  png:  { label:'IMG',   bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.35)'  },
};
const DEPTH_COLORS = ['#00B4D8','#34D399','#FBBF24','#FB923C','#A78BFA','#60A5FA','#F87171'];
const getExt     = (t='') => t.split('.').pop().toLowerCase();
const fileIcon   = (t='',m='') => EXT_ICONS[getExt(t)] || (m.includes('excel')?'📊':m.includes('zip')?'🗜':'📄');
const fileBadge  = (t='') => EXT_BADGE[getExt(t)] || { label:'FILE', bg:'rgba(0,180,216,0.12)', color:'var(--cyan)', border:'rgba(0,180,216,0.3)' };
const depthColor = d => DEPTH_COLORS[d % DEPTH_COLORS.length];

// ─── Viewer ───────────────────────────────────────────────────────────────────
const getViewerInfo = (title='', url='', fileId='', mimeType='') => {
  const t = title.toLowerCase();
  const isPdf      = t.endsWith('.pdf') || mimeType.includes('pdf');
  const isImage    = t.endsWith('.jpg')||t.endsWith('.jpeg')||t.endsWith('.png')||t.endsWith('.gif');
  const isOffice   = t.endsWith('.docx')||t.endsWith('.doc')||t.endsWith('.xlsx')||
                     t.endsWith('.xls')||t.endsWith('.xlsm')||t.endsWith('.pptx')||
                     mimeType.includes('officedocument')||mimeType.includes('ms-excel');
  const isNoPreview= t.endsWith('.zip')||t.endsWith('.exe')||
                     mimeType.includes('zip')||mimeType.includes('compressed')||mimeType.includes('msdownload');
  if (isNoPreview) return { type:'none', src:'' };
  if (isPdf && fileId) {
    const d = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    return { type:'pdf', src:`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(d)}` };
  }
  if (isImage && fileId) return { type:'image', src:`https://drive.google.com/uc?export=view&id=${fileId}` };
  if (isOffice && fileId) {
    const d = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    return { type:'office', src:`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(d)}` };
  }
  if (url) return { type:'drive', src:url };
  return { type:'none', src:'' };
};

// ─── Preview Modal ────────────────────────────────────────────────────────────
function PreviewModal({ file, onClose }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [file]);
  if (!file) return null;
  const viewer = getViewerInfo(file.title, file.url, file.fileId, file.mimeType);

  const body = () => {
    if (viewer.type === 'none' || err) return (
      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,padding:'2rem' }}>
        <span style={{ fontSize:'3rem' }}>{fileIcon(file.title,file.mimeType)}</span>
        <p style={{ fontSize:'0.83rem',textAlign:'center',color:'var(--text2)',lineHeight:1.6 }}>
          {err ? 'Preview failed to load.' : 'No preview available for this file type.'}
        </p>
        {file.url && (
          <a href={file.url} target="_blank" rel="noreferrer"
            style={{ padding:'10px 20px',borderRadius:10,border:'1px solid var(--cyan)',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',fontSize:'0.8rem',fontWeight:600,textDecoration:'none' }}>
            🔗 Open in Google Drive
          </a>
        )}
      </div>
    );
    if (viewer.type === 'image') return (
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#000',overflow:'auto' }}>
        <img src={viewer.src} alt={file.title}
          style={{ maxWidth:'100%',maxHeight:'100%',objectFit:'contain' }}
          onError={() => setErr(true)} />
      </div>
    );
    return <iframe key={viewer.src} src={viewer.src} title={file.title}
      style={{ flex:1,border:'none',width:'100%' }} allow="autoplay" onError={() => setErr(true)} />;
  };

  const badge = fileBadge(file.title);

  return (
    <div onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:3000,
        display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--card)',borderRadius:'20px 20px 0 0',width:'100%',
          maxWidth:960,height:'94vh',display:'flex',flexDirection:'column',overflow:'hidden',
          boxShadow:'0 -20px 60px rgba(0,0,0,0.7)' }}>

        {/* Drag handle */}
        <div style={{ display:'flex',justifyContent:'center',padding:'10px 0 4px',flexShrink:0 }}>
          <div style={{ width:40,height:4,borderRadius:2,background:'var(--border2)' }} />
        </div>

        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'0 16px 12px',flexShrink:0,flexWrap:'wrap' }}>
          <span style={{ fontSize:'1.4rem' }}>{fileIcon(file.title,file.mimeType)}</span>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontSize:'0.8rem',fontWeight:700,color:'var(--text)',lineHeight:1.3,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{file.title}</div>
            <span style={{ padding:'1px 7px',borderRadius:4,fontSize:'0.6rem',fontWeight:700,
              background:badge.bg,color:badge.color,border:`1px solid ${badge.border}` }}>{badge.label}</span>
          </div>
          <button onClick={onClose}
            style={{ width:36,height:36,borderRadius:'50%',border:'1px solid var(--border)',
              background:'rgba(255,255,255,0.06)',color:'var(--text2)',fontSize:'1rem',
              cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
        </div>

        {/* Action buttons */}
        <div style={{ display:'flex',gap:8,padding:'0 16px 12px',flexShrink:0 }}>
          {file.fileId && (
            <a href={`https://drive.google.com/uc?export=download&confirm=t&id=${file.fileId}`}
              target="_blank" rel="noreferrer"
              style={{ flex:1,padding:'11px',borderRadius:10,border:'1px solid var(--cyan)',
                background:'rgba(0,180,216,0.1)',color:'var(--cyan)',fontSize:'0.78rem',
                fontWeight:700,textDecoration:'none',textAlign:'center',display:'block' }}>
              ⬇ Download
            </a>
          )}
          {file.url && (
            <a href={file.url} target="_blank" rel="noreferrer"
              style={{ flex:1,padding:'11px',borderRadius:10,border:'1px solid var(--border)',
                background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.78rem',
                fontWeight:600,textDecoration:'none',textAlign:'center',display:'block' }}>
              🔗 Drive
            </a>
          )}
        </div>

        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden',
          borderTop:'1px solid var(--border)' }}>{body()}</div>
      </div>
    </div>
  );
}

// ─── Mobile File Manager ──────────────────────────────────────────────────────
function FileManager({ libData, libLoading, libError }) {
  const tree = useMemo(() => buildTree(libData), [libData]);

  // path = array of folder name strings, e.g. ['Maritime Library', 'SOLAS']
  const [path, setPath]           = useState([]);
  const [search, setSearch]       = useState('');
  const [preview, setPreview]     = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const currentNode = useMemo(() => {
    let node = tree;
    for (const seg of path) node = node.children[seg] || { children:{}, files:[] };
    return node;
  }, [tree, path]);

  const goInto = useCallback(name => { setPath(p => [...p, name]); setSearch(''); }, []);
  const goBack = useCallback(()   => { setPath(p => p.slice(0,-1)); setSearch(''); }, []);
  const goRoot = useCallback(()   => { setPath([]); setSearch(''); }, []);

  const folders = Object.entries(currentNode.children);

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currentNode.files;
    // Search across ALL files when at root, current folder files otherwise
    const pool = path.length === 0 ? libData : currentNode.files;
    return pool.filter(f =>
      (f.title||'').toLowerCase().includes(q) ||
      (f.category||'').toLowerCase().includes(q)
    );
  }, [currentNode.files, search, path.length, libData]);

  const currentDepth = path.length;
  const accentColor  = depthColor(currentDepth);
  const currentName  = path.length > 0 ? path[path.length - 1] : 'Library';
  const totalInNode  = countAll(currentNode);

  if (libLoading) return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      gap:14,padding:'4rem 1rem',color:'var(--text2)' }}>
      <div className="spin" style={{ width:28,height:28,borderWidth:3 }} />
      <span style={{ fontSize:'0.85rem' }}>Loading library…</span>
    </div>
  );

  if (libError) return (
    <div style={{ padding:'1rem',borderRadius:12,background:'rgba(248,113,113,0.1)',
      border:'1px solid rgba(248,113,113,0.3)',color:'#F87171',fontSize:'0.82rem',margin:'1rem 0' }}>
      ⚠️ {libError}
    </div>
  );

  return (
    <>
      <PreviewModal file={preview} onClose={() => setPreview(null)} />

      {/* ── File Manager Card ── */}
      <div style={{ border:'1px solid var(--border)',borderRadius:16,overflow:'hidden',
        background:'var(--card)',marginBottom:'2rem' }}>

        {/* ── Top bar ── */}
        <div style={{ background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'12px 14px' }}>

          {/* Breadcrumb row */}
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom: search==='' ? 0 : 10,flexWrap:'wrap' }}>
            {path.length > 0 ? (
              <button onClick={goBack}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 12px',borderRadius:20,
                  border:`1px solid ${accentColor}40`,background:`${accentColor}12`,
                  color:accentColor,fontSize:'0.76rem',fontWeight:700,cursor:'pointer',
                  flexShrink:0,transition:'all 0.15s' }}>
                ‹ Back
              </button>
            ) : null}

            <div style={{ display:'flex',alignItems:'center',gap:4,flex:1,overflow:'hidden' }}>
              {path.length === 0 ? (
                <span style={{ fontSize:'0.82rem',fontWeight:700,color:'var(--text)',
                  fontFamily:'Orbitron,monospace' }}>🏠 Library Root</span>
              ) : (
                <>
                  <span onClick={goRoot}
                    style={{ fontSize:'0.7rem',color:'var(--text3)',cursor:'pointer',flexShrink:0 }}>🏠</span>
                  {path.map((seg,i) => (
                    <span key={i} style={{ display:'flex',alignItems:'center',gap:3,minWidth:0 }}>
                      <span style={{ color:'var(--text3)',fontSize:'0.68rem',flexShrink:0 }}>›</span>
                      <span onClick={() => setPath(path.slice(0,i+1))}
                        style={{ fontSize:'0.72rem',
                          color: i===path.length-1 ? accentColor : 'var(--text3)',
                          fontWeight: i===path.length-1 ? 700 : 400,
                          cursor:'pointer',
                          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                          maxWidth: i===path.length-1 ? 160 : 60 }}
                        title={seg}>{seg}</span>
                    </span>
                  ))}
                </>
              )}
            </div>

            {/* File / folder count pill */}
            <span style={{ padding:'3px 9px',borderRadius:20,fontSize:'0.63rem',
              background:`${accentColor}15`,color:accentColor,
              border:`1px solid ${accentColor}30`,flexShrink:0,whiteSpace:'nowrap' }}>
              {totalInNode} files
            </span>
          </div>

          {/* Search bar */}
          <div style={{ position:'relative',marginTop:10 }}>
            <span style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',
              fontSize:'0.9rem',pointerEvents:'none',color:searchFocused?accentColor:'var(--text3)',
              transition:'color 0.2s' }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={path.length===0 ? "Search all files…" : `Search in ${currentName}…`}
              style={{ width:'100%',padding:'11px 36px 11px 38px',
                background:'var(--bg)',border:`1.5px solid ${searchFocused?accentColor:'var(--border2)'}`,
                borderRadius:12,color:'var(--text)',fontFamily:'Exo 2,sans-serif',
                fontSize:'0.83rem',outline:'none',transition:'border-color 0.2s',
                boxSizing:'border-box' }} />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',
                  background:'rgba(255,255,255,0.1)',border:'none',color:'var(--text2)',
                  cursor:'pointer',fontSize:'0.75rem',width:22,height:22,borderRadius:'50%',
                  display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
            )}
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ maxHeight:520,overflowY:'auto' }}>

          {/* Search results */}
          {search && (
            <div>
              <div style={{ padding:'10px 14px 6px',fontSize:'0.65rem',color:'var(--text3)',
                textTransform:'uppercase',letterSpacing:'0.1em',fontFamily:'Orbitron,monospace' }}>
                🔍 {visibleFiles.length} result{visibleFiles.length!==1?'s':''}
              </div>
              {visibleFiles.length === 0 ? (
                <div style={{ padding:'2.5rem',textAlign:'center',color:'var(--text3)' }}>
                  <div style={{ fontSize:'2rem',marginBottom:8 }}>🔍</div>
                  <div style={{ fontSize:'0.82rem' }}>No files found for "{search}"</div>
                </div>
              ) : visibleFiles.map((file,idx) => (
                <FileListRow key={`sr-${idx}`} file={file} idx={idx}
                  showFolder onPreview={f => setPreview(f)} />
              ))}
            </div>
          )}

          {/* Normal browse mode */}
          {!search && (
            <>
              {/* Folders */}
              {folders.length > 0 && (
                <div>
                  {folders.length > 0 && currentNode.files.length > 0 && (
                    <SectionHeader label="Folders" count={folders.length} color={accentColor} />
                  )}
                  {folders.map(([name, node]) => (
                    <FolderListRow key={name} name={name} node={node}
                      depth={currentDepth+1} onClick={() => goInto(name)} />
                  ))}
                </div>
              )}

              {/* Files */}
              {currentNode.files.length > 0 && (
                <div>
                  {folders.length > 0 && (
                    <SectionHeader label="Files" count={currentNode.files.length} color={accentColor} />
                  )}
                  {currentNode.files.map((file,idx) => (
                    <FileListRow key={`f-${idx}`} file={file} idx={idx}
                      onPreview={f => setPreview(f)} />
                  ))}
                </div>
              )}

              {/* Empty */}
              {folders.length === 0 && currentNode.files.length === 0 && (
                <div style={{ padding:'3rem',textAlign:'center',color:'var(--text3)' }}>
                  <div style={{ fontSize:'2.5rem',marginBottom:10 }}>📭</div>
                  <div style={{ fontSize:'0.82rem',color:'var(--text2)' }}>This folder is empty</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Bottom path indicator ── */}
        {path.length > 0 && (
          <div style={{ borderTop:'1px solid var(--border)',padding:'8px 14px',
            background:'rgba(0,0,0,0.2)',display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ fontSize:'0.65rem',color:'var(--text3)',flex:1,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
              📂 {path.join(' › ')}
            </span>
            <button onClick={goRoot}
              style={{ padding:'3px 9px',borderRadius:6,border:'1px solid var(--border)',
                background:'transparent',color:'var(--text3)',fontSize:'0.62rem',cursor:'pointer' }}>
              🏠 Root
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ label, count, color }) {
  return (
    <div style={{ padding:'8px 14px 4px',display:'flex',alignItems:'center',gap:8 }}>
      <span style={{ fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',
        letterSpacing:'0.1em',fontFamily:'Orbitron,monospace',flex:1 }}>{label}</span>
      <span style={{ fontSize:'0.6rem',color,background:`${color}15`,
        border:`1px solid ${color}30`,padding:'1px 6px',borderRadius:10 }}>{count}</span>
    </div>
  );
}

// ─── Folder Row (mobile-friendly large tap target) ───────────────────────────
function FolderListRow({ name, node, depth, onClick }) {
  const color      = depthColor(depth);
  const total      = useMemo(() => countAll(node), [node]);
  const subFolders = Object.keys(node.children).length;
  const [pressed, setPressed] = useState(false);

  return (
    <div onClick={onClick}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onMouseEnter={() => setPressed(true)}
      onMouseLeave={() => setPressed(false)}
      style={{ display:'flex',alignItems:'center',gap:12,
        padding:'13px 16px',cursor:'pointer',
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        background: pressed ? `${color}10` : 'transparent',
        transition:'background 0.12s',
        WebkitTapHighlightColor:'transparent' }}>

      {/* Folder icon with colored background */}
      <div style={{ width:42,height:42,borderRadius:10,flexShrink:0,
        background:`${color}18`,border:`1px solid ${color}30`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.3rem' }}>
        📁
      </div>

      {/* Name + meta */}
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:'0.8rem',fontWeight:600,color:'var(--text)',
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3 }}
          title={name}>{name}</div>
        <div style={{ fontSize:'0.65rem',color:'var(--text3)',marginTop:2 }}>
          {subFolders > 0 ? `${subFolders} folder${subFolders!==1?'s':''} · ` : ''}{total} file{total!==1?'s':''}
        </div>
      </div>

      {/* Chevron */}
      <span style={{ fontSize:'1rem',color:`${color}80`,flexShrink:0 }}>›</span>
    </div>
  );
}

// ─── File Row (mobile-friendly) ───────────────────────────────────────────────
function FileListRow({ file, idx, onPreview, showFolder }) {
  const badge  = fileBadge(file.title);
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onMouseEnter={() => setPressed(true)}
      onMouseLeave={() => setPressed(false)}
      style={{ display:'flex',alignItems:'center',gap:12,padding:'11px 16px',
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        background: pressed ? 'rgba(0,180,216,0.06)' : idx%2===0 ? 'transparent' : 'rgba(255,255,255,0.015)',
        transition:'background 0.12s',
        WebkitTapHighlightColor:'transparent' }}>

      {/* File type icon */}
      <div style={{ width:40,height:40,borderRadius:9,flexShrink:0,
        background:badge.bg,border:`1px solid ${badge.border}`,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.2rem' }}>
        {fileIcon(file.title,file.mimeType)}
      </div>

      {/* Name + folder */}
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:'0.76rem',fontWeight:500,color:'var(--text)',lineHeight:1.3,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}
          title={file.title}>{file.title}</div>
        <div style={{ display:'flex',alignItems:'center',gap:5,marginTop:3 }}>
          <span style={{ padding:'1px 6px',borderRadius:4,fontSize:'0.58rem',fontWeight:700,
            background:badge.bg,color:badge.color,border:`1px solid ${badge.border}` }}>
            {badge.label}
          </span>
          {showFolder && file.category && (
            <span style={{ fontSize:'0.6rem',color:'var(--text3)',overflow:'hidden',
              textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>
              {file.category.split('/').pop().trim()}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex',flexDirection:'column',gap:5,flexShrink:0 }}>
        {file.url && (
          <button onClick={e => { e.stopPropagation(); onPreview(file); }}
            style={{ padding:'5px 10px',borderRadius:7,
              border:'1px solid rgba(0,180,216,0.4)',background:'rgba(0,180,216,0.1)',
              color:'var(--cyan)',fontSize:'0.65rem',fontWeight:700,cursor:'pointer',
              whiteSpace:'nowrap',minWidth:66,textAlign:'center' }}>
            👁 Open
          </button>
        )}
        {file.fileId && (
          <a href={`https://drive.google.com/uc?export=download&confirm=t&id=${file.fileId}`}
            target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ padding:'5px 10px',borderRadius:7,
              border:'1px solid var(--border)',background:'rgba(255,255,255,0.05)',
              color:'var(--text2)',fontSize:'0.65rem',fontWeight:600,
              textDecoration:'none',textAlign:'center',display:'block',
              minWidth:66,boxSizing:'border-box' }}>
            ⬇ Save
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Books ────────────────────────────────────────────────────────────────────
const BOOKS = [
  { title:'SOLAS 2020',    full:'International Convention for the Safety of Life at Sea',                             icon:'🛡', color:'var(--cyan)',   cat:'Safety',       desc:'Consolidated edition covering all amendments up to 2020.',                                               link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'MARPOL 2022',   full:'International Convention for the Prevention of Pollution from Ships',                icon:'🌊', color:'var(--green)',  cat:'Environment',  desc:'Annex I–VI covering oil, noxious liquids, garbage, air pollution and sewage.',                          link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'STCW 2017',     full:'Standards of Training, Certification and Watchkeeping',                              icon:'⚓', color:'var(--gold)',   cat:'Certification',desc:'Manila amendments consolidated edition including STCW Code Parts A and B.',                             link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'COLREGS',       full:'Convention on the International Regulations for Preventing Collisions at Sea',       icon:'💡', color:'#F87171',       cat:'Navigation',   desc:'72 COLREGS with all amendments. Rules of the road for all vessels.',                                    link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'IAMSAR Manual', full:'International Aeronautical and Maritime Search and Rescue Manual',                   icon:'🆘', color:'#FB923C',       cat:'Safety',       desc:'Volume I, II & III covering SAR services and mission coordination.',                                    link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'ISM Code',      full:'International Safety Management Code',                                               icon:'📋', color:'var(--purple)', cat:'Management',   desc:'Requirements for safe management and operation of ships.',                                              link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'ISPS Code',     full:'International Ship and Port Facility Security Code',                                 icon:'🔒', color:'#A78BFA',       cat:'Security',     desc:'Security framework for ships and ports.',                                                               link:'https://www.imo.org/en/Publications/Pages/Home.aspx' },
  { title:'MLC 2006',      full:'Maritime Labour Convention',                                                         icon:'👷', color:'var(--gold)',   cat:'Labour',       desc:"Seafarers rights, working conditions, manning, wages and repatriation.",                               link:'https://www.ilo.org/global/standards/maritime-labour-convention/lang--en/index.htm' },
  { title:'ECDIS Manual',  full:'ECDIS Operation and Best Practices Guide',                                           icon:'📡', color:'var(--cyan)',   cat:'ECDIS',        desc:'Guide to ECDIS operation, chart updates and passage monitoring.',                                      link:'https://www.nautinst.org/' },
  { title:'IMO Circulars', full:'Latest IMO MSC/MEPC Circulars',                                                      icon:'🏛', color:'#60A5FA',       cat:'Regulations',  desc:'Latest Marine Safety and Marine Environment Protection circulars.',                                    link:'https://www.imo.org/en/OurWork/Pages/Home.aspx' },
];
const BOOK_CATS = ['All','Safety','Environment','Navigation','Certification','ECDIS','Regulations','Security','Management','Labour'];

// ─── Main Page ────────────────────────────────────────────────────────────────
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
      .catch(e   => { if(!cancelled) { setLibError(e.message||'Failed'); setLibLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="section">

      {/* Header */}
      <div className="sec-hdr" style={{ marginBottom:'0.8rem' }}>
        <div className="sec-title">📁 Library File Manager</div>
        {!libLoading && !libError && (
          <span className="badge">{libData.length.toLocaleString()} files</span>
        )}
      </div>
      <div className="info-box" style={{ marginBottom:'1rem' }}>
        📂 Tap any folder to open it, tap <strong>‹ Back</strong> to go up. Search finds files across all folders.
      </div>

      <FileManager libData={libData} libLoading={libLoading} libError={libError} />

      {/* Maritime Knowledge Hub */}
      <div className="sec-hdr">
        <div className="sec-title">📚 Maritime Knowledge Hub</div>
        <span className="badge">{BOOKS.length} publications</span>
      </div>
      <div className="info-box" style={{ marginBottom:'1rem' }}>
        📖 Essential maritime publications — SOLAS, MARPOL, STCW, COLREGS and more.
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
              style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px',
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
