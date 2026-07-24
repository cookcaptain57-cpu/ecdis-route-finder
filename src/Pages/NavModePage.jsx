/* eslint-disable */
import { useState, useEffect, useRef, useCallback } from "react";
import ETACalculator from "../components/ETACalculator";
import aisService from "../services/aisService";
import { idbGet, idbSet } from "../sheets";
import {
  PSSA_ZONES, NOX_ZONES, LOAD_LINE_ZONES,
  MARITIME_RESTRICTIONS, CHINA_MSC_NO_G, EEZ_ZONES,
  ECA_ZONES, SECA_ZONES, MARPOL_ZONES,
  DEPTH_SOURCES, AIS_SOURCES,
} from "../constants";

const VESSEL_API_KEY = '7da0c40c639a5f2a7532e75d9cdad6156b65f61932d778c1ce8580f9786e4506';
const AISSTREAM_KEY  = 'e66d76190c2bf6c206264e3cb894308b853d73df';
const AIS_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbz2hQwDyXbGIfxgiWb5EPlcQhY_g9tzBTnDAkzY4BN-7wlqGT9mqhXGZ5rkAJLZ9NUq/exec';
const DEFAULT_COLORS = { route:'#E74C3C', vector:'#00D4FF', ship:'#00D4FF', track:'#00FF88', xtd:'#FFB300', chart:'#FF2020' };
const INDONESIA_ENC_URL = 'https://raw.githubusercontent.com/cookcaptain57-cpu/ecdis-route-finder/main/public/EA200004_Indonesia_ENC.geojson';
const ZONE_OVERLAY_CFG = [
  { k:'eca',label:'ECA',color:'#FF6B35',desc:'Emission Control Areas (SOx)' },
  { k:'seca',label:'SECA',color:'#FFB347',desc:'Sulphur ECA 0.1%' },
  { k:'marpol',label:'MARPOL',color:'#9B59B6',desc:'MARPOL Special Areas' },
  { k:'pssa',label:'PSSA',color:'#00C896',desc:'Particularly Sensitive Sea Areas' },
  { k:'nox',label:'NOx',color:'#F39C12',desc:'NOx Tier III Areas' },
  { k:'loadline',label:'Load Line',color:'#1ABC9C',desc:'ICLL Load Line Zones' },
  { k:'restrictions',label:'Restrict',color:'#FF2020',desc:'War Risk / Sanctions' },
  { k:'msc_nog',label:'MSC No-G',color:'#FF00FF',desc:'MSC Prohibited Areas' },
  { k:'eez',label:'EEZ',color:'#5DADE2',desc:'Exclusive Economic Zones' },
  { k:'piracy',label:'Piracy HRA',color:'#E74C3C',desc:'Piracy High Risk Areas' },
];

const toDMS=(d,isLat)=>{const a=Math.abs(d),deg=Math.floor(a),mf=(a-deg)*60,min=Math.floor(mf);const sec=((mf-min)*60).toFixed(1),dir=isLat?(d>=0?'N':'S'):(d>=0?'E':'W');return `${deg}°${String(min).padStart(2,'0')}'${String(sec).padStart(4,'0')}"${dir}`;};
const normalizeRoute=wps=>{if(!wps?.length)return wps;const out=[{...wps[0]}];for(let i=1;i<wps.length;i++){let lon=wps[i].lon;const p=out[i-1].lon;while(lon-p>180)lon-=360;while(lon-p<-180)lon+=360;out.push({...wps[i],lon});}return out;};
// ── AIS ship type & nav status decoders (ITU-R M.1371 standard codes) ──
const shipTypeLabel=(code)=>{
  if(code===''||code==null)return '—';
  const c=Number(code);
  if(isNaN(c))return '—';
  if(c===0)return 'Not available';
  if(c>=20&&c<=29)return 'Wing in Ground';
  if(c===30)return 'Fishing';
  if(c===31||c===32)return 'Towing';
  if(c===33)return 'Dredging/Underwater Ops';
  if(c===34)return 'Diving Ops';
  if(c===35)return 'Military Ops';
  if(c===36)return 'Sailing';
  if(c===37)return 'Pleasure Craft';
  if(c>=40&&c<=49)return 'High Speed Craft';
  if(c===50)return 'Pilot Vessel';
  if(c===51)return 'Search and Rescue';
  if(c===52)return 'Tug';
  if(c===53)return 'Port Tender';
  if(c===54)return 'Anti-Pollution';
  if(c===55)return 'Law Enforcement';
  if(c===58)return 'Medical Transport';
  if(c===59)return 'Noncombatant Ship';
  if(c>=60&&c<=69)return 'Passenger';
  if(c>=70&&c<=79)return 'Cargo';
  if(c>=80&&c<=89)return 'Tanker';
  if(c>=90&&c<=99)return 'Other';
  return `Type ${code}`;
};
const navStatusLabel=(code)=>{
  if(code===''||code==null)return '—';
  const c=Number(code);
  if(isNaN(c))return '—';
  const M=['Under way using engine','At anchor','Not under command','Restricted manoeuvrability',
    'Constrained by draught','Moored','Aground','Engaged in fishing','Under way sailing',
    'Reserved','Reserved','Reserved','Reserved','Reserved',
    'AIS-SART/MOB/EPIRB active','Undefined'];
  return M[c]!==undefined?M[c]:`Status ${code}`;
};
// ── Correct vector CPA/TCPA — pure math, works 100% offline ──
const computeCPA=(own,tgt)=>{
  if(!own||!tgt)return{cpa:9999,tcpa:0};
  const R2D=Math.PI/180;
  const dLat=(tgt.lat-own.lat)*60;
  const dLon=(tgt.lon-own.lon)*60*Math.cos(own.lat*R2D);
  const vOwnX=(own.sog||0)*Math.sin((own.cog||0)*R2D);
  const vOwnY=(own.sog||0)*Math.cos((own.cog||0)*R2D);
  const vTgtX=(tgt.sog||0)*Math.sin((tgt.cog||0)*R2D);
  const vTgtY=(tgt.sog||0)*Math.cos((tgt.cog||0)*R2D);
  const vRelX=vTgtX-vOwnX,vRelY=vTgtY-vOwnY;
  const vRel2=vRelX*vRelX+vRelY*vRelY;
  let tcpa=vRel2<1e-8?0:-(dLon*vRelX+dLat*vRelY)/vRel2;
  if(tcpa<0)tcpa=0;
  const cLon=dLon+vRelX*tcpa,cLat=dLat+vRelY*tcpa;
  return{cpa:Math.sqrt(cLon*cLon+cLat*cLat),tcpa};
};

// ── ROT Gauge — canvas component, reads from ref at interval, no React re-renders ──
const RotGauge=({rotRef,size=60})=>{
  const cRef=useRef(null);
  useEffect(()=>{
    const canvas=cRef.current;if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const draw=()=>{
      const rot=Math.max(-30,Math.min(30,rotRef.current||0));
      const W=canvas.width,H=canvas.height;
      ctx.clearRect(0,0,W,H);
      const cx=W/2,cy=H-1,r=H-3;
      ctx.beginPath();ctx.arc(cx,cy,r,Math.PI,0);ctx.strokeStyle='rgba(255,32,32,0.3)';ctx.lineWidth=5;ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI);ctx.strokeStyle='rgba(0,255,136,0.3)';ctx.lineWidth=5;ctx.stroke();
      ctx.fillStyle='rgba(255,32,32,0.7)';ctx.font='bold 7px monospace';ctx.textAlign='left';ctx.fillText('P',3,H-2);
      ctx.fillStyle='rgba(0,255,136,0.7)';ctx.textAlign='right';ctx.fillText('S',W-3,H-2);
      const ang=(rot/30)*Math.PI*0.9-Math.PI/2;
      const nx=cx+(r-2)*Math.cos(ang),ny=cy+(r-2)*Math.sin(ang);
      const col=rot<-2?'#FF2020':rot>2?'#00FF88':'#FFD700';
      ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(nx,ny);ctx.strokeStyle=col;ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();
      ctx.beginPath();ctx.arc(cx,cy,3,0,2*Math.PI);ctx.fillStyle='#00D4FF';ctx.fill();
      ctx.fillStyle=col;ctx.font='bold 7px monospace';ctx.textAlign='center';
      ctx.fillText((rot>0.5?'⇒':rot<-0.5?'⇐':'·')+' '+Math.abs(rot).toFixed(1)+'°/m',cx,H-12);
    };
    draw();
    const timer=setInterval(draw,500);
    return()=>clearInterval(timer);
  },[]);
  return <canvas ref={cRef} width={size} height={Math.round(size*0.55)} style={{display:'block',margin:'0 auto'}}/>;
};

// ── Compass Rose — canvas-based, drawn imperatively to avoid React re-renders ──
const drawCompassRose=(canvas,cog)=>{
  if(!canvas)return;
  const size=canvas.width,ctx=canvas.getContext('2d');
  const r=size/2-2,cx=size/2,cy=size/2;
  ctx.clearRect(0,0,size,size);
  ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);
  ctx.fillStyle='rgba(2,8,20,0.55)';ctx.fill();
  ctx.strokeStyle='rgba(0,212,255,0.35)';ctx.lineWidth=1;ctx.stroke();
  for(let deg=0;deg<360;deg+=10){
    const rad=(deg-cog-90)*Math.PI/180;
    const isMaj=deg%90===0,isMed=deg%45===0;
    const r0=isMaj?r-10:isMed?r-7:r-5;
    ctx.beginPath();
    ctx.moveTo(cx+r0*Math.cos(rad),cy+r0*Math.sin(rad));
    ctx.lineTo(cx+r*Math.cos(rad),cy+r*Math.sin(rad));
    ctx.strokeStyle=isMaj?'#00D4FF':isMed?'rgba(0,212,255,0.55)':'rgba(0,212,255,0.25)';
    ctx.lineWidth=isMaj?1.5:0.8;ctx.stroke();
  }
  const cards=[['N',0,'#FF4757'],['E',90,'#00D4FF'],['S',180,'#00D4FF'],['W',270,'#00D4FF']];
  ctx.textAlign='center';ctx.textBaseline='middle';
  cards.forEach(([lbl,deg,col])=>{
    const rad=(deg-cog-90)*Math.PI/180,rr=r-13;
    ctx.fillStyle=col;ctx.font='bold 8px monospace';
    ctx.fillText(lbl,cx+rr*Math.cos(rad),cy+rr*Math.sin(rad));
  });
  const rad=(-cog-90)*Math.PI/180,rr=r-4;
  ctx.beginPath();
  ctx.moveTo(cx+rr*Math.cos(rad),cy+rr*Math.sin(rad));
  ctx.lineTo(cx+5*Math.cos(rad+Math.PI*0.6),cy+5*Math.sin(rad+Math.PI*0.6));
  ctx.lineTo(cx+5*Math.cos(rad-Math.PI*0.6),cy+5*Math.sin(rad-Math.PI*0.6));
  ctx.closePath();ctx.fillStyle='#FF4757';ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,3,0,2*Math.PI);ctx.fillStyle='#00D4FF';ctx.fill();
};
const CompassRose=({cogRef,size=70})=>{
  const canvasRef=useRef(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    let last=-1;
    const timer=setInterval(()=>{
      const cog=cogRef.current?.cog||0;
      if(Math.abs(cog-last)>0.3){drawCompassRose(canvas,cog);last=cog;}
    },500);
    return()=>clearInterval(timer);
  },[]);
  return <canvas ref={canvasRef} width={size} height={size} style={{display:'block'}}/>;
};

