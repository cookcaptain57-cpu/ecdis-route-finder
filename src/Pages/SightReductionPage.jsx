/* eslint-disable */
// src/Pages/SightReductionPage.jsx — Complete Celestial Navigation Suite
// Sight Reduction · Running Fix · Noon · Celestial Planning · Star Finder · Log

import { useState, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// § 1. MATH & ASTRONOMICAL ENGINE
// ══════════════════════════════════════════════════════════════════════════════
const toRad=d=>d*Math.PI/180,toDeg=r=>r*180/Math.PI,norm360=d=>((d%360)+360)%360,clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const julianDate=d=>d.getTime()/86400000+2440587.5;
const jdToDate=jd=>new Date((jd-2440587.5)*86400000);
const ghaAries=jd=>{const T=(jd-2451545)/36525;return norm360(280.46061837+360.98564736629*(jd-2451545)+0.000387933*T*T-T*T*T/38710000);};

// Sun — returns GHA, Dec, SD (semi-diameter in degrees), R_AU
const sunFull=jd=>{
  const T=(jd-2451545)/36525,L0=norm360(280.46646+36000.76983*T+0.0003032*T*T),M=norm360(357.52911+35999.05029*T-0.0001537*T*T),Mr=toRad(M);
  const C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  const sL=norm360(L0+C),om=125.04-1934.136*T,lam=toRad(sL-0.00569-0.00478*Math.sin(toRad(om)));
  const eps=toRad(23.4392911-0.013004167*T),RA=norm360(toDeg(Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam)))),Dec=toDeg(Math.asin(clamp(Math.sin(eps)*Math.sin(lam),-1,1)));
  const R_AU=1.000001-0.016708*Math.cos(Mr)-0.000141*Math.cos(2*Mr);
  const SD_deg=0.2666/R_AU;
  return{GHA:norm360(ghaAries(jd)-RA),Dec,SD:SD_deg,R_AU};
};

// Moon — returns GHA, Dec, HP (horizontal parallax in arcminutes)
const moonFull=jd=>{
  const T=(jd-2451545)/36525,L=norm360(218.3164477+481267.88123421*T-0.0015786*T*T);
  const D=norm360(297.8501921+445267.1114034*T-0.0018819*T*T),M=norm360(357.5291092+35999.0502909*T-0.0001536*T*T);
  const Mp=norm360(134.9633964+477198.8675055*T+0.0087414*T*T),F=norm360(93.2720950+483202.0175233*T-0.0036539*T*T);
  const[Dr,Mr,Mpr,Fr]=[D,M,Mp,F].map(toRad);
  const dL=(6288774*Math.sin(Mpr)+1274027*Math.sin(2*Dr-Mpr)+658314*Math.sin(2*Dr)+213618*Math.sin(2*Mpr)-185116*Math.sin(Mr)-114332*Math.sin(2*Fr)+58793*Math.sin(2*Dr-2*Mpr)+57066*Math.sin(2*Dr-Mr-Mpr)+53322*Math.sin(2*Dr+Mpr)+45758*Math.sin(2*Dr-Mr))/1e6;
  const dB=(5128122*Math.sin(Fr)+280602*Math.sin(Mpr+Fr)+277693*Math.sin(Mpr-Fr)+173237*Math.sin(2*Dr-Fr)+55413*Math.sin(2*Dr-Mpr+Fr)+46271*Math.sin(2*Dr-Mpr-Fr))/1e6;
  // Distance (km) main terms
  const r_km=385000.56-20905.355*Math.cos(Mpr)-3699.111*Math.cos(2*Dr-Mpr)-2955.968*Math.cos(2*Dr)-569.925*Math.cos(2*Mpr)-246.158*Math.cos(2*Dr-2*Mpr)+204.586*Math.cos(Mr)+170.733*Math.cos(2*Dr+Mpr);
  const HP_deg=Math.asin(6378.14/r_km)*180/Math.PI;
  const HP_amin=HP_deg*60;
  const lam2=toRad(L+dL),bet=toRad(dB),eps=toRad(23.4392911-0.013004167*T);
  const x=Math.cos(bet)*Math.cos(lam2),y=Math.cos(eps)*Math.cos(bet)*Math.sin(lam2)-Math.sin(eps)*Math.sin(bet),z=Math.sin(eps)*Math.cos(bet)*Math.sin(lam2)+Math.cos(eps)*Math.sin(bet);
  return{GHA:norm360(ghaAries(jd)-norm360(toDeg(Math.atan2(y,x)))),Dec:toDeg(Math.asin(clamp(z,-1,1))),HP:HP_amin,SD:0.2725*HP_deg};
};

// Planet
const planetGHA=(name,jd)=>{
  const T=(jd-2451545)/36525,EL={Venus:[181.979801,58519.212948,0.72333,0.006773,3.3947,131.5637,76.6799],Mars:[355.433275,19141.696551,1.52368,0.093405,1.8497,336.0602,49.5581],Jupiter:[34.351519,3036.302374,5.20260,0.048498,1.3053,14.3313,100.4644],Saturn:[50.077444,1223.511285,9.55491,0.055508,2.4848,93.0572,113.6655]};
  const el=EL[name];if(!el)return null;
  const[L0,L1,a,e,i,w,O]=el,Mv=toRad(norm360(L0+L1*T-w));let E=Mv;for(let k=0;k<8;k++)E=Mv+e*Math.sin(E);
  const v=2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2)),r=a*(1-e*Math.cos(E)),u=toRad(norm360(toDeg(v)+w-O)),Or=toRad(O),ir=toRad(i);
  const xh=r*(Math.cos(Or)*Math.cos(u)-Math.sin(Or)*Math.sin(u)*Math.cos(ir)),yh=r*(Math.sin(Or)*Math.cos(u)+Math.cos(Or)*Math.sin(u)*Math.cos(ir)),zh=r*Math.sin(u)*Math.sin(ir);
  const Ms=toRad(norm360(357.52911+35999.05029*T)),Cs=1.9146*Math.sin(Ms)+0.0200*Math.sin(2*Ms),sL2=toRad(norm360(280.46646+36000.76983*T+Cs)),Re=1.00014-0.01671*Math.cos(Ms)-0.00014*Math.cos(2*Ms),xe=Re*Math.cos(sL2+Math.PI),ye=Re*Math.sin(sL2+Math.PI);
  const eps=toRad(23.4392911-0.013004167*T),xg=xh+xe,yg=yh+ye,yeq=yg*Math.cos(eps)-zh*Math.sin(eps),zeq=yg*Math.sin(eps)+zh*Math.cos(eps),dist=Math.sqrt(xg*xg+yeq*yeq+zeq*zeq);
  return{GHA:norm360(ghaAries(jd)-norm360(toDeg(Math.atan2(yeq,xg)))),Dec:toDeg(Math.asin(clamp(zeq/dist,-1,1)))};
};

