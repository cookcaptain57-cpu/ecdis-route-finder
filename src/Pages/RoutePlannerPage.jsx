/* eslint-disable */
// src/Pages/RoutePlannerPage.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { buildAutoRoute, buildAutoRouteCoords, buildProRoute, checkCanalPassage } from "../routing";
import {
  recalcWaypoints, totalRouteNM, parseRTZ, exportRTZ, exportCSV, downloadFile,
  idbSaveRoute, idbLoadRoutes, idbDeleteRoute, idbSavePref, idbLoadPref,
  pointInPolygon, exportGPX, exportNMEAWPL, exportFurunoCSV, exportJRCCSV,
  exportTransasXML, exportKML,
} from "../utils";
import {
  ECA_ZONES, SECA_ZONES, MARPOL_ZONES, PIRACY_ZONES, LAYOVER_ZONES,
  PSSA_ZONES, NOX_ZONES, LOAD_LINE_ZONES, MARITIME_RESTRICTIONS,
  CHINA_MSC_NO_G, EEZ_ZONES,
} from "../constants";
import MapView from "../components/MapView";
import ETACalculator from "../components/ETACalculator";

const RENDER_API = 'https://navispherexrouter.onrender.com';

const checkPointOnLand = (lat, lon) => new Promise(resolve => {
  const zoom=11,n=1<<zoom;
  const tx=Math.floor((lon+180)/360*n);
  const latR=lat*Math.PI/180;
  const ty=Math.floor((1-Math.log(Math.tan(latR)+1/Math.cos(latR))/Math.PI)/2*n);
  const px=Math.floor(((lon+180)/360*n-tx)*256);
  const py=Math.floor(((1-Math.log(Math.tan(latR)+1/Math.cos(latR))/Math.PI)/2*n-ty)*256);
  const img=new Image(); img.crossOrigin='anonymous';
  img.onload=()=>{
    try{
      const cv=document.createElement('canvas'); cv.width=cv.height=1;
      const ctx=cv.getContext('2d'); ctx.drawImage(img,-px,-py);
      const[r,g,b]=ctx.getImageData(0,0,1,1).data;
      resolve(!(b>130&&b>r&&b>=g));
    }catch{resolve(null);}
  };
  img.onerror=()=>resolve(null);
  img.src=`https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`;
  setTimeout(()=>resolve(null),5000);
});

async function fetchOverpass(query){
  const eps=['https://overpass-api.de/api/interpreter','https://overpass.karte.io/api/interpreter','https://z.overpass-api.de/api/interpreter','https://overpass.openstreetmap.ru/api/interpreter'];
  for(const ep of eps){
    try{
      const ctl=new AbortController(); setTimeout(()=>ctl.abort(),18000);
      const res=await fetch(ep,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:`data=${encodeURIComponent(query)}`,signal:ctl.signal});
      if(res.ok)return await res.json();
    }catch{}
  }
  return null;
}

// ── Regulatory zone overlay config ────────────────────────────────────────────
// Each entry drives both the toggle buttons AND the MapView overlays prop
const REG_ZONE_CFG = [
  { k:'eca',          label:'ECA',          color:'#FF6B35', desc:'Emission Control Areas — SOx limits' },
  { k:'seca',         label:'SECA',         color:'#FFB347', desc:'Sulphur ECA — 0.10% S fuel required' },
  { k:'marpol',       label:'MARPOL',       color:'#9B59B6', desc:'MARPOL Special Areas — discharge rules' },
  { k:'pssa',         label:'PSSA',         color:'#00C896', desc:'Particularly Sensitive Sea Areas' },
  { k:'nox',          label:'NOx Tier III', color:'#F39C12', desc:'NOx Tier III Engine Control Areas' },
  { k:'loadline',     label:'Load Line',    color:'#1ABC9C', desc:'ICLL 1966 Load Line Zones' },
  { k:'restrictions', label:'Restrictions', color:'#FF2020', desc:'War Risk / Sanctions / Conflict Zones' },
  { k:'msc_nog',      label:'MSC No-G',     color:'#FF00FF', desc:'MSC Prohibited Areas — China' },
  { k:'eez',          label:'EEZ',          color:'#5DADE2', desc:'Exclusive Economic Zones (200NM)' },
  { k:'piracy',       label:'Piracy HRA',   color:'#E74C3C', desc:'Piracy High Risk Areas — BMP5' },
  { k:'layover',      label:'Anchorage',    color:'#3498DB', desc:'Anchorage / Layover Areas' },
  { k:'gebco',        label:'Ocean Depth',  color:'#00B4D8', desc:'GEBCO Bathymetry + NOAA ENC' },
  { k:'depthClick',   label:'Depth Click',  color:'#00C896', desc:'Click map to query water depth' },
];

