/* eslint-disable */
// src/Pages/SeaDiaryPage.jsx

import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DRIVE_CLIENT_ID = '636056685819-b0mv1o4ftbdfirtan4svpoaa83ns49c6.apps.googleusercontent.com';
const DRIVE_SCOPE     = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FOLDER    = 'NavisphereX Sea Diary';
const LS_KEY          = 'nsx_sea_diary_entries';

const MOODS = [
  { emoji:'😌', label:'Calm' },
  { emoji:'🌊', label:'Adventurous' },
  { emoji:'🏠', label:'Homesick' },
  { emoji:'🎉', label:'Excited' },
  { emoji:'😴', label:'Tired' },
  { emoji:'🙏', label:'Grateful' },
  { emoji:'⚡', label:'Alert' },
  { emoji:'😤', label:'Frustrated' },
];

const WATCHES = ['00-04','04-08','08-12','12-16','16-20','20-24'];

const ENTRY_TAGS = ['#storm','#sunset','#sunrise','#portcall','#drill','#celebration','#anchorage','#fog','#roughsea','#calmday','#maintenance','#watch'];

const BEAUFORT = [
  { b:0, desc:'Calm',         speed:'< 1' },
  { b:1, desc:'Light air',    speed:'1-5' },
  { b:2, desc:'Light breeze', speed:'6-11' },
  { b:3, desc:'Gentle breeze',speed:'12-19' },
  { b:4, desc:'Moderate breeze',speed:'20-28' },
  { b:5, desc:'Fresh breeze', speed:'29-38' },
  { b:6, desc:'Strong breeze',speed:'39-49' },
  { b:7, desc:'Near gale',    speed:'50-61' },
  { b:8, desc:'Gale',         speed:'62-74' },
  { b:9, desc:'Strong gale',  speed:'75-88' },
  { b:10,desc:'Storm',        speed:'89-102' },
  { b:11,desc:'Violent storm',speed:'103-117' },
  { b:12,desc:'Hurricane',    speed:'≥ 118' },
];

const windToBeaufort = (kmh) => {
  if (kmh < 1)   return 0;
  if (kmh < 6)   return 1;
  if (kmh < 12)  return 2;
  if (kmh < 20)  return 3;
  if (kmh < 29)  return 4;
  if (kmh < 39)  return 5;
  if (kmh < 50)  return 6;
  if (kmh < 62)  return 7;
  if (kmh < 75)  return 8;
  if (kmh < 89)  return 9;
  if (kmh < 103) return 10;
  if (kmh < 118) return 11;
  return 12;
};

const toRad = d => d * Math.PI / 180;
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 3440.065; // nautical miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const EMPTY_ENTRY = {
  id: '',
  date: new Date().toISOString().split('T')[0],
  time: new Date().toTimeString().slice(0,5),
  lat: '',
  lng: '',
  portName: '',
  weather: { windSpeed:'', windDir:'', temperature:'', visibility:'', beaufort:'', condition:'' },
  mood: '',
  watch: '',
  crew: '',
  tags: [],
  memories: '',
  starRating: 0,
  photos: [],   // [{driveFileId, driveFileName, caption}]
  voiceMemo: '', // base64 audio
  customTag: '',
};

