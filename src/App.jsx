/* eslint-disable */
import { useState, useEffect, lazy, Suspense } from "react";

// ── Firebase ────────────────────────────────────────────────────────────────
import { auth, db } from "./firebase";
import {
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// ── Constants ───────────────────────────────────────────────────────────────
import { ADMIN_EMAIL, PORTS_DB as INITIAL_PORTS_DB } from "./constants";

// ── Sheets / API helpers ────────────────────────────────────────────────────
import { fetchChartSheet, fetchPortsFromSheet } from "./sheets";

// ── Utilities ───────────────────────────────────────────────────────────────
import { normalizePortRow } from "./utils";

// ── Styles ──────────────────────────────────────────────────────────────────
import { S } from "./styles";

// ── Shared UI components ────────────────────────────────────────────────────
import Notif from "./components/Notif";
import Footer from "./components/Footer";

// ── Pages — LAZY LOADED (only downloads when user visits that tab) ───────────
const HomePage          = lazy(() => import("./Pages/HomePage"));
const RoutesPage        = lazy(() => import("./Pages/RoutesPage"));
const ChartsPage        = lazy(() => import("./Pages/ChartsPage"));
const RoutePlannerPage  = lazy(() => import("./Pages/RoutePlannerPage"));
const LoginPage         = lazy(() => import("./Pages/LoginPage"));
const AdminPage         = lazy(() => import("./Pages/AdminPage"));
const NavModePage       = lazy(() => import("./Pages/NavModePage"));
const PortSearchPage    = lazy(() => import("./Pages/PortSearchPage"));
const MaritimeLibraryPage = lazy(() => import("./Pages/MaritimeLibraryPage"));

// ── Cache helpers ────────────────────────────────────────────────────────────
const CACHE_KEY = "navispherex_sheet_cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return cached;
  } catch {
    return null;
  }
};

const saveCache = (routes, charts, ports) => {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ routes, charts, ports, ts: Date.now() })
    );
  } catch {}
};

// ── Route sheet config ───────────────────────────────────────────────────────
const ROUTE_SHEET_ID = "1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE";
const ROUTE_TABS = ["Sheet1", "Routes", "Route", "Data", "Sheet2"];

// ── Suspense fallback spinner ────────────────────────────────────────────────
const PageLoader = () => (
  <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "60vh"
  }}>
    <div className="spin" style={{ width: 36, height: 36 }} />
  </div>
);

