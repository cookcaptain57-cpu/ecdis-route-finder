/* eslint-disable */

// ─── ECDIS BRANDS ─────────────────────────────────────────────────────────────
export const ECDIS_BRANDS = [
  { id: "furuno", name: "Furuno", emoji: "🟦", color: "#0066CC", models: "FMD-3200 / FMD-3300" },
  { id: "jrc", name: "JRC", emoji: "🟥", color: "#CC0000", models: "JAN-7201S / JAN-9201S" },
  { id: "transas", name: "Transas / Wärtsilä", emoji: "🟩", color: "#007A4D", models: "Navi-Sailor 4000/3000" },
  { id: "sperry", name: "Sperry Marine", emoji: "🟨", color: "#D4900A", models: "VisionMaster FT / Pro" },
  { id: "tokimec", name: "Tokimec / JMR", emoji: "🟪", color: "#6B21A8", models: "JMR-7700 / JMR-9900" },
  { id: "raytheon", name: "Raytheon Anschütz", emoji: "⬛", color: "#374151", models: "ECDIS 1000 / 2000" },
  { id: "kongsberg", name: "Kongsberg Maritime", emoji: "🔵", color: "#1D4ED8", models: "K-Bridge ECDIS" },
  { id: "danelec", name: "Danelec Marine", emoji: "🔶", color: "#EA580C", models: "DM800 ECDIS" },
  { id: "kelvin", name: "Kelvin Hughes", emoji: "🔵", color: "#0891B2", models: "SharpEye ECDIS" },
  { id: "northrop", name: "Northrop Grumman", emoji: "⭕", color: "#DC2626", models: "Integrated Bridge" },
  { id: "sam", name: "SAM Electronics", emoji: "🟫", color: "#92400E", models: "NACOS Platinum" },
  { id: "wartsila", name: "Wärtsilä Voyage", emoji: "🔺", color: "#059669", models: "Navi-Sailor Series" },
];

export const ROUTE_TYPES = [
  "Ocean",
  "Coastal",
  "Deep Sea",
  "Strait",
  "River",
  "Port Approach",
  "Anchorage",
];

// ─── ADMIN CONFIG ─────────────────────────────────────────────────────────────
export const ADMIN_EMAIL = "ecdisroutes@gmail.com";

// ─── PORTS DATABASE (seed) ────────────────────────────────────────────────────
export const PORTS_DB = [
  { id: "MUM", name: "Mumbai", city: "Mumbai", country: "India", lat: 18.93, lon: 72.83 },
  { id: "SIN", name: "Singapore", city: "Singapore", country: "Singapore", lat: 1.29, lon: 103.85 },
  { id: "DXB", name: "Dubai", city: "Dubai", country: "UAE", lat: 25.05, lon: 55.13 },
  { id: "COL", name: "Colombo", city: "Colombo", country: "Sri Lanka", lat: 6.94, lon: 79.85 },
  { id: "SHA", name: "Shanghai", city: "Shanghai", country: "China", lat: 31.23, lon: 121.47 },
  { id: "ROT", name: "Rotterdam", city: "Rotterdam", country: "Netherlands", lat: 51.92, lon: 4.48 },
  { id: "HKG", name: "Hong Kong", city: "Hong Kong", country: "China", lat: 22.29, lon: 114.16 },
  { id: "KAR", name: "Karachi", city: "Karachi", country: "Pakistan", lat: 24.86, lon: 67.01 },
  { id: "BUS", name: "Busan", city: "Busan", country: "South Korea", lat: 35.1, lon: 129.04 },
  { id: "YOK", name: "Yokohama", city: "Yokohama", country: "Japan", lat: 35.45, lon: 139.65 },
  { id: "NYK", name: "New York", city: "New York", country: "USA", lat: 40.65, lon: -74.07 },
  { id: "LAX", name: "Los Angeles", city: "Los Angeles", country: "USA", lat: 33.74, lon: -118.27 },
  { id: "SYD", name: "Sydney", city: "Sydney", country: "Australia", lat: -33.86, lon: 151.21 },
];

// ─── MARITIME ZONES ───────────────────────────────────────────────────────────
export const ECA_ZONES = [
  { name: "North Sea ECA", coords: [[48, -5], [62, -5], [62, 13], [48, 13]] },
  { name: "Baltic Sea ECA", coords: [[53, 9], [66, 9], [66, 30], [53, 30]] },
];

export const SECA_ZONES = [
  { name: "Baltic Sea SECA", coords: [[53, 9], [66, 9], [66, 30], [53, 30]] },
  { name: "North Sea SECA", coords: [[48, -5], [62, -5], [62, 13], [48, 13]] },
];

export const MARPOL_ZONES = [
  { name: "Mediterranean Sea", coords: [[30, -6], [30, 37], [47, 37], [47, -6]] },
];

export const PIRACY_ZONES = [
  { name: "Gulf of Aden", coords: [[0, 40], [0, 78], [25, 78], [25, 40]] },
];

export const LAYOVER_ZONES = [
  { name: "Mumbai Anchorage", coords: [[18.8, 72.7], [18.8, 73], [19.1, 73], [19.1, 72.7]] },
];

// ─── TIMEZONES ────────────────────────────────────────────────────────────────
export const TIMEZONES = [
  { label: "UTC / GMT", offset: 0 },
  { label: "IST (UTC+5:30)", offset: 5.5 },
  { label: "GST (UTC+4)", offset: 4 },
  { label: "SGT (UTC+8)", offset: 8 },
  { label: "JST (UTC+9)", offset: 9 },
  { label: "CET (UTC+1)", offset: 1 },
];
