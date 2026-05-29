/* eslint-disable */
// src/constants.js

export const ADMIN_EMAIL = 'ecdisroutes@gmail.com';

export const ECDIS_BRANDS = [
  { id:"furuno",    name:"Furuno",             emoji:"🟦", color:"#0066CC", models:"FMD-3200 / FMD-3300" },
  { id:"jrc",       name:"JRC",                emoji:"🟥", color:"#CC0000", models:"JAN-7201S / JAN-9201S" },
  { id:"transas",   name:"Transas / Wärtsilä", emoji:"🟩", color:"#007A4D", models:"Navi-Sailor 4000/3000" },
  { id:"sperry",    name:"Sperry Marine",       emoji:"🟨", color:"#D4900A", models:"VisionMaster FT / Pro" },
  { id:"tokimec",   name:"Tokimec / JMR",       emoji:"🟪", color:"#6B21A8", models:"JMR-7700 / JMR-9900" },
  { id:"raytheon",  name:"Raytheon Anschütz",   emoji:"⬛", color:"#374151", models:"ECDIS 1000 / 2000" },
  { id:"kongsberg", name:"Kongsberg Maritime",  emoji:"🔵", color:"#1D4ED8", models:"K-Bridge ECDIS" },
  { id:"danelec",   name:"Danelec Marine",      emoji:"🔶", color:"#EA580C", models:"DM800 ECDIS" },
  { id:"kelvin",    name:"Kelvin Hughes",        emoji:"🔵", color:"#0891B2", models:"SharpEye ECDIS" },
  { id:"northrop",  name:"Northrop Grumman",    emoji:"⭕", color:"#DC2626", models:"Integrated Bridge" },
  { id:"sam",       name:"SAM Electronics",     emoji:"🟫", color:"#92400E", models:"NACOS Platinum" },
  { id:"wartsila",  name:"Wärtsilä Voyage",     emoji:"🔺", color:"#059669", models:"Navi-Sailor Series" },
];

export const ROUTE_TYPES = ["Ocean","Coastal","Deep Sea","Strait","River","Port Approach","Anchorage"];

export let PORTS_DB = [
  {id:"MUM",name:"Mumbai",        city:"Mumbai",      country:"India",       lat:18.93, lon:72.83},
  {id:"SIN",name:"Singapore",     city:"Singapore",   country:"Singapore",   lat:1.29,  lon:103.85},
  {id:"DXB",name:"Dubai",         city:"Dubai",       country:"UAE",         lat:25.05, lon:55.13},
  {id:"COL",name:"Colombo",       city:"Colombo",     country:"Sri Lanka",   lat:6.94,  lon:79.85},
  {id:"SHA",name:"Shanghai",      city:"Shanghai",    country:"China",       lat:31.23, lon:121.47},
  {id:"ROT",name:"Rotterdam",     city:"Rotterdam",   country:"Netherlands", lat:51.92, lon:4.48},
  {id:"HKG",name:"Hong Kong",     city:"Hong Kong",   country:"China",       lat:22.29, lon:114.16},
  {id:"KAR",name:"Karachi",       city:"Karachi",     country:"Pakistan",    lat:24.86, lon:67.01},
  {id:"BUS",name:"Busan",         city:"Busan",       country:"South Korea", lat:35.10, lon:129.04},
  {id:"YOK",name:"Yokohama",      city:"Yokohama",    country:"Japan",       lat:35.45, lon:139.65},
  {id:"NYK",name:"New York",      city:"New York",    country:"USA",         lat:40.65, lon:-74.07},
  {id:"LAX",name:"Los Angeles",   city:"Los Angeles", country:"USA",         lat:33.74, lon:-118.27},
  {id:"SYD",name:"Sydney",        city:"Sydney",      country:"Australia",   lat:-33.86,lon:151.21},
  {id:"JED",name:"Jeddah",        city:"Jeddah",      country:"Saudi Arabia",lat:21.49, lon:39.18},
  {id:"PSD",name:"Port Said",     city:"Port Said",   country:"Egypt",       lat:31.26, lon:32.31},
  {id:"MOM",name:"Mombasa",       city:"Mombasa",     country:"Kenya",       lat:-4.05, lon:39.67},
  {id:"KAN",name:"Kandla",        city:"Kandla",      country:"India",       lat:23.01, lon:70.22},
  {id:"KOC",name:"Kochi",         city:"Kochi",       country:"India",       lat:9.97,  lon:76.27},
  {id:"CHE",name:"Chennai",       city:"Chennai",     country:"India",       lat:13.08, lon:80.29},
  {id:"PKL",name:"Port Klang",    city:"Klang",       country:"Malaysia",    lat:3.00,  lon:101.37},
  {id:"FUJ",name:"Fujairah",      city:"Fujairah",    country:"UAE",         lat:25.12, lon:56.34},
  {id:"ADE",name:"Aden",          city:"Aden",        country:"Yemen",       lat:12.77, lon:44.99},
  {id:"DAR",name:"Dar es Salaam", city:"Dar es Salaam",country:"Tanzania",   lat:-6.82, lon:39.28},
  {id:"CPT",name:"Cape Town",     city:"Cape Town",   country:"South Africa",lat:-33.91,lon:18.43},
  {id:"LAG",name:"Lagos",         city:"Lagos",       country:"Nigeria",     lat:6.45,  lon:3.39},
  {id:"ANT",name:"Antwerp",       city:"Antwerp",     country:"Belgium",     lat:51.23, lon:4.42},
  {id:"HAM",name:"Hamburg",       city:"Hamburg",     country:"Germany",     lat:53.54, lon:9.99},
  {id:"JAK",name:"Jakarta",       city:"Jakarta",     country:"Indonesia",   lat:-6.11, lon:106.88},
  {id:"CTG",name:"Chittagong",    city:"Chittagong",  country:"Bangladesh",  lat:22.34, lon:91.82},
  {id:"VAN",name:"Vancouver",     city:"Vancouver",   country:"Canada",      lat:49.29, lon:-123.11},
  {id:"SSL",name:"Santos",        city:"Santos",      country:"Brazil",      lat:-23.96,lon:-46.33},
  {id:"PIR",name:"Piraeus",       city:"Athens",      country:"Greece",      lat:37.95, lon:23.63},
  {id:"IST",name:"Istanbul",      city:"Istanbul",    country:"Turkey",      lat:41.01, lon:28.97},
  {id:"BAH",name:"Bahrain",       city:"Manama",      country:"Bahrain",     lat:26.24, lon:50.63},
  {id:"DOH",name:"Doha",          city:"Doha",        country:"Qatar",       lat:25.29, lon:51.55},
  {id:"KWI",name:"Kuwait",        city:"Kuwait City", country:"Kuwait",      lat:29.37, lon:47.99},
  {id:"BAS",name:"Basra",         city:"Basra",       country:"Iraq",        lat:30.52, lon:47.83},
  {id:"MCT",name:"Muscat",        city:"Muscat",      country:"Oman",        lat:23.62, lon:58.59},
  {id:"SLL",name:"Salalah",       city:"Salalah",     country:"Oman",        lat:16.94, lon:54.00},
  {id:"MAN",name:"Manila",        city:"Manila",      country:"Philippines", lat:14.59, lon:120.98},
  {id:"DUR",name:"Durban",        city:"Durban",      country:"South Africa",lat:-29.87,lon:31.04},
];