// ─── DRIVE HELPERS (same pattern as CertificateTrackerPage) ──────────────────
async function driveSearchFolder(token) {
  const q = encodeURIComponent(`name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers:{ Authorization:`Bearer ${token}` } });
  return (await res.json()).files?.[0]?.id || null;
}
async function driveCreateFolder(token) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method:'POST',
    headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ name:DRIVE_FOLDER, mimeType:'application/vnd.google-apps.folder' }),
  });
  return (await res.json()).id;
}
async function driveUploadFile(token, folderId, file, fileName) {
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify({ name:fileName, parents:[folderId] })], { type:'application/json' }));
  form.append('file', file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
  return data;
}
async function driveDeleteFile(token, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method:'DELETE', headers:{ Authorization:`Bearer ${token}` } });
}

// ─── LOCAL STORAGE HELPERS ────────────────────────────────────────────────────
const loadEntries = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const saveEntries = (entries) => { try { localStorage.setItem(LS_KEY, JSON.stringify(entries)); } catch(e) { console.error('LS save:', e); } };

// ─── WORLD MAP SVG PATHS (simplified continents for animation) ────────────────
const WORLD_VIEWBOX = '0 0 1000 500';
// Simplified continent outlines for canvas drawing
const CONTINENTS = [
  // North America
  'M 120 60 L 200 55 L 240 80 L 250 130 L 220 170 L 200 200 L 180 220 L 160 240 L 140 230 L 120 200 L 100 160 L 90 120 Z',
  // South America
  'M 180 240 L 220 235 L 240 260 L 250 310 L 240 360 L 210 390 L 185 380 L 170 350 L 165 300 L 170 260 Z',
  // Europe
  'M 430 55 L 480 50 L 510 70 L 520 100 L 490 120 L 460 125 L 430 110 L 415 85 Z',
  // Africa
  'M 430 130 L 490 125 L 520 160 L 530 220 L 520 290 L 490 340 L 460 350 L 430 330 L 410 280 L 405 220 L 415 160 Z',
  // Asia
  'M 510 50 L 680 45 L 780 70 L 820 100 L 800 150 L 760 170 L 700 180 L 650 200 L 600 180 L 560 160 L 530 130 L 510 100 Z',
  // Australia
  'M 700 280 L 780 270 L 820 300 L 830 350 L 800 380 L 750 390 L 710 370 L 690 330 L 695 290 Z',
  // Greenland
  'M 300 30 L 360 25 L 380 50 L 365 80 L 330 85 L 300 65 Z',
];

// ─── PHOTO PREVIEW MODAL ──────────────────────────────────────────────────────
function PhotoModal({ url, name, onClose }) {
  if (!url) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.93)',zIndex:9999,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1rem' }}>
      <button onClick={onClose} style={{ position:'absolute',top:16,right:16,background:'none',border:'none',color:'#fff',fontSize:'1.5rem',cursor:'pointer' }}>✕</button>
      <div style={{ fontSize:'0.75rem',color:'rgba(255,255,255,0.5)',marginBottom:10 }}>{name}</div>
      <img src={url} alt={name} onClick={e=>e.stopPropagation()} style={{ maxWidth:'94vw',maxHeight:'80vh',borderRadius:10,objectFit:'contain' }} />
    </div>
  );
}

// ─── STAR RATING ──────────────────────────────────────────────────────────────
function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:'flex',gap:4 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onMouseEnter={()=>setHover(s)} onMouseLeave={()=>setHover(0)}
          onClick={()=>onChange(s===value?0:s)}
          style={{ fontSize:'1.4rem',cursor:'pointer',color:(hover||value)>=s?'var(--gold)':'var(--text3)',transition:'color 0.15s' }}>★</span>
      ))}
    </div>
  );
}

// ─── VOYAGE ANIMATION (LEAFLET + CANVAS OVERLAY) ─────────────────────────────
function VoyageAnimation({ onClose, portsDb = [] }) {
  // ── Refs ──
  const mapRef         = useRef(null);
  const mapDivRef      = useRef(null);
  const canvasRef      = useRef(null);
  const recorderRef    = useRef(null);
  const chunksRef      = useRef([]);
  const animRef        = useRef(null);
  const leafletLoaded  = useRef(false);
  const markersRef     = useRef([]);
  const polylineRef    = useRef(null);

  // ── State ──
  const [waypoints,    setWaypoints]    = useState([]); // [{lat,lng,name,flag,type:'start'|'end'|'wp'}]
  const [playing,      setPlaying]      = useState(false);
  const [recording,    setRecording]    = useState(false);
  const [speed,        setSpeed]        = useState(2);
  const [progress,     setProgress]     = useState(0);
  const [status,       setStatus]       = useState('');
  const [countries,    setCountries]    = useState([]);
  const [distStats,    setDistStats]    = useState(null);
  const [inputMode,    setInputMode]    = useState('click');
  const [dmsForm,      setDmsForm]      = useState({ latD:'',latM:'',latS:'',latDir:'N', lngD:'',lngM:'',lngS:'',lngDir:'E', name:'', flag:'🌊', type:'wp' });
  const [portSearch,   setPortSearch]   = useState('');
  const [portResults,  setPortResults]  = useState([]);
  const [portType,     setPortType]     = useState('wp');
  const [portFlag]                      = useState('⚓');
  const [detectingCtry,setDetectingCtry]= useState(false);

  const FLAG_OPTS = ['🌊','⚓','🏝','🌴','🏔','🌆','🏭','⛽','🚢','🛳'];

  const toRad = d => d * Math.PI / 180;
  const haversineNM = (la1,lo1,la2,lo2) => {
    const R=3440.065, dLa=toRad(la2-la1), dLo=toRad(lo2-lo1);
    const a=Math.sin(dLa/2)**2+Math.cos(toRad(la1))*Math.cos(toRad(la2))*Math.sin(dLo/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const buildInterp = (wps) => {
    if (wps.length < 2) return [];
    const interp = [];
    for (let i = 0; i < wps.length - 1; i++) {
      const a = wps[i], b = wps[i+1];
      for (let j = 0; j < 60; j++) {
        const f = j / 60;
        interp.push({ lat: a.lat+(b.lat-a.lat)*f, lng: a.lng+(b.lng-a.lng)*f, flag: j===0?a.flag:null, name: j===0?a.name:'', type: j===0?a.type:null });
      }
    }
    const last = wps[wps.length-1];
    interp.push({ lat:last.lat, lng:last.lng, flag:last.flag, name:last.name, type:last.type });
    return interp;
  };

  const computeStats = (wps) => {
    if (wps.length < 2) return null;
    let totalNM = 0;
    const legs = [];
    for (let i = 1; i < wps.length; i++) {
      const nm = haversineNM(wps[i-1].lat, wps[i-1].lng, wps[i].lat, wps[i].lng);
      totalNM += nm;
      legs.push({ from:wps[i-1].name||`P${i}`, to:wps[i].name||`P${i+1}`, nm:nm.toFixed(1), km:(nm*1.852).toFixed(1) });
    }
    return { totalNM:totalNM.toFixed(1), totalKM:(totalNM*1.852).toFixed(1), legs };
  };

  const detectCountries = async (wps) => {
    setDetectingCtry(true);
    const seen = new Set(), result = [];
    const sample = wps.length<=6 ? wps : [wps[0], ...wps.slice(1,-1).filter((_,i,a)=>i%(Math.ceil(a.length/4))===0), wps[wps.length-1]];
    for (const pt of sample) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pt.lat}&lon=${pt.lng}&zoom=5`,{headers:{'Accept-Language':'en'}});
        const data = await res.json();
        const country = data.address?.country;
        const cc = data.address?.country_code;
        const flag = cc ? String.fromCodePoint(...[...cc.toUpperCase()].map(c=>c.charCodeAt(0)+127397)) : '🌊';
        if (country && !seen.has(country)) { seen.add(country); result.push({ country, flag }); }
      } catch {}
    }
    setCountries(result);
    setDetectingCtry(false);
  };

  const loadLeaflet = () => new Promise((res,rej) => {
    if (window.L) { res(); return; }
    const link = document.createElement('link');
    link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload=res; script.onerror=rej;
    document.head.appendChild(script);
  });

  useEffect(() => {
    let map;
    const init = async () => {
      if (!mapDivRef.current || leafletLoaded.current) return;
      leafletLoaded.current = true;
      await loadLeaflet();
      const L = window.L;
      map = L.map(mapDivRef.current, { zoomControl:true, attributionControl:false }).setView([20,0],2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{ subdomains:'abcd', maxZoom:19 }).addTo(map);
      mapRef.current = map;
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setWaypoints(prev => {
          const hasStart = prev.some(p=>p.type==='start');
          const hasEnd   = prev.some(p=>p.type==='end');
          let type='wp', name='', flag='🌊';
          if (!hasStart)    { type='start'; name='Start'; flag='🟢'; }
          else if (!hasEnd) { type='end';   name='End';   flag='🔴'; }
          else              { type='wp'; name=`WP${prev.filter(p=>p.type==='wp').length+1}`; flag='🌊'; }
          return [...prev, { lat:parseFloat(lat.toFixed(5)), lng:parseFloat(lng.toFixed(5)), name, flag, type }];
        });
      });
    };
    init();
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current=null; leafletLoaded.current=false; } };
  }, []);

  useEffect(() => {
    const L = window.L;
    if (!L || !mapRef.current) return;
    markersRef.current.forEach(m=>m.remove()); markersRef.current=[];
    if (polylineRef.current) { polylineRef.current.remove(); polylineRef.current=null; }
    const sorted = [...waypoints].sort((a,b)=>{ const o={start:0,wp:1,end:2}; return (o[a.type]||1)-(o[b.type]||1); });
    if (sorted.length>=2) {
      polylineRef.current = L.polyline(sorted.map(p=>[p.lat,p.lng]),{ color:'#00B4D8', weight:3, opacity:0.8, dashArray:'8,4' }).addTo(mapRef.current);
    }
    sorted.forEach((pt,i) => {
      const color = pt.type==='start'?'#00C896':pt.type==='end'?'#ff4757':'#00B4D8';
      const icon = L.divIcon({ className:'', html:`<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color};display:flex;align-items:center;justify-content:center;font-size:13px;">${pt.flag}</div>`, iconSize:[26,26], iconAnchor:[13,13] });
      const marker = L.marker([pt.lat,pt.lng],{ icon, draggable:true }).addTo(mapRef.current);
      marker.bindTooltip(`<b>${pt.name||pt.flag}</b><br/>${pt.lat.toFixed(4)}°, ${pt.lng.toFixed(4)}°`,{ permanent:false, direction:'top' });
      marker.on('dragend', e => {
        const {lat,lng} = e.target.getLatLng();
        setWaypoints(prev=>prev.map((p,j)=>j===i?{...p,lat:parseFloat(lat.toFixed(5)),lng:parseFloat(lng.toFixed(5))}:p));
      });
      marker.on('click', () => { if (window.confirm(`Remove ${pt.name||'this point'}?`)) setWaypoints(prev=>prev.filter((_,j)=>j!==i)); });
      markersRef.current.push(marker);
    });
    setDistStats(sorted.length>=2 ? computeStats(sorted) : null);
  }, [waypoints]);

  useEffect(() => {
    if (!portSearch.trim()||portSearch.length<2) { setPortResults([]); return; }
    const q = portSearch.toLowerCase();
    const dbResults = portsDb.filter(p=>p.name?.toLowerCase().includes(q)||p.city?.toLowerCase().includes(q)||p.country?.toLowerCase().includes(q)).slice(0,5).map(p=>({ name:p.name, lat:p.lat, lng:p.lon, source:'db' }));
    if (dbResults.length>=4) { setPortResults(dbResults); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(portSearch)}&limit=5&accept-language=en`);
        const data = await res.json();
        const geo = data.map(d=>({ name:d.display_name.split(',').slice(0,2).join(','), lat:parseFloat(d.lat), lng:parseFloat(d.lon), source:'geo' }));
        setPortResults([...dbResults,...geo].slice(0,8));
      } catch { setPortResults(dbResults); }
    }, 400);
    return () => clearTimeout(timer);
  }, [portSearch, portsDb]);

  const dmsToDecimal = (d,m,s,dir) => {
    const dec = parseFloat(d||0)+parseFloat(m||0)/60+parseFloat(s||0)/3600;
    return (dir==='S'||dir==='W') ? -dec : dec;
  };

  const applyDMS = () => {
    const lat = dmsToDecimal(dmsForm.latD,dmsForm.latM,dmsForm.latS,dmsForm.latDir);
    const lng = dmsToDecimal(dmsForm.lngD,dmsForm.lngM,dmsForm.lngS,dmsForm.lngDir);
    if (isNaN(lat)||isNaN(lng)||Math.abs(lat)>90||Math.abs(lng)>180) { setStatus('⚠️ Invalid coordinates'); return; }
    const type = dmsForm.type||'wp';
    const flag = type==='start'?'🟢':type==='end'?'🔴':(dmsForm.flag||'🌊');
    const name = dmsForm.name||(type==='start'?'Start':type==='end'?'End':`WP${waypoints.filter(p=>p.type==='wp').length+1}`);
    setWaypoints(prev=>[...prev,{lat:parseFloat(lat.toFixed(5)),lng:parseFloat(lng.toFixed(5)),name,flag,type}]);
    setDmsForm(f=>({...f,latD:'',latM:'',latS:'',lngD:'',lngM:'',lngS:'',name:''}));
    if (mapRef.current) mapRef.current.flyTo([lat,lng],5);
    setStatus('');
  };

  const getOrderedWPs = () => {
    const start = waypoints.filter(p=>p.type==='start');
    const wps   = waypoints.filter(p=>p.type==='wp');
    const end   = waypoints.filter(p=>p.type==='end');
    return [...start,...wps,...end];
  };

  const drawBoatFrame = (ctx,W,H,interp,t,trails) => {
    ctx.clearRect(0,0,W,H);
    if (!mapRef.current) return;
    const latLngToCanvas = (lat,lng) => { const pt=mapRef.current.latLngToContainerPoint([lat,lng]); return {x:pt.x,y:pt.y}; };
    const total=interp.length-1, idx=Math.min(Math.floor(t*total),total-1), frac=(t*total)-idx;
    ctx.beginPath(); ctx.strokeStyle='rgba(0,200,150,0.7)'; ctx.lineWidth=3; ctx.shadowBlur=8; ctx.shadowColor='rgba(0,200,150,0.5)';
    for (let i=0;i<=idx;i++) { const p=latLngToCanvas(interp[i].lat,interp[i].lng); i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y); }
    ctx.stroke(); ctx.shadowBlur=0;
    trails.forEach((tr,ti)=>{ ctx.beginPath(); ctx.arc(tr.x,tr.y,tr.r,0,Math.PI*2); ctx.fillStyle=`rgba(0,200,150,${tr.alpha*(1-ti/trails.length)})`; ctx.fill(); });
    const curLat=idx<total?interp[idx].lat+(interp[idx+1].lat-interp[idx].lat)*frac:interp[total].lat;
    const curLng=idx<total?interp[idx].lng+(interp[idx+1].lng-interp[idx].lng)*frac:interp[total].lng;
    const bp=latLngToCanvas(curLat,curLng);
    const glow=ctx.createRadialGradient(bp.x,bp.y,0,bp.x,bp.y,22); glow.addColorStop(0,'rgba(0,200,150,0.4)'); glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(bp.x,bp.y,22,0,Math.PI*2); ctx.fill();
    ctx.font='22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('🚢',bp.x,bp.y);
    const ordered=getOrderedWPs();
    ordered.forEach((pt,i)=>{ const pp=latLngToCanvas(pt.lat,pt.lng); const passed=(i/Math.max(ordered.length-1,1))<=t; ctx.globalAlpha=passed?1:0.3; ctx.font='16px serif'; ctx.fillText(pt.flag||'📍',pp.x,pp.y-20); if(pt.name){ctx.font='bold 11px "Exo 2",sans-serif'; ctx.fillStyle=passed?'#00C896':'rgba(255,255,255,0.3)'; ctx.fillText(pt.name,pp.x,pp.y-36); ctx.fillStyle='#fff';} ctx.globalAlpha=1; });
    const totalDays=Math.max(2,ordered.length), day=Math.max(1,Math.round(t*totalDays));
    ctx.fillStyle='rgba(4,12,26,0.8)'; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(W-120,10,110,40,8); else ctx.rect(W-120,10,110,40); ctx.fill();
    ctx.strokeStyle='rgba(0,180,216,0.5)'; ctx.lineWidth=1; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(W-120,10,110,40,8); else ctx.rect(W-120,10,110,40); ctx.stroke();
    ctx.font='bold 12px "Orbitron",monospace'; ctx.fillStyle='#00B4D8'; ctx.textAlign='right'; ctx.fillText(`DAY ${day}`,W-14,27);
    ctx.font='9px "Exo 2",sans-serif'; ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.fillText(`of ~${totalDays}`,W-14,42);
    ctx.font='bold 10px "Orbitron",monospace'; ctx.fillStyle='rgba(0,180,216,0.3)'; ctx.textAlign='left'; ctx.fillText('NAVISPHERE X  ·  SEA DIARY',10,H-8); ctx.textAlign='center';
  };

  const runAnim = (ordered, onDone) => {
    const interp=buildInterp(ordered), canvas=canvasRef.current;
    if (!canvas||!interp.length) return;
    const ctx=canvas.getContext('2d'), W=canvas.width, H=canvas.height;
    let t=0, trails=[];
    const tick=()=>{
      t+=0.003*speed; if(t>1) t=1; setProgress(Math.round(t*100));
      const total=interp.length-1, idx=Math.min(Math.floor(t*total),total-1), frac=(t*total)-idx;
      const curLat=idx<total?interp[idx].lat+(interp[idx+1].lat-interp[idx].lat)*frac:interp[total].lat;
      const curLng=idx<total?interp[idx].lng+(interp[idx+1].lng-interp[idx].lng)*frac:interp[total].lng;
      if (mapRef.current) { const bp=mapRef.current.latLngToContainerPoint([curLat,curLng]); trails.unshift({x:bp.x,y:bp.y,r:3+Math.random()*2,alpha:0.6}); if(trails.length>18) trails.pop(); }
      drawBoatFrame(ctx,W,H,interp,t,trails);
      if (t<1) { animRef.current=requestAnimationFrame(tick); } else { onDone(); }
    };
    animRef.current=requestAnimationFrame(tick);
  };

  const startAnimation = () => {
    const ordered=getOrderedWPs();
    if (ordered.length<2) { setStatus('⚠️ Add at least a Start and End point'); return; }
    setPlaying(true); setProgress(0); setStatus('');
    runAnim(ordered, ()=>{ setPlaying(false); setStatus('✅ Done! Click Record & Export to save as .webm'); });
  };

  const stopAnimation = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPlaying(false);
    if (canvasRef.current) canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width,canvasRef.current.height);
  };

  const startRecording = () => {
    const ordered=getOrderedWPs();
    if (ordered.length<2) { setStatus('⚠️ Add at least a Start and End point'); return; }
    const canvas=canvasRef.current; if (!canvas) return;
    chunksRef.current=[];
    const stream=canvas.captureStream(30);
    const opts=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?{mimeType:'video/webm;codecs=vp9'}:{mimeType:'video/webm'};
    const mr=new MediaRecorder(stream,opts);
    mr.ondataavailable=e=>{ if(e.data.size>0) chunksRef.current.push(e.data); };
    mr.onstop=()=>{ const blob=new Blob(chunksRef.current,{type:'video/webm'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`SeaDiary_Voyage_${Date.now()}.webm`; a.click(); URL.revokeObjectURL(url); setRecording(false); setStatus('✅ Voyage video downloaded! Share to Instagram or WhatsApp 🚢'); };
    recorderRef.current=mr; mr.start();
    setRecording(true); setStatus('🔴 Recording…');
    runAnim(ordered, ()=>{ mr.stop(); });
  };

  const stopRecording = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (recorderRef.current?.state==='recording') recorderRef.current.stop();
  };

  const clearAll = () => { stopAnimation(); setWaypoints([]); setCountries([]); setDistStats(null); setProgress(0); setStatus(''); };

  useEffect(()=>()=>{ if(animRef.current) cancelAnimationFrame(animRef.current); },[]);

  useEffect(()=>{
    const resize=()=>{ if(!canvasRef.current||!mapDivRef.current) return; const rect=mapDivRef.current.getBoundingClientRect(); canvasRef.current.width=rect.width; canvasRef.current.height=rect.height; };
    resize(); window.addEventListener('resize',resize); return ()=>window.removeEventListener('resize',resize);
  },[]);

  const inp={padding:'7px 10px',background:'var(--bg2,#071428)',border:'1px solid var(--border2,#1E4570)',borderRadius:7,color:'var(--text,#E2EBF8)',fontSize:'0.78rem',outline:'none',fontFamily:'inherit'};
  const ordered=getOrderedWPs();

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:9998,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0.5rem'}}>
      <div style={{background:'var(--card,#0B1D35)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:16,width:'100%',maxWidth:860,maxHeight:'96vh',overflow:'auto',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.9rem 1.1rem 0.6rem',borderBottom:'1px solid rgba(0,180,216,0.15)',flexShrink:0}}>
          <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.82rem',fontWeight:700,color:'var(--cyan,#00B4D8)'}}>🎬 VOYAGE ANIMATION STUDIO</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3,#4A5F80)',fontSize:'1.3rem',cursor:'pointer'}}>✕</button>
        </div>

        {/* Map + Canvas */}
        <div style={{position:'relative',flexShrink:0,margin:'0.7rem 0.7rem 0'}}>
          <div ref={mapDivRef} style={{width:'100%',height:'320px',borderRadius:10,border:'1px solid rgba(0,180,216,0.2)',overflow:'hidden'}} />
          <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',pointerEvents:'none',borderRadius:10}} />
          <div style={{position:'absolute',top:8,left:8,background:'rgba(4,12,26,0.85)',border:'1px solid rgba(0,180,216,0.35)',borderRadius:8,padding:'4px 10px',fontSize:'0.63rem',color:'var(--cyan,#00B4D8)',pointerEvents:'none',backdropFilter:'blur(6px)'}}>
            🖱 Click map → {!waypoints.some(p=>p.type==='start')?'Place Start 🟢':!waypoints.some(p=>p.type==='end')?'Place End 🔴':'Add Waypoint ⚓'}
          </div>
        </div>

        {progress>0&&<div style={{margin:'4px 0.7rem 0',height:4,background:'rgba(255,255,255,0.08)',borderRadius:4,overflow:'hidden',flexShrink:0}}><div style={{height:'100%',background:'linear-gradient(90deg,var(--cyan,#00B4D8),var(--green,#00C896))',width:`${progress}%`,transition:'width 0.1s'}}/></div>}

        <div style={{padding:'0.8rem 0.9rem',overflowY:'auto',flex:1}}>

          {/* Input mode tabs */}
          <div style={{display:'flex',gap:4,marginBottom:'0.8rem',background:'rgba(255,255,255,0.04)',borderRadius:10,padding:3}}>
            {[['click','🖱 Click Map'],['dms','📐 DMS Input'],['search','🔍 Search Port']].map(([m,l])=>(
              <button key={m} onClick={()=>setInputMode(m)} style={{flex:1,padding:'6px 4px',borderRadius:8,fontSize:'0.67rem',fontWeight:inputMode===m?700:400,cursor:'pointer',border:'none',background:inputMode===m?'rgba(0,180,216,0.18)':'transparent',color:inputMode===m?'var(--cyan,#00B4D8)':'var(--text3,#4A5F80)',transition:'all 0.15s'}}>{l}</button>
            ))}
          </div>

          {/* DMS Input */}
          {inputMode==='dms'&&(
            <div style={{background:'rgba(0,180,216,0.04)',border:'1px solid rgba(0,180,216,0.15)',borderRadius:10,padding:'0.8rem',marginBottom:'0.8rem'}}>
              <div style={{fontSize:'0.66rem',color:'var(--cyan,#00B4D8)',fontWeight:700,marginBottom:8}}>📐 Degrees / Minutes / Seconds</div>
              <div style={{marginBottom:6}}>
                <div style={{fontSize:'0.6rem',color:'var(--text3,#4A5F80)',marginBottom:4}}>LATITUDE</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 70px',gap:5}}>
                  <input value={dmsForm.latD} onChange={e=>setDmsForm(f=>({...f,latD:e.target.value}))} placeholder="°" style={{...inp,width:'100%'}}/>
                  <input value={dmsForm.latM} onChange={e=>setDmsForm(f=>({...f,latM:e.target.value}))} placeholder="'" style={{...inp,width:'100%'}}/>
                  <input value={dmsForm.latS} onChange={e=>setDmsForm(f=>({...f,latS:e.target.value}))} placeholder='"' style={{...inp,width:'100%'}}/>
                  <select value={dmsForm.latDir} onChange={e=>setDmsForm(f=>({...f,latDir:e.target.value}))} style={{...inp,cursor:'pointer'}}><option value="N">N ↑</option><option value="S">S ↓</option></select>
                </div>
              </div>
              <div style={{marginBottom:8}}>
                <div style={{fontSize:'0.6rem',color:'var(--text3,#4A5F80)',marginBottom:4}}>LONGITUDE</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 70px',gap:5}}>
                  <input value={dmsForm.lngD} onChange={e=>setDmsForm(f=>({...f,lngD:e.target.value}))} placeholder="°" style={{...inp,width:'100%'}}/>
                  <input value={dmsForm.lngM} onChange={e=>setDmsForm(f=>({...f,lngM:e.target.value}))} placeholder="'" style={{...inp,width:'100%'}}/>
                  <input value={dmsForm.lngS} onChange={e=>setDmsForm(f=>({...f,lngS:e.target.value}))} placeholder='"' style={{...inp,width:'100%'}}/>
                  <select value={dmsForm.lngDir} onChange={e=>setDmsForm(f=>({...f,lngDir:e.target.value}))} style={{...inp,cursor:'pointer'}}><option value="E">E →</option><option value="W">W ←</option></select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 90px 70px',gap:6,marginBottom:8}}>
                <input value={dmsForm.name} onChange={e=>setDmsForm(f=>({...f,name:e.target.value}))} placeholder="Name (optional)" style={inp}/>
                <select value={dmsForm.type} onChange={e=>setDmsForm(f=>({...f,type:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                  <option value="start">Start 🟢</option><option value="wp">Waypoint</option><option value="end">End 🔴</option>
                </select>
                <select value={dmsForm.flag} onChange={e=>setDmsForm(f=>({...f,flag:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                  {FLAG_OPTS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <button onClick={applyDMS} style={{width:'100%',padding:'8px',borderRadius:8,background:'rgba(0,180,216,0.15)',border:'1px solid rgba(0,180,216,0.4)',color:'var(--cyan,#00B4D8)',fontWeight:700,fontSize:'0.74rem',cursor:'pointer'}}>+ Add This Point</button>
            </div>
          )}

          {/* Port Search */}
          {inputMode==='search'&&(
            <div style={{background:'rgba(0,180,216,0.04)',border:'1px solid rgba(0,180,216,0.15)',borderRadius:10,padding:'0.8rem',marginBottom:'0.8rem'}}>
              <div style={{fontSize:'0.66rem',color:'var(--cyan,#00B4D8)',fontWeight:700,marginBottom:8}}>🔍 Search Port or Place</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 100px',gap:6,marginBottom:6}}>
                <input value={portSearch} onChange={e=>setPortSearch(e.target.value)} placeholder="Type port, city, or place…" style={inp}/>
                <select value={portType} onChange={e=>setPortType(e.target.value)} style={{...inp,cursor:'pointer'}}>
                  <option value="start">Start 🟢</option><option value="wp">Waypoint</option><option value="end">End 🔴</option>
                </select>
              </div>
              {portResults.length>0&&(
                <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,overflow:'hidden',maxHeight:180,overflowY:'auto'}}>
                  {portResults.map((p,i)=>(
                    <div key={i} onClick={()=>{ const flag=portType==='start'?'🟢':portType==='end'?'🔴':portFlag; setWaypoints(prev=>[...prev,{lat:p.lat,lng:p.lng,name:p.name.split(',')[0],flag,type:portType}]); setPortSearch(''); setPortResults([]); if(mapRef.current) mapRef.current.flyTo([p.lat,p.lng],6); }}
                      style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',gap:8}}>
                      <span>{p.source==='db'?'⚓':'📍'}</span>
                      <div>
                        <div style={{fontSize:'0.74rem',color:'var(--text,#E2EBF8)',fontWeight:600}}>{p.name.split(',')[0]}</div>
                        <div style={{fontSize:'0.61rem',color:'var(--text3,#4A5F80)'}}>{p.lat.toFixed(3)}°, {p.lng.toFixed(3)}°</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Points list */}
          {ordered.length>0&&(
            <div style={{marginBottom:'0.8rem'}}>
              <div style={{fontSize:'0.63rem',color:'var(--text3,#4A5F80)',marginBottom:5,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span>📍 ROUTE POINTS ({ordered.length})</span>
                <button onClick={clearAll} style={{background:'none',border:'none',color:'#ff4757',cursor:'pointer',fontSize:'0.65rem'}}>🗑 Clear All</button>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {ordered.map((pt,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:'rgba(255,255,255,0.04)',borderRadius:8,border:`1px solid ${pt.type==='start'?'rgba(0,200,100,0.25)':pt.type==='end'?'rgba(255,71,87,0.25)':'rgba(0,180,216,0.15)'}`}}>
                    <span style={{fontSize:'1rem'}}>{pt.flag}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:'0.73rem',fontWeight:600,color:'var(--text,#E2EBF8)'}}>{pt.name}</div>
                      <div style={{fontSize:'0.61rem',color:'var(--text3,#4A5F80)'}}>{pt.lat.toFixed(4)}°, {pt.lng.toFixed(4)}°</div>
                    </div>
                    <span style={{fontSize:'0.58rem',padding:'1px 6px',borderRadius:10,background:'rgba(255,255,255,0.07)',color:'var(--text3,#4A5F80)'}}>{pt.type}</span>
                    <button onClick={()=>setWaypoints(prev=>prev.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'var(--text3,#4A5F80)',cursor:'pointer',fontSize:'0.8rem'}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distance stats */}
          {distStats&&(
            <div style={{background:'linear-gradient(135deg,rgba(0,20,50,0.8),rgba(0,40,90,0.7))',border:'1px solid rgba(0,180,216,0.25)',borderRadius:10,padding:'0.8rem',marginBottom:'0.8rem'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:distStats.legs.length>1?8:0}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'1.3rem',fontWeight:900,color:'var(--cyan,#00B4D8)',fontFamily:'Orbitron,monospace'}}>{distStats.totalNM}</div>
                  <div style={{fontSize:'0.6rem',color:'var(--text3,#4A5F80)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Nautical Miles</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'1.3rem',fontWeight:900,color:'var(--green,#00C896)',fontFamily:'Orbitron,monospace'}}>{distStats.totalKM}</div>
                  <div style={{fontSize:'0.6rem',color:'var(--text3,#4A5F80)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Kilometres</div>
                </div>
              </div>
              {distStats.legs.length>1&&(
                <div style={{fontSize:'0.63rem',color:'var(--text3,#4A5F80)',borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:6}}>
                  {distStats.legs.map((l,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'2px 0'}}>
                      <span style={{color:'var(--text2,#8A9BBF)'}}>{l.from} → {l.to}</span>
                      <span style={{color:'var(--gold,#F0A500)',fontFamily:'Orbitron,monospace'}}>{l.nm} NM / {l.km} km</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Country detection */}
          <div style={{marginBottom:'0.8rem'}}>
            <button onClick={()=>{ const o=getOrderedWPs(); if(o.length<2){setStatus('⚠️ Add at least 2 points first');return;} detectCountries(o); }} disabled={detectingCtry||ordered.length<2}
              style={{padding:'7px 14px',borderRadius:8,background:'rgba(240,165,0,0.1)',border:'1px solid rgba(240,165,0,0.3)',color:'var(--gold,#F0A500)',fontSize:'0.7rem',fontWeight:600,cursor:'pointer',marginBottom:6,width:'100%',opacity:ordered.length<2?0.5:1}}>
              {detectingCtry?'🔍 Detecting countries…':'🌍 Detect Countries Along Route (Nominatim)'}
            </button>
            {countries.length>0&&(
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                <span style={{fontSize:'0.62rem',color:'var(--text3,#4A5F80)',alignSelf:'center'}}>Countries:</span>
                {countries.map((c,i)=>(
                  <span key={i} style={{fontSize:'0.72rem',padding:'3px 10px',borderRadius:20,background:'rgba(240,165,0,0.08)',border:'1px solid rgba(240,165,0,0.2)',color:'var(--gold,#F0A500)'}}>{c.flag} {c.country}</span>
                ))}
              </div>
            )}
          </div>

          {/* Speed + Playback */}
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:'0.8rem',flexWrap:'wrap'}}>
            <span style={{fontSize:'0.68rem',color:'var(--text3,#4A5F80)'}}>Speed:</span>
            {[1,2,4].map(s=>(
              <button key={s} onClick={()=>setSpeed(s)} style={{padding:'4px 10px',borderRadius:6,fontSize:'0.7rem',fontWeight:700,cursor:'pointer',background:speed===s?'rgba(0,180,216,0.2)':'transparent',border:`1px solid ${speed===s?'var(--cyan,#00B4D8)':'rgba(255,255,255,0.1)'}`,color:speed===s?'var(--cyan,#00B4D8)':'var(--text3,#4A5F80)'}}>
                {s}x
              </button>
            ))}
            <div style={{flex:1}}/>
            {!playing&&!recording&&<button onClick={startAnimation} disabled={ordered.length<2} style={{padding:'8px 18px',borderRadius:8,background:ordered.length<2?'rgba(255,255,255,0.05)':'linear-gradient(135deg,var(--cyan,#00B4D8),#1565C0)',color:ordered.length<2?'var(--text3,#4A5F80)':'#fff',border:'none',fontWeight:700,fontSize:'0.78rem',cursor:ordered.length<2?'not-allowed':'pointer'}}>▶ Preview</button>}
            {playing&&<button onClick={stopAnimation} style={{padding:'8px 18px',borderRadius:8,background:'rgba(255,71,87,0.15)',color:'#ff4757',border:'1px solid rgba(255,71,87,0.35)',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>⏹ Stop</button>}
            {!recording&&!playing&&<button onClick={startRecording} disabled={ordered.length<2} style={{padding:'8px 18px',borderRadius:8,background:ordered.length<2?'rgba(255,255,255,0.05)':'linear-gradient(135deg,var(--green,#00C896),#00a87a)',color:ordered.length<2?'var(--text3,#4A5F80)':'#000',border:'none',fontWeight:700,fontSize:'0.78rem',cursor:ordered.length<2?'not-allowed':'pointer'}}>⏺ Record & Export .webm</button>}
            {recording&&<button onClick={stopRecording} style={{padding:'8px 18px',borderRadius:8,background:'rgba(255,165,0,0.15)',color:'#ffa502',border:'1px solid rgba(255,165,0,0.4)',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>⏹ Stop Recording</button>}
          </div>

          {status&&<div style={{fontSize:'0.74rem',color:status.startsWith('⚠️')?'#ff6b35':status.startsWith('✅')?'var(--green,#00C896)':status.startsWith('🔴')?'#ff4757':'#ffa502',background:'rgba(0,0,0,0.2)',borderRadius:8,padding:'7px 10px',marginBottom:'0.6rem'}}>{status}</div>}

          <div style={{fontSize:'0.63rem',color:'var(--text3,#4A5F80)',lineHeight:1.7,background:'rgba(255,255,255,0.03)',borderRadius:8,padding:'8px 10px'}}>
            💡 <strong style={{color:'var(--text2,#8A9BBF)'}}>How to use:</strong> Click the real map to place Start → Waypoints → End. Use DMS Input for exact coordinates. Drag markers to adjust. Click a marker to remove it. Detect countries, see NM/KM distance, then export as .webm to share 🚢
          </div>

        </div>
      </div>
    </div>
  );
}


// ─── CONTRACT VOYAGE REPORT ───────────────────────────────────────────────────
function generateVoyageReport(entries, userName) {
  if (!entries.length) return;

  const ports   = [...new Set(entries.map(e=>e.portName).filter(Boolean))];
  const miles   = calcTotalMiles(entries);
  const days    = entries.length;
  const tags    = entries.flatMap(e=>e.tags);
  const tagFreq = {};
  tags.forEach(t=>{ tagFreq[t]=(tagFreq[t]||0)+1; });
  const topTags = Object.entries(tagFreq).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([t])=>t);
  const avgRating = entries.filter(e=>e.starRating).reduce((s,e)=>s+e.starRating,0) / (entries.filter(e=>e.starRating).length||1);
  const avgTemp   = entries.filter(e=>e.weather?.temperature).reduce((s,e)=>s+parseFloat(e.weather.temperature||0),0) / (entries.filter(e=>e.weather?.temperature).length||1);
  const moodFreq  = {};
  entries.forEach(e=>{ if(e.mood) moodFreq[e.mood]=(moodFreq[e.mood]||0)+1; });
  const topMood   = Object.entries(moodFreq).sort((a,b)=>b[1]-a[1])[0];

  const dateRange = entries.length
    ? `${entries[entries.length-1].date} → ${entries[0].date}`
    : 'N/A';

  const photoRows = entries.filter(e=>e.photos?.length).flatMap(e=>e.photos.map(p=>`
    <div class="photo-item"><div class="photo-date">${e.date}</div><div class="photo-cap">${p.caption||p.driveFileName||'Photo'}</div></div>`)).slice(0,12).join('');

  const entryRows = entries.slice(0,20).map(e=>`
    <div class="entry-row">
      <div class="entry-hdr">
        <span class="entry-date">${e.date} ${e.time||''}</span>
        <span class="entry-port">${e.portName||'At Sea'}</span>
        <span class="entry-mood">${e.mood||''}</span>
        <span class="entry-stars">${'★'.repeat(e.starRating||0)}</span>
      </div>
      ${e.weather?.temperature ? `<div class="entry-wx">🌡 ${e.weather.temperature}°C · 💨 ${e.weather.windSpeed||'?'} km/h · 🌊 B${e.weather.beaufort||'?'}</div>` : ''}
      ${e.lat && e.lng ? `<div class="entry-pos">📍 ${parseFloat(e.lat).toFixed(4)}°, ${parseFloat(e.lng).toFixed(4)}°</div>` : ''}
      ${e.watch ? `<div class="entry-meta">⏱ Watch: ${e.watch}</div>` : ''}
      ${e.crew ? `<div class="entry-meta">👥 ${e.crew}</div>` : ''}
      ${e.tags?.length ? `<div class="entry-tags">${e.tags.map(t=>`<span class="etag">${t}</span>`).join('')}</div>` : ''}
      ${e.memories ? `<div class="entry-mem">${e.memories.slice(0,300)}${e.memories.length>300?'…':''}</div>` : ''}
    </div>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Contract Voyage Report — ${userName || 'Seafarer'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#020d1f;color:#E2EBF8;font-family:'Exo 2',sans-serif;min-height:100vh;padding:0;}

  /* ── COVER PAGE ── */
  .cover{
    min-height:100vh;
    background:linear-gradient(160deg,#020d1f 0%,#051828 40%,#0a1f3a 100%);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:3rem 2rem;text-align:center;position:relative;overflow:hidden;
    page-break-after:always;
  }
  .cover::before{
    content:'';position:absolute;inset:0;
    background:radial-gradient(ellipse at 50% 30%,rgba(0,180,216,0.07) 0%,transparent 65%);
    pointer-events:none;
  }
  .cover-grid{
    position:absolute;inset:0;
    background-image:linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
    background-size:40px 40px;pointer-events:none;
  }
  .cover-ship{font-size:5rem;margin-bottom:1.5rem;filter:drop-shadow(0 0 30px rgba(0,180,216,0.5));}
  .cover-brand{font-family:'Orbitron',monospace;font-size:0.7rem;letter-spacing:0.28em;color:rgba(0,180,216,0.6);text-transform:uppercase;margin-bottom:2rem;}
  .cover-title{font-family:'Orbitron',monospace;font-size:2.2rem;font-weight:900;letter-spacing:0.06em;line-height:1.2;
    background:linear-gradient(135deg,#F0A500,#FFD166,#F0A500);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:0.5rem;}
  .cover-sub{font-family:'Orbitron',monospace;font-size:0.9rem;letter-spacing:0.15em;color:rgba(0,180,216,0.8);margin-bottom:3rem;}
  .cover-name{font-size:1.1rem;font-weight:600;color:#E2EBF8;margin-bottom:0.3rem;}
  .cover-date{font-size:0.82rem;color:rgba(255,255,255,0.45);letter-spacing:0.06em;}
  .cover-divider{width:120px;height:2px;background:linear-gradient(90deg,transparent,#F0A500,transparent);margin:2rem auto;}
  .cover-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1.2rem;width:100%;max-width:480px;margin:2rem auto 0;}
  .cstat{background:rgba(0,180,216,0.06);border:1px solid rgba(0,180,216,0.15);border-radius:14px;padding:1.1rem 0.8rem;text-align:center;}
  .cstat-val{font-family:'Orbitron',monospace;font-size:1.6rem;font-weight:900;color:#00B4D8;margin-bottom:4px;}
  .cstat-lbl{font-size:0.62rem;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.12em;}
  .cover-seal{margin-top:3rem;width:80px;height:80px;border-radius:50%;border:2px solid rgba(240,165,0,0.3);
    display:flex;align-items:center;justify-content:center;font-size:2rem;
    background:rgba(240,165,0,0.06);box-shadow:0 0 30px rgba(240,165,0,0.12);}

  /* ── REPORT BODY ── */
  .report{max-width:860px;margin:0 auto;padding:2.5rem 2rem;}
  .section{margin-bottom:2.5rem;page-break-inside:avoid;}
  .sec-title{font-family:'Orbitron',monospace;font-size:0.72rem;font-weight:700;letter-spacing:0.18em;
    color:#00B4D8;text-transform:uppercase;margin-bottom:1rem;padding-bottom:0.5rem;
    border-bottom:1px solid rgba(0,180,216,0.2);display:flex;align-items:center;gap:8px;}
  .info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:0.8rem;}
  .info-card{background:rgba(0,180,216,0.04);border:1px solid rgba(0,180,216,0.12);border-radius:10px;padding:0.9rem;}
  .info-lbl{font-size:0.6rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:5px;}
  .info-val{font-size:0.9rem;font-weight:600;color:#E2EBF8;}
  .ports-list{display:flex;flex-wrap:wrap;gap:6px;}
  .port-chip{padding:4px 12px;border-radius:20px;background:rgba(240,165,0,0.08);border:1px solid rgba(240,165,0,0.2);color:#F0A500;font-size:0.76rem;font-weight:600;}
  .tag-chip{padding:3px 10px;border-radius:20px;background:rgba(0,180,216,0.08);border:1px solid rgba(0,180,216,0.2);color:#00B4D8;font-size:0.72rem;}
  .entry-row{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:10px;padding:1rem;margin-bottom:0.8rem;}
  .entry-hdr{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
  .entry-date{font-family:'Orbitron',monospace;font-size:0.65rem;color:#00B4D8;font-weight:700;}
  .entry-port{font-size:0.78rem;font-weight:600;color:#E2EBF8;}
  .entry-mood{font-size:1rem;}
  .entry-stars{color:#F0A500;font-size:0.82rem;letter-spacing:2px;}
  .entry-wx,.entry-pos,.entry-meta{font-size:0.72rem;color:rgba(255,255,255,0.45);margin-bottom:3px;}
  .entry-tags{display:flex;gap:5px;flex-wrap:wrap;margin:5px 0;}
  .etag{font-size:0.65rem;padding:2px 7px;border-radius:10px;background:rgba(0,180,216,0.08);color:rgba(0,180,216,0.7);border:1px solid rgba(0,180,216,0.15);}
  .entry-mem{font-size:0.78rem;color:rgba(255,255,255,0.6);line-height:1.6;margin-top:6px;font-style:italic;}
  .photo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;}
  .photo-item{background:rgba(0,180,216,0.04);border:1px solid rgba(0,180,216,0.12);border-radius:8px;padding:0.7rem;text-align:center;}
  .photo-date{font-size:0.6rem;color:rgba(255,255,255,0.35);margin-bottom:3px;}
  .photo-cap{font-size:0.72rem;color:rgba(255,255,255,0.6);}

  /* ── SIGNOFF ── */
  .signoff{background:linear-gradient(135deg,rgba(240,165,0,0.05),rgba(0,180,216,0.05));
    border:1px solid rgba(240,165,0,0.2);border-radius:14px;padding:2rem;text-align:center;margin-top:2rem;}
  .signoff-title{font-family:'Orbitron',monospace;font-size:0.82rem;color:#F0A500;font-weight:700;margin-bottom:1.5rem;letter-spacing:0.12em;}
  .sig-line{border-top:1px solid rgba(255,255,255,0.15);margin:1.5rem auto;width:220px;}
  .sig-lbl{font-size:0.65rem;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.1em;}
  .sig-name{font-family:'Orbitron',monospace;font-size:0.9rem;color:#E2EBF8;margin-top:6px;font-weight:700;}
  .share-tip{margin-top:2rem;padding:1rem;background:rgba(193,53,132,0.08);border:1px solid rgba(193,53,132,0.25);border-radius:10px;font-size:0.72rem;color:rgba(255,255,255,0.5);line-height:1.6;}

  @media print{
    body{background:#020d1f !important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .no-print{display:none !important;}
    .cover{page-break-after:always;}
  }
</style>
</head>
<body>

<!-- ── COVER ── -->
<div class="cover">
  <div class="cover-grid"></div>
  <div class="cover-ship">🚢</div>
  <div class="cover-brand">NavisphereX Marine Systems</div>
  <div class="cover-title">CONTRACT<br/>VOYAGE<br/>REPORT</div>
  <div class="cover-sub">Personal Sea Diary</div>
  <div class="cover-divider"></div>
  <div class="cover-name">${userName || 'Seafarer'}</div>
  <div class="cover-date">${dateRange}</div>
  <div class="cover-stats">
    <div class="cstat"><div class="cstat-val">${days}</div><div class="cstat-lbl">Days Logged</div></div>
    <div class="cstat"><div class="cstat-val">${Math.round(miles)}</div><div class="cstat-lbl">Nautical Miles</div></div>
    <div class="cstat"><div class="cstat-val">${ports.length}</div><div class="cstat-lbl">Ports Visited</div></div>
  </div>
  <div class="cover-seal">⚓</div>
</div>

<!-- ── BODY ── -->
<div class="report">

  <div class="section">
    <div class="sec-title">📋 Voyage Summary</div>
    <div class="info-grid">
      <div class="info-card"><div class="info-lbl">Seafarer</div><div class="info-val">${userName||'—'}</div></div>
      <div class="info-card"><div class="info-lbl">Voyage Period</div><div class="info-val">${dateRange}</div></div>
      <div class="info-card"><div class="info-lbl">Total Entries</div><div class="info-val">${days}</div></div>
      <div class="info-card"><div class="info-lbl">Distance Sailed</div><div class="info-val">${Math.round(miles)} NM</div></div>
      <div class="info-card"><div class="info-lbl">Avg Temperature</div><div class="info-val">${isNaN(avgTemp)?'—':avgTemp.toFixed(1)+'°C'}</div></div>
      <div class="info-card"><div class="info-lbl">Avg Day Rating</div><div class="info-val">${'★'.repeat(Math.round(avgRating))} ${avgRating.toFixed(1)}/5</div></div>
      ${topMood ? `<div class="info-card"><div class="info-lbl">Predominant Mood</div><div class="info-val">${topMood[0]} (${topMood[1]}x)</div></div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="sec-title">⚓ Ports Visited (${ports.length})</div>
    <div class="ports-list">${ports.length ? ports.map(p=>`<span class="port-chip">⚓ ${p}</span>`).join('') : '<span style="color:rgba(255,255,255,0.3);font-size:0.78rem">No ports recorded</span>'}</div>
  </div>

  ${topTags.length ? `
  <div class="section">
    <div class="sec-title">🏷 Top Voyage Tags</div>
    <div class="ports-list">${topTags.map(t=>`<span class="tag-chip">${t}</span>`).join('')}</div>
  </div>` : ''}

  <div class="section">
    <div class="sec-title">📔 Daily Log Entries</div>
    ${entryRows || '<div style="color:rgba(255,255,255,0.3);font-size:0.78rem">No entries recorded</div>'}
    ${entries.length > 20 ? `<div style="text-align:center;font-size:0.72rem;color:rgba(255,255,255,0.3);margin-top:8px">… and ${entries.length-20} more entries</div>` : ''}
  </div>

  ${photoRows ? `
  <div class="section">
    <div class="sec-title">📸 Photo Log</div>
    <div class="photo-grid">${photoRows}</div>
  </div>` : ''}

  <div class="signoff">
    <div class="signoff-title">⚓ MASTER'S SIGN-OFF</div>
    <div style="font-size:0.78rem;color:rgba(255,255,255,0.4);margin-bottom:1.5rem;line-height:1.6">
      I hereby certify that this voyage diary is a true and accurate record of the voyage undertaken during the period specified above.
    </div>
    <div class="sig-line"></div>
    <div class="sig-lbl">Signature</div>
    <div class="sig-name">${userName||'Seafarer'}</div>
    <div style="font-size:0.68rem;color:rgba(255,255,255,0.3);margin-top:6px">Generated: ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})}</div>
    <div class="share-tip">
      📸 <strong style="color:rgba(255,255,255,0.7)">Share to Instagram:</strong> Take a screenshot of the cover page and share as a Story or Post. Tag your voyage and let the world know where the sea took you! 🌊
    </div>
  </div>

</div>

<div class="no-print" style="position:fixed;bottom:20px;right:20px;display:flex;gap:10px;">
  <button onclick="window.print()" style="padding:12px 20px;background:linear-gradient(135deg,#F0A500,#D4900A);border:none;border-radius:10px;color:#000;font-weight:700;cursor:pointer;font-size:0.82rem;">🖨 Save as PDF</button>
</div>

</body>
</html>`;

  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
}

function calcTotalMiles(entries) {
  let total = 0;
  for (let i=1; i<entries.length; i++) {
    const a=entries[i-1], b=entries[i];
    if (a.lat&&a.lng&&b.lat&&b.lng) total += haversine(parseFloat(a.lat),parseFloat(a.lng),parseFloat(b.lat),parseFloat(b.lng));
  }
  return total;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function SeaDiaryPage({ user, notify, portsDb = [] }) {
  const [entries,     setEntries]     = useState([]);
  const [view,        setView]        = useState('list'); // 'list' | 'add' | 'detail' | 'stats' | 'heatmap'
  const [editEntry,   setEditEntry]   = useState({ ...EMPTY_ENTRY });
  const [editId,      setEditId]      = useState(null);
  const [detailId,    setDetailId]    = useState(null);
  const [filterTag,   setFilterTag]   = useState('');
  const [filterMood,  setFilterMood]  = useState('');
  const [searchQ,     setSearchQ]     = useState('');
  const [showAnim,    setShowAnim]    = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [fetchingWx,  setFetchingWx]  = useState(false);
  const [fetchingPos, setFetchingPos] = useState(false);
  const [recording,   setRecording]   = useState(false);
  const [photoModal,  setPhotoModal]  = useState(null);

  // Drive
  const [driveToken,     setDriveToken]     = useState(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail,     setDriveEmail]     = useState(null);
  const [driveFolderId,  setDriveFolderId]  = useState(null);
  const [driveExpired,   setDriveExpired]   = useState(false);
  const [connectingDrive,setConnectingDrive]= useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const mediaRecRef  = useRef(null);
  const audioChunks  = useRef([]);
  const heatCanvasRef= useRef(null);

  // ── Load entries from localStorage ──
  useEffect(() => {
    if (!user) return;
    const key = `${LS_KEY}_${user.uid}`;
    try { setEntries(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setEntries([]); }
  }, [user?.uid]);

  const persistEntries = (updated) => {
    const key = `${LS_KEY}_${user.uid}`;
    localStorage.setItem(key, JSON.stringify(updated));
    setEntries(updated);
  };

  // ── Drive setup (same pattern as CertificateTrackerPage) ──
  const isDriveTokenValid = () => {
    const e = localStorage.getItem('nsx_diary_drive_expiry');
    return e && Date.now() < parseInt(e);
  };

  useEffect(() => {
    const token  = localStorage.getItem('nsx_diary_drive_token');
    const expiry = localStorage.getItem('nsx_diary_drive_expiry');
    const email  = localStorage.getItem('nsx_diary_drive_email');
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setDriveToken(token); setDriveConnected(true); setDriveEmail(email);
    } else if (token && email) {
      silentRefreshDrive(email);
    }
  }, []);

  const silentRefreshDrive = async (email) => {
    try {
      await new Promise((res,rej) => {
        if (window.google?.accounts?.oauth2) { res(); return; }
        const sc = document.createElement('script'); sc.src='https://accounts.google.com/gsi/client';
        sc.onload=res; sc.onerror=()=>rej(new Error('Network error')); document.head.appendChild(sc);
      });
      const token = await new Promise((res,rej) => {
        let settled=false;
        window.google.accounts.oauth2.initTokenClient({ client_id:DRIVE_CLIENT_ID, scope:DRIVE_SCOPE, login_hint:email,
          callback:r=>{ settled=true; if(r.error)rej(new Error(r.error)); else res(r.access_token); }
        }).requestAccessToken({ prompt:'none' });
        setTimeout(()=>{ if(!settled)rej(new Error('timeout')); },4000);
      });
      localStorage.setItem('nsx_diary_drive_token', token);
      localStorage.setItem('nsx_diary_drive_expiry', String(Date.now()+3300000));
      setDriveToken(token); setDriveConnected(true); setDriveEmail(email); setDriveExpired(false);
    } catch(e) {
      setDriveExpired(true); setDriveConnected(false);
    }
  };

  const connectDrive = async () => {
    setConnectingDrive(true); setDriveExpired(false);
    try {
      await new Promise((res,rej) => {
        if (window.google?.accounts?.oauth2) { res(); return; }
        const s = document.createElement('script'); s.src='https://accounts.google.com/gsi/client';
        s.onload=res; s.onerror=()=>rej(new Error('Network error')); document.head.appendChild(s);
      });
      const token = await new Promise((res,rej) => {
        window.google.accounts.oauth2.initTokenClient({ client_id:DRIVE_CLIENT_ID, scope:DRIVE_SCOPE, login_hint:user?.email||'',
          callback:r=>{ if(r.error)rej(new Error(r.error)); else res(r.access_token); }
        }).requestAccessToken({ prompt:'' });
      });
      const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json());
      if (info.email && user?.email && info.email.toLowerCase()!==user.email.toLowerCase()) {
        notify(`Please use ${user.email}`, 'error'); setConnectingDrive(false); return;
      }
      localStorage.setItem('nsx_diary_drive_token', token);
      localStorage.setItem('nsx_diary_drive_expiry', String(Date.now()+3300000));
      localStorage.setItem('nsx_diary_drive_email', info.email||'');
      setDriveToken(token); setDriveConnected(true); setDriveEmail(info.email); setDriveExpired(false);
      notify('Photo storage connected','success');
    } catch(e) {
      if (!e.message?.includes('popup_closed')&&!e.message?.includes('access_denied')) notify('Could not connect storage.','error');
    }
    setConnectingDrive(false);
  };

  const disconnectDrive = () => {
    ['nsx_diary_drive_token','nsx_diary_drive_expiry','nsx_diary_drive_email'].forEach(k=>localStorage.removeItem(k));
    setDriveToken(null); setDriveConnected(false); setDriveEmail(null); setDriveFolderId(null); setDriveExpired(false);
    notify('Storage disconnected','success');
  };

  const getOrCreateFolder = async (token) => {
    if (driveFolderId) return driveFolderId;
    let fid = await driveSearchFolder(token);
    if (!fid) fid = await driveCreateFolder(token);
    setDriveFolderId(fid); return fid;
  };

  // ── GPS + Weather ──
  const fetchGPS = () => {
    if (!navigator.geolocation) { notify('Geolocation not supported','error'); return; }
    setFetchingPos(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setEditEntry(e => ({ ...e, lat, lng }));
        setFetchingPos(false);
        notify('📍 Position captured','success');
        // Also auto-fetch weather for this position
        await fetchWeather(lat, lng);
      },
      (err) => { setFetchingPos(false); notify('GPS error: ' + err.message,'error'); },
      { enableHighAccuracy:true, timeout:12000 }
    );
  };

  const fetchWeather = async (lat, lng) => {
    const la = lat || editEntry.lat;
    const lo = lng || editEntry.lng;
    if (!la || !lo) { notify('Enter position first','error'); return; }
    setFetchingWx(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,wind_speed_10m,wind_direction_10m,visibility,weather_code&wind_speed_unit=kmh&timezone=auto`;
      const res  = await fetch(url);
      const data = await res.json();
      const cur  = data.current;
      if (!cur) throw new Error('No weather data');
      const windKmh  = Math.round(cur.wind_speed_10m || 0);
      const beaufort = windToBeaufort(windKmh);
      const bf       = BEAUFORT[beaufort];
      const wxCodes  = { 0:'Clear',1:'Mostly Clear',2:'Partly Cloudy',3:'Overcast',45:'Foggy',48:'Icy Fog',51:'Light Drizzle',61:'Light Rain',71:'Light Snow',80:'Showers',95:'Thunderstorm' };
      const condition= wxCodes[cur.weather_code] || wxCodes[Math.floor(cur.weather_code/10)*10] || `Code ${cur.weather_code}`;
      setEditEntry(e => ({
        ...e,
        weather: {
          windSpeed:   String(windKmh),
          windDir:     String(Math.round(cur.wind_direction_10m || 0)),
          temperature: String(Math.round(cur.temperature_2m || 0)),
          visibility:  cur.visibility ? String(Math.round(cur.visibility/1000)) : '',
          beaufort:    String(beaufort),
          condition,
        }
      }));
      notify(`🌤 Weather: ${condition}, ${Math.round(cur.temperature_2m)}°C, B${beaufort} (${bf.desc})`,'success');
    } catch(e) {
      notify('Weather fetch failed: ' + e.message,'error');
    }
    setFetchingWx(false);
  };

  // ── Voice memo ──
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
      audioChunks.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size>0) audioChunks.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunks.current, { type:'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => setEditEntry(en => ({ ...en, voiceMemo:reader.result }));
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t=>t.stop());
        setRecording(false);
        notify('Voice memo saved','success');
      };
      mediaRecRef.current = mr;
      mr.start();
      setRecording(true);
    } catch(e) { notify('Microphone error: '+e.message,'error'); }
  };

  const stopVoice = () => {
    if (mediaRecRef.current?.state==='recording') mediaRecRef.current.stop();
  };

  // ── Photo upload ──
  const uploadPhoto = async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/jpg','image/webp'];
    if (!allowed.includes(file.type)) { notify('Images only (JPG/PNG/WebP)','error'); return; }
    if (file.size > 15*1024*1024) { notify('Max 15MB per photo','error'); return; }

    if (!driveConnected || !isDriveTokenValid()) {
      // Store as base64 locally if no drive
      const reader = new FileReader();
      reader.onload = () => {
        setEditEntry(e => ({ ...e, photos:[...e.photos, { localBase64:reader.result, caption:'', driveFileName:file.name }] }));
        notify('Photo added (local)','success');
      };
      reader.readAsDataURL(file);
      return;
    }

    setUploadingPhoto(true);
    try {
      const folderId  = await getOrCreateFolder(driveToken);
      const safeName  = file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const uploaded  = await driveUploadFile(driveToken, folderId, file, `diary_${Date.now()}_${safeName}`);
      setEditEntry(e => ({ ...e, photos:[...e.photos, { driveFileId:uploaded.id, driveFileName:file.name, caption:'' }] }));
      notify('Photo uploaded to Drive','success');
    } catch(err) {
      notify('Photo upload failed','error');
    }
    setUploadingPhoto(false);
  };

  const removePhoto = async (idx) => {
    const ph = editEntry.photos[idx];
    if (ph?.driveFileId && driveToken && isDriveTokenValid()) {
      try { await driveDeleteFile(driveToken, ph.driveFileId); } catch {}
    }
    setEditEntry(e => ({ ...e, photos:e.photos.filter((_,i)=>i!==idx) }));
  };

  // ── Save entry ──
  const saveEntry = () => {
    if (!editEntry.date) { notify('Date is required','error'); return; }
    if (!editEntry.memories && !editEntry.lat) { notify('Add at least a position or memory note','error'); return; }
    setSaving(true);
    const now = Date.now();
    if (editId) {
      const updated = entries.map(e => e.id===editId ? { ...editEntry, id:editId } : e);
      persistEntries(updated);
      notify('Entry updated ✅','success');
    } else {
      const newEntry = { ...editEntry, id:String(now) };
      persistEntries([newEntry, ...entries]);
      notify('Entry saved ✅','success');
    }
    setSaving(false);
    setEditEntry({ ...EMPTY_ENTRY, date:new Date().toISOString().split('T')[0], time:new Date().toTimeString().slice(0,5) });
    setEditId(null);
    setView('list');
  };

  const deleteEntry = (id) => {
    if (!window.confirm('Delete this diary entry?')) return;
    persistEntries(entries.filter(e=>e.id!==id));
    notify('Entry deleted','success');
    if (detailId===id) setView('list');
  };

  const startEdit = (entry) => {
    setEditEntry({ ...entry });
    setEditId(entry.id);
    setView('add');
  };

  const toggleTag = (tag) => {
    setEditEntry(e => ({
      ...e,
      tags: e.tags.includes(tag) ? e.tags.filter(t=>t!==tag) : [...e.tags, tag]
    }));
  };

  // ── Stats ──
  const totalMiles = calcTotalMiles([...entries].reverse());
  const allPorts   = [...new Set(entries.map(e=>e.portName).filter(Boolean))];
  const allWxTemps = entries.filter(e=>e.weather?.temperature).map(e=>({ date:e.date, temp:parseFloat(e.weather.temperature), wind:parseFloat(e.weather.windSpeed||0) }));

  // ── Heatmap canvas ──
  useEffect(() => {
    if (view!=='heatmap' || !heatCanvasRef.current) return;
    const canvas = heatCanvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);
    // Ocean bg
    ctx.fillStyle = '#020d1f';
    ctx.fillRect(0,0,W,H);
    // Grid
    ctx.strokeStyle='rgba(0,180,216,0.05)';ctx.lineWidth=0.5;
    for(let x=0;x<W;x+=W/12){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=H/6) {ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // Continents
    ctx.fillStyle='#0d2137';ctx.strokeStyle='rgba(0,180,216,0.2)';ctx.lineWidth=0.7;
    CONTINENTS.forEach(d=>{
      const path=new Path2D(d.replace(/(\d+\.?\d*)/g,(m,v,i,str)=>{
        const prev=str.slice(0,i).trim();
        const isX=prev.split(/[MmLlHhVvCcSsQqTtAaZz ]/).length%2===0;
        return isX?String(parseFloat(v)/1000*W):String(parseFloat(v)/500*H);
      }));
      ctx.fill(path);ctx.stroke(path);
    });
    // Plot positions
    const posEntries = entries.filter(e=>e.lat&&e.lng);
    posEntries.forEach((e,i) => {
      const lat=parseFloat(e.lat),lng=parseFloat(e.lng);
      const x=(lng+180)/360*W, y=(90-lat)/180*H;
      // Glow
      const g=ctx.createRadialGradient(x,y,0,x,y,14);
      g.addColorStop(0,'rgba(0,180,216,0.55)');
      g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill();
      // Dot
      ctx.fillStyle='rgba(0,200,150,0.9)';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    });
    // Legend
    ctx.fillStyle='rgba(0,180,216,0.6)';ctx.font=`bold ${Math.max(8,W*0.012)}px Orbitron,monospace`;
    ctx.textAlign='left';ctx.fillText(`${posEntries.length} POSITIONS LOGGED`,10,H-8);
  }, [view, entries]);

  // ── Filtered entries ──
  const filteredEntries = entries.filter(e => {
    if (filterTag  && !e.tags?.includes(filterTag)) return false;
    if (filterMood && e.mood!==filterMood) return false;
    if (searchQ) {
      const q=searchQ.toLowerCase();
      if (!e.memories?.toLowerCase().includes(q) && !e.portName?.toLowerCase().includes(q) && !e.date?.includes(q)) return false;
    }
    return true;
  });

  const detailEntry = entries.find(e=>e.id===detailId);

  if (!user) return (
    <div className="section">
      <div className="empty"><div className="empty-icon">🔐</div><div className="empty-t">Login Required</div><div className="empty-d">Please log in to access your Sea Diary.</div></div>
    </div>
  );

  // ── STYLES ──
  const card = { background:'var(--card,#0B1D35)', border:'1px solid var(--border,#1A3A5C)', borderRadius:13, padding:'1rem' };
  const btn  = (bg,color,border='none') => ({ padding:'7px 14px',borderRadius:8,background:bg,color,border,fontWeight:600,fontSize:'0.74rem',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:5,fontFamily:'inherit' });
  const inp  = { width:'100%',padding:'9px 12px',background:'var(--bg2,#071428)',border:'1px solid var(--border2,#1E4570)',borderRadius:8,color:'var(--text,#E2EBF8)',fontSize:'0.82rem',outline:'none',fontFamily:'inherit' };
  const lbl  = { fontSize:'0.63rem',color:'var(--text3,#4A5F80)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5,display:'block' };

  return (
    <div className="section" style={{ paddingBottom:'2rem' }}>

      {/* ── PHOTO MODAL ── */}
      {photoModal && <PhotoModal url={photoModal.url} name={photoModal.name} onClose={()=>setPhotoModal(null)} />}
      {/* ── VOYAGE ANIMATION ── */}
      {showAnim && <VoyageAnimation onClose={()=>setShowAnim(false)} portsDb={portsDb} />}

      {/* ── DRIVE BANNER ── */}
      <div style={{ background:driveConnected?'rgba(0,200,100,0.06)':'rgba(0,180,216,0.05)', border:`1px solid ${driveConnected?'rgba(0,200,100,0.22)':'rgba(0,180,216,0.2)'}`, borderRadius:12, padding:'0.75rem 1rem', marginBottom:'1rem', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:'0.74rem',fontWeight:700,color:driveConnected?'var(--green,#00C896)':'var(--cyan,#00B4D8)',fontFamily:'Orbitron,monospace' }}>{driveConnected?'✅ Photo Storage Connected':'☁️ Connect Photo Storage'}</div>
          {driveConnected && driveEmail && <div style={{ fontSize:'0.64rem',color:'var(--text3,#4A5F80)',marginTop:2 }}>Connected as <strong style={{color:'var(--cyan,#00B4D8)'}}>{driveEmail}</strong></div>}
          <div style={{ fontSize:'0.67rem',color:'var(--text3,#4A5F80)',marginTop:3,lineHeight:1.5 }}>{driveConnected?'Diary photos saved to your private Google Drive folder.':'Connect Google Drive to save diary photos securely.'}</div>
        </div>
        {driveConnected
          ? <div style={{display:'flex',gap:6,flexShrink:0}}>
              <a href="https://drive.google.com/drive/folders" target="_blank" rel="noreferrer" style={{...btn('rgba(0,200,100,0.1)','var(--green,#00C896)'),border:'1px solid rgba(0,200,100,0.3)',textDecoration:'none'}}>📂 My Files</a>
              <button onClick={disconnectDrive} style={btn('none','var(--text3,#4A5F80)','1px solid rgba(255,255,255,0.1)')}>Disconnect</button>
            </div>
          : <button onClick={connectDrive} disabled={connectingDrive} style={{...btn('linear-gradient(135deg,#4285f4,#34a853)','#fff'),padding:'8px 18px',opacity:connectingDrive?0.7:1}}>{connectingDrive?'Connecting…':'🔗 Connect Storage'}</button>
        }
      </div>

      {/* ── HEADER ── */}
      <div className="sec-hdr">
        <div className="sec-title">📔 Sea Diary</div>
        <div style={{ display:'flex',gap:6,flexWrap:'wrap',alignItems:'center' }}>
          <button onClick={()=>setView('stats')}   style={btn(view==='stats'?'rgba(240,165,0,0.15)':'rgba(255,255,255,0.05)', view==='stats'?'var(--gold,#F0A500)':'var(--text2,#8A9BBF)', view==='stats'?'1px solid rgba(240,165,0,0.4)':'1px solid rgba(255,255,255,0.1)')}>📊 Stats</button>
          <button onClick={()=>setView('heatmap')} style={btn(view==='heatmap'?'rgba(0,180,216,0.15)':'rgba(255,255,255,0.05)', view==='heatmap'?'var(--cyan,#00B4D8)':'var(--text2,#8A9BBF)', view==='heatmap'?'1px solid rgba(0,180,216,0.4)':'1px solid rgba(255,255,255,0.1)')}>🌍 Heatmap</button>
          <button onClick={()=>setShowAnim(true)}  style={btn('rgba(124,58,237,0.15)','#a78bfa','1px solid rgba(124,58,237,0.35)')}>🎬 Voyage Video</button>
          <button onClick={()=>generateVoyageReport(entries, user?.displayName||user?.email?.split('@')[0]||'Seafarer')} style={btn('rgba(240,165,0,0.12)','var(--gold,#F0A500)','1px solid rgba(240,165,0,0.35)')}>📄 Voyage Report</button>
          <button onClick={()=>{ setView('add'); setEditId(null); setEditEntry({...EMPTY_ENTRY,date:new Date().toISOString().split('T')[0],time:new Date().toTimeString().slice(0,5)}); }}
            style={{ ...btn('linear-gradient(135deg,var(--cyan,#00B4D8),#1565C0)','#fff'), padding:'8px 16px' }}>
            {view==='add'&&!editId?'✕ Cancel':'+ New Entry'}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          VIEW: STATS
      ═══════════════════════════════════════════════════════════════════ */}
      {view==='stats' && (
        <div style={{ display:'grid',gap:'1rem' }}>
          {/* KPI row */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10 }}>
            {[
              { label:'Days Logged',    value:entries.length,       color:'var(--cyan,#00B4D8)',   icon:'📔' },
              { label:'Nautical Miles', value:Math.round(totalMiles),color:'var(--green,#00C896)', icon:'⛵' },
              { label:'Ports Visited',  value:allPorts.length,      color:'var(--gold,#F0A500)',   icon:'⚓' },
              { label:'Photos Taken',   value:entries.reduce((s,e)=>s+(e.photos?.length||0),0), color:'#a78bfa', icon:'📸' },
              { label:'Voice Memos',    value:entries.filter(e=>e.voiceMemo).length, color:'var(--cyan,#00B4D8)', icon:'🎙' },
              { label:'Avg Rating',     value:(entries.filter(e=>e.starRating).reduce((s,e)=>s+e.starRating,0)/(entries.filter(e=>e.starRating).length||1)).toFixed(1)+'★', color:'var(--gold,#F0A500)', icon:'⭐' },
            ].map((k,i)=>(
              <div key={i} style={{ ...card, textAlign:'center', border:`1px solid ${k.color}22` }}>
                <div style={{ fontSize:'1.4rem',marginBottom:4 }}>{k.icon}</div>
                <div style={{ fontSize:'1.5rem',fontWeight:900,color:k.color,fontFamily:'Orbitron,monospace' }}>{k.value}</div>
                <div style={{ fontSize:'0.6rem',color:'var(--text3,#4A5F80)',marginTop:3,textTransform:'uppercase',letterSpacing:'0.08em' }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* Ports visited */}
          {allPorts.length > 0 && (
            <div style={card}>
              <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'var(--gold,#F0A500)',marginBottom:'0.8rem' }}>⚓ PORTS VISITED</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:6 }}>
                {allPorts.map((p,i)=>(
                  <span key={i} style={{ fontSize:'0.74rem',padding:'4px 12px',borderRadius:20,background:'rgba(240,165,0,0.08)',border:'1px solid rgba(240,165,0,0.2)',color:'var(--gold,#F0A500)' }}>⚓ {p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Mood breakdown */}
          <div style={card}>
            <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'var(--cyan,#00B4D8)',marginBottom:'0.8rem' }}>😌 MOOD BREAKDOWN</div>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
              {MOODS.map(m=>{
                const count=entries.filter(e=>e.mood===m.emoji).length;
                return count>0?(
                  <div key={m.emoji} style={{ background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'8px 14px',textAlign:'center',minWidth:70 }}>
                    <div style={{ fontSize:'1.5rem' }}>{m.emoji}</div>
                    <div style={{ fontSize:'0.7rem',fontWeight:700,color:'var(--text,#E2EBF8)',marginTop:3 }}>{count}</div>
                    <div style={{ fontSize:'0.58rem',color:'var(--text3,#4A5F80)' }}>{m.label}</div>
                  </div>
                ):null;
              })}
            </div>
          </div>

          {/* Weather chart (simple bars) */}
          {allWxTemps.length > 1 && (
            <div style={card}>
              <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'var(--cyan,#00B4D8)',marginBottom:'0.8rem' }}>🌡 WEATHER HISTORY</div>
              <div style={{ display:'flex',alignItems:'flex-end',gap:3,height:80,overflow:'hidden' }}>
                {allWxTemps.slice(-30).map((w,i)=>{
                  const maxT=Math.max(...allWxTemps.map(x=>x.temp),1);
                  const h=Math.round((w.temp/maxT)*70);
                  return (
                    <div key={i} title={`${w.date}: ${w.temp}°C`} style={{ flex:1,minWidth:6,display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
                      <div style={{ width:'100%',height:`${h}px`,background:`rgba(0,180,216,${0.3+i/allWxTemps.length*0.7})`,borderRadius:'3px 3px 0 0',transition:'height 0.3s' }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',marginTop:4,fontSize:'0.6rem',color:'var(--text3,#4A5F80)' }}>
                <span>{allWxTemps[Math.max(0,allWxTemps.length-30)]?.date}</span>
                <span>Temperature (°C)</span>
                <span>{allWxTemps[allWxTemps.length-1]?.date}</span>
              </div>
            </div>
          )}

          <button onClick={()=>setView('list')} style={{ ...btn('rgba(255,255,255,0.05)','var(--text2,#8A9BBF)','1px solid rgba(255,255,255,0.1)'), alignSelf:'flex-start' }}>← Back to Diary</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          VIEW: HEATMAP
      ═══════════════════════════════════════════════════════════════════ */}
      {view==='heatmap' && (
        <div>
          <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.76rem',color:'var(--cyan,#00B4D8)',marginBottom:'0.8rem' }}>🌍 WORLD POSITION HEATMAP</div>
          <canvas ref={heatCanvasRef} width={900} height={450}
            style={{ width:'100%',borderRadius:12,border:'1px solid rgba(0,180,216,0.2)',display:'block',background:'#020d1f' }} />
          <div style={{ marginTop:8,fontSize:'0.68rem',color:'var(--text3,#4A5F80)' }}>Each dot represents a diary entry with a recorded position. {entries.filter(e=>e.lat&&e.lng).length} of {entries.length} entries have GPS coordinates.</div>
          <button onClick={()=>setView('list')} style={{ ...btn('rgba(255,255,255,0.05)','var(--text2,#8A9BBF)','1px solid rgba(255,255,255,0.1)'), marginTop:'1rem' }}>← Back to Diary</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          VIEW: DETAIL
      ═══════════════════════════════════════════════════════════════════ */}
      {view==='detail' && detailEntry && (
        <div style={{ display:'grid',gap:'1rem' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
            <div>
              <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan,#00B4D8)' }}>{detailEntry.date} {detailEntry.time}</div>
              <div style={{ fontSize:'1rem',fontWeight:700,color:'var(--text,#E2EBF8)',marginTop:2 }}>{detailEntry.portName||'At Sea'}</div>
            </div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              <button onClick={()=>startEdit(detailEntry)} style={btn('rgba(240,165,0,0.1)','var(--gold,#F0A500)','1px solid rgba(240,165,0,0.35)')}>✏️ Edit</button>
              <button onClick={()=>deleteEntry(detailEntry.id)} style={btn('rgba(255,71,87,0.1)','#ff4757','1px solid rgba(255,71,87,0.35)')}>🗑 Delete</button>
              <button onClick={()=>setView('list')} style={btn('rgba(255,255,255,0.05)','var(--text2,#8A9BBF)','1px solid rgba(255,255,255,0.1)')}>← Back</button>
            </div>
          </div>

          {/* Header card */}
          <div style={{ ...card, background:'linear-gradient(135deg,rgba(0,20,50,0.9),rgba(0,30,70,0.9))', border:'1px solid rgba(0,180,216,0.25)' }}>
            <div style={{ display:'flex',gap:16,flexWrap:'wrap',alignItems:'center' }}>
              {detailEntry.mood && <div style={{ textAlign:'center' }}><div style={{ fontSize:'2.5rem' }}>{detailEntry.mood}</div><div style={{ fontSize:'0.6rem',color:'var(--text3,#4A5F80)' }}>{MOODS.find(m=>m.emoji===detailEntry.mood)?.label}</div></div>}
              <div style={{ flex:1 }}>
                {detailEntry.starRating>0 && <div style={{ color:'var(--gold,#F0A500)',fontSize:'1.1rem',letterSpacing:3,marginBottom:6 }}>{'★'.repeat(detailEntry.starRating)}{'☆'.repeat(5-detailEntry.starRating)}</div>}
                {detailEntry.watch && <div style={{ fontSize:'0.78rem',color:'var(--text2,#8A9BBF)',marginBottom:3 }}>⏱ Watch: <strong style={{color:'var(--cyan,#00B4D8)'}}>{detailEntry.watch}</strong></div>}
                {detailEntry.lat && detailEntry.lng && <div style={{ fontSize:'0.76rem',color:'var(--text2,#8A9BBF)',marginBottom:3 }}>📍 {parseFloat(detailEntry.lat).toFixed(4)}°, {parseFloat(detailEntry.lng).toFixed(4)}°</div>}
                {detailEntry.crew && <div style={{ fontSize:'0.76rem',color:'var(--text2,#8A9BBF)' }}>👥 {detailEntry.crew}</div>}
              </div>
              {detailEntry.weather?.temperature && (
                <div style={{ background:'rgba(0,180,216,0.07)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:10,padding:'0.8rem',minWidth:130,textAlign:'center' }}>
                  <div style={{ fontSize:'1.6rem',fontWeight:900,color:'var(--cyan,#00B4D8)',fontFamily:'Orbitron,monospace' }}>{detailEntry.weather.temperature}°</div>
                  <div style={{ fontSize:'0.7rem',color:'var(--text2,#8A9BBF)',marginTop:2 }}>{detailEntry.weather.condition||'—'}</div>
                  <div style={{ fontSize:'0.65rem',color:'var(--text3,#4A5F80)',marginTop:3 }}>💨 {detailEntry.weather.windSpeed||'?'} km/h · B{detailEntry.weather.beaufort||'?'}</div>
                  {detailEntry.weather.visibility && <div style={{ fontSize:'0.63rem',color:'var(--text3,#4A5F80)' }}>👁 {detailEntry.weather.visibility} km visibility</div>}
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {detailEntry.tags?.length>0 && (
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {detailEntry.tags.map(t=>(
                <span key={t} style={{ fontSize:'0.72rem',padding:'4px 12px',borderRadius:20,background:'rgba(0,180,216,0.08)',border:'1px solid rgba(0,180,216,0.2)',color:'var(--cyan,#00B4D8)' }}>{t}</span>
              ))}
            </div>
          )}

          {/* Memories */}
          {detailEntry.memories && (
            <div style={card}>
              <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--text3,#4A5F80)',marginBottom:'0.7rem',letterSpacing:'0.1em' }}>📝 MEMORIES</div>
              <div style={{ fontSize:'0.86rem',color:'var(--text,#E2EBF8)',lineHeight:1.8,whiteSpace:'pre-wrap' }}>{detailEntry.memories}</div>
            </div>
          )}

          {/* Photos */}
          {detailEntry.photos?.length>0 && (
            <div style={card}>
              <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--text3,#4A5F80)',marginBottom:'0.8rem',letterSpacing:'0.1em' }}>📸 PHOTOS ({detailEntry.photos.length})</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8 }}>
                {detailEntry.photos.map((ph,i)=>(
                  <div key={i} style={{ background:'rgba(0,0,0,0.3)',borderRadius:8,overflow:'hidden',aspectRatio:'1',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'1px solid rgba(0,180,216,0.15)' }}
                    onClick={()=>ph.localBase64?setPhotoModal({url:ph.localBase64,name:ph.driveFileName||'Photo'}):ph.driveFileId&&window.open(`https://drive.google.com/file/d/${ph.driveFileId}/view`,'_blank')}>
                    {ph.localBase64
                      ? <img src={ph.localBase64} alt={ph.caption||'Photo'} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                      : <div style={{ textAlign:'center',padding:'1rem' }}><div style={{ fontSize:'2rem' }}>🖼</div><div style={{ fontSize:'0.65rem',color:'var(--text3,#4A5F80)',marginTop:4 }}>{ph.driveFileName||'Photo'}</div><div style={{ fontSize:'0.6rem',color:'var(--cyan,#00B4D8)',marginTop:4 }}>☁️ Drive</div></div>
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice memo */}
          {detailEntry.voiceMemo && (
            <div style={card}>
              <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--text3,#4A5F80)',marginBottom:'0.7rem',letterSpacing:'0.1em' }}>🎙 VOICE MEMO</div>
              <audio controls src={detailEntry.voiceMemo} style={{ width:'100%',height:40 }} />
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          VIEW: ADD / EDIT
      ═══════════════════════════════════════════════════════════════════ */}
      {view==='add' && (
        <div style={{ ...card, border:'1px solid rgba(0,180,216,0.3)' }}>
          <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.8rem',color:'var(--cyan,#00B4D8)',marginBottom:'1.2rem' }}>
            {editId ? '✏️ EDIT ENTRY' : '+ NEW DIARY ENTRY'}
          </div>

          {/* ── Date / Time / Watch ── */}
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:'1rem' }}>
            <div><label style={lbl}>Date *</label><input type="date" value={editEntry.date} onChange={e=>setEditEntry(x=>({...x,date:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Time</label><input type="time" value={editEntry.time} onChange={e=>setEditEntry(x=>({...x,time:e.target.value}))} style={inp} /></div>
            <div>
              <label style={lbl}>Watch</label>
              <select value={editEntry.watch} onChange={e=>setEditEntry(x=>({...x,watch:e.target.value}))} style={{...inp,cursor:'pointer'}}>
                <option value="">— Select —</option>
                {WATCHES.map(w=><option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* ── Position ── */}
          <div style={{ background:'rgba(0,180,216,0.04)',border:'1px solid rgba(0,180,216,0.15)',borderRadius:10,padding:'0.9rem',marginBottom:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--cyan,#00B4D8)',marginBottom:'0.7rem',letterSpacing:'0.1em' }}>📍 POSITION</div>
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8 }}>
              <div><label style={lbl}>Latitude</label><input type="number" step="0.0001" placeholder="e.g. 1.2847" value={editEntry.lat} onChange={e=>setEditEntry(x=>({...x,lat:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Longitude</label><input type="number" step="0.0001" placeholder="e.g. 103.8610" value={editEntry.lng} onChange={e=>setEditEntry(x=>({...x,lng:e.target.value}))} style={inp} /></div>
            </div>
            <div style={{ marginBottom:8 }}><label style={lbl}>Port / Location Name</label><input value={editEntry.portName} onChange={e=>setEditEntry(x=>({...x,portName:e.target.value}))} placeholder="e.g. Port of Singapore, Strait of Malacca…" style={inp} /></div>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              <button onClick={fetchGPS} disabled={fetchingPos} style={btn('rgba(0,180,216,0.12)','var(--cyan,#00B4D8)','1px solid rgba(0,180,216,0.35)')}>
                {fetchingPos?'⏳ Locating…':'📍 Use GPS'}
              </button>
              <button onClick={()=>fetchWeather()} disabled={fetchingWx} style={btn('rgba(0,200,100,0.1)','var(--green,#00C896)','1px solid rgba(0,200,100,0.3)')}>
                {fetchingWx?'⏳ Fetching…':'🌤 Fetch Weather'}
              </button>
            </div>
          </div>

          {/* ── Weather ── */}
          <div style={{ background:'rgba(0,200,100,0.04)',border:'1px solid rgba(0,200,100,0.15)',borderRadius:10,padding:'0.9rem',marginBottom:'1rem' }}>
            <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--green,#00C896)',marginBottom:'0.7rem',letterSpacing:'0.1em' }}>🌤 WEATHER LOG</div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:8 }}>
              <div><label style={lbl}>Temperature (°C)</label><input value={editEntry.weather.temperature} onChange={e=>setEditEntry(x=>({...x,weather:{...x.weather,temperature:e.target.value}}))} placeholder="e.g. 28" style={inp} /></div>
              <div><label style={lbl}>Wind Speed (km/h)</label><input value={editEntry.weather.windSpeed} onChange={e=>setEditEntry(x=>({...x,weather:{...x.weather,windSpeed:e.target.value}}))} placeholder="e.g. 25" style={inp} /></div>
              <div><label style={lbl}>Wind Dir (°)</label><input value={editEntry.weather.windDir} onChange={e=>setEditEntry(x=>({...x,weather:{...x.weather,windDir:e.target.value}}))} placeholder="e.g. 270" style={inp} /></div>
              <div><label style={lbl}>Beaufort Scale</label>
                <select value={editEntry.weather.beaufort} onChange={e=>setEditEntry(x=>({...x,weather:{...x.weather,beaufort:e.target.value}}))} style={{...inp,cursor:'pointer'}}>
                  <option value="">— Select —</option>
                  {BEAUFORT.map(b=><option key={b.b} value={String(b.b)}>B{b.b} — {b.desc}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Visibility (km)</label><input value={editEntry.weather.visibility} onChange={e=>setEditEntry(x=>({...x,weather:{...x.weather,visibility:e.target.value}}))} placeholder="e.g. 10" style={inp} /></div>
              <div><label style={lbl}>Condition</label><input value={editEntry.weather.condition} onChange={e=>setEditEntry(x=>({...x,weather:{...x.weather,condition:e.target.value}}))} placeholder="e.g. Partly Cloudy" style={inp} /></div>
            </div>
          </div>

          {/* ── Mood ── */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Mood / Feeling</label>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
              {MOODS.map(m=>(
                <button key={m.emoji} onClick={()=>setEditEntry(e=>({...e,mood:e.mood===m.emoji?'':m.emoji}))}
                  style={{ padding:'8px 12px',borderRadius:10,border:`1px solid ${editEntry.mood===m.emoji?'var(--cyan,#00B4D8)':'rgba(255,255,255,0.1)'}`,background:editEntry.mood===m.emoji?'rgba(0,180,216,0.12)':'transparent',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:2,transition:'all 0.15s' }}>
                  <span style={{ fontSize:'1.4rem' }}>{m.emoji}</span>
                  <span style={{ fontSize:'0.58rem',color:editEntry.mood===m.emoji?'var(--cyan,#00B4D8)':'var(--text3,#4A5F80)' }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Star Rating ── */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Day Rating</label>
            <StarRating value={editEntry.starRating} onChange={v=>setEditEntry(e=>({...e,starRating:v}))} />
          </div>

          {/* ── Crew mentions ── */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Crew Mentions</label>
            <input value={editEntry.crew} onChange={e=>setEditEntry(x=>({...x,crew:e.target.value}))} placeholder="e.g. Chief Mate Kumar, AB Santos, 2/O Ramos…" style={inp} />
          </div>

          {/* ── Tags ── */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Tags</label>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:8 }}>
              {ENTRY_TAGS.map(t=>(
                <button key={t} onClick={()=>toggleTag(t)}
                  style={{ padding:'4px 10px',borderRadius:20,border:`1px solid ${editEntry.tags.includes(t)?'var(--cyan,#00B4D8)':'rgba(255,255,255,0.1)'}`,background:editEntry.tags.includes(t)?'rgba(0,180,216,0.12)':'transparent',color:editEntry.tags.includes(t)?'var(--cyan,#00B4D8)':'var(--text3,#4A5F80)',fontSize:'0.72rem',cursor:'pointer',transition:'all 0.15s' }}>{t}</button>
              ))}
            </div>
            <div style={{ display:'flex',gap:6 }}>
              <input value={editEntry.customTag} onChange={e=>setEditEntry(x=>({...x,customTag:e.target.value}))} placeholder="#custom tag" style={{...inp,flex:1}} onKeyDown={e=>{if(e.key==='Enter'&&editEntry.customTag.trim()){toggleTag(editEntry.customTag.trim().startsWith('#')?editEntry.customTag.trim():'#'+editEntry.customTag.trim());setEditEntry(x=>({...x,customTag:''}));}}} />
              <button onClick={()=>{if(editEntry.customTag.trim()){toggleTag(editEntry.customTag.trim().startsWith('#')?editEntry.customTag.trim():'#'+editEntry.customTag.trim());setEditEntry(x=>({...x,customTag:''}));}}} style={btn('rgba(0,180,216,0.1)','var(--cyan,#00B4D8)','1px solid rgba(0,180,216,0.3)')}>+ Add</button>
            </div>
            {editEntry.tags.length>0 && (
              <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginTop:6 }}>
                {editEntry.tags.map(t=>(
                  <span key={t} style={{ fontSize:'0.7rem',padding:'3px 9px',borderRadius:20,background:'rgba(0,180,216,0.1)',border:'1px solid rgba(0,180,216,0.25)',color:'var(--cyan,#00B4D8)',display:'flex',alignItems:'center',gap:5 }}>
                    {t}
                    <button onClick={()=>toggleTag(t)} style={{ background:'none',border:'none',color:'var(--text3,#4A5F80)',cursor:'pointer',padding:0,fontSize:'0.75rem' }}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Memories ── */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Memories & Notes *</label>
            <textarea value={editEntry.memories} onChange={e=>setEditEntry(x=>({...x,memories:e.target.value}))} placeholder="Write about today… the sea conditions, what you saw, how you felt, a memorable moment with the crew, something that made you smile, a challenge you overcame…" rows={6}
              style={{ ...inp, resize:'vertical', minHeight:120, lineHeight:1.7 }} />
          </div>

          {/* ── Photos ── */}
          <div style={{ marginBottom:'1rem' }}>
            <label style={lbl}>Photos {driveConnected?'(→ Google Drive)':'(→ local)'}</label>
            <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:8 }}>
              <label style={{ ...btn('rgba(0,180,216,0.1)','var(--cyan,#00B4D8)','1px solid rgba(0,180,216,0.3)'), cursor:uploadingPhoto?'default':'pointer', opacity:uploadingPhoto?0.6:1 }}>
                {uploadingPhoto?'⏳ Uploading…':'📸 Add Photo'}
                <input type="file" accept="image/*" multiple style={{display:'none'}} disabled={uploadingPhoto}
                  onChange={e=>{ Array.from(e.target.files||[]).forEach(f=>uploadPhoto(f)); e.target.value=''; }} />
              </label>
            </div>
            {editEntry.photos.length > 0 && (
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:8 }}>
                {editEntry.photos.map((ph,i)=>(
                  <div key={i} style={{ position:'relative',borderRadius:8,overflow:'hidden',border:'1px solid rgba(0,180,216,0.15)',aspectRatio:'1',background:'rgba(0,0,0,0.3)' }}>
                    {ph.localBase64
                      ? <img src={ph.localBase64} alt="diary" style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                      : <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',padding:'0.5rem',textAlign:'center' }}>
                          <div style={{ fontSize:'1.5rem' }}>🖼</div>
                          <div style={{ fontSize:'0.58rem',color:'var(--text3,#4A5F80)',marginTop:3,wordBreak:'break-all' }}>{ph.driveFileName}</div>
                          <div style={{ fontSize:'0.6rem',color:'var(--cyan,#00B4D8)',marginTop:2 }}>☁️</div>
                        </div>
                    }
                    <button onClick={()=>removePhoto(i)}
                      style={{ position:'absolute',top:3,right:3,background:'rgba(0,0,0,0.7)',border:'none',color:'#fff',borderRadius:'50%',width:20,height:20,fontSize:'0.65rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
                    <input value={ph.caption||''} onChange={e=>{const photos=[...editEntry.photos];photos[i]={...photos[i],caption:e.target.value};setEditEntry(x=>({...x,photos}));}}
                      placeholder="Caption…" style={{ position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,0.7)',border:'none',color:'#fff',fontSize:'0.58rem',padding:'4px 6px',outline:'none' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Voice Memo ── */}
          <div style={{ marginBottom:'1.2rem' }}>
            <label style={lbl}>Voice Memo</label>
            <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
              {!recording
                ? <button onClick={startVoice} style={btn('rgba(255,71,87,0.1)','#ff4757','1px solid rgba(255,71,87,0.3)')}>🎙 Record Memo</button>
                : <button onClick={stopVoice}  style={{ ...btn('rgba(255,71,87,0.2)','#ff4757','1px solid rgba(255,71,87,0.5)'), animation:'pulse 1s infinite' }}>⏹ Stop Recording</button>
              }
              {editEntry.voiceMemo && !recording && (
                <>
                  <audio controls src={editEntry.voiceMemo} style={{ height:36,flex:1,minWidth:140 }} />
                  <button onClick={()=>setEditEntry(e=>({...e,voiceMemo:''}))} style={{ background:'none',border:'none',color:'var(--text3,#4A5F80)',cursor:'pointer',fontSize:'0.8rem' }}>✕</button>
                </>
              )}
              {recording && <span style={{ fontSize:'0.7rem',color:'#ff4757',animation:'pulse 1s infinite' }}>🔴 Recording…</span>}
            </div>
          </div>

          {/* ── Save / Cancel ── */}
          <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
            <button onClick={saveEntry} disabled={saving} style={{ ...btn('linear-gradient(135deg,var(--cyan,#00B4D8),#1565C0)','#fff'), padding:'10px 24px',fontSize:'0.82rem' }}>
              {saving?'Saving…':'✅ Save Entry'}
            </button>
            <button onClick={()=>{ setView('list'); setEditId(null); setEditEntry({...EMPTY_ENTRY}); }} style={btn('rgba(255,255,255,0.05)','var(--text2,#8A9BBF)','1px solid rgba(255,255,255,0.1)')}>Cancel</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          VIEW: LIST
      ═══════════════════════════════════════════════════════════════════ */}
      {view==='list' && (
        <>
          {/* Search + Filters */}
          <div style={{ display:'flex',gap:8,marginBottom:'0.8rem',flexWrap:'wrap',alignItems:'center' }}>
            <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Search entries…"
              style={{ flex:1,minWidth:140,...inp,padding:'7px 12px' }} />
            <select value={filterMood} onChange={e=>setFilterMood(e.target.value)} style={{ ...inp,width:'auto',padding:'7px 10px',cursor:'pointer' }}>
              <option value="">All Moods</option>
              {MOODS.map(m=><option key={m.emoji} value={m.emoji}>{m.emoji} {m.label}</option>)}
            </select>
            <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} style={{ ...inp,width:'auto',padding:'7px 10px',cursor:'pointer' }}>
              <option value="">All Tags</option>
              {ENTRY_TAGS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Sea miles banner */}
          {entries.length > 1 && totalMiles > 0 && (
            <div style={{ background:'linear-gradient(135deg,rgba(0,20,50,0.8),rgba(0,40,90,0.8))',border:'1px solid rgba(0,180,216,0.25)',borderRadius:12,padding:'0.9rem 1.2rem',marginBottom:'1rem',display:'flex',alignItems:'center',gap:16,flexWrap:'wrap' }}>
              <span style={{ fontSize:'1.8rem' }}>⛵</span>
              <div>
                <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.65rem',color:'var(--text3,#4A5F80)',letterSpacing:'0.1em' }}>TOTAL DISTANCE SAILED</div>
                <div style={{ fontSize:'1.6rem',fontWeight:900,color:'var(--cyan,#00B4D8)',fontFamily:'Orbitron,monospace' }}>{Math.round(totalMiles).toLocaleString()} <span style={{fontSize:'0.9rem',color:'var(--text2,#8A9BBF)'}}>NM</span></div>
              </div>
              <div style={{ marginLeft:'auto',textAlign:'right' }}>
                <div style={{ fontSize:'0.65rem',color:'var(--text3,#4A5F80)',letterSpacing:'0.1em' }}>ENTRIES</div>
                <div style={{ fontSize:'1.4rem',fontWeight:700,color:'var(--gold,#F0A500)',fontFamily:'Orbitron,monospace' }}>{entries.length}</div>
              </div>
            </div>
          )}

          {/* Entry list */}
          {filteredEntries.length===0 && (
            <div className="empty">
              <div className="empty-icon">📔</div>
              <div className="empty-t">{entries.length===0?'No Entries Yet':'No Entries Match'}</div>
              <div className="empty-d">{entries.length===0?'Click "+ New Entry" to start your Sea Diary.':'Try a different search or filter.'}</div>
            </div>
          )}

          <div style={{ display:'grid',gap:'0.8rem' }}>
            {filteredEntries.map(entry => {
              const hasWeather = entry.weather?.temperature || entry.weather?.condition;
              return (
                <div key={entry.id} style={{ ...card, cursor:'pointer', transition:'all 0.2s', borderLeft:`4px solid ${entry.starRating>=4?'var(--gold,#F0A500)':entry.starRating>=2?'var(--cyan,#00B4D8)':'var(--border,#1A3A5C)'}` }}
                  onClick={()=>{ setDetailId(entry.id); setView('detail'); }}>
                  <div style={{ display:'flex',gap:10,alignItems:'flex-start' }}>
                    {/* Mood */}
                    <div style={{ fontSize:'1.8rem',flexShrink:0,marginTop:2 }}>{entry.mood||'📔'}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      {/* Header row */}
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap' }}>
                        <div>
                          <div style={{ fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--cyan,#00B4D8)',fontWeight:700 }}>{entry.date} {entry.time&&<span style={{color:'var(--text3,#4A5F80)',fontWeight:400}}>{entry.time}</span>}</div>
                          <div style={{ fontSize:'0.9rem',fontWeight:700,color:'var(--text,#E2EBF8)',marginTop:2 }}>{entry.portName||'At Sea'}</div>
                        </div>
                        <div style={{ display:'flex',gap:6,alignItems:'center',flexShrink:0 }}>
                          {entry.starRating>0 && <span style={{ color:'var(--gold,#F0A500)',fontSize:'0.8rem' }}>{'★'.repeat(entry.starRating)}</span>}
                          {entry.watch && <span style={{ fontSize:'0.62rem',padding:'2px 7px',borderRadius:10,background:'rgba(0,180,216,0.08)',border:'1px solid rgba(0,180,216,0.2)',color:'var(--cyan,#00B4D8)' }}>{entry.watch}</span>}
                          {entry.photos?.length>0 && <span style={{ fontSize:'0.68rem',color:'var(--text3,#4A5F80)' }}>📸{entry.photos.length}</span>}
                          {entry.voiceMemo && <span style={{ fontSize:'0.68rem',color:'var(--text3,#4A5F80)' }}>🎙</span>}
                        </div>
                      </div>
                      {/* Meta */}
                      <div style={{ display:'flex',gap:12,marginTop:5,flexWrap:'wrap' }}>
                        {entry.lat && entry.lng && <span style={{ fontSize:'0.7rem',color:'var(--text3,#4A5F80)' }}>📍 {parseFloat(entry.lat).toFixed(3)}°, {parseFloat(entry.lng).toFixed(3)}°</span>}
                        {hasWeather && <span style={{ fontSize:'0.7rem',color:'var(--text3,#4A5F80)' }}>🌡 {entry.weather.temperature}°C · 💨 B{entry.weather.beaufort||'?'}</span>}
                        {entry.crew && <span style={{ fontSize:'0.7rem',color:'var(--text3,#4A5F80)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:160 }}>👥 {entry.crew}</span>}
                      </div>
                      {/* Memories preview */}
                      {entry.memories && <div style={{ fontSize:'0.78rem',color:'var(--text2,#8A9BBF)',marginTop:6,lineHeight:1.5,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>{entry.memories}</div>}
                      {/* Tags */}
                      {entry.tags?.length>0 && (
                        <div style={{ display:'flex',gap:5,flexWrap:'wrap',marginTop:6 }}>
                          {entry.tags.map(t=><span key={t} style={{ fontSize:'0.62rem',padding:'2px 8px',borderRadius:10,background:'rgba(0,180,216,0.07)',border:'1px solid rgba(0,180,216,0.15)',color:'rgba(0,180,216,0.7)' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div style={{ display:'flex',flexDirection:'column',gap:4,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>startEdit(entry)} style={{ ...btn('rgba(240,165,0,0.08)','var(--gold,#F0A500)','1px solid rgba(240,165,0,0.25)'), fontSize:'0.6rem',padding:'4px 7px' }}>✏️</button>
                      <button onClick={()=>deleteEntry(entry.id)} style={{ ...btn('rgba(255,71,87,0.08)','#ff4757','1px solid rgba(255,71,87,0.2)'), fontSize:'0.6rem',padding:'4px 7px' }}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Info box */}
      {view==='list' && (
        <div className="info-box" style={{ marginTop:'1.5rem',fontSize:'0.72rem' }}>
          🔒 All diary entries stored privately on this device. Photos saved to your personal Google Drive. Your memories are yours alone.
        </div>
      )}
    </div>
  );
}

export default SeaDiaryPage;
