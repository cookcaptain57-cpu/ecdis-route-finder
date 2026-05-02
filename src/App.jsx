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

// ─── PORTS DATABASE (World Major Ports) ──────────────────────────────────────
const PORTS_DB = [
  // ── INDIA ──
  {id:"MUM",name:"Mumbai",city:"Mumbai",country:"India",lat:18.93,lon:72.83,keywords:"mum mumbai bombay nhava sheva jnpt india"},
  {id:"CHE",name:"Chennai",city:"Chennai",country:"India",lat:13.08,lon:80.29,keywords:"che chennai madras india"},
  {id:"KOC",name:"Kochi",city:"Kochi",country:"India",lat:9.97,lon:76.27,keywords:"koc kochi cochin india kerala"},
  {id:"KAN",name:"Kandla",city:"Kandla",country:"India",lat:23.01,lon:70.22,keywords:"kan kandla deendayal india gujarat"},
  {id:"VIS",name:"Visakhapatnam",city:"Visakhapatnam",country:"India",lat:17.69,lon:83.29,keywords:"vis visakhapatnam vizag india"},
  {id:"PAR",name:"Paradip",city:"Paradip",country:"India",lat:20.32,lon:86.61,keywords:"par paradip india odisha"},
  {id:"HAL",name:"Haldia",city:"Haldia",country:"India",lat:22.03,lon:88.07,keywords:"hal haldia kolkata india west bengal"},
  {id:"TUT",name:"Tuticorin",city:"Tuticorin",country:"India",lat:8.80,lon:78.14,keywords:"tut tuticorin voc port india tamilnadu"},
  {id:"NEW",name:"New Mangalore",city:"Mangalore",country:"India",lat:12.90,lon:74.82,keywords:"new mangalore india karnataka"},
  {id:"MOR",name:"Mormugao",city:"Goa",country:"India",lat:15.41,lon:73.80,keywords:"mor mormugao goa india"},
  {id:"ENN",name:"Ennore",city:"Chennai",country:"India",lat:13.22,lon:80.32,keywords:"enn ennore kamarajar india"},
  {id:"POR",name:"Port Blair",city:"Andaman",country:"India",lat:11.67,lon:92.75,keywords:"por port blair andaman india"},
  // ── PAKISTAN ──
  {id:"KAR",name:"Karachi",city:"Karachi",country:"Pakistan",lat:24.86,lon:67.01,keywords:"kar karachi pakistan"},
  {id:"QPQ",name:"Qasim",city:"Karachi",country:"Pakistan",lat:24.78,lon:67.32,keywords:"qpq qasim port karachi pakistan"},
  {id:"GWD",name:"Gwadar",city:"Gwadar",country:"Pakistan",lat:25.12,lon:62.33,keywords:"gwd gwadar pakistan cpec"},
  // ── SRI LANKA ──
  {id:"COL",name:"Colombo",city:"Colombo",country:"Sri Lanka",lat:6.94,lon:79.85,keywords:"col colombo srilanka lanka"},
  {id:"HAM2",name:"Hambantota",city:"Hambantota",country:"Sri Lanka",lat:6.12,lon:81.11,keywords:"ham hambantota srilanka"},
  {id:"TRI",name:"Trincomalee",city:"Trincomalee",country:"Sri Lanka",lat:8.57,lon:81.23,keywords:"tri trincomalee srilanka"},
  // ── BANGLADESH ──
  {id:"CTG",name:"Chittagong",city:"Chittagong",country:"Bangladesh",lat:22.34,lon:91.82,keywords:"ctg chittagong bangladesh"},
  {id:"MGL",name:"Mongla",city:"Mongla",country:"Bangladesh",lat:22.49,lon:89.59,keywords:"mgl mongla bangladesh"},
  // ── MYANMAR ──
  {id:"RGN",name:"Rangoon",city:"Yangon",country:"Myanmar",lat:16.78,lon:96.17,keywords:"rgn yangon rangoon myanmar burma"},
  {id:"SIT",name:"Sittwe",city:"Sittwe",country:"Myanmar",lat:20.15,lon:92.90,keywords:"sit sittwe myanmar"},
  // ── THAILAND ──
  {id:"LEM",name:"Laem Chabang",city:"Laem Chabang",country:"Thailand",lat:13.08,lon:100.88,keywords:"lem laem chabang thailand bangkok"},
  {id:"BKK",name:"Bangkok",city:"Bangkok",country:"Thailand",lat:13.59,lon:100.60,keywords:"bkk bangkok thailand"},
  {id:"MAP",name:"Map Ta Phut",city:"Rayong",country:"Thailand",lat:12.67,lon:101.15,keywords:"map ta phut rayong thailand"},
  {id:"PKT",name:"Phuket",city:"Phuket",country:"Thailand",lat:7.88,lon:98.40,keywords:"pkt phuket thailand"},
  // ── MALAYSIA ──
  {id:"PKL",name:"Port Klang",city:"Klang",country:"Malaysia",lat:3.00,lon:101.37,keywords:"pkl port klang klang malaysia"},
  {id:"JHB",name:"Johor",city:"Johor Bahru",country:"Malaysia",lat:1.46,lon:103.89,keywords:"jhb johor bahru pasir gudang malaysia"},
  {id:"PGU",name:"Penang",city:"Penang",country:"Malaysia",lat:5.41,lon:100.34,keywords:"pgu penang george town malaysia"},
  {id:"MYY",name:"Miri",city:"Miri",country:"Malaysia",lat:4.39,lon:113.99,keywords:"myy miri sarawak malaysia borneo"},
  {id:"KCH",name:"Kuching",city:"Kuching",country:"Malaysia",lat:1.56,lon:110.34,keywords:"kch kuching sarawak malaysia"},
  {id:"BKI",name:"Kota Kinabalu",city:"Kota Kinabalu",country:"Malaysia",lat:5.98,lon:116.07,keywords:"bki kota kinabalu sabah malaysia"},
  // ── SINGAPORE ──
  {id:"SIN",name:"Singapore",city:"Singapore",country:"Singapore",lat:1.29,lon:103.85,keywords:"sin singapore jurong tuas"},
  // ── INDONESIA ──
  {id:"JAK",name:"Jakarta",city:"Jakarta",country:"Indonesia",lat:-6.11,lon:106.88,keywords:"jak jakarta tanjung priok indonesia"},
  {id:"SBY",name:"Surabaya",city:"Surabaya",country:"Indonesia",lat:-7.21,lon:112.73,keywords:"sby surabaya tanjung perak indonesia"},
  {id:"MKS",name:"Makassar",city:"Makassar",country:"Indonesia",lat:-5.14,lon:119.41,keywords:"mks makassar indonesia sulawesi"},
  {id:"BDO",name:"Belawan",city:"Medan",country:"Indonesia",lat:3.78,lon:98.70,keywords:"bdo belawan medan indonesia sumatra"},
  {id:"BTH",name:"Batam",city:"Batam",country:"Indonesia",lat:1.13,lon:104.02,keywords:"bth batam indonesia"},
  {id:"PLM",name:"Palembang",city:"Palembang",country:"Indonesia",lat:-2.99,lon:104.76,keywords:"plm palembang indonesia sumatra"},
  {id:"BPN",name:"Balikpapan",city:"Balikpapan",country:"Indonesia",lat:-1.27,lon:116.83,keywords:"bpn balikpapan indonesia kalimantan borneo"},
  {id:"AMQ",name:"Ambon",city:"Ambon",country:"Indonesia",lat:-3.68,lon:128.18,keywords:"amq ambon indonesia maluku"},
  // ── PHILIPPINES ──
  {id:"MAN",name:"Manila",city:"Manila",country:"Philippines",lat:14.59,lon:120.98,keywords:"man manila philippines"},
  {id:"CEB",name:"Cebu",city:"Cebu",country:"Philippines",lat:10.29,lon:123.90,keywords:"ceb cebu philippines"},
  {id:"DVO",name:"Davao",city:"Davao",country:"Philippines",lat:7.07,lon:125.61,keywords:"dvo davao philippines mindanao"},
  {id:"SBT",name:"Subic Bay",city:"Olongapo",country:"Philippines",lat:14.80,lon:120.27,keywords:"sbt subic bay philippines"},
  // ── VIETNAM ──
  {id:"SGN",name:"Ho Chi Minh City",city:"Ho Chi Minh",country:"Vietnam",lat:10.78,lon:106.70,keywords:"sgn saigon ho chi minh city vietnam hcmc"},
  {id:"HAN",name:"Haiphong",city:"Haiphong",country:"Vietnam",lat:20.86,lon:106.68,keywords:"han haiphong vietnam hanoi"},
  {id:"DAD",name:"Da Nang",city:"Da Nang",country:"Vietnam",lat:16.10,lon:108.22,keywords:"dad da nang vietnam"},
  {id:"QNH",name:"Quy Nhon",city:"Quy Nhon",country:"Vietnam",lat:13.76,lon:109.22,keywords:"qnh quy nhon vietnam"},
  // ── CAMBODIA ──
  {id:"PNH",name:"Phnom Penh",city:"Phnom Penh",country:"Cambodia",lat:11.57,lon:104.93,keywords:"pnh phnom penh cambodia"},
  {id:"SHV",name:"Sihanoukville",city:"Sihanoukville",country:"Cambodia",lat:10.63,lon:103.52,keywords:"shv sihanoukville cambodia preah sihanouk"},
  // ── CHINA ──
  {id:"SHA",name:"Shanghai",city:"Shanghai",country:"China",lat:31.23,lon:121.47,keywords:"sha shanghai china yangshan"},
  {id:"HKG",name:"Hong Kong",city:"Hong Kong",country:"China",lat:22.29,lon:114.16,keywords:"hkg hong kong china kwai chung"},
  {id:"SZX",name:"Shenzhen",city:"Shenzhen",country:"China",lat:22.49,lon:113.90,keywords:"szx shenzhen yantian china"},
  {id:"GZH",name:"Guangzhou",city:"Guangzhou",country:"China",lat:23.09,lon:113.26,keywords:"gzh guangzhou nansha china canton"},
  {id:"NGB",name:"Ningbo",city:"Ningbo",country:"China",lat:29.87,lon:121.55,keywords:"ngb ningbo zhoushan china"},
  {id:"TJN",name:"Tianjin",city:"Tianjin",country:"China",lat:39.01,lon:117.67,keywords:"tjn tianjin xingang china beijing"},
  {id:"QIN",name:"Qingdao",city:"Qingdao",country:"China",lat:36.07,lon:120.38,keywords:"qin qingdao china"},
  {id:"DAL",name:"Dalian",city:"Dalian",country:"China",lat:38.92,lon:121.63,keywords:"dal dalian china"},
  {id:"XMN",name:"Xiamen",city:"Xiamen",country:"China",lat:24.45,lon:118.07,keywords:"xmn xiamen amoy china"},
  {id:"FOC",name:"Fuzhou",city:"Fuzhou",country:"China",lat:26.05,lon:119.31,keywords:"foc fuzhou china"},
  {id:"LZH",name:"Lianyungang",city:"Lianyungang",country:"China",lat:34.75,lon:119.44,keywords:"lzh lianyungang china"},
  {id:"YTN",name:"Yantai",city:"Yantai",country:"China",lat:37.55,lon:121.39,keywords:"ytn yantai china"},
  {id:"ZJG",name:"Zhanjiang",city:"Zhanjiang",country:"China",lat:21.19,lon:110.40,keywords:"zjg zhanjiang china"},
  {id:"HUZ",name:"Huangpu",city:"Guangzhou",country:"China",lat:23.10,lon:113.42,keywords:"huz huangpu guangzhou china"},
  // ── TAIWAN ──
  {id:"KHH",name:"Kaohsiung",city:"Kaohsiung",country:"Taiwan",lat:22.62,lon:120.27,keywords:"khh kaohsiung taiwan"},
  {id:"KEL",name:"Keelung",city:"Keelung",country:"Taiwan",lat:25.13,lon:121.74,keywords:"kel keelung taipei taiwan"},
  {id:"TXG",name:"Taichung",city:"Taichung",country:"Taiwan",lat:24.27,lon:120.52,keywords:"txg taichung taiwan"},
  // ── SOUTH KOREA ──
  {id:"BUS",name:"Busan",city:"Busan",country:"South Korea",lat:35.10,lon:129.04,keywords:"bus busan korea"},
  {id:"ICN",name:"Incheon",city:"Incheon",country:"South Korea",lat:37.47,lon:126.62,keywords:"icn incheon seoul korea"},
  {id:"KWJ",name:"Gwangyang",city:"Gwangyang",country:"South Korea",lat:34.91,lon:127.70,keywords:"kwj gwangyang korea"},
  {id:"USN",name:"Ulsan",city:"Ulsan",country:"South Korea",lat:35.54,lon:129.39,keywords:"usn ulsan korea"},
  // ── JAPAN ──
  {id:"YOK",name:"Yokohama",city:"Yokohama",country:"Japan",lat:35.45,lon:139.65,keywords:"yok yokohama tokyo japan"},
  {id:"KOB",name:"Kobe",city:"Kobe",country:"Japan",lat:34.68,lon:135.19,keywords:"kob kobe japan osaka"},
  {id:"NGY",name:"Nagoya",city:"Nagoya",country:"Japan",lat:35.06,lon:136.88,keywords:"ngy nagoya japan"},
  {id:"OSA",name:"Osaka",city:"Osaka",country:"Japan",lat:34.65,lon:135.43,keywords:"osa osaka japan"},
  {id:"TKY",name:"Tokyo",city:"Tokyo",country:"Japan",lat:35.65,lon:139.77,keywords:"tky tokyo japan"},
  {id:"CHB",name:"Chiba",city:"Chiba",country:"Japan",lat:35.58,lon:140.11,keywords:"chb chiba japan"},
  {id:"HKD",name:"Hakodate",city:"Hakodate",country:"Japan",lat:41.77,lon:140.73,keywords:"hkd hakodate hokkaido japan"},
  {id:"KGS",name:"Kagoshima",city:"Kagoshima",country:"Japan",lat:31.60,lon:130.57,keywords:"kgs kagoshima japan"},
  // ── UAE ──
  {id:"DXB",name:"Dubai",city:"Dubai",country:"UAE",lat:25.05,lon:55.13,keywords:"dxb dubai jebel ali uae emirates"},
  {id:"FUJ",name:"Fujairah",city:"Fujairah",country:"UAE",lat:25.12,lon:56.34,keywords:"fuj fujairah uae oman gulf"},
  {id:"AUH",name:"Abu Dhabi",city:"Abu Dhabi",country:"UAE",lat:24.48,lon:54.37,keywords:"auh abu dhabi uae zayed"},
  {id:"SHJ",name:"Sharjah",city:"Sharjah",country:"UAE",lat:25.37,lon:55.39,keywords:"shj sharjah uae khalid"},
  // ── OMAN ──
  {id:"MCT",name:"Muscat",city:"Muscat",country:"Oman",lat:23.62,lon:58.59,keywords:"mct muscat oman port sultan qaboos"},
  {id:"SLL",name:"Salalah",city:"Salalah",country:"Oman",lat:16.94,lon:54.00,keywords:"sll salalah oman"},
  {id:"SOH",name:"Sohar",city:"Sohar",country:"Oman",lat:24.35,lon:56.72,keywords:"soh sohar oman"},
  // ── QATAR ──
  {id:"DOH",name:"Doha",city:"Doha",country:"Qatar",lat:25.29,lon:51.55,keywords:"doh doha qatar hamad"},
  {id:"RKH",name:"Ras Laffan",city:"Ras Laffan",country:"Qatar",lat:25.91,lon:51.55,keywords:"rkh ras laffan qatar lng"},
  // ── BAHRAIN ──
  {id:"BAH",name:"Bahrain",city:"Manama",country:"Bahrain",lat:26.24,lon:50.63,keywords:"bah bahrain manama mina salman"},
  // ── KUWAIT ──
  {id:"KWI",name:"Kuwait",city:"Kuwait City",country:"Kuwait",lat:29.37,lon:47.99,keywords:"kwi kuwait shuaiba"},
  // ── SAUDI ARABIA ──
  {id:"JED",name:"Jeddah",city:"Jeddah",country:"Saudi Arabia",lat:21.49,lon:39.18,keywords:"jed jeddah saudi arabia red sea islamic"},
  {id:"DAM",name:"Dammam",city:"Dammam",country:"Saudi Arabia",lat:26.43,lon:50.10,keywords:"dam dammam king abdulaziz saudi arabia"},
  {id:"YAN",name:"Yanbu",city:"Yanbu",country:"Saudi Arabia",lat:24.09,lon:38.06,keywords:"yan yanbu saudi arabia red sea"},
  {id:"JUB",name:"Jubail",city:"Jubail",country:"Saudi Arabia",lat:27.01,lon:49.65,keywords:"jub jubail saudi arabia gulf"},
  {id:"RAB",name:"Rabigh",city:"Rabigh",country:"Saudi Arabia",lat:22.80,lon:39.02,keywords:"rab rabigh saudi arabia"},
  // ── IRAQ ──
  {id:"BAS",name:"Basra",city:"Basra",country:"Iraq",lat:30.52,lon:47.83,keywords:"bas basra iraq gulf umm qasr"},
  {id:"UMQ",name:"Umm Qasr",city:"Umm Qasr",country:"Iraq",lat:30.03,lon:47.92,keywords:"umq umm qasr iraq"},
  // ── IRAN ──
  {id:"BND",name:"Bandar Abbas",city:"Bandar Abbas",country:"Iran",lat:27.18,lon:56.27,keywords:"bnd bandar abbas iran hormuz"},
  {id:"KHK",name:"Khark Island",city:"Khark",country:"Iran",lat:29.23,lon:50.32,keywords:"khk kharg khark island iran oil"},
  {id:"BIK",name:"Bandar Imam",city:"Bandar Imam",country:"Iran",lat:30.44,lon:49.07,keywords:"bik bandar imam khomeini iran"},
  // ── YEMEN ──
  {id:"ADE",name:"Aden",city:"Aden",country:"Yemen",lat:12.77,lon:44.99,keywords:"ade aden yemen gulf"},
  {id:"HOD",name:"Hodeidah",city:"Hodeidah",country:"Yemen",lat:14.80,lon:42.95,keywords:"hod hodeidah hodeida yemen red sea"},
  // ── DJIBOUTI ──
  {id:"JIB",name:"Djibouti",city:"Djibouti",country:"Djibouti",lat:11.59,lon:43.14,keywords:"jib djibouti horn africa"},
  // ── ERITREA ──
  {id:"MSW",name:"Massawa",city:"Massawa",country:"Eritrea",lat:15.61,lon:39.47,keywords:"msw massawa eritrea red sea"},
  // ── EGYPT ──
  {id:"PSD",name:"Port Said",city:"Port Said",country:"Egypt",lat:31.26,lon:32.31,keywords:"psd port said egypt suez canal"},
  {id:"SUZ",name:"Suez",city:"Suez",country:"Egypt",lat:29.97,lon:32.55,keywords:"suz suez egypt canal"},
  {id:"ALX",name:"Alexandria",city:"Alexandria",country:"Egypt",lat:31.20,lon:29.89,keywords:"alx alexandria egypt mediterranean"},
  {id:"DKH",name:"Damietta",city:"Damietta",country:"Egypt",lat:31.45,lon:31.82,keywords:"dkh damietta egypt"},
  {id:"SFK",name:"Safaga",city:"Safaga",country:"Egypt",lat:26.73,lon:33.93,keywords:"sfk safaga egypt red sea"},
  // ── SUDAN ──
  {id:"PSD2",name:"Port Sudan",city:"Port Sudan",country:"Sudan",lat:19.62,lon:37.22,keywords:"psd2 port sudan red sea africa"},
  // ── KENYA ──
  {id:"MOM",name:"Mombasa",city:"Mombasa",country:"Kenya",lat:-4.05,lon:39.67,keywords:"mom mombasa kenya africa"},
  // ── TANZANIA ──
  {id:"DAR",name:"Dar es Salaam",city:"Dar es Salaam",country:"Tanzania",lat:-6.82,lon:39.28,keywords:"dar dar es salaam tanzania africa"},
  {id:"ZNZ",name:"Zanzibar",city:"Zanzibar",country:"Tanzania",lat:-6.16,lon:39.19,keywords:"znz zanzibar tanzania"},
  // ── MOZAMBIQUE ──
  {id:"MPM",name:"Maputo",city:"Maputo",country:"Mozambique",lat:-25.97,lon:32.58,keywords:"mpm maputo mozambique africa"},
  {id:"BEW",name:"Beira",city:"Beira",country:"Mozambique",lat:-19.84,lon:34.84,keywords:"bew beira mozambique"},
  {id:"NAC",name:"Nacala",city:"Nacala",country:"Mozambique",lat:-14.52,lon:40.68,keywords:"nac nacala mozambique"},
  // ── MADAGASCAR ──
  {id:"TNR",name:"Toamasina",city:"Toamasina",country:"Madagascar",lat:-18.16,lon:49.40,keywords:"tnr toamasina tamatave madagascar"},
  // ── SOUTH AFRICA ──
  {id:"DUR",name:"Durban",city:"Durban",country:"South Africa",lat:-29.87,lon:31.04,keywords:"dur durban south africa"},
  {id:"CPT",name:"Cape Town",city:"Cape Town",country:"South Africa",lat:-33.91,lon:18.43,keywords:"cpt cape town south africa good hope"},
  {id:"PLZ",name:"Port Elizabeth",city:"Port Elizabeth",country:"South Africa",lat:-33.96,lon:25.62,keywords:"plz port elizabeth gqeberha south africa"},
  {id:"ELS",name:"East London",city:"East London",country:"South Africa",lat:-33.02,lon:27.91,keywords:"els east london south africa"},
  {id:"RCB",name:"Richards Bay",city:"Richards Bay",country:"South Africa",lat:-28.80,lon:32.08,keywords:"rcb richards bay south africa"},
  // ── NAMIBIA ──
  {id:"WDH",name:"Walvis Bay",city:"Walvis Bay",country:"Namibia",lat:-22.96,lon:14.51,keywords:"wdh walvis bay namibia africa"},
  // ── ANGOLA ──
  {id:"LAD",name:"Luanda",city:"Luanda",country:"Angola",lat:-8.83,lon:13.23,keywords:"lad luanda angola africa"},
  // ── NIGERIA ──
  {id:"LAG",name:"Lagos",city:"Lagos",country:"Nigeria",lat:6.45,lon:3.39,keywords:"lag lagos apapa nigeria africa"},
  {id:"PHC",name:"Port Harcourt",city:"Port Harcourt",country:"Nigeria",lat:4.77,lon:7.01,keywords:"phc port harcourt nigeria"},
  {id:"WAR",name:"Warri",city:"Warri",country:"Nigeria",lat:5.52,lon:5.75,keywords:"war warri nigeria"},
  // ── GHANA ──
  {id:"TEM",name:"Tema",city:"Tema",country:"Ghana",lat:5.63,lon:0.01,keywords:"tem tema accra ghana africa"},
  {id:"TAK",name:"Takoradi",city:"Takoradi",country:"Ghana",lat:4.88,lon:-1.75,keywords:"tak takoradi ghana africa"},
  // ── IVORY COAST ──
  {id:"ABJ",name:"Abidjan",city:"Abidjan",country:"Ivory Coast",lat:5.35,lon:-4.02,keywords:"abj abidjan ivory coast cote d ivoire africa"},
  {id:"SAN",name:"San Pedro",city:"San Pedro",country:"Ivory Coast",lat:4.74,lon:-6.63,keywords:"san san pedro ivory coast"},
  // ── SENEGAL ──
  {id:"DKR",name:"Dakar",city:"Dakar",country:"Senegal",lat:14.69,lon:-17.44,keywords:"dkr dakar senegal west africa"},
  // ── MOROCCO ──
  {id:"TNG",name:"Tanger Med",city:"Tanger",country:"Morocco",lat:35.90,lon:-5.50,keywords:"tng tanger tangier med morocco mediterranean"},
  {id:"CAS",name:"Casablanca",city:"Casablanca",country:"Morocco",lat:33.60,lon:-7.63,keywords:"cas casablanca morocco"},
  // ── ALGERIA ──
  {id:"ALG",name:"Algiers",city:"Algiers",country:"Algeria",lat:36.77,lon:3.04,keywords:"alg algiers algeria mediterranean"},
  // ── TUNISIA ──
  {id:"TUN",name:"Tunis",city:"Tunis",country:"Tunisia",lat:37.33,lon:10.23,keywords:"tun tunis tunisia mediterranean"},
  // ── LIBYA ──
  {id:"TRP",name:"Tripoli",city:"Tripoli",country:"Libya",lat:32.89,lon:13.18,keywords:"trp tripoli libya"},
  // ── GREECE ──
  {id:"PIR",name:"Piraeus",city:"Athens",country:"Greece",lat:37.95,lon:23.63,keywords:"pir piraeus athens greece mediterranean"},
  {id:"THE",name:"Thessaloniki",city:"Thessaloniki",country:"Greece",lat:40.63,lon:22.95,keywords:"the thessaloniki greece"},
  {id:"VOL",name:"Volos",city:"Volos",country:"Greece",lat:39.36,lon:22.95,keywords:"vol volos greece"},
  // ── TURKEY ──
  {id:"IST",name:"Istanbul",city:"Istanbul",country:"Turkey",lat:41.01,lon:28.97,keywords:"ist istanbul turkey haydarpasa ambarlı"},
  {id:"IZM",name:"Izmir",city:"Izmir",country:"Turkey",lat:38.42,lon:27.14,keywords:"izm izmir turkey"},
  {id:"MER",name:"Mersin",city:"Mersin",country:"Turkey",lat:36.79,lon:34.62,keywords:"mer mersin turkey"},
  {id:"ISK",name:"Iskenderun",city:"Iskenderun",country:"Turkey",lat:36.59,lon:36.18,keywords:"isk iskenderun turkey"},
  // ── ISRAEL ──
  {id:"HAI",name:"Haifa",city:"Haifa",country:"Israel",lat:32.82,lon:35.00,keywords:"hai haifa israel"},
  {id:"ASH",name:"Ashdod",city:"Ashdod",country:"Israel",lat:31.81,lon:34.64,keywords:"ash ashdod israel"},
  // ── LEBANON ──
  {id:"BEY",name:"Beirut",city:"Beirut",country:"Lebanon",lat:33.90,lon:35.51,keywords:"bey beirut lebanon"},
  // ── SYRIA ──
  {id:"LAT",name:"Latakia",city:"Latakia",country:"Syria",lat:35.52,lon:35.77,keywords:"lat latakia syria"},
  // ── CYPRUS ──
  {id:"LMS",name:"Limassol",city:"Limassol",country:"Cyprus",lat:34.67,lon:33.04,keywords:"lms limassol cyprus"},
  // ── ITALY ──
  {id:"GEN",name:"Genoa",city:"Genoa",country:"Italy",lat:44.41,lon:8.93,keywords:"gen genoa italy mediterranean"},
  {id:"LIV",name:"Livorno",city:"Livorno",country:"Italy",lat:43.55,lon:10.31,keywords:"liv livorno leghorn italy"},
  {id:"NAP",name:"Naples",city:"Naples",country:"Italy",lat:40.84,lon:14.27,keywords:"nap naples italy"},
  {id:"TAR",name:"Taranto",city:"Taranto",country:"Italy",lat:40.47,lon:17.23,keywords:"tar taranto italy"},
  {id:"ANC",name:"Ancona",city:"Ancona",country:"Italy",lat:43.62,lon:13.51,keywords:"anc ancona italy adriatic"},
  {id:"VEN",name:"Venice",city:"Venice",country:"Italy",lat:45.44,lon:12.33,keywords:"ven venice venezia italy"},
  {id:"TRS",name:"Trieste",city:"Trieste",country:"Italy",lat:45.65,lon:13.78,keywords:"trs trieste italy"},
  // ── SPAIN ──
  {id:"BCN",name:"Barcelona",city:"Barcelona",country:"Spain",lat:41.38,lon:2.18,keywords:"bcn barcelona spain mediterranean"},
  {id:"VLC",name:"Valencia",city:"Valencia",country:"Spain",lat:39.46,lon:-0.32,keywords:"vlc valencia spain"},
  {id:"ALG2",name:"Algeciras",city:"Algeciras",country:"Spain",lat:36.13,lon:-5.45,keywords:"alg2 algeciras spain gibraltar"},
  {id:"BIL",name:"Bilbao",city:"Bilbao",country:"Spain",lat:43.36,lon:-3.04,keywords:"bil bilbao spain atlantic"},
  {id:"LPA",name:"Las Palmas",city:"Gran Canaria",country:"Spain",lat:28.10,lon:-15.41,keywords:"lpa las palmas gran canaria spain canary islands"},
  // ── PORTUGAL ──
  {id:"LIS",name:"Lisbon",city:"Lisbon",country:"Portugal",lat:38.71,lon:-9.14,keywords:"lis lisbon portugal atlantic"},
  {id:"SIN2",name:"Sines",city:"Sines",country:"Portugal",lat:37.96,lon:-8.87,keywords:"sin2 sines portugal"},
  {id:"LIX",name:"Leixoes",city:"Porto",country:"Portugal",lat:41.18,lon:-8.70,keywords:"lix leixoes porto portugal"},
  // ── FRANCE ──
  {id:"MRS",name:"Marseille",city:"Marseille",country:"France",lat:43.30,lon:5.37,keywords:"mrs marseille france fos mediterranean"},
  {id:"LEH",name:"Le Havre",city:"Le Havre",country:"France",lat:49.49,lon:0.11,keywords:"leh le havre france channel"},
  {id:"DKK",name:"Dunkirk",city:"Dunkirk",country:"France",lat:51.04,lon:2.37,keywords:"dkk dunkirk france"},
  {id:"NAN",name:"Nantes",city:"Nantes",country:"France",lat:47.21,lon:-1.55,keywords:"nan nantes saint nazaire france"},
  // ── BELGIUM ──
  {id:"ANT",name:"Antwerp",city:"Antwerp",country:"Belgium",lat:51.23,lon:4.42,keywords:"ant antwerp belgium europe"},
  {id:"ZBR",name:"Zeebrugge",city:"Bruges",country:"Belgium",lat:51.33,lon:3.20,keywords:"zbr zeebrugge bruges belgium"},
  // ── NETHERLANDS ──
  {id:"ROT",name:"Rotterdam",city:"Rotterdam",country:"Netherlands",lat:51.92,lon:4.48,keywords:"rot rotterdam netherlands europe europoort"},
  {id:"AMS",name:"Amsterdam",city:"Amsterdam",country:"Netherlands",lat:52.39,lon:4.90,keywords:"ams amsterdam netherlands"},
  // ── GERMANY ──
  {id:"HAM",name:"Hamburg",city:"Hamburg",country:"Germany",lat:53.54,lon:9.99,keywords:"ham hamburg germany europe"},
  {id:"BRE",name:"Bremen",city:"Bremen",country:"Germany",lat:53.08,lon:8.80,keywords:"bre bremen bremerhaven germany"},
  {id:"ROK",name:"Rostock",city:"Rostock",country:"Germany",lat:54.15,lon:12.10,keywords:"rok rostock germany baltic"},
  // ── UK ──
  {id:"FEL",name:"Felixstowe",city:"Felixstowe",country:"UK",lat:51.96,lon:1.35,keywords:"fel felixstowe uk england suffolk"},
  {id:"LON",name:"London",city:"London",country:"UK",lat:51.51,lon:0.12,keywords:"lon london tilbury thamesport uk"},
  {id:"LIV2",name:"Liverpool",city:"Liverpool",country:"UK",lat:53.40,lon:-3.00,keywords:"liv2 liverpool uk england"},
  {id:"GLA",name:"Glasgow",city:"Glasgow",country:"UK",lat:55.86,lon:-4.24,keywords:"gla glasgow uk scotland"},
  {id:"ABD",name:"Aberdeen",city:"Aberdeen",country:"UK",lat:57.15,lon:-2.07,keywords:"abd aberdeen uk scotland north sea"},
  {id:"SOU",name:"Southampton",city:"Southampton",country:"UK",lat:50.90,lon:-1.40,keywords:"sou southampton uk"},
  // ── IRELAND ──
  {id:"DUB",name:"Dublin",city:"Dublin",country:"Ireland",lat:53.35,lon:-6.22,keywords:"dub dublin ireland"},
  {id:"CRK",name:"Cork",city:"Cork",country:"Ireland",lat:51.90,lon:-8.47,keywords:"crk cork ireland"},
  // ── DENMARK ──
  {id:"CPH",name:"Copenhagen",city:"Copenhagen",country:"Denmark",lat:55.68,lon:12.57,keywords:"cph copenhagen denmark"},
  {id:"AAL",name:"Aalborg",city:"Aalborg",country:"Denmark",lat:57.05,lon:9.93,keywords:"aal aalborg denmark"},
  {id:"AAR",name:"Aarhus",city:"Aarhus",country:"Denmark",lat:56.15,lon:10.22,keywords:"aar aarhus denmark"},
  // ── SWEDEN ──
  {id:"GBG",name:"Gothenburg",city:"Gothenburg",country:"Sweden",lat:57.71,lon:11.97,keywords:"gbg gothenburg goteborg sweden"},
  {id:"STO",name:"Stockholm",city:"Stockholm",country:"Sweden",lat:59.33,lon:18.07,keywords:"sto stockholm sweden baltic"},
  // ── NORWAY ──
  {id:"OSL",name:"Oslo",city:"Oslo",country:"Norway",lat:59.91,lon:10.75,keywords:"osl oslo norway"},
  {id:"BGO",name:"Bergen",city:"Bergen",country:"Norway",lat:60.39,lon:5.32,keywords:"bgo bergen norway"},
  {id:"SVG",name:"Stavanger",city:"Stavanger",country:"Norway",lat:58.97,lon:5.73,keywords:"svg stavanger norway north sea"},
  // ── FINLAND ──
  {id:"HEL",name:"Helsinki",city:"Helsinki",country:"Finland",lat:60.17,lon:24.95,keywords:"hel helsinki finland baltic"},
  // ── ESTONIA ──
  {id:"TLL",name:"Tallinn",city:"Tallinn",country:"Estonia",lat:59.43,lon:24.75,keywords:"tll tallinn estonia baltic"},
  // ── LATVIA ──
  {id:"RIX",name:"Riga",city:"Riga",country:"Latvia",lat:56.95,lon:24.11,keywords:"rix riga latvia baltic"},
  // ── LITHUANIA ──
  {id:"KLJ",name:"Klaipeda",city:"Klaipeda",country:"Lithuania",lat:55.71,lon:21.13,keywords:"klj klaipeda lithuania baltic"},
  // ── POLAND ──
  {id:"GDN",name:"Gdansk",city:"Gdansk",country:"Poland",lat:54.35,lon:18.65,keywords:"gdn gdansk gdynia poland baltic"},
  // ── RUSSIA ──
  {id:"SPB",name:"St. Petersburg",city:"St. Petersburg",country:"Russia",lat:59.95,lon:30.32,keywords:"spb st petersburg russia baltic"},
  {id:"VVO",name:"Vladivostok",city:"Vladivostok",country:"Russia",lat:43.11,lon:131.88,keywords:"vvo vladivostok russia far east"},
  {id:"MMK",name:"Murmansk",city:"Murmansk",country:"Russia",lat:68.98,lon:33.09,keywords:"mmk murmansk russia arctic"},
  {id:"NKH",name:"Nakhodka",city:"Nakhodka",country:"Russia",lat:42.83,lon:132.90,keywords:"nkh nakhodka russia pacific"},
  // ── UKRAINE ──
  {id:"ODS",name:"Odessa",city:"Odessa",country:"Ukraine",lat:46.49,lon:30.73,keywords:"ods odessa ukraine black sea"},
  {id:"MKP",name:"Mykolaiv",city:"Mykolaiv",country:"Ukraine",lat:46.97,lon:31.98,keywords:"mkp mykolaiv ukraine black sea"},
  // ── ROMANIA ──
  {id:"CND",name:"Constanta",city:"Constanta",country:"Romania",lat:44.18,lon:28.65,keywords:"cnd constanta romania black sea"},
  // ── BULGARIA ──
  {id:"VAR",name:"Varna",city:"Varna",country:"Bulgaria",lat:43.20,lon:27.92,keywords:"var varna bulgaria black sea"},
  // ── GEORGIA ──
  {id:"BUS2",name:"Batumi",city:"Batumi",country:"Georgia",lat:41.64,lon:41.64,keywords:"bus2 batumi georgia black sea"},
  // ── USA (EAST COAST) ──
  {id:"NYK",name:"New York",city:"New York",country:"USA",lat:40.65,lon:-74.07,keywords:"nyk new york new jersey usa east coast"},
  {id:"BAL",name:"Baltimore",city:"Baltimore",country:"USA",lat:39.27,lon:-76.59,keywords:"bal baltimore usa east coast"},
  {id:"SAV",name:"Savannah",city:"Savannah",country:"USA",lat:32.08,lon:-81.09,keywords:"sav savannah usa east coast georgia"},
  {id:"CHS",name:"Charleston",city:"Charleston",country:"USA",lat:32.77,lon:-79.93,keywords:"chs charleston usa south carolina"},
  {id:"NOR",name:"Norfolk",city:"Norfolk",country:"USA",lat:36.85,lon:-76.30,keywords:"nor norfolk virginia usa"},
  {id:"MIA",name:"Miami",city:"Miami",country:"USA",lat:25.77,lon:-80.19,keywords:"mia miami florida usa"},
  {id:"JAX2",name:"Jacksonville",city:"Jacksonville",country:"USA",lat:30.33,lon:-81.65,keywords:"jax jacksonville florida usa"},
  {id:"HOU",name:"Houston",city:"Houston",country:"USA",lat:29.76,lon:-95.37,keywords:"hou houston texas usa gulf of mexico"},
  {id:"NOR2",name:"New Orleans",city:"New Orleans",country:"USA",lat:29.95,lon:-90.07,keywords:"nor2 new orleans louisiana usa"},
  // ── USA (WEST COAST) ──
  {id:"LAX",name:"Los Angeles",city:"Los Angeles",country:"USA",lat:33.74,lon:-118.27,keywords:"lax los angeles long beach usa west coast"},
  {id:"SEA",name:"Seattle",city:"Seattle",country:"USA",lat:47.60,lon:-122.33,keywords:"sea seattle tacoma usa west coast"},
  {id:"SFO",name:"San Francisco",city:"San Francisco",country:"USA",lat:37.79,lon:-122.39,keywords:"sfo san francisco oakland usa"},
  {id:"ANC2",name:"Anchorage",city:"Anchorage",country:"USA",lat:61.22,lon:-149.90,keywords:"anc2 anchorage alaska usa"},
  // ── CANADA ──
  {id:"VAN",name:"Vancouver",city:"Vancouver",country:"Canada",lat:49.29,lon:-123.11,keywords:"van vancouver canada west coast"},
  {id:"PRI",name:"Prince Rupert",city:"Prince Rupert",country:"Canada",lat:54.32,lon:-130.32,keywords:"pri prince rupert canada bc"},
  {id:"MON",name:"Montreal",city:"Montreal",country:"Canada",lat:45.50,lon:-73.57,keywords:"mon montreal canada"},
  {id:"HAL2",name:"Halifax",city:"Halifax",country:"Canada",lat:44.65,lon:-63.60,keywords:"hal2 halifax nova scotia canada"},
  // ── MEXICO ──
  {id:"LAZ",name:"Lazaro Cardenas",city:"Lazaro Cardenas",country:"Mexico",lat:17.95,lon:-102.19,keywords:"laz lazaro cardenas mexico pacific"},
  {id:"MZT",name:"Manzanillo",city:"Manzanillo",country:"Mexico",lat:19.05,lon:-104.32,keywords:"mzt manzanillo mexico pacific"},
  {id:"VER",name:"Veracruz",city:"Veracruz",country:"Mexico",lat:19.18,lon:-96.13,keywords:"ver veracruz mexico gulf"},
  {id:"ACA",name:"Acapulco",city:"Acapulco",country:"Mexico",lat:16.86,lon:-99.90,keywords:"aca acapulco mexico pacific"},
  // ── PANAMA ──
  {id:"BAL2",name:"Balboa",city:"Panama City",country:"Panama",lat:8.96,lon:-79.57,keywords:"bal2 balboa panama canal pacific"},
  {id:"CLN",name:"Colon",city:"Colon",country:"Panama",lat:9.36,lon:-79.90,keywords:"cln colon cristobal panama canal atlantic"},
  // ── COLOMBIA ──
  {id:"CTG2",name:"Cartagena",city:"Cartagena",country:"Colombia",lat:10.40,lon:-75.51,keywords:"ctg2 cartagena colombia caribbean"},
  {id:"BAQ",name:"Barranquilla",city:"Barranquilla",country:"Colombia",lat:10.97,lon:-74.80,keywords:"baq barranquilla colombia"},
  // ── VENEZUELA ──
  {id:"CCS",name:"La Guaira",city:"Caracas",country:"Venezuela",lat:10.60,lon:-66.93,keywords:"ccs la guaira caracas venezuela"},
  {id:"PBL",name:"Puerto Cabello",city:"Puerto Cabello",country:"Venezuela",lat:10.47,lon:-68.01,keywords:"pbl puerto cabello venezuela"},
  // ── BRAZIL ──
  {id:"SSL",name:"Santos",city:"Santos",country:"Brazil",lat:-23.96,lon:-46.33,keywords:"ssl santos sao paulo brazil"},
  {id:"RIO",name:"Rio de Janeiro",city:"Rio de Janeiro",country:"Brazil",lat:-22.90,lon:-43.17,keywords:"rio rio de janeiro brazil"},
  {id:"SSZ",name:"Paranagua",city:"Paranagua",country:"Brazil",lat:-25.52,lon:-48.51,keywords:"ssz paranagua brazil"},
  {id:"POA",name:"Porto Alegre",city:"Porto Alegre",country:"Brazil",lat:-30.03,lon:-51.24,keywords:"poa porto alegre brazil"},
  {id:"FOR",name:"Fortaleza",city:"Fortaleza",country:"Brazil",lat:-3.72,lon:-38.52,keywords:"for fortaleza brazil"},
  {id:"SLZ",name:"Sao Luis",city:"Sao Luis",country:"Brazil",lat:-2.52,lon:-44.28,keywords:"slz sao luis itaqui brazil"},
  {id:"MCZ",name:"Maceio",city:"Maceio",country:"Brazil",lat:-9.66,lon:-35.73,keywords:"mcz maceio brazil"},
  {id:"REC",name:"Recife",city:"Recife",country:"Brazil",lat:-8.05,lon:-34.88,keywords:"rec recife brazil"},
  {id:"SSA",name:"Salvador",city:"Salvador",country:"Brazil",lat:-12.97,lon:-38.50,keywords:"ssa salvador bahia brazil"},
  {id:"VIT",name:"Vitoria",city:"Vitoria",country:"Brazil",lat:-20.31,lon:-40.34,keywords:"vit vitoria brazil"},
  {id:"BEL",name:"Belem",city:"Belem",country:"Brazil",lat:-1.46,lon:-48.50,keywords:"bel belem para brazil amazon"},
  {id:"MNS",name:"Manaus",city:"Manaus",country:"Brazil",lat:-3.10,lon:-60.02,keywords:"mns manaus amazon brazil"},
  // ── ARGENTINA ──
  {id:"BUE",name:"Buenos Aires",city:"Buenos Aires",country:"Argentina",lat:-34.61,lon:-58.37,keywords:"bue buenos aires argentina exobra"},
  {id:"ROS",name:"Rosario",city:"Rosario",country:"Argentina",lat:-32.95,lon:-60.65,keywords:"ros rosario argentina"},
  {id:"BBQ",name:"Bahia Blanca",city:"Bahia Blanca",country:"Argentina",lat:-38.72,lon:-62.27,keywords:"bbq bahia blanca argentina"},
  // ── CHILE ──
  {id:"IQQ",name:"Iquique",city:"Iquique",country:"Chile",lat:-20.22,lon:-70.13,keywords:"iqq iquique chile pacific"},
  {id:"ANF",name:"Antofagasta",city:"Antofagasta",country:"Chile",lat:-23.65,lon:-70.40,keywords:"anf antofagasta chile"},
  {id:"VAP",name:"Valparaiso",city:"Valparaiso",country:"Chile",lat:-33.04,lon:-71.62,keywords:"vap valparaiso chile"},
  // ── PERU ──
  {id:"CAL",name:"Callao",city:"Lima",country:"Peru",lat:-12.05,lon:-77.14,keywords:"cal callao lima peru"},
  // ── ECUADOR ──
  {id:"GYE",name:"Guayaquil",city:"Guayaquil",country:"Ecuador",lat:-2.18,lon:-79.90,keywords:"gye guayaquil ecuador"},
  // ── AUSTRALIA ──
  {id:"SYD",name:"Sydney",city:"Sydney",country:"Australia",lat:-33.86,lon:151.21,keywords:"syd sydney botany australia"},
  {id:"MEL",name:"Melbourne",city:"Melbourne",country:"Australia",lat:-37.82,lon:144.97,keywords:"mel melbourne australia"},
  {id:"BNE",name:"Brisbane",city:"Brisbane",country:"Australia",lat:-27.47,lon:153.02,keywords:"bne brisbane australia"},
  {id:"ADL",name:"Adelaide",city:"Adelaide",country:"Australia",lat:-34.93,lon:138.60,keywords:"adl adelaide australia"},
  {id:"PER",name:"Perth",city:"Perth",country:"Australia",lat:-31.95,lon:115.86,keywords:"per perth fremantle australia"},
  {id:"DRW",name:"Darwin",city:"Darwin",country:"Australia",lat:-12.46,lon:130.84,keywords:"drw darwin australia"},
  {id:"TSV",name:"Townsville",city:"Townsville",country:"Australia",lat:-19.26,lon:146.81,keywords:"tsv townsville australia"},
  {id:"GLD",name:"Gladstone",city:"Gladstone",country:"Australia",lat:-23.84,lon:151.26,keywords:"gld gladstone australia"},
  {id:"HAY",name:"Hay Point",city:"Mackay",country:"Australia",lat:-21.29,lon:149.30,keywords:"hay hay point mackay australia coal"},
  {id:"DAM2",name:"Dampier",city:"Dampier",country:"Australia",lat:-20.66,lon:116.72,keywords:"dam2 dampier australia iron ore"},
  {id:"POH",name:"Port Hedland",city:"Port Hedland",country:"Australia",lat:-20.31,lon:118.58,keywords:"poh port hedland australia iron ore"},
  // ── NEW ZEALAND ──
  {id:"AKL",name:"Auckland",city:"Auckland",country:"New Zealand",lat:-36.84,lon:174.77,keywords:"akl auckland new zealand"},
  {id:"TRG",name:"Tauranga",city:"Tauranga",country:"New Zealand",lat:-37.69,lon:176.17,keywords:"trg tauranga new zealand"},
  // ── PAPUA NEW GUINEA ──
  {id:"POM",name:"Port Moresby",city:"Port Moresby",country:"Papua New Guinea",lat:-9.44,lon:147.18,keywords:"pom port moresby papua new guinea png"},
];

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

