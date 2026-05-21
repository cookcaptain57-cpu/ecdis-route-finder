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
import { ECA_ZONES, SECA_ZONES, MARPOL_ZONES, PIRACY_ZONES, LAYOVER_ZONES } from "../constants";
import MapView from "../components/MapView";
import ETACalculator from "../components/ETACalculator";

// ── Land detection via CARTO tile pixel sampling ──────────────────────────────
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

// ── Overpass fetch with multi-endpoint failover ───────────────────────────────
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

function RoutePlannerPage({ notify, sheetRoutes=[], portsDb=[] }){
  const portsList=portsDb;
  const hasRestoredRef=useRef(false);

  // ── State ──────────────────────────────────────────────────────────────────
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
  const[overlays,       setOverlays]       =useState({eca:false,seca:false,marpol:false,piracy:false,layover:false,gebco:false,depthClick:false});
  const[mapMode,        setMapMode]        =useState('day');

  // ── ECDIS-first state ──────────────────────────────────────────────────────
  // portF/portT hold the found port objects after search — used by both ECDIS and autoroute
  const[portF,          setPortF]          =useState(null);
  const[portT,          setPortT]          =useState(null);
  const[dbSuggestions,  setDbSuggestions]  =useState([]);
  // MODE: null=not searched, 'choose'=show options, 'generating'=computing, 'done'=route ready
  const[searchMode,     setSearchMode]     =useState(null);

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
  const checkHL   =useMemo(()=>buildHighlights(checkResults, manualWps),[checkResults, manualWps]);
  const checkAutoHL=useMemo(()=>buildHighlights(checkAutoRes, waypoints),[checkAutoRes, waypoints]);
  const allHL      =useMemo(()=>[...checkHL,...checkAutoHL],[checkHL,checkAutoHL]);

  // ── Persistence: restore ──────────────────────────────────────────────────
  useEffect(()=>{
    const load=async()=>{
      try{
        const ls=k=>localStorage.getItem(k);
        if(ls('mnp_mapMode'))  setMapMode(ls('mnp_mapMode'));
        if(ls('mnp_panel'))    setPanel(ls('mnp_panel'));
        if(ls('mnp_overlays'))try{setOverlays(JSON.parse(ls('mnp_overlays')));}catch{}
        if(ls('mnp_fromPort')) setFromPort(ls('mnp_fromPort'));
        if(ls('mnp_toPort'))   setToPort(ls('mnp_toPort'));
        if(ls('mnp_vDraft'))   setVDraft(+ls('mnp_vDraft'));
        if(ls('mnp_vBeam'))    setVBeam(+ls('mnp_vBeam'));
        if(ls('mnp_vLoa'))     setVLoa(+ls('mnp_vLoa'));
        if(ls('mnp_vAirDr'))   setVAirDraft(+ls('mnp_vAirDr'));
        if(ls('mnp_vType'))    setVType(ls('mnp_vType'));
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
  const ls=(k,v)=>localStorage.setItem(k,v);
  useEffect(()=>{ls('mnp_mapMode', mapMode);},[mapMode]);
  useEffect(()=>{ls('mnp_panel',   panel);},[panel]);
  useEffect(()=>{ls('mnp_overlays',JSON.stringify(overlays));},[overlays]);
  useEffect(()=>{ls('mnp_fromPort',fromPort);},[fromPort]);
  useEffect(()=>{ls('mnp_toPort',  toPort);},[toPort]);
  useEffect(()=>{ls('mnp_vDraft',  String(vDraft));},[vDraft]);
  useEffect(()=>{ls('mnp_vBeam',   String(vBeam));},[vBeam]);
  useEffect(()=>{ls('mnp_vLoa',    String(vLoa));},[vLoa]);
  useEffect(()=>{ls('mnp_vAirDr',  String(vAirDraft));},[vAirDraft]);
  useEffect(()=>{ls('mnp_vType',   vType);},[vType]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_waypoints', waypoints).catch(()=>{});},[waypoints]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_routeName', routeName).catch(()=>{});},[routeName]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_manualWps', manualWps).catch(()=>{});},[manualWps]);
  useEffect(()=>{if(!hasRestoredRef.current)return;idbSavePref('mnp_manualRN', manualRouteName).catch(()=>{});},[manualRouteName]);
  useEffect(()=>{setCheckResults([]);},[manualWps.length]);
  useEffect(()=>{setCheckAutoRes([]);},[waypoints.length]);

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
  useEffect(()=>searchPort(toPort,  setToSugg  ),[toPort,  portsList]);

  const searchEcdisRoutes=(dep,arr)=>{
    if(!dep&&!arr)return[];
    const ql=(dep+' '+arr).toLowerCase().trim();
    return sheetRoutes.filter(r=>{
      const hay=[r.fileName,r.portName,r.keywords,r.fileUrl,r['Route Name'],r['Port Name'],r['File Name'],r['Keywords'],Object.values(r).join(' ')].filter(Boolean).join(' ').toLowerCase();
      return(dep.length>1&&hay.includes(dep.toLowerCase().substring(0,4)))||(arr.length>1&&hay.includes(arr.toLowerCase().substring(0,4)))||hay.includes(ql.substring(0,6));
    }).slice(0,6);
  };

  // ── ECDIS-FIRST: step 1 — search, show options before any route is drawn ──
  const handleSearch=()=>{
    const f=portsList.find(p=>p.name?.toLowerCase()===fromPort.toLowerCase()||p.id?.toLowerCase()===fromPort.toLowerCase());
    const t=portsList.find(p=>p.name?.toLowerCase()===toPort.toLowerCase()  ||p.id?.toLowerCase()===toPort.toLowerCase());
    if(!f||!t){notify('Select valid ports from the suggestion list','error');return;}
    setPortF(f); setPortT(t);
    const dbMatches=searchEcdisRoutes(f.name,t.name);
    setDbSuggestions(dbMatches);
    setSearchMode('choose');
    if(dbMatches.length>0){
      notify(`Found ${dbMatches.length} ECDIS database route${dbMatches.length>1?'s':''} — select one or generate auto route`,'success');
    }else{
      notify(`No ECDIS routes found for ${f.name} → ${t.name} — click Generate Auto Route`,'success');
    }
  };

  // ── ECDIS-FIRST: step 2a — user picks a database route ────────────────────
  const useDbRoute=(r)=>{
    setSearchMode('generating');
    const url=r.fileUrl||r['File URL']||r['Download URL']||r['Drive Link']||Object.values(r).find(v=>typeof v==='string'&&v.includes('drive.google'));
    const fallbackToAuto=()=>{
      notify('Could not load ECDIS file — generating auto route instead','error');
      handleGenerateAutoRoute();
    };
    if(url){
      notify('Loading ECDIS route…','success');
      let fetchUrl=url;
      const gd=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if(gd)fetchUrl=`https://drive.google.com/uc?export=download&id=${gd[1]}`;
      fetch(fetchUrl,{mode:'cors'}).then(res=>res.text()).then(text=>{
        const result=parseRTZ(text);
        if(result&&result.waypoints.length>0){
          setWaypoints(result.waypoints);
          const name=r.fileName||r['File Name']||r['Route Name']||'ECDIS Route';
          setRouteName(name); setRouteMeta(null);
          setSearchMode('done');
          notify(`ECDIS route loaded: ${name} — ${result.waypoints.length} WPs`,'success');
        }else fallbackToAuto();
      }).catch(fallbackToAuto);
    }else{
      // No file URL — use route metadata as reference, generate auto route
      notify('No file in this ECDIS record — generating auto route','success');
      handleGenerateAutoRoute();
    }
  };

  // ── ECDIS-FIRST: step 2b — user chooses to generate auto route ────────────
  const handleGenerateAutoRoute=async()=>{
    const f=portF, t=portT;
    if(!f||!t)return;
    setIsGenerating(true); setSearchMode('generating'); setRouteMeta(null);
    const vesselParams={draft:vDraft,beam:vBeam,loa:vLoa,airDraft:vAirDraft,vesselType:vType};
    const result=await buildProRoute(f,t,vesselParams);
    if(result.error||!result.waypoints||result.waypoints.length<2){
      notify(`Cannot route ${f.name} → ${t.name}: ${result.error||'Route not found'}. Try Manual tab.`,'error');
      setIsGenerating(false); setSearchMode('choose'); return;
    }
    setWaypoints(result.waypoints);
    setRouteName(`${f.name} to ${t.name}`);
    setRouteMeta(result); setCheckAutoRes([]);
    setSearchMode('done');
    const blocked=result.canalInfo?.filter(c=>c.status==='BLOCKED');
    if(blocked?.length>0) blocked.forEach(c=>notify(`🚫 ${c.canal}: ${c.reason}. ${c.alternative}`,'error'));
    const src=result.routeSource||'waypoint-graph';
    if(src.includes('api')) notify(`Auto route (${src}): ${result.waypoints.length} WPs — ${result.totalNM.toFixed(0)} NM`,'success');
    else notify(`Auto route: ${result.waypoints.length} WPs — ${result.totalNM.toFixed(0)} NM. ⚠ Waypoint-based — provide Searoutes API key for lane-accurate routing.`,'success');
    setIsGenerating(false);
  };

  const resetSearch=()=>{setSearchMode(null);setPortF(null);setPortT(null);setDbSuggestions([]);};

  const handleRTZLoad=(e)=>{
    const file=e.target.files?.[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const result=parseRTZ(ev.target.result);
      if(!result||result.waypoints.length===0){notify('Could not parse RTZ file','error');return;}
      setWaypoints(result.waypoints); setRouteName(result.name);
      notify(`Loaded: ${result.name} — ${result.waypoints.length} WPs`,'success');
    };
    reader.readAsText(file);
  };

  const handleMapClick=(lat,lon)=>{
    if(panel==='manual'){setManualWps(wps=>recalcWaypoints([...wps,{lat:Math.round(lat*10000)/10000,lon:Math.round(lon*10000)/10000,name:''}]));return;}
    if(!clickAdd)return;
    setWaypoints(wps=>recalcWaypoints([...wps,{lat:Math.round(lat*10000)/10000,lon:Math.round(lon*10000)/10000}]));
  };

  const removeWP     =(i)=>setWaypoints(wps=>recalcWaypoints(wps.filter((_,j)=>j!==i)));
  const clearRoute   =()=>{setWaypoints([]);setPlaying(false);setCheckAutoRes([]);setRouteMeta(null);setSearchMode(null);};
  const toggleOverlay=(k)=>setOverlays(o=>({...o,[k]:!o[k]}));
  const clearManual  =()=>{setManualWps([]);setCheckResults([]);};

  const saveManualRoute=async()=>{
    if(manualWps.length<2){notify('Add at least 2 waypoints first','error');return;}
    const route={id:`route_${Date.now()}`,name:manualRouteName||'Manual Route',waypoints:manualWps,savedAt:new Date().toISOString(),totalNM:totalManualNM};
    try{await idbSaveRoute(route);setSavedRoutes(prev=>[route,...prev.filter(r=>r.id!==route.id)]);notify(`"${route.name}" saved`,'success');}
    catch{notify('Save failed','error');}
  };
  const deleteSavedRoute=async(id)=>{
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

  // ── Route safety check ────────────────────────────────────────────────────
  const runRouteCheck=async(wps,setRes,setChecking)=>{
    if(wps.length<2){notify('Add at least 2 waypoints','error');return;}
    setChecking(true);setRes([]);
    const results=[];
    // Geometry
    for(let i=1;i<wps.length;i++){if((wps[i].distance||0)<0.1)results.push({segIdx:i,type:'duplicate',severity:'error',message:`WP${i} & WP${i+1}: too close (< 0.1 NM)`});}
    for(let i=2;i<wps.length;i++){let diff=Math.abs((wps[i].bearing||0)-(wps[i-1].bearing||0));if(diff>180)diff=360-diff;if(diff>140)results.push({segIdx:i,type:'sharpTurn',severity:'warning',message:`WP${i+1}: ${diff.toFixed(0)}° course change — impractical in heavy weather`});}
    // Zone crossings
    const allZones=[...PIRACY_ZONES.map(z=>({...z,ztype:'piracy',label:'Piracy Risk Area (HRA)',sev:'error'})),...ECA_ZONES.map(z=>({...z,ztype:'eca',label:'ECA Zone',sev:'warning'})),...SECA_ZONES.map(z=>({...z,ztype:'seca',label:'SECA Zone',sev:'warning'})),...MARPOL_ZONES.map(z=>({...z,ztype:'marpol',label:'MARPOL Special Area',sev:'warning'})),...LAYOVER_ZONES.map(z=>({...z,ztype:'layover',label:'Anchorage Zone',sev:'warning'}))];
    wps.forEach((wp,i)=>{const seen=new Set();allZones.forEach(zone=>{if(!zone.coords)return;const coords=zone.coords.map(p=>Array.isArray(p)?p:[p[0],p[1]]);const key=`${zone.ztype}:${zone.name}:${i}`;if(!seen.has(key)&&pointInPolygon(wp.lat,wp.lon,coords)){seen.add(key);results.push({segIdx:i,type:zone.ztype,severity:zone.sev,message:`WP${i+1} inside ${zone.label}: ${zone.name}`});}});});
    // Land detection — CARTO tile pixel sampling
    const midpoints=wps.slice(1).map((wp,idx)=>({lat:(wps[idx].lat+wp.lat)/2,lon:(wps[idx].lon+wp.lon)/2,segIdx:idx+1}));
    let tileWorked=false;
    try{
      const queue=[...midpoints],tileResults=[]; let active=0,done=0;
      await new Promise(resolve=>{
        if(!midpoints.length){resolve();return;}
        const next=()=>{while(active<6&&queue.length>0){active++;const s=queue.shift();checkPointOnLand(s.lat,s.lon).then(onLand=>{if(onLand!==null)tileWorked=true;if(onLand===true)tileResults.push(s);active--;done++;if(done===midpoints.length)resolve();else next();});}};
        next();
      });
      tileResults.forEach(s=>results.push({segIdx:s.segIdx,type:'land',severity:'error',message:`Leg WP${s.segIdx}→WP${s.segIdx+1}: route crosses land — move waypoint offshore`}));
    }catch{}
    if(!tileWorked&&midpoints.length>0){
      const batch=midpoints.slice(0,20),locs=batch.map(p=>`${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|');
      try{const ctl=new AbortController();setTimeout(()=>ctl.abort(),10000);const res=await fetch(`https://api.opentopodata.org/v1/gebco2020?locations=${locs}`,{signal:ctl.signal});if(res.ok){const data=await res.json();(data.results||[]).forEach((r,j)=>{if(r.elevation!==null&&r.elevation>2){const s=batch[j];results.push({segIdx:s.segIdx,type:'land',severity:'error',message:`Leg WP${s.segIdx}→WP${s.segIdx+1}: crosses land (elev. ${r.elevation.toFixed(0)}m)`})}});}}
      catch{results.push({type:'apiError',severity:'warning',message:'Land check unavailable — use Day map to verify route is on water'});}
    }
    // Maritime hazards — Overpass with multi-endpoint fallover
    const lats=wps.map(w=>w.lat),lons=wps.map(w=>w.lon);
    const bbox={s:Math.min(...lats)-0.05,n:Math.max(...lats)+0.05,w:Math.min(...lons)-0.05,e:Math.max(...lons)+0.05};
    if((bbox.n-bbox.s)*(bbox.e-bbox.w)<=25){
      const oq=`[out:json][timeout:20];(node["seamark:type"~"^(rock|wreck|obstruction|rock_awash|fishing_facility)$"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["natural"~"^(reef|rock)$"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["man_made"="lighthouse"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["seamark:type"="light"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});node["seamark:type"~"^(separation_zone|traffic_separation_scheme)$"](${bbox.s},${bbox.w},${bbox.n},${bbox.e});way["man_made"="breakwater"](${bbox.s},${bbox.w},${bbox.n},${bbox.e}););out body;`;
      const data=await fetchOverpass(oq);
      if(data){
        const nodes=data.elements.filter(e=>e.type==='node'&&e.lat!==undefined);
        const ways =data.elements.filter(e=>e.type==='way');
        const rep=new Set();
        wps.forEach((wp,i)=>{
          nodes.forEach(h=>{
            const distM=Math.sqrt((wp.lat-h.lat)**2+(wp.lon-h.lon)**2)*111000;
            const hType=h.tags?.['seamark:type']||h.tags?.natural||h.tags?.man_made||'hazard';
            const hName=h.tags?.name||h.tags?.['seamark:name']||'';
            const isDanger=['rock','wreck','obstruction','reef','rock_awash','fishing_facility'].includes(hType);
            const isTSS=['separation_zone','traffic_separation_scheme'].includes(hType);
            const threshold=isDanger?350:isTSS?200:80;
            if(distM<threshold){const key=`${hType}:${h.id}:${i}`;if(!rep.has(key)){rep.add(key);results.push({segIdx:i,type:'hazard',severity:isDanger?'error':'warning',message:`WP${i+1} within ${Math.round(distM)}m of ${hType.replace(/_/g,' ')}${hName?` "${hName}"`:''} — ${isDanger?'collision hazard':isTSS?'TSS — follow proper lane':'check clearance'}`});}}
          });
          ways.filter(w=>w.tags?.man_made==='breakwater'&&w.bounds).forEach(w=>{const cLat=(w.bounds.minlat+w.bounds.maxlat)/2,cLon=(w.bounds.minlon+w.bounds.maxlon)/2;const distM=Math.sqrt((wp.lat-cLat)**2+(wp.lon-cLon)**2)*111000;if(distM<200){const key=`bw:${w.id}:${i}`;if(!rep.has(key)){rep.add(key);results.push({segIdx:i,type:'hazard',severity:'error',message:`WP${i+1} within ${Math.round(distM)}m of breakwater — grounding risk`});}}});
        });
        if(!results.some(r=>r.type==='hazard'))results.push({type:'hazardInfo',severity:'info',message:'OpenSeaMap: no hazards found near route in this area'});
      }else{results.push({type:'apiError',severity:'warning',message:'Hazard check unavailable — enable SeaMarks overlay for visual reference'});}
    }else{results.push({type:'hazardInfo',severity:'info',message:'Global route — enable SeaMarks overlay to inspect for hazards along route'});}
    if(!results.filter(r=>!['apiError','hazardInfo','ok'].includes(r.type)).length)results.push({type:'ok',severity:'ok',message:'All checks passed — route looks safe!'});
    setRes(results);setChecking(false);
    const errors=results.filter(r=>r.severity==='error').length,warns=results.filter(r=>r.severity==='warning').length;
    if(errors>0)notify(`${errors} critical issue${errors>1?'s':''} found`,'error');
    else if(warns>0)notify(`${warns} warning${warns>1?'s':''}`,'success');
    else notify('Route check passed ✅','success');
  };

  const performRouteCheck    =()=>runRouteCheck(manualWps, setCheckResults, setIsChecking);
  const performAutoRouteCheck=()=>runRouteCheck(waypoints, setCheckAutoRes, setIsCheckingAuto);

  const ovCfg=[{k:'eca',label:'ECA',color:'#FF6B35',desc:'ECA'},{k:'seca',label:'SECA',color:'#FFB347',desc:'SECA'},{k:'marpol',label:'MARPOL',color:'#9B59B6',desc:'MARPOL'},{k:'piracy',label:'Piracy',color:'#E74C3C',desc:'Piracy HRA'},{k:'layover',label:'Anchorage',color:'#3498DB',desc:'Anchorage'},{k:'gebco',label:'GEBCO',color:'#00B4D8',desc:'GEBCO Bathymetry'},{k:'depthClick',label:'Depth Click',color:'#00C896',desc:'Depth on click'}];

  const renderCheckResults=res=>(
    <div>{res.filter(r=>r.type!=='ok').map((r,i)=>(<div key={i} style={{padding:'6px 8px',marginBottom:4,borderRadius:6,fontSize:'0.7rem',lineHeight:1.4,background:r.severity==='error'?'rgba(231,76,60,0.14)':r.severity==='warning'?'rgba(255,179,71,0.13)':'rgba(0,180,216,0.09)',border:`1px solid ${r.severity==='error'?'rgba(231,76,60,0.4)':r.severity==='warning'?'rgba(255,179,71,0.4)':'rgba(0,180,216,0.3)'}`,color:r.severity==='error'?'#ff8080':r.severity==='warning'?'#FFB347':'var(--text2)'}}>
      {r.severity==='error'?'🚫':r.severity==='warning'?'⚠️':'ℹ️'} {r.message}</div>))}
      {res.some(r=>r.type==='ok')&&<div style={{padding:'6px 8px',borderRadius:6,background:'rgba(0,200,150,0.14)',border:'1px solid rgba(0,200,150,0.4)',fontSize:'0.7rem',color:'#00C896'}}>✅ All checks passed — route looks safe!</div>}
    </div>
  );

  const inp={width:'100%',padding:'6px 8px',background:'var(--bg2)',border:'1px solid var(--border)',color:'var(--text)',borderRadius:7,fontSize:'0.78rem'};

  return(
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
      {/* Top bar */}
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
          <div className="p-tabs">
            {[['auto','🗺 Auto'],['manual','✏️ Manual'],['load','📂 Load RTZ'],['eta','⏱ ETA'],['wpts','📋 WPTs']].map(([k,l])=>(<button key={k} className={`p-tab ${panel===k?'active':''}`} onClick={()=>setPanel(k)}>{l}</button>))}
          </div>

          <div className="p-panel" style={{overflowY:'auto'}}>

            {/* ═══ AUTO PANEL ════════════════════════════════════════════════ */}
            {panel==='auto'&&(<>
              {/* Port inputs */}
              <div className="p-section">
                <span className="p-label">🛳 Departure Port</span>
                <div style={{position:'relative'}}>
                  <input className="fi" placeholder="e.g. Mundra, INMUN" value={fromPort} onChange={e=>{setFromPort(e.target.value);setSearchMode(null);}} onFocus={()=>searchPort(fromPort,setFromSugg)}/>
                  {fromSugg.length>0&&(<div className="ac" style={{position:'absolute',zIndex:200}}>{fromSugg.map(p=>(<div key={p.id} className="ac-item" onClick={()=>{setFromPort(p.name);setFromSugg([]);setSearchMode(null);}}><span>📍</span><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{p.name}</div><div style={{fontSize:'0.67rem',color:'var(--text2)'}}>{p.city} · {p.country}</div><div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{p.lat?.toFixed(4)}°N / {p.lon?.toFixed(4)}°E · {p.id}</div></div></div>))}</div>)}
                </div>
              </div>
              <div className="p-section">
                <span className="p-label">🏁 Arrival Port</span>
                <div style={{position:'relative'}}>
                  <input className="fi" placeholder="e.g. Felixstowe, GBFXT" value={toPort} onChange={e=>{setToPort(e.target.value);setSearchMode(null);}} onFocus={()=>searchPort(toPort,setToSugg)}/>
                  {toSugg.length>0&&(<div className="ac" style={{position:'absolute',zIndex:200}}>{toSugg.map(p=>(<div key={p.id} className="ac-item" onClick={()=>{setToPort(p.name);setToSugg([]);setSearchMode(null);}}><span>🏁</span><div><div style={{fontWeight:600,fontSize:'0.82rem'}}>{p.name}</div><div style={{fontSize:'0.67rem',color:'var(--text2)'}}>{p.city} · {p.country}</div><div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{p.lat?.toFixed(4)}°N / {p.lon?.toFixed(4)}°E · {p.id}</div></div></div>))}</div>)}
                </div>
              </div>

              {/* Vessel parameters */}
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

              {/* ── STEP 1: Search button ── */}
              {(!searchMode||searchMode===null)&&(
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'0.6rem'}} onClick={handleSearch}>
                  🔍 Search Routes
                </button>
              )}

              {/* ── STEP 2: Choice panel — ECDIS routes + auto route option ── */}
              {searchMode==='choose'&&(<>
                {dbSuggestions.length>0&&(
                  <div style={{marginBottom:'0.8rem',background:'rgba(0,180,216,0.07)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:10,padding:10}}>
                    <div style={{fontSize:'0.74rem',color:'var(--cyan)',fontWeight:700,marginBottom:6}}>📂 {dbSuggestions.length} ECDIS database route{dbSuggestions.length>1?'s':''} found — select to use:</div>
                    {dbSuggestions.map((r,i)=>{
                      const allVals=Object.entries(r).filter(([k,v])=>v&&typeof v==='string'&&v.trim().length>2);
                      const nameCols=allVals.filter(([k])=>/(name|route|file|rtz|title)/i.test(k));
                      const portCols=allVals.filter(([k])=>/(port|from|to|dep|arr|desc)/i.test(k));
                      const name=r.fileName||r['File Name']||r['Route Name']||nameCols[0]?.[1]||allVals[0]?.[1]||`Route ${i+1}`;
                      const port=r.portName||r['Port Name']||r['From']||portCols[0]?.[1]||'';
                      const hasUrl=!!(r.fileUrl||r['File URL']||r['Drive Link']||Object.values(r).find(v=>typeof v==='string'&&v.includes('drive.google')));
                      return(<div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:8,background:'rgba(0,0,0,0.2)',marginBottom:5,cursor:'pointer',border:'1px solid rgba(255,255,255,0.06)'}} onClick={()=>useDbRoute(r)}>
                        <span style={{fontSize:'1.1rem'}}>{hasUrl?'📥':'📋'}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:'0.8rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
                          {port&&<div style={{fontSize:'0.68rem',color:'var(--cyan)',marginTop:1}}>📍 {port}</div>}
                        </div>
                        <button style={{background:'var(--cyan)',color:'#000',border:'none',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',fontWeight:700,cursor:'pointer'}}>USE</button>
                      </div>);
                    })}
                    <div style={{fontSize:'0.67rem',color:'var(--text2)',marginTop:6,textAlign:'center'}}>— or —</div>
                  </div>
                )}
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:6}} onClick={handleGenerateAutoRoute} disabled={isGenerating}>
                  {isGenerating?'⏳ Computing…':'🗺 Generate Auto Route'}
                </button>
                <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',fontSize:'0.72rem',padding:'6px'}} onClick={resetSearch}>
                  ← Change Ports
                </button>
              </>)}

              {/* ── Generating spinner ── */}
              {searchMode==='generating'&&!routeMeta&&(
                <div style={{textAlign:'center',padding:'1.5rem',color:'var(--text2)',fontSize:'0.8rem'}}>
                  <div className="spin" style={{margin:'0 auto 10px'}}/>
                  Computing maritime route…
                </div>
              )}

              {/* ── Route result card ── */}
              {routeMeta&&searchMode==='done'&&(
                <div style={{marginBottom:'0.8rem',background:'rgba(0,180,216,0.06)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:10,padding:10}}>
                  <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--cyan)',marginBottom:6}}>📊 Route Analysis</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4,marginBottom:8}}>
                    {[['Total',`${routeMeta.totalNM.toFixed(0)} NM`],['ETA @12kn',`${routeMeta.etaAt12kn}h`],['ETA @15kn',`${routeMeta.etaAt15kn}h`],['Data',routeMeta.confidence?.split('(')[0]?.trim()||'MEDIUM']].map(([k,v])=>(<div key={k} style={{background:'var(--bg2)',borderRadius:6,padding:'5px 8px'}}><div style={{fontSize:'0.6rem',color:'var(--text2)'}}>{k}</div><div style={{fontSize:'0.74rem',color:'var(--gold)',fontFamily:'Orbitron,monospace'}}>{v}</div></div>))}
                  </div>
                  {routeMeta.canalInfo?.length>0&&routeMeta.canalInfo.map((c,i)=>(<div key={i} style={{padding:'5px 8px',borderRadius:6,marginBottom:3,fontSize:'0.7rem',background:c.status==='OK'?'rgba(0,200,150,0.12)':'rgba(231,76,60,0.14)',border:`1px solid ${c.status==='OK'?'rgba(0,200,150,0.35)':'rgba(231,76,60,0.4)'}`,color:c.status==='OK'?'#00C896':'#ff8080'}}>{c.status==='OK'?'✅':'🚫'} {c.canal}{c.reason&&<span style={{fontSize:'0.63rem',display:'block',opacity:0.85}}>{c.reason} — {c.alternative}</span>}</div>))}
                  {routeMeta.approachStartIdx<routeMeta.waypoints?.length-1&&(<div style={{padding:'5px 8px',borderRadius:6,background:'rgba(255,179,71,0.13)',border:'1px solid rgba(255,179,71,0.4)',fontSize:'0.68rem',color:'#FFB347',marginBottom:6}}>⚓ Port approach from WP{routeMeta.approachStartIdx+1}: manual planning required</div>)}
                  <div style={{padding:'6px 8px',borderRadius:6,background:'rgba(231,76,60,0.08)',border:'1px solid rgba(231,76,60,0.2)',fontSize:'0.65rem',color:'#ff8080',lineHeight:1.45}}>⚠ NOT certified for navigation. Verify with official ENC and qualified navigator.</div>
                  <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',fontSize:'0.7rem',padding:'5px',marginTop:8}} onClick={()=>setSearchMode('choose')}>↩ Change route selection</button>
                </div>
              )}

              {/* Manual WP add + safety check + overlays — shown after route done */}
              {(searchMode==='done'||waypoints.length>0)&&(<>
                <div className="p-section">
                  <span className="p-label">📍 Manual Waypoints</span>
                  <button className={`btn ${clickAdd?'btn-gold':'btn-secondary'}`} style={{width:'100%',justifyContent:'center'}} onClick={()=>setClickAdd(c=>!c)}>{clickAdd?'✅ Click map to add WP (ON)':'Click map to add WP'}</button>
                </div>
                <div className="p-section">
                  <span className="p-label">🔍 Route Safety Check</span>
                  <div style={{fontSize:'0.68rem',color:'var(--text2)',marginBottom:6}}>Land (map tiles), rocks/wrecks (OpenSeaMap), piracy/ECA/SECA, TSS, turns.</div>
                  <button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:8}} disabled={waypoints.length<2||isCheckingAuto} onClick={performAutoRouteCheck}>{isCheckingAuto?'⏳ Checking…':'🔍 Run Route Check'}</button>
                  {checkAutoRes.length>0&&renderCheckResults(checkAutoRes)}
                </div>
              </>)}

              <div className="p-section">
                <span className="p-label">🗺 Maritime Zone Overlays</span>
                <div className="overlay-grid">{ovCfg.map(ov=>(<button key={ov.k} className={`ov-btn ${overlays[ov.k]?'active':''}`} style={{color:overlays[ov.k]?ov.color:'var(--text2)',borderColor:overlays[ov.k]?ov.color:'var(--border)'}} onClick={()=>toggleOverlay(ov.k)} title={ov.desc}>{overlays[ov.k]?'✓ ':''}{ov.label}</button>))}</div>
              </div>
            </>)}

            {/* ═══ MANUAL PANEL ══════════════════════════════════════════════ */}
            {panel==='manual'&&(<>
              <div className="p-section">
                <span className="p-label">✏️ Manual Route Builder</span>
                <div style={{fontSize:'0.72rem',color:'var(--cyan)',marginBottom:'0.5rem',padding:'6px 8px',background:'rgba(0,180,216,0.08)',borderRadius:6,border:'1px solid rgba(0,180,216,0.2)'}}>👆 Tap the map to place waypoints. Tap a marker to edit name or remove. Drag to reposition.</div>
                <input className="fi" placeholder="Route name…" value={manualRouteName} onChange={e=>setManualRouteName(e.target.value)} style={{marginBottom:6}}/>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="btn btn-danger" style={{flex:1,justifyContent:'center',padding:'6px 8px'}} disabled={manualWps.length===0} onClick={clearManual}>🗑 Clear All</button>
                  {manualWps.length>0&&<div style={{padding:'6px 10px',background:'var(--bg2)',borderRadius:8,fontSize:'0.72rem',fontFamily:'Orbitron,monospace',color:'var(--gold)',whiteSpace:'nowrap'}}>{totalManualNM.toFixed(1)} NM · {manualWps.length} WPs</div>}
                </div>
              </div>
              {manualWps.length===0&&<div className="empty" style={{marginTop:8}}><div className="empty-icon">👆</div><div className="empty-t">Tap the map to start</div><div className="empty-d">Course and distance appear on each leg automatically.</div></div>}
              {manualWps.length>0&&(<div className="p-section"><span className="p-label">📋 Waypoints</span><div style={{overflowX:'auto'}}><table className="wp-table"><thead><tr><th>#</th><th>Name</th><th>Lat</th><th>Lon</th><th>Crs°</th><th>NM</th><th>Del</th></tr></thead><tbody>{manualWps.map((wp,i)=>(<tr key={i}><td style={{color:'var(--cyan)',fontFamily:'Orbitron,monospace',fontSize:'0.7rem'}}>{String(i+1).padStart(2,'0')}</td><td><input style={{background:'transparent',border:'1px solid var(--border)',color:'var(--text)',padding:'2px 4px',fontSize:'0.67rem',width:62,borderRadius:4}} value={wp.name||''} placeholder={`WP${i+1}`} onChange={e=>{const u=[...manualWps];u[i]={...u[i],name:e.target.value};setManualWps(u);}}/></td><td style={{fontSize:'0.67rem'}}>{wp.lat.toFixed(4)}</td><td style={{fontSize:'0.67rem'}}>{wp.lon.toFixed(4)}</td><td style={{fontSize:'0.67rem'}}>{i>0?(wp.bearing||0).toFixed(0):'—'}</td><td style={{fontSize:'0.67rem'}}>{i>0?(wp.distance||0).toFixed(1):'0'}</td><td><button onClick={()=>setManualWps(wps=>recalcWaypoints(wps.filter((_,j)=>j!==i)))} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'0.85rem'}}>✕</button></td></tr>))}</tbody></table><div style={{marginTop:8,padding:'7px',background:'var(--bg2)',borderRadius:8,textAlign:'center',fontFamily:'Orbitron,monospace',fontSize:'0.74rem',color:'var(--gold)'}}>Total: {totalManualNM.toFixed(1)} NM</div></div></div>)}
              <div className="p-section"><span className="p-label">🔍 Route Safety Check</span><div style={{fontSize:'0.68rem',color:'var(--text2)',marginBottom:6}}>Land, rocks/wrecks, piracy/ECA/SECA, TSS, turns.</div><button className="btn btn-secondary" style={{width:'100%',justifyContent:'center',marginBottom:8}} disabled={manualWps.length<2||isChecking} onClick={performRouteCheck}>{isChecking?'⏳ Checking…':'🔍 Run Route Check'}</button>{checkResults.length>0&&renderCheckResults(checkResults)}</div>
              <div className="p-section"><span className="p-label">💾 Save &amp; Export</span><button className="btn btn-green" style={{width:'100%',justifyContent:'center',marginBottom:8}} disabled={manualWps.length<2} onClick={saveManualRoute}>💾 Save to Route Library</button><select value={exportFormat} onChange={e=>setExportFormat(e.target.value)} style={{width:'100%',padding:'7px 10px',borderRadius:8,background:'var(--bg2)',border:'1px solid var(--border)',color:'var(--text)',fontSize:'0.74rem',marginBottom:6}}><option value="rtz">RTZ — CIRM Standard (.rtz)</option><option value="gpx">GPX — GPS Exchange (.gpx)</option><option value="csv">CSV — Generic (.csv)</option><option value="nmea">NMEA 0183 WPL (.txt)</option><option value="furuno">Furuno ECDIS (.csv)</option><option value="jrc">JRC ECDIS (.csv)</option><option value="transas">Transas / TECDIS (.xml)</option><option value="kml">Google Earth KML (.kml)</option></select><button className="btn btn-gold" style={{width:'100%',justifyContent:'center'}} disabled={manualWps.length<2} onClick={exportManualRoute}>⬇ Export Route</button></div>
              <div className="p-section"><span className="p-label">📚 Route Library ({savedRoutes.length})</span>{savedRoutes.length===0?<div style={{fontSize:'0.72rem',color:'var(--text2)',textAlign:'center',padding:'1rem 0'}}>No saved routes yet</div>:savedRoutes.map(r=>(<div key={r.id} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',borderRadius:8,background:'var(--bg2)',marginBottom:6,border:'1px solid var(--border)'}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:'0.78rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div><div style={{fontSize:'0.64rem',color:'var(--text2)',marginTop:1}}>{r.waypoints.length} WPs · {(r.totalNM||0).toFixed(1)} NM · {new Date(r.savedAt).toLocaleDateString()}</div></div><button style={{background:'var(--cyan)',color:'#000',border:'none',borderRadius:5,padding:'3px 8px',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}} onClick={()=>{setManualWps(r.waypoints);setManualRouteName(r.name);notify(`Loaded "${r.name}"`,'success');}}>LOAD</button><button style={{background:'rgba(231,76,60,0.8)',color:'#fff',border:'none',borderRadius:5,padding:'3px 8px',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}} onClick={()=>deleteSavedRoute(r.id)}>DEL</button></div>))}</div>
              <div className="p-section"><span className="p-label">🗺 Zone Overlays</span><div className="overlay-grid">{ovCfg.map(ov=>(<button key={ov.k} className={`ov-btn ${overlays[ov.k]?'active':''}`} style={{color:overlays[ov.k]?ov.color:'var(--text2)',borderColor:overlays[ov.k]?ov.color:'var(--border)'}} onClick={()=>toggleOverlay(ov.k)} title={ov.desc}>{overlays[ov.k]?'✓ ':''}{ov.label}</button>))}</div></div>
            </>)}

            {panel==='load'&&(<><div className="p-section"><span className="p-label">📂 Load RTZ File from your ECDIS</span><div style={{border:'2px dashed var(--border2)',borderRadius:10,padding:'1.5rem',textAlign:'center',background:'var(--bg2)',marginBottom:'0.8rem'}}><div style={{fontSize:'2rem',marginBottom:6}}>📂</div><div style={{fontWeight:600,fontSize:'0.84rem',marginBottom:3}}>Select RTZ File</div><div style={{fontSize:'0.72rem',color:'var(--text2)'}}>Accepts .rtz and .rtzp files</div><input type="file" accept=".rtz,.rtzp" onChange={handleRTZLoad} style={{display:'block',marginTop:10,width:'100%',fontSize:'0.75rem'}}/></div>{waypoints.length>0&&<div className="ok-box" style={{textAlign:'center',fontSize:'0.78rem'}}>✅ {waypoints.length} waypoints loaded</div>}</div><div className="p-section"><span className="p-label">🗺 Zone Overlays</span><div className="overlay-grid">{ovCfg.map(ov=>(<button key={ov.k} className={`ov-btn ${overlays[ov.k]?'active':''}`} style={{color:overlays[ov.k]?ov.color:'var(--text2)',borderColor:overlays[ov.k]?ov.color:'var(--border)'}} onClick={()=>toggleOverlay(ov.k)}>{overlays[ov.k]?'✓ ':''}{ov.label}</button>))}</div></div></>)}
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