// ─── ECA ZONES — MARPOL Annex VI Emission Control Areas ──────────────────────
// Corrected IMO-certified boundaries — MEPC.190(60) / MEPC.258(67) / MEPC.328(76)
// North American ECA split into 3 official sub-areas per Appendix VII
// Mediterranean SOx ECA added — effective 1 May 2025 per MEPC.328(76)
export const ECA_ZONES = [
  {
    name: "North Sea ECA",
    shortDesc: "SOx 0.1% — North Sea & English Channel — MARPOL Annex VI",
    regulation: "MARPOL Annex VI Reg.14 & 13",
    fuelLimit: "0.10% S",
    authority: "IMO / Paris MOU",
    // Boundary: English Channel east of 5°W north of 48°30'N;
    // North Sea south of 62°N east of 4°W; Skagerrak south of 57°44.8'N
    coords: [
      [48.50,-5.00],[48.50,2.00],[51.00,2.00],[51.00,-4.00],
      [62.00,-4.00],[62.00,12.00],[57.75,12.00],[57.75,8.50],
      [54.75,8.50],[51.00,2.00],[48.50,8.00],[48.50,-5.00]
    ]
  },
  {
    name: "Baltic Sea ECA",
    shortDesc: "SOx 0.1% — Baltic Sea incl. Gulf of Bothnia & Gulf of Finland",
    regulation: "MARPOL Annex VI Reg.14 & 13",
    fuelLimit: "0.10% S",
    authority: "IMO / Helsinki Commission (HELCOM)",
    // Boundary: Baltic Sea proper with Gulf of Bothnia, Gulf of Finland
    // and entrance bounded by parallel of the Skaw at 57°44.8'N
    coords: [
      [53.50,9.00],[53.50,14.00],[54.00,19.50],[55.50,22.00],
      [57.50,21.00],[59.00,23.50],[60.00,27.00],[60.50,28.50],
      [65.00,28.50],[65.00,25.00],[65.50,22.00],[66.00,20.00],
      [65.00,14.00],[62.00,10.00],[58.00,9.00],[56.50,9.00],
      [55.00,9.50],[53.50,9.00]
    ]
  },
  {
    // Sub-area 1 of 3 — MEPC.190(60) Appendix VII paragraph 1
    name: "North American ECA — Pacific Coast",
    shortDesc: "SOx 0.1% within 200NM of US & Canada Pacific coast",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.190(60) Appendix VII §1",
    fuelLimit: "0.10% S",
    authority: "US EPA / Transport Canada",
    // Outer boundary simplified from official 47-point MEPC.190(60) polygon
    // Runs from San Diego/Mexico border north to Kodiak Island, Alaska
    coords: [
      [32.54,-117.10],[30.54,-121.79],[32.37,-123.85],[35.25,-125.72],
      [36.27,-126.76],[38.42,-127.88],[40.31,-128.76],[42.21,-129.01],
      [44.41,-128.69],[46.19,-128.82],[47.66,-131.26],[48.54,-132.68],
      [50.03,-135.32],[51.90,-137.70],[54.65,-139.94],[56.47,-142.19],
      [56.52,-142.82],[58.85,-153.25],
      // Close via approximate Alaska/BC/US coastline
      [59.50,-151.00],[60.00,-144.00],[59.00,-136.00],[55.50,-133.00],
      [54.50,-130.50],[50.00,-127.00],[48.50,-124.75],[46.20,-124.00],
      [43.00,-124.50],[37.75,-122.50],[34.00,-120.50],[32.54,-117.10]
    ]
  },
  {
    // Sub-area 2 of 3 — MEPC.190(60) Appendix VII paragraph 2
    name: "North American ECA — Atlantic & Gulf Coast",
    shortDesc: "SOx 0.1% within 200NM of US, Canada & France (SPM) Atlantic & Gulf coasts",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.190(60) Appendix VII §2",
    fuelLimit: "0.10% S",
    authority: "US EPA / Transport Canada",
    // Outer boundary simplified from official MEPC.190(60) polygon
    // Covers Atlantic seaboard from 60°N (incl. Saint-Pierre-et-Miquelon) to Gulf of Mexico/TX border
    coords: [
      [60.00,-64.17],[60.00,-56.72],[54.38,-50.29],[50.04,-48.02],
      [47.41,-47.78],[45.33,-48.72],[43.53,-52.29],[41.97,-56.16],
      [41.34,-57.09],[40.64,-60.17],[40.89,-61.50],[41.35,-62.78],
      [43.50,-65.12],[45.82,-66.43],[47.00,-67.00],
      // Close via approximate US Atlantic coast south to Gulf, then TX border
      [44.00,-66.50],[35.00,-75.50],[30.50,-81.00],[25.00,-80.50],
      [24.00,-83.50],[24.00,-87.00],[29.00,-88.50],[29.00,-94.00],
      [25.72,-97.14],
      // Return via Gulf coast, Florida, then north to close
      [26.00,-97.50],[29.50,-94.00],[29.00,-88.50],[26.00,-83.00],
      [25.00,-80.50],[30.50,-81.00],[35.00,-75.50],[44.00,-66.50],
      [47.50,-53.00],[50.00,-55.00],[60.00,-64.17]
    ]
  },
  {
    // Sub-area 3 of 3 — MEPC.190(60) Appendix VII paragraph 3
    // Confirmed: Hawaiian Islands ARE part of the North American ECA
    name: "North American ECA — Hawaiian Islands",
    shortDesc: "SOx 0.1% within 200NM of the 8 main Hawaiian Islands — MARPOL Annex VI",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.190(60) Appendix VII §3",
    fuelLimit: "0.10% S",
    authority: "US EPA",
    // 200NM buffer around Hawai'i, Maui, O'ahu, Moloka'i, Ni'ihau, Kaua'i, Lāna'i, Kaho'olawe
    // Islands span approx 18.9°N–22.2°N, 154.8°W–160.2°W
    // 200NM ≈ 3.33° lat — outer boundary:
    coords: [
      [23.50,-163.00],[23.50,-161.00],[23.00,-159.00],[22.00,-157.00],
      [21.50,-154.50],[20.00,-152.50],[18.00,-152.50],[17.00,-154.00],
      [17.00,-157.00],[17.50,-160.00],[18.50,-163.00],[20.00,-164.00],
      [22.00,-164.00],[23.50,-163.00]
    ]
  },
  {
    name: "US Caribbean Sea ECA",
    shortDesc: "SOx 0.1% — waters surrounding Puerto Rico & US Virgin Islands",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.202(62) — effective Aug 2014",
    fuelLimit: "0.10% S",
    authority: "US EPA",
    // Official boundary per MEPC.1/Circ.755 — surrounding PR and USVI
    // Extends ~50NM north, ~40NM south, ~200NM from baseline
    coords: [
      [19.75,-68.00],[19.75,-64.00],[18.50,-62.50],[17.25,-62.50],
      [14.50,-64.00],[14.50,-67.50],[16.00,-68.50],[18.00,-70.00],
      [19.75,-68.00]
    ]
  },
  {
    // NEW — effective 1 May 2025 per MEPC.328(76) Resolution
    name: "Mediterranean Sea ECA",
    shortDesc: "SOx 0.1% — entire Mediterranean Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.328(76) — effective 01 May 2025",
    fuelLimit: "0.10% S",
    authority: "IMO — MEPC 76 Resolution",
    // Western boundary: Cape Trafalgar (36°11'N, 6°02'W) → Cape Spartel (35°48'N, 5°55'W)
    // Eastern boundary: Çanakkale Strait (40°03'N, 26°11'E → 40°01'N, 26°12'E)
    // Northern/Southern limits follow respective European & North African coastlines
    coords: [
      [36.18,-6.03],[35.80,-5.92],
      [35.00,-3.00],[37.00,3.00],[43.50,5.00],[43.50,8.00],
      [44.00,12.00],[45.50,13.50],[45.80,15.00],[42.50,19.00],
      [40.05,26.18],[40.02,26.20],[41.50,29.00],[43.00,35.00],
      [36.50,36.50],[35.00,36.00],[31.29,32.47],[31.14,32.27],
      [30.50,25.00],[30.00,15.00],[30.50,5.00],
      [32.00,-2.00],[35.80,-5.92],[36.18,-6.03]
    ]
  },
  {
    name: "China Bohai Sea ECA",
    shortDesc: "SOx 0.5% in port / ECA — Phase III",
    regulation: "China MEPC Circular — effective 2019",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [37.00,117.50],[41.00,117.50],[41.00,122.00],
      [38.50,122.00],[37.00,120.50],[37.00,117.50]
    ]
  },
  {
    name: "China Yangtze River Delta ECA",
    shortDesc: "SOx 0.5% / 0.10% at berth",
    regulation: "China MEPC Circular — effective 2019",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [28.00,120.00],[28.00,122.50],[32.50,122.50],
      [32.50,121.00],[31.50,120.00],[28.00,120.00]
    ]
  },
  {
    name: "China Pearl River Delta ECA",
    shortDesc: "SOx 0.5% / 0.10% at berth",
    regulation: "China MEPC Circular — effective 2019",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [21.00,112.50],[21.00,115.50],[23.00,115.50],
      [23.00,113.50],[22.50,112.50],[21.00,112.50]
    ]
  },
  {
    name: "China Hainan ECA",
    shortDesc: "SOx 0.5% — Hainan coastal waters",
    regulation: "China MEPC Circular — effective 2022",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [18.00,108.50],[18.00,111.50],[20.50,111.50],
      [20.50,109.50],[19.50,108.50],[18.00,108.50]
    ]
  },
];

