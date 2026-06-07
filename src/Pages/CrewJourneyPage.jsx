/* eslint-disable */
// src/Pages/CrewJourneyPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── DRIVE HELPERS (same pattern as CertificateTrackerPage) ──────────────────
const DRIVE_SCOPE      = "https://www.googleapis.com/auth/drive.file";
const DRIVE_CLIENT_ID  = "636056685819-b0mv1o4ftbdfirtan4svpoaa83ns49c6.apps.googleusercontent.com";
const DRIVE_FOLDER_CJ  = "NavisphereX CrewJourney";

async function cjDriveSearchFolder(token) {
  const q = encodeURIComponent(`name='${DRIVE_FOLDER_CJ}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).files?.[0]?.id || null;
}
async function cjDriveCreateFolder(token) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: DRIVE_FOLDER_CJ, mimeType: "application/vnd.google-apps.folder" }) });
  return (await res.json()).id;
}
async function cjDriveUploadFile(token, folderId, file, fileName) {
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ name: fileName, parents: [folderId] })], { type: "application/json" }));
  form.append("file", file);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");
  return data;
}
async function cjDriveDeleteFile(token, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MARITIME_RANKS = [
  "Captain / Master","Chief Officer","2nd Officer","3rd Officer","Navigating Officer",
  "Chief Engineer","2nd Engineer","3rd Engineer","4th Engineer","Engine Rating",
  "Electrical Officer (ETO)","Bosun","AB Seaman","Ordinary Seaman","Deck Cadet","Engine Cadet","Other"
];

const VESSEL_TYPES = ["Bulk Carrier","Container Ship","Tanker (Oil)","Chemical Tanker","Gas Tanker (LNG/LPG)","General Cargo","RoRo","Passenger / Cruise","Offshore","Tug / Supply","Other"];

const DOCUMENT_CHECKLIST = [
  { id:"passport",    name:"Passport",               category:"Personal",   critical:true  },
  { id:"cdc",         name:"CDC / Seaman Book",       category:"Personal",   critical:true  },
  { id:"coc",         name:"Certificate of Competency (COC)", category:"Competency", critical:true },
  { id:"flag_end",    name:"Flag Endorsement",        category:"Competency", critical:true  },
  { id:"goc",         name:"GOC / GMDSS Certificate", category:"Competency", critical:false },
  { id:"bst",         name:"STCW Basic Safety (BST)", category:"STCW",       critical:true  },
  { id:"psc",         name:"Proficiency Survival Craft (PSC)", category:"STCW", critical:false },
  { id:"aff",         name:"Advanced Fire Fighting",  category:"STCW",       critical:false },
  { id:"medical",     name:"Medical Certificate (ENG1/ML5)", category:"Medical", critical:true },
  { id:"yellowfever", name:"Yellow Fever Certificate",category:"Medical",    critical:false },
  { id:"visa",        name:"Visa (if required)",      category:"Travel",     critical:true  },
  { id:"joining_ltr", name:"Joining Letter",          category:"Official",   critical:true  },
  { id:"contract",    name:"Employment Contract",     category:"Official",   critical:true  },
  { id:"vaccination", name:"Vaccination Records",     category:"Medical",    critical:false },
  { id:"tanker_end",  name:"Tanker Endorsements",     category:"Tanker",     critical:false },
  { id:"dp_cert",     name:"DP Certificate",          category:"Special",    critical:false },
  { id:"flight_tkt",  name:"Flight Ticket (Printed)", category:"Travel",     critical:true  },
  { id:"insurance",   name:"Medical Insurance Card",  category:"Medical",    critical:false },
];

const DEFAULT_PACKING = {
  Toiletries: [
    { id:"toothpaste", name:"Toothpaste",     unit:"tube",   base:1 },
    { id:"toothbrush", name:"Toothbrush",     unit:"pcs",    base:2 },
    { id:"shampoo",    name:"Shampoo",        unit:"bottle", base:1 },
    { id:"soap",       name:"Soap / Body Wash",unit:"pcs",   base:2 },
    { id:"razors",     name:"Razors",         unit:"pcs",    base:4 },
    { id:"shaving",    name:"Shaving Cream",  unit:"can",    base:1 },
    { id:"deodorant",  name:"Deodorant",      unit:"pcs",    base:2 },
    { id:"sunscreen",  name:"Sunscreen SPF50",unit:"bottle", base:1 },
    { id:"haircut",    name:"Nail Cutter Set",unit:"set",    base:1 },
    { id:"moisturiser",name:"Moisturiser",    unit:"bottle", base:1 },
  ],
  Clothing: [
    { id:"tshirt",    name:"T-Shirts / Polo",  unit:"pcs", base:5  },
    { id:"trousers",  name:"Trousers / Jeans", unit:"pcs", base:3  },
    { id:"shorts",    name:"Shorts",           unit:"pcs", base:3  },
    { id:"underwear", name:"Underwear",        unit:"pcs", base:7  },
    { id:"socks",     name:"Socks",            unit:"pairs",base:7 },
    { id:"uniform",   name:"Uniform / Coverall",unit:"set",base:2  },
    { id:"shoes",     name:"Safety Shoes",     unit:"pair", base:1  },
    { id:"casualshoe",name:"Casual Shoes",     unit:"pair", base:1  },
    { id:"jacket",    name:"Jacket / Windbreaker",unit:"pcs",base:1 },
    { id:"belt",      name:"Belt",             unit:"pcs",  base:1  },
    { id:"cap",       name:"Cap / Hat",        unit:"pcs",  base:2  },
    { id:"towel",     name:"Towels",           unit:"pcs",  base:3  },
  ],
  Electronics: [
    { id:"laptop",    name:"Laptop + Charger",  unit:"set", base:1 },
    { id:"phone",     name:"Phone + Charger",   unit:"set", base:1 },
    { id:"tablet",    name:"Tablet",            unit:"pcs", base:1 },
    { id:"earphones", name:"Earphones / Headset",unit:"pcs",base:1 },
    { id:"powerbank", name:"Power Bank",         unit:"pcs", base:1 },
    { id:"adapter",   name:"Universal Adapter", unit:"pcs", base:1 },
    { id:"usb_hub",   name:"USB Hub / Cables",   unit:"set", base:1 },
    { id:"hdd",       name:"External Hard Drive",unit:"pcs", base:1 },
    { id:"flashlight",name:"Flashlight / Torch", unit:"pcs", base:1 },
  ],
  Medical: [
    { id:"painkiller",name:"Painkillers (Paracetamol)",unit:"strip",base:4 },
    { id:"antacid",   name:"Antacid Tablets",     unit:"strip",base:2 },
    { id:"antiseptic",name:"Antiseptic Cream",    unit:"tube", base:1 },
    { id:"bandages",  name:"Bandages / Plasters",  unit:"box",  base:1 },
    { id:"cough_med", name:"Cough Syrup",          unit:"bottle",base:1},
    { id:"allergy",   name:"Allergy Tablets",      unit:"strip",base:2 },
    { id:"prescribed",name:"Prescribed Medicines", unit:"supply",base:0},
    { id:"vitamin",   name:"Multivitamins",        unit:"bottle",base:1},
    { id:"rehydration",name:"Rehydration Sachets", unit:"box",  base:1 },
  ],
  "Travel Essentials": [
    { id:"passport_holder",name:"Passport Holder",  unit:"pcs",base:1 },
    { id:"luggage_lock",  name:"Luggage Lock",      unit:"pcs",base:2 },
    { id:"neck_pillow",   name:"Neck Pillow",       unit:"pcs",base:1 },
    { id:"eye_mask",      name:"Sleep Mask",        unit:"pcs",base:1 },
    { id:"notebook",      name:"Notebook / Diary",  unit:"pcs",base:1 },
    { id:"pen",           name:"Pens",              unit:"pcs",base:5 },
    { id:"reading_book",  name:"Books / Kindle",    unit:"pcs",base:2 },
    { id:"snacks",        name:"Snacks / Energy Bars",unit:"pcs",base:10},
    { id:"water_bottle",  name:"Water Bottle",      unit:"pcs",base:1 },
    { id:"umbrella",      name:"Compact Umbrella",  unit:"pcs",base:1 },
  ],
};

const POWER_PLUGS = {
  "Singapore":   { type:"G",   voltage:"230V", freq:"50Hz", note:"Same as UK" },
  "Philippines": { type:"A/B", voltage:"220V", freq:"60Hz", note:"US style + local" },
  "India":       { type:"C/D/M",voltage:"230V",freq:"50Hz", note:"Round 3-pin" },
  "UAE":         { type:"G",   voltage:"220V", freq:"50Hz", note:"UK 3-pin" },
  "China":       { type:"A/I", voltage:"220V", freq:"50Hz", note:"Flat 2/3 pin" },
  "Japan":       { type:"A",   voltage:"100V", freq:"50/60Hz",note:"Flat 2-pin, low voltage!" },
  "South Korea": { type:"C/F", voltage:"220V", freq:"60Hz", note:"Round 2-pin" },
  "Netherlands": { type:"C/F", voltage:"230V", freq:"50Hz", note:"Round 2-pin" },
  "UK":          { type:"G",   voltage:"230V", freq:"50Hz", note:"3-pin rectangular" },
  "USA":         { type:"A/B", voltage:"120V", freq:"60Hz", note:"Low voltage — check device!" },
  "Australia":   { type:"I",   voltage:"230V", freq:"50Hz", note:"Diagonal flat 3-pin" },
  "Germany":     { type:"C/F", voltage:"230V", freq:"50Hz", note:"Round 2-pin Schuko" },
  "France":      { type:"E",   voltage:"230V", freq:"50Hz", note:"Round pin + hole" },
  "Greece":      { type:"C/F", voltage:"230V", freq:"50Hz", note:"Round 2-pin" },
  "Turkey":      { type:"C/F", voltage:"230V", freq:"50Hz", note:"Round 2-pin" },
  "Malaysia":    { type:"G",   voltage:"240V", freq:"50Hz", note:"UK 3-pin" },
  "Indonesia":   { type:"C/F", voltage:"230V", freq:"50Hz", note:"Round 2-pin" },
  "Thailand":    { type:"A/B/C",voltage:"220V",freq:"50Hz", note:"Mixed sockets" },
  "Panama":      { type:"A/B", voltage:"110V", freq:"60Hz", note:"Low voltage!" },
  "Brazil":      { type:"N",   voltage:"127/220V",freq:"60Hz",note:"Check local voltage" },
  "South Africa":{ type:"M",   voltage:"230V", freq:"50Hz", note:"Large 3-pin" },
  "Egypt":       { type:"C",   voltage:"220V", freq:"50Hz", note:"Round 2-pin" },
  "Qatar":       { type:"G",   voltage:"240V", freq:"50Hz", note:"UK 3-pin" },
  "Saudi Arabia":{ type:"G/A/B",voltage:"220V",freq:"60Hz", note:"Mixed sockets" },
  "Other":       { type:"Universal",voltage:"110-240V",freq:"50-60Hz",note:"Carry universal adapter" },
};

const CASH_INFO = {
  "Singapore":   { min:300, rec:500, emg:800, currency:"SGD", atm:true,  card:true,  sim:15,  taxi:25  },
  "Philippines": { min:200, rec:400, emg:600, currency:"USD", atm:true,  card:true,  sim:5,   taxi:10  },
  "India":       { min:100, rec:200, emg:400, currency:"INR(₹)",atm:true,card:true, sim:3,   taxi:5   },
  "UAE":         { min:300, rec:500, emg:800, currency:"AED", atm:true,  card:true,  sim:20,  taxi:30  },
  "China":       { min:200, rec:400, emg:600, currency:"CNY", atm:true,  card:false, sim:10,  taxi:15  },
  "Japan":       { min:300, rec:600, emg:900, currency:"JPY", atm:true,  card:true,  sim:20,  taxi:50  },
  "UK":          { min:200, rec:400, emg:600, currency:"GBP", atm:true,  card:true,  sim:15,  taxi:40  },
  "USA":         { min:200, rec:400, emg:600, currency:"USD", atm:true,  card:true,  sim:30,  taxi:25  },
  "Netherlands": { min:150, rec:300, emg:500, currency:"EUR", atm:true,  card:true,  sim:15,  taxi:30  },
  "Germany":     { min:150, rec:300, emg:500, currency:"EUR", atm:true,  card:true,  sim:15,  taxi:25  },
  "Panama":      { min:200, rec:400, emg:600, currency:"USD", atm:true,  card:true,  sim:10,  taxi:15  },
  "South Korea": { min:200, rec:400, emg:600, currency:"KRW",atm:true,  card:true,  sim:20,  taxi:20  },
  "Malaysia":    { min:150, rec:300, emg:500, currency:"MYR",atm:true,  card:true,  sim:8,   taxi:15  },
  "Other":       { min:200, rec:400, emg:700, currency:"USD",atm:true,  card:true,  sim:15,  taxi:20  },
};

const ONBOARD_DOCS_DEFAULT = [
  { id:"passport_ob",name:"Passport",           submittedTo:"Master" },
  { id:"cdc_ob",     name:"CDC / Seaman Book",  submittedTo:"Master" },
  { id:"coc_ob",     name:"COC",                submittedTo:"Master" },
  { id:"medical_ob", name:"Medical Certificate",submittedTo:"Master" },
  { id:"endorsement",name:"Flag Endorsements",  submittedTo:"Master" },
  { id:"stcw_ob",    name:"STCW Certificates",  submittedTo:"Master" },
];

const JOINING_CHECKLIST = [
  { id:"reported_master",  label:"Reported to Master" },
  { id:"cabin_allocated",  label:"Cabin Allocated" },
  { id:"docs_submitted",   label:"Documents Submitted to Master" },
  { id:"safety_induction", label:"Safety Induction Completed" },
  { id:"security_induction",label:"Security Induction Completed" },
  { id:"ship_tour",        label:"Ship Tour Completed" },
  { id:"dept_intro",       label:"Department Introduction" },
];

const CABIN_CHECKLIST = [
  { id:"life_jacket",  label:"Life Jacket Present & Marked" },
  { id:"immersion",    label:"Immersion Suit Present" },
  { id:"escape_route", label:"Escape Route Chart Posted" },
  { id:"muster_card",  label:"Muster Card Posted" },
  { id:"emrg_instruct",label:"Emergency Instructions Visible" },
  { id:"smoke_detect", label:"Smoke Detector Functional" },
  { id:"reading_light",label:"Reading Light Working" },
  { id:"cabin_lock",   label:"Cabin Lock Operational" },
  { id:"ac",           label:"Air Conditioning Working" },
];

const LSA_CHECKLIST = [
  { id:"muster_station",label:"Muster Station Located" },
  { id:"lifeboat",      label:"Lifeboat Location Known" },
  { id:"liferaft",      label:"Liferaft Location Known" },
  { id:"eebd",          label:"EEBD Locations Known" },
  { id:"fire_station",  label:"Fire Station Assigned Known" },
  { id:"emrg_signals",  label:"Emergency Signals Understood" },
  { id:"man_overboard", label:"Man Overboard Drill Known" },
];

const FIRST_24H = [
  { id:"met_master",     label:"Met Master" },
  { id:"met_dept_head",  label:"Met Department Head" },
  { id:"cabin_assigned", label:"Cabin Assigned" },
  { id:"safety_ind_24",  label:"Safety Induction" },
  { id:"security_ind_24",label:"Security Induction" },
  { id:"muster_loc",     label:"Muster Station Located" },
  { id:"lifeboat_loc",   label:"Lifeboat Located" },
  { id:"liferaft_loc",   label:"Liferaft Located" },
  { id:"eebd_loc",       label:"EEBD Located" },
  { id:"escape_24",      label:"Escape Routes Checked" },
  { id:"hospital_loc",   label:"Hospital Cabin Located" },
  { id:"familiarization",label:"Ship Familiarization Completed" },
];

const FIRST_WEEK = [
  { id:"payroll_sub",   label:"Payroll Submitted" },
  { id:"family_reg",    label:"Family Contact Registered with Company" },
  { id:"email_setup",   label:"Ship Email / Communication Setup" },
  { id:"garbage_train", label:"Garbage Segregation Training Done" },
  { id:"ptw_familiar",  label:"PTW (Permit to Work) Familiarization" },
  { id:"sms_familiar",  label:"SMS Familiarization Completed" },
  { id:"ism_familiar",  label:"ISM Code Familiarization" },
];

const ARRIVAL_CHECKLIST = [
  { id:"landed",           label:"Landed at Destination" },
  { id:"immigration",      label:"Immigration Cleared" },
  { id:"baggage_collected",label:"Baggage Collected" },
  { id:"agent_contacted",  label:"Ship's Agent Contacted" },
  { id:"hotel_reached",    label:"Hotel / Transit Reached" },
  { id:"transport_arranged",label:"Transport to Port Arranged" },
  { id:"vessel_boarded",   label:"Vessel Boarded" },
];

const PRESIGNOFF_CHECKLIST = [
  { id:"handover_notes",   label:"Handover Notes Prepared" },
  { id:"wages_verified",   label:"Wages Verified with Master" },
  { id:"overtime_verified",label:"Overtime Verified" },
  { id:"leave_salary",     label:"Leave Salary Verified" },
  { id:"docs_recovery",    label:"All Documents Recovered from Master" },
  { id:"belongings_packed",label:"All Belongings Packed" },
  { id:"company_property", label:"Company Property Returned" },
];

const SIGNOFF_CHECKLIST = [
  { id:"passport_recv",   label:"Passport Received" },
  { id:"cdc_recv",        label:"CDC Received" },
  { id:"certs_recv",      label:"All Certificates Received" },
  { id:"final_wage",      label:"Final Wage Amount Confirmed" },
  { id:"handover_done",   label:"Handover to Relief Completed" },
  { id:"cabin_cleared",   label:"Cabin Cleared & Cleaned" },
];

const AUDIT_CHECKLIST = [
  { id:"audit_docs",       label:"All Documents Returned & Verified" },
  { id:"audit_belongings", label:"All Personal Belongings Collected" },
  { id:"audit_salary",     label:"Full Salary Verified & Credited" },
  { id:"audit_cdc",        label:"CDC Entries Verified" },
  { id:"audit_passport",   label:"Passport Validity Checked" },
  { id:"audit_certs",      label:"All Certificates Up to Date" },
];

// ─── SMART QUANTITY CALCULATOR ────────────────────────────────────────────────
function calcQty(baseQty, months) {
  if (!months || months <= 0) return baseQty;
  const ratio = months / 4;
  return Math.max(1, Math.ceil(baseQty * ratio));
}

// ─── WORLD CLOCK HELPER ───────────────────────────────────────────────────────
function getTimeInZone(tz) {
  try {
    return new Date().toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return "--:--:--"; }
}
function getDateInZone(tz) {
  try {
    return new Date().toLocaleDateString("en-GB", { timeZone: tz, weekday: "short", day: "2-digit", month: "short" });
  } catch { return "---"; }
}

const TZ_MAP = {
  "Singapore":"+08:00 Asia/Singapore","Philippines":"+08:00 Asia/Manila","India":"+05:30 Asia/Kolkata",
  "UAE":"+04:00 Asia/Dubai","China":"+08:00 Asia/Shanghai","Japan":"+09:00 Asia/Tokyo",
  "UK":"Europe/London","USA/East":"-05:00 America/New_York","USA/West":"-08:00 America/Los_Angeles",
  "Netherlands":"Europe/Amsterdam","Germany":"Europe/Berlin","Panama":"-05:00 America/Panama",
  "South Korea":"+09:00 Asia/Seoul","Malaysia":"+08:00 Asia/Kuala_Lumpur","Australia/Sydney":"Australia/Sydney",
  "Greece":"Europe/Athens","Turkey":"Europe/Istanbul","Qatar":"+03:00 Asia/Qatar",
};

// ─── SMALL UI HELPERS ─────────────────────────────────────────────────────────
const ProgressBar = ({ pct, color = "var(--cyan)" }) => (
  <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${Math.min(100, pct || 0)}%`, background: color, borderRadius: 3, transition: "width 0.4s ease" }} />
  </div>
);

