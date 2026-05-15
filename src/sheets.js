/* eslint-disable */

export const ROUTE_SHEET_ID =
  "1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE";

export const CHART_SHEET_ID_2 =
  "1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA";

const searchCache = new Map();
export { searchCache };

// ─────────────────────────────────────────────
// LAT/LON PARSER
// ─────────────────────────────────────────────
const parseLat = (str) => {
  if (!str) return NaN;
  str = String(str).trim();

  const dec = parseFloat(str);
  if (!isNaN(dec) && !str.includes("°")) return dec;

  const m = str.match(
    /(\d+)[°\s]+(\d+)[''\s]+([0-9.]+)[""\s]*([NSEW])?/i
  );

  if (m) {
    let val =
      parseFloat(m[1]) +
      parseFloat(m[2]) / 60 +
      parseFloat(m[3]) / 3600;

    if (m[4] && (m[4] === "S" || m[4] === "W")) val = -val;
    return val;
  }

  return NaN;
};

const parseLon = (str) => parseLat(str);

// ─────────────────────────────────────────────
// CSV PARSER
// ─────────────────────────────────────────────
export const csvToRows = (csv) => {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/"/g, "").trim());

  return lines
    .slice(1)
    .map((line) => {
      const vals = [];
      let cur = "";
      let inQ = false;

      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === "," && !inQ) {
          vals.push(cur.trim());
          cur = "";
        } else cur += ch;
      }

      vals.push(cur.trim());

      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (vals[i] || "").replace(/"/g, "");
      });

      return obj;
    })
    .filter((r) => Object.values(r).some(Boolean));
};

// ─────────────────────────────────────────────
// SHEET FETCH (CSV)
// ─────────────────────────────────────────────
export const fetchSheetCSV = async (sheetId, tabName = "Sheet1") => {
  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=` +
    encodeURIComponent(tabName);

  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);

  return csvToRows(await res.text());
};

// ─────────────────────────────────────────────
// LIVE SEARCH (CACHED)
// ─────────────────────────────────────────────
export const searchSheetLive = async (
  sheetId,
  query,
  tabNames = ["Sheet1"],
  maxResults = 50
) => {
  if (!query || query.trim().length < 2) return [];

  const ql = query.toLowerCase().trim();
  const cacheKey = `${sheetId}:${ql}`;

  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < 300000) {
    return cached.data;
  }

  let allRows = [];

  for (const tab of tabNames) {
    try {
      const rows = await fetchSheetCSV(sheetId, tab);
      allRows = [...allRows, ...rows.map((r) => ({ ...r, _tab: tab }))];
      if (allRows.length > 5000) break;
    } catch {
      continue;
    }
  }

  const results = allRows
    .filter((r) => {
      const hay = Object.values(r).join(" ").toLowerCase();
      return hay.includes(ql);
    })
    .slice(0, maxResults);

  searchCache.set(cacheKey, { data: results, ts: Date.now() });
  return results;
};

// ─────────────────────────────────────────────
// OPEN SHEET API
// ─────────────────────────────────────────────
export const API_1 =
  "https://opensheet.elk.sh/1ILzyQODb4Ig2mdq9auZ7aJOfdKBBM01t192VE59WbCE/Sheet1";

// ─────────────────────────────────────────────
// CHART SHEET — FIX: Promise.any (parallel, first success wins)
// Previously: sequential .catch() chain — waited for each failure
// ─────────────────────────────────────────────
const CHART_SHEET_ID =
  "1zuZxqUSFtxzg-E8CkTGj01YehhXCZIPodCisCicpxRA";

const CHART_TABS = [
  "Sheet1",
  "Charts",
  "ECDIS Charts",
  "Routes",
  "Chart",
  "Data",
  "Sheet2",
];

export const fetchChartSheet = () => {
  const attempts = CHART_TABS.map((tab) =>
    fetch(`https://opensheet.elk.sh/${CHART_SHEET_ID}/${tab}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        if (!Array.isArray(d) || d.length === 0) throw new Error();
        return d;
      })
  );
  // All 7 tabs fire at once — whichever responds first with data wins
  return Promise.any(attempts).catch(() => []);
};

