/* eslint-disable */
// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── Build nested tree from flat "A / B / C" category paths ──────────────────
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

// Recursively count all files in a node (including subfolders)
function countAll(node) {
  let c = node.files.length;
  for (const ch of Object.values(node.children)) c += countAll(ch);
  return c;
}

// ─── File type helpers ────────────────────────────────────────────────────────
const EXT_ICONS = { pdf:'📄',xlsx:'📊',xls:'📊',xlsm:'📊',docx:'📝',doc:'📝',pptx:'📊',zip:'🗜',exe:'⚙️',jpg:'🖼',jpeg:'🖼',png:'🖼',gif:'🖼' };
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
  jpg:  { label:'IMAGE', bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.35)'  },
  jpeg: { label:'IMAGE', bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.35)'  },
  png:  { label:'IMAGE', bg:'rgba(251,191,36,0.15)',  color:'#FBBF24', border:'rgba(251,191,36,0.35)'  },
};
const getExt    = (t='') => t.split('.').pop().toLowerCase();
const fileIcon  = (t='',m='') => EXT_ICONS[getExt(t)] || (m.includes('excel')?'📊':m.includes('zip')?'🗜':'📄');
const fileBadge = (t='') => EXT_BADGE[getExt(t)] || { label:'FILE', bg:'rgba(0,180,216,0.12)', color:'var(--cyan)', border:'rgba(0,180,216,0.3)' };

