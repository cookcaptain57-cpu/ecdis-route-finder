/* eslint-disable */
import { useState, useEffect, useRef, useMemo } from "react";
// ─── GOOGLE SHEET APIs ─────────────────────────────────
const API_1 =
  "https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/Sheet1";

// Chart sheet — try multiple likely tab names
const CHART_SHEET_ID = "1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA";
const CHART_TABS = ["Sheet1","Charts","ECDIS Charts","Routes","Chart","Data","Sheet2"];
const fetchChartSheet = () =>
  CHART_TABS.reduce(
    (chain, tab) =>
      chain.catch(() =>
        fetch(`https://opensheet.elk.sh/${CHART_SHEET_ID}/${tab}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => { if (!Array.isArray(d) || d.length === 0) throw new Error(); return d; })
      ),
    Promise.reject()
  ).catch(() => []);

// ─── PORTS SHEET (world ports from Google Sheet) ───────────────────────────────
const PORTS_SHEET_ID = "1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk";
const PORTS_TABS = ["Sheet1","Ports","World Ports","Data","Sheet2"];
const fetchPortsSheet = () =>
  PORTS_TABS.reduce(
    (chain, tab) =>
      chain.catch(() =>
        fetch(`https://opensheet.elk.sh/${PORTS_SHEET_ID}/${tab}`)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(d => { if (!Array.isArray(d) || d.length === 0) throw new Error(); return d; })
      ),
    Promise.reject()
  ).catch(() => []);
import { auth, db } from "./firebase";
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from "firebase/auth";
import {
  collection, getDocs, addDoc, deleteDoc, doc, setDoc, serverTimestamp
} from "firebase/firestore";

// ─── ECDIS BRANDS ─────────────────────────────────────────────────────────────
const ECDIS_BRANDS = [
  { id:"furuno",    name:"Furuno",             emoji:"🟦", color:"#0066CC", models:"FMD-3200 / FMD-3300" },
  { id:"jrc",       name:"JRC",                emoji:"🟥", color:"#CC0000", models:"JAN-7201S / JAN-9201S" },
  { id:"transas",   name:"Transas / Wärtsilä", emoji:"🟩", color:"#007A4D", models:"Navi-Sailor 4000/3000" },
  { id:"sperry",    name:"Sperry Marine",       emoji:"🟨", color:"#D4900A", models:"VisionMaster FT / Pro" },
  { id:"tokimec",   name:"Tokimec / JMR",       emoji:"🟪", color:"#6B21A8", models:"JMR-7700 / JMR-9900" },
  { id:"raytheon",  name:"Raytheon Anschütz",   emoji:"⬛", color:"#374151", models:"ECDIS 1000 / 2000" },
  { id:"kongsberg", name:"Kongsberg Maritime",  emoji:"🔵", color:"#1D4ED8", models:"K-Bridge ECDIS" },
  { id:"danelec",   name:"Danelec Marine",      emoji:"🔶", color:"#EA580C", models:"DM800 ECDIS" },
  { id:"kelvin",    name:"Kelvin Hughes",        emoji:"🔷", color:"#0891B2", models:"SharpEye ECDIS" },
  { id:"northrop",  name:"Northrop Grumman",    emoji:"⭕", color:"#DC2626", models:"Integrated Bridge" },
  { id:"sam",       name:"SAM Electronics",     emoji:"🟫", color:"#92400E", models:"NACOS Platinum" },
  { id:"wartsila",  name:"Wärtsilä Voyage",     emoji:"🔺", color:"#059669", models:"Navi-Sailor Series" },
];

const ROUTE_TYPES = ["Ocean","Coastal","Deep Sea","Strait","River","Port Approach","Anchorage"];

// ─── ADMIN CONFIG — change this to your real admin email ──────────────────────
const ADMIN_EMAIL = 'ecdisroutes@gmail.com';

// ─── PORTS DATABASE ───────────────────────────────────────────────────────────
// Seed list — critical ports used by buildAutoRoute PORT_EXIT keys
// Full world list is loaded at runtime from the Google Sheet above
let PORTS_DB = [
  {id:"MUM",name:"Mumbai",        city:"Mumbai",      country:"India",       lat:18.93, lon:72.83},
  {id:"KAN",name:"Kandla",        city:"Kandla",      country:"India",       lat:23.01, lon:70.22},
  {id:"KOC",name:"Kochi",         city:"Kochi",       country:"India",       lat:9.97,  lon:76.27},
  {id:"MOR",name:"Mormugao",      city:"Goa",         country:"India",       lat:15.41, lon:73.80},
  {id:"NEW",name:"New Mangalore", city:"Mangalore",   country:"India",       lat:12.90, lon:74.82},
  {id:"CHE",name:"Chennai",       city:"Chennai",     country:"India",       lat:13.08, lon:80.29},
  {id:"VIS",name:"Visakhapatnam", city:"Vizag",       country:"India",       lat:17.69, lon:83.29},
  {id:"PAR",name:"Paradip",       city:"Paradip",     country:"India",       lat:20.32, lon:86.61},
  {id:"HAL",name:"Haldia",        city:"Haldia",      country:"India",       lat:22.03, lon:88.07},
  {id:"ENN",name:"Ennore",        city:"Chennai",     country:"India",       lat:13.22, lon:80.32},
  {id:"TUT",name:"Tuticorin",     city:"Tuticorin",   country:"India",       lat:8.80,  lon:78.14},
  {id:"COL",name:"Colombo",       city:"Colombo",     country:"Sri Lanka",   lat:6.94,  lon:79.85},
  {id:"HAM2",name:"Hambantota",   city:"Hambantota",  country:"Sri Lanka",   lat:6.12,  lon:81.11},
  {id:"TRI",name:"Trincomalee",   city:"Trincomalee", country:"Sri Lanka",   lat:8.57,  lon:81.23},
  {id:"KAR",name:"Karachi",       city:"Karachi",     country:"Pakistan",    lat:24.86, lon:67.01},
  {id:"QPQ",name:"Qasim",         city:"Karachi",     country:"Pakistan",    lat:24.78, lon:67.32},
  {id:"GWD",name:"Gwadar",        city:"Gwadar",      country:"Pakistan",    lat:25.12, lon:62.33},
  {id:"CTG",name:"Chittagong",    city:"Chittagong",  country:"Bangladesh",  lat:22.34, lon:91.82},
  {id:"MGL",name:"Mongla",        city:"Mongla",      country:"Bangladesh",  lat:22.49, lon:89.59},
  {id:"RGN",name:"Yangon",        city:"Yangon",      country:"Myanmar",     lat:16.78, lon:96.17},
  {id:"SIN",name:"Singapore",     city:"Singapore",   country:"Singapore",   lat:1.29,  lon:103.85},
  {id:"LEM",name:"Laem Chabang",  city:"Laem Chabang",country:"Thailand",    lat:13.08, lon:100.88},
  {id:"BKK",name:"Bangkok",       city:"Bangkok",     country:"Thailand",    lat:13.59, lon:100.60},
  {id:"PKL",name:"Port Klang",    city:"Klang",       country:"Malaysia",    lat:3.00,  lon:101.37},
  {id:"JHB",name:"Johor",         city:"Johor Bahru", country:"Malaysia",    lat:1.46,  lon:103.89},
  {id:"PGU",name:"Penang",        city:"Penang",      country:"Malaysia",    lat:5.41,  lon:100.34},
  {id:"JAK",name:"Jakarta",       city:"Jakarta",     country:"Indonesia",   lat:-6.11, lon:106.88},
  {id:"SHA",name:"Shanghai",      city:"Shanghai",    country:"China",       lat:31.23, lon:121.47},
  {id:"HKG",name:"Hong Kong",     city:"Hong Kong",   country:"China",       lat:22.29, lon:114.16},
  {id:"SZX",name:"Shenzhen",      city:"Shenzhen",    country:"China",       lat:22.49, lon:113.90},
  {id:"GZH",name:"Guangzhou",     city:"Guangzhou",   country:"China",       lat:23.09, lon:113.26},
  {id:"NGB",name:"Ningbo",        city:"Ningbo",      country:"China",       lat:29.87, lon:121.55},
  {id:"TJN",name:"Tianjin",       city:"Tianjin",     country:"China",       lat:39.01, lon:117.67},
  {id:"QIN",name:"Qingdao",       city:"Qingdao",     country:"China",       lat:36.07, lon:120.38},
  {id:"DAL",name:"Dalian",        city:"Dalian",      country:"China",       lat:38.92, lon:121.63},
  {id:"BUS",name:"Busan",         city:"Busan",       country:"South Korea", lat:35.10, lon:129.04},
  {id:"YOK",name:"Yokohama",      city:"Yokohama",    country:"Japan",       lat:35.45, lon:139.65},
  {id:"KOB",name:"Kobe",          city:"Kobe",        country:"Japan",       lat:34.68, lon:135.19},
  {id:"DXB",name:"Dubai",         city:"Dubai",       country:"UAE",         lat:25.05, lon:55.13},
  {id:"FUJ",name:"Fujairah",      city:"Fujairah",    country:"UAE",         lat:25.12, lon:56.34},
  {id:"AUH",name:"Abu Dhabi",     city:"Abu Dhabi",   country:"UAE",         lat:24.48, lon:54.37},
  {id:"SHJ",name:"Sharjah",       city:"Sharjah",     country:"UAE",         lat:25.37, lon:55.39},
  {id:"MCT",name:"Muscat",        city:"Muscat",      country:"Oman",        lat:23.62, lon:58.59},
  {id:"SLL",name:"Salalah",       city:"Salalah",     country:"Oman",        lat:16.94, lon:54.00},
  {id:"DOH",name:"Doha",          city:"Doha",        country:"Qatar",       lat:25.29, lon:51.55},
  {id:"RKH",name:"Ras Laffan",    city:"Ras Laffan",  country:"Qatar",       lat:25.91, lon:51.55},
  {id:"BAH",name:"Bahrain",       city:"Manama",      country:"Bahrain",     lat:26.24, lon:50.63},
  {id:"KWI",name:"Kuwait",        city:"Kuwait City", country:"Kuwait",      lat:29.37, lon:47.99},
  {id:"JED",name:"Jeddah",        city:"Jeddah",      country:"Saudi Arabia",lat:21.49, lon:39.18},
  {id:"YAN",name:"Yanbu",         city:"Yanbu",       country:"Saudi Arabia",lat:24.09, lon:38.06},
  {id:"DAM",name:"Dammam",        city:"Dammam",      country:"Saudi Arabia",lat:26.43, lon:50.10},
  {id:"JUB",name:"Jubail",        city:"Jubail",      country:"Saudi Arabia",lat:27.01, lon:49.65},
  {id:"BAS",name:"Basra",         city:"Basra",       country:"Iraq",        lat:30.52, lon:47.83},
  {id:"UMQ",name:"Umm Qasr",      city:"Umm Qasr",    country:"Iraq",        lat:30.03, lon:47.92},
  {id:"BND",name:"Bandar Abbas",  city:"Bandar Abbas",country:"Iran",        lat:27.18, lon:56.27},
  {id:"ADE",name:"Aden",          city:"Aden",        country:"Yemen",       lat:12.77, lon:44.99},
  {id:"JIB",name:"Djibouti",      city:"Djibouti",    country:"Djibouti",    lat:11.59, lon:43.14},
  {id:"PSD",name:"Port Said",     city:"Port Said",   country:"Egypt",       lat:31.26, lon:32.31},
  {id:"ALX",name:"Alexandria",    city:"Alexandria",  country:"Egypt",       lat:31.20, lon:29.89},
  {id:"MOM",name:"Mombasa",       city:"Mombasa",     country:"Kenya",       lat:-4.05, lon:39.67},
  {id:"DAR",name:"Dar es Salaam", city:"Dar es Salaam",country:"Tanzania",   lat:-6.82, lon:39.28},
  {id:"DUR",name:"Durban",        city:"Durban",      country:"South Africa",lat:-29.87,lon:31.04},
  {id:"CPT",name:"Cape Town",     city:"Cape Town",   country:"South Africa",lat:-33.91,lon:18.43},
  {id:"LAG",name:"Lagos",         city:"Lagos",       country:"Nigeria",     lat:6.45,  lon:3.39},
  {id:"TEM",name:"Tema",          city:"Tema",        country:"Ghana",       lat:5.63,  lon:0.01},
  {id:"DKR",name:"Dakar",         city:"Dakar",       country:"Senegal",     lat:14.69, lon:-17.44},
  {id:"TNG",name:"Tanger Med",    city:"Tanger",      country:"Morocco",     lat:35.90, lon:-5.50},
  {id:"PIR",name:"Piraeus",       city:"Athens",      country:"Greece",      lat:37.95, lon:23.63},
  {id:"IST",name:"Istanbul",      city:"Istanbul",    country:"Turkey",      lat:41.01, lon:28.97},
  {id:"GEN",name:"Genoa",         city:"Genoa",       country:"Italy",       lat:44.41, lon:8.93},
  {id:"BCN",name:"Barcelona",     city:"Barcelona",   country:"Spain",       lat:41.38, lon:2.18},
  {id:"MRS",name:"Marseille",     city:"Marseille",   country:"France",      lat:43.30, lon:5.37},
  {id:"ROT",name:"Rotterdam",     city:"Rotterdam",   country:"Netherlands", lat:51.92, lon:4.48},
  {id:"ANT",name:"Antwerp",       city:"Antwerp",     country:"Belgium",     lat:51.23, lon:4.42},
  {id:"HAM",name:"Hamburg",       city:"Hamburg",     country:"Germany",     lat:53.54, lon:9.99},
  {id:"FEL",name:"Felixstowe",    city:"Felixstowe",  country:"UK",          lat:51.96, lon:1.35},
  {id:"LON",name:"London",        city:"London",      country:"UK",          lat:51.51, lon:0.12},
  {id:"NYK",name:"New York",      city:"New York",    country:"USA",         lat:40.65, lon:-74.07},
  {id:"LAX",name:"Los Angeles",   city:"Los Angeles", country:"USA",         lat:33.74, lon:-118.27},
  {id:"HOU",name:"Houston",       city:"Houston",     country:"USA",         lat:29.76, lon:-95.37},
  {id:"SEA",name:"Seattle",       city:"Seattle",     country:"USA",         lat:47.60, lon:-122.33},
  {id:"SYD",name:"Sydney",        city:"Sydney",      country:"Australia",   lat:-33.86,lon:151.21},
  {id:"MEL",name:"Melbourne",     city:"Melbourne",   country:"Australia",   lat:-37.82,lon:144.97},
  {id:"PER",name:"Perth",         city:"Perth",       country:"Australia",   lat:-31.95,lon:115.86},
  {id:"MAN",name:"Manila",        city:"Manila",      country:"Philippines", lat:14.59, lon:120.98},
  {id:"SSL",name:"Santos",        city:"Santos",      country:"Brazil",      lat:-23.96,lon:-46.33},
  {id:"BUE",name:"Buenos Aires",  city:"Buenos Aires",country:"Argentina",   lat:-34.61,lon:-58.37},
  {id:"VAN",name:"Vancouver",     city:"Vancouver",   country:"Canada",      lat:49.29, lon:-123.11},
];

// ─── NORMALIZE PORT ROW from Google Sheet ────────────────────────────────────
function normalizePortRow(row){
  const get=(...keys)=>{
    for(const k of keys){
      const col=Object.keys(row).find(c=>c.toLowerCase().replace(/[\s_\-]/g,'')===k.toLowerCase().replace(/[\s_\-]/g,''));
      if(col&&row[col]!==undefined&&row[col]!=='') return String(row[col]).trim();
    }
    return '';
  };
  const lat=parseFloat(get('latitude','lat','Latitude','LAT'));
  const lon=parseFloat(get('longitude','lon','long','Longitude','LON','LONG'));
  if(isNaN(lat)||isNaN(lon)) return null;
  const name=get('portname','name','port','PortName','Port Name','PORT') || get('city','City','CITY') || '';
  if(!name) return null;
  const city=get('city','City','CITY') || name;
  const country=get('country','Country','COUNTRY','nation') || '';
  const code=get('locode','code','portcode','PortCode','LOCODE','unlocode') || name.substring(0,3).toUpperCase();
  const keywords=[name,city,country,code].filter(Boolean).join(' ').toLowerCase();
  return {id:code, name, city, country, lat, lon, keywords};
}

// ─── MARITIME ZONES ───────────────────────────────────────────────────────────
const ECA_ZONES = [
  { name:"North Sea ECA",       coords:[[48,-5],[62,-5],[62,13],[48,13]] },
  { name:"Baltic Sea ECA",      coords:[[53,9],[66,9],[66,30],[53,30]] },
  { name:"N. American ECA",     coords:[[24,-100],[24,-50],[75,-50],[75,-100]] },
  { name:"US Caribbean ECA",    coords:[[14,-70],[14,-60],[22,-60],[22,-70]] },
  { name:"China Coastal ECA",   coords:[[18,108],[18,122],[41,122],[41,108]] },
];
const SECA_ZONES = [
  { name:"Baltic Sea SECA",     coords:[[53,9],[66,9],[66,30],[53,30]] },
  { name:"North Sea SECA",      coords:[[48,-5],[62,-5],[62,13],[48,13]] },
];
const MARPOL_ZONES = [
  { name:"Mediterranean Sea",   coords:[[30,-6],[30,37],[47,37],[47,-6]] },
  { name:"Baltic Sea",          coords:[[53,9],[66,9],[66,30],[53,30]] },
  { name:"Black Sea",           coords:[[41,28],[47,28],[47,42],[41,42]] },
  { name:"Red Sea",             coords:[[12,32],[30,32],[30,44],[12,44]] },
  { name:"Arabian Gulf",        coords:[[22,48],[30,48],[30,57],[22,57]] },
  { name:"Gulf of Oman",        coords:[[22,56],[26,56],[26,61],[22,61]] },
  { name:"Antarctic Waters",    coords:[[-60,-180],[-60,180],[-90,180],[-90,-180]] },
];
const PIRACY_ZONES = [
  { name:"Indian Ocean HRA / Gulf of Aden", coords:[[0,40],[0,78],[25,78],[25,40]] },
  { name:"Gulf of Guinea / W. Africa",      coords:[[-5,0],[5,0],[5,10],[-5,10]] },
  { name:"Malacca / Singapore Strait",      coords:[[1,98],[6,98],[6,106],[1,106]] },
  { name:"Somali Coast",                    coords:[[-2,40],[12,40],[12,55],[-2,55]] },
  { name:"Gulf of Guinea Coast",            coords:[[-3,-3],[5,-3],[5,5],[-3,5]] },
];
const LAYOVER_ZONES = [
  { name:"Mumbai Anchorage",       coords:[[18.8,72.7],[18.8,73.0],[19.1,73.0],[19.1,72.7]] },
  { name:"Singapore Western Anch", coords:[[1.1,103.6],[1.1,103.9],[1.4,103.9],[1.4,103.6]] },
  { name:"Dubai / Jebel Ali Anch", coords:[[24.9,54.9],[24.9,55.2],[25.1,55.2],[25.1,54.9]] },
  { name:"Fujairah Anchorage",     coords:[[25.0,56.2],[25.0,56.5],[25.3,56.5],[25.3,56.2]] },
  { name:"Rotterdam Anchorage",    coords:[[51.8,4.0],[51.8,4.6],[52.0,4.6],[52.0,4.0]] },
  { name:"Colombo Anchorage",      coords:[[6.8,79.7],[6.8,80.0],[7.1,80.0],[7.1,79.7]] },
];

// ─── MATH HELPERS ─────────────────────────────────────────────────────────────
const DEG = Math.PI / 180;
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // NM
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(dLon/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * DEG;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG);
  const x = Math.cos(lat1*DEG)*Math.sin(lat2*DEG) - Math.sin(lat1*DEG)*Math.cos(lat2*DEG)*Math.cos(dLon);
  return ((Math.atan2(y, x) / DEG) + 360) % 360;
}

function greatCircle(lat1, lon1, lat2, lon2, n) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const d = 2*Math.asin(Math.sqrt(Math.sin(((lat2-lat1)*DEG)/2)**2+Math.cos(lat1*DEG)*Math.cos(lat2*DEG)*Math.sin(((lon2-lon1)*DEG)/2)**2));
    if (d === 0) { pts.push([lat1, lon1]); continue; }
    const A = Math.sin((1-f)*d)/Math.sin(d);
    const B = Math.sin(f*d)/Math.sin(d);
    const x = A*Math.cos(lat1*DEG)*Math.cos(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.cos(lon2*DEG);
    const y = A*Math.cos(lat1*DEG)*Math.sin(lon1*DEG)+B*Math.cos(lat2*DEG)*Math.sin(lon2*DEG);
    const z = A*Math.sin(lat1*DEG)+B*Math.sin(lat2*DEG);
    pts.push([Math.atan2(z,Math.sqrt(x*x+y*y))/DEG, Math.atan2(y,x)/DEG]);
  }
  return pts;
}

function recalcWaypoints(wps) {
  return wps.map((wp, i) => {
    if (i === 0) return { ...wp, distance: 0, bearing: 0, totalNM: 0 };
    const prev = wps[i-1];
    const dist = haversine(prev.lat, prev.lon, wp.lat, wp.lon);
    const bear = calcBearing(prev.lat, prev.lon, wp.lat, wp.lon);
    const totalNM = (wps[i-1].totalNM || 0) + dist;
    return { ...wp, distance: dist, bearing: bear, totalNM };
  });
}

function totalRouteNM(wps) {
  return wps.reduce((s, w) => s + (w.distance || 0), 0);
}