// ─── SECA ZONES — Sulphur Emission Control Areas ─────────────────────────────
// Subset of ECA — these require 0.10% S fuel (strictest limit)
// Mediterranean SECA added — effective 1 May 2025
export const SECA_ZONES = [
  {
    name: "Baltic Sea SECA",
    shortDesc: "Strictest SOx — 0.10% sulphur fuel required",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — since 2015",
    fuelLimit: "0.10% S",
    authority: "IMO / HELCOM",
    coords: [
      [53.50,9.00],[53.50,14.00],[54.00,19.50],[55.50,22.00],
      [57.50,21.00],[59.00,23.50],[60.00,27.00],[60.50,28.50],
      [65.00,28.50],[65.00,25.00],[65.50,22.00],[66.00,20.00],
      [65.00,14.00],[62.00,10.00],[58.00,9.00],[56.50,9.00],
      [55.00,9.50],[53.50,9.00]
    ]
  },
  {
    name: "North Sea SECA",
    shortDesc: "Strictest SOx — 0.10% sulphur fuel required — incl. English Channel",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — since 2015",
    fuelLimit: "0.10% S",
    authority: "IMO / Paris MOU",
    coords: [
      [48.50,-5.00],[48.50,2.00],[51.00,2.00],[51.00,-4.00],
      [62.00,-4.00],[62.00,12.00],[57.75,12.00],[57.75,8.50],
      [54.75,8.50],[51.00,2.00],[48.50,8.00],[48.50,-5.00]
    ]
  },
  {
    // NEW — effective 1 May 2025 per MEPC.328(76)
    name: "Mediterranean Sea SECA",
    shortDesc: "0.10% sulphur fuel required — entire Mediterranean Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — MEPC.328(76) — effective 01 May 2025",
    fuelLimit: "0.10% S",
    authority: "IMO — MEPC 76 Resolution",
    coords: [
      [36.18,-6.03],[35.80,-5.92],
      [35.00,-3.00],[37.00,3.00],[43.50,5.00],[43.50,8.00],
      [44.00,12.00],[45.50,13.50],[45.80,15.00],[42.50,19.00],
      [40.05,26.18],[40.02,26.20],[41.50,29.00],[43.00,35.00],
      [36.50,36.50],[35.00,36.00],[31.29,32.47],[31.14,32.27],
      [30.50,25.00],[30.00,15.00],[30.50,5.00],
      [32.00,-2.00],[35.80,-5.92],[36.18,-6.03]
    ]
  },
];