// ─── SEA CORRIDORS — named open-ocean waypoints ships actually use ────────────
const SEA_WP = {
  // Straits & Canals
  SUEZ_N:     {lat:31.27, lon:32.33, name:"Suez Canal North"},
  SUEZ_S:     {lat:29.92, lon:32.55, name:"Suez Canal South"},
  BAB:        {lat:12.58, lon:43.38, name:"Bab-el-Mandeb"},
  ADEN_G:     {lat:11.80, lon:45.50, name:"Gulf of Aden"},
  HORMUZ:     {lat:26.35, lon:56.50, name:"Strait of Hormuz"},
  HORMUZ_E:   {lat:24.00, lon:58.50, name:"Gulf of Oman East"},
  MALACCA_N:  {lat:5.60,  lon:100.30,name:"N.Malacca Strait"},
  MALACCA_S:  {lat:1.20,  lon:103.80,name:"S.Malacca/Singapore"},
  LOMBOK:     {lat:-8.50, lon:115.80,name:"Lombok Strait"},
  SUNDA:      {lat:-6.10, lon:105.70,name:"Sunda Strait"},
  PANAMA_P:   {lat:8.90,  lon:-79.50,name:"Panama Canal Pacific"},
  PANAMA_A:   {lat:9.38,  lon:-79.90,name:"Panama Canal Atlantic"},
  GIBRALTAR:  {lat:35.98, lon:-5.50, name:"Strait of Gibraltar"},
  DOVER:      {lat:51.05, lon:1.50,  name:"Dover Strait"},
  CAPE_GH:    {lat:-34.50,lon:18.00, name:"Cape of Good Hope"},
  CAPE_HORN:  {lat:-56.00,lon:-67.50,name:"Cape Horn"},
  // Open ocean corridor waypoints
  MED_W:      {lat:37.50, lon:5.00,  name:"W.Mediterranean"},
  MED_E:      {lat:34.50, lon:24.00, name:"E.Mediterranean"},
  RED_N:      {lat:27.50, lon:34.00, name:"N.Red Sea"},
  RED_S:      {lat:15.00, lon:41.50, name:"S.Red Sea"},
  IND_W:      {lat:10.00, lon:65.00, name:"W.Indian Ocean"},
  IND_C:      {lat:5.00,  lon:73.00, name:"C.Indian Ocean"},
  IND_NE:     {lat:8.00,  lon:83.00, name:"NE.Indian Ocean"},
  IND_SE:     {lat:-15.0, lon:80.00, name:"SE.Indian Ocean"},
  IND_S:      {lat:-30.0, lon:65.00, name:"S.Indian Ocean"},
  IND_SW:     {lat:-25.0, lon:40.00, name:"SW.Indian Ocean"},
  AFR_E:      {lat:-10.0, lon:42.00, name:"E.Africa Offshore"},
  SOCOTRA:    {lat:12.50, lon:54.00, name:"Socotra Passage"},
  LAKSHADWEEP:{lat:10.00, lon:72.50, name:"Lakshadweep Sea"},
  ANDAMAN:    {lat:10.50, lon:93.00, name:"Andaman Sea"},
  S_CHINA_N:  {lat:14.00, lon:112.00,name:"N.South China Sea"},
  S_CHINA_S:  {lat:3.00,  lon:108.00,name:"S.South China Sea"},
  PHILIP:     {lat:10.00, lon:122.00,name:"Philippine Sea"},
  EAST_CHINA: {lat:27.00, lon:124.00,name:"E.China Sea"},
  JAPAN_SEA:  {lat:37.00, lon:132.00,name:"Sea of Japan"},
  PAC_NW:     {lat:48.00, lon:160.00,name:"NW.Pacific"},
  PAC_NE:     {lat:40.00, lon:-150.0,name:"NE.Pacific"},
  PAC_C:      {lat:5.00,  lon:-140.0,name:"C.Pacific"},
  PAC_SW:     {lat:-20.0, lon:170.00,name:"SW.Pacific"},
  PAC_SE:     {lat:-20.0, lon:-90.00,name:"SE.Pacific"},
  ATLANTIC_N: {lat:45.00, lon:-30.00,name:"N.Atlantic"},
  ATLANTIC_C: {lat:20.00, lon:-35.00,name:"C.Atlantic"},
  ATLANTIC_S: {lat:-15.0, lon:-20.00,name:"S.Atlantic"},
  ATLANTIC_SW:{lat:-40.0, lon:-40.00,name:"SW.Atlantic"},
  CARIB:      {lat:15.00, lon:-75.00,name:"Caribbean Sea"},
  GULF_MEX:   {lat:25.00, lon:-90.00,name:"Gulf of Mexico"},
  AUS_S:      {lat:-38.0, lon:130.00,name:"S.Australia"},
  AUS_W:      {lat:-25.0, lon:108.00,name:"W.Australia"},
  AUS_N:      {lat:-12.0, lon:127.00,name:"N.Australia"},
  TIMOR:      {lat:-9.50, lon:127.00,name:"Timor Sea"},
  ARAFURA:    {lat:-12.0, lon:136.00,name:"Arafura Sea"},
  TORRES:     {lat:-10.5, lon:142.50,name:"Torres Strait"},
  CORAL:      {lat:-18.0, lon:152.00,name:"Coral Sea"},
  TASMAN:     {lat:-38.0, lon:157.00,name:"Tasman Sea"},
  BLACK_W:    {lat:43.00, lon:29.00, name:"W.Black Sea"},
  BASC:       {lat:47.00, lon:-5.00, name:"Bay of Biscay"},
  NORW:       {lat:62.00, lon:4.00,  name:"Norwegian Sea"},
  NORTH_SEA:  {lat:56.00, lon:3.00,  name:"North Sea"},
};

