import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function App() {
  const [routes, setRoutes] = useState([]);
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generatedRoute, setGeneratedRoute] = useState([]);

  // LOAD SAVED ROUTES
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("routes") || "[]");
    setRoutes(stored);
  }, []);

  // EXTRACT GOOGLE FILE ID
  const extractFileId = (url) => {
    const match = url.match(/\/d\/(.*?)\//);
    return match ? match[1] : null;
  };

  // CONVERT TO DIRECT DOWNLOAD
  const convertToDirectDownload = (fileId) => {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  };

  // ADD ROUTE (ADMIN)
  const addRoute = (link) => {
    const fileId = extractFileId(link);
    if (!fileId) {
      alert("Invalid Google Drive link");
      return;
    }

    const newRoute = {
      id: Date.now(),
      downloadUrl: convertToDirectDownload(fileId),
      originalLink: link,
    };

    const updated = [...routes, newRoute];
    setRoutes(updated);
    localStorage.setItem("routes", JSON.stringify(updated));
  };

  // SEARCH FILTER
  const filtered = routes.filter((r) =>
    r.originalLink.toLowerCase().includes(query.toLowerCase())
  );

  // SIMPLE ROUTE GENERATOR
  const generateRoute = (start, end) => {
    const waypoints = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const lat =
        start.lat + ((end.lat - start.lat) * i) / steps;

      const lon =
        start.lon + ((end.lon - start.lon) * i) / steps;

      waypoints.push({ lat, lon });
    }

    return waypoints;
  };

  // GENERATE ROUTE BUTTON
  const handleGenerate = () => {
    const ports = {
      mumbai: { lat: 19.076, lon: 72.8777 },
      singapore: { lat: 1.3521, lon: 103.8198 },
      dubai: { lat: 25.2048, lon: 55.2708 },
    };

    const start = ports[from.toLowerCase()];
    const end = ports[to.toLowerCase()];

    if (!start || !end) {
      alert("Port not found");
      return;
    }

    setGeneratedRoute(generateRoute(start, end));
  };

  return (
    <div style={{ background: "#0b1e2d", color: "#00eaff", padding: "10px" }}>
      
      <h1>NEW VERSION WORKING ⚓</h1>

      <h2>ECDIS ROUTE FINDER</h2>

      {/* ADMIN INPUT */}
      <input
        placeholder="Paste Google Drive link and press Enter"
        onKeyDown={(e) => {
          if (e.key === "Enter") addRoute(e.target.value);
        }}
      />

      {/* SEARCH */}
      <input
        placeholder="Search route"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {/* DOWNLOAD LIST */}
      {filtered.map((r) => (
        <div key={r.id}>
          <button onClick={() => window.open(r.downloadUrl)}>
            Download Route
          </button>
        </div>
      ))}

      <hr />

      {/* ROUTE GENERATOR */}
      <h3>Auto Route Generator</h3>

      <input
        placeholder="From (Mumbai)"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />

      <input
        placeholder="To (Singapore)"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />

      <button onClick={handleGenerate}>Generate Route</button>

      {/* MAP */}
      <MapContainer
        center={[20, 70]}
        zoom={4}
        style={{ height: "400px", width: "100%", marginTop: "10px" }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {generatedRoute.length > 0 && (
          <Polyline
            positions={generatedRoute.map((p) => [p.lat, p.lon])}
            color="cyan"
          />
        )}
      </MapContainer>

      {/* DISCLAIMER */}
      <div style={{ color: "orange", marginTop: "10px" }}>
        ⚠️ WARNING: This is a rough route for planning only.
        Not for official navigation. Always verify before use.
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        MANISH BHARTI <br />
        @manish_the_navigator <br />
        Follow for more maritime updates ⚓
      </div>
    </div>
  );
}