// ─── MARPOL SPECIAL AREAS — Annex I / II / V ─────────────────────────────────
// Discharge restrictions for oil, noxious substances, garbage
// Mediterranean Special Area corrected — western boundary at Gibraltar not 30°N
export const MARPOL_ZONES = [
  {
    name: "Mediterranean Sea Special Area",
    shortDesc: "No oil discharge / no garbage — Annex I & V",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    // Corrected: western boundary is the Gibraltar line
    // (Cape Trafalgar 36°11'N,6°02'W → Cape Spartel 35°48'N,5°55'W)
    // Eastern boundary excludes Black Sea (separate special area)
    coords: [
      [36.18,-6.03],[35.80,-5.92],
      [35.00,-3.00],[37.00,3.00],[43.50,5.00],[43.50,8.00],
      [44.00,12.00],[45.50,13.50],[45.80,15.00],[42.50,19.00],
      [40.05,26.18],[40.02,26.20],[41.00,28.00],
      [35.00,36.00],[31.29,32.47],[31.14,32.27],
      [30.50,25.00],[30.00,15.00],[30.50,5.00],
      [32.00,-2.00],[35.80,-5.92],[36.18,-6.03]
    ]
  },
  {
    name: "Baltic Sea Special Area",
    shortDesc: "No oil / no noxious liquid / no garbage discharge",
    regulation: "MARPOL Annex I Reg.38 / Annex II Reg.18 / Annex V Reg.7",
    annex: "I, II, V",
    coords: [
      [53.50,9.00],[53.50,14.00],[54.00,19.50],[55.50,22.00],
      [57.50,21.00],[59.00,23.50],[60.00,27.00],[60.50,28.50],
      [65.00,28.50],[65.00,25.00],[65.50,22.00],[66.00,20.00],
      [65.00,14.00],[62.00,10.00],[58.00,9.00],[56.50,9.00],
      [55.00,9.50],[53.50,9.00]
    ]
  },
  {
    name: "Black Sea Special Area",
    shortDesc: "No oil discharge — MARPOL Annex I",
    regulation: "MARPOL Annex I Reg.38",
    annex: "I",
    coords: [
      [41.00,28.00],[41.00,42.00],[47.50,42.00],[47.50,36.00],
      [46.50,32.00],[45.00,29.00],[43.00,28.00],[41.00,28.00]
    ]
  },
  {
    name: "Red Sea Special Area",
    shortDesc: "No oil / no garbage discharge",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    // Bounded: Suez Canal south entrance, Gulf of Aden east,
    // Bab el-Mandeb strait ~12°30'N, Djibouti coast
    coords: [
      [29.87,32.57],[29.87,32.35],[29.50,32.35],
      [27.00,34.50],[24.00,36.50],[20.00,38.50],
      [15.00,41.50],[12.58,43.25],[12.58,44.00],
      [15.00,43.00],[20.00,39.00],[25.00,37.00],
      [28.00,34.50],[29.87,32.57]
    ]
  },
  {
    name: "Arabian Gulf Special Area",
    shortDesc: "No oil / no garbage discharge — Persian Gulf",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    // Bounded by the Strait of Hormuz (24°N, 56°E) to the NW head of the Gulf
    coords: [
      [29.87,48.50],[24.48,56.25],[24.00,57.00],[26.50,57.00],
      [27.33,56.38],[27.50,56.00],[29.50,50.50],[29.87,48.50]
    ]
  },
  {
    name: "Gulf of Aden Special Area",
    shortDesc: "No garbage discharge",
    regulation: "MARPOL Annex V Reg.7",
    annex: "V",
    // Between Djibouti/Yemen coast and 45°E, south limit ~11°N
    coords: [
      [11.00,43.00],[11.00,58.00],[13.50,58.00],[14.00,53.00],
      [12.58,47.00],[11.50,44.00],[11.00,43.00]
    ]
  },
  {
    name: "Antarctic Special Area",
    shortDesc: "No oil / no garbage / no sewage discharge — south of 60°S",
    regulation: "MARPOL Annex I Reg.38 / Annex II Reg.18 / Annex IV Reg.11 / Annex V Reg.7",
    annex: "I, II, IV, V",
    coords: [
      [-60.00,-180.00],[-60.00,180.00],[-90.00,180.00],[-90.00,-180.00],[-60.00,-180.00]
    ]
  },
  {
    name: "North West European Waters",
    shortDesc: "No garbage discharge — North Sea & approaches",
    regulation: "MARPOL Annex V Reg.7",
    annex: "V",
    coords: [
      [48.50,-18.00],[48.50,13.00],[62.00,13.00],[62.00,-18.00],[48.50,-18.00]
    ]
  },
  {
    name: "Wider Caribbean Special Area",
    shortDesc: "No garbage discharge",
    regulation: "MARPOL Annex V Reg.7 — effective 2011",
    annex: "V",
    coords: [
      [7.00,-100.00],[7.00,-58.00],[18.50,-58.00],[22.00,-60.00],
      [26.00,-77.00],[30.00,-77.00],[30.00,-98.00],[24.00,-98.00],
      [20.00,-87.00],[15.00,-88.00],[10.00,-83.00],[7.00,-79.00],[7.00,-100.00]
    ]
  },
];

// ─── PIRACY ZONES ─────────────────────────────────────────────────────────────
export const PIRACY_ZONES = [
  { name:"Indian Ocean HRA / Gulf of Aden", coords:[[0,40],[0,78],[25,78],[25,40]] },
  { name:"Gulf of Guinea / W. Africa",      coords:[[-5,0],[5,0],[5,10],[-5,10]] },
  { name:"Malacca / Singapore Strait",      coords:[[1,98],[6,98],[6,106],[1,106]] },
  { name:"Somali Coast",                    coords:[[-2,40],[12,40],[12,55],[-2,55]] },
  { name:"Gulf of Guinea Coast",            coords:[[-3,-3],[5,-3],[5,5],[-3,5]] },
];

// ─── LAYOVER / ANCHORAGE ZONES ────────────────────────────────────────────────
export const LAYOVER_ZONES = [
  { name:"Mumbai Anchorage",       coords:[[18.8,72.7],[18.8,73.0],[19.1,73.0],[19.1,72.7]] },
  { name:"Singapore Western Anch", coords:[[1.1,103.6],[1.1,103.9],[1.4,103.9],[1.4,103.6]] },
  { name:"Dubai / Jebel Ali Anch", coords:[[24.9,54.9],[24.9,55.2],[25.1,55.2],[25.1,54.9]] },
  { name:"Fujairah Anchorage",     coords:[[25.0,56.2],[25.0,56.5],[25.3,56.5],[25.3,56.2]] },
  { name:"Rotterdam Anchorage",    coords:[[51.8,4.0],[51.8,4.6],[52.0,4.6],[52.0,4.0]] },
  { name:"Colombo Anchorage",      coords:[[6.8,79.7],[6.8,80.0],[7.1,80.0],[7.1,79.7]] },
];

