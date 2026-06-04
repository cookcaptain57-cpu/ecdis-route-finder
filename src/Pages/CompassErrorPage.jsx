/* eslint-disable */
// src/Pages/CompassErrorPage.jsx — Full Enhanced Version v3
// WMM2025 offline engine · GPS lock · Auto-course · Firebase Deviation Card
// All suggestions implemented · Login required (enforced in App.jsx)

import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// ══════════════════════════════════════════════════════════════════════════════
// § 1. WMM-2025 FULL OFFLINE ENGINE (NOAA Gauss Coefficients, degree 1-12)
//       Source: WMM.COF — WMM-2025 released 11/13/2024
// ══════════════════════════════════════════════════════════════════════════════
const WMM_EPOCH = 2025.0;
const WMM_A     = 6371.2; // reference radius km

// [n, m, g(nT), h(nT), dg(nT/yr), dh(nT/yr)]
const WMM_COF = [
  [1,0,-29351.8,0,12.0,0],[1,1,-1410.8,4545.4,9.7,-21.5],
  [2,0,-2556.6,0,-11.6,0],[2,1,2951.1,-3133.6,-5.2,-27.7],[2,2,1649.3,-815.1,-8.0,-12.1],
  [3,0,1361.0,0,-1.3,0],[3,1,-2404.1,-56.6,-4.2,4.0],[3,2,1243.8,237.5,0.4,-0.3],[3,3,453.6,-549.5,-15.6,-4.1],
  [4,0,895.0,0,-1.6,0],[4,1,799.5,278.6,-2.4,-1.1],[4,2,55.7,-133.9,-6.0,4.1],[4,3,-281.1,212.0,5.6,1.6],[4,4,12.1,-375.6,-7.0,-4.4],
  [5,0,-233.2,0,0.6,0],[5,1,368.9,45.4,1.4,-0.5],[5,2,187.2,220.2,0.0,2.2],[5,3,-138.7,-122.9,0.6,0.4],[5,4,-142.0,43.0,2.2,1.7],[5,5,20.9,106.1,0.9,1.9],
  [6,0,64.4,0,-0.2,0],[6,1,63.8,-18.4,-0.4,0.3],[6,2,76.9,16.8,0.9,-1.6],[6,3,-115.7,48.8,1.2,-0.4],[6,4,-40.9,-59.8,-0.9,0.9],[6,5,14.9,10.9,0.3,0.7],[6,6,-60.7,72.7,0.9,0.9],
  [7,0,79.5,0,-0.0,0],[7,1,-77.0,-48.9,-0.1,0.6],[7,2,-8.8,-14.4,-0.1,0.5],[7,3,59.3,-1.0,0.5,-0.8],[7,4,15.8,23.4,-0.1,0.0],[7,5,2.5,-7.4,-0.8,-1.0],[7,6,-11.1,-25.1,-0.8,0.6],[7,7,14.2,-2.3,0.8,-0.2],
  [8,0,23.2,0,-0.1,0],[8,1,10.8,7.1,0.2,-0.2],[8,2,-17.5,-12.6,0.0,0.5],[8,3,2.0,11.4,0.5,-0.4],[8,4,-21.7,-9.7,-0.1,0.4],[8,5,16.9,12.7,0.3,-0.5],[8,6,15.0,0.7,0.2,-0.6],[8,7,-16.8,-5.2,-0.0,0.3],[8,8,0.9,3.9,0.2,0.2],
  [9,0,4.6,0,-0.0,0],[9,1,7.8,-24.8,-0.1,-0.3],[9,2,3.0,12.2,0.1,0.3],[9,3,-0.2,8.3,0.3,-0.3],[9,4,-2.5,-3.3,-0.3,0.3],[9,5,-13.1,-5.2,0.0,0.2],[9,6,2.4,7.2,0.3,-0.1],[9,7,8.6,-0.6,-0.1,-0.2],[9,8,-8.7,0.8,0.1,0.4],[9,9,-12.9,10.0,-0.1,0.1],
  [10,0,-1.3,0,0.1,0],[10,1,-6.4,3.3,0.0,0.0],[10,2,0.2,0.0,0.1,-0.0],[10,3,2.0,2.4,0.1,-0.2],[10,4,-1.0,5.3,-0.0,0.1],[10,5,-0.6,-9.1,-0.3,-0.1],[10,6,-0.9,0.4,0.0,0.1],[10,7,1.5,-4.2,-0.1,0.0],[10,8,0.9,-3.8,-0.1,-0.1],[10,9,-2.7,0.9,-0.0,0.2],[10,10,-3.9,-9.1,-0.0,-0.0],
  [11,0,2.9,0,0.0,0],[11,1,-1.5,0.0,-0.0,-0.0],[11,2,-2.5,2.9,0.0,0.1],[11,3,2.4,-0.6,0.0,-0.0],[11,4,-0.6,0.2,0.0,0.1],[11,5,-0.1,0.5,-0.1,-0.0],[11,6,-0.6,-0.3,0.0,-0.0],[11,7,-0.1,-1.2,-0.0,0.1],[11,8,1.1,-1.7,-0.1,-0.0],[11,9,-1.0,-2.9,-0.1,0.0],[11,10,-0.2,-1.8,-0.1,0.0],[11,11,2.6,-2.3,-0.1,0.0],
  [12,0,-2.0,0,0.0,0],[12,1,-0.2,-1.3,0.0,-0.0],[12,2,0.3,0.7,-0.0,0.0],[12,3,1.2,1.0,-0.0,-0.1],[12,4,-1.3,-1.4,-0.0,0.1],[12,5,0.6,-0.0,-0.0,-0.0],[12,6,0.6,0.6,0.1,-0.0],[12,7,0.5,-0.1,-0.0,-0.0],[12,8,-0.1,0.8,0.0,0.0],[12,9,-0.4,0.1,0.0,-0.0],[12,10,-0.2,-1.0,-0.1,-0.0],[12,11,-1.3,0.1,-0.0,0.0],[12,12,-0.7,0.2,-0.1,-0.1],
];

// Schmidt QN Associated Legendre functions and their theta-derivatives
function schmidtLegendre(theta, nmax) {
  const sin_t = Math.sin(theta), cos_t = Math.cos(theta);
  const safeSinT = Math.abs(sin_t) < 1e-10 ? 1e-10 : sin_t;
  const P  = Array.from({length:nmax+1}, (_,n) => new Float64Array(n+2));
  const dP = Array.from({length:nmax+1}, (_,n) => new Float64Array(n+2));
  P[0][0]=1; dP[0][0]=0;
  P[1][0]=cos_t; dP[1][0]=-sin_t;
  P[1][1]=sin_t; dP[1][1]=cos_t;
  for (let n=2; n<=nmax; n++) {
    // Sectoral m=n
    const ks = Math.sqrt((2*n-1)/(2*n));
    P[n][n]  = sin_t * ks * P[n-1][n-1];
    dP[n][n] = cos_t * ks * P[n-1][n-1] + sin_t * ks * dP[n-1][n-1];
    // Subdiagonal m=n-1
    const kd = Math.sqrt(2*n-1);
    P[n][n-1]  = cos_t * kd * P[n-1][n-1];
    dP[n][n-1] = -sin_t * kd * P[n-1][n-1] + cos_t * kd * dP[n-1][n-1];
    // General m=0..n-2
    for (let m=0; m<=n-2; m++) {
      const n2m2 = n*n - m*m;
      const c1 = (2*n-1) / Math.sqrt(n2m2);
      const c2 = Math.sqrt(((n-1)*(n-1) - m*m) / n2m2);
      P[n][m]  = c1 * cos_t * P[n-1][m]  - c2 * P[n-2][m];
      dP[n][m] = c1 * (-sin_t*P[n-1][m] + cos_t*dP[n-1][m]) - c2 * dP[n-2][m];
    }
  }
  return { P, dP, sin_t: safeSinT };
}

// Full WMM2025 computation → returns {variation°, X, Y, Z nT, dDdt°/yr}
function computeWMM2025(lat_deg, lon_deg, alt_km, date) {
  const year = date.getFullYear() + (date.getMonth()/12) + (date.getDate()/365.25);
  const dt   = year - WMM_EPOCH;
  const r    = WMM_A + (alt_km || 0);
  const theta = Math.PI/2 - lat_deg * Math.PI/180; // colatitude
  const phi   = lon_deg * Math.PI/180;
  const nmax  = 12;

  // Time-updated g/h and their secular rates (for dD/dt)
  const G={}, H={}, dG={}, dH={};
  for (const [n,m,g,h,dg,dh] of WMM_COF) {
    if (!G[n]){G[n]={};H[n]={};dG[n]={};dH[n]={};}
    G[n][m] = g + dg*dt;  H[n][m] = h + dh*dt;
    dG[n][m] = dg;        dH[n][m] = dh;
  }

  const { P, dP, sin_t } = schmidtLegendre(theta, nmax);

  let Br=0, Bt=0, Bp=0, dBrdt=0, dBtdt=0, dBpdt=0;

  for (let n=1; n<=nmax; n++) {
    const ar = Math.pow(WMM_A/r, n+2);
    for (let m=0; m<=n; m++) {
      const g   = G[n]?.[m]  ?? 0;   const h   = H[n]?.[m]  ?? 0;
      const dgv = dG[n]?.[m] ?? 0;   const dhv = dH[n]?.[m] ?? 0;
      const cos_ml = Math.cos(m*phi); const sin_ml = Math.sin(m*phi);
      const gmh  =  g*cos_ml + h*sin_ml;   // for Br, Bt
      const ghm  = -g*sin_ml + h*cos_ml;   // for Bp
      const dgmh =  dgv*cos_ml + dhv*sin_ml;
      const dghm = -dgv*sin_ml + dhv*cos_ml;

      Br    +=  (n+1) * ar * P[n][m] * gmh;
      Bt    -=  ar * dP[n][m] * gmh;
      Bp    -=  ar * m / sin_t * P[n][m] * ghm;  // Note: negative sign from B=-∇V
      dBrdt +=  (n+1) * ar * P[n][m] * dgmh;
      dBtdt -=  ar * dP[n][m] * dgmh;
      dBpdt -=  ar * m / sin_t * P[n][m] * dghm;
    }
  }

  const X = -Bt, Y = Bp, Z = -Br;          // geographic components (nT)
  const dXdt = -dBtdt, dYdt = dBpdt;
  const H2   = X*X + Y*Y;
  const variation = Math.atan2(Y, X) * 180 / Math.PI;  // declination (°)
  const dDdt = H2 > 1 ? (X*dYdt - Y*dXdt) / H2 : 0;   // °/yr

  return { variation, X, Y, Z, dDdt };
}

