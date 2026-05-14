/* eslint-disable */
import { useState, useEffect } from "react";

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

// ── Pages ───────────────────────────────────────────────────────────────────
import HomePage from "./Pages/HomePage";
import RoutesPage from "./Pages/RoutesPage";
import ChartsPage from "./Pages/ChartsPage";
import RoutePlannerPage from "./Pages/RoutePlannerPage";
import LoginPage from "./Pages/LoginPage";
import AdminPage from "./Pages/AdminPage";
import NavModePage from "./Pages/NavModePage";
import PortSearchPage from "./Pages/PortSearchPage";
import MaritimeLibraryPage from "./Pages/MaritimeLibraryPage";

// ── Main App shell ──────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");
  const [searchQ, setSearchQ] = useState("");
  const [notif, setNotif] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const [routes, setRoutes] = useState([]);
  const [charts, setCharts] = useState([]);

  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sheetRoutes, setSheetRoutes] = useState([]);
  const [sheetCharts, setSheetCharts] = useState([]);
  const [sheetLoading, setSheetLoading] = useState(false);

  const [portsDb, setPortsDb] = useState(INITIAL_PORTS_DB);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const notify = (msg, type = "success") =>
    setNotif({ msg, type, key: Date.now() });

  const fetchSheets = () => {
    setSheetLoading(true);

    const ROUTE_TABS = ["Sheet1", "Routes", "Route", "Data", "Sheet2"];

    const fetchRouteSheet = () =>
      ROUTE_TABS.reduce(
        (chain, tab) =>
          chain.catch(() =>
            fetch(
              `https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/${tab}`
            ).then((r) => {
              if (!r.ok) throw new Error();
              return r.json();
            })
          ),
        Promise.reject()
      ).catch(() => []);

    Promise.all([
      fetchRouteSheet(),
      fetchChartSheet(),
      fetchPortsFromSheet(),
    ])
      .then(([d1, d2, d3]) => {
        setSheetRoutes(Array.isArray(d1) ? d1 : []);
        setSheetCharts(Array.isArray(d2) ? d2 : []);

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

          const seedMap = new Map(
            portsDb.map((p) => [p.id, p])
          );

          deduped.forEach((p) => {
            if (!seedMap.has(p.id)) seedMap.set(p.id, p);
            else seedMap.set(p.id, { ...seedMap.get(p.id), ...p });
          });

          const merged = [...seedMap.values()];

          // ✅ FIX: no mutation of constant anymore
          setPortsDb(merged);

          console.log(`Loaded ${merged.length} ports from sheet`);
        }
      })
      .catch((e) => console.log("Sheet fetch error", e))
      .finally(() => setSheetLoading(false));
  };

  useEffect(() => {
    fetchSheets();
  }, []);

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

  useEffect(() => {
    setLoading(false);
  }, []);

  const TABS = [
    { k: "home", i: "🏠", l: "Dashboard" },
    { k: "routes", i: "🛤", l: "Routes" },
    { k: "charts", i: "📊", l: "ECDIS Charts", cls: "gold" },
    { k: "planner", i: "🗺", l: "Route Planner", cls: "green" },
    { k: "navmode", i: "🧭", l: "Nav Mode", cls: "green" },
    { k: "ports", i: "⚓", l: "Ports Database" },
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

  const isPlannerFull = tab === "planner" || tab === "navmode";

  return (
    <>
      <style>{S}</style>

      {!authChecked && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "var(--bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999
        }}>
          <div style={{ textAlign: "center" }}>
            <div className="spin" style={{ width: 40, height: 40, margin: "0 auto 1rem" }} />
            <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.78rem", color: "var(--cyan)" }}>
              NAVISPHEREX
            </div>
          </div>
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

        {/* Pages */}
        {!loading && tab === "home" && (
          <HomePage routes={routes} charts={charts} onSearch={handleSearch} setTab={switchTab} user={user} portsDb={portsDb} />
        )}

        {!loading && tab === "routes" && (
          <RoutesPage searchQuery={searchQ} notify={notify} user={user} setTab={switchTab} />
        )}

        {!loading && tab === "charts" && (
          <ChartsPage notify={notify} user={user} setTab={switchTab} isAdmin={isAdmin} />
        )}

        {!loading && tab === "planner" && (
          <RoutePlannerPage notify={notify} sheetRoutes={[...routes, ...sheetRoutes]} portsDb={portsDb} />
        )}

        {!loading && tab === "ports" && (
          <PortSearchPage portsDb={portsDb} sheetLoading={sheetLoading} refreshSheets={fetchSheets} />
        )}

        {!loading && tab === "library" && (
          <MaritimeLibraryPage setTab={switchTab} />
        )}

        {!loading && tab === "navmode" && (
          <NavModePage notify={notify} sheetRoutes={[...routes, ...sheetRoutes]} portsDb={portsDb} setTab={switchTab} />
        )}

        {!loading && tab === "login" && (
          <LoginPage notify={notify} onLogin={(u, redirectTo) => {
            setUser(u);
            setTab(redirectTo || "home");
          }} />
        )}

        {notif && (
          <Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={() => setNotif(null)} />
        )}

        {tab !== "planner" && <Footer />}
      </div>
    </>
  );
}