// ─── PSSA — Particularly Sensitive Sea Areas ─────────────────────────────────
// Official IMO-designated PSSAs only — as of 2024
// REMOVED: Medes Islands (Spanish reserve only, NOT an IMO PSSA)
// REMOVED: Patagonian Sea (NOT an officially IMO-designated PSSA)
// ADDED:   Western European Waters (MEPC.121(52) — 2004)
// ADDED:   Strait of Bonifacio (MEPC.211(63) — 2011)
// UPDATED: Great Barrier Reef — extended to include SW Coral Sea (2015)
export const PSSA_ZONES = [
  {
    name: "Great Barrier Reef & Coral Sea PSSA",
    shortDesc: "World's largest coral reef — strict no-discharge, compulsory pilotage, REEFVTS",
    measures: "Compulsory pilotage, no anchoring on reef, REEFVTS mandatory, no discharge",
    designatedYear: 1990,
    extendedYear: 2015,
    authority: "AMSA — Australian Maritime Safety Authority",
    // Updated 2015 to include SW Coral Sea — IMO Resolution MEPC.267(68)
    coords: [
      [-10.50,142.00],[-10.50,145.50],[-14.00,147.00],[-18.00,148.00],
      [-22.00,153.50],[-24.50,154.00],[-28.00,154.00],[-28.00,156.00],
      [-26.00,157.00],[-22.00,158.00],[-15.00,150.00],
      [-12.00,147.00],[-10.50,145.00],[-10.50,142.00]
    ]
  },
  {
    name: "Torres Strait PSSA",
    shortDesc: "Narrow reef-strewn passage — compulsory pilotage for vessels >70m LOA",
    measures: "Compulsory pilotage for vessels >70m LOA, TSS in force, no discharge",
    designatedYear: 2005,
    authority: "AMSA / Papua New Guinea NMSA",
    coords: [
      [-9.00,141.50],[-9.00,144.50],[-11.00,144.50],[-11.00,141.50],[-9.00,141.50]
    ]
  },
  {
    name: "Sabana-Camagüey Archipelago PSSA",
    shortDesc: "Cuban coral reef ecosystem — Caribbean",
    measures: "No discharge, no anchoring in reef areas, vessel reporting",
    designatedYear: 1997,
    authority: "Cuba MITRANS",
    coords: [
      [22.00,-82.00],[22.00,-77.00],[23.50,-77.00],[23.50,-82.00],[22.00,-82.00]
    ]
  },
  {
    name: "Malpelo Island PSSA",
    shortDesc: "UNESCO World Heritage — Colombia Pacific",
    measures: "No discharge, no anchoring, vessel reporting",
    designatedYear: 2002,
    authority: "Colombia DIMAR",
    coords: [
      [3.50,-81.80],[3.50,-81.40],[4.10,-81.40],[4.10,-81.80],[3.50,-81.80]
    ]
  },
  {
    name: "Florida Keys PSSA",
    shortDesc: "National Marine Sanctuary — US Atlantic/Gulf",
    measures: "No anchoring on reef, no discharge, speed zones enforced",
    designatedYear: 2002,
    authority: "US Coast Guard / NOAA",
    coords: [
      [24.30,-82.00],[24.30,-80.00],[25.50,-80.00],[25.50,-82.00],[24.30,-82.00]
    ]
  },
  {
    name: "Western European Waters PSSA",
    shortDesc: "Approaches to NW Europe — UK, Ireland, France, Spain, Portugal Atlantic coasts",
    measures: "No discharge, enhanced reporting, place of refuge procedures, enhanced watchkeeping",
    designatedYear: 2004,
    authority: "IMO — MEPC.121(52) Resolution",
    // Covers Atlantic approaches to Western Europe — west of 5°W, south of 60°N, north of 36°N
    coords: [
      [60.00,-5.00],[60.00,-18.00],[36.00,-18.00],[36.00,-6.00],
      [38.00,-9.50],[44.00,-9.50],[47.50,-6.00],[48.50,-5.00],[60.00,-5.00]
    ]
  },
  {
    name: "Wadden Sea PSSA",
    shortDesc: "UNESCO World Heritage tidal flat — Netherlands/Germany/Denmark",
    measures: "No discharge, nature reserve, vessel speed limits, no anchoring",
    designatedYear: 2002,
    authority: "OSPAR / Trilateral Wadden Sea Cooperation",
    coords: [
      [52.80,4.60],[52.80,8.80],[55.60,8.80],[55.60,4.60],[52.80,4.60]
    ]
  },
  {
    name: "Canary Islands PSSA",
    shortDesc: "Volcanic archipelago — NE Atlantic, Spain",
    measures: "No discharge, reef protection, vessel reporting system",
    designatedYear: 2005,
    authority: "Spain — Ministerio de Fomento",
    coords: [
      [27.50,-18.20],[27.50,-13.30],[29.50,-13.30],[29.50,-18.20],[27.50,-18.20]
    ]
  },
  {
    name: "Galapagos Islands PSSA",
    shortDesc: "UNESCO World Heritage — Ecuador Pacific",
    measures: "Compulsory pilotage, no discharge, ITOPF zone, no anchoring on reef",
    designatedYear: 2005,
    authority: "Ecuador DIGMER",
    coords: [
      [-2.00,-92.50],[-2.00,-88.50],[1.50,-88.50],[1.50,-92.50],[-2.00,-92.50]
    ]
  },
  {
    name: "Baltic Sea PSSA",
    shortDesc: "Enclosed sea — highly sensitive ecosystem",
    measures: "No discharge, HELCOM reporting, SOx/NOx ECA, no garbage discharge",
    designatedYear: 2005,
    authority: "IMO / HELCOM",
    coords: [
      [53.50,9.00],[53.50,14.00],[54.00,19.50],[55.50,22.00],
      [57.50,21.00],[59.00,23.50],[60.00,27.00],[60.50,28.50],
      [65.00,28.50],[65.00,25.00],[65.50,22.00],[66.00,20.00],
      [65.00,14.00],[62.00,10.00],[58.00,9.00],[56.50,9.00],
      [55.00,9.50],[53.50,9.00]
    ]
  },
  {
    name: "Strait of Bonifacio PSSA",
    shortDesc: "Sensitive strait between Corsica (France) & Sardinia (Italy) — Mediterranean",
    measures: "No discharge, routing measures, vessel reporting, traffic separation scheme",
    designatedYear: 2011,
    authority: "IMO — MEPC.211(63) Resolution — France & Italy",
    // The Strait of Bonifacio, approximately 41.3°N, 9.2°E
    coords: [
      [41.00,8.50],[41.00,9.80],[41.60,9.80],[41.60,8.50],[41.00,8.50]
    ]
  },
  {
    name: "Saba Bank PSSA",
    shortDesc: "Largest submerged atoll — Caribbean Netherlands",
    measures: "No anchoring on bank, no discharge, Dutch Coast Guard jurisdiction",
    designatedYear: 2012,
    authority: "Netherlands Caribbean Coast Guard",
    coords: [
      [17.00,-64.00],[17.00,-63.00],[18.00,-63.00],[18.00,-64.00],[17.00,-64.00]
    ]
  },
];

// ─── NOX TIER III ZONES — Engine NOx control areas ──────────────────────────
// Ships keel-laid on or after 1 Jan 2016 must comply with NOx Tier III in these areas
// Mediterranean & Black Sea NOx ECAs added — effective 1 May 2025 (MEPC.328(76))
// Mediterranean coords corrected to match actual Med ECA boundary
export const NOX_ZONES = [
  {
    name: "North Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — North Sea & English Channel — ships built after Jan 2016",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "IMO",
    coords: [
      [48.50,-5.00],[48.50,2.00],[51.00,2.00],[51.00,-4.00],
      [62.00,-4.00],[62.00,12.00],[57.75,12.00],[57.75,8.50],
      [54.75,8.50],[51.00,2.00],[48.50,8.00],[48.50,-5.00]
    ]
  },
  {
    name: "Baltic Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — ships built after Jan 2016",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "IMO",
    coords: [
      [53.50,9.00],[53.50,14.00],[54.00,19.50],[55.50,22.00],
      [57.50,21.00],[59.00,23.50],[60.00,27.00],[60.50,28.50],
      [65.00,28.50],[65.00,25.00],[65.50,22.00],[66.00,20.00],
      [65.00,14.00],[62.00,10.00],[58.00,9.00],[56.50,9.00],
      [55.00,9.50],[53.50,9.00]
    ]
  },
  {
    name: "North American NOx Tier III ECA",
    shortDesc: "NOx Tier III — US/Canada 200NM zone (Pacific, Atlantic & Gulf)",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "US EPA / Transport Canada",
    // Pacific coast sub-area outer boundary simplified
    coords: [
      [32.54,-117.10],[30.54,-121.79],[35.25,-125.72],
      [40.31,-128.76],[44.41,-128.69],[48.54,-132.68],
      [51.90,-137.70],[56.47,-142.19],[58.85,-153.25],
      [60.00,-153.25],[60.00,-64.17],[60.00,-56.72],
      [54.38,-50.29],[50.04,-48.02],[47.41,-47.78],
      [43.53,-52.29],[40.64,-60.17],[41.35,-62.78],
      [43.50,-65.12],[25.00,-80.50],[24.00,-83.50],
      [29.00,-88.50],[29.00,-94.00],[25.72,-97.14],
      [32.54,-117.10]
    ]
  },
  {
    // NEW — effective 1 May 2025 per MEPC.328(76) — CORRECTED coords
    name: "Mediterranean Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — entire Mediterranean Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III ECA — MEPC.328(76)",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 May 2025",
    authority: "IMO — MEPC 76 Resolution",
    // Corrected to match actual Mediterranean Sea boundary
    // Western: Gibraltar line; Eastern: Çanakkale Strait
    coords: [
      [36.18,-6.03],[35.80,-5.92],
      [35.00,-3.00],[37.00,3.00],[43.50,5.00],[43.50,8.00],
      [44.00,12.00],[45.50,13.50],[45.80,15.00],[42.50,19.00],
      [40.05,26.18],[40.02,26.20],[41.50,29.00],[43.00,35.00],
      [36.50,36.50],[35.00,36.00],[31.29,32.47],[31.14,32.27],
      [30.50,25.00],[30.00,15.00],[30.50,5.00],
      [32.00,-2.00],[35.80,-5.92],[36.18,-6.03]
    ]
  },
  {
    // NEW — effective 1 May 2025 per MEPC.328(76)
    name: "Black Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — Black Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.13 — ECA designation MEPC.328(76)",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 May 2025",
    authority: "IMO — MEPC 76 Resolution",
    coords: [
      [41.00,28.00],[41.00,42.00],[47.50,42.00],[47.50,36.00],
      [46.50,32.00],[45.00,29.00],[43.00,28.00],[41.00,28.00]
    ]
  },
];