// ─── AUTO ROUTE — proper sea-lane based routing ───────────────────────────────
function buildAutoRoute(fromPort, toPort) {
  const from = PORTS_DB.find(p => p.id === fromPort);
  const to   = PORTS_DB.find(p => p.id === toPort);
  if (!from || !to) return [];

  // Region classifiers
  const R = {
    persGulf: p => p.lon>=48&&p.lon<58&&p.lat>22,
    gulfOman: p => p.lon>=56&&p.lon<62&&p.lat>=21&&p.lat<26,
    redSea:   p => p.lon>=32&&p.lon<44&&p.lat>=11&&p.lat<31,
    indW:     p => p.lon>=44&&p.lon<80&&p.lat>=-10&&p.lat<25,
    indSW:    p => p.lon>=30&&p.lon<80&&p.lat>=-35&&p.lat<-10,
    sriLanka: p => p.lon>=79&&p.lon<82&&p.lat>=5&&p.lat<10,
    bayBengal:p => p.lon>=80&&p.lon<97&&p.lat>=5&&p.lat<23,
    seAsia:   p => p.lon>=97&&p.lon<120&&p.lat>=-10&&p.lat<20,
    farEast:  p => p.lon>=120&&p.lat>=-5&&p.lat<45,
    china:    p => p.lon>=108&&p.lon<130&&p.lat>=18&&p.lat<42,
    japan:    p => p.lon>=129&&p.lat>=28&&p.lat<46,
    korea:    p => p.lon>=125&&p.lon<132&&p.lat>=33&&p.lat<38,
    med:      p => p.lon>-6&&p.lon<37&&p.lat>30&&p.lat<47,
    europe:   p => (p.lon<20&&p.lat>40)||(p.lon>=-10&&p.lon<25&&p.lat>50),
    ukNorth:  p => p.lon>=-10&&p.lon<5&&p.lat>=55&&p.lat<62,
    baltic:   p => p.lon>9&&p.lon<32&&p.lat>53&&p.lat<66,
    blackSea: p => p.lon>27&&p.lon<42&&p.lat>40&&p.lat<48,
    wAfrica:  p => p.lon>=-20&&p.lon<10&&p.lat>=-10&&p.lat<20,
    sAfrica:  p => p.lat<-20&&p.lon>10&&p.lon<40,
    eAfrica:  p => p.lon>=36&&p.lon<50&&p.lat>=-30&&p.lat<15,
    wAtl:     p => p.lon<-60&&p.lat>0&&p.lat<50,
    eastUS:   p => p.lon>=-82&&p.lon<-65&&p.lat>=24&&p.lat<47,
    gulfMex:  p => p.lon>=-100&&p.lon<-80&&p.lat>=18&&p.lat<32,
    carib:    p => p.lon>=-88&&p.lon<-60&&p.lat>=8&&p.lat<24,
    wCoast:   p => p.lon<=-100&&p.lat>=10&&p.lat<62,
    sPac:     p => p.lon>150||p.lon<-130&&p.lat<-10,
    australia:p => p.lon>=113&&p.lon<155&&p.lat>=-45&&p.lat<-10,
    sAtl:     p => p.lon>=-55&&p.lon<20&&p.lat<-10,
    sAmer:    p => p.lon>=-85&&p.lon<-30&&p.lat<10,
    canal:    p => p.lon>=-82&&p.lon<-75&&p.lat>6&&p.lat<12,
  };

  const via = (...pts) => pts; // chain of SEA_WP keys

  // Determine route chain between regions
  const wps = [];

  const addVia = (...keys) => keys.forEach(k => { if(SEA_WP[k]) wps.push(SEA_WP[k]); });

  const fR = Object.keys(R).find(k => R[k](from));
  const tR = Object.keys(R).find(k => R[k](to));

  // ── SAME-REGION SHORTCUTS ──────────────────────────────────────────────────
  // Persian Gulf <-> Gulf of Oman / Indian Ocean West
  if(R.persGulf(from)&&!R.persGulf(to)){addVia('HORMUZ','HORMUZ_E');}
  if(R.persGulf(to)&&!R.persGulf(from)){addVia('HORMUZ_E','HORMUZ');}

  // Red Sea / Gulf of Aden
  if(R.redSea(from)&&!R.redSea(to)){addVia('RED_S','BAB','ADEN_G','SOCOTRA');}
  if(R.redSea(to)&&!R.redSea(from)){addVia('SOCOTRA','ADEN_G','BAB','RED_S');}

  // Suez Canal needed when crossing between Mediterranean/Europe and Indian Ocean
  const needsSuez = (R.med(from)||R.europe(from)||R.blackSea(from)) &&
    (R.indW(to)||R.persGulf(to)||R.redSea(to)||R.eAfrica(to)||R.seAsia(to)||R.farEast(to)||R.bayBengal(to)||R.sriLanka(to));
  const needsSuezRev = (R.med(to)||R.europe(to)||R.blackSea(to)) &&
    (R.indW(from)||R.persGulf(from)||R.redSea(from)||R.eAfrica(from)||R.seAsia(from)||R.farEast(from)||R.bayBengal(from)||R.sriLanka(from));

  if(needsSuez){
    if(R.blackSea(from)) addVia('BLACK_W');
    if(R.europe(from)&&!R.med(from)) addVia('BASC','GIBRALTAR');
    if(R.ukNorth(from)) addVia('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    if(R.baltic(from)) addVia('NORTH_SEA','DOVER','BASC','GIBRALTAR');
    addVia('MED_W','MED_E','SUEZ_N','SUEZ_S','RED_N','RED_S','BAB','ADEN_G','SOCOTRA');
    if(R.persGulf(to)){addVia('HORMUZ_E','HORMUZ');}
    else if(R.indW(to)){addVia('IND_W');}
    else if(R.eAfrica(to)){addVia('AFR_E');}
    else if(R.bayBengal(to)||R.sriLanka(to)){addVia('IND_C','IND_NE');}
    else if(R.seAsia(to)){addVia('IND_C','LAKSHADWEEP','IND_NE','ANDAMAN','MALACCA_N','MALACCA_S');}
    else if(R.farEast(to)||R.china(to)||R.japan(to)){addVia('IND_C','IND_NE','ANDAMAN','MALACCA_N','MALACCA_S','S_CHINA_N');}
  }
  if(needsSuezRev){
    if(R.persGulf(from)){addVia('HORMUZ','HORMUZ_E');}
    else if(R.seAsia(from)||R.farEast(from)){addVia('S_CHINA_N','MALACCA_S','MALACCA_N','ANDAMAN','IND_NE','IND_C');}
    else if(R.bayBengal(from)){addVia('IND_NE','IND_C');}
    else if(R.eAfrica(from)){addVia('AFR_E','IND_W');}
    addVia('SOCOTRA','ADEN_G','BAB','RED_S','RED_N','SUEZ_S','SUEZ_N','MED_E','MED_W');
    if(R.blackSea(to)) addVia('BLACK_W');
    if(R.europe(to)&&!R.med(to)) addVia('GIBRALTAR','BASC');
    if(R.ukNorth(to)) addVia('GIBRALTAR','BASC','DOVER','NORTH_SEA');
    if(R.baltic(to)) addVia('GIBRALTAR','BASC','DOVER','NORTH_SEA');
  }

  // ── CAPE OF GOOD HOPE (when Suez is not used, going between oceans) ─────────
  const needsCape = !needsSuez && !needsSuezRev &&
    ((R.sAtl(from)||R.wAfrica(from)||R.sAmer(from)) && (R.indW(to)||R.eAfrica(to)||R.seAsia(to)||R.farEast(to)||R.australia(to))) ||
    ((R.sAtl(to)||R.wAfrica(to)||R.sAmer(to)) && (R.indW(from)||R.eAfrica(from)||R.seAsia(from)||R.farEast(from)||R.australia(from)));

  if(needsCape){
    const toIndian = R.indW(to)||R.eAfrica(to)||R.seAsia(to)||R.farEast(to)||R.australia(to);
    if(toIndian){ addVia('ATLANTIC_S','CAPE_GH','IND_S','IND_SW'); }
    else { addVia('IND_SW','IND_S','CAPE_GH','ATLANTIC_S'); }
  }

  // ── MALACCA STRAIT ──────────────────────────────────────────────────────────
  const needsMalacca = !needsSuez && !needsSuezRev && !needsCape && (
    ((R.indW(from)||R.bayBengal(from)||R.sriLanka(from))&&(R.seAsia(to)||R.farEast(to)||R.china(to)||R.japan(to)||R.korea(to))) ||
    ((R.seAsia(from)||R.farEast(from)||R.china(from)||R.japan(from)||R.korea(from))&&(R.indW(to)||R.bayBengal(to)||R.sriLanka(to)))
  );
  if(needsMalacca){
    const toEast=R.seAsia(to)||R.farEast(to)||R.china(to)||R.japan(to)||R.korea(to);
    if(toEast){ addVia('IND_NE','ANDAMAN','MALACCA_N','MALACCA_S'); }
    else { addVia('MALACCA_S','MALACCA_N','ANDAMAN','IND_NE'); }
  }

  // ── SOUTH CHINA SEA routing ──────────────────────────────────────────────────
  const needsSCS = !needsSuez && !needsSuezRev && !needsMalacca && (
    (R.seAsia(from)&&(R.farEast(to)||R.china(to)||R.japan(to)||R.korea(to))) ||
    ((R.farEast(from)||R.china(from)||R.japan(from)||R.korea(from))&&R.seAsia(to))
  );
  if(needsSCS){
    const toNorth=R.farEast(to)||R.china(to)||R.japan(to)||R.korea(to);
    if(toNorth){ addVia('S_CHINA_S','S_CHINA_N'); }
    else { addVia('S_CHINA_N','S_CHINA_S'); }
  }

  // ── FAR EAST internal routing ────────────────────────────────────────────────
  if(!needsSuez&&!needsSuezRev&&!needsMalacca&&!needsSCS){
    if((R.japan(from)||R.korea(from))&&R.china(to)){ addVia('EAST_CHINA'); }
    if((R.japan(to)||R.korea(to))&&R.china(from)){ addVia('EAST_CHINA'); }
    if(R.japan(from)&&R.korea(to)){ addVia('JAPAN_SEA'); }
    if(R.japan(to)&&R.korea(from)){ addVia('JAPAN_SEA'); }
  }

  // ── PACIFIC ROUTES ────────────────────────────────────────────────────────
  const needsPacific = (R.farEast(from)||R.japan(from)||R.korea(from)||R.china(from)) &&
    (R.wCoast(to)||R.eastUS(to));
  const needsPacificRev = (R.farEast(to)||R.japan(to)||R.korea(to)||R.china(to)) &&
    (R.wCoast(from)||R.eastUS(from));
  if(needsPacific){ addVia('PAC_NW','PAC_NE'); }
  if(needsPacificRev){ addVia('PAC_NE','PAC_NW'); }

  // ── PANAMA CANAL ─────────────────────────────────────────────────────────
  const needsPanama = !needsSuez && !needsSuezRev && (
    (R.wCoast(from)&&(R.eastUS(to)||R.carib(to)||R.sAtl(to)||R.europe(to)||R.wAfrica(to))) ||
    ((R.eastUS(from)||R.carib(from)||R.sAtl(from))&&R.wCoast(to))
  );
  if(needsPanama){
    const toPac=R.wCoast(to);
    if(toPac){ addVia('CARIB','PANAMA_A','PANAMA_P'); }
    else { addVia('PANAMA_P','PANAMA_A','CARIB'); }
  }

  // ── ATLANTIC ROUTES ────────────────────────────────────────────────────────
  const crossAtl = !needsPanama && !needsSuez && !needsSuezRev && !needsCape && (
    (R.europe(from)&&(R.eastUS(to)||R.carib(to)||R.sAmer(to))) ||
    ((R.eastUS(from)||R.carib(from)||R.sAmer(from))&&R.europe(to)) ||
    (R.europe(from)&&R.wAfrica(to)) ||
    (R.wAfrica(from)&&R.europe(to)) ||
    (R.wAfrica(from)&&(R.eastUS(to)||R.carib(to))) ||
    ((R.eastUS(from)||R.carib(from))&&R.wAfrica(to))
  );
  if(crossAtl){
    const toUS=R.eastUS(to)||R.carib(to);
    if(toUS&&R.europe(from)){ addVia('BASC','ATLANTIC_N'); }
    else if(R.europe(to)&&(R.eastUS(from)||R.carib(from))){ addVia('ATLANTIC_N','BASC'); }
    else if(R.sAmer(to)||R.sAtl(to)){ addVia('ATLANTIC_C','ATLANTIC_S'); }
    else if(R.sAmer(from)||R.sAtl(from)){ addVia('ATLANTIC_S','ATLANTIC_C'); }
    else if(R.wAfrica(from)||R.wAfrica(to)){ addVia('ATLANTIC_C'); }
  }

  // ── AUSTRALIA ROUTING ────────────────────────────────────────────────────
  if(!needsCape && !needsSuez && !needsSuezRev){
    if(R.australia(from)&&(R.seAsia(to)||R.farEast(to)||R.china(to))){
      if(from.lon>140){ addVia('TORRES','ARAFURA','TIMOR','LOMBOK','S_CHINA_S'); }
      else if(from.lat< -25){ addVia('AUS_W','IND_SE','LOMBOK','S_CHINA_S'); }
      else { addVia('AUS_N','TIMOR','LOMBOK','S_CHINA_S'); }
    }
    if(R.australia(to)&&(R.seAsia(from)||R.farEast(from)||R.china(from))){
      if(to.lon>140){ addVia('S_CHINA_S','LOMBOK','TIMOR','ARAFURA','TORRES'); }
      else if(to.lat< -25){ addVia('S_CHINA_S','LOMBOK','IND_SE','AUS_W'); }
      else { addVia('S_CHINA_S','LOMBOK','TIMOR','AUS_N'); }
    }
    if(R.australia(from)&&R.eAfrica(to)){ addVia('IND_S','IND_SW','AFR_E'); }
    if(R.eAfrica(from)&&R.australia(to)){ addVia('AFR_E','IND_SW','IND_S'); }
    if(R.australia(from)&&(R.sPac(to)||to.lon>150)){ addVia('CORAL','TASMAN','PAC_SW'); }
    if((R.sPac(from)||from.lon>150)&&R.australia(to)){ addVia('PAC_SW','TASMAN','CORAL'); }
  }

  // ── EUROPE / UK / BALTIC internal routing ────────────────────────────────
  if(!needsSuez&&!needsSuezRev&&!crossAtl){
    if(R.baltic(from)&&!R.baltic(to)){ addVia('NORTH_SEA'); }
    if(R.baltic(to)&&!R.baltic(from)){ addVia('NORTH_SEA'); }
    if((R.ukNorth(from)||R.ukNorth(to))&&(R.europe(from)||R.europe(to))){ addVia('NORTH_SEA'); }
    if(R.blackSea(from)&&!R.blackSea(to)){ addVia('BLACK_W'); }
    if(R.blackSea(to)&&!R.blackSea(from)){ addVia('BLACK_W'); }
  }

  // ── BUILD FINAL WAYPOINT ARRAY ────────────────────────────────────────────
  const rawPoints = [
    {lat:from.lat,lon:from.lon,name:from.name},
    ...wps,
    {lat:to.lat,  lon:to.lon,  name:to.name},
  ];

  // Interpolate each sea-corridor segment with great-circle arcs
  const allWPs = [];
  for(let i=0;i<rawPoints.length-1;i++){
    const a=rawPoints[i],b=rawPoints[i+1];
    const dist=haversine(a.lat,a.lon,b.lat,b.lon);
    const nPts=Math.max(2,Math.min(10,Math.floor(dist/250)));
    const seg=greatCircle(a.lat,a.lon,b.lat,b.lon,nPts);
    seg.forEach((pt,j)=>{
      if(i>0&&j===0)return;
      allWPs.push({
        lat:Math.round(pt[0]*10000)/10000,
        lon:Math.round(pt[1]*10000)/10000,
        name:(j===0&&rawPoints[i].name)?rawPoints[i].name:undefined,
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
function RoutePlannerPage({notify}){
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
    setSugg(PORTS_DB.filter(p=>
      p.name.toLowerCase().includes(ql)||
      p.city?.toLowerCase().includes(ql)||
      p.id.toLowerCase().includes(ql)||
      p.country.toLowerCase().includes(ql)||
      p.keywords.includes(ql)
    ).slice(0,8));
  };

  useEffect(()=>searchPort(fromPort,setFromSugg),[fromPort]);
  useEffect(()=>searchPort(toPort,setToSugg),[toPort]);

  const generateRoute=()=>{
    const f=PORTS_DB.find(p=>p.name.toLowerCase()===fromPort.toLowerCase()||p.id.toLowerCase()===fromPort.toLowerCase());
    const t=PORTS_DB.find(p=>p.name.toLowerCase()===toPort.toLowerCase()||p.id.toLowerCase()===toPort.toLowerCase());
    if(!f||!t){notify('Select valid departure and arrival ports','error');return;}
    const wps=buildAutoRoute(f.id,t.id);
    setWaypoints(wps);
    setRouteName(`${f.name} to ${t.name}`);
    notify(`Route generated — ${wps.length} waypoints, ${totalRouteNM(wps).toFixed(0)} NM`,'success');
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
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginBottom:'1rem'}} onClick={generateRoute}>
                  🗺 Generate Sea Route
                </button>

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
    try{const c=await signInWithEmailAndPassword(auth,email,pass);notify('Welcome back! 👋','success');onLogin(c.user);}
    catch{setErr('Invalid email or password.');}
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

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
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
                <div style={{display:'flex',gap:8}}>
                  <span className="badge badge-green">{users.length} registered</span>
                  <button className="btn btn-secondary" style={{padding:'5px 10px',fontSize:'0.72rem'}} onClick={loadUsers}>🔄 Refresh</button>
                </div>
              </div>
              <div className="info-box">All users who create a free account appear here. Use this to track your audience and for future marketing.</div>
              {users.length===0
                ?<div className="empty"><div className="empty-icon">👥</div><div className="empty-t">No Users Yet</div><div className="empty-d">Users appear here after they register</div></div>
                :<div className="tw">
                  <table className="tbl">
                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th><th>Role</th></tr></thead>
                    <tbody>{users.map((u,i)=>(
                      <tr key={u.id}>
                        <td style={{color:'var(--text3)'}}>{i+1}</td>
                        <td style={{color:'var(--cyan)',fontWeight:600}}>{u.name||'—'}</td>
                        <td style={{color:'var(--text2)',fontSize:'0.78rem'}}>{u.email}</td>
                        <td style={{color:'var(--gold)',fontSize:'0.78rem'}}>{u.phone||'—'}</td>
                        <td style={{color:'var(--text2)',fontSize:'0.72rem'}}>{u.createdAt?.toDate?.()?.toLocaleDateString()||'—'}</td>
                        <td><span className="badge">{u.role||'user'}</span></td>
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
  const [userProfile,setUserProfile]=useState(null); // Firestore profile {name,phone,...}
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
    Promise.all([fetchRouteSheet(),fetchChartSheet()])
      .then(([d1,d2])=>{
        setSheetRoutes(Array.isArray(d1)?d1:[]);
        setSheetCharts(Array.isArray(d2)?d2:[]);
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
          setUserProfile(snap.exists()?{id:snap.id,...snap.data()}:null);
        }catch{setUserProfile(null);}
      }else{
        setUserProfile(null);
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
    // Admin tab ONLY when logged in with admin email
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

        {/* MAIN CONTENT */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0,overflow:isPlannerFull?'hidden':'auto'}}>
          {loading&&<div className="loading"><div className="spin"/><span>Connecting to Firebase…</span></div>}
          {!loading&&tab==='home'    &&<HomePage routes={routes} charts={charts} onSearch={handleSearch} setTab={switchTab} user={user}/>}
          {!loading&&tab==='routes'  &&<RoutesPage routes={routes} sheetRoutes={sheetRoutes} searchQuery={searchQ} notify={notify} user={user} setTab={switchTab}/>}
          {!loading&&tab==='charts'  &&<ChartsPage charts={charts} sheetCharts={sheetCharts} notify={notify} user={user} setTab={switchTab} isAdmin={isAdmin}/>}
          {!loading&&tab==='planner' &&<RoutePlannerPage notify={notify}/>}
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