// 57 Nav Stars + Polaris
const NAV_STARS=[{n:'Acamar',s:315.5,d:-40.3},{n:'Achernar',s:335.5,d:-57.2},{n:'Acrux',s:173.3,d:-63.1},{n:'Adhara',s:255.3,d:-28.9},{n:'Aldebaran',s:291.2,d:16.5},{n:'Alioth',s:166.6,d:55.9},{n:'Alkaid',s:153.2,d:49.3},{n:"Al Na'ir",s:28.1,d:-47.0},{n:'Alnilam',s:276.1,d:-1.2},{n:'Alphard',s:218.2,d:-8.7},{n:'Alphecca',s:126.3,d:26.7},{n:'Alpheratz',s:358.0,d:29.1},{n:'Altair',s:62.3,d:8.9},{n:'Ankaa',s:353.5,d:-42.3},{n:'Antares',s:112.6,d:-26.4},{n:'Arcturus',s:146.2,d:19.2},{n:'Atria',s:108.0,d:-69.0},{n:'Avior',s:234.3,d:-59.5},{n:'Bellatrix',s:279.0,d:6.3},{n:'Betelgeuse',s:271.2,d:7.4},{n:'Canopus',s:264.1,d:-52.7},{n:'Capella',s:281.1,d:46.0},{n:'Deneb',s:49.7,d:45.3},{n:'Denebola',s:182.9,d:14.6},{n:'Diphda',s:349.2,d:-18.0},{n:'Dubhe',s:194.2,d:61.8},{n:'Elnath',s:278.7,d:28.6},{n:'Eltanin',s:90.7,d:51.5},{n:'Enif',s:34.1,d:9.9},{n:'Fomalhaut',s:15.5,d:-29.7},{n:'Gacrux',s:172.2,d:-57.1},{n:'Gienah',s:176.2,d:-17.5},{n:'Hadar',s:149.2,d:-60.3},{n:'Hamal',s:328.3,d:23.5},{n:'Kaus Australis',s:84.1,d:-34.4},{n:'Kochab',s:137.3,d:74.1},{n:'Markab',s:14.0,d:15.2},{n:'Menkar',s:314.4,d:4.1},{n:'Menkent',s:148.3,d:-36.3},{n:'Miaplacidus',s:221.9,d:-69.7},{n:'Mirfak',s:309.2,d:49.9},{n:'Nunki',s:76.3,d:-26.3},{n:'Peacock',s:54.0,d:-56.8},{n:'Pollux',s:243.8,d:28.0},{n:'Procyon',s:245.2,d:5.2},{n:'Rasalhague',s:96.4,d:12.6},{n:'Regulus',s:208.0,d:12.0},{n:'Rigel',s:281.3,d:-8.2},{n:'Rigil Kent.',s:140.2,d:-60.8},{n:'Sabik',s:102.4,d:-15.7},{n:'Schedar',s:350.0,d:56.5},{n:'Shaula',s:96.8,d:-37.1},{n:'Sirius',s:258.9,d:-16.7},{n:'Spica',s:158.8,d:-11.2},{n:'Suhail',s:223.1,d:-43.4},{n:'Vega',s:80.9,d:38.8},{n:'Zubenelgenubi',s:137.4,d:-16.0},{n:'Polaris',s:318.7,d:89.0}];

const getBodyData=(body,jd)=>{
  if(body==='Sun LL'||body==='Sun UL'||body==='Sun')return sunFull(jd);
  if(body==='Moon LL'||body==='Moon UL'||body==='Moon')return moonFull(jd);
  if(['Venus','Mars','Jupiter','Saturn'].includes(body))return{...planetGHA(body,jd),SD:0,HP:0};
  const s=NAV_STARS.find(x=>x.n===body);
  return s?{GHA:norm360(ghaAries(jd)+s.s),Dec:s.d,SD:0,HP:0}:null;
};

// Azimuth + altitude from assumed position
const calcAz=(lat,lon,GHA,Dec)=>{
  const LHA=norm360(GHA+lon),latR=toRad(lat),decR=toRad(Dec),lhaR=toRad(LHA);
  const sinH=clamp(Math.sin(latR)*Math.sin(decR)+Math.cos(latR)*Math.cos(decR)*Math.cos(lhaR),-1,1);
  const H=Math.asin(sinH);
  const cosZ=clamp((Math.sin(decR)-Math.sin(latR)*sinH)/(Math.cos(latR)*Math.cos(H)),-1,1);
  const Z=toDeg(Math.acos(cosZ));
  return{az:norm360(Math.sin(lhaR)>0?360-Z:Z),alt:toDeg(H),LHA,GHA,Dec};
};

// ══════════════════════════════════════════════════════════════════════════════
// § 2. SIGHT REDUCTION ENGINE
// ══════════════════════════════════════════════════════════════════════════════
const computeSight=(pos,time,body,HsDeg,HsMin,HE_m,IE_amin,ieOnArc)=>{
  const Hs=parseFloat(HsDeg||0)+parseFloat(HsMin||0)/60;
  if(isNaN(Hs)||Hs<0||Hs>90)return null;
  const IC_amin=ieOnArc?-Math.abs(parseFloat(IE_amin||0)):Math.abs(parseFloat(IE_amin||0));
  const IC_deg=IC_amin/60;
  const Dip_amin=-1.753*Math.sqrt(Math.max(0,parseFloat(HE_m||0)));
  const Dip_deg=Dip_amin/60;
  const Ha=Hs+IC_deg+Dip_deg;
  const R_amin=Ha>-2?1.02/Math.tan(toRad(Math.max(Ha,0.1)+10.3/(Math.max(Ha,0.1)+5.11))):30;
  const R_deg=R_amin/60;
  const jd=julianDate(time);
  const bd=getBodyData(body,jd);
  if(!bd)return null;
  let SD_deg=0,PA_deg=0,SD_amin=0,PA_amin=0;
  if(body==='Sun LL'){SD_deg=bd.SD||0.267;SD_amin=SD_deg*60;}
  else if(body==='Sun UL'){SD_deg=-(bd.SD||0.267);SD_amin=SD_deg*60;}
  else if(body==='Moon LL'){const HP_d=(bd.HP||57)/60;SD_deg=0.2725*HP_d;PA_deg=HP_d*Math.cos(toRad(Ha));SD_amin=SD_deg*60;PA_amin=PA_deg*60;}
  else if(body==='Moon UL'){const HP_d=(bd.HP||57)/60;SD_deg=-0.2725*HP_d;PA_deg=HP_d*Math.cos(toRad(Ha));SD_amin=SD_deg*60;PA_amin=PA_deg*60;}
  const Ho=Ha-R_deg+SD_deg+PA_deg;
  const{az:Zn,alt:Hc,LHA,GHA,Dec}=calcAz(pos.lat,pos.lon,bd.GHA,bd.Dec);
  const intercept=(Ho-Hc)*60;
  return{body,time,pos,Hs,IC_amin,IC_deg,Dip_amin,Dip_deg,Ha,R_amin:-R_amin,R_deg:-R_deg,SD_amin,SD_deg,PA_amin,PA_deg,Ho,Hc,Zn,intercept,toward:intercept>=0,LHA,GHA,Dec,HE_m,IE_amin:IC_amin,HsDeg,HsMin};
};

// Running fix: two LOPs → position (using P2 as reference)
const computeRunningFix=(s1,s2)=>{
  const p1=s1.intercept,p2=s2.intercept;
  const Z1=toRad(s1.Zn),Z2=toRad(s2.Zn);
  const det=Math.sin(Z1)*Math.cos(Z2)-Math.cos(Z1)*Math.sin(Z2);
  if(Math.abs(det)<0.05)return null;
  const dx=(p1*Math.cos(Z2)-p2*Math.cos(Z1))/det;
  const dy=(p2*Math.sin(Z1)-p1*Math.sin(Z2))/det;
  const ref=s2.pos;
  return{lat:ref.lat+dy/60,lon:ref.lon+dx/(60*Math.cos(toRad(ref.lat))),dx,dy,p1,p2,Zn1:s1.Zn,Zn2:s2.Zn,refPos:ref};
};

// ══════════════════════════════════════════════════════════════════════════════
// § 3. RISE / SET / TRANSIT ENGINE
// ══════════════════════════════════════════════════════════════════════════════
const findTransit=(bodyFn,lon,date)=>{
  let jd=julianDate(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate(),12,0,0)));
  const tgt=norm360(-lon);
  for(let i=0;i<6;i++){const{GHA}=bodyFn(jd);let d=tgt-GHA;if(d>180)d-=360;if(d<-180)d+=360;jd+=d/360.985647;}
  return jd;
};

const findRiseSet=(bodyFn,lat,lon,date,h0)=>{
  try{
    const tr=findTransit(bodyFn,lon,date);
    const{Dec}=bodyFn(tr);
    const cosH=(Math.sin(toRad(h0))-Math.sin(toRad(lat))*Math.sin(toRad(Dec)))/(Math.cos(toRad(lat))*Math.cos(toRad(Dec)));
    if(Math.abs(cosH)>1)return{circ:cosH<-1?'circumpolar':'never'};
    const H=toDeg(Math.acos(cosH))/360;
    return{rise:jdToDate(tr-H),set:jdToDate(tr+H),transit:jdToDate(tr)};
  }catch{return null;}
};