// ─── LOAD LINE ZONES — ICLL 1966 / Protocol 1988 ─────────────────────────────
export const LOAD_LINE_ZONES = [
  {
    name: "Summer Load Line Zone — North Atlantic",
    shortDesc: "Standard freeboard — moderate conditions",
    zone: "S",
    regulation: "ICLL 1966 / LL Protocol 1988 — Annex II",
    seasons: "Permanent (no seasonal variation in core Summer zone)",
    coords: [
      [36.00,-50.00],[36.00,-15.00],[45.00,-15.00],[45.00,-50.00],[36.00,-50.00]
    ]
  },
  {
    name: "Winter Load Line Zone — North Atlantic",
    shortDesc: "Reduced freeboard allowed — winter season",
    zone: "W",
    regulation: "ICLL 1966 Annex II — Zone W1",
    seasons: "November 1 – March 31 (N. Atlantic)",
    coords: [
      [45.00,-50.00],[45.00,-15.00],[60.00,-15.00],[60.00,-50.00],[45.00,-50.00]
    ]
  },
  {
    name: "Winter Seasonal Zone — N. Pacific",
    shortDesc: "Winter zone — reduced freeboard season North Pacific",
    zone: "W",
    regulation: "ICLL 1966 Annex II",
    seasons: "October 16 – April 15",
    coords: [
      [45.00,-180.00],[45.00,-135.00],[50.00,-135.00],[50.00,-180.00],[45.00,-180.00]
    ]
  },
  {
    name: "Tropical Load Line Zone — Indian Ocean",
    shortDesc: "Additional freeboard allowed — tropical conditions",
    zone: "T",
    regulation: "ICLL 1966 Annex II — Zone T",
    seasons: "Permanent north of 10°S (seasonal boundary near 20°N/S)",
    coords: [
      [-10.00,40.00],[-10.00,95.00],[10.00,95.00],[10.00,55.00],
      [15.00,50.00],[20.00,40.00],[-10.00,40.00]
    ]
  },
  {
    name: "Tropical Load Line Zone — W. Pacific",
    shortDesc: "Additional freeboard allowed — tropical West Pacific",
    zone: "T",
    regulation: "ICLL 1966 Annex II — Zone T",
    seasons: "Permanent below 24°N (outside typhoon seasonal area)",
    coords: [
      [-10.00,95.00],[-10.00,145.00],[18.00,145.00],[18.00,115.00],
      [10.00,100.00],[-10.00,95.00]
    ]
  },
  {
    name: "Tropical Load Line Zone — Atlantic",
    shortDesc: "Additional freeboard allowed — tropical Atlantic",
    zone: "T",
    regulation: "ICLL 1966 Annex II — Zone T",
    seasons: "Permanent between seasonal boundaries",
    coords: [
      [-10.00,-50.00],[-10.00,-15.00],[10.00,-15.00],[10.00,-30.00],
      [20.00,-30.00],[20.00,-50.00],[-10.00,-50.00]
    ]
  },
  {
    name: "Fresh Water Load Line — Major River Zones",
    shortDesc: "Fresh water allowance — reduced salt buoyancy",
    zone: "F / TF",
    regulation: "ICLL 1966 Reg.40 — fresh water allowance",
    seasons: "Applicable whenever entering fresh / brackish water",
    coords: [
      [0.00,3.00],[0.00,7.00],[6.00,7.00],[6.00,3.00],[0.00,3.00]
    ]
  },
  {
    name: "Summer Seasonal Zone — Southern Hemisphere",
    shortDesc: "Summer zone — S. Hemisphere (Oct–Mar)",
    zone: "S",
    regulation: "ICLL 1966 Annex II",
    seasons: "October 1 – March 31",
    coords: [
      [-25.00,-70.00],[-25.00,80.00],[-45.00,80.00],[-45.00,-70.00],[-25.00,-70.00]
    ]
  },
];

