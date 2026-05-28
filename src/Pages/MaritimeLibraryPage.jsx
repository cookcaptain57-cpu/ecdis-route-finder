// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect, useMemo } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── Smart viewer URL builder ─────────────────────────────────────────────
const getViewerInfo = (title = '', url = '', fileId = '', mimeType = '') => {
  const t = title.toLowerCase();

  const isPdf =
    t.endsWith('.pdf') || mimeType.includes('pdf');

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
    mimeType.includes('officedocument') ||
    mimeType.includes('ms-excel');

  const isNoPreview =
    t.endsWith('.zip') ||
    t.endsWith('.exe') ||
    mimeType.includes('zip') ||
    mimeType.includes('compressed') ||
    mimeType.includes('msdownload');

  if (isNoPreview) return { type: 'none', src: '' };

  if (isPdf && fileId) {
    const directUrl =
      `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;

    return {
      type: 'pdf',
      src:
        `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(directUrl)}`,
    };
  }

  if (isImage && fileId) {
    return {
      type: 'image',
      src:
        `https://drive.google.com/uc?export=view&id=${fileId}`,
    };
  }

  if (isOffice && fileId) {
    const directUrl =
      `https://drive.google.com/uc?export=download&confirm=t&id=${fileId}`;

    return {
      type: 'office',
      src:
        `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(directUrl)}`,
    };
  }

  if (url) return { type: 'drive', src: url };

  return { type: 'none', src: '' };
};

function MaritimeLibraryPage() {

  // ── STATES ─────────────────────────────────────────────
  const [libData, setLibData] = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError, setLibError] = useState(null);

  const [openFolders, setOpenFolders] = useState(new Set());
  const [previewFile, setPreviewFile] = useState(null);

  // 🚀 NEW: search
  const [search, setSearch] = useState("");

  // ── LOAD DATA ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    setLibLoading(true);
    setLibError(null);

    fetchLibrarySheet()
      .then(rows => {
        if (!cancelled) {
          setLibData(rows || []);
          setLibLoading(false);
        }
      })
      .catch(e => {
        if (!cancelled) {
          setLibError(e.message || "Failed to load library");
          setLibLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  // ── RESET PREVIEW ─────────────────────────────────────
  useEffect(() => {
    setPreviewFile(null);
  }, []);

  // ── SAFE GROUPING (UNCHANGED LOGIC) ───────────────────
  const grouped = useMemo(() => {
    const acc = {};
    libData.forEach(row => {
      if (!acc[row.category]) acc[row.category] = [];
      acc[row.category].push(row);
    });
    return acc;
  }, [libData]);

  const categories = Object.keys(grouped);

  // ── FILTERED DATA (SEARCH) ────────────────────────────
  const filteredGrouped = useMemo(() => {
    if (!search.trim()) return grouped;

    const lower = search.toLowerCase();
    const filtered = {};

    Object.keys(grouped).forEach(cat => {
      const items = grouped[cat].filter(item =>
        item.name?.toLowerCase().includes(lower)
      );
      if (items.length) filtered[cat] = items;
    });

    return filtered;
  }, [search, grouped]);

  // ── ICON ──────────────────────────────────────────────
  const fileIcon = (title = '', mimeType = '') => {
    const t = title.toLowerCase();
    if (t.endsWith('.pdf')) return '📄';
    if (t.match(/\.(xls|xlsx|xlsm)$/)) return '📊';
    if (t.match(/\.(doc|docx)$/)) return '📝';
    if (t.endsWith('.zip')) return '🗜';
    if (t.endsWith('.exe')) return '⚙️';
    if (t.match(/\.(jpg|jpeg|png|gif)$/)) return '🖼';
    return '📄';
  };

  // ── TOGGLE ───────────────────────────────────────────
  const toggleFolder = (catName) => {
    setOpenFolders(prev => {
      const next = new Set(prev);
      next.has(catName) ? next.delete(catName) : next.add(catName);
      return next;
    });
  };

  return (
    <div className="section">

      {/* HEADER */}
      <div className="sec-hdr">
        <div className="sec-title">📁 Maritime Library</div>
        {!libLoading && <span className="badge">{libData.length} files</span>}
      </div>

      {/* SEARCH 🚀 */}
      <div style={{ marginBottom: 10 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search library..."
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--card)",
            color: "var(--text1)"
          }}
        />
      </div>

      {/* LOADING */}
      {libLoading && <div>Loading...</div>}

      {/* ERROR */}
      {libError && <div style={{ color: "red" }}>{libError}</div>}

      {/* EMPTY */}
      {!libLoading && categories.length === 0 && (
        <div>No library found</div>
      )}

      {/* FILE LIST */}
      {!libLoading && categories.length > 0 && (
        <div>
          {Object.keys(filteredGrouped).map(catName => {
            const files = filteredGrouped[catName];
            const isOpen = openFolders.has(catName);

            return (
              <div key={catName} style={{ marginBottom: 10 }}>

                {/* folder */}
                <div
                  onClick={() => toggleFolder(catName)}
                  style={{
                    padding: 10,
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    cursor: "pointer"
                  }}
                >
                  📁 {catName} ({files.length})
                </div>

                {/* files */}
                {isOpen && (
                  <div>
                    {files.map((file, i) => (
                      <div key={i} style={{ padding: 8 }}>
                        {fileIcon(file.name)} {file.name}

                        {file.previewUrl && (
                          <button onClick={() => setPreviewFile(file)}>
                            Preview
                          </button>
                        )}

                        {file.downloadUrl && (
                          <a href={file.downloadUrl}>Download</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW */}
      {previewFile && (
        <div style={{ position: "fixed", inset: 0, background: "#0008" }}>
          <div style={{ background: "#fff", margin: 50 }}>
            <button onClick={() => setPreviewFile(null)}>Close</button>
            <iframe
              src={previewFile.previewUrl}
              style={{ width: "100%", height: 500 }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default MaritimeLibraryPage;
