// src/pages/RoutesPage.jsx

import { useState, useEffect, useMemo, useCallback } from "react";
import { searchSheetLive } from "../sheets";

const ROUTE_SHEET_ID = "1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE";

const ROUTE_TABS = ["Sheet1", "Routes", "Sheet2", "Sheet3", "Sheet4"];

function RoutesPage({ searchQuery, notify, user, setTab }) {
  const [q, setQ] = useState(searchQuery || "");
  const [allRoutes, setAllRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  // ─────────────────────────────────────────────────────
  // LOAD ALL ROUTES ONCE
  // ✅ FIXED: wrapped in useCallback so it can be added to useEffect deps
  // ─────────────────────────────────────────────────────
  const loadAllRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await searchSheetLive(ROUTE_SHEET_ID, "", ROUTE_TABS, 50000);
      setAllRoutes(res || []);
    } catch (e) {
      notify("Failed loading routes", "error");
    }
    setLoading(false);
  }, [notify]);

  // ✅ FIXED: loadAllRoutes added to dependency array
  useEffect(() => {
    loadAllRoutes();
  }, [loadAllRoutes]);

  // ─────────────────────────────────────────────────────
  // TRACK SEARCHED STATE
  // ✅ FIXED: side effect moved out of useMemo into its own useEffect
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    if (q && q.trim().length >= 1) {
      setSearched(true);
    } else {
      setSearched(false);
    }
  }, [q]);

  // ─────────────────────────────────────────────────────
  // INSTANT SEARCH
  // ─────────────────────────────────────────────────────
  const results = useMemo(() => {
    if (!q || q.trim().length < 1) return [];
    const search = q.toLowerCase().trim();
    const words = search.split(" ");
    return allRoutes.filter((r) => {
      const text = Object.values(r).join(" ").toLowerCase();
      return words.every((w) => text.includes(w));
    });
  }, [q, allRoutes]);

  // ─────────────────────────────────────────────────────
  // SUGGESTIONS
  // ─────────────────────────────────────────────────────
  const suggestions = useMemo(() => {
    if (!q || q.length < 1) return [];
    const search = q.toLowerCase();
    const names = new Set();
    allRoutes.forEach((r) => {
      const nm = r["File Name"] || r["Route Name"] || r.fileName || "";
      if (nm && nm.toLowerCase().includes(search)) names.add(nm);
    });
    return [...names].slice(0, 10);
  }, [q, allRoutes]);

  // ─────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────
  const getName = (r) =>
    r["File Name"] || r.fileName || r["Route Name"] || "Route File";

  const getPort = (r) =>
    r["Port Name"] || r.portName || r["From"] || r["Route Description"] || "";

  // ─────────────────────────────────────────────────────
  // DOWNLOAD
  // ─────────────────────────────────────────────────────
  const handleDL = async (r) => {
    if (!user) { notify("Login required", "error"); setTab("login"); return; }
    const url = r["File URL"] || r.fileUrl || r["Drive Link"] || r["Download URL"];
    if (!url) { notify("No download link", "error"); return; }
    window.open(url, "_blank");
  };

  // ─────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────
  return (
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">🛤 Route Files</div>
        {!loading && <span className="badge">{results.length} results</span>}
      </div>

      {/* SEARCH */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="siw" style={{ flex: 1, position: "relative" }}>
            <span className="si-ic">🔍</span>
            <input
              className="si"
              style={{ paddingLeft: 42 }}
              autoFocus
              placeholder="Search any route, port, waypoint..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />

            {/* Suggestions */}
            {suggestions.length > 0 && q.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, zIndex: 999,
                background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 10, overflow: "hidden", marginTop: 4,
              }}>
                {suggestions.map((s, i) => (
                  <div key={i} onMouseDown={() => setQ(s)} style={{
                    padding: "10px 14px", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}>
                    🔎 {s}
                  </div>
                ))}
              </div>
            )}
          </div>

          {q && (
            <button className="btn btn-secondary" onClick={() => setQ("")}>✕</button>
          )}
        </div>
      </div>

      {/* QUICK FILTERS */}
      <div className="fbar" style={{ marginBottom: "1rem" }}>
        {["Mumbai", "Singapore", "Dubai", "Rotterdam", "Colombo", "Karachi", "Shanghai"].map((p) => (
          <button key={p} className={`fbtn ${q === p ? "active" : ""}`} onClick={() => setQ(p)}>
            {p}
          </button>
        ))}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="loading">
          <div className="spin" />
          <span>Loading route database...</span>
        </div>
      )}

      {/* EMPTY */}
      {!loading && searched && results.length === 0 && (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-t">No Routes Found</div>
          <div className="empty-d">Try another keyword</div>
        </div>
      )}

      {/* RESULTS */}
      {!loading && results.length > 0 && (
        <div className="files-grid">
          {results.map((r, i) => (
            <div key={i} className="file-card">
              <div className="file-icon">🛤</div>
              <div className="file-name">{getName(r)}</div>
              {getPort(r) && <div className="file-port">📍 {getPort(r)}</div>}
              <div className="file-tags">
                <span className="ftag tag-rtz">Route File</span>
                <span className="ftag" style={{ background: "rgba(0,212,255,0.06)", color: "var(--cyan)" }}>
                  Instant
                </span>
              </div>
              {user ? (
                <button className="dl-btn" onClick={() => handleDL(r)}>⬇ Download</button>
              ) : (
                <button className="login-req" onClick={() => setTab("login")}>🔐 Login to Download</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoutesPage;