// ─── MARITIME RESTRICTIONS — Country / Region Level ──────────────────────────
export const MARITIME_RESTRICTIONS = [
  {
    name: "Iran Sanctions Zone",
    country: "Iran",
    type: "SANCTIONS",
    severity: "critical",
    shortDesc: "US/EU/UN sanctions — vessel calling Iran ports may be denied entry to other ports",
    details: "OFAC/EU sanctions: tankers and vessels calling Iranian ports face secondary sanctions. Insurance may be voided. Flag state restrictions apply.",
    authority: "UN Security Council / US OFAC / EU Council",
    color: "#FF2020",
    coords: [
      [25.00,56.00],[25.00,60.50],[30.00,60.50],[30.00,57.00],
      [29.50,56.00],[25.00,56.00]
    ]
  },
  {
    name: "Crimea / Russia Sanctions Zone",
    country: "Russia / Ukraine",
    type: "SANCTIONS",
    severity: "critical",
    shortDesc: "EU/US sanctions — Crimea port calls prohibited for EU/US flagged vessels",
    details: "EU Regulation 269/2014 & US EO 13685: calling Crimean ports (Sevastopol, Feodosia, Kerch) violates sanctions. Ukrainian territorial waters dispute ongoing.",
    authority: "EU Council / US OFAC",
    color: "#FF2020",
    coords: [
      [44.50,32.50],[44.50,36.50],[46.00,36.50],[46.00,32.50],[44.50,32.50]
    ]
  },
  {
    name: "Red Sea / Houthi High Risk Area",
    country: "Yemen / Red Sea",
    type: "WAR_RISK",
    severity: "critical",
    shortDesc: "Active missile / drone / vessel attack zone — Houthi operations since Nov 2023",
    details: "Houthi (Ansar Allah) targeting commercial vessels in Red Sea, Bab el-Mandeb, Gulf of Aden. W/R insurance surcharges apply. Many operators rerouting via Cape of Good Hope.",
    authority: "IMO MSC / UKMTO / Operation Prosperity Guardian",
    color: "#FF0000",
    coords: [
      [11.50,42.50],[11.50,45.00],[15.00,43.50],[18.00,41.00],
      [22.00,38.00],[25.00,36.50],[28.00,34.00],[29.00,33.00],
      [29.00,32.50],[22.00,37.00],[15.00,42.50],[11.50,42.50]
    ]
  },
  {
    name: "Bab el-Mandeb Strait High Risk",
    country: "Yemen / Djibouti",
    type: "WAR_RISK",
    severity: "critical",
    shortDesc: "High risk chokepoint — armed escort recommended, enhanced watchkeeping",
    details: "Narrow strait (29km) flanked by Yemen. All vessels should register with UKMTO, maintain watch, have armed security team aboard if possible.",
    authority: "IMO / UKMTO / BMP5",
    color: "#FF0000",
    coords: [
      [11.30,42.50],[11.30,44.00],[13.00,44.00],[13.00,42.50],[11.30,42.50]
    ]
  },
  {
    name: "North Korea Exclusion Zone",
    country: "North Korea (DPRK)",
    type: "SANCTIONS",
    severity: "critical",
    shortDesc: "UN/US/EU sanctions — no port calls, ship-to-ship transfers prohibited",
    details: "UN Security Council Resolutions 1718, 2375, 2397: calling DPRK ports or engaging in STS transfers with DPRK-linked vessels violates sanctions. PSC detention risk.",
    authority: "UN Security Council / US OFAC / EU",
    color: "#FF2020",
    coords: [
      [37.50,124.00],[37.50,130.00],[42.50,130.00],[42.50,124.00],[37.50,124.00]
    ]
  },
  {
    name: "Russia Black Sea War Risk Zone",
    country: "Russia / Ukraine",
    type: "WAR_RISK",
    severity: "critical",
    shortDesc: "Active conflict zone — Ukrainian / Russian naval operations",
    details: "Active conflict since Feb 2022. Vessel attacks, mines, drones reported. Significant war risk insurance surcharges. Ukrainian ports of Odessa, Mykolaiv partially operational with risks.",
    authority: "IMO MSC / Lloyd's Market Association",
    color: "#FF0000",
    coords: [
      [43.50,30.50],[43.50,37.50],[47.00,37.50],[47.00,30.50],[43.50,30.50]
    ]
  },
  {
    name: "Somalia / Gulf of Aden HRA",
    country: "Somalia / Djibouti",
    type: "PIRACY",
    severity: "high",
    shortDesc: "IMB High Risk Area — armed piracy / kidnap for ransom",
    details: "BMP5 guidelines mandatory. Armed security recommended. Register with UKMTO. Piracy incidents reduced but risk persists. EUNAVFOR Operation Atalanta patrols area.",
    authority: "IMO / IMB / UKMTO / EUNAVFOR",
    color: "#FF6600",
    coords: [
      [-2.00,42.00],[0.00,42.00],[5.00,48.00],[12.00,48.00],
      [16.00,53.00],[16.00,60.00],[5.00,60.00],[0.00,55.00],
      [-2.00,50.00],[-2.00,42.00]
    ]
  },
  {
    name: "Gulf of Guinea Piracy Zone",
    country: "Nigeria / Benin / Togo / Cameroon",
    type: "PIRACY",
    severity: "high",
    shortDesc: "IMB High Risk Area — kidnapping, armed robbery, vessel hijacking",
    details: "Highest global piracy risk area by IMB statistics. Armed robbery, crew kidnapping common. BMP West Africa guidelines. Lagos, Lomé, Cotonou ports: enhanced security required.",
    authority: "IMO / IMB / Interpol Maritime",
    color: "#FF6600",
    coords: [
      [-3.00,-3.00],[-3.00,5.00],[5.00,8.00],[8.00,5.00],
      [5.00,-1.00],[0.00,-3.00],[-3.00,-3.00]
    ]
  },
  {
    name: "Strait of Hormuz Transit Zone",
    country: "Iran / Oman / UAE",
    type: "RESTRICTED",
    severity: "high",
    shortDesc: "Strategic chokepoint — Iran IRGC vessel seizures, heightened military presence",
    details: "Iran IRGC has seized commercial vessels (2021, 2023). All vessels must follow TSS. Register with UKMTO. Enhanced bridge watchkeeping mandatory. Flag state guidance recommended.",
    authority: "IMO / UKMTO / US 5th Fleet",
    color: "#FF8800",
    coords: [
      [24.00,56.00],[24.00,58.50],[27.00,58.50],[27.00,56.00],[24.00,56.00]
    ]
  },
  {
    name: "Myanmar Restricted Waters",
    country: "Myanmar",
    type: "SANCTIONS",
    severity: "medium",
    shortDesc: "EU/UK sanctions post-2021 coup — oil and gas restrictions",
    details: "EU Council Decision 2021/368: sanctions on Myanmar military entities. Vessels dealing with military-controlled ports or fuel may violate sanctions. Flag state caution advised.",
    authority: "EU Council / UK OFSI",
    color: "#FFB300",
    coords: [
      [10.00,97.00],[10.00,100.00],[16.00,100.00],[16.00,97.00],[10.00,97.00]
    ]
  },
  {
    name: "Venezuela Sanctions Zone",
    country: "Venezuela",
    type: "SANCTIONS",
    severity: "medium",
    shortDesc: "US OFAC sanctions — crude oil cargo restrictions",
    details: "US OFAC Executive Orders restrict dealings with PDVSA and Venezuelan government. Tankers carrying Venezuelan crude face US port denial and sanctions risk.",
    authority: "US OFAC",
    color: "#FFB300",
    coords: [
      [8.00,-73.50],[8.00,-60.00],[12.50,-60.00],[12.50,-73.50],[8.00,-73.50]
    ]
  },
  {
    name: "Libya Conflict Zone",
    country: "Libya",
    type: "WAR_RISK",
    severity: "high",
    shortDesc: "Active conflict — dual government, port security risks",
    details: "Ongoing civil conflict. Ports (Tripoli, Benghazi, Misrata) operational but security volatile. Oil terminal attacks recorded. W/R insurance required. UN arms embargo in force.",
    authority: "IMO / UN Security Council",
    color: "#FF4400",
    coords: [
      [30.00,10.00],[30.00,25.50],[33.50,25.50],[33.50,10.00],[30.00,10.00]
    ]
  },
  {
    name: "Sudan / South Sudan Conflict Zone",
    country: "Sudan",
    type: "WAR_RISK",
    severity: "medium",
    shortDesc: "Port Sudan operations disrupted — conflict since April 2023",
    details: "Port Sudan (main Red Sea port) affected by fighting. Operations partially disrupted. Vessels calling Port Sudan face security risks and potential delays.",
    authority: "IMO MSC / IMB",
    color: "#FF4400",
    coords: [
      [18.00,37.00],[18.00,39.00],[22.50,39.00],[22.50,37.00],[18.00,37.00]
    ]
  },
  {
    name: "Taiwan Strait Heightened Risk",
    country: "China / Taiwan",
    type: "RESTRICTED",
    severity: "medium",
    shortDesc: "Heightened military activity — PLA exercises, increased risk since 2022",
    details: "Periodic PLA naval exercises close Taiwan Strait. AIS spoofing reported. Vessels should monitor NAVTEX/NTM, avoid exercise areas. Route planning should allow for potential disruption.",
    authority: "Taiwan Coast Guard / PRC MSA",
    color: "#FFB300",
    coords: [
      [22.00,119.00],[22.00,122.50],[26.00,122.50],[26.00,119.00],[22.00,119.00]
    ]
  },
];