// Colour per folder depth
const DEPTH_COLORS = ['#00B4D8','#34D399','#FBBF24','#FB923C','#A78BFA','#60A5FA','#F87171'];
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
  const [iframeError, setIframeError] = useState(false);
  useEffect(() => { setIframeError(false); }, [file]);
  if (!file) return null;
  const viewer = getViewerInfo(file.title, file.url, file.fileId, file.mimeType);

  const body = () => {
    if (viewer.type === 'none' || iframeError) return (
      <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:'2rem',color:'var(--text3)' }}>
        <span style={{ fontSize:'3.5rem' }}>{fileIcon(file.title,file.mimeType)}</span>
        <p style={{ fontSize:'0.85rem',textAlign:'center',color:'var(--text2)' }}>
          {iframeError ? 'Preview could not load.' : 'Preview not available for this file type.'}
        </p>
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
    return <iframe key={viewer.src} src={viewer.src} title={file.title}
      style={{ flex:1,border:'none',width:'100%' }} allow="autoplay"
      onError={() => setIframeError(true)} />;
  };

  return (
    <div onClick={onClose}
      style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:'var(--card)',border:'1px solid var(--border2)',borderRadius:16,width:'100%',maxWidth:960,height:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 30px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'0.85rem 1rem',borderBottom:'1px solid var(--border)',flexShrink:0,flexWrap:'wrap',background:'var(--bg2)' }}>
          <span style={{ fontSize:'1.2rem' }}>{fileIcon(file.title,file.mimeType)}</span>
          <span style={{ flex:1,fontSize:'0.78rem',fontWeight:600,color:'var(--text)',wordBreak:'break-word',lineHeight:1.3,minWidth:80 }}>{file.title}</span>
          {(() => { const b=fileBadge(file.title); return <span style={{ padding:'2px 8px',borderRadius:4,fontSize:'0.6rem',fontWeight:700,background:b.bg,color:b.color,border:`1px solid ${b.border}`,flexShrink:0 }}>{b.label}</span>; })()}
          <div style={{ display:'flex',gap:7,flexShrink:0,flexWrap:'wrap' }}>
            {file.fileId && <a href={`https://drive.google.com/uc?export=download&confirm=t&id=${file.fileId}`} target="_blank" rel="noreferrer"
              style={{ padding:'5px 12px',borderRadius:7,border:'1px solid var(--cyan)',background:'rgba(0,180,216,0.1)',color:'var(--cyan)',fontSize:'0.72rem',fontWeight:600,textDecoration:'none' }}>⬇ Download</a>}
            {file.url && <a href={file.url} target="_blank" rel="noreferrer"
              style={{ padding:'5px 12px',borderRadius:7,border:'1px solid var(--border)',background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.72rem',fontWeight:600,textDecoration:'none' }}>🔗 Drive</a>}
            <button onClick={onClose}
              style={{ padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',background:'rgba(255,255,255,0.05)',color:'var(--text2)',fontSize:'0.72rem',fontWeight:600,cursor:'pointer' }}>✕ Close</button>
          </div>
        </div>
        <div style={{ flex:1,display:'flex',flexDirection:'column',overflow:'hidden' }}>{body()}</div>
      </div>
    </div>
  );
}

// ─── Sidebar Tree Node ────────────────────────────────────────────────────────
function SidebarNode({ name, node, currentPath, depth, onNavigate }) {
  const hasChildren  = Object.keys(node.children).length > 0;
  const isActive     = currentPath[depth] === name && currentPath.length === depth + 1;
  const isAncestor   = currentPath[depth] === name && currentPath.length > depth + 1;
  const [open, setOpen] = useState(depth === 0);
  const total = useMemo(() => countAll(node), [node]);
  const color = depthColor(depth);

  useEffect(() => { if (isActive || isAncestor) setOpen(true); }, [isActive, isAncestor]);

  return (
    <div>
      <div
        onClick={() => {
          onNavigate([...currentPath.slice(0, depth), name]);
          if (hasChildren) setOpen(o => !o);
        }}
        style={{ display:'flex',alignItems:'center',gap:6,
          padding:`7px 10px 7px ${10 + depth * 13}px`,
          cursor:'pointer',userSelect:'none',
          background: isActive ? `${color}18` : 'transparent',
          borderLeft: isActive ? `3px solid ${color}` : `3px solid transparent`,
          transition:'all 0.15s' }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background='transparent'; }}
      >
        <span style={{ fontSize:'0.55rem',color:'var(--text3)',width:9,flexShrink:0,textAlign:'center' }}>
          {hasChildren ? (open ? '▼' : '▶') : ''}
        </span>
        <span style={{ fontSize:'0.82rem',flexShrink:0 }}>{isActive||isAncestor ? '📂' : '📁'}</span>
        <span title={name} style={{ flex:1,fontSize:'0.67rem',lineHeight:1.25,
          color: isActive ? color : isAncestor ? 'var(--text)' : 'var(--text2)',
          fontWeight: isActive||isAncestor ? 700 : 400,
          overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
          {name}
        </span>
        <span style={{ fontSize:'0.55rem',flexShrink:0,
          color: isActive ? color : 'var(--text3)',
          background: isActive ? `${color}20` : 'rgba(255,255,255,0.05)',
          padding:'1px 4px',borderRadius:3 }}>
          {total}
        </span>
      </div>
      {open && hasChildren && Object.entries(node.children).map(([n,ch]) => (
        <SidebarNode key={n} name={n} node={ch}
          currentPath={currentPath} depth={depth+1} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({ file, idx, onPreview }) {
  const badge = fileBadge(file.title);
  return (
    <div
      style={{ display:'flex',alignItems:'center',gap:9,padding:'0 12px',
        height:46,borderBottom:'1px solid rgba(255,255,255,0.04)',
        background: idx%2===0 ? 'transparent' : 'rgba(255,255,255,0.015)',
        transition:'background 0.12s' }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(0,180,216,0.07)'}
      onMouseLeave={e => e.currentTarget.style.background=idx%2===0?'transparent':'rgba(255,255,255,0.015)'}
    >
      <span style={{ fontSize:'1rem',flexShrink:0,width:22,textAlign:'center' }}>{fileIcon(file.title,file.mimeType)}</span>
      <span title={file.title}
        style={{ flex:1,fontSize:'0.73rem',color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
        {file.title}
      </span>
      <span style={{ padding:'1px 6px',borderRadius:4,fontSize:'0.57rem',fontWeight:700,
        background:badge.bg,color:badge.color,border:`1px solid ${badge.border}`,flexShrink:0,whiteSpace:'nowrap' }}>
        {badge.label}
      </span>
      <div style={{ display:'flex',gap:5,flexShrink:0 }}>
        {file.url && (
          <button onClick={() => onPreview(file)}
            style={{ padding:'3px 9px',borderRadius:5,border:'1px solid rgba(0,180,216,0.35)',
              background:'rgba(0,180,216,0.08)',color:'var(--cyan)',fontSize:'0.64rem',
              fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s' }}
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
              fontWeight:600,textDecoration:'none',whiteSpace:'nowrap',display:'inline-block',transition:'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--cyan)'; e.currentTarget.style.color='var(--cyan)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
            ⬇
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Folder Card ──────────────────────────────────────────────────────────────
function FolderCard({ name, node, depth, onClick }) {
  const color       = depthColor(depth);
  const totalFiles  = useMemo(() => countAll(node), [node]);
  const subCount    = Object.keys(node.children).length;
  const directFiles = node.files.length;

  return (
    <div onClick={onClick}
      style={{ background:'var(--card)',border:`1px solid ${color}30`,borderRadius:12,
        padding:'1rem',cursor:'pointer',transition:'all 0.2s',display:'flex',flexDirection:'column',gap:8 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.35),0 0 0 1px ${color}20`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=`${color}30`; e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:10 }}>
        <span style={{ fontSize:'1.8rem',flexShrink:0 }}>📁</span>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:'0.72rem',fontWeight:700,color,lineHeight:1.3,
            fontFamily:'Orbitron,monospace',wordBreak:'break-word' }}>
            {name}
          </div>
          <div style={{ display:'flex',gap:8,marginTop:4,flexWrap:'wrap' }}>
            {subCount > 0 && (
              <span style={{ fontSize:'0.6rem',color:'var(--text3)' }}>
                📁 {subCount} folder{subCount!==1?'s':''}
              </span>
            )}
            <span style={{ fontSize:'0.6rem',color:'var(--text3)' }}>
              📄 {totalFiles} file{totalFiles!==1?'s':''}
            </span>
          </div>
        </div>
        <span style={{ fontSize:'0.75rem',color:'var(--text3)',flexShrink:0 }}>›</span>
      </div>
    </div>
  );
}

// ─── File Manager ─────────────────────────────────────────────────────────────
function FileManager({ libData, libLoading, libError }) {
  const tree = useMemo(() => buildTree(libData), [libData]);
  const [path, setPath]             = useState([]);   // [] = root
  const [search, setSearch]         = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Resolve current node from path
  const currentNode = useMemo(() => {
    let node = tree;
    for (const seg of path) node = node.children[seg] || { children:{}, files:[] };
    return node;
  }, [tree, path]);

  const navigateTo   = useCallback(newPath => { setPath(newPath); setSearch(''); }, []);
  const navigateInto = useCallback(name    => { setPath(p => [...p, name]); setSearch(''); }, []);
  const navigateBack = useCallback(()      => { setPath(p => p.slice(0,-1)); setSearch(''); }, []);

  const openPreview = useCallback(file => setPreviewFile({
    title:file.title, url:file.url, downloadUrl:file.downloadUrl,
    fileId:file.fileId, mimeType:file.mimeType,
  }), []);

  // Subfolders and filtered files in current node
  const folders = Object.entries(currentNode.children);
  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return currentNode.files;
    return currentNode.files.filter(f => (f.title||'').toLowerCase().includes(q));
  }, [currentNode.files, search]);

  // Keyboard shortcut: / = focus search, Esc = go back
  useEffect(() => {
    const handler = e => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('lib-search')?.focus();
      }
      if (e.key === 'Escape' && path.length > 0) navigateBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [path, navigateBack]);

  const currentDepth = path.length;
  const currentColor = depthColor(currentDepth);

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

      {/* File Manager container — fixed height, no page scroll */}
      <div style={{ display:'flex',border:'1px solid var(--border)',borderRadius:14,
        overflow:'hidden',background:'var(--card)',marginBottom:'2rem',
        height:'calc(100vh - 240px)',minHeight:520,maxHeight:800 }}>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div style={{ width:220,flexShrink:0,borderRight:'1px solid var(--border)',
            overflowY:'auto',background:'var(--bg2)',display:'flex',flexDirection:'column' }}>
            {/* Sidebar header */}
            <div style={{ padding:'10px 12px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0 }}>
              <span style={{ fontFamily:'Orbitron,monospace',fontSize:'0.6rem',fontWeight:700,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase' }}>
                📁 Folders
              </span>
              <button onClick={() => setSidebarOpen(false)}
                style={{ background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:'0.8rem',padding:'0 2px' }}
                title="Hide sidebar">‹</button>
            </div>
            {/* Tree */}
            <div style={{ flex:1,overflowY:'auto' }}>
              {/* All Files shortcut */}
              <div onClick={() => navigateTo([])}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 10px',cursor:'pointer',
                  background:path.length===0?'rgba(0,180,216,0.12)':'transparent',
                  borderLeft:path.length===0?'3px solid var(--cyan)':'3px solid transparent',
                  transition:'all 0.15s' }}
                onMouseEnter={e => { if(path.length!==0) e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if(path.length!==0) e.currentTarget.style.background='transparent'; }}>
                <span style={{ fontSize:'0.55rem',width:9 }} />
                <span style={{ fontSize:'0.85rem' }}>🏠</span>
                <span style={{ flex:1,fontSize:'0.7rem',fontWeight:600,color:path.length===0?'var(--cyan)':'var(--text2)' }}>Root</span>
                <span style={{ fontSize:'0.55rem',color:path.length===0?'var(--cyan)':'var(--text3)',background:path.length===0?'rgba(0,180,216,0.2)':'rgba(255,255,255,0.05)',padding:'1px 4px',borderRadius:3 }}>
                  {countAll(tree)}
                </span>
              </div>
              {Object.entries(tree.children).map(([name, node]) => (
                <SidebarNode key={name} name={name} node={node}
                  currentPath={path} depth={0} onNavigate={navigateTo} />
              ))}
            </div>
          </div>
        )}

        {/* ── Main content ── */}
        <div style={{ flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden' }}>

          {/* Toolbar */}
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
            borderBottom:'1px solid var(--border)',flexShrink:0,background:'var(--bg2)',flexWrap:'wrap' }}>

            {/* Sidebar toggle when hidden */}
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)}
                style={{ padding:'4px 8px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontSize:'0.8rem' }}
                title="Show sidebar">›</button>
            )}

            {/* Back button */}
            {path.length > 0 && (
              <button onClick={navigateBack}
                style={{ padding:'4px 10px',borderRadius:6,border:`1px solid ${currentColor}40`,
                  background:`${currentColor}10`,color:currentColor,fontSize:'0.7rem',
                  fontWeight:600,cursor:'pointer',flexShrink:0,whiteSpace:'nowrap',transition:'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background=`${currentColor}20`}
                onMouseLeave={e => e.currentTarget.style.background=`${currentColor}10`}>
                ← Back
              </button>
            )}

            {/* Breadcrumb */}
            <div style={{ display:'flex',alignItems:'center',gap:4,fontSize:'0.7rem',flex:1,minWidth:0,overflow:'hidden' }}>
              <span onClick={() => navigateTo([])}
                style={{ color:'var(--cyan)',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0 }}
                onMouseEnter={e => e.currentTarget.style.textDecoration='underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration=''}>
                🏠 Library
              </span>
              {path.map((seg, i) => (
                <span key={i} style={{ display:'flex',alignItems:'center',gap:4,minWidth:0,flexShrink: i < path.length-1 ? 1 : 0 }}>
                  <span style={{ color:'var(--text3)',flexShrink:0 }}>›</span>
                  <span
                    onClick={() => navigateTo(path.slice(0, i+1))}
                    title={seg}
                    style={{ color: i===path.length-1 ? depthColor(i) : 'var(--text2)',
                      fontWeight: i===path.length-1 ? 700 : 400,
                      cursor:'pointer',whiteSpace:'nowrap',
                      overflow: i < path.length-1 ? 'hidden' : 'visible',
                      textOverflow:'ellipsis',maxWidth: i < path.length-1 ? 80 : 'none' }}
                    onMouseEnter={e => { if(i<path.length-1) e.currentTarget.style.textDecoration='underline'; }}
                    onMouseLeave={e => e.currentTarget.style.textDecoration=''}>
                    {seg}
                  </span>
                </span>
              ))}
            </div>

            {/* Search */}
            <div style={{ position:'relative',flexShrink:0 }}>
              <span style={{ position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',fontSize:'0.78rem',color:'var(--text3)',pointerEvents:'none' }}>🔍</span>
              <input id="lib-search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search files… [/]`}
                style={{ padding:'5px 28px 5px 26px',background:'var(--bg)',border:'1px solid var(--border2)',
                  borderRadius:7,color:'var(--text)',fontFamily:'Exo 2,sans-serif',fontSize:'0.72rem',
                  outline:'none',width:170,transition:'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor='var(--cyan)'}
                onBlur={e  => e.target.style.borderColor='var(--border2)'} />
              {search && (
                <span onClick={() => setSearch('')}
                  style={{ position:'absolute',right:7,top:'50%',transform:'translateY(-50%)',
                    cursor:'pointer',color:'var(--text3)',fontSize:'0.8rem' }}>✕</span>
              )}
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
            padding:'4px 12px',borderBottom:'1px solid var(--border)',flexShrink:0,
            background:'rgba(0,0,0,0.15)' }}>
            <span style={{ fontSize:'0.64rem',color:'var(--text3)' }}>
              {path.length===0
                ? `${Object.keys(tree.children).length} folders · ${countAll(tree)} total files`
                : `${folders.length} folder${folders.length!==1?'s':''} · ${currentNode.files.length} file${currentNode.files.length!==1?'s':''}`
              }
              {search && ` · ${visibleFiles.length} matching`}
            </span>
            {path.length>0 && (
              <span style={{ fontSize:'0.6rem',color:currentColor,fontFamily:'Orbitron,monospace',fontWeight:700 }}>
                📂 {path[path.length-1]}
              </span>
            )}
          </div>

          {/* Content area — scrolls internally */}
          <div style={{ flex:1,overflowY:'auto',padding:'10px 12px',display:'flex',flexDirection:'column',gap:10 }}>

            {/* Subfolders grid */}
            {folders.length > 0 && (
              <div>
                {search === '' && (
                  <>
                    <div style={{ fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8,fontFamily:'Orbitron,monospace' }}>
                      📁 Folders
                    </div>
                    <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'0.6rem',marginBottom:12 }}>
                      {folders.map(([name, node]) => (
                        <FolderCard key={name} name={name} node={node}
                          depth={currentDepth + 1}
                          onClick={() => navigateInto(name)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Files */}
            {(visibleFiles.length > 0 || search) && (
              <div>
                {(folders.length > 0 || search) && visibleFiles.length > 0 && (
                  <div style={{ fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6,fontFamily:'Orbitron,monospace' }}>
                    📄 Files {search && `— ${visibleFiles.length} result${visibleFiles.length!==1?'s':''}`}
                  </div>
                )}
                {visibleFiles.length > 0 ? (
                  <div style={{ border:'1px solid var(--border)',borderRadius:10,overflow:'hidden' }}>
                    {visibleFiles.map((file, idx) => (
                      <FileRow key={`${file.fileId||file.title}-${idx}`}
                        file={file} idx={idx} onPreview={openPreview} />
                    ))}
                  </div>
                ) : search ? (
                  <div style={{ textAlign:'center',padding:'1.5rem',color:'var(--text3)',fontSize:'0.8rem' }}>
                    No files match "{search}"
                  </div>
                ) : null}
              </div>
            )}

            {/* Empty folder */}
            {folders.length === 0 && visibleFiles.length === 0 && !search && (
              <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'2rem',color:'var(--text3)' }}>
                <span style={{ fontSize:'2.5rem' }}>📭</span>
                <span style={{ fontSize:'0.8rem',color:'var(--text2)' }}>This folder is empty</span>
              </div>
            )}

            {/* Root: show all top-level folders as big cards */}
            {path.length === 0 && Object.keys(tree.children).length === 0 && !libLoading && (
              <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,padding:'2rem',color:'var(--text3)' }}>
                <span style={{ fontSize:'2.5rem' }}>📂</span>
                <span style={{ fontSize:'0.8rem',color:'var(--text2)' }}>No library data loaded yet</span>
              </div>
            )}
          </div>

          {/* Keyboard hint */}
          <div style={{ padding:'5px 12px',borderTop:'1px solid var(--border)',flexShrink:0,
            display:'flex',gap:12,background:'rgba(0,0,0,0.15)' }}>
            <span style={{ fontSize:'0.58rem',color:'var(--text3)' }}>⌨️ Press <kbd style={{ background:'rgba(255,255,255,0.08)',border:'1px solid var(--border)',borderRadius:3,padding:'0 4px',fontFamily:'monospace' }}>/</kbd> to search</span>
            {path.length>0 && <span style={{ fontSize:'0.58rem',color:'var(--text3)' }}><kbd style={{ background:'rgba(255,255,255,0.08)',border:'1px solid var(--border)',borderRadius:3,padding:'0 4px',fontFamily:'monospace' }}>Esc</kbd> to go back</span>}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Books data ───────────────────────────────────────────────────────────────
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

      {/* File Manager */}
      <div className="sec-hdr" style={{ marginBottom:'0.8rem' }}>
        <div className="sec-title">📁 Library File Manager</div>
        {!libLoading && !libError && <span className="badge">{libData.length.toLocaleString()} files</span>}
      </div>
      <div className="info-box" style={{ marginBottom:'1rem' }}>
        🗂 Click any folder to drill in, use the sidebar tree to jump anywhere, press <strong>/</strong> to search, <strong>Esc</strong> to go back. Scroll stays inside the box.
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