// ─── SEA CORRIDORS — extracted from PortToPort.exe IMO TSS SHP data ───────────
const SEA_WP = {
  // ── Suez Canal & Red Sea
  SUEZ_N:{lat:31.27,lon:32.33,name:"SUEZ N"},
  SUEZ_S:{lat:29.92,lon:32.55,name:"SUEZ S"},
  RED_N:{lat:29.77,lon:32.55,name:"RED N"},
  RED_CN:{lat:28.16,lon:33.28,name:"RED CN"},
  RED_CS:{lat:22.29,lon:38.88,name:"RED CS"},
  RED_S:{lat:15.0,lon:41.5,name:"RED S"},
  BAB:{lat:12.58,lon:43.38,name:"BAB"},
  ADEN_G:{lat:11.8,lon:45.5,name:"ADEN G"},
  // ── Persian Gulf & Arabian Sea
  HORMUZ:{lat:26.58,lon:56.35,name:"HORMUZ"},
  HORMUZ_E:{lat:23.5,lon:59.0,name:"HORMUZ E"},
  IND_W:{lat:12.0,lon:62.0,name:"IND W"},
  IND_C:{lat:4.0,lon:73.0,name:"IND C"},
  SOCOTRA:{lat:12.0,lon:54.0,name:"SOCOTRA"},
  // ── India Coastal Corridor (avoids land)
  IND_W_COAST:{lat:14.0,lon:73.0,name:"IND W COAST"},
  LAKSHADWEEP:{lat:10.0,lon:71.0,name:"LAKSHADWEEP"},
  IND_SW:{lat:10.0,lon:74.8,name:"IND SW"},
  IND_TIP_W:{lat:7.5,lon:76.5,name:"IND TIP W"},
  IND_TIP:{lat:6.0,lon:77.5,name:"IND TIP"},
  PALK_W:{lat:7.5,lon:78.8,name:"PALK W"},
  LANKA_SW:{lat:5.8,lon:79.8,name:"LANKA SW"},
  LANKA_S:{lat:5.4,lon:80.6,name:"LANKA S"},
  LANKA_SE:{lat:6.0,lon:82.0,name:"LANKA SE"},
  IND_NE:{lat:8.5,lon:84.5,name:"IND NE"},
  IND_E_COAST:{lat:12.0,lon:81.5,name:"IND E COAST"},
  // ── Bay of Bengal & Andaman Sea
  BAY_SW:{lat:10.0,lon:83.0,name:"BAY SW"},
  BAY_C:{lat:13.5,lon:87.0,name:"BAY C"},
  BAY_N:{lat:18.0,lon:90.0,name:"BAY N"},
  ANDAMAN_W:{lat:11.0,lon:92.0,name:"ANDAMAN W"},
  ANDAMAN:{lat:10.5,lon:94.0,name:"ANDAMAN"},
  ANDAMAN_S:{lat:6.5,lon:95.0,name:"ANDAMAN S"},
  // ── Malacca & Singapore Strait (real IMO TSS data)
  MALACCA_NW:{lat:6.5,lon:98.8,name:"MALACCA NW"},
  MALACCA_N:{lat:3.09,lon:101.02,name:"MALACCA N"},
  MALACCA_C1:{lat:2.9,lon:100.67,name:"MALACCA C1"},
  MALACCA_C:{lat:2.33,lon:101.35,name:"MALACCA C"},
  MALACCA_S1:{lat:1.83,lon:101.8,name:"MALACCA S1"},
  MALACCA_S2:{lat:1.56,lon:102.39,name:"MALACCA S2"},
  MALACCA_S3:{lat:1.15,lon:103.41,name:"MALACCA S3"},
  MALACCA_S:{lat:1.18,lon:103.82,name:"MALACCA S"},
  // ── South China Sea & SE Asia
  S_CHINA_N:{lat:14.0,lon:112.0,name:"S CHINA N"},
  S_CHINA_S:{lat:3.0,lon:108.0,name:"S CHINA S"},
  PHILIP:{lat:10.0,lon:122.0,name:"PHILIP"},
  LOMBOK:{lat:-8.5,lon:115.8,name:"LOMBOK"},
  SUNDA:{lat:-6.1,lon:105.7,name:"SUNDA"},
  TIMOR:{lat:-9.5,lon:127.0,name:"TIMOR"},
  ARAFURA:{lat:-12.0,lon:136.0,name:"ARAFURA"},
  TORRES:{lat:-10.5,lon:142.5,name:"TORRES"},
  AUS_N:{lat:-12.0,lon:127.0,name:"AUS N"},
  AUS_W:{lat:-25.0,lon:108.0,name:"AUS W"},
  // ── Far East
  EAST_CHINA:{lat:27.0,lon:124.0,name:"EAST CHINA"},
  EAST_CHINA_N:{lat:37.57,lon:122.61,name:"EAST CHINA N"},
  EAST_CHINA2:{lat:31.0,lon:124.0,name:"EAST CHINA2"},
  KOREA_STR:{lat:34.5,lon:129.0,name:"KOREA STR"},
  JAPAN_SEA:{lat:37.0,lon:132.0,name:"JAPAN SEA"},
  TSUGARU:{lat:41.5,lon:140.8,name:"TSUGARU"},
  // ── Mediterranean
  GIBRALTAR:{lat:35.98,lon:-5.5,name:"GIBRALTAR"},
  MED_W:{lat:37.5,lon:5.0,name:"MED W"},
  MED_C:{lat:37.5,lon:15.0,name:"MED C"},
  MED_E:{lat:34.5,lon:24.0,name:"MED E"},
  BLACK_W:{lat:43.0,lon:29.0,name:"BLACK W"},
  // ── N.Europe
  BASC:{lat:47.0,lon:-5.0,name:"BASC"},
  DOVER:{lat:51.05,lon:1.5,name:"DOVER"},
  NORTH_SEA:{lat:56.0,lon:3.0,name:"NORTH SEA"},
  BALTIC_E:{lat:59.0,lon:21.5,name:"BALTIC E"},
  // ── Atlantic Ocean
  ATLANTIC_N:{lat:45.0,lon:-30.0,name:"ATLANTIC N"},
  ATLANTIC_C:{lat:20.0,lon:-35.0,name:"ATLANTIC C"},
  ATLANTIC_S:{lat:-15.0,lon:-20.0,name:"ATLANTIC S"},
  ATLANTIC_SW:{lat:-40.0,lon:-40.0,name:"ATLANTIC SW"},
  // ── Australia & Pacific
  AUS_SE:{lat:-38.5,lon:148.2,name:"AUS SE"},
  CORAL:{lat:-18.0,lon:152.0,name:"CORAL"},
  TASMAN:{lat:-38.0,lon:157.0,name:"TASMAN"},
  NZ_N:{lat:-38.52,lon:174.63,name:"NZ N"},
  NZ_S:{lat:-39.89,lon:174.91,name:"NZ S"},
  PAC_NW:{lat:48.0,lon:-160.0,name:"PAC NW"},
  PAC_NE:{lat:40.0,lon:-150.0,name:"PAC NE"},
  PAC_C:{lat:5.0,lon:-140.0,name:"PAC C"},
  PAC_SW:{lat:-20.0,lon:170.0,name:"PAC SW"},
  PAC_SE:{lat:-20.0,lon:-90.0,name:"PAC SE"},
  // ── Caribbean & Gulf of Mexico (real TSS)
  CARIB:{lat:15.0,lon:-75.0,name:"CARIB"},
  GULF_MEX:{lat:28.88,lon:-90.02,name:"GULF MEX"},
  PANAMA_CH:{lat:7.0,lon:-81.83,name:"PANAMA CH"},
  PANAMA_A:{lat:9.38,lon:-79.9,name:"PANAMA A"},
  PANAMA_P:{lat:8.9,lon:-79.5,name:"PANAMA P"},
  // ── US East Coast (real TSS)
  US_NE:{lat:40.45,lon:-73.68,name:"US NE"},
  US_BOSTON:{lat:42.36,lon:-70.92,name:"US BOSTON"},
  US_SE:{lat:36.93,lon:-75.92,name:"US SE"},
  // ── US West Coast (real TSS)
  US_PNW:{lat:48.19,lon:-122.78,name:"US PNW"},
  US_CA:{lat:33.74,lon:-118.27,name:"US CA"},
  // ── S.America (real TSS)
  CALLAO:{lat:-12.03,lon:-77.23,name:"CALLAO"},
  ANTOF:{lat:-23.63,lon:-70.49,name:"ANTOF"},
  VALP:{lat:-32.74,lon:-71.53,name:"VALP"},
  ILO:{lat:-18.47,lon:-70.42,name:"ILO"},
  CAPE_HORN:{lat:-56.0,lon:-67.5,name:"CAPE HORN"},
  // ── Africa
  CANARY:{lat:28.04,lon:-15.07,name:"CANARY"},
  AFR_W:{lat:5.0,lon:-5.0,name:"AFR W"},
  AFR_E:{lat:-10.0,lon:43.0,name:"AFR E"},
  CAPE_GH:{lat:-34.5,lon:18.0,name:"CAPE GH"},
  IND_SW2:{lat:-25.0,lon:40.0,name:"IND SW2"},
  // ── Indian Ocean
  IND_S:{lat:-30.0,lon:65.0,name:"IND S"},
  IND_OCEAN_SE:{lat:-15.0,lon:80.0,name:"IND OCEAN SE"},
};

