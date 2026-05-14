// ════════════════════════════════════════════════════════════════
// components/MapView.jsx
// To update: map tiles, markers, overlays, animation
// ════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from "react";
import { recalcWaypoints, greatCircle } from "../routing";
import { ECA_ZONES, SECA_ZONES, MARPOL_ZONES, PIRACY_ZONES, LAYOVER_ZONES } from "../constants";

export default function MapView({waypoints, setWaypoints, overlays, playing, setPlaying, speed, onMapClick, mapMode}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({ route:null, markers:[], zones:{}, ship:null, trail:null, baseTile:null, seamarkTile:null });
  const animRef = useRef(null);
  const animIdxRef = useRef(0);
  const animPtsRef = useRef([]);
  const [ready, setReady] = useState(false);

  const MAP_TILES = {
    night: { url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',               attr:'© OpenStreetMap © CARTO' },
    day:   { url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',    attr:'© OpenStreetMap © CARTO' },
    dusk:  { url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', attr:'© OpenStreetMap © CARTO', filter:'sepia(40%) saturate(70%) brightness(70%)' },
  };

  // Swap base tile when mapMode changes
  useEffect(() => {
    if (!ready || !window.L || !mapRef.current) return;
    const L = window.L; const lrs = layersRef.current;
    if (lrs.baseTile) lrs.baseTile.remove();
    const cfg = MAP_TILES[mapMode] || MAP_TILES.night;
    lrs.baseTile = L.tileLayer(cfg.url, { attribution:cfg.attr, subdomains:'abcd', maxZoom:19 }).addTo(mapRef.current);
    if (lrs.seamarkTile) lrs.seamarkTile.remove();
    lrs.seamarkTile = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { opacity:0.55, maxZoom:18 }).addTo(mapRef.current);
    if (containerRef.current) containerRef.current.style.filter = cfg.filter || 'none';
  }, [mapMode, ready]);

  const initMap = () => {
    if (mapRef.current || !containerRef.current) return;
    const L = window.L;
    mapRef.current = L.map(containerRef.current, { center:[15,70], zoom:3, preferCanvas:true, zoomControl:true });
    layersRef.current.baseTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:'© OpenStreetMap © CARTO', subdomains:'abcd', maxZoom:19
    }).addTo(mapRef.current);
    layersRef.current.seamarkTile = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { opacity:0.55, maxZoom:18 }).addTo(mapRef.current);
    mapRef.current.on('click', e => { onMapClick && onMapClick(e.latlng.lat, e.latlng.lng); });
    setReady(true);
  };

  useEffect(() => {
    if (window.L) { initMap(); return; }
    if (!document.getElementById('lcss')) {
      const c = document.createElement('link'); c.id = 'lcss'; c.rel = 'stylesheet';
      c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(c);
    }
    if (!document.getElementById('ljs')) {
      const s = document.createElement('script'); s.id = 'ljs';
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = initMap; document.head.appendChild(s);
    } else { window.L && initMap(); }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update route on map
  useEffect(() => {
    if (!ready || !window.L) return;
    const L = window.L; const map = mapRef.current; const lrs = layersRef.current;
    if (lrs.route) { lrs.route.remove(); lrs.route = null; }
    lrs.markers.forEach(m => m.remove()); lrs.markers = [];
    if (lrs.ship) { lrs.ship.remove(); lrs.ship = null; }
    if (waypoints.length === 0) return;
    const latlngs = waypoints.map(w => [w.lat, w.lon]);
    lrs.route = L.polyline(latlngs, { color:'#00B4D8', weight:2.5, opacity:0.9, dashArray:'8 4' }).addTo(map);

    waypoints.forEach((wp, i) => {
      const isFirst = i === 0, isLast = i === waypoints.length - 1;
      const color = isFirst ? '#00C896' : isLast ? '#FF4757' : '#00B4D8';
      const size = isFirst || isLast ? 14 : 9;
      const icon = L.divIcon({
        html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${size}px;height:${size}px;cursor:pointer;" title="WP${String(i+1).padStart(2,'00')}"></div>`,
        className:'', iconSize:[size,size], iconAnchor:[size/2,size/2]
      });
      const m = L.marker([wp.lat, wp.lon], { icon, draggable:true, zIndexOffset: i===0||i===waypoints.length-1 ? 100 : 0 });
      const popupHtml = `<div style="font-size:12px;min-width:130px;">
        <b style="color:#00B4D8">WP${String(i+1).padStart(2,'0')}${wp.name ? ` — ${wp.name}` : ''}</b><br/>
        Lat: ${wp.lat.toFixed(5)}°<br/>Lon: ${wp.lon.toFixed(5)}°
        ${i > 0 ? `<br/>Course: ${(wp.bearing||0).toFixed(1)}°<br/>Leg: ${(wp.distance||0).toFixed(1)} NM` : ''}
        ${wp.totalNM ? `<br/>Total: ${wp.totalNM.toFixed(1)} NM` : ''}
      </div>`;
      m.bindPopup(popupHtml);
      m.on('dragend', e => {
        const { lat, lng } = e.target.getLatLng();
        setWaypoints(wps => { const u = [...wps]; u[i] = {...u[i], lat, lon:lng}; return recalcWaypoints(u); });
      });
      m.addTo(map); lrs.markers.push(m);
    });
    if (waypoints.length > 1) map.fitBounds(lrs.route.getBounds(), { padding:[50,50] });
    const pts = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const seg = greatCircle(waypoints[i].lat, waypoints[i].lon, waypoints[i+1].lat, waypoints[i+1].lon, 30);
      pts.push(...(i > 0 ? seg.slice(1) : seg));
    }
    animPtsRef.current = pts;
    animIdxRef.current = 0;
  }, [waypoints, ready]);

  // Overlays
  useEffect(() => {
    if (!ready || !window.L) return;
    const L = window.L; const map = mapRef.current; const lrs = layersRef.current;
    Object.values(lrs.zones).forEach(l => l.remove()); lrs.zones = {};
    const cfg = {
      eca:     { zones:ECA_ZONES,     color:'#FF6B35', label:'ECA Area' },
      seca:    { zones:SECA_ZONES,    color:'#FFB347', label:'SECA Area' },
      marpol:  { zones:MARPOL_ZONES,  color:'#9B59B6', label:'MARPOL Area' },
      piracy:  { zones:PIRACY_ZONES,  color:'#E74C3C', label:'Piracy Area' },
      layover: { zones:LAYOVER_ZONES, color:'#3498DB', label:'Anchorage' },
    };
    Object.entries(cfg).forEach(([k, c]) => {
      if (!overlays[k]) return;
      const lg = L.layerGroup();
      c.zones.forEach(z => {
        L.polygon(z.coords.map(p => Array.isArray(p) ? p : [p[0], p[1]]),
          { color:c.color, fillColor:c.color, fillOpacity:0.18, weight:1.5, opacity:0.8 })
          .bindPopup(`<b>${z.name}</b><br/>${c.label}`).addTo(lg);
      });
      lg.addTo(map); lrs.zones[k] = lg;
    });
  }, [overlays, ready]);

  // Animation
  useEffect(() => {
    if (!ready || !window.L) return;
    if (animRef.current) { clearInterval(animRef.current); animRef.current = null; }
    if (!playing) {
      if (layersRef.current.ship) { layersRef.current.ship.remove(); layersRef.current.ship = null; }
      animIdxRef.current = 0; return;
    }
    const L = window.L; const map = mapRef.current; const pts = animPtsRef.current;
    if (pts.length < 2) return;
    const shipIcon = L.divIcon({ html:`<div style="font-size:22px;line-height:1;">🚢</div>`, className:'', iconSize:[24,24], iconAnchor:[12,12] });
    if (!layersRef.current.ship) layersRef.current.ship = L.marker(pts[0], { icon:shipIcon, zIndexOffset:500 }).addTo(map);
    let idx = animIdxRef.current;
    const ms = Math.max(30, 1500 / Math.max(1, speed));
    animRef.current = setInterval(() => {
      if (idx >= pts.length) { clearInterval(animRef.current); setPlaying(false); animIdxRef.current = 0; return; }
      layersRef.current.ship && layersRef.current.ship.setLatLng(pts[idx]);
      idx++; animIdxRef.current = idx;
    }, ms);
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, [playing, speed, ready]);

  const activeOverlays = Object.entries(overlays).filter(([, v]) => v);
  const legendColors = { eca:'#FF6B35', seca:'#FFB347', marpol:'#9B59B6', piracy:'#E74C3C', layover:'#3498DB' };
  const legendNames  = { eca:'ECA', seca:'SECA', marpol:'MARPOL', piracy:'Piracy', layover:'Anchorage' };

  return (
    <div className="planner-map">
      <div ref={containerRef} style={{ width:'100%', height:'100%', minHeight:400 }} />
      {!ready && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg2)', zIndex:10 }}>
          <div className="loading"><div className="spin" /><span>Loading nautical map…</span></div>
        </div>
      )}
      {activeOverlays.length > 0 && (
        <div className="map-legend">
          {activeOverlays.map(([k]) => (
            <div key={k} className="leg-item">
              <div className="leg-dot" style={{ background:legendColors[k] }} />
              <span style={{ color:'var(--text2)' }}>{legendNames[k]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
