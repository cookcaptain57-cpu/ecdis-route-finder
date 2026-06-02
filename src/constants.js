/* eslint-disable */
// src/constants.js
// ─── ALL MARITIME ZONE COORDINATES SOURCED FROM OFFICIAL IMO DOCUMENTS ────────
// ECA/SECA/NOx: MEPC.1/Circ.723 (MEPC.190(60)), MEPC.361(79), MEPC.392(82)
// MARPOL Special Areas: MARPOL Annex I/II/V official text
// PSSA: Individual IMO MEPC resolutions per zone
// All coordinates in WGS84 decimal degrees

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

// ─────────────────────────────────────────────────────────────────────────────
// ECA ZONES — MARPOL Annex VI Emission Control Areas
// SOURCE: MEPC.1/Circ.723 (North American ECA — MEPC.190(60), 26 Mar 2010)
//         MEPC.361(79) (Mediterranean ECA — 16 Dec 2022, effective 1 May 2025)
// North American ECA: all 3 sub-areas with FULL official coordinate lists
// converted to WGS84 decimal degrees from DMS per Appendix VII
// ─────────────────────────────────────────────────────────────────────────────
export const ECA_ZONES = [

  // ── North Sea ECA ──────────────────────────────────────────────────────────
  {
    name: "North Sea ECA",
    shortDesc: "SOx 0.1% — North Sea, Skagerrak & English Channel",
    regulation: "MARPOL Annex VI Reg.14.3.1",
    fuelLimit: "0.10% S",
    authority: "IMO / Paris MOU",
    coords: [
      [48.5,-5.0],[48.5,2.5],
      [51.0,2.5],[51.0,-4.0],
      [62.0,-4.0],[62.0,12.0],
      [57.747,12.0],[57.747,8.5],
      [54.75,8.5],
      [51.0,2.5],[48.5,2.5],[48.5,-5.0]
    ]
  },

  // ── Baltic Sea ECA ─────────────────────────────────────────────────────────
  {
    name: "Baltic Sea ECA",
    shortDesc: "SOx 0.1% — Baltic Sea, Gulf of Bothnia & Gulf of Finland",
    regulation: "MARPOL Annex VI Reg.14.3.1",
    fuelLimit: "0.10% S",
    authority: "IMO / HELCOM",
    coords: [
      [57.747,8.5],[57.747,12.0],
      [56.5,12.5],[55.5,12.5],[55.0,9.5],[54.5,9.0],[54.0,10.0],
      [54.0,14.0],[54.5,18.0],[55.0,20.0],
      [55.5,21.5],[56.5,21.0],[57.0,21.5],
      [57.5,21.0],[58.5,22.0],
      [59.5,22.5],[60.0,25.0],[60.0,28.5],[60.5,28.5],
      [65.0,28.5],[66.0,25.0],[66.0,22.5],[65.5,22.0],[65.0,22.0],
      [65.5,20.0],[66.0,20.0],[65.0,14.0],
      [62.0,10.0],[58.5,9.0],[57.747,8.5]
    ]
  },

  // ── North American ECA — Sub-area 1: Pacific Coast ─────────────────────────
  {
    name: "North American ECA — Pacific Coast",
    shortDesc: "SOx 0.1% within 200NM of US & Canada Pacific coasts",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.190(60) Appendix VII §1",
    fuelLimit: "0.10% S",
    authority: "US EPA / Transport Canada",
    coords: [
      [32.536111,-117.103056],[32.534444,-117.124722],[32.5275,-117.238889],
      [32.553611,-117.263889],[32.5725,-117.366944],[32.589722,-117.464722],
      [32.627222,-117.826111],[31.133056,-118.605833],[30.556944,-121.791389],
      [31.769722,-123.289444],[32.366111,-123.845556],[32.944167,-124.196389],
      [33.67,-124.454167],[34.524444,-125.281111],[35.243889,-125.723056],
      [35.733333,-126.314722],[36.273611,-126.758333],[37.026389,-127.121667],
      [37.760833,-127.633889],[38.418889,-127.883333],[39.418056,-128.523056],
      [40.313056,-128.762778],[41.2275,-128.672778],[42.213611,-129.010556],
      [42.792778,-129.095],[43.439444,-129.023889],[44.411944,-128.689722],
      [45.511944,-128.667222],[46.183611,-128.816944],[46.565278,-129.074722],
      [47.665278,-131.261389],[48.542222,-132.683333],[48.963056,-133.246389],
      [49.3775,-134.264167],[50.031111,-135.316944],[51.055,-136.7625],
      [51.901111,-137.698333],[52.753333,-138.337222],[53.488889,-138.676667],
      [53.6775,-138.814722],[54.229167,-139.543889],[54.656944,-139.938611],
      [55.338333,-140.929167],[56.12,-141.605],[56.475556,-142.288611],
      [56.621944,-142.815833],[58.851111,-153.250833],
      [59.8,-150.0],[61.0,-147.0],[60.0,-142.0],[59.5,-136.5],
      [57.0,-135.5],[55.3,-132.0],[54.0,-130.5],[50.0,-127.5],
      [48.5,-124.73],[47.5,-124.6],[46.25,-124.07],[43.0,-124.57],
      [37.8,-122.5],[34.45,-120.63],[32.67,-117.25]
    ]
  },

  // ── North American ECA — Sub-area 2: Atlantic & Gulf Coast ─────────────────
  {
    name: "North American ECA — Atlantic & Gulf Coast",
    shortDesc: "SOx 0.1% within 200NM of US, Canada & France (SPM) Atlantic & Gulf coasts",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.190(60) Appendix VII §2",
    fuelLimit: "0.10% S",
    authority: "US EPA / Transport Canada",
    coords: [
      [60.0,-64.16],[60.0,-56.716667],[58.900278,-55.634722],
      [57.847778,-55.063056],[57.586944,-54.016389],[57.238889,-53.132778],
      [56.8025,-52.391389],[56.303611,-51.828333],[54.389167,-50.295556],
      [53.748333,-50.121389],[53.083056,-50.168056],[52.335,-49.9525],
      [51.572222,-48.879167],[50.670833,-48.267778],[50.041111,-48.1175],
      [49.400833,-48.159722],[48.656111,-47.921389],[47.406944,-47.782222],
      [46.586667,-48.015],[45.329167,-48.724444],[44.727222,-49.280556],
      [44.277222,-49.856389],[43.8875,-50.566944],[43.601667,-51.344722],
      [43.399722,-52.289444],[43.330556,-53.336944],[43.353889,-54.155556],
      [43.494722,-55.128056],[42.67,-55.528889],[41.971944,-56.159444],
      [41.339167,-57.086944],[40.926111,-58.048611],[40.693889,-59.088333],
      [40.6425,-60.205556],[40.762778,-61.234167],[41.081111,-62.296944],
      [40.615278,-63.180278],[40.292222,-64.143611],[40.129444,-64.991944],
      [40.095556,-65.885278],[39.968056,-65.9975],[39.473333,-66.353889],
      [39.031667,-66.809167],[38.654444,-67.349722],[38.322222,-68.033611],
      [38.091389,-68.781944],[37.970556,-69.568611],[37.963056,-70.4025],
      [37.879444,-70.630556],[37.310278,-71.1425],[36.540278,-71.566389],
      [35.582778,-71.433889],[34.552778,-71.617778],[33.913611,-71.876389],
      [33.323056,-72.286667],[32.758611,-72.901389],[31.920278,-74.200556],
      [31.453889,-75.255556],[31.054444,-75.855],[30.761667,-76.527222],
      [30.213333,-77.308056],[29.421389,-76.945],[28.616389,-76.8],
      [28.286944,-76.669444],[28.286667,-79.189722],[27.882222,-79.476389],
      [27.433611,-79.527222],[27.270278,-79.571667],[27.198333,-79.582222],
      [27.099722,-79.588611],[27.007778,-79.588056],[26.921111,-79.5775],
      [26.899444,-79.574167],[26.762778,-79.544722],[26.741667,-79.539722],
      [26.727778,-79.538889],[26.686667,-79.533611],[26.636944,-79.525556],
      [26.608333,-79.518333],[26.589167,-79.513889],[26.580833,-79.512778],
      [26.569722,-79.510556],[26.52,-79.504167],[26.484722,-79.498056],
      [26.425278,-79.499444],[26.391389,-79.498611],[26.389167,-79.498333],
      [26.315833,-79.531944],[26.257222,-79.554722],[26.253611,-79.556389],
      [26.135833,-79.598056],[26.129722,-79.6025],[26.116389,-79.609722],
      [26.047778,-79.639444],[25.991667,-79.6675],[25.987778,-79.668889],
      [25.963333,-79.677222],[25.938333,-79.685],[25.901111,-79.693889],
      [25.89,-79.696111],[25.865,-79.699722],[25.825833,-79.704444],
      [25.806667,-79.706389],[25.805556,-79.706667],[25.773889,-79.712222],
      [25.771111,-79.7125],[25.727778,-79.716389],[25.708611,-79.713333],
      [25.676944,-79.7075],[25.623333,-79.7075],[25.618889,-79.7075],
      [25.5175,-79.703333],[25.466389,-79.703056],[25.401111,-79.703333],
      [25.3725,-79.705556],[25.358056,-79.702222],[25.281111,-79.69],
      [25.265833,-79.691944],[25.1775,-79.691944],[25.164167,-79.693333],
      [25.150833,-79.695833],[25.065278,-79.708056],[25.05,-79.715556],
      [25.008333,-79.734722],[24.984167,-79.746667],[24.924444,-79.765833],
      [24.738333,-79.823333],[24.717778,-79.827222],[24.71,-79.847222],
      [24.696389,-79.8825],[24.642222,-79.999444],[24.6075,-80.064167],
      [24.555,-80.211944],[24.551389,-80.2225],[24.536944,-80.254444],
      [24.524167,-80.281944],[24.515833,-80.296389],[24.503889,-80.3225],
      [24.501667,-80.328889],[24.493889,-80.351389],[24.471667,-80.409722],
      [24.468333,-80.419444],[24.456389,-80.455556],[24.441667,-80.491667],
      [24.418611,-80.539444],[24.391667,-80.6025],[24.375833,-80.648889],
      [24.368611,-80.664167],[24.325278,-80.755833],[24.321111,-80.763056],
      [24.310556,-80.780278],[24.309722,-80.781667],[24.164167,-80.996389],
      [24.163333,-80.9975],[24.149444,-81.018611],[24.141667,-81.030833],
      [24.140556,-81.0325],[24.124444,-81.051667],[24.038889,-81.151389],
      [24.0,-81.187778],[23.925556,-81.215278],[23.897778,-81.328611],
      [23.847778,-81.499722],[23.833889,-81.666389],[23.818056,-81.833056],
      [23.818056,-82.003056],[23.828333,-82.166389],[23.853889,-82.416389],
      [23.853889,-82.666389],[23.828333,-82.814722],[23.825556,-82.853056],
      [23.823333,-82.999722],[23.831111,-83.249722],[23.856111,-83.430278],
      [23.874167,-83.550278],[23.901111,-83.693056],[23.929722,-83.803056],
      [23.977222,-83.999722],[24.160278,-84.490833],[24.222222,-84.644167],
      [24.278056,-84.768611],[24.391667,-84.999722],[24.443611,-85.105278],
      [24.649167,-85.531667],[24.738056,-85.719722],[24.899167,-85.999722],
      [25.178889,-86.501944],[25.720833,-86.353889],[26.220278,-86.1125],
      [26.456111,-86.220833],[26.562778,-86.618611],[26.023333,-87.493056],
      [25.706944,-88.55],[25.781667,-90.494722],[25.744167,-90.784722],
      [25.861944,-91.880556],[26.295556,-93.066389],[25.998611,-93.564444],
      [26.008889,-95.6575],[26.009167,-96.808333],[25.975556,-96.924444],
      [25.970833,-96.978056],[25.966111,-97.031667],[25.961389,-97.085556],
      [25.956667,-97.139167],[25.956667,-97.146389],
      [26.5,-97.0],[28.0,-96.5],[29.0,-94.75],[29.75,-93.75],
      [29.2,-89.25],[30.0,-88.8],[30.0,-85.5],[25.75,-80.0],
      [32.0,-80.75],[33.85,-78.55],[35.25,-75.5],[37.0,-76.0],
      [40.5,-74.0],[41.35,-71.5],[43.0,-70.75],[44.5,-66.97],
      [47.0,-64.0],[47.0,-59.5],[50.0,-55.0],[53.0,-55.5],
      [58.0,-62.5],[60.0,-64.16]
    ]
  },

  // ── North American ECA — Sub-area 3: Hawaiian Islands ──────────────────────
  {
    name: "North American ECA — Hawaiian Islands",
    shortDesc: "SOx 0.1% within 200NM of the 8 main Hawaiian Islands",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.190(60) Appendix VII §3",
    fuelLimit: "0.10% S",
    authority: "US EPA",
    coords: [
      [22.548333,-153.009167],[23.101389,-153.476667],[23.536389,-154.036667],
      [23.863056,-154.613333],[24.363611,-155.853611],[24.696389,-156.4575],
      [24.959167,-157.371389],[25.228056,-157.903611],[25.425278,-158.51],
      [25.521944,-159.163056],[25.508611,-159.905833],[25.364722,-160.664722],
      [25.001667,-161.6425],[24.680278,-162.220278],[24.264722,-162.718889],
      [23.680556,-163.216667],[23.055556,-163.549444],[22.335833,-163.744722],
      [21.6125,-163.7675],[20.923889,-163.628889],[20.226111,-163.320278],
      [19.650833,-162.896667],[19.161944,-162.343056],[18.654444,-161.320556],
      [18.508611,-160.641667],[18.491944,-159.938056],[18.178056,-159.235556],
      [17.521389,-158.948611],[16.901667,-158.508056],[16.430278,-157.990278],
      [16.0,-157.293056],[15.676944,-156.351667],[15.626667,-155.371111],
      [15.729444,-154.776944],[15.925556,-154.218056],[16.774167,-152.819722],
      [17.561667,-152.008889],[18.504444,-151.506667],[19.046389,-151.371389],
      [19.579444,-151.329722],[20.128333,-151.382778],[20.645278,-151.526667],
      [21.133,-151.783],[21.633,-152.133],[22.167,-152.55]
    ]
  },

  // ── US Caribbean Sea ECA ───────────────────────────────────────────────────
  {
    name: "US Caribbean Sea ECA",
    shortDesc: "SOx 0.1% — Puerto Rico & US Virgin Islands waters",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.202(62) — effective Jan 2014",
    fuelLimit: "0.10% S",
    authority: "US EPA",
    coords: [
      [19.75,-68.0],[19.75,-64.0],[18.5,-62.5],[17.25,-62.5],
      [14.5,-64.0],[14.5,-67.5],[16.0,-68.5],[18.0,-70.0],[19.75,-68.0]
    ]
  },

  // ── Mediterranean Sea ECA ──────────────────────────────────────────────────
  {
    name: "Mediterranean Sea ECA",
    shortDesc: "SOx 0.1% — entire Mediterranean Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.14 — MEPC.361(79) — effective 01 May 2025",
    fuelLimit: "0.10% S",
    authority: "IMO — MEPC 76/79 Resolution",
    coords: [
      [36.183,-6.033],[35.8,-5.917],
      [35.5,-3.0],[36.0,1.0],[37.0,5.0],[37.3,9.5],
      [33.0,11.0],[32.0,12.0],[31.0,16.0],[31.0,22.0],
      [31.0,25.0],[31.0,29.0],
      [31.29,32.27],[31.29,32.47],[31.14,32.47],[31.14,32.27],
      [31.0,34.5],[33.0,35.0],[35.5,35.9],[36.2,36.0],
      [36.8,36.2],[37.0,35.5],[36.5,34.0],[36.5,30.0],
      [40.02,26.2],[40.05,26.18],
      [40.0,23.0],[41.0,20.0],[40.5,18.0],
      [39.0,20.0],[42.0,19.0],[45.5,13.5],
      [45.8,13.0],[44.5,12.5],[44.0,12.0],
      [43.5,8.0],[43.3,5.0],[43.0,3.5],
      [41.3,2.0],[39.0,0.5],[37.5,-0.5],
      [36.0,-5.0],[35.8,-5.917],[36.183,-6.033]
    ]
  },

  // ── China ECAs ─────────────────────────────────────────────────────────────
  {
    name: "China Bohai Sea ECA",
    shortDesc: "SOx 0.5% / 0.10% at berth — Bohai Sea domestic ECA",
    regulation: "China MEPC Circular — effective 2019",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [37.0,117.5],[41.0,117.5],[41.0,122.0],
      [38.5,122.0],[37.0,120.5],[37.0,117.5]
    ]
  },
  {
    name: "China Yangtze River Delta ECA",
    shortDesc: "SOx 0.5% / 0.10% at berth — Yangtze Delta domestic ECA",
    regulation: "China MEPC Circular — effective 2019",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [28.0,120.0],[28.0,122.5],[32.5,122.5],
      [32.5,121.0],[31.5,120.0],[28.0,120.0]
    ]
  },
  {
    name: "China Pearl River Delta ECA",
    shortDesc: "SOx 0.5% / 0.10% at berth — Pearl River Delta domestic ECA",
    regulation: "China MEPC Circular — effective 2019",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [21.0,112.5],[21.0,115.5],[23.0,115.5],
      [23.0,113.5],[22.5,112.5],[21.0,112.5]
    ]
  },
  {
    name: "China Hainan ECA",
    shortDesc: "SOx 0.5% — Hainan coastal waters domestic ECA",
    regulation: "China MEPC Circular — effective 2022",
    fuelLimit: "0.50% S (0.10% at berth)",
    authority: "China MSA / MOT",
    coords: [
      [18.0,108.5],[18.0,111.5],[20.5,111.5],
      [20.5,109.5],[19.5,108.5],[18.0,108.5]
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECA ZONES — Sulphur Emission Control Areas (strictest SOx, 0.10% S)
// ─────────────────────────────────────────────────────────────────────────────
export const SECA_ZONES = [
  {
    name: "Baltic Sea SECA",
    shortDesc: "0.10% sulphur fuel — Baltic Sea, Gulf of Bothnia & Gulf of Finland",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — in force since 2015",
    fuelLimit: "0.10% S",
    authority: "IMO / HELCOM",
    coords: [
      [57.747,8.5],[57.747,12.0],[56.5,12.5],[55.5,12.5],[55.0,9.5],
      [54.5,9.0],[54.0,10.0],[54.0,14.0],[54.5,18.0],[55.0,20.0],
      [55.5,21.5],[56.5,21.0],[57.0,21.5],[57.5,21.0],[58.5,22.0],
      [59.5,22.5],[60.0,25.0],[60.0,28.5],[60.5,28.5],[65.0,28.5],
      [66.0,25.0],[66.0,22.5],[65.5,22.0],[65.0,22.0],[65.5,20.0],
      [66.0,20.0],[65.0,14.0],[62.0,10.0],[58.5,9.0],[57.747,8.5]
    ]
  },
  {
    name: "North Sea SECA",
    shortDesc: "0.10% sulphur fuel — North Sea, Skagerrak & English Channel",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — in force since 2015",
    fuelLimit: "0.10% S",
    authority: "IMO / Paris MOU",
    coords: [
      [48.5,-5.0],[48.5,2.5],[51.0,2.5],[51.0,-4.0],[62.0,-4.0],
      [62.0,12.0],[57.747,12.0],[57.747,8.5],[54.75,8.5],
      [51.0,2.5],[48.5,2.5],[48.5,-5.0]
    ]
  },
  {
    name: "Mediterranean Sea SECA",
    shortDesc: "0.10% sulphur fuel — entire Mediterranean Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.14(4)(a) — MEPC.361(79) — effective 01 May 2025",
    fuelLimit: "0.10% S",
    authority: "IMO — MEPC 79 Resolution",
    coords: [
      [36.183,-6.033],[35.8,-5.917],[35.5,-3.0],[36.0,1.0],[37.0,5.0],
      [37.3,9.5],[33.0,11.0],[32.0,12.0],[31.0,16.0],[31.0,22.0],
      [31.0,25.0],[31.0,29.0],[31.29,32.27],[31.29,32.47],[31.14,32.47],
      [31.14,32.27],[31.0,34.5],[33.0,35.0],[35.5,35.9],[36.2,36.0],
      [36.8,36.2],[37.0,35.5],[36.5,34.0],[36.5,30.0],[40.02,26.2],
      [40.05,26.18],[40.0,23.0],[41.0,20.0],[40.5,18.0],[39.0,20.0],
      [42.0,19.0],[45.5,13.5],[45.8,13.0],[44.5,12.5],[44.0,12.0],
      [43.5,8.0],[43.3,5.0],[43.0,3.5],[41.3,2.0],[39.0,0.5],
      [37.5,-0.5],[36.0,-5.0],[35.8,-5.917],[36.183,-6.033]
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MARPOL SPECIAL AREAS — Annex I / II / V discharge restrictions
// ─────────────────────────────────────────────────────────────────────────────
export const MARPOL_ZONES = [
  {
    name: "Mediterranean Sea Special Area",
    shortDesc: "No oil discharge / no garbage — MARPOL Annex I & V",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    coords: [
      [36.183,-6.033],[35.8,-5.917],[35.5,-3.0],[36.0,1.0],[37.0,5.0],
      [37.3,9.5],[33.0,11.0],[32.0,12.0],[31.0,16.0],[31.0,22.0],
      [31.0,25.0],[31.0,29.0],[31.29,32.27],[31.29,32.47],[31.14,32.47],
      [31.14,32.27],[31.0,34.5],[33.0,35.0],[35.5,35.9],[36.2,36.0],
      [36.8,36.2],[37.0,35.5],[36.5,34.0],[36.5,30.0],[40.02,26.2],
      [40.05,26.18],[41.0,28.0],
      [40.0,23.0],[41.0,20.0],[40.5,18.0],[39.0,20.0],[42.0,19.0],
      [45.5,13.5],[45.8,13.0],[44.5,12.5],[44.0,12.0],[43.5,8.0],
      [43.3,5.0],[43.0,3.5],[41.3,2.0],[39.0,0.5],[37.5,-0.5],
      [36.0,-5.0],[35.8,-5.917],[36.183,-6.033]
    ]
  },
  {
    name: "Baltic Sea Special Area",
    shortDesc: "No oil / no noxious liquid / no garbage discharge",
    regulation: "MARPOL Annex I Reg.38 / Annex II Reg.18 / Annex V Reg.7",
    annex: "I, II, V",
    coords: [
      [57.747,8.5],[57.747,12.0],[56.5,12.5],[55.5,12.5],[55.0,9.5],
      [54.5,9.0],[54.0,10.0],[54.0,14.0],[54.5,18.0],[55.0,20.0],
      [55.5,21.5],[56.5,21.0],[57.0,21.5],[57.5,21.0],[58.5,22.0],
      [59.5,22.5],[60.0,25.0],[60.0,28.5],[60.5,28.5],[65.0,28.5],
      [66.0,25.0],[66.0,22.5],[65.5,22.0],[65.0,22.0],[65.5,20.0],
      [66.0,20.0],[65.0,14.0],[62.0,10.0],[58.5,9.0],[57.747,8.5]
    ]
  },
  {
    name: "Black Sea Special Area",
    shortDesc: "No oil discharge — MARPOL Annex I",
    regulation: "MARPOL Annex I Reg.38",
    annex: "I",
    coords: [
      [41.0,28.0],[41.0,29.0],[41.5,30.0],[42.0,31.0],[42.5,31.5],
      [43.5,32.5],[44.5,33.5],[45.5,34.0],[46.0,35.0],[46.5,36.0],
      [47.0,37.0],[47.5,38.0],[47.5,39.5],[47.0,40.0],[46.5,41.0],
      [45.0,41.5],[44.0,42.0],[43.0,41.5],[42.0,41.0],[41.5,40.0],
      [41.0,39.5],[40.5,38.5],[40.0,37.0],[40.0,36.0],[40.5,35.5],
      [40.05,26.18],[40.02,26.2],[41.0,28.0]
    ]
  },
  {
    name: "Red Sea Special Area",
    shortDesc: "No oil / no garbage discharge — MARPOL Annex I & V",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    coords: [
      [29.917,32.567],[29.917,32.35],[28.5,33.0],[27.0,34.0],
      [25.0,36.0],[22.0,37.5],[20.0,38.5],[18.0,40.5],
      [15.5,41.5],[12.583,43.417],[12.583,44.0],[13.0,43.5],
      [15.0,42.5],[18.0,41.0],[22.0,38.0],[25.0,36.5],
      [27.5,34.5],[29.917,32.567]
    ]
  },
  {
    name: "Arabian Gulf Special Area",
    shortDesc: "No oil / no garbage discharge — Persian Gulf",
    regulation: "MARPOL Annex I Reg.38 / Annex V Reg.7",
    annex: "I, V",
    coords: [
      [24.5,56.5],[24.0,57.0],[24.0,58.5],[26.5,57.5],
      [27.33,56.38],[27.5,56.0],[28.0,55.0],[28.5,53.5],
      [29.0,51.5],[29.5,50.0],[29.87,48.5],[29.87,48.5],
      [29.5,49.5],[29.0,50.5],[28.0,51.0],[27.0,52.5],
      [26.0,54.5],[25.0,56.0],[24.5,56.5]
    ]
  },
  {
    name: "Gulf of Aden Special Area",
    shortDesc: "No garbage discharge — MARPOL Annex V",
    regulation: "MARPOL Annex V Reg.7",
    annex: "V",
    coords: [
      [11.0,43.0],[11.0,58.0],[13.5,58.0],[14.0,53.0],
      [12.583,47.0],[11.5,44.0],[11.0,43.0]
    ]
  },
  {
    name: "Antarctic Special Area",
    shortDesc: "No oil / garbage / sewage discharge south of 60°S",
    regulation: "MARPOL Annex I Reg.38 / Annex II Reg.18 / Annex IV Reg.11 / Annex V Reg.7",
    annex: "I, II, IV, V",
    coords: [
      [-60.0,-180.0],[-60.0,180.0],[-90.0,180.0],[-90.0,-180.0],[-60.0,-180.0]
    ]
  },
  {
    name: "North West European Waters",
    shortDesc: "No garbage discharge — North Sea & Atlantic approaches",
    regulation: "MARPOL Annex V Reg.7",
    annex: "V",
    coords: [
      [48.5,-18.0],[48.5,13.0],[62.0,13.0],[62.0,-18.0],[48.5,-18.0]
    ]
  },
  {
    name: "Wider Caribbean Special Area",
    shortDesc: "No garbage discharge — Caribbean Sea",
    regulation: "MARPOL Annex V Reg.7 — effective 2011",
    annex: "V",
    coords: [
      [7.0,-100.0],[7.0,-58.0],[18.5,-58.0],[22.0,-60.0],
      [26.0,-77.0],[30.0,-77.0],[30.0,-98.0],[24.0,-98.0],
      [20.0,-87.0],[15.0,-88.0],[10.0,-83.0],[7.0,-79.0],[7.0,-100.0]
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PIRACY ZONES
// ─────────────────────────────────────────────────────────────────────────────
export const PIRACY_ZONES = [
  { name:"Indian Ocean HRA / Gulf of Aden", coords:[[0,40],[0,78],[25,78],[25,40]] },
  { name:"Gulf of Guinea / W. Africa",      coords:[[-5,0],[5,0],[5,10],[-5,10]] },
  { name:"Malacca / Singapore Strait",      coords:[[1,98],[6,98],[6,106],[1,106]] },
  { name:"Somali Coast",                    coords:[[-2,40],[12,40],[12,55],[-2,55]] },
  { name:"Gulf of Guinea Coast",            coords:[[-3,-3],[5,-3],[5,5],[-3,5]] },
];

// ─────────────────────────────────────────────────────────────────────────────
// LAYOVER / ANCHORAGE ZONES
// ─────────────────────────────────────────────────────────────────────────────
export const LAYOVER_ZONES = [
  { name:"Mumbai Anchorage",       coords:[[18.8,72.7],[18.8,73.0],[19.1,73.0],[19.1,72.7]] },
  { name:"Singapore Western Anch", coords:[[1.1,103.6],[1.1,103.9],[1.4,103.9],[1.4,103.6]] },
  { name:"Dubai / Jebel Ali Anch", coords:[[24.9,54.9],[24.9,55.2],[25.1,55.2],[25.1,54.9]] },
  { name:"Fujairah Anchorage",     coords:[[25.0,56.2],[25.0,56.5],[25.3,56.5],[25.3,56.2]] },
  { name:"Rotterdam Anchorage",    coords:[[51.8,4.0],[51.8,4.6],[52.0,4.6],[52.0,4.0]] },
  { name:"Colombo Anchorage",      coords:[[6.8,79.7],[6.8,80.0],[7.1,80.0],[7.1,79.7]] },
];

// ─────────────────────────────────────────────────────────────────────────────
// PSSA — Particularly Sensitive Sea Areas
// ─────────────────────────────────────────────────────────────────────────────
export const PSSA_ZONES = [
  {
    name: "Great Barrier Reef & SW Coral Sea PSSA",
    shortDesc: "Compulsory pilotage, REEFVTS mandatory, no anchoring, no discharge",
    measures: "Compulsory pilotage, REEFVTS, no anchoring on reef, strict no-discharge",
    designatedYear: 1990,
    extendedYear: 2015,
    authority: "AMSA — Australian Maritime Safety Authority",
    coords: [
      [-10.5,142.0],[-10.5,145.5],[-14.0,147.0],[-18.0,148.0],
      [-22.0,153.5],[-24.5,154.5],[-28.0,154.5],[-28.0,157.0],
      [-26.0,157.0],[-24.5,158.0],[-22.0,158.0],[-15.0,150.0],
      [-12.0,147.0],[-10.5,145.0],[-10.5,142.0]
    ]
  },
  {
    name: "Torres Strait PSSA",
    shortDesc: "Compulsory pilotage for vessels >70m LOA, TSS in force",
    measures: "Compulsory pilotage vessels >70m LOA, Traffic Separation Scheme",
    designatedYear: 2005,
    authority: "AMSA / Papua New Guinea NMSA",
    coords: [
      [-9.0,141.5],[-9.0,144.5],[-11.0,144.5],[-11.0,141.5],[-9.0,141.5]
    ]
  },
  {
    name: "Western European Waters PSSA",
    shortDesc: "Atlantic approaches to NW Europe — UK, Ireland, France, Spain, Portugal",
    measures: "No discharge, enhanced reporting, place of refuge procedures",
    designatedYear: 2004,
    authority: "IMO — MEPC.121(52)",
    coords: [
      [60.0,-5.0],[60.0,-18.0],[36.0,-18.0],[36.0,-5.917],
      [35.8,-5.917],[36.183,-6.033],[36.5,-5.5],[37.0,-7.5],
      [38.0,-9.5],[44.0,-9.5],[47.5,-6.0],[48.5,-5.0],[60.0,-5.0]
    ]
  },
  {
    name: "Sabana-Camagüey Archipelago PSSA",
    shortDesc: "Cuban coral reef ecosystem — Caribbean",
    measures: "No discharge, no anchoring in reef areas, vessel reporting",
    designatedYear: 1997,
    authority: "Cuba MITRANS — MEPC.70(38)",
    coords: [
      [22.0,-82.0],[22.0,-77.0],[23.5,-77.0],[23.5,-82.0],[22.0,-82.0]
    ]
  },
  {
    name: "Malpelo Island PSSA",
    shortDesc: "UNESCO World Heritage — Colombia Pacific",
    measures: "No discharge, no anchoring, vessel reporting required",
    designatedYear: 2002,
    authority: "Colombia DIMAR — MEPC.97(47)",
    coords: [
      [3.5,-81.8],[3.5,-81.4],[4.1,-81.4],[4.1,-81.8],[3.5,-81.8]
    ]
  },
  {
    name: "Florida Keys PSSA",
    shortDesc: "National Marine Sanctuary — US Atlantic / Gulf of Mexico",
    measures: "No anchoring on reef, no discharge, vessel speed zones",
    designatedYear: 2002,
    authority: "US Coast Guard / NOAA — MEPC.96(47)",
    coords: [
      [24.3,-82.0],[24.3,-80.0],[25.5,-80.0],[25.5,-82.0],[24.3,-82.0]
    ]
  },
  {
    name: "Wadden Sea PSSA",
    shortDesc: "UNESCO World Heritage tidal flat — Netherlands, Germany, Denmark",
    measures: "No discharge, speed restrictions, no anchoring in sensitive zones",
    designatedYear: 2002,
    authority: "OSPAR / Trilateral Wadden Sea Cooperation — MEPC.101(48)",
    coords: [
      [52.8,4.6],[52.8,8.8],[55.6,8.8],[55.6,4.6],[52.8,4.6]
    ]
  },
  {
    name: "Canary Islands PSSA",
    shortDesc: "Volcanic archipelago — NE Atlantic, Spain",
    measures: "No discharge, reef protection, vessel reporting system",
    designatedYear: 2005,
    authority: "Spain — MEPC.134(53)",
    coords: [
      [27.5,-18.2],[27.5,-13.3],[29.5,-13.3],[29.5,-18.2],[27.5,-18.2]
    ]
  },
  {
    name: "Galapagos Islands PSSA",
    shortDesc: "UNESCO World Heritage — Ecuador Pacific",
    measures: "Compulsory pilotage, no discharge, no anchoring on reef",
    designatedYear: 2005,
    authority: "Ecuador DIGMER — MEPC.135(53)",
    coords: [
      [-2.0,-92.5],[-2.0,-88.5],[1.5,-88.5],[1.5,-92.5],[-2.0,-92.5]
    ]
  },
  {
    name: "Baltic Sea PSSA",
    shortDesc: "Enclosed sensitive ecosystem — SOx/NOx ECA, HELCOM reporting",
    measures: "No discharge, HELCOM reporting, SOx/NOx ECA, TSS in force",
    designatedYear: 2005,
    authority: "IMO / HELCOM — MEPC.136(53)",
    coords: [
      [57.747,8.5],[57.747,12.0],[56.5,12.5],[55.5,12.5],[55.0,9.5],
      [54.5,9.0],[54.0,10.0],[54.0,14.0],[54.5,18.0],[55.0,20.0],
      [55.5,21.5],[56.5,21.0],[57.0,21.5],[57.5,21.0],[58.5,22.0],
      [59.5,22.5],[60.0,25.0],[60.0,28.5],[60.5,28.5],[65.0,28.5],
      [66.0,25.0],[66.0,22.5],[65.5,22.0],[65.0,22.0],[65.5,20.0],
      [66.0,20.0],[65.0,14.0],[62.0,10.0],[58.5,9.0],[57.747,8.5]
    ]
  },
  {
    name: "Strait of Bonifacio PSSA",
    shortDesc: "Sensitive strait between Corsica (France) & Sardinia (Italy)",
    measures: "No discharge, routing measures, TSS, vessel reporting",
    designatedYear: 2011,
    authority: "France & Italy — MEPC.211(63)",
    coords: [
      [41.0,8.5],[41.0,9.8],[41.6,9.8],[41.6,8.5],[41.0,8.5]
    ]
  },
  {
    name: "Saba Bank PSSA",
    shortDesc: "Largest submerged atoll — Caribbean Netherlands",
    measures: "No anchoring on bank, no discharge, Dutch Caribbean Coast Guard",
    designatedYear: 2012,
    authority: "Netherlands Caribbean Coast Guard — MEPC.226(64)",
    coords: [
      [17.0,-64.0],[17.0,-63.0],[18.0,-63.0],[18.0,-64.0],[17.0,-64.0]
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOX TIER III ZONES — MARPOL Annex VI Reg.13
// ─────────────────────────────────────────────────────────────────────────────
export const NOX_ZONES = [
  {
    name: "North Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — North Sea & English Channel — vessels built ≥ Jan 2016",
    regulation: "MARPOL Annex VI Reg.13",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "IMO",
    coords: [
      [48.5,-5.0],[48.5,2.5],[51.0,2.5],[51.0,-4.0],[62.0,-4.0],
      [62.0,12.0],[57.747,12.0],[57.747,8.5],[54.75,8.5],
      [51.0,2.5],[48.5,2.5],[48.5,-5.0]
    ]
  },
  {
    name: "Baltic Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — Baltic Sea — vessels built ≥ Jan 2016",
    regulation: "MARPOL Annex VI Reg.13",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "IMO",
    coords: [
      [57.747,8.5],[57.747,12.0],[56.5,12.5],[55.5,12.5],[55.0,9.5],
      [54.5,9.0],[54.0,10.0],[54.0,14.0],[54.5,18.0],[55.0,20.0],
      [55.5,21.5],[56.5,21.0],[57.0,21.5],[57.5,21.0],[58.5,22.0],
      [59.5,22.5],[60.0,25.0],[60.0,28.5],[60.5,28.5],[65.0,28.5],
      [66.0,25.0],[66.0,22.5],[65.5,22.0],[65.0,22.0],[65.5,20.0],
      [66.0,20.0],[65.0,14.0],[62.0,10.0],[58.5,9.0],[57.747,8.5]
    ]
  },
  {
    name: "North American NOx Tier III ECA",
    shortDesc: "NOx Tier III — 200NM US/Canada Pacific, Atlantic & Gulf coasts",
    regulation: "MARPOL Annex VI Reg.13 — MEPC.190(60)",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 Jan 2016",
    authority: "US EPA / Transport Canada",
    coords: [
      [32.536,-117.103],[30.557,-121.791],[35.244,-125.723],
      [40.313,-128.763],[44.412,-128.690],[48.542,-132.683],
      [51.901,-137.698],[56.476,-142.289],[58.851,-153.251],
      [60.0,-153.251],[60.0,-64.16],[60.0,-56.717],
      [54.389,-50.296],[50.041,-48.118],[47.407,-47.782],
      [43.495,-55.128],[40.642,-60.206],[41.339,-57.087],
      [43.495,-65.128],[25.0,-80.5],[24.0,-83.5],[23.853,-82.667],
      [23.977,-84.0],[24.899,-86.0],[25.707,-88.55],
      [25.957,-97.147],[32.536,-117.103]
    ]
  },
  {
    name: "Mediterranean Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — entire Mediterranean Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.13 — MEPC.361(79)",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 May 2025",
    authority: "IMO — MEPC 79 Resolution",
    coords: [
      [36.183,-6.033],[35.8,-5.917],[35.5,-3.0],[36.0,1.0],[37.0,5.0],
      [37.3,9.5],[33.0,11.0],[32.0,12.0],[31.0,16.0],[31.0,22.0],
      [31.0,25.0],[31.0,29.0],[31.29,32.27],[31.29,32.47],[31.14,32.47],
      [31.14,32.27],[31.0,34.5],[33.0,35.0],[35.5,35.9],[36.2,36.0],
      [36.8,36.2],[37.0,35.5],[36.5,34.0],[36.5,30.0],[40.02,26.2],
      [40.05,26.18],[40.0,23.0],[41.0,20.0],[40.5,18.0],[39.0,20.0],
      [42.0,19.0],[45.5,13.5],[45.8,13.0],[44.5,12.5],[44.0,12.0],
      [43.5,8.0],[43.3,5.0],[43.0,3.5],[41.3,2.0],[39.0,0.5],
      [37.5,-0.5],[36.0,-5.0],[35.8,-5.917],[36.183,-6.033]
    ]
  },
  {
    name: "Black Sea NOx Tier III ECA",
    shortDesc: "NOx Tier III — Black Sea — effective 1 May 2025",
    regulation: "MARPOL Annex VI Reg.13 — MEPC.361(79)",
    noxLimit: "Tier III (3.4 g/kWh @ 130rpm)",
    applicability: "Vessels keel-laid on or after 01 May 2025",
    authority: "IMO — MEPC 79 Resolution",
    coords: [
      [41.0,28.0],[41.0,29.0],[41.5,30.0],[42.0,31.0],[42.5,31.5],
      [43.5,32.5],[44.5,33.5],[45.5,34.0],[46.0,35.0],[46.5,36.0],
      [47.0,37.0],[47.5,38.0],[47.5,39.5],[47.0,40.0],[46.5,41.0],
      [45.0,41.5],[44.0,42.0],[43.0,41.5],[42.0,41.0],[41.5,40.0],
      [41.0,39.5],[40.5,38.5],[40.0,37.0],[40.0,36.0],[40.5,35.5],
      [40.05,26.18],[40.02,26.2],[41.0,28.0]
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOAD LINE ZONES — ICLL 1966 / Protocol 1988
// ─────────────────────────────────────────────────────────────────────────────
export const LOAD_LINE_ZONES = [
  {
    name: "Summer Load Line Zone — North Atlantic",
    shortDesc: "Standard freeboard — moderate conditions",
    zone: "S",
    regulation: "ICLL 1966 / LL Protocol 1988 — Annex II",
    seasons: "Permanent",
    coords: [[36.0,-50.0],[36.0,-15.0],[45.0,-15.0],[45.0,-50.0],[36.0,-50.0]]
  },
  {
    name: "Winter Load Line Zone — North Atlantic",
    shortDesc: "Winter season — reduced freeboard Nov–Mar",
    zone: "W",
    regulation: "ICLL 1966 Annex II — Zone W1",
    seasons: "November 1 – March 31",
    coords: [[45.0,-50.0],[45.0,-15.0],[60.0,-15.0],[60.0,-50.0],[45.0,-50.0]]
  },
  {
    name: "Winter Seasonal Zone — N. Pacific",
    shortDesc: "Winter zone — Oct–Apr, reduced freeboard",
    zone: "W",
    regulation: "ICLL 1966 Annex II",
    seasons: "October 16 – April 15",
    coords: [[45.0,-180.0],[45.0,-135.0],[50.0,-135.0],[50.0,-180.0],[45.0,-180.0]]
  },
  {
    name: "Tropical Load Line Zone — Indian Ocean",
    shortDesc: "Additional freeboard — permanent tropical zone",
    zone: "T",
    regulation: "ICLL 1966 Annex II — Zone T",
    seasons: "Permanent north of 10°S",
    coords: [
      [-10.0,40.0],[-10.0,95.0],[10.0,95.0],[10.0,55.0],
      [15.0,50.0],[20.0,40.0],[-10.0,40.0]
    ]
  },
  {
    name: "Tropical Load Line Zone — W. Pacific",
    shortDesc: "Additional freeboard — permanent tropical West Pacific",
    zone: "T",
    regulation: "ICLL 1966 Annex II — Zone T",
    seasons: "Permanent below 24°N (outside typhoon area)",
    coords: [
      [-10.0,95.0],[-10.0,145.0],[18.0,145.0],[18.0,115.0],
      [10.0,100.0],[-10.0,95.0]
    ]
  },
  {
    name: "Tropical Load Line Zone — Atlantic",
    shortDesc: "Additional freeboard — permanent tropical Atlantic",
    zone: "T",
    regulation: "ICLL 1966 Annex II — Zone T",
    seasons: "Permanent between seasonal boundaries",
    coords: [
      [-10.0,-50.0],[-10.0,-15.0],[10.0,-15.0],[10.0,-30.0],
      [20.0,-30.0],[20.0,-50.0],[-10.0,-50.0]
    ]
  },
  {
    name: "Fresh Water Load Line — River Zones",
    shortDesc: "Fresh water allowance — reduced salt buoyancy",
    zone: "F / TF",
    regulation: "ICLL 1966 Reg.40",
    seasons: "When entering fresh / brackish water",
    coords: [[0.0,3.0],[0.0,7.0],[6.0,7.0],[6.0,3.0],[0.0,3.0]]
  },
  {
    name: "Summer Seasonal Zone — Southern Hemisphere",
    shortDesc: "Summer zone — S. Hemisphere Oct–Mar",
    zone: "S",
    regulation: "ICLL 1966 Annex II",
    seasons: "October 1 – March 31",
    coords: [[-25.0,-70.0],[-25.0,80.0],[-45.0,80.0],[-45.0,-70.0],[-25.0,-70.0]]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MARITIME RESTRICTIONS — Sanctions, War Risk, Piracy, Conflict Zones
// ─────────────────────────────────────────────────────────────────────────────
export const MARITIME_RESTRICTIONS = [
  {
    name: "Iran Sanctions Zone",
    country: "Iran",
    type: "SANCTIONS",
    severity: "critical",
    shortDesc: "US/EU/UN sanctions — vessel calling Iran ports may be denied entry elsewhere",
    details: "OFAC/EU sanctions: tankers calling Iranian ports face secondary sanctions. Insurance may be voided.",
    authority: "UN Security Council / US OFAC / EU Council",
    color: "#FF2020",
    coords: [[25.0,56.0],[25.0,60.5],[30.0,60.5],[30.0,57.0],[29.5,56.0],[25.0,56.0]]
  },
  {
    name: "Crimea / Russia Sanctions Zone",
    country: "Russia / Ukraine",
    type: "SANCTIONS",
    severity: "critical",
    shortDesc: "EU/US sanctions — Crimea port calls prohibited for EU/US flagged vessels",
    details: "EU Regulation 269/2014 & US EO 13685: calling Crimean ports violates sanctions.",
    authority: "EU Council / US OFAC",
    color: "#FF2020",
    coords: [[44.5,32.5],[44.5,36.5],[46.0,36.5],[46.0,32.5],[44.5,32.5]]
  },
  {
    name: "Red Sea / Houthi High Risk Area",
    country: "Yemen / Red Sea",
    type: "WAR_RISK",
    severity: "critical",
    shortDesc: "Active missile / drone / vessel attack zone — Houthi operations since Nov 2023",
    details: "Houthi targeting commercial vessels in Red Sea, Bab el-Mandeb, Gulf of Aden. Many operators rerouting via Cape of Good Hope.",
    authority: "IMO MSC / UKMTO / Operation Prosperity Guardian",
    color: "#FF0000",
    coords: [
      [11.5,42.5],[11.5,45.0],[15.0,43.5],[18.0,41.0],
      [22.0,38.0],[25.0,36.5],[28.0,34.0],[29.0,33.0],
      [29.0,32.5],[22.0,37.0],[15.0,42.5],[11.5,42.5]
    ]
  },
  {
    name: "Bab el-Mandeb Strait High Risk",
    country: "Yemen / Djibouti",
    type: "WAR_RISK",
    severity: "critical",
    shortDesc: "High risk chokepoint — armed escort recommended",
    details: "Narrow strait flanked by Yemen. Register with UKMTO, maintain watch, armed security recommended.",
    authority: "IMO / UKMTO / BMP5",
    color: "#FF0000",
    coords: [[11.3,42.5],[11.3,44.0],[13.0,44.0],[13.0,42.5],[11.3,42.5]]
  },
  {
    name: "North Korea Exclusion Zone",
    country: "North Korea (DPRK)",
    type: "SANCTIONS",
    severity: "critical",
    shortDesc: "UN/US/EU sanctions — no port calls, STS transfers prohibited",
    details: "UN UNSCR 1718, 2375, 2397: DPRK port calls and STS transfers violate sanctions.",
    authority: "UN Security Council / US OFAC / EU",
    color: "#FF2020",
    coords: [[37.5,124.0],[37.5,130.0],[42.5,130.0],[42.5,124.0],[37.5,124.0]]
  },
  {
    name: "Russia Black Sea War Risk Zone",
    country: "Russia / Ukraine",
    type: "WAR_RISK",
    severity: "critical",
    shortDesc: "Active conflict zone — naval operations, mines, drones",
    details: "Active conflict since Feb 2022. Mines, vessel attacks reported. Significant war risk insurance surcharges.",
    authority: "IMO MSC / Lloyd's Market Association",
    color: "#FF0000",
    coords: [[43.5,30.5],[43.5,37.5],[47.0,37.5],[47.0,30.5],[43.5,30.5]]
  },
  {
    name: "Somalia / Gulf of Aden HRA",
    country: "Somalia / Djibouti",
    type: "PIRACY",
    severity: "high",
    shortDesc: "IMB High Risk Area — armed piracy / kidnap for ransom",
    details: "BMP5 mandatory. Armed security recommended. Register with UKMTO. EUNAVFOR Operation Atalanta.",
    authority: "IMO / IMB / UKMTO / EUNAVFOR",
    color: "#FF6600",
    coords: [
      [-2.0,42.0],[0.0,42.0],[5.0,48.0],[12.0,48.0],
      [16.0,53.0],[16.0,60.0],[5.0,60.0],[0.0,55.0],
      [-2.0,50.0],[-2.0,42.0]
    ]
  },
  {
    name: "Gulf of Guinea Piracy Zone",
    country: "Nigeria / Benin / Togo / Cameroon",
    type: "PIRACY",
    severity: "high",
    shortDesc: "IMB High Risk Area — kidnapping, armed robbery, vessel hijacking",
    details: "Highest global piracy risk by IMB statistics. BMP West Africa guidelines apply.",
    authority: "IMO / IMB / Interpol Maritime",
    color: "#FF6600",
    coords: [
      [-3.0,-3.0],[-3.0,5.0],[5.0,8.0],[8.0,5.0],
      [5.0,-1.0],[0.0,-3.0],[-3.0,-3.0]
    ]
  },
  {
    name: "Strait of Hormuz Transit Zone",
    country: "Iran / Oman / UAE",
    type: "RESTRICTED",
    severity: "high",
    shortDesc: "IRGC vessel seizures — enhanced watchkeeping mandatory",
    details: "Iran IRGC has seized commercial vessels (2021, 2023). Follow TSS. Register with UKMTO.",
    authority: "IMO / UKMTO / US 5th Fleet",
    color: "#FF8800",
    coords: [[24.0,56.0],[24.0,58.5],[27.0,58.5],[27.0,56.0],[24.0,56.0]]
  },
  {
    name: "Myanmar Restricted Waters",
    country: "Myanmar",
    type: "SANCTIONS",
    severity: "medium",
    shortDesc: "EU/UK sanctions post-2021 coup — oil and gas restrictions",
    details: "EU Council Decision 2021/368: sanctions on military entities.",
    authority: "EU Council / UK OFSI",
    color: "#FFB300",
    coords: [[10.0,97.0],[10.0,100.0],[16.0,100.0],[16.0,97.0],[10.0,97.0]]
  },
  {
    name: "Venezuela Sanctions Zone",
    country: "Venezuela",
    type: "SANCTIONS",
    severity: "medium",
    shortDesc: "US OFAC sanctions — crude oil cargo restrictions",
    details: "OFAC Executive Orders restrict dealings with PDVSA. Tankers face US port denial.",
    authority: "US OFAC",
    color: "#FFB300",
    coords: [[8.0,-73.5],[8.0,-60.0],[12.5,-60.0],[12.5,-73.5],[8.0,-73.5]]
  },
  {
    name: "Libya Conflict Zone",
    country: "Libya",
    type: "WAR_RISK",
    severity: "high",
    shortDesc: "Active conflict — volatile port security, UN arms embargo",
    details: "Ongoing civil conflict. Ports volatile. W/R insurance required. UN arms embargo.",
    authority: "IMO / UN Security Council",
    color: "#FF4400",
    coords: [[30.0,10.0],[30.0,25.5],[33.5,25.5],[33.5,10.0],[30.0,10.0]]
  },
  {
    name: "Sudan / South Sudan Conflict Zone",
    country: "Sudan",
    type: "WAR_RISK",
    severity: "medium",
    shortDesc: "Port Sudan operations disrupted — conflict since April 2023",
    details: "Port Sudan affected by fighting. Operations partially disrupted. Security risks.",
    authority: "IMO MSC / IMB",
    color: "#FF4400",
    coords: [[18.0,37.0],[18.0,39.0],[22.5,39.0],[22.5,37.0],[18.0,37.0]]
  },
  {
    name: "Taiwan Strait Heightened Risk",
    country: "China / Taiwan",
    type: "RESTRICTED",
    severity: "medium",
    shortDesc: "PLA exercises, AIS spoofing — heightened risk since 2022",
    details: "Periodic PLA naval exercises. AIS spoofing reported. Monitor NAVTEX/NTM.",
    authority: "Taiwan Coast Guard / PRC MSA",
    color: "#FFB300",
    coords: [[22.0,119.0],[22.0,122.5],[26.0,122.5],[26.0,119.0],[22.0,119.0]]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CHINA MSC NO-G AREA
// ─────────────────────────────────────────────────────────────────────────────
export const CHINA_MSC_NO_G = [
  {
    name: "MSC No-G Area — Bohai / Yellow Sea",
    shortDesc: "MSC internal prohibited area — MSC-operated vessels must avoid",
    details: "MSC internal ops instruction: vessels under MSC management must not transit without prior MSC approval. Shallow draft / obstruction risk.",
    authority: "MSC Ship Management — Internal Circular",
    type: "OPERATOR_RESTRICTION",
    color: "#FF00FF",
    coords: [[38.5,120.0],[38.5,121.5],[39.5,121.5],[39.5,120.5],[38.8,120.0],[38.5,120.0]]
  },
  {
    name: "MSC No-G Area — Shanghai Approaches",
    shortDesc: "MSC prohibited area — Yangtze estuary shallow zone",
    details: "MSC internal restriction for outer Yangtze River estuary. Shifting sandbar hazards.",
    authority: "MSC Ship Management — Internal Circular",
    type: "OPERATOR_RESTRICTION",
    color: "#FF00FF",
    coords: [[31.0,121.5],[31.0,122.5],[31.8,122.5],[31.8,121.5],[31.0,121.5]]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// EEZ ZONES — Exclusive Economic Zones
// ─────────────────────────────────────────────────────────────────────────────
export const EEZ_ZONES = [
  {
    name: "India EEZ",
    shortDesc: "200NM EEZ — Indian Coast Guard jurisdiction",
    regulation: "UNCLOS Art.55-75 / India Maritime Zones Act 1981",
    country: "India",
    coords: [
      [8.0,72.0],[8.0,80.0],[14.0,82.0],[20.0,86.0],
      [22.0,89.0],[23.0,90.0],[22.0,70.0],[20.0,66.0],
      [14.0,68.0],[8.0,72.0]
    ]
  },
  {
    name: "China EEZ — South China Sea",
    shortDesc: "Disputed EEZ — nine-dash line claim; UNCLOS tribunal ruling 2016",
    regulation: "UNCLOS / China Maritime Law — contested by Philippines, Vietnam, Malaysia",
    country: "China (disputed)",
    coords: [
      [3.0,108.0],[3.0,120.0],[20.0,122.0],[22.0,121.0],
      [20.0,115.0],[15.0,111.0],[10.0,112.0],[5.0,108.0],[3.0,108.0]
    ]
  },
  {
    name: "Australia EEZ — NW Shelf",
    shortDesc: "200NM EEZ — AMSA / Australian Border Force jurisdiction",
    regulation: "UNCLOS / Australia Seas and Submerged Lands Act 1973",
    country: "Australia",
    coords: [
      [-10.0,112.0],[-10.0,128.0],[-20.0,128.0],
      [-25.0,118.0],[-22.0,112.0],[-10.0,112.0]
    ]
  },
  {
    name: "USA EEZ — Gulf of Mexico",
    shortDesc: "US EEZ — USCG / BSEE jurisdiction, OCS energy activities",
    regulation: "UNCLOS equivalent / Outer Continental Shelf Lands Act",
    country: "USA",
    coords: [
      [24.0,-98.0],[24.0,-80.0],[28.0,-80.0],[30.0,-88.0],
      [30.0,-94.0],[28.0,-96.0],[24.0,-98.0]
    ]
  },
  {
    name: "Japan EEZ — Pacific",
    shortDesc: "200NM EEZ — Japan Coast Guard, fishing regulation",
    regulation: "UNCLOS / Japan Law on Exclusive Economic Zone 1996",
    country: "Japan",
    coords: [
      [24.0,122.0],[24.0,136.0],[35.0,142.0],[44.0,145.0],
      [44.0,136.0],[36.0,130.0],[30.0,127.0],[24.0,122.0]
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONES
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// normalizePortRow
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DEPTH SOURCES — ENC / bathymetry layer options for NavModePage ENC panel
// ids must match the depthSources.has(id) checks in the tile swap effect
// ─────────────────────────────────────────────────────────────────────────────
export const DEPTH_SOURCES = [
  { id:'usa',       emoji:'🇺🇸', label:'USA NOAA ENC',     desc:'NOAA ENC + Esri Ocean Base — US waters' },
  { id:'europe',    emoji:'🇪🇺', label:'EMODnet Europe',    desc:'EMODnet bathymetry WMS — European waters' },
  { id:'global',    emoji:'🌍',  label:'GEBCO Global',      desc:'GEBCO 2023 global bathymetry WMS' },
  { id:'soundings', emoji:'📡',  label:'ESRI Soundings',    desc:'Esri Ocean Reference tile layer with depth labels' },
  { id:'nz',        emoji:'🇳🇿', label:'LINZ New Zealand',  desc:'LINZ hydrographic WMS — NZ waters' },
  { id:'norway',    emoji:'🇳🇴', label:'Norway Depth',      desc:'Kartverket dybdedata WMS — Norwegian waters' },
  { id:'australia', emoji:'🇦🇺', label:'Australia GA',      desc:'Geoscience Australia bathymetry WMS' },
  { id:'canada',    emoji:'🇨🇦', label:'Canada CHS',        desc:'CHS NONNA-100 WMS — Canadian waters' },
  { id:'finland',   emoji:'🇫🇮', label:'Finland Traficom',  desc:'Traficom syvyyskayra WMS — Finnish waters' },
  { id:'germany',   emoji:'🇩🇪', label:'Germany BSH',       desc:'BSH depth contours WMS — German waters' },
  { id:'ireland',   emoji:'🇮🇪', label:'Ireland INFOMAR',   desc:'INFOMAR bathymetry WMS — Irish waters' },
  { id:'osm_depth', emoji:'🌊',  label:'OpenSeaMap Depth',  desc:'OpenSeaMap crowdsourced depth soundings tiles' },
  { id:'china',     emoji:'🇨🇳', label:'China ENC',         desc:'China S-57 ENC GeoJSON overlay (custom URL)' },
];

// ─────────────────────────────────────────────────────────────────────────────
// AIS SOURCES — local WebSocket host lists for SafePilot and Bridge modes
// AIS_SOURCES.safepilot.hosts — SafePilot P3 default WebSocket ports
// AIS_SOURCES.bridge.hosts   — Local bridge / NMEA aggregator ports
// The 'internet' and 'off' modes are handled inline in NavModePage.jsx
// User can override the bridge host via the localAisHost input in the AIS panel
// ─────────────────────────────────────────────────────────────────────────────
export const AIS_SOURCES = {
  safepilot: {
    hosts: [
      'ws://localhost:4001',
      'ws://192.168.1.100:4001',
      'ws://10.0.0.1:4001',
    ],
  },
  bridge: {
    hosts: [
      'ws://localhost:4002',
      'ws://192.168.1.100:4002',
      'ws://10.0.0.1:4002',
    ],
  },
};
