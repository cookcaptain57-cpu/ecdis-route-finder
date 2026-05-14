/* eslint-disable */
// ─── ECDIS BRANDS ─────────────────────────────────────────────────────────────
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

// ─── ADMIN CONFIG ─────────────────────────────────────────────────────────────
export const ADMIN_EMAIL = 'ecdisroutes@gmail.com';

// ─── PORTS DATABASE (seed) ────────────────────────────────────────────────────
// Minimal seed — critical routing anchor ports. Full list loaded at runtime from Google Sheet.
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

// ─── MARITIME ZONES ───────────────────────────────────────────────────────────
export const ECA_ZONES = [
  { name:"North Sea ECA",       coords:[[48,-5],[62,-5],[62,13],[48,13]] },
  { name:"Baltic Sea ECA",      coords:[[53,9],[66,9],[66,30],[53,30]] },
  { name:"N. American ECA",     coords:[[24,-100],[24,-50],[75,-50],[75,-100]] },
  { name:"US Caribbean ECA",    coords:[[14,-70],[14,-60],[22,-60],[22,-70]] },
  { name:"China Coastal ECA",   coords:[[18,108],[18,122],[41,122],[41,108]] },
];
export const SECA_ZONES = [
  { name:"Baltic Sea SECA",     coords:[[53,9],[66,9],[66,30],[53,30]] },
  { name:"North Sea SECA",      coords:[[48,-5],[62,-5],[62,13],[48,13]] },
];
export const MARPOL_ZONES = [
  { name:"Mediterranean Sea",   coords:[[30,-6],[30,37],[47,37],[47,-6]] },
  { name:"Baltic Sea",          coords:[[53,9],[66,9],[66,30],[53,30]] },
  { name:"Black Sea",           coords:[[41,28],[47,28],[47,42],[41,42]] },
  { name:"Red Sea",             coords:[[12,32],[30,32],[30,44],[12,44]] },
  { name:"Arabian Gulf",        coords:[[22,48],[30,48],[30,57],[22,57]] },
  { name:"Gulf of Oman",        coords:[[22,56],[26,56],[26,61],[22,61]] },
  { name:"Antarctic Waters",    coords:[[-60,-180],[-60,180],[-90,180],[-90,-180]] },
];
export const PIRACY_ZONES = [
  { name:"Indian Ocean HRA / Gulf of Aden", coords:[[0,40],[0,78],[25,78],[25,40]] },
  { name:"Gulf of Guinea / W. Africa",      coords:[[-5,0],[5,0],[5,10],[-5,10]] },
  { name:"Malacca / Singapore Strait",      coords:[[1,98],[6,98],[6,106],[1,106]] },
  { name:"Somali Coast",                    coords:[[-2,40],[12,40],[12,55],[-2,55]] },
  { name:"Gulf of Guinea Coast",            coords:[[-3,-3],[5,-3],[5,5],[-3,5]] },
];
export const LAYOVER_ZONES = [
  { name:"Mumbai Anchorage",       coords:[[18.8,72.7],[18.8,73.0],[19.1,73.0],[19.1,72.7]] },
  { name:"Singapore Western Anch", coords:[[1.1,103.6],[1.1,103.9],[1.4,103.9],[1.4,103.6]] },
  { name:"Dubai / Jebel Ali Anch", coords:[[24.9,54.9],[24.9,55.2],[25.1,55.2],[25.1,54.9]] },
  { name:"Fujairah Anchorage",     coords:[[25.0,56.2],[25.0,56.5],[25.3,56.5],[25.3,56.2]] },
  { name:"Rotterdam Anchorage",    coords:[[51.8,4.0],[51.8,4.6],[52.0,4.6],[52.0,4.0]] },
  { name:"Colombo Anchorage",      coords:[[6.8,79.7],[6.8,80.0],[7.1,80.0],[7.1,79.7]] },
];

// ─── TIMEZONES ────────────────────────────────────────────────────────────────
export const TIMEZONES = [
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
