// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect } from "react";
import { fetchLibrarySheet } from "../sheets";

// ─── Smart viewer URL builder ─────────────────────────────────────────────
const getViewerInfo = (title = '', url = '', fileId = '', mimeType = '') => {
  const t = (title || "").toLowerCase();

  const isPdf =
    t.endsWith('.pdf') || (mimeType || "").includes('pdf');

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
    (mimeType || "").includes('officedocument') ||
    (mimeType || "").includes('ms-excel');

  const isNoPreview =
    t.endsWith('.zip') ||
    t.endsWith('.exe') ||
    (mimeType || "").includes('zip') ||
    (mimeType || "").includes('compressed') ||
    (mimeType || "").includes('msdownload');

  if (isNoPreview)
    return { type: 'none', src: '' };

  if (isPdf && fileId) {
    const directUrl =
      `https://drive.google.com/uc?export=download&id=${fileId}`;

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
      `https://drive.google.com/uc?export=download&id=${fileId}`;

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

  const [libData, setLibData] = useState([]);
  const [libLoading, setLibLoading] = useState(true);
  const [libError, setLibError] = useState(null);

  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderHistory, setFolderHistory] = useState([]);

  const [previewFile, setPreviewFile] = useState(null);
  const [iframeError, setIframeError] = useState(false);

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

  useEffect(() => {
    setIframeError(false);
  }, [previewFile]);

  // 🔥 FIX: support BOTH old + new formats
  const currentItems = libData.filter(item => {

    const parent =
      item.parentId || item.category || "root";

    return parent === currentFolderId;
  });

  const openFolder = (folder) => {
    const id = folder.id || folder.category || folder.name;

    setFolderHistory(prev => [...prev, currentFolderId]);
    setCurrentFolderId(id);
  };

  const goBackFolder = () => {
    if (folderHistory.length === 0) return;

    const prev = [...folderHistory];
    const last = prev.pop();

    setFolderHistory(prev);
    setCurrentFolderId(last);
  };

  const fileIcon = (title = '', mimeType = '') => {
    const t = (title || "").toLowerCase();

    if (t.endsWith('.pdf')) return '📄';
    if (t.endsWith('.xlsx') || t.endsWith('.xls') || t.endsWith('.xlsm')) return '📊';
    if (t.endsWith('.docx') || t.endsWith('.doc')) return '📝';
    if (t.endsWith('.zip')) return '🗜';
    if (t.endsWith('.exe')) return '⚙️';
    if (t.endsWith('.jpg') || t.endsWith('.png') || t.endsWith('.jpeg')) return '🖼';

    return '📄';
  };

  const renderViewer = (file) => {
    if (!file) return null;

    const viewer = getViewerInfo(
      file.title || file.name,
      file.url,
      file.fileId || file.id,
      file.mimeType
    );

    if (viewer.type === 'image') {
      return (
        <img
          src={viewer.src}
          style={{ maxWidth: "100%", maxHeight: "100%" }}
        />
      );
    }

    if (viewer.type === 'none') {
      return <div style={{ padding: 20 }}>No preview available</div>;
    }

    return (
      <iframe
        src={viewer.src}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    );
  };

  return (
    <div className="section">

      <div className="sec-hdr">
        <div className="sec-title">📁 Maritime Library</div>
        {!libLoading && (
          <span className="badge">{libData.length} items</span>
        )}
      </div>

      <div className="info-box">
        🗂 Browse folders and files like a real file manager.
      </div>

      {libLoading && (
        <div>Loading...</div>
      )}

      {libError && (
        <div style={{ color: "red" }}>
          {libError}
        </div>
      )}

      {!libLoading && currentItems.length === 0 && (
        <div>No library files found.</div>
      )}

      {!libLoading && currentItems.length > 0 && (

        <div>

          {currentFolderId !== "root" && (
            <button onClick={goBackFolder}>
              ← Back
            </button>
          )}

          {currentItems.map((item, i) => {

            const isFolder = item.type === "folder";

            return (
              <div
                key={i}
                onClick={() => isFolder && openFolder(item)}
                style={{
                  padding: 10,
                  border: "1px solid #ccc",
                  marginBottom: 6,
                  cursor: isFolder ? "pointer" : "default"
                }}
              >
                {isFolder ? "📁" : "📄"} {" "}
                {item.name || item.title}
              </div>
            );
          })}
        </div>
      )}

      {previewFile && (
        <div onClick={() => setPreviewFile(null)}>
          {renderViewer(previewFile)}
        </div>
      )}

    </div>
  );
}

export default MaritimeLibraryPage;