// ─── CHINA MSC NO-G AREA ──────────────────────────────────────────────────────
export const CHINA_MSC_NO_G = [
  {
    name: "MSC No-G Area — Bohai / Yellow Sea",
    shortDesc: "MSC internal prohibited area — MSC-operated vessels must avoid",
    details: "MSC (Mediterranean Shipping Company) internal operations instruction: vessels under MSC management/charter must not transit this defined area without prior MSC operations approval. Related to shallow draft restrictions and uncharted obstruction risk in inner Bohai approaches.",
    authority: "MSC Ship Management — Internal Circular",
    type: "OPERATOR_RESTRICTION",
    color: "#FF00FF",
    coords: [
      [38.50,120.00],[38.50,121.50],[39.50,121.50],
      [39.50,120.50],[38.80,120.00],[38.50,120.00]
    ]
  },
  {
    name: "MSC No-G Area — Shanghai Approaches",
    shortDesc: "MSC prohibited area — Yangtze estuary shallow zone",
    details: "MSC internal restriction for the outer Yangtze River estuary. Vessels on MSC charter must follow pilot guidance and avoid direct transit. Related to shifting sandbar hazards in the outer bar approach.",
    authority: "MSC Ship Management — Internal Circular",
    type: "OPERATOR_RESTRICTION",
    color: "#FF00FF",
    coords: [
      [31.00,121.50],[31.00,122.50],[31.80,122.50],
      [31.80,121.50],[31.00,121.50]
    ]
  },
];

// ─── EEZ ZONES — Exclusive Economic Zones (200NM) ────────────────────────────
export const EEZ_ZONES = [
  {
    name: "India EEZ",
    shortDesc: "200NM EEZ — Indian Coast Guard jurisdiction, fishing license required",
    regulation: "UNCLOS Art.55-75 / India Maritime Zones Act 1981",
    country: "India",
    coords: [
      [8.00,72.00],[8.00,80.00],[14.00,82.00],[20.00,86.00],
      [22.00,89.00],[23.00,90.00],[22.00,70.00],[20.00,66.00],
      [14.00,68.00],[8.00,72.00]
    ]
  },
  {
    name: "China EEZ — South China Sea",
    shortDesc: "Disputed EEZ — China claims nine-dash line; UNCLOS tribunal ruling 2016",
    regulation: "UNCLOS / China Maritime Law — contested by Philippines, Vietnam, Malaysia",
    country: "China (disputed)",
    coords: [
      [3.00,108.00],[3.00,120.00],[20.00,122.00],[22.00,121.00],
      [20.00,115.00],[15.00,111.00],[10.00,112.00],[5.00,108.00],[3.00,108.00]
    ]
  },
  {
    name: "Australia EEZ — NW Shelf",
    shortDesc: "200NM EEZ — Australian Border Force / AMSA jurisdiction",
    regulation: "UNCLOS / Australia Seas and Submerged Lands Act 1973",
    country: "Australia",
    coords: [
      [-10.00,112.00],[-10.00,128.00],[-20.00,128.00],
      [-25.00,118.00],[-22.00,112.00],[-10.00,112.00]
    ]
  },
  {
    name: "USA EEZ — Gulf of Mexico",
    shortDesc: "US EEZ — USCG / BSEE jurisdiction, OCS energy activities",
    regulation: "UNCLOS equivalent / Outer Continental Shelf Lands Act",
    country: "USA",
    coords: [
      [24.00,-98.00],[24.00,-80.00],[28.00,-80.00],[30.00,-88.00],
      [30.00,-94.00],[28.00,-96.00],[24.00,-98.00]
    ]
  },
  {
    name: "Japan EEZ — Pacific",
    shortDesc: "200NM EEZ — Japan Coast Guard, fishing regulation",
    regulation: "UNCLOS / Japan Law on Exclusive Economic Zone 1996",
    country: "Japan",
    coords: [
      [24.00,122.00],[24.00,136.00],[35.00,142.00],[44.00,145.00],
      [44.00,136.00],[36.00,130.00],[30.00,127.00],[24.00,122.00]
    ]
  },
];

// ─── TIMEZONES ────────────────────────────────────────────────────────────────
export const TIMEZONES = [
  { label:"UTC / GMT",                     offset:0 },
  { label:"IST — India (UTC+5:30)",        offset:5.5 },
  { label:"GST — Gulf / UAE (UTC+4)",      offset:4 },
  { label:"PKT — Pakistan (UTC+5)",        offset:5 },
  { label:"SGT — Singapore (UTC+8)",       offset:8 },
  { label:"CST — China (UTC+8)",           offset:8 },
  { label:"JST — Japan (UTC+9)",           offset:9 },
  { label:"KST — Korea (UTC+9)",           offset:9 },
  { label:"EAT — E.Africa (UTC+3)",        offset:3 },
  { label:"CET — C.Europe (UTC+1)",        offset:1 },
  { label:"CEST — C.Europe Summer(UTC+2)", offset:2 },
  { label:"BST — UK Summer (UTC+1)",       offset:1 },
  { label:"EST — US East (UTC-5)",         offset:-5 },
  { label:"EDT — US East Summer (UTC-4)",  offset:-4 },
  { label:"CST — US Central (UTC-6)",      offset:-6 },
  { label:"PST — US West (UTC-8)",         offset:-8 },
  { label:"WIB — W.Indonesia (UTC+7)",     offset:7 },
  { label:"IRST — Iran (UTC+3:30)",        offset:3.5 },
];

// ─── normalizePortRow ─────────────────────────────────────────────────────────
export function normalizePortRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const col = Object.keys(row).find(c => c.toLowerCase().replace(/[\s_\-]/g, '') === k.toLowerCase().replace(/[\s_\-]/g, ''));
      if (col && row[col] !== undefined && row[col] !== '') return String(row[col]).trim();
    }
    return '';
  };
  const lat = parseFloat(get('latitude', 'lat', 'Latitude', 'LAT'));
  const lon = parseFloat(get('longitude', 'lon', 'long', 'Longitude', 'LON', 'LONG'));
  if (isNaN(lat) || isNaN(lon)) return null;
  const name = get('portname', 'name', 'port', 'PortName', 'Port Name', 'PORT') || get('city', 'City', 'CITY') || '';
  if (!name) return null;
  const city = get('city', 'City', 'CITY') || name;
  const country = get('country', 'Country', 'COUNTRY', 'nation') || '';
  const code = get('locode', 'code', 'portcode', 'PortCode', 'LOCODE', 'unlocode') || name.substring(0, 3).toUpperCase();
  const keywords = [name, city, country, code].filter(Boolean).join(' ').toLowerCase();
  return { id: code, name, city, country, lat, lon, keywords };
}
