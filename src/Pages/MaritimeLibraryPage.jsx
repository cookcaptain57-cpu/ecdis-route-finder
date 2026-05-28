// src/Pages/MaritimeLibraryPage.jsx
import { useState, useEffect, useMemo } from "react";
import { fetchLibrarySheet } from "../sheets";

/* ─────────────────────────────
   IndexedDB (UNCHANGED CORE)
───────────────────────────── */
const DB_NAME = "maritime_lib_db";
const STORE = "files";

function openDB() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    req.onsuccess = () => resolve(req.result);
  });
}

async function saveToDB(data) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  data.forEach(d => store.put(d));
}

async function loadFromDB() {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => res(req.result || []);
  });
}

/* ─────────────────────────────
   VIEWER (UNCHANGED)
───────────────────────────── */
const getViewerInfo = (title = "", url = "", fileId = "", mimeType = "") => {
  const t = (title || "").toLowerCase();

  const isPdf = t.endsWith(".pdf") || (mimeType || "").includes("pdf");
  const isImage = t.match(/\.(jpg|jpeg|png|gif)$/);
  const isOffice =
    t.match(/\.(docx|doc|xlsx|xls|pptx)$/) ||
    (mimeType || "").includes("officedocument");

  const isNoPreview = t.match(/\.(zip|exe)$/);

  if (isNoPreview) return { type: "none" };

  if (isPdf && fileId) {
    const d = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return {
      type: "pdf",
      src: `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(d)}`
    };
  }

  if (isImage && fileId) {
    return { type: "image", src: `https://drive.google.com/uc?export=view&id=${fileId}` };
  }

  if (isOffice && fileId) {
    const d = `https://drive.google.com/uc?export=download&id=${fileId}`;
    return {
      type: "office",
      src: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(d)}`
    };
  }

  return { type: "drive", src: url };
};

function MaritimeLibraryPage() {

  /* ───────────────────────────── */
  const [libData, setLibData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [path, setPath] = useState([{ id: "root", name: "Root" }]);

  const [search, setSearch] = useState("");
  const [previewFile, setPreviewFile] = useState(null);

  /* ─────────────────────────────
     LOAD (cache + fresh sync)
  ───────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoading(true);

      const cached = await loadFromDB();
      if (cached.length) setLibData(cached);

      const fresh = await fetchLibrarySheet();
      setLibData(fresh);
      saveToDB(fresh);

      setLoading(false);
    })();
  }, []);

  /* ─────────────────────────────
     FILTER BY FOLDER
  ───────────────────────────── */
  const folderItems = useMemo(() => {
    return libData.filter(
      i => (i.parentId || "root") === currentFolderId
    );
  }, [libData, currentFolderId]);

  /* ─────────────────────────────
     SEARCH (GLOBAL FAST SEARCH)
  ───────────────────────────── */
  const filteredItems = useMemo(() => {
    if (!search) return folderItems;

    const q = search.toLowerCase();

    return folderItems.filter(i =>
      (i.name || "").toLowerCase().includes(q)
    );
  }, [folderItems, search]);

  /* ─────────────────────────────
     FOLDER OPEN
  ───────────────────────────── */
  const openFolder = (folder) => {
    setCurrentFolderId(folder.id);

    setPath(prev => [...prev, {
      id: folder.id,
      name: folder.name
    }]);
  };

  /* ─────────────────────────────
     BREADCRUMB
  ───────────────────────────── */
  const goTo = (i) => {
    const newPath = path.slice(0, i + 1);
    setPath(newPath);
    setCurrentFolderId(newPath[i].id);
  };

  const goBack = () => {
    if (path.length <= 1) return;
    const p = [...path];
    p.pop();
    setPath(p);
    setCurrentFolderId(p[p.length - 1].id);
  };

  /* ─────────────────────────────
     FILE TYPE BADGE
  ───────────────────────────── */
  const getTag = (name="") => {
    const t = name.toLowerCase();
    if (t.endsWith(".pdf")) return "PDF";
    if (t.match(/\.(xls|xlsx)$/)) return "EXCEL";
    if (t.match(/\.(doc|docx)$/)) return "WORD";
    if (t.match(/\.(jpg|png|jpeg)$/)) return "IMAGE";
    return "FILE";
  };

  return (
    <div className="section">

      {/* HEADER */}
      <div className="sec-hdr">
        <div className="sec-title">📁 Maritime Library</div>
        <span className="badge">{libData.length}</span>
      </div>

      {/* SEARCH */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search files..."
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 10,
          borderRadius: 8
        }}
      />

      {/* BREADCRUMB */}
      <div style={{ marginBottom: 10 }}>
        {path.map((p, i) => (
          <span key={i} onClick={() => goTo(i)}
            style={{ cursor: "pointer", marginRight: 6 }}>
            {p.name} {i < path.length - 1 && ">"}
          </span>
        ))}
      </div>

      {path.length > 1 && (
        <button onClick={goBack}>← Back</button>
      )}

      {/* LIST */}
      {loading && <div>Loading...</div>}

      {!loading && filteredItems.map((item, i) => {

        const isFolder = item.type === "folder";

        return (
          <div
            key={i}
            onClick={() => isFolder && openFolder(item)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 10,
              border: "1px solid #333",
              marginBottom: 6,
              cursor: isFolder ? "pointer" : "default"
            }}
          >
            <div>
              {isFolder ? "📁" : "📄"} {item.name}
            </div>

            {!isFolder && (
              <span style={{
                fontSize: 10,
                background: "#222",
                padding: "2px 6px",
                borderRadius: 4
              }}>
                {getTag(item.name)}
              </span>
            )}
          </div>
        );
      })}

      {/* PREVIEW */}
      {previewFile && (
        <div>
          <iframe
            src={getViewerInfo(
              previewFile.name,
              previewFile.url,
              previewFile.id,
              previewFile.mimeType
            ).src}
            style={{ width: "100%", height: "80vh" }}
          />
        </div>
      )}

    </div>
  );
}

export default MaritimeLibraryPage;
