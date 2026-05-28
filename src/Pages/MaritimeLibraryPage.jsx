// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect } from "react";
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

  if (isNoPreview)
    return { type: 'none', src: '' };

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

  if (url)
    return { type: 'drive', src: url };

  return { type: 'none', src: '' };
};

function MaritimeLibraryPage() {

  // ── Library States ─────────────────────────────────────
  const [libData, setLibData] = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError, setLibError] = useState(null);

  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState([]);

  const [previewFile, setPreviewFile] = useState(null);
  const [iframeError, setIframeError] = useState(false);

  // ── Load Sheet ─────────────────────────────────────────
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

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Reset iframe error ────────────────────────────────
  useEffect(() => {
    setIframeError(false);
  }, [previewFile]);

  // ── Current Folder Items ─────────────────────────────
  const currentItems = libData.filter(
    item => item.parentId === currentFolderId
  );

  // ── Open Folder ──────────────────────────────────────
  const openFolder = (folder) => {
    setFolderHistory(prev => [...prev, currentFolderId]);
    setCurrentFolderId(folder.id);
  };

  // ── Back Folder ──────────────────────────────────────
  const goBackFolder = () => {
    if (folderHistory.length === 0) return;

    const prev = [...folderHistory];
    const last = prev.pop();

    setFolderHistory(prev);
    setCurrentFolderId(last);
  };

  // ── File Icon ────────────────────────────────────────
  const fileIcon = (title = '', mimeType = '') => {
    const t = title.toLowerCase();

    if (t.endsWith('.pdf')) return '📄';

    if (
      t.endsWith('.xlsx') ||
      t.endsWith('.xls') ||
      t.endsWith('.xlsm')
    ) return '📊';

    if (
      t.endsWith('.docx') ||
      t.endsWith('.doc')
    ) return '📝';

    if (t.endsWith('.zip')) return '🗜';

    if (t.endsWith('.exe')) return '⚙️';

    if (
      t.endsWith('.jpg') ||
      t.endsWith('.png') ||
      t.endsWith('.jpeg')
    ) return '🖼';

    return '📄';
  };

  // ── Smart Viewer ─────────────────────────────────────
  const renderViewer = (file) => {

    if (!file) return null;

    const viewer = getViewerInfo(
      file.title,
      file.url,
      file.fileId,
      file.mimeType
    );

    if (viewer.type === 'none' || iframeError) {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '2rem',
          color: 'var(--text3)'
        }}>
          <span style={{ fontSize: '3rem' }}>
            {fileIcon(file.title, file.mimeType)}
          </span>

          <p style={{
            fontSize: '0.85rem',
            textAlign: 'center',
            color: 'var(--text2)'
          }}>
            Preview not available.
          </p>
        </div>
      );
    }

    if (viewer.type === 'image') {
      return (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000'
        }}>
          <img
            src={viewer.src}
            alt={file.title}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            onError={() => setIframeError(true)}
          />
        </div>
      );
    }

    return (
      <iframe
        key={viewer.src}
        src={viewer.src}
        title={file.title}
        style={{
          flex: 1,
          border: 'none',
          width: '100%'
        }}
        onError={() => setIframeError(true)}
      />
    );
  };

  return (
    <div className="section">

      {/* HEADER */}
      <div className="sec-hdr" style={{ marginBottom: '0.8rem' }}>
        <div className="sec-title">
          📁 Maritime Library
        </div>

        {!libLoading && (
          <span className="badge">
            {libData.length} items
          </span>
        )}
      </div>

      {/* INFO */}
      <div className="info-box" style={{ marginBottom: '1rem' }}>
        🗂 Browse folders and files like a real file manager.
      </div>

      {/* LOADING */}
      {libLoading && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--text3)'
        }}>
          ⏳ Loading library...
        </div>
      )}

      {/* ERROR */}
      {libError && (
        <div style={{
          padding: '1rem',
          borderRadius: 10,
          background: '#F871711A',
          border: '1px solid #F8717140',
          color: '#F87171'
        }}>
          ⚠️ {libError}
        </div>
      )}

      {/* EMPTY */}
      {!libLoading && currentItems.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          color: 'var(--text3)'
        }}>
          No library files found.
        </div>
      )}

      {/* FILE MANAGER */}
      {!libLoading && currentItems.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          marginBottom: '2rem'
        }}>

          {/* BACK */}
          {currentFolderId !== "root" && (
            <button
              onClick={goBackFolder}
              style={{
                padding: '0.7rem 1rem',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--text2)',
                cursor: 'pointer',
                width: 'fit-content'
              }}
            >
              ← Back
            </button>
          )}

          {currentItems.map((item, idx) => {

            // FOLDER
            if (item.type === "folder") {
              return (
                <div
                  key={idx}
                  onClick={() => openFolder(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0.9rem 1rem',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>
                    📁
                  </span>

                  <span style={{
                    flex: 1,
                    fontSize: '0.75rem',
                    color: 'var(--text1)',
                    fontWeight: 600
                  }}>
                    {item.name}
                  </span>

                  <span style={{
                    color: 'var(--text3)',
                    fontSize: '0.7rem'
                  }}>
                    →
                  </span>
                </div>
              );
            }

            // FILE
            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0.7rem 1rem',
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 12
                }}
              >
                <span style={{ fontSize: '1rem' }}>
                  {fileIcon(item.name, item.mimeType)}
                </span>

                <span style={{
                  flex: 1,
                  fontSize: '0.74rem',
                  color: 'var(--text2)',
                  wordBreak: 'break-word'
                }}>
                  {item.name}
                </span>

                <div style={{
                  display: 'flex',
                  gap: 6
                }}>

                  {item.previewUrl && (
                    <button
                      onClick={() => setPreviewFile({
                        title: item.name,
                        url: item.previewUrl,
                        downloadUrl: item.downloadUrl,
                        fileId: item.id,
                        mimeType: item.mimeType,
                      })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--cyan)',
                        background: 'var(--cyan)12',
                        color: 'var(--cyan)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      👁 Preview
                    </button>
                  )}

                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text2)',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textDecoration: 'none'
                      }}
                    >
                      ⬇ Download
                    </a>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.82)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 900,
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >

            {/* HEADER */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0.9rem 1.1rem',
              borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '1rem' }}>
                {fileIcon(previewFile.title)}
              </span>

              <span style={{
                flex: 1,
                fontSize: '0.78rem',
                color: 'var(--text1)',
                fontWeight: 600
              }}>
                {previewFile.title}
              </span>

              <button
                onClick={() => setPreviewFile(null)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 7,
                  border: '1px solid var(--border)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--text2)',
                  cursor: 'pointer'
                }}
              >
                ✕ Close
              </button>
            </div>

            {/* VIEWER */}
            <div style={{
              flex: 1,
              display: 'flex',
              overflow: 'hidden'
            }}>
              {renderViewer(previewFile)}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default MaritimeLibraryPage;