// ── Main App shell ───────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]               = useState("home");
  const [searchQ, setSearchQ]       = useState("");
  const [notif, setNotif]           = useState(null);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [user, setUser]             = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isBlocked, setIsBlocked]   = useState(false);

  const [routes, setRoutes]         = useState([]);
  const [charts, setCharts]         = useState([]);

  const [authChecked, setAuthChecked] = useState(false);

  const [sheetRoutes, setSheetRoutes]   = useState([]);
  const [sheetCharts, setSheetCharts]   = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  const [portsDb, setPortsDb] = useState(INITIAL_PORTS_DB);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const notify = (msg, type = "success") =>
    setNotif({ msg, type, key: Date.now() });

  // ── FIX: Promise.any — all tabs fetched in parallel, first success wins ──
  const fetchRouteSheet = () => {
    const attempts = ROUTE_TABS.map((tabName) =>
      fetch(`https://opensheet.elk.sh/${ROUTE_SHEET_ID}/${tabName}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((d) => (Array.isArray(d) && d.length > 0 ? d : Promise.reject()))
    );
    return Promise.any(attempts).catch(() => []);
  };

  const fetchSheets = () => {
    setSheetLoading(true);

    Promise.all([
      fetchRouteSheet(),
      fetchChartSheet(),
      fetchPortsFromSheet(),
    ])
      .then(([d1, d2, d3]) => {
        const routeData = Array.isArray(d1) ? d1 : [];
        const chartData = Array.isArray(d2) ? d2 : [];

        setSheetRoutes(routeData);
        setSheetCharts(chartData);

        let mergedPorts = portsDb;

        if (Array.isArray(d3) && d3.length > 0) {
          const normalized = d3.map(normalizePortRow).filter(Boolean);

          const seen = new Set();
          const deduped = [];
          normalized.forEach((p) => {
            const key = `${p.name?.toLowerCase()}-${p.country?.toLowerCase()}`;
            if (!seen.has(key) && p.lat && p.lon) {
              seen.add(key);
              deduped.push(p);
            }
          });

          const seedMap = new Map(portsDb.map((p) => [p.id, p]));
          deduped.forEach((p) => {
            if (!seedMap.has(p.id)) seedMap.set(p.id, p);
            else seedMap.set(p.id, { ...seedMap.get(p.id), ...p });
          });

          mergedPorts = [...seedMap.values()];
          setPortsDb(mergedPorts);
          console.log(`✅ Loaded ${mergedPorts.length} ports from sheet`);
        }

        // ── Save to localStorage cache ──
        saveCache(routeData, chartData, mergedPorts);
      })
      .catch((e) => console.log("Sheet fetch error", e))
      .finally(() => setSheetLoading(false));
  };

  // ── FIX: Check localStorage cache first — skip network if fresh ──────────
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      console.log("⚡ Loaded sheet data from cache");
      setSheetRoutes(cached.routes || []);
      setSheetCharts(cached.charts || []);
      if (cached.ports?.length > 0) setPortsDb(cached.ports);
      return; // Skip network fetch entirely
    }
    fetchSheets();
  }, []);

  // ── Auth listener ────────────────────────────────────────────────────────
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (u) {
        try {
          const snap = await getDoc(doc(db, "users", u.uid));
          if (snap.exists()) {
            const profile = { id: snap.id, ...snap.data() };
            if (profile.blocked) {
              setIsBlocked(true);
              await signOut(auth);
              setUser(null);
              setUserProfile(null);
              setAuthChecked(true);
              return;
            }
            setIsBlocked(false);
            setUserProfile(profile);
          } else {
            setIsBlocked(false);
            setUserProfile(null);
          }
        } catch {
          setUserProfile(null);
          setIsBlocked(false);
        }
      } else {
        setUserProfile(null);
      }

      setAuthChecked(true);
    });

    return () => unsub();
  }, []);

  const TABS = [
    { k: "home",    i: "🏠", l: "Dashboard" },
    { k: "routes",  i: "🛤", l: "Routes" },
    { k: "charts",  i: "📊", l: "ECDIS Charts",  cls: "gold" },
    { k: "planner", i: "🗺", l: "Route Planner", cls: "green" },
    { k: "navmode", i: "🧭", l: "Nav Mode",       cls: "green" },
    { k: "ports",   i: "⚓", l: "Ports Database" },
    { k: "library", i: "📖", l: "Maritime Library" },
    ...(isAdmin ? [{ k: "admin", i: "🛡", l: "Admin" }] : []),
  ];

  const handleSearch = (q) => {
    setSearchQ(q);
    setTab("routes");
    setMenuOpen(false);
  };

  const switchTab = (k) => {
    if (!user && k !== "home" && k !== "login") {
      setTab("login");
      setMenuOpen(false);
      sessionStorage.setItem("intendedTab", k);
      return;
    }
    setTab(k);
    setMenuOpen(false);
  };

  return (
    <>
      <style>{S}</style>

      {/* ── FIX: Small non-blocking auth indicator instead of full-screen blocker ── */}
      {!authChecked && (
        <div style={{
          position: "fixed", top: 12, right: 12, zIndex: 9999,
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--bg)", border: "1px solid var(--cyan)",
          borderRadius: 8, padding: "6px 12px",
        }}>
          <div className="spin" style={{ width: 14, height: 14 }} />
          <span style={{
            fontFamily: "Orbitron,monospace",
            fontSize: "0.65rem",
            color: "var(--cyan)",
          }}>
            CONNECTING
          </span>
        </div>
      )}

      <div className="grid-bg" />
      <div className="app">

        {/* NAV */}
        <nav className="nav">
          <div className="nav-brand" onClick={() => switchTab("home")}>
            <div className="nav-logo">🧭</div>
            <div>
              <div className="nav-title">NAVISPHEREX</div>
              <div className="nav-sub">MARINE</div>
            </div>
          </div>

          <div className="nav-tabs">
            {TABS.map((t) => (
              <button
                key={t.k}
                className={`ntab ${t.cls || ""} ${tab === t.k ? "active" : ""}`}
                onClick={() => switchTab(t.k)}
              >
                {t.i} {t.l}
              </button>
            ))}
          </div>
        </nav>

        {/* ── FIX: Suspense wraps all pages — only loads JS for active page ── */}
        <Suspense fallback={<PageLoader />}>
          {tab === "home" && (
            <HomePage
              routes={routes}
              charts={charts}
              onSearch={handleSearch}
              setTab={switchTab}
              user={user}
              portsDb={portsDb}
            />
          )}
          {tab === "routes" && (
            <RoutesPage
              searchQuery={searchQ}
              notify={notify}
              user={user}
              setTab={switchTab}
            />
          )}
          {tab === "charts" && (
            <ChartsPage
              notify={notify}
              user={user}
              setTab={switchTab}
              isAdmin={isAdmin}
            />
          )}
          {tab === "planner" && (
            <RoutePlannerPage
              notify={notify}
              sheetRoutes={[...routes, ...sheetRoutes]}
              portsDb={portsDb}
            />
          )}
          {tab === "ports" && (
            <PortSearchPage
              portsDb={portsDb}
              sheetLoading={sheetLoading}
              refreshSheets={fetchSheets}
            />
          )}
          {tab === "library" && (
            <MaritimeLibraryPage setTab={switchTab} />
          )}
          {tab === "navmode" && (
            <NavModePage
              notify={notify}
              sheetRoutes={[...routes, ...sheetRoutes]}
              portsDb={portsDb}
              setTab={switchTab}
            />
          )}
          {tab === "login" && (
            <LoginPage
              notify={notify}
              onLogin={(u, redirectTo) => {
                setUser(u);
                setTab(redirectTo || "home");
              }}
            />
          )}
          {tab === "admin" && isAdmin && (
            <AdminPage notify={notify} user={user} />
          )}
        </Suspense>

        {notif && (
          <Notif
            key={notif.key}
            msg={notif.msg}
            type={notif.type}
            onClose={() => setNotif(null)}
          />
        )}

        {tab !== "planner" && <Footer />}
      </div>
    </>
  );
}