export default function NavModePage({notify,sheetRoutes=[],portsDb=[],setTab}){
  const mapRef=useRef(null),leafRef=useRef(null);
  const baseTileRef=useRef(null),seamarkRef=useRef(null);
  const gebcoRefTile=useRef(null),emodnetTileRef=useRef(null);
  const encTileRef=useRef(null),esriBaseRef=useRef(null),gebcoWmsRef=useRef(null);
  const layersRef=useRef({route:null,vessel:null,vector:null,ais:{},routeMarkers:[],rbLine:null,rbMarker:null,xtdPort:null,xtdStbd:null,xtdFill:null,pastTrack:null,guardZone:null,anchorCircle:null});
  const chartLayersRef=useRef([]),aisWsRef=useRef(null),aisIntervalRef=useRef(null);
  const invalidateTimers=useRef([]),pastTrackRef=useRef([]);
  const rbModeRef=useRef(false),livePosRef=useRef(null),vectorMinsRef=useRef(6);
  const colorsRef=useRef(DEFAULT_COLORS),rbTargetRef=useRef(null),trackHoursRef=useRef(0);
  const autoCenterRef=useRef(true),hudDragRef=useRef(null),mapBearingRef=useRef(0);
  const depthCheckOnRef=useRef(false),contoursRef=useRef({shallow:10,safety:20,deep:200,draft:6});
  const aisRangeRef=useRef(0),aisSourceRef=useRef('internet');
  const prevRouteNameRef=useRef(null),indonesiaEncLayerRef=useRef(null);
  const scsEncLayerRef=useRef(null);
  const prevHdgRef=useRef(null),prevHdgTimeRef=useRef(null);
  const spPrevHdgRef=useRef(null),spPrevHdgTimeRef=useRef(null);
  const alarmCooldownRef=useRef({}),anchorAlarmCooldownRef=useRef(0),wpAlarmCooldownRef=useRef(0);
  const guardZoneAlarmCooldown=useRef({});
  const ownMmsiRef=useRef(null);
  const aisPopupDragRef=useRef(null);
  const gpsThrottleRef=useRef(null);
  const rotValueRef=useRef(0);
  const rotCanvasRef=useRef(null);
  const cogCanvasRef=useRef(null);
  const aisPopupMmsiRef=useRef(null);
  const aisPopupDataRef=useRef(null);
  const collectedMmsiRef=useRef(new Set());
  const ls=k=>localStorage.getItem(k);
  const [mapReady,setMapReady]=useState(false);
  const [gpsOn,setGpsOn]=useState(()=>ls('nav_gpsOn')==='true');
  const [aisTargets,setAisTargets]=useState({});
  const [autoCenter,setAutoCenterRaw]=useState(()=>ls('nav_autoCenter')!=='false');
  const [mapMode,setMapMode]=useState(()=>ls('nav_mapMode')||'night');
  const [displayMode,setDisplayMode]=useState(()=>ls('nav_displayMode')||'north');
  const [depthSources,setDepthSources]=useState(()=>{try{const a=JSON.parse(ls('nav_depthSources')||'[]');return new Set(Array.isArray(a)?a:[]);}catch{return new Set();}});
  const [activeRoute,setActiveRoute]=useState(()=>{try{return JSON.parse(ls('nav_activeRoute')||'null');}catch{return null;}});
  const [livePos,setLivePos]=useState(null);
  const [selectedWpIdx,setSelectedWpIdx]=useState(()=>Number(ls('nav_selectedWpIdx')||0));
  const [rbMode,setRbMode]=useState(false),[rbResult,setRbResult]=useState(null);
  const [etaResult,setEtaResult]=useState(null),[activePanel,setActivePanel]=useState('route');
  const [vectorMins,setVectorMins]=useState(()=>Number(ls('nav_vectorMins')||6));
  const [colors,setColors]=useState(()=>{try{return JSON.parse(ls('nav_colors')||'null')||DEFAULT_COLORS;}catch{return DEFAULT_COLORS;}});
  const [hudCollapsed,setHudCollapsed]=useState(()=>ls('nav_hudCollapsed')==='true');
  const [togCollapsed,setTogCollapsed]=useState(()=>ls('nav_togCollapsed')==='true');
  const [panelCollapsed,setPanelCollapsed]=useState(false);
  const [hudPos,setHudPos]=useState(()=>{try{return JSON.parse(ls('nav_hudPos')||'{"x":8,"y":54}');}catch{return{x:8,y:54};}});
  const [trackHours,setTrackHours]=useState(()=>Number(ls('nav_trackHours')||0));
  const [savedRoutes,setSavedRoutes]=useState(()=>{try{return JSON.parse(ls('nav_savedRoutes')||'[]');}catch{return[];}});
  const [savedCharts,setSavedCharts]=useState(()=>{try{return JSON.parse(ls('nav_savedCharts')||'[]');}catch{return[];}});
  const [chartSearch,setChartSearch]=useState('');
  const [savedSearch,setSavedSearch]=useState(''),[dbSearch,setDbSearch]=useState('');
  const [dbRouteSearch,setDbRouteSearch]=useState(''),[dbChartSearch,setDbChartSearch]=useState('');
  const [chartOverlays,setChartOverlays]=useState(()=>{try{return JSON.parse(ls('nav_chartOverlays')||'[]');}catch{return[];}});
  const [showMenu,setShowMenu]=useState(false),[menuCat,setMenuCat]=useState('colors');
  const [aisRange,setAisRange]=useState(()=>Number(ls('nav_aisRange')||0));
  const [shallowDepth,setShallowDepth]=useState(()=>Number(ls('nav_shallowDepth')||10));
  const [safetyDepth,setSafetyDepth]=useState(()=>Number(ls('nav_safetyDepth')||20));
  const [deepDepth,setDeepDepth]=useState(()=>Number(ls('nav_deepDepth')||200));
  const [shipDraft,setShipDraft]=useState(()=>Number(ls('nav_draft')||6));
  const [depthCheckOn,setDepthCheckOn]=useState(false);
  const [xtdNM,setXtdNM]=useState(()=>Number(ls('nav_xtdNM')||1.0));
  const [aisSource,setAisSource]=useState(()=>ls('nav_aisSource')||'internet');
  const [shipProfile,setShipProfile]=useState(()=>{try{return JSON.parse(ls('nav_shipProfile')||'{}');}catch{return{};}});
  const [aisStatus,setAisStatus]=useState('off');
  const [rotValue,setRotValue]=useState(0);
  const [offTrackAlarm,setOffTrackAlarm]=useState(false);
  const [fullScreen,setFullScreen]=useState(false);
  const [mapZoom,setMapZoom]=useState(4);
  const [routeLabelZoomBand,setRouteLabelZoomBand]=useState(()=>mapZoom>=8?'in':'out');
  const [cogPanelPos,setCogPanelPos]=useState(()=>{try{return JSON.parse(localStorage.getItem('nav_cogPanelPos')||'null')||{x:null,y:8};}catch{return{x:null,y:8};}});
  const [cogPanelVisible,setCogPanelVisible]=useState(()=>localStorage.getItem('nav_cogPanel')!=='false');
  const cogDragRef=useRef(null);
  const [localAisStatus,setLocalAisStatus]=useState('off');
  const [localAisCount,setLocalAisCount]=useState(0);
  const [localAisHost,setLocalAisHost]=useState(()=>ls('nav_localAisHost')||'ws://192.168.1.100:4002');
  const [localAisAlert,setLocalAisAlert]=useState(null);
  const [zoneOverlays,setZoneOverlays]=useState(()=>{try{return JSON.parse(localStorage.getItem('nav_zoneOverlays')||'{}');}catch{return{};}});
  const [anchorWatchOn,setAnchorWatchOn]=useState(false);
  const [anchorPos,setAnchorPos]=useState(null);
  const [anchorRadius,setAnchorRadius]=useState(0.3);
  const [anchorAlarm,setAnchorAlarm]=useState(false);
  const [speedAlarmKn,setSpeedAlarmKn]=useState(()=>Number(ls('nav_speedAlarm')||0));
  const [speedAlarmTriggered,setSpeedAlarmTriggered]=useState(false);
  const [alarmsMuted,setAlarmsMuted]=useState(()=>ls('nav_alarmsMuted')==='true');
  const [alarmToggles,setAlarmToggles]=useState(()=>{try{return JSON.parse(ls('nav_alarmToggles')||'null')||{offtrack:true,speed:true,guard:true,anchor:true,wp:true,collision:true};}catch{return{offtrack:true,speed:true,guard:true,anchor:true,wp:true,collision:true};}});
  const [wpArrivalNM,setWpArrivalNM]=useState(0.3);
  const [weatherData,setWeatherData]=useState(null);
  const [weatherLoading,setWeatherLoading]=useState(false);
  const [showWeather,setShowWeather]=useState(false);
  const [nightVision,setNightVision]=useState(false);
  const [showPortSearch,setShowPortSearch]=useState(false);
  const [portSearch,setPortSearch]=useState('');
  const [portSearchResults,setPortSearchResults]=useState([]);
  const [editingWpNote,setEditingWpNote]=useState(0);
  const [wpNotes,setWpNotes]=useState({});
  // offTrackNM removed — off track alarm now uses xtdNM as the single threshold
  const [guardZoneOn,setGuardZoneOn]=useState(false);
  const [guardZoneRadiusNM,setGuardZoneRadiusNM]=useState(()=>Number(ls('nav_guardZoneNM')||2));
  const [guardZoneAlarm,setGuardZoneAlarm]=useState(false);
  const [guardZoneTargets,setGuardZoneTargets]=useState([]);
  const [anchorShipLengthM,setAnchorShipLengthM]=useState(()=>Number(ls('nav_anchorLOA')||100));
  const [anchorShackles,setAnchorShackles]=useState(()=>Number(ls('nav_anchorShackles')||3));
  const [showAllAisVectors,setShowAllAisVectors]=useState(()=>localStorage.getItem('nav_aisVectors')==='true');
  const [selectedAisMmsi,setSelectedAisMmsi]=useState(null);
  const [aisPopup,setAisPopup]=useState(null);

  const safeInvalidate=useCallback(()=>{invalidateTimers.current.forEach(clearTimeout);invalidateTimers.current=[];const f=()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}};f();invalidateTimers.current=[100,300,600,1000,1800].map(t=>setTimeout(f,t));},[]);

  const distNM=(lat1,lon1,lat2,lon2)=>{const R=3440.065,r=Math.PI/180;const a=Math.sin(((lat2-lat1)*r)/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(((lon2-lon1)*r)/2)**2;return 2*R*Math.asin(Math.sqrt(Math.min(1,a)));};
  const routeTotalNM=wps=>{if(!wps||wps.length<2)return 0;let d=0;for(let i=0;i<wps.length-1;i++)d+=distNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);return d;};
  const brg=(lat1,lon1,lat2,lon2)=>{const r=Math.PI/180,dl=(lon2-lon1)*r,y=Math.sin(dl)*Math.cos(lat2*r),x=Math.cos(lat1*r)*Math.sin(lat2*r)-Math.sin(lat1*r)*Math.cos(lat2*r)*Math.cos(dl);return((Math.atan2(y,x)/r)+360)%360;};
  const colreg=(o,t)=>{const b=(Math.atan2(t.lon-o.lon,t.lat-o.lat)*180/Math.PI+360)%360,rel=(b-o.cog+360)%360;if(rel>345||rel<15)return"HEAD-ON";if(rel>112.5&&rel<247.5)return"OVERTAKING";if(rel>15&&rel<112.5)return"CROSSING-STBD";return"CROSSING-PORT";};
  const offsetPt=(lat,lon,bd,dn)=>{const R=3440.065,d=dn/R,b=bd*Math.PI/180,p1=lat*Math.PI/180,l1=lon*Math.PI/180,p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(b)),l2=l1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));return[p2*180/Math.PI,l2*180/Math.PI];};

  const calcROTWith=(newCog,nowMs,hRef,tRef)=>{
    let rot=0;
    if(hRef.current!==null&&tRef.current!==null){
      const dtMin=(nowMs-tRef.current)/60000;
      if(dtMin>0.003&&dtMin<5){
        const delta=(newCog-hRef.current+540)%360-180;
        rot=Math.max(-720,Math.min(720,parseFloat((delta/dtMin).toFixed(1))));
      }
    }
    hRef.current=newCog; tRef.current=nowMs;
    return rot;
  };
  const calcROT=(newCog,nowMs)=>calcROTWith(newCog,nowMs,prevHdgRef,prevHdgTimeRef);
  const calcROTSafePilot=(newCog,nowMs)=>calcROTWith(newCog,nowMs,spPrevHdgRef,spPrevHdgTimeRef);

  const renderShip=fix=>{
    if(!leafRef.current||!window.L)return;
    const L=window.L,c=colorsRef.current,rot=(fix.cog-mapBearingRef.current+360)%360;
    const icon=L.divIcon({html:`<div style="transform:rotate(${rot}deg);transform-origin:center;width:20px;height:28px;"><svg width="20" height="28" viewBox="0 0 20 28" fill="none"><polygon points="10,1 19,27 10,21 1,27" fill="${c.ship}" stroke="#fff" stroke-width="1.5"/></svg></div>`,className:'',iconSize:[20,28],iconAnchor:[10,14]});
    if(!layersRef.current.vessel)layersRef.current.vessel=L.marker([fix.lat,fix.lon],{icon,zIndexOffset:9999}).addTo(leafRef.current);
    else{layersRef.current.vessel.setLatLng([fix.lat,fix.lon]);layersRef.current.vessel.setIcon(icon);}
    const r2=Math.PI/180,nm=Math.max(fix.sog,0.3)*(vectorMinsRef.current/60);
    const vl=fix.lat+(nm/60)*Math.cos(fix.cog*r2),vn=fix.lon+(nm/60)*Math.sin(fix.cog*r2)/Math.cos(fix.lat*r2);
    if(layersRef.current.vector){layersRef.current.vector.setLatLngs([[fix.lat,fix.lon],[vl,vn]]);layersRef.current.vector.setStyle({color:c.vector});}
    else layersRef.current.vector=L.polyline([[fix.lat,fix.lon],[vl,vn]],{color:c.vector,weight:2,opacity:0.85,dashArray:'5 3'}).addTo(leafRef.current);
    if(autoCenterRef.current){try{const m=leafRef.current,s=m.getSize(),p=m.project([fix.lat,fix.lon],m.getZoom());m.panTo(m.unproject(p.subtract([0,s.y*0.2]),m.getZoom()),{animate:true,duration:0.3});}catch{leafRef.current.panTo([fix.lat,fix.lon]);}}
  };

  const tryXml=(t,f)=>{try{const d=new DOMParser().parseFromString(t,'application/xml');if(d.querySelector('parsererror'))return null;const w=[];d.querySelectorAll('waypoint,Waypoint').forEach(e=>{const p=e.querySelector('position,Position');if(!p)return;const la=parseFloat(p.getAttribute('lat')||p.getAttribute('Lat')),lo=parseFloat(p.getAttribute('lon')||p.getAttribute('Lon'));if(!isNaN(la)&&!isNaN(lo))w.push({lat:la,lon:lo,name:e.getAttribute('name')||e.getAttribute('Name')||''});});if(!w.length)d.querySelectorAll('rtept,wpt,trkpt').forEach(e=>{const la=parseFloat(e.getAttribute('lat')),lo=parseFloat(e.getAttribute('lon'));if(!isNaN(la)&&!isNaN(lo))w.push({lat:la,lon:lo,name:e.querySelector('name')?.textContent?.trim()||''});});if(!w.length)return null;const n=d.querySelector('route,Route')?.getAttribute('name')||d.querySelector('gpx>metadata>name,rte>name')?.textContent?.trim()||f;return{name:n,waypoints:w};}catch{return null;}};
  const tryJson=(t,f)=>{try{const p=JSON.parse(t);if(Array.isArray(p)){const w=p.filter(x=>x.lat!=null&&x.lon!=null);if(w.length)return{name:f,waypoints:w};}const w=p.waypoints||p.Waypoints;if(w?.length)return{name:p.name||f,waypoints:w};return null;}catch{return null;}};
  const tryDelim=(t,f)=>{try{const w=[];for(const l of t.split('\n').map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'))){if(/^(lat|lon|name|wp)/i.test(l))continue;const p=l.split(/[,\t;|]+/).map(x=>x.replace(/["']/g,'').trim());if(p.length<2)continue;const la=parseFloat(p[0]),lo=parseFloat(p[1]);if(!isNaN(la)&&!isNaN(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180)w.push({lat:la,lon:lo,name:p[2]||''});}return w.length?{name:f,waypoints:w}:null;}catch{return null;}};
  const parseRoute=(t,f)=>{const e=f.toLowerCase().split('.').pop();if(e==='rtzp')throw new Error('RTZP: unzip and load .rtz inside');if(t.trim().startsWith('<')||'rtz gpx rte rt3 rt4 rtx xml wpt'.includes(e)){const r=tryXml(t,f);if(r)return r;}const r2=tryJson(t,f);if(r2)return r2;const r3=tryXml(t,f);if(r3)return r3;const r4=tryDelim(t,f);if(r4)return r4;throw new Error('No waypoints found');};
  const loadRoute=e=>{const fi=e.target.files?.[0];if(!fi)return;const r=new FileReader();r.onload=ev=>{try{const rt=parseRoute(ev.target.result,fi.name);if(!rt?.waypoints?.length)throw new Error('No waypoints');setActiveRoute(rt);setSelectedWpIdx(rt.waypoints.length-1);notify(`✓ ${rt.name} (${rt.waypoints.length} WPs)`,'error');}catch(er){notify(`Load failed: ${er.message}`,'error');}};r.readAsText(fi);e.target.value='';};
  const saveRoute=()=>{if(!activeRoute)return;setSavedRoutes(prev=>{const i=prev.findIndex(r=>r.name===activeRoute.name);const u=i>=0?prev.map((r,j)=>j===i?activeRoute:r):[activeRoute,...prev].slice(0,100);localStorage.setItem('nav_savedRoutes',JSON.stringify(u));return u;});notify(`✓ Saved: ${activeRoute.name}`,'error');};
  const delRoute=n=>{setSavedRoutes(prev=>{const u=prev.filter(r=>r.name!==n);localStorage.setItem('nav_savedRoutes',JSON.stringify(u));return u;});};
  const AIS_PENDING_KEY='ais_pending_sync_v1';

  const queueAisForSync=async(record)=>{
    try{
      const pending=(await idbGet(AIS_PENDING_KEY))||[];
      if(pending.some(p=>String(p.mmsi)===String(record.mmsi)))return;
      pending.push(record);
      await idbSet(AIS_PENDING_KEY,pending);
    }catch(e){console.warn('[AIS queue]',e);}
  };

  const syncPendingAisToSheet=async()=>{
    try{
      const pending=(await idbGet(AIS_PENDING_KEY))||[];
      if(!pending.length)return;
      const stillPending=[];
      for(const record of pending){
        try{
          const res=await fetch(AIS_SHEET_WEBHOOK_URL,{method:'POST',body:JSON.stringify(record)});
          if(!res.ok)throw new Error(`HTTP ${res.status}`);
        }catch{
          stillPending.push(record);
        }
      }
      await idbSet(AIS_PENDING_KEY,stillPending);
      if(stillPending.length<pending.length){
        notify(`✓ Synced ${pending.length-stillPending.length} ship(s) to AIS sheet`,'error');
      }
    }catch(e){console.warn('[AIS sync]',e);}
  };
  // ── CHANGE 1: S-52 sounding color helper — reads mariner's contour settings from ref ──
  const getSoundingColor=useCallback((depth)=>{
    const {shallow,safety,deep}=contoursRef.current;
    if(depth<=shallow) return '#FF2020'; // DEPVS — very shallow, danger red
    if(depth<=safety)  return '#FF9500'; // DEPMS — inside safety contour, orange
    if(depth<=deep)    return '#FFD700'; // DEPMD — moderate depth, yellow
    return '#00D4FF';                    // DEPDW — deep water, safe cyan
  },[]);

  const loadIndonesiaEnc=useCallback(async()=>{if(!leafRef.current||!window.L||indonesiaEncLayerRef.current)return;notify('⏳ Loading Indonesia ENC…','error');try{const res=await fetch(INDONESIA_ENC_URL);if(!res.ok)throw new Error(`HTTP ${res.status}`);const geojson=await res.json();const L=window.L,m=leafRef.current;if(!m.getPane('indonesiaPane')){const cp=m.createPane('indonesiaPane');cp.style.zIndex='445';cp.style.pointerEvents='none';}const depthOnly={...geojson,features:(geojson.features||[]).filter(f=>['depth_area','depth_contour','sounding'].includes(f.properties?.type||f.properties?.featureType||''))};const layer=L.geoJSON(depthOnly,{pane:'indonesiaPane',style:ft=>{const t=ft.properties?.type||ft.properties?.featureType||'';if(t==='depth_area')return{color:'#0050AA',weight:0,fillColor:'#AADDFF',fillOpacity:0.18};if(t==='depth_contour')return{color:'#0050AA',weight:0.8,opacity:0.6,dashArray:'3 3'};return{opacity:0,weight:0,color:'transparent',fillOpacity:0};},pointToLayer:(ft,ll)=>{const p=ft.properties;if(p.type==='sounding'||p.featureType==='sounding')return L.marker(ll,{icon:L.divIcon({html:`<div style="color:#00D4FF;font-size:9px;font-weight:700;font-family:monospace;white-space:nowrap;text-shadow:1px 1px 2px #000;pointer-events:none;">${p.depth!=null?p.depth:''}</div>`,className:'',iconSize:[0,0],iconAnchor:[8,6]}),interactive:false});return L.circleMarker(ll,{radius:3,color:'#00BFFF',fillOpacity:0.6,weight:1});}}).addTo(m);indonesiaEncLayerRef.current=layer;notify(`✓ Indonesia ENC (${geojson.features?.length||0} features)`,'error');}catch(e){notify(`Indonesia ENC: ${e.message}`,'error');}},[]);
  const removeIndonesiaEnc=useCallback(()=>{if(indonesiaEncLayerRef.current&&leafRef.current){try{leafRef.current.removeLayer(indonesiaEncLayerRef.current);}catch{}indonesiaEncLayerRef.current=null;}},[]);
  const removeSCSEnc=useCallback(()=>{if(scsEncLayerRef.current&&leafRef.current){try{leafRef.current.removeLayer(scsEncLayerRef.current);}catch{}scsEncLayerRef.current=null;}},[]);

  const loadSCSEnc=useCallback(async()=>{
    if(!leafRef.current||!window.L||scsEncLayerRef.current)return;
    notify('⏳ Loading Indonesia Karimata ENC…','error');
    try{
      const res=await fetch('https://raw.githubusercontent.com/cookcaptain57-cpu/ecdis-route-finder/main/public/EA200004_Indonesia_Karimata.geojson');
      if(!res.ok)throw new Error(`HTTP ${res.status}`);
      const geojson=await res.json();
      const L=window.L,m=leafRef.current;
      if(!m.getPane('karimataPane')){const cp=m.createPane('karimataPane');cp.style.zIndex='444';cp.style.pointerEvents='none';}
      const layer=L.geoJSON(geojson,{
        pane:'karimataPane',
        style:ft=>{
          const t=ft.properties?.type||'';
          if(t==='depth_area'||t==='Depth area (meta)')return{color:'#0066CC',weight:0,fillColor:'#99CCFF',fillOpacity:0.15};
          if(t==='depth_contour')return{color:'#0055AA',weight:1,opacity:0.6,dashArray:'4 3',fill:false};
          if(t==='land'||t==='land_elevation'||t==='land_region'||t==='Magnetic variation')return{color:'#556B2F',weight:0.5,fillColor:'#8FBC8F',fillOpacity:0.3};
          if(t.includes('tss')||t.includes('TSS')||t==='Traffic separation line'||t==='Traffic separation zone')return{color:'#FF6600',weight:1.5,opacity:0.8,dashArray:'6 3',fill:false};
          if(t==='fairway'||t==='Fairway'||t==='recommended_track'||t==='two_way_route')return{color:'#9966FF',weight:1.5,opacity:0.7,dashArray:'8 4',fill:false};
          if(t==='ferry_route'||t==='Ferry route')return{color:'#00AAFF',weight:1,opacity:0.5,dashArray:'4 4',fill:false};
          if(t==='anchorage')return{color:'#FFD700',weight:1,fillColor:'#FFD700',fillOpacity:0.1};
          if(t==='precautionary'||t==='caution')return{color:'#FF9500',weight:1.5,fillColor:'#FF9500',fillOpacity:0.08};
          if(t==='obstruction'||t==='rock'||t==='wreck')return{color:'#FF2020',weight:1,fillColor:'#FF2020',fillOpacity:0.2};
          if(t==='coverage')return{color:'rgba(0,212,255,0.4)',weight:1,dashArray:'4 4',fill:false};
          return{color:'#00D4FF',weight:0.8,opacity:0.5,fill:false};
        },
        pointToLayer:(ft,ll)=>{
          const p=ft.properties;const t=p.type||'';
          if(t==='sounding'){
            const d=p.depth;
            // CHANGE 2: Use getSoundingColor instead of hardcoded thresholds
            const col=getSoundingColor(d!=null?d:9999);
            return L.marker(ll,{icon:L.divIcon({html:`<div style="color:${col};font-size:9px;font-weight:700;font-family:monospace;white-space:nowrap;text-shadow:1px 1px 2px #000;pointer-events:none;">${d!=null?d:''}</div>`,className:'',iconSize:[0,0],iconAnchor:[8,6]}),interactive:false});
          }
          if(t==='light'||t==='landmark')return L.circleMarker(ll,{radius:4,color:'#FFD700',fillOpacity:0.9,weight:1}).bindPopup(`<b>${p.name||t}</b>`);
          if(t==='buoy_cardinal'||t==='buoy_lateral'||t.includes('buoy'))return L.circleMarker(ll,{radius:3,color:'#FF6B35',fillOpacity:0.85,weight:1}).bindPopup(`<b>${p.name||t}</b>`);
          return L.circleMarker(ll,{radius:3,color:'#00D4FF',fillOpacity:0.7,weight:1}).bindPopup(`<b>${p.name||t}</b>`);
        },
        onEachFeature:(ft,l)=>{
          const p=ft.properties;
          if(p.name&&p.type!=='sounding'){
            const info=`<b>${p.name}</b><br/><small>${p.type}</small>${p.drval1?`<br/>Depth: ${p.drval1}–${p.drval2||'?'}m`:''}`;
            l.bindPopup(info);
          }
        }
      }).addTo(m);
      scsEncLayerRef.current=layer;
      const count=geojson.features?.length||0;
      notify(`✓ Indonesia Karimata ENC (${count} features — depth contours, soundings, TSS)`,'error');
    }catch(e){notify(`Karimata ENC: ${e.message}`,'error');}
  },[getSoundingColor]);

  const loadChartLayer=(ov)=>{if(!ov||!leafRef.current||!window.L)return;const L=window.L,m=leafRef.current;if(!m.getPane('chartPane')){const cp=m.createPane('chartPane');cp.style.zIndex='450';cp.style.pointerEvents='none';}const cc=colorsRef.current.chart||'#FF2020';const layer=L.geoJSON(ov.data,{pane:'chartPane',style:ft=>{const p=ft.properties,dg=p.checkDanger,da=p.lineType===2?'8 5':p.lineType===3?'3 5':null;return{color:dg?'#FF2020':cc,weight:3,opacity:1,dashArray:da,fillColor:dg?'#FF2020':cc,fillOpacity:0.12};},pointToLayer:(ft,ll)=>{const p=ft.properties;if(p.featureType==='label')return L.marker(ll,{icon:L.divIcon({html:`<div style="background:rgba(0,0,20,0.8);color:${cc};font-size:11px;font-weight:700;white-space:nowrap;font-family:monospace;padding:1px 4px;border-radius:3px;pointer-events:none;">${p.labelText||''}</div>`,className:'',iconAnchor:[0,8]}),interactive:false,zIndexOffset:300});return L.circleMarker(ll,{radius:6,color:cc,fillOpacity:0.85,weight:2}).bindPopup(`<b>${p.name||''}</b>`);},onEachFeature:(ft,l)=>{if(ft.properties.name&&ft.properties.featureType!=='label')l.bindPopup(`<b>${ft.properties.name}</b>`);}}).addTo(m);layer.bringToFront();chartLayersRef.current.push({id:ov.name,layer});try{const b=layer.getBounds();if(b.isValid())m.fitBounds(b,{padding:[40,40]});}catch{}};

  const tryUserChart=(t,f)=>{try{const d=new DOMParser().parseFromString(t,'application/xml');if(d.querySelector('parsererror')||!d.querySelector('userchart'))return null;const name=d.querySelector('userchart').getAttribute('name')||f,ft=[];d.querySelectorAll('lines > line').forEach(el=>{const a=el.querySelector('attribute'),tp=el.querySelector('type'),lt=parseInt(a?.getAttribute('lineType')||'1'),cd=tp?.getAttribute('checkDanger')==='1',co=[];el.querySelectorAll('vertex').forEach(v=>{const la=parseFloat(v.getAttribute('latitude')),lo=parseFloat(v.getAttribute('longitude'));if(!isNaN(la)&&!isNaN(lo))co.push([lo,la]);});if(co.length>=2)ft.push({type:'Feature',properties:{featureType:'line',name:el.getAttribute('name')||'',lineType:lt,checkDanger:cd},geometry:{type:'LineString',coordinates:co}});});d.querySelectorAll('labels > label').forEach(el=>{const a=el.querySelector('attribute'),lt=a?.getAttribute('labelText')||'',cd=el.querySelector('type')?.getAttribute('checkDanger')==='1',v=el.querySelector('vertex');if(!v)return;const la=parseFloat(v.getAttribute('latitude')),lo=parseFloat(v.getAttribute('longitude'));if(!isNaN(la)&&!isNaN(lo))ft.push({type:'Feature',properties:{featureType:'label',labelText:lt,checkDanger:cd},geometry:{type:'Point',coordinates:[lo,la]}});});d.querySelectorAll('polygons > polygon, areas > area').forEach(el=>{const cd=el.querySelector('type')?.getAttribute('checkDanger')==='1',co=[];el.querySelectorAll('vertex').forEach(v=>{const la=parseFloat(v.getAttribute('latitude')),lo=parseFloat(v.getAttribute('longitude'));if(!isNaN(la)&&!isNaN(lo))co.push([lo,la]);});if(co.length>=3){if(co[0][0]!==co[co.length-1][0])co.push(co[0]);ft.push({type:'Feature',properties:{featureType:'polygon',name:el.getAttribute('name')||'',checkDanger:cd},geometry:{type:'Polygon',coordinates:[co]}});}});if(!ft.length)return null;const lines=ft.filter(x=>x.properties.featureType==='line').length,labels=ft.filter(x=>x.properties.featureType==='label').length;return{name,summary:`${lines} lines · ${labels} labels`,data:{type:'FeatureCollection',features:ft}};}catch{return null;}};
  const tryGeoJSON=(t,f)=>{try{const d=JSON.parse(t);if(['FeatureCollection','Feature','Point','LineString','Polygon'].includes(d.type))return{name:f,data:d};return null;}catch{return null;}};
  const tryKML=(t,f)=>{try{const d=new DOMParser().parseFromString(t,'application/xml');if(d.querySelector('parsererror'))return null;const ft=[],pc=s=>s.trim().split(/\s+/).map(p=>{const[lo,la]=p.split(',').map(Number);return(!isNaN(la)&&!isNaN(lo))?[lo,la]:null;}).filter(Boolean);d.querySelectorAll('Placemark').forEach(pm=>{const n=pm.querySelector('name')?.textContent?.trim()||'';const pt=pm.querySelector('Point coordinates');if(pt)pc(pt.textContent).forEach(([lo,la])=>ft.push({type:'Feature',properties:{name:n,featureType:'point'},geometry:{type:'Point',coordinates:[lo,la]}}));const ls=pm.querySelector('LineString coordinates');if(ls){const c=pc(ls.textContent);if(c.length)ft.push({type:'Feature',properties:{name:n,featureType:'line'},geometry:{type:'LineString',coordinates:c}});}});if(!ft.length)return null;return{name:f,data:{type:'FeatureCollection',features:ft}};}catch{return null;}};
  const loadChart=e=>{const fi=e.target.files?.[0];if(!fi)return;const r=new FileReader();r.onload=ev=>{try{const t=ev.target.result;const ov=tryUserChart(t,fi.name)||tryGeoJSON(t,fi.name)||tryKML(t,fi.name);if(!ov)throw new Error('Unsupported format');loadChartLayer(ov);setChartOverlays(prev=>[...prev,{name:ov.name,summary:ov.summary||''}]);notify(`✓ ${ov.name}`,'error');}catch(er){notify(`Chart failed: ${er.message}`,'error');}};r.readAsText(fi);e.target.value='';};
  const removeChart=n=>{const i=chartLayersRef.current.findIndex(c=>c.id===n);if(i>=0){try{leafRef.current?.removeLayer(chartLayersRef.current[i].layer);}catch{}chartLayersRef.current.splice(i,1);}setChartOverlays(prev=>prev.filter(c=>c.name!==n));};
  const saveChart=ov=>{if(!ov)return;setSavedCharts(prev=>{const i=prev.findIndex(c=>c.name===ov.name);const u=i>=0?prev.map((c,j)=>j===i?ov:c):[ov,...prev].slice(0,50);localStorage.setItem('nav_savedCharts',JSON.stringify(u));return u;});notify(`✓ Chart saved: ${ov.name}`,'error');};
  const delSavedChart=n=>{setSavedCharts(prev=>{const u=prev.filter(c=>c.name!==n);localStorage.setItem('nav_savedCharts',JSON.stringify(u));return u;});};
  const loadSavedChart=saved=>{if(!saved?.data)return;loadChartLayer(saved);setChartOverlays(prev=>{if(prev.find(c=>c.name===saved.name))return prev;return[...prev,{name:saved.name,summary:saved.summary||''}];});notify(`✓ ${saved.name}`,'error');};

  // ── AIS source ──
  useEffect(()=>{
    aisSourceRef.current=aisSource;
    aisService.stop();aisWsRef.current?.close();aisWsRef.current=null;
    clearInterval(aisIntervalRef.current);aisIntervalRef.current=null;
    setAisStatus('off');setLocalAisStatus('off');setLocalAisCount(0);
    if(aisSource==='off'){setAisTargets({});return;}
    if(aisSource==='safepilot'||aisSource==='bridge'){
      const hosts=aisSource==='bridge'?[localAisHost,...(AIS_SOURCES.bridge?.hosts||[])]:AIS_SOURCES.safepilot.hosts;
      aisService.start(hosts);
      if(livePosRef.current)aisService.setOwnShip(livePosRef.current);
      const off1=aisService.on('status',({status,targets})=>{setLocalAisStatus(status||'connected');setLocalAisCount(typeof targets==='number'?targets:(targets?.size||0));});
      const off2=aisService.on('alert',al=>{setLocalAisAlert(al);notify(`⚠ COLLISION: ${al?.name||al?.mmsi} CPA ${al?.cpa}NM`,'error');setTimeout(()=>setLocalAisAlert(null),30000);});
      const off3=aisService.on('update',({target,targets})=>{
        if(!target?.lat||!target?.lon)return;
        const ownM=shipProfile?.mmsi?String(shipProfile.mmsi):null;
        ownMmsiRef.current=ownM;
        if(ownM&&String(target.mmsi)===ownM)return;
        setAisTargets(prev=>({...prev,[target.mmsi]:{
          mmsi:target.mmsi,lat:target.lat,lon:target.lon,
          cog:target.cog||0,sog:target.sog||0,hdg:target.hdg||target.cog||0,
          name:target.name||'',callsign:target.callSign||'',
          shipType:target.shipType??target.type??'',imo:target.imo||'',
          length:(target.dimA||target.dimB)?(target.dimA||0)+(target.dimB||0):(target.length||0),
          beam:(target.dimC||target.dimD)?(target.dimC||0)+(target.dimD||0):(target.beam||0),
          draught:target.draught||0,destination:target.dest||target.destination||'',
          navStatus:target.navStatus??target.status??'',rot:target.rot||0,
          ts:Date.now()
        }}));
        if(target.msgType===5&&target.mmsi&&!collectedMmsiRef.current.has(String(target.mmsi))){
          collectedMmsiRef.current.add(String(target.mmsi));
          queueAisForSync({
            mmsi:target.mmsi, imo:target.imo||'', name:target.name||'',
            callsign:target.callSign||'', vesselType:target.shipType||'',
            length:(target.dimA||target.dimB)?(target.dimA||0)+(target.dimB||0):'',
            beam:(target.dimC||target.dimD)?(target.dimC||0)+(target.dimD||0):'',
          });
        }
        setLocalAisCount(targets?.size||0);
      });
      return()=>{try{off1();off2();off3();}catch{}aisService.stop();};
    }
    if(aisSource==='internet'){
      let retry=null;
      const fetchAPI=async()=>{
        const pos=livePosRef.current,range=aisRangeRef.current||50,la=pos?.lat||0,ln=pos?.lon||0;
        for(const url of[`https://api.vesselapi.com/v1/vessel/list?lat=${la}&lng=${ln}&radius=${range}`,`https://api.vesselapi.com/v1/vessels?lat=${la}&lng=${ln}&radius=${range}`]){
          try{const r=await fetch(url,{headers:{'Authorization':VESSEL_API_KEY,'x-api-key':VESSEL_API_KEY}});if(!r.ok)continue;const data=await r.json();const v=data?.vessels||data?.data||data?.results||(Array.isArray(data)?data:[]);if(Array.isArray(v)&&v.length>0){setAisStatus('connected');const t={};v.forEach(x=>{const m2=x.mmsi||x.MMSI;const la2=parseFloat(x.lat||x.latitude||0),ln2=parseFloat(x.lon||x.lng||x.longitude||0);if(m2&&la2&&ln2)t[m2]={mmsi:m2,lat:la2,lon:ln2,cog:parseFloat(x.cog||0),sog:parseFloat(x.sog||x.speed||0),name:(x.name||x.shipName||'').trim(),shipType:x.shipType||'',length:x.length||0,beam:x.beam||0,ts:Date.now()};});setAisTargets(t);return;}}catch{}}
        setAisStatus('connecting');
        if(aisWsRef.current?.readyState===WebSocket.OPEN)return;
        const ws=new WebSocket("wss://stream.aisstream.io/v0/stream");aisWsRef.current=ws;
        ws.onopen=()=>{setAisStatus('connected');ws.send(JSON.stringify({APIKey:AISSTREAM_KEY,BoundingBoxes:[[[-90,-180],[90,180]]],FilterMessageTypes:["PositionReport"]}));};
        ws.onmessage=msg=>{try{const d=JSON.parse(msg.data);const p=d?.Message?.PositionReport,m2=d?.MetaData;if(!p||!m2||p.Latitude===0)return;setAisTargets(prev=>({...prev,[m2.MMSI]:{mmsi:m2.MMSI,name:(m2.ShipName||'').trim(),lat:p.Latitude,lon:p.Longitude,cog:p.CourseOverGround||0,sog:p.SpeedOverGround||0,rot:p.RateOfTurn||0,ts:Date.now()}}));}catch{}};
        ws.onerror=()=>setAisStatus('error');
        ws.onclose=ev=>{if(ev.code!==1000){setAisStatus('connecting');retry=setTimeout(()=>{if(aisSourceRef.current==='internet')fetchAPI();},5000);}};
      };
      setAisStatus('connecting');fetchAPI();
      aisIntervalRef.current=setInterval(fetchAPI,30000);
      return()=>{clearTimeout(retry);clearInterval(aisIntervalRef.current);aisWsRef.current?.close();};
    }
  },[aisSource,localAisHost]);

  useEffect(()=>{
    if(aisSource!=='safepilot'&&aisSource!=='bridge')return;
    const off=aisService.on('ownPos',pos=>{
      if(!pos?.lat||!pos?.lon)return;
      try{
        const now=Date.now();
        const cogVal=typeof pos.cog==='number'?pos.cog:(pos.hdg||0);
        const rot=calcROTSafePilot(cogVal,now);
        rotValueRef.current=rot;
        const fix={lat:pos.lat,lon:pos.lon,sog:pos.sog||0,cog:cogVal,heading:pos.hdg||cogVal,acc:5,rot,fromSafePilot:true};
        livePosRef.current=fix;
        const nowThrottle=Date.now();
        if(!gpsThrottleRef.current||nowThrottle-gpsThrottleRef.current>1000){
          gpsThrottleRef.current=nowThrottle;
          setRotValue(rot);
          setLivePos({...fix});
        }
        try{aisService.setOwnShip(fix);}catch{}
        try{renderShip(fix);}catch(e){console.warn('[renderShip SP]',e);}
        pastTrackRef.current.push({lat:fix.lat,lon:fix.lon,t:now});
        pastTrackRef.current=pastTrackRef.current.filter(p=>p.t>now-86400000);
      }catch(e){console.warn('[ownPos handler]',e);}
    });
    return()=>{try{off();}catch{}};
  },[aisSource]);

  useEffect(()=>{if(livePos&&(aisSource==='safepilot'||aisSource==='bridge'))aisService.setOwnShip(livePos);},[livePos,aisSource]);

  useEffect(()=>{
    if(!gpsOn)return;
    if(!navigator.geolocation){notify("GPS not supported","error");return;}
    const id=navigator.geolocation.watchPosition(pos=>{
      try{
        if((aisSourceRef.current==='safepilot'||aisSourceRef.current==='bridge')&&livePosRef.current?.fromSafePilot)return;
        const la=pos.coords.latitude,ln=pos.coords.longitude;
        const sog=(pos.coords.speed||0)*1.94384,cog=pos.coords.heading||0,acc=pos.coords.accuracy||0;
        const now=Date.now();
        const rot=calcROT(cog,now);
        rotValueRef.current=rot;
        const fix={lat:la,lon:ln,sog,cog,heading:cog,acc,rot};
        livePosRef.current=fix;
        const nowThrottle=Date.now();
        if(!gpsThrottleRef.current||nowThrottle-gpsThrottleRef.current>1000){
          gpsThrottleRef.current=nowThrottle;
          setRotValue(rot);
          setLivePos({...fix});
        }
        pastTrackRef.current.push({lat:la,lon:ln,t:now});
        pastTrackRef.current=pastTrackRef.current.filter(p=>p.t>now-86400000);
        renderShip(fix);
        if(trackHoursRef.current>0&&window.L){const cut=now-trackHoursRef.current*3600000,pts=pastTrackRef.current.filter(p=>p.t>cut).map(p=>[p.lat,p.lon]);if(pts.length>1){const L=window.L,c=colorsRef.current;if(layersRef.current.pastTrack){layersRef.current.pastTrack.setLatLngs(pts);layersRef.current.pastTrack.setStyle({color:c.track});}else layersRef.current.pastTrack=L.polyline(pts,{color:c.track,weight:2,opacity:0.7}).addTo(leafRef.current);}}
        else if(layersRef.current.pastTrack){leafRef.current?.removeLayer(layersRef.current.pastTrack);layersRef.current.pastTrack=null;}
        if(rbModeRef.current&&rbTargetRef.current){const t=rbTargetRef.current;setRbResult({rangeNM:distNM(la,ln,t.lat,t.lon).toFixed(2),bearing:brg(la,ln,t.lat,t.lon).toFixed(1),lat:t.lat.toFixed(5),lon:t.lon.toFixed(5)});if(layersRef.current.rbLine)layersRef.current.rbLine.setLatLngs([[la,ln],[t.lat,t.lon]]);}
      }catch(e){console.warn('[GPS]',e);}
    },()=>notify("GPS error","error"),{enableHighAccuracy:true,maximumAge:0,timeout:30000});
    return()=>navigator.geolocation.clearWatch(id);
  },[gpsOn]);

  useEffect(()=>{localStorage.setItem('nav_aisVectors',showAllAisVectors);},[showAllAisVectors]);
  useEffect(()=>{
    syncPendingAisToSheet();
    const timer=setInterval(syncPendingAisToSheet,180000);
    return()=>clearInterval(timer);
  },[]);
  useEffect(()=>{
    if(!leafRef.current||!window.L)return;
    const L=window.L,m=leafRef.current;
    const ownPos=livePosRef.current;
    const rng=aisRangeRef.current;
    const ownMmsi=ownMmsiRef.current;
    const seen=new Set();
    const guardBreachers=[];

    Object.values(aisTargets).forEach(v=>{
      if(!v.lat||!v.lon)return;
      if(ownMmsi&&String(v.mmsi)===ownMmsi)return;
      // Stronger own-ship proximity filter for SafePilot (no MMSI match needed)
      if(ownPos&&distNM(ownPos.lat,ownPos.lon,v.lat,v.lon)<0.05)return;
      if(rng>0&&ownPos&&distNM(ownPos.lat,ownPos.lon,v.lat,v.lon)>rng)return;

      const rangNM=ownPos?distNM(ownPos.lat,ownPos.lon,v.lat,v.lon):null;
      const brgDeg=ownPos?brg(ownPos.lat,ownPos.lon,v.lat,v.lon):null;
      const cpaTcpa=ownPos?computeCPA(
        {lat:ownPos.lat,lon:ownPos.lon,sog:ownPos.sog||0,cog:ownPos.cog||0},
        {lat:v.lat,lon:v.lon,sog:v.sog||0,cog:v.cog||0}
      ):{cpa:9999,tcpa:0};
      const col=cpaTcpa.cpa<1?'#FF3030':cpaTcpa.cpa<3?'#FF9500':'#00D4FF';
      const cl=ownPos?colreg({lat:ownPos.lat,lon:ownPos.lon,cog:ownPos.cog},v):'N/A';
      const liveData={...v,rangNM,brgDeg,cpaTcpa,cl};
      seen.add(String(v.mmsi));

      // Counter-rotate AIS icons by map bearing so they always point true direction in Course-Up/Head-Up
      const aisRot=((v.cog||0)-mapBearingRef.current+360)%360;
      const aisIcon=L.divIcon({html:`<div style="transform:rotate(${aisRot}deg);transform-origin:center;width:16px;height:22px;"><svg width="16" height="22" viewBox="0 0 16 22" fill="none"><polygon points="8,1 15,21 8,16 1,21" fill="${col}" stroke="#fff" stroke-width="1.2"/></svg></div>`,className:'',iconSize:[16,22],iconAnchor:[8,11]});

      if(layersRef.current.ais[v.mmsi]?.mk){
        layersRef.current.ais[v.mmsi].mk.setLatLng([v.lat,v.lon]);
        layersRef.current.ais[v.mmsi].mk.setIcon(aisIcon);
        layersRef.current.ais[v.mmsi].data=liveData;
        if(aisPopupMmsiRef.current===String(v.mmsi)) aisPopupDataRef.current=liveData;
      } else {
        const mk=L.marker([v.lat,v.lon],{icon:aisIcon,zIndexOffset:500}).addTo(m);
        mk.on('click',()=>{
          try{
            const pt=m.latLngToContainerPoint([v.lat,v.lon]);
            const snap=layersRef.current.ais[String(v.mmsi)]?.data||liveData;
            aisPopupMmsiRef.current=String(v.mmsi);
            aisPopupDataRef.current=snap;
            setAisPopup({mmsi:String(v.mmsi),x:Math.min(pt.x+12,window.innerWidth-225),y:Math.min(pt.y,window.innerHeight-320),expanded:false});
            setSelectedAisMmsi(String(v.mmsi));
          }catch(e){console.warn('[AIS click]',e);}
        });
        if(!layersRef.current.ais[v.mmsi])layersRef.current.ais[v.mmsi]={};
        layersRef.current.ais[v.mmsi].mk=mk;
        layersRef.current.ais[v.mmsi].data=liveData;
        if(cpaTcpa.cpa<1.5&&cpaTcpa.tcpa>0&&cpaTcpa.tcpa<3){playAlarm('collision');notify(`⚠ CPA: ${v.name||v.mmsi} ${cpaTcpa.cpa.toFixed(2)}NM T+${cpaTcpa.tcpa.toFixed(1)}h`,'error');}
      }

      const showVec=showAllAisVectors||(selectedAisMmsi===String(v.mmsi));
      if(showVec&&(v.sog||0)>0.1){
        const r2=Math.PI/180,nm2=(v.sog||0)*(vectorMinsRef.current/60);
        const vl=v.lat+(nm2/60)*Math.cos((v.cog||0)*r2),vn=v.lon+(nm2/60)*Math.sin((v.cog||0)*r2)/Math.cos(v.lat*r2);
        if(layersRef.current.ais[v.mmsi]?.vec){layersRef.current.ais[v.mmsi].vec.setLatLngs([[v.lat,v.lon],[vl,vn]]);layersRef.current.ais[v.mmsi].vec.setStyle({color:col});}
        else layersRef.current.ais[v.mmsi].vec=L.polyline([[v.lat,v.lon],[vl,vn]],{color:col,weight:1.5,opacity:0.7,dashArray:'4 3'}).addTo(m);
      } else if(layersRef.current.ais[v.mmsi]?.vec){try{m.removeLayer(layersRef.current.ais[v.mmsi].vec);}catch{}layersRef.current.ais[v.mmsi].vec=null;}

      if(guardZoneOn&&ownPos&&rangNM!=null&&rangNM<=guardZoneRadiusNM){
        guardBreachers.push(v.name||`MMSI ${v.mmsi}`);
        const key=String(v.mmsi),now2=Date.now();
        if(!guardZoneAlarmCooldown.current[key]||now2-guardZoneAlarmCooldown.current[key]>30000){guardZoneAlarmCooldown.current[key]=now2;playAlarm('guard');notify(`🔴 GUARD ZONE: ${v.name||v.mmsi} — ${rangNM.toFixed(1)}NM / ${brgDeg?.toFixed(0)}°T`,'error');}
      }
    });

    setGuardZoneTargets(prev=>{const same=prev.length===guardBreachers.length&&prev.every((x,i)=>x===guardBreachers[i]);return same?prev:guardBreachers;});
    setGuardZoneAlarm(guardBreachers.length>0);

    Object.keys(layersRef.current.ais).forEach(mmsi=>{
      if(!seen.has(mmsi)){
        try{m.removeLayer(layersRef.current.ais[mmsi].mk);}catch{}
        try{if(layersRef.current.ais[mmsi].vec)m.removeLayer(layersRef.current.ais[mmsi].vec);}catch{}
        delete layersRef.current.ais[mmsi];
        if(aisPopupMmsiRef.current===mmsi){aisPopupMmsiRef.current=null;aisPopupDataRef.current=null;setAisPopup(null);}
      }
    });
  },[aisTargets,showAllAisVectors,selectedAisMmsi,guardZoneOn,guardZoneRadiusNM]);

  useEffect(()=>{
    if(!aisPopup||!livePosRef.current||!aisPopupMmsiRef.current)return;
    const stored=layersRef.current.ais[aisPopupMmsiRef.current]?.data;
    if(stored)aisPopupDataRef.current=stored;
  },[livePos,aisPopup]);

  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L)return;
    const L=window.L,m=leafRef.current;
    if(baseTileRef.current){try{m.removeLayer(baseTileRef.current);}catch{}baseTileRef.current=null;}
    const TILES={night:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',day:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',dusk:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'};
    baseTileRef.current=L.tileLayer(TILES[mapMode]||TILES.night,{subdomains:'abcd',maxZoom:20,zIndex:1,attribution:'© CARTO'}).addTo(m);
  },[mapMode,mapReady]);

  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L)return;
    const L=window.L,m=leafRef.current;
    [esriBaseRef,emodnetTileRef,gebcoWmsRef,gebcoRefTile,encTileRef].forEach(r=>{if(r.current){try{m.removeLayer(r.current);}catch{}r.current=null;}});
    const ds=depthSources,hasAny=ds.size>0;
    if(seamarkRef.current)try{seamarkRef.current.setOpacity(hasAny?0.9:0.55);}catch{}
    if(ds.has('usa')){esriBaseRef.current=L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:13,opacity:0.55,zIndex:2,attribution:'© Esri'}).addTo(m);try{encTileRef.current=L.tileLayer.wms('https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/ENCOnline/MapServer/exts/MaritimeChartService/WMSServer',{layers:'0,1,2,3,4,5,6,7',format:'image/png',transparent:true,version:'1.3.0',opacity:0.9,zIndex:6,attribution:'© NOAA'}).addTo(m);}catch(e){console.warn('[NOAA ENC]',e);}}
    if(ds.has('europe')){try{emodnetTileRef.current=L.tileLayer.wms('https://ows.emodnet-bathymetry.eu/wms',{layers:'mean_atlas_land,mean_rainbowcolour',format:'image/png',transparent:true,version:'1.3.0',opacity:0.65,zIndex:3,attribution:'© EMODnet'}).addTo(m);}catch{try{emodnetTileRef.current=L.tileLayer.wms('https://ows.emodnet-bathymetry.eu/wms',{layers:'emodnet:mean_depth_corrected',format:'image/png',transparent:true,version:'1.1.1',opacity:0.6,zIndex:3,attribution:'© EMODnet'}).addTo(m);}catch(e){console.warn('[EMODnet]',e);}}}
    if(ds.has('global')){try{gebcoWmsRef.current=L.tileLayer.wms('https://wms.gebco.net/mapserv',{layers:'GEBCO_LATEST_2',format:'image/png',transparent:false,version:'1.3.0',opacity:0.5,zIndex:4,attribution:'© GEBCO 2024'}).addTo(m);}catch(e){console.warn('[GEBCO]',e);}}
    if(ds.has('soundings')){gebcoRefTile.current=L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:18,opacity:1.0,zIndex:5,attribution:'© Esri'}).addTo(m);}
    if(ds.has('norway')){try{L.tileLayer.wms('https://wms.geonorge.no/skwms1/wms.dybdedata2',{layers:'dybdedata2,dybdedata2_25m',format:'image/png',transparent:true,version:'1.3.0',opacity:0.65,zIndex:7,attribution:'© Kartverket'}).addTo(m);}catch{}}
    if(ds.has('australia')){try{L.tileLayer.wms('https://www.ga.gov.au/geoserver/marine/wms',{layers:'marine:bathymetry',format:'image/png',transparent:true,version:'1.3.0',opacity:0.6,zIndex:7,attribution:'© Geoscience Australia'}).addTo(m);}catch{}}
    if(ds.has('canada')){try{L.tileLayer.wms('https://nonna-geoserver.data.chs-shc.ca/geoserver/wms',{layers:'nonna:NONNA_100',format:'image/png',transparent:true,version:'1.3.0',opacity:0.65,zIndex:7,attribution:'© CHS/NRCan'}).addTo(m);}catch{}}
    if(ds.has('finland')){try{L.tileLayer.wms('https://julkinen.traficom.fi/inspirepalvelu/avoin/wms',{layers:'syvyyskayra',format:'image/png',transparent:true,version:'1.3.0',opacity:0.7,zIndex:7,attribution:'© Traficom'}).addTo(m);}catch{}}
    if(ds.has('germany')){try{L.tileLayer.wms('https://gdi.bsh.de/mapservice_gs/NAUTHIS/ows',{layers:'Tiefenlinien,Tiefenzonen',format:'image/png',transparent:true,version:'1.3.0',opacity:0.65,zIndex:7,attribution:'© BSH'}).addTo(m);}catch{}}
    if(ds.has('ireland')){try{L.tileLayer.wms('https://atlas.marine.ie/arcgis/services/Bathymetry/MapServer/WMSServer',{layers:'0',format:'image/png',transparent:true,version:'1.3.0',opacity:0.6,zIndex:7,attribution:'© INFOMAR'}).addTo(m);}catch{}}
    if(ds.has('osm_depth')){try{L.tileLayer('https://tiles.openseamap.org/depth/{z}/{x}/{y}.png',{maxZoom:18,opacity:0.8,zIndex:8,attribution:'© OpenSeaMap'}).addTo(m);}catch{}}
    if(ds.has('china')||ds.has('indonesia')){loadIndonesiaEnc();}else{removeIndonesiaEnc();}
    if(ds.has('scs')){loadSCSEnc();}else{removeSCSEnc();}
  },[depthSources,mapReady]);

  useEffect(()=>{rbModeRef.current=rbMode;},[rbMode]);
  useEffect(()=>{vectorMinsRef.current=vectorMins;},[vectorMins]);
  useEffect(()=>{colorsRef.current=colors;},[colors]);
  useEffect(()=>{trackHoursRef.current=trackHours;},[trackHours]);
  useEffect(()=>{autoCenterRef.current=autoCenter;},[autoCenter]);
  useEffect(()=>{aisRangeRef.current=aisRange;},[aisRange]);
  const xtdNMRef=useRef(xtdNM);useEffect(()=>{xtdNMRef.current=xtdNM;},[xtdNM]);
  useEffect(()=>{depthCheckOnRef.current=depthCheckOn;},[depthCheckOn]);
  useEffect(()=>{contoursRef.current={shallow:shallowDepth,safety:safetyDepth,deep:deepDepth,draft:shipDraft};},[shallowDepth,safetyDepth,deepDepth,shipDraft]);
  useEffect(()=>{aisSourceRef.current=aisSource;},[aisSource]);

  // CHANGE 3: Instant S-52 sounding recolor when mariner changes depth contour sliders
  useEffect(()=>{
    if(!scsEncLayerRef.current||!window.L)return;
    try{
      scsEncLayerRef.current.eachLayer(layer=>{
        try{
          const ft=layer.feature;
          if(!ft||ft.properties?.type!=='sounding')return;
          const depth=ft.properties?.depth;
          if(depth==null)return;
          const col=getSoundingColor(depth);
          const newIcon=window.L.divIcon({
            html:`<div style="color:${col};font-size:9px;font-weight:700;font-family:monospace;white-space:nowrap;text-shadow:1px 1px 2px #000;pointer-events:none;">${depth}</div>`,
            className:'',
            iconSize:[0,0],
            iconAnchor:[8,6]
          });
          if(typeof layer.setIcon==='function')layer.setIcon(newIcon);
        }catch{}
      });
    }catch{}
  },[shallowDepth,safetyDepth,deepDepth,getSoundingColor]);

  // Persist to localStorage
  useEffect(()=>{localStorage.setItem('nav_mapMode',mapMode);},[mapMode]);
  useEffect(()=>{localStorage.setItem('nav_displayMode',displayMode);},[displayMode]);
  useEffect(()=>{localStorage.setItem('nav_gpsOn',gpsOn);},[gpsOn]);
  useEffect(()=>{localStorage.setItem('nav_depthSources',JSON.stringify([...depthSources]));},[depthSources]);
  useEffect(()=>{localStorage.setItem('nav_autoCenter',autoCenter);},[autoCenter]);
  useEffect(()=>{localStorage.setItem('nav_vectorMins',vectorMins);},[vectorMins]);
  useEffect(()=>{localStorage.setItem('nav_trackHours',trackHours);},[trackHours]);
  useEffect(()=>{localStorage.setItem('nav_hudCollapsed',hudCollapsed);},[hudCollapsed]);
  useEffect(()=>{localStorage.setItem('nav_togCollapsed',togCollapsed);},[togCollapsed]);
  useEffect(()=>{localStorage.setItem('nav_hudPos',JSON.stringify(hudPos));},[hudPos]);
  useEffect(()=>{localStorage.setItem('nav_colors',JSON.stringify(colors));},[colors]);
  useEffect(()=>{localStorage.setItem('nav_aisRange',aisRange);},[aisRange]);
  useEffect(()=>{localStorage.setItem('nav_shallowDepth',shallowDepth);},[shallowDepth]);
  useEffect(()=>{localStorage.setItem('nav_safetyDepth',safetyDepth);},[safetyDepth]);
  useEffect(()=>{localStorage.setItem('nav_deepDepth',deepDepth);},[deepDepth]);
  useEffect(()=>{localStorage.setItem('nav_draft',shipDraft);},[shipDraft]);
  useEffect(()=>{localStorage.setItem('nav_xtdNM',xtdNM);},[xtdNM]);
  useEffect(()=>{if(fullScreen){document.documentElement.style.overflow='hidden';}else{document.documentElement.style.overflow='';}return()=>{document.documentElement.style.overflow='';};},[fullScreen]);
  useEffect(()=>{localStorage.setItem('nav_aisSource',aisSource);},[aisSource]);
  useEffect(()=>{localStorage.setItem('nav_selectedWpIdx',selectedWpIdx);},[selectedWpIdx]);
  useEffect(()=>{localStorage.setItem('nav_shipProfile',JSON.stringify(shipProfile));ownMmsiRef.current=shipProfile?.mmsi?String(shipProfile.mmsi):null;},[shipProfile]);
  useEffect(()=>{localStorage.setItem('nav_localAisHost',localAisHost);},[localAisHost]);
  useEffect(()=>{if(activeRoute)localStorage.setItem('nav_activeRoute',JSON.stringify(activeRoute));else localStorage.removeItem('nav_activeRoute');},[activeRoute]);
  useEffect(()=>{localStorage.setItem('nav_chartOverlays',JSON.stringify(chartOverlays));},[chartOverlays]);
  useEffect(()=>{localStorage.setItem('nav_zoneOverlays',JSON.stringify(zoneOverlays));},[zoneOverlays]);
  useEffect(()=>{localStorage.setItem('nav_cogPanelPos',JSON.stringify(cogPanelPos));},[cogPanelPos]);
  useEffect(()=>{localStorage.setItem('nav_cogPanel',cogPanelVisible);},[cogPanelVisible]);
  useEffect(()=>{localStorage.setItem('nav_speedAlarm',speedAlarmKn);},[speedAlarmKn]);
  useEffect(()=>{localStorage.setItem('nav_alarmsMuted',alarmsMuted);},[alarmsMuted]);
  useEffect(()=>{localStorage.setItem('nav_alarmToggles',JSON.stringify(alarmToggles));},[alarmToggles]);
  // nav_offTrackNM persist removed — xtdNM is persisted separately and used as threshold
  useEffect(()=>{localStorage.setItem('nav_guardZoneNM',guardZoneRadiusNM);},[guardZoneRadiusNM]);
  useEffect(()=>{localStorage.setItem('nav_anchorLOA',anchorShipLengthM);},[anchorShipLengthM]);
  useEffect(()=>{localStorage.setItem('nav_anchorShackles',anchorShackles);},[anchorShackles]);

  // Route rendering
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L)return;
    const L=window.L,m=leafRef.current,lrs=layersRef.current;
    if(lrs.route){m.removeLayer(lrs.route);lrs.route=null;}
    lrs.routeMarkers?.forEach(x=>{try{m.removeLayer(x);}catch{}});lrs.routeMarkers=[];
    [lrs.xtdPort,lrs.xtdStbd,lrs.xtdFill].forEach(arr=>{if(Array.isArray(arr))arr.forEach(l=>{try{m.removeLayer(l);}catch{}});else if(arr)try{m.removeLayer(arr);}catch{};});
    lrs.xtdPort=null;lrs.xtdStbd=null;lrs.xtdFill=null;
    if(!activeRoute?.waypoints?.length)return;
    const wps=normalizeRoute(activeRoute.waypoints),c=colors;
    const showLabels=routeLabelZoomBand==='in';
    lrs.route=L.polyline(wps.map(w=>[w.lat,w.lon]),{color:c.route,weight:2.5,opacity:0.9,dashArray:'8 4',noClip:true}).addTo(m);
    wps.forEach((wp,i)=>{
      const first=i===0,last=i===wps.length-1,col=first?'#00C896':last?'#FF4757':c.route,sz=first||last?14:8;
      const di=L.divIcon({html:`<div style="background:${col};border:2.5px solid #fff;border-radius:50%;width:${sz}px;height:${sz}px;box-shadow:0 0 4px rgba(0,0,0,0.5);"></div>`,className:'',iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      const lbl=`WP${String(i+1).padStart(2,'0')}${wp.name?' '+wp.name:''}`;
      const mk=L.marker([wp.lat,wp.lon],{icon:di}).bindPopup(`<div style="font-size:13px;min-width:150px"><b style="color:${col}">${lbl}</b><br/>${toDMS(wp.lat,true)}<br/>${toDMS(wp.lon,false)}${i>0?`<hr style="margin:4px 0"/>Leg ${i}: ${brg(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon).toFixed(1)}°T · ${distNM(wps[i-1].lat,wps[i-1].lon,wp.lat,wp.lon).toFixed(1)} NM`:''}</div>`).addTo(m);
      lrs.routeMarkers.push(mk);
      if(showLabels){
        const li=L.divIcon({html:`<div style="color:#fff;font-size:10px;font-weight:700;font-family:monospace;white-space:nowrap;text-shadow:1px 1px 2px #000,-1px -1px 2px #000;pointer-events:none;">${lbl}</div>`,className:'',iconSize:[0,0],iconAnchor:[-4,-sz/2-2]});
        lrs.routeMarkers.push(L.marker([wp.lat,wp.lon],{icon:li,interactive:false,zIndexOffset:200}).addTo(m));
      }
    });
    if(showLabels){
      for(let i=0;i<wps.length-1;i++){
        const mid=[(wps[i].lat+wps[i+1].lat)/2,(wps[i].lon+wps[i+1].lon)/2];
        const bd=brg(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon),dn=distNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
        const li=L.divIcon({html:`<div style="background:rgba(0,0,0,0.65);color:#FFD700;font-size:10px;font-weight:600;font-family:monospace;white-space:nowrap;padding:1px 4px;border-radius:3px;pointer-events:none;">${bd.toFixed(0)}°T · ${dn.toFixed(1)} NM</div>`,className:'',iconSize:[0,0],iconAnchor:[-4,8]});
        lrs.routeMarkers.push(L.marker(mid,{icon:li,interactive:false,zIndexOffset:100}).addTo(m));
      }
    }
    if(wps.length>=2){
      const X=xtdNM;
      const portLines=[],stbdLines=[],fillPolys=[];
      for(let i=0;i<wps.length-1;i++){
        const lb=brg(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
        const p1=offsetPt(wps[i].lat,wps[i].lon,(lb-90+360)%360,X),p2=offsetPt(wps[i+1].lat,wps[i+1].lon,(lb-90+360)%360,X);
        const s1=offsetPt(wps[i].lat,wps[i].lon,(lb+90)%360,X),s2=offsetPt(wps[i+1].lat,wps[i+1].lon,(lb+90)%360,X);
        portLines.push(L.polyline([p1,p2],{color:c.xtd,weight:1.5,opacity:0.8,dashArray:'10 6'}).addTo(m));
        stbdLines.push(L.polyline([s1,s2],{color:c.xtd,weight:1.5,opacity:0.8,dashArray:'10 6'}).addTo(m));
        fillPolys.push(L.polygon([p1,p2,s2,s1],{color:'transparent',fillColor:c.xtd,fillOpacity:0.06,weight:0}).addTo(m));
      }
      lrs.xtdPort=portLines;lrs.xtdStbd=stbdLines;lrs.xtdFill=fillPolys;
    }
    if(activeRoute?.name!==prevRouteNameRef.current){prevRouteNameRef.current=activeRoute?.name||null;try{m.fitBounds(lrs.route.getBounds(),{padding:[60,60]});}catch{}}
  },[activeRoute,mapReady,colors,xtdNM,routeLabelZoomBand]);

  const etaThrottleRef=useRef(0);
  useEffect(()=>{
    if(!livePos||!activeRoute?.waypoints?.length){setEtaResult(null);return;}
    if(livePos.sog<0.2){setEtaResult(null);return;}
    const now=Date.now();
    if(now-etaThrottleRef.current<2000)return;
    etaThrottleRef.current=now;

    const wps=activeRoute.waypoints;
    const finalIdx=wps.length-1;
    const ti=Math.min(Math.max(selectedWpIdx,0),finalIdx);

    const legSum=(a,b)=>{
      let d=0;
      for(let i=a;i<b&&i<wps.length-1;i++)
        d+=distNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
      return d;
    };
    const totalRouteDist=legSum(0,finalIdx);

    let remToFinal=Infinity;
    let remToTarget=Infinity;

    for(let i=0;i<wps.length-1;i++){
      const legBrg=brg(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
      const shipBrg=brg(wps[i].lat,wps[i].lon,livePos.lat,livePos.lon);
      const shipDist=distNM(wps[i].lat,wps[i].lon,livePos.lat,livePos.lon);
      const angle=((legBrg-shipBrg)+540)%360-180;
      const along=shipDist*Math.cos(angle*Math.PI/180);
      const legLen=distNM(wps[i].lat,wps[i].lon,wps[i+1].lat,wps[i+1].lon);
      if(along>=-0.5&&along<=legLen+0.5){
        const remainOnThisLeg=Math.max(0,legLen-along);
        const dToFinal=remainOnThisLeg+legSum(i+1,finalIdx);
        if(dToFinal<remToFinal){
          remToFinal=dToFinal;
          remToTarget=i<ti
            ? remainOnThisLeg+legSum(i+1,ti)
            : i===ti
            ? remainOnThisLeg
            : 0;
        }
      }
    }

    if(remToFinal===Infinity){
      let minD=Infinity,nearestI=0;
      for(let i=0;i<wps.length;i++){
        const d=distNM(livePos.lat,livePos.lon,wps[i].lat,wps[i].lon);
        if(d<minD){minD=d;nearestI=i;}
      }
      remToFinal=minD+legSum(nearestI,finalIdx);
      remToTarget=distNM(livePos.lat,livePos.lon,wps[ti].lat,wps[ti].lon);
    }

    const hrs=remToFinal/livePos.sog;
    const h=Math.floor(hrs),mn=Math.round((hrs%1)*60);
    const arr=new Date(Date.now()+hrs*3600000);
    const pd=n=>String(n).padStart(2,'0');
    const mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][arr.getMonth()];
    const sailed=Math.max(0,totalRouteDist-remToFinal);

    setEtaResult({
      remainNM:remToFinal.toFixed(1),
      remainToTargetNM:remToTarget.toFixed(1),
      totalNM:totalRouteDist.toFixed(1),
      sailedNM:sailed.toFixed(1),
      hrs:h,mins:mn,
      wpName:wps[ti].name||`WP${String(ti+1).padStart(2,'0')}`,
      finalWpName:wps[finalIdx].name||`WP${String(finalIdx+1).padStart(2,'0')}`,
      arrivalStr:`${pd(arr.getDate())} ${mo} ${arr.getFullYear()} ${pd(arr.getHours())}:${pd(arr.getMinutes())} LT`,
    });
  },[livePos,activeRoute,selectedWpIdx]);

  const bearingThrottleRef=useRef(0);
  // Rolling COG/HDG buffer for smoothing — prevents map spin from GPS jitter
  const bearingSmoothBuf=useRef([]);
  const smoothBearing=(raw)=>{
    const buf=bearingSmoothBuf.current;
    buf.push(raw);
    if(buf.length>5)buf.shift();
    if(buf.length===1)return raw;
    // Circular mean — handles 359→001 wrap correctly
    let sinSum=0,cosSum=0;
    buf.forEach(b=>{sinSum+=Math.sin(b*Math.PI/180);cosSum+=Math.cos(b*Math.PI/180);});
    const avg=(Math.atan2(sinSum/buf.length,cosSum/buf.length)*180/Math.PI+360)%360;
    return Math.round(avg*10)/10;
  };

  useEffect(()=>{
    if(!mapReady||!mapRef.current||!leafRef.current)return;
    // Always clear CSS transform — never use it for rotation
    mapRef.current.style.transform='none';
    // Reset smooth buffer when mode changes
    bearingSmoothBuf.current=[];

    if(displayMode==='north'){
      mapBearingRef.current=0;
      bearingSmoothBuf.current=[];
      if(typeof leafRef.current.setBearing==='function'){
        try{leafRef.current.setBearing(0);}catch{}
      }
      // Also clear any CSS pane rotation from fallback
      const mapPane=mapRef.current?.querySelector('.leaflet-map-pane');
      if(mapPane){mapPane.style.transform='';mapPane.style.transformOrigin='';}
      mapRef.current.style.transform='none';
      return;
    }

    const applyBearing=()=>{
      // Course Up = COG, Head Up = heading (gyro/HDG), fallback to COG if no heading
      const raw=displayMode==='course'
        ?(livePosRef.current?.cog||0)
        :(livePosRef.current?.heading||livePosRef.current?.cog||0);
      const b=smoothBearing(raw);
      mapBearingRef.current=b;
      // Use leaflet-rotate plugin if available — rotates only map tiles/layers
      if(typeof leafRef.current?.setBearing==='function'){
        try{leafRef.current.setBearing(b);return;}catch(e){console.warn('[setBearing]',e);}
      }
      // Plugin not available — rotate the Leaflet map pane container only (not the whole div)
      // This keeps HUD/panel/banners upright while rotating the chart
      const mapPane=mapRef.current?.querySelector('.leaflet-map-pane');
      if(mapPane){
        mapPane.style.transform=`rotate(${b}deg)`;
        mapPane.style.transformOrigin='center center';
      }
    };

    applyBearing();
    // Poll every 1.5s — smooth buffer prevents jitter, fast enough for real navigation
    const timer=setInterval(applyBearing,1500);
    return()=>clearInterval(timer);
  },[displayMode,mapReady]);

  useEffect(()=>{
    if(leafRef.current)return;
    const init=()=>{
      if(!mapRef.current||!window.L)return;
      const L=window.L;
      // Check if rotate plugin extended L.Map — if yes use it, always pass rotate:true
      const hasRotate=typeof L.Map.prototype.setBearing==='function';
      const opts={center:[20,70],zoom:4,worldCopyJump:true};
      if(hasRotate){opts.rotate=true;opts.rotateControl=false;}
      leafRef.current=L.map(mapRef.current,opts);
      L.control.scale({position:'bottomleft',imperial:true,metric:true,maxWidth:120}).addTo(leafRef.current);
      leafRef.current.on('zoomend',()=>{
        const z=leafRef.current.getZoom();
        setMapZoom(z);
        setRouteLabelZoomBand(prev=>{const band=z>=8?'in':'out';return prev===band?prev:band;});
      });
      baseTileRef.current=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{subdomains:'abcd',attribution:'© CARTO'}).addTo(leafRef.current);
      seamarkRef.current=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18,attribution:'© OpenSeaMap'}).addTo(leafRef.current);
      leafRef.current.on('click',e=>{
        if(rbModeRef.current){const pos=livePosRef.current;if(!pos){notify('Enable GPS first','error');return;}rbTargetRef.current={lat:e.latlng.lat,lon:e.latlng.lng};const rn=distNM(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng),bg=brg(pos.lat,pos.lon,e.latlng.lat,e.latlng.lng);setRbResult({rangeNM:rn.toFixed(2),bearing:bg.toFixed(1),lat:e.latlng.lat.toFixed(5),lon:e.latlng.lng.toFixed(5)});if(layersRef.current.rbLine)leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker)leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=L.polyline([[pos.lat,pos.lon],[e.latlng.lat,e.latlng.lng]],{color:'#FFD700',weight:1.5,dashArray:'5 4'}).addTo(leafRef.current);layersRef.current.rbMarker=L.circleMarker([e.latlng.lat,e.latlng.lng],{radius:5,color:'#FFD700',fillColor:'#FFD700',fillOpacity:1}).addTo(leafRef.current);return;}
        if(depthCheckOnRef.current){const ct=contoursRef.current;L.popup({closeOnClick:true}).setLatLng(e.latlng).setContent(`<div style="font-size:13px;padding:4px"><b style="color:#00D4FF">${toDMS(e.latlng.lat,true)}</b><br/><b style="color:#00D4FF">${toDMS(e.latlng.lng,false)}</b><hr style="margin:4px 0"/>Enable ENC depth layer + zoom ≥9<br/><small>🔴&lt;${ct.shallow}m 🟡&lt;${ct.safety}m 🟢≥${ct.safety}m</small></div>`).openOn(leafRef.current);return;}
        setAisPopup(null);setSelectedAisMmsi(null);
      });
      setMapReady(true);safeInvalidate();[100,300,600,1200].forEach(t=>setTimeout(()=>{try{leafRef.current?.invalidateSize({animate:false});}catch{}},t));
    };
    // Load order: leaflet CSS → leaflet JS → rotate plugin → init
    // Plugin MUST load after Leaflet but BEFORE init() so it extends L.Map.prototype
    const loadRotatePlugin=(cb)=>{
      if(document.getElementById('lrotate')){cb();return;}
      const s=document.createElement('script');
      s.id='lrotate';
      s.src='https://cdn.jsdelivr.net/npm/leaflet-rotate@0.3.0/dist/leaflet-rotate-src.js';
      s.onload=cb;
      s.onerror=cb; // still init even if plugin fails — will fall back gracefully
      document.head.appendChild(s);
    };
    const load=()=>loadRotatePlugin(init);
    if(window.L){load();return;}
    if(!document.getElementById('lcss')){const l=document.createElement('link');l.id='lcss';l.rel='stylesheet';l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';document.head.appendChild(l);}
    if(!document.getElementById('ljs')){const s=document.createElement('script');s.id='ljs';s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';s.onload=load;document.head.appendChild(s);}
    else{const r=setInterval(()=>{if(window.L){clearInterval(r);load();}},50);setTimeout(()=>clearInterval(r),5000);}
    return()=>{invalidateTimers.current.forEach(clearTimeout);if(leafRef.current){leafRef.current.remove();leafRef.current=null;}};
  },[]);

  const toggleZoneOverlay=k=>setZoneOverlays(o=>({...o,[k]:!o[k]}));
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L)return;
    const L=window.L,m=leafRef.current,lrs=layersRef.current;
    Object.values(lrs.zones||{}).forEach(lg=>{try{m.removeLayer(lg);}catch{}});lrs.zones={};
    const zoneData={eca:{zones:ECA_ZONES,color:'#FF6B35',fill:0.12},seca:{zones:SECA_ZONES,color:'#FFB347',fill:0.12},marpol:{zones:MARPOL_ZONES,color:'#9B59B6',fill:0.12},pssa:{zones:PSSA_ZONES,color:'#00C896',fill:0.12},nox:{zones:NOX_ZONES,color:'#F39C12',fill:0.12},loadline:{zones:LOAD_LINE_ZONES,color:'#1ABC9C',fill:0.10},restrictions:{zones:MARITIME_RESTRICTIONS,color:'#FF2020',fill:0.18,useZoneColor:true},msc_nog:{zones:CHINA_MSC_NO_G,color:'#FF00FF',fill:0.22},eez:{zones:EEZ_ZONES,color:'#5DADE2',fill:0.06,dashed:true},piracy:{zones:[{name:'Indian Ocean HRA',coords:[[0,40],[0,78],[25,78],[25,40]],shortDesc:'IMB High Risk Area'},{name:'Gulf of Guinea',coords:[[-5,0],[5,0],[5,10],[-5,10]],shortDesc:'Piracy HRA'},{name:'Malacca Strait',coords:[[1,98],[6,98],[6,106],[1,106]],shortDesc:'Piracy risk area'},{name:'Somali Coast',coords:[[-2,40],[12,40],[12,55],[-2,55]],shortDesc:'Piracy HRA'}],color:'#E74C3C',fill:0.16}};
    if(!m.getPane('zonePane')){const zp=m.createPane('zonePane');zp.style.zIndex='420';}
    Object.entries(zoneData).forEach(([k,cfg])=>{if(!zoneOverlays[k])return;const lg=L.layerGroup();(cfg.zones||[]).forEach(z=>{const zColor=(cfg.useZoneColor&&z.color)?z.color:cfg.color;const coords=(z.coords||[]).map(p=>Array.isArray(p)?p:[p[0],p[1]]);if(coords.length<3)return;L.polygon(coords,{color:zColor,fillColor:zColor,fillOpacity:cfg.fill,weight:cfg.useZoneColor?2:1.5,opacity:0.85,dashArray:cfg.dashed?'8 5':null,pane:'zonePane'}).bindPopup(`<div style="font-size:12px"><b style="color:${zColor}">${z.name||k}</b><br/><small>${z.shortDesc||''}</small></div>`,{maxWidth:260}).addTo(lg);try{const center=L.polygon(coords).getBounds().getCenter();L.marker([center.lat,center.lng],{icon:L.divIcon({html:`<div style="background:rgba(0,0,0,0.75);color:${zColor};border:1px solid ${zColor}55;border-radius:3px;padding:2px 5px;font-size:9px;font-weight:700;white-space:nowrap;font-family:monospace;pointer-events:none;">${z.name||k}</div>`,className:'',iconSize:[0,0],iconAnchor:[0,0]}),interactive:false,pane:'zonePane'}).addTo(lg);}catch{}});lg.addTo(m);lrs.zones[k]=lg;});
  },[zoneOverlays,mapReady]);

  useEffect(()=>{if(!anchorWatchOn||!anchorPos||!livePos)return;const dist=distNM(livePos.lat,livePos.lon,anchorPos.lat,anchorPos.lon);if(dist>anchorRadius){const now=Date.now();if(now-anchorAlarmCooldownRef.current>20000){anchorAlarmCooldownRef.current=now;setAnchorAlarm(true);playAlarm('anchor');notify(`⚓ ANCHOR DRAGGING — ${dist.toFixed(2)}NM!`,'error');setTimeout(()=>setAnchorAlarm(false),10000);}}else{setAnchorAlarm(false);}},[livePos,anchorPos,anchorRadius,anchorWatchOn]);
  useEffect(()=>{if(!mapReady||!leafRef.current||!window.L)return;const L=window.L,m=leafRef.current;if(layersRef.current.anchorCircle){try{m.removeLayer(layersRef.current.anchorCircle);}catch{}layersRef.current.anchorCircle=null;}if(anchorWatchOn&&anchorPos){layersRef.current.anchorCircle=L.circle([anchorPos.lat,anchorPos.lon],{radius:anchorRadius*1852,color:anchorAlarm?'#FF2020':'#FFD700',fillColor:anchorAlarm?'#FF2020':'#FFD700',fillOpacity:0.08,weight:2,dashArray:'6 4'}).addTo(m);}},[anchorWatchOn,anchorPos,anchorRadius,anchorAlarm,mapReady]);
  useEffect(()=>{if(!livePos||speedAlarmKn<=0)return;if(livePos.sog>speedAlarmKn){if(!speedAlarmTriggered){setSpeedAlarmTriggered(true);playAlarm('speed');notify(`⚠ OVERSPEED — ${livePos.sog.toFixed(1)}kn / limit ${speedAlarmKn}kn`,'error');}}else{setSpeedAlarmTriggered(false);}},[livePos,speedAlarmKn]);
  useEffect(()=>{if(!livePos||!activeRoute?.waypoints?.length)return;const wps=activeRoute.waypoints,ti=Math.min(Math.max(selectedWpIdx,0),wps.length-1);const dist=distNM(livePos.lat,livePos.lon,wps[ti].lat,wps[ti].lon);if(dist<wpArrivalNM){const now=Date.now();if(now-wpAlarmCooldownRef.current>15000){wpAlarmCooldownRef.current=now;const wpName=wps[ti].name||`WP${String(ti+1).padStart(2,'0')}`;playAlarm('wp');notify(`📍 Arriving at ${wpName} — ${dist.toFixed(2)}NM`,'error');if(ti<wps.length-1)setSelectedWpIdx(ti+1);else notify('🏁 Final waypoint reached!','error');}}},[livePos,activeRoute,selectedWpIdx,wpArrivalNM]);
  const offTrackThrottleRef=useRef(0);
  useEffect(()=>{
    if(!livePos||!activeRoute?.waypoints?.length){setOffTrackAlarm(false);return;}
    const now=Date.now();
    if(now-offTrackThrottleRef.current<3000)return;
    offTrackThrottleRef.current=now;
    const wps=activeRoute.waypoints;
    let minXTD=Infinity;

    // ── Correct haversine cross-track distance formula ──────────────────────
    // Standard maritime/aviation formula — exact on sphere, works at any distance
    // xtd = asin(sin(d_ship_to_start/R) × sin(bearing_ship_to_start − leg_bearing)) × R
    const R=3440.065; // Earth radius in NM
    const toRad=d=>d*Math.PI/180;

    const haversineXTD=(shipLat,shipLon,wpALat,wpALon,wpBLat,wpBLon)=>{
      // Distance from leg start (A) to ship
      const dA=distNM(wpALat,wpALon,shipLat,shipLon);
      if(dA<0.001)return 0; // ship is at waypoint A
      // Bearing from leg start to ship
      const brgAS=brg(wpALat,wpALon,shipLat,shipLon);
      // Bearing of the leg (A→B)
      const brgAB=brg(wpALat,wpALon,wpBLat,wpBLon);
      // Cross-track distance (signed — positive = right of track, negative = left)
      const xtd=Math.asin(Math.sin(dA/R)*Math.sin(toRad(brgAS-brgAB)))*R;
      return Math.abs(xtd);
    };

    const haversineAlong=(shipLat,shipLon,wpALat,wpALon,wpBLat,wpBLon)=>{
      // Along-track distance — how far along the leg the ship projects
      const dA=distNM(wpALat,wpALon,shipLat,shipLon);
      if(dA<0.001)return 0;
      const brgAS=brg(wpALat,wpALon,shipLat,shipLon);
      const brgAB=brg(wpALat,wpALon,wpBLat,wpBLon);
      const xtd=Math.asin(Math.sin(dA/R)*Math.sin(toRad(brgAS-brgAB)))*R;
      return Math.acos(Math.cos(dA/R)/Math.cos(xtd/R))*R;
    };

    for(let i=0;i<wps.length-1;i++){
      const A=wps[i],B=wps[i+1];
      const legLen=distNM(A.lat,A.lon,B.lat,B.lon);
      if(legLen<0.001)continue;

      const xtd=haversineXTD(livePos.lat,livePos.lon,A.lat,A.lon,B.lat,B.lon);
      const along=haversineAlong(livePos.lat,livePos.lon,A.lat,A.lon,B.lat,B.lon);

      let legXTD;
      if(along>=0&&along<=legLen){
        // Ship projects onto this leg — use true perpendicular XTD
        legXTD=xtd;
      } else if(along<0){
        // Ship is before leg start — use distance to start waypoint
        legXTD=distNM(livePos.lat,livePos.lon,A.lat,A.lon);
      } else {
        // Ship is past leg end — use distance to end waypoint
        legXTD=distNM(livePos.lat,livePos.lon,B.lat,B.lon);
      }
      if(legXTD<minXTD)minXTD=legXTD;
    }

    // Safety fallback
    if(minXTD===Infinity||isNaN(minXTD)){
      let best=Infinity;
      wps.forEach(w=>{const d=distNM(livePos.lat,livePos.lon,w.lat,w.lon);if(d<best)best=d;});
      minXTD=best;
    }

    // XTD limit = both corridor width AND alarm threshold — one single value controls both
    const threshold=xtdNM;
    // Respect alarm toggle — if offtrack alarm is OFF, clear visual and return
    const curToggles=typeof alarmTogglesRef.current==='function'?alarmTogglesRef.current():alarmTogglesRef.current;
    if(curToggles?.offtrack===false){setOffTrackAlarm(false);return;}

    if(minXTD>threshold){
      setOffTrackAlarm(true);
      const nowTs=Date.now();
      if(!alarmCooldownRef.current.offtrack||nowTs-alarmCooldownRef.current.offtrack>30000){
        alarmCooldownRef.current.offtrack=nowTs;
        playAlarm('offtrack');
        notify(`⚠ OFF TRACK — ${minXTD.toFixed(2)}NM (limit ${threshold}NM)`,'error');
      }
    } else {
      setOffTrackAlarm(false);
    }
  },[livePos,activeRoute,xtdNM,selectedWpIdx]);
  useEffect(()=>{
    if(!mapReady||!leafRef.current||!window.L)return;
    const L=window.L,m=leafRef.current;
    if(layersRef.current.guardZone){try{m.removeLayer(layersRef.current.guardZone);}catch{}layersRef.current.guardZone=null;}
    if(guardZoneOn&&livePosRef.current){const pos=livePosRef.current;layersRef.current.guardZone=L.circle([pos.lat,pos.lon],{radius:guardZoneRadiusNM*1852,color:guardZoneAlarm?'#FF2020':'#FF6B35',fillColor:guardZoneAlarm?'#FF2020':'#FF6B35',fillOpacity:0.04,weight:2,dashArray:'10 5'}).addTo(m);}
  },[guardZoneOn,guardZoneRadiusNM,guardZoneAlarm,livePos,mapReady]);

  const fetchWeather=async(lat,lon)=>{
    if(weatherLoading)return;
    setWeatherLoading(true);
    try{
      const res=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,surface_pressure,visibility&wind_speed_unit=kn`);
      if(res.ok){
        const d=await res.json();
        const cur=d.current||{};
        const WEATHER_CODES={0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',71:'Light snow',73:'Snow',75:'Heavy snow',80:'Rain showers',81:'Rain showers',82:'Violent rain showers',95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Thunderstorm w/ hail'};
        setWeatherData({
          temp:cur.temperature_2m,
          desc:WEATHER_CODES[cur.weather_code]||'',
          windSpd:(cur.wind_speed_10m||0).toFixed(1),
          windDir:cur.wind_direction_10m||0,
          humidity:cur.relative_humidity_2m,
          pressure:cur.surface_pressure?Math.round(cur.surface_pressure):'—',
          visibility:cur.visibility?(cur.visibility/1000):null,
          city:''
        });
        setShowWeather(true);
        setWeatherLoading(false);
        return;
      }
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }catch(e1){
      try{
        const res2=await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=dc9f59e2df05e49c03bc4aaacbb6d27a`);
        if(res2.ok){
          const d=await res2.json();
          setWeatherData({temp:d.main?.temp,desc:d.weather?.[0]?.description||'',windSpd:((d.wind?.speed||0)*1.94384).toFixed(1),windDir:d.wind?.deg||0,humidity:d.main?.humidity,pressure:d.main?.pressure,visibility:(d.visibility||0)/1000,city:d.name||''});
          setShowWeather(true);
        } else {
          notify(`Weather unavailable (${e1.message})`,'error');
        }
      }catch(e2){
        notify(`Weather fetch failed: ${e1.message}`,'error');
      }
    }
    setWeatherLoading(false);
  };
  useEffect(()=>{if(!portSearch.trim()||portSearch.length<2){setPortSearchResults([]);return;}const q=portSearch.toLowerCase();setPortSearchResults((portsDb||[]).filter(p=>(p.name||'').toLowerCase().includes(q)||(p.country||'').toLowerCase().includes(q)).slice(0,8));},[portSearch,portsDb]);
  const exportTrack=()=>{const pts=pastTrackRef.current;if(!pts||pts.length<2){notify('No track','error');return;}const wpts=pts.map(p=>`    <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lon.toFixed(6)}"><time>${new Date(p.t).toISOString()}</time></trkpt>`).join('\n');const gpx=`<?xml version="1.0"?>\n<gpx version="1.1" creator="NavisphereX">\n  <trk><name>Track ${new Date().toISOString().slice(0,10)}</name>\n  <trkseg>\n${wpts}\n  </trkseg></trk>\n</gpx>`;const blob=new Blob([gpx],{type:'application/gpx+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`track_${new Date().toISOString().slice(0,10)}.gpx`;a.click();URL.revokeObjectURL(a.href);notify('✓ Track exported','error');};
  const anchorWatchCircleNM=()=>(anchorShipLengthM+anchorShackles*27.5+30)/1852;

  const filteredSaved=savedRoutes.filter(r=>!savedSearch.trim()||(r.name||'').toLowerCase().includes(savedSearch.toLowerCase())).slice(0,100);
  const filteredDbRoutes=(sheetRoutes||[]).filter(r=>{if(!dbRouteSearch.trim())return true;return[r.name,r.Name,r['Route Name'],r.from,r.to].filter(Boolean).join(' ').toLowerCase().includes(dbRouteSearch.toLowerCase());}).slice(0,60);
  const filteredDB=(sheetRoutes||[]).filter(r=>{if(!dbSearch.trim())return true;return[r.name,r.Name,r['Route Name'],r.from,r.to].filter(Boolean).join(' ').toLowerCase().includes(dbSearch.toLowerCase());}).slice(0,50);
const onTS=e=>{const t=e.touches[0];if(!t)return;hudDragRef.current={dx:t.clientX-hudPos.x,dy:t.clientY-hudPos.y};};
const onTM=e=>{if(!hudDragRef.current)return;e.stopPropagation();const t=e.touches[0];if(!t)return;setHudPos({x:Math.max(0,Math.min(window.innerWidth-185,t.clientX-hudDragRef.current.dx)),y:Math.max(50,Math.min(window.innerHeight-200,t.clientY-hudDragRef.current.dy))});};
  const onTE=()=>{hudDragRef.current=null;};
  const toggleDepth=id=>{setDepthSources(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next;});};

  const alarmsMutedRef=useRef(()=>{try{return localStorage.getItem('nav_alarmsMuted')==='true';}catch{return false;}});
  const alarmTogglesRef=useRef(()=>{try{return JSON.parse(localStorage.getItem('nav_alarmToggles')||'null')||{offtrack:true,speed:true,guard:true,anchor:true,wp:true,collision:true};}catch{return{offtrack:true,speed:true,guard:true,anchor:true,wp:true,collision:true};}});
  useEffect(()=>{alarmsMutedRef.current=alarmsMuted;},[alarmsMuted]);
  useEffect(()=>{alarmTogglesRef.current=alarmToggles;},[alarmToggles]);

  const playAlarm=useCallback((type='alert')=>{
    // Check master mute and per-alarm toggle
    const muted=typeof alarmsMutedRef.current==='function'?alarmsMutedRef.current():alarmsMutedRef.current;
    const toggles=typeof alarmTogglesRef.current==='function'?alarmTogglesRef.current():alarmTogglesRef.current;
    if(muted)return;
    if(type!=='alert'&&toggles[type]===false)return;
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      const patterns={
        collision:[[880,0.15],[0,0.05],[880,0.15],[0,0.05],[880,0.3]],
        offtrack:[[440,0.3],[0,0.1],[440,0.3]],
        anchor:[[330,0.2],[550,0.2],[330,0.2],[550,0.4]],
        guard:[[660,0.1],[0,0.05],[660,0.1],[0,0.05],[660,0.1],[0,0.05],[660,0.4]],
        speed:[[220,0.5]],
        wp:[[880,0.1],[0,0.05],[1100,0.2]],
        alert:[[440,0.3]],
      };
      const seq=patterns[type]||patterns.alert;
      let t=ctx.currentTime+0.05;
      seq.forEach(([freq,dur])=>{
        if(freq>0){
          const o=ctx.createOscillator(),g=ctx.createGain();
          o.connect(g);g.connect(ctx.destination);
          o.frequency.value=freq;o.type='sine';
          g.gain.setValueAtTime(0.4,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);
          o.start(t);o.stop(t+dur+0.01);
        }
        t+=dur+0.01;
      });
    }catch(e){console.warn('[alarm]',e);}
  },[]);
  const S={bg:'rgba(4,12,26,0.97)',bd:'rgba(0,212,255,0.28)',tx:'#D0E8F8',dm:'#5A7A90',vd:'#243850',cy:'#00D4FF',gn:'#00FF88',gd:'#FFD700',rd:'#FF4757',sm:'0.78rem',xs:'0.68rem',lb:'0.58rem'};
  const aisPopupData=aisPopup?(aisPopupDataRef.current||null):null;

  return(
    <div style={{flex:1,display:'flex',flexDirection:'column',background:'#040C1A',position:'relative',overflow:'hidden',minHeight:0,...(fullScreen?{position:'fixed',inset:0,zIndex:9999,minHeight:'100vh'}:{}),...(nightVision?{filter:'sepia(1) saturate(3) hue-rotate(300deg) brightness(0.7)'}:{})}}>

      {/* Top bar */}
      <div style={{height:48,display:'flex',alignItems:'center',padding:'0 10px',background:'#020810',borderBottom:`1px solid ${S.bd}`,flexShrink:0,gap:5,overflowX:'auto',overflowY:'hidden',WebkitOverflowScrolling:'touch',scrollbarWidth:'none'}}>
        <span style={{color:S.cy,fontWeight:700,fontSize:'0.82rem',letterSpacing:1,flex:1}}>⚓ NAV</span>
        <div style={{display:'flex',gap:2}}>{[['north','N↑'],['course','C↑'],['head','H↑']].map(([v,l])=>(<button key={v} onClick={()=>setDisplayMode(v)} style={{background:displayMode===v?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${displayMode===v?S.cy:S.vd}`,color:displayMode===v?S.cy:S.dm,borderRadius:5,padding:'3px 7px',fontSize:'0.65rem',cursor:'pointer'}}>{l}</button>))}</div>
        <div style={{display:'flex',gap:2}}>{[['night','🌙'],['day','☀'],['dusk','🏇']].map(([v,l])=>(<button key={v} onClick={()=>setMapMode(v)} style={{background:mapMode===v?'rgba(255,215,0,0.18)':'transparent',border:`1px solid ${mapMode===v?S.gd:S.vd}`,color:mapMode===v?S.gd:S.dm,borderRadius:5,padding:'3px 6px',fontSize:'0.72rem',cursor:'pointer'}}>{l}</button>))}</div>
        <button onClick={()=>setShowPortSearch(v=>!v)} style={{background:showPortSearch?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${showPortSearch?S.cy:S.vd}`,color:showPortSearch?S.cy:S.dm,borderRadius:5,padding:'3px 7px',fontSize:'0.8rem',cursor:'pointer'}}>🔍</button>
        <button onClick={()=>setNightVision(v=>!v)} style={{background:nightVision?'rgba(255,0,0,0.2)':'transparent',border:`1px solid ${nightVision?'#FF2020':S.vd}`,color:nightVision?'#FF2020':S.dm,borderRadius:5,padding:'3px 7px',fontSize:'0.8rem',cursor:'pointer'}}>🔴</button>
        <button onClick={()=>setCogPanelVisible(v=>!v)} style={{background:cogPanelVisible&&livePos?'rgba(0,212,255,0.15)':'transparent',border:`1px solid ${cogPanelVisible&&livePos?S.cy:S.vd}`,color:cogPanelVisible&&livePos?S.cy:S.dm,borderRadius:5,padding:'3px 7px',fontSize:'0.75rem',cursor:'pointer'}}>⊕</button>
        <button onClick={()=>setFullScreen(v=>!v)} style={{background:fullScreen?'rgba(0,255,136,0.15)':'transparent',border:`1px solid ${fullScreen?S.gn:S.vd}`,color:fullScreen?S.gn:S.dm,borderRadius:5,padding:'3px 7px',fontSize:'0.9rem',cursor:'pointer'}}>⛶</button>
        <button onClick={()=>setShowMenu(v=>!v)} style={{background:showMenu?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${showMenu?S.cy:S.vd}`,color:showMenu?S.cy:S.dm,borderRadius:5,padding:'3px 9px',fontSize:'1rem',cursor:'pointer'}}>☰</button>
      </div>

      <div ref={mapRef} style={{flex:1,minHeight:0}}/>

      {/* Compass rose */}
      <div style={{position:'absolute',bottom:48,right:panelCollapsed?8:188,zIndex:490,pointerEvents:'none',opacity:0.88,transition:'right 0.2s'}}>
        <CompassRose cogRef={livePosRef} size={70}/>
      </div>

      {/* Zoom */}
      <div style={{position:'absolute',bottom:36,left:8,zIndex:500,pointerEvents:'none'}}>
        <div style={{background:'rgba(4,12,26,0.85)',border:'1px solid rgba(0,212,255,0.25)',borderRadius:4,padding:'2px 7px',color:'#00D4FF',fontFamily:'monospace',fontSize:'0.6rem',fontWeight:700}}>Z{mapZoom}</div>
      </div>

      {/* Alarm banners */}
      {(offTrackAlarm||speedAlarmTriggered||guardZoneAlarm||anchorAlarm)&&(
        <div style={{position:'absolute',top:56,left:'50%',transform:'translateX(-50%)',zIndex:700,display:'flex',gap:4,flexWrap:'wrap',justifyContent:'center',pointerEvents:'none'}}>
          {offTrackAlarm&&<div style={{background:'rgba(255,71,87,0.93)',border:'1px solid #FF4757',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#fff',fontWeight:700,boxShadow:'0 0 12px rgba(255,71,87,0.6)'}}>⚠ OFF TRACK</div>}
          {speedAlarmTriggered&&<div style={{background:'rgba(255,107,53,0.93)',border:'1px solid #FF6B35',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#fff',fontWeight:700}}>⚡ OVERSPEED {livePos?.sog?.toFixed(1)}kn</div>}
          {guardZoneAlarm&&<div style={{background:'rgba(255,32,32,0.93)',border:'1px solid #FF2020',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#fff',fontWeight:700}}>🔴 GUARD ZONE {guardZoneTargets.length} TGT</div>}
          {anchorAlarm&&<div style={{background:'rgba(255,71,87,0.93)',border:'1px solid #FF4757',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',color:'#fff',fontWeight:700}}>⚓ DRAGGING</div>}
        </div>
      )}

      {/* Weather */}
      {showWeather&&weatherData&&(
        <div style={{position:'absolute',bottom:80,right:8,zIndex:500,background:'rgba(2,8,16,0.92)',border:`1px solid ${S.bd}`,borderRadius:10,padding:'8px 12px',minWidth:140,backdropFilter:'blur(10px)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}><div style={{color:S.cy,fontSize:'0.72rem',fontWeight:700}}>🌤 {weatherData.city}</div><button onClick={()=>setShowWeather(false)} style={{background:'none',border:'none',color:S.dm,cursor:'pointer',fontSize:'0.7rem'}}>✕</button></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px'}}>{[['🌡','Temp',`${weatherData.temp?.toFixed(1)}°C`],['💨','Wind',`${weatherData.windSpd}kn`],['🧭','Dir',`${weatherData.windDir}°`],['👁','Vis',`${weatherData.visibility?.toFixed(1)}km`],['💧','Hum',`${weatherData.humidity}%`],['📊','Pres',`${weatherData.pressure}hPa`]].map(([ic,lb,val])=>(<div key={lb}><span style={{color:S.dm,fontSize:'0.55rem'}}>{ic} {lb}</span><div style={{color:S.tx,fontSize:'0.68rem',fontFamily:'monospace',fontWeight:600}}>{val}</div></div>))}</div>
          <div style={{color:S.dm,fontSize:'0.58rem',marginTop:4,textTransform:'capitalize'}}>{weatherData.desc}</div>
        </div>
      )}

      {/* Port search */}
      {showPortSearch&&(
        <div style={{position:'absolute',top:56,left:'50%',transform:'translateX(-50%)',zIndex:700,background:'rgba(2,8,16,0.97)',border:`1px solid ${S.bd}`,borderRadius:12,padding:'10px 12px',width:260,backdropFilter:'blur(16px)'}}>
          <div style={{display:'flex',gap:6,marginBottom:6}}><input autoFocus value={portSearch} onChange={e=>setPortSearch(e.target.value)} placeholder="Search port..." style={{flex:1,background:'#060F1C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:6,padding:'6px 9px',fontSize:'0.78rem',outline:'none'}}/><button onClick={()=>{setShowPortSearch(false);setPortSearch('');setPortSearchResults([]);}} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:6,padding:'4px 8px',cursor:'pointer'}}>✕</button></div>
          {portSearchResults.map((p,i)=>{const dist=livePos?distNM(livePos.lat,livePos.lon,p.lat,p.lon):null,bearing=livePos&&p.lat?brg(livePos.lat,livePos.lon,p.lat,p.lon):null;return(<div key={i} onClick={()=>{if(leafRef.current&&p.lat&&p.lon)leafRef.current.setView([p.lat,p.lon],10);setShowPortSearch(false);setPortSearch('');}} style={{padding:'7px 8px',cursor:'pointer',borderRadius:6,marginBottom:3,background:'rgba(0,212,255,0.05)',border:`1px solid ${S.vd}`}}><div style={{color:S.cy,fontSize:'0.78rem',fontWeight:600}}>⚓ {p.name}</div><div style={{color:S.dm,fontSize:'0.62rem'}}>{p.country}</div>{dist&&<div style={{color:S.gd,fontSize:'0.62rem',fontFamily:'monospace'}}>{dist.toFixed(1)}NM · {bearing?.toFixed(0)}°T</div>}</div>);})}
          {portSearchResults.length===0&&portSearch.length>=2&&<div style={{color:S.vd,fontSize:'0.7rem',textAlign:'center',padding:'8px 0'}}>No ports found</div>}
        </div>
      )}

      {/* AIS popup */}
      {aisPopup&&aisPopupData&&(
        <div
          style={{position:'absolute',left:aisPopup.x,top:aisPopup.y,zIndex:800,background:'rgba(2,8,20,0.97)',border:`2px solid ${aisPopupData.cpaTcpa?.cpa<1?'#FF3030':aisPopupData.cpaTcpa?.cpa<3?'#FF9500':'rgba(0,212,255,0.55)'}`,borderRadius:10,minWidth:205,maxWidth:260,backdropFilter:'blur(14px)',boxShadow:'0 4px 24px rgba(0,0,0,0.7)',touchAction:'none',userSelect:'none'}}
          onTouchStart={e=>{const t=e.touches[0];if(!t)return;aisPopupDragRef.current={dx:t.clientX-aisPopup.x,dy:t.clientY-aisPopup.y};}}
          onTouchMove={e=>{if(!aisPopupDragRef.current)return;e.stopPropagation();const t=e.touches[0];if(!t)return;setAisPopup(p=>p?{...p,x:Math.max(0,Math.min(window.innerWidth-220,t.clientX-aisPopupDragRef.current.dx)),y:Math.max(56,Math.min(window.innerHeight-200,t.clientY-aisPopupDragRef.current.dy))}:p);}}
          onTouchEnd={()=>{aisPopupDragRef.current=null;}}
          onMouseDown={e=>{if(e.button!==0||e.target.tagName==='BUTTON')return;const ox=e.clientX-aisPopup.x,oy=e.clientY-aisPopup.y;const mm=ev=>{setAisPopup(p=>p?{...p,x:Math.max(0,Math.min(window.innerWidth-220,ev.clientX-ox)),y:Math.max(56,Math.min(window.innerHeight-200,ev.clientY-oy))}:p);};const mu=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);}}
        >
          <div style={{display:'flex',alignItems:'center',padding:'6px 10px',borderBottom:'1px solid rgba(0,212,255,0.15)',cursor:'grab',gap:6}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{color:S.cy,fontWeight:700,fontSize:'0.82rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>⛵ {aisPopupData.name||'Unknown Vessel'}</div>
              <div style={{color:S.dm,fontSize:'0.58rem',fontFamily:'monospace'}}>MMSI: {aisPopupData.mmsi}</div>
            </div>
            <button onClick={()=>setAisPopup(p=>({...p,expanded:!p.expanded}))} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.gd,borderRadius:4,padding:'1px 5px',fontSize:'0.58rem',cursor:'pointer',flexShrink:0}}>{aisPopup.expanded?'▲ LESS':'▼ MORE'}</button>
            <button onClick={()=>{setAisPopup(null);setSelectedAisMmsi(null);}} style={{background:'transparent',border:'none',color:S.dm,fontSize:'0.9rem',cursor:'pointer',lineHeight:1,flexShrink:0}}>✕</button>
          </div>
          <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px'}}>
              {[['SOG',`${(aisPopupData.sog||0).toFixed(1)} kn`],['COG',`${(aisPopupData.cog||0).toFixed(0)}°T`],['HDG',aisPopupData.hdg?`${Number(aisPopupData.hdg).toFixed(0)}°`:'—'],['ROT',aisPopupData.rot!=null?`${Number(aisPopupData.rot).toFixed(1)}°/m`:'—'],['Range',aisPopupData.rangNM!=null?`${aisPopupData.rangNM.toFixed(2)} NM`:'—'],['BRG',aisPopupData.brgDeg!=null?`${aisPopupData.brgDeg.toFixed(0)}°T`:'—']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:'0.54rem'}}>{k}</div><div style={{color:S.tx,fontFamily:'monospace',fontSize:'0.7rem',fontWeight:600}}>{v}</div></div>))}
            </div>
            <div style={{background:'rgba(0,0,0,0.35)',borderRadius:6,padding:'5px 8px',border:`1px solid ${aisPopupData.cpaTcpa?.cpa<1?'rgba(255,48,48,0.5)':aisPopupData.cpaTcpa?.cpa<3?'rgba(255,149,0,0.4)':'rgba(0,212,255,0.18)'}`}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div><div style={{color:S.dm,fontSize:'0.52rem'}}>CPA</div><div style={{color:aisPopupData.cpaTcpa?.cpa<1?'#FF3030':aisPopupData.cpaTcpa?.cpa<3?'#FF9500':S.gn,fontFamily:'monospace',fontSize:'0.88rem',fontWeight:700}}>{aisPopupData.cpaTcpa?.cpa<9000?aisPopupData.cpaTcpa.cpa.toFixed(2):'—'} NM</div></div>
                <div><div style={{color:S.dm,fontSize:'0.52rem'}}>TCPA</div><div style={{color:aisPopupData.cpaTcpa?.tcpa>0?S.gd:S.dm,fontFamily:'monospace',fontSize:'0.88rem',fontWeight:700}}>{aisPopupData.cpaTcpa?.tcpa>0?aisPopupData.cpaTcpa.tcpa.toFixed(2):'0.00'} h</div></div>
                <div><div style={{color:S.dm,fontSize:'0.52rem'}}>COLREG</div><div style={{color:S.cy,fontFamily:'monospace',fontSize:'0.6rem',fontWeight:700,marginTop:4}}>{aisPopupData.cl||'—'}</div></div>
              </div>
              {aisPopupData.cpaTcpa?.cpa<1.5&&aisPopupData.cpaTcpa?.tcpa>0&&<div style={{color:'#FF3030',fontSize:'0.62rem',fontWeight:700,marginTop:3}}>⚠ COLLISION RISK</div>}
            </div>
            {aisPopup.expanded&&(
              <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5,display:'flex',flexDirection:'column',gap:3}}>
                {[
                  ['MMSI', String(aisPopupData.mmsi||'—')],
                  ['Call Sign', aisPopupData.callsign||'—'],
                  ['IMO', aisPopupData.imo||'—'],
                  ['Ship Type', shipTypeLabel(aisPopupData.shipType)],
                  ['Nav Status', navStatusLabel(aisPopupData.navStatus)],
                  ['LOA', aisPopupData.length?`${aisPopupData.length} m`:'—'],
                  ['Beam', aisPopupData.beam?`${aisPopupData.beam} m`:'—'],
                  ['Draught', aisPopupData.draught?`${aisPopupData.draught} m`:'—'],
                  ['Destination', aisPopupData.destination||'—'],
                  ['Lat', aisPopupData.lat?toDMS(Number(aisPopupData.lat),true):'—'],
                  ['Lon', aisPopupData.lon?toDMS(Number(aisPopupData.lon),false):'—'],
                ].map(([k,v])=>(<div key={k} style={{display:'flex',justifyContent:'space-between',gap:6,borderBottom:'1px solid rgba(255,255,255,0.04)',paddingBottom:2}}>
                  <span style={{color:S.dm,fontSize:'0.58rem',flexShrink:0,width:72}}>{k}</span>
                  <span style={{color:S.tx,fontFamily:'monospace',fontSize:'0.6rem',textAlign:'right',wordBreak:'break-word'}}>{v}</span>
                </div>))}
                <button onClick={()=>{if(leafRef.current&&aisPopupData.lat)leafRef.current.setView([Number(aisPopupData.lat),Number(aisPopupData.lon)],13);}} style={{marginTop:4,background:'rgba(0,212,255,0.1)',border:`1px solid ${S.cy}`,color:S.cy,borderRadius:5,padding:'5px',fontSize:'0.62rem',cursor:'pointer'}}>🎯 Centre on Target</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COG panel */}
      {cogPanelVisible&&livePos&&(
        <div style={{position:'absolute',left:cogPanelPos.x!==null?cogPanelPos.x:'50%',top:cogPanelPos.y,transform:cogPanelPos.x===null?'translateX(-50%)':'none',zIndex:601,touchAction:'none',cursor:'grab'}}
          onTouchStart={e=>{const t=e.touches[0];if(!t)return;cogDragRef.current={dx:t.clientX-(cogPanelPos.x||window.innerWidth/2-120),dy:t.clientY-cogPanelPos.y};}}
onTouchMove={e=>{if(!cogDragRef.current)return;e.stopPropagation();const t=e.touches[0];if(!t)return;setCogPanelPos({x:Math.max(0,Math.min(window.innerWidth-260,t.clientX-cogDragRef.current.dx)),y:Math.max(50,Math.min(window.innerHeight-120,t.clientY-cogDragRef.current.dy))});}}
          onTouchEnd={()=>{cogDragRef.current=null;}}
          onMouseDown={e=>{if(e.button!==0)return;const sx=cogPanelPos.x!==null?cogPanelPos.x:e.currentTarget.getBoundingClientRect().left;const ox=e.clientX-sx,oy=e.clientY-cogPanelPos.y;const mm=ev=>{setCogPanelPos({x:Math.max(0,Math.min(window.innerWidth-260,ev.clientX-ox)),y:Math.max(50,Math.min(window.innerHeight-120,ev.clientY-oy))});};const mu=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);}}
        >
          <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(2,8,16,0.93)',border:'1px solid rgba(0,212,255,0.4)',borderRadius:14,padding:'8px 16px',backdropFilter:'blur(14px)',boxShadow:'0 4px 20px rgba(0,0,0,0.5)',position:'relative'}}>
            <button onClick={()=>setCogPanelVisible(false)} style={{position:'absolute',top:3,right:5,background:'none',border:'none',color:'#5A7A90',fontSize:'0.65rem',cursor:'pointer',lineHeight:1}}>✕</button>
            <div style={{textAlign:'center',minWidth:52}}><div style={{color:'#5A7A90',fontSize:'0.55rem',letterSpacing:1,textTransform:'uppercase'}}>SOG</div><div style={{color:'#00FF88',fontFamily:'monospace',fontSize:'1.6rem',fontWeight:900,lineHeight:1.1}}>{livePos.sog.toFixed(1)}</div><div style={{color:'#5A7A90',fontSize:'0.5rem'}}>knots</div></div>
            <div style={{width:1,height:46,background:'rgba(0,212,255,0.2)',flexShrink:0}}/>
            <div style={{textAlign:'center',minWidth:52}}><div style={{color:'#5A7A90',fontSize:'0.55rem',letterSpacing:1,textTransform:'uppercase'}}>COG</div><div style={{color:'#00D4FF',fontFamily:'monospace',fontSize:'1.6rem',fontWeight:900,lineHeight:1.1}}>{livePos.cog.toFixed(0)}°</div><div style={{color:'#5A7A90',fontSize:'0.5rem'}}>true</div></div>
            <div style={{width:1,height:46,background:'rgba(0,212,255,0.2)',flexShrink:0}}/>
            <div style={{textAlign:'center',minWidth:80}}>
              <div style={{color:'#5A7A90',fontSize:'0.55rem',letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>ROT</div>
              <RotGauge rotRef={rotValueRef} size={70}/>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <div style={{position:'absolute',left:hudPos.x,top:hudPos.y,zIndex:600,background:S.bg,border:`1px solid ${gpsOn?S.bd:'rgba(42,64,85,0.4)'}`,borderRadius:10,minWidth:182,touchAction:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE} onMouseDown={e=>{if(e.button!==0)return;hudDragRef.current={dx:e.clientX-hudPos.x,dy:e.clientY-hudPos.y};const mm=ev=>{if(!hudDragRef.current)return;setHudPos({x:Math.max(0,Math.min(window.innerWidth-185,ev.clientX-hudDragRef.current.dx)),y:Math.max(50,Math.min(window.innerHeight-200,ev.clientY-hudDragRef.current.dy))});};const mu=()=>{hudDragRef.current=null;window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',mu);};window.addEventListener('mousemove',mm);window.addEventListener('mouseup',mu);}}>
        <div style={{display:'flex',alignItems:'center',padding:'6px 10px',gap:5,cursor:'grab',borderBottom:'1px solid rgba(0,212,255,0.12)'}}>
          <span style={{color:S.dm,fontSize:'0.7rem',flex:1}}>⠸ {shipProfile?.name||'SHIP DATA'}</span>
          <button onClick={()=>setTogCollapsed(v=>!v)} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:4,padding:'1px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{togCollapsed?'▼':'▲'} CTRL</button>
          <button onClick={()=>setAutoCenterRaw(v=>!v)} style={{background:autoCenter?'rgba(0,255,136,0.15)':'transparent',border:`1px solid ${autoCenter?S.gn:S.vd}`,color:autoCenter?S.gn:S.dm,borderRadius:4,padding:'1px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{autoCenter?'CTR':'FREE'}</button>
          <button onClick={()=>setHudCollapsed(v=>!v)} style={{background:'transparent',border:'none',color:S.dm,fontSize:'0.8rem',cursor:'pointer'}}>{hudCollapsed?'▼':'▲'}</button>
        </div>
        <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:5}}>
          {!togCollapsed&&(<div style={{display:'flex',flexDirection:'column',gap:4,paddingBottom:6,borderBottom:'1px solid rgba(0,212,255,0.1)'}}>
            <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:S.tx,minHeight:26}}><input type="checkbox" checked={gpsOn} onChange={e=>setGpsOn(e.target.checked)}/>📍 GPS</label>
            <div style={{display:'flex',alignItems:'center',gap:5,fontSize:S.xs,color:S.dm}}><span>📡 AIS:</span><span style={{color:aisSource==='off'?S.vd:(aisSource==='internet'?aisStatus:localAisStatus)==='connected'?S.gn:S.gd}}>{aisSource==='off'?'Off':(aisSource==='internet'?aisStatus:localAisStatus)==='connected'?`${aisSource==='internet'?Object.keys(aisTargets).length:localAisCount} vessels`:'connecting…'}</span></div>
            <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:depthCheckOn?S.cy:S.tx,minHeight:24}}><input type="checkbox" checked={depthCheckOn} onChange={e=>setDepthCheckOn(e.target.checked)}/>🔍 Depth Check</label>
            <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:rbMode?S.gd:S.tx,minHeight:24,borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:4}}>
              <input type="checkbox" checked={rbMode} onChange={e=>{const on=e.target.checked;rbModeRef.current=on;setRbMode(on);if(!on){rbTargetRef.current=null;setRbResult(null);if(leafRef.current){if(layersRef.current.rbLine)leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker)leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=null;layersRef.current.rbMarker=null;}}}}/>
              📐 {rbMode?'Tap map → R/B':'Range & Bearing'}
            </label>
            {rbResult&&rbMode&&(<div style={{background:'rgba(0,0,0,0.4)',borderRadius:5,padding:'5px 7px',border:'1px solid rgba(255,215,0,0.3)'}}><div style={{display:'flex',gap:10}}>{[['RNG',rbResult.rangeNM+' NM',S.gd],['BRG',rbResult.bearing+'°T',S.gd]].map(([k,v,c])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.78rem',fontWeight:700}}>{v}</div></div>))}{livePos?.sog>0.2&&<div><div style={{color:S.dm,fontSize:S.lb}}>TTG</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.78rem',fontWeight:700}}>{(()=>{const h=parseFloat(rbResult.rangeNM)/livePos.sog,hr=Math.floor(h),mn=Math.round((h-hr)*60);return hr>0?`${hr}h${mn}m`:`${mn}m`;})()}</div></div>}</div></div>)}
            {gpsOn&&(<div><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>COG VECTOR</div><div style={{display:'flex',gap:3}}>{[6,12,20,30,60].map(n=>(<button key={n} onClick={()=>setVectorMins(n)} style={{background:vectorMins===n?'rgba(0,212,255,0.2)':'transparent',border:`1px solid ${vectorMins===n?S.cy:S.vd}`,color:vectorMins===n?S.cy:S.dm,borderRadius:4,padding:'2px 5px',fontSize:'0.62rem',cursor:'pointer'}}>{n}m</button>))}</div></div>)}
            {activeRoute&&(<div><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>XTD</div><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{[0.1,0.25,0.5,1.0,2.0].map(n=>(<button key={n} onClick={()=>setXtdNM(n)} style={{background:xtdNM===n?'rgba(255,179,0,0.2)':'transparent',border:`1px solid ${xtdNM===n?S.gd:S.vd}`,color:xtdNM===n?S.gd:S.dm,borderRadius:4,padding:'2px 5px',fontSize:'0.58rem',cursor:'pointer'}}>{n}NM</button>))}</div></div>)}
          </div>)}
          {livePos?(<div>
            <div style={{color:S.cy,fontFamily:'monospace',fontSize:'0.75rem',lineHeight:1.8}}>{toDMS(livePos.lat,true)}<br/>{toDMS(livePos.lon,false)}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px',marginTop:4}}>{[['SOG',`${livePos.sog.toFixed(1)} kn`,S.gn],['COG',`${livePos.cog.toFixed(0)}°T`,S.gn]].map(([k,v,c])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>))}</div>
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:3}}>
              <div><div style={{color:S.dm,fontSize:S.lb}}>ROT</div><RotGauge rotRef={rotValueRef} size={52}/></div>
              {offTrackAlarm&&<div style={{background:'rgba(255,71,87,0.2)',border:'1px solid #FF4757',borderRadius:4,padding:'2px 5px',fontSize:'0.56rem',color:S.rd,fontWeight:700}}>⚠ OFF TRACK</div>}
            </div>
            {!hudCollapsed&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 8px',marginTop:3}}>{[['HDG',`${(livePos.heading||livePos.cog||0).toFixed(0)}°`,S.gd],['ACC',`${(livePos.acc||0).toFixed(0)}m`,S.gd]].map(([k,v,c])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:c,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>))}</div>)}
            {!hudCollapsed&&etaResult&&(<div style={{marginTop:5,borderTop:'1px solid rgba(0,255,136,0.15)',paddingTop:4}}>
              <div style={{display:'flex',justifyContent:'space-between',gap:4}}>
                {[['TOTAL',etaResult.totalNM+' NM'],['SAILED',etaResult.sailedNM+' NM'],['REMAIN',etaResult.remainNM+' NM']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.75rem',fontWeight:700}}>{v}</div></div>))}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',gap:4,marginTop:3}}>
                {[['ETA',etaResult.hrs+'h '+etaResult.mins+'m'],['→ DEST',etaResult.finalWpName]].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.72rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:80}}>{v}</div></div>))}
              </div>
              {etaResult.wpName!==etaResult.finalWpName&&<div style={{color:S.dm,fontSize:'0.58rem',marginTop:2}}>→ {etaResult.wpName}: <span style={{color:S.cy,fontFamily:'monospace'}}>{etaResult.remainToTargetNM} NM</span></div>}
              {etaResult.arrivalStr&&<div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.62rem',marginTop:2}}>🕐 {etaResult.arrivalStr}</div>}
            </div>)}
          </div>):(gpsOn?<div style={{color:S.dm,fontSize:S.sm,fontStyle:'italic'}}>Acquiring GPS…</div>:<div style={{color:S.vd,fontSize:S.xs}}>Enable GPS to track vessel</div>)}
        </div>
      </div>

      {/* Side panel */}
      {panelCollapsed?(
        <button onClick={()=>setPanelCollapsed(false)} style={{position:'absolute',top:'50%',right:0,transform:'translateY(-50%)',background:'rgba(4,12,26,0.95)',border:`1px solid ${S.bd}`,color:S.cy,borderRadius:'8px 0 0 8px',padding:'12px 6px',fontSize:'0.7rem',cursor:'pointer',zIndex:500,writingMode:'vertical-rl'}}>◀ PANEL</button>
      ):(
        <div style={{position:'absolute',top:56,right:8,background:S.bg,border:`1px solid ${S.bd}`,borderRadius:10,padding:'8px 10px',zIndex:500,width:172,backdropFilter:'blur(10px)',maxHeight:'82vh',display:'flex',flexDirection:'column',boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}}>
          <div style={{display:'flex',alignItems:'center',marginBottom:8,gap:3,flexWrap:'wrap'}}>
            {[['route','RTE'],['rb','R/B'],['charts','CHT'],['enc','ENC'],['zones','🌐'],['ais_src','📡'],['eta','ETA'],['db','🗄'],['anchor','⚓'],['guard','🔴'],['alarms','🔔'],['wx','🌤'],['tools','🔧']].map(([p,l])=>(<button key={p} onClick={()=>setActivePanel(p)} style={{flex:1,minWidth:32,background:activePanel===p?'rgba(0,212,255,0.18)':'transparent',border:`1px solid ${activePanel===p?S.cy:S.vd}`,color:activePanel===p?S.cy:S.dm,borderRadius:5,padding:'3px 1px',fontSize:'0.52rem',cursor:'pointer'}}>{l}</button>))}
            <button onClick={()=>setPanelCollapsed(true)} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:5,padding:'3px 5px',fontSize:'0.65rem',cursor:'pointer'}}>▶</button>
          </div>
          <div style={{overflowY:'auto',overflowX:'hidden',flex:1,paddingRight:1}}>

          {activePanel==='route'&&(<div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:6,padding:'7px 10px',fontSize:S.sm,cursor:'pointer',display:'block',textAlign:'center'}}>📂 Load Route<input type="file" style={{display:'none'}} onChange={loadRoute}/></label>
            {activeRoute?.waypoints?.length>0&&(<div style={{borderTop:'1px solid rgba(0,212,255,0.15)',paddingTop:6}}>
              <div style={{color:S.cy,fontSize:S.sm,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{activeRoute.name}</div>
              <div style={{color:S.dm,fontSize:S.xs,marginBottom:4}}>{activeRoute.waypoints.length} WPs · <span style={{color:S.gn}}>{routeTotalNM(activeRoute.waypoints).toFixed(1)} NM</span></div>
              <button onClick={saveRoute} style={{width:'100%',background:'transparent',border:'1px solid rgba(0,212,255,0.4)',color:S.cy,borderRadius:5,padding:'5px',fontSize:S.xs,cursor:'pointer',marginBottom:4}}>💾 Save Route</button>
              <select value={selectedWpIdx} onChange={e=>setSelectedWpIdx(Number(e.target.value))} style={{width:'100%',background:'#060F1C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px',fontSize:S.xs,marginBottom:4}}>
                {activeRoute.waypoints.map((w,i)=><option key={i} value={i}>WP{String(i+1).padStart(2,'0')}{w.name?' '+w.name:''}</option>)}
              </select>
              {etaResult&&(<div style={{background:'#020810',borderRadius:5,padding:'6px 8px',border:'1px solid rgba(0,255,136,0.18)',marginBottom:4}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:4}}>{[['REMAIN',etaResult.remainNM+' NM'],['ETA',etaResult.hrs+'h '+etaResult.mins+'m']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:'0.5rem'}}>{k}</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{v}</div></div>))}</div>
                <div style={{color:S.dm,fontSize:'0.52rem',marginTop:2}}>→ {etaResult.finalWpName}</div>
                {etaResult.wpName!==etaResult.finalWpName&&<div style={{color:S.dm,fontSize:'0.52rem'}}>Next WP: <span style={{color:S.cy}}>{etaResult.wpName}</span> <span style={{color:S.gn,fontFamily:'monospace'}}>{etaResult.remainToTargetNM} NM</span></div>}
                {etaResult.arrivalStr&&<div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.62rem',marginTop:3}}>🕐 {etaResult.arrivalStr}</div>}
              </div>)}
              <button onClick={()=>{setActiveRoute(null);setEtaResult(null);setSelectedWpIdx(0);}} style={{width:'100%',background:'transparent',border:'1px solid rgba(255,71,87,0.45)',color:S.rd,borderRadius:5,padding:'5px',fontSize:S.xs,cursor:'pointer'}}>✕ Clear Route</button>
            </div>)}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>MY ROUTES ({savedRoutes.length})</div>
              <input placeholder="Search…" value={savedSearch} onChange={e=>setSavedSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.tx,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.xs,outline:'none',marginBottom:3}}/>
              <div style={{maxHeight:100,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
                {filteredSaved.map((r,i)=>(<div key={i} style={{display:'flex',gap:3}}><button onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);}} style={{flex:1,background:'#060F1C',border:`1px solid ${activeRoute?.name===r.name?S.cy:S.vd}`,color:activeRoute?.name===r.name?S.cy:S.tx,borderRadius:5,padding:'4px 6px',fontSize:S.xs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name||'—'}</button><button onClick={()=>delRoute(r.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.rd,borderRadius:4,padding:'3px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button></div>))}
                {filteredSaved.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>No saved routes</div>}
              </div>
            </div>
          </div>)}

          {activePanel==='rb'&&(<div style={{display:'flex',flexDirection:'column',gap:7}}>
            <label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:S.sm,color:S.tx}}><input type="checkbox" checked={rbMode} onChange={e=>{const on=e.target.checked;rbModeRef.current=on;setRbMode(on);if(!on){rbTargetRef.current=null;setRbResult(null);if(leafRef.current){if(layersRef.current.rbLine)leafRef.current.removeLayer(layersRef.current.rbLine);if(layersRef.current.rbMarker)leafRef.current.removeLayer(layersRef.current.rbMarker);layersRef.current.rbLine=null;layersRef.current.rbMarker=null;}}}}/>📐 Range & Bearing</label>
            {rbResult&&(<div style={{background:'#020810',borderRadius:7,padding:'8px 10px',border:'1px solid rgba(255,215,0,0.3)'}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>{[['RANGE',rbResult.rangeNM+' NM'],['BRG',rbResult.bearing+'°T']].map(([k,v])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb}}>{k}</div><div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.9rem',fontWeight:700}}>{v}</div></div>))}</div>{livePos?.sog>0.2&&(<div style={{borderTop:'1px solid rgba(255,215,0,0.2)',paddingTop:4,marginBottom:4}}><div style={{color:S.dm,fontSize:S.lb}}>TTG @ {livePos.sog.toFixed(1)}kn</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.82rem',fontWeight:700}}>{(()=>{const h=parseFloat(rbResult.rangeNM)/livePos.sog,hr=Math.floor(h),mn=Math.round((h-hr)*60);return hr>0?`${hr}h ${mn}m`:`${mn} min`;})()}</div></div>)}<div style={{color:S.dm,fontSize:S.xs}}>{toDMS(parseFloat(rbResult.lat),true)}<br/>{toDMS(parseFloat(rbResult.lon),false)}</div></div>)}
          </div>)}

          {activePanel==='charts'&&(<div style={{display:'flex',flexDirection:'column',gap:6}}>
            <label style={{background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:6,padding:'7px 10px',fontSize:S.sm,cursor:'pointer',display:'block',textAlign:'center'}}>🗺️ Load Chart<input type="file" accept=".xml,.geojson,.json,.kml,.gpx" style={{display:'none'}} onChange={loadChart}/></label>
            {chartOverlays.length>0&&(<div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>ACTIVE ({chartOverlays.length})</div>{chartOverlays.map((c,i)=>(<div key={i} style={{display:'flex',alignItems:'center',gap:3,marginBottom:2}}><div style={{flex:1,overflow:'hidden'}}><div style={{color:'#00E5FF',fontSize:S.xs,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🗺 {c.name}</div></div><button onClick={()=>{const found=chartLayersRef.current.find(x=>x.id===c.name);if(found)saveChart({name:c.name,summary:c.summary,data:found.layer.toGeoJSON?.()});}} style={{background:'transparent',border:'1px solid rgba(0,212,255,0.4)',color:S.cy,borderRadius:4,padding:'2px 5px',fontSize:'0.6rem',cursor:'pointer'}}>💾</button><button onClick={()=>removeChart(c.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.rd,borderRadius:4,padding:'2px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button></div>))}</div>)}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:5}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>MY CHARTS ({savedCharts.length})</div>
              <input placeholder="Search…" value={chartSearch} onChange={e=>setChartSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.tx,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.xs,outline:'none',marginBottom:3}}/>
              <div style={{maxHeight:90,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>{savedCharts.filter(c=>!chartSearch.trim()||(c.name||'').toLowerCase().includes(chartSearch.toLowerCase())).slice(0,50).map((c,i)=>(<div key={i} style={{display:'flex',gap:3}}><button onClick={()=>loadSavedChart(c)} style={{flex:1,background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:5,padding:'4px 6px',fontSize:S.xs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>🗺 {c.name}</button><button onClick={()=>delSavedChart(c.name)} style={{background:'transparent',border:'1px solid rgba(255,71,87,0.35)',color:S.rd,borderRadius:4,padding:'3px 6px',fontSize:'0.65rem',cursor:'pointer'}}>✕</button></div>))}{savedCharts.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>No saved charts</div>}</div>
            </div>
          </div>)}

          {activePanel==='enc'&&(<div style={{display:'flex',flexDirection:'column',gap:5}}>
            <div style={{color:S.dm,fontSize:S.lb,marginBottom:2}}>ENC DEPTH LAYERS</div>
            {DEPTH_SOURCES.map(d=>{const on=depthSources.has(d.id);return(<button key={d.id} onClick={()=>toggleDepth(d.id)} title={d.desc} style={{display:'flex',alignItems:'center',gap:5,background:on?'rgba(0,212,255,0.15)':'transparent',border:`1px solid ${on?S.cy:S.vd}`,color:on?S.cy:S.dm,borderRadius:5,padding:'4px 7px',fontSize:'0.65rem',cursor:'pointer',textAlign:'left',width:'100%'}}><span>{d.emoji}</span><span style={{flex:1}}>{d.label}</span>{on&&<span style={{color:S.cy,fontSize:'0.65rem'}}>✓</span>}</button>);})}
            <button onClick={()=>toggleDepth('scs')} title="S-57 ENC: Karimata Strait / Bangka Belitung — depth contours, soundings, buoys" style={{display:'flex',alignItems:'center',gap:5,background:depthSources.has('scs')?'rgba(0,212,255,0.15)':'transparent',border:`1px solid ${depthSources.has('scs')?S.cy:S.vd}`,color:depthSources.has('scs')?S.cy:S.dm,borderRadius:5,padding:'4px 7px',fontSize:'0.65rem',cursor:'pointer',textAlign:'left',width:'100%'}}><span>🇮🇩</span><span style={{flex:1}}>Indonesia Karimata ENC</span>{depthSources.has('scs')&&<span style={{color:S.cy,fontSize:'0.65rem'}}>✓</span>}</button>
            {/* S-52 depth legend — shows mariner's current contour thresholds */}
            {depthSources.has('scs')&&(
              <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:6,padding:'6px 8px',marginTop:2}}>
                <div style={{color:S.dm,fontSize:S.lb,marginBottom:4}}>S-52 SOUNDING LEGEND</div>
                {[
                  ['#FF2020',`≤ ${shallowDepth}m`,'DEPVS — Danger'],
                  ['#FF9500',`≤ ${safetyDepth}m`,'DEPMS — Safety'],
                  ['#FFD700',`≤ ${deepDepth}m`,'DEPMD — Moderate'],
                  ['#00D4FF',`> ${deepDepth}m`,'DEPDW — Deep'],
                ].map(([col,range,label])=>(
                  <div key={label} style={{display:'flex',alignItems:'center',gap:5,marginBottom:3}}>
                    <div style={{width:10,height:10,borderRadius:2,background:col,flexShrink:0}}/>
                    <span style={{color:col,fontFamily:'monospace',fontSize:'0.58rem',fontWeight:700,width:40}}>{range}</span>
                    <span style={{color:S.vd,fontSize:'0.55rem'}}>{label}</span>
                  </div>
                ))}
                <div style={{color:S.vd,fontSize:'0.52rem',marginTop:3,borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:3}}>Adjust in ☰ → 🌊 Contours</div>
              </div>
            )}
            {depthSources.size>0&&<button onClick={()=>setDepthSources(new Set())} style={{background:'transparent',border:`1px solid rgba(255,71,87,0.4)`,color:S.rd,borderRadius:5,padding:'4px',fontSize:S.xs,cursor:'pointer'}}>⭕ Clear All</button>}
          </div>)}

          {activePanel==='ais_src'&&(<div style={{display:'flex',flexDirection:'column',gap:6}}>
            <div style={{color:S.dm,fontSize:S.lb,marginBottom:2}}>AIS SOURCE</div>
            {[['bridge','📡 AIS PILOT (WiFi)','#00FF88'],['internet','🌐 Internet','#FFD700'],['off','⭕ Off','#4A6080']].map(([id,lb,col])=>(<label key={id} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:'0.72rem',color:aisSource===id?col:S.dm,background:aisSource===id?`${col}18`:'transparent',border:`1px solid ${aisSource===id?col+'50':'transparent'}`,borderRadius:5,padding:'4px 8px',minHeight:26}}><input type="radio" name="aisSrc" value={id} checked={aisSource===id} onChange={()=>setAisSource(id)} style={{accentColor:col}}/><span style={{flex:1}}>{lb}</span>{aisSource===id&&id!=='off'&&<span style={{fontSize:'0.6rem',color:(aisSource==='internet'?aisStatus:localAisStatus)==='connected'?'#00FF88':'#FFD700'}}>{(aisSource==='internet'?aisStatus:localAisStatus)==='connected'?`✅${aisSource==='internet'?Object.keys(aisTargets).length:localAisCount}`:'⏳'}</span>}</label>))}
            {aisSource==='bridge'&&(
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <input value={localAisHost} onChange={e=>setLocalAisHost(e.target.value)} placeholder="ws://192.168.x.x:4002" style={{width:'100%',boxSizing:'border-box',background:'#06101C',color:S.cy,border:'1px solid #1A3050',borderRadius:4,padding:'5px 7px',fontSize:'0.63rem',outline:'none'}}/>
              </div>
            )}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:5}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>OWN MMSI (filter own ship)</div>
              <input value={shipProfile?.mmsi||''} onChange={e=>setShipProfile(p=>({...p,mmsi:e.target.value}))} placeholder="Your vessel MMSI" style={{width:'100%',boxSizing:'border-box',background:'#06101C',color:S.gn,border:'1px solid #1A3050',borderRadius:4,padding:'5px 7px',fontSize:'0.63rem',outline:'none',fontFamily:'monospace'}}/>
              <div style={{color:S.vd,fontSize:'0.54rem',marginTop:2}}>Own vessel won't appear as AIS target</div>
            </div>
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:5}}><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>RANGE FILTER</div><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{[[0,'World'],[5,'5'],[10,'10'],[20,'20'],[50,'50'],[100,'100']].map(([n,l])=>(<button key={n} onClick={()=>setAisRange(n)} style={{background:aisRange===n?'rgba(0,212,255,0.18)':'transparent',border:`1px solid ${aisRange===n?S.cy:S.vd}`,color:aisRange===n?S.cy:S.dm,borderRadius:5,padding:'3px 6px',fontSize:'0.62rem',cursor:'pointer'}}>{l}{n>0?'NM':''}</button>))}</div></div>
            {localAisAlert&&<div style={{background:'rgba(255,32,32,0.15)',border:'1px solid #FF3030',borderRadius:5,padding:'5px 7px',cursor:'pointer'}} onClick={()=>setLocalAisAlert(null)}><div style={{color:'#FF5050',fontSize:'0.72rem',fontWeight:700}}>⚠ CPA {localAisAlert?.cpa}NM — {localAisAlert?.name||localAisAlert?.mmsi}</div></div>}
            <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:S.xs,color:showAllAisVectors?S.cy:S.dm,background:showAllAisVectors?'rgba(0,212,255,0.12)':'transparent',border:`1px solid ${showAllAisVectors?S.cy:S.vd}`,borderRadius:5,padding:'4px 7px',minHeight:24}}>
              <input type="checkbox" checked={showAllAisVectors} onChange={e=>setShowAllAisVectors(e.target.checked)} style={{accentColor:S.cy}}/><span>{showAllAisVectors?'All COG vectors ON':'Tap target to show'}</span>
            </label>
          </div>)}

          {activePanel==='eta'&&(<div style={{display:'flex',flexDirection:'column',gap:6}}>
            {activeRoute?.waypoints?.length>0?(<>{etaResult&&(<div style={{background:'#020810',borderRadius:6,padding:'8px',border:'1px solid rgba(0,255,136,0.2)',marginBottom:4}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 8px',marginBottom:4}}>
                <div><div style={{color:S.dm,fontSize:S.lb}}>TOTAL ROUTE</div><div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.85rem',fontWeight:700}}>{etaResult.totalNM} NM</div></div>
                <div><div style={{color:S.dm,fontSize:S.lb}}>SAILED</div><div style={{color:S.cy,fontFamily:'monospace',fontSize:'0.85rem',fontWeight:700}}>{etaResult.sailedNM} NM</div></div>
                <div><div style={{color:S.dm,fontSize:S.lb}}>REMAINING</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.85rem',fontWeight:700}}>{etaResult.remainNM} NM</div></div>
                <div><div style={{color:S.dm,fontSize:S.lb}}>ETA</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.85rem',fontWeight:700}}>{etaResult.hrs}h {etaResult.mins}m</div></div>
              </div>
              <div style={{borderTop:'1px solid rgba(0,212,255,0.12)',paddingTop:4,marginBottom:3}}>
                <div style={{color:S.dm,fontSize:S.lb}}>DESTINATION</div>
                <div style={{color:S.cy,fontFamily:'monospace',fontSize:'0.72rem',fontWeight:700}}>{etaResult.finalWpName}</div>
              </div>
              {etaResult.wpName!==etaResult.finalWpName&&<div style={{background:'rgba(0,212,255,0.06)',borderRadius:4,padding:'4px 6px',marginBottom:4}}>
                <div style={{color:S.dm,fontSize:S.lb}}>→ NEXT TARGET ({etaResult.wpName})</div>
                <div style={{color:S.cy,fontFamily:'monospace',fontSize:'0.78rem',fontWeight:700}}>{etaResult.remainToTargetNM} NM</div>
              </div>}
              {etaResult.arrivalStr&&<div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.62rem',borderTop:'1px solid rgba(255,215,0,0.15)',paddingTop:4}}>🕐 {etaResult.arrivalStr}</div>}
            </div>)}<ETACalculator totalNM={etaResult?.totalNM?parseFloat(etaResult.totalNM):routeTotalNM(activeRoute?.waypoints||[])}/></>):<div style={{color:S.dm,fontSize:S.sm,fontStyle:'italic',textAlign:'center',padding:'16px 0'}}>Load a route first</div>}
          </div>)}

          {activePanel==='zones'&&(<div style={{display:'flex',flexDirection:'column',gap:5}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:2}}><div style={{color:S.dm,fontSize:S.lb}}>MARITIME ZONES</div>{Object.values(zoneOverlays).some(Boolean)&&<button onClick={()=>setZoneOverlays({})} style={{background:'transparent',border:'none',color:S.rd,fontSize:'0.55rem',cursor:'pointer'}}>⭕ Off</button>}</div>
            {ZONE_OVERLAY_CFG.map(z=>{const on=!!zoneOverlays[z.k];return(<button key={z.k} onClick={()=>toggleZoneOverlay(z.k)} style={{display:'flex',alignItems:'center',gap:6,background:on?`${z.color}18`:'transparent',border:`1px solid ${on?z.color:S.vd}`,color:on?z.color:S.dm,borderRadius:5,padding:'5px 8px',fontSize:'0.68rem',cursor:'pointer',width:'100%',textAlign:'left',marginBottom:3}}><div style={{width:10,height:10,borderRadius:2,background:z.color,flexShrink:0,opacity:on?1:0.4}}/><div style={{flex:1}}><div style={{fontWeight:on?700:400,fontSize:'0.68rem'}}>{z.label}</div><div style={{fontSize:'0.56rem',color:on?z.color+'cc':S.vd,marginTop:1}}>{z.desc}</div></div>{on&&<span style={{fontSize:'0.6rem',color:z.color}}>✓</span>}</button>);})}
          </div>)}

          {activePanel==='db'&&(<div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>📍 ROUTE DB ({(sheetRoutes||[]).length})</div><input placeholder="Name, port…" value={dbRouteSearch} onChange={e=>setDbRouteSearch(e.target.value)} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.tx,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.xs,outline:'none',marginBottom:3}}/><div style={{maxHeight:120,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>{filteredDbRoutes.map((r,i)=>(<button key={i} onClick={()=>{setActiveRoute(r);setSelectedWpIdx((r.waypoints?.length||1)-1);setDbRouteSearch('');notify(`✓ ${r.name||r.Name||'Route'}`,'error');}} style={{background:'#060F1C',border:`1px solid ${S.vd}`,color:S.tx,borderRadius:5,padding:'5px 7px',fontSize:S.xs,cursor:'pointer',textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📍 {r.name||r.Name||'Unnamed'}</button>))}{filteredDbRoutes.length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>No routes</div>}</div></div>
          </div>)}

          {activePanel==='anchor'&&(<div style={{display:'flex',flexDirection:'column',gap:7}}>
            <div style={{color:S.dm,fontSize:S.lb}}>⚓ ANCHOR WATCH</div>
            <div style={{background:'rgba(255,215,0,0.05)',border:'1px solid rgba(255,215,0,0.2)',borderRadius:7,padding:'8px'}}>
              <div style={{color:S.gd,fontSize:S.xs,fontWeight:700,marginBottom:5}}>📐 WATCH CIRCLE CALC</div>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                <div><div style={{color:S.dm,fontSize:S.lb,marginBottom:2}}>Ship LOA (m)</div><input type="number" value={anchorShipLengthM} onChange={e=>setAnchorShipLengthM(Number(e.target.value))} min={10} max={400} style={{width:'100%',boxSizing:'border-box',background:'#06101C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:5,padding:'4px 7px',fontSize:S.xs,outline:'none',fontFamily:'monospace'}}/></div>
                <div><div style={{color:S.dm,fontSize:S.lb,marginBottom:2}}>Shackles (1 = 27.5m)</div><div style={{display:'flex',gap:2,flexWrap:'wrap'}}>{[1,2,3,4,5,6,7,8].map(n=>(<button key={n} onClick={()=>setAnchorShackles(n)} style={{background:anchorShackles===n?'rgba(255,215,0,0.2)':'transparent',border:`1px solid ${anchorShackles===n?S.gd:S.vd}`,color:anchorShackles===n?S.gd:S.dm,borderRadius:4,padding:'2px 5px',fontSize:S.xs,cursor:'pointer'}}>{n}</button>))}</div></div>
                <div style={{background:'rgba(0,0,0,0.3)',borderRadius:5,padding:'5px 7px',border:'1px solid rgba(255,215,0,0.25)'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'3px'}}>
                    <div><div style={{color:S.dm,fontSize:S.lb}}>Cable</div><div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.72rem',fontWeight:700}}>{(anchorShackles*27.5).toFixed(0)}m</div></div>
                    <div><div style={{color:S.dm,fontSize:S.lb}}>Total</div><div style={{color:S.gd,fontFamily:'monospace',fontSize:'0.72rem',fontWeight:700}}>{(anchorShipLengthM+anchorShackles*27.5+30).toFixed(0)}m</div></div>
                    <div><div style={{color:S.dm,fontSize:S.lb}}>Radius</div><div style={{color:S.gn,fontFamily:'monospace',fontSize:'0.72rem',fontWeight:700}}>{anchorWatchCircleNM().toFixed(3)}NM</div></div>
                  </div>
                  <div style={{color:S.vd,fontSize:'0.52rem',marginTop:2}}>LOA + chain + 30m buffer</div>
                </div>
                <button onClick={()=>setAnchorRadius(parseFloat(anchorWatchCircleNM().toFixed(3)))} style={{background:'rgba(255,215,0,0.1)',border:'1px solid rgba(255,215,0,0.5)',color:S.gd,borderRadius:5,padding:'4px',fontSize:S.xs,cursor:'pointer'}}>↑ Apply as alarm radius</button>
              </div>
            </div>
            {!anchorWatchOn?<div style={{display:'flex',flexDirection:'column',gap:5}}>
              <div style={{color:S.dm,fontSize:S.xs}}>Manual radius: <span style={{color:S.gd}}>{anchorRadius}NM ({(anchorRadius*1852).toFixed(0)}m)</span></div>
              <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{[0.1,0.2,0.3,0.5,1.0].map(r=>(<button key={r} onClick={()=>setAnchorRadius(r)} style={{background:anchorRadius===r?'rgba(255,215,0,0.2)':'transparent',border:`1px solid ${anchorRadius===r?S.gd:S.vd}`,color:anchorRadius===r?S.gd:S.dm,borderRadius:5,padding:'3px 6px',fontSize:S.xs,cursor:'pointer'}}>{r}NM</button>))}</div>
              <button onClick={()=>{if(!livePos){notify('Enable GPS first','error');return;}setAnchorPos({lat:livePos.lat,lon:livePos.lon});setAnchorWatchOn(true);notify('⚓ Anchor watch started','error');}} style={{background:'rgba(255,215,0,0.15)',border:'1px solid #FFD700',color:S.gd,borderRadius:7,padding:'9px',fontSize:S.sm,cursor:'pointer',fontWeight:700}}>⚓ Drop Anchor Here</button>
            </div>:<div style={{display:'flex',flexDirection:'column',gap:5}}>
              <div style={{background:anchorAlarm?'rgba(255,32,32,0.2)':'rgba(0,255,136,0.1)',border:`1px solid ${anchorAlarm?S.rd:S.gn}`,borderRadius:7,padding:'8px',textAlign:'center'}}><div style={{color:anchorAlarm?S.rd:S.gn,fontWeight:700,fontSize:S.sm}}>{anchorAlarm?'⚠ DRAGGING!':'✓ Holding'}</div>{livePos&&anchorPos&&<div style={{color:S.dm,fontSize:S.xs}}>{distNM(livePos.lat,livePos.lon,anchorPos.lat,anchorPos.lon).toFixed(3)}NM from drop</div>}</div>
              <button onClick={()=>{setAnchorWatchOn(false);setAnchorPos(null);setAnchorAlarm(false);}} style={{background:'transparent',border:`1px solid ${S.rd}`,color:S.rd,borderRadius:6,padding:'7px',fontSize:S.xs,cursor:'pointer'}}>⛔ Stop Watch</button>
            </div>}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:6,color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>
              ⚙ Alarm settings → 🔔 Alarms panel
            </div>
          </div>)}

          {activePanel==='guard'&&(<div style={{display:'flex',flexDirection:'column',gap:7}}>
            <div style={{color:S.dm,fontSize:S.lb}}>🔴 GUARD ZONE</div>
            <div style={{color:S.vd,fontSize:S.xs,lineHeight:1.5}}>Alarm when any AIS target enters zone around own vessel. Works offline with SafePilot.</div>
            <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{[[0.5,'0.5'],[1,'1'],[2,'2'],[3,'3'],[5,'5'],[10,'10']].map(([v,l])=>(<button key={v} onClick={()=>setGuardZoneRadiusNM(v)} style={{background:guardZoneRadiusNM===v?'rgba(255,107,53,0.2)':'transparent',border:`1px solid ${guardZoneRadiusNM===v?'#FF6B35':S.vd}`,color:guardZoneRadiusNM===v?'#FF6B35':S.dm,borderRadius:5,padding:'3px 6px',fontSize:S.xs,cursor:'pointer'}}>{l}NM</button>))}</div>
            <input type="number" min={0.1} max={50} step={0.1} value={guardZoneRadiusNM} onChange={e=>setGuardZoneRadiusNM(Number(e.target.value)||2)} style={{width:'100%',boxSizing:'border-box',background:'#06101C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:5,padding:'4px 7px',fontSize:S.xs,outline:'none',fontFamily:'monospace'}}/>
            <button onClick={()=>setGuardZoneOn(v=>!v)} style={{background:guardZoneOn?'rgba(255,32,32,0.2)':'rgba(255,107,53,0.1)',border:`2px solid ${guardZoneOn?'#FF2020':'#FF6B35'}`,color:guardZoneOn?'#FF2020':'#FF6B35',borderRadius:8,padding:'10px',fontSize:S.sm,cursor:'pointer',fontWeight:700,textAlign:'center'}}>{guardZoneOn?`🔴 ACTIVE — ${guardZoneRadiusNM}NM`:'🔴 Activate Guard Zone'}</button>
            {guardZoneOn&&(<div style={{background:guardZoneAlarm?'rgba(255,32,32,0.15)':'rgba(0,255,136,0.08)',border:`1px solid ${guardZoneAlarm?'#FF2020':S.gn}`,borderRadius:7,padding:'8px'}}><div style={{color:guardZoneAlarm?'#FF2020':S.gn,fontWeight:700,fontSize:S.xs,marginBottom:guardZoneTargets.length>0?4:0}}>{guardZoneAlarm?`⚠ ${guardZoneTargets.length} TARGET${guardZoneTargets.length!==1?'S':''} INSIDE`:'✓ Zone Clear'}</div>{guardZoneTargets.map((n,i)=>(<div key={i} style={{color:'#FF5050',fontSize:S.lb,fontFamily:'monospace'}}>▶ {n}</div>))}</div>)}
          </div>)}

          {activePanel==='alarms'&&(<div style={{display:'flex',flexDirection:'column',gap:6}}>
            {/* Master mute */}
            <button onClick={()=>setAlarmsMuted(v=>!v)} style={{width:'100%',background:alarmsMuted?'rgba(255,71,87,0.2)':'rgba(0,255,136,0.1)',border:`2px solid ${alarmsMuted?S.rd:S.gn}`,color:alarmsMuted?S.rd:S.gn,borderRadius:8,padding:'10px',fontSize:S.sm,cursor:'pointer',fontWeight:700,textAlign:'center'}}>
              {alarmsMuted?'🔕 ALL ALARMS MUTED — Tap to Unmute':'🔔 Alarms Active — Tap to Mute All'}
            </button>
            {/* Current active alarms status */}
            <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:6,padding:'7px 9px'}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:5}}>ACTIVE ALARMS</div>
              {[
                [offTrackAlarm,'⚠ OFF TRACK','#FF4757'],
                [speedAlarmTriggered,'⚡ OVERSPEED','#FF6B35'],
                [guardZoneAlarm,'🔴 GUARD ZONE','#FF2020'],
                [anchorAlarm,'⚓ ANCHOR DRAG','#FFD700'],
              ].map(([active,label,col])=>(
                <div key={label} style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:active?col:'#243850',flexShrink:0,boxShadow:active?`0 0 6px ${col}`:'none'}}/>
                  <span style={{color:active?col:S.vd,fontSize:'0.65rem',fontWeight:active?700:400}}>{label}</span>
                  {active&&<span style={{color:col,fontSize:'0.58rem',marginLeft:'auto',fontFamily:'monospace'}}>● ACTIVE</span>}
                </div>
              ))}
              {!offTrackAlarm&&!speedAlarmTriggered&&!guardZoneAlarm&&!anchorAlarm&&(
                <div style={{color:S.gn,fontSize:'0.62rem',fontStyle:'italic'}}>✓ All clear</div>
              )}
            </div>
            {/* Per alarm toggles */}
            <div style={{color:S.dm,fontSize:S.lb,marginTop:2}}>ALARM SETTINGS</div>
            {[
              ['offtrack','⚠ Off Track',`Alarm when ship exceeds XTD limit (${xtdNM}NM)`],
              ['collision','🚢 Collision CPA','CPA < 1.5NM & TCPA < 3h'],
              ['guard','🔴 Guard Zone',`Vessel inside ${guardZoneRadiusNM}NM`],
              ['anchor','⚓ Anchor Drag',`Outside ${anchorRadius}NM watch circle`],
              ['speed','⚡ Overspeed',`SOG > ${speedAlarmKn||'—'}kn`],
              ['wp','📍 WP Arrival',`Within ${wpArrivalNM}NM of waypoint`],
            ].map(([key,label,desc])=>(
              <div key={key} style={{display:'flex',alignItems:'center',gap:7,background:alarmToggles[key]?'rgba(0,212,255,0.06)':'rgba(0,0,0,0.2)',border:`1px solid ${alarmToggles[key]?'rgba(0,212,255,0.25)':S.vd}`,borderRadius:6,padding:'7px 9px'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:alarmToggles[key]?S.tx:S.vd,fontSize:'0.68rem',fontWeight:600}}>{label}</div>
                  <div style={{color:S.vd,fontSize:'0.55rem',marginTop:1}}>{desc}</div>
                </div>
                <button onClick={()=>setAlarmToggles(prev=>({...prev,[key]:!prev[key]}))} style={{background:alarmToggles[key]?'rgba(0,255,136,0.15)':'rgba(255,71,87,0.15)',border:`1px solid ${alarmToggles[key]?S.gn:S.rd}`,color:alarmToggles[key]?S.gn:S.rd,borderRadius:5,padding:'4px 8px',fontSize:'0.6rem',cursor:'pointer',flexShrink:0,fontWeight:700}}>
                  {alarmToggles[key]?'ON':'OFF'}
                </button>
              </div>
            ))}
            {/* Off track uses xtdNM — change XTD in HUD or Settings */}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:6}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>OFF TRACK THRESHOLD</div>
              <div style={{background:'rgba(0,212,255,0.06)',border:`1px solid rgba(0,212,255,0.2)`,borderRadius:6,padding:'7px 9px'}}>
                <div style={{color:S.cy,fontSize:'0.68rem',fontWeight:700}}>XTD Limit: {xtdNM}NM</div>
                <div style={{color:S.vd,fontSize:'0.58rem',marginTop:2}}>Alarm fires when ship crosses either side of the XTD corridor. Change XTD value in the HUD controls or ☰ Settings.</div>
              </div>
            </div>
            {/* Speed alarm quick set */}
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:6}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>SPEED ALARM LIMIT</div>
              <div style={{display:'flex',gap:2,flexWrap:'wrap',marginBottom:3}}>{[[0,'OFF'],[5,'5'],[8,'8'],[10,'10'],[12,'12'],[15,'15'],[18,'18'],[20,'20']].map(([v,l])=>(<button key={v} onClick={()=>{setSpeedAlarmKn(v);setSpeedAlarmTriggered(false);}} style={{background:speedAlarmKn===v?'rgba(255,107,53,0.2)':'transparent',border:`1px solid ${speedAlarmKn===v?'#FF6B35':S.vd}`,color:speedAlarmKn===v?'#FF6B35':S.dm,borderRadius:5,padding:'3px 4px',fontSize:S.xs,cursor:'pointer'}}>{l}</button>))}</div>
            </div>
          </div>)}

          {activePanel==='wx'&&(<div style={{display:'flex',flexDirection:'column',gap:7}}>
            <div style={{color:S.dm,fontSize:S.lb}}>🌤 WEATHER</div>
            <button onClick={()=>{const pos=livePos||{lat:1.29,lon:103.85};fetchWeather(pos.lat,pos.lon);}} disabled={weatherLoading} style={{background:'rgba(0,212,255,0.1)',border:`1px solid ${S.cy}`,color:S.cy,borderRadius:7,padding:'8px',fontSize:S.xs,cursor:'pointer',fontWeight:600}}>{weatherLoading?'⏳ Loading…':'🌐 Get Weather Here'}</button>
            {weatherData&&showWeather&&(<div style={{background:'rgba(0,0,0,0.3)',borderRadius:7,padding:'8px',border:`1px solid ${S.vd}`}}>{[['🌡 Temp',`${weatherData.temp?.toFixed(1)}°C`],['💨 Wind',`${weatherData.windSpd}kn / ${weatherData.windDir}°`],['👁 Vis',`${weatherData.visibility?.toFixed(1)}km`],['💧 Hum',`${weatherData.humidity}%`],['📊 Pres',`${weatherData.pressure}hPa`]].map(([k,v])=>(<div key={k} style={{display:'flex',justifyContent:'space-between',padding:'2px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}><span style={{color:S.dm,fontSize:'0.62rem'}}>{k}</span><span style={{color:S.tx,fontSize:'0.65rem',fontFamily:'monospace',fontWeight:600}}>{v}</span></div>))}</div>)}
          </div>)}

          {activePanel==='tools'&&(<div style={{display:'flex',flexDirection:'column',gap:7}}>
            <div style={{color:S.dm,fontSize:S.lb}}>🔧 TOOLS</div>
            <button onClick={exportTrack} style={{width:'100%',background:'rgba(0,200,150,0.1)',border:`1px solid ${S.gn}`,color:S.gn,borderRadius:7,padding:'8px',fontSize:S.xs,cursor:'pointer',fontWeight:600}}>⬇ Export GPX Track</button>
            <div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:6}}>
              <div style={{color:S.dm,fontSize:S.xs,marginBottom:4}}>📡 AIS ({Object.keys(aisTargets).length}) — nearest first</div>
              <div style={{maxHeight:150,overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
                {Object.values(aisTargets).sort((a,b)=>livePos?distNM(livePos.lat,livePos.lon,a.lat,a.lon)-distNM(livePos.lat,livePos.lon,b.lat,b.lon):0).slice(0,25).map(v=>{
                  const dist=livePos?distNM(livePos.lat,livePos.lon,v.lat,v.lon):null;
                  const brgDeg=livePos?brg(livePos.lat,livePos.lon,v.lat,v.lon):null;
                  const cp=livePos?computeCPA({lat:livePos.lat,lon:livePos.lon,sog:livePos.sog,cog:livePos.cog},{lat:v.lat,lon:v.lon,sog:v.sog,cog:v.cog}):{cpa:9999,tcpa:0};
                  return(<div key={v.mmsi} style={{background:dist&&dist<1?'rgba(255,32,32,0.15)':dist&&dist<3?'rgba(255,150,0,0.1)':'transparent',border:`1px solid ${S.vd}`,borderRadius:5,padding:'4px 6px',cursor:'pointer'}} onClick={()=>{if(leafRef.current)leafRef.current.setView([v.lat,v.lon],12);const pt=leafRef.current?.latLngToContainerPoint?.([v.lat,v.lon]);if(pt)setAisPopup({mmsi:String(v.mmsi),x:Math.min(pt.x+10,window.innerWidth-220),y:Math.min(pt.y,window.innerHeight-300),expanded:false});setSelectedAisMmsi(String(v.mmsi));}}>
                    <div style={{color:S.cy,fontSize:'0.65rem',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v.name||`MMSI ${v.mmsi}`}</div>
                    <div style={{color:S.dm,fontSize:'0.56rem',fontFamily:'monospace'}}>{dist!=null?dist.toFixed(1)+'NM':''}{brgDeg!=null?` ${brgDeg.toFixed(0)}°T`:''} · {(v.sog||0).toFixed(1)}kn {(v.cog||0).toFixed(0)}°</div>
                    <div style={{color:cp.cpa<1?'#FF3030':cp.cpa<3?'#FF9500':S.vd,fontSize:'0.54rem',fontFamily:'monospace'}}>CPA {cp.cpa<9000?cp.cpa.toFixed(2):'—'}NM TCPA {cp.tcpa.toFixed(2)}h</div>
                  </div>);
                })}
                {Object.keys(aisTargets).length===0&&<div style={{color:S.vd,fontSize:S.xs,fontStyle:'italic'}}>No AIS targets</div>}
              </div>
            </div>
            <button onClick={()=>setNightVision(v=>!v)} style={{background:nightVision?'rgba(255,0,0,0.15)':'transparent',border:`1px solid ${nightVision?'#FF2020':S.vd}`,color:nightVision?'#FF2020':S.dm,borderRadius:7,padding:'8px',fontSize:S.xs,cursor:'pointer',fontWeight:700}}>🔴 Night Vision: {nightVision?'ON':'OFF'}</button>
          </div>)}

          </div>
        </div>
      )}

      {showMenu&&(<div style={{position:'absolute',inset:0,zIndex:800,background:'rgba(0,0,0,0.6)'}} onClick={()=>setShowMenu(false)}>
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'#030A15',borderTop:`1px solid ${S.bd}`,borderRadius:'14px 14px 0 0',padding:'14px 16px',maxHeight:'78vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',gap:4,marginBottom:14,flexWrap:'wrap'}}>{[['colors','🎨'],['ship','⚓'],['track','📍'],['contours','🌊'],['display','🗺️']].map(([c,l])=>(<button key={c} onClick={()=>setMenuCat(c)} style={{flex:1,minWidth:42,background:menuCat===c?'rgba(0,212,255,0.18)':'#060F1C',border:`1px solid ${menuCat===c?S.cy:S.vd}`,color:menuCat===c?S.cy:S.dm,borderRadius:7,padding:'7px 4px',fontSize:'0.72rem',cursor:'pointer'}}>{l}</button>))}</div>
          {menuCat==='colors'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>{[['route','Route Line'],['vector','COG Vector'],['ship','Ship Icon'],['track','Past Track'],['xtd','XTD Corridor'],['chart','Chart Overlay']].map(([k,lb])=>(<div key={k} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:18,height:18,borderRadius:4,background:colors[k],border:'1px solid rgba(255,255,255,0.25)'}}/><span style={{color:S.tx,fontSize:S.sm}}>{lb}</span></div><input type="color" value={colors[k]} onChange={e=>setColors({...colors,[k]:e.target.value})} style={{width:40,height:28,border:'none',borderRadius:6,cursor:'pointer',background:'transparent'}}/></div>))}<button onClick={()=>setColors(DEFAULT_COLORS)} style={{marginTop:4,background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:6,padding:'7px',fontSize:S.xs,cursor:'pointer'}}>↺ Reset defaults</button></div>)}
          {menuCat==='ship'&&(<div style={{display:'flex',flexDirection:'column',gap:10}}>{[['name','Ship Name','e.g. MV NAVIGATOR'],['callsign','Call Sign','e.g. VQAB2'],['imo','IMO Number','e.g. 9123456'],['mmsi','MMSI','e.g. 123456789']].map(([k,lb,ph])=>(<div key={k}><div style={{color:S.dm,fontSize:S.lb,marginBottom:3}}>{lb}</div><input value={shipProfile[k]||''} onChange={e=>setShipProfile(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={{width:'100%',boxSizing:'border-box',background:'#060F1C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:5,padding:'7px 9px',fontSize:S.sm,outline:'none',fontFamily:'monospace'}}/></div>))}<div style={{borderTop:'1px solid rgba(0,212,255,0.1)',paddingTop:8,display:'flex',flexDirection:'column',gap:5}}>{[['loa','LOA (m)','e.g. 185'],['beam','Beam (m)','e.g. 28'],['draft','Draft (m)','e.g. 8.5']].map(([k,lb,ph])=>(<div key={k} style={{display:'flex',alignItems:'center',gap:8}}><div style={{color:S.dm,fontSize:S.xs,width:80,flexShrink:0}}>{lb}</div><input value={shipProfile[k]||''} onChange={e=>setShipProfile(p=>({...p,[k]:e.target.value}))} placeholder={ph} type="number" style={{flex:1,background:'#060F1C',color:S.cy,border:`1px solid ${S.vd}`,borderRadius:5,padding:'5px 7px',fontSize:S.sm,outline:'none',fontFamily:'monospace'}}/></div>))}</div><button onClick={()=>setShipProfile({})} style={{background:'transparent',border:`1px solid ${S.vd}`,color:S.dm,borderRadius:6,padding:'7px',fontSize:S.xs,cursor:'pointer'}}>↺ Clear Profile</button></div>)}
          {menuCat==='track'&&(<div style={{display:'flex',flexDirection:'column',gap:10}}><div style={{color:S.dm,fontSize:S.xs}}>PAST TRACK DURATION</div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{[[0,'OFF'],[1,'1H'],[2,'2H'],[6,'6H'],[12,'12H'],[24,'24H']].map(([h,l])=>(<button key={h} onClick={()=>setTrackHours(h)} style={{background:trackHours===h?'rgba(0,255,136,0.18)':'#060F1C',border:`1px solid ${trackHours===h?S.gn:S.vd}`,color:trackHours===h?S.gn:S.tx,borderRadius:7,padding:'7px 12px',fontSize:S.sm,cursor:'pointer'}}>{l}</button>))}</div></div>)}
          {menuCat==='contours'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>
            {/* S-52 legend inline in contours menu */}
            <div style={{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(0,212,255,0.15)',borderRadius:6,padding:'6px 8px',marginBottom:4}}>
              <div style={{color:S.dm,fontSize:S.lb,marginBottom:4}}>S-52 DEPTH ZONES (Karimata ENC)</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[['#FF2020','DEPVS'],['#FF9500','DEPMS'],['#FFD700','DEPMD'],['#00D4FF','DEPDW']].map(([col,lbl])=>(
                  <div key={lbl} style={{display:'flex',alignItems:'center',gap:3}}>
                    <div style={{width:8,height:8,borderRadius:1,background:col}}/>
                    <span style={{color:col,fontSize:'0.55rem',fontFamily:'monospace',fontWeight:700}}>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
            {[['shallowDepth',shallowDepth,setShallowDepth,'🔴 Shallow (m)'],['safetyDepth',safetyDepth,setSafetyDepth,'🟡 Safety (m)'],['deepDepth',deepDepth,setDeepDepth,'🟢 Deep (m)'],['shipDraft',shipDraft,setShipDraft,'⚓ Draft (m)']].map(([k,val,set,lbl])=>(<div key={k}><div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{color:S.tx,fontSize:S.sm}}>{lbl}</span><span style={{color:S.cy,fontFamily:'monospace',fontSize:S.sm}}>{val}m</span></div><input type="range" min={1} max={k==='deepDepth'?500:k==='safetyDepth'?100:50} value={val} onChange={e=>set(Number(e.target.value))} style={{width:'100%',accentColor:'#00D4FF'}}/></div>))}
          </div>)}
          {menuCat==='display'&&(<div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div><div style={{color:S.dm,fontSize:S.xs,marginBottom:6}}>COG VECTOR</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{[[6,'6m'],[12,'12m'],[20,'20m'],[30,'30m'],[60,'60m']].map(([n,l])=>(<button key={n} onClick={()=>setVectorMins(n)} style={{background:vectorMins===n?'rgba(0,212,255,0.18)':'#060F1C',border:`1px solid ${vectorMins===n?S.cy:S.vd}`,color:vectorMins===n?S.cy:S.tx,borderRadius:7,padding:'7px 10px',fontSize:S.sm,cursor:'pointer'}}>{l}</button>))}</div></div>
            <div><div style={{color:S.dm,fontSize:S.xs,marginBottom:6}}>ORIENTATION</div><div style={{display:'flex',gap:4}}>{[['north','N↑'],['course','C↑'],['head','H↑']].map(([v,l])=>(<button key={v} onClick={()=>setDisplayMode(v)} style={{flex:1,background:displayMode===v?'rgba(0,212,255,0.18)':'#060F1C',border:`1px solid ${displayMode===v?S.cy:S.vd}`,color:displayMode===v?S.cy:S.tx,borderRadius:7,padding:'7px 4px',fontSize:'0.68rem',cursor:'pointer'}}>{l}</button>))}</div></div>
            <div><div style={{color:S.dm,fontSize:S.xs,marginBottom:6}}>MAP THEME</div><div style={{display:'flex',gap:4}}>{[['night','🌙 Night'],['day','☀ Day'],['dusk','🏇 Dusk']].map(([v,l])=>(<button key={v} onClick={()=>setMapMode(v)} style={{flex:1,background:mapMode===v?'rgba(255,215,0,0.18)':'#060F1C',border:`1px solid ${mapMode===v?'#FFD700':S.vd}`,color:mapMode===v?'#FFD700':S.tx,borderRadius:7,padding:'7px 4px',fontSize:'0.68rem',cursor:'pointer'}}>{l}</button>))}</div></div>
            {activeRoute&&(<div><div style={{color:S.dm,fontSize:S.xs,marginBottom:6}}>XTD</div><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{[0.1,0.25,0.5,1.0,2.0].map(n=>(<button key={n} onClick={()=>setXtdNM(n)} style={{background:xtdNM===n?'rgba(255,179,0,0.2)':'#060F1C',border:`1px solid ${xtdNM===n?'#FFB300':S.vd}`,color:xtdNM===n?'#FFB300':S.tx,borderRadius:7,padding:'7px 10px',fontSize:S.sm,cursor:'pointer'}}>{n}NM</button>))}</div></div>)}
          </div>)}
        </div>
      </div>)}
    </div>
  );
    }