function RoutePlannerPage({ notify, sheetRoutes=[], portsDb=[] }){
  const portsList=portsDb;
  const hasRestoredRef=useRef(false);

  // ── Core state ─────────────────────────────────────────────────────────────
  const[panel,          setPanel]          =useState('auto');
  const[fromPort,       setFromPort]       =useState('');
  const[toPort,         setToPort]         =useState('');
  const[fromSugg,       setFromSugg]       =useState([]);
  const[toSugg,         setToSugg]         =useState([]);
  const[waypoints,      setWaypoints]      =useState([]);
  const[routeName,      setRouteName]      =useState('My Route');
  const[playing,        setPlaying]        =useState(false);
  const[speed,          setSpeed]          =useState(5);
  const[clickAdd,       setClickAdd]       =useState(false);
  const[mapMode,        setMapMode]        =useState('day');

  // ── NEW: single overlays state — drives both old + new zone keys ───────────
  const[overlays, setOverlays]=useState({
    // original keys kept for MapView compatibility
    eca:false, seca:false, marpol:false, piracy:false, layover:false,
    gebco:false, depthClick:false,
    // new zone keys
    pssa:false, nox:false, loadline:false,
    restrictions:false, msc_nog:false, eez:false,
  });

  // ── ECDIS-first state ──────────────────────────────────────────────────────
  const[portF,          setPortF]          =useState(null);
  const[portT,          setPortT]          =useState(null);
  const[dbSuggestions,  setDbSuggestions]  =useState([]);
  const[searchMode,     setSearchMode]     =useState(null);

  // ── Manual lat/lon entry ───────────────────────────────────────────────────
  const[showManualFrom, setShowManualFrom] =useState(false);
  const[showManualTo,   setShowManualTo]   =useState(false);
  const[manualFromLat,  setManualFromLat]  =useState('');
  const[manualFromLon,  setManualFromLon]  =useState('');
  const[manualFromName, setManualFromName] =useState('');
  const[manualToLat,    setManualToLat]    =useState('');
  const[manualToLon,    setManualToLon]    =useState('');
  const[manualToName,   setManualToName]   =useState('');

  // ── Vessel params ──────────────────────────────────────────────────────────
  const[vDraft,         setVDraft]         =useState(10);
  const[vBeam,          setVBeam]          =useState(32);
  const[vLoa,           setVLoa]           =useState(200);
  const[vAirDraft,      setVAirDraft]      =useState(50);
  const[vType,          setVType]          =useState('cargo');
  const[showVessel,     setShowVessel]     =useState(false);
  const[routeMeta,      setRouteMeta]      =useState(null);
  const[isGenerating,   setIsGenerating]   =useState(false);

  // ── Manual route ───────────────────────────────────────────────────────────
  const[manualWps,      setManualWps]      =useState([]);
  const[manualRouteName,setManualRouteName]=useState('Manual Route');
  const[savedRoutes,    setSavedRoutes]    =useState([]);
  const[checkResults,   setCheckResults]   =useState([]);
  const[isChecking,     setIsChecking]     =useState(false);
  const[checkAutoRes,   setCheckAutoRes]   =useState([]);
  const[isCheckingAuto, setIsCheckingAuto] =useState(false);
  const[exportFormat,   setExportFormat]   =useState('rtz');

  // ── API Safety state ───────────────────────────────────────────────────────
  const[apiSafetyReport,setApiSafetyReport]=useState(null);
  const[isApiChecking,  setIsApiChecking]  =useState(false);
  const[apiRouteInfo,   setApiRouteInfo]   =useState(null);

  // ── Memos ──────────────────────────────────────────────────────────────────
  const totalNM      =useMemo(()=>totalRouteNM(waypoints),[waypoints]);
  const totalManualNM=useMemo(()=>totalRouteNM(manualWps),[manualWps]);

  function buildHighlights(results,wps){
    return results.filter(r=>r.type!=='ok'&&r.type!=='apiError'&&r.type!=='hazardInfo'&&r.segIdx!==undefined).flatMap(r=>{
      const color=r.severity==='error'?'#E74C3C':'#FFB347';
      if(r.type==='land'&&r.segIdx>0&&wps[r.segIdx-1]&&wps[r.segIdx])
        return[{type:'segment',fromLat:wps[r.segIdx-1].lat,fromLon:wps[r.segIdx-1].lon,toLat:wps[r.segIdx].lat,toLon:wps[r.segIdx].lon,color,message:r.message,severity:r.severity}];
      if(wps[r.segIdx])return[{type:'point',lat:wps[r.segIdx].lat,lon:wps[r.segIdx].lon,color,message:r.message,severity:r.severity}];
      return[];
    });
  }
  const checkHL    =useMemo(()=>buildHighlights(checkResults,manualWps),[checkResults,manualWps]);
  const checkAutoHL=useMemo(()=>buildHighlights(checkAutoRes,waypoints),[checkAutoRes,waypoints]);
  const allHL      =useMemo(()=>[...checkHL,...checkAutoHL],[checkHL,checkAutoHL]);

  // ── Persistence: restore ──────────────────────────────────────────────────
  useEffect(()=>{
    const load=async()=>{
      try{
        const g=k=>localStorage.getItem(k);
        if(g('mnp_mapMode'))  setMapMode(g('mnp_mapMode'));
        if(g('mnp_panel'))    setPanel(g('mnp_panel'));
        if(g('mnp_overlays'))try{setOverlays(prev=>({...prev,...JSON.parse(g('mnp_overlays'))}));}catch{}
        if(g('mnp_fromPort')) setFromPort(g('mnp_fromPort'));
        if(g('mnp_toPort'))   setToPort(g('mnp_toPort'));
        if(g('mnp_vDraft'))   setVDraft(+g('mnp_vDraft'));
        if(g('mnp_vBeam'))    setVBeam(+g('mnp_vBeam'));
        if(g('mnp_vLoa'))     setVLoa(+g('mnp_vLoa'));
        if(g('mnp_vAirDr'))   setVAirDraft(+g('mnp_vAirDr'));
        if(g('mnp_vType'))    setVType(g('mnp_vType'));
        const[wps,rn,mwps,mrn,routes]=await Promise.all([
          idbLoadPref('mnp_waypoints',[]),idbLoadPref('mnp_routeName','My Route'),
          idbLoadPref('mnp_manualWps',[]),idbLoadPref('mnp_manualRN','Manual Route'),
          idbLoadRoutes(),
        ]);
        if(wps&&wps.length>0)setWaypoints(wps);
        if(rn)setRouteName(rn);
        if(mwps&&mwps.length>0)setManualWps(mwps);
        if(mrn)setManualRouteName(mrn);
        setSavedRoutes(routes||[]);
      }catch(e){console.warn('[RP] Restore failed:',e);}
      finally{hasRestoredRef.current=true;}
    };
    load();
  },[]);

  // ── Persistence: save ─────────────────────────────────────────────────────
  const s=(k,v)=>localStorage.setItem(k,v);
  useEffect(()=>{s('mnp_mapMode',mapMode);},[mapMode]);
  useEffect(()=>{s('mnp_panel',panel);},[panel]);
  useEffect(()=>{s('mnp_overlays',JSON.stringify(overlays));},[overlays]);
  useEffect(()=>{s('mnp_fromPort',fromPort);},[fromPort]);
  useEffect(()=>{s('mnp_toPort',toPort);},[toPort]);
  useEffect(()=>{s('mnp_vDraft',String(vDraft));},[vDraft]);
  useEffect(()=>{s('mnp_vBeam',String(vBeam));},[vBeam]);
  useEffect(()=>{s('mnp_vLoa',String(vLoa));},[vLoa]);
  useEffect(()=>{s('mnp_vAirDr',String(vAirDraft));},[vAirDraft]);
  useEffect(()=>{s('mnp_vType',vType);},[vType]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_waypoints',waypoints).catch(()=>{});},[waypoints]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_routeName',routeName).catch(()=>{});},[routeName]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_manualWps',manualWps).catch(()=>{});},[manualWps]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_manualRN',manualRouteName).catch(()=>{});},[manualRouteName]);
  useEffect(()=>{setCheckResults([]);},[manualWps.length]);
  useEffect(()=>{setCheckAutoRes([]);setApiSafetyReport(null);setApiRouteInfo(null);},[waypoints.length]);

  // ── Port search ────────────────────────────────────────────────────────────
  const searchPort=(q,setSugg)=>{
    if(!q||q.trim().length<2){setSugg([]);return;}
    const ql=q.toLowerCase().trim();
    setSugg(portsList.filter(p=>{
      const kw=(p.keywords||[p.name,p.city,p.country,p.id].filter(Boolean).join(' ')).toLowerCase();
      return p.name?.toLowerCase().includes(ql)||p.city?.toLowerCase().includes(ql)||p.id?.toLowerCase().includes(ql)||p.country?.toLowerCase().includes(ql)||kw.includes(ql);
    }).slice(0,8));
  };
  useEffect(()=>searchPort(fromPort,setFromSugg),[fromPort,portsList]);
  useEffect(()=>searchPort(toPort,setToSugg),[toPort,portsList]);

  const searchEcdisRoutes=(dep,arr)=>{
    if(!dep&&!arr)return[];
    const ql=(dep+' '+arr).toLowerCase().trim();
    return sheetRoutes.filter(r=>{
      const hay=[r.fileName,r.portName,r.keywords,r.fileUrl,r['Route Name'],r['Port Name'],r['File Name'],r['Keywords'],Object.values(r).join(' ')].filter(Boolean).join(' ').toLowerCase();
      return(dep.length>1&&hay.includes(dep.toLowerCase().substring(0,4)))||(arr.length>1&&hay.includes(arr.toLowerCase().substring(0,4)))||hay.includes(ql.substring(0,6));
    }).slice(0,6);
  };

  // ── Manual coordinate entry ────────────────────────────────────────────────
  const applyManualFrom=()=>{
    const lat=parseFloat(manualFromLat),lon=parseFloat(manualFromLon);
    if(isNaN(lat)||isNaN(lon)||lat<-90||lat>90||lon<-180||lon>180){notify('Invalid coordinates','error');return;}
    const name=manualFromName.trim()||`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
    setPortF({id:'CUSTOM_DEP',lat,lon,name,city:'Manual Entry',country:'Custom',_isManual:true});
    setFromPort(name);setShowManualFrom(false);
    setManualFromLat('');setManualFromLon('');setManualFromName('');
    notify(`Departure set: ${name}`,'success');
  };

  const applyManualTo=()=>{
    const lat=parseFloat(manualToLat),lon=parseFloat(manualToLon);
    if(isNaN(lat)||isNaN(lon)||lat<-90||lat>90||lon<-180||lon>180){notify('Invalid coordinates','error');return;}
    const name=manualToName.trim()||`${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
    setPortT({id:'CUSTOM_ARR',lat,lon,name,city:'Manual Entry',country:'Custom',_isManual:true});
    setToPort(name);setShowManualTo(false);
    setManualToLat('');setManualToLon('');setManualToName('');
    notify(`Arrival set: ${name}`,'success');
  };

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch=()=>{
    const f=portF?.id==='CUSTOM_DEP'?portF:portsList.find(p=>p.name?.toLowerCase()===fromPort.toLowerCase()||p.id?.toLowerCase()===fromPort.toLowerCase());
    const t=portT?.id==='CUSTOM_ARR'?portT:portsList.find(p=>p.name?.toLowerCase()===toPort.toLowerCase()||p.id?.toLowerCase()===toPort.toLowerCase());
    if(!f||!t){notify('Select valid ports from suggestions or enter coordinates manually','error');return;}
    setPortF(f);setPortT(t);
    const dbMatches=searchEcdisRoutes(f.name,t.name);
    setDbSuggestions(dbMatches);setSearchMode('choose');
    if(dbMatches.length>0)notify(`Found ${dbMatches.length} ECDIS route${dbMatches.length>1?'s':''}`,'success');
    else notify('No ECDIS routes found — click Generate Auto Route','success');
  };

  // ── FIX 1: useDbRoute — robust multi-URL CORS-aware loader ────────────────
  const useDbRoute = (r) => {
    setSearchMode('generating');

    const url = r.fileUrl || r['File URL'] || r['Download URL'] || r['Drive Link'] ||
      Object.values(r).find(v => typeof v === 'string' &&
        (v.includes('drive.google') || v.includes('drive.usercontent') || v.toLowerCase().endsWith('.rtz')));

    const doAutoRoute = () => {
      notify('Generating auto route instead…', 'error');
      handleGenerateAutoRoute();
    };

    if (!url) {
      notify('No file link found in ECDIS record', 'error');
      doAutoRoute();
      return;
    }

    notify('Loading ECDIS route…', 'success');

    // Extract Google Drive file ID
    const gdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
                    url.match(/id=([a-zA-Z0-9_-]+)/);
    const fileId = gdMatch?.[1];

    // Build candidate URLs to try
    const candidates = fileId ? [
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
      `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      `https://drive.google.com/uc?id=${fileId}&export=download`,
    ] : [url];

    const tryUrl = (urls) => {
      if (urls.length === 0) {
        // All attempts failed — show download link so user can open manually
        notify(
          `CORS blocked. File ID: ${fileId || 'unknown'}. Make sure it's shared publicly.`,
          'error'
        );
        doAutoRoute();
        return;
      }
      const [next, ...rest] = urls;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);

      fetch(next, {
        mode: 'cors',
        signal: ctrl.signal,
        headers: { Accept: 'application/xml,text/xml,*/*' },
      })
        .then(res => { clearTimeout(timer); if (!res.ok) throw new Error(res.status); return res.text(); })
        .then(text => {
          const result = parseRTZ(text);
          if (result && result.waypoints.length >= 2) {
            setWaypoints(result.waypoints);
            setRouteName(
              r.fileName || r['File Name'] || r['Route Name'] || 'ECDIS Route'
            );
            setRouteMeta(null);
            setSearchMode('done');
            notify(`✅ ECDIS route loaded: ${result.waypoints.length} WPs`, 'success');
          } else {
            tryUrl(rest);
          }
        })
        .catch(() => { clearTimeout(timer); tryUrl(rest); });
    };

    tryUrl(candidates);
  };

  // ── Generate auto route ────────────────────────────────────────────────────
  const handleGenerateAutoRoute=async()=>{
    const f=portF,t=portT;
    if(!f||!t)return;
    setIsGenerating(true);setSearchMode('generating');
    setRouteMeta(null);setApiSafetyReport(null);setApiRouteInfo(null);
    try{
      const url=`${RENDER_API}/route?fromLon=${f.lon}&fromLat=${f.lat}&toLon=${t.lon}&toLat=${t.lat}&draft=${vDraft}&safety=2&beam=${vBeam}&loa=${vLoa}`;
      const res=await fetch(url,{signal:AbortSignal.timeout(35000)});
      if(res.ok){
        const data=await res.json();
        if(data.waypoints&&data.waypoints.length>=2){
          const recalced=recalcWaypoints(data.waypoints.map((w,i)=>({lat:w.lat,lon:w.lon,name:`WP${String(i+1).padStart(2,'0')}`})));
          setWaypoints(recalced);
          setRouteName(`${f.name} → ${t.name}`);
          const info={totalNM:data.totalNM||0,method:data.method||'api',landCrossing:data.landCrossing||false,tssZones:data.tssZones||[],portApproach:data.portApproach||{},warnings:data.warnings||[],overallSafe:data.overallSafe!==false};
          setApiRouteInfo(info);
          if(data.safetyReport)setApiSafetyReport(data.safetyReport);
          setRouteMeta({
            totalNM:data.totalNM||0,
            etaAt12kn:((data.totalNM||0)/12).toFixed(1),
            etaAt15kn:((data.totalNM||0)/15).toFixed(1),
            confidence:'HIGH — api',
            routeSource:'navispherex-router',
            canalInfo:(data.tssZones||[]).map(z=>({canal:z.replace(/_/g,' ').toUpperCase(),status:'OK',reason:'TSS lane followed by API'})),
            approachStartIdx:recalced.length-1,
            waypoints:recalced,
          });
          setCheckAutoRes([]);setSearchMode('done');
          if(data.warnings?.length>0)data.warnings.slice(0,3).forEach(w=>notify(w,'error'));
          else notify(`Route ready: ${recalced.length} WPs — ${(data.totalNM||0).toFixed(0)} NM ✅`,'success');
          setIsGenerating(false);
          return;
        }
      }
    }catch(e){console.warn('[NavisphereX] Render API failed, falling back:',e);}

    const vesselParams={draft:vDraft,beam:vBeam,loa:vLoa,airDraft:vAirDraft,vesselType:vType};
    const result=await buildProRoute(f,t,vesselParams);
    if(result.error||!result.waypoints||result.waypoints.length<2){
      notify(`Cannot route ${f.name} → ${t.name}: ${result.error||'Route not found'}. Try Manual tab.`,'error');
      setIsGenerating(false);setSearchMode('choose');return;
    }
    setWaypoints(result.waypoints);
    setRouteName(`${f.name} → ${t.name}`);
    setRouteMeta(result);setCheckAutoRes([]);setSearchMode('done');
    const blocked=result.canalInfo?.filter(c=>c.status==='BLOCKED');
    if(blocked?.length>0)blocked.forEach(c=>notify(`🚫 ${c.canal}: ${c.reason}. ${c.alternative}`,'error'));
    notify(`Auto route (fallback): ${result.waypoints.length} WPs — ${result.totalNM.toFixed(0)} NM`,'success');
    setIsGenerating(false);
  };

  const resetSearch=()=>{setSearchMode(null);setPortF(null);setPortT(null);setDbSuggestions([]);setShowManualFrom(false);setShowManualTo(false);};

  const handleRTZLoad=(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const result=parseRTZ(ev.target.result);
      if(!result||result.waypoints.length===0){notify('Could not parse RTZ file','error');return;}
      setWaypoints(result.waypoints);setRouteName(result.name);
      notify(`Loaded: ${result.name} — ${result.waypoints.length} WPs`,'success');
    };
    reader.readAsText(file);
  };

  const handleMapClick=(lat,lon)=>{
    if(panel==='manual'){setManualWps(wps=>recalcWaypoints([...wps,{lat:Math.round(lat*10000)/10000,lon:Math.round(lon*10000)/10000,name:''}]));return;}
    if(!clickAdd)return;
    setWaypoints(wps=>recalcWaypoints([...wps,{lat:Math.round(lat*10000)/10000,lon:Math.round(lon*10000)/10000}]));
  };

  const removeWP=i=>setWaypoints(wps=>recalcWaypoints(wps.filter((_,j)=>j!==i)));
  const clearRoute=()=>{setWaypoints([]);setPlaying(false);setCheckAutoRes([]);setRouteMeta(null);setSearchMode(null);setApiSafetyReport(null);setApiRouteInfo(null);};
  const toggleOverlay=k=>setOverlays(o=>({...o,[k]:!o[k]}));
  const clearManual=()=>{setManualWps([]);setCheckResults([]);};

  const saveManualRoute=async()=>{
    if(manualWps.length<2){notify('Add at least 2 waypoints','error');return;}
    const route={id:`route_${Date.now()}`,name:manualRouteName||'Manual Route',waypoints:manualWps,savedAt:new Date().toISOString(),totalNM:totalManualNM};
    try{await idbSaveRoute(route);setSavedRoutes(prev=>[route,...prev.filter(r=>r.id!==route.id)]);notify(`"${route.name}" saved`,'success');}
    catch{notify('Save failed','error');}
  };
  const deleteSavedRoute=async id=>{
    try{await idbDeleteRoute(id);setSavedRoutes(prev=>prev.filter(r=>r.id!==id));notify('Deleted','success');}
    catch{notify('Delete failed','error');}
  };
  const exportManualRoute=()=>{
    if(manualWps.length<2){notify('Add at least 2 waypoints','error');return;}
    const name=manualRouteName||'Manual Route',safe=name.replace(/\s+/g,'-');
    const fmts={rtz:{fn:()=>exportRTZ(name,manualWps),ext:'.rtz',mime:'application/xml'},gpx:{fn:()=>exportGPX(name,manualWps),ext:'.gpx',mime:'application/gpx+xml'},csv:{fn:()=>exportCSV(manualWps),ext:'.csv',mime:'text/csv'},nmea:{fn:()=>exportNMEAWPL(name,manualWps),ext:'-nmea.txt',mime:'text/plain'},furuno:{fn:()=>exportFurunoCSV(name,manualWps),ext:'-furuno.csv',mime:'text/csv'},jrc:{fn:()=>exportJRCCSV(name,manualWps),ext:'-jrc.csv',mime:'text/csv'},transas:{fn:()=>exportTransasXML(name,manualWps),ext:'-transas.xml',mime:'application/xml'},kml:{fn:()=>exportKML(name,manualWps),ext:'.kml',mime:'application/vnd.google-earth.kml+xml'}};
    const cfg=fmts[exportFormat]||fmts.rtz;
    downloadFile(cfg.fn(),`${safe}${cfg.ext}`,cfg.mime);
  };

  // ── FIX 2: Export auto route (same formats as manual) ─────────────────────
  const handleExportAutoRoute = () => {
    if (waypoints.length < 2) { notify('No route to export', 'error'); return; }
    const name = routeName || 'Auto Route';
    const safe = name.replace(/[^a-zA-Z0-9_-]/g, '-');
    const fmts = {
      rtz:     { fn: () => exportRTZ(name, waypoints),         ext: '.rtz',         mime: 'application/xml' },
      gpx:     { fn: () => exportGPX(name, waypoints),         ext: '.gpx',         mime: 'application/gpx+xml' },
      csv:     { fn: () => exportCSV(waypoints),                ext: '.csv',         mime: 'text/csv' },
      nmea:    { fn: () => exportNMEAWPL(name, waypoints),     ext: '-nmea.txt',    mime: 'text/plain' },
      furuno:  { fn: () => exportFurunoCSV(name, waypoints),   ext: '-furuno.csv',  mime: 'text/csv' },
      jrc:     { fn: () => exportJRCCSV(name, waypoints),      ext: '-jrc.csv',     mime: 'text/csv' },
      transas: { fn: () => exportTransasXML(name, waypoints),  ext: '-transas.xml', mime: 'application/xml' },
      kml:     { fn: () => exportKML(name, waypoints),         ext: '.kml',         mime: 'application/vnd.google-earth.kml+xml' },
    };
    const cfg = fmts[exportFormat] || fmts.rtz;
    try {
      downloadFile(cfg.fn(), `${safe}${cfg.ext}`, cfg.mime);
      notify(`Exported as ${exportFormat.toUpperCase()} ✅`, 'success');
    } catch (e) {
      notify(`Export failed: ${e.message}`, 'error');
    }
  };

  // ── Route check — updated to include new zones ─────────────────────────────
  const runRouteCheck=async(wps,setRes,setChecking)=>{
    if(wps.length<2){notify('Add at least 2 waypoints','error');return;}
    setChecking(true);setRes([]);
    const results=[];
    for(let i=1;i<wps.length;i++){if((wps[i].distance||0)<0.1)results.push({segIdx:i,type:'duplicate',severity:'error',message:`WP${i} & WP${i+1}: too close (< 0.1 NM)`});}
    for(let i=2;i<wps.length;i++){let diff=Math.abs((wps[i].bearing||0)-(wps[i-1].bearing||0));if(diff>180)diff=360-diff;if(diff>140)results.push({segIdx:i,type:'sharpTurn',severity:'warning',message:`WP${i+1}: ${diff.toFixed(0)}° course change — impractical`});}

    // ── All zone types checked against waypoints ───────────────────────────
    const allZones=[
      ...PIRACY_ZONES.map(z=>({...z,ztype:'piracy',label:'Piracy Risk Area (HRA)',sev:'error'})),
      ...MARITIME_RESTRICTIONS.map(z=>({...z,ztype:'restriction',label:`Maritime Restriction (${z.type||'RESTRICTED'})`,sev:z.severity==='critical'?'error':'warning'})),
      ...ECA_ZONES.map(z=>({...z,ztype:'eca',label:'ECA Zone — check fuel compliance',sev:'warning'})),
      ...SECA_ZONES.map(z=>({...z,ztype:'seca',label:'SECA Zone — 0.10% S fuel required',sev:'warning'})),
      ...MARPOL_ZONES.map(z=>({...z,ztype:'marpol',label:'MARPOL Special Area — discharge rules apply',sev:'warning'})),
      ...PSSA_ZONES.map(z=>({...z,ztype:'pssa',label:'PSSA — special precautions required',sev:'warning'})),
      ...NOX_ZONES.map(z=>({...z,ztype:'nox',label:'NOx Tier III ECA — engine compliance required',sev:'warning'})),
      ...LOAD_LINE_ZONES.map(z=>({...z,ztype:'loadline',label:'Load Line Zone — verify freeboard',sev:'warning'})),
      ...CHINA_MSC_NO_G.map(z=>({...z,ztype:'msc_nog',label:'MSC No-G Area — MSC vessels prohibited',sev:'error'})),
      ...EEZ_ZONES.map(z=>({...z,ztype:'eez',label:'EEZ — fishing/resource rules apply',sev:'warning'})),
      ...LAYOVER_ZONES.map(z=>({...z,ztype:'layover',label:'Anchorage Zone',sev:'warning'})),
    ];

    wps.forEach((wp,i)=>{
      const seen=new Set();
      allZones.forEach(zone=>{
        if(!zone.coords)return;
        const coords=zone.coords.map(p=>Array.isArray(p)?p:[p[0],p[1]]);
        const key=`${zone.ztype}:${zone.name}:${i}`;
        if(!seen.has(key)&&pointInPolygon(wp.lat,wp.lon,coords)){
          seen.add(key);
          results.push({
            segIdx:i,
            type:zone.ztype,
            severity:zone.sev,
            message:`WP${i+1} inside ${zone.label}: ${zone.name}${zone.shortDesc?' — '+zone.shortDesc:''}`,
          });
        }
      });
    });

    const midpoints=wps.slice(1).map((wp,idx)=>({lat:(wps[idx].lat+wp.lat)/2,lon:(wps[idx].lon+wp.lon)/2,segIdx:idx+1}));
    let tileWorked=false;
    try{
      const queue=[...midpoints],tileResults=[];let active=0,done=0;
      await new Promise(resolve=>{
        if(!midpoints.length){resolve();return;}
        const next=()=>{while(active<6&&queue.length>0){active++;const s=queue.shift();checkPointOnLand(s.lat,s.lon).then(onLand=>{if(onLand!==null)tileWorked=true;if(onLand===true)tileResults.push(s);active--;done++;if(done===midpoints.length)resolve();else next();});}};
        next();
      });
      tileResults.forEach(s=>results.push({segIdx:s.segIdx,type:'land',severity:'error',message:`Leg WP${s.segIdx}→WP${s.segIdx+1}: route crosses land`}));
    }catch{}
    if(!tileWorked&&midpoints.length>0){
      const batch=midpoints.slice(0,20),locs=batch.map(p=>`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|');
      try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),10000);const res=await fetch(`https://api.opentopodata.org/v1/gebco2020?locations=${locs}`,{signal:ctl.signal});if(res.ok){const data=await res.json();(data.results||[]).forEach((r,j)=>{if(r.elevation!==null&&r.elevation>2){const s=batch[j];results.push({segIdx:s.segIdx,type:'land',severity:'error',message:`Leg WP${s.segIdx}→WP${s.segIdx+1}: crosses land (${r.elevation.toFixed(0)}m)`})}});}}
      catch{results.push({type:'apiError',severity:'warning',message:'Land check unavailable — verify route visually'});}
    }
    const lats=wps.map(w=>w.lat),lons=wps.map(w=>w.lon);
    const bbox={s:Math.min(...lats)-0.05,n:Math.max(...lats)+0.05,w:Math.min(...lons)-0.05,e:Math.max(...lons)+0.05};
    if((bbox.n-bbox.s)*(bbox.e-bbox.w)<=25){
      const oq=`[out:json][timeout:20];(node["seamark:type"~"^(rock|wreck|obstruction|rock_awash|fishing_facility)$"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["natural"~"^(reef|rock)$"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["man_made"="lighthouse"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["seamark:type"="light"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["seamark:type"~"^(separation_zone|traffic_separation_scheme)$"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});way["man_made"="breakwater"](${bbox.s},${bbox.w},${bbox.n},${bbox.e}););out body;`;
      const data=await fetchOverpass(oq);
      if(data){
        const nodes=data.elements.filter(e=>e.type==='node'&&e.lat!==undefined),ways=data.elements.filter(e=>e.type==='way');
        const rep=new Set();
        wps.forEach((wp,i)=>{
          nodes.forEach(h=>{const distM=Math.sqrt((wp.lat-h.lat)**2+(wp.lon-h.lon)**2)*111000;const hType=h.tags?.['seamark:type']||h.tags?.natural||h.tags?.man_made||'hazard';const hName=h.tags?.name||h.tags?.['seamark:name']||'';const isDanger=['rock','wreck','obstruction','reef','rock_awash','fishing_facility'].includes(hType);const isTSS=['separation_zone','traffic_separation_scheme'].includes(hType);const threshold=isDanger?350:isTSS?200:80;if(distM<threshold){const key=`${hType}:${h.id}:${i}`;if(!rep.has(key)){rep.add(key);results.push({segIdx:i,type:'hazard',severity:isDanger?'error':'warning',message:`WP${i+1} within ${Math.round(distM)}m of ${hType.replace(/_/g,' ')}${hName?` "${hName}"`:''}`});}}});
          ways.filter(w=>w.tags?.man_made==='breakwater'&&w.bounds).forEach(w=>{const cLat=(w.bounds.minlat+w.bounds.maxlat)/2,cLon=(w.bounds.minlon+w.bounds.maxlon)/2;const distM=Math.sqrt((wp.lat-cLat)**2+(wp.lon-cLon)**2)*111000;if(distM<200){const key=`bw:${w.id}:${i}`;if(!rep.has(key)){rep.add(key);results.push({segIdx:i,type:'hazard',severity:'error',message:`WP${i+1} within ${Math.round(distM)}m of breakwater`});}}});
        });
        if(!results.some(r=>r.type==='hazard'))results.push({type:'hazardInfo',severity:'info',message:'OpenSeaMap: no hazards found near route'});
      }else results.push({type:'apiError',severity:'warning',message:'Hazard check unavailable — enable SeaMarks overlay'});
    }else results.push({type:'hazardInfo',severity:'info',message:'Global route — enable SeaMarks overlay to inspect hazards'});
    if(!results.filter(r=>!['apiError','hazardInfo','ok'].includes(r.type)).length)results.push({type:'ok',severity:'ok',message:'All checks passed — route looks safe!'});
    setRes(results);setChecking(false);
    const errors=results.filter(r=>r.severity==='error').length,warns=results.filter(r=>r.severity==='warning').length;
    if(errors>0)notify(`${errors} critical issue${errors>1?'s':''} found`,'error');
    else if(warns>0)notify(`${warns} warning${warns>1?'s':''}`,'success');
    else notify('Route check passed ✅','success');
  };

  const performRouteCheck    =()=>runRouteCheck(manualWps,setCheckResults,setIsChecking);
  const performAutoRouteCheck=()=>runRouteCheck(waypoints,setCheckAutoRes,setIsCheckingAuto);

  // ── API Full Safety Check ──────────────────────────────────────────────────
  const performApiSafetyCheck=async()=>{
    const wps=waypoints.length>=2?waypoints:manualWps;
    if(wps.length<2){notify('Need at least 2 waypoints','error');return;}
    setIsApiChecking(true);setApiSafetyReport(null);
    try{
      const res=await fetch(`${RENDER_API}/safety-check`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({waypoints:wps.map(w=>({lat:w.lat,lon:w.lon})),draft:vDraft,safety:2,beam:vBeam,loa:vLoa}),
        signal:AbortSignal.timeout(45000),
      });
      if(res.ok){
        const data=await res.json();
        setApiSafetyReport(data);
        const errs=data.warnings?.length||0;
        if(errs>0)notify(`${errs} safety issue(s) found — see report below`,'error');
        else notify('Full Safety Check passed ✅','success');
      }else notify('Safety check API error — try again','error');
    }catch(e){notify('Safety check failed — check connection','error');}
    setIsApiChecking(false);
  };

  const inp={width:'100%',padding:'6px 8px',background:'var(--bg2)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:7,fontSize:'0.78rem'};

  const manualCoordSection=(label,showState,setShow,latVal,setLat,lonVal,setLon,nameVal,setName,applyFn,isSet)=>(
    <div style={{marginTop:5}}>
      {!isSet&&<button onClick={()=>setShow(v=>!v)} style={{fontSize:'0.66rem',color:'var(--text2)',background:'none',border:'1px dashed var(--border)',borderRadius:5,padding:'3px 8px',cursor:'pointer',width:'100%'}}>{showState?'▲ Hide manual entry':'📍 Port not in database? Enter coordinates manually'}</button>}
      {isSet&&<div style={{fontSize:'0.66rem',color:'#00C896',padding:'3px 6px'}}>✅ Manual coordinates set</div>}
      {showState&&!isSet&&(
        <div style={{marginTop:6,padding:'8px 10px',background:'var(--bg2)',borderRadius:8,border:'1px solid var(--border)'}}>
          <div style={{fontSize:'0.68rem',color:'var(--text2)',marginBottom:6}}>Enter {label} coordinates:</div>
          <input className="fi" placeholder="Name / Description (optional)" value={nameVal} onChange={e=>setName(e.target.value)} style={{marginBottom:5}}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:6}}>
            <div><div style={{fontSize:'0.62rem',color:'var(--text2)',marginBottom:2}}>Latitude (-90 to 90)</div><input className="fi" type="number" step="0.0001" min="-90" max="90" placeholder="e.g. 22.8356" value={latVal} onChange={e=>setLat(e.target.value)}/></div>
            <div><div style={{fontSize:'0.62rem',color:'var(--text2)',marginBottom:2}}>Longitude (-180 to 180)</div><input className="fi" type="number" step="0.0001" min="-180" max="180" placeholder="e.g. 69.7220" value={lonVal} onChange={e=>setLon(e.target.value)}/></div>
          </div>
          <div style={{display:'flex',gap:5}}>
            <button className="btn btn-primary" style={{flex:1,justifyContent:'center',padding:'6px',fontSize:'0.72rem'}} onClick={applyFn}>✓ Use These Coordinates</button>
            <button className="btn btn-secondary" style={{padding:'6px 10px',fontSize:'0.72rem'}} onClick={()=>setShow(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Render: local check results ────────────────────────────────────────────
  const renderCheckResults=res=>(
    <div>
      {res.filter(r=>r.type!=='ok').map((r,i)=>(
        <div key={i} style={{padding:'6px 8px',marginBottom:4,borderRadius:6,fontSize:'0.7rem',lineHeight:1.4,background:r.severity==='error'?'rgba(231,76,60,0.14)':r.severity==='warning'?'rgba(255,179,71,0.13)':'rgba(0,180,216,0.09)',border:`1px solid ${r.severity==='error'?'rgba(231,76,60,0.4)':r.severity==='warning'?'rgba(255,179,71,0.4)':'rgba(0,180,216,0.3)'}`,color:r.severity==='error'?'#ff8080':r.severity==='warning'?'#FFB347':'var(--text2)'}}>
          {r.severity==='error'?'🚫':r.severity==='warning'?'⚠️':'ℹ️'} {r.message}
        </div>
      ))}
      {res.some(r=>r.type==='ok')&&<div style={{padding:'6px 8px',borderRadius:6,background:'rgba(0,200,150,0.14)',border:'1px solid rgba(0,200,150,0.4)',fontSize:'0.7rem',color:'#00C896'}}>✅ All checks passed!</div>}
    </div>
  );

  // ── Render: API route info ─────────────────────────────────────────────────
  const renderApiRouteInfo=info=>{
    if(!info)return null;
    return(
      <div style={{marginTop:6,marginBottom:4}}>
        {info.tssZones?.length>0&&(<div style={{padding:'5px 8px',borderRadius:6,marginBottom:4,fontSize:'0.68rem',background:'rgba(0,180,216,0.12)',border:'1px solid rgba(0,180,216,0.35)',color:'var(--cyan)'}}>🚢 TSS lanes followed: {info.tssZones.map(z=>z.replace(/_/g,' ')).join(', ')}</div>)}
        {(info.portApproach?.origin||info.portApproach?.destination)&&(<div style={{padding:'5px 8px',borderRadius:6,marginBottom:4,fontSize:'0.68rem',background:'rgba(255,179,71,0.12)',border:'1px solid rgba(255,179,71,0.35)',color:'#FFB347'}}>⚓ Port approach: {[info.portApproach.origin,info.portApproach.destination].filter(Boolean).map(p=>p.replace(/_/g,' ')).join(' → ')}</div>)}
        {info.landCrossing&&(<div style={{padding:'5px 8px',borderRadius:6,marginBottom:4,fontSize:'0.68rem',background:'rgba(231,76,60,0.14)',border:'1px solid rgba(231,76,60,0.4)',color:'#ff8080'}}>🚨 Land crossing detected — route may need manual adjustment</div>)}
        {info.warnings?.map((w,i)=>(<div key={i} style={{padding:'5px 8px',borderRadius:6,marginBottom:3,fontSize:'0.67rem',background:'rgba(231,76,60,0.10)',border:'1px solid rgba(231,76,60,0.3)',color:'#ff8080'}}>⚠️ {w}</div>))}
      </div>
    );
  };

  // ── Render: Full API safety report ────────────────────────────────────────
  const renderApiSafetyReport=report=>{
    if(!report)return null;
    const{overall_safe,warnings=[],route_stats,land_check,tss_check,port_check,depth_check,danger_check}=report;
    const sec={marginBottom:5,borderRadius:7,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)'};
    const hdr=(ok,color)=>({padding:'5px 9px',fontSize:'0.67rem',fontWeight:700,display:'flex',justifyContent:'space-between',alignItems:'center',background:color||(ok?'rgba(0,200,150,0.18)':'rgba(231,76,60,0.22)'),color:ok?'#00C896':'#ff8080'});
    const row={padding:'4px 9px',fontSize:'0.66rem',lineHeight:1.45,background:'rgba(0,0,0,0.22)',borderTop:'1px solid rgba(255,255,255,0.05)',color:'var(--text2)'};
    const wrow={...row,color:'#ff8080'};
    return(
      <div style={{marginTop:8}}>
        <div style={{padding:'8px 10px',borderRadius:8,marginBottom:8,background:overall_safe?'rgba(0,200,150,0.14)':'rgba(231,76,60,0.16)',border:`1px solid ${overall_safe?'rgba(0,200,150,0.45)':'rgba(231,76,60,0.45)'}`,display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:'1rem'}}>{overall_safe?'✅':'🚨'}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:'0.72rem',fontWeight:700,color:overall_safe?'#00C896':'#ff8080'}}>{overall_safe?'Route is SAFE':'Safety Issues Found'}</div>
            {warnings.length>0&&<div style={{fontSize:'0.63rem',color:'var(--text2)',marginTop:1}}>{warnings.length} warning(s) — see below</div>}
          </div>
          {route_stats&&<div style={{textAlign:'right'}}><div style={{fontSize:'0.7rem',fontFamily:'Orbitron,monospace',color:'var(--gold)'}}>{route_stats.total_nm} NM</div><div style={{fontSize:'0.6rem',color:'var(--text2)'}}>{route_stats.waypoint_count} WPs</div></div>}
        </div>
        {route_stats?.eta&&(<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4,marginBottom:8}}>{[['10kn',route_stats.eta['10kn']],['12kn',route_stats.eta['12kn']],['15kn',route_stats.eta['15kn']],['18kn',route_stats.eta['18kn']]].map(([spd,hrs])=>(<div key={spd} style={{background:'var(--bg2)',borderRadius:6,padding:'4px 5px',textAlign:'center'}}><div style={{fontSize:'0.57rem',color:'var(--text2)'}}>@{spd}</div><div style={{fontSize:'0.7rem',color:'var(--gold)',fontFamily:'Orbitron,monospace'}}>{hrs}h</div></div>))}</div>)}
        <div style={sec}><div style={hdr(land_check?.safe)}><span>{land_check?.safe?'✅':'🚨'} Land Crossing</span><span style={{fontWeight:400,fontSize:'0.63rem'}}>{land_check?.safe?'Clear':`${land_check?.problem_segments?.length||0} segment(s)`}</span></div>{!land_check?.safe&&land_check?.problem_segments?.map((sg,i)=><div key={i} style={wrow}>🚨 Seg {sg.segment_index+1}</div>)}{land_check?.safe&&<div style={row}>✅ No land crossings detected</div>}</div>
        <div style={sec}><div style={{...hdr(true),background:'rgba(0,180,216,0.18)',color:'var(--cyan)'}}><span>🚢 TSS Zones</span><span style={{fontWeight:400,fontSize:'0.63rem'}}>{tss_check?.zones_crossed||0} crossed</span></div>{tss_check?.issues?.length>0?tss_check.issues.map((issue,i)=><div key={i} style={row}>🚢 <b style={{color:'var(--cyan)'}}>{issue.tss?.replace(/_/g,' ').toUpperCase()}</b> — use <b style={{color:'#FFB347'}}>{issue.correct_lane}</b> lane</div>):<div style={row}>✅ No TSS zones crossed</div>}</div>
        <div style={sec}><div style={{...hdr(true),background:'rgba(255,179,71,0.16)',color:'#FFB347'}}><span>⚓ Port Approach</span></div>{port_check?.origin_port&&<div style={row}>🛳 Departure: <b style={{color:'#FFB347'}}>{port_check.origin_port.replace(/_/g,' ')}</b></div>}{port_check?.destination_port&&<div style={row}>🏁 Arrival: <b style={{color:'#FFB347'}}>{port_check.destination_port.replace(/_/g,' ')}</b></div>}{!port_check?.origin_port&&!port_check?.destination_port&&<div style={row}>ℹ️ No port approach match</div>}</div>
        <div style={sec}><div style={hdr(depth_check?.safe)}><span>{depth_check?.safe?'✅':'⚠️'} Water Depth</span><span style={{fontWeight:400,fontSize:'0.63rem'}}>{depth_check?.min_depth_m!=null?`Min ${depth_check.min_depth_m}m / Need ${depth_check.required_depth}m`:'—'}</span></div>{depth_check?.shallow_points?.map((sp,i)=><div key={i} style={wrow}>⚠️ Shallow {sp.depth}m at ({sp.lat?.toFixed(3)},{sp.lon?.toFixed(3)})</div>)}{depth_check?.safe&&<div style={row}>✅ Depth OK — {depth_check.points_checked} points checked</div>}</div>
        <div style={sec}><div style={hdr(danger_check?.safe)}><span>{danger_check?.safe?'✅':'🪨'} Danger Marks</span><span style={{fontWeight:400,fontSize:'0.63rem'}}>{danger_check?.total_in_area||0} in area</span></div>{danger_check?.dangers_near_route?.map((d,i)=><div key={i} style={wrow}>🪨 {d.type?.toUpperCase()} {d.name?`"${d.name}"`:''} — {d.nearest_route_nm} NM</div>)}{danger_check?.safe&&<div style={row}>✅ No danger marks near route</div>}</div>
      </div>
    );
  };

  // ── Regulatory zones overlay panel (replaces old overlay section) ──────────
  const renderRegZones=()=>(
    <div className="p-section">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
        <span className="p-label" style={{marginBottom:0}}>🌐 Regulatory Zones</span>
        {Object.values(overlays).some(Boolean)&&(
          <button onClick={()=>setOverlays(o=>Object.fromEntries(Object.keys(o).map(k=>[k,false])))}
            style={{fontSize:'0.62rem',color:'var(--red)',background:'none',border:'1px solid rgba(231,76,60,0.4)',borderRadius:4,padding:'2px 7px',cursor:'pointer'}}>
            ⭕ All Off
          </button>
        )}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
        {REG_ZONE_CFG.map(z=>{
          const on=!!overlays[z.k];
          return(
            <button key={z.k} onClick={()=>toggleOverlay(z.k)} title={z.desc}
              style={{display:'flex',alignItems:'center',gap:5,padding:'5px 7px',borderRadius:6,fontSize:'0.67rem',cursor:'pointer',border:`1px solid ${on?z.color:'var(--border)'}`,background:on?`${z.color}18`:'var(--bg2)',color:on?z.color:'var(--text2)',textAlign:'left',transition:'all 0.15s'}}>
              <div style={{width:8,height:8,borderRadius:2,background:z.color,flexShrink:0,opacity:on?1:0.35}}/>
              <span style={{fontWeight:on?700:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{z.label}</span>
              {on&&<span style={{marginLeft:'auto',fontSize:'0.6rem'}}>✓</span>}
            </button>
          );
        })}
      </div>
      <div style={{fontSize:'0.62rem',color:'var(--text3)',marginTop:5,padding:'4px 0',borderTop:'1px solid var(--border)',lineHeight:1.5}}>
        Tap zone on map for regulation details
      </div>
    </div>
  );

  return(
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
      {/* TOP BAR */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0.7rem 1rem',background:'var(--card)',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
        <input className="fi" style={{flex:1,minWidth:150,padding:'7px 12px',fontSize:'0.82rem'}} placeholder="Route Name…" value={routeName} onChange={e=>setRouteName(e.target.value)}/>
        {totalNM>0&&<span style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan)',whiteSpace:'nowrap'}}>📏 {totalNM.toFixed(1)} NM</span>}
        <span style={{fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'var(--text2)'}}>{waypoints.length} WPTs</span>
        <button className="btn btn-gold" style={{padding:'7px 12px',fontSize:'0.72rem'}} disabled={waypoints.length<2} onClick={()=>downloadFile(exportRTZ(routeName,waypoints),`${routeName.replace(/\s+/g,'-')}.rtz`,'application/xml')}>⬇ RTZ</button>
        <button className="btn btn-green" style={{padding:'7px 12px',fontSize:'0.72rem'}} disabled={waypoints.length<2} onClick={()=>downloadFile(exportCSV(waypoints),`${routeName.replace(/\s+/g,'-')}.csv`,'text/csv')}>⬇ CSV</button>
        <button className="btn btn-danger" style={{padding:'7px 12px',fontSize:'0.72rem'}} onClick={clearRoute}>🗑 Clear</button>
        <div style={{display:'flex',gap:3,marginLeft:'auto',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
          {[['night','🌙'],['dusk','🌅'],['day','☀️']].map(([m,l])=>(<button key={m} onClick={()=>setMapMode(m)} style={{padding:'5px 10px',fontSize:'0.68rem',border:'none',cursor:'pointer',fontFamily:'Exo 2,sans-serif',fontWeight:600,background:mapMode===m?(m==='night'?'#0B1D35':m==='dusk'?'#7C3A1A':'#1565C0'):'transparent',color:mapMode===m?'white':'var(--text2)',transition:'all 0.2s'}}>{l}</button>))}
        </div>
      </div>

      <div className="planner-layout">
        <div className="planner-sidebar">
          {/* TABS */}
          <div className="p-tabs">
            {[['auto','🗺 Auto'],['manual','✏️ Manual'],['load','📂 Load RTZ'],['eta','⏱ ETA'],['wpts','📋 WPTs']].map(([k,l])=>(<button key={k} className={`p-tab ${panel===k?'active':''}`} onClick={()=>setPanel(k)}>{l}</button>))}
          </div>
          <div className="p-panel" style={{overflowY:'auto'}}>

            {/* ── AUTO PANEL ── */}
            {panel==='auto'&&(<>
              <div className="p-section">
                <span className="p-label">🛳 Departure Port</span>
                <div style={{position:'relative'}}>
                  <input className="fi" placeholder="Search port name, code or city…" value={fromPort} onChange={e=>{setFromPort(e.target.value);setSearchMode(null);setPortF(null);setShowManualFrom(false);}} onFocus={()=>searchPort(fromPort,setFromSugg)}/>
                  {fromSugg.length>0&&(<div className="ac" style={{position:'absolute',zIndex:200}}>{fromSugg.map(p=>(<div key={p.id} className="ac-item" onClick={()=>{setFromPort(p.name);setFromSugg([]);setSearchMode(null);setPortF(p);setShowManualFrom(false);}}><span>📍</span><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{p.name}</div><div style={{fontSize:'0.67rem',color:'var(--text2)'}}>{p.city} · {p.country}</div><div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{p.lat?.toFixed(4)}°N / {p.lon?.toFixed(4)}°E · {p.id}</div></div></div>))}</div>)}
                </div>
                {manualCoordSection('Departure',showManualFrom,setShowManualFrom,manualFromLat,setManualFromLat,manualFromLon,setManualFromLon,manualFromName,setManualFromName,applyManualFrom,portF?.id==='CUSTOM_DEP')}
              </div>

              <div className="p-section">
                <span className="p-label">🏁 Arrival Port</span>
                <div style={{position:'relative'}}>
                  <input className="fi" placeholder="Search port name, code or city…" value={toPort} onChange={e=>{setToPort(e.target.value);setSearchMode(null);setPortT(null);setShowManualTo(false);}} onFocus={()=>searchPort(toPort,setToSugg)}/>
                  {toSugg.length>0&&(<div className="ac" style={{position:'absolute',zIndex:200}}>{toSugg.map(p=>(<div key={p.id} className="ac-item" onClick={()=>{setToPort(p.name);setToSugg([]);setSearchMode(null);setPortT(p);setShowManualTo(false);}}><span>🏁</span><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{p.name}</div><div style={{fontSize:'0.67rem',color:'var(--text2)'}}>{p.city} · {p.country}</div><div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{p.lat?.toFixed(4)}°N / {p.lon?.toFixed(4)}°E · {p.id}</div></div></div>))}</div>)}
                </div>
                {manualCoordSection('Arrival',showManualTo,setShowManualTo,manualToLat,setManualToLat,manualToLon,setManualToLon,manualToName,setManualToName,applyManualTo,portT?.id==='CUSTOM_ARR')}
              </div>

              <div className="p-section">
                <button onClick={()=>setShowVessel(v=>!v)} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',cursor:'pointer',color:'var(--text)',fontSize:'0.78rem',fontWeight:600}}>
                  <span>🚢 Vessel Parameters</span>
                  <span style={{fontSize:'0.68rem',color:'var(--text2)'}}>{showVessel?'▲':'▼'} Draft:{vDraft}m Beam:{vBeam}m LOA:{vLoa}m</span>
                </button>
                {showVessel&&(<div style={{marginTop:8,display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {[['Draft (m)',vDraft,setVDraft,0.1,50,0.1],['Beam (m)',vBeam,setVBeam,1,100,1],['LOA (m)',vLoa,setVLoa,10,600,1],['Air Draft (m)',vAirDraft,setVAirDraft,1,120,1]].map(([label,val,setter,min,max,step])=>(<div key={label}><div style={{fontSize:'0.65rem',color:'var(--text2)',marginBottom:3}}>{label}</div><input type="number" min={min} max={max} step={step} value={val} onChange={e=>setter(+e.target.value)} style={inp}/></div>))}
                  <div style={{gridColumn:'1/-1'}}><div style={{fontSize:'0.65rem',color:'var(--text2)',marginBottom:3}}>Vessel Type</div>
                    <select value={vType} onChange={e=>setVType(e.target.value)} style={inp}>
                      <option value="cargo">General Cargo</option><option value="tanker">Tanker (VLCC/Suezmax)</option><option value="bulker">Bulk Carrier</option><option value="container">Container Ship</option><option value="roro">RoRo / Vehicle Carrier</option><option value="lpg">LPG / LNG Carrier</option><option value="passenger">Passenger / Cruise</option>
                    </select>
                  </div>
                </div>)}
              </div>

              {(!searchMode||searchMode===null)&&<button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'0.6rem'}} onClick={handleSearch}>🔍 Search Routes</button>}

              {searchMode==='choose'&&(<>
                {dbSuggestions.length>0&&(<div style={{marginBottom:'0.8rem',background:'rgba(0,180,216,0.07)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:10,padding:10}}>
                  <div style={{fontSize:'0.74rem',color:'var(--cyan)',fontWeight:700,marginBottom:6}}>📂 {dbSuggestions.length} ECDIS route{dbSuggestions.length>1?'s':''} found:</div>
                  {dbSuggestions.map((r,i)=>{
                    const allVals=Object.entries(r).filter(([k,v])=>v&&typeof v==='string'&&v.trim().length>2);
                    const nameCols=allVals.filter(([k])=>/(name|route|file|rtz|title)/i.test(k));
                    const name=r.fileName||r['File Name']||r['Route Name']||nameCols[0]?.[1]||allVals[0]?.[1]||`Route ${i+1}`;
                    const port=r.portName||r['Port Name']||r['From']||'';
                    const hasUrl=!!(r.fileUrl||r['File URL']||r['Drive Link']||Object.values(r).find(v=>typeof v==='string'&&v.includes('drive.google')));
                    return(<div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'rgba(0,0,0,0.2)',marginBottom:5,cursor:'pointer',border:'1px solid rgba(255,255,255,0.06)'}} onClick={()=>useDbRoute(r)}><span style={{fontSize:'1.1rem'}}>{hasUrl?'📥':'📋'}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:'0.8rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>{port&&<div style={{fontSize:'0.68rem',color:'var(--cyan)',marginTop:1}}>📍 {port}</div>}</div><button style={{background:'var(--cyan)',color:'#000',border:'none',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',fontWeight:700,cursor:'pointer'}}>USE</button></div>);
                  })}
                  <div style={{fontSize:'0.67rem',color:'var(--text2)',marginTop:6,textAlign:'center'}}>— or generate a new route —</div>
                </div>)}
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:6}} onClick={handleGenerateAutoRoute} disabled={isGenerating}>{isGenerating?'⏳ Computing via NavisphereX Router…':'🗺 Generate Auto Route'}</button>
                <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',fontSize:'0.72rem',padding:'6px'}} onClick={resetSearch}>← Change Ports</button>
              </>)}

              {searchMode==='generating'&&!routeMeta&&(<div style={{textAlign:'center',padding:'1.5rem',color:'var(--text2)',fontSize:'0.8rem'}}><div className="spin" style={{margin:'0 auto 10px'}}/>Computing route via NavisphereX Router…</div>)}

              {/* ── FIX 3: routeMeta done block — with Export Route section ── */}
              {routeMeta && searchMode === 'done' && (
                <div style={{ marginBottom: '0.8rem', background: 'rgba(0,180,216,0.06)', border: '1px solid rgba(0,180,216,0.2)', borderRadius: 10, padding: 10 }}>
                  {/* ── Route Analysis ── */}
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cyan)', marginBottom: 6 }}>📊 Route Analysis</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
                    {[
                      ['Total', `${routeMeta.totalNM.toFixed(0)} NM`],
                      ['ETA @12kn', `${routeMeta.etaAt12kn}h`],
                      ['ETA @15kn', `${routeMeta.etaAt15kn}h`],
                      ['Data', routeMeta.confidence?.split('(')[0]?.trim().substring(0, 8) || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '5px 8px' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text2)' }}>{k}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--gold)', fontFamily: 'Orbitron,monospace' }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {routeMeta.canalInfo?.length > 0 && routeMeta.canalInfo.map((c, i) => (
                    <div key={i} style={{ padding: '5px 8px', borderRadius: 6, marginBottom: 3, fontSize: '0.7rem', background: c.status === 'OK' ? 'rgba(0,200,150,0.12)' : 'rgba(231,76,60,0.14)', border: `1px solid ${c.status === 'OK' ? 'rgba(0,200,150,0.35)' : 'rgba(231,76,60,0.4)'}`, color: c.status === 'OK' ? '#00C896' : '#ff8080' }}>
                      {c.status === 'OK' ? '✅' : '🚫'} {c.canal}
                      {c.reason && <span style={{ fontSize: '0.63rem', display: 'block', opacity: 0.85, marginTop: 1 }}>{c.reason}</span>}
                    </div>
                  ))}

                  {renderApiRouteInfo(apiRouteInfo)}

                  <div style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.2)', fontSize: '0.65rem', color: '#ff8080', lineHeight: 1.45, marginTop: 4 }}>
                    ⚠ NOT certified for navigation. Verify with official ENC.
                  </div>

                  {/* ── Export Route (same formats as manual mode) ── */}
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>⬇ Export Route</div>
                    <select
                      value={exportFormat}
                      onChange={e => setExportFormat(e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: 7, background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.72rem', marginBottom: 6 }}
                    >
                      <option value="rtz">RTZ — CIRM Standard (.rtz)</option>
                      <option value="gpx">GPX — GPS Exchange (.gpx)</option>
                      <option value="csv">CSV — Generic (.csv)</option>
                      <option value="nmea">NMEA 0183 WPL (.txt)</option>
                      <option value="furuno">Furuno ECDIS (.csv)</option>
                      <option value="jrc">JRC ECDIS (.csv)</option>
                      <option value="transas">Transas / TECDIS (.xml)</option>
                      <option value="kml">Google Earth KML (.kml)</option>
                    </select>
                    <button
                      className="btn btn-gold"
                      style={{ width: '100%', justifyContent: 'center', padding: '7px', fontSize: '0.74rem' }}
                      onClick={handleExportAutoRoute}
                      disabled={waypoints.length < 2}
                    >
                      ⬇ Export {exportFormat.toUpperCase()}
                    </button>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', justifyContent: 'center', fontSize: '0.7rem', padding: '5px', marginTop: 8 }}
                    onClick={() => setSearchMode('choose')}
                  >
                    ↩ Change route selection
                  </button>
                </div>
              )}

              {(searchMode==='done'||waypoints.length>0)&&(<>
                <div className="p-section">
                  <span className="p-label">📍 Add Manual Waypoints</span>
                  <button className={`btn ${clickAdd?'btn-gold':'btn-secondary'}`} style={{width:'100%',justifyContent:'center'}} onClick={()=>setClickAdd(c=>!c)}>{clickAdd?'✅ Click map to add WP (ON)':'Click map to add WP'}</button>
                </div>
                <div className="p-section">
                  <span className="p-label">🔍 Route Safety Check</span>
                  <div style={{fontSize:'0.68rem',color:'var(--text2)',marginBottom:6}}>Land, rocks/wrecks, piracy, ECA/SECA, PSSA, restrictions, NOx, load line zones.</div>
                  <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:6}} disabled={waypoints.length<2||isCheckingAuto} onClick={performAutoRouteCheck}>{isCheckingAuto?'⏳ Checking…':'🔍 Run Local Check'}</button>
                  <button style={{width:'100%',display:'flex',justifyContent:'center',alignItems:'center',gap:6,padding:'8px',marginBottom:8,borderRadius:8,cursor:waypoints.length<2||isApiChecking?'not-allowed':'pointer',fontSize:'0.72rem',fontWeight:600,background:'rgba(0,180,216,0.18)',border:'1px solid rgba(0,180,216,0.5)',color:'var(--cyan)',opacity:waypoints.length<2||isApiChecking?0.5:1}} disabled={waypoints.length<2||isApiChecking} onClick={performApiSafetyCheck}>
                    {isApiChecking?<>⏳ Running API Safety Check…</>:'🛡 Run Full API Safety Check'}
                  </button>
                  {checkAutoRes.length>0&&renderCheckResults(checkAutoRes)}
                  {apiSafetyReport&&renderApiSafetyReport(apiSafetyReport)}
                </div>
              </>)}

              {/* NEW: Regulatory Zones replaces old overlay buttons */}
              {renderRegZones()}
            </>)}

            {/* ── MANUAL PANEL ── */}
            {panel==='manual'&&(<>
              <div className="p-section">
                <span className="p-label">✏️ Manual Route Builder</span>
                <div style={{fontSize:'0.72rem',color:'var(--cyan)',marginBottom:'0.5rem',padding:'6px 8px',background:'rgba(0,180,216,0.08)',borderRadius:6,border:'1px solid rgba(0,180,216,0.2)'}}>👆 Tap the map to place waypoints.</div>
                <input className="fi" placeholder="Route name…" value={manualRouteName} onChange={e=>setManualRouteName(e.target.value)} style={{marginBottom:6}}/>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="btn btn-danger" style={{flex:1,justifyContent:'center',padding:'6px 8px'}} disabled={manualWps.length===0} onClick={clearManual}>🗑 Clear All</button>
                  {manualWps.length>0&&<div style={{padding:'6px 10px',background:'var(--bg2)',borderRadius:8,fontSize:'0.72rem',fontFamily:'Orbitron,monospace',color:'var(--gold)',whiteSpace:'nowrap'}}>{totalManualNM.toFixed(1)} NM · {manualWps.length} WPs</div>}
                </div>
              </div>
              {manualWps.length===0&&<div className="empty" style={{marginTop:8}}><div className="empty-icon">👆</div><div className="empty-t">Tap the map to start</div><div className="empty-d">Course and distance appear on each leg automatically.</div></div>}
              {manualWps.length>0&&(<div className="p-section"><span className="p-label">📋 Waypoints</span><div style={{overflowX:'auto'}}><table className="wp-table"><thead><tr><th>#</th><th>Name</th><th>Lat</th><th>Lon</th><th>Crs°</th><th>NM</th><th>Del</th></tr></thead><tbody>{manualWps.map((wp,i)=>(<tr key={i}><td style={{color:'var(--cyan)',fontFamily:'Orbitron,monospace',fontSize:'0.7rem'}}>{String(i+1).padStart(2,'0')}</td><td><input style={{background:'transparent',border:'1px solid var(--border)',color:'var(--text)',padding:'2px 4px',fontSize:'0.67rem',width:62,borderRadius:4}} value={wp.name||''} placeholder={`WP${i+1}`} onChange={e=>{const u=[...manualWps];u[i]={...u[i],name:e.target.value};setManualWps(u);}}/></td><td style={{fontSize:'0.67rem'}}>{wp.lat.toFixed(4)}</td><td style={{fontSize:'0.67rem'}}>{wp.lon.toFixed(4)}</td><td style={{fontSize:'0.67rem'}}>{i>0?(wp.bearing||0).toFixed(0):'—'}</td><td style={{fontSize:'0.67rem'}}>{i>0?(wp.distance||0).toFixed(1):'0'}</td><td><button onClick={()=>setManualWps(wps=>recalcWaypoints(wps.filter((_,j)=>j!==i)))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'0.85rem'}}>✕</button></td></tr>))}</tbody></table><div style={{marginTop:8,padding:'7px',background:'var(--bg2)',borderRadius:8,textAlign:'center',fontFamily:'Orbitron,monospace',fontSize:'0.74rem',color:'var(--gold)'}}>Total: {totalManualNM.toFixed(1)} NM</div></div></div>)}
              <div className="p-section"><span className="p-label">🔍 Route Safety Check</span><button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:8}} disabled={manualWps.length<2||isChecking} onClick={performRouteCheck}>{isChecking?'⏳ Checking…':'🔍 Run Route Check'}</button>{checkResults.length>0&&renderCheckResults(checkResults)}</div>
              <div className="p-section"><span className="p-label">💾 Save &amp; Export</span><button className="btn btn-green" style={{width:'100%',justifyContent:'center',marginBottom:8}} disabled={manualWps.length<2} onClick={saveManualRoute}>💾 Save to Route Library</button><select value={exportFormat} onChange={e=>setExportFormat(e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:8,background:'var(--bg2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:'0.74rem',marginBottom:6}}><option value="rtz">RTZ — CIRM Standard (.rtz)</option><option value="gpx">GPX — GPS Exchange (.gpx)</option><option value="csv">CSV — Generic (.csv)</option><option value="nmea">NMEA 0183 WPL (.txt)</option><option value="furuno">Furuno ECDIS (.csv)</option><option value="jrc">JRC ECDIS (.csv)</option><option value="transas">Transas / TECDIS (.xml)</option><option value="kml">Google Earth KML (.kml)</option></select><button className="btn btn-gold" style={{width:'100%',justifyContent:'center'}} disabled={manualWps.length<2} onClick={exportManualRoute}>⬇ Export Route</button></div>
              <div className="p-section"><span className="p-label">📚 Route Library ({savedRoutes.length})</span>{savedRoutes.length===0?<div style={{fontSize:'0.72rem',color:'var(--text2)',textAlign:'center',padding:'1rem 0'}}>No saved routes yet</div>:savedRoutes.map(r=>(<div key={r.id} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',borderRadius:8,background:'var(--bg2)',marginBottom:6,border:'1px solid var(--border)'}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:'0.78rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div><div style={{fontSize:'0.64rem',color:'var(--text2)',marginTop:1}}>{r.waypoints.length} WPs · {(r.totalNM||0).toFixed(1)} NM · {new Date(r.savedAt).toLocaleDateString()}</div></div><button style={{background:'var(--cyan)',color:'#000',border:'none',borderRadius:5,padding:'3px 8px',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}} onClick={()=>{setManualWps(r.waypoints);setManualRouteName(r.name);notify(`Loaded "${r.name}"`,'success');}}>LOAD</button><button style={{background:'rgba(231,76,60,0.8)',color:'#fff',border:'none',borderRadius:5,padding:'3px 8px',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}} onClick={()=>deleteSavedRoute(r.id)}>DEL</button></div>))}</div>
              {renderRegZones()}
            </>)}

            {/* ── LOAD RTZ PANEL ── */}
            {panel==='load'&&(<>
              <div className="p-section"><span className="p-label">📂 Load RTZ File from your ECDIS</span><div style={{border:'2px dashed var(--border2)',borderRadius:10,padding:'1.5rem',textAlign:'center',background:'var(--bg2)',marginBottom:'0.8rem'}}><div style={{fontSize:'2rem',marginBottom:6}}>📂</div><div style={{fontWeight:600,fontSize:'0.84rem',marginBottom:3}}>Select RTZ File</div><div style={{fontSize:'0.72rem',color:'var(--text2)'}}>Accepts .rtz and .rtzp files</div><input type="file" accept=".rtz,.rtzp" onChange={handleRTZLoad} style={{display:'block',marginTop:10,width:'100%',fontSize:'0.75rem'}}/></div>{waypoints.length>0&&<div className="ok-box" style={{textAlign:'center',fontSize:'0.78rem'}}>✅ {waypoints.length} waypoints loaded</div>}</div>
              {renderRegZones()}
            </>)}

            {panel==='eta'&&<ETACalculator totalNM={totalNM}/>}

            {panel==='wpts'&&(<><div style={{marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:'0.75rem',color:'var(--text2)'}}>{waypoints.length} waypoints</span>{waypoints.length>0&&<button className="btn btn-danger" style={{padding:'4px 9px',fontSize:'0.7rem'}} onClick={clearRoute}>Clear All</button>}</div>{waypoints.length===0?<div className="empty"><div className="empty-icon">📋</div><div className="empty-t">No Waypoints</div><div className="empty-d">Generate a route or load an RTZ file</div></div>:<div style={{overflowX:'auto'}}><table className="wp-table"><thead><tr><th>WP</th><th>Lat</th><th>Lon</th><th>Crs°</th><th>NM</th><th>Del</th></tr></thead><tbody>{waypoints.map((wp,i)=>(<tr key={i}><td style={{color:'var(--cyan)',fontFamily:'Orbitron,monospace'}}>WP{String(i+1).padStart(2,'0')}</td><td>{wp.lat.toFixed(4)}</td><td>{wp.lon.toFixed(4)}</td><td>{i>0?(wp.bearing||0).toFixed(0):'—'}</td><td>{i>0?(wp.distance||0).toFixed(1):'0'}</td><td><button onClick={()=>removeWP(i)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'0.9rem'}}>✕</button></td></tr>))}</tbody></table><div style={{marginTop:8,padding:'8px',background:'var(--bg2)',borderRadius:8,textAlign:'center',fontFamily:'Orbitron,monospace',fontSize:'0.76rem',color:'var(--gold)'}}>Total: {totalNM.toFixed(1)} NM</div></div>}</>)}

          </div>
        </div>

        <MapView waypoints={waypoints} setWaypoints={setWaypoints} overlays={overlays} playing={playing} setPlaying={setPlaying} speed={speed} onMapClick={handleMapClick} mapMode={mapMode} checkHighlights={allHL} manualWaypoints={manualWps} setManualWaypoints={setManualWps}/>
      </div>
    </div>
  );
}

export default RoutePlannerPage;