// ─────────────────────────────────────────────
// PORTS SHEET — FIX: Parallel fetch + fixed CSV bug (was fetching but never returning)
// Previously: CSV fetched but result was never used; opensheet was sequential fallback
// Now: both methods race in parallel, first valid result wins
// ─────────────────────────────────────────────
const PORTS_SHEET_ID =
  "1BFpUuo-nqS3MaUTtANtKT4CFem-X3nZJYGRADZtuIdk";

export const fetchPortsFromSheet = () => {
  const TAB = "PORTDATA";

  // Method 1: Google gviz CSV (fast, official)
  const csvFetch = fetch(
    `https://docs.google.com/spreadsheets/d/${PORTS_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${TAB}`
  )
    .then((r) => { if (!r.ok) throw new Error("gviz failed"); return r.text(); })
    .then((text) => {
      const rows = csvToRows(text);
      if (!rows.length) throw new Error("gviz empty");
      // Return raw rows — App.jsx normalizes with normalizePortRow
      return rows;
    });

  // Method 2: opensheet JSON (backup)
  const openSheetFetch = fetch(
    `https://opensheet.elk.sh/${PORTS_SHEET_ID}/${TAB}`
  )
    .then((r) => { if (!r.ok) throw new Error("opensheet failed"); return r.json(); })
    .then((data) => {
      if (!Array.isArray(data) || !data.length)
        throw new Error("opensheet empty");
      // Return raw JSON rows — App.jsx normalizes with normalizePortRow
      return data;
    });

  // Both race — first valid response wins, no waiting for failures
  return Promise.any([csvFetch, openSheetFetch]).catch(() => {
    console.warn("⚠️ All port fetch methods failed");
    return [];
  });
};

// ─────────────────────────────────────────────
// NORMALIZERS
// ─────────────────────────────────────────────
export function normalizeSheetRow(row, idx, tag) {
  const pick = (...keys) => {
    for (const k of keys) {
      const col = Object.keys(row).find((c) =>
        c
          .toLowerCase()
          .replace(/[\s_-]/g, "")
          .includes(k.toLowerCase().replace(/[\s_-]/g, ""))
      );
      if (col && row[col]) return String(row[col]).trim();
    }
    return "";
  };

  const fileName =
    pick("filename", "name", "title") ||
    Object.values(row)[0] ||
    "";

  const portName =
    pick("portname", "port", "route", "description") || "";

  const keywords = pick("keywords", "tags") || "";
  const type     = pick("type", "category") || "";
  const brand    = pick("brand", "make") || "";
  const model    = pick("model", "series") || "";
  const region   = pick("region", "zone") || "";

  const allKw = [fileName, portName, keywords, type, brand, model, region]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    id: `${tag}-${idx}`,
    fileName,
    portName,
    keywords: allKw,
    type,
    brand,
    model,
    region,
    source: "sheet",
  };
}

export function normalizePortRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      const col = Object.keys(row).find((c) =>
        c
          .toLowerCase()
          .replace(/[\s_-]/g, "")
          .includes(k.toLowerCase().replace(/[\s_-]/g, ""))
      );
      if (col && row[col]) return String(row[col]).trim();
    }
    return "";
  };

  const lat = parseLat(get("lat", "latitude"));
  const lon = parseLon(get("lon", "longitude"));

  if (isNaN(lat) || isNaN(lon)) return null;

  const name = get("portname", "name", "port");
  if (!name) return null;

  const code =
    get("locode", "code", "portcode") ||
    name.substring(0, 3).toUpperCase();

  return {
    id: code,
    name,
    city: name,
    country: get("country"),
    lat,
    lon,
    keywords: (name + " " + code).toLowerCase(),
  };
}
