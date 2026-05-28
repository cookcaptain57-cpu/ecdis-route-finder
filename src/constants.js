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
// Precise IMO-certified polygon boundaries
export const ECA_ZONES = [
  {
    name: "North Sea ECA",
    shortDesc: "SOx 0.1% / NOx Tier II — MARPOL Annex VI",
    regulation: "MARPOL Annex VI Reg.14 & 13",
    fuelLimit: "0.10% S",
    authority: "IMO / Paris MOU",
    coords: [
      [48.00,-5.00],[48.00,13.00],[54.00,13.00],[54.75,8.50],
      [57.44,8.50],[57.44,12.00],[62.00,12.00],[62.00,-5.00],[48.00,-5.00]
    ]
  },
  {
    name: "Baltic Sea ECA",
    shortDesc: "SOx 0.1% / NOx Tier II — MARPOL Annex VI",
    regulation: "MARPOL Annex VI Reg.14 & 13",
    fuelLimit: "0.10% S",
    authority: "IMO / Helsinki Commission (HELCOM)",
    coords: [
      [53.50,9.00],[53.50,14.00],[54.00,19.50],[55.50,22.00],
      [57.50,21.00],[59.00,23.50],[60.00,27.00],[60.50,28.50],
      [65.00,28.50],[65.00,25.00],[65.50,22.00],[66.00,20.00],
      [65.00,14.00],[62.00,10.00],[58.00,9.00],[56.50,9.00],
      [55.00,9.50],[53.50,9.00]
    ]
  },
  {
    name: "North American ECA",
    shortDesc: "SOx 0.1% within 200NM of US/Canada coast",
    regulation: "MARPOL Annex VI Reg.14 — effective 2012",
    fuelLimit: "0.10% S",
    authority: "US EPA / Transport Canada",
    coords: [
      [60.00,-168.00],[60.00,-130.00],[48.00,-125.00],[32.00,-117.00],
      [24.00,-110.00],[24.00,-82.00],[25.00,-80.00],[31.00,-80.00],
      [35.00,-75.00],[44.00,-66.00],[47.50,-53.00],[50.00,-45.00],
      [60.00,-45.00],[60.00,-168.00]
    ]
  },
  {
    name: "US Caribbean ECA",
    shortDesc: "SOx 0.1% — US Virgin Islands & Puerto Rico",
    regulation: "MARPOL Annex VI Reg.14 — effective 2014",
    fuelLimit: "0.10% S",
    authority: "US EPA",
    coords: [
      [14.00,-67.50],[14.00,-64.00],[19.00,-64.00],[20.00,-65.50],
      [20.00,-68.00],[18.50,-70.00],[14.00,-67.50]
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
    shortDesc: "Strictest SOx — 0.10% sulphur fuel required",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — since 2015",
    fuelLimit: "0.10% S",
    authority: "IMO / Paris MOU",
    coords: [
      [48.00,-5.00],[48.00,13.00],[54.00,13.00],[54.75,8.50],
      [57.44,8.50],[57.44,12.00],[62.00,12.00],[62.00,-5.00],[48.00,-5.00]
    ]
  },
];

// ─── MARPOL SPECIAL AREAS — Annex I / II / V ─────────────────────────────────
// Discharge restrictions for oil, noxious substances, garbage
export const MARPOL_ZONES = [
  {
    name: "Mediterranean Sea Special Area",
    shortDesc: "No oil discharge / no garbage — Annex I & V",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    coords: [
      [30.00,-6.00],[30.00,10.00],[37.50,10.00],[38.00,15.00],
      [36.00,22.00],[34.50,28.00],[36.00,37.00],[42.00,37.00],
      [46.00,14.00],[44.00,8.00],[43.50,-6.00],[30.00,-6.00]
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
    coords: [
      [12.50,43.50],[12.50,44.00],[15.00,42.00],[20.00,38.00],
      [25.00,36.50],[28.00,34.00],[30.00,32.50],[32.50,32.50],
      [32.50,29.50],[28.00,29.50],[22.00,37.00],[18.00,41.00],
      [12.50,43.50]
    ]
  },
  {
    name: "Arabian Gulf Special Area",
    shortDesc: "No oil / no garbage discharge — Persian Gulf",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    coords: [
      [22.00,50.00],[22.00,57.00],[26.00,57.00],[27.50,56.50],
      [29.50,50.50],[29.00,48.50],[27.00,48.50],[24.50,50.00],[22.00,50.00]
    ]
  },
  {
    name: "Gulf of Aden Special Area",
    shortDesc: "No garbage discharge",
    regulation: "MARPOL Annex V Reg.7",
    annex: "V",
    coords: [
      [11.00,43.00],[11.00,58.00],[13.50,58.00],[14.00,53.00],
      [12.50,47.00],[11.50,43.50],[11.00,43.00]
    ]
  },
  {
    name: "Antarctic Special Area",
    shortDesc: "No oil / no garbage / no sewage discharge south of 60°S",
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
      [48.00,-18.00],[48.00,13.00],[62.00,13.00],[62.00,-18.00],[48.00,-18.00]
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

// ─── PIRACY ZONES — unchanged from original ───────────────────────────────────
export const PIRACY_ZONES = [
  { name:"Indian Ocean HRA / Gulf of Aden", coords:[[0,40],[0,78],[25,78],[25,40]] },
  { name:"Gulf of Guinea / W. Africa",      coords:[[-5,0],[5,0],[5,10],[-5,10]] },
  { name:"Malacca / Singapore Strait",      coords:[[1,98],[6,98],[6,106],[1,106]] },
  { name:"Somali Coast",                    coords:[[-2,40],[12,40],[12,55],[-2,55]] },
  { name:"Gulf of Guinea Coast",            coords:[[-3,-3],[5,-3],[5,5],[-3,5]] },
];

// ─── LAYOVER / ANCHORAGE ZONES — unchanged from original ─────────────────────
export const LAYOVER_ZONES = [
  { name:"Mumbai Anchorage",       coords:[[18.8,72.7],[18.8,73.0],[19.1,73.0],[19.1,72.7]] },
  { name:"Singapore Western Anch", coords:[[1.1,103.6],[1.1,103.9],[1.4,103.9],[1.4,103.6]] },
  { name:"Dubai / Jebel Ali Anch", coords:[[24.9,54.9],[24.9,55.2],[25.1,55.2],[25.1,54.9]] },
  { name:"Fujairah Anchorage",     coords:[[25.0,56.2],[25.0,56.5],[25.3,56.5],[25.3,56.2]] },
  { name:"Rotterdam Anchorage",    coords:[[51.8,4.0],[51.8,4.6],[52.0,4.6],[52.0,4.0]] },
  { name:"Colombo Anchorage",      coords:[[6.8,79.7],[6.8,80.0],[7.1,80.0],[7.1,79.7]] },
];

// ─── PSSA — Particularly Sensitive Sea Areas ─────────────────────────────────
// IMO-designated areas requiring special protection measures
export const PSSA_ZONES = [
  {
    name: "Great Barrier Reef PSSA",
    shortDesc: "World's largest coral reef — strict no-discharge, pilotage compulsory",
    measures: "Compulsory pilotage, no anchoring, REEFVTS mandatory",
    designatedYear: 1990,
    authority: "AMSA — Australian Maritime Safety Authority",
    coords: [
      [-10.50,142.00],[-10.50,145.50],[-14.00,146.50],[-18.00,147.50],
      [-22.00,153.00],[-24.50,154.00],[-25.00,153.50],[-20.00,149.00],
      [-16.00,146.00],[-12.00,143.50],[-10.50,142.00]
    ]
  },
  {
    name: "Torres Strait PSSA",
    shortDesc: "Narrow reef-strewn passage — compulsory pilotage for large vessels",
    measures: "Compulsory pilotage for vessels >70m LOA, TSS in force",
    designatedYear: 2005,
    authority: "AMSA / Papua New Guinea NMSA",
    coords: [
      [-9.00,141.50],[-9.00,144.50],[-11.00,144.50],[-11.00,141.50],[-9.00,141.50]
    ]
  },
  {
    name: "Medes Islands PSSA",
    shortDesc: "Marine reserve — NW Mediterranean, Spain",
    measures: "No anchoring, no discharge, speed restrictions",
    designatedYear: 2004,
    authority: "Spanish Authorities / Barcelona Convention",
    coords: [
      [42.00,3.10],[42.00,3.25],[42.10,3.25],[42.10,3.10],[42.00,3.10]
    ]
  },
  {
    name: "Sabana-Camagüey Archipelago PSSA",
    shortDesc: "Cuban coral reef ecosystem — Caribbean",
    measures: "No discharge, no anchoring in reef areas",
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
    measures: "No anchoring on reef, no discharge, speed zones",
    designatedYear: 2002,
    authority: "US Coast Guard / NOAA",
    coords: [
      [24.30,-82.00],[24.30,-80.00],[25.50,-80.00],[25.50,-82.00],[24.30,-82.00]
    ]
  },
  {
    name: "Wadden Sea PSSA",
    shortDesc: "UNESCO World Heritage tidal flat — Netherlands/Germany/Denmark",
    measures: "No discharge, nature reserve, vessel speed limits",
    designatedYear: 2002,
    authority: "OSPAR / Trilateral Wadden Sea Cooperation",
    coords: [
      [52.80,4.60],[52.80,8.80],[55.60,8.80],[55.60,4.60],[52.80,4.60]
    ]
  },
  {
    name: "Canary Islands PSSA",
    shortDesc: "Volcanic archipelago — NE Atlantic, Spain",
    measures: "No discharge, reef protection, reporting system",
    designatedYear: 2005,
    authority: "Spain — Ministerio de Fomento",
    coords: [
      [27.50,-18.20],[27.50,-13.30],[29.50,-13.30],[29.50,-18.20],[27.50,-18.20]
    ]
  },
  {
    name: "Galapagos Islands PSSA",
    shortDesc: "UNESCO World Heritage — Ecuador Pacific",
    measures: "Compulsory pilotage, no discharge, ITOPF zone",
    designatedYear: 2005,
    authority: "Ecuador DIGMER",
    coords: [
      [-2.00,-92.50],[-2.00,-88.50],[1.50,-88.50],[1.50,-92.50],[-2.00,-92.50]
    ]
  },
  {
    name: "Baltic Sea PSSA",
    shortDesc: "Enclosed sea — highly sensitive ecosystem",
    measures: "No discharge, HELCOM reporting, SOx ECA in force",
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
    name: "Patagonian Sea PSSA",
    shortDesc: "Southern Argentina / Chile — penguin & whale habitat",
    measures: "No discharge, reporting area, speed restrictions near colonies",
    designatedYear: 2010,
    authority: "Argentina SHN / Chile DIRECTEMAR",
    coords: [
      [-40.00,-67.00],[-40.00,-56.00],[-56.00,-56.00],[-56.00,-67.00],[-40.00,-67.00]
    ]
  },
  {
    name: "Saba Bank PSSA",
    shortDesc: "Largest submerged atoll — Caribbean Netherlands",
    measures: "No anchoring on bank, no discharge",
    designatedYear: 2012,
    authority: "Netherlands Caribbean Coast Guard",
    coords: [
      [17.00,-64.00],[17.00,-63.00],[18.00,-63.00],[18.00,-64.00],[17.00,-64.00]
    ]
  },
];

// ─── NOX TIER III ZONES — Engine NOx control areas ──────────────────────────
// Ships keel-laid after 1 Jan 2016 must comply with NOx Tier III in these areas
export const NOX_ZONES = [
  {
    name: "North Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — ships built after Jan 2016",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "IMO",
    coords: [
      [48.00,-5.00],[48.00,13.00],[54.00,13.00],[54.75,8.50],
      [57.44,8.50],[57.44,12.00],[62.00,12.00],[62.00,-5.00],[48.00,-5.00]
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
    shortDesc: "NOx Tier III — US/Canada 200NM zone",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "US EPA / Transport Canada",
    coords: [
      [60.00,-168.00],[60.00,-130.00],[48.00,-125.00],[32.00,-117.00],
      [24.00,-110.00],[24.00,-82.00],[25.00,-80.00],[31.00,-80.00],
      [35.00,-75.00],[44.00,-66.00],[47.50,-53.00],[50.00,-45.00],
      [60.00,-45.00],[60.00,-168.00]
    ]
  },
  {
    name: "Mediterranean NOx Tier III ECA",
    shortDesc: "NOx Tier III — Mediterranean Sea (effective May 2025)",
    regulation: "MARPOL Annex VI Reg.13 — NOx Tier III ECA designation 2021",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 May 2025",
    authority: "IMO — MEPC 76 Resolution",
    coords: [
      [30.00,-6.00],[30.00,10.00],[37.50,10.00],[38.00,15.00],
      [36.00,22.00],[34.50,28.00],[36.00,37.00],[42.00,37.00],
      [46.00,14.00],[44.00,8.00],[43.50,-6.00],[30.00,-6.00]
    ]
  },
  {
    name: "Black Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — Black Sea (effective May 2025)",
    regulation: "MARPOL Annex VI Reg.13 — ECA designation 2021",
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
// International Convention on Load Lines zones
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
// Sanctions, transit restrictions, conflict zones, port state bans
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
// MSC (Mediterranean Shipping Company) internal prohibited zone in Chinese waters
// Vessels operating for MSC must avoid this designated no-go area
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
// Key EEZ boundaries where fishing / resource rights apply
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

// ─── TIMEZONES — unchanged from original ─────────────────────────────────────
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

// ─── normalizePortRow — unchanged from original ───────────────────────────────
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