// ══════════════════════════════════════════════════════════════════════════════
// § 2. ASTRONOMICAL ENGINE
// ══════════════════════════════════════════════════════════════════════════════
const toRad   = d => d * Math.PI / 180;
const toDeg   = r => r * 180 / Math.PI;
const norm360 = d => ((d % 360) + 360) % 360;
const clamp   = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const julianDate = date => date.getTime() / 86400000 + 2440587.5;

const ghaAries = jd => {
  const T = (jd - 2451545.0) / 36525;
  return norm360(280.46061837 + 360.98564736629*(jd-2451545) + 0.000387933*T*T - T*T*T/38710000);
};

const sunGHADec = jd => {
  const T=jd/36525-66.7619; const T2=T*T;
  const L0=norm360(280.46646+36000.76983*T+0.0003032*T2);
  const M=norm360(357.52911+35999.05029*T-0.0001537*T2);
  const Mr=toRad(M);
  const C=(1.914602-0.004817*T-0.000014*T2)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  const sunLon=norm360(L0+C);
  const omega=125.04-1934.136*(jd-2451545)/36525;
  const lam=toRad(sunLon-0.00569-0.00478*Math.sin(toRad(omega)));
  const eps=toRad(23.4392911-0.013004167*(jd-2451545)/36525);
  const RA=norm360(toDeg(Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam))));
  const Dec=toDeg(Math.asin(clamp(Math.sin(eps)*Math.sin(lam),-1,1)));
  return { GHA:norm360(ghaAries(jd)-RA), Dec };
};

const moonGHADec = jd => {
  const T=(jd-2451545)/36525;
  const L=norm360(218.3164477+481267.88123421*T-0.0015786*T*T);
  const D=norm360(297.8501921+445267.1114034*T-0.0018819*T*T);
  const M=norm360(357.5291092+35999.0502909*T-0.0001536*T*T);
  const Mp=norm360(134.9633964+477198.8675055*T+0.0087414*T*T);
  const F=norm360(93.2720950+483202.0175233*T-0.0036539*T*T);
  const[Dr,Mr,Mpr,Fr]=[D,M,Mp,F].map(toRad);
  const dL=(6288774*Math.sin(Mpr)+1274027*Math.sin(2*Dr-Mpr)+658314*Math.sin(2*Dr)+213618*Math.sin(2*Mpr)-185116*Math.sin(Mr)-114332*Math.sin(2*Fr)+58793*Math.sin(2*Dr-2*Mpr)+57066*Math.sin(2*Dr-Mr-Mpr)+53322*Math.sin(2*Dr+Mpr)+45758*Math.sin(2*Dr-Mr))/1e6;
  const dB=(5128122*Math.sin(Fr)+280602*Math.sin(Mpr+Fr)+277693*Math.sin(Mpr-Fr)+173237*Math.sin(2*Dr-Fr)+55413*Math.sin(2*Dr-Mpr+Fr)+46271*Math.sin(2*Dr-Mpr-Fr))/1e6;
  const lam2=toRad(L+dL),bet=toRad(dB);
  const eps=toRad(23.4392911-0.013004167*T);
  const x=Math.cos(bet)*Math.cos(lam2);
  const y=Math.cos(eps)*Math.cos(bet)*Math.sin(lam2)-Math.sin(eps)*Math.sin(bet);
  const z=Math.sin(eps)*Math.cos(bet)*Math.sin(lam2)+Math.cos(eps)*Math.sin(bet);
  return{GHA:norm360(ghaAries(jd)-norm360(toDeg(Math.atan2(y,x)))),Dec:toDeg(Math.asin(clamp(z,-1,1)))};
};

const planetGHADec=(name,jd)=>{
  const T=(jd-2451545)/36525;
  const EL={Venus:[181.979801,58519.212948,0.72333,0.006773,3.3947,131.5637,76.6799],Mars:[355.433275,19141.696551,1.52368,0.093405,1.8497,336.0602,49.5581],Jupiter:[34.351519,3036.302374,5.20260,0.048498,1.3053,14.3313,100.4644],Saturn:[50.077444,1223.511285,9.55491,0.055508,2.4848,93.0572,113.6655]};
  const el=EL[name];if(!el)return null;
  const[L0,L1,a,e,i,w,O]=el;
  const Mv=toRad(norm360(L0+L1*T-w));let E=Mv;
  for(let k=0;k<8;k++)E=Mv+e*Math.sin(E);
  const v=2*Math.atan2(Math.sqrt(1+e)*Math.sin(E/2),Math.sqrt(1-e)*Math.cos(E/2));
  const r=a*(1-e*Math.cos(E));
  const u=toRad(norm360(toDeg(v)+w-O));
  const Or=toRad(O),ir=toRad(i);
  const xh=r*(Math.cos(Or)*Math.cos(u)-Math.sin(Or)*Math.sin(u)*Math.cos(ir));
  const yh=r*(Math.sin(Or)*Math.cos(u)+Math.cos(Or)*Math.sin(u)*Math.cos(ir));
  const zh=r*Math.sin(u)*Math.sin(ir);
  const Ms=toRad(norm360(357.52911+35999.05029*T));
  const Cs=1.9146*Math.sin(Ms)+0.0200*Math.sin(2*Ms);
  const sL=toRad(norm360(280.46646+36000.76983*T+Cs));
  const Re=1.00014-0.01671*Math.cos(Ms)-0.00014*Math.cos(2*Ms);
  const xe=Re*Math.cos(sL+Math.PI),ye=Re*Math.sin(sL+Math.PI);
  const eps=toRad(23.4392911-0.013004167*T);
  const xg=xh+xe,yg=yh+ye;
  const yeq=yg*Math.cos(eps)-zh*Math.sin(eps);
  const zeq=yg*Math.sin(eps)+zh*Math.cos(eps);
  const dist=Math.sqrt(xg*xg+yeq*yeq+zeq*zeq);
  const RA=norm360(toDeg(Math.atan2(yeq,xg)));
  return{GHA:norm360(ghaAries(jd)-RA),Dec:toDeg(Math.asin(clamp(zeq/dist,-1,1)))};
};

const NAV_STARS=[
  {name:'Polaris ⭐',SHA:318.7,Dec:89.0},
  {name:'Acamar',SHA:315.5,Dec:-40.3},{name:'Achernar',SHA:335.5,Dec:-57.2},{name:'Acrux',SHA:173.3,Dec:-63.1},{name:'Adhara',SHA:255.3,Dec:-28.9},{name:'Aldebaran',SHA:291.2,Dec:16.5},{name:'Alioth',SHA:166.6,Dec:55.9},{name:'Alkaid',SHA:153.2,Dec:49.3},{name:"Al Na'ir",SHA:28.1,Dec:-47.0},{name:'Alnilam',SHA:276.1,Dec:-1.2},{name:'Alphard',SHA:218.2,Dec:-8.7},{name:'Alphecca',SHA:126.3,Dec:26.7},{name:'Alpheratz',SHA:358.0,Dec:29.1},{name:'Altair',SHA:62.3,Dec:8.9},{name:'Ankaa',SHA:353.5,Dec:-42.3},{name:'Antares',SHA:112.6,Dec:-26.4},{name:'Arcturus',SHA:146.2,Dec:19.2},{name:'Atria',SHA:108.0,Dec:-69.0},{name:'Avior',SHA:234.3,Dec:-59.5},{name:'Bellatrix',SHA:279.0,Dec:6.3},{name:'Betelgeuse',SHA:271.2,Dec:7.4},{name:'Canopus',SHA:264.1,Dec:-52.7},{name:'Capella',SHA:281.1,Dec:46.0},{name:'Deneb',SHA:49.7,Dec:45.3},{name:'Denebola',SHA:182.9,Dec:14.6},{name:'Diphda',SHA:349.2,Dec:-18.0},{name:'Dubhe',SHA:194.2,Dec:61.8},{name:'Elnath',SHA:278.7,Dec:28.6},{name:'Eltanin',SHA:90.7,Dec:51.5},{name:'Enif',SHA:34.1,Dec:9.9},{name:'Fomalhaut',SHA:15.5,Dec:-29.7},{name:'Gacrux',SHA:172.2,Dec:-57.1},{name:'Gienah',SHA:176.2,Dec:-17.5},{name:'Hadar',SHA:149.2,Dec:-60.3},{name:'Hamal',SHA:328.3,Dec:23.5},{name:'Kaus Australis',SHA:84.1,Dec:-34.4},{name:'Kochab',SHA:137.3,Dec:74.1},{name:'Markab',SHA:14.0,Dec:15.2},{name:'Menkar',SHA:314.4,Dec:4.1},{name:'Menkent',SHA:148.3,Dec:-36.3},{name:'Miaplacidus',SHA:221.9,Dec:-69.7},{name:'Mirfak',SHA:309.2,Dec:49.9},{name:'Nunki',SHA:76.3,Dec:-26.3},{name:'Peacock',SHA:54.0,Dec:-56.8},{name:'Pollux',SHA:243.8,Dec:28.0},{name:'Procyon',SHA:245.2,Dec:5.2},{name:'Rasalhague',SHA:96.4,Dec:12.6},{name:'Regulus',SHA:208.0,Dec:12.0},{name:'Rigel',SHA:281.3,Dec:-8.2},{name:'Rigil Kent.',SHA:140.2,Dec:-60.8},{name:'Sabik',SHA:102.4,Dec:-15.7},{name:'Schedar',SHA:350.0,Dec:56.5},{name:'Shaula',SHA:96.8,Dec:-37.1},{name:'Sirius',SHA:258.9,Dec:-16.7},{name:'Spica',SHA:158.8,Dec:-11.2},{name:'Suhail',SHA:223.1,Dec:-43.4},{name:'Vega',SHA:80.9,Dec:38.8},{name:'Zubenelgenubi',SHA:137.4,Dec:-16.0},
];