const computePlan=(lat,lon,date)=>{
  const sun=jd=>sunFull(jd);
  const moon=jd=>moonFull(jd);
  return{
    sunrise:findRiseSet(sun,lat,lon,date,-0.833),
    civil:  findRiseSet(sun,lat,lon,date,-6),
    naut:   findRiseSet(sun,lat,lon,date,-12),
    astro:  findRiseSet(sun,lat,lon,date,-18),
    moonRS: findRiseSet(moon,lat,lon,date,-0.833),
    lan:    jdToDate(findTransit(sun,lon,date)),
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// § 4. FORMAT HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const p2=n=>String(Math.floor(Math.abs(n))).padStart(2,'0');
const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtUTC=d=>`${d.getUTCDate()} ${MO[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;
const fmtHHMM=d=>`${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
const fmtLMT=(d,lon)=>{const ms=d.getTime()+(lon/15)*3600000;const l=new Date(ms);return`${p2(l.getUTCHours())}:${p2(l.getUTCMinutes())}`;};
const fmtDMS=(v,pos,neg)=>{const d=Math.floor(Math.abs(v)),m=((Math.abs(v)-d)*60).toFixed(1);return`${d}°${m}'${v>=0?pos:neg}`;};
const fmtAlt=deg=>{const d=Math.floor(Math.abs(deg)),m=Math.abs((Math.abs(deg)-d)*60);return`${deg<0?'-':''}${d}°${m.toFixed(1)}'`;};
const fmtBrg=v=>v===null||isNaN(v)?'—':`${norm360(v).toFixed(1)}°`;
const C={card:{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1rem',marginBottom:'0.75rem'},hdr:{fontFamily:"'Orbitron',monospace",fontSize:'0.65rem',fontWeight:700,color:'var(--cyan)',marginBottom:'0.6rem'},inp:{width:'100%',padding:'9px 6px',background:'var(--bg2)',border:'1.5px solid var(--border2)',borderRadius:8,color:'var(--text)',fontFamily:"'Orbitron',monospace",fontSize:'0.9rem',outline:'none',textAlign:'center'}};
const LT={card:{background:'#f2f7fc',border:'1px solid #ccd8e8',borderRadius:14,padding:'1.1rem',color:'#0a1628'},hdr:{fontFamily:"'Orbitron',monospace",fontSize:'0.74rem',fontWeight:700,color:'#0a1628',textAlign:'center',marginBottom:'0.8rem',paddingBottom:'0.5rem',borderBottom:'1.5px solid #ccd8e8'},row:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid #e2ecf5'},lbl:{fontSize:'0.8rem',color:'#2a3a5a'},val:{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',color:'#0a1628',fontWeight:600}};
const LS_SIGHTS='celest_sights_v1';

// ══════════════════════════════════════════════════════════════════════════════
// § 5. INTERCEPT DIAGRAM (SVG)
// ══════════════════════════════════════════════════════════════════════════════
function InterceptDiagram({result}){
  if(!result)return null;
  const SZ=200,C2=SZ/2,R=70,intNM=result.intercept,Zn=result.Zn;
  const scale=Math.max(0.5,Math.min(3,20/Math.max(1,Math.abs(intNM))));
  const intPx=Math.min(Math.abs(intNM)*scale,R-5);
  const znR=toRad(Zn);
  const bx=Math.sin(znR),by=-Math.cos(znR);
  const ix=C2+bx*intPx,iy=C2+by*intPx;
  const lx=by*50,ly=-bx*50;
  return(
    <svg width={SZ} height={SZ} style={{display:'block',margin:'0 auto'}}>
      <circle cx={C2} cy={C2} r={R} fill="none" stroke="rgba(0,180,216,0.15)" strokeWidth={1}/>
      <circle cx={C2} cy={C2} r={R/2} fill="none" stroke="rgba(0,180,216,0.08)" strokeWidth={0.5}/>
      {['N','E','S','W'].map((l,i)=>{const a=toRad(i*90),x2=C2+Math.sin(a)*(R+10),y2=C2-Math.cos(a)*(R+10);return<text key={l} x={x2} y={y2} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="rgba(255,255,255,0.4)">{l}</text>;})}
      <line x1={C2} y1={C2} x2={C2+bx*(R-5)} y2={C2+by*(R-5)} stroke="rgba(0,180,216,0.4)" strokeWidth={1} strokeDasharray="3,2"/>
      <circle cx={C2} cy={C2} r={4} fill="var(--cyan)"/>
      <text x={C2+5} y={C2-6} fontSize="8" fill="var(--cyan)">AP</text>
      {intNM!==0&&<>
        <line x1={ix-lx} y1={iy-ly} x2={ix+lx} y2={iy+ly} stroke={result.toward?'var(--green)':'var(--red)'} strokeWidth={2}/>
        <circle cx={ix} cy={iy} r={3} fill={result.toward?'var(--green)':'var(--red)'}/>
        <text x={ix+bx*8} y={iy+by*8} fontSize="8" fill={result.toward?'var(--green)':'var(--red)'} textAnchor="middle">{Math.abs(intNM).toFixed(1)}'</text>
      </>}
      <text x={C2} y={SZ-4} fontSize="8" fill="rgba(255,255,255,0.3)" textAnchor="middle">Zn {Zn.toFixed(1)}° · LOP</text>
    </svg>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// § 6. MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function SightReductionPage(){
  const[activeTab,setActiveTab]=useState('sight');
  const[lockedPos,setLockedPos]=useState(null);
  const[lockedTime,setLockedTime]=useState(null);
  const[displayNow,setDisplayNow]=useState(new Date());
  const[gpsLoading,setGpsLoading]=useState(false);
  const[posErr,setPosErr]=useState('');
  const[manualMode,setManualMode]=useState(false);
  const[manualLat,setManualLat]=useState('');
  const[manualLon,setManualLon]=useState('');
  const[manualUTC,setManualUTC]=useState('');
  // Settings
  const[HE,setHE]=useState('15.0');
  const[IE,setIE]=useState('0.0');
  const[ieOnArc,setIeOnArc]=useState(true);
  // Sight tab
  const[body,setBody]=useState('Sun LL');
  const[HsDeg,setHsDeg]=useState('');
  const[HsMin,setHsMin]=useState('');
  const[sightResult,setSightResult]=useState(null);
  // Saved sights/LOPs
  const[sights,setSights]=useState(()=>{try{return JSON.parse(localStorage.getItem(LS_SIGHTS)||'[]');}catch{return[];}});
  // Running fix
  const[lop1,setLop1]=useState(0);
  const[lop2,setLop2]=useState(1);
  // Noon
  const[noonHsDeg,setNoonHsDeg]=useState('');
  const[noonHsMin,setNoonHsMin]=useState('');
  // Plan
  const[planData,setPlanData]=useState(null);
  const[isMob,setIsMob]=useState(window.innerWidth<720);

  const calcPos=manualMode&&manualLat&&manualLon?{lat:parseFloat(manualLat),lon:parseFloat(manualLon)}:lockedPos;
  const calcTime=manualMode&&manualUTC?(()=>{try{return new Date(manualUTC.includes('T')?manualUTC:`${new Date().toISOString().slice(0,10)}T${manualUTC}Z`);}catch{return lockedTime;}})():lockedTime;

  useEffect(()=>{const o=()=>setIsMob(window.innerWidth<720);window.addEventListener('resize',o);return()=>window.removeEventListener('resize',o);},[]);
  useEffect(()=>{const t=setInterval(()=>setDisplayNow(new Date()),1000);return()=>clearInterval(t);},[]);

  const fetchGPS=useCallback(()=>{
    if(!navigator.geolocation){setPosErr('GPS unavailable');setManualMode(true);return;}
    setGpsLoading(true);setPosErr('');
    navigator.geolocation.getCurrentPosition(p=>{
      setLockedPos({lat:p.coords.latitude,lon:p.coords.longitude});
      setLockedTime(new Date());setGpsLoading(false);
      setManualLat(p.coords.latitude.toFixed(6));setManualLon(p.coords.longitude.toFixed(6));
    },e=>{setGpsLoading(false);setPosErr(e.message||'GPS denied');setManualMode(true);},{enableHighAccuracy:true,timeout:15000});
  },[]);
  useEffect(()=>{fetchGPS();},[fetchGPS]);

  // Auto-compute sight when inputs change
  useEffect(()=>{
    if(calcPos&&calcTime&&HsDeg!==''){
      const r=computeSight(calcPos,calcTime,body,HsDeg,HsMin,HE,IE,ieOnArc);
      setSightResult(r);
    }else{setSightResult(null);}
  },[calcPos,calcTime,body,HsDeg,HsMin,HE,IE,ieOnArc]);

  // Auto-compute plan when tab opened
  useEffect(()=>{
    if(activeTab==='plan'&&calcPos){
      const d=calcTime||displayNow;
      setPlanData(computePlan(calcPos.lat,calcPos.lon,d));
    }
  },[activeTab,calcPos,calcTime]);

  const saveSight=()=>{
    if(!sightResult)return;
    const s=[{...sightResult,id:Date.now()},...sights].slice(0,20);
    setSights(s);localStorage.setItem(LS_SIGHTS,JSON.stringify(s));
  };

  // Running fix result
  const rfSight1=sights[lop1],rfSight2=sights[lop2];
  const runFix=rfSight1&&rfSight2&&lop1!==lop2?computeRunningFix(rfSight1,rfSight2):null;

  // Noon computation
  const jdNow=calcTime?julianDate(calcTime):julianDate(displayNow);
  const sunNow=calcPos?sunFull(jdNow):null;
  const lanJD=calcPos?findTransit(jd=>sunFull(jd),calcPos.lon,calcTime||displayNow):null;
  const lanTime=lanJD?jdToDate(lanJD):null;
  const noonHo=(noonHsDeg!=='')?computeSight(calcPos||{lat:0,lon:0},calcTime||displayNow,'Sun LL',noonHsDeg,noonHsMin,HE,IE,ieOnArc):null;
  const noonLat=noonHo&&sunNow?(()=>{const ZD=90-noonHo.Ho;return(calcPos&&calcPos.lat>=sunNow.Dec)?sunNow.Dec+ZD:sunNow.Dec-ZD;})():null;

  // Star finder — compute all visible bodies
  const starFinder=calcPos?[
    {n:'Sun',alt:sunNow?calcAz(calcPos.lat,calcPos.lon,sunNow.GHA,sunNow.Dec).alt:null,az:sunNow?calcAz(calcPos.lat,calcPos.lon,sunNow.GHA,sunNow.Dec).az:null,type:'planet'},
    ...['Venus','Mars','Jupiter','Saturn'].map(b=>{const g=planetGHA(b,jdNow);return g?{n:b,alt:calcAz(calcPos.lat,calcPos.lon,g.GHA,g.Dec).alt,az:calcAz(calcPos.lat,calcPos.lon,g.GHA,g.Dec).az,type:'planet'}:{n:b,alt:-99,az:0,type:'planet'};}),
    {n:'Moon',alt:(()=>{const m=moonFull(jdNow);return calcAz(calcPos.lat,calcPos.lon,m.GHA,m.Dec).alt;})(),az:(()=>{const m=moonFull(jdNow);return calcAz(calcPos.lat,calcPos.lon,m.GHA,m.Dec).az;})(),type:'planet'},
    ...NAV_STARS.map(s=>{const GHA=norm360(ghaAries(jdNow)+s.s);const r=calcAz(calcPos.lat,calcPos.lon,GHA,s.d);return{n:s.n,alt:r.alt,az:r.az,type:'star',mag:s.mag||3};})
  ].filter(s=>s.alt>5).sort((a,b)=>b.alt-a.alt):[];

  // Tab button
  const tabBtn=(k,ic,lb)=>(<button onClick={()=>setActiveTab(k)} style={{padding:'8px 10px',border:'none',borderBottom:`2px solid ${activeTab===k?'var(--cyan)':'transparent'}`,background:'transparent',color:activeTab===k?'var(--cyan)':'var(--text3)',fontFamily:"'Exo 2',sans-serif",fontSize:'0.65rem',fontWeight:600,cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.06em',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>{ic} {lb}</button>);

  const bodyOpts=[
    {g:'☀️ Sun',items:['Sun LL','Sun UL']},
    {g:'🌙 Moon',items:['Moon LL','Moon UL']},
    {g:'Planets',items:['Venus','Mars','Jupiter','Saturn']},
    {g:'⭐ Stars',items:NAV_STARS.map(s=>s.n)},
  ];

  // Plan row helper
  const planRow=(label,data,lon)=>{
    if(!data)return null;
    if(data.circ)return(<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:'0.78rem'}}>
      <span style={{color:'var(--text2)'}}>{label}</span>
      <span style={{color:'var(--text3)',fontFamily:'monospace'}}>{data.circ==='circumpolar'?'Circumpolar':'Below horizon'}</span>
    </div>);
    return(<div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)',fontSize:'0.78rem'}}>
      <span style={{color:'var(--text2)'}}>{label}</span>
      <span style={{color:'var(--text)',fontFamily:'monospace'}}>
        {data.rise?fmtHHMM(data.rise):'—'} / {data.set?fmtHHMM(data.set):'—'}
        {lon!==undefined&&data.rise?<span style={{color:'var(--text3)',marginLeft:6}}>({fmtLMT(data.rise,lon)}/{fmtLMT(data.set,lon)} LMT)</span>:''}
      </span>
    </div>);
  };

  return(<div style={{padding:'1rem',maxWidth:980,margin:'0 auto',width:'100%'}}>

    {/* HEADER */}
    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'0.9rem',flexWrap:'wrap'}}>
      <div style={{width:44,height:44,borderRadius:11,background:'linear-gradient(135deg,#F0A500,#E05000)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0,boxShadow:'0 0 22px rgba(240,165,0,0.4)'}}>🔭</div>
      <div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.88rem',fontWeight:700,letterSpacing:'0.08em'}}>CELESTIAL NAVIGATION</div>
        <div style={{fontSize:'0.62rem',color:'var(--gold)',letterSpacing:'0.14em',textTransform:'uppercase'}}>Sight Reduction · Running Fix · Noon · Planning · Star Finder</div>
      </div>
      <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
        <span style={{padding:'3px 9px',borderRadius:100,fontSize:'0.62rem',background:calcPos?'rgba(0,200,150,0.1)':'rgba(240,165,0,0.1)',border:`1px solid ${calcPos?'rgba(0,200,150,0.3)':'rgba(240,165,0,0.3)'}`,color:calcPos?'var(--green)':'var(--gold)'}}>
          {gpsLoading?'⏳ Locking…':calcPos?'📍 Locked':posErr?'⚠️ No GPS':'⏳ GPS…'}
        </span>
      </div>
    </div>

    {/* GPS LOCK + SETTINGS */}
    <div style={{...C.card,marginBottom:'0.8rem'}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
        <div style={{fontFamily:'monospace',fontSize:'0.76rem',lineHeight:2.1}}>
          <div style={{color:'var(--text)',fontWeight:600}}>{calcTime?fmtUTC(calcTime):fmtUTC(displayNow)}</div>
          <div style={{color:calcPos?'var(--text2)':'var(--gold)'}}>{calcPos?`${fmtDMS(calcPos.lat,'N','S')}   ${fmtDMS(calcPos.lon,'E','W')}`:posErr||'No GPS'}</div>
        </div>
        <div style={{display:'flex',gap:7,flexWrap:'wrap',alignItems:'center'}}>
          {/* Settings: HE and IE inline */}
          <div style={{display:'flex',gap:8,alignItems:'center',background:'var(--bg2)',borderRadius:9,padding:'5px 10px',border:'1px solid var(--border)'}}>
            <div>
              <div style={{fontSize:'0.56rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>HE (m)</div>
              <input type="number" min="0" max="100" step="0.5" value={HE} onChange={e=>setHE(e.target.value)} style={{...C.inp,width:56,padding:'4px'}}/>
            </div>
            <div>
              <div style={{fontSize:'0.56rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>IE (′)</div>
              <div style={{display:'flex',gap:3,alignItems:'center'}}>
                <input type="number" step="0.1" value={IE} onChange={e=>setIE(e.target.value)} style={{...C.inp,width:48,padding:'4px'}}/>
                <button onClick={()=>setIeOnArc(a=>!a)} style={{padding:'4px 6px',background:ieOnArc?'rgba(240,165,0,0.15)':'rgba(0,200,150,0.15)',border:`1px solid ${ieOnArc?'var(--gold)':'var(--green)'}`,borderRadius:6,color:ieOnArc?'var(--gold)':'var(--green)',fontSize:'0.6rem',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>{ieOnArc?'ON':'OFF'}</button>
              </div>
            </div>
          </div>
          <button onClick={fetchGPS} disabled={gpsLoading} style={{padding:'8px 14px',background:'linear-gradient(135deg,var(--gold),#E05000)',border:'none',borderRadius:9,color:'white',fontFamily:"'Exo 2',sans-serif",fontSize:'0.73rem',fontWeight:700,cursor:'pointer',opacity:gpsLoading?0.6:1}}>{gpsLoading?'⏳':'🔄 Lock GPS'}</button>
          <button onClick={()=>setManualMode(m=>!m)} style={{padding:'8px 12px',background:manualMode?'rgba(240,165,0,0.12)':'var(--bg2)',border:`1px solid ${manualMode?'var(--gold)':'var(--border2)'}`,borderRadius:9,color:manualMode?'var(--gold)':'var(--text2)',fontFamily:"'Exo 2',sans-serif",fontSize:'0.73rem',fontWeight:600,cursor:'pointer'}}>✏️ Edit</button>
        </div>
      </div>
      {manualMode&&(<div style={{marginTop:'0.8rem',paddingTop:'0.7rem',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:'0.5rem'}}>
        {[{l:'Lat (+ N, − S)',v:manualLat,s:setManualLat,ph:'30.61'},{l:'Lon (+ E, − W)',v:manualLon,s:setManualLon,ph:'122.08'},{l:'UTC HH:MM:SS',v:manualUTC,s:setManualUTC,ph:'14:30:00'}].map(({l,v,s,ph})=>(
          <div key={l}><div style={{fontSize:'0.58rem',color:'var(--text3)',marginBottom:3}}>{l}</div><input value={v} onChange={e=>s(e.target.value)} placeholder={ph} style={{...C.inp,border:'1.5px solid var(--gold)',color:'var(--gold)'}}/></div>))}
      </div>)}
    </div>

    {/* TABS */}
    <div style={{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:'1rem',overflowX:'auto',gap:2}}>
      {tabBtn('sight','🔭','Sight')}{tabBtn('fix','⚓','Running Fix')}{tabBtn('noon','☀️','Noon')}{tabBtn('plan','📅','Planning')}{tabBtn('stars','⭐','Star Finder')}{tabBtn('log','📋','Log')}
    </div>

    {/* ══ SIGHT TAB ══ */}
    {activeTab==='sight'&&(<div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
      <div>
        {/* Body */}
        <div style={C.card}>
          <div style={C.hdr}>🔭 CELESTIAL BODY</div>
          <select value={body} onChange={e=>{setBody(e.target.value);setHsDeg('');setHsMin('');}} style={{...C.inp,cursor:'pointer',marginBottom:'0.5rem'}}>
            {bodyOpts.map(g=><optgroup key={g.g} label={g.g}>{g.items.map(it=><option key={it} value={it}>{it}</option>)}</optgroup>)}
          </select>
          {sightResult&&calcPos&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginTop:'0.4rem'}}>
            {[{l:'GHA',v:`${sightResult.GHA.toFixed(2)}°`},{l:'Dec',v:`${sightResult.Dec.toFixed(2)}°`},{l:'LHA',v:`${sightResult.LHA.toFixed(2)}°`},{l:'Hc',v:fmtAlt(sightResult.Hc)}].map(({l,v})=>(
              <div key={l} style={{background:'var(--bg2)',borderRadius:7,padding:'6px 8px',textAlign:'center'}}>
                <div style={{fontSize:'0.54rem',color:'var(--text3)',marginBottom:1}}>{l}</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.72rem',color:'var(--text)',fontWeight:700}}>{v}</div>
              </div>))}
          </div>)}
        </div>

        {/* Sextant Altitude */}
        <div style={C.card}>
          <div style={C.hdr}>📐 SEXTANT ALTITUDE (Hs) — enter only this</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
            <div>
              <div style={{fontSize:'0.58rem',color:'var(--text3)',marginBottom:4}}>Degrees (0–90)</div>
              <input type="number" min="0" max="90" step="1" value={HsDeg} onChange={e=>setHsDeg(e.target.value)} placeholder="43" style={{...C.inp,border:'1.5px solid var(--gold)',color:'var(--gold)',fontSize:'1.1rem'}}/>
            </div>
            <div>
              <div style={{fontSize:'0.58rem',color:'var(--text3)',marginBottom:4}}>Minutes (0.0–59.9)</div>
              <input type="number" min="0" max="59.9" step="0.1" value={HsMin} onChange={e=>setHsMin(e.target.value)} placeholder="23.4" style={{...C.inp,border:'1.5px solid var(--gold)',color:'var(--gold)',fontSize:'1.1rem'}}/>
            </div>
          </div>
          {HsDeg!==''&&<div style={{marginTop:8,textAlign:'center',fontFamily:"'Orbitron',monospace",fontSize:'0.9rem',color:'var(--gold)'}}>{HsDeg}° {HsMin||'0.0'}' = {(parseFloat(HsDeg||0)+parseFloat(HsMin||0)/60).toFixed(4)}°</div>}
          {!calcPos&&<div style={{marginTop:8,padding:'7px',background:'rgba(240,165,0,0.06)',border:'1px solid rgba(240,165,0,0.2)',borderRadius:7,fontSize:'0.7rem',color:'var(--gold)',textAlign:'center'}}>⚠️ Lock GPS position first</div>}
        </div>

        {/* Corrections (auto-computed, read-only) */}
        {sightResult&&(<div style={{...C.card,background:'rgba(0,0,0,0.2)'}}>
          <div style={C.hdr}>⚙️ CORRECTIONS (AUTO-COMPUTED)</div>
          {[
            {l:'Sextant Alt (Hs)',v:fmtAlt(sightResult.Hs),c:'var(--text)',sep:false},
            {l:'Index Corr (IC)',v:`${sightResult.IC_amin>=0?'+':''}${sightResult.IC_amin.toFixed(1)}'`,c:'var(--text2)',sep:false},
            {l:'Dip Corr',v:`${sightResult.Dip_amin.toFixed(1)}'`,c:'var(--text2)',sep:true},
            {l:'Apparent Alt (Ha)',v:fmtAlt(sightResult.Ha),c:'var(--cyan)',sep:false},
            {l:'Refraction',v:`${sightResult.R_amin.toFixed(1)}'`,c:'var(--text2)',sep:false},
            ...(Math.abs(sightResult.SD_amin)>0.01?[{l:'Semi-diameter',v:`${sightResult.SD_amin>=0?'+':''}${sightResult.SD_amin.toFixed(1)}'`,c:'var(--text2)',sep:false}]:[]),
            ...(Math.abs(sightResult.PA_amin)>0.01?[{l:'Parallax',v:`+${sightResult.PA_amin.toFixed(1)}'`,c:'var(--text2)',sep:false}]:[]),
          ].map(({l,v,c,sep},i)=>(<div key={i}>
            {sep&&<div style={{borderTop:'1px solid rgba(255,255,255,0.08)',margin:'4px 0'}}/>}
            <div style={{display:'flex',justifyContent:'space-between',padding:'3px 0',fontSize:'0.77rem'}}>
              <span style={{color:'var(--text3)'}}>{l}</span>
              <span style={{fontFamily:'monospace',color:c,fontWeight:600}}>{v}</span>
            </div>
          </div>))}
          <div style={{borderTop:'2px solid rgba(0,180,216,0.4)',marginTop:4,paddingTop:6,display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:'0.82rem',fontWeight:700,color:'var(--cyan)'}}>Observed Alt (Ho)</span>
            <span style={{fontFamily:"'Orbitron',monospace",fontSize:'0.85rem',color:'var(--cyan)',fontWeight:700}}>{fmtAlt(sightResult.Ho)}</span>
          </div>
        </div>)}
      </div>

      {/* Right — results */}
      <div>
        {sightResult&&calcPos?(<>
          {/* Intercept result card */}
          <div style={LT.card}>
            <div style={LT.hdr}>🔭 SIGHT REDUCTION RESULT</div>
            <div style={{fontSize:'0.7rem',color:'#3a4a6a',marginBottom:'0.5rem',fontFamily:'monospace'}}>{fmtUTC(calcTime||displayNow)}</div>
            {[
              {l:'Ho (Observed)',v:fmtAlt(sightResult.Ho),c:'#1565C0',big:true},
              {l:'Hc (Computed)',v:fmtAlt(sightResult.Hc),c:'#2a3a5a',big:true},
              {l:'Azimuth (Zn)',v:`${sightResult.Zn.toFixed(1)}°`,c:'#0a1628'},
              {l:'Intercept',v:`${Math.abs(sightResult.intercept).toFixed(1)} nm`,c:sightResult.toward?'#007a50':'#cc2233'},
              {l:'Direction',v:sightResult.toward?'TOWARD':'AWAY',c:sightResult.toward?'#007a50':'#cc2233'},
            ].map(({l,v,c,big})=>(<div key={l} style={{...LT.row,borderBottom:'1px solid #e2ecf5'}}>
              <span style={LT.lbl}>{l}</span>
              <span style={{...LT.val,color:c,fontSize:big?'0.96rem':'0.82rem',fontWeight:700}}>{v}</span>
            </div>))}
            <div style={{marginTop:'0.9rem',textAlign:'center'}}>
              <div style={{display:'inline-block',padding:'5px 14px',background:sightResult.toward?'#e8f6ee':'#fce8e8',borderRadius:20,border:`1px solid ${sightResult.toward?'#9dc8b0':'#e8b0b0'}`,fontFamily:"'Orbitron',monospace",fontSize:'0.72rem',fontWeight:700,color:sightResult.toward?'#007a50':'#cc2233'}}>
                LOP: {Math.abs(sightResult.intercept).toFixed(1)}nm {sightResult.toward?'TOWARD':'AWAY'} Zn {sightResult.Zn.toFixed(1)}°
              </div>
            </div>
          </div>
          {/* SVG diagram */}
          <div style={{...C.card,textAlign:'center',marginTop:'0.75rem'}}>
            <div style={C.hdr}>📊 INTERCEPT DIAGRAM</div>
            <InterceptDiagram result={sightResult}/>
            <div style={{marginTop:8,display:'flex',gap:12,justifyContent:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.65rem',color:'var(--text3)'}}><div style={{width:10,height:10,background:'var(--green)',borderRadius:'50%'}}/> Toward</div>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:'0.65rem',color:'var(--text3)'}}><div style={{width:10,height:10,background:'var(--red)',borderRadius:'50%'}}/> Away</div>
            </div>
          </div>
          <button onClick={saveSight} style={{width:'100%',marginTop:'0.75rem',padding:'12px',background:'linear-gradient(135deg,var(--gold),#E05000)',border:'none',borderRadius:10,color:'white',fontFamily:"'Orbitron',monospace",fontSize:'0.74rem',fontWeight:700,cursor:'pointer',letterSpacing:'0.07em'}}>💾 Save LOP to Log</button>
        </>):(<div style={{...LT.card,textAlign:'center',padding:'3rem 1rem'}}>
          <div style={{fontSize:'3rem',marginBottom:12}}>🔭</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',color:'#2a3a5a',marginBottom:6}}>Enter Sextant Altitude</div>
          <div style={{fontSize:'0.72rem',color:'#5a6a8a',lineHeight:1.7}}>{calcPos?'Select body and type Hs in degrees + minutes':'Lock GPS position first, then enter Hs'}</div>
        </div>)}
      </div>
    </div>)}

    {/* ══ RUNNING FIX TAB ══ */}
    {activeTab==='fix'&&(<div>
      {sights.length<2?(<div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>⚓</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',marginBottom:6}}>Need 2 Saved LOPs</div>
        <div style={{fontSize:'0.72rem'}}>Take observations in Sight tab → Save LOP → come back here</div>
      </div>):(<div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
        <div>
          <div style={C.card}>
            <div style={C.hdr}>⚓ SELECT TWO SAVED LOPS</div>
            {[{l:'LOP 1 (First sight)',v:lop1,s:setLop1},{l:'LOP 2 (Second sight)',v:lop2,s:setLop2}].map(({l,v,s})=>(
              <div key={l} style={{marginBottom:'0.7rem'}}>
                <div style={{fontSize:'0.6rem',color:'var(--text3)',marginBottom:4}}>{l}</div>
                <select value={v} onChange={e=>s(Number(e.target.value))} style={{...C.inp,cursor:'pointer'}}>
                  {sights.map((sg,i)=><option key={sg.id} value={i}>{i+1}. {sg.body} — Zn {sg.Zn.toFixed(1)}° / {Math.abs(sg.intercept).toFixed(1)}nm {sg.toward?'T':'A'}</option>)}
                </select>
              </div>))}
          </div>
          {rfSight1&&rfSight2&&<div style={{...C.card,background:'rgba(0,0,0,0.2)'}}>
            <div style={C.hdr}>📊 LOP DETAILS</div>
            {[rfSight1,rfSight2].map((s,i)=>(<div key={i} style={{marginBottom:'0.6rem',padding:'8px',background:'var(--bg2)',borderRadius:8}}>
              <div style={{fontSize:'0.65rem',color:i===0?'var(--cyan)':'var(--gold)',fontWeight:700,marginBottom:4}}>LOP {i+1}: {s.body}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px',fontSize:'0.7rem'}}>
                <div><span style={{color:'var(--text3)'}}>Zn: </span><span style={{color:'var(--text)',fontFamily:'monospace'}}>{s.Zn.toFixed(1)}°</span></div>
                <div><span style={{color:'var(--text3)'}}>Int: </span><span style={{color:s.toward?'var(--green)':'var(--red)',fontFamily:'monospace'}}>{Math.abs(s.intercept).toFixed(1)}nm {s.toward?'T':'A'}</span></div>
                <div><span style={{color:'var(--text3)'}}>Ho: </span><span style={{color:'var(--text)',fontFamily:'monospace'}}>{fmtAlt(s.Ho)}</span></div>
                <div><span style={{color:'var(--text3)'}}>Pos: </span><span style={{color:'var(--text)',fontFamily:'monospace'}}>{fmtDMS(s.pos.lat,'N','S')}</span></div>
              </div>
            </div>))}
          </div>}
          {runFix&&Math.abs(runFix.Zn1-runFix.Zn2)<30&&<div style={{padding:'8px 12px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.3)',borderRadius:8,fontSize:'0.7rem',color:'var(--red)',marginBottom:'0.75rem'}}>⚠️ LOPs are nearly parallel ({Math.abs(runFix.Zn1-runFix.Zn2).toFixed(0)}° apart) — fix may be unreliable. Best spread is 60°–120°.</div>}
        </div>
        <div>
          {runFix?(<div style={LT.card}>
            <div style={LT.hdr}>⚓ RUNNING FIX POSITION</div>
            <div style={{textAlign:'center',marginBottom:'1rem'}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:'1.1rem',fontWeight:700,color:'#1565C0'}}>{fmtDMS(runFix.lat,'N','S')}</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:'1.1rem',fontWeight:700,color:'#1565C0'}}>{fmtDMS(runFix.lon,'E','W')}</div>
            </div>
            {[{l:'Fix Lat',v:runFix.lat.toFixed(4)+'°'},{l:'Fix Lon',v:runFix.lon.toFixed(4)+'°'},{l:'dE from AP',v:`${runFix.dx.toFixed(1)} nm`},{l:'dN from AP',v:`${runFix.dy.toFixed(1)} nm`},{l:'Fix from AP',v:`${Math.sqrt(runFix.dx**2+runFix.dy**2).toFixed(1)} nm`}].map(({l,v})=>(<div key={l} style={LT.row}><span style={LT.lbl}>{l}</span><span style={LT.val}>{v}</span></div>))}
            <div style={{marginTop:'0.8rem',padding:'8px 10px',background:'#e8f0fe',border:'1px solid #a0b8d8',borderRadius:8,fontSize:'0.7rem',color:'#1a3a8a',lineHeight:1.7}}>
              Running fix uses advanced LOP1 (referenced to LOP2 position). Accuracy depends on intercepts and azimuth spread between bodies.
            </div>
          </div>):(<div style={{...LT.card,textAlign:'center',padding:'3rem 1rem',color:'#6a7a9a'}}>
            <div style={{fontSize:'2rem',marginBottom:8}}>⚓</div>
            <div style={{fontSize:'0.78rem'}}>Select two different LOPs to compute running fix</div>
          </div>)}
        </div>
      </div>)}
    </div>)}

    {/* ══ NOON TAB ══ */}
    {activeTab==='noon'&&(<div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
      <div>
        <div style={C.card}>
          <div style={C.hdr}>☀️ MERIDIAN PASSAGE (LAN)</div>
          {calcPos&&lanTime?(<>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.7rem'}}>
              {[{l:'LAN UTC',v:fmtHHMM(lanTime)},{l:'LAN LMT',v:fmtLMT(lanTime,calcPos.lon)},{l:'Sun Dec',v:sunNow?`${sunNow.Dec.toFixed(2)}°`:'—'},{l:'Sun GHA now',v:sunNow?`${sunNow.GHA.toFixed(2)}°`:'—'}].map(({l,v})=>(
                <div key={l} style={{background:'var(--bg2)',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                  <div style={{fontSize:'0.56rem',color:'var(--text3)',marginBottom:2,textTransform:'uppercase'}}>{l}</div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',color:'var(--gold)',fontWeight:700}}>{v}</div>
                </div>))}
            </div>
            <div style={{padding:'8px 10px',background:'rgba(240,165,0,0.06)',border:'1px solid rgba(240,165,0,0.2)',borderRadius:8,fontSize:'0.72rem',color:'var(--gold)'}}>
              Observe Sun's maximum altitude at LAN time. Enter Hs below.
            </div>
          </>):<div style={{color:'var(--text3)',fontSize:'0.78rem'}}>Lock GPS to predict LAN</div>}
        </div>
        <div style={C.card}>
          <div style={C.hdr}>📐 MERIDIAN ALTITUDE (Hs at LAN)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
            <div>
              <div style={{fontSize:'0.58rem',color:'var(--text3)',marginBottom:4}}>Degrees</div>
              <input type="number" min="0" max="90" step="1" value={noonHsDeg} onChange={e=>setNoonHsDeg(e.target.value)} placeholder="60" style={{...C.inp,border:'1.5px solid var(--gold)',color:'var(--gold)',fontSize:'1.1rem'}}/>
            </div>
            <div>
              <div style={{fontSize:'0.58rem',color:'var(--text3)',marginBottom:4}}>Minutes</div>
              <input type="number" min="0" max="59.9" step="0.1" value={noonHsMin} onChange={e=>setNoonHsMin(e.target.value)} placeholder="30.0" style={{...C.inp,border:'1.5px solid var(--gold)',color:'var(--gold)',fontSize:'1.1rem'}}/>
            </div>
          </div>
        </div>
      </div>
      <div style={LT.card}>
        <div style={LT.hdr}>☀️ NOON POSITION</div>
        {noonHo&&sunNow&&calcPos?(<>
          {[{l:'Ho (Corrected)',v:fmtAlt(noonHo.Ho),c:'#1565C0'},{l:'Sun Dec',v:`${sunNow.Dec.toFixed(2)}°`,c:'#2a3a5a'},{l:'Zenith Distance',v:`${(90-noonHo.Ho).toFixed(2)}°`,c:'#2a3a5a'},{l:'Calculated Latitude',v:noonLat!==null?`${Math.abs(noonLat).toFixed(4)}° ${noonLat>=0?'N':'S'}`:'—',c:'#007a50'}].map(({l,v,c})=>(<div key={l} style={{...LT.row,borderBottom:'1px solid #e2ecf5'}}>
            <span style={LT.lbl}>{l}</span>
            <span style={{...LT.val,color:c,fontWeight:700}}>{v}</span>
          </div>))}
          <div style={{marginTop:'0.9rem',padding:'12px',background:'#e8f6ee',border:'1px solid #9dc8b0',borderRadius:10,textAlign:'center'}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.7rem',color:'#2a6a4a',marginBottom:4}}>NOON LATITUDE</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'1.4rem',fontWeight:700,color:'#007a50'}}>{noonLat!==null?`${Math.abs(noonLat).toFixed(3)}° ${noonLat>=0?'N':'S'}`:'—'}</div>
            {calcPos&&noonLat!==null&&<div style={{fontSize:'0.68rem',color:'#5a8a7a',marginTop:4}}>GPS: {Math.abs(calcPos.lat).toFixed(3)}° {calcPos.lat>=0?'N':'S'} · Δ {Math.abs(noonLat-calcPos.lat).toFixed(3)}°</div>}
          </div>
        </>):(<div style={{textAlign:'center',padding:'2rem',color:'#6a7a9a'}}>
          <div style={{fontSize:'2rem',marginBottom:8}}>☀️</div>
          <div style={{fontSize:'0.78rem',lineHeight:1.7}}>Lock GPS to predict LAN time<br/>Then enter sextant altitude at maximum Sun</div>
        </div>)}
      </div>
    </div>)}

    {/* ══ PLANNING TAB ══ */}
    {activeTab==='plan'&&(<div>
      {!calcPos?(<div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>📅</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',marginBottom:6}}>Lock GPS Position</div>
        <div style={{fontSize:'0.72rem'}}>Position and date required for celestial planning</div>
      </div>):(<div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
        <div>
          <div style={C.card}>
            <div style={C.hdr}>🌅 DAILY PHENOMENA — Rise / Set UTC</div>
            <div style={{fontSize:'0.65rem',color:'var(--text3)',marginBottom:'0.5rem'}}>Format: Rise / Set UTC  (LMT)</div>
            {planData?(<>
              {planRow('☀️ Sunrise / Sunset',planData.sunrise,calcPos.lon)}
              {planRow('🌆 Civil Twilight (−6°)',planData.civil,calcPos.lon)}
              {planRow('🌃 Nautical Twilight (−12°)',planData.naut,calcPos.lon)}
              {planRow('🔭 Astro Twilight (−18°)',planData.astro,calcPos.lon)}
              {planRow('🌙 Moonrise / Moonset',planData.moonRS,calcPos.lon)}
              <div style={{display:'flex',justifyContent:'space-between',padding:'5px 0',fontSize:'0.78rem'}}>
                <span style={{color:'var(--text2)'}}>☀️ LAN (Meridian Passage)</span>
                <span style={{color:'var(--gold)',fontFamily:'monospace'}}>{planData.lan?fmtHHMM(planData.lan):' —'} UTC {planData.lan&&calcPos?`(${fmtLMT(planData.lan,calcPos.lon)} LMT)`:''}</span>
              </div>
            </>):<div style={{color:'var(--text3)',fontSize:'0.75rem',padding:'1rem',textAlign:'center'}}>⏳ Computing…</div>}
          </div>
        </div>
        <div>
          <div style={C.card}>
            <div style={C.hdr}>🔭 BODIES NOW — ALTITUDE & AZIMUTH</div>
            {calcPos&&(<div style={{display:'flex',flexDirection:'column',gap:'0.3rem'}}>
              {[
                {n:'Sun',data:sunFull(jdNow)},
                {n:'Moon',data:moonFull(jdNow)},
                ...['Venus','Mars','Jupiter','Saturn'].map(p=>({n:p,data:planetGHA(p,jdNow)})),
              ].map(({n,data})=>{
                if(!data)return null;
                const r=calcAz(calcPos.lat,calcPos.lon,data.GHA,data.Dec);
                const col=r.alt>10?'var(--green)':r.alt>0?'var(--gold)':'var(--text3)';
                return(<div key={n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 8px',background:'var(--bg2)',borderRadius:7}}>
                  <span style={{fontSize:'0.76rem',color:'var(--text)'}}>{n}</span>
                  <span style={{fontFamily:'monospace',fontSize:'0.7rem',color:col}}>{r.alt>0?`Alt: ${r.alt.toFixed(1)}°  Zn: ${r.az.toFixed(1)}°`:'Below horizon'}</span>
                </div>);
              })}
            </div>)}
          </div>
          <div style={{...C.card,marginTop:0,marginBottom:0}}>
            <div style={C.hdr}>⭐ OBSERVATION WINDOWS</div>
            {planData&&(<div style={{fontSize:'0.72rem',color:'var(--text2)',lineHeight:2}}>
              {planData.astro?.rise&&planData.naut?.rise&&<div>🌅 <strong>Morning stars:</strong> {fmtHHMM(planData.astro.rise)} – {fmtHHMM(planData.naut.rise)} UTC</div>}
              {planData.naut?.set&&planData.astro?.set&&<div>🌇 <strong>Evening stars:</strong> {fmtHHMM(planData.naut.set)} – {fmtHHMM(planData.astro.set)} UTC</div>}
              <div style={{marginTop:4,padding:'7px',background:'rgba(0,180,216,0.06)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:7}}>Best sight-taking during nautical twilight (horizon + stars visible). Shoot stars at 15°–65° altitude for best accuracy.</div>
            </div>)}
          </div>
        </div>
      </div>)}
    </div>)}

    {/* ══ STAR FINDER TAB ══ */}
    {activeTab==='stars'&&(<div>
      {!calcPos?(<div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>⭐</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',marginBottom:6}}>Lock GPS Position</div>
        <div style={{fontSize:'0.72rem'}}>Position required for star finder</div>
      </div>):(<div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.8rem',flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',fontWeight:700,color:'var(--gold)'}}>⭐ VISIBLE BODIES — {fmtUTC(calcTime||displayNow)}</div>
          <div style={{fontSize:'0.7rem',color:'var(--text3)'}}>{starFinder.length} bodies above 5°</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'0.4rem'}}>
          {starFinder.slice(0,30).map((s,i)=>{
            const isGood=s.alt>=15&&s.alt<=65;
            const isTop=i<3&&s.type==='star';
            return(<div key={s.n} style={{background:isTop?'rgba(240,165,0,0.1)':'var(--card)',border:`1px solid ${isTop?'rgba(240,165,0,0.4)':'var(--border)'}`,borderRadius:9,padding:'8px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:'0.75rem',fontWeight:600,color:isTop?'var(--gold)':'var(--text)'}}>{isTop?'⭐ ':s.type==='planet'?'🪐 ':''}{s.n}</div>
                <div style={{fontSize:'0.62rem',color:isGood?'var(--green)':'var(--text3)',marginTop:1}}>{isGood?'✓ Good altitude':s.alt<15?'Low — refraction':'High — OK'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.8rem',color:isGood?'var(--green)':s.alt>65?'var(--gold)':'var(--text2)',fontWeight:700}}>{s.alt.toFixed(1)}°</div>
                <div style={{fontFamily:'monospace',fontSize:'0.66rem',color:'var(--text3)'}}>Zn {s.az.toFixed(0)}°</div>
              </div>
            </div>);
          })}
        </div>
        {starFinder.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
          <div style={{fontSize:'2rem',marginBottom:8}}>🌅</div>
          <div style={{fontSize:'0.78rem'}}>No stars above 5° — daytime or twilight not yet</div>
        </div>}
        <div style={{marginTop:'0.8rem',padding:'10px 14px',background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,fontSize:'0.7rem',color:'var(--text2)',lineHeight:1.8}}>
          ⭐ First 3 stars are best for a 3-star fix. Choose stars with azimuths spread 60°–120° apart for best accuracy. For a running fix, choose bodies approximately 90° apart in azimuth.
        </div>
      </div>)}
    </div>)}

    {/* ══ LOG TAB ══ */}
    {activeTab==='log'&&(<div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.9rem'}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',fontWeight:700,color:'var(--gold)'}}>📋 SIGHT LOG ({sights.length} sights)</div>
        {sights.length>0&&<button onClick={()=>{setSights([]);localStorage.removeItem(LS_SIGHTS);}} style={{padding:'5px 12px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.3)',borderRadius:7,color:'var(--red)',fontSize:'0.69rem',fontWeight:600,cursor:'pointer'}}>🗑 Clear All</button>}
      </div>
      {sights.length===0?(<div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
        <div style={{fontSize:'3rem',marginBottom:12}}>📋</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',marginBottom:6}}>No Saved Sights</div>
        <div style={{fontSize:'0.72rem'}}>Take observations in Sight tab → tap 💾 Save LOP</div>
      </div>):(
        <div style={{display:'flex',flexDirection:'column',gap:'0.6rem'}}>
          {sights.map((s,i)=>(
            <div key={s.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'0.9rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.5rem',flexWrap:'wrap',gap:4}}>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.67rem',color:'var(--gold)'}}>#{sights.length-i} — {s.body}</div>
                <div style={{fontSize:'0.63rem',color:'var(--text3)',fontFamily:'monospace'}}>{fmtUTC(new Date(s.time))}</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(95px,1fr))',gap:'0.35rem'}}>
                {[{l:'Hs',v:fmtAlt(s.Hs)},{l:'Ho',v:fmtAlt(s.Ho),c:'var(--cyan)'},{l:'Hc',v:fmtAlt(s.Hc)},{l:'Zn',v:`${s.Zn.toFixed(1)}°`,c:'var(--text)'},{l:'Intercept',v:`${Math.abs(s.intercept).toFixed(1)}nm`,c:s.toward?'var(--green)':'var(--red)'},{l:'T/A',v:s.toward?'TOWARD':'AWAY',c:s.toward?'var(--green)':'var(--red)'}].map(({l,v,c})=>(
                  <div key={l} style={{background:'var(--bg2)',borderRadius:7,padding:'6px 7px',textAlign:'center'}}>
                    <div style={{fontSize:'0.53rem',color:'var(--text3)',marginBottom:2,textTransform:'uppercase'}}>{l}</div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.7rem',color:c||'var(--text)',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v}</div>
                  </div>))}
              </div>
              <div style={{marginTop:'0.5rem',fontSize:'0.63rem',color:'var(--text3)',fontFamily:'monospace'}}>{fmtDMS(s.pos.lat,'N','S')} {fmtDMS(s.pos.lon,'E','W')}</div>
            </div>))}
        </div>)}
    </div>)}
  </div>);
}
