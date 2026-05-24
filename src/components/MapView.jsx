/* eslint-disable */
// src/components/MapView.jsx
import { useEffect, useRef, useState } from "react";
import { ECA_ZONES, SECA_ZONES, MARPOL_ZONES, PIRACY_ZONES, LAYOVER_ZONES } from "../constants";
import { recalcWaypoints } from "../utils";

function greatCircle(lat1, lon1, lat2, lon2, n) {
  const DEG = Math.PI / 180;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const d = 2*Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if (d === 0) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1-f)*d)/Math.sin(d), B = Math.sin(f*d)/Math.sin(d);
    const x = A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y = A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z = A*Math.sin(lat1*DEG)+B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z,Math.sqrt(x*x+y*y))/DEG, Math.atan2(y,x)/DEG]);
  }
  return pts;
}

function MapView({
  waypoints, setWaypoints, overlays, playing, setPlaying, speed, onMapClick, mapMode,
  checkHighlights = [],
  manualWaypoints = [],
  setManualWaypoints = null,
}) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const layersRef = useRef({
    route: null, markers: [], zones: {}, ship: null, trail: null,
    baseTile: null, seamarkTile: null, gebcoTile: null,
    emodnetTile: null, encTile: null,
    legLabels: [], checkLayer: null, manualRoute: null, manualMarkers: [],
  });
  const animRef    = useRef(null);
  const animIdxRef = useRef(0);
  const animPtsRef = useRef([]);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  const setManualWaypointsRef = useRef(setManualWaypoints);
  useEffect(() => { setManualWaypointsRef.current = setManualWaypoints; }, [setManualWaypoints]);

  const [ready, setReady] = useState(false);

  const MAP_TILES = {
    night: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',              attr: '© OpenStreetMap © CARTO' },
    day:   { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',   attr: '© OpenStreetMap © CARTO' },
    dusk:  { url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', attr: '© OpenStreetMap © CARTO', filter: 'sepia(40%) saturate(70%) brightness(70%)' },
  };

  useEffect(() => {
    if (!ready || !window.L || !mapRef.current) return;
    const L = window.L, map = mapRef.current, lrs = layersRef.current;
    if (lrs.baseTile)    { lrs.baseTile.remove();    lrs.baseTile    = null; }
    if (lrs.seamarkTile) { lrs.seamarkTile.remove(); lrs.seamarkTile = null; }
    if (lrs.gebcoTile)   { lrs.gebcoTile.remove();   lrs.gebcoTile   = null; }
    if (lrs.emodnetTile) { lrs.emodnetTile.remove(); lrs.emodnetTile = null; }
    if (lrs.encTile)     { lrs.encTile.remove();     lrs.encTile     = null; }
    if (overlays?.gebco) {
      lrs.baseTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19 }).addTo(map);
      if (containerRef.current) containerRef.current.style.filter = 'none';
      lrs.emodnetTile = L.tileLayer('https://tiles.emodnet-bathymetry.eu/2020/baselayer/{z}/{x}/{y}.png',
        { attribution: '© EMODnet Bathymetry', maxZoom: 11, opacity: 0.55,
          errorTileUrl: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }).addTo(map);
      lrs.gebcoTile = L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 18, attribution: 'Tiles © Esri — GEBCO, NOAA', opacity: 1.0 }).addTo(map);
      lrs.encTile = L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer',
        { layers:'0,1,2,3,4,5,6,7', format:'image/png', transparent:true, version:'1.3.0',
          attribution:'© NOAA ENC Online', opacity:0.85, maxZoom:18 }).addTo(map);
    } else {
      const cfg = MAP_TILES[mapMode] || MAP_TILES.night;
      lrs.baseTile = L.tileLayer(cfg.url, { attribution: cfg.attr, subdomains:'abcd', maxZoom:19 }).addTo(map);
      if (containerRef.current) containerRef.current.style.filter = cfg.filter || 'none';
    }
    const seamarkOpacity = overlays?.gebco ? 0.85 : 0.55;
    lrs.seamarkTile = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      { opacity: seamarkOpacity, maxZoom: 18 }).addTo(map);
  }, [mapMode, ready, overlays?.gebco]);

  const initMap = () => {
    if (mapRef.current || !containerRef.current) return;
    const L = window.L;
    mapRef.current = L.map(containerRef.current, {
      center: [15, 70], zoom: 3, preferCanvas: true, zoomControl: true,
      tap: true, tapTolerance: 15,
      worldCopyJump: true, // FIX: prevents double-earth rendering on trans-pacific routes
    });
    layersRef.current.baseTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CARTO', subdomains:'abcd', maxZoom:19 }).addTo(mapRef.current);
    layersRef.current.seamarkTile = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
      { opacity:0.55, maxZoom:18 }).addTo(mapRef.current);

    mapRef.current.on('click', e => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    setReady(true);
    [100, 300, 600, 1200].forEach(t => setTimeout(() => {
      try { mapRef.current?.invalidateSize({ animate: false }); } catch {}
    }, t));
  };

  useEffect(() => {
    if (window.L) { initMap(); return; }
    if (!document.getElementById('lcss')) {
      const c = document.createElement('link'); c.id='lcss'; c.rel='stylesheet';
      c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(c);
    }
    if (!document.getElementById('ljs')) {
      const s = document.createElement('script'); s.id='ljs';
      s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload=initMap; document.head.appendChild(s);
    } else {
      if (window.L) { initMap(); }
      else {
        const retry = setInterval(() => { if (window.L) { clearInterval(retry); initMap(); } }, 50);
        setTimeout(() => clearInterval(retry), 5000);
      }
    }
    return () => {
      if (animRef.current) clearInterval(animRef.current);
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      layersRef.current = {
        route:null, markers:[], zones:{}, ship:null, trail:null,
        baseTile:null, seamarkTile:null, gebcoTile:null, emodnetTile:null, encTile:null,
        legLabels:[], checkLayer:null, manualRoute:null, manualMarkers:[],
      };
    };
  }, []);

  // ── Auto-route waypoints + leg labels ─────────────────────────────────────
  useEffect(() => {
    if (!ready || !window.L) return;
    const L = window.L, map = mapRef.current, lrs = layersRef.current;
    if (lrs.route)  { lrs.route.remove();  lrs.route  = null; }
    lrs.markers.forEach(m => m.remove());  lrs.markers  = [];
    if (lrs.ship)   { lrs.ship.remove();   lrs.ship   = null; }
    lrs.legLabels.forEach(l => l.remove()); lrs.legLabels = [];
    if (waypoints.length === 0) return;

    // FIX: Normalize longitudes to prevent antimeridian double-earth bug
    // Ensures trans-pacific routes (e.g. Ecuador → China) render on one earth copy
    const norm = [waypoints[0]];
for (let i = 1; i < waypoints.length; i++) {
  let lon = waypoints[i].lon;
  while (lon - norm[i-1].lon >  180) lon -= 360;
  while (lon - norm[i-1].lon < -180) lon += 360;
  norm.push({ ...waypoints[i], lon });
}

    const latlngs = norm.map(w => [w.lat, w.lon]);
    lrs.route = L.polyline(latlngs, { color:'#00B4D8', weight:2.5, opacity:0.9, dashArray:'8 4', noClip:true }).addTo(map);

    norm.forEach((wp, i) => {
      const isFirst = i===0, isLast = i===norm.length-1;
      const color = isFirst?'#00C896':isLast?'#FF4757':'#00B4D8';
      const size  = isFirst||isLast?14:9;
      const icon  = L.divIcon({
        html:`<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${size}px;height:${size}px;cursor:pointer;"></div>`,
        className:'', iconSize:[size,size], iconAnchor:[size/2,size/2],
      });
      const m = L.marker([wp.lat,wp.lon], { icon, draggable:true, zIndexOffset:isFirst||isLast?100:0 });
      m.bindPopup(`<div style="font-size:12px;min-width:130px;"><b style="color:#00B4D8">WP${String(i+1).padStart(2,'0')}${wp.name?` — ${wp.name}`:''}</b><br/>Lat: ${wp.lat.toFixed(5)}°<br/>Lon: ${wp.lon.toFixed(5)}°${i>0?`<br/>Course: ${(wp.bearing||0).toFixed(1)}°<br/>Leg: ${(wp.distance||0).toFixed(1)} NM`:''}${wp.totalNM?`<br/>Total: ${wp.totalNM.toFixed(1)} NM`:''}</div>`);
      m.on('dragend', e => {
        const { lat, lng } = e.target.getLatLng();
        setWaypoints(wps => { const u=[...wps]; u[i]={...u[i],lat,lon:lng}; return recalcWaypoints(u); });
      });
      m.addTo(map); lrs.markers.push(m);
    });

    if (norm.length > 1) map.fitBounds(lrs.route.getBounds(), { padding:[50,50] });

    // Leg course/distance labels
    norm.forEach((wp, i) => {
      if (i===0) return;
      const prev=norm[i-1], midLat=(prev.lat+wp.lat)/2, midLon=(prev.lon+wp.lon)/2;
      const lbl = L.marker([midLat,midLon], {
        icon: L.divIcon({
          html:`<div style="transform:translate(-50%,-50%);background:rgba(0,0,0,0.82);border:1px solid rgba(0,180,216,0.45);border-radius:4px;padding:2px 7px;white-space:nowrap;pointer-events:none;"><span style="font-family:Orbitron,monospace;font-size:9.5px;color:#00B4D8;">&#9658; ${(wp.bearing||0).toFixed(0)}&deg;</span><span style="font-family:monospace;font-size:9.5px;color:#FFD700;margin-left:5px;">${(wp.distance||0).toFixed(1)}NM</span></div>`,
          className:'', iconSize:[0,0], iconAnchor:[0,0],
        }),
        interactive:false, zIndexOffset:-200,
      });
      lbl.addTo(map); lrs.legLabels.push(lbl);
    });

    const pts=[];
    for (let i=0; i<norm.length-1; i++) {
      const seg=greatCircle(norm[i].lat,norm[i].lon,norm[i+1].lat,norm[i+1].lon,30);
      pts.push(...(i>0?seg.slice(1):seg));
    }
    animPtsRef.current=pts; animIdxRef.current=0;
  }, [waypoints, ready]);

  useEffect(() => {
    if (!ready || !window.L) return;
    const L=window.L, map=mapRef.current, lrs=layersRef.current;
    Object.values(lrs.zones).forEach(l=>l.remove()); lrs.zones={};
    const cfg={
      eca:    {zones:ECA_ZONES,    color:'#FF6B35',label:'ECA Area'   },
      seca:   {zones:SECA_ZONES,   color:'#FFB347',label:'SECA Area'  },
      marpol: {zones:MARPOL_ZONES, color:'#9B59B6',label:'MARPOL Area'},
      piracy: {zones:PIRACY_ZONES, color:'#E74C3C',label:'Piracy Area'},
      layover:{zones:LAYOVER_ZONES,color:'#3498DB',label:'Anchorage'  },
    };
    Object.entries(cfg).forEach(([k,c]) => {
      if (!overlays?.[k]) return;
      const lg=L.layerGroup();
      c.zones.forEach(z => {
        L.polygon(z.coords.map(p=>Array.isArray(p)?p:[p[0],p[1]]),
          {color:c.color,fillColor:c.color,fillOpacity:0.18,weight:1.5,opacity:0.8})
          .bindPopup(`<b>${z.name}</b><br/>${c.label}`).addTo(lg);
      });
      lg.addTo(map); lrs.zones[k]=lg;
    });
  }, [overlays, ready]);

  useEffect(() => {
    if (!ready || !window.L) return;
    if (animRef.current) { clearInterval(animRef.current); animRef.current=null; }
    if (!playing) { if (layersRef.current.ship) { layersRef.current.ship.remove(); layersRef.current.ship=null; } animIdxRef.current=0; return; }
    const L=window.L, map=mapRef.current, pts=animPtsRef.current;
    if (pts.length<2) return;
    const shipIcon=L.divIcon({html:`<div style="font-size:22px;line-height:1;">🚢</div>`,className:'',iconSize:[24,24],iconAnchor:[12,12]});
    if (!layersRef.current.ship) layersRef.current.ship=L.marker(pts[0],{icon:shipIcon,zIndexOffset:500}).addTo(map);
    let idx=animIdxRef.current;
    const ms=Math.max(30,1500/Math.max(1,speed));
    animRef.current=setInterval(()=>{
      if (idx>=pts.length) { clearInterval(animRef.current); setPlaying(false); animIdxRef.current=0; return; }
      layersRef.current.ship&&layersRef.current.ship.setLatLng(pts[idx]);
      idx++; animIdxRef.current=idx;
    },ms);
    return ()=>{ if (animRef.current) clearInterval(animRef.current); };
  }, [playing, speed, ready]);

  useEffect(() => {
    if (!ready||!window.L||!mapRef.current) return;
    const map=mapRef.current, L=window.L;
    const handleDepthClick = async e => {
      const popup=L.popup({closeOnClick:false,autoClose:false}).setLatLng(e.latlng)
        .setContent('<div style="font-size:12px;padding:2px 4px">⏳ Fetching depth…</div>').openOn(map);
      try {
        const res=await fetch(`https://api.opentopodata.org/v1/gebco2020?locations=${e.latlng.lat},${e.latlng.lng}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data=await res.json();
        const elev=data?.results?.[0]?.elevation;
        if (elev===undefined||elev===null) throw new Error('No data returned');
        const isOcean=elev<=0;
        const label=isOcean?`🌊 Depth: <b style="color:#00B4D8">${Math.abs(elev).toFixed(0)} m</b>`:`⛰ Elevation: <b style="color:#00C896">${elev.toFixed(0)} m</b>`;
        popup.setContent(`<div style="font-size:12px;min-width:170px;line-height:1.7">${label}<br/><span style="color:#888;font-size:11px">${e.latlng.lat.toFixed(5)}°N&nbsp;&nbsp;${e.latlng.lng.toFixed(5)}°E</span><br/><span style="color:#555;font-size:10px">Source: GEBCO 2020</span></div>`);
      } catch (err) {
        popup.setContent(`<div style="font-size:12px;color:#ff6b6b;min-width:140px">⚠ Depth unavailable<br/><span style="font-size:10px;color:#aaa">${err.message}</span></div>`);
      }
    };
    if (overlays?.depthClick) map.on('click', handleDepthClick);
    return () => map.off('click', handleDepthClick);
  }, [overlays?.depthClick, ready]);

  // ── Route-check highlight overlay ────────────────────────────────────────
  useEffect(() => {
    if (!ready||!window.L) return;
    const L=window.L, map=mapRef.current, lrs=layersRef.current;
    if (lrs.checkLayer) { lrs.checkLayer.remove(); lrs.checkLayer=null; }
    if (!checkHighlights||checkHighlights.length===0) return;
    const lg=L.layerGroup();
    checkHighlights.forEach(h => {
      if (h.type==='segment'&&h.fromLat!==undefined) {
        L.polyline([[h.fromLat,h.fromLon],[h.toLat,h.toLon]],
          {color:h.color||'#E74C3C',weight:7,opacity:0.78,dashArray:'10 5'})
          .bindPopup(`<div style="font-size:12px;max-width:220px;">${h.severity==='error'?'🚫':'⚠️'} ${h.message}</div>`)
          .addTo(lg);
      }
      if (h.type==='point'&&h.lat!==undefined) {
        L.circleMarker([h.lat,h.lon],{radius:11,color:h.color||'#E74C3C',weight:3,fillColor:h.color||'#E74C3C',fillOpacity:0.25})
          .bindPopup(`<div style="font-size:12px;max-width:220px;">${h.severity==='error'?'🚫':'⚠️'} ${h.message}</div>`)
          .addTo(lg);
      }
    });
    lg.addTo(map); lrs.checkLayer=lg;
  }, [checkHighlights, ready]);

  // ── Manual route — green dashed line + interactive markers ───────────────
  useEffect(() => {
    if (!ready||!window.L) return;
    const L=window.L, map=mapRef.current, lrs=layersRef.current;
    if (lrs.manualRoute) { lrs.manualRoute.remove(); lrs.manualRoute=null; }
    lrs.manualMarkers.forEach(m=>m.remove()); lrs.manualMarkers=[];
    if (!manualWaypoints||manualWaypoints.length===0) return;

    lrs.manualRoute=L.polyline(manualWaypoints.map(w=>[w.lat,w.lon]),
      {color:'#00C896',weight:2.5,opacity:0.9,dashArray:'6 3'}).addTo(map);

    manualWaypoints.forEach((wp, i) => {
      const isFirst=i===0, isLast=i===manualWaypoints.length-1;
      const color=isFirst?'#00C896':isLast?'#FF4757':'#FFD700';
      const sz=(isFirst||isLast)?14:9;
      const icon=L.divIcon({
        html:`<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${sz}px;height:${sz}px;cursor:pointer;box-shadow:0 0 5px rgba(0,0,0,0.6);"></div>`,
        className:'', iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
      });
      const m=L.marker([wp.lat,wp.lon], {icon, draggable:true, zIndexOffset:50});

      const popupEl=document.createElement('div');
      popupEl.style.cssText='font-size:12px;min-width:170px;';
      popupEl.innerHTML=`
        <b style="color:#00C896">&#9998; WP${String(i+1).padStart(2,'0')}</b>
        <input id="mn-name-${i}" value="${(wp.name||'').replace(/"/g,'&quot;')}" placeholder="Enter WP name…"
          style="display:block;width:100%;margin:5px 0 3px;padding:4px 6px;background:#111827;border:1px solid #374151;color:#f9fafb;border-radius:5px;font-size:11px;box-sizing:border-box;"/>
        <div style="font-size:10px;color:#6b7280;margin-bottom:2px;">
          ${wp.lat.toFixed(5)}°&nbsp;&nbsp;${wp.lon.toFixed(5)}°
          ${i>0?`&nbsp;|&nbsp;${(wp.bearing||0).toFixed(1)}&deg;&nbsp;${(wp.distance||0).toFixed(1)}NM`:''}
        </div>
        <div style="display:flex;gap:5px;margin-top:6px;">
          <button id="mn-save-${i}" style="flex:1;padding:4px 0;background:#00C896;color:#000;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;">&#128190; Save Name</button>
          <button id="mn-del-${i}"  style="padding:4px 10px;background:#ef4444;color:#fff;border:none;border-radius:5px;font-size:11px;font-weight:700;cursor:pointer;">&#10005;</button>
        </div>
        <div style="margin-top:5px;font-size:9px;color:#6b7280;text-align:center;">Drag marker to move &bull; tap map to add more</div>`;

      m.bindPopup(popupEl, {maxWidth:240});

      m.on('popupopen', () => {
        const saveBtn=document.getElementById(`mn-save-${i}`);
        const delBtn =document.getElementById(`mn-del-${i}`);
        if (saveBtn) saveBtn.addEventListener('click', () => {
          const nameVal=document.getElementById(`mn-name-${i}`)?.value||'';
          setManualWaypointsRef.current?.(wps=>wps.map((w,j)=>j===i?{...w,name:nameVal}:w));
          m.closePopup();
        });
        if (delBtn) delBtn.addEventListener('click', () => {
          setManualWaypointsRef.current?.(wps=>recalcWaypoints(wps.filter((_,j)=>j!==i)));
          m.closePopup();
        });
      });

      m.on('dragend', e => {
        const {lat,lng}=e.target.getLatLng();
        setManualWaypointsRef.current?.(wps=>recalcWaypoints(wps.map((w,j)=>j===i?{...w,lat,lon:lng}:w)));
      });

      m.addTo(map); lrs.manualMarkers.push(m);

      if (i>0) {
        const prev=manualWaypoints[i-1], midLat=(prev.lat+wp.lat)/2, midLon=(prev.lon+wp.lon)/2;
        const lbl=L.marker([midLat,midLon], {
          icon:L.divIcon({
            html:`<div style="transform:translate(-50%,-50%);background:rgba(0,0,0,0.82);border:1px solid rgba(0,200,150,0.5);border-radius:4px;padding:2px 7px;white-space:nowrap;pointer-events:none;"><span style="font-family:Orbitron,monospace;font-size:9.5px;color:#00C896;">&#9658; ${(wp.bearing||0).toFixed(0)}&deg;</span><span style="font-family:monospace;font-size:9.5px;color:#FFD700;margin-left:5px;">${(wp.distance||0).toFixed(1)}NM</span></div>`,
            className:'', iconSize:[0,0], iconAnchor:[0,0],
          }),
          interactive:false, zIndexOffset:-150,
        });
        lbl.addTo(map); lrs.manualMarkers.push(lbl);
      }
    });
  }, [manualWaypoints, ready]);

  const activeOverlays=Object.entries(overlays||{}).filter(([,v])=>v);
  const legendColors={eca:'#FF6B35',seca:'#FFB347',marpol:'#9B59B6',piracy:'#E74C3C',layover:'#3498DB',gebco:'#00B4D8',depthClick:'#00C896'};
  const legendNames ={eca:'ECA',seca:'SECA',marpol:'MARPOL',piracy:'Piracy',layover:'Anchorage',gebco:'Ocean Depth',depthClick:'Depth Click'};

  return (
    <div className="planner-map">
      <div ref={containerRef} style={{width:'100%',height:'100%',minHeight:400}}/>
      {!ready&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg2)',zIndex:10}}>
        <div className="loading"><div className="spin"/><span>Loading nautical map…</span></div>
      </div>}
      {activeOverlays.length>0&&(
        <div className="map-legend">
          {activeOverlays.map(([k])=>legendColors[k]?(
            <div key={k} className="leg-item">
              <div className="leg-dot" style={{background:legendColors[k]}}/>
              <span style={{color:'var(--text2)'}}>{legendNames[k]}</span>
            </div>
          ):null)}
        </div>
      )}
    </div>
  );
}

export default MapView;