const getBodyPos=(body,jd)=>{
  if(body==='Sun')return sunGHADec(jd);
  if(body==='Moon')return moonGHADec(jd);
  if(['Venus','Mars','Jupiter','Saturn'].includes(body))return planetGHADec(body,jd);
  const s=NAV_STARS.find(x=>x.name===body);
  return s?{GHA:norm360(ghaAries(jd)+s.SHA),Dec:s.Dec}:null;
};

const calcAz=(lat,lon,GHA,Dec)=>{
  const LHA=norm360(GHA+lon);
  const[latR,decR,lhaR]=[lat,Dec,LHA].map(toRad);
  const sinH=clamp(Math.sin(latR)*Math.sin(decR)+Math.cos(latR)*Math.cos(decR)*Math.cos(lhaR),-1,1);
  const H=Math.asin(sinH);
  const cosZ=clamp((Math.sin(decR)-Math.sin(latR)*sinH)/(Math.cos(latR)*Math.cos(H)),-1,1);
  const Z=toDeg(Math.acos(cosZ));
  return{azimuth:norm360(Math.sin(lhaR)>0?360-Z:Z),altitude:toDeg(H),LHA,GHA,Dec};
};

const refraction=alt=>{if(alt<-5)return 0;return 1.02/Math.tan(toRad(alt+10.3/(alt+5.11)))/60;};
const normErr=e=>((e+180)%360+360)%360-180;

// ══════════════════════════════════════════════════════════════════════════════
// § 3. FORMAT HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const p2=n=>String(Math.floor(Math.abs(n))).padStart(2,'0');
const MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtUTC=d=>`${d.getUTCDate()} ${MO[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC`;
const fmtLMT=(d,lon)=>{const ms=d.getTime()+(lon/15)*3600000;const l=new Date(ms);return`${p2(l.getUTCHours())}:${p2(l.getUTCMinutes())}:${p2(l.getUTCSeconds())} LMT`;};
const fmtDMS=(v,pos,neg)=>{const d=Math.floor(Math.abs(v)),m=((Math.abs(v)-d)*60).toFixed(1);return`${d}° ${m}' ${v>=0?pos:neg}`;};
const fmtBrg=v=>v===null||isNaN(v)?'—':`${norm360(v).toFixed(1)}°`;
const fmtErr=v=>v===null||isNaN(v)?'—':`${Math.abs(v).toFixed(1)}° ${v>=0?'E':'W'}`;
const eClr=v=>v===null?'#0a1628':v>=0?'#007a50':'#cc2233';
const eClrD=v=>v===null?'var(--text)':v>=0?'var(--green)':'var(--red)';

