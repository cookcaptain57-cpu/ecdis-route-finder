// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── Smart viewer URL builder ─────────────────────────────────────────────
const getViewerInfo = (title = '', url = '', fileId = '', mimeType = '') => {
  const t = (title || '').toLowerCase();

  const isPdf =
    t.endsWith('.pdf') || (mimeType || '').includes('pdf');

  const isImage =
    t.endsWith('.jpg') ||
    t.endsWith('.jpeg') ||
    t.endsWith('.png') ||
    t.endsWith('.gif');

  const isOffice =
    t.endsWith('.docx') ||
    t.endsWith('.doc') ||
    t.endsWith('.xlsx') ||
    t.endsWith('.xls') ||
    t.endsWith('.xlsm') ||
    t.endsWith('.pptx') ||
    (mimeType || '').includes('officedocument') ||
    (mimeType || '').includes('ms-excel');

  const isNoPreview =
    t.endsWith('.zip') ||
    t.endsWith('.exe') ||
    (mimeType || '').includes('zip') ||
    (mimeType || '').includes('compressed') ||
    (mimeType || '').includes('msdownload');

  if (isNoPreview) return { type: 'none', src: '' };

  if (isPdf && fileId) {
    const directUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    return {
      type: 'pdf',
      src: `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(directUrl)}`
    };
  }

  if (isImage && fileId) {
    return {
      type: 'image',
      src: `https://drive.google.com/uc?export=view&id=${fileId}`
    };
  }

  if (isOffice && fileId) {
    const directUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;
    return {
      type: 'office',
      src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`
    };
  }

  if (url) return { type: 'drive', src: url };

  return { type: 'none', src: '' };
};

function MaritimeLibraryPage() {
  const BOOKS = [
    {
      title: 'SOLAS 2020',
      full: 'International Convention for the Safety of Life at Sea',
      icon: '🛡',
      color: 'var(--cyan)',
      cat: 'Safety',
      desc: 'Consolidated edition covering all amendments up to 2020. Essential for all seafarers.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'MARPOL 2022',
      full: 'International Convention for the Prevention of Pollution from Ships',
      icon: '🌊',
      color: 'var(--green)',
      cat: 'Environment',
      desc: 'Annex I–VI covering oil, noxious liquids, garbage, air pollution and sewage.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'STCW 2017',
      full: 'Standards of Training, Certification and Watchkeeping',
      icon: '⚓',
      color: 'var(--gold)',
      cat: 'Certification',
      desc: 'Manila amendments consolidated edition including STCW Code Parts A and B.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'COLREGS',
      full: 'Collision Regulations at Sea',
      icon: '💡',
      color: '#F87171',
      cat: 'Navigation',
      desc: '72 COLREGS rules of the road for all vessels.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'IAMSAR Manual',
      full: 'Search and Rescue Manual',
      icon: '🆘',
      color: '#FB923C',
      cat: 'Safety',
      desc: 'SAR coordination and mobile facilities guidance.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'ISM Code',
      full: 'Safety Management Code',
      icon: '📋',
      color: 'var(--purple)',
      cat: 'Management',
      desc: 'Safe ship operation and pollution prevention requirements.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'ISPS Code',
      full: 'Ship Security Code',
      icon: '🔒',
      color: '#A78BFA',
      cat: 'Security',
      desc: 'Security framework for ships and ports.',
      link: 'https://www.imo.org/en/Publications/Pages/Home.aspx',
    },
    {
      title: 'MLC 2006',
      full: 'Maritime Labour Convention',
      icon: '👷',
      color: 'var(--gold)',
      cat: 'Labour',
      desc: 'Seafarer rights, wages, and working conditions.',
      link: 'https://www.ilo.org/global/standards/maritime-labour-convention/lang--en/index.htm',
    },
    {
      title: 'ECDIS Manual',
      full: 'ECDIS Operation Guide',
      icon: '📡',
      color: 'var(--cyan)',
      cat: 'ECDIS',
      desc: 'Chart updates, route planning, and navigation best practices.',
      link: 'https://www.nautinst.org/',
    },
    {
      title: 'IMO Circulars',
      full: 'MSC/MEPC Circulars',
      icon: '🏛',
      color: '#60A5FA',
      cat: 'Regulations',
      desc: 'Latest IMO safety and environment circulars.',
      link: 'https://www.imo.org/en/OurWork/Pages/Home.aspx',
    },
  ];

  const [cat, setCat] = useState('All');
  const cats = ['All','Safety','Environment','Navigation','Certification','ECDIS','Regulations','Security','Management','Labour'];

  const filtered = cat === 'All' ? BOOKS : BOOKS.filter(b => b.cat === cat);

  const [libData, setLibData] = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError, setLibError] = useState(null);

  const [openFolders, setOpenFolders] = useState(new Set());
  const [previewFile, setPreviewFile] = useState(null);
  const [iframeError, setIframeError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLibLoading(true);

    fetchLibrarySheet()
      .then(rows => {
        if (!cancelled) {
          setLibData(rows || []);
          setLibLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setLibError(e.message);
          setLibLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setIframeError(false);
  }, [previewFile]);

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

  const fileIcon = (title = '', mimeType = '') => {
    const t = title.toLowerCase();
    if (t.endsWith('.pdf')) return '📄';
    if (t.endsWith('.xlsx') || t.endsWith('.xls')) return '📊';
    if (t.endsWith('.docx') || t.endsWith('.doc')) return '📝';
    if (t.endsWith('.zip')) return '🗜';
    if (t.endsWith('.jpg') || t.endsWith('.png')) return '🖼';
    return '📄';
  };

  const renderViewer = (file) => {
    if (!file) return null;

    const viewer = getViewerInfo(file.title, file.url, file.fileId, file.mimeType);

    if (viewer.type === 'none' || iframeError) {
      return (
        <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center' }}>
          Preview not available
        </div>
      );
    }

    if (viewer.type === 'image') {
      return <img src={viewer.src} style={{ maxWidth:'100%' }} />;
    }

    return <iframe src={viewer.src} style={{ flex:1, border:'none', width:'100%' }} />;
  };

  return (
    <div className="section">

      {/* LIBRARY FILES */}
      <div className="sec-hdr">
        <div className="sec-title">📁 Library Files</div>
        <span className="badge">{libData.length} files</span>
      </div>

      {libLoading && <div>Loading...</div>}
      {libError && <div style={{color:'red'}}>{libError}</div>}

      {!libLoading && categories.map(catName => (
        <div key={catName}>
          <div onClick={() => toggleFolder(catName)}>
            📁 {catName} ({grouped[catName].length})
          </div>

          {openFolders.has(catName) &&
            grouped[catName].map((file,i) => (
              <div key={i}>
                {fileIcon(file.title)} {file.title}

                {file.url && (
                  <a href={file.url} target="_blank">Open Link</a>
                )}

                {file.downloadUrl && (
                  <a href={file.downloadUrl} target="_blank">Download</a>
                )}

                <button onClick={() => setPreviewFile(file)}>Preview</button>
              </div>
            ))
          }
        </div>
      ))}

      {/* BOOKS SECTION (UNCHANGED LINKS SAFE) */}
      <div className="sec-hdr">
        <div className="sec-title">📚 Maritime Knowledge Hub</div>
      </div>

      {filtered.map((b,i)=>(
        <div key={i}>
          {b.icon} {b.title}
          <a href={b.link} target="_blank">Open</a>
        </div>
      ))}

      {previewFile && (
        <div onClick={()=>setPreviewFile(null)}>
          {renderViewer(previewFile)}
        </div>
      )}

    </div>
  );
}

export default MaritimeLibraryPage;
