import { useState, useEffect } from "react";
import RouteMap from "./RouteMap";
import Disclaimer from "./components/Disclaimer";
import Footer from "./components/Footer";
import { extractFileId, convertToDirectDownload } from "./utils/routeUtils";
import { generateSmartRoute } from "./utils/routeGenerator";

export default function App() {
  const [routes, setRoutes] = useState([]);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generatedRoute, setGeneratedRoute] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("routes") || "[]");
    setRoutes(stored);
  }, []);

  const addRoute = (link) => {
    const fileId = extractFileId(link);

    const newRoute = {
      id: Date.now(),
      downloadUrl: convertToDirectDownload(fileId),
      originalLink: link,
    };

    const updated = [...routes, newRoute];
    setRoutes(updated);
    localStorage.setItem("routes", JSON.stringify(updated));
  };

  const filtered = routes.filter((r) =>
    r.originalLink.toLowerCase().includes(query.toLowerCase())
  );

  const handleGenerate = () => {
    const ports = {
      mumbai: { lat: 19.076, lon: 72.8777 },
      singapore: { lat: 1.3521, lon: 103.8198 },
    };

    const start = ports[from.toLowerCase()];
    const end = ports[to.toLowerCase()];

    if (!start || !end) {
      alert("Port not found");
      return;
    }

    setGeneratedRoute(generateSmartRoute(start, end));
  };

  return (
    <div style={{ background: "#0b1e2d", color: "#00eaff", padding: "10px" }}>
      <h2>ECDIS ROUTE FINDER ⚓</h2>

      <input
        placeholder="Paste Google Drive link"
        onKeyDown={(e) => {
          if (e.key === "Enter") addRoute(e.target.value);
        }}
      />

      <input
        placeholder="Search route"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {filtered.map((r) => (
        <button key={r.id} onClick={() => window.open(r.downloadUrl)}>
          Download Route
        </button>
      ))}

      <h3>Auto Route Generator</h3>

      <input
        placeholder="From"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />

      <input
        placeholder="To"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />

      <button onClick={handleGenerate}>Generate</button>

      <RouteMap waypoints={generatedRoute} />

      <Disclaimer />
      <Footer />
    </div>
  );
}