// ══════════════════════════════════════════════════════════════════════════════
// § 4. STATIC DATA
// ══════════════════════════════════════════════════════════════════════════════
const BODY_GROUPS=[{group:'☀️ Solar System',items:['Sun','Moon','Venus','Mars','Jupiter','Saturn']},{group:'⭐ Nav Stars + Polaris',items:NAV_STARS.map(s=>s.name)}];
const BODY_ICON={Sun:'☀️',Moon:'🌙',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄','Polaris ⭐':'⭐'};
const DEV_HDGS=[0,45,90,135,180,225,270,315];
const DEV_LBLS=['N','NE','E','SE','S','SW','W','NW'];
const LS_HIST='cmp_history_v3';
const LT={card:{background:'#f2f7fc',border:'1px solid #ccd8e8',borderRadius:14,padding:'1.2rem',color:'#0a1628',fontFamily:"'Exo 2',sans-serif"},secHdr:{fontWeight:700,fontSize:'0.85rem',color:'#0a1628',textAlign:'center',margin:'0.8rem 0 0.35rem',paddingBottom:'0.3rem',borderBottom:'1.5px solid #ccd8e8'},row:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #e2ecf5'},lbl:{fontSize:'0.83rem',color:'#2a3a5a'},val:{fontFamily:"'Orbitron',monospace",fontSize:'0.87rem',color:'#0a1628',fontWeight:600},adjBtn:{padding:'4px 9px',background:'#e2ecf5',border:'1px solid #b0c2d4',borderRadius:6,color:'#2a3a5a',cursor:'pointer',fontSize:'0.9rem',fontWeight:700}};
const DC_STYLE={card:{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1rem',marginBottom:'0.75rem'},hdr:{fontFamily:"'Orbitron',monospace",fontSize:'0.67rem',fontWeight:700,color:'var(--cyan)',marginBottom:'0.65rem'},inp:{width:'100%',padding:'9px 6px',background:'var(--bg2)',border:'1.5px solid var(--border2)',borderRadius:8,color:'var(--text)',fontFamily:"'Orbitron',monospace",fontSize:'0.9rem',outline:'none',textAlign:'center'}};

// Deviation curve SVG
function DeviationChart({deviations}){
  const W=340,H=160,padL=36,padR=10,padT=10,padB=28;
  const iW=W-padL-padR,iH=H-padT-padB;
  const maxDev=15;
  const xs=DEV_HDGS.map((_,i)=>padL+(i/(DEV_HDGS.length-1))*iW);
  const ys=deviations.map(d=>padT+iH/2-(Math.max(-maxDev,Math.min(maxDev,parseFloat(d)||0))/maxDev)*(iH/2));
  const pts=xs.map((x,i)=>`${x},${ys[i]}`).join(' ');
  const zy=padT+iH/2;
  return(<svg width={W} height={H} style={{display:'block',margin:'0 auto',overflow:'visible'}}>
    {[-10,-5,0,5,10].map(v=>{const y=padT+iH/2-(v/maxDev)*(iH/2);return<g key={v}><line x1={padL} y1={y} x2={W-padR} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth={v===0?1.5:0.7}/><text x={padL-4} y={y+4} textAnchor="end" fontSize="9" fill="var(--text3)">{v>0?'+':''}{v}</text></g>;})}
    {DEV_HDGS.map((h,i)=><text key={h} x={xs[i]} y={H-4} textAnchor="middle" fontSize="9" fill="var(--text3)">{h}°</text>)}
    <line x1={padL} y1={zy} x2={W-padR} y2={zy} stroke="var(--text3)" strokeWidth={1} strokeDasharray="3,3"/>
    <polyline points={`${xs[0]},${zy} ${pts} ${xs[xs.length-1]},${zy}`} fill="rgba(0,180,216,0.06)" stroke="none"/>
    <polyline points={pts} fill="none" stroke="var(--cyan)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
    {xs.map((x,i)=>{const v=parseFloat(deviations[i])||0;return<circle key={i} cx={x} cy={ys[i]} r={4} fill={v>=0?'var(--green)':'var(--red)'} stroke="var(--bg)" strokeWidth={1.5}/>;})}
  </svg>);
}

// ══════════════════════════════════════════════════════════════════════════════
// § 5. MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function CompassErrorPage({user}){
  // ── GPS Lock ──────────────────────────────────────────────────────────────
  const [lockedPos,   setLockedPos]   = useState(null);  // {lat,lon} — locked
  const [lockedTime,  setLockedTime]  = useState(null);  // Date — locked
  const [displayNow,  setDisplayNow]  = useState(new Date()); // live clock display
  const [gpsLoading,  setGpsLoading]  = useState(false);
  const [posErr,      setPosErr]      = useState('');

  // Manual edit override (when GPS unavailable)
  const [manualMode, setManualMode]   = useState(false);
  const [manualLat,  setManualLat]    = useState('');
  const [manualLon,  setManualLon]    = useState('');
  const [manualUTC,  setManualUTC]    = useState('');  // ISO string or HH:MM:SS

  // Device course (from DeviceOrientationEvent)
  const [deviceCourse, setDeviceCourse] = useState(null); // degrees

  // Common inputs
  const [body,      setBody]      = useState('Sun');
  const [gyroHdg,   setGyroHdg]   = useState('000.0');
  const [stdHdg,    setStdHdg]    = useState('000.0');
  const [gyroObs,   setGyroObs]   = useState('');
  const [gyroLock,  setGyroLock]  = useState(false);

  // Variation (from WMM2025)
  const [varMag,    setVarMag]    = useState('0.0');
  const [varDir,    setVarDir]    = useState('W');
  const [varDDdt,   setVarDDdt]   = useState(null);  // °/yr
  const [varSrc,    setVarSrc]    = useState('');

  // Amplitude tab
  const [ampRising,  setAmpRising] = useState(true);
  const [ampCmpBrg,  setAmpCmpBrg]= useState('');
  const [ampGyroBrg, setAmpGyroBrg]= useState('');

  // Polaris tab
  const [polCmpBrg,  setPolCmpBrg] = useState('');
  const [polGyroBrg, setPolGyroBrg]= useState('');

  // Tabs
  const [activeTab, setActiveTab]   = useState('calc');

  // History (localStorage)
  const [history, setHistory] = useState(()=>{try{return JSON.parse(localStorage.getItem(LS_HIST)||'[]');}catch{return[];}});

  // Deviation Card (Firebase)
  const [shipName,    setShipName]    = useState('');
  const [devCard,     setDevCard]     = useState(Array(8).fill(''));
  const [devSaving,   setDevSaving]   = useState(false);
  const [devSaved,    setDevSaved]    = useState(false);
  const [devLoading,  setDevLoading]  = useState(false);

  const [copied, setCopied]   = useState(false);
  const [isMob,  setIsMob]    = useState(window.innerWidth < 720);

  // Effective position and time for calculations
  const calcPos = manualMode && manualLat && manualLon
    ? { lat: parseFloat(manualLat), lon: parseFloat(manualLon) }
    : lockedPos;

  const calcTime = manualMode && manualUTC
    ? (() => { try { return new Date(manualUTC.includes('T') ? manualUTC : `${new Date().toISOString().slice(0,10)}T${manualUTC}Z`); } catch { return lockedTime; } })()
    : lockedTime;

  // ── Resize ─────────────────────────────────────────────────────────────────
  useEffect(()=>{const onR=()=>setIsMob(window.innerWidth<720);window.addEventListener('resize',onR);return()=>window.removeEventListener('resize',onR);},[]);

  // ── Live clock display ─────────────────────────────────────────────────────
  useEffect(()=>{const t=setInterval(()=>setDisplayNow(new Date()),1000);return()=>clearInterval(t);},[]);

  // ── Fetch & Lock GPS ───────────────────────────────────────────────────────
  const fetchAndLockGPS = useCallback(()=>{
    if(!navigator.geolocation){setPosErr('GPS not available');setManualMode(true);return;}
    setGpsLoading(true); setPosErr('');
    navigator.geolocation.getCurrentPosition(
      p=>{
        const pos={lat:p.coords.latitude, lon:p.coords.longitude};
        setLockedPos(pos); setLockedTime(new Date()); setGpsLoading(false);
        setManualLat(p.coords.latitude.toFixed(6));
        setManualLon(p.coords.longitude.toFixed(6));
        // Compute WMM2025 variation
        try{
          const wmm=computeWMM2025(pos.lat,pos.lon,0,new Date());
          setVarMag(Math.abs(wmm.variation).toFixed(2));
          setVarDir(wmm.variation>=0?'E':'W');
          setVarDDdt(wmm.dDdt);
          setVarSrc('WMM-2025');
        }catch(e){setVarSrc('manual');}
      },
      e=>{
        setGpsLoading(false); setPosErr(e.message||'GPS denied');
        setManualMode(true);
        // Still try WMM with last known position if any
      },
      {enableHighAccuracy:true,timeout:15000}
    );
  },[]);

  useEffect(()=>{fetchAndLockGPS();},[fetchAndLockGPS]);

  // ── Device Orientation (course from device compass) ────────────────────────
  useEffect(()=>{
    const handler=e=>{
      let heading=null;
      if(e.webkitCompassHeading!=null){heading=e.webkitCompassHeading;}
      else if(e.absolute && e.alpha!=null){heading=norm360(360-e.alpha);}
      if(heading!=null){setDeviceCourse(heading);}
    };
    const tryListen=()=>{
      window.addEventListener('deviceorientationabsolute',handler,true);
      window.addEventListener('deviceorientation',handler,true);
    };
    if(typeof DeviceOrientationEvent!=='undefined' && typeof DeviceOrientationEvent.requestPermission==='function'){
      // iOS 13+ requires permission (will be asked on user gesture elsewhere)
      DeviceOrientationEvent.requestPermission().then(p=>{if(p==='granted')tryListen();}).catch(()=>{});
    } else {
      tryListen();
    }
    return()=>{window.removeEventListener('deviceorientationabsolute',handler,true);window.removeEventListener('deviceorientation',handler,true);};
  },[]);

  // Auto-fill gyro heading from device course
  useEffect(()=>{if(deviceCourse!=null && !gyroLock)setGyroHdg(norm360(deviceCourse).toFixed(1));},[deviceCourse]);

  // ── Load Deviation Card from Firebase ─────────────────────────────────────
  useEffect(()=>{
    if(!user) return;
    setDevLoading(true);
    getDoc(doc(db,'users',user.uid,'compass','deviation_card'))
      .then(snap=>{
        if(snap.exists()){
          const d=snap.data();
          setShipName(d.shipName||'');
          setDevCard(d.deviations||Array(8).fill(''));
        }
        setDevLoading(false);
      })
      .catch(()=>setDevLoading(false));
  },[user?.uid]);

  // Save deviation card to Firebase
  const saveDevCard=async()=>{
    if(!user)return;
    setDevSaving(true);
    try{
      await setDoc(doc(db,'users',user.uid,'compass','deviation_card'),{shipName,deviations:devCard,updatedAt:serverTimestamp()});
      setDevSaved(true); setTimeout(()=>setDevSaved(false),3000);
    }catch(e){alert('Save failed: '+e.message);}
    setDevSaving(false);
  };

  // ── Astronomical calculations (use LOCKED pos/time) ────────────────────────
  const jd  = calcTime ? julianDate(calcTime) : julianDate(displayNow);
  const ghaAr = calcPos ? ghaAries(jd) : null;
  const bp    = calcPos ? getBodyPos(body,jd) : null;
  const az    = bp&&calcPos ? calcAz(calcPos.lat,calcPos.lon,bp.GHA,bp.Dec) : null;
  const altApp = az ? az.altitude + refraction(az.altitude) : null;
  const trueBrg = az ? az.azimuth : null;

  // Gyro observed bearing
  const gyroBrgNum = gyroLock&&gyroObs!=='' ? parseFloat(gyroObs) : (trueBrg??0);
  const ghNum=parseFloat(gyroHdg)||0, shNum=parseFloat(stdHdg)||0;
  const stdBrg=norm360(gyroBrgNum+(shNum-ghNum));
  const varSigned=(parseFloat(varMag)||0)*(varDir==='E'?1:-1);
  const gyroErr=trueBrg!==null?normErr(trueBrg-gyroBrgNum):null;
  const stdErr=trueBrg!==null?normErr(trueBrg-stdBrg):null;
  const deviation=stdErr!==null?stdErr-varSigned:null;

  // Amplitude
  const ampA=bp&&calcPos?Math.asin(clamp(Math.sin(toRad(bp.Dec))/Math.cos(toRad(calcPos.lat)),-1,1))*180/Math.PI:null;
  const ampTrueBrg=ampA!==null?(ampRising?(bp.Dec>=0?90-Math.abs(ampA):90+Math.abs(ampA)):(bp.Dec>=0?270+Math.abs(ampA):270-Math.abs(ampA))):null;
  const ampNorm=ampTrueBrg!==null?norm360(ampTrueBrg):null;

  // Auto-fill amplitude bearing from computed azimuth
  useEffect(()=>{
    if(activeTab==='amplitude'&&az){
      if(!ampCmpBrg)setAmpCmpBrg(az.azimuth.toFixed(1));
      if(!ampGyroBrg)setAmpGyroBrg(az.azimuth.toFixed(1));
    }
  },[activeTab,az?.azimuth]);

  const ampCmpErr=ampNorm!==null&&ampCmpBrg?normErr(ampNorm-parseFloat(ampCmpBrg)):null;
  const ampGyroErr=ampNorm!==null&&ampGyroBrg?normErr(ampNorm-parseFloat(ampGyroBrg)):null;
  const ampStdDev=ampCmpErr!==null?ampCmpErr-varSigned:null;

  // Polaris
  const polBp=calcPos?getBodyPos('Polaris ⭐',jd):null;
  const polAz=polBp&&calcPos?calcAz(calcPos.lat,calcPos.lon,polBp.GHA,polBp.Dec):null;
  const polTrue=polAz?polAz.azimuth:null;
  // Auto-fill polaris bearing
  useEffect(()=>{
    if(activeTab==='polaris'&&polAz){
      if(!polCmpBrg)setPolCmpBrg(polAz.azimuth.toFixed(1));
      if(!polGyroBrg)setPolGyroBrg(polAz.azimuth.toFixed(1));
    }
  },[activeTab,polAz?.azimuth]);
  const polCmpErr=polTrue!==null&&polCmpBrg?normErr(polTrue-parseFloat(polCmpBrg)):null;
  const polGyroErr=polTrue!==null&&polGyroBrg?normErr(polTrue-parseFloat(polGyroBrg)):null;
  const polDev=polCmpErr!==null?polCmpErr-varSigned:null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const adjGyro=delta=>{setGyroLock(true);setGyroObs(p=>norm360((parseFloat(p!==''?p:(trueBrg??0))+delta)).toFixed(1));};
  const adjVar=delta=>setVarMag(p=>Math.max(0,parseFloat(((parseFloat(p)||0)+delta).toFixed(2))).toFixed(2));
  const resetGyro=()=>{setGyroLock(false);setGyroObs('');};

  const saveToHistory=()=>{
    if(!calcPos||trueBrg===null)return;
    const entry={id:Date.now(),dt:fmtUTC(calcTime||displayNow),pos:`${fmtDMS(calcPos.lat,'N','S')} ${fmtDMS(calcPos.lon,'E','W')}`,body,trueBrg:trueBrg.toFixed(1),gyroErr:fmtErr(gyroErr),stdErr:fmtErr(stdErr),dev:fmtErr(deviation),varStr:`${varMag}° ${varDir}`,gyroHdg:ghNum.toFixed(1),stdHdg:shNum.toFixed(1)};
    const h=[entry,...history].slice(0,10);
    setHistory(h); localStorage.setItem(LS_HIST,JSON.stringify(h));
  };

  const copyLog=()=>{
    if(!calcPos||trueBrg===null)return;
    const t=[`COMPASS ERROR — ${fmtUTC(calcTime||displayNow)}`,`${fmtDMS(calcPos.lat,'N','S')}  ${fmtDMS(calcPos.lon,'E','W')}`,`Body: ${body}`,``,`HEADING  Gyro: ${ghNum.toFixed(1)}°  Std: ${shNum.toFixed(1)}°`,`BEARING  True: ${fmtBrg(trueBrg)}  Gyro: ${fmtBrg(gyroBrgNum)}  Std: ${fmtBrg(stdBrg)}`,`ERROR    Gyro: ${fmtErr(gyroErr)}  Std: ${fmtErr(stdErr)}`,`VARIATION: ${varMag}° ${varDir} (${varSrc})  DEVIATION: ${fmtErr(deviation)}`,].join('\n');
    navigator.clipboard.writeText(t).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  };

  // ── Input helpers ───────────────────────────────────────────────────────────
  const numInp=(val,onChange,extra={})=>(
    <input type="number" min="0" max="360" step="0.1" value={val} onChange={e=>onChange(e.target.value)}
      style={{...DC_STYLE.inp,...extra}}/>
  );
  const adjBtn=(lbl,fn)=>(
    <button onClick={fn} style={{padding:'9px 13px',background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:7,color:'var(--text2)',cursor:'pointer',fontSize:'1rem',fontWeight:700}}>{lbl}</button>
  );
  const tabBtn=(k,icon,lbl)=>(
    <button key={k} onClick={()=>setActiveTab(k)} style={{padding:'8px 12px',border:'none',borderBottom:`2px solid ${activeTab===k?'var(--cyan)':'transparent'}`,background:'transparent',color:activeTab===k?'var(--cyan)':'var(--text3)',fontFamily:"'Exo 2',sans-serif",fontSize:'0.7rem',fontWeight:600,cursor:'pointer',textTransform:'uppercase',letterSpacing:'0.06em',display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',transition:'all 0.2s'}}>
      {icon} {lbl}
    </button>
  );

  const posDisplay = calcPos
    ? `${fmtDMS(calcPos.lat,'N','S')}   ${fmtDMS(calcPos.lon,'E','W')}`
    : posErr || 'No GPS — use Edit below';

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return(
    <div style={{padding:'1rem',maxWidth:980,margin:'0 auto',width:'100%'}}>

      {/* HEADER */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'0.9rem',flexWrap:'wrap'}}>
        <div style={{width:44,height:44,borderRadius:11,background:'linear-gradient(135deg,#00B4D8,#1565C0)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.4rem',flexShrink:0,boxShadow:'0 0 22px rgba(0,180,216,0.4)'}}>🧭</div>
        <div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.88rem',fontWeight:700,letterSpacing:'0.08em'}}>COMPASS ERROR CALCULATOR</div>
          <div style={{fontSize:'0.62rem',color:'var(--cyan)',letterSpacing:'0.14em',textTransform:'uppercase'}}>WMM-2025 · Nautical Almanac · Celestial Navigation</div>
        </div>
        <div style={{marginLeft:'auto',display:'flex',gap:6,flexWrap:'wrap'}}>
          <span style={{padding:'3px 9px',borderRadius:100,fontSize:'0.62rem',background:calcPos?'rgba(0,200,150,0.1)':'rgba(240,165,0,0.1)',border:`1px solid ${calcPos?'rgba(0,200,150,0.3)':'rgba(240,165,0,0.3)'}`,color:calcPos?'var(--green)':'var(--gold)'}}>
            {gpsLoading?'⏳ Locking GPS…':calcPos?'📍 Position Locked':posErr?'⚠️ No GPS':'⏳ GPS…'}
          </span>
          <span style={{padding:'3px 9px',borderRadius:100,fontSize:'0.62rem',background:'rgba(0,180,216,0.1)',border:'1px solid rgba(0,180,216,0.3)',color:'var(--cyan)'}}>
            {varSrc?`🌐 ${varSrc}`:'⚪ No Variation'}
          </span>
          {deviceCourse!==null&&<span style={{padding:'3px 9px',borderRadius:100,fontSize:'0.62rem',background:'rgba(0,200,150,0.08)',border:'1px solid rgba(0,200,150,0.3)',color:'var(--green)'}}>🧭 Course: {norm360(deviceCourse).toFixed(0)}°</span>}
        </div>
      </div>

      {/* GPS LOCK CONTROLS */}
      <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'0.9rem',marginBottom:'0.8rem'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div style={{fontFamily:'monospace',fontSize:'0.78rem',lineHeight:2}}>
            <div style={{color:'var(--text)',fontWeight:600}}>{calcTime?fmtUTC(calcTime):fmtUTC(displayNow)}</div>
            {calcPos&&<div style={{color:'var(--cyan)'}}>{fmtLMT(calcTime||displayNow,calcPos.lon)}</div>}
            <div style={{color:calcPos?'var(--text2)':'var(--gold)'}}>{posDisplay}</div>
            {lockedTime&&<div style={{fontSize:'0.62rem',color:'var(--text3)'}}>🔒 Locked at {p2(lockedTime.getUTCHours())}:{p2(lockedTime.getUTCMinutes())}:{p2(lockedTime.getUTCSeconds())} UTC</div>}
          </div>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            <button onClick={fetchAndLockGPS} disabled={gpsLoading}
              style={{padding:'8px 14px',background:'linear-gradient(135deg,var(--cyan),var(--blue))',border:'none',borderRadius:9,color:'white',fontFamily:"'Exo 2',sans-serif",fontSize:'0.73rem',fontWeight:700,cursor:'pointer',opacity:gpsLoading?0.6:1}}>
              {gpsLoading?'⏳ Locking…':'🔄 Refresh Lock'}
            </button>
            <button onClick={()=>setManualMode(m=>!m)}
              style={{padding:'8px 14px',background:manualMode?'rgba(240,165,0,0.12)':'var(--bg2)',border:`1px solid ${manualMode?'var(--gold)':'var(--border2)'}`,borderRadius:9,color:manualMode?'var(--gold)':'var(--text2)',fontFamily:"'Exo 2',sans-serif",fontSize:'0.73rem',fontWeight:600,cursor:'pointer'}}>
              ✏️ {manualMode?'Close Edit':'Manual Edit'}
            </button>
          </div>
        </div>

        {/* Manual Edit Panel */}
        {manualMode&&(
          <div style={{marginTop:'0.8rem',paddingTop:'0.8rem',borderTop:'1px solid var(--border)',display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'0.6rem'}}>
            {[{l:'Latitude (° N=+, S=−)',v:manualLat,s:setManualLat,ph:'e.g. 30.51'},
              {l:'Longitude (° E=+, W=−)',v:manualLon,s:setManualLon,ph:'e.g. 122.08'},
              {l:'UTC Time (HH:MM:SS)',v:manualUTC,s:setManualUTC,ph:'e.g. 14:30:00'},
            ].map(({l,v,s,ph})=>(
              <div key={l}>
                <label style={{display:'block',fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:4}}>{l}</label>
                <input value={v} onChange={e=>s(e.target.value)} placeholder={ph}
                  style={{...DC_STYLE.inp,border:'1.5px solid var(--gold)',color:'var(--gold)'}}/>
              </div>
            ))}
            {calcPos&&(
              <div style={{display:'flex',alignItems:'flex-end'}}>
                <button onClick={()=>{
                    const wmm=computeWMM2025(parseFloat(manualLat),parseFloat(manualLon),0,new Date());
                    setVarMag(Math.abs(wmm.variation).toFixed(2));setVarDir(wmm.variation>=0?'E':'W');setVarDDdt(wmm.dDdt);setVarSrc('WMM-2025');
                  }}
                  style={{width:'100%',padding:'9px',background:'rgba(0,180,216,0.1)',border:'1px solid rgba(0,180,216,0.3)',borderRadius:8,color:'var(--cyan)',fontFamily:"'Exo 2',sans-serif",fontSize:'0.72rem',fontWeight:600,cursor:'pointer'}}>
                  🌐 Compute Variation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB BAR */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:'1rem',overflowX:'auto',gap:2}}>
        {tabBtn('calc','🧭','Azimuth')}
        {tabBtn('amplitude','🌅','Amplitude')}
        {tabBtn('polaris','⭐','Polaris')}
        {tabBtn('history','📋','History')}
        {tabBtn('devcard','📊','Dev Card')}
      </div>

      {/* ══ AZIMUTH TAB ══ */}
      {activeTab==='calc'&&(
        <div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
          {/* LEFT */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.75rem'}}>
            {/* Body */}
            <div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>{BODY_ICON[body]||'⭐'} CELESTIAL BODY</div>
              <select value={body} onChange={e=>{setBody(e.target.value);resetGyro();}} style={{...DC_STYLE.inp,cursor:'pointer'}}>
                {BODY_GROUPS.map(g=><optgroup key={g.group} label={g.group}>{g.items.map(it=><option key={it} value={it}>{it}</option>)}</optgroup>)}
              </select>
              {az&&<div style={{marginTop:'0.7rem',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.4rem'}}>
                {[{l:'TRUE BRG',v:fmtBrg(trueBrg),c:'var(--cyan)'},{l:'APP. ALT',v:`${(altApp??0).toFixed(1)}°`,c:(altApp??0)<-0.6?'var(--red)':'var(--green)'},{l:'DEC',v:`${bp.Dec.toFixed(1)}°`,c:'var(--text)'}].map(({l,v,c})=>(
                  <div key={l} style={{background:'var(--bg2)',borderRadius:7,padding:'6px 8px',textAlign:'center'}}>
                    <div style={{fontSize:'0.55rem',color:'var(--text3)',marginBottom:2}}>{l}</div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.76rem',color:c,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>}
              {altApp!==null&&altApp<-0.6&&<div style={{marginTop:8,padding:'7px 10px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.25)',borderRadius:8,fontSize:'0.7rem',color:'var(--red)'}}>⚠️ Below horizon ({(altApp).toFixed(1)}°) — azimuth for reference only</div>}
            </div>

            {/* Ship Heading + auto-course */}
            <div style={DC_STYLE.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.65rem'}}>
                <div style={DC_STYLE.hdr}>🚢 SHIP'S HEADING</div>
                {deviceCourse!==null&&<button onClick={()=>setGyroHdg(norm360(deviceCourse).toFixed(1))}
                  style={{fontSize:'0.6rem',padding:'3px 9px',background:'rgba(0,200,150,0.1)',border:'1px solid rgba(0,200,150,0.3)',borderRadius:6,color:'var(--green)',cursor:'pointer'}}>
                  🧭 Use GPS Course ({norm360(deviceCourse).toFixed(0)}°)
                </button>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.7rem'}}>
                {[{l:'Gyro Compass',v:gyroHdg,s:setGyroHdg},{l:'Standard (Mag.)',v:stdHdg,s:setStdHdg}].map(({l,v,s})=>(
                  <div key={l}>
                    <label style={{display:'block',fontSize:'0.59rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:5}}>{l}</label>
                    {numInp(v,s)}
                  </div>
                ))}
              </div>
            </div>

            {/* Gyro Bearing */}
            <div style={DC_STYLE.card}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.65rem'}}>
                <div style={DC_STYLE.hdr}>🔭 GYRO BRG OF {body.slice(0,10).toUpperCase()}</div>
                {gyroLock&&<button onClick={resetGyro} style={{fontSize:'0.59rem',padding:'3px 9px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.3)',borderRadius:6,color:'var(--red)',cursor:'pointer'}}>↺ Reset</button>}
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="number" min="0" max="360" step="0.1"
                  value={gyroLock?gyroObs:(trueBrg!==null?norm360(gyroBrgNum).toFixed(1):'')}
                  onChange={e=>{setGyroLock(true);setGyroObs(e.target.value);}}
                  placeholder="Observed bearing"
                  style={{...DC_STYLE.inp,flex:1,border:'1.5px solid var(--cyan)',color:'var(--cyan)'}}/>
                {adjBtn('‹',()=>adjGyro(-0.1))} {adjBtn('›',()=>adjGyro(0.1))}
              </div>
              <div style={{marginTop:6,fontSize:'0.67rem',color:'var(--text3)'}}>
                {gyroLock?'✏️ Manual entry':'🔄 Showing computed true bearing → enter observed gyro bearing'}
              </div>
            </div>

            {/* Variation */}
            <div style={DC_STYLE.card}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'0.65rem'}}>
                <div style={DC_STYLE.hdr}>🌐 VARIATION ({varSrc||'not set'})</div>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="number" min="0" max="90" step="0.01" value={varMag}
                  onChange={e=>{setVarMag(e.target.value);setVarSrc('Manual');}}
                  style={{...DC_STYLE.inp,flex:1}}/>
                <button onClick={()=>setVarDir(d=>d==='E'?'W':'E')}
                  style={{padding:'9px 14px',background:varDir==='W'?'rgba(240,165,0,0.12)':'rgba(0,200,150,0.12)',border:`1px solid ${varDir==='W'?'var(--gold)':'var(--green)'}`,borderRadius:8,cursor:'pointer',fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',fontWeight:700,color:varDir==='W'?'var(--gold)':'var(--green)'}}>
                  {varDir}
                </button>
                {adjBtn('‹',()=>adjVar(-0.01))} {adjBtn('›',()=>adjVar(0.01))}
              </div>
              {varDDdt!==null&&<div style={{marginTop:6,fontSize:'0.67rem',color:'var(--text3)'}}>
                📈 Annual change: <span style={{color:'var(--cyan)',fontFamily:'monospace'}}>{varDDdt>=0?'+':''}{varDDdt.toFixed(3)}°/yr ({(varDDdt*60).toFixed(2)}′/yr)</span>
              </div>}
            </div>
          </div>

          {/* RIGHT — Output */}
          <div>
            <div style={LT.card}>
              <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:'0.75rem',paddingBottom:'0.75rem',borderBottom:'1.5px solid #ccd8e8'}}>
                <div style={{width:34,height:34,borderRadius:8,background:'linear-gradient(135deg,#1565C0,#003d99)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>🧭</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',fontWeight:700,color:'#0a1628'}}>Compass Error</div>
                  <div style={{fontSize:'0.62rem',color:'#3a4a6a',marginTop:1}}>{fmtUTC(calcTime||displayNow)}</div>
                </div>
                <div style={{display:'flex',gap:5}}>
                  <button onClick={copyLog} disabled={!calcPos||trueBrg===null}
                    style={{padding:'6px 11px',background:copied?'#e8f6ee':'#e2ecf5',border:`1px solid ${copied?'#007a50':'#b0c2d4'}`,borderRadius:8,color:copied?'#007a50':'#2a3a5a',fontSize:'0.69rem',fontWeight:600,cursor:'pointer'}}>
                    {copied?'✅':'📋'} Copy
                  </button>
                  <button onClick={saveToHistory} disabled={!calcPos||trueBrg===null}
                    style={{padding:'6px 11px',background:'#e8f0fe',border:'1px solid #a0b8d8',borderRadius:8,color:'#1a3a8a',fontSize:'0.69rem',fontWeight:600,cursor:'pointer'}}>
                    💾 Log
                  </button>
                </div>
              </div>

              {calcPos?(<>
                <div style={{fontSize:'0.72rem',color:'#3a4a6a',fontFamily:'monospace',marginBottom:'0.4rem',lineHeight:1.8}}>
                  {fmtDMS(calcPos.lat,'N','S')}  {fmtDMS(calcPos.lon,'E','W')}
                </div>
                <div style={LT.secHdr}>Ship's heading:</div>
                <div style={LT.row}><span style={LT.lbl}>Gyro:</span><span style={LT.val}>{fmtBrg(ghNum)}</span></div>
                <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Standard:</span><span style={LT.val}>{fmtBrg(shNum)}</span></div>

                <div style={LT.secHdr}>Bearing (object: {body}):</div>
                <div style={LT.row}><span style={LT.lbl}>True:</span><span style={{...LT.val,color:'#0055aa'}}>{trueBrg!==null?fmtBrg(trueBrg):'—'}</span></div>
                <div style={LT.row}>
                  <span style={LT.lbl}>Gyro:</span>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <span style={{...LT.val,minWidth:60,textAlign:'right'}}>{fmtBrg(gyroBrgNum)}</span>
                    <button onClick={()=>adjGyro(-0.1)} style={LT.adjBtn}>‹</button>
                    <button onClick={()=>adjGyro(0.1)}  style={LT.adjBtn}>›</button>
                  </div>
                </div>
                <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Standard:</span><span style={LT.val}>{fmtBrg(stdBrg)}</span></div>

                <div style={LT.secHdr}>Error:</div>
                <div style={LT.row}><span style={LT.lbl}>Gyro:</span><span style={{...LT.val,color:eClr(gyroErr)}}>{fmtErr(gyroErr)}</span></div>
                <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Standard:</span><span style={{...LT.val,color:eClr(stdErr)}}>{fmtErr(stdErr)}</span></div>

                <div style={{...LT.row,flexWrap:'wrap',gap:4,marginTop:6}}>
                  <span style={{...LT.lbl,fontSize:'0.78rem'}}>Variation ({varSrc}):</span>
                  <div style={{display:'flex',alignItems:'center',gap:4}}>
                    <input type="number" min="0" max="90" step="0.01" value={varMag}
                      onChange={e=>{setVarMag(e.target.value);setVarSrc('Manual');}}
                      style={{width:58,padding:'4px 5px',border:'1.5px solid #0070cc',borderRadius:6,fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',color:'#0055aa',background:'#fff',textAlign:'center',outline:'none'}}/>
                    <button onClick={()=>setVarDir(d=>d==='E'?'W':'E')}
                      style={{padding:'4px 9px',background:varDir==='W'?'#fff8e6':'#e8f6ee',border:`1px solid ${varDir==='W'?'#a06000':'#007a50'}`,borderRadius:6,cursor:'pointer',fontFamily:"'Orbitron',monospace",fontSize:'0.7rem',fontWeight:700,color:varDir==='W'?'#a06000':'#007a50'}}>
                      {varDir}
                    </button>
                    <button onClick={()=>adjVar(-0.01)} style={LT.adjBtn}>‹</button>
                    <button onClick={()=>adjVar(0.01)}  style={LT.adjBtn}>›</button>
                  </div>
                </div>
                {varDDdt!==null&&<div style={{fontSize:'0.62rem',color:'#6a7a9a',padding:'3px 0'}}>Annual Δ: {varDDdt>=0?'+':''}{(varDDdt*60).toFixed(2)}′/yr</div>}

                <div style={LT.secHdr}>Deviation:</div>
                <div style={{...LT.row,borderBottom:'none'}}>
                  <span style={LT.lbl}>Standard:</span>
                  <span style={{...LT.val,color:eClr(deviation),fontSize:'0.94rem',fontWeight:700}}>{fmtErr(deviation)}</span>
                </div>
                {az&&<div style={{marginTop:'0.8rem',paddingTop:'0.7rem',borderTop:'1px solid #d5e2ee',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px 10px',fontSize:'0.65rem',color:'#5a6a8a',fontFamily:'monospace'}}>
                  <div>GHA: {az.GHA.toFixed(2)}°</div><div>LHA: {az.LHA.toFixed(2)}°</div>
                  <div>Dec: {az.Dec.toFixed(2)}°</div><div>Alt: {(altApp??0).toFixed(2)}°</div>
                  <div>GHA♈: {ghaAr?.toFixed(2)}°</div><div>Refr: {az?refraction(az.altitude).toFixed(3)+'°':'—'}</div>
                </div>}
              </>):(<div style={{textAlign:'center',padding:'2.5rem 1rem',color:'#6a7a9a'}}>
                <div style={{fontSize:'2.5rem',marginBottom:10}}>📡</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.76rem',color:'#2a3a5a',marginBottom:6}}>No Position Locked</div>
                <div style={{fontSize:'0.72rem'}}>Use Refresh Lock or Manual Edit above</div>
              </div>)}
            </div>

            {/* Formulae */}
            <div style={{...DC_STYLE.card,marginTop:'0.75rem',marginBottom:0}}>
              <div style={DC_STYLE.hdr}>📐 FORMULAE · NOAA WMM-2025 OFFLINE</div>
              <div style={{fontSize:'0.67rem',color:'var(--text2)',lineHeight:2.1,fontFamily:'monospace'}}>
                <div>Std Brg = Gyro Brg + (Std Hdg − Gyro Hdg)</div>
                <div>Gyro Err = True Brg − Gyro Brg  [+E / −W]</div>
                <div>Compass Err = True Brg − Std Brg</div>
                <div>Deviation = Compass Error − Variation</div>
                <div>Variation from WMM-2025 (degree 1–12, {varSrc})</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ AMPLITUDE TAB ══ */}
      {activeTab==='amplitude'&&(
        <div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
          <div>
            <div style={{...DC_STYLE.card,background:'rgba(0,180,216,0.06)',border:'1px solid rgba(0,180,216,0.2)'}}>
              <div style={{fontSize:'0.74rem',color:'var(--text2)',lineHeight:1.8}}>
                <strong style={{color:'var(--cyan)'}}>Amplitude Method</strong> — observe body when on rational horizon (alt ≈ 0°). Best: Sun/Moon at sunrise/sunset.
                Bearings auto-filled from current position. Edit as observed.
              </div>
            </div>
            <div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>{BODY_ICON[body]||'⭐'} BODY: {body.toUpperCase()}</div>
              {bp&&calcPos?(<>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.5rem',marginBottom:'0.7rem'}}>
                  {[{l:'Declination',v:`${bp.Dec.toFixed(2)}°`,c:bp.Dec>=0?'var(--green)':'var(--red)'},{l:'Apparent Alt',v:`${(altApp??0).toFixed(2)}°`,c:Math.abs(altApp??99)<6?'var(--gold)':'var(--text2)'},{l:'Amplitude',v:ampA!==null?`${Math.abs(ampA).toFixed(1)}°`:'—',c:'var(--cyan)'},{l:'True Bearing',v:ampNorm!==null?fmtBrg(ampNorm):'—',c:'var(--cyan)'}].map(({l,v,c})=>(
                    <div key={l} style={{background:'var(--bg2)',borderRadius:8,padding:'8px 10px'}}>
                      <div style={{fontSize:'0.57rem',color:'var(--text3)',marginBottom:3,textTransform:'uppercase'}}>{l}</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',color:c,fontWeight:700}}>{v}</div>
                    </div>
                  ))}
                </div>
                {Math.abs(altApp??99)>6&&<div style={{padding:'7px 10px',background:'rgba(240,165,0,0.08)',border:'1px solid rgba(240,165,0,0.25)',borderRadius:8,fontSize:'0.7rem',color:'var(--gold)'}}>⚠️ Body not near horizon (app. alt = {(altApp??0).toFixed(1)}°). Amplitude most accurate at −3° to +5°.</div>}
              </>):<div style={{color:'var(--text3)',fontSize:'0.78rem'}}>Lock GPS to compute body position</div>}
            </div>
            <div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>🌅 RISING OR SETTING</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
                {[{l:'🌅 Rising (E)',v:true},{l:'🌇 Setting (W)',v:false}].map(({l,v})=>(
                  <button key={l} onClick={()=>setAmpRising(v)}
                    style={{padding:'12px',borderRadius:9,border:`1.5px solid ${ampRising===v?'var(--cyan)':'var(--border)'}`,background:ampRising===v?'rgba(0,180,216,0.1)':'transparent',color:ampRising===v?'var(--cyan)':'var(--text2)',fontFamily:"'Exo 2',sans-serif",fontSize:'0.78rem',fontWeight:600,cursor:'pointer'}}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>📏 OBSERVED BEARINGS (auto-filled, editable)</div>
              {[{l:'Compass (Standard) Bearing',v:ampCmpBrg,s:setAmpCmpBrg},{l:'Gyro Bearing',v:ampGyroBrg,s:setAmpGyroBrg}].map(({l,v,s})=>(
                <div key={l} style={{marginBottom:'0.7rem'}}>
                  <label style={{display:'block',fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:5}}>{l}</label>
                  {numInp(v,s)}
                </div>
              ))}
            </div>
          </div>
          {/* Amplitude output */}
          <div style={LT.card}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',fontWeight:700,color:'#0a1628',textAlign:'center',marginBottom:'0.8rem',paddingBottom:'0.6rem',borderBottom:'1.5px solid #ccd8e8'}}>🌅 AMPLITUDE RESULTS</div>
            {calcPos&&bp?(<>
              <div style={{fontSize:'0.72rem',color:'#3a4a6a',marginBottom:'0.6rem',fontFamily:'monospace'}}>{fmtUTC(calcTime||displayNow)}</div>
              {[{s:'Body',rows:[{l:'Name',v:body},{l:'Dec',v:`${Math.abs(bp.Dec).toFixed(2)}° ${bp.Dec>=0?'N':'S'}`},{l:'Latitude',v:`${Math.abs(calcPos.lat).toFixed(2)}° ${calcPos.lat>=0?'N':'S'}`}]},{s:'Amplitude',rows:[{l:'Amplitude',v:ampA!==null?`${(ampRising?'E':'W')}${bp.Dec>=0?'N':'S'} ${Math.abs(ampA).toFixed(1)}°`:'—',bold:true},{l:'True Bearing',v:ampNorm!==null?fmtBrg(ampNorm):'—',bold:true,c:'#0055aa'}]},{s:'Error',rows:[{l:'Std Cmp',v:ampCmpBrg?`${parseFloat(ampCmpBrg).toFixed(1)}°`:'—'},{l:'Std Error',v:fmtErr(ampCmpErr),c:eClr(ampCmpErr),bold:true},{l:'Gyro',v:ampGyroBrg?`${parseFloat(ampGyroBrg).toFixed(1)}°`:'—'},{l:'Gyro Error',v:fmtErr(ampGyroErr),c:eClr(ampGyroErr),bold:true}]},{s:'Deviation',rows:[{l:'Variation',v:`${varMag}° ${varDir}`},{l:'Deviation',v:fmtErr(ampStdDev),c:eClr(ampStdDev),bold:true}]}].map(({s,rows})=>(
                <div key={s} style={{marginBottom:'0.5rem'}}>
                  <div style={LT.secHdr}>{s}:</div>
                  {rows.map(({l,v,bold,c})=>(
                    <div key={l} style={LT.row}><span style={LT.lbl}>{l}:</span><span style={{...LT.val,color:c||'#0a1628',fontWeight:bold?700:600}}>{v}</span></div>
                  ))}
                </div>
              ))}
            </>):<div style={{textAlign:'center',padding:'2rem',color:'#6a7a9a',fontSize:'0.78rem'}}>📡 Lock GPS position to compute</div>}
          </div>
        </div>
      )}

      {/* ══ POLARIS TAB ══ */}
      {activeTab==='polaris'&&(
        <div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
          <div>
            <div style={{...DC_STYLE.card,background:'rgba(0,180,216,0.06)',border:'1px solid rgba(0,180,216,0.2)'}}>
              <div style={{fontSize:'0.74rem',color:'var(--text2)',lineHeight:1.8}}>
                <strong style={{color:'var(--cyan)'}}>Polaris Method</strong> — North Star is always within ~1° of true north. Bearings auto-filled from computed position.
                <strong style={{color:'var(--gold)'}}> Valid for Lat 10°N–75°N at night.</strong>
              </div>
            </div>
            {polAz&&calcPos&&(<div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>⭐ POLARIS — COMPUTED</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.4rem',marginBottom:'0.6rem'}}>
                {[{l:'True Bearing',v:fmtBrg(polTrue??0),c:'var(--cyan)'},{l:'Altitude',v:`${polAz.altitude.toFixed(2)}°`,c:polAz.altitude>5?'var(--green)':'var(--red)'},{l:'GHA♈',v:`${ghaAr?.toFixed(2)}°`,c:'var(--text)'},{l:'LHA Polaris',v:`${polAz.LHA.toFixed(2)}°`,c:'var(--text)'}].map(({l,v,c})=>(
                  <div key={l} style={{background:'var(--bg2)',borderRadius:7,padding:'8px 10px',textAlign:'center'}}>
                    <div style={{fontSize:'0.57rem',color:'var(--text3)',marginBottom:3,textTransform:'uppercase'}}>{l}</div>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.8rem',color:c,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
              {polAz.altitude<5&&<div style={{padding:'7px 10px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.3)',borderRadius:8,fontSize:'0.7rem',color:'var(--red)'}}>⚠️ Polaris altitude {polAz.altitude.toFixed(1)}° — may be below horizon or obscured</div>}
            </div>)}
            <div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>📏 OBSERVED BEARINGS TO POLARIS (auto-filled)</div>
              {[{l:'Compass (Standard) Bearing',v:polCmpBrg,s:setPolCmpBrg},{l:'Gyro Bearing',v:polGyroBrg,s:setPolGyroBrg}].map(({l,v,s})=>(
                <div key={l} style={{marginBottom:'0.7rem'}}>
                  <label style={{display:'block',fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.09em',marginBottom:5}}>{l}</label>
                  {numInp(v,s)}
                </div>
              ))}
            </div>
          </div>
          <div style={LT.card}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',fontWeight:700,color:'#0a1628',textAlign:'center',marginBottom:'0.8rem',paddingBottom:'0.6rem',borderBottom:'1.5px solid #ccd8e8'}}>⭐ POLARIS RESULTS</div>
            {calcPos&&polAz?(<>
              <div style={{fontSize:'0.72rem',color:'#3a4a6a',marginBottom:'0.5rem',fontFamily:'monospace'}}>{fmtDMS(calcPos.lat,'N','S')}  {fmtDMS(calcPos.lon,'E','W')}</div>
              <div style={LT.secHdr}>True Bearing of Polaris:</div>
              <div style={LT.row}><span style={LT.lbl}>Computed True:</span><span style={{...LT.val,color:'#0055aa',fontWeight:700,fontSize:'0.96rem'}}>{polTrue!==null?fmtBrg(polTrue):'—'}</span></div>
              <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Altitude:</span><span style={{...LT.val,color:polAz.altitude>5?'#007a50':'#cc2233'}}>{polAz.altitude.toFixed(2)}°</span></div>
              <div style={LT.secHdr}>Compass Error:</div>
              <div style={LT.row}><span style={LT.lbl}>Std Compass:</span><span style={LT.val}>{polCmpBrg?`${parseFloat(polCmpBrg).toFixed(1)}°`:'—'}</span></div>
              <div style={LT.row}><span style={LT.lbl}>Std Error:</span><span style={{...LT.val,color:eClr(polCmpErr),fontWeight:700}}>{fmtErr(polCmpErr)}</span></div>
              <div style={LT.row}><span style={LT.lbl}>Gyro:</span><span style={LT.val}>{polGyroBrg?`${parseFloat(polGyroBrg).toFixed(1)}°`:'—'}</span></div>
              <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Gyro Error:</span><span style={{...LT.val,color:eClr(polGyroErr),fontWeight:700}}>{fmtErr(polGyroErr)}</span></div>
              <div style={LT.secHdr}>Deviation:</div>
              <div style={{...LT.row,borderBottom:'none'}}><span style={LT.lbl}>Variation {varMag}° {varDir}</span><span style={{...LT.val,color:eClr(polDev),fontWeight:700,fontSize:'0.94rem'}}>{fmtErr(polDev)}</span></div>
            </>):<div style={{textAlign:'center',padding:'2rem',color:'#6a7a9a',fontSize:'0.78rem'}}>📡 Lock GPS position to compute</div>}
          </div>
        </div>
      )}

      {/* ══ HISTORY TAB ══ */}
      {activeTab==='history'&&(
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'0.9rem'}}>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',fontWeight:700,color:'var(--cyan)'}}>📋 OBSERVATION HISTORY <span style={{fontSize:'0.62rem',color:'var(--text3)'}}>last 10 · this device</span></div>
            {history.length>0&&<button onClick={()=>{setHistory([]);localStorage.removeItem(LS_HIST);}} style={{padding:'5px 12px',background:'rgba(255,71,87,0.08)',border:'1px solid rgba(255,71,87,0.3)',borderRadius:7,color:'var(--red)',fontSize:'0.69rem',fontWeight:600,cursor:'pointer'}}>🗑 Clear</button>}
          </div>
          {history.length===0?(<div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
            <div style={{fontSize:'2.5rem',marginBottom:12}}>📋</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',marginBottom:6}}>No Saved Observations</div>
            <div style={{fontSize:'0.72rem'}}>In Azimuth tab → complete calc → click 💾 Log</div>
          </div>):(
            <div style={{display:'flex',flexDirection:'column',gap:'0.7rem'}}>
              {history.map((h,i)=>(
                <div key={h.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:6,marginBottom:'0.6rem'}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.68rem',color:'var(--cyan)'}}>#{history.length-i} · {h.dt}</div>
                    <div style={{fontSize:'0.65rem',color:'var(--text3)'}}>{h.pos}</div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:'0.4rem'}}>
                    {[{l:'Body',v:h.body},{l:'True Brg',v:`${h.trueBrg}°`,c:'var(--cyan)'},{l:'Gyro Err',v:h.gyroErr,c:h.gyroErr?.includes('E')?'var(--green)':'var(--red)'},{l:'Std Error',v:h.stdErr,c:h.stdErr?.includes('E')?'var(--green)':'var(--red)'},{l:'Variation',v:h.varStr},{l:'Deviation',v:h.dev,c:h.dev==='—'?'var(--text3)':h.dev?.includes('E')?'var(--green)':'var(--red)'}].map(({l,v,c})=>(
                      <div key={l} style={{background:'var(--bg2)',borderRadius:7,padding:'6px 8px',textAlign:'center'}}>
                        <div style={{fontSize:'0.55rem',color:'var(--text3)',marginBottom:2,textTransform:'uppercase'}}>{l}</div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.72rem',color:c||'var(--text)',fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ DEVIATION CARD TAB ══ */}
      {activeTab==='devcard'&&(
        <div>
          {/* Ship name + save */}
          <div style={{...DC_STYLE.card,background:'linear-gradient(135deg,rgba(21,101,192,0.12),rgba(0,180,216,0.08))'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.82rem',fontWeight:700,color:'var(--cyan)',flexShrink:0}}>📊 DEVIATION CARD</div>
              <input value={shipName} onChange={e=>setShipName(e.target.value)} placeholder="Enter Ship's Name"
                style={{...DC_STYLE.inp,flex:1,minWidth:160,maxWidth:300,fontFamily:"'Exo 2',sans-serif",fontWeight:700,fontSize:'0.88rem',border:'1.5px solid rgba(0,180,216,0.5)',color:'var(--cyan)'}}/>
              <button onClick={saveDevCard} disabled={!user||devSaving}
                style={{padding:'9px 16px',background:devSaved?'rgba(0,200,150,0.15)':'linear-gradient(135deg,var(--blue),#003d99)',border:`1px solid ${devSaved?'var(--green)':'var(--blue)'}`,borderRadius:9,color:devSaved?'var(--green)':'white',fontFamily:"'Exo 2',sans-serif",fontSize:'0.78rem',fontWeight:700,cursor:'pointer',flexShrink:0}}>
                {devSaving?'⏳ Saving…':devSaved?'✅ Saved!':'💾 Save to Cloud'}
              </button>
            </div>
            {shipName&&<div style={{marginTop:6,fontFamily:"'Orbitron',monospace",fontSize:'0.72rem',color:'var(--text2)'}}>MV / MT / SS {shipName}</div>}
            {!user&&<div style={{marginTop:8,fontSize:'0.68rem',color:'var(--gold)'}}>⚠️ Login to save deviation card to cloud</div>}
            {devLoading&&<div style={{marginTop:6,fontSize:'0.68rem',color:'var(--text3)'}}>⏳ Loading saved card…</div>}
          </div>

          <div style={{display:'grid',gridTemplateColumns:isMob?'1fr':'1fr 1fr',gap:'1rem'}}>
            {/* Input table */}
            <div style={DC_STYLE.card}>
              <div style={DC_STYLE.hdr}>✏️ ENTER DEVIATION (+ East / − West)</div>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr auto',gap:'0.5rem',alignItems:'center',marginBottom:'0.4rem'}}>
                <div style={{fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',textAlign:'center'}}>Hdg</div>
                <div style={{fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',textAlign:'center'}}>Deviation °</div>
                <div style={{fontSize:'0.6rem',color:'var(--text3)',textTransform:'uppercase',textAlign:'center'}}>Dir</div>
                {DEV_HDGS.map((h,i)=>{
                  const v=parseFloat(devCard[i])||0;
                  return[
                    <div key={`h${i}`} style={{background:'var(--bg2)',borderRadius:6,padding:'7px 10px',textAlign:'center',fontFamily:"'Orbitron',monospace",fontSize:'0.78rem',color:'var(--text)'}}>{String(h).padStart(3,'0')}° {DEV_LBLS[i]}</div>,
                    <input key={`v${i}`} type="number" step="0.1" value={devCard[i]}
                      onChange={e=>{const n=[...devCard];n[i]=e.target.value;setDevCard(n);}}
                      style={{...DC_STYLE.inp,border:`1.5px solid ${v>0?'rgba(0,200,150,0.5)':v<0?'rgba(255,71,87,0.5)':'var(--border2)'}`,color:v>0?'var(--green)':v<0?'var(--red)':'var(--text)'}}/>,
                    <div key={`r${i}`} style={{fontFamily:"'Orbitron',monospace",fontSize:'0.72rem',color:v>=0?'var(--green)':'var(--red)',textAlign:'center',minWidth:35}}>
                      {v!==0?`${v>=0?'E':'W'}`:'—'}
                    </div>
                  ];
                })}
              </div>
              <div style={{marginTop:'0.6rem',padding:'8px 10px',background:'rgba(0,180,216,0.06)',border:'1px solid rgba(0,180,216,0.2)',borderRadius:8,fontSize:'0.67rem',color:'var(--text2)',lineHeight:1.7}}>
                Max: <span style={{color:'var(--cyan)'}}>{Math.max(...devCard.map(v=>Math.abs(parseFloat(v)||0))).toFixed(1)}°</span>
                &nbsp;·&nbsp;
                Max E: <span style={{color:'var(--green)'}}>{Math.max(0,...devCard.map(v=>parseFloat(v)||0)).toFixed(1)}°</span>
                &nbsp;·&nbsp;
                Max W: <span style={{color:'var(--red)'}}>{Math.abs(Math.min(0,...devCard.map(v=>parseFloat(v)||0))).toFixed(1)}°</span>
              </div>
            </div>

            {/* Chart */}
            <div>
              <div style={DC_STYLE.card}>
                <div style={DC_STYLE.hdr}>📈 DEVIATION CURVE — {shipName||'Unnamed Vessel'}</div>
                <DeviationChart deviations={devCard}/>
                <div style={{display:'flex',justifyContent:'center',gap:18,marginTop:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.65rem',color:'var(--text3)'}}><div style={{width:12,height:12,borderRadius:'50%',background:'var(--green)'}}/>East</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.65rem',color:'var(--text3)'}}><div style={{width:12,height:12,borderRadius:'50%',background:'var(--red)'}}/>West</div>
                </div>
              </div>
              <div style={DC_STYLE.card}>
                <div style={DC_STYLE.hdr}>📋 SUMMARY CARD — {shipName||'Vessel'}</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'0.35rem'}}>
                  {DEV_HDGS.map((h,i)=>{const v=parseFloat(devCard[i])||0;return(
                    <div key={h} style={{background:'var(--bg2)',borderRadius:7,padding:'7px 6px',textAlign:'center'}}>
                      <div style={{fontSize:'0.6rem',color:'var(--text3)'}}>{DEV_LBLS[i]}<br/>{String(h).padStart(3,'0')}°</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:'0.76rem',fontWeight:700,color:v>=0?'var(--green)':'var(--red)',marginTop:2}}>{v!==0?`${v>=0?'+':''}${v.toFixed(1)}`:' 0.0'}</div>
                      <div style={{fontSize:'0.55rem',color:v>=0?'var(--green)':'var(--red)'}}>{v>=0?'E':'W'}</div>
                    </div>
                  );})}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