const CheckItem = ({ label, checked, onChange, critical, disabled }) => (
  <div onClick={() => !disabled && onChange(!checked)}
    style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9,
      background: checked ? "rgba(0,200,150,0.07)" : "rgba(255,255,255,0.02)",
      border: `1px solid ${checked ? "rgba(0,200,150,0.3)" : critical ? "rgba(255,71,87,0.2)" : "rgba(255,255,255,0.07)"}`,
      cursor: disabled ? "default" : "pointer", marginBottom: 5, transition: "all 0.2s" }}>
    <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${checked ? "var(--green)" : critical ? "#ff4757" : "var(--border2)"}`,
      background: checked ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
      {checked && <span style={{ color: "#000", fontSize: "0.7rem", fontWeight: 900 }}>✓</span>}
    </div>
    <span style={{ fontSize: "0.8rem", color: checked ? "var(--text2)" : "var(--text)", flex: 1, textDecoration: checked ? "line-through" : "none", opacity: checked ? 0.7 : 1 }}>{label}</span>
    {critical && !checked && <span style={{ fontSize: "0.6rem", background: "rgba(255,71,87,0.15)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 10, padding: "1px 6px" }}>CRITICAL</span>}
  </div>
);

const SectionCard = ({ title, icon, color = "var(--cyan)", children, collapsible = false, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: "var(--card)", border: `1px solid ${color}33`, borderRadius: 14, marginBottom: "1rem", overflow: "hidden" }}>
      <div onClick={() => collapsible && setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1.1rem",
          borderBottom: open ? `1px solid ${color}22` : "none",
          cursor: collapsible ? "pointer" : "default",
          background: `linear-gradient(135deg,${color}0d,transparent)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>{icon}</span>
          <span style={{ fontFamily: "Orbitron,monospace", fontSize: "0.74rem", fontWeight: 700, color, letterSpacing: "0.06em" }}>{title}</span>
        </div>
        {collapsible && <span style={{ color: "var(--text3)", fontSize: "0.8rem" }}>{open ? "▾" : "▸"}</span>}
      </div>
      {open && <div style={{ padding: "1rem 1.1rem" }}>{children}</div>}
    </div>
  );
};

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 10, padding: "0.8rem 0.6rem", textAlign: "center" }}>
    <div style={{ fontFamily: "Orbitron,monospace", fontSize: "1.1rem", fontWeight: 900, color }}>{value}</div>
    <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    {sub && <div style={{ fontSize: "0.58rem", color, marginTop: 2 }}>{sub}</div>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function CrewJourneyPage({ user, userProfile, notify }) {
  const [phase, setPhase] = useState("dashboard");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ── Contract ───────────────────────────────────────────────────────────────
  const [contract, setContract] = useState({
    rank: userProfile?.rank || "",
    vesselType: "",
    vesselName: "",
    company: "",
    joiningPort: "",
    joiningCountry: "",
    signOnDate: "",
    contractMonths: 4,
    reliefDate: "",
    homeTimezone: "Asia/Kolkata",
    shipTimezone: "Asia/Singapore",
    flightDate: "",
    airline: "",
    flightNo: "",
  });

  // ── Documents ──────────────────────────────────────────────────────────────
  const [docStatus, setDocStatus] = useState(() => {
    const init = {};
    DOCUMENT_CHECKLIST.forEach(d => { init[d.id] = { packed: false, present: false, expiryDate: "", notes: "" }; });
    return init;
  });

  // ── Packing ────────────────────────────────────────────────────────────────
  const [packStatus, setPackStatus] = useState(() => {
    const init = {};
    Object.values(DEFAULT_PACKING).flat().forEach(item => {
      init[item.id] = { status: "not_packed", qty: item.base, customQty: null, weight: 0 };
    });
    return init;
  });

  // ── Baggage ────────────────────────────────────────────────────────────────
  const [baggage, setBaggage] = useState({ airline: "", cabinLimit: 7, checkedLimit: 23, extraBag: false });

  // ── Checklist states (all phases) ──────────────────────────────────────────
  const [arrivalChecks, setArrivalChecks]     = useState({});
  const [joiningChecks, setJoiningChecks]     = useState({});
  const [cabinChecks, setCabinChecks]         = useState({});
  const [lsaChecks, setLsaChecks]             = useState({});
  const [first24h, setFirst24h]               = useState({});
  const [firstWeek, setFirstWeek]             = useState({});
  const [presignoffChecks, setPresignoffChecks] = useState({});
  const [signoffChecks, setSignoffChecks]     = useState({});
  const [auditChecks, setAuditChecks]         = useState({});

  // ── Muster duties ──────────────────────────────────────────────────────────
  const [muster, setMuster] = useState({
    fire_duty: "", boat_duty: "", security_duty: "", pollution_duty: "", emergency_role: "", notes: ""
  });

  // ── Onboard docs (submitted to Master) ────────────────────────────────────
  const [onboardDocs, setOnboardDocs] = useState(() =>
    ONBOARD_DOCS_DEFAULT.map(d => ({ ...d, submitted: false, returned: false, dateSubmitted: "", dateReturned: "", notes: "" }))
  );
  const [customOnboardDoc, setCustomOnboardDoc] = useState("");

  // ── Family & Medical cards ─────────────────────────────────────────────────
  const [familyCard, setFamilyCard] = useState({
    primary_name: "", primary_rel: "", primary_phone: "", primary_whatsapp: "", primary_email: "",
    secondary_name: "", secondary_rel: "", secondary_phone: "", secondary_email: "",
    home_address: "",
  });
  const [medCard, setMedCard] = useState({
    blood_group: "", allergies: "", conditions: "", medications: "",
    insurance_co: "", insurance_no: "", emergency_contact: "",
  });

  // ── Personal inventory ─────────────────────────────────────────────────────
  const [inventory, setInventory] = useState([
    { id: "inv_1", name: "Laptop", brand: "", serial: "", notes: "", driveFileId: null },
    { id: "inv_2", name: "Phone",  brand: "", serial: "", notes: "", driveFileId: null },
  ]);
  const [newInventoryItem, setNewInventoryItem] = useState({ name: "", brand: "", serial: "", notes: "" });

  // ── World clock ────────────────────────────────────────────────────────────
  const [clockTick, setClockTick]     = useState(0);
  const [savedClocks, setSavedClocks] = useState(["Asia/Kolkata", "Asia/Singapore", "UTC"]);
  const [addingClock, setAddingClock] = useState(false);
  const [newClockZone, setNewClockZone] = useState("");

  // ── Drive ──────────────────────────────────────────────────────────────────
  const [driveToken, setDriveToken]         = useState(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail]         = useState(null);
  const [driveFolderId, setDriveFolderId]   = useState(null);
  const [uploadingId, setUploadingId]       = useState(null);
  const [connectingDrive, setConnectingDrive] = useState(false);

  // ── Contract history ───────────────────────────────────────────────────────
  const [history, setHistory] = useState([]);

  // ─── Clock tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setClockTick(c => c + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Load / Save from Firebase ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    loadData();
    initDrive();
  }, [user?.uid]);

  const initDrive = () => {
    const token  = sessionStorage.getItem("nsx_drive_token");
    const expiry = sessionStorage.getItem("nsx_drive_expiry");
    const email  = sessionStorage.getItem("nsx_drive_email");
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setDriveToken(token); setDriveConnected(true); setDriveEmail(email);
    }
  };

  const isDriveTokenValid = () => {
    const e = sessionStorage.getItem("nsx_drive_expiry");
    return e && Date.now() < parseInt(e);
  };

  const connectDrive = async () => {
    setConnectingDrive(true);
    try {
      await new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) { resolve(); return; }
        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.onload = resolve; s.onerror = () => reject(new Error("Network error"));
        document.head.appendChild(s);
      });
      const token = await new Promise((resolve, reject) => {
        window.google.accounts.oauth2.initTokenClient({
          client_id: DRIVE_CLIENT_ID, scope: DRIVE_SCOPE, login_hint: user?.email || "",
          callback: r => { if (r.error) reject(new Error(r.error)); else resolve(r.access_token); }
        }).requestAccessToken({ prompt: "" });
      });
      const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      sessionStorage.setItem("nsx_drive_token", token);
      sessionStorage.setItem("nsx_drive_expiry", String(Date.now() + 3300000));
      sessionStorage.setItem("nsx_drive_email", info.email || "");
      setDriveToken(token); setDriveConnected(true); setDriveEmail(info.email);
      notify("Storage connected", "success");
    } catch (e) {
      if (!e.message?.includes("popup_closed") && !e.message?.includes("access_denied"))
        notify("Could not connect storage", "error");
    }
    setConnectingDrive(false);
  };

  const getOrCreateFolder = async (token) => {
    if (driveFolderId) return driveFolderId;
    let fid = await cjDriveSearchFolder(token);
    if (!fid) fid = await cjDriveCreateFolder(token);
    setDriveFolderId(fid); return fid;
  };

  const loadData = async () => {
    try {
      const snap = await getDoc(doc(db, "crew_journey", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.contract)       setContract(prev => ({ ...prev, ...d.contract }));
        if (d.docStatus)      setDocStatus(prev => ({ ...prev, ...d.docStatus }));
        if (d.packStatus)     setPackStatus(prev => ({ ...prev, ...d.packStatus }));
        if (d.baggage)        setBaggage(prev => ({ ...prev, ...d.baggage }));
        if (d.arrivalChecks)  setArrivalChecks(d.arrivalChecks);
        if (d.joiningChecks)  setJoiningChecks(d.joiningChecks);
        if (d.cabinChecks)    setCabinChecks(d.cabinChecks);
        if (d.lsaChecks)      setLsaChecks(d.lsaChecks);
        if (d.first24h)       setFirst24h(d.first24h);
        if (d.firstWeek)      setFirstWeek(d.firstWeek);
        if (d.presignoffChecks)setPresignoffChecks(d.presignoffChecks);
        if (d.signoffChecks)  setSignoffChecks(d.signoffChecks);
        if (d.auditChecks)    setAuditChecks(d.auditChecks);
        if (d.muster)         setMuster(prev => ({ ...prev, ...d.muster }));
        if (d.onboardDocs)    setOnboardDocs(d.onboardDocs);
        if (d.familyCard)     setFamilyCard(prev => ({ ...prev, ...d.familyCard }));
        if (d.medCard)        setMedCard(prev => ({ ...prev, ...d.medCard }));
        if (d.inventory)      setInventory(d.inventory);
        if (d.savedClocks)    setSavedClocks(d.savedClocks);
        if (d.history)        setHistory(d.history);
      }
    } catch (e) { console.error("[CrewJourney] Load:", e); }
    setLoaded(true);
  };

  // Only ticks/checkboxes go to Firebase — debounced 1.5s
  const saveTimerRef = useRef(null);
  const saveChecks = useCallback(async (payload) => {
    if (!user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try { await setDoc(doc(db, "crew_journey", user.uid), { ...payload, updatedAt: new Date().toISOString() }, { merge: true }); }
      catch (e) { console.error("[CrewJourney] Save:", e); }
      setSaving(false);
    }, 1500);
  }, [user]);

  // localStorage for form data
  useEffect(() => { localStorage.setItem("cj_contract", JSON.stringify(contract)); }, [contract]);
  useEffect(() => { localStorage.setItem("cj_baggage", JSON.stringify(baggage)); }, [baggage]);
  useEffect(() => { localStorage.setItem("cj_muster", JSON.stringify(muster)); }, [muster]);
  useEffect(() => { localStorage.setItem("cj_family", JSON.stringify(familyCard)); }, [familyCard]);
  useEffect(() => { localStorage.setItem("cj_medical", JSON.stringify(medCard)); }, [medCard]);

  // Firebase saves for checkbox states
  const updateCheck = (setter, key, checks, value) => {
    const updated = { ...checks, [key]: value };
    setter(updated);
    saveChecks({ [key.startsWith("arr") ? "arrivalChecks" : "joiningChecks"]: updated });
  };

  const toggleCheck = (setter, getChecks, id, firebaseKey) => {
    setter(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      saveChecks({ [firebaseKey]: updated });
      return updated;
    });
  };

  // ─── COMPUTED STATS ──────────────────────────────────────────────────────────
  const docsTotal    = DOCUMENT_CHECKLIST.length;
  const docsPacked   = DOCUMENT_CHECKLIST.filter(d => docStatus[d.id]?.packed).length;
  const docsPresent  = DOCUMENT_CHECKLIST.filter(d => docStatus[d.id]?.present).length;
  const criticalMissing = DOCUMENT_CHECKLIST.filter(d => d.critical && !docStatus[d.id]?.packed);

  const allPackItems = Object.values(DEFAULT_PACKING).flat();
  const packedItems  = allPackItems.filter(i => packStatus[i.id]?.status === "packed").length;
  const needPurchase = allPackItems.filter(i => packStatus[i.id]?.status === "need_purchase");

  // Total weight for baggage planner
  const totalWeight = allPackItems.reduce((s, i) => {
    const w = parseFloat(packStatus[i.id]?.weight) || 0;
    const q = packStatus[i.id]?.customQty ?? calcQty(i.base, contract.contractMonths);
    return s + w * q;
  }, 0);

  const contractMonths = contract.contractMonths || 4;
  const signOnDate     = contract.signOnDate;
  const daysOnboard    = signOnDate ? Math.floor((new Date() - new Date(signOnDate)) / 86400000) : 0;
  const contractDays   = contractMonths * 30;
  const daysRemaining  = Math.max(0, contractDays - daysOnboard);
  const contractPct    = Math.min(100, signOnDate ? Math.round((daysOnboard / contractDays) * 100) : 0);

  const reliefDate = contract.reliefDate || (signOnDate
    ? new Date(new Date(signOnDate).getTime() + contractDays * 86400000).toISOString().split("T")[0]
    : "");

  const joiningPct  = Math.round(((docsPacked + packedItems) / (docsTotal + allPackItems.length)) * 100);
  const signoffPct  = Math.round((Object.values(presignoffChecks).filter(Boolean).length / PRESIGNOFF_CHECKLIST.length) * 100);
  const onboardPct  = Math.round((Object.values({ ...joiningChecks, ...cabinChecks, ...lsaChecks }).filter(Boolean).length / (JOINING_CHECKLIST.length + CABIN_CHECKLIST.length + LSA_CHECKLIST.length)) * 100);

  const daysUntilJoining = signOnDate
    ? Math.max(0, Math.ceil((new Date(signOnDate) - new Date()) / 86400000))
    : null;
  const daysUntilRelief = reliefDate
    ? Math.max(0, Math.ceil((new Date(reliefDate) - new Date()) / 86400000))
    : null;

  // ─── UPLOAD PHOTO TO DRIVE ───────────────────────────────────────────────────
  const uploadInventoryPhoto = async (itemId, file) => {
    if (!driveToken || !isDriveTokenValid()) { notify("Connect storage first", "error"); return; }
    setUploadingId(itemId);
    try {
      const fid = await getOrCreateFolder(driveToken);
      const item = inventory.find(i => i.id === itemId);
      const up = await cjDriveUploadFile(driveToken, fid, file, `Inventory_${item?.name || itemId}_${itemId}.${file.name.split(".").pop()}`);
      const updated = inventory.map(i => i.id === itemId ? { ...i, driveFileId: up.id, driveFileName: file.name } : i);
      setInventory(updated);
      saveChecks({ inventory: updated });
      notify("Photo uploaded", "success");
    } catch (e) { notify("Upload failed", "error"); }
    setUploadingId(null);
  };

  // ─── PDF EXPORT ──────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const sections = [
      `<h3>Contract Details</h3>
       <table>
        <tr><td>Rank</td><td>${contract.rank}</td><td>Vessel</td><td>${contract.vesselName}</td></tr>
        <tr><td>Company</td><td>${contract.company}</td><td>Type</td><td>${contract.vesselType}</td></tr>
        <tr><td>Sign-On</td><td>${contract.signOnDate}</td><td>Duration</td><td>${contractMonths} months</td></tr>
        <tr><td>Joining Port</td><td>${contract.joiningPort}</td><td>Country</td><td>${contract.joiningCountry}</td></tr>
       </table>`,
      `<h3>Document Checklist</h3><ul>${DOCUMENT_CHECKLIST.map(d =>
        `<li style="color:${docStatus[d.id]?.packed ? "green" : "red"}">${d.name}: ${docStatus[d.id]?.packed ? "✅ Packed" : "❌ Not Packed"}${docStatus[d.id]?.expiryDate ? ` (Exp: ${docStatus[d.id].expiryDate})` : ""}</li>`).join("")}</ul>`,
      `<h3>Contract Progress</h3>
       <p>Days Onboard: <strong>${daysOnboard}</strong> / ${contractDays}</p>
       <p>Contract Progress: <strong>${contractPct}%</strong></p>
       <p>Relief Date: <strong>${reliefDate || "Not set"}</strong></p>`,
      `<h3>Onboard Documents Status</h3><ul>${onboardDocs.map(d =>
        `<li>${d.name}: ${d.submitted ? `✅ Submitted ${d.dateSubmitted ? `(${d.dateSubmitted})` : ""}` : "⬜ Not Submitted"} | ${d.returned ? `✅ Returned ${d.dateReturned ? `(${d.dateReturned})` : ""}` : "⏳ Pending Return"}</li>`).join("")}</ul>`,
      `<h3>Sign-Off Checklist</h3><ul>${SIGNOFF_CHECKLIST.map(c =>
        `<li style="color:${signoffChecks[c.id] ? "green" : "red"}">${c.label}: ${signoffChecks[c.id] ? "✅" : "❌"}</li>`).join("")}</ul>`,
    ];
    const html = `<!DOCTYPE html><html><head><title>Crew Journey Report</title>
      <style>body{font-family:Arial;font-size:12px;margin:20px;color:#222}h2{color:#003366;margin-bottom:4px}h3{color:#003366;margin-top:16px;border-bottom:1px solid #ccc;padding-bottom:4px}table{width:100%;border-collapse:collapse;margin-bottom:8px}td{border:1px solid #ddd;padding:5px 8px}ul{padding-left:16px}li{margin:3px 0}p{margin:4px 0}@media print{button{display:none}}</style>
      </head><body>
      <h2>NavisphereX — Crew Journey Report</h2>
      <p style="color:#666">Generated: ${new Date().toLocaleDateString()} | Seafarer: ${userProfile?.name || user?.email || "—"} | Rank: ${contract.rank || "—"}</p>
      ${sections.join("")}
      <br/><button onclick="window.print()">🖨 Print / Save as PDF</button>
      </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html); win.document.close();
    notify("Report ready — use Print to save PDF", "success");
  };

  // ─── PHASE TABS ──────────────────────────────────────────────────────────────
  const PHASES = [
    { id: "dashboard", label: "Dashboard", icon: "📡" },
    { id: "prejoin",   label: "Pre-Join",  icon: "🧳" },
    { id: "travel",    label: "Travel",    icon: "✈️" },
    { id: "onboard",   label: "Onboard",   icon: "🚢" },
    { id: "contract",  label: "Contract",  icon: "📋" },
    { id: "signoff",   label: "Sign-Off",  icon: "🏁" },
  ];

  if (!user) return (
    <div className="section">
      <div className="empty">
        <div className="empty-icon">⚓</div>
        <div className="empty-t">Login Required</div>
        <div className="empty-d">Please log in to access Crew Journey Manager.</div>
      </div>
    </div>
  );

  return (
    <div className="section" style={{ paddingBottom: "2rem" }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontFamily: "Orbitron,monospace", fontSize: "1rem", fontWeight: 900, color: "var(--cyan)", letterSpacing: "0.06em" }}>
              ⚓ CREW JOURNEY MANAGER
            </div>
            <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: 2 }}>
              Pre-Join → Travel → Onboard → Contract → Sign-Off
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {saving && <span style={{ fontSize: "0.65rem", color: "var(--text3)" }}>💾 Saving…</span>}
            <button onClick={exportPDF} style={{ padding: "5px 12px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", background: "rgba(240,165,0,0.12)", color: "var(--gold)", border: "1px solid rgba(240,165,0,0.35)" }}>🖨 PDF Report</button>
            {!driveConnected
              ? <button onClick={connectDrive} disabled={connectingDrive} style={{ padding: "5px 12px", borderRadius: 8, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", background: "linear-gradient(135deg,#4285f4,#34a853)", color: "#fff", border: "none" }}>{connectingDrive ? "Connecting…" : "☁️ Drive"}</button>
              : <span style={{ fontSize: "0.65rem", color: "var(--green)", background: "rgba(0,200,100,0.1)", border: "1px solid rgba(0,200,100,0.25)", borderRadius: 20, padding: "3px 10px" }}>☁️ Drive ✓</span>
            }
          </div>
        </div>
      </div>

      {/* ── PHASE TABS ── */}
      <div style={{ display: "flex", gap: 3, marginBottom: "1.2rem", overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {PHASES.map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            style={{ flexShrink: 0, padding: "7px 13px", borderRadius: 9, border: "none", cursor: "pointer",
              background: phase === p.id ? "linear-gradient(135deg,var(--cyan),var(--blue))" : "rgba(255,255,255,0.05)",
              color: phase === p.id ? "#fff" : "var(--text2)",
              fontFamily: phase === p.id ? "Orbitron,monospace" : "inherit",
              fontSize: "0.68rem", fontWeight: phase === p.id ? 700 : 400,
              boxShadow: phase === p.id ? "0 0 16px rgba(0,180,216,0.3)" : "none",
              transition: "all 0.2s" }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          DASHBOARD
      ══════════════════════════════════════════════════════════════════════════ */}
      {phase === "dashboard" && (
        <div>
          {/* Quick stats grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: "1.2rem" }}>
            <StatBox label="Joining Readiness" value={`${joiningPct}%`}   color={joiningPct >= 80 ? "var(--green)" : joiningPct >= 50 ? "var(--gold)" : "#ff4757"} />
            <StatBox label="Contract Progress" value={`${contractPct}%`}  color={contractPct >= 80 ? "#ff6b35" : contractPct >= 50 ? "var(--gold)" : "var(--green)"} />
            <StatBox label="Packing Progress"  value={`${Math.round((packedItems/allPackItems.length)*100)}%`} color="var(--cyan)" />
            <StatBox label="Sign-Off Ready"    value={`${signoffPct}%`}   color={signoffPct >= 80 ? "var(--green)" : "var(--gold)"} />
          </div>

          {/* Days counters */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: "1.2rem" }}>
            {daysUntilJoining !== null && daysUntilJoining >= 0 && (
              <div style={{ background: "rgba(0,180,216,0.08)", border: "1px solid rgba(0,180,216,0.25)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                <div style={{ fontFamily: "Orbitron,monospace", fontSize: "2rem", fontWeight: 900, color: "var(--cyan)" }}>{daysUntilJoining}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>DAYS UNTIL JOINING</div>
              </div>
            )}
            {daysOnboard > 0 && (
              <div style={{ background: "rgba(0,200,150,0.07)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                <div style={{ fontFamily: "Orbitron,monospace", fontSize: "2rem", fontWeight: 900, color: "var(--green)" }}>{daysOnboard}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>DAYS ONBOARD</div>
              </div>
            )}
            {daysUntilRelief !== null && daysUntilRelief >= 0 && (
              <div style={{ background: "rgba(240,165,0,0.07)", border: "1px solid rgba(240,165,0,0.25)", borderRadius: 12, padding: "1rem", textAlign: "center" }}>
                <div style={{ fontFamily: "Orbitron,monospace", fontSize: "2rem", fontWeight: 900, color: "var(--gold)" }}>{daysUntilRelief}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>DAYS UNTIL RELIEF</div>
              </div>
            )}
            <div style={{ background: "rgba(255,71,87,0.07)", border: `1px solid ${criticalMissing.length ? "rgba(255,71,87,0.4)" : "rgba(255,71,87,0.15)"}`, borderRadius: 12, padding: "1rem", textAlign: "center" }}>
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "2rem", fontWeight: 900, color: criticalMissing.length ? "#ff4757" : "var(--green)" }}>{criticalMissing.length}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>CRITICAL DOCS MISSING</div>
            </div>
          </div>

          {/* Contract progress bar */}
          {signOnDate && (
            <SectionCard title="CONTRACT TIMELINE" icon="📅" color="var(--gold)">
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text2)", marginBottom: 4 }}>
                  <span>Day {daysOnboard} of {contractDays}</span>
                  <span style={{ color: "var(--gold)", fontWeight: 700 }}>{contractPct}% complete</span>
                </div>
                <ProgressBar pct={contractPct} color={contractPct > 80 ? "#ff6b35" : "var(--gold)"} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text3)" }}>
                <span>Sign-On: <strong style={{ color: "var(--cyan)" }}>{contract.signOnDate || "Not set"}</strong></span>
                <span>Relief: <strong style={{ color: "var(--gold)" }}>{reliefDate || "Not set"}</strong></span>
              </div>
            </SectionCard>
          )}

          {/* Critical documents alert */}
          {criticalMissing.length > 0 && (
            <div style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.35)", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.72rem", color: "#ff4757", marginBottom: 8 }}>🚨 CRITICAL DOCUMENTS NOT PACKED</div>
              {criticalMissing.map(d => (
                <div key={d.id} style={{ fontSize: "0.76rem", color: "var(--text2)", padding: "2px 0" }}>⛔ {d.name}</div>
              ))}
              <button onClick={() => setPhase("prejoin")} style={{ marginTop: 8, padding: "5px 12px", borderRadius: 7, fontSize: "0.7rem", cursor: "pointer", background: "rgba(255,71,87,0.15)", color: "#ff4757", border: "1px solid rgba(255,71,87,0.4)", fontWeight: 700 }}>
                → Go to Documents
              </button>
            </div>
          )}

          {/* Shopping list */}
          {needPurchase.length > 0 && (
            <SectionCard title="SHOPPING LIST" icon="🛒" color="var(--gold)" collapsible defaultOpen={false}>
              {needPurchase.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text2)" }}>{item.name}</span>
                  <span style={{ color: "var(--gold)" }}>x{packStatus[item.id]?.customQty ?? calcQty(item.base, contractMonths)} {item.unit}</span>
                </div>
              ))}
            </SectionCard>
          )}

          {/* Onboard docs pending return */}
          {onboardDocs.filter(d => d.submitted && !d.returned).length > 0 && (
            <div style={{ background: "rgba(240,165,0,0.07)", border: "1px solid rgba(240,165,0,0.3)", borderRadius: 12, padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.72rem", color: "var(--gold)", marginBottom: 6 }}>⚠️ DOCUMENTS PENDING RETURN</div>
              {onboardDocs.filter(d => d.submitted && !d.returned).map(d => (
                <div key={d.id} style={{ fontSize: "0.76rem", color: "var(--text2)", padding: "2px 0" }}>📌 {d.name} — submitted to {d.submittedTo}</div>
              ))}
            </div>
          )}

          {/* Quick phase shortcuts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginTop: "0.5rem" }}>
            {PHASES.filter(p => p.id !== "dashboard").map(p => (
              <button key={p.id} onClick={() => setPhase(p.id)}
                style={{ padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,180,216,0.08)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}>
                <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--text)" }}>{p.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          PRE-JOIN
      ══════════════════════════════════════════════════════════════════════════ */}
      {phase === "prejoin" && (
        <div>
          {/* Contract setup */}
          <SectionCard title="CONTRACT SETUP" icon="📝" color="var(--cyan)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["rank",          "Rank",            "select-rank"],
                ["vesselName",    "Vessel Name",     "text"],
                ["vesselType",    "Vessel Type",     "select-vessel"],
                ["company",       "Company Name",    "text"],
                ["joiningPort",   "Joining Port",    "text"],
                ["joiningCountry","Joining Country", "text"],
                ["signOnDate",    "Sign-On Date",    "date"],
                ["contractMonths","Duration (months)","number"],
                ["reliefDate",    "Relief Date",     "date"],
                ["flightDate",    "Flight Date",     "date"],
                ["airline",       "Airline",         "text"],
                ["flightNo",      "Flight Number",   "text"],
              ].map(([field, label, type]) => (
                <div key={field} className="ff" style={{ margin: 0, gridColumn: field === "joiningCountry" || field === "company" ? "span 2" : "span 1" }}>
                  <label className="fl">{label}</label>
                  {type === "select-rank"
                    ? <select className="fi" value={contract[field]} onChange={e => setContract(p => ({ ...p, [field]: e.target.value }))}>
                        <option value="">— Select —</option>
                        {MARITIME_RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    : type === "select-vessel"
                    ? <select className="fi" value={contract[field]} onChange={e => setContract(p => ({ ...p, [field]: e.target.value }))}>
                        <option value="">— Select —</option>
                        {VESSEL_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    : <input className="fi" type={type === "text" ? "text" : type}
                        value={contract[field]} min={type === "number" ? 1 : undefined} max={type === "number" ? 24 : undefined}
                        onChange={e => setContract(p => ({ ...p, [field]: type === "number" ? parseInt(e.target.value) || 1 : e.target.value }))} />
                  }
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(0,180,216,0.06)", borderRadius: 8, fontSize: "0.72rem", color: "var(--text3)" }}>
              ℹ️ Data saved automatically. Form data stored locally, checklist progress synced to cloud.
            </div>
          </SectionCard>

          {/* Document checklist */}
          <SectionCard title="DOCUMENT CHECKLIST" icon="📋" color="var(--gold)">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{docsPacked}/{docsTotal} packed</div>
              <div style={{ fontSize: "0.72rem", color: docsPresent === docsTotal ? "var(--green)" : "var(--gold)", fontWeight: 700 }}>
                {Math.round((docsPacked / docsTotal) * 100)}%
              </div>
            </div>
            <ProgressBar pct={(docsPacked / docsTotal) * 100} color="var(--gold)" />
            <div style={{ marginTop: 14 }}>
              {DOCUMENT_CHECKLIST.map(doc => (
                <div key={doc.id} style={{ marginBottom: 10 }}>
                  <CheckItem
                    label={doc.name}
                    checked={docStatus[doc.id]?.packed}
                    critical={doc.critical}
                    onChange={val => {
                      const updated = { ...docStatus, [doc.id]: { ...docStatus[doc.id], packed: val } };
                      setDocStatus(updated);
                      saveChecks({ docStatus: updated });
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, paddingLeft: 30, marginTop: -2, flexWrap: "wrap" }}>
                    <input
                      type="date"
                      placeholder="Expiry date"
                      value={docStatus[doc.id]?.expiryDate || ""}
                      onChange={e => setDocStatus(p => ({ ...p, [doc.id]: { ...p[doc.id], expiryDate: e.target.value } }))}
                      style={{ flex: 1, minWidth: 110, padding: "4px 8px", borderRadius: 6, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.7rem" }}
                    />
                    <input
                      placeholder="Notes…"
                      value={docStatus[doc.id]?.notes || ""}
                      onChange={e => setDocStatus(p => ({ ...p, [doc.id]: { ...p[doc.id], notes: e.target.value } }))}
                      style={{ flex: 2, minWidth: 100, padding: "4px 8px", borderRadius: 6, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)", fontSize: "0.7rem" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Packing manager */}
          <SectionCard title="BAGGAGE & PACKING MANAGER" icon="🎒" color="var(--purple)" collapsible>
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.72rem", color: "var(--text3)" }}>
              📦 Smart quantities based on <strong style={{ color: "var(--cyan)" }}>{contractMonths} month</strong> contract. Edit per item. Mark status below each item.
            </div>
            {Object.entries(DEFAULT_PACKING).map(([category, items]) => (
              <div key={category} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.68rem", color: "var(--purple)", marginBottom: 8, letterSpacing: "0.08em" }}>
                  {category} ({items.filter(i => packStatus[i.id]?.status === "packed").length}/{items.length})
                </div>
                {items.map(item => {
                  const s   = packStatus[item.id] || {};
                  const qty = s.customQty ?? calcQty(item.base, contractMonths);
                  return (
                    <div key={item.id} style={{ background: s.status === "packed" ? "rgba(0,200,150,0.05)" : s.status === "need_purchase" ? "rgba(240,165,0,0.05)" : "rgba(255,255,255,0.02)", border: `1px solid ${s.status === "packed" ? "rgba(0,200,150,0.2)" : s.status === "need_purchase" ? "rgba(240,165,0,0.2)" : "rgba(255,255,255,0.06)"}`, borderRadius: 8, padding: "8px 10px", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--text)", fontWeight: 500 }}>{item.name}</span>
                        <input
                          type="number" min={0} value={qty}
                          onChange={e => {
                            const updated = { ...packStatus, [item.id]: { ...s, customQty: parseInt(e.target.value) || 0 } };
                            setPackStatus(updated);
                          }}
                          style={{ width: 52, padding: "3px 6px", borderRadius: 6, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--cyan)", fontSize: "0.76rem", textAlign: "center" }}
                        />
                        <span style={{ fontSize: "0.62rem", color: "var(--text3)" }}>{item.unit}</span>
                        <input
                          type="number" min={0} step={0.1} placeholder="kg"
                          value={s.weight || ""}
                          onChange={e => setPackStatus(p => ({ ...p, [item.id]: { ...p[item.id], weight: parseFloat(e.target.value) || 0 } }))}
                          style={{ width: 52, padding: "3px 6px", borderRadius: 6, background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text3)", fontSize: "0.7rem", textAlign: "center" }}
                        />
                        <span style={{ fontSize: "0.58rem", color: "var(--text3)" }}>kg</span>
                      </div>
                      <div style={{ display: "flex", gap: 5 }}>
                        {[["packed","✅ Packed","var(--green)"],["need_purchase","🛒 Buy","var(--gold)"],["not_packed","⬜ Not Packed","var(--text3)"]].map(([val, lbl, col]) => (
                          <button key={val} onClick={() => {
                            const updated = { ...packStatus, [item.id]: { ...s, status: val } };
                            setPackStatus(updated);
                            saveChecks({ packStatus: updated });
                          }}
                            style={{ flex: 1, padding: "4px 0", borderRadius: 6, fontSize: "0.62rem", fontWeight: s.status === val ? 700 : 400, cursor: "pointer", background: s.status === val ? `${col}22` : "transparent", color: s.status === val ? col : "var(--text3)", border: `1px solid ${s.status === val ? col + "55" : "rgba(255,255,255,0.08)"}`, transition: "all 0.15s" }}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </SectionCard>

          {/* Cash planner */}
          <SectionCard title="JOINING CASH PLANNER" icon="💵" color="var(--green)" collapsible>
            {(() => {
              const country = contract.joiningCountry;
              const info    = CASH_INFO[country] || CASH_INFO["Other"];
              return (
                <div>
                  <div style={{ marginBottom: 10, fontSize: "0.74rem", color: "var(--text3)" }}>
                    Based on joining country: <strong style={{ color: "var(--cyan)" }}>{country || "Not set — add in Contract Setup"}</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
                    <div style={{ background: "rgba(0,200,150,0.07)", border: "1px solid rgba(0,200,150,0.25)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "Orbitron,monospace", fontSize: "1rem", fontWeight: 900, color: "var(--green)" }}>{info.min}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 2 }}>MINIMUM</div>
                      <div style={{ fontSize: "0.58rem", color: "var(--green)" }}>{info.currency}</div>
                    </div>
                    <div style={{ background: "rgba(0,180,216,0.07)", border: "1px solid rgba(0,180,216,0.25)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "Orbitron,monospace", fontSize: "1rem", fontWeight: 900, color: "var(--cyan)" }}>{info.rec}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 2 }}>RECOMMENDED</div>
                      <div style={{ fontSize: "0.58rem", color: "var(--cyan)" }}>{info.currency}</div>
                    </div>
                    <div style={{ background: "rgba(255,71,87,0.07)", border: "1px solid rgba(255,71,87,0.25)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ fontFamily: "Orbitron,monospace", fontSize: "1rem", fontWeight: 900, color: "#ff4757" }}>{info.emg}</div>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginTop: 2 }}>EMERGENCY</div>
                      <div style={{ fontSize: "0.58rem", color: "#ff4757" }}>{info.currency}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {[
                      [info.atm ? "✅" : "❌", "ATM Availability", info.atm ? "ATMs widely available" : "Limited ATMs"],
                      [info.card ? "✅" : "⚠️", "Card Usage", info.card ? "Cards widely accepted" : "Mostly cash — carry enough"],
                      ["📱", "SIM Card Estimate", `~${info.sim} ${info.currency}`],
                      ["🚕", "Taxi / Transfer Estimate", `~${info.taxi} ${info.currency}`],
                    ].map(([icon, label, val], i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: "0.76rem", color: "var(--text2)" }}>{icon} {label}</span>
                        <span style={{ fontSize: "0.76rem", color: "var(--green)", fontWeight: 600 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          {/* Power plug guide */}
          <SectionCard title="POWER PLUG GUIDE" icon="🔌" color="var(--gold)" collapsible>
            {(() => {
              const country = contract.joiningCountry;
              const plug    = POWER_PLUGS[country] || POWER_PLUGS["Other"];
              return (
                <div>
                  <div style={{ marginBottom: 10, fontSize: "0.74rem", color: "var(--text3)" }}>
                    Country: <strong style={{ color: "var(--cyan)" }}>{country || "Not set"}</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 10 }}>
                    {[["Plug Type", plug.type, "var(--gold)"], ["Voltage", plug.voltage, "#ff6b35"], ["Frequency", plug.freq, "var(--cyan)"]].map(([l, v, c]) => (
                      <div key={l} style={{ background: `${c}11`, border: `1px solid ${c}33`, borderRadius: 8, padding: "10px", textAlign: "center" }}>
                        <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.9rem", fontWeight: 900, color: c }}>{v}</div>
                        <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginTop: 2 }}>{l}</div>
                      </div>
                    ))}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "10px", gridColumn: "1/-1" }}>
                      <div style={{ fontSize: "0.76rem", color: "var(--text2)" }}>ℹ️ {plug.note}</div>
                    </div>
                  </div>
                  <div style={{ background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.3)", borderRadius: 8, padding: "10px 12px", fontSize: "0.76rem", color: "var(--gold)", fontWeight: 700 }}>
                    🌍 Recommendation: Always carry a <strong>Universal Travel Adapter</strong>
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          {/* World clock */}
          <SectionCard title="WORLD CLOCK" icon="🕐" color="var(--cyan)">
            <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
              {savedClocks.map((tz, i) => (
                <div key={tz} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,180,216,0.05)", border: "1px solid rgba(0,180,216,0.15)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.62rem", color: "var(--text3)", marginBottom: 2 }}>{tz.replace(/_/g, " ")}</div>
                    <div style={{ fontFamily: "Orbitron,monospace", fontSize: "1.05rem", fontWeight: 900, color: i === 0 ? "var(--green)" : i === 1 ? "var(--gold)" : "var(--cyan)" }}>
                      {clockTick >= 0 && getTimeInZone(tz)}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>{clockTick >= 0 && getDateInZone(tz)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {i === 0 && <span style={{ fontSize: "0.58rem", background: "rgba(0,200,150,0.15)", color: "var(--green)", borderRadius: 10, padding: "2px 7px", border: "1px solid rgba(0,200,150,0.3)" }}>HOME</span>}
                    {i === 1 && <span style={{ fontSize: "0.58rem", background: "rgba(240,165,0,0.15)", color: "var(--gold)", borderRadius: 10, padding: "2px 7px", border: "1px solid rgba(240,165,0,0.3)" }}>SHIP</span>}
                    <button onClick={() => { const c = [...savedClocks]; c.splice(i, 1); setSavedClocks(c); saveChecks({ savedClocks: c }); }}
                      style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: "0.8rem", padding: "2px 4px" }}>✕</button>
                  </div>
                </div>
              ))}
              <div style={{ background: "rgba(0,180,216,0.04)", border: "1px solid rgba(0,180,216,0.15)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text3)" }}>
                🏠 Home · 🚢 Ship · 🌐 UTC
              </div>
            </div>
            {addingClock ? (
              <div style={{ display: "flex", gap: 6 }}>
                <select value={newClockZone} onChange={e => setNewClockZone(e.target.value)} className="fi" style={{ flex: 1, margin: 0 }}>
                  <option value="">— Select timezone —</option>
                  {Object.entries(TZ_MAP).map(([label, tz]) => <option key={tz} value={tz.includes(" ") ? tz.split(" ")[1] : tz}>{label}</option>)}
                </select>
                <button onClick={() => {
                  if (!newClockZone) return;
                  const updated = [...savedClocks, newClockZone];
                  setSavedClocks(updated); saveChecks({ savedClocks: updated });
                  setAddingClock(false); setNewClockZone("");
                }} style={{ padding: "6px 14px", borderRadius: 7, cursor: "pointer", background: "rgba(0,180,216,0.15)", color: "var(--cyan)", border: "1px solid rgba(0,180,216,0.4)", fontSize: "0.74rem", fontWeight: 700 }}>Add</button>
                <button onClick={() => setAddingClock(false)} style={{ padding: "6px 10px", borderRadius: 7, cursor: "pointer", background: "none", color: "var(--text3)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.74rem" }}>Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingClock(true)} style={{ padding: "6px 14px", borderRadius: 7, cursor: "pointer", background: "rgba(0,180,216,0.08)", color: "var(--cyan)", border: "1px dashed rgba(0,180,216,0.35)", fontSize: "0.74rem", width: "100%" }}>+ Add Clock</button>
            )}
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          TRAVEL
      ══════════════════════════════════════════════════════════════════════════ */}
      {phase === "travel" && (
        <div>
          {/* Baggage weight planner */}
          <SectionCard title="BAGGAGE WEIGHT PLANNER" icon="⚖️" color="var(--cyan)">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div className="ff" style={{ margin: 0 }}>
                <label className="fl">Airline</label>
                <input className="fi" value={baggage.airline} onChange={e => setBaggage(p => ({ ...p, airline: e.target.value }))} placeholder="e.g. Emirates" />
              </div>
              <div className="ff" style={{ margin: 0 }}>
                <label className="fl">Cabin Limit (kg)</label>
                <input className="fi" type="number" value={baggage.cabinLimit} onChange={e => setBaggage(p => ({ ...p, cabinLimit: parseFloat(e.target.value) || 7 }))} />
              </div>
              <div className="ff" style={{ margin: 0 }}>
                <label className="fl">Checked Bag Limit (kg)</label>
                <input className="fi" type="number" value={baggage.checkedLimit} onChange={e => setBaggage(p => ({ ...p, checkedLimit: parseFloat(e.target.value) || 23 }))} />
              </div>
              <div className="ff" style={{ margin: 0 }}>
                <label className="fl">Extra Bag Allowed?</label>
                <select className="fi" value={baggage.extraBag ? "yes" : "no"} onChange={e => setBaggage(p => ({ ...p, extraBag: e.target.value === "yes" }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
            {(() => {
              const totalKg  = parseFloat(totalWeight.toFixed(1));
              const totalAllowance = baggage.checkedLimit + (baggage.extraBag ? baggage.checkedLimit : 0);
              const remaining = totalAllowance - totalKg;
              const overweight = remaining < 0;
              return (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                    <StatBox label="Estimated Total" value={`${totalKg}kg`} color={overweight ? "#ff4757" : "var(--cyan)"} />
                    <StatBox label="Allowance" value={`${totalAllowance}kg`} color="var(--green)" />
                    <StatBox label={overweight ? "Overweight" : "Remaining"} value={`${Math.abs(remaining).toFixed(1)}kg`} color={overweight ? "#ff4757" : "var(--green)"} />
                  </div>
                  {overweight && (
                    <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.4)", borderRadius: 8, padding: "8px 12px", fontSize: "0.76rem", color: "#ff4757", fontWeight: 700 }}>
                      ⚠️ OVERWEIGHT by {Math.abs(remaining).toFixed(1)}kg — reduce packing quantity or mark some items as not packed
                    </div>
                  )}
                  <div style={{ marginTop: 8, fontSize: "0.68rem", color: "var(--text3)" }}>
                    💡 Weights estimated from packing list. Edit kg per item in the Packing Manager (Pre-Join phase).
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          {/* Last-minute reminders */}
          <SectionCard title="LAST-MINUTE REMINDERS" icon="⏰" color="#ff6b35">
            {(() => {
              const flightDate = contract.flightDate;
              if (!flightDate) return <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>Set your Flight Date in Contract Setup (Pre-Join) to see countdowns.</div>;
              const hoursLeft = Math.round((new Date(flightDate) - new Date()) / 3600000);
              const alerts = [
                { h: 48, label: "48 Hours Before Flight", color: "var(--gold)"   },
                { h: 24, label: "24 Hours Before Flight", color: "#ff9f43"  },
                { h: 12, label: "12 Hours Before Flight", color: "#ff6b35"  },
                { h: 6,  label: "6 Hours Before Flight",  color: "#ff4757"  },
              ];
              return (
                <div>
                  <div style={{ marginBottom: 10, fontSize: "0.76rem" }}>
                    Flight: <strong style={{ color: "var(--cyan)" }}>{flightDate}</strong> {contract.airline && `· ${contract.airline}`} {contract.flightNo && `${contract.flightNo}`}
                  </div>
                  <div style={{ marginBottom: 12, fontSize: "0.72rem", color: hoursLeft > 0 ? "var(--text3)" : "#ff4757" }}>
                    {hoursLeft > 0 ? `⏳ ${hoursLeft} hours until flight` : "✈️ Flight time passed"}
                  </div>
                  {alerts.map(a => (
                    <div key={a.h} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: hoursLeft <= a.h && hoursLeft > 0 ? `${a.color}18` : "rgba(255,255,255,0.02)", border: `1px solid ${hoursLeft <= a.h && hoursLeft > 0 ? a.color + "55" : "rgba(255,255,255,0.06)"}`, marginBottom: 5 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: hoursLeft <= a.h && hoursLeft > 0 ? a.color : "var(--border2)", flexShrink: 0, boxShadow: hoursLeft <= a.h && hoursLeft > 0 ? `0 0 8px ${a.color}` : "none" }} />
                      <span style={{ fontSize: "0.78rem", color: hoursLeft <= a.h && hoursLeft > 0 ? a.color : "var(--text3)", fontWeight: hoursLeft <= a.h && hoursLeft > 0 ? 700 : 400 }}>{a.label}</span>
                      {hoursLeft <= a.h && hoursLeft > 0 && <span style={{ marginLeft: "auto", fontSize: "0.62rem", background: `${a.color}22`, color: a.color, borderRadius: 10, padding: "1px 7px", border: `1px solid ${a.color}44`, fontWeight: 700 }}>ACTIVE</span>}
                    </div>
                  ))}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.68rem", color: "#ff4757", marginBottom: 8 }}>🚨 CRITICAL ITEMS TO CHECK BEFORE LEAVING</div>
                    {criticalMissing.length === 0
                      ? <div style={{ fontSize: "0.76rem", color: "var(--green)" }}>✅ All critical documents marked as packed!</div>
                      : criticalMissing.map(d => (
                          <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "rgba(255,71,87,0.08)", borderRadius: 7, marginBottom: 4, border: "1px solid rgba(255,71,87,0.25)" }}>
                            <span style={{ color: "#ff4757", fontSize: "0.9rem" }}>⛔</span>
                            <span style={{ fontSize: "0.78rem", color: "#ff4757", fontWeight: 700 }}>{d.name}</span>
                          </div>
                        ))
                    }
                  </div>
                </div>
              );
            })()}
          </SectionCard>

          {/* Arrival checklist */}
          <SectionCard title="ARRIVAL & PORT TRANSFER" icon="🛬" color="var(--green)">
            <div style={{ marginBottom: 8, fontSize: "0.72rem", color: "var(--text3)" }}>
              {Object.values(arrivalChecks).filter(Boolean).length}/{ARRIVAL_CHECKLIST.length} completed
            </div>
            <ProgressBar pct={(Object.values(arrivalChecks).filter(Boolean).length / ARRIVAL_CHECKLIST.length) * 100} color="var(--green)" />
            <div style={{ marginTop: 12 }}>
              {ARRIVAL_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!arrivalChecks[item.id]}
                  onChange={() => toggleCheck(setArrivalChecks, arrivalChecks, item.id, "arrivalChecks")} />
              ))}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          ONBOARD
      ══════════════════════════════════════════════════════════════════════════ */}
      {phase === "onboard" && (
        <div>
          {/* Joining day */}
          <SectionCard title="JOINING DAY CHECKLIST" icon="🚢" color="var(--cyan)">
            <ProgressBar pct={(Object.values(joiningChecks).filter(Boolean).length / JOINING_CHECKLIST.length) * 100} color="var(--cyan)" />
            <div style={{ marginTop: 12 }}>
              {JOINING_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!joiningChecks[item.id]}
                  onChange={() => toggleCheck(setJoiningChecks, joiningChecks, item.id, "joiningChecks")} />
              ))}
            </div>
          </SectionCard>

          {/* Cabin inspection */}
          <SectionCard title="CABIN INSPECTION" icon="🛏️" color="var(--gold)" collapsible>
            <ProgressBar pct={(Object.values(cabinChecks).filter(Boolean).length / CABIN_CHECKLIST.length) * 100} color="var(--gold)" />
            <div style={{ marginTop: 12 }}>
              {CABIN_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!cabinChecks[item.id]}
                  onChange={() => toggleCheck(setCabinChecks, cabinChecks, item.id, "cabinChecks")} />
              ))}
            </div>
            {driveConnected && (
              <div style={{ marginTop: 10 }}>
                <input id="cabin-photo" type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) uploadInventoryPhoto("cabin_inspection", e.target.files[0]); e.target.value = ""; }} />
                <label htmlFor="cabin-photo" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, background: "rgba(240,165,0,0.1)", color: "var(--gold)", border: "1px solid rgba(240,165,0,0.35)" }}>
                  📸 Take Cabin Photo
                </label>
              </div>
            )}
          </SectionCard>

          {/* LSA/FFA */}
          <SectionCard title="LSA / FFA FAMILIARIZATION" icon="🆘" color="#ff4757" collapsible>
            <ProgressBar pct={(Object.values(lsaChecks).filter(Boolean).length / LSA_CHECKLIST.length) * 100} color="#ff4757" />
            <div style={{ marginTop: 12 }}>
              {LSA_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!lsaChecks[item.id]} critical
                  onChange={() => toggleCheck(setLsaChecks, lsaChecks, item.id, "lsaChecks")} />
              ))}
            </div>
          </SectionCard>

          {/* Muster list */}
          <SectionCard title="MUSTER LIST & DUTIES" icon="📋" color="var(--purple)" collapsible>
            <div style={{ display: "grid", gap: 8 }}>
              {[["fire_duty","Fire Duty Station"],["boat_duty","Boat Duty Station"],["security_duty","Security Duty"],["pollution_duty","Pollution Duty"],["emergency_role","Emergency Role"]].map(([field, label]) => (
                <div key={field} className="ff" style={{ margin: 0 }}>
                  <label className="fl">{label}</label>
                  <input className="fi" value={muster[field]} onChange={e => setMuster(p => ({ ...p, [field]: e.target.value }))} placeholder={`Enter ${label.toLowerCase()}…`} />
                </div>
              ))}
              <div className="ff" style={{ margin: 0 }}>
                <label className="fl">Notes</label>
                <textarea className="fi" value={muster.notes} onChange={e => setMuster(p => ({ ...p, notes: e.target.value }))} style={{ minHeight: 60, resize: "vertical", fontFamily: "inherit", fontSize: "inherit" }} />
              </div>
            </div>
          </SectionCard>

          {/* First 24 hours */}
          <SectionCard title="FIRST 24 HOURS ONBOARD" icon="⏱" color="var(--green)" collapsible>
            <ProgressBar pct={(Object.values(first24h).filter(Boolean).length / FIRST_24H.length) * 100} color="var(--green)" />
            <div style={{ marginTop: 12 }}>
              {FIRST_24H.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!first24h[item.id]}
                  onChange={() => toggleCheck(setFirst24h, first24h, item.id, "first24h")} />
              ))}
            </div>
          </SectionCard>

          {/* First week */}
          <SectionCard title="FIRST WEEK ONBOARD" icon="📅" color="var(--cyan)" collapsible>
            <ProgressBar pct={(Object.values(firstWeek).filter(Boolean).length / FIRST_WEEK.length) * 100} color="var(--cyan)" />
            <div style={{ marginTop: 12 }}>
              {FIRST_WEEK.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!firstWeek[item.id]}
                  onChange={() => toggleCheck(setFirstWeek, firstWeek, item.id, "firstWeek")} />
              ))}
            </div>
          </SectionCard>

          {/* Onboard documents submitted to Master */}
          <SectionCard title="DOCUMENTS SUBMITTED TO MASTER" icon="📁" color="var(--gold)">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
              <StatBox label="Submitted" value={onboardDocs.filter(d=>d.submitted).length} color="var(--cyan)" />
              <StatBox label="Returned" value={onboardDocs.filter(d=>d.returned).length} color="var(--green)" />
              <StatBox label="Pending" value={onboardDocs.filter(d=>d.submitted&&!d.returned).length} color="#ff6b35" />
            </div>
            {onboardDocs.map((doc, idx) => (
              <div key={doc.id} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${doc.returned ? "rgba(0,200,150,0.2)" : doc.submitted ? "rgba(240,165,0,0.2)" : "rgba(255,255,255,0.07)"}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>{doc.name}</span>
                  <span style={{ fontSize: "0.62rem", background: doc.returned ? "rgba(0,200,150,0.15)" : doc.submitted ? "rgba(240,165,0,0.15)" : "rgba(255,255,255,0.06)", color: doc.returned ? "var(--green)" : doc.submitted ? "var(--gold)" : "var(--text3)", borderRadius: 10, padding: "2px 8px", border: `1px solid ${doc.returned ? "rgba(0,200,150,0.3)" : doc.submitted ? "rgba(240,165,0,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                    {doc.returned ? "✅ Returned" : doc.submitted ? "📌 Submitted" : "⬜ Not Submitted"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => {
                    const updated = onboardDocs.map((d, i) => i === idx ? { ...d, submitted: !d.submitted, dateSubmitted: !d.submitted ? new Date().toISOString().split("T")[0] : "" } : d);
                    setOnboardDocs(updated); saveChecks({ onboardDocs: updated });
                  }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.68rem", cursor: "pointer", background: doc.submitted ? "rgba(240,165,0,0.1)" : "rgba(0,180,216,0.1)", color: doc.submitted ? "var(--gold)" : "var(--cyan)", border: `1px solid ${doc.submitted ? "rgba(240,165,0,0.3)" : "rgba(0,180,216,0.3)"}`, fontWeight: 600 }}>
                    {doc.submitted ? "✓ Submitted" : "Mark Submitted"}
                  </button>
                  {doc.submitted && (
                    <button onClick={() => {
                      const updated = onboardDocs.map((d, i) => i === idx ? { ...d, returned: !d.returned, dateReturned: !d.returned ? new Date().toISOString().split("T")[0] : "" } : d);
                      setOnboardDocs(updated); saveChecks({ onboardDocs: updated });
                    }} style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.68rem", cursor: "pointer", background: doc.returned ? "rgba(0,200,150,0.12)" : "rgba(255,255,255,0.05)", color: doc.returned ? "var(--green)" : "var(--text3)", border: `1px solid ${doc.returned ? "rgba(0,200,150,0.3)" : "rgba(255,255,255,0.1)"}`, fontWeight: 600 }}>
                      {doc.returned ? "✓ Returned" : "Mark Returned"}
                    </button>
                  )}
                </div>
                {(doc.dateSubmitted || doc.dateReturned || doc.notes) && (
                  <div style={{ marginTop: 5, fontSize: "0.66rem", color: "var(--text3)" }}>
                    {doc.dateSubmitted && <span>Submitted: {doc.dateSubmitted} </span>}
                    {doc.dateReturned && <span>| Returned: {doc.dateReturned} </span>}
                    {doc.notes && <span>| {doc.notes}</span>}
                  </div>
                )}
              </div>
            ))}
            {/* Add custom doc */}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input className="fi" style={{ flex: 1, margin: 0 }} placeholder="Add custom document…" value={customOnboardDoc}
                onChange={e => setCustomOnboardDoc(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && customOnboardDoc.trim()) {
                    const newDoc = { id: `custom_${Date.now()}`, name: customOnboardDoc.trim(), submittedTo: "Master", submitted: false, returned: false, dateSubmitted: "", dateReturned: "", notes: "" };
                    const updated = [...onboardDocs, newDoc];
                    setOnboardDocs(updated); saveChecks({ onboardDocs: updated });
                    setCustomOnboardDoc("");
                  }
                }} />
              <button onClick={() => {
                if (!customOnboardDoc.trim()) return;
                const newDoc = { id: `custom_${Date.now()}`, name: customOnboardDoc.trim(), submittedTo: "Master", submitted: false, returned: false, dateSubmitted: "", dateReturned: "", notes: "" };
                const updated = [...onboardDocs, newDoc];
                setOnboardDocs(updated); saveChecks({ onboardDocs: updated });
                setCustomOnboardDoc("");
              }} style={{ padding: "6px 14px", borderRadius: 7, cursor: "pointer", background: "rgba(0,180,216,0.12)", color: "var(--cyan)", border: "1px solid rgba(0,180,216,0.35)", fontSize: "0.74rem", fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          CONTRACT
      ══════════════════════════════════════════════════════════════════════════ */}
      {phase === "contract" && (
        <div>
          {/* Contract tracker widget */}
          <SectionCard title="CONTRACT TRACKER" icon="📊" color="var(--gold)">
            {signOnDate ? (
              <div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--text2)", marginBottom: 4 }}>
                    <span>Day {daysOnboard} of {contractDays}</span>
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>{contractPct}%</span>
                  </div>
                  <ProgressBar pct={contractPct} color={contractPct > 85 ? "#ff6b35" : "var(--gold)"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginTop: 12 }}>
                  {[
                    ["Days Onboard",  daysOnboard,      "var(--cyan)"],
                    ["Days Remaining",daysRemaining,    daysRemaining < 30 ? "#ff4757" : daysRemaining < 60 ? "var(--gold)" : "var(--green)"],
                    ["Contract Start",contract.signOnDate, "var(--text2)"],
                    ["Relief Date",  reliefDate || "TBD","var(--gold)"],
                    ["Vessel",       contract.vesselName||"—","var(--text2)"],
                    ["Company",      contract.company||"—",   "var(--text2)"],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{l}</div>
                      <div style={{ fontFamily: typeof v === "number" ? "Orbitron,monospace" : "inherit", fontSize: typeof v === "number" ? "1.1rem" : "0.82rem", fontWeight: 700, color: c, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginBottom: 10 }}>Set Sign-On Date in Pre-Join → Contract Setup to see contract tracking.</div>
                <button onClick={() => setPhase("prejoin")} style={{ padding: "6px 14px", borderRadius: 8, cursor: "pointer", background: "rgba(0,180,216,0.12)", color: "var(--cyan)", border: "1px solid rgba(0,180,216,0.35)", fontSize: "0.76rem" }}>→ Go to Contract Setup</button>
              </div>
            )}
          </SectionCard>

          {/* Family emergency card */}
          <SectionCard title="FAMILY EMERGENCY CARD" icon="👨‍👩‍👧" color="var(--green)" collapsible defaultOpen={false}>
            <div style={{ background: "rgba(0,200,150,0.05)", border: "1px solid rgba(0,200,150,0.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.7rem", color: "var(--text3)" }}>
              🔒 Stored locally — accessible offline. For emergencies onboard.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.66rem", color: "var(--green)", marginBottom: 2 }}>PRIMARY CONTACT</div>
              {[["primary_name","Full Name"],["primary_rel","Relationship"],["primary_phone","Phone"],["primary_whatsapp","WhatsApp"],["primary_email","Email"]].map(([field, label]) => (
                <div key={field} className="ff" style={{ margin: 0 }}>
                  <label className="fl">{label}</label>
                  <input className="fi" value={familyCard[field]} onChange={e => setFamilyCard(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.66rem", color: "var(--cyan)", marginBottom: 2, marginTop: 6 }}>SECONDARY CONTACT</div>
              {[["secondary_name","Full Name"],["secondary_rel","Relationship"],["secondary_phone","Phone"],["secondary_email","Email"]].map(([field, label]) => (
                <div key={field} className="ff" style={{ margin: 0 }}>
                  <label className="fl">{label}</label>
                  <input className="fi" value={familyCard[field]} onChange={e => setFamilyCard(p => ({ ...p, [field]: e.target.value }))} />
                </div>
              ))}
              <div className="ff" style={{ margin: 0 }}>
                <label className="fl">Home Address</label>
                <textarea className="fi" value={familyCard.home_address} onChange={e => setFamilyCard(p => ({ ...p, home_address: e.target.value }))} style={{ minHeight: 55, resize: "vertical", fontFamily: "inherit", fontSize: "inherit" }} />
              </div>
            </div>
          </SectionCard>

          {/* Medical card */}
          <SectionCard title="MEDICAL INFORMATION CARD" icon="🏥" color="#ff4757" collapsible defaultOpen={false}>
            <div style={{ background: "rgba(255,71,87,0.05)", border: "1px solid rgba(255,71,87,0.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: "0.7rem", color: "var(--text3)" }}>
              🔒 Stored locally — accessible offline. Share with ship's doctor in emergencies.
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {[["blood_group","Blood Group",false],["allergies","Allergies",true],["conditions","Medical Conditions",true],["medications","Current Medications",true],["insurance_co","Insurance Company",false],["insurance_no","Insurance Policy Number",false],["emergency_contact","Emergency Contact",false]].map(([field, label, ta]) => (
                <div key={field} className="ff" style={{ margin: 0 }}>
                  <label className="fl">{label}</label>
                  {ta
                    ? <textarea className="fi" value={medCard[field]} onChange={e => setMedCard(p => ({ ...p, [field]: e.target.value }))} style={{ minHeight: 50, resize: "vertical", fontFamily: "inherit", fontSize: "inherit" }} />
                    : <input className="fi" value={medCard[field]} onChange={e => setMedCard(p => ({ ...p, [field]: e.target.value }))} />
                  }
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Personal inventory */}
          <SectionCard title="PERSONAL VALUABLES TRACKER" icon="💼" color="var(--purple)" collapsible defaultOpen={false}>
            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              {inventory.map((item, idx) => (
                <div key={item.id} style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>{item.name}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {driveConnected && (
                        <>
                          <input id={`inv-photo-${item.id}`} type="file" accept="image/*" style={{ display: "none" }}
                            onChange={e => { if (e.target.files?.[0]) uploadInventoryPhoto(item.id, e.target.files[0]); e.target.value = ""; }} />
                          <label htmlFor={`inv-photo-${item.id}`} style={{ padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontSize: "0.62rem", background: item.driveFileId ? "rgba(0,200,100,0.1)" : "rgba(124,58,237,0.1)", color: item.driveFileId ? "var(--green)" : "var(--purple)", border: `1px solid ${item.driveFileId ? "rgba(0,200,100,0.3)" : "rgba(124,58,237,0.3)"}` }}>
                            {uploadingId === item.id ? "…" : item.driveFileId ? "✅ Photo" : "📸"}
                          </label>
                        </>
                      )}
                      {item.driveFileId && (
                        <a href={`https://drive.google.com/file/d/${item.driveFileId}/view`} target="_blank" rel="noreferrer"
                          style={{ padding: "3px 8px", borderRadius: 6, fontSize: "0.62rem", background: "rgba(0,180,216,0.1)", color: "var(--cyan)", border: "1px solid rgba(0,180,216,0.3)", textDecoration: "none" }}>👁</a>
                      )}
                      <button onClick={() => { const updated = inventory.filter((_, i) => i !== idx); setInventory(updated); saveChecks({ inventory: updated }); }}
                        style={{ padding: "3px 7px", borderRadius: 6, cursor: "pointer", fontSize: "0.62rem", background: "none", color: "#ff4757", border: "1px solid rgba(255,71,87,0.3)" }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {[["brand","Brand / Model"],["serial","Serial No."],["notes","Notes"]].map(([field, label]) => (
                      <input key={field} className="fi"
                        style={{ margin: 0, padding: "5px 8px", fontSize: "0.72rem", gridColumn: field === "notes" ? "1/-1" : "auto" }}
                        placeholder={label} value={item[field]}
                        onChange={e => setInventory(prev => prev.map((it, i) => i === idx ? { ...it, [field]: e.target.value } : it))} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.65rem", color: "var(--purple)", marginBottom: 8 }}>ADD ITEM</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[["name","Item Name *"],["brand","Brand / Model"],["serial","Serial No."],["notes","Notes"]].map(([field, label]) => (
                  <input key={field} className="fi"
                    style={{ margin: 0, padding: "5px 8px", fontSize: "0.72rem", gridColumn: field === "notes" || field === "name" ? "1/-1" : "auto" }}
                    placeholder={label} value={newInventoryItem[field]}
                    onChange={e => setNewInventoryItem(p => ({ ...p, [field]: e.target.value }))} />
                ))}
              </div>
              <button onClick={() => {
                if (!newInventoryItem.name.trim()) return;
                const item = { id: `inv_${Date.now()}`, ...newInventoryItem, driveFileId: null };
                const updated = [...inventory, item];
                setInventory(updated); saveChecks({ inventory: updated });
                setNewInventoryItem({ name: "", brand: "", serial: "", notes: "" });
              }} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 7, cursor: "pointer", background: "rgba(124,58,237,0.15)", color: "var(--purple)", border: "1px solid rgba(124,58,237,0.4)", fontSize: "0.74rem", fontWeight: 700 }}>+ Add Item</button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          SIGN-OFF
      ══════════════════════════════════════════════════════════════════════════ */}
      {phase === "signoff" && (
        <div>
          {/* Relief countdown */}
          {daysUntilRelief !== null && (
            <div style={{ background: daysUntilRelief < 30 ? "rgba(255,71,87,0.08)" : "rgba(0,180,216,0.06)", border: `1px solid ${daysUntilRelief < 30 ? "rgba(255,71,87,0.35)" : "rgba(0,180,216,0.25)"}`, borderRadius: 14, padding: "1.2rem", marginBottom: "1rem", textAlign: "center" }}>
              <div style={{ fontFamily: "Orbitron,monospace", fontSize: "2.5rem", fontWeight: 900, color: daysUntilRelief < 30 ? "#ff4757" : daysUntilRelief < 60 ? "var(--gold)" : "var(--green)" }}>{daysUntilRelief}</div>
              <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginTop: 4 }}>DAYS UNTIL RELIEF</div>
              {reliefDate && <div style={{ fontSize: "0.72rem", color: "var(--text2)", marginTop: 4 }}>Estimated relief: <strong style={{ color: "var(--gold)" }}>{reliefDate}</strong></div>}
            </div>
          )}

          {/* Pre-signoff (30 days before) */}
          <SectionCard title="PRE SIGN-OFF CHECKLIST (30 Days)" icon="📋" color="var(--gold)">
            <ProgressBar pct={(Object.values(presignoffChecks).filter(Boolean).length / PRESIGNOFF_CHECKLIST.length) * 100} color="var(--gold)" />
            <div style={{ marginTop: 12 }}>
              {PRESIGNOFF_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!presignoffChecks[item.id]}
                  onChange={() => toggleCheck(setPresignoffChecks, presignoffChecks, item.id, "presignoffChecks")} />
              ))}
            </div>
          </SectionCard>

          {/* Sign-off day */}
          <SectionCard title="SIGN-OFF DAY CHECKLIST" icon="🏁" color="var(--green)">
            <ProgressBar pct={(Object.values(signoffChecks).filter(Boolean).length / SIGNOFF_CHECKLIST.length) * 100} color="var(--green)" />
            <div style={{ marginTop: 12 }}>
              {SIGNOFF_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!signoffChecks[item.id]} critical
                  onChange={() => toggleCheck(setSignoffChecks, signoffChecks, item.id, "signoffChecks")} />
              ))}
            </div>
          </SectionCard>

          {/* Contract completion audit */}
          <SectionCard title="CONTRACT COMPLETION AUDIT" icon="✅" color="var(--cyan)" collapsible>
            <div style={{ marginBottom: 10, fontSize: "0.74rem", color: "var(--text3)" }}>
              Final verification before closing contract. All items must be green.
            </div>
            <ProgressBar pct={(Object.values(auditChecks).filter(Boolean).length / AUDIT_CHECKLIST.length) * 100} color="var(--cyan)" />
            <div style={{ marginTop: 12 }}>
              {AUDIT_CHECKLIST.map(item => (
                <CheckItem key={item.id} label={item.label} checked={!!auditChecks[item.id]} critical
                  onChange={() => toggleCheck(setAuditChecks, auditChecks, item.id, "auditChecks")} />
              ))}
            </div>
            {Object.values(auditChecks).filter(Boolean).length === AUDIT_CHECKLIST.length && (
              <div style={{ marginTop: 12, background: "rgba(0,200,150,0.08)", border: "1px solid rgba(0,200,150,0.3)", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>🎉</div>
                <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.78rem", color: "var(--green)", fontWeight: 700 }}>CONTRACT AUDIT COMPLETE</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginTop: 4 }}>All items verified. Safe journey home!</div>
                <button onClick={exportPDF} style={{ marginTop: 10, padding: "7px 18px", borderRadius: 8, cursor: "pointer", background: "rgba(0,200,150,0.15)", color: "var(--green)", border: "1px solid rgba(0,200,150,0.4)", fontSize: "0.76rem", fontWeight: 700 }}>🖨 Generate Completion Report</button>
              </div>
            )}
          </SectionCard>

          {/* Contract history */}
          <SectionCard title="CONTRACT HISTORY" icon="📖" color="var(--purple)" collapsible defaultOpen={false}>
            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1rem 0" }}>
                <div style={{ fontSize: "0.76rem", color: "var(--text3)", marginBottom: 10 }}>No completed contracts recorded yet.</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>When you complete a contract audit, save it here for your records.</div>
              </div>
            ) : (
              history.map((h, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "10px 12px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--text)" }}>{h.vesselName || "Vessel"}</span>
                    <span style={{ fontSize: "0.68rem", color: "var(--purple)" }}>{h.months} months</span>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{h.signOn} → {h.signOff} · {h.company}</div>
                </div>
              ))
            )}
            {contract.signOnDate && (
              <button onClick={() => {
                const entry = {
                  vesselName: contract.vesselName, company: contract.company, vesselType: contract.vesselType,
                  signOn: contract.signOnDate, signOff: new Date().toISOString().split("T")[0],
                  months: contractMonths, daysOnboard, rank: contract.rank,
                  savedAt: new Date().toISOString(),
                };
                const updated = [...history, entry];
                setHistory(updated); saveChecks({ history: updated });
                notify("Contract saved to history", "success");
              }} style={{ marginTop: 8, padding: "6px 14px", borderRadius: 7, cursor: "pointer", background: "rgba(124,58,237,0.12)", color: "var(--purple)", border: "1px solid rgba(124,58,237,0.35)", fontSize: "0.74rem", fontWeight: 700, width: "100%" }}>
                + Save Current Contract to History
              </button>
            )}
          </SectionCard>

          {/* PDF export */}
          <div style={{ background: "var(--card)", border: "1px solid rgba(240,165,0,0.25)", borderRadius: 14, padding: "1.2rem" }}>
            <div style={{ fontFamily: "Orbitron,monospace", fontSize: "0.76rem", color: "var(--gold)", marginBottom: 8 }}>🖨 EXPORT REPORTS</div>
            <div style={{ fontSize: "0.74rem", color: "var(--text3)", marginBottom: 12, lineHeight: 1.5 }}>
              Generate a full PDF report of your contract including documents, checklists, and statistics.
            </div>
            <button onClick={exportPDF} style={{ padding: "8px 20px", borderRadius: 8, cursor: "pointer", background: "rgba(240,165,0,0.15)", color: "var(--gold)", border: "1px solid rgba(240,165,0,0.4)", fontSize: "0.76rem", fontWeight: 700 }}>
              🖨 Generate Full PDF Report
            </button>
          </div>
        </div>
      )}

      {/* ── INFO FOOTER ── */}
      <div className="info-box" style={{ marginTop: "1.5rem", fontSize: "0.7rem" }}>
        ⚓ Crew Journey Manager — Checklist progress synced to cloud. Form data stored locally. Photos saved privately to your Google Drive.
      </div>
    </div>
  );
}

export default CrewJourneyPage;