// ─── PORT EXIT CORRIDORS — tells the router how to leave each port safely ─────
// Each entry: array of SEA_WP keys to insert right after departure
const PORT_EXIT = {
  // India West Coast — must go SW then around southern tip before heading east
  MUM:  ['IND_W_COAST','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  KAN:  ['LAKSHADWEEP','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  KOC:  ['IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  MOR:  ['IND_W_COAST','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  NEW:  ['IND_W_COAST','IND_SW','IND_TIP_W','IND_TIP','PALK_W'],
  // India East Coast — exit east/southeast, no need to go around tip
  CHE:  ['IND_E_COAST'],
  VIS:  ['IND_E_COAST'],
  PAR:  ['BAY_SW'],
  HAL:  ['BAY_N','BAY_C'],
  ENN:  ['IND_E_COAST'],
  // Sri Lanka — go south of island
  COL:  ['PALK_W','LANKA_SW','LANKA_S'],
  TRI:  ['LANKA_SE','LANKA_S'],
  HAM2: ['LANKA_S'],
  // Pakistan — through Arabian Sea
  KAR:  ['IND_W'],
  QPQ:  ['IND_W'],
  GWD:  ['HORMUZ_E','IND_W'],
  // Gulf ports — must exit through Hormuz
  DXB:  ['HORMUZ'],
  AUH:  ['HORMUZ'],
  FUJ:  [],  // Fujairah is already outside Hormuz
  SHJ:  ['HORMUZ'],
  MCT:  [],  // Muscat is outside Gulf
  DOH:  ['HORMUZ'],
  RKH:  ['HORMUZ'],
  BAH:  ['HORMUZ'],
  KWI:  ['HORMUZ'],
  JED:  ['RED_S'],
  YAN:  ['RED_N'],
  JUB:  ['HORMUZ'],
  BAS:  ['HORMUZ'],
  UMQ:  ['HORMUZ'],
  BND:  ['HORMUZ'],
  // SE Asia
  SIN:  [],
  LEM:  ['MALACCA_S','MALACCA_S3','MALACCA_S2','MALACCA_S1'],
  BKK:  ['MALACCA_S','MALACCA_S3','MALACCA_S2','MALACCA_S1'],
  PKL:  ['MALACCA_S','MALACCA_S3','MALACCA_S2','MALACCA_S1'],
  JHB:  [],
  PGU:  ['MALACCA_N','MALACCA_C1','MALACCA_C'],
  // Bay of Bengal
  CTG:  ['BAY_N'],
  MGL:  ['BAY_N'],
  RGN:  ['BAY_C','ANDAMAN_W'],
  // China / Far East — exit through SCS
  SHA:  ['EAST_CHINA'],
  HKG:  ['S_CHINA_N'],
  SZX:  ['S_CHINA_N'],
  GZH:  ['S_CHINA_N'],
  NGB:  ['EAST_CHINA'],
  TJN:  ['EAST_CHINA','S_CHINA_N'],
  QIN:  ['EAST_CHINA'],
  DAL:  ['EAST_CHINA'],
};

// ─── ROUTE LOOKUP TABLE — exact waypoints extracted from PortToPort TSS data ──
// Key = "FROM-TO", value = [[lat,lon],...] deep-water waypoints
const ROUTE_TABLE = {
  "MUM-SIN":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.83,101.8],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "MUM-PKL":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.9,100.67],[3.0,101.37]],
  "MUM-COL":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[7.5,78.8],[6.94,79.85]],
  "MUM-DXB":[[18.93,72.83],[20.0,65.0],[24.0,60.0],[26.58,56.35],[25.05,55.13]],
  "MUM-KAR":[[18.93,72.83],[22.0,70.5],[24.86,67.01]],
  "MUM-JED":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.4,80.6],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85],[6.94,79.85],[12.0,62.0],[12.58,43.38],[15.0,41.5],[21.49,39.18]],
  "MUM-ROT":[[18.93,72.83],[14.0,73.0],[10.0,74.8],[7.5,76.5],[6.0,77.5],[7.5,78.8],[5.8,79.8],[5.4,80.6],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,15.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "SIN-SHA":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[22.0,117.0],[27.0,122.0],[31.23,121.47]],
  "SIN-HKG":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[22.29,114.16]],
  "SIN-MAN":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[10.0,115.0],[14.59,120.98]],
  "SIN-BUS":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[27.0,122.0],[34.0,127.0],[35.1,129.04]],
  "SIN-YOK":[[1.29,103.85],[1.15,103.41],[3.0,108.0],[14.0,112.0],[22.0,117.0],[27.0,122.0],[34.0,132.0],[35.45,139.65]],
  "SIN-SYD":[[1.29,103.85],[3.0,108.0],[-8.5,115.8],[-18.0,120.0],[-30.0,135.0],[-33.86,151.21]],
  "SIN-COL":[[1.29,103.85],[1.15,103.41],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.9,98.5],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[5.8,79.8],[6.94,79.85]],
  "SIN-MUM":[[1.29,103.85],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.0,99.2],[5.9,98.5],[6.5,95.0],[8.5,84.5],[6.0,82.0],[5.4,80.6],[5.8,79.8],[7.5,78.8],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "SIN-DXB":[[1.29,103.85],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.9,98.5],[6.5,95.0],[8.5,84.5],[5.4,80.6],[6.0,77.5],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83],[12.0,62.0],[12.0,50.0],[12.58,43.38],[12.0,62.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "SIN-ROT":[[1.29,103.85],[1.56,102.39],[2.33,101.35],[3.09,101.02],[5.9,98.5],[6.5,95.0],[8.5,84.5],[5.4,80.6],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "DXB-SIN":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[10.0,65.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "DXB-ROT":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[12.0,50.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,15.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "DXB-MUM":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[18.0,62.0],[14.0,67.0],[18.93,72.83]],
  "DXB-SHA":[[25.05,55.13],[26.58,56.35],[23.5,59.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[3.09,101.02],[1.18,103.82],[3.0,108.0],[14.0,112.0],[27.0,122.0],[31.23,121.47]],
  "ROT-SIN":[[51.92,4.48],[51.05,1.5],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[22.0,38.0],[15.0,41.5],[12.58,43.38],[12.0,50.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "ROT-SHA":[[51.92,4.48],[51.05,1.5],[45.0,-5.0],[35.98,-5.5],[37.5,5.0],[34.5,24.0],[31.27,32.33],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,84.5],[6.5,95.0],[3.09,101.02],[1.15,103.41],[3.0,108.0],[14.0,112.0],[27.0,122.0],[31.23,121.47]],
  "ROT-MUM":[[51.92,4.48],[35.98,-5.5],[34.5,24.0],[31.27,32.33],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "COL-SIN":[[6.94,79.85],[5.8,79.8],[5.4,80.6],[6.0,82.0],[8.5,84.5],[6.5,95.0],[5.9,98.5],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.56,102.39],[1.15,103.41],[1.29,103.85]],
  "COL-MUM":[[6.94,79.85],[7.5,78.8],[7.5,76.5],[10.0,74.8],[14.0,73.0],[18.93,72.83]],
  "KAR-SIN":[[24.86,67.01],[20.0,65.0],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.15,103.41],[1.29,103.85]],
  "KAR-DXB":[[24.86,67.01],[26.0,61.0],[26.58,56.35],[25.05,55.13]],
  "SHA-SIN":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[5.0,108.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "SHA-ROT":[[31.23,121.47],[27.0,122.0],[14.0,112.0],[5.0,108.0],[1.15,103.41],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[45.0,-5.0],[51.92,4.48]],
  "SHA-BUS":[[31.23,121.47],[34.0,127.0],[35.1,129.04]],
  "HKG-SIN":[[22.29,114.16],[14.0,112.0],[3.0,108.0],[1.29,103.85]],
  "HKG-ROT":[[22.29,114.16],[14.0,112.0],[3.0,108.0],[1.29,103.85],[6.5,95.0],[8.5,84.5],[12.0,62.0],[12.58,43.38],[15.0,41.5],[22.0,38.0],[29.77,32.55],[31.27,32.33],[34.5,24.0],[37.5,5.0],[35.98,-5.5],[51.92,4.48]],
  "BUS-SIN":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "BUS-SHA":[[35.1,129.04],[34.0,127.0],[27.0,122.0],[31.23,121.47]],
  "YOK-SIN":[[35.45,139.65],[34.0,132.0],[27.0,122.0],[14.0,112.0],[3.0,108.0],[1.15,103.41],[1.29,103.85]],
  "YOK-SHA":[[35.45,139.65],[34.0,132.0],[31.23,121.47]],
  "YOK-LAX":[[35.45,139.65],[40.0,150.0],[48.0,170.0],[45.0,-160.0],[40.0,-140.0],[33.74,-118.27]],
  "LAX-YOK":[[33.74,-118.27],[40.0,-140.0],[45.0,-160.0],[48.0,170.0],[40.0,150.0],[35.45,139.65]],
  "LAX-SHA":[[33.74,-118.27],[40.0,-140.0],[45.0,-160.0],[48.0,170.0],[40.0,150.0],[35.45,139.65],[31.23,121.47]],
  "NYK-ROT":[[40.65,-74.07],[42.0,-60.0],[45.0,-30.0],[50.0,-10.0],[51.92,4.48]],
  "ROT-NYK":[[51.92,4.48],[50.0,-10.0],[45.0,-30.0],[42.0,-60.0],[40.65,-74.07]],
  "NYK-SIN":[[40.65,-74.07],[35.0,-73.0],[28.0,-80.0],[22.0,-80.0],[15.0,-75.0],[9.38,-79.9],[8.9,-79.5],[5.0,-85.0],[3.0,-85.0],[3.0,108.0],[1.29,103.85]],
  "MOM-MUM":[[- 4.05,39.67],[-10.0,43.0],[8.0,60.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "MOM-SIN":[[-4.05,39.67],[-10.0,43.0],[-15.0,55.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "CHE-SIN":[[13.08,80.29],[10.0,81.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[2.33,101.35],[1.29,103.85]],
  "CTG-SIN":[[22.34,91.82],[18.0,90.0],[13.5,87.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "JAK-SIN":[[-6.11,106.88],[-6.1,105.7],[1.15,103.41],[1.29,103.85]],
  "SIN-JAK":[[1.29,103.85],[1.15,103.41],[-6.1,105.7],[-6.11,106.88]],
  "SYD-SIN":[[-33.86,151.21],[-30.0,135.0],[-18.0,120.0],[-8.5,115.8],[3.0,108.0],[1.29,103.85]],
  "SYD-SHA":[[-33.86,151.21],[-18.0,152.0],[-10.5,142.5],[3.0,130.0],[14.0,119.0],[22.0,117.0],[31.23,121.47]],
  "ADE-MUM":[[12.77,44.99],[12.58,43.38],[12.0,50.0],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "ADE-SIN":[[12.77,44.99],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
  "PSD-DXB":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,50.0],[23.5,59.0],[26.58,56.35],[25.05,55.13]],
  "PSD-MUM":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[14.0,67.0],[18.93,72.83]],
  "PSD-SIN":[[31.26,32.31],[29.77,32.55],[15.0,41.5],[12.58,43.38],[12.0,62.0],[8.5,75.0],[8.5,84.5],[6.5,95.0],[5.0,99.2],[3.09,101.02],[1.29,103.85]],
};

// ─── AUTO ROUTE — sea-lane routing with coastal avoidance ─────────────────────
function buildAutoRoute(fromPort, toPort) {
  const from = PORTS_DB.find(p => p.id === fromPort);
  const to   = PORTS_DB.find(p => p.id === toPort);
  if (!from || !to) return [];

  // ── 1. Check direct lookup table first ──────────────────────────────────────
  const key  = `${fromPort}-${toPort}`;
  const keyR = `${toPort}-${fromPort}`;
  if (ROUTE_TABLE[key]) {
    const wps = ROUTE_TABLE[key].map(([lat,lon],i,arr)=>({
      lat,lon,
      name: i===0?from.name:i===arr.length-1?to.name:undefined,
    }));
    return recalcWaypoints(wps);
  }
  if (ROUTE_TABLE[keyR]) {
    const wps = [...ROUTE_TABLE[keyR]].reverse().map(([lat,lon],i,arr)=>({
      lat,lon,
      name: i===0?from.name:i===arr.length-1?to.name:undefined,
    }));
    return recalcWaypoints(wps);
  }

  const wps = [];
  const add = (...keys) => keys.forEach(k => { if(SEA_WP[k]) wps.push({...SEA_WP[k]}); });

  // ── Helper region tests ────────────────────────────────────────────────────
  const isWestIndia  = p => p.lon>=69 && p.lon<77  && p.lat>=8  && p.lat<24;
  const isEastIndia  = p => p.lon>=77 && p.lon<88  && p.lat>=8  && p.lat<22;
  const isBayBengal  = p => p.lon>=79 && p.lon<99  && p.lat>=5  && p.lat<24;
  const isSriLanka   = p => p.lon>=79 && p.lon<82  && p.lat>=5  && p.lat<10;
  const isIndianOcn  = p => p.lon>=44 && p.lon<80  && p.lat>=-10&& p.lat<25;
  const isPersGulf   = p => p.lon>=48 && p.lon<58  && p.lat>22;
  const isRedSea     = p => p.lon>=32 && p.lon<44  && p.lat>=11 && p.lat<31;
  const isMalacca    = p => p.lon>=98 && p.lon<105 && p.lat>=1  && p.lat<8;
  const isSeAsia     = p => p.lon>=98 && p.lon<120 && p.lat>=-10&& p.lat<22;
  const isFarEast    = p => p.lon>=108&& p.lat>=-5 && p.lat<45;
  const isJapanKorea = p => p.lon>=120&& p.lat>=28 && p.lat<46;
  const isMed        = p => p.lon>-6  && p.lon<37  && p.lat>30  && p.lat<47;
  const isEurope     = p => (p.lon<20 && p.lat>40) || (p.lon>=-10&&p.lon<25&&p.lat>50);
  const isUKNorth    = p => p.lon>=-10&& p.lon<5   && p.lat>=55 && p.lat<62;
  const isBaltic     = p => p.lon>9   && p.lon<32  && p.lat>53  && p.lat<66;
  const isBlackSea   = p => p.lon>27  && p.lon<42  && p.lat>40  && p.lat<48;
  const isEAfrica    = p => p.lon>=36 && p.lon<52  && p.lat>=-30&& p.lat<15;
  const isWAfrica    = p => p.lon>=-20&& p.lon<10  && p.lat>=-10&& p.lat<20;
  const isEastUS     = p => p.lon>=-82&& p.lon<-65 && p.lat>=24 && p.lat<47;
  const isWestUS     = p => p.lon<=-100&&p.lat>=10 && p.lat<62;
  const isCarib      = p => p.lon>=-88&& p.lon<-60 && p.lat>=8  && p.lat<24;
  const isGulfMex    = p => p.lon>=-100&&p.lon<-80 && p.lat>=18 && p.lat<32;
  const isSAmer      = p => p.lon>=-85&& p.lon<-30 && p.lat<12;
  const isSAtl       = p => p.lon>=-55&& p.lon<20  && p.lat<-10;
  const isAustralia  = p => p.lon>=113&& p.lon<155 && p.lat>=-45&& p.lat<-10;
  const isPacific    = p => p.lon>155 || (p.lon<-130&& p.lat<-10);

  // ── Apply port departure corridor ──────────────────────────────────────────
  const fromExit = PORT_EXIT[from.id] || [];
  fromExit.forEach(k => { if(SEA_WP[k]) wps.push({...SEA_WP[k]}); });

  // ── After exit, determine the ocean-crossing waypoints ───────────────────
  // Key concept: once we know the "cleared" position (after exit corridor),
  // determine if we need Suez, Malacca, Cape etc.

  const fromCleared = wps.length > 0 ? wps[wps.length-1] : from;

  // Determine if we need to go around India tip (from west to east or vice versa)
  const fromWestIndia = isWestIndia(from) || (isPersGulf(from)&&!isSeAsia(to)&&!isFarEast(to));
  const toEastOfIndia = isEastIndia(to)||isBayBengal(to)||isSeAsia(to)||isFarEast(to)||isJapanKorea(to);
  const fromEastOfIndia = isEastIndia(from)||isBayBengal(from)||isSeAsia(from)||isFarEast(from);
  const toWestOfIndia = isWestIndia(to)||isIndianOcn(to)||isPersGulf(to)||isRedSea(to)||isEAfrica(to);

  // Did we already go around India tip in the exit corridor?
  const alreadyRoundedTip = fromExit.includes('IND_TIP') || fromExit.includes('IND_TIP_W');

  // ── India subcontinent bypass ──────────────────────────────────────────────
  // West→East: need to go around southern tip of India
  if(fromWestIndia && toEastOfIndia && !alreadyRoundedTip) {
    add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE');
  }
  // East→West: around the southern tip going west
  if(fromEastOfIndia && toWestOfIndia && !fromExit.includes('IND_TIP')) {
    // Insert tip waypoints before any west-India destination
    add('LANKA_S','IND_TIP','IND_TIP_W');
  }

  // ── Connecting to Malacca ──────────────────────────────────────────────────
  const needsMalacca = (isIndianOcn(from)||isWestIndia(from)||isBayBengal(from)||isSriLanka(from)||isPersGulf(from)||isRedSea(from)||isEAfrica(from)||isMed(from)||isEurope(from)) &&
    (isSeAsia(to)||isFarEast(to)||isJapanKorea(to));
  const needsMalaccaRev = (isSeAsia(from)||isFarEast(from)||isJapanKorea(from)) &&
    (isIndianOcn(to)||isWestIndia(to)||isBayBengal(to)||isSriLanka(to)||isPersGulf(to)||isRedSea(to)||isEAfrica(to)||isMed(to)||isEurope(to));

  if(needsMalacca && !fromExit.some(k=>['MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S'].includes(k))) {
    if(!isBayBengal(from)&&!isEastIndia(from)) {
      // Coming from west/Indian Ocean — MUST go around Sri Lanka before Andaman
      // IND_TIP already added by PORT_EXIT for west India ports
      // Add Sri Lanka bypass: go south of Sri Lanka then northeast
      add('PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
    } else {
      // Bay of Bengal / East India — already east of Sri Lanka
      add('ANDAMAN_W','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
    }
  }
  if(needsMalaccaRev) {
    if(!isBayBengal(to)&&!isEastIndia(to)) {
      add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W');
    } else {
      add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','ANDAMAN_W');
    }
  }

  // ── Suez Canal ────────────────────────────────────────────────────────────
  const needsSuez = (isMed(from)||isEurope(from)||isBaltic(from)||isUKNorth(from)||isBlackSea(from)) &&
    (isIndianOcn(to)||isPersGulf(to)||isEAfrica(to)||isBayBengal(to)||isSeAsia(to)||isFarEast(to)||isWestIndia(to)||isSriLanka(to));
  const needsSuezRev = (isMed(to)||isEurope(to)||isBaltic(to)||isUKNorth(to)||isBlackSea(to)) &&
    (isIndianOcn(from)||isPersGulf(from)||isEAfrica(from)||isBayBengal(from)||isSeAsia(from)||isFarEast(from)||isWestIndia(from)||isSriLanka(from));

  if(needsSuez){
    if(isBlackSea(from)) add('BLACK_W');
    if(isBaltic(from))   add('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(isUKNorth(from))  add('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(isEurope(from)&&!isMed(from)&&!isUKNorth(from)&&!isBaltic(from)) add('BASC','GIBRALTAR');
    add('MED_W','MED_E','SUEZ_N','SUEZ_S','RED_N','RED_S','BAB','ADEN_G','SOCOTRA');
    if(isPersGulf(to))   add('HORMUZ_E','HORMUZ');
    else if(isEAfrica(to)) add('AFR_E');
    else if(isWestIndia(to)||isIndianOcn(to)) add('IND_W');
    else if(isBayBengal(to)||isSriLanka(to))  add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE');
    else if(isEastIndia(to)) add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','IND_E_COAST');
    else if(isSeAsia(to)||isFarEast(to)) add('IND_W','PALK_W','LANKA_SW','LANKA_S','LANKA_SE','IND_NE','ANDAMAN_S','MALACCA_NW','MALACCA_N','MALACCA_C1','MALACCA_C','MALACCA_S1','MALACCA_S2','MALACCA_S3','MALACCA_S');
  }
  if(needsSuezRev){
    if(isPersGulf(from))     add('HORMUZ','HORMUZ_E');
    else if(isEAfrica(from)) add('AFR_E','IND_W');
    else if(isSeAsia(from)||isFarEast(from)) add('MALACCA_S','MALACCA_S1','MALACCA_C','MALACCA_C1','MALACCA_N','MALACCA_NW','ANDAMAN_S','IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if(isBayBengal(from)||isEastIndia(from)) add('IND_NE','LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_W');
    else if(isWestIndia(from)) add('IND_W');
    add('SOCOTRA','ADEN_G','BAB','RED_S','RED_N','SUEZ_S','SUEZ_N','MED_E','MED_W');
    if(isBlackSea(to)) add('BLACK_W');
    if(isBaltic(to))   add('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(isUKNorth(to))  add('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(isEurope(to)&&!isMed(to)&&!isUKNorth(to)&&!isBaltic(to)) add('GIBRALTAR','BASC');
  }

  // ── Cape of Good Hope ─────────────────────────────────────────────────────
  const needsCape = !needsSuez && !needsSuezRev && (
    ((isSAtl(from)||isWAfrica(from)||isSAmer(from))&&(isIndianOcn(to)||isEAfrica(to)||isSeAsia(to)||isFarEast(to)||isAustralia(to)))||
    ((isSAtl(to)||isWAfrica(to)||isSAmer(to))&&(isIndianOcn(from)||isEAfrica(from)||isSeAsia(from)||isFarEast(from)||isAustralia(from)))
  );
  if(needsCape){
    if(isIndianOcn(to)||isEAfrica(to)||isSeAsia(to)||isFarEast(to)||isAustralia(to)){
      add('ATLANTIC_S','CAPE_GH','IND_S','IND_SW2');
    } else {
      add('IND_SW2','IND_S','CAPE_GH','ATLANTIC_S');
    }
  }

  // ── Panama Canal ──────────────────────────────────────────────────────────
  const needsPanama = !needsSuez && !needsSuezRev && (
    (isWestUS(from)&&(isEastUS(to)||isCarib(to)||isSAtl(to)||isEurope(to)||isWAfrica(to)))||
    ((isEastUS(from)||isCarib(from)||isSAtl(from))&&isWestUS(to))
  );
  if(needsPanama){
    if(isWestUS(to)){ add('CARIB','PANAMA_A','PANAMA_P'); }
    else             { add('PANAMA_P','PANAMA_A','CARIB'); }
  }

  // ── Pacific crossing ──────────────────────────────────────────────────────
  const needsPacific    = (isFarEast(from)||isJapanKorea(from))&&(isWestUS(to)||isEastUS(to));
  const needsPacificRev = (isFarEast(to)||isJapanKorea(to))&&(isWestUS(from)||isEastUS(from));
  if(needsPacific)    add('PAC_NW','PAC_NE');
  if(needsPacificRev) add('PAC_NE','PAC_NW');

  // ── Atlantic crossing ─────────────────────────────────────────────────────
  const crossAtl = !needsPanama && !needsSuez && !needsSuezRev && !needsCape && (
    (isEurope(from)||(isEastUS(from)||isCarib(from))) && (isEurope(to)||isEastUS(to)||isCarib(to)||isWAfrica(to)||isSAmer(to))
  );
  if(crossAtl){
    if(isEurope(from)&&(isEastUS(to)||isCarib(to)))     add('BASC','ATLANTIC_N');
    else if((isEastUS(from)||isCarib(from))&&isEurope(to)) add('ATLANTIC_N','BASC');
    else if(isSAmer(to)||isSAtl(to))                    add('ATLANTIC_C','ATLANTIC_S');
    else if(isSAmer(from)||isSAtl(from))                add('ATLANTIC_S','ATLANTIC_C');
    else                                                 add('ATLANTIC_C');
  }

  // ── Australia routing ─────────────────────────────────────────────────────
  if(!needsCape&&!needsSuez&&!needsSuezRev){
    if(isAustralia(from)&&(isSeAsia(to)||isFarEast(to))){
      if(from.lon>140)       add('TORRES','ARAFURA','TIMOR','LOMBOK','S_CHINA_S');
      else if(from.lat< -25) add('AUS_W','LOMBOK','S_CHINA_S');
      else                   add('AUS_N','TIMOR','LOMBOK','S_CHINA_S');
    }
    if(isAustralia(to)&&(isSeAsia(from)||isFarEast(from))){
      if(to.lon>140)         add('S_CHINA_S','LOMBOK','TIMOR','ARAFURA','TORRES');
      else if(to.lat< -25)   add('S_CHINA_S','LOMBOK','AUS_W');
      else                   add('S_CHINA_S','LOMBOK','TIMOR','AUS_N');
    }
    if(isAustralia(from)&&isEAfrica(to))   add('IND_S','IND_SW2','AFR_E');
    if(isEAfrica(from)&&isAustralia(to))   add('AFR_E','IND_SW2','IND_S');
    if(isAustralia(from)&&isPacific(to))   add('CORAL','TASMAN','PAC_SW');
    if(isPacific(from)&&isAustralia(to))   add('PAC_SW','TASMAN','CORAL');
  }

  // ── Far East internal routing ─────────────────────────────────────────────
  if(!needsSuez&&!needsSuezRev&&!needsMalacca&&!needsMalaccaRev){
    if((isJapanKorea(from))&&isFarEast(to)&&!isJapanKorea(to)) add('EAST_CHINA');
    if((isJapanKorea(to))&&isFarEast(from)&&!isJapanKorea(from)) add('EAST_CHINA');
    const scsNeeded = (isSeAsia(from)&&(isFarEast(to)||isJapanKorea(to)))||
                      ((isFarEast(from)||isJapanKorea(from))&&isSeAsia(to));
    if(scsNeeded){
      if(isFarEast(to)||isJapanKorea(to)) add('S_CHINA_S','S_CHINA_N');
      else                                add('S_CHINA_N','S_CHINA_S');
    }
  }

  // ── Apply destination approach corridor ───────────────────────────────────
  // For destinations on India west coast coming from east, ensure route goes around tip
  const toExit = PORT_EXIT[to.id] || [];
  const approachFromEast = isSeAsia(from)||isFarEast(from)||isBayBengal(from)||isEastIndia(from);
  if(isWestIndia(to) && approachFromEast) {
    const already = wps.some(w => w.name && (w.name.includes('Dondra')||w.name.includes('Lanka')||w.name.includes('Mannar')));
    if(!already) {
      ['LANKA_SE','LANKA_S','LANKA_SW','PALK_W','IND_TIP','IND_TIP_W','IND_SW']
        .forEach(k => { if(SEA_WP[k]) wps.push({...SEA_WP[k]}); });
    }
  }

  // ── Build final point list with great-circle interpolation ────────────────
  const rawPoints = [
    {lat:from.lat, lon:from.lon, name:from.name},
    ...wps,
    {lat:to.lat,   lon:to.lon,   name:to.name},
  ];

  // Deduplicate consecutive near-identical points
  const deduped = rawPoints.filter((p,i) => {
    if(i===0) return true;
    const prev = rawPoints[i-1];
    return !(Math.abs(p.lat-prev.lat)<0.2 && Math.abs(p.lon-prev.lon)<0.2);
  });

  const allWPs = [];
  for(let i=0; i<deduped.length-1; i++){
    const a=deduped[i], b=deduped[i+1];
    const dist=haversine(a.lat,a.lon,b.lat,b.lon);
    // Finer interpolation for short segments to stay close to coast path
    const nPts=Math.max(2,Math.min(12,Math.floor(dist/200)));
    const seg=greatCircle(a.lat,a.lon,b.lat,b.lon,nPts);
    seg.forEach((pt,j) => {
      if(i>0&&j===0) return;
      allWPs.push({
        lat:Math.round(pt[0]*10000)/10000,
        lon:Math.round(pt[1]*10000)/10000,
        name:(j===0&&deduped[i].name)?deduped[i].name:undefined,
      });
    });
  }
  if(allWPs.length>0) allWPs[allWPs.length-1].name=to.name;
  return recalcWaypoints(allWPs);
}

// ─── RTZ PARSE / EXPORT ───────────────────────────────────────────────────────
function parseRTZ(xmlText) {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    const wps = xml.querySelectorAll('waypoint');
    const result = [];
    wps.forEach(wp => {
      const pos = wp.querySelector('position');
      if (pos) {
        result.push({
          lat: parseFloat(pos.getAttribute('lat') || 0),
          lon: parseFloat(pos.getAttribute('lon') || 0),
          name: wp.getAttribute('name') || undefined,
        });
      }
    });
    const routeInfo = xml.querySelector('routeInfo');
    const routeName = routeInfo?.getAttribute('routeName') || 'Loaded Route';
    return { waypoints: recalcWaypoints(result), name: routeName };
  } catch (e) {
    return null;
  }
}

function exportRTZ(routeName, waypoints) {
  const wpsXml = waypoints.map((wp, i) => `
    <waypoint id="${i+1}" name="WP${String(i+1).padStart(2,'0')}">
      <position lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}"/>
      <leg starboardXTD="0.1" portXTD="0.1" xtdUnit="NM"/>
    </waypoint>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<route version="1.0" xmlns="http://www.cirm.org/RTZ/1/0">
  <routeInfo routeName="${routeName}" vesselName="" vesselMMSI="" vesselIMO="" author="ECDIS Route Finder" status="1" routeStatusEnum="1"/>
  <waypoints>${wpsXml}
  </waypoints>
</route>`;
}

function exportCSV(waypoints) {
  const header = 'WP,Name,Latitude,Longitude,Bearing(°),Distance(NM),Total(NM)';
  const rows = waypoints.map((wp, i) =>
    `WP${String(i+1).padStart(2,'0')},${wp.name||''},${wp.lat.toFixed(6)},${wp.lon.toFixed(6)},${(wp.bearing||0).toFixed(1)},${(wp.distance||0).toFixed(1)},${(wp.totalNM||0).toFixed(1)}`
  );
  return [header, ...rows].join('\n');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── TIMEZONES ────────────────────────────────────────────────────────────────
const TIMEZONES = [
  { label:"UTC / GMT",            offset:0 },
  { label:"IST — India (UTC+5:30)",       offset:5.5 },
  { label:"GST — Gulf / UAE (UTC+4)",     offset:4 },
  { label:"PKT — Pakistan (UTC+5)",       offset:5 },
  { label:"SGT — Singapore (UTC+8)",      offset:8 },
  { label:"CST — China (UTC+8)",          offset:8 },
  { label:"JST — Japan (UTC+9)",          offset:9 },
  { label:"KST — Korea (UTC+9)",          offset:9 },
  { label:"EAT — E.Africa (UTC+3)",       offset:3 },
  { label:"CET — C.Europe (UTC+1)",       offset:1 },
  { label:"CEST — C.Europe Summer(UTC+2)",offset:2 },
  { label:"BST — UK Summer (UTC+1)",      offset:1 },
  { label:"EST — US East (UTC-5)",        offset:-5 },
  { label:"EDT — US East Summer (UTC-4)", offset:-4 },
  { label:"CST — US Central (UTC-6)",     offset:-6 },
  { label:"PST — US West (UTC-8)",        offset:-8 },
  { label:"WIB — W.Indonesia (UTC+7)",    offset:7 },
  { label:"IRST — Iran (UTC+3:30)",       offset:3.5 },
];

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 3600000);
}
function formatDateLocal(date, offsetHours) {
  const local = addHours(date, offsetHours);
  return local.toISOString().replace('T',' ').substring(0,16) + ` (UTC${offsetHours>=0?'+':''}${offsetHours})`;
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500;600&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  :root{
    --bg:#040C1A;--bg2:#071428;--card:#0B1D35;--card2:#0F2444;
    --border:#1A3A5C;--border2:#1E4570;--blue:#1565C0;--cyan:#00B4D8;
    --gold:#F0A500;--gold2:#D4900A;--green:#00C896;--red:#FF4757;
    --purple:#7C3AED;--text:#E2EBF8;--text2:#8A9BBF;--text3:#4A5F80;
    --glow:0 0 20px rgba(0,180,216,0.25);
  }
  body{font-family:'Exo 2',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
  .grid-bg{position:fixed;inset:0;z-index:0;pointer-events:none;
    background-image:linear-gradient(rgba(0,180,216,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,216,0.04) 1px,transparent 1px);
    background-size:60px 60px;animation:gm 20s linear infinite;}
  @keyframes gm{to{background-position:60px 60px;}}
  .app{position:relative;z-index:2;min-height:100vh;display:flex;flex-direction:column;}

  /* NAV */
  .nav{position:sticky;top:0;z-index:100;background:rgba(4,12,26,0.97);backdrop-filter:blur(20px);
    border-bottom:1px solid var(--border);padding:0 1.2rem;display:flex;align-items:center;
    justify-content:space-between;height:60px;box-shadow:0 4px 30px rgba(0,0,0,0.5);flex-shrink:0;}
  .nav-brand{display:flex;align-items:center;gap:9px;}
  .nav-logo{width:36px;height:36px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;
    box-shadow:0 0 14px rgba(0,180,216,0.4);flex-shrink:0;}
  .nav-title{font-family:'Orbitron',monospace;font-size:0.78rem;font-weight:700;letter-spacing:0.08em;}
  .nav-sub{font-size:0.56rem;color:var(--cyan);letter-spacing:0.14em;text-transform:uppercase;}
  .nav-tabs{display:flex;gap:2px;}
  .ntab{padding:7px 10px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.73rem;font-weight:500;cursor:pointer;border-radius:8px;transition:all 0.2s;
    display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap;}
  .ntab:hover{color:var(--text);background:rgba(255,255,255,0.05);}
  .ntab.active{color:var(--cyan);background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.2);}
  .ntab.gold.active{color:var(--gold);background:rgba(240,165,0,0.1);border:1px solid rgba(240,165,0,0.2);}
  .ntab.green.active{color:var(--green);background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.2);}
  .sd{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 7px var(--green);animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
  .burger{display:none;flex-direction:column;gap:4px;cursor:pointer;padding:8px;background:none;border:none;}
  .burger span{width:20px;height:2px;background:var(--text);border-radius:2px;}
  @media(max-width:800px){.nav-tabs{display:none;}.burger{display:flex;}}
  .mob-menu{display:none;position:fixed;top:60px;left:0;right:0;background:rgba(4,12,26,0.98);
    backdrop-filter:blur(20px);border-bottom:1px solid var(--border);z-index:99;padding:0.8rem;}
  .mob-menu.open{display:flex;flex-direction:column;gap:4px;}
  .mtab{padding:11px 14px;border:none;background:transparent;color:var(--text2);font-family:'Exo 2',sans-serif;
    font-size:0.86rem;cursor:pointer;border-radius:9px;text-align:left;transition:all 0.2s;display:flex;align-items:center;gap:9px;}
  .mtab:hover{background:rgba(255,255,255,0.05);color:var(--text);}
  .mtab.active{background:rgba(0,180,216,0.1);color:var(--cyan);}

  /* HERO */
  .hero{padding:2.5rem 1.2rem 1.5rem;text-align:center;}
  .hero-tag{display:inline-flex;align-items:center;gap:7px;padding:5px 13px;border-radius:100px;
    border:1px solid rgba(0,180,216,0.3);background:rgba(0,180,216,0.08);
    font-size:0.68rem;color:var(--cyan);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem;}
  .hero-title{font-family:'Orbitron',monospace;font-size:clamp(1.5rem,5vw,2.6rem);font-weight:900;
    line-height:1.1;letter-spacing:0.04em;margin-bottom:0.7rem;}
  .accent{color:var(--cyan);}
  .hero-desc{max-width:500px;margin:0 auto 1.8rem;color:var(--text2);font-size:0.88rem;line-height:1.7;font-weight:300;}

  /* SEARCH */
  .sw{max-width:640px;margin:0 auto;}
  .sb{background:var(--card);border:1px solid var(--border2);border-radius:15px;
    padding:1.2rem;box-shadow:0 20px 60px rgba(0,0,0,0.4),var(--glow);}
  .sr{display:flex;gap:8px;align-items:center;}
  .siw{flex:1;position:relative;}
  .si{width:100%;padding:12px 15px 12px 42px;background:var(--bg2);border:1.5px solid var(--border2);
    border-radius:10px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.9rem;outline:none;transition:all 0.25s;}
  .si::placeholder{color:var(--text3);}
  .si:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.12);}
  .si-ic{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:1rem;color:var(--text3);pointer-events:none;}
  .sbtn{padding:12px 18px;background:linear-gradient(135deg,var(--cyan),var(--blue));border:none;
    border-radius:10px;color:white;font-family:'Orbitron',monospace;font-size:0.7rem;font-weight:700;
    letter-spacing:0.1em;cursor:pointer;transition:all 0.2s;white-space:nowrap;box-shadow:0 4px 18px rgba(0,180,216,0.3);}
  .sbtn:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,180,216,0.45);}
  .sh{font-size:0.7rem;color:var(--text3);margin-top:8px;text-align:center;}
  .sh span{color:var(--cyan);}
  .ac{position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:60;
    background:var(--card2);border:1px solid var(--border2);border-radius:10px;
    overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.65);max-height:200px;overflow-y:auto;}
  .ac-item{padding:9px 13px;cursor:pointer;display:flex;align-items:center;gap:8px;
    transition:background 0.15s;font-size:0.84rem;border-bottom:1px solid rgba(255,255,255,0.04);}
  .ac-item:hover{background:rgba(0,180,216,0.1);}

  /* STATS */
  .stats{display:flex;justify-content:center;gap:2rem;margin-top:1.8rem;flex-wrap:wrap;}
  .sn{font-family:'Orbitron',monospace;font-size:1.4rem;font-weight:700;color:var(--cyan);}
  .sl{font-size:0.63rem;color:var(--text2);letter-spacing:0.1em;text-transform:uppercase;}

  /* SECTION */
  .section{padding:1.2rem;max-width:1100px;margin:0 auto;width:100%;}
  .sec-hdr{display:flex;align-items:center;justify-content:space-between;
    margin-bottom:1.1rem;padding-bottom:0.8rem;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px;}
  .sec-title{font-family:'Orbitron',monospace;font-size:0.9rem;font-weight:700;letter-spacing:0.08em;display:flex;align-items:center;gap:7px;}
  .badge{padding:3px 9px;border-radius:100px;background:rgba(0,180,216,0.12);border:1px solid rgba(0,180,216,0.25);color:var(--cyan);font-size:0.67rem;}
  .badge-gold{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.25);color:var(--gold);}
  .badge-green{background:rgba(0,200,150,0.12);border-color:rgba(0,200,150,0.25);color:var(--green);}

  /* BRAND GRID */
  .brand-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.7rem;margin-bottom:1.4rem;}
  .brand-card{background:var(--card);border:2px solid var(--border);border-radius:12px;padding:0.9rem;
    cursor:pointer;transition:all 0.2s;text-align:center;}
  .brand-card:hover,.brand-card.sel{transform:translateY(-3px);box-shadow:0 8px 25px rgba(0,0,0,0.4);}
  .brand-emoji{font-size:1.8rem;margin-bottom:5px;}
  .brand-name{font-family:'Orbitron',monospace;font-size:0.66rem;font-weight:700;margin-bottom:2px;}
  .brand-models{font-size:0.6rem;color:var(--text2);}
  .brand-count{font-size:0.65rem;margin-top:4px;font-weight:600;}

  /* FILE CARDS */
  .files-grid{display:grid;gap:0.9rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));}
  .file-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:1.1rem;transition:all 0.25s;}
  .file-card:hover{border-color:rgba(0,180,216,0.35);transform:translateY(-2px);box-shadow:0 10px 35px rgba(0,0,0,0.4),var(--glow);}
  .file-icon{font-size:1.8rem;margin-bottom:0.6rem;}
  .file-name{font-family:'Orbitron',monospace;font-size:0.7rem;font-weight:700;color:var(--cyan);margin-bottom:4px;word-break:break-all;}
  .file-port{font-size:0.78rem;color:var(--text2);margin-bottom:0.8rem;}
  .file-tags{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:0.8rem;}
  .ftag{padding:2px 7px;border-radius:5px;font-size:0.62rem;font-weight:500;}
  .tag-rtz{background:rgba(0,180,216,0.1);color:var(--cyan);border:1px solid rgba(0,180,216,0.2);}
  .tag-chart{background:rgba(240,165,0,0.1);color:var(--gold);border:1px solid rgba(240,165,0,0.2);}
  .tag-brand{background:rgba(124,58,237,0.12);color:#A78BFA;border:1px solid rgba(124,58,237,0.2);}
  .dl-btn{width:100%;padding:10px;background:linear-gradient(135deg,var(--gold),var(--gold2));
    border:none;border-radius:9px;color:#000;font-family:'Exo 2',sans-serif;font-size:0.8rem;
    font-weight:700;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
  .dl-btn:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(240,165,0,0.4);}
  .dl-btn:disabled{opacity:0.35;cursor:not-allowed;transform:none;background:var(--border2);color:var(--text3);}
  .login-req{width:100%;padding:10px;background:transparent;border:1px solid rgba(240,165,0,0.3);
    border-radius:9px;color:var(--gold);font-family:'Exo 2',sans-serif;font-size:0.78rem;
    font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:6px;}
  .login-req:hover{background:rgba(240,165,0,0.08);}

  /* FILTER */
  .fbar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:1rem;}
  .fbtn{padding:5px 11px;border-radius:100px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.7rem;cursor:pointer;transition:all 0.2s;text-transform:uppercase;}
  .fbtn:hover{border-color:var(--cyan);color:var(--cyan);}
  .fbtn.active{background:rgba(0,180,216,0.12);border-color:rgba(0,180,216,0.4);color:var(--cyan);}
  .fbtn.gold:hover{border-color:var(--gold);color:var(--gold);}
  .fbtn.gold.active{background:rgba(240,165,0,0.12);border-color:rgba(240,165,0,0.4);color:var(--gold);}

  /* BUTTONS */
  .btn{padding:8px 13px;border-radius:9px;font-family:'Exo 2',sans-serif;font-size:0.76rem;
    font-weight:600;cursor:pointer;transition:all 0.2s;border:none;display:inline-flex;align-items:center;gap:5px;}
  .btn-primary{background:linear-gradient(135deg,var(--cyan),var(--blue));color:white;}
  .btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,180,216,0.4);}
  .btn-danger{background:var(--red);color:white;}
  .btn-danger:hover{opacity:0.85;}
  .btn-secondary{background:transparent;border:1px solid var(--border2);color:var(--text2);}
  .btn-secondary:hover{border-color:var(--cyan);color:var(--cyan);}
  .btn-gold{background:linear-gradient(135deg,var(--gold),var(--gold2));color:#000;font-weight:700;}
  .btn-green{background:linear-gradient(135deg,var(--green),#00a87a);color:#000;font-weight:700;}
  .btn:disabled{opacity:0.45;cursor:not-allowed;}

  /* FORMS */
  .ff{margin-bottom:1rem;}
  .fl{display:block;font-size:0.7rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;}
  .fi{width:100%;padding:10px 13px;background:var(--bg2);border:1px solid var(--border2);
    border-radius:9px;color:var(--text);font-family:'Exo 2',sans-serif;font-size:0.86rem;outline:none;transition:all 0.2s;}
  .fi:focus{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(0,180,216,0.1);}
  .fi::placeholder{color:var(--text3);}
  select.fi{cursor:pointer;}
  textarea.fi{resize:vertical;min-height:70px;}

  /* ROUTE PLANNER */
  .planner-layout{display:flex;gap:0;flex:1;min-height:0;}
  .planner-sidebar{width:320px;flex-shrink:0;background:var(--card);border-right:1px solid var(--border);
    display:flex;flex-direction:column;overflow-y:auto;}
  @media(max-width:800px){.planner-layout{flex-direction:column;}.planner-sidebar{width:100%;max-height:50vh;}}
  .planner-map{flex:1;min-height:400px;position:relative;}
  .p-tabs{display:flex;border-bottom:1px solid var(--border);}
  .p-tab{flex:1;padding:10px 6px;border:none;background:transparent;color:var(--text2);
    font-family:'Exo 2',sans-serif;font-size:0.72rem;cursor:pointer;transition:all 0.2s;text-align:center;
    text-transform:uppercase;letter-spacing:0.06em;}
  .p-tab:hover{color:var(--text);}
  .p-tab.active{color:var(--cyan);border-bottom:2px solid var(--cyan);}
  .p-panel{padding:1rem;flex:1;}
  .p-section{margin-bottom:1.2rem;}
  .p-label{font-size:0.65rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;display:block;}
  .overlay-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:0.8rem;}
  .ov-btn{padding:6px 8px;border-radius:8px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.68rem;cursor:pointer;transition:all 0.2s;text-align:center;}
  .ov-btn.active{border-color:currentColor;}
  .map-legend{position:absolute;bottom:10px;right:10px;background:rgba(4,12,26,0.9);
    border:1px solid var(--border);border-radius:10px;padding:8px 10px;z-index:400;font-size:0.68rem;}
  .leg-item{display:flex;align-items:center;gap:6px;margin-bottom:3px;}
  .leg-dot{width:10px;height:10px;border-radius:2px;flex-shrink:0;}
  .map-controls{position:absolute;top:10px;right:10px;z-index:400;display:flex;flex-direction:column;gap:5px;}
  .map-ctrl-btn{padding:6px 10px;background:rgba(4,12,26,0.9);border:1px solid var(--border);
    border-radius:8px;color:var(--text);font-size:0.72rem;cursor:pointer;transition:all 0.2s;white-space:nowrap;}
  .map-ctrl-btn:hover{border-color:var(--cyan);color:var(--cyan);}
  .map-ctrl-btn.playing{border-color:var(--green);color:var(--green);}
  .wp-table{width:100%;border-collapse:collapse;font-size:0.72rem;}
  .wp-table th{padding:5px 7px;text-align:left;color:var(--text3);font-size:0.62rem;text-transform:uppercase;border-bottom:1px solid var(--border);}
  .wp-table td{padding:5px 7px;border-bottom:1px solid rgba(255,255,255,0.04);}
  .wp-table tbody tr:hover{background:rgba(255,255,255,0.03);}

  /* ETA CALC */
  .eta-result{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:12px;margin-top:10px;}
  .eta-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.8rem;}
  .eta-row:last-child{border-bottom:none;}
  .eta-key{color:var(--text2);font-size:0.74rem;}
  .eta-val{font-family:'Orbitron',monospace;font-size:0.78rem;color:var(--cyan);}
  .eta-val.gold{color:var(--gold);}
  .eta-val.green{color:var(--green);}
  .eta-mode-tabs{display:flex;gap:4px;margin-bottom:1rem;}
  .emt{flex:1;padding:7px 4px;border-radius:8px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.65rem;cursor:pointer;transition:all 0.2s;text-align:center;text-transform:uppercase;}
  .emt.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}

  /* AUTH */
  .auth-wrap{min-height:80vh;display:flex;align-items:center;justify-content:center;padding:2rem;}
  .auth-card{background:var(--card);border:1px solid var(--border);border-radius:18px;
    padding:2.2rem;width:100%;max-width:400px;box-shadow:0 30px 80px rgba(0,0,0,0.6);}
  .auth-logo{text-align:center;margin-bottom:1.6rem;}
  .auth-icon{width:58px;height:58px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border-radius:15px;margin:0 auto 0.7rem;display:flex;align-items:center;justify-content:center;
    font-size:1.7rem;box-shadow:0 0 26px rgba(0,180,216,0.4);}
  .auth-title{font-family:'Orbitron',monospace;font-size:1rem;font-weight:700;margin-bottom:3px;}
  .auth-sub{color:var(--text2);font-size:0.76rem;}
  .auth-tabs{display:flex;gap:5px;margin-bottom:1.4rem;}
  .atab{flex:1;padding:8px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-family:'Exo 2',sans-serif;font-size:0.78rem;cursor:pointer;
    border-radius:8px;transition:all 0.2s;text-align:center;}
  .atab.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}
  .err-box{color:var(--red);font-size:0.77rem;margin-top:7px;text-align:center;
    background:rgba(255,71,87,0.08);padding:7px;border-radius:8px;border:1px solid rgba(255,71,87,0.2);}
  .ok-box{color:var(--green);font-size:0.77rem;margin-top:7px;text-align:center;
    background:rgba(0,200,150,0.08);padding:7px;border-radius:8px;border:1px solid rgba(0,200,150,0.2);}
  .submit-btn{width:100%;padding:13px;background:linear-gradient(135deg,var(--cyan),var(--blue));
    border:none;border-radius:10px;color:white;font-family:'Orbitron',monospace;
    font-size:0.78rem;font-weight:700;letter-spacing:0.1em;cursor:pointer;margin-top:0.8rem;
    transition:all 0.25s;box-shadow:0 4px 18px rgba(0,180,216,0.3);}
  .submit-btn:hover{transform:translateY(-2px);}
  .submit-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
  .link-txt{font-size:0.72rem;color:var(--text3);text-align:center;margin-top:9px;cursor:pointer;}
  .link-txt:hover{color:var(--cyan);}

  /* ADMIN */
  .adm-layout{display:grid;grid-template-columns:195px 1fr;min-height:calc(100vh - 60px);}
  @media(max-width:720px){.adm-layout{grid-template-columns:1fr;}.adm-sidebar{display:none;}}
  .adm-sidebar{background:var(--card);border-right:1px solid var(--border);padding:1.1rem 0.8rem;}
  .s-label{font-size:0.6rem;color:var(--text3);text-transform:uppercase;letter-spacing:0.15em;margin-bottom:6px;padding:0 7px;}
  .s-item{display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:9px;cursor:pointer;
    transition:all 0.15s;color:var(--text2);font-size:0.8rem;margin-bottom:2px;}
  .s-item:hover{background:rgba(255,255,255,0.04);color:var(--text);}
  .s-item.active{background:rgba(0,180,216,0.1);color:var(--cyan);}
  .adm-mob-tabs{display:none;}
  @media(max-width:720px){.adm-mob-tabs{display:flex;gap:5px;flex-wrap:wrap;padding:0.8rem 1.2rem 0;}}
  .amtab{padding:6px 10px;border-radius:100px;border:1px solid var(--border);background:transparent;
    color:var(--text2);font-size:0.7rem;cursor:pointer;transition:all 0.2s;}
  .amtab.active{background:rgba(0,180,216,0.1);border-color:rgba(0,180,216,0.3);color:var(--cyan);}
  .adm-content{padding:1.2rem;overflow-y:auto;}
  .a-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;flex-wrap:wrap;gap:8px;}
  .a-title{font-family:'Orbitron',monospace;font-size:0.9rem;font-weight:700;}
  .tw{overflow-x:auto;}
  .tbl{width:100%;border-collapse:collapse;}
  .tbl thead tr{border-bottom:2px solid var(--border);}
  .tbl th{padding:7px 10px;text-align:left;font-size:0.63rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;font-weight:600;}
  .tbl td{padding:9px 10px;font-size:0.79rem;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle;}
  .tbl tbody tr:hover{background:rgba(255,255,255,0.02);}
  .info-box{background:rgba(0,180,216,0.05);border:1px solid rgba(0,180,216,0.15);border-radius:10px;padding:10px 13px;font-size:0.77rem;color:var(--text2);margin-bottom:1rem;}
  .warn-box{background:rgba(240,165,0,0.06);border:1px solid rgba(240,165,0,0.18);border-radius:10px;padding:10px 13px;font-size:0.77rem;color:var(--gold);margin-bottom:1rem;}

  /* MISC */
  .notif{position:fixed;bottom:1.5rem;right:1.5rem;z-index:1000;padding:10px 16px;border-radius:11px;
    display:flex;align-items:center;gap:8px;font-size:0.82rem;font-weight:500;
    box-shadow:0 8px 28px rgba(0,0,0,0.5);animation:si 0.3s ease;max-width:90vw;}
  .notif-success{background:rgba(0,200,150,0.15);border:1px solid rgba(0,200,150,0.3);color:var(--green);}
  .notif-info{background:rgba(0,180,216,0.15);border:1px solid rgba(0,180,216,0.3);color:var(--cyan);}
  .notif-error{background:rgba(255,71,87,0.15);border:1px solid rgba(255,71,87,0.3);color:var(--red);}
  @keyframes si{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
  .empty{text-align:center;padding:2.5rem 1.5rem;color:var(--text2);}
  .empty-icon{font-size:2.5rem;margin-bottom:0.7rem;opacity:0.4;}
  .empty-t{font-family:'Orbitron',monospace;font-size:0.88rem;margin-bottom:0.4rem;color:var(--text);}
  .empty-d{font-size:0.78rem;}
  .loading{display:flex;align-items:center;justify-content:center;padding:3rem;gap:10px;color:var(--text2);font-size:0.88rem;}
  .spin{width:22px;height:22px;border:2px solid var(--border2);border-top-color:var(--cyan);border-radius:50%;animation:sp 0.8s linear infinite;}
  @keyframes sp{to{transform:rotate(360deg);}}
  .uc{display:flex;align-items:center;gap:6px;font-size:0.71rem;color:var(--text2);
    background:var(--card);border:1px solid var(--border);border-radius:100px;padding:4px 10px;cursor:pointer;}
  .uc:hover{border-color:var(--red);color:var(--red);}

  /* FOOTER */
  .footer{background:var(--card);border-top:1px solid var(--border);padding:1.2rem 1.5rem;
    display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;flex-shrink:0;}
  .footer-brand{font-family:'Orbitron',monospace;font-size:0.72rem;color:var(--text2);}
  .footer-brand span{color:var(--cyan);}
  .ig-btn{display:flex;align-items:center;gap:8px;padding:7px 14px;
    background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);
    border:none;border-radius:100px;color:white;font-family:'Exo 2',sans-serif;
    font-size:0.78rem;font-weight:600;cursor:pointer;transition:all 0.2s;text-decoration:none;}
  .ig-btn:hover{transform:scale(1.04);box-shadow:0 4px 15px rgba(253,29,29,0.4);}
  .footer-copy{font-size:0.66rem;color:var(--text3);}

  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-track{background:var(--bg);}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
  .leaflet-container{background:#040C1A !important;}
  .leaflet-popup-content-wrapper{background:#0B1D35;border:1px solid #1A3A5C;color:#E2EBF8;border-radius:10px;}
  .leaflet-popup-tip{background:#0B1D35;}
`;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function Notif({msg,type,onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[]);
  return<div className={`notif notif-${type}`}>{type==="success"?"✅":type==="error"?"❌":"ℹ️"} {msg}</div>;
}

function Footer(){
  return(
    <footer className="footer">
      <div>
        <div className="footer-brand">Owner: <span>Manish Bharti</span></div>
        <div className="footer-copy">© 2024 ECDIS Route Finder · Maritime Navigation System</div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontSize:"0.74rem",color:"var(--text2)"}}>Follow for more maritime updates:</span>
        <a className="ig-btn" href="https://instagram.com/manish_the_navigator" target="_blank" rel="noreferrer">
          📷 @manish_the_navigator
        </a>
      </div>
    </footer>
  );
}

function smartMatch(file,q){
  if(!q.trim())return true;
  const ql=q.toLowerCase().trim();
  return[file.fileName,file.portName,file.keywords,file.brand,file.type,file.region,file.description]
    .filter(Boolean).map(s=>s.toLowerCase()).some(t=>t.includes(ql));
}

// ─── NORMALIZE GOOGLE SHEET ROW → STANDARD FILE OBJECT ───────────────────────
function normalizeSheetRow(row, idx, tag){
  const pick=(...keys)=>{
    for(const k of keys){
      const col=Object.keys(row).find(c=>c.toLowerCase().replace(/[\s_\-]/g,'').includes(k.toLowerCase().replace(/[\s_\-]/g,'')));
      if(col&&row[col]?.trim()) return row[col].trim();
    }
    return '';
  };
  const fileName   = pick('filename','name','routename','file','title')   || Object.values(row)[0]||'';
  const fileUrl    = pick('fileurl','downloadurl','drivelink','googlelink','link','url','download') || '';
  const portName   = pick('portname','port','route','routedesc','description','from','departure','ports') || '';
  const keywords   = pick('keywords','keyword','tags','search')            || '';
  const type       = pick('type','routetype','category')                  || '';
  const brand      = pick('brand','ecdisbrand','manufacturer','make')     || '';
  const model      = pick('model','ecdismodel','version','series')        || '';
  const region     = pick('region','area','sea','ocean','zone')           || '';
  const allKw=[fileName,portName,keywords,type,brand,model,region].filter(Boolean).join(' ').toLowerCase();
  return{id:`${tag}-${idx}`,fileName,fileUrl,portName,keywords:allKw,type,brand,model,region,source:'sheet'};
}

// ─── MAP VIEW ─────────────────────────────────────────────────────────────────
function MapView({waypoints,setWaypoints,overlays,playing,setPlaying,speed,onMapClick,mapMode}){
  const containerRef=useRef(null);
  const mapRef=useRef(null);
  const layersRef=useRef({route:null,markers:[],zones:{},ship:null,trail:null,baseTile:null,seamarkTile:null});
  const animRef=useRef(null);
  const animIdxRef=useRef(0);
  const animPtsRef=useRef([]);
  const [ready,setReady]=useState(false);

  const MAP_TILES={
    night:{url:'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',attr:'© OpenStreetMap © CARTO'},
    day:  {url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',attr:'© OpenStreetMap © CARTO'},
    dusk: {url:'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',attr:'© OpenStreetMap © CARTO',filter:'sepia(40%) saturate(70%) brightness(70%)'},
  };

  // Swap base tile when mapMode changes
  useEffect(()=>{
    if(!ready||!window.L||!mapRef.current)return;
    const L=window.L;const map=mapRef.current;const lrs=layersRef.current;
    if(lrs.baseTile){lrs.baseTile.remove();}
    const cfg=MAP_TILES[mapMode]||MAP_TILES.night;
    lrs.baseTile=L.tileLayer(cfg.url,{attribution:cfg.attr,subdomains:'abcd',maxZoom:19}).addTo(map);
    // Re-add seamark on top
    if(lrs.seamarkTile){lrs.seamarkTile.remove();}
    lrs.seamarkTile=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18}).addTo(map);
    // Apply CSS filter for dusk
    if(containerRef.current){
      containerRef.current.style.filter=cfg.filter||'none';
    }
  },[mapMode,ready]);

  const initMap=()=>{
    if(mapRef.current||!containerRef.current)return;
    const L=window.L;
    mapRef.current=L.map(containerRef.current,{center:[15,70],zoom:3,preferCanvas:true,zoomControl:true});
    layersRef.current.baseTile=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
      attribution:'© OpenStreetMap © CARTO',subdomains:'abcd',maxZoom:19
    }).addTo(mapRef.current);
    layersRef.current.seamarkTile=L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',{opacity:0.55,maxZoom:18}).addTo(mapRef.current);
    mapRef.current.on('click',e=>{onMapClick&&onMapClick(e.latlng.lat,e.latlng.lng);});
    setReady(true);
  };

  useEffect(()=>{
    if(window.L){initMap();return;}
    if(!document.getElementById('lcss')){
      const c=document.createElement('link');c.id='lcss';c.rel='stylesheet';
      c.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(c);
    }
    if(!document.getElementById('ljs')){
      const s=document.createElement('script');s.id='ljs';
      s.src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload=initMap;document.head.appendChild(s);
    } else { window.L&&initMap(); }
    return()=>{
      if(animRef.current)clearInterval(animRef.current);
      if(mapRef.current){mapRef.current.remove();mapRef.current=null;}
    };
  },[]);

  // Update route on map
  useEffect(()=>{
    if(!ready||!window.L)return;
    const L=window.L;const map=mapRef.current;const lrs=layersRef.current;
    if(lrs.route){lrs.route.remove();lrs.route=null;}
    lrs.markers.forEach(m=>m.remove());lrs.markers=[];
    if(lrs.ship){lrs.ship.remove();lrs.ship=null;}
    if(waypoints.length===0)return;
    const latlngs=waypoints.map(w=>[w.lat,w.lon]);
    lrs.route=L.polyline(latlngs,{color:'#00B4D8',weight:2.5,opacity:0.9,dashArray:'8 4'}).addTo(map);

    waypoints.forEach((wp,i)=>{
      const isFirst=i===0,isLast=i===waypoints.length-1;
      const color=isFirst?'#00C896':isLast?'#FF4757':'#00B4D8';
      const size=isFirst||isLast?14:9;
      const icon=L.divIcon({
        html:`<div style="background:${color};border:2px solid #fff;border-radius:50%;width:${size}px;height:${size}px;cursor:pointer;" title="WP${String(i+1).padStart(2,'0')}"></div>`,
        className:'',iconSize:[size,size],iconAnchor:[size/2,size/2]
      });
      const m=L.marker([wp.lat,wp.lon],{icon,draggable:true,zIndexOffset:i===0||i===waypoints.length-1?100:0});
      const popupHtml=`<div style="font-size:12px;min-width:130px;">
        <b style="color:#00B4D8">WP${String(i+1).padStart(2,'0')}${wp.name?` — ${wp.name}`:''}</b><br/>
        Lat: ${wp.lat.toFixed(5)}°<br/>Lon: ${wp.lon.toFixed(5)}°
        ${i>0?`<br/>Course: ${(wp.bearing||0).toFixed(1)}°<br/>Leg: ${(wp.distance||0).toFixed(1)} NM`:''}
        ${wp.totalNM?`<br/>Total: ${wp.totalNM.toFixed(1)} NM`:''}
      </div>`;
      m.bindPopup(popupHtml);
      m.on('dragend',e=>{
        const{lat,lng}=e.target.getLatLng();
        setWaypoints(wps=>{const u=[...wps];u[i]={...u[i],lat,lon:lng};return recalcWaypoints(u);});
      });
      m.addTo(map);lrs.markers.push(m);
    });
    if(waypoints.length>1)map.fitBounds(lrs.route.getBounds(),{padding:[50,50]});
    // Build animation points
    const pts=[];
    for(let i=0;i<waypoints.length-1;i++){
      const seg=greatCircle(waypoints[i].lat,waypoints[i].lon,waypoints[i+1].lat,waypoints[i+1].lon,30);
      pts.push(...(i>0?seg.slice(1):seg));
    }
    animPtsRef.current=pts;
    animIdxRef.current=0;
  },[waypoints,ready]);

  // Overlays
  useEffect(()=>{
    if(!ready||!window.L)return;
    const L=window.L;const map=mapRef.current;const lrs=layersRef.current;
    Object.values(lrs.zones).forEach(l=>l.remove());lrs.zones={};
    const cfg={
      eca:{zones:ECA_ZONES,color:'#FF6B35',label:'ECA Area'},
      seca:{zones:SECA_ZONES,color:'#FFB347',label:'SECA Area'},
      marpol:{zones:MARPOL_ZONES,color:'#9B59B6',label:'MARPOL Area'},
      piracy:{zones:PIRACY_ZONES,color:'#E74C3C',label:'Piracy Area'},
      layover:{zones:LAYOVER_ZONES,color:'#3498DB',label:'Anchorage'},
    };
    Object.entries(cfg).forEach(([k,c])=>{
      if(!overlays[k])return;
      const lg=L.layerGroup();
      c.zones.forEach(z=>{
        L.polygon(z.coords.map(p=>Array.isArray(p)?p:[p[0],p[1]]),
          {color:c.color,fillColor:c.color,fillOpacity:0.18,weight:1.5,opacity:0.8})
          .bindPopup(`<b>${z.name}</b><br/>${c.label}`)
          .addTo(lg);
      });
      lg.addTo(map);lrs.zones[k]=lg;
    });
  },[overlays,ready]);

  // Animation
  useEffect(()=>{
    if(!ready||!window.L)return;
    if(animRef.current){clearInterval(animRef.current);animRef.current=null;}
    if(!playing){if(layersRef.current.ship){layersRef.current.ship.remove();layersRef.current.ship=null;}animIdxRef.current=0;return;}
    const L=window.L;const map=mapRef.current;const pts=animPtsRef.current;
    if(pts.length<2)return;
    const shipIcon=L.divIcon({html:`<div style="font-size:22px;line-height:1;">🚢</div>`,className:'',iconSize:[24,24],iconAnchor:[12,12]});
    if(!layersRef.current.ship)layersRef.current.ship=L.marker(pts[0],{icon:shipIcon,zIndexOffset:500}).addTo(map);
    let idx=animIdxRef.current;
    const ms=Math.max(30,1500/Math.max(1,speed));
    animRef.current=setInterval(()=>{
      if(idx>=pts.length){clearInterval(animRef.current);setPlaying(false);animIdxRef.current=0;return;}
      layersRef.current.ship&&layersRef.current.ship.setLatLng(pts[idx]);
      idx++;animIdxRef.current=idx;
    },ms);
    return()=>{if(animRef.current)clearInterval(animRef.current);};
  },[playing,speed,ready]);

  const activeOverlays=Object.entries(overlays).filter(([,v])=>v);
  const legendColors={eca:'#FF6B35',seca:'#FFB347',marpol:'#9B59B6',piracy:'#E74C3C',layover:'#3498DB'};
  const legendNames={eca:'ECA',seca:'SECA',marpol:'MARPOL',piracy:'Piracy',layover:'Anchorage'};

  return(
    <div className="planner-map">
      <div ref={containerRef} style={{width:'100%',height:'100%',minHeight:400}}/>
      {!ready&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg2)',zIndex:10}}>
        <div className="loading"><div className="spin"/><span>Loading nautical map…</span></div>
      </div>}
      {activeOverlays.length>0&&(
        <div className="map-legend">
          {activeOverlays.map(([k])=>(
            <div key={k} className="leg-item">
              <div className="leg-dot" style={{background:legendColors[k]}}/>
              <span style={{color:'var(--text2)'}}>{legendNames[k]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ETA CALCULATOR ───────────────────────────────────────────────────────────
function ETACalculator({totalNM}){
  const [mode,setMode]=useState('speed');
  const [speed,setSpeed]=useState('');
  const [depDate,setDepDate]=useState('');
  const [depTZ,setDepTZ]=useState('0');
  const [arrDate,setArrDate]=useState('');
  const [arrTZ,setArrTZ]=useState('0');
  const [extraHours,setExtraHours]=useState('0');
  const [distance,setDistance]=useState(totalNM?totalNM.toFixed(1):'');
  useEffect(()=>{if(totalNM>0)setDistance(totalNM.toFixed(1));},[totalNM]);

  const calc=useMemo(()=>{
    const D=parseFloat(distance)||0;
    const sp=parseFloat(speed)||0;
    const extra=parseFloat(extraHours)||0;
    const depOffset=parseFloat(depTZ)||0;
    const arrOffset=parseFloat(arrTZ)||0;

    if(mode==='speed'&&sp>0&&D>0&&depDate){
      const sailHrs=D/sp;const totalHrs=sailHrs+extra;
      const depUTC=addHours(new Date(depDate),-depOffset);
      const arrUTC=addHours(depUTC,totalHrs);
      return{
        sailingTime:`${Math.floor(sailHrs/24)}d ${Math.floor(sailHrs%24)}h ${Math.round((sailHrs%1)*60)}m`,
        totalTime:`${Math.floor(totalHrs/24)}d ${Math.floor(totalHrs%24)}h`,
        etaLocal:formatDateLocal(arrUTC,arrOffset),
        etaUTC:arrUTC.toISOString().replace('T',' ').substring(0,16)+' UTC',
        depUTC:depUTC.toISOString().replace('T',' ').substring(0,16)+' UTC',
        speedKt:sp.toFixed(1),
      };
    }
    if(mode==='arrival'&&depDate&&arrDate&&D>0){
      const depOffset2=parseFloat(depTZ)||0;const arrOffset2=parseFloat(arrTZ)||0;
      const depUTC=addHours(new Date(depDate),-depOffset2);
      const arrUTC=addHours(new Date(arrDate),-arrOffset2);
      const diffHrs=(arrUTC-depUTC)/3600000-extra;
      const reqSpeed=D/Math.max(0.1,diffHrs);
      return{
        requiredSpeed:`${reqSpeed.toFixed(2)} knots`,
        totalTime:`${Math.floor(diffHrs/24)}d ${Math.floor(diffHrs%24)}h`,
        feasible:reqSpeed<25?'✅ Feasible':'⚠️ Check vessel max speed',
        depUTC:depUTC.toISOString().replace('T',' ').substring(0,16)+' UTC',
        etaUTC:arrUTC.toISOString().replace('T',' ').substring(0,16)+' UTC',
      };
    }
    return null;
  },[mode,speed,depDate,depTZ,arrDate,arrTZ,extraHours,distance]);

  return(
    <div>
      <div className="eta-mode-tabs">
        {[['speed','Speed → ETA'],['arrival','Arrival → Speed']].map(([k,l])=>(
          <button key={k} className={`emt ${mode===k?'active':''}`} onClick={()=>setMode(k)}>{l}</button>
        ))}
      </div>

      <div className="ff">
        <label className="fl">📏 Total Distance (NM)</label>
        <input className="fi" type="number" placeholder="Auto-filled from route" value={distance} onChange={e=>setDistance(e.target.value)}/>
      </div>
      <div className="ff">
        <label className="fl">🕐 Port Stay / Waiting (hours)</label>
        <input className="fi" type="number" placeholder="0" value={extraHours} onChange={e=>setExtraHours(e.target.value)}/>
      </div>

      {mode==='speed'&&(
        <div className="ff">
          <label className="fl">⚡ Ship Speed (knots)</label>
          <input className="fi" type="number" placeholder="e.g. 14.5" value={speed} onChange={e=>setSpeed(e.target.value)}/>
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        <div className="ff">
          <label className="fl">🛳 Departure Date/Time</label>
          <input className="fi" type="datetime-local" value={depDate} onChange={e=>setDepDate(e.target.value)}/>
        </div>
        <div className="ff">
          <label className="fl">🌍 Departure Timezone</label>
          <select className="fi" value={depTZ} onChange={e=>setDepTZ(e.target.value)}>
            {TIMEZONES.map(tz=><option key={tz.label} value={tz.offset}>{tz.label}</option>)}
          </select>
        </div>
      </div>

      {mode==='arrival'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          <div className="ff">
            <label className="fl">🏁 Required Arrival</label>
            <input className="fi" type="datetime-local" value={arrDate} onChange={e=>setArrDate(e.target.value)}/>
          </div>
          <div className="ff">
            <label className="fl">🌍 Arrival Timezone</label>
            <select className="fi" value={arrTZ} onChange={e=>setArrTZ(e.target.value)}>
              {TIMEZONES.map(tz=><option key={tz.label} value={tz.offset}>{tz.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {calc&&(
        <div className="eta-result">
          {mode==='speed'&&<>
            <div className="eta-row"><span className="eta-key">Speed</span><span className="eta-val">{calc.speedKt} kn</span></div>
            <div className="eta-row"><span className="eta-key">Sailing Time</span><span className="eta-val gold">{calc.sailingTime}</span></div>
            <div className="eta-row"><span className="eta-key">Total Voyage</span><span className="eta-val gold">{calc.totalTime}</span></div>
            <div className="eta-row"><span className="eta-key">Dep (UTC)</span><span className="eta-val" style={{fontSize:'0.72rem'}}>{calc.depUTC}</span></div>
            <div className="eta-row"><span className="eta-key">ETA (UTC)</span><span className="eta-val" style={{fontSize:'0.72rem'}}>{calc.etaUTC}</span></div>
            <div className="eta-row"><span className="eta-key">ETA Local</span><span className="eta-val green" style={{fontSize:'0.72rem'}}>{calc.etaLocal}</span></div>
          </>}
          {mode==='arrival'&&<>
            <div className="eta-row"><span className="eta-key">Required Speed</span><span className="eta-val gold">{calc.requiredSpeed}</span></div>
            <div className="eta-row"><span className="eta-key">Total Time</span><span className="eta-val">{calc.totalTime}</span></div>
            <div className="eta-row"><span className="eta-key">Feasibility</span><span className="eta-val green" style={{fontSize:'0.76rem'}}>{calc.feasible}</span></div>
            <div className="eta-row"><span className="eta-key">Dep UTC</span><span className="eta-val" style={{fontSize:'0.72rem'}}>{calc.depUTC}</span></div>
            <div className="eta-row"><span className="eta-key">Arr UTC</span><span className="eta-val" style={{fontSize:'0.72rem'}}>{calc.etaUTC}</span></div>
          </>}
        </div>
      )}
    </div>
  );
}

// ─── ROUTE PLANNER PAGE ───────────────────────────────────────────────────────
function RoutePlannerPage({notify,sheetRoutes=[]}){
  const [panel,setPanel]=useState('auto');
  const [fromPort,setFromPort]=useState('');
  const [toPort,setToPort]=useState('');
  const [fromSugg,setFromSugg]=useState([]);
  const [toSugg,setToSugg]=useState([]);
  const [waypoints,setWaypoints]=useState([]);
  const [routeName,setRouteName]=useState('My Route');
  const [playing,setPlaying]=useState(false);
  const [speed,setSpeed]=useState(5);
  const [clickAdd,setClickAdd]=useState(false);
  const [overlays,setOverlays]=useState({eca:false,seca:false,marpol:false,piracy:false,layover:false});
  const [mapMode,setMapMode]=useState('night');
  const totalNM=useMemo(()=>totalRouteNM(waypoints),[waypoints]);

  const searchPort=(q,setSugg)=>{
    if(!q||q.trim().length<2){setSugg([]);return;}
    const ql=q.toLowerCase().trim();
    setSugg(PORTS_DB.filter(p=>{
      const kw=(p.keywords||[p.name,p.city,p.country,p.id].filter(Boolean).join(' ')).toLowerCase();
      return p.name?.toLowerCase().includes(ql)||
             p.city?.toLowerCase().includes(ql)||
             p.id?.toLowerCase().includes(ql)||
             p.country?.toLowerCase().includes(ql)||
             kw.includes(ql);
    }).slice(0,8));
  };

  useEffect(()=>searchPort(fromPort,setFromSugg),[fromPort]);
  useEffect(()=>searchPort(toPort,setToSugg),[toPort]);

  const [dbSuggestions,setDbSuggestions]=useState([]);
  const [showDbSugg,setShowDbSugg]=useState(false);

  // Search ECDIS route sheet for matching routes
  const searchEcdisRoutes=(dep,arr)=>{
    if(!dep&&!arr) return [];
    const ql=(dep+' '+arr).toLowerCase().trim();
    return sheetRoutes.filter(r=>{
      const hay=[r.fileName,r.portName,r.keywords,r.fileUrl,
                 r['Route Name'],r['Port Name'],r['File Name'],r['Keywords'],
                 Object.values(r).join(' ')].filter(Boolean).join(' ').toLowerCase();
      // Match if both port names appear in the route record
      const depMatch=dep.length>1&&hay.includes(dep.toLowerCase().substring(0,4));
      const arrMatch=arr.length>1&&hay.includes(arr.toLowerCase().substring(0,4));
      return depMatch||arrMatch||hay.includes(ql.substring(0,6));
    }).slice(0,6);
  };

  const generateRoute=()=>{
    const f=PORTS_DB.find(p=>p.name.toLowerCase()===fromPort.toLowerCase()||p.id.toLowerCase()===fromPort.toLowerCase());
    const t=PORTS_DB.find(p=>p.name.toLowerCase()===toPort.toLowerCase()||p.id.toLowerCase()===toPort.toLowerCase());
    if(!f||!t){notify('Select valid departure and arrival ports from suggestions','error');return;}

    // 1. Check ECDIS route sheet database FIRST
    const dbMatches=searchEcdisRoutes(f.name,t.name);
    if(dbMatches.length>0){
      setDbSuggestions(dbMatches);
      setShowDbSugg(true);
      notify(`Found ${dbMatches.length} route${dbMatches.length>1?'s':''} in ECDIS database — select one or use Auto Route`,'success');
      return;
    }

    // 2. Fall back to auto route (ROUTE_TABLE first, then corridor routing)
    setShowDbSugg(false);
    const wps=buildAutoRoute(f.id,t.id);
    if(wps.length<2){notify('Could not generate route for this port pair','error');return;}
    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);
    notify(`Auto route: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(0)} NM`,'success');
  };

  const useDbRoute=(r)=>{
    setShowDbSugg(false);
    // Get the file URL and fetch the RTZ if possible
    const url=r.fileUrl||r['File URL']||r['Download URL']||r['Drive Link']||
              Object.values(r).find(v=>typeof v==='string'&&v.includes('drive.google'));
    if(url){
      notify('Loading route from ECDIS database…','success');
      let fetchUrl=url;
      const gdMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if(gdMatch) fetchUrl=`https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;
      fetch(fetchUrl,{mode:'cors'})
        .then(r=>r.text())
        .then(text=>{
          const result=parseRTZ(text);
          if(result&&result.waypoints.length>0){
            setWaypoints(result.waypoints);
            const name=r.fileName||r['File Name']||r['Route Name']||'ECDIS Route';
            setRouteName(name);
            notify(`Loaded: ${name} — ${result.waypoints.length} waypoints`,'success');
          } else {
            notify('Could not parse RTZ — using auto route as fallback','error');
            fallbackAutoRoute();
          }
        }).catch(()=>{
          notify('Could not fetch RTZ file — using auto route as fallback','error');
          fallbackAutoRoute();
        });
    } else {
      fallbackAutoRoute();
    }
  };

  const fallbackAutoRoute=()=>{
    const f=PORTS_DB.find(p=>p.name.toLowerCase()===fromPort.toLowerCase()||p.id.toLowerCase()===fromPort.toLowerCase());
    const t=PORTS_DB.find(p=>p.name.toLowerCase()===toPort.toLowerCase()||p.id.toLowerCase()===toPort.toLowerCase());
    if(!f||!t) return;
    const wps=buildAutoRoute(f.id,t.id);
    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);
    notify(`Auto route: ${wps.length} waypoints — ${totalRouteNM(wps).toFixed(0)} NM`,'success');
  };

  const handleRTZLoad=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const result=parseRTZ(ev.target.result);
      if(!result||result.waypoints.length===0){notify('Could not parse RTZ file','error');return;}
      setWaypoints(result.waypoints);
      setRouteName(result.name);
      notify(`Loaded: ${result.name} — ${result.waypoints.length} waypoints`,'success');
    };
    reader.readAsText(file);
  };

  const handleMapClick=(lat,lon)=>{
    if(!clickAdd)return;
    setWaypoints(wps=>recalcWaypoints([...wps,{lat:Math.round(lat*10000)/10000,lon:Math.round(lon*10000)/10000}]));
  };

  const removeWP=(i)=>setWaypoints(wps=>recalcWaypoints(wps.filter((_,j)=>j!==i)));
  const clearRoute=()=>{setWaypoints([]);setPlaying(false);};

  const toggleOverlay=(k)=>setOverlays(o=>({...o,[k]:!o[k]}));

  const ovCfg=[
    {k:'eca',    label:'ECA',    color:'#FF6B35', desc:'Emission Control Area'},
    {k:'seca',   label:'SECA',   color:'#FFB347', desc:'Sulphur ECA'},
    {k:'marpol', label:'MARPOL', color:'#9B59B6', desc:'MARPOL Special Area'},
    {k:'piracy', label:'Piracy', color:'#E74C3C', desc:'Piracy Risk Area'},
    {k:'layover',label:'Anchorage',color:'#3498DB',desc:'Anchorage / Layover'},
  ];

  return(
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
      {/* Route Name + Export Bar */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'0.7rem 1rem',background:'var(--card)',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
        <input className="fi" style={{flex:1,minWidth:150,padding:'7px 12px',fontSize:'0.82rem'}} placeholder="Route Name…" value={routeName} onChange={e=>setRouteName(e.target.value)}/>
        {totalNM>0&&<span style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',color:'var(--cyan)',whiteSpace:'nowrap'}}>📏 {totalNM.toFixed(1)} NM</span>}
        <span style={{fontFamily:'Orbitron,monospace',fontSize:'0.72rem',color:'var(--text2)'}}>{waypoints.length} WPTs</span>
        <button className="btn btn-gold" style={{padding:'7px 12px',fontSize:'0.72rem'}} disabled={waypoints.length<2}
          onClick={()=>downloadFile(exportRTZ(routeName,waypoints),`${routeName.replace(/\s+/g,'-')}.rtz`,'application/xml')}>
          ⬇ RTZ
        </button>
        <button className="btn btn-green" style={{padding:'7px 12px',fontSize:'0.72rem'}} disabled={waypoints.length<2}
          onClick={()=>downloadFile(exportCSV(waypoints),`${routeName.replace(/\s+/g,'-')}.csv`,'text/csv')}>
          ⬇ CSV
        </button>
        <button className="btn btn-danger" style={{padding:'7px 12px',fontSize:'0.72rem'}} onClick={clearRoute}>🗑 Clear</button>
        <div style={{display:'flex',gap:3,marginLeft:'auto',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
          {[['night','🌙 Night'],['dusk','🌅 Dusk'],['day','☀️ Day']].map(([m,l])=>(
            <button key={m} onClick={()=>setMapMode(m)}
              style={{padding:'5px 10px',fontSize:'0.68rem',border:'none',cursor:'pointer',fontFamily:'Exo 2,sans-serif',fontWeight:600,
                background:mapMode===m?(m==='night'?'#0B1D35':m==='dusk'?'#7C3A1A':'#1565C0'):'transparent',
                color:mapMode===m?'white':'var(--text2)',transition:'all 0.2s'}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="planner-layout">
        {/* SIDEBAR */}
        <div className="planner-sidebar">
          <div className="p-tabs">
            {[['auto','🗺 Auto'],['load','📂 Load RTZ'],['eta','⏱ ETA'],['wpts','📋 WPTs']].map(([k,l])=>(
              <button key={k} className={`p-tab ${panel===k?'active':''}`} onClick={()=>setPanel(k)}>{l}</button>
            ))}
          </div>

          <div className="p-panel" style={{overflowY:'auto'}}>
            {/* AUTO ROUTE */}
            {panel==='auto'&&(
              <>
                <div className="p-section">
                  <span className="p-label">🛳 Departure Port</span>
                  <div style={{position:'relative'}}>
                    <input className="fi" placeholder="e.g. Mumbai, MUM" value={fromPort}
                      onChange={e=>setFromPort(e.target.value)} onFocus={()=>searchPort(fromPort,setFromSugg)}/>
                    {fromSugg.length>0&&(
                      <div className="ac" style={{position:'absolute',zIndex:200}}>
                        {fromSugg.map(p=><div key={p.id} className="ac-item" onClick={()=>{setFromPort(p.name);setFromSugg([]);}}>
                          <span>📍</span>
                          <div>
                            <div style={{fontWeight:600,fontSize:'0.82rem'}}>{p.name}</div>
                            <div style={{fontSize:'0.67rem',color:'var(--text2)'}}>{p.city} · {p.country}</div>
                            <div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{p.lat.toFixed(4)}°N / {p.lon.toFixed(4)}°E · {p.id}</div>
                          </div>
                        </div>)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-section">
                  <span className="p-label">🏁 Arrival Port</span>
                  <div style={{position:'relative'}}>
                    <input className="fi" placeholder="e.g. Singapore, SIN" value={toPort}
                      onChange={e=>setToPort(e.target.value)} onFocus={()=>searchPort(toPort,setToSugg)}/>
                    {toSugg.length>0&&(
                      <div className="ac" style={{position:'absolute',zIndex:200}}>
                        {toSugg.map(p=><div key={p.id} className="ac-item" onClick={()=>{setToPort(p.name);setToSugg([]);}}>
                          <span>🏁</span>
                          <div>
                            <div style={{fontWeight:600,fontSize:'0.82rem'}}>{p.name}</div>
                            <div style={{fontSize:'0.67rem',color:'var(--text2)'}}>{p.city} · {p.country}</div>
                            <div style={{fontSize:'0.62rem',color:'var(--text3)'}}>{p.lat.toFixed(4)}°N / {p.lon.toFixed(4)}°E · {p.id}</div>
                          </div>
                        </div>)}
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'0.6rem'}} onClick={generateRoute}>
                  🗺 Generate Sea Route
                </button>

                {/* ECDIS Database Suggestions */}
                {showDbSugg&&dbSuggestions.length>0&&(
                  <div style={{marginBottom:'1rem',background:'rgba(0,180,216,0.06)',border:'1px solid rgba(0,180,216,0.25)',borderRadius:10,padding:'10px'}}>
                    <div style={{fontSize:'0.72rem',color:'var(--cyan)',fontWeight:700,marginBottom:6}}>
                      ✅ {dbSuggestions.length} route{dbSuggestions.length>1?'s':''} found in your ECDIS database
                    </div>
                    {dbSuggestions.map((r,i)=>{
                      const name=r.fileName||r['File Name']||r['Route Name']||`Route ${i+1}`;
                      const port=r.portName||r['Port Name']||r['Route Description']||'';
                      return(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderRadius:7,
                          background:'rgba(0,0,0,0.2)',marginBottom:4,cursor:'pointer'}}
                          onClick={()=>useDbRoute(r)}>
                          <span style={{fontSize:'1rem'}}>🗺</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'0.76rem',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{name}</div>
                            {port&&<div style={{fontSize:'0.66rem',color:'var(--text2)'}}>{port}</div>}
                          </div>
                          <button style={{background:'var(--cyan)',color:'#000',border:'none',borderRadius:5,padding:'3px 8px',fontSize:'0.65rem',fontWeight:700,cursor:'pointer'}}>
                            USE
                          </button>
                        </div>
                      );
                    })}
                    <button className="btn btn-secondary" style={{width:'100%',fontSize:'0.7rem',padding:'5px',marginTop:4}}
                      onClick={()=>{setShowDbSugg(false);fallbackAutoRoute();}}>
                      ⚡ Skip — use Auto Route instead
                    </button>
                  </div>
                )}

                {/* Map Click Mode */}
                <div className="p-section">
                  <span className="p-label">📌 Manual Waypoints</span>
                  <button className={`btn ${clickAdd?'btn-gold':'btn-secondary'}`} style={{width:'100%',justifyContent:'center'}}
                    onClick={()=>setClickAdd(c=>!c)}>
                    {clickAdd?'✅ Click map to add WP (ON)':'Click map to add WP'}
                  </button>
                </div>

                {/* Overlays */}
                <div className="p-section">
                  <span className="p-label">🗺 Maritime Zone Overlays</span>
                  <div className="overlay-grid">
                    {ovCfg.map(ov=>(
                      <button key={ov.k} className={`ov-btn ${overlays[ov.k]?'active':''}`}
                        style={{color:overlays[ov.k]?ov.color:'var(--text2)',borderColor:overlays[ov.k]?ov.color:'var(--border)'}}
                        onClick={()=>toggleOverlay(ov.k)} title={ov.desc}>
                        {overlays[ov.k]?'✓ ':''}{ov.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Animation */}
                <div className="p-section">
                  <span className="p-label">🚢 Ship Animation</span>
                  <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:8}}>
                    <button className={`btn ${playing?'btn-danger':'btn-green'}`} style={{flex:1,justifyContent:'center'}}
                      disabled={waypoints.length<2} onClick={()=>setPlaying(p=>!p)}>
                      {playing?'⏹ Stop':'▶ Play'}
                    </button>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:'0.7rem',color:'var(--text2)'}}>Speed:</span>
                    <input type="range" min="1" max="20" value={speed} onChange={e=>setSpeed(+e.target.value)} style={{flex:1}}/>
                    <span style={{fontSize:'0.7rem',color:'var(--cyan)',fontFamily:'Orbitron,monospace',minWidth:20}}>{speed}x</span>
                  </div>
                </div>
              </>
            )}

            {/* LOAD RTZ */}
            {panel==='load'&&(
              <>
                <div className="p-section">
                  <span className="p-label">📂 Load RTZ File from your ECDIS</span>
                  <div style={{border:'2px dashed var(--border2)',borderRadius:10,padding:'1.5rem',textAlign:'center',cursor:'pointer',background:'var(--bg2)',marginBottom:'0.8rem'}}>
                    <div style={{fontSize:'2rem',marginBottom:6}}>📂</div>
                    <div style={{fontWeight:600,fontSize:'0.84rem',marginBottom:3}}>Select RTZ File</div>
                    <div style={{fontSize:'0.72rem',color:'var(--text2)'}}>Accepts .rtz and .rtzp files</div>
                    <input type="file" accept=".rtz,.rtzp" onChange={handleRTZLoad} style={{display:'block',marginTop:10,width:'100%',fontSize:'0.75rem'}}/>
                  </div>
                  {waypoints.length>0&&<div className="ok-box" style={{textAlign:'center',fontSize:'0.78rem'}}>✅ {waypoints.length} waypoints loaded from file</div>}
                </div>
                <div className="p-section">
                  <span className="p-label">✏️ Edit loaded route</span>
                  <p style={{fontSize:'0.75rem',color:'var(--text2)',lineHeight:1.6}}>
                    After loading, drag waypoints on the map to adjust. Use the WPTs tab to view and delete waypoints. Export back to RTZ when done.
                  </p>
                </div>
                {/* Also overlays and animation here */}
                <div className="p-section">
                  <span className="p-label">🗺 Zone Overlays</span>
                  <div className="overlay-grid">
                    {ovCfg.map(ov=>(
                      <button key={ov.k} className={`ov-btn ${overlays[ov.k]?'active':''}`}
                        style={{color:overlays[ov.k]?ov.color:'var(--text2)',borderColor:overlays[ov.k]?ov.color:'var(--border)'}}
                        onClick={()=>toggleOverlay(ov.k)}>{overlays[ov.k]?'✓ ':''}{ov.label}</button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ETA */}
            {panel==='eta'&&<ETACalculator totalNM={totalNM}/>}

            {/* WAYPOINTS TABLE */}
            {panel==='wpts'&&(
              <>
                <div style={{marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'0.75rem',color:'var(--text2)'}}>{waypoints.length} waypoints</span>
                  {waypoints.length>0&&<button className="btn btn-danger" style={{padding:'4px 9px',fontSize:'0.7rem'}} onClick={clearRoute}>Clear All</button>}
                </div>
                {waypoints.length===0
                  ?<div className="empty"><div className="empty-icon">📋</div><div className="empty-t">No Waypoints</div><div className="empty-d">Generate a route or load an RTZ file</div></div>
                  :<div style={{overflowX:'auto'}}>
                    <table className="wp-table">
                      <thead><tr><th>WP</th><th>Lat</th><th>Lon</th><th>Crs°</th><th>NM</th><th>Del</th></tr></thead>
                      <tbody>{waypoints.map((wp,i)=>(
                        <tr key={i}>
                          <td style={{color:'var(--cyan)',fontFamily:'Orbitron,monospace'}}>WP{String(i+1).padStart(2,'0')}</td>
                          <td>{wp.lat.toFixed(4)}</td>
                          <td>{wp.lon.toFixed(4)}</td>
                          <td>{i>0?(wp.bearing||0).toFixed(0):'—'}</td>
                          <td>{i>0?(wp.distance||0).toFixed(1):'0'}</td>
                          <td><button onClick={()=>removeWP(i)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'0.9rem'}}>✕</button></td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div style={{marginTop:8,padding:'8px',background:'var(--bg2)',borderRadius:8,textAlign:'center',fontFamily:'Orbitron,monospace',fontSize:'0.76rem',color:'var(--gold)'}}>
                      Total: {totalNM.toFixed(1)} NM
                    </div>
                  </div>
                }
              </>
            )}
          </div>
        </div>

        {/* MAP */}
        <MapView
          waypoints={waypoints}
          setWaypoints={setWaypoints}
          overlays={overlays}
          playing={playing}
          setPlaying={setPlaying}
          speed={speed}
          onMapClick={handleMapClick}
          mapMode={mapMode}
        />
      </div>
    </div>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({routes,charts,onSearch,setTab,user}){
  const [q,setQ]=useState('');
  const [sugg,setSugg]=useState([]);
  const [showSugg,setShowSugg]=useState(false);
  const wRef=useRef();

  useEffect(()=>{
    const h=e=>{if(!wRef.current?.contains(e.target))setShowSugg(false);};
    document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);
  },[]);

  useEffect(()=>{
    if(!q.trim()){setSugg([]);return;}
    const ql=q.toLowerCase();
    const hits=new Set();
    [...routes,...charts].forEach(f=>[f.fileName,f.portName,f.keywords,f.brand].filter(Boolean).forEach(s=>{if(s.toLowerCase().includes(ql))hits.add(s);}));
    PORTS_DB.forEach(p=>{if(p.name.toLowerCase().includes(ql))hits.add(p.name);});
    setSugg([...hits].slice(0,7));
  },[q,routes,charts]);

  const doSearch=(val)=>{const v=val||q;if(v.trim()){onSearch(v);setShowSugg(false);}};

  return(
    <div>
      <div className="hero">
        <div className="hero-tag">🧭 ECDIS Navigation System v5.0</div>
        <h1 className="hero-title">ECDIS <span className="accent">Route</span> Finder</h1>
        <p className="hero-desc">
          Search &amp; download ECDIS route files, user chart files, and plan your voyage with our Route Planner.
          {user&&<span style={{color:'var(--cyan)'}}> Welcome, {user.email.split('@')[0]}!</span>}
        </p>
        <div className="sw">
          <div className="sb">
            <div className="sr" ref={wRef} style={{position:'relative'}}>
              <div className="siw">
                <span className="si-ic">🔍</span>
                <input className="si" placeholder="Search port, route or file name… e.g. Mumbai, MUM, Singapore"
                  value={q} onChange={e=>{setQ(e.target.value);setShowSugg(true);}} onFocus={()=>setShowSugg(true)}
                  onKeyDown={e=>e.key==='Enter'&&doSearch()}/>
                {showSugg&&sugg.length>0&&(
                  <div className="ac">
                    {sugg.map((s,i)=><div key={i} className="ac-item" onClick={()=>{setQ(s);doSearch(s);}}>
                      <span>🔎</span><span>{s}</span>
                    </div>)}
                  </div>
                )}
              </div>
              <button className="sbtn" onClick={()=>doSearch()}>🔍 SEARCH</button>
            </div>
            <div className="sh">Try: <span>Mumbai</span> · <span>MUM</span> · <span>Singapore</span> · <span>Furuno</span></div>
          </div>
        </div>
        <div style={{display:'flex',gap:'0.8rem',justifyContent:'center',marginTop:'1.5rem',flexWrap:'wrap'}}>
          <button className="btn btn-gold" onClick={()=>setTab('routes')}>🗺 Browse RTZ Routes</button>
          <button className="btn btn-primary" onClick={()=>setTab('charts')}>📊 ECDIS Charts</button>
          <button className="btn btn-green" onClick={()=>setTab('planner')}>✏️ Route Planner</button>
          {!user&&<button className="btn btn-secondary" onClick={()=>setTab('login')}>🔐 Login</button>}
        </div>
        <div className="stats">
          <div><div className="sn">{routes.length}</div><div className="sl">RTZ Routes</div></div>
          <div><div className="sn">{charts.length}</div><div className="sl">Chart Files</div></div>
          <div><div className="sn">{ECDIS_BRANDS.length}</div><div className="sl">ECDIS Brands</div></div>
          <div><div className="sn">{PORTS_DB.length}</div><div className="sl">Ports</div></div>
        </div>
      </div>
    </div>
  );
}

// ─── ROUTES PAGE ──────────────────────────────────────────────────────────────
function RoutesPage({routes,sheetRoutes,searchQuery,notify,user,setTab}){
  const [q,setQ]=useState(searchQuery||'');
  const [typeF,setTypeF]=useState('all');
  const [showSugg,setShowSugg]=useState(false);
  const inputRef=useRef(null);

  useEffect(()=>{if(searchQuery)setQ(searchQuery);},[searchQuery]);

  // Normalize sheet rows once
  const normalizedSheet=useMemo(()=>
    (sheetRoutes||[]).map((r,i)=>normalizeSheetRow(r,i,'sr'))
  ,[sheetRoutes]);

  // Merge Firebase + Sheet — sheet rows de-duped by fileName
  const allRoutes=useMemo(()=>{
    const fbNames=new Set(routes.map(r=>r.fileName?.toLowerCase()));
    const extra=normalizedSheet.filter(r=>r.fileName&&!fbNames.has(r.fileName.toLowerCase()));
    return[...routes,...extra];
  },[routes,normalizedSheet]);

  // Build suggestion list from all route names + port names
  const suggestions=useMemo(()=>{
    if(!q.trim()||q.length<2) return[];
    const ql=q.toLowerCase();
    const seen=new Set();
    const hits=[];
    allRoutes.forEach(r=>{
      [r.fileName,r.portName].filter(Boolean).forEach(s=>{
        if(s.toLowerCase().includes(ql)&&!seen.has(s.toLowerCase())){
          seen.add(s.toLowerCase());
          hits.push(s);
        }
      });
    });
    return hits.slice(0,8);
  },[q,allRoutes]);

  const filtered=allRoutes.filter(r=>
    (typeF==='all'||r.type?.toLowerCase()===typeF.toLowerCase())&&smartMatch(r,q)
  );

  const handleDL=async(r)=>{
    if(!user){notify('🔐 Login required to download files','error');setTab('login');return;}
    if(!r.fileUrl){notify('File link not set. Contact admin.','error');return;}
    notify(`⏳ Preparing download: ${r.fileName}…`,'success');
    try{
      // Convert Google Drive view/share link → direct download link
      let url=r.fileUrl;
      const gdMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if(gdMatch){url=`https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;}
      const resp=await fetch(url,{mode:'cors'});
      if(!resp.ok)throw new Error('fetch failed');
      const blob=await resp.blob();
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=r.fileName||(gdMatch?gdMatch[1]+'.rtz':'download');
      a.click();URL.revokeObjectURL(a.href);
      notify(`✅ Downloaded: ${r.fileName}`,'success');
    }catch{
      // Fallback: direct link in same tab
      window.open(r.fileUrl,'_blank');
      notify(`Opened: ${r.fileName} — save the file from browser`,'success');
    }
  };

  const pickSugg=(s)=>{setQ(s);setShowSugg(false);};

  return(
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">🗺 RTZ Route Files</div>
        <span className="badge">{filtered.length} / {allRoutes.length} files</span>
      </div>
      {!user&&<div className="warn-box">🔐 <strong>Login required to download.</strong> <span style={{cursor:'pointer',textDecoration:'underline'}} onClick={()=>setTab('login')}>Create free account →</span></div>}

      {/* SEARCH WITH SUGGESTIONS */}
      <div style={{position:'relative',marginBottom:'0.9rem'}}>
        <div style={{display:'flex',gap:8}}>
          <div className="siw" style={{flex:1}}>
            <span className="si-ic">🔍</span>
            <input
              ref={inputRef}
              className="si"
              style={{paddingLeft:40}}
              placeholder="Search by port, route name, file name, keyword…"
              value={q}
              onChange={e=>{setQ(e.target.value);setShowSugg(true);}}
              onFocus={()=>setShowSugg(true)}
              onBlur={()=>setTimeout(()=>setShowSugg(false),180)}
            />
          </div>
          {q&&<button className="btn btn-secondary" onClick={()=>{setQ('');setShowSugg(false);}}>✕</button>}
        </div>
        {/* SUGGESTIONS DROPDOWN */}
        {showSugg&&suggestions.length>0&&(
          <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:300,
            background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,
            boxShadow:'0 8px 28px rgba(0,0,0,0.5)',marginTop:4,overflow:'hidden'}}>
            {suggestions.map((s,i)=>(
              <div key={i}
                onMouseDown={()=>pickSugg(s)}
                style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,
                  borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,180,216,0.08)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{color:'var(--cyan)',fontSize:'0.85rem'}}>🔎</span>
                <span style={{fontSize:'0.84rem'}}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick-search chips */}
      <div className="fbar" style={{marginBottom:'0.7rem'}}>
        {['Mumbai','Singapore','Dubai','Rotterdam','Colombo','Karachi','Fujairah'].map(p=>(
          <button key={p} className={`fbtn ${q.toLowerCase()===p.toLowerCase()?'active':''}`}
            onClick={()=>setQ(p)}>{p}</button>
        ))}
      </div>

      {/* Type filter */}
      <div className="fbar">
        {['all',...ROUTE_TYPES].map(t=>(
          <button key={t} className={`fbtn ${typeF===(t==='all'?'all':t)?'active':''}`}
            onClick={()=>setTypeF(t==='all'?'all':t)}>
            {t==='all'?'🌐 All':t}
          </button>
        ))}
      </div>

      {filtered.length===0
        ?<div className="empty">
          <div className="empty-icon">🧭</div>
          <div className="empty-t">No Routes Found</div>
          <div className="empty-d">Try "Mumbai", "MUM", "Singapore" or "mumbaitosingapore"</div>
        </div>
        :<div className="files-grid">{filtered.map(r=>(
          <div key={r.id} className="file-card">
            <div className="file-icon">{r.source==='sheet'?'🔄':'🗺'}</div>
            <div className="file-name">{r.fileName}</div>
            {r.portName&&<div className="file-port">📍 {r.portName}</div>}
            <div className="file-tags">
              <span className="ftag tag-rtz">RTZ File</span>
              {r.type&&<span className="ftag tag-rtz">{r.type}</span>}
              {r.source==='sheet'&&<span className="ftag" style={{background:'rgba(0,200,150,0.1)',color:'var(--green)',border:'1px solid rgba(0,200,150,0.2)'}}>Live Sheet</span>}
            </div>
            {user
              ?<button className="dl-btn" onClick={()=>handleDL(r)} disabled={!r.fileUrl}>
                {r.fileUrl?'⬇ Download RTZ File':'❌ Link Not Set'}
              </button>
              :<button className="login-req" onClick={()=>setTab('login')}>🔐 Login to Download</button>
            }
          </div>
        ))}</div>
      }
    </div>
  );
}

// ─── CHARTS PAGE ──────────────────────────────────────────────────────────────
function ChartsPage({charts,sheetCharts,notify,user,setTab,isAdmin}){
  const [selBrand,setSelBrand]=useState(null);
  const [q,setQ]=useState('');
  const [showSugg,setShowSugg]=useState(false);

  // Normalize sheet chart rows once
  const normalizedSheet=useMemo(()=>
    (sheetCharts||[]).map((r,i)=>normalizeSheetRow(r,i,'sc'))
  ,[sheetCharts]);

  // Merge Firebase + Sheet (de-dupe by fileName)
  const allCharts=useMemo(()=>{
    const fbNames=new Set(charts.map(c=>c.fileName?.toLowerCase()));
    const extra=normalizedSheet.filter(c=>c.fileName&&!fbNames.has(c.fileName.toLowerCase()));
    return[...charts,...extra];
  },[charts,normalizedSheet]);

  // Model-number → brand aliases extracted from ECDIS_BRANDS.models
  const MODEL_ALIASES = useMemo(()=>{
    const map=[];
    ECDIS_BRANDS.forEach(b=>{
      // e.g. "FMD-3200 / FMD-3300" → ["fmd3200","fmd3300","fmd-3200","fmd-3300"]
      const tokens=(b.models||'').split(/[\s/,]+/).map(t=>t.trim().toLowerCase()).filter(Boolean);
      tokens.forEach(t=>{ if(t.length>2) map.push({token:t,id:b.id}); });
      // Also add id and name
      map.push({token:b.name.toLowerCase(),id:b.id});
      map.push({token:b.id,id:b.id});
      // Extra common abbreviations
      if(b.id==='jrc')    map.push({token:'jan',id:'jrc'});
      if(b.id==='furuno') map.push({token:'fmd',id:'furuno'},{token:'furuno',id:'furuno'});
      if(b.id==='transas'||b.id==='wartsila') map.push({token:'navisailor',id:'transas'},{token:'navi-sailor',id:'transas'},{token:'wartsila',id:'transas'},{token:'wärtsilä',id:'transas'});
      if(b.id==='sperry') map.push({token:'visionmaster',id:'sperry'},{token:'vision master',id:'sperry'});
      if(b.id==='tokimec'||b.id==='jmr') map.push({token:'jmr',id:'tokimec'});
      if(b.id==='danelec') map.push({token:'dm800',id:'danelec'},{token:'dm-800',id:'danelec'});
      if(b.id==='kongsberg') map.push({token:'kbridge',id:'kongsberg'},{token:'k-bridge',id:'kongsberg'});
      if(b.id==='raytheon') map.push({token:'anschutz',id:'raytheon'},{token:'anschütz',id:'raytheon'});
    });
    return map;
  },[]);

  // Detect brand for a chart (works for both Firebase and sheet data)
  const detectBrand=(c)=>{
    const hay=[c.brand,c.brandId,c.model,c.keywords,c.fileName,c.portName]
      .filter(Boolean).join(' ').toLowerCase().replace(/[\s_]/g,'');
    // First try direct brand name / id match
    const direct=ECDIS_BRANDS.find(b=>
      hay.includes(b.name.toLowerCase().replace(/[\s_]/g,''))||hay.includes(b.id)
    );
    if(direct) return direct;
    // Then try model-number / alias match
    for(const {token,id} of MODEL_ALIASES){
      if(hay.includes(token.replace(/[\s_-]/g,''))){
        return ECDIS_BRANDS.find(b=>b.id===id)||null;
      }
    }
    return null;
  };

  const brandCount=id=>{
    const b=ECDIS_BRANDS.find(x=>x.id===id);
    if(!b) return 0;
    return allCharts.filter(c=>{
      const d=detectBrand(c);
      return d?.id===id||c.brandId===id||c.brand===b.name;
    }).length;
  };

  const sb=ECDIS_BRANDS.find(b=>b.id===selBrand);

  // Charts that belong to selected brand (or ALL sheet charts if 'all-sheet' selected)
  const brandCharts=useMemo(()=>{
    if(!selBrand) return[];
    if(selBrand==='all-sheet') return normalizedSheet;
    const b=ECDIS_BRANDS.find(x=>x.id===selBrand);
    return allCharts.filter(c=>{
      const d=detectBrand(c);
      return d?.id===selBrand||c.brandId===selBrand||c.brand===b?.name;
    });
  // eslint-disable-next-line
  },[selBrand,allCharts,normalizedSheet]);

  // Suggestions for chart search within brand
  const suggestions=useMemo(()=>{
    if(!q.trim()||q.length<2) return[];
    const ql=q.toLowerCase();
    const seen=new Set();
    const hits=[];
    brandCharts.forEach(c=>{
      [c.fileName,c.portName,c.region].filter(Boolean).forEach(s=>{
        if(s.toLowerCase().includes(ql)&&!seen.has(s.toLowerCase())){
          seen.add(s.toLowerCase());hits.push(s);
        }
      });
    });
    return hits.slice(0,8);
  },[q,brandCharts]);

  const filtered=brandCharts.filter(c=>smartMatch(c,q));

  const handleDL=async(c)=>{
    if(!user){notify('🔐 Login required','error');setTab('login');return;}
    if(!c.fileUrl){notify('File link not set. Contact admin.','error');return;}
    notify(`⏳ Preparing download: ${c.fileName}…`,'success');
    try{
      let url=c.fileUrl;
      const gdMatch=url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if(gdMatch){url=`https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;}
      const resp=await fetch(url,{mode:'cors'});
      if(!resp.ok)throw new Error('fetch failed');
      const blob=await resp.blob();
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download=c.fileName||(gdMatch?gdMatch[1]+'.000':'download');
      a.click();URL.revokeObjectURL(a.href);
      notify(`✅ Downloaded: ${c.fileName}`,'success');
    }catch{
      window.open(c.fileUrl,'_blank');
      notify(`Opened: ${c.fileName} — save the file from browser`,'success');
    }
  };

  const pickSugg=(s)=>{setQ(s);setShowSugg(false);};

  return(
    <div className="section">
      {!selBrand?(
        <>
          <div className="sec-hdr">
            <div className="sec-title">📊 ECDIS Chart Files</div>
            <span className="badge badge-gold">{ECDIS_BRANDS.length} Brands · {allCharts.length} charts</span>
          </div>
          <div className="info-box">
            <strong style={{color:'var(--cyan)'}}>Step 1:</strong> Select your ECDIS brand →&nbsp;
            <strong style={{color:'var(--cyan)'}}>Step 2:</strong> Search by port or region →&nbsp;
            <strong style={{color:'var(--cyan)'}}>Step 3:</strong> Download chart file
          </div>
          {!user&&<div className="warn-box">🔐 Login required to download. <span style={{cursor:'pointer',textDecoration:'underline'}} onClick={()=>setTab('login')}>Register free →</span></div>}
          <div className="brand-grid">
            {ECDIS_BRANDS.map(b=>{
              const cnt=brandCount(b.id);
              return(
                <div key={b.id} className={`brand-card ${selBrand===b.id?'sel':''}`}
                  style={{borderColor:cnt>0?b.color+'66':'var(--border)'}} onClick={()=>{setSelBrand(b.id);setQ('');}}>
                  <div className="brand-emoji">{b.emoji}</div>
                  <div className="brand-name" style={{color:cnt>0?b.color:'var(--text2)'}}>{b.name}</div>
                  <div className="brand-models">{b.models}</div>
                  <div className="brand-count" style={{color:cnt>0?'var(--green)':'var(--text3)'}}>
                    {cnt>0?`${cnt} chart${cnt>1?'s':''}  ✅`:'No charts yet'}
                  </div>
                </div>
              );
            })}
            {/* All Sheet Charts — admin only */}
            {isAdmin&&normalizedSheet.length>0&&(
              <div className="brand-card" style={{borderColor:'rgba(0,200,150,0.4)',gridColumn:'1/-1',display:'flex',flexDirection:'row',alignItems:'center',gap:14,padding:'12px 16px'}}
                onClick={()=>{setSelBrand('all-sheet');setQ('');}}>
                <div style={{fontSize:'1.6rem'}}>🔄</div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',fontWeight:700,color:'var(--green)'}}>All Google Sheet Charts</div>
                  <div style={{fontSize:'0.68rem',color:'var(--text2)',marginTop:2}}>Browse all {normalizedSheet.length} charts from your live Google Sheet — regardless of brand</div>
                </div>
                <span className="badge" style={{background:'rgba(0,200,150,0.15)',color:'var(--green)',border:'1px solid rgba(0,200,150,0.3)'}}>{normalizedSheet.length} charts ✅</span>
              </div>
            )}
          </div>
        </>
      ):(
        <>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:'1.2rem',flexWrap:'wrap'}}>
            <button className="btn btn-secondary" onClick={()=>{setSelBrand(null);setQ('');}}>← Back</button>
            <span style={{fontSize:'1.4rem'}}>{selBrand==='all-sheet'?'🔄':sb?.emoji}</span>
            <div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.88rem',fontWeight:700,color:selBrand==='all-sheet'?'var(--green)':sb?.color}}>
                {selBrand==='all-sheet'?'All Google Sheet Charts':sb?.name}
              </div>
              <div style={{fontSize:'0.7rem',color:'var(--text2)'}}>{selBrand==='all-sheet'?'All charts from your live sheet':sb?.models}</div>
            </div>
            <span className="badge badge-gold">{brandCharts.length} chart files</span>
          </div>
          {!user&&<div className="warn-box">🔐 Login required. <span style={{cursor:'pointer',textDecoration:'underline'}} onClick={()=>setTab('login')}>Login / Register →</span></div>}

          {/* SEARCH WITH SUGGESTIONS */}
          <div style={{position:'relative',marginBottom:'1rem'}}>
            <div style={{display:'flex',gap:8}}>
              <div className="siw" style={{flex:1}}>
                <span className="si-ic">🔍</span>
                <input
                  className="si"
                  style={{paddingLeft:40}}
                  placeholder={`Search port, region, file name for ${sb?.name}…`}
                  value={q}
                  autoFocus
                  onChange={e=>{setQ(e.target.value);setShowSugg(true);}}
                  onFocus={()=>setShowSugg(true)}
                  onBlur={()=>setTimeout(()=>setShowSugg(false),180)}
                />
              </div>
              {q&&<button className="btn btn-secondary" onClick={()=>{setQ('');setShowSugg(false);}}>✕</button>}
            </div>
            {showSugg&&suggestions.length>0&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:300,
                background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,
                boxShadow:'0 8px 28px rgba(0,0,0,0.5)',marginTop:4,overflow:'hidden'}}>
                {suggestions.map((s,i)=>(
                  <div key={i}
                    onMouseDown={()=>pickSugg(s)}
                    style={{padding:'10px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,
                      borderBottom:'1px solid rgba(255,255,255,0.04)',transition:'background 0.15s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(240,165,0,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{color:'var(--gold)',fontSize:'0.85rem'}}>🔎</span>
                    <span style={{fontSize:'0.84rem'}}>{s}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {filtered.length===0
            ?<div className="empty">
              <div className="empty-icon">{selBrand==='all-sheet'?'🔄':sb?.emoji}</div>
              <div className="empty-t">{brandCharts.length===0?'No Charts Available':'No Results'}</div>
              <div className="empty-d">{brandCharts.length===0?'Admin will upload charts soon.':'Try a different port name or keyword.'}</div>
            </div>
            :<div className="files-grid">{filtered.map(c=>{
              const brand=detectBrand(c)||sb;
              return(
                <div key={c.id} className="file-card">
                  <div className="file-icon">📊</div>
                  <div className="file-name">{c.fileName}</div>
                  {c.portName&&<div className="file-port">⚓ {c.portName}</div>}
                  {c.model&&<div style={{fontSize:'0.72rem',color:'#A78BFA',marginBottom:6}}>🖥 Model: {c.model}</div>}
                  <div className="file-tags">
                    <span className="ftag tag-chart">Chart File</span>
                    <span className="ftag tag-brand" style={{color:brand?.color}}>{brand?.emoji} {c.brand||brand?.name}</span>
                    {c.region&&<span className="ftag tag-rtz">{c.region}</span>}
                    {c.source==='sheet'&&<span className="ftag" style={{background:'rgba(0,200,150,0.1)',color:'var(--green)',border:'1px solid rgba(0,200,150,0.2)'}}>Live Sheet</span>}
                  </div>
                  {user
                    ?<button className="dl-btn" onClick={()=>handleDL(c)} disabled={!c.fileUrl}>
                      {c.fileUrl?'⬇ Download Chart File':'❌ Link Not Set'}
                    </button>
                    :<button className="login-req" onClick={()=>setTab('login')}>🔐 Login to Download</button>
                  }
                </div>
              );
            })}</div>
          }
        </>
      )}
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({notify,onLogin}){
  const [mode,setMode]=useState('login');
  const [email,setEmail]=useState('');const [pass,setPass]=useState('');
  const [name,setName]=useState('');const [phone,setPhone]=useState('');
  const [loading,setLoading]=useState(false);const [err,setErr]=useState('');const [ok,setOk]=useState('');

  const doLogin=async()=>{
    setLoading(true);setErr('');
    try{
      const c=await signInWithEmailAndPassword(auth,email,pass);
      // Check if user is blocked in Firestore
      const {getDoc,doc:firestoreDoc}=await import('firebase/firestore');
      const snap=await getDoc(firestoreDoc(db,'users',c.user.uid));
      if(snap.exists()&&snap.data().blocked){
        await signOut(auth);
        setErr('⚠️ ACCESS SUSPENDED — Suspicious login detected by admin. Contact owner on Instagram: @manish_the_navigator');
        setLoading(false);return;
      }
      notify('Welcome back! 👋','success');onLogin(c.user);
    }
    catch(e){
      if(e.code==='auth/invalid-credential'||e.code==='auth/wrong-password'||e.code==='auth/user-not-found')
        setErr('Invalid email or password.');
      else if(!e.code)
        setErr('⚠️ ACCESS SUSPENDED — Contact owner: @manish_the_navigator on Instagram');
      else
        setErr('Login error: '+e.message);
    }
    setLoading(false);
  };
  const doSignup=async()=>{
    if(!name.trim()){setErr('Please enter your full name.');return;}
    if(!phone.trim()){setErr('Please enter your phone number.');return;}
    if(!email||!pass){setErr('Fill all fields.');return;}
    if(pass.length<6){setErr('Password min 6 characters.');return;}
    setLoading(true);setErr('');
    try{
      const c=await createUserWithEmailAndPassword(auth,email,pass);
      await setDoc(doc(db,'users',c.user.uid),{
        email,
        name:name.trim(),
        phone:phone.trim(),
        createdAt:serverTimestamp(),
        role:'user'
      });
      notify('Account created! 🎉','success');onLogin(c.user);
    }catch(e){setErr(e.code==='auth/email-already-in-use'?'Email already registered. Login instead.':'Error: '+e.message);}
    setLoading(false);
  };
  const doReset=async()=>{
    if(!email){setErr('Enter your email.');return;}
    setLoading(true);setErr('');
    try{await sendPasswordResetEmail(auth,email);setOk('Reset email sent! Check your inbox.');}
    catch{setErr('Email not found.');}
    setLoading(false);
  };

  return(
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon">🧭</div>
          <div className="auth-title">ECDIS Route Finder</div>
          <div className="auth-sub">{mode==='reset'?'Reset Password':'Free account · Download all files'}</div>
        </div>
        {mode!=='reset'&&(
          <div className="auth-tabs">
            <button className={`atab ${mode==='login'?'active':''}`} onClick={()=>{setMode('login');setErr('');setOk('');}}>Login</button>
            <button className={`atab ${mode==='signup'?'active':''}`} onClick={()=>{setMode('signup');setErr('');setOk('');}}>Create Account</button>
          </div>
        )}
        <div className="info-box" style={{fontSize:'0.74rem'}}>🆓 Free account · Access all RTZ routes &amp; ECDIS charts</div>
        {mode==='signup'&&<>
          <div className="ff"><label className="fl">Full Name *</label><input className="fi" placeholder="Capt. Ahmed Khan" value={name} onChange={e=>setName(e.target.value)}/></div>
          <div className="ff"><label className="fl">Phone Number *</label><input className="fi" type="tel" placeholder="+91 9876543210" value={phone} onChange={e=>setPhone(e.target.value)}/></div>
        </>}
        <div className="ff"><label className="fl">Email</label><input className="fi" type="email" placeholder="officer@ship.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(mode==='login'?doLogin():mode==='signup'?doSignup():doReset())}/></div>
        {mode!=='reset'&&<div className="ff"><label className="fl">Password</label><input className="fi" type="password" placeholder="Min 6 characters" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(mode==='login'?doLogin():doSignup())}/></div>}
        {err&&<div className="err-box">{err}</div>}
        {ok&&<div className="ok-box">{ok}</div>}
        <button className="submit-btn" onClick={mode==='login'?doLogin:mode==='signup'?doSignup:doReset} disabled={loading}>
          {loading?'Please wait…':mode==='login'?'🔐 LOGIN':mode==='signup'?'✅ CREATE FREE ACCOUNT':'📧 SEND RESET EMAIL'}
        </button>
        {mode==='login'&&<div className="link-txt" onClick={()=>{setMode('reset');setErr('');setOk('');}}>Forgot password?</div>}
        {mode==='reset'&&<div className="link-txt" onClick={()=>{setMode('login');setErr('');setOk('');}}>← Back to login</div>}
      </div>
    </div>
  );
}

// ─── PORT SEARCH PAGE ─────────────────────────────────────────────────────────
function PortSearchPage({sheetLoading,refreshSheets}){
  const [q,setQ]=useState('');
  const results=useMemo(()=>{
    if(!q.trim()||q.length<2) return PORTS_DB.slice(0,50);
    const ql=q.toLowerCase().trim();
    return PORTS_DB.filter(p=>{
      const kw=(p.keywords||[p.name,p.city,p.country,p.id].filter(Boolean).join(' ')).toLowerCase();
      return p.name?.toLowerCase().includes(ql)||p.city?.toLowerCase().includes(ql)||
             p.id?.toLowerCase().includes(ql)||p.country?.toLowerCase().includes(ql)||kw.includes(ql);
    }).slice(0,100);
  },[q]);

  return(
    <div className="section">
      <div className="sec-hdr">
        <div className="sec-title">⚓ Port Search</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span className="badge">{PORTS_DB.length} ports loaded</span>
          <button className="btn btn-secondary" style={{fontSize:'0.7rem',padding:'4px 10px'}} onClick={refreshSheets} disabled={sheetLoading}>
            {sheetLoading?'⏳':'🔄'} Sync
          </button>
        </div>
      </div>
      <div className="info-box" style={{fontSize:'0.74rem'}}>
        📡 Port data from your <strong style={{color:'var(--cyan)'}}>Google Sheet</strong> — search any port worldwide by name, country, city or LOCODE. Shows coordinates for ECDIS route planning.
      </div>
      <div className="siw" style={{marginBottom:'1rem'}}>
        <span className="si-ic">🔍</span>
        <input className="si" style={{paddingLeft:40}} autoFocus
          placeholder="Search port name, country, LOCODE… e.g. Mumbai, SIN, Japan"
          value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
      {results.length===0
        ?<div className="empty"><div className="empty-icon">⚓</div><div className="empty-t">No Ports Found</div><div className="empty-d">Try a different name or LOCODE</div></div>
        :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'0.6rem'}}>
          {results.map(p=>(
            <div key={p.id} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <div style={{fontWeight:700,fontSize:'0.86rem',color:'var(--cyan)'}}>{p.name}</div>
                <span style={{background:'rgba(0,180,216,0.12)',color:'var(--cyan)',border:'1px solid rgba(0,180,216,0.25)',borderRadius:5,padding:'1px 6px',fontSize:'0.65rem',fontFamily:'monospace'}}>{p.id}</span>
              </div>
              <div style={{fontSize:'0.74rem',color:'var(--text2)',marginBottom:6}}>{p.city&&p.city!==p.name?`${p.city} · `:''}{p.country}</div>
              <div style={{display:'flex',gap:8,fontSize:'0.72rem'}}>
                <div style={{background:'rgba(0,0,0,0.2)',borderRadius:6,padding:'4px 8px',flex:1,textAlign:'center'}}>
                  <div style={{color:'var(--text3)',fontSize:'0.6rem',marginBottom:1}}>LATITUDE</div>
                  <div style={{color:'var(--green)',fontFamily:'monospace'}}>{p.lat?.toFixed(5)}°{p.lat>=0?'N':'S'}</div>
                </div>
                <div style={{background:'rgba(0,0,0,0.2)',borderRadius:6,padding:'4px 8px',flex:1,textAlign:'center'}}>
                  <div style={{color:'var(--text3)',fontSize:'0.6rem',marginBottom:1}}>LONGITUDE</div>
                  <div style={{color:'var(--gold)',fontFamily:'monospace'}}>{p.lon?.toFixed(5)}°{p.lon>=0?'E':'W'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }
      {!q&&<div style={{textAlign:'center',marginTop:'1rem',fontSize:'0.72rem',color:'var(--text3)'}}>Showing first 50 ports · Type to search all {PORTS_DB.length}</div>}
    </div>
  );
}

function AdminPage({notify,routes,setRoutes,charts,setCharts,sheetRoutes,sheetCharts,refreshSheets,sheetLoading}){
  const [user,setUser]=useState(null);
  const [email,setEmail]=useState('');const [pass,setPass]=useState('');
  const [err,setErr]=useState('');const [loading,setLoading]=useState(false);
  const [section,setSection]=useState('dashboard');
  const [users,setUsers]=useState([]);
  // New route form
  const [nr,setNr]=useState({fileName:'',fileUrl:'',portName:'',keywords:'',type:'Ocean'});
  // New chart form
  const [nc,setNc]=useState({fileName:'',fileUrl:'',portName:'',brand:'furuno',region:'',keywords:''});

  useEffect(()=>{const u=onAuthStateChanged(auth,u=>setUser(u));return()=>u();},[]);
  useEffect(()=>{if(user&&section==='users')loadUsers();},[user,section]);

  const login=async()=>{
    setLoading(true);setErr('');
    try{
      const c=await signInWithEmailAndPassword(auth,email,pass);
      if(c.user.email!==ADMIN_EMAIL){
        await signOut(auth);
        setErr('❌ Access denied. This portal is for admins only.');
        setLoading(false);return;
      }
    }
    catch{setErr('Invalid credentials.');}
    setLoading(false);
  };

  const loadUsers=async()=>{
    try{const snap=await getDocs(collection(db,'users'));setUsers(snap.docs.map(d=>({id:d.id,...d.data()})));}
    catch{notify('Could not load users','error');}
  };

  const saveRoute=async()=>{
    if(!nr.fileName||!nr.fileUrl){notify('File name and Google Drive link are required','error');return;}
    try{
      const data={...nr,keywords:(nr.keywords+' '+nr.fileName+' '+nr.portName).toLowerCase().trim(),uploadedAt:serverTimestamp()};
      const ref=await addDoc(collection(db,'routes'),data);
      setRoutes(r=>[...r,{id:ref.id,...data}]);
      setNr({fileName:'',fileUrl:'',portName:'',keywords:'',type:'Ocean'});
      notify('Route saved ✅','success');
    }catch(e){notify('Error: '+e.message,'error');}
  };

  const saveChart=async()=>{
    if(!nc.fileName||!nc.fileUrl||!nc.portName){notify('File name, port name and link required','error');return;}
    const brandName=ECDIS_BRANDS.find(b=>b.id===nc.brand)?.name||nc.brand;
    try{
      const data={...nc,brand:brandName,brandId:nc.brand,keywords:(nc.keywords+' '+nc.portName+' '+brandName+' '+nc.fileName).toLowerCase().trim(),uploadedAt:serverTimestamp()};
      const ref=await addDoc(collection(db,'charts'),data);
      setCharts(c=>[...c,{id:ref.id,...data}]);
      setNc({fileName:'',fileUrl:'',portName:'',brand:'furuno',region:'',keywords:''});
      notify('Chart saved ✅','success');
    }catch(e){notify('Error: '+e.message,'error');}
  };

  const deleteRoute=async id=>{try{await deleteDoc(doc(db,'routes',id));setRoutes(r=>r.filter(x=>x.id!==id));notify('Deleted','success');}catch{notify('Delete failed','error');}};
  const deleteChart=async id=>{try{await deleteDoc(doc(db,'charts',id));setCharts(c=>c.filter(x=>x.id!==id));notify('Deleted','success');}catch{notify('Delete failed','error');}};

  const blockUser=async(u)=>{
    try{
      await setDoc(doc(db,'users',u.id),{blocked:true,blockedAt:serverTimestamp()},{merge:true});
      setUsers(us=>us.map(x=>x.id===u.id?{...x,blocked:true}:x));
      notify(`⛔ ${u.name||u.email} blocked`,'success');
    }catch{notify('Failed to block user','error');}
  };
  const unblockUser=async(u)=>{
    try{
      await setDoc(doc(db,'users',u.id),{blocked:false,blockedAt:null},{merge:true});
      setUsers(us=>us.map(x=>x.id===u.id?{...x,blocked:false}:x));
      notify(`✅ ${u.name||u.email} unblocked`,'success');
    }catch{notify('Failed to unblock user','error');}
  };
  if(!user) return(
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-icon" style={{background:'linear-gradient(135deg,var(--gold),var(--gold2))'}}>🛡</div>
          <div className="auth-title">Admin Portal</div>
          <div className="auth-sub">ECDIS Route Finder — Admin Only</div>
        </div>
        <div className="ff"><label className="fl">Admin Email</label><input className="fi" type="email" placeholder="admin@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/></div>
        <div className="ff"><label className="fl">Password</label><input className="fi" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/></div>
        {err&&<div className="err-box">{err}</div>}
        <button className="submit-btn" style={{background:'linear-gradient(135deg,var(--gold),var(--gold2))',color:'#000'}} onClick={login} disabled={loading}>{loading?'Logging in…':'🛡 ADMIN LOGIN'}</button>
      </div>
    </div>
  );

  const sides=[
    {k:'dashboard',   i:'📊', l:'Dashboard'},
    {k:'add-route',   i:'🗺', l:'Add Route'},
    {k:'add-chart',   i:'📊', l:'Add Chart'},
    {k:'routes',      i:'📋', l:'Manage Routes'},
    {k:'charts',      i:'🗂', l:'Manage Charts'},
    {k:'sheet-routes',i:'🔄', l:'Sheet Routes'},
    {k:'sheet-charts',i:'🔄', l:'Sheet Charts'},
    {k:'users',       i:'👥', l:'User Database'},
  ];

  const GDriveHelp=()=>(
    <div className="info-box" style={{fontSize:'0.74rem'}}>
      📁 <strong style={{color:'var(--text)'}}>Google Drive Link Guide:</strong><br/>
      1. Upload file to <strong>drive.google.com</strong> (ecdisroutes@gmail.com)<br/>
      2. Right click → Share → Anyone with link<br/>
      3. Copy link: <code style={{color:'var(--cyan)'}}>drive.google.com/file/d/ID/view</code><br/>
      4. Convert to: <code style={{color:'var(--green)'}}>drive.google.com/uc?export=download&amp;id=ID</code>
    </div>
  );

  return(
    <div>
      <div className="adm-mob-tabs">
        {sides.map(s=><button key={s.k} className={`amtab ${section===s.k?'active':''}`} onClick={()=>setSection(s.k)}>{s.i} {s.l}</button>)}
        <button className="amtab" onClick={()=>signOut(auth)}>🚪 Logout</button>
      </div>
      <div className="adm-layout">
        <div className="adm-sidebar">
          <div style={{marginBottom:'1.2rem'}}>
            <div className="s-label">Navigation</div>
            {sides.map(s=><div key={s.k} className={`s-item ${section===s.k?'active':''}`} onClick={()=>setSection(s.k)}><span>{s.i}</span>{s.l}</div>)}
          </div>
          <div>
            <div className="s-label">Account</div>
            <div className="s-item" style={{fontSize:'0.7rem',color:'var(--text3)'}}><span>👤</span>{user.email}</div>
            <div className="s-item" onClick={()=>signOut(auth)}><span>🚪</span>Logout</div>
          </div>
        </div>

        <div className="adm-content">

          {section==='dashboard'&&(
            <>
              <div className="a-hdr"><div className="a-title">📊 Dashboard</div><span style={{fontSize:'0.72rem',color:'var(--green)'}}>🔥 Firebase + Google Drive</span></div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(145px,1fr))',gap:'0.8rem',marginBottom:'1.4rem'}}>
                {[
                  {l:'RTZ Routes (DB)',  v:routes.length,    i:'🗺', c:'var(--cyan)'},
                  {l:'Chart Files (DB)', v:charts.length,    i:'📊', c:'var(--gold)'},
                  {l:'Sheet Routes',     v:sheetRoutes.length,i:'🔄',c:'var(--green)'},
                  {l:'Sheet Charts',     v:sheetCharts.length,i:'🔄',c:'#A78BFA'},
                  {l:'Links Active',     v:[...routes,...charts].filter(f=>f.fileUrl).length,i:'✅',c:'var(--green)'},
                  {l:'ECDIS Brands',     v:ECDIS_BRANDS.length,i:'🖥',c:'var(--text2)'},
                ].map(s=>(
                  <div key={s.l} className="file-card" style={{padding:'1rem'}}>
                    <div style={{fontSize:'1.5rem',marginBottom:4}}>{s.i}</div>
                    <div style={{fontFamily:'Orbitron,monospace',fontSize:'1.5rem',fontWeight:700,color:s.c}}>{s.v}</div>
                    <div style={{fontSize:'0.64rem',color:'var(--text2)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1rem'}}>
                <div style={{fontFamily:'Orbitron,monospace',fontSize:'0.78rem',marginBottom:'0.8rem',color:'var(--gold)'}}>📋 How to Add Files</div>
                {[
                  '1. FIREBASE (manual): Upload .rtz or chart to Google Drive, get direct link → use Add Route / Add Chart',
                  '2. GOOGLE SHEET (auto): Add rows to your Google Sheet → App Script syncs → click Sheet Routes or Sheet Charts',
                  '3. Sheet data updates live — click Sync Now in Sheet sections to pull latest',
                  '4. Firebase routes/charts need login to download — see User Database tab',
                  '5. Google Sheet rows are shown as-is from the sheet data',
                ].map((t,i)=><div key={i} style={{padding:'7px 0',borderBottom:'1px solid var(--border)',fontSize:'0.79rem',color:'var(--text2)'}}>{t}</div>)}
              </div>
            </>
          )}

          {section==='add-route'&&(
            <>
              <div className="a-hdr"><div className="a-title">🗺 Add RTZ Route</div></div>
              <GDriveHelp/>
              <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1.2rem'}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="ff" style={{gridColumn:'1/-1'}}>
                    <label className="fl">📁 RTZ File Name * (exact name)</label>
                    <input className="fi" placeholder="mumbaitosingapore.rtz" value={nr.fileName} onChange={e=>setNr(r=>({...r,fileName:e.target.value}))}/>
                  </div>
                  <div className="ff" style={{gridColumn:'1/-1'}}>
                    <label className="fl">🔗 Google Drive Direct Download Link *</label>
                    <input className="fi" placeholder="https://drive.google.com/uc?export=download&id=XXXX" value={nr.fileUrl} onChange={e=>setNr(r=>({...r,fileUrl:e.target.value}))}/>
                  </div>
                  <div className="ff">
                    <label className="fl">📍 Port / Route Description</label>
                    <input className="fi" placeholder="Mumbai to Singapore" value={nr.portName} onChange={e=>setNr(r=>({...r,portName:e.target.value}))}/>
                  </div>
                  <div className="ff">
                    <label className="fl">Route Type</label>
                    <select className="fi" value={nr.type} onChange={e=>setNr(r=>({...r,type:e.target.value}))}>
                      {ROUTE_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="ff" style={{gridColumn:'1/-1'}}>
                    <label className="fl">🔍 Search Keywords (space separated)</label>
                    <input className="fi" placeholder="mum sin india ocean" value={nr.keywords} onChange={e=>setNr(r=>({...r,keywords:e.target.value}))}/>
                  </div>
                </div>
                <button className="btn btn-primary" onClick={saveRoute}>✅ Save Route to Firebase</button>
              </div>
            </>
          )}

          {section==='add-chart'&&(
            <>
              <div className="a-hdr"><div className="a-title">📊 Add Chart File</div></div>
              <GDriveHelp/>
              <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'1.2rem'}}>
                <div className="ff">
                  <label className="fl">🖥 Select ECDIS Brand *</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:5,marginBottom:8}}>
                    {ECDIS_BRANDS.map(b=>(
                      <div key={b.id} onClick={()=>setNc(c=>({...c,brand:b.id}))}
                        style={{padding:'6px',borderRadius:8,cursor:'pointer',textAlign:'center',
                          border:`2px solid ${nc.brand===b.id?b.color:'var(--border)'}`,
                          background:nc.brand===b.id?b.color+'22':'transparent',transition:'all 0.2s'}}>
                        <div style={{fontSize:'1.2rem'}}>{b.emoji}</div>
                        <div style={{fontSize:'0.6rem',fontWeight:700,color:nc.brand===b.id?b.color:'var(--text2)',fontFamily:'Orbitron,monospace'}}>{b.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div className="ff">
                    <label className="fl">📁 Chart File Name *</label>
                    <input className="fi" placeholder="mumbai_furuno.bin" value={nc.fileName} onChange={e=>setNc(c=>({...c,fileName:e.target.value}))}/>
                  </div>
                  <div className="ff">
                    <label className="fl">⚓ Port Name *</label>
                    <input className="fi" placeholder="Mumbai" value={nc.portName} onChange={e=>setNc(c=>({...c,portName:e.target.value}))}/>
                  </div>
                  <div className="ff" style={{gridColumn:'1/-1'}}>
                    <label className="fl">🔗 Google Drive Direct Download Link *</label>
                    <input className="fi" placeholder="https://drive.google.com/uc?export=download&id=XXXX" value={nc.fileUrl} onChange={e=>setNc(c=>({...c,fileUrl:e.target.value}))}/>
                  </div>
                  <div className="ff">
                    <label className="fl">Region</label>
                    <input className="fi" placeholder="Arabian Sea" value={nc.region} onChange={e=>setNc(c=>({...c,region:e.target.value}))}/>
                  </div>
                  <div className="ff">
                    <label className="fl">Extra Keywords</label>
                    <input className="fi" placeholder="west coast india" value={nc.keywords} onChange={e=>setNc(c=>({...c,keywords:e.target.value}))}/>
                  </div>
                </div>
                <button className="btn btn-gold" onClick={saveChart}>✅ Save Chart to Firebase</button>
              </div>
            </>
          )}

          {section==='routes'&&(
            <>
              <div className="a-hdr"><div className="a-title">📋 Manage Routes</div><span className="badge">{routes.length}</span></div>
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>File Name</th><th>Port/Route</th><th>Type</th><th>Link</th><th>Del</th></tr></thead>
                  <tbody>{routes.length===0
                    ?<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:'2rem'}}>No routes added yet</td></tr>
                    :routes.map(r=>(
                    <tr key={r.id}>
                      <td><span style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--cyan)'}}>{r.fileName}</span></td>
                      <td style={{color:'var(--text2)',fontSize:'0.76rem'}}>{r.portName||'—'}</td>
                      <td style={{fontSize:'0.72rem',color:'var(--green)'}}>{r.type||'—'}</td>
                      <td>{r.fileUrl?<a href={r.fileUrl} target="_blank" rel="noreferrer" style={{color:'var(--green)',fontSize:'0.72rem'}}>✅ Active</a>:<span style={{color:'var(--red)',fontSize:'0.72rem'}}>❌ Missing</span>}</td>
                      <td><button className="btn btn-danger" style={{padding:'4px 8px',fontSize:'0.7rem'}} onClick={()=>deleteRoute(r.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {section==='charts'&&(
            <>
              <div className="a-hdr"><div className="a-title">🗂 Manage Charts</div><span className="badge badge-gold">{charts.length}</span></div>
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>File Name</th><th>Port</th><th>Brand</th><th>Link</th><th>Del</th></tr></thead>
                  <tbody>{charts.length===0
                    ?<tr><td colSpan={5} style={{textAlign:'center',color:'var(--text3)',padding:'2rem'}}>No charts added yet</td></tr>
                    :charts.map(c=>(
                    <tr key={c.id}>
                      <td><span style={{fontFamily:'Orbitron,monospace',fontSize:'0.68rem',color:'var(--gold)'}}>{c.fileName}</span></td>
                      <td style={{color:'var(--text2)',fontSize:'0.76rem'}}>{c.portName||'—'}</td>
                      <td style={{fontSize:'0.72rem',color:'#A78BFA'}}>{c.brand||'—'}</td>
                      <td>{c.fileUrl?<a href={c.fileUrl} target="_blank" rel="noreferrer" style={{color:'var(--green)',fontSize:'0.72rem'}}>✅ Active</a>:<span style={{color:'var(--red)',fontSize:'0.72rem'}}>❌ Missing</span>}</td>
                      <td><button className="btn btn-danger" style={{padding:'4px 8px',fontSize:'0.7rem'}} onClick={()=>deleteChart(c.id)}>🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          )}

          {section==='sheet-routes'&&(
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Google Sheet — ECDIS Routes</div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <span className="badge">{sheetRoutes.length} rows</span>
                  <button className="btn btn-primary" style={{padding:'5px 12px',fontSize:'0.72rem'}} onClick={refreshSheets} disabled={sheetLoading}>
                    {sheetLoading?'⏳ Syncing…':'🔄 Sync Now'}
                  </button>
                </div>
              </div>
              <div className="info-box" style={{fontSize:'0.74rem'}}>
                📡 <strong style={{color:'var(--text)'}}>Live Google Sheet Database</strong> — auto-refreshes from your Google Sheet via App Script. Click <strong>Sync Now</strong> to pull the latest data. Rows appear here as soon as you add them to the sheet.<br/>
                <span style={{color:'var(--cyan)'}}>Sheet ID: 1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE</span>
              </div>
              {sheetLoading
                ?<div className="loading"><div className="spin"/><span>Fetching from Google Sheet…</span></div>
                :sheetRoutes.length===0
                  ?<div className="empty"><div className="empty-icon">🗺</div><div className="empty-t">No Rows Found</div><div className="empty-d">Add rows to your Google Sheet and click Sync Now</div></div>
                  :<div className="tw">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>#</th>
                          {Object.keys(sheetRoutes[0]||{}).map(col=><th key={col}>{col}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {sheetRoutes.map((row,i)=>(
                          <tr key={i}>
                            <td style={{color:'var(--text3)',fontSize:'0.7rem'}}>{i+1}</td>
                            {Object.keys(sheetRoutes[0]||{}).map(col=>(
                              <td key={col} style={{fontSize:'0.76rem',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                {col.toLowerCase().includes('url')||col.toLowerCase().includes('link')
                                  ?row[col]
                                    ?<a href={row[col]} target="_blank" rel="noreferrer" style={{color:'var(--green)',fontSize:'0.7rem'}}>✅ Link</a>
                                    :<span style={{color:'var(--red)',fontSize:'0.7rem'}}>❌</span>
                                  :<span style={{color:col.toLowerCase().includes('name')||col.toLowerCase().includes('file')?'var(--cyan)':'var(--text2)'}}>{row[col]||'—'}</span>
                                }
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              }
              <div style={{marginTop:'1rem',padding:'0.9rem',background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,fontSize:'0.76rem',color:'var(--text2)'}}>
                💡 <strong style={{color:'var(--gold)'}}>How to add routes:</strong> Open your Google Sheet → Add a new row with file name, Google Drive link, port name, type, keywords → The sheet auto-updates via App Script → Click <strong>Sync Now</strong> to reflect here.
              </div>
            </>
          )}

          {section==='sheet-charts'&&(
            <>
              <div className="a-hdr">
                <div className="a-title">🔄 Google Sheet — ECDIS Charts</div>
                <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                  <span className="badge badge-gold">{sheetCharts.length} rows</span>
                  <button className="btn btn-gold" style={{padding:'5px 12px',fontSize:'0.72rem'}} onClick={refreshSheets} disabled={sheetLoading}>
                    {sheetLoading?'⏳ Syncing…':'🔄 Sync Now'}
                  </button>
                </div>
              </div>
              <div className="info-box" style={{fontSize:'0.74rem'}}>
                📡 <strong style={{color:'var(--text)'}}>Live Google Sheet Database</strong> — includes ECDIS model info. Auto-refreshes from your Google Drive / App Script pipeline.<br/>
                <span style={{color:'var(--gold)'}}>Sheet ID: 1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA</span>
              </div>
              {sheetLoading
                ?<div className="loading"><div className="spin"/><span>Fetching from Google Sheet…</span></div>
                :sheetCharts.length===0
                  ?<div className="empty"><div className="empty-icon">📊</div><div className="empty-t">No Rows Found</div><div className="empty-d">Add rows to your ECDIS Charts Google Sheet and click Sync Now</div></div>
                  :<>
                    {/* Brand summary cards */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:6,marginBottom:'1rem'}}>
                      {ECDIS_BRANDS.map(b=>{
                        const brandCol=Object.keys(sheetCharts[0]||{}).find(k=>k.toLowerCase().includes('brand')||k.toLowerCase().includes('ecdis'));
                        const cnt=brandCol?sheetCharts.filter(r=>r[brandCol]?.toLowerCase().includes(b.name.toLowerCase())||r[brandCol]?.toLowerCase().includes(b.id)).length:0;
                        if(cnt===0)return null;
                        return(
                          <div key={b.id} style={{padding:'8px',borderRadius:9,border:`1px solid ${b.color}55`,background:`${b.color}11`,textAlign:'center'}}>
                            <div style={{fontSize:'1.1rem'}}>{b.emoji}</div>
                            <div style={{fontSize:'0.58rem',fontFamily:'Orbitron,monospace',fontWeight:700,color:b.color}}>{b.name}</div>
                            <div style={{fontSize:'0.65rem',color:'var(--green)',fontWeight:700}}>{cnt} chart{cnt>1?'s':''}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="tw">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>#</th>
                            {Object.keys(sheetCharts[0]||{}).map(col=><th key={col}>{col}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetCharts.map((row,i)=>{
                            const brandCol=Object.keys(row).find(k=>k.toLowerCase().includes('brand')||k.toLowerCase().includes('ecdis'));
                            const brand=brandCol?ECDIS_BRANDS.find(b=>row[brandCol]?.toLowerCase().includes(b.name.toLowerCase())||row[brandCol]?.toLowerCase().includes(b.id)):null;
                            return(
                              <tr key={i}>
                                <td style={{color:'var(--text3)',fontSize:'0.7rem'}}>{i+1}</td>
                                {Object.keys(sheetCharts[0]||{}).map(col=>(
                                  <td key={col} style={{fontSize:'0.76rem',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                    {col.toLowerCase().includes('url')||col.toLowerCase().includes('link')
                                      ?row[col]
                                        ?<a href={row[col]} target="_blank" rel="noreferrer" style={{color:'var(--green)',fontSize:'0.7rem'}}>✅ Link</a>
                                        :<span style={{color:'var(--red)',fontSize:'0.7rem'}}>❌</span>
                                      :col===brandCol&&brand
                                        ?<span style={{color:brand.color,fontWeight:600}}>{brand.emoji} {row[col]}</span>
                                        :<span style={{color:col.toLowerCase().includes('model')?'#A78BFA':col.toLowerCase().includes('name')||col.toLowerCase().includes('file')?'var(--gold)':'var(--text2)'}}>{row[col]||'—'}</span>
                                    }
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
              }
              <div style={{marginTop:'1rem',padding:'0.9rem',background:'var(--card)',border:'1px solid var(--border)',borderRadius:10,fontSize:'0.76rem',color:'var(--text2)'}}>
                💡 <strong style={{color:'var(--gold)'}}>How to add charts:</strong> Open your ECDIS Charts Google Sheet → Add a row with file name, brand, ECDIS model, port, Google Drive link → App Script updates the sheet → Click <strong>Sync Now</strong> here.
              </div>
            </>
          )}

          {section==='users'&&(
            <>
              <div className="a-hdr">
                <div className="a-title">👥 User Database</div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                  <span className="badge badge-green">{users.length} registered</span>
                  <span className="badge" style={{background:'rgba(255,60,60,0.15)',color:'#ff6b6b',border:'1px solid rgba(255,60,60,0.3)'}}>
                    {users.filter(u=>u.blocked).length} blocked
                  </span>
                  <button className="btn btn-secondary" style={{padding:'5px 10px',fontSize:'0.72rem'}} onClick={loadUsers}>🔄 Refresh</button>
                </div>
              </div>
              <div className="info-box">
                🛡 <strong style={{color:'var(--text)'}}>Access Control</strong> — Block suspicious users instantly. Blocked users are auto-logged out and shown a warning with your contact info when they try to login again.
              </div>
              {users.length===0
                ?<div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users appear here after they register</div></div>
                :<div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Status</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>{users.map((u,i)=>(
                      <tr key={u.id} style={{opacity:u.blocked?0.7:1,background:u.blocked?'rgba(255,60,60,0.04)':'transparent'}}>
                        <td style={{color:'var(--text3)'}}>{i+1}</td>
                        <td style={{color:u.blocked?'#ff6b6b':'var(--cyan)',fontWeight:600}}>
                          {u.blocked&&<span style={{marginRight:4}}>⛔</span>}{u.name||'—'}
                        </td>
                        <td style={{color:'var(--text2)',fontSize:'0.78rem'}}>{u.email}</td>
                        <td style={{color:'var(--gold)',fontSize:'0.78rem'}}>{u.phone||'—'}</td>
                        <td style={{color:'var(--text2)',fontSize:'0.72rem'}}>{u.createdAt?.toDate?.()?.toLocaleDateString()||'—'}</td>
                        <td>
                          {u.blocked
                            ?<span style={{background:'rgba(255,60,60,0.15)',color:'#ff6b6b',border:'1px solid rgba(255,60,60,0.3)',borderRadius:5,padding:'2px 8px',fontSize:'0.68rem',fontWeight:700}}>⛔ BLOCKED</span>
                            :<span style={{background:'rgba(0,200,100,0.12)',color:'var(--green)',border:'1px solid rgba(0,200,100,0.25)',borderRadius:5,padding:'2px 8px',fontSize:'0.68rem',fontWeight:700}}>✅ ACTIVE</span>
                          }
                        </td>
                        <td>
                          {u.blocked
                            ?<button
                                style={{background:'rgba(0,200,100,0.15)',color:'var(--green)',border:'1px solid rgba(0,200,100,0.3)',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',fontWeight:700,cursor:'pointer'}}
                                onClick={()=>unblockUser(u)}>
                                ✅ Unblock
                              </button>
                            :<button
                                style={{background:'rgba(255,60,60,0.12)',color:'#ff6b6b',border:'1px solid rgba(255,60,60,0.3)',borderRadius:6,padding:'4px 10px',fontSize:'0.68rem',fontWeight:700,cursor:'pointer'}}
                                onClick={()=>{if(window.confirm(`Block ${u.name||u.email}? They will be logged out immediately.`))blockUser(u);}}>
                                ⛔ Block
                              </button>
                          }
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [tab,setTab]=useState('home');
  const [searchQ,setSearchQ]=useState('');
  const [notif,setNotif]=useState(null);
  const [menuOpen,setMenuOpen]=useState(false);
  const [user,setUser]=useState(null);
  const [userProfile,setUserProfile]=useState(null);
  const [isBlocked,setIsBlocked]=useState(false);
  const [routes,setRoutes]=useState([]);
  const [charts,setCharts]=useState([]);
  const [loading,setLoading]=useState(true);
  // Google Sheet live data (separate)
  const [sheetRoutes,setSheetRoutes]=useState([]);
  const [sheetCharts,setSheetCharts]=useState([]);
  const [sheetLoading,setSheetLoading]=useState(false);

  const isAdmin = user?.email===ADMIN_EMAIL;

  const notify=(msg,type='success')=>setNotif({msg,type,key:Date.now()});

  const fetchSheets=()=>{
    setSheetLoading(true);
    const ROUTE_TABS=["Sheet1","Routes","Route","Data","Sheet2"];
    const fetchRouteSheet=()=>
      ROUTE_TABS.reduce(
        (chain,tab)=>chain.catch(()=>
          fetch(`https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/${tab}`)
            .then(r=>{if(!r.ok)throw new Error();return r.json();})
            .then(d=>{if(!Array.isArray(d)||d.length===0)throw new Error();return d;})
        ),
        Promise.reject()
      ).catch(()=>[]);
    Promise.all([fetchRouteSheet(),fetchChartSheet(),fetchPortsSheet()])
      .then(([d1,d2,d3])=>{
        setSheetRoutes(Array.isArray(d1)?d1:[]);
        setSheetCharts(Array.isArray(d2)?d2:[]);
        // Merge Google Sheet ports into PORTS_DB (sheet overrides seed for same id)
        if(Array.isArray(d3)&&d3.length>0){
          const sheetPorts=d3.map(normalizePortRow).filter(Boolean);
          const seedIds=new Set(PORTS_DB.map(p=>p.id));
          const extras=sheetPorts.filter(p=>!seedIds.has(p.id));
          // Update seed entries with sheet data where available
          sheetPorts.forEach(sp=>{
            const idx=PORTS_DB.findIndex(p=>p.id===sp.id||p.name.toLowerCase()===sp.name.toLowerCase());
            if(idx>=0) PORTS_DB[idx]={...PORTS_DB[idx],...sp};
          });
          PORTS_DB=[...PORTS_DB,...extras];
        }
      }).catch(e=>console.log('Sheet fetch error',e))
      .finally(()=>setSheetLoading(false));
  };

  useEffect(()=>{fetchSheets();},[]);
  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async u=>{
      setUser(u);
      if(u){
        try{
          const {getDoc,doc:firestoreDoc}=await import('firebase/firestore');
          const snap=await getDoc(firestoreDoc(db,'users',u.uid));
          if(snap.exists()){
            const profile={id:snap.id,...snap.data()};
            if(profile.blocked){
              // Auto logout blocked user
              setIsBlocked(true);
              await signOut(auth);
              setUser(null);
              setUserProfile(null);
              return;
            }
            setIsBlocked(false);
            setUserProfile(profile);
          } else {
            setIsBlocked(false);
            setUserProfile(null);
          }
        }catch{setUserProfile(null);setIsBlocked(false);}
      }else{
        setUserProfile(null);
        // Don't reset isBlocked here — we want to keep showing the warning
      }
    });
    return()=>unsub();
  },[]);
  useEffect(()=>{
    const load=async()=>{
      try{
        const[rs,cs]=await Promise.all([getDocs(collection(db,'routes')),getDocs(collection(db,'charts'))]);
        setRoutes(rs.docs.map(d=>({id:d.id,...d.data()})));
        setCharts(cs.docs.map(d=>({id:d.id,...d.data()})));
      }catch(e){console.log('Load error',e);}
      setLoading(false);
    };
    load();
  },[]);

  const TABS=[
    {k:'home',    i:'🏠', l:'Home'},
    {k:'routes',  i:'🗺', l:'Routes'},
    {k:'charts',  i:'📊', l:'Charts',  cls:'gold'},
    {k:'planner', i:'✏️', l:'Planner', cls:'green'},
    {k:'ports',   i:'⚓', l:'Ports'},
    ...(isAdmin?[{k:'admin',i:'🛡',l:'Admin'}]:[]),
  ];

  const handleSearch=(q)=>{setSearchQ(q);setTab('routes');setMenuOpen(false);};
  const switchTab=k=>{setTab(k);setMenuOpen(false);};

  // Planner needs full height
  const isPlannerFull=tab==='planner';

  return(
    <>
      <style>{S}</style>
      <div className="grid-bg"/>
      <div className="app">
        {/* NAV */}
        <nav className="nav">
          <div className="nav-brand">
            <div className="nav-logo">🧭</div>
            <div>
              <div className="nav-title">ECDIS Route Finder</div>
              <div className="nav-sub">Maritime Navigation System</div>
            </div>
          </div>
          <div className="nav-tabs">
            {TABS.map(t=>(
              <button key={t.k} className={`ntab ${t.cls||''} ${tab===t.k?'active':''}`} onClick={()=>switchTab(t.k)}>
                {t.i} {t.l}
              </button>
            ))}
            {user
              ?<div className="uc" onClick={()=>{signOut(auth);notify('Logged out','info');}}>
                👤 {userProfile?.name?.split(' ')[0]||user.email.split('@')[0]}{isAdmin?' 🛡':''} · Logout
              </div>
              :<button className="ntab" onClick={()=>switchTab('login')}>🔐 Login</button>
            }
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div className="sd"/>
            <button className="burger" onClick={()=>setMenuOpen(o=>!o)}><span/><span/><span/></button>
          </div>
        </nav>

        {/* MOBILE MENU */}
        <div className={`mob-menu ${menuOpen?'open':''}`}>
          {TABS.map(t=><button key={t.k} className={`mtab ${tab===t.k?'active':''}`} onClick={()=>switchTab(t.k)}>{t.i} {t.l}</button>)}
          {user
            ?<button className="mtab" onClick={()=>{signOut(auth);notify('Logged out','info');setMenuOpen(false);}}>
              🚪 Logout ({userProfile?.name?.split(' ')[0]||user.email.split('@')[0]})
            </button>
            :<button className="mtab" onClick={()=>switchTab('login')}>🔐 Login / Register</button>
          }
        </div>

        {/* BLOCKED USER WARNING SCREEN */}
        {isBlocked&&(
          <div style={{position:'fixed',inset:0,background:'var(--bg)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1.5rem'}}>
            <div style={{maxWidth:400,width:'100%',background:'var(--card)',border:'2px solid rgba(255,60,60,0.5)',borderRadius:16,padding:'2rem',textAlign:'center',boxShadow:'0 0 40px rgba(255,60,60,0.2)'}}>
              <div style={{fontSize:'3.5rem',marginBottom:'1rem'}}>⚠️</div>
              <div style={{fontFamily:'Orbitron,monospace',fontSize:'1rem',fontWeight:700,color:'#ff6b6b',marginBottom:'0.5rem',letterSpacing:1}}>
                ACCESS SUSPENDED
              </div>
              <div style={{fontSize:'0.82rem',color:'var(--text2)',lineHeight:1.6,marginBottom:'1.2rem'}}>
                Suspicious or unauthorised login activity has been detected on your account. Your access has been suspended by the administrator.
              </div>
              <div style={{background:'rgba(255,60,60,0.08)',border:'1px solid rgba(255,60,60,0.2)',borderRadius:10,padding:'12px',marginBottom:'1.4rem',fontSize:'0.76rem',color:'var(--text2)'}}>
                If you believe this is a mistake, please contact the owner to restore your access.
              </div>
              <a
                href="https://www.instagram.com/manish_the_navigator"
                target="_blank"
                rel="noreferrer"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                  background:'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)',
                  color:'white',borderRadius:10,padding:'12px 20px',textDecoration:'none',
                  fontWeight:700,fontSize:'0.85rem',marginBottom:'1rem'}}>
                <span style={{fontSize:'1.2rem'}}>📸</span> Contact on Instagram
              </a>
              <div style={{fontSize:'0.68rem',color:'var(--text3)'}}>@manish_the_navigator</div>
              <button
                style={{marginTop:'1rem',background:'transparent',border:'1px solid var(--border)',color:'var(--text3)',borderRadius:8,padding:'6px 16px',fontSize:'0.7rem',cursor:'pointer'}}
                onClick={()=>setIsBlocked(false)}>
                Dismiss
              </button>
            </div>
          </div>
        )}
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflow:isPlannerFull?'hidden':'auto'}}>
          {loading&&<div className="loading"><div className="spin"/><span>Connecting to Firebase…</span></div>}
          {!loading&&tab==='home'    &&<HomePage routes={routes} charts={charts} onSearch={handleSearch} setTab={switchTab} user={user}/>}
          {!loading&&tab==='routes'  &&<RoutesPage routes={routes} sheetRoutes={sheetRoutes} searchQuery={searchQ} notify={notify} user={user} setTab={switchTab}/>}
          {!loading&&tab==='charts'  &&<ChartsPage charts={charts} sheetCharts={sheetCharts} notify={notify} user={user} setTab={switchTab} isAdmin={isAdmin}/>}
          {!loading&&tab==='planner' &&<RoutePlannerPage notify={notify} sheetRoutes={[...routes,...sheetRoutes]}/>}
          {!loading&&tab==='ports'   &&<PortSearchPage sheetLoading={sheetLoading} refreshSheets={fetchSheets}/>}
          {!loading&&tab==='login'   &&<LoginPage notify={notify} onLogin={u=>{setUser(u);setTab('home');}}/>}
          {!loading&&tab==='admin'   &&(isAdmin
            ?<AdminPage notify={notify} routes={routes} setRoutes={setRoutes} charts={charts} setCharts={setCharts} sheetRoutes={sheetRoutes} sheetCharts={sheetCharts} refreshSheets={fetchSheets} sheetLoading={sheetLoading}/>
            :<div className="section"><div className="empty"><div className="empty-icon">🔒</div><div className="empty-t">Admin Access Only</div><div className="empty-d">Please login with admin credentials to access this panel.</div></div></div>
          )}
        </div>

        {/* FOOTER */}
        {tab!=='planner'&&<Footer/>}

        {/* NOTIFICATION */}
        {notif&&<Notif key={notif.key} msg={notif.msg} type={notif.type} onClose={()=>setNotif(null)}/>}
      </div>
    </>
  );
}
