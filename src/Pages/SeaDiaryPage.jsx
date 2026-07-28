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

// ─── VOYAGE ANIMATION v16 — FIXED RECORDING (createImageBitmap, no visible div) ──
// Uses createImageBitmap() for fast, low-memory WebGL capture.
// Mapbox div remains hidden at all times — WebGL renders fine in background.

function VoyageAnimation({ onClose, portsDb = [] }) {

  // ── Refs ──
  const mapDivRef    = useRef(null);   // Leaflet planning map
  const mbDivRef     = useRef(null);   // Mapbox GL map (hidden, for tile capture)
  const mbMapRef     = useRef(null);   // Mapbox GL instance
  const mbLoadedRef  = useRef(false);
  const mapRef       = useRef(null);   // Leaflet instance
  const leafletReady = useRef(false);
  const markersRef   = useRef([]);
  const polylineRef  = useRef([]);
  const canvasRef    = useRef(null);   // recording canvas
  const animRef      = useRef(null);
  const recorderRef  = useRef(null);
  const chunksRef    = useRef([]);
  const countriesRef = useRef([]);
  const pointsRef    = useRef([]);
  const videoSecsRef = useRef(30);

  // ── State ──
  const [points,        setPoints]       = useState([]);
  const [countries,     setCountries]    = useState([]);
  const [distStats,     setDistStats]    = useState(null);
  const [videoSecs,     setVideoSecs]    = useState(30);
  const [playing,       setPlaying]      = useState(false);
  const [recording,     setRecording]    = useState(false);
  const [progress,      setProgress]     = useState(0);
  const [status,        setStatus]       = useState('');
  const [detectingCtry, setDetectingCtry]= useState(false);
  const [showCanvas,    setShowCanvas]   = useState(false);
  const [routeFinished, setRouteFinished]= useState(false);
  const [mbReady,       setMbReady]      = useState(false);

  useEffect(() => { pointsRef.current    = points;    }, [points]);
  useEffect(() => { videoSecsRef.current = videoSecs; }, [videoSecs]);
  useEffect(() => { countriesRef.current = countries; }, [countries]);

  // ── Canvas 9:16 ──
  const CW = 540, CH = 960;

  // ── Math ──
  const toRad  = d => d * Math.PI / 180;
  const easeIO = t => t < 0.5 ? 2*t*t : -1+(4-2*t)*t;
  const easeOut= t => 1-(1-t)*(1-t);
  const lerp   = (a,b,t) => a+(b-a)*t;
  const clamp  = (v,lo,hi) => Math.max(lo,Math.min(hi,v));

  const haversineNM = (la1,lo1,la2,lo2) => {
    const R=3440.065,dLa=toRad(la2-la1),dLo=toRad(lo2-lo1);
    const a=Math.sin(dLa/2)**2+Math.cos(toRad(la1))*Math.cos(toRad(la2))*Math.sin(dLo/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  // ── Project lat/lng → canvas pixel (Mercator) ──
  const project = (lat, lng, zoom, cLat, cLng) => {
    const scale = Math.pow(2, zoom) * 256;
    const toMX  = lo => ((((lo%360)+360)%360-180)+180)/360*scale;
    const toMY  = la => (1-Math.log(Math.tan(toRad(clamp(la,-85.051129,85.051129)))+1/Math.cos(toRad(clamp(la,-85.051129,85.051129))))/Math.PI)/2*scale;
    const cx=toMX(cLng),cy=toMY(cLat),worldW=scale;
    let dx=toMX(lng)-cx;
    while(dx> worldW/2) dx-=worldW;
    while(dx<-worldW/2) dx+=worldW;
    return {x:CW/2+dx, y:CH/2+(toMY(lat)-cy)};
  };

  // ── Load Mapbox GL JS ──────────────────────────────────────────────────────
  const loadMapbox = () => new Promise((res,rej) => {
    if (window.mapboxgl) { res(); return; }
    const link = document.createElement('link');
    link.rel='stylesheet';
    link.href='https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css';
    document.head.appendChild(link);
    const s = document.createElement('script');
    s.src = 'https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  // ── Mapbox public token ──
  const MB_TOKEN = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

  // ── Init Mapbox GL ──
  const initMapbox = async (lat, lng, zoom) => {
    if (mbMapRef.current) {
      mbMapRef.current.setCenter([lng, lat]);
      mbMapRef.current.setZoom(zoom);
      return;
    }
    try {
      await loadMapbox();
      const ml = window.mapboxgl;
      ml.accessToken = MB_TOKEN;
      const map = new ml.Map({
        container: mbDivRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: zoom,
        interactive: false,
        preserveDrawingBuffer: true,
        fadeDuration: 0,
        attributionControl: false,
      });
      await new Promise(res => map.on('load', res));
      mbMapRef.current = map;
      mbLoadedRef.current = true;
      setMbReady(true);
    } catch(e) {
      console.error('Mapbox init failed:', e);
    }
  };

  // ── FIXED: Copy Mapbox canvas → recording canvas using createImageBitmap ──
  const drawMapboxToCanvas = async (ctx, lat, lng, zoom) => {
    const mb = mbMapRef.current;
    if (!mb) return false;
    
    mb.setCenter([lng, lat]);
    mb.setZoom(zoom);
    
    // Wait for tiles to render (reduced timeout to prevent freezes)
    await new Promise(res => {
      if (mb.isStyleLoaded() && !mb.isMoving()) { res(); return; }
      const onIdle = () => { mb.off('idle', onIdle); res(); };
      mb.on('idle', onIdle);
      setTimeout(res, 600);
    });
    
    try {
      const mbCanvas = mb.getCanvas();
      // createImageBitmap is fast and memory-efficient
      const bitmap = await createImageBitmap(mbCanvas);
      ctx.drawImage(bitmap, 0, 0, CW, CH);
      bitmap.close();
      return true;
    } catch(e) {
      console.warn('Mapbox bitmap copy failed:', e);
      return false;
    }
  };

  // ── Fallback: draw beautiful styled world map ──
  const drawFallbackMap = (ctx, zoom, cLat, cLng) => {
    const oceanGrad = ctx.createLinearGradient(0,0,0,CH);
    oceanGrad.addColorStop(0,'#c8e8f4');
    oceanGrad.addColorStop(1,'#a0d0ea');
    ctx.fillStyle=oceanGrad; ctx.fillRect(0,0,CW,CH);
    ctx.strokeStyle='rgba(100,160,210,0.12)'; ctx.lineWidth=0.5;
    for(let lo=-180;lo<=180;lo+=30){ctx.beginPath();for(let la=-80;la<=80;la+=10){const p=project(la,lo,zoom,cLat,cLng);la===-80?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}ctx.stroke();}
    for(let la=-60;la<=80;la+=30){ctx.beginPath();for(let lo=-180;lo<=180;lo+=10){const p=project(la,lo,zoom,cLat,cLng);lo===-180?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);}ctx.stroke();}
    const lands=[
      [[-168,72],[-130,55],[-125,49],[-97,26],[-83,10],[-77,8],[-62,12],[-35,-5],[-40,-20],[-55,-34],[-68,-55],[-74,-30],[-80,0],[-77,8],[-90,16],[-104,19],[-117,32],[-140,70],[-168,72]],
      [[2,36],[10,37],[18,37],[32,30],[44,10],[50,12],[44,10],[38,15],[34,30],[32,31],[8,5],[2,4],[-2,2],[2,-5],[10,-22],[18,-34],[28,-33],[32,-30],[32,-28],[26,-18],[20,-10],[15,0],[8,5],[10,37]],
      [[28,54],[22,54],[18,56],[14,55],[5,57],[5,51],[2,51],[-2,49],[-5,48],[-9,44],[-9,36],[0,36],[14,37],[18,40],[28,41],[30,45],[34,47],[28,54]],
      [[60,22],[68,22],[74,22],[80,12],[80,8],[76,8],[72,8],[76,14],[72,22],[68,22]],
      [[96,5],[100,4],[106,0],[104,-4],[100,-4],[96,2],[96,5]],
      [[92,28],[100,20],[100,14],[104,2],[100,2],[100,6],[96,5],[96,18],[92,22],[88,28],[92,28]],
      [[76,36],[80,40],[86,42],[96,42],[110,40],[120,40],[130,42],[124,40],[122,30],[116,22],[110,20],[108,20],[108,22],[104,22],[100,24],[96,28],[92,28],[88,28],[80,30],[76,34],[76,36]],
      [[130,32],[132,34],[136,34],[140,40],[140,44],[142,44],[142,40],[138,36],[136,34],[132,33],[130,32]],
      [[114,-22],[118,-20],[130,-12],[136,-12],[138,-26],[148,-20],[152,-30],[148,-38],[144,-38],[136,-34],[114,-34],[114,-22]],
    ];
    lands.forEach(ring => {
      ctx.beginPath();
      ring.forEach(([lo,la],i)=>{const p=project(la,lo,zoom,cLat,cLng);i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y);});
      ctx.closePath();
      const lg=ctx.createLinearGradient(0,0,0,CH);lg.addColorStop(0,'#f0ebe0');lg.addColorStop(1,'#e4ddd0');
      ctx.fillStyle=lg; ctx.fill();
      ctx.strokeStyle='rgba(160,140,110,0.5)'; ctx.lineWidth=0.8; ctx.stroke();
    });
  };

  // ── Auto-fit ──
  const autoFit = pts => {
    if(!pts||pts.length===0) return {z:2,lat:20,lng:0};
    if(pts.length===1) return {z:4,lat:pts[0].lat,lng:pts[0].lng};
    const lats=pts.map(p=>p.lat),lngs=pts.map(p=>p.lng);
    const minLat=Math.min(...lats),maxLat=Math.max(...lats);
    const cLat=(minLat+maxLat)/2;
    let minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    if(maxLng-minLng>180){const adj=lngs.map(l=>l<0?l+360:l);minLng=Math.min(...adj);maxLng=Math.max(...adj);}
    const cLng=((minLng+maxLng)/2+180)%360-180;
    const padX=CW*0.12,padY=CH*0.12;
    for(let z=5;z>=1;z--){
      const corners=[project(minLat,minLng,z,cLat,cLng),project(minLat,maxLng,z,cLat,cLng),project(maxLat,minLng,z,cLat,cLng),project(maxLat,maxLng,z,cLat,cLng)];
      const xs=corners.map(c=>c.x),ys=corners.map(c=>c.y);
      if(Math.min(...xs)>=padX&&Math.max(...xs)<=CW-padX&&Math.min(...ys)>=padY&&Math.max(...ys)<=CH-padY)
        return{z,lat:cLat,lng:cLng};
    }
    return{z:1,lat:cLat,lng:cLng};
  };

  const getShipZ = fr => {
    const b=fr.z;
    if(b<=2) return clamp(b+2,3,5);
    if(b<=3) return clamp(b+2,4,5);
    if(b<=4) return clamp(b+1,4,5);
    return clamp(b,4,5);
  };

  const getZoomState = (t,interp,pts,fitResult) => {
    const P1=0.10,P2=0.88,P3=0.93;
    const total=interp.length-1;
    const idx=clamp(Math.floor(t*total),0,total-1);
    const frac=(t*total)-idx;
    const curLat=interp[idx].lat+(interp[Math.min(idx+1,total)].lat-interp[idx].lat)*frac;
    const curLng=interp[idx].lng+(interp[Math.min(idx+1,total)].lng-interp[idx].lng)*frac;
    const baseZ=clamp(fitResult.z,1,5),shipZ=getShipZ(fitResult),revealZ=clamp(baseZ-0.5,1,4);
    if(t<=P1){const e=easeIO(t/P1);return{z:lerp(shipZ+0.5,shipZ,e),cLat:curLat,cLng:curLng};}
    else if(t<=P2){const e=easeIO((t-P1)/(P2-P1));return{z:shipZ,cLat:lerp(curLat,fitResult.lat,e*0.12),cLng:lerp(curLng,fitResult.lng,e*0.12)};}
    else if(t<=P3){const e=easeIO((t-P2)/(P3-P2));return{z:lerp(shipZ,revealZ,e),cLat:lerp(lerp(curLat,fitResult.lat,0.12),fitResult.lat,e),cLng:lerp(lerp(curLng,fitResult.lng,0.12),fitResult.lng,e)};}
    else return{z:revealZ,cLat:fitResult.lat,cLng:fitResult.lng};
  };

  const buildInterp = pts => {
    if(pts.length<2) return [];
    const out=[];
    for(let i=0;i<pts.length-1;i++){
      const a=pts[i],b=pts[i+1];let bLng=b.lng;
      if(a.lng-b.lng>180) bLng+=360;if(a.lng-b.lng<-180) bLng-=360;
      for(let j=0;j<80;j++){const f=j/80;let lng=a.lng+(bLng-a.lng)*f;lng=((lng+180)%360+360)%360-180;out.push({lat:a.lat+(b.lat-a.lat)*f,lng});}
    }
    out.push({...pts[pts.length-1]});return out;
  };

  const computeStats = pts => {
    if(pts.length<2) return null;
    let nm=0;for(let i=1;i<pts.length;i++) nm+=haversineNM(pts[i-1].lat,pts[i-1].lng,pts[i].lat,pts[i].lng);
    return{totalNM:nm.toFixed(0),totalKM:(nm*1.852).toFixed(0)};
  };

  const detectCountries = async pts => {
    if(pts.length<2) return;
    setDetectingCtry(true);setStatus('🔍 Detecting countries (30 NM proximity)…');
    const seen=new Set(),result=[];const DEG=0.55;
    const step=Math.max(1,Math.floor(pts.length/16));const sample=[];
    for(let i=0;i<pts.length;i+=step) sample.push(pts[i]);
    if(sample[sample.length-1]!==pts[pts.length-1]) sample.push(pts[pts.length-1]);
    const add=(country,cc)=>{if(!country||seen.has(country))return;const flag=cc?String.fromCodePoint(...[...cc.toUpperCase()].map(c=>c.charCodeAt(0)+127397)):'🌊';seen.add(country);result.push({country,flag});};
    for(const pt of sample){
      await new Promise(r=>setTimeout(r,110));
      try{
        const r1=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pt.lat}&lon=${pt.lng}&zoom=5`,{headers:{'Accept-Language':'en','User-Agent':'NavisphereX/1.0'}});
        const d1=await r1.json();if(d1.address?.country) add(d1.address.country,d1.address.country_code);
        await new Promise(r=>setTimeout(r,80));
        const r2=await fetch(`https://nominatim.openstreetmap.org/search?format=json&viewbox=${pt.lng-DEG},${pt.lat+DEG},${pt.lng+DEG},${pt.lat-DEG}&bounded=1&featuretype=country&limit=5`,{headers:{'Accept-Language':'en','User-Agent':'NavisphereX/1.0'}});
        const d2=await r2.json();
        for(const item of d2){await new Promise(r=>setTimeout(r,60));try{const r3=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${item.lat}&lon=${item.lon}&zoom=3`,{headers:{'Accept-Language':'en','User-Agent':'NavisphereX/1.0'}});const d3=await r3.json();if(d3.address?.country) add(d3.address.country,d3.address.country_code);}catch{}}
      }catch(e){console.warn('Country detect:',e);}
    }
    setCountries(result);countriesRef.current=result;setDetectingCtry(false);
    setStatus(result.length>0?`✅ ${result.length} countries detected — ready to record!`:'✅ Route finished — ready to record!');
  };

  // ── Draw route/boat/UI overlay on top of map ──
  const drawOverlay = (ctx,interp,t,zoom,cLat,cLng,pts,ctryList,trails,totalNM,totalKM,day,totalDays) => {
    const pj=(la,lo)=>project(la,lo,zoom,cLat,cLng);
    const total=interp.length-1;
    const P2=0.88,P3=0.93;
    const tRoute=Math.min(t,P3)/P3;
    const idx=clamp(Math.floor(tRoute*total),0,total-1);
    const frac=(tRoute*total)-idx;

    ctx.save();ctx.setLineDash([7,5]);ctx.strokeStyle='rgba(255,255,255,0.4)';ctx.lineWidth=2;
    ctx.beginPath();let pd=false;
    pts.forEach((pt,i)=>{const p=pj(pt.lat,pt.lng);if(pd&&i>0){const prev=pj(pts[i-1].lat,pts[i-1].lng);if(Math.abs(p.x-prev.x)>CW*0.5){ctx.stroke();ctx.beginPath();pd=false;}}pd?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pd=true;});
    ctx.stroke();ctx.setLineDash([]);ctx.restore();

    ctx.save();ctx.strokeStyle='#FF3B30';ctx.lineWidth=4;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.shadowColor='rgba(255,59,48,0.8)';ctx.shadowBlur=14;ctx.beginPath();pd=false;
    for(let i=0;i<=idx+1&&i<interp.length;i++){
      const pt=i<=idx?interp[i]:{lat:interp[idx].lat+(interp[Math.min(idx+1,total)].lat-interp[idx].lat)*frac,lng:interp[idx].lng+(interp[Math.min(idx+1,total)].lng-interp[idx].lng)*frac};
      const p=pj(pt.lat,pt.lng);
      if(pd&&i>0){const prev=pj(interp[Math.max(i-1,0)].lat,interp[Math.max(i-1,0)].lng);if(Math.abs(p.x-prev.x)>CW*0.5){ctx.stroke();ctx.beginPath();pd=false;}}
      pd?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pd=true;
    }
    ctx.stroke();ctx.shadowBlur=0;ctx.restore();

    trails.forEach((tr,ti)=>{const a=tr.alpha*(1-ti/trails.length)*0.8;ctx.beginPath();ctx.arc(tr.x,tr.y,tr.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,100,80,${a})`;ctx.fill();});

    const curLat=interp[idx].lat+(interp[Math.min(idx+1,total)].lat-interp[idx].lat)*frac;
    const curLng=interp[idx].lng+(interp[Math.min(idx+1,total)].lng-interp[idx].lng)*frac;
    const bp=pj(curLat,curLng);
    const pulse=0.7+0.3*Math.sin(t*Math.PI*50);
    const glow=ctx.createRadialGradient(bp.x,bp.y,0,bp.x,bp.y,30*pulse);
    glow.addColorStop(0,'rgba(255,59,48,0.6)');glow.addColorStop(1,'transparent');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(bp.x,bp.y,30*pulse,0,Math.PI*2);ctx.fill();
    ctx.font='28px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🚢',bp.x,bp.y);

    const showAll=t>P2;
    pts.forEach((pt,i)=>{
      const pct=i/Math.max(pts.length-1,1);if(!showAll&&pct>tRoute+0.02) return;
      const p=pj(pt.lat,pt.lng);if(p.x<-30||p.x>CW+30||p.y<-30||p.y>CH+30) return;
      const a=showAll?clamp(easeIO((t-P2)/(P3-P2)),0,1):1;
      ctx.globalAlpha=a;ctx.beginPath();ctx.arc(p.x,p.y,6,0,Math.PI*2);
      ctx.fillStyle=pt.type==='start'?'#00C896':pt.type==='end'?'#FF3B30':'#00B4D8';ctx.fill();
      ctx.font='18px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pt.flag,p.x,p.y-24);ctx.globalAlpha=1;
    });

    if(t>P2&&pts.length>0){const ep=pj(pts[pts.length-1].lat,pts[pts.length-1].lng);const re=clamp(easeIO((t-P2)/(P3-P2)),0,1);const gr=ctx.createRadialGradient(ep.x,ep.y,0,ep.x,ep.y,55*re);gr.addColorStop(0,`rgba(255,215,0,${0.6*re})`);gr.addColorStop(1,'transparent');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(ep.x,ep.y,55*re,0,Math.PI*2);ctx.fill();}

    const topH=72;
    ctx.fillStyle='rgba(4,12,26,0.90)';ctx.fillRect(0,0,CW,topH);
    ctx.font='bold 16px "Orbitron",monospace';ctx.fillStyle='#00B4D8';ctx.textAlign='left';ctx.fillText('NAVISPHERE X',18,30);
    ctx.font='11px "Exo 2",sans-serif';ctx.fillStyle='rgba(255,255,255,0.45)';ctx.fillText('SEA DIARY  ·  VOYAGE ANIMATION',18,52);
    ctx.font='22px serif';ctx.textAlign='right';ctx.fillText('🚢',CW-18,38);
    const phLabel=t<=0.10?'DEPARTURE':t<=P2?'EN VOYAGE':t<=P3?'FULL ROUTE REVEAL':'VOYAGE COMPLETE';
    ctx.font='bold 9px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,180,216,0.65)';ctx.fillText(phLabel,CW-18,55);
    ctx.strokeStyle='rgba(0,180,216,0.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,topH);ctx.lineTo(CW,topH);ctx.stroke();

    const botH=165;
    ctx.fillStyle='rgba(4,12,26,0.92)';ctx.fillRect(0,CH-botH,CW,botH);
    ctx.strokeStyle='rgba(0,180,216,0.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,CH-botH);ctx.lineTo(CW,CH-botH);ctx.stroke();
    const nmNow=Math.round(parseFloat(totalNM)*Math.min(t/P3,1));
    const kmNow=Math.round(parseFloat(totalKM)*Math.min(t/P3,1));
    ctx.textAlign='left';
    ctx.font='bold 10px "Exo 2",sans-serif';ctx.fillStyle='rgba(255,255,255,0.4)';ctx.fillText('DISTANCE COVERED',18,CH-botH+20);
    ctx.font='bold 28px "Orbitron",monospace';ctx.fillStyle='#00C896';ctx.fillText(`${nmNow.toLocaleString()} NM`,18,CH-botH+52);
    ctx.font='13px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,200,150,0.6)';ctx.fillText(`${kmNow.toLocaleString()} km`,18,CH-botH+70);
    ctx.textAlign='right';
    ctx.font='bold 24px "Orbitron",monospace';ctx.fillStyle='#F0A500';ctx.fillText(`DAY ${day}`,CW-18,CH-botH+52);
    ctx.font='10px "Exo 2",sans-serif';ctx.fillStyle='rgba(240,165,0,0.55)';ctx.fillText(`of ${totalDays}`,CW-18,CH-botH+70);
    if(ctryList.length>0){
      ctx.textAlign='left';ctx.font='bold 9px "Exo 2",sans-serif';ctx.fillStyle='rgba(255,255,255,0.35)';ctx.fillText('COUNTRIES / TERRITORIES PASSED',18,CH-botH+92);
      let cx=18;
      ctryList.forEach((c,ci)=>{if(cx>CW-40) return;ctx.font='20px serif';ctx.textAlign='left';ctx.fillStyle='#fff';ctx.fillText(c.flag,cx,CH-botH+118);cx+=28;if(ci<ctryList.length-1&&cx<CW-50){ctx.font='10px sans-serif';ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillText('›',cx,CH-botH+118);cx+=14;}});
    }
    ctx.fillStyle='rgba(255,255,255,0.06)';ctx.fillRect(0,CH-8,CW,8);
    ctx.fillStyle='#FF3B30';ctx.fillRect(0,CH-8,CW*Math.min(t,1),8);
  };

  // ── Summary card ──
  const drawSummary=(ctx,t,totalNM,totalKM,totalDays,ctryList)=>{
    const alpha=clamp(easeOut(t*2),0,1);
    ctx.fillStyle=`rgba(4,12,26,${alpha*0.96})`;ctx.fillRect(0,0,CW,CH);
    if(alpha<0.05) return;ctx.globalAlpha=alpha;
    const bg=ctx.createLinearGradient(0,0,CW,CH);bg.addColorStop(0,'rgba(4,12,26,0.98)');bg.addColorStop(0.5,'rgba(7,20,40,0.98)');bg.addColorStop(1,'rgba(4,12,26,0.98)');
    ctx.fillStyle=bg;ctx.fillRect(0,0,CW,CH);
    ctx.strokeStyle='rgba(0,180,216,0.04)';ctx.lineWidth=1;
    for(let x=0;x<CW;x+=54){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,CH);ctx.stroke();}
    for(let y=0;y<CH;y+=54){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CW,y);ctx.stroke();}
    ctx.font=`${80+10*Math.sin(t*Math.PI*4)}px serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText('🚢',CW/2,CH*0.20);
    ctx.font='bold 13px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,180,216,0.7)';ctx.fillText('NAVISPHERE X',CW/2,CH*0.30);
    const gg=ctx.createLinearGradient(0,CH*0.34,CW,CH*0.42);gg.addColorStop(0,'#F0A500');gg.addColorStop(0.5,'#FFD166');gg.addColorStop(1,'#F0A500');
    ctx.font='bold 34px "Orbitron",monospace';ctx.fillStyle=gg;ctx.fillText('VOYAGE',CW/2,CH*0.36);ctx.fillText('COMPLETE',CW/2,CH*0.42);
    const lA=clamp(easeOut((t-0.2)*2),0,1);ctx.strokeStyle=`rgba(0,180,216,${0.6*lA})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(CW/2-CW*0.35*lA,CH*0.46);ctx.lineTo(CW/2+CW*0.35*lA,CH*0.46);ctx.stroke();
    const sA=clamp(easeOut((t-0.25)*2),0,1);ctx.globalAlpha=alpha*sA;
    const cW2=CW*0.42,cH2=100,gap=16,c1x=(CW/2)-cW2-gap/2,c2x=(CW/2)+gap/2,cY=CH*0.49;
    [[c1x,'rgba(0,200,150,0.1)','rgba(0,200,150,0.35)'],[c2x,'rgba(0,180,216,0.1)','rgba(0,180,216,0.35)']].forEach(([x,bg2,border])=>{ctx.fillStyle=bg2;ctx.strokeStyle=border;ctx.lineWidth=1.5;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,cY,cW2,cH2,12);else ctx.rect(x,cY,cW2,cH2);ctx.fill();ctx.stroke();});
    ctx.font='bold 30px "Orbitron",monospace';ctx.fillStyle='#00C896';ctx.textAlign='center';ctx.fillText(`${parseInt(totalNM).toLocaleString()}`,c1x+cW2/2,cY+42);
    ctx.font='bold 10px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,200,150,0.7)';ctx.fillText('NAUTICAL MILES',c1x+cW2/2,cY+62);
    ctx.font='13px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,200,150,0.5)';ctx.fillText(`${parseInt(totalKM).toLocaleString()} km`,c1x+cW2/2,cY+82);
    ctx.font='bold 30px "Orbitron",monospace';ctx.fillStyle='#00B4D8';ctx.fillText(`${totalDays}`,c2x+cW2/2,cY+42);
    ctx.font='bold 10px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,180,216,0.7)';ctx.fillText('DAYS AT SEA',c2x+cW2/2,cY+62);
    ctx.font='13px "Exo 2",sans-serif';ctx.fillStyle='rgba(0,180,216,0.5)';ctx.fillText(`${ctryList.length} countries`,c2x+cW2/2,cY+82);
    const fA=clamp(easeOut((t-0.4)*2),0,1);ctx.globalAlpha=alpha*fA;
    if(ctryList.length>0){
      const fY=CH*0.68;ctx.font='bold 9px "Exo 2",sans-serif';ctx.fillStyle='rgba(255,255,255,0.4)';ctx.textAlign='center';ctx.fillText('COUNTRIES / TERRITORIES PASSED',CW/2,fY-14);
      const fs=32,tw=Math.min(ctryList.length,10)*(fs+8);let fx=CW/2-tw/2;
      ctryList.slice(0,10).forEach(c=>{ctx.font=`${fs}px serif`;ctx.textAlign='left';ctx.fillStyle='#fff';ctx.fillText(c.flag,fx,fY+fs/2);fx+=fs+6;});
      ctx.font='11px "Exo 2",sans-serif';ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='center';ctx.fillText(ctryList.slice(0,5).map(c=>c.country).join('  ·  '),CW/2,fY+fs+18);
    }
    const tA=clamp(easeOut((t-0.55)*2),0,1);ctx.globalAlpha=alpha*tA;
    ctx.font='bold 13px "Exo 2",sans-serif';ctx.textAlign='center';ctx.fillStyle='rgba(0,180,216,0.55)';ctx.fillText('#SeaDiary  #NavisphereX  #Seafarer',CW/2,CH*0.83);
    ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillText('#MaritimeLife  #OceanVoyage',CW/2,CH*0.86);
    ctx.globalAlpha=alpha;ctx.fillStyle='rgba(0,180,216,0.12)';ctx.fillRect(0,CH*0.90,CW,CH*0.10);
    ctx.strokeStyle='rgba(0,180,216,0.3)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,CH*0.90);ctx.lineTo(CW,CH*0.90);ctx.stroke();
    ctx.font='bold 11px "Orbitron",monospace';ctx.fillStyle='rgba(0,180,216,0.7)';ctx.textAlign='center';ctx.fillText('NAVISPHERE X  ·  MARINE SYSTEMS',CW/2,CH*0.94);ctx.globalAlpha=1;
  };

  // ── Animation loop ──
  const SUMMARY_SECS=7;
  const runAnimation=(canvas,interp,pts,ctryList,stats,fitResult,secs,onDone)=>{
    const ctx=canvas.getContext('2d', { willReadFrequently: false });
    const fps=30,routeFrames=secs*fps,summaryFrames=SUMMARY_SECS*fps,totalFrames=routeFrames+summaryFrames;
    let frame=0,trails=[];
    const totalDays=Math.max(pts.length,3);
    const P3=0.93;
    const useMB=mbLoadedRef.current&&mbMapRef.current;

    const tick=async()=>{
      const inSummary=frame>routeFrames;
      const t=Math.min(frame/routeFrames,1);
      const summaryT=inSummary?Math.min((frame-routeFrames)/summaryFrames,1):0;
      const{z,cLat,cLng}=getZoomState(Math.min(t,1),interp,pts,fitResult);
      const total=interp.length-1;
      const tRoute=Math.min(t,P3)/P3;
      const idx=clamp(Math.floor(tRoute*total),0,total-1);
      const frac=(tRoute*total)-idx;
      const curLat=interp[idx].lat+(interp[Math.min(idx+1,total)].lat-interp[idx].lat)*frac;
      const curLng=interp[idx].lng+(interp[Math.min(idx+1,total)].lng-interp[idx].lng)*frac;
      const bpx=project(curLat,curLng,z,cLat,cLng);
      if(!inSummary){trails.unshift({x:bpx.x,y:bpx.y,r:4+Math.random()*3,alpha:0.8});if(trails.length>22)trails.pop();}
      const day=Math.max(1,Math.round(tRoute*totalDays));

      ctx.clearRect(0,0,CW,CH);

      if(useMB && !inSummary){
        const drawn=await drawMapboxToCanvas(ctx,cLat,cLng,z);
        if(!drawn) drawFallbackMap(ctx,z,cLat,cLng);
      } else if(!inSummary){
        drawFallbackMap(ctx,z,cLat,cLng);
      }

      if(!inSummary){
        drawOverlay(ctx,interp,t,z,cLat,cLng,pts,ctryList,trails,stats?.totalNM||'0',stats?.totalKM||'0',day,totalDays);
      } else {
        drawFallbackMap(ctx,getZoomState(1,interp,pts,fitResult).z,fitResult.lat,fitResult.lng);
        drawOverlay(ctx,interp,1,getZoomState(1,interp,pts,fitResult).z,fitResult.lat,fitResult.lng,pts,ctryList,[],stats?.totalNM||'0',stats?.totalKM||'0',totalDays,totalDays);
        drawSummary(ctx,summaryT,stats?.totalNM||'0',stats?.totalKM||'0',totalDays,ctryList);
      }

      setProgress(Math.min(Math.round(t*100),100));
      frame++;
      if(frame<=totalFrames){
        await new Promise(res=>{animRef.current=requestAnimationFrame(res);});
        tick();
      } else {onDone();}
    };
    tick();
  };

  // ── Load Leaflet ──
  const loadLeaflet=()=>new Promise((res,rej)=>{
    if(window.L){res();return;}
    const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(link);
    const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);
  });

  useEffect(()=>{
    let mounted=true;
    const init=async()=>{
      if(!mapDivRef.current||leafletReady.current) return;
      leafletReady.current=true;
      try{await loadLeaflet();}catch(e){console.error('Leaflet failed',e);return;}
      if(!mounted||!mapDivRef.current) return;
      const L=window.L;
      const map=L.map(mapDivRef.current,{zoomControl:true,attributionControl:false,worldCopyJump:true,tap:true,tapTolerance:15}).setView([20,0],2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{subdomains:'abcd',maxZoom:18}).addTo(map);
      mapRef.current=map;
      map.on('click',e=>{
        if(!mounted) return;
        const{lat,lng}=e.latlng;
        setPoints(prev=>{const n=prev.length;return[...prev,{lat:parseFloat(lat.toFixed(5)),lng:parseFloat(lng.toFixed(5)),name:n===0?'Start':`WP${n}`,flag:n===0?'🟢':'⚓',type:n===0?'start':'wp'}];});
      });
      if(mbDivRef.current) initMapbox(20,0,2).catch(()=>{});
    };
    init();
    return()=>{mounted=false;if(mapRef.current){mapRef.current.remove();mapRef.current=null;leafletReady.current=false;}if(mbMapRef.current){mbMapRef.current.remove();mbMapRef.current=null;mbLoadedRef.current=false;}};
  },[]);

  useEffect(()=>{
    const L=window.L;if(!L||!mapRef.current) return;
    markersRef.current.forEach(m=>m.remove());markersRef.current=[];
    if(Array.isArray(polylineRef.current)){polylineRef.current.forEach(p=>p.remove());polylineRef.current=[];}
    if(points.length>=2){
      const segs=[];let seg=[points[0]];
      for(let i=1;i<points.length;i++){if(Math.abs(points[i].lng-points[i-1].lng)>180){segs.push(seg);seg=[points[i]];}else seg.push(points[i]);}
      segs.push(seg);
      polylineRef.current=segs.map(s=>L.polyline(s.map(p=>[p.lat,p.lng]),{color:'#FF3B30',weight:3,opacity:0.85,dashArray:'8,5'}).addTo(mapRef.current));
    }
    points.forEach((pt,i)=>{
      const col=pt.type==='start'?'#00C896':pt.type==='end'?'#FF3B30':'#00B4D8';
      const icon=L.divIcon({className:'',html:`<div style="width:28px;height:28px;border-radius:50%;background:${col};border:2.5px solid #fff;box-shadow:0 0 8px ${col};display:flex;align-items:center;justify-content:center;font-size:14px;">${pt.flag}</div>`,iconSize:[28,28],iconAnchor:[14,14]});
      const marker=L.marker([pt.lat,pt.lng],{icon,draggable:true}).addTo(mapRef.current);
      marker.bindTooltip(`<b>${pt.name}</b><br/>${pt.lat.toFixed(4)}°, ${pt.lng.toFixed(4)}°`,{direction:'top',offset:[0,-16]});
      marker.on('dragend',e=>{const{lat,lng}=e.target.getLatLng();setPoints(prev=>prev.map((p,j)=>j===i?{...p,lat:parseFloat(lat.toFixed(5)),lng:parseFloat(lng.toFixed(5))}:p));});
      marker.on('click',()=>{if(window.confirm(`Remove "${pt.name}"?`))setPoints(prev=>prev.filter((_,j)=>j!==i));});
      markersRef.current.push(marker);
    });
    setDistStats(points.length>=2?computeStats(points):null);
  },[points]);

  const finishRoute=async()=>{
    if(points.length<2){setStatus('⚠️ Add at least 2 points first');return;}
    const updated=points.map((p,i)=>i===points.length-1?{...p,flag:'🔴',type:'end',name:p.name==='Start'?'End':p.name}:p);
    setPoints(updated);setRouteFinished(true);
    await detectCountries(updated);
  };
  const unfinishRoute=()=>{setPoints(prev=>{const u=[...prev];const l=u[u.length-1];u[u.length-1]={...l,flag:'⚓',type:'wp'};return u;});setRouteFinished(false);setCountries([]);countriesRef.current=[];setStatus('');};
  const fitMap=()=>{if(!mapRef.current||points.length===0) return;if(points.length===1){mapRef.current.setView([points[0].lat,points[0].lng],5);return;}mapRef.current.fitBounds(window.L.latLngBounds(points.map(p=>[p.lat,p.lng])),{padding:[40,40],maxZoom:7});};
  const clearAll=()=>{if(animRef.current)cancelAnimationFrame(animRef.current);setPoints([]);setCountries([]);countriesRef.current=[];setDistStats(null);setProgress(0);setStatus('');setPlaying(false);setRecording(false);setShowCanvas(false);setRouteFinished(false);};

  const startAnimation=async()=>{
    const pts=pointsRef.current;if(pts.length<2){setStatus('⚠️ Add at least 2 points');return;}
    const interp=buildInterp(pts),stats=computeStats(pts),fitResult=autoFit(pts);
    const startZ=getZoomState(0,interp,pts,fitResult);
    setStatus('🗺 Initialising map…');
    await initMapbox(startZ.cLat,startZ.cLng,startZ.z);
    setShowCanvas(true);setPlaying(true);setProgress(0);setStatus('');
    runAnimation(canvasRef.current,interp,pts,countriesRef.current,stats,fitResult,videoSecsRef.current,()=>{setPlaying(false);setStatus('✅ Preview done! Click ⏺ Record to export.');});
  };

  const stopAnimation=()=>{if(animRef.current)cancelAnimationFrame(animRef.current);setPlaying(false);setShowCanvas(false);setProgress(0);};

  const startRecording=async()=>{
    const pts=pointsRef.current;if(pts.length<2){setStatus('⚠️ Add at least 2 points');return;}
    const interp=buildInterp(pts),stats=computeStats(pts),fitResult=autoFit(pts);
    const startZ=getZoomState(0,interp,pts,fitResult);
    setStatus('🗺 Initialising map…');
    await initMapbox(startZ.cLat,startZ.cLng,startZ.z);
    const canvas=canvasRef.current;if(!canvas)return;
    chunksRef.current=[];
    const stream=canvas.captureStream(30);
    const opts=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:5000000}:{mimeType:'video/webm',videoBitsPerSecond:5000000};
    const mr=new MediaRecorder(stream,opts);
    mr.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data);};
    mr.onstop=()=>{const blob=new Blob(chunksRef.current,{type:'video/webm'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`SeaDiary_Voyage_${Date.now()}.webm`;a.click();URL.revokeObjectURL(url);setRecording(false);setShowCanvas(false);setStatus('✅ Video saved! Share to Instagram Stories 🚢');};
    recorderRef.current=mr;mr.start(100);
    setShowCanvas(true);setRecording(true);setProgress(0);setStatus(`🔴 Recording ${videoSecsRef.current}s portrait video…`);
    runAnimation(canvas,interp,pts,countriesRef.current,stats,fitResult,videoSecsRef.current,()=>{setTimeout(()=>mr.stop(),300);});
  };

  const stopRecording=()=>{if(animRef.current)cancelAnimationFrame(animRef.current);if(recorderRef.current?.state==='recording')recorderRef.current.stop();else{setRecording(false);setShowCanvas(false);}};
  useEffect(()=>()=>{if(animRef.current)cancelAnimationFrame(animRef.current);},[]);

  const canAnimate=points.length>=2&&!playing&&!recording;
  const clickHint=points.length===0?'🖱 Click map → Place first point (Start 🟢)':routeFinished?'✅ Route finished + countries detected!':`🖱 Keep clicking to add waypoints · ${points.length} added`;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.94)',zIndex:9998,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'0.4rem',overflowY:'auto'}} onClick={onClose}>
      
      {/* ── Mapbox div stays hidden at all times ── */}
      <div ref={mbDivRef} style={{
        position: 'fixed',
        top: -9999,
        left: -9999,
        width: CW,
        height: CH,
        visibility: 'hidden',
        pointerEvents: 'none',
        zIndex: -1,
        opacity: 0
      }}/>

      <div style={{background:'#0B1D35',border:'1px solid rgba(0,180,216,0.3)',borderRadius:16,width:'100%',maxWidth:540,overflow:'hidden',display:'flex',flexDirection:'column'}}
        onClick={e=>e.stopPropagation()} onTouchStart={e=>e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'0.7rem 1rem',borderBottom:'1px solid rgba(0,180,216,0.15)',background:'rgba(4,12,26,0.7)',flexShrink:0}}>
          <div>
            <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.8rem',fontWeight:700,color:'#00B4D8'}}>🎬 VOYAGE ANIMATION STUDIO</div>
            <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.32)',marginTop:1}}>
              Portrait 9:16 · Mapbox GL {mbReady?'✅ Ready':'⏳ Loading…'} · 7s Summary
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',fontSize:'1.4rem',cursor:'pointer',padding:'4px 8px'}}>✕</button>
        </div>

        <div style={{position:'relative',width:'100%',height:340,flexShrink:0,background:'#040C1A'}}>
          <div ref={mapDivRef} style={{position:'absolute',inset:0,display:showCanvas?'none':'block'}}/>
          <canvas ref={canvasRef} width={CW} height={CH} style={{position:'absolute',inset:0,width:'100%',height:'100%',display:showCanvas?'block':'none',objectFit:'cover'}}/>
          {!mapRef.current&&!showCanvas&&(
            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#040C1A',color:'rgba(0,180,216,0.6)',fontSize:'0.72rem',flexDirection:'column',gap:8}}>
              <div style={{width:20,height:20,border:'2px solid rgba(0,180,216,0.2)',borderTopColor:'#00B4D8',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>Loading map…
            </div>
          )}
          {!showCanvas&&(
            <div style={{position:'absolute',bottom:8,left:8,right:8,background:'rgba(4,12,26,0.82)',border:'1px solid rgba(0,180,216,0.22)',borderRadius:8,padding:'5px 10px',fontSize:'0.63rem',color:'rgba(0,180,216,0.85)',textAlign:'center',pointerEvents:'none',backdropFilter:'blur(4px)'}}>
              {clickHint}
            </div>
          )}
          {progress>0&&(<div style={{position:'absolute',bottom:0,left:0,right:0,height:4,background:'rgba(255,255,255,0.07)'}}><div style={{height:'100%',background:'linear-gradient(90deg,#FF3B30,#FF9500)',width:`${progress}%`,transition:'width 0.08s'}}/></div>)}
        </div>

        <div style={{overflowY:'auto',maxHeight:'62vh',display:'flex',flexDirection:'column',gap:'0.6rem',padding:'0.8rem'}}
          onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()}>

          {points.length>0&&(
            <div style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'0.7rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Route — {points.length} points</div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={fitMap} style={{background:'none',border:'none',color:'#00B4D8',cursor:'pointer',fontSize:'0.65rem'}}>🗺 Fit</button>
                  <button onClick={clearAll} style={{background:'none',border:'none',color:'#ff4757',cursor:'pointer',fontSize:'0.65rem'}}>🗑 Clear</button>
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:150,overflowY:'auto'}}>
                {points.map((pt,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 9px',background:'rgba(255,255,255,0.04)',borderRadius:7,border:`1px solid ${pt.type==='start'?'rgba(0,200,100,0.2)':pt.type==='end'?'rgba(255,71,87,0.2)':'rgba(0,180,216,0.12)'}`}}>
                    <span>{pt.flag}</span>
                    <span style={{flex:1,fontSize:'0.72rem',color:'#E2EBF8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pt.name}</span>
                    <span style={{fontSize:'0.58rem',color:'rgba(255,255,255,0.28)'}}>{pt.lat.toFixed(2)}°,{pt.lng.toFixed(2)}°</span>
                    <button onClick={()=>setPoints(prev=>prev.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:'rgba(255,255,255,0.25)',cursor:'pointer',fontSize:'0.8rem',padding:0}}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {points.length>=2&&!routeFinished&&!playing&&!recording&&!detectingCtry&&(
            <button onClick={finishRoute} style={{width:'100%',padding:'12px',borderRadius:10,background:'linear-gradient(135deg,#00C896,#00a87a)',color:'#000',border:'none',fontWeight:700,fontSize:'0.82rem',cursor:'pointer'}}>
              ✅ Finish Route + Auto-Detect Countries 🌍
            </button>
          )}
          {detectingCtry&&(<div style={{padding:'12px',borderRadius:10,background:'rgba(240,165,0,0.08)',border:'1px solid rgba(240,165,0,0.2)',color:'#F0A500',fontSize:'0.74rem',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><div style={{width:14,height:14,border:'2px solid rgba(240,165,0,0.3)',borderTopColor:'#F0A500',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>Detecting countries (30 NM)…</div>)}
          {routeFinished&&!playing&&!recording&&!detectingCtry&&(
            <div style={{display:'flex',gap:6}}>
              <div style={{flex:1,padding:'8px 12px',borderRadius:10,background:'rgba(0,200,100,0.08)',border:'1px solid rgba(0,200,100,0.2)',fontSize:'0.72rem',color:'#00C896',display:'flex',alignItems:'center',gap:6}}>
                ✅ {points.length} points · {countries.length} countries detected
              </div>
              <button onClick={unfinishRoute} style={{padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)',fontSize:'0.7rem',cursor:'pointer'}}>✏️ Edit</button>
            </div>
          )}
          {countries.length>0&&(<div style={{display:'flex',flexWrap:'wrap',gap:5}}>{countries.map((c,i)=>(<span key={i} style={{fontSize:'0.7rem',padding:'3px 10px',borderRadius:20,background:'rgba(240,165,0,0.07)',border:'1px solid rgba(240,165,0,0.18)',color:'#F0A500'}}>{c.flag} {c.country}</span>))}</div>)}
          {distStats&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{background:'rgba(0,200,150,0.07)',border:'1px solid rgba(0,200,150,0.18)',borderRadius:10,padding:'0.65rem',textAlign:'center'}}>
                <div style={{fontSize:'1.2rem',fontWeight:900,color:'#00C896',fontFamily:'Orbitron,monospace'}}>{distStats.totalNM}</div>
                <div style={{fontSize:'0.57rem',color:'rgba(255,255,255,0.38)',textTransform:'uppercase',marginTop:2}}>Nautical Miles</div>
              </div>
              <div style={{background:'rgba(0,180,216,0.07)',border:'1px solid rgba(0,180,216,0.18)',borderRadius:10,padding:'0.65rem',textAlign:'center'}}>
                <div style={{fontSize:'1.2rem',fontWeight:900,color:'#00B4D8',fontFamily:'Orbitron,monospace'}}>{distStats.totalKM}</div>
                <div style={{fontSize:'0.57rem',color:'rgba(255,255,255,0.38)',textTransform:'uppercase',marginTop:2}}>Kilometres</div>
              </div>
            </div>
          )}
          <div>
            <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.38)',marginBottom:7,textTransform:'uppercase',letterSpacing:'0.08em'}}>Video Length</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {[15,30,60,120].map(s=>(<button key={s} onClick={()=>setVideoSecs(s)} style={{padding:'9px 4px',borderRadius:9,fontSize:'0.74rem',fontWeight:videoSecs===s?700:400,cursor:'pointer',border:`1px solid ${videoSecs===s?'#FF3B30':'rgba(255,255,255,0.08)'}`,background:videoSecs===s?'rgba(255,59,48,0.15)':'rgba(255,255,255,0.03)',color:videoSecs===s?'#FF3B30':'rgba(255,255,255,0.38)',transition:'all 0.15s'}}>{s}s</button>))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:4}}>
            {[['🔍','Depart','0–10%','#00B4D8'],['🚢','Route','10–88%','#00C896'],['🌍','Reveal','88–93%','#F0A500'],['🏆','Summary','7 secs','#FFD166']].map(([icon,label,pct,col])=>(
              <div key={label} style={{background:`${col}0f`,border:`1px solid ${col}28`,borderRadius:8,padding:'6px 4px',textAlign:'center'}}>
                <div style={{fontSize:'0.75rem',marginBottom:2}}>{icon}</div>
                <div style={{fontSize:'0.6rem',color:'rgba(255,255,255,0.5)'}}>{label}</div>
                <div style={{fontSize:'0.55rem',color:col,fontWeight:700,marginTop:1}}>{pct}</div>
              </div>
            ))}
          </div>
          {!playing&&!recording&&(
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button onClick={startAnimation} disabled={!canAnimate} style={{padding:'12px',borderRadius:10,background:canAnimate?'linear-gradient(135deg,#00B4D8,#1565C0)':'rgba(255,255,255,0.05)',color:canAnimate?'#fff':'rgba(255,255,255,0.2)',border:'none',fontWeight:700,fontSize:'0.78rem',cursor:canAnimate?'pointer':'not-allowed'}}>▶ Preview</button>
              <button onClick={startRecording} disabled={!canAnimate} style={{padding:'12px',borderRadius:10,background:canAnimate?'linear-gradient(135deg,#FF3B30,#FF9500)':'rgba(255,255,255,0.05)',color:canAnimate?'#fff':'rgba(255,255,255,0.2)',border:'none',fontWeight:700,fontSize:'0.78rem',cursor:canAnimate?'pointer':'not-allowed'}}>⏺ Record .webm</button>
            </div>
          )}
          {playing&&<button onClick={stopAnimation} style={{width:'100%',padding:'12px',borderRadius:10,background:'rgba(255,71,87,0.12)',color:'#ff4757',border:'1px solid rgba(255,71,87,0.3)',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>⏹ Stop Preview</button>}
          {recording&&<button onClick={stopRecording} style={{width:'100%',padding:'12px',borderRadius:10,background:'rgba(255,165,0,0.12)',color:'#ffa502',border:'1px solid rgba(255,165,0,0.3)',fontWeight:700,fontSize:'0.78rem',cursor:'pointer'}}>⏹ Stop Recording</button>}
          {status&&<div style={{fontSize:'0.72rem',padding:'9px 12px',borderRadius:9,lineHeight:1.5,background:'rgba(0,0,0,0.3)',color:status.startsWith('✅')?'#00C896':status.startsWith('⚠️')?'#FF9500':status.startsWith('🔴')?'#FF3B30':'rgba(255,255,255,0.6)'}}>{status}</div>}
          <div style={{fontSize:'0.62rem',color:'rgba(255,255,255,0.26)',lineHeight:1.7,background:'rgba(255,255,255,0.02)',borderRadius:9,padding:'8px 11px',border:'1px solid rgba(255,255,255,0.05)'}}>
            💡 <strong style={{color:'rgba(255,255,255,0.45)'}}>How to use:</strong><br/>
            1. Click map to add waypoints<br/>
            2. Tap <strong style={{color:'#00C896'}}>✅ Finish Route</strong> → countries auto-detected<br/>
            3. Pick length → Preview or Record<br/>
            4. Mapbox GL renders real map tiles for recording 🗺
          </div>
        </div>
      </div>
    </div>
  );
}

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
    ctx.fillStyle = '#020d1f';
    ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(0,180,216,0.05)';ctx.lineWidth=0.5;
    for(let x=0;x<W;x+=W/12){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=H/6) {ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.fillStyle='#0d2137';ctx.strokeStyle='rgba(0,180,216,0.2)';ctx.lineWidth=0.7;
    CONTINENTS.forEach(d=>{
      const path=new Path2D(d.replace(/(\d+\.?\d*)/g,(m,v,i,str)=>{
        const prev=str.slice(0,i).trim();
        const isX=prev.split(/[MmLlHhVvCcSsQqTtAaZz ]/).length%2===0;
        return isX?String(parseFloat(v)/1000*W):String(parseFloat(v)/500*H);
      }));
      ctx.fill(path);ctx.stroke(path);
    });
    const posEntries = entries.filter(e=>e.lat&&e.lng);
    posEntries.forEach((e,i) => {
      const lat=parseFloat(e.lat),lng=parseFloat(e.lng);
      const x=(lng+180)/360*W, y=(90-lat)/180*H;
      const g=ctx.createRadialGradient(x,y,0,x,y,14);
      g.addColorStop(0,'rgba(0,180,216,0.55)');
      g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,14,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(0,200,150,0.9)';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    });
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
