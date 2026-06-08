/* eslint-disable */
// src/Pages/CrewJourneyPage.jsx — v2 (all 15 fixes applied)
import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

// ─── DRIVE HELPERS ────────────────────────────────────────────────────────────
const DRIVE_SCOPE     = "https://www.googleapis.com/auth/drive.file";
const DRIVE_CLIENT_ID = "636056685819-b0mv1o4ftbdfirtan4svpoaa83ns49c6.apps.googleusercontent.com";
const DRIVE_FOLDER_CJ = "NavisphereX CrewJourney";
// FIX 3: localStorage keys so Drive stays connected across refresh/logout
const CJ_TOKEN_KEY  = "cj_drive_token";
const CJ_EXPIRY_KEY = "cj_drive_expiry";
const CJ_EMAIL_KEY  = "cj_drive_email";

async function cjDriveSearchFolder(token) {
  const q = encodeURIComponent(`name='${DRIVE_FOLDER_CJ}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).files?.[0]?.id || null;
}
async function cjDriveCreateFolder(token) {
  const res = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_CJ, mimeType: "application/vnd.google-apps.folder" })
  });
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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MARITIME_RANKS = ["Captain / Master","Chief Officer","2nd Officer","3rd Officer","Navigating Officer","Chief Engineer","2nd Engineer","3rd Engineer","4th Engineer","Engine Rating","Electrical Officer (ETO)","Bosun","AB Seaman","Ordinary Seaman","Deck Cadet","Engine Cadet","Other"];
const VESSEL_TYPES   = ["Bulk Carrier","Container Ship","Tanker (Oil)","Chemical Tanker","Gas Tanker (LNG/LPG)","General Cargo","RoRo","Passenger / Cruise","Offshore","Tug / Supply","Other"];

const DOCUMENT_CHECKLIST = [
  { id:"passport",    name:"Passport",                        category:"Personal",   critical:true  },
  { id:"cdc",         name:"CDC / Seaman Book",               category:"Personal",   critical:true  },
  { id:"coc",         name:"Certificate of Competency (COC)", category:"Competency", critical:true  },
  { id:"flag_end",    name:"Flag Endorsement",                category:"Competency", critical:true  },
  { id:"goc",         name:"GOC / GMDSS Certificate",         category:"Competency", critical:false },
  { id:"bst",         name:"STCW Basic Safety (BST)",         category:"STCW",       critical:true  },
  { id:"psc",         name:"Proficiency Survival Craft",      category:"STCW",       critical:false },
  { id:"aff",         name:"Advanced Fire Fighting",          category:"STCW",       critical:false },
  { id:"medical",     name:"Medical Certificate (ENG1/ML5)",  category:"Medical",    critical:true  },
  { id:"yellowfever", name:"Yellow Fever Certificate",        category:"Medical",    critical:false },
  { id:"visa",        name:"Visa (if required)",              category:"Travel",     critical:true  },
  { id:"joining_ltr", name:"Joining Letter",                  category:"Official",   critical:true  },
  { id:"contract",    name:"Employment Contract",             category:"Official",   critical:true  },
  { id:"vaccination", name:"Vaccination Records",             category:"Medical",    critical:false },
  { id:"tanker_end",  name:"Tanker Endorsements",             category:"Tanker",     critical:false },
  { id:"dp_cert",     name:"DP Certificate",                  category:"Special",    critical:false },
  { id:"flight_tkt",  name:"Flight Ticket (Printed)",         category:"Travel",     critical:true  },
  { id:"insurance",   name:"Medical Insurance Card",          category:"Medical",    critical:false },
];

// FIX 15: Smart default weights per item (kg)
const DEFAULT_PACKING = {
  Toiletries: [
    { id:"toothpaste",  name:"Toothpaste",        unit:"tube",   base:1,  wt:0.10 },
    { id:"toothbrush",  name:"Toothbrush",         unit:"pcs",    base:2,  wt:0.05 },
    { id:"shampoo",     name:"Shampoo",            unit:"bottle", base:1,  wt:0.30 },
    { id:"soap",        name:"Soap / Body Wash",   unit:"pcs",    base:2,  wt:0.15 },
    { id:"razors",      name:"Razors",             unit:"pcs",    base:4,  wt:0.02 },
    { id:"shaving",     name:"Shaving Cream",      unit:"can",    base:1,  wt:0.25 },
    { id:"deodorant",   name:"Deodorant",          unit:"pcs",    base:2,  wt:0.15 },
    { id:"sunscreen",   name:"Sunscreen SPF50",    unit:"bottle", base:1,  wt:0.20 },
    { id:"nailcut",     name:"Nail Cutter Set",    unit:"set",    base:1,  wt:0.10 },
    { id:"moisturiser", name:"Moisturiser",        unit:"bottle", base:1,  wt:0.20 },
  ],
  Clothing: [
    { id:"tshirt",     name:"T-Shirts / Polo",    unit:"pcs",   base:5, wt:0.20 },
    { id:"trousers",   name:"Trousers / Jeans",   unit:"pcs",   base:3, wt:0.50 },
    { id:"shorts",     name:"Shorts",             unit:"pcs",   base:3, wt:0.20 },
    { id:"underwear",  name:"Underwear",          unit:"pcs",   base:7, wt:0.10 },
    { id:"socks",      name:"Socks",              unit:"pairs", base:7, wt:0.08 },
    { id:"uniform",    name:"Uniform / Coverall", unit:"set",   base:2, wt:0.80 },
    { id:"shoes",      name:"Safety Shoes",       unit:"pair",  base:1, wt:1.20 },
    { id:"casualshoe", name:"Casual Shoes",       unit:"pair",  base:1, wt:0.80 },
    { id:"jacket",     name:"Jacket / Windbreaker",unit:"pcs",  base:1, wt:0.60 },
    { id:"belt",       name:"Belt",               unit:"pcs",   base:1, wt:0.15 },
    { id:"cap",        name:"Cap / Hat",          unit:"pcs",   base:2, wt:0.10 },
    { id:"towel",      name:"Towels",             unit:"pcs",   base:3, wt:0.30 },
  ],
  Electronics: [
    { id:"laptop",     name:"Laptop + Charger",    unit:"set", base:1, wt:2.20 },
    { id:"phone",      name:"Phone + Charger",     unit:"set", base:1, wt:0.30 },
    { id:"tablet",     name:"Tablet",              unit:"pcs", base:1, wt:0.50 },
    { id:"earphones",  name:"Earphones / Headset", unit:"pcs", base:1, wt:0.20 },
    { id:"powerbank",  name:"Power Bank",          unit:"pcs", base:1, wt:0.30 },
    { id:"adapter",    name:"Universal Adapter",   unit:"pcs", base:1, wt:0.15 },
    { id:"usb_hub",    name:"USB Hub / Cables",    unit:"set", base:1, wt:0.20 },
    { id:"hdd",        name:"External Hard Drive", unit:"pcs", base:1, wt:0.20 },
    { id:"flashlight", name:"Flashlight / Torch",  unit:"pcs", base:1, wt:0.15 },
  ],
  Medical: [
    { id:"painkiller",  name:"Painkillers (Paracetamol)", unit:"strip",   base:4, wt:0.05 },
    { id:"antacid",     name:"Antacid Tablets",           unit:"strip",   base:2, wt:0.04 },
    { id:"antiseptic",  name:"Antiseptic Cream",          unit:"tube",    base:1, wt:0.08 },
    { id:"bandages",    name:"Bandages / Plasters",       unit:"box",     base:1, wt:0.10 },
    { id:"cough_med",   name:"Cough Syrup",               unit:"bottle",  base:1, wt:0.15 },
    { id:"allergy",     name:"Allergy Tablets",           unit:"strip",   base:2, wt:0.04 },
    { id:"prescribed",  name:"Prescribed Medicines",      unit:"supply",  base:0, wt:0.20 },
    { id:"vitamin",     name:"Multivitamins",             unit:"bottle",  base:1, wt:0.15 },
    { id:"rehydration", name:"Rehydration Sachets",       unit:"box",     base:1, wt:0.10 },
  ],
  "Travel Essentials": [
    { id:"pass_holder",  name:"Passport Holder",     unit:"pcs", base:1,  wt:0.05 },
    { id:"lug_lock",     name:"Luggage Lock",         unit:"pcs", base:2,  wt:0.08 },
    { id:"neck_pillow",  name:"Neck Pillow",          unit:"pcs", base:1,  wt:0.15 },
    { id:"eye_mask",     name:"Sleep Mask",           unit:"pcs", base:1,  wt:0.03 },
    { id:"notebook",     name:"Notebook / Diary",     unit:"pcs", base:1,  wt:0.20 },
    { id:"pen",          name:"Pens",                 unit:"pcs", base:5,  wt:0.01 },
    { id:"books",        name:"Books / Kindle",       unit:"pcs", base:2,  wt:0.30 },
    { id:"snacks",       name:"Snacks / Energy Bars", unit:"pcs", base:10, wt:0.08 },
    { id:"water_bottle", name:"Water Bottle",         unit:"pcs", base:1,  wt:0.20 },
    { id:"umbrella",     name:"Compact Umbrella",     unit:"pcs", base:1,  wt:0.25 },
  ],
};

// FIX 9: Estimated label + local tips added
const CASH_INFO = {
  "Singapore":   { min:300,   rec:500,   emg:800,   currency:"SGD", atm:true,  card:true,  sim:15,   taxi:25,   note:"Cards widely accepted. Changi ATMs 24/7." },
  "Philippines": { min:200,   rec:400,   emg:600,   currency:"USD", atm:true,  card:true,  sim:5,    taxi:10,   note:"USD accepted. Get PHP from airport." },
  "India":       { min:3000,  rec:6000,  emg:10000, currency:"INR", atm:true,  card:true,  sim:200,  taxi:300,  note:"Cards in cities. Carry cash near ports." },
  "UAE":         { min:300,   rec:500,   emg:800,   currency:"AED", atm:true,  card:true,  sim:50,   taxi:30,   note:"Cards everywhere. Dubai taxis metered." },
  "China":       { min:500,   rec:1000,  emg:1500,  currency:"CNY", atm:true,  card:false, sim:50,   taxi:40,   note:"Cards rarely work. Bring USD to exchange." },
  "Japan":       { min:10000, rec:20000, emg:30000, currency:"JPY", atm:true,  card:true,  sim:1500, taxi:2000, note:"Japan Post ATMs accept foreign cards." },
  "UK":          { min:150,   rec:300,   emg:500,   currency:"GBP", atm:true,  card:true,  sim:10,   taxi:25,   note:"Cards accepted everywhere." },
  "Netherlands": { min:150,   rec:300,   emg:500,   currency:"EUR", atm:true,  card:true,  sim:15,   taxi:30,   note:"Rotterdam — cards widely accepted." },
  "Belgium":     { min:150,   rec:300,   emg:500,   currency:"EUR", atm:true,  card:true,  sim:15,   taxi:25,   note:"Antwerp port area — cards OK." },
  "Poland":      { min:200,   rec:400,   emg:600,   currency:"PLN", atm:true,  card:true,  sim:20,   taxi:30,   note:"Exchange EUR to PLN on arrival." },
  "Lithuania":   { min:100,   rec:200,   emg:400,   currency:"EUR", atm:true,  card:true,  sim:10,   taxi:20,   note:"EUR used directly." },
  "Vietnam":     { min:500000,rec:1000000,emg:1500000,currency:"VND",atm:true, card:true,  sim:50000,taxi:100000,note:"Carry VND cash. Cards in cities only." },
  "Sri Lanka":   { min:5000,  rec:10000, emg:15000, currency:"LKR", atm:true,  card:true,  sim:500,  taxi:1000, note:"Colombo ATMs near port." },
  "Colombo":     { min:5000,  rec:10000, emg:15000, currency:"LKR", atm:true,  card:true,  sim:500,  taxi:1000, note:"Colombo ATMs near port." },
  "Panama":      { min:200,   rec:400,   emg:600,   currency:"USD", atm:true,  card:true,  sim:10,   taxi:15,   note:"USD used directly." },
  "Other":       { min:200,   rec:400,   emg:700,   currency:"USD", atm:true,  card:true,  sim:15,   taxi:20,   note:"Carry USD as backup currency." },
};

const POWER_PLUGS = {
  "Singapore":  { type:"G",       voltage:"230V",      freq:"50Hz",    note:"3-pin rectangular (UK style)" },
  "Philippines":{ type:"A/B",     voltage:"220V",      freq:"60Hz",    note:"US flat 2/3 pin" },
  "India":      { type:"C/D/M",   voltage:"230V",      freq:"50Hz",    note:"Round 3-pin — common D type" },
  "UAE":        { type:"G",       voltage:"220V",      freq:"50Hz",    note:"UK 3-pin rectangular" },
  "China":      { type:"A/I",     voltage:"220V",      freq:"50Hz",    note:"Flat 2 or 3 pin" },
  "Japan":      { type:"A",       voltage:"100V",      freq:"50/60Hz", note:"⚠️ 100V only — check device!" },
  "South Korea":{ type:"C/F",     voltage:"220V",      freq:"60Hz",    note:"Round 2-pin Schuko" },
  "Netherlands":{ type:"C/F",     voltage:"230V",      freq:"50Hz",    note:"Round 2-pin (Rotterdam)" },
  "Belgium":    { type:"E",       voltage:"230V",      freq:"50Hz",    note:"Round pin + hole (Antwerp)" },
  "UK":         { type:"G",       voltage:"230V",      freq:"50Hz",    note:"3-pin rectangular" },
  "Poland":     { type:"C/E",     voltage:"230V",      freq:"50Hz",    note:"Round 2-pin" },
  "Lithuania":  { type:"C/F",     voltage:"230V",      freq:"50Hz",    note:"Round 2-pin" },
  "Vietnam":    { type:"A/C",     voltage:"220V",      freq:"50Hz",    note:"Flat 2-pin or round 2-pin" },
  "Sri Lanka":  { type:"D/G",     voltage:"230V",      freq:"50Hz",    note:"Mix of D and G types" },
  "Colombo":    { type:"D/G",     voltage:"230V",      freq:"50Hz",    note:"Mix of D and G types (Colombo)" },
  "Malaysia":   { type:"G",       voltage:"240V",      freq:"50Hz",    note:"UK 3-pin" },
  "Australia":  { type:"I",       voltage:"230V",      freq:"50Hz",    note:"Diagonal flat 3-pin" },
  "USA":        { type:"A/B",     voltage:"120V",      freq:"60Hz",    note:"⚠️ 120V only — check device!" },
  "Panama":     { type:"A/B",     voltage:"110V",      freq:"60Hz",    note:"⚠️ 110V — check device!" },
  "Other":      { type:"Universal",voltage:"110–240V", freq:"50–60Hz", note:"Always carry a universal adapter" },
};

// FIX 5: Friendly timezone labels
const TZ_LIST = [
  { tz:"Asia/Kolkata",        label:"India (IST +5:30)"        },
  { tz:"Asia/Singapore",      label:"Singapore (SGT +8:00)"    },
  { tz:"UTC",                 label:"UTC / GMT +0:00"           },
  { tz:"Asia/Manila",         label:"Philippines (PHT +8:00)"  },
  { tz:"Asia/Dubai",          label:"UAE (GST +4:00)"           },
  { tz:"Asia/Shanghai",       label:"China (CST +8:00)"        },
  { tz:"Asia/Tokyo",          label:"Japan (JST +9:00)"        },
  { tz:"Europe/London",       label:"UK (GMT/BST)"             },
  { tz:"Europe/Amsterdam",    label:"Netherlands (CET +1:00)"  },
  { tz:"Europe/Warsaw",       label:"Poland (CET +1:00)"       },
  { tz:"Europe/Vilnius",      label:"Lithuania (EET +2:00)"    },
  { tz:"America/New_York",    label:"USA East (EST -5:00)"     },
  { tz:"America/Los_Angeles", label:"USA West (PST -8:00)"     },
  { tz:"Australia/Sydney",    label:"Australia (AEDT +11:00)"  },
  { tz:"Asia/Seoul",          label:"South Korea (KST +9:00)"  },
  { tz:"Asia/Kuala_Lumpur",   label:"Malaysia (MYT +8:00)"     },
  { tz:"Asia/Ho_Chi_Minh",    label:"Vietnam (ICT +7:00)"      },
  { tz:"Asia/Colombo",        label:"Sri Lanka (IST +5:30)"    },
  { tz:"America/Panama",      label:"Panama (EST -5:00)"       },
  { tz:"Asia/Qatar",          label:"Qatar (AST +3:00)"        },
];
const TZ_MAP = Object.fromEntries(TZ_LIST.map(t => [t.tz, t.label]));

const ONBOARD_DOCS_DEFAULT = [
  { id:"passport_ob", name:"Passport",            submittedTo:"Master" },
  { id:"cdc_ob",      name:"CDC / Seaman Book",   submittedTo:"Master" },
  { id:"coc_ob",      name:"COC",                 submittedTo:"Master" },
  { id:"medical_ob",  name:"Medical Certificate", submittedTo:"Master" },
  { id:"endorsement", name:"Flag Endorsements",   submittedTo:"Master" },
  { id:"stcw_ob",     name:"STCW Certificates",   submittedTo:"Master" },
];

const JOINING_CHECKLIST    = [{id:"reported_master",label:"Reported to Master"},{id:"cabin_allocated",label:"Cabin Allocated"},{id:"docs_submitted",label:"Documents Submitted to Master"},{id:"safety_induction",label:"Safety Induction Completed"},{id:"security_induction",label:"Security Induction Completed"},{id:"ship_tour",label:"Ship Tour Completed"},{id:"dept_intro",label:"Department Introduction"}];
const CABIN_CHECKLIST      = [{id:"life_jacket",label:"Life Jacket Present & Marked"},{id:"immersion",label:"Immersion Suit Present"},{id:"escape_route",label:"Escape Route Chart Posted"},{id:"muster_card",label:"Muster Card Posted"},{id:"emrg_instruct",label:"Emergency Instructions Visible"},{id:"smoke_detect",label:"Smoke Detector Functional"},{id:"reading_light",label:"Reading Light Working"},{id:"cabin_lock",label:"Cabin Lock Operational"},{id:"ac",label:"Air Conditioning Working"}];
const LSA_CHECKLIST        = [{id:"muster_station",label:"Muster Station Located"},{id:"lifeboat",label:"Lifeboat Location Known"},{id:"liferaft",label:"Liferaft Location Known"},{id:"eebd",label:"EEBD Locations Known"},{id:"fire_station",label:"Fire Station Assigned Known"},{id:"emrg_signals",label:"Emergency Signals Understood"},{id:"man_overboard",label:"Man Overboard Drill Known"}];
const FIRST_24H            = [{id:"met_master",label:"Met Master"},{id:"met_dept_head",label:"Met Department Head"},{id:"cabin_assigned",label:"Cabin Assigned"},{id:"safety_ind_24",label:"Safety Induction"},{id:"security_ind_24",label:"Security Induction"},{id:"muster_loc",label:"Muster Station Located"},{id:"lifeboat_loc",label:"Lifeboat Located"},{id:"liferaft_loc",label:"Liferaft Located"},{id:"eebd_loc",label:"EEBD Located"},{id:"escape_24",label:"Escape Routes Checked"},{id:"hospital_loc",label:"Hospital Cabin Located"},{id:"familiarization",label:"Ship Familiarization Completed"}];
const FIRST_WEEK           = [{id:"payroll_sub",label:"Payroll Submitted"},{id:"family_reg",label:"Family Contact Registered with Company"},{id:"email_setup",label:"Ship Email / Communication Setup"},{id:"garbage_train",label:"Garbage Segregation Training Done"},{id:"ptw_familiar",label:"PTW Familiarization"},{id:"sms_familiar",label:"SMS Familiarization Completed"},{id:"ism_familiar",label:"ISM Code Familiarization"}];
const ARRIVAL_CHECKLIST    = [{id:"landed",label:"Landed at Destination"},{id:"immigration",label:"Immigration Cleared"},{id:"baggage_collected",label:"Baggage Collected"},{id:"agent_contacted",label:"Ship's Agent Contacted"},{id:"hotel_reached",label:"Hotel / Transit Reached"},{id:"transport_arranged",label:"Transport to Port Arranged"},{id:"vessel_boarded",label:"Vessel Boarded"}];
const PRESIGNOFF_CHECKLIST = [{id:"handover_notes",label:"Handover Notes Prepared"},{id:"wages_verified",label:"Wages Verified with Master"},{id:"overtime_verified",label:"Overtime Verified"},{id:"leave_salary",label:"Leave Salary Verified"},{id:"docs_recovery",label:"All Documents Recovered from Master"},{id:"belongings_packed",label:"All Belongings Packed"},{id:"company_property",label:"Company Property Returned"}];
const SIGNOFF_CHECKLIST    = [{id:"passport_recv",label:"Passport Received"},{id:"cdc_recv",label:"CDC Received"},{id:"certs_recv",label:"All Certificates Received"},{id:"final_wage",label:"Final Wage Amount Confirmed"},{id:"handover_done",label:"Handover to Relief Completed"},{id:"cabin_cleared",label:"Cabin Cleared & Cleaned"}];
const AUDIT_CHECKLIST      = [{id:"audit_docs",label:"All Documents Returned & Verified"},{id:"audit_belongings",label:"All Personal Belongings Collected"},{id:"audit_salary",label:"Full Salary Verified & Credited"},{id:"audit_cdc",label:"CDC Entries Verified"},{id:"audit_passport",label:"Passport Validity Checked"},{id:"audit_certs",label:"All Certificates Up to Date"}];

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────
function calcQty(base, months) { if (!months || months <= 0) return base; return Math.max(1, Math.ceil(base * (months / 4))); }
function getTimeInZone(tz) { try { return new Date().toLocaleTimeString("en-GB", { timeZone:tz, hour:"2-digit", minute:"2-digit", second:"2-digit" }); } catch { return "--:--:--"; } }
function getDateInZone(tz) { try { return new Date().toLocaleDateString("en-GB", { timeZone:tz, weekday:"short", day:"2-digit", month:"short" }); } catch { return "---"; } }

const makeDocStatus  = () => { const o={}; DOCUMENT_CHECKLIST.forEach(d => { o[d.id]={ packed:false, expiryDate:"", notes:"" }; }); return o; };
const makePackStatus = () => { const o={}; Object.values(DEFAULT_PACKING).flat().forEach(i => { o[i.id]={ status:"not_packed", customQty:null, weight:i.wt }; }); return o; };

// ─── SMALL UI COMPONENTS ──────────────────────────────────────────────────────
const ProgressBar = ({ pct, color="var(--cyan)" }) => (
  <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
    <div style={{ height:"100%", width:`${Math.min(100,pct||0)}%`, background:color, borderRadius:3, transition:"width 0.4s ease" }} />
  </div>
);

const CheckItem = ({ label, checked, onChange, critical }) => (
  <div onClick={() => onChange(!checked)}
    style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px", borderRadius:9,
      background:checked?"rgba(0,200,150,0.07)":"rgba(255,255,255,0.02)",
      border:`1px solid ${checked?"rgba(0,200,150,0.3)":critical?"rgba(255,71,87,0.2)":"rgba(255,255,255,0.07)"}`,
      cursor:"pointer", marginBottom:5, transition:"all 0.2s" }}>
    <div style={{ width:20, height:20, borderRadius:5, flexShrink:0, border:`2px solid ${checked?"var(--green)":critical?"#ff4757":"var(--border2)"}`, background:checked?"var(--green)":"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s" }}>
      {checked && <span style={{ color:"#000", fontSize:"0.7rem", fontWeight:900 }}>✓</span>}
    </div>
    <span style={{ fontSize:"0.8rem", color:checked?"var(--text2)":"var(--text)", flex:1, textDecoration:checked?"line-through":"none", opacity:checked?0.7:1 }}>{label}</span>
    {critical && !checked && <span style={{ fontSize:"0.6rem", background:"rgba(255,71,87,0.15)", color:"#ff4757", border:"1px solid rgba(255,71,87,0.3)", borderRadius:10, padding:"1px 6px" }}>CRITICAL</span>}
  </div>
);

// FIX 6: SectionCard — per-instance collapsible state
const SectionCard = ({ title, icon, color="var(--cyan)", children, collapsible=false, defaultOpen=true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background:"var(--card)", border:`1px solid ${color}33`, borderRadius:14, marginBottom:"1rem", overflow:"hidden" }}>
      <div onClick={() => collapsible && setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0.9rem 1.1rem",
          borderBottom:open?`1px solid ${color}22`:"none", cursor:collapsible?"pointer":"default",
          background:`linear-gradient(135deg,${color}0d,transparent)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:"1.1rem" }}>{icon}</span>
          <span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.74rem", fontWeight:700, color, letterSpacing:"0.06em" }}>{title}</span>
        </div>
        {collapsible && <span style={{ color:"var(--text3)", fontSize:"0.8rem" }}>{open?"▾":"▸"}</span>}
      </div>
      {open && <div style={{ padding:"1rem 1.1rem" }}>{children}</div>}
    </div>
  );
};

const StatBox = ({ label, value, color }) => (
  <div style={{ background:`${color}11`, border:`1px solid ${color}33`, borderRadius:10, padding:"0.8rem 0.6rem", textAlign:"center" }}>
    <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.1rem", fontWeight:900, color }}>{value}</div>
    <div style={{ fontSize:"0.62rem", color:"var(--text3)", marginTop:2, lineHeight:1.3 }}>{label}</div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function CrewJourneyPage({ user, userProfile, notify }) {
  const [phase,   setPhase]   = useState("dashboard");
  const [saving,  setSaving]  = useState(false);
  const [loaded,  setLoaded]  = useState(false);

  // FIX 13: offline indicator
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true), off = () => setIsOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // ── Form state (localStorage) ──────────────────────────────────────────────
  const [contract, setContract] = useState({ rank:"", vesselType:"", vesselName:"", company:"", joiningPort:"", joiningCountry:"", signOnDate:"", contractMonths:4, reliefDate:"", homeTimezone:"Asia/Kolkata", shipTimezone:"Asia/Singapore", flightDate:"", airline:"", flightNo:"" });
  const [baggage,    setBaggage]    = useState({ airline:"", cabinLimit:7, checkedLimit:23, extraBag:false });
  const [muster,     setMuster]     = useState({ fire_duty:"", boat_duty:"", security_duty:"", pollution_duty:"", emergency_role:"", notes:"" });
  const [familyCard, setFamilyCard] = useState({ primary_name:"", primary_rel:"", primary_phone:"", primary_whatsapp:"", primary_email:"", secondary_name:"", secondary_rel:"", secondary_phone:"", secondary_email:"", home_address:"" });
  const [medCard,    setMedCard]    = useState({ blood_group:"", allergies:"", conditions:"", medications:"", insurance_co:"", insurance_no:"", emergency_contact:"" });

  // ── Checklist state (Firebase ticks) ──────────────────────────────────────
  const [docStatus,        setDocStatus]        = useState(makeDocStatus);
  const [packStatus,       setPackStatus]        = useState(makePackStatus);
  const [arrivalChecks,    setArrivalChecks]     = useState({});
  const [joiningChecks,    setJoiningChecks]     = useState({});
  const [cabinChecks,      setCabinChecks]       = useState({});
  const [lsaChecks,        setLsaChecks]         = useState({});
  const [first24h,         setFirst24h]          = useState({});
  const [firstWeek,        setFirstWeek]         = useState({});
  const [presignoffChecks, setPresignoffChecks]  = useState({});
  const [signoffChecks,    setSignoffChecks]     = useState({});
  const [auditChecks,      setAuditChecks]       = useState({});

  // ── Other Firebase state ───────────────────────────────────────────────────
  const [onboardDocs,      setOnboardDocs]      = useState(() => ONBOARD_DOCS_DEFAULT.map(d => ({ ...d, submitted:false, returned:false, dateSubmitted:"", dateReturned:"", notes:"" })));
  const [customOnboardDoc, setCustomOnboardDoc] = useState("");
  const [inventory,        setInventory]        = useState([{ id:"inv_1", name:"Laptop", brand:"", serial:"", notes:"", driveFileId:null },{ id:"inv_2", name:"Phone", brand:"", serial:"", notes:"", driveFileId:null }]);
  const [newInvItem,       setNewInvItem]       = useState({ name:"", brand:"", serial:"", notes:"" });
  const [savedClocks,      setSavedClocks]      = useState(["Asia/Kolkata","Asia/Singapore","UTC"]);
  const [history,          setHistory]          = useState([]);

  // ── FIX 6: Packing category open/close ────────────────────────────────────
  const [packCatOpen, setPackCatOpen] = useState(() => { const o={}; Object.keys(DEFAULT_PACKING).forEach(k => { o[k]=false; }); return o; });

  // ── World clock tick ───────────────────────────────────────────────────────
  const [clockTick,    setClockTick]    = useState(0);
  const [addingClock,  setAddingClock]  = useState(false);
  const [newClockZone, setNewClockZone] = useState("");
  useEffect(() => { const t = setInterval(() => setClockTick(c => c+1), 1000); return () => clearInterval(t); }, []);

  // ── Drive state ────────────────────────────────────────────────────────────
  const [driveToken,      setDriveToken]      = useState(null);
  const [driveConnected,  setDriveConnected]  = useState(false);
  const [driveEmail,      setDriveEmail]      = useState(null);
  const [driveFolderId,   setDriveFolderId]   = useState(null);
  const [uploadingId,     setUploadingId]     = useState(null);
  const [connectingDrive, setConnectingDrive] = useState(false);

  // FIX 14: Weather state
  const [weather,        setWeather]        = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherPort,    setWeatherPort]    = useState("");

  // ─── FIX 3: Restore Drive from localStorage on mount (survives refresh/logout)
  const isDriveValid = useCallback(() => { const e = localStorage.getItem(CJ_EXPIRY_KEY); return !!(e && Date.now() < parseInt(e)); }, []);

  useEffect(() => {
    const token  = localStorage.getItem(CJ_TOKEN_KEY);
    const expiry = localStorage.getItem(CJ_EXPIRY_KEY);
    const email  = localStorage.getItem(CJ_EMAIL_KEY);
    if (token && expiry && Date.now() < parseInt(expiry)) {
      setDriveToken(token); setDriveConnected(true); setDriveEmail(email);
    }
  }, []);

  // ─── FIX 2: Load localStorage form data on mount ─────────────────────────
  useEffect(() => {
    try {
      const c = localStorage.getItem("cj_contract"); if (c) setContract(p => ({ ...p, ...JSON.parse(c) }));
      const b = localStorage.getItem("cj_baggage");  if (b) setBaggage(p => ({ ...p, ...JSON.parse(b) }));
      const m = localStorage.getItem("cj_muster");   if (m) setMuster(p => ({ ...p, ...JSON.parse(m) }));
      const f = localStorage.getItem("cj_family");   if (f) setFamilyCard(p => ({ ...p, ...JSON.parse(f) }));
      const d = localStorage.getItem("cj_medical");  if (d) setMedCard(p => ({ ...p, ...JSON.parse(d) }));
    } catch(e) { console.warn("[CJ] localStorage restore:", e); }
  }, []);

  // Save form data to localStorage on change
  useEffect(() => { localStorage.setItem("cj_contract", JSON.stringify(contract)); }, [contract]);
  useEffect(() => { localStorage.setItem("cj_baggage",  JSON.stringify(baggage));  }, [baggage]);
  useEffect(() => { localStorage.setItem("cj_muster",   JSON.stringify(muster));   }, [muster]);
  useEffect(() => { localStorage.setItem("cj_family",   JSON.stringify(familyCard)); }, [familyCard]);
  useEffect(() => { localStorage.setItem("cj_medical",  JSON.stringify(medCard));  }, [medCard]);

  // ─── Load Firebase on mount ───────────────────────────────────────────────
  useEffect(() => { if (!user) return; loadData(); }, [user?.uid]);

  const loadData = async () => {
    try {
      const snap = await getDoc(doc(db, "crew_journey", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d.docStatus)        setDocStatus(p => ({ ...p, ...d.docStatus }));
        if (d.packStatus)       setPackStatus(p => ({ ...p, ...d.packStatus }));
        if (d.arrivalChecks)    setArrivalChecks(d.arrivalChecks);
        if (d.joiningChecks)    setJoiningChecks(d.joiningChecks);
        if (d.cabinChecks)      setCabinChecks(d.cabinChecks);
        if (d.lsaChecks)        setLsaChecks(d.lsaChecks);
        if (d.first24h)         setFirst24h(d.first24h);
        if (d.firstWeek)        setFirstWeek(d.firstWeek);
        if (d.presignoffChecks) setPresignoffChecks(d.presignoffChecks);
        if (d.signoffChecks)    setSignoffChecks(d.signoffChecks);
        if (d.auditChecks)      setAuditChecks(d.auditChecks);
        if (d.onboardDocs)      setOnboardDocs(d.onboardDocs);
        if (d.inventory)        setInventory(d.inventory);
        if (d.savedClocks)      setSavedClocks(d.savedClocks);
        if (d.history)          setHistory(d.history);
      }
    } catch(e) { console.error("[CJ] Load:", e); }
    setLoaded(true);
  };

  // FIX 1: Debounced Firebase save — correct key per checklist
  const saveTimerRef = useRef(null);
  const saveChecks = useCallback(async (payload) => {
    if (!user) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try { await setDoc(doc(db, "crew_journey", user.uid), { ...payload, updatedAt: new Date().toISOString() }, { merge:true }); }
      catch(e) { console.error("[CJ] Save:", e); }
      setSaving(false);
    }, 1500);
  }, [user]);

  // FIX 1: Fixed toggleCheck — each checklist gets its own Firebase key
  const toggleCheck = useCallback((setter, id, firebaseKey) => {
    setter(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      saveChecks({ [firebaseKey]: updated });
      return updated;
    });
  }, [saveChecks]);

  // FIX 14: Weather via wttr.in (free, no key needed)
  useEffect(() => {
    const port = contract.joiningPort?.trim();
    if (!port || port === weatherPort) return;
    fetchWeather(port);
  }, [contract.joiningPort]);

  const fetchWeather = async (port) => {
    if (!port) return;
    setWeatherLoading(true); setWeatherPort(port);
    try {
      const res  = await fetch(`https://wttr.in/${encodeURIComponent(port)}?format=j1`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const cur  = data.current_condition?.[0];
      const area = data.nearest_area?.[0];
      if (cur) setWeather({ temp_c:cur.temp_C, feels_like:cur.FeelsLikeC, humidity:cur.humidity, wind_kmph:cur.windspeedKmph, wind_dir:cur.winddir16Point, desc:cur.weatherDesc?.[0]?.value||"", visibility:cur.visibility, areaName:area?.areaName?.[0]?.value||port, country:area?.country?.[0]?.value||"" });
    } catch { setWeather(null); }
    setWeatherLoading(false);
  };

  // ─── Drive connect / disconnect ───────────────────────────────────────────
  const connectDrive = async () => {
    setConnectingDrive(true);
    try {
      await new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) { resolve(); return; }
        const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.onload = resolve; s.onerror = () => reject(new Error("Network")); document.head.appendChild(s);
      });
      const token = await new Promise((resolve, reject) => {
        window.google.accounts.oauth2.initTokenClient({ client_id:DRIVE_CLIENT_ID, scope:DRIVE_SCOPE, login_hint:user?.email||"",
          callback: r => { if (r.error) reject(new Error(r.error)); else resolve(r.access_token); }
        }).requestAccessToken({ prompt:"" });
      });
      const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers:{ Authorization:`Bearer ${token}` } }).then(r => r.json());
      // FIX 3: Save to localStorage — persists across refresh and logout
      localStorage.setItem(CJ_TOKEN_KEY,  token);
      localStorage.setItem(CJ_EXPIRY_KEY, String(Date.now() + 3300000));
      localStorage.setItem(CJ_EMAIL_KEY,  info.email||"");
      setDriveToken(token); setDriveConnected(true); setDriveEmail(info.email);
      notify("☁️ Storage connected — stays connected across sessions", "success");
    } catch(e) { if (!e.message?.includes("popup_closed") && !e.message?.includes("access_denied")) notify("Could not connect storage", "error"); }
    setConnectingDrive(false);
  };

  const disconnectDrive = () => {
    localStorage.removeItem(CJ_TOKEN_KEY); localStorage.removeItem(CJ_EXPIRY_KEY); localStorage.removeItem(CJ_EMAIL_KEY);
    setDriveToken(null); setDriveConnected(false); setDriveEmail(null); setDriveFolderId(null);
    notify("Storage disconnected", "success");
  };

  const getOrCreateFolder = async (token) => {
    if (driveFolderId) return driveFolderId;
    let fid = await cjDriveSearchFolder(token); if (!fid) fid = await cjDriveCreateFolder(token);
    setDriveFolderId(fid); return fid;
  };

  const uploadPhoto = async (itemId, file) => {
    if (!driveToken || !isDriveValid()) { notify("Connect storage first", "error"); return; }
    setUploadingId(itemId);
    try {
      const fid  = await getOrCreateFolder(driveToken);
      const item = inventory.find(i => i.id===itemId);
      const up   = await cjDriveUploadFile(driveToken, fid, file, `Inventory_${item?.name||itemId}_${itemId}.${file.name.split(".").pop()}`);
      const updated = inventory.map(i => i.id===itemId ? { ...i, driveFileId:up.id, driveFileName:file.name } : i);
      setInventory(updated); saveChecks({ inventory:updated }); notify("Photo uploaded", "success");
    } catch { notify("Upload failed", "error"); }
    setUploadingId(null);
  };

  // ─── FIX 10: Start Fresh Contract ────────────────────────────────────────
  const startFreshContract = () => {
    if (!window.confirm("Start a fresh contract? This resets all checklists and contract dates. Packing and documents are kept.")) return;
    setJoiningChecks({}); setCabinChecks({}); setLsaChecks({}); setFirst24h({}); setFirstWeek({});
    setArrivalChecks({}); setPresignoffChecks({}); setSignoffChecks({}); setAuditChecks({});
    setContract(p => ({ ...p, signOnDate:"", reliefDate:"", flightDate:"" }));
    saveChecks({ joiningChecks:{}, cabinChecks:{}, lsaChecks:{}, first24h:{}, firstWeek:{}, arrivalChecks:{}, presignoffChecks:{}, signoffChecks:{}, auditChecks:{} });
    notify("Fresh contract started — all checklists reset", "success");
  };

  // ─── COMPUTED VALUES ─────────────────────────────────────────────────────
  const docsTotal       = DOCUMENT_CHECKLIST.length;
  const docsPacked      = DOCUMENT_CHECKLIST.filter(d => docStatus[d.id]?.packed).length;
  const criticalMissing = DOCUMENT_CHECKLIST.filter(d => d.critical && !docStatus[d.id]?.packed);
  const allPackItems    = Object.values(DEFAULT_PACKING).flat();
  const packedItems     = allPackItems.filter(i => packStatus[i.id]?.status==="packed").length;
  const needPurchase    = allPackItems.filter(i => packStatus[i.id]?.status==="need_purchase");
  const contractMonths  = contract.contractMonths || 4;
  const signOnDate      = contract.signOnDate;
  const daysOnboard     = signOnDate ? Math.max(0, Math.floor((new Date() - new Date(signOnDate)) / 86400000)) : 0;
  const contractDays    = contractMonths * 30;
  const daysRemaining   = Math.max(0, contractDays - daysOnboard);
  const contractPct     = Math.min(100, signOnDate ? Math.round((daysOnboard / contractDays) * 100) : 0);
  const reliefDate      = contract.reliefDate || (signOnDate ? new Date(new Date(signOnDate).getTime() + contractDays * 86400000).toISOString().split("T")[0] : "");
  const joiningPct      = Math.round(((docsPacked + packedItems) / (docsTotal + allPackItems.length)) * 100);
  const signoffPct      = Math.round((Object.values(presignoffChecks).filter(Boolean).length / PRESIGNOFF_CHECKLIST.length) * 100);
  const daysUntilJoining = signOnDate ? Math.ceil((new Date(signOnDate) - new Date()) / 86400000) : null;
  const daysUntilRelief  = reliefDate  ? Math.max(0, Math.ceil((new Date(reliefDate) - new Date()) / 86400000)) : null;
  const totalWeight      = allPackItems.reduce((s, i) => { const w = parseFloat(packStatus[i.id]?.weight ?? i.wt)||0; const q = packStatus[i.id]?.customQty ?? calcQty(i.base, contractMonths); return s + w * q; }, 0);

  // ─── FIX 12: Improved PDF export ─────────────────────────────────────────
  const exportPDF = () => {
    const html = `<!DOCTYPE html><html><head><title>Crew Journey Report</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:20px;}h1{font-size:18px;color:#003366;margin-bottom:2px;}.sub{font-size:10px;color:#666;margin-bottom:16px;}h2{font-size:13px;color:#003366;background:#e8f0fe;padding:5px 8px;border-left:3px solid #003366;margin:16px 0 8px;}table{width:100%;border-collapse:collapse;margin-bottom:8px;}th{background:#003366;color:#fff;padding:5px 8px;font-size:10px;text-align:left;}td{padding:5px 8px;border-bottom:1px solid #ddd;}tr:nth-child(even) td{background:#f8f9fa;}.ok{color:#1a7a1a;font-weight:bold;}.no{color:#cc0000;font-weight:bold;}.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;}.stat{background:#f0f4ff;border:1px solid #c8d8ff;border-radius:6px;padding:8px;text-align:center;}.sv{font-size:20px;font-weight:900;color:#003366;}.sl{font-size:9px;color:#666;margin-top:2px;}.pb{height:8px;background:#e0e0e0;border-radius:4px;overflow:hidden;margin:4px 0 12px;}.pf{height:100%;border-radius:4px;}@media print{button{display:none!important}}</style>
</head><body>
<h1>⚓ NavisphereX — Crew Journey Report</h1>
<div class="sub">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Seafarer: <strong>${userProfile?.name||user?.email||"—"}</strong> &nbsp;|&nbsp; Rank: <strong>${contract.rank||"—"}</strong></div>
<div class="stat-grid">
  <div class="stat"><div class="sv">${joiningPct}%</div><div class="sl">Joining Ready</div></div>
  <div class="stat"><div class="sv">${contractPct}%</div><div class="sl">Contract Done</div></div>
  <div class="stat"><div class="sv">${daysOnboard}</div><div class="sl">Days Onboard</div></div>
  <div class="stat"><div class="sv" style="color:${criticalMissing.length?"#cc0000":"#1a7a1a"}">${criticalMissing.length}</div><div class="sl">Critical Missing</div></div>
</div>
<h2>CONTRACT DETAILS</h2>
<table><tr><th>Field</th><th>Value</th><th>Field</th><th>Value</th></tr>
<tr><td>Rank</td><td><strong>${contract.rank||"—"}</strong></td><td>Vessel</td><td><strong>${contract.vesselName||"—"}</strong></td></tr>
<tr><td>Type</td><td>${contract.vesselType||"—"}</td><td>Company</td><td>${contract.company||"—"}</td></tr>
<tr><td>Sign-On</td><td>${contract.signOnDate||"—"}</td><td>Duration</td><td>${contractMonths} months</td></tr>
<tr><td>Joining Port</td><td>${contract.joiningPort||"—"}</td><td>Country</td><td>${contract.joiningCountry||"—"}</td></tr>
<tr><td>Relief Date</td><td>${reliefDate||"—"}</td><td>Days Onboard</td><td>${daysOnboard} / ${contractDays}</td></tr>
</table>
<div class="pb"><div class="pf" style="width:${contractPct}%;background:#003366"/></div>
<h2>DOCUMENT CHECKLIST</h2>
<table><tr><th>Document</th><th>Category</th><th>Critical</th><th>Status</th><th>Expiry</th></tr>
${DOCUMENT_CHECKLIST.map(d => `<tr><td>${d.name}</td><td>${d.category}</td><td>${d.critical?'<span style="color:#cc0000">⚠️ Yes</span>':"No"}</td><td class="${docStatus[d.id]?.packed?"ok":"no"}">${docStatus[d.id]?.packed?"✅ Packed":"❌ Missing"}</td><td>${docStatus[d.id]?.expiryDate||"—"}</td></tr>`).join("")}
</table>
<h2>PACKING SUMMARY</h2>
<table><tr><th>Category</th><th>Packed</th><th>To Buy</th><th>Not Packed</th></tr>
${Object.entries(DEFAULT_PACKING).map(([cat,items]) => { const packed=items.filter(i=>packStatus[i.id]?.status==="packed").length; const buy=items.filter(i=>packStatus[i.id]?.status==="need_purchase").length; const none=items.length-packed-buy; return `<tr><td><strong>${cat}</strong></td><td class="ok">${packed}</td><td style="color:#b07000">${buy}</td><td class="no">${none}</td></tr>`; }).join("")}
</table>
<h2>ONBOARD DOCUMENTS</h2>
<table><tr><th>Document</th><th>Submitted</th><th>Date</th><th>Returned</th><th>Date Returned</th></tr>
${onboardDocs.map(d => `<tr><td>${d.name}</td><td class="${d.submitted?"ok":"no"}">${d.submitted?"✅ Yes":"❌ No"}</td><td>${d.dateSubmitted||"—"}</td><td class="${d.returned?"ok":d.submitted?"no":""}">${d.returned?"✅ Yes":d.submitted?"⏳ Pending":"—"}</td><td>${d.dateReturned||"—"}</td></tr>`).join("")}
</table>
<h2>SIGN-OFF CHECKLIST</h2>
<table><tr><th>Item</th><th>Status</th></tr>
${SIGNOFF_CHECKLIST.map(c => `<tr><td>${c.label}</td><td class="${signoffChecks[c.id]?"ok":"no"}">${signoffChecks[c.id]?"✅ Done":"❌ Pending"}</td></tr>`).join("")}
</table>
${history.length>0?`<h2>CONTRACT HISTORY</h2><table><tr><th>Vessel</th><th>Company</th><th>Rank</th><th>Sign-On</th><th>Sign-Off</th><th>Months</th></tr>${history.map(h=>`<tr><td>${h.vesselName||"—"}</td><td>${h.company||"—"}</td><td>${h.rank||"—"}</td><td>${h.signOn||"—"}</td><td>${h.signOff||"—"}</td><td>${h.months}</td></tr>`).join("")}</table>`:""}
<br/><button onclick="window.print()" style="padding:10px 24px;background:#003366;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:bold;">🖨 Print / Save as PDF</button>
</body></html>`;
    const win = window.open("", "_blank"); win.document.write(html); win.document.close();
    notify("Report ready — use Print to save PDF", "success");
  };

  // ─── PHASES ─────────────────────────────────────────────────────────────────
  const PHASES = [{ id:"dashboard",label:"Dashboard",icon:"📡" },{ id:"prejoin",label:"Pre-Join",icon:"🧳" },{ id:"travel",label:"Travel",icon:"✈️" },{ id:"onboard",label:"Onboard",icon:"🚢" },{ id:"contract",label:"Contract",icon:"📋" },{ id:"signoff",label:"Sign-Off",icon:"🏁" }];

  if (!user) return (<div className="section"><div className="empty"><div className="empty-icon">⚓</div><div className="empty-t">Login Required</div><div className="empty-d">Please log in to access Crew Journey Manager.</div></div></div>);

  return (
    <div className="section" style={{ paddingBottom:"2rem" }}>

      {/* FIX 13: Offline banner */}
      {!isOnline && (
        <div style={{ background:"rgba(255,107,53,0.1)", border:"1px solid rgba(255,107,53,0.4)", borderRadius:10, padding:"8px 14px", marginBottom:"0.8rem", display:"flex", alignItems:"center", gap:8, fontSize:"0.74rem" }}>
          <span>📵</span><span style={{ color:"#ff6b35", fontWeight:700 }}>Offline — Firebase sync paused. Changes saved when reconnected.</span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:"1rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1rem", fontWeight:900, color:"var(--cyan)", letterSpacing:"0.06em" }}>⚓ CREW JOURNEY MANAGER</div>
            <div style={{ fontSize:"0.68rem", color:"var(--text3)", marginTop:2 }}>Pre-Join → Travel → Onboard → Contract → Sign-Off</div>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
            {saving && <span style={{ fontSize:"0.65rem", color:"var(--text3)" }}>💾 Saving…</span>}
            <button onClick={startFreshContract} style={{ padding:"5px 10px", borderRadius:8, fontSize:"0.68rem", fontWeight:700, cursor:"pointer", background:"rgba(255,71,87,0.1)", color:"#ff4757", border:"1px solid rgba(255,71,87,0.3)" }}>🔄 New Contract</button>
            <button onClick={exportPDF} style={{ padding:"5px 12px", borderRadius:8, fontSize:"0.7rem", fontWeight:700, cursor:"pointer", background:"rgba(240,165,0,0.12)", color:"var(--gold)", border:"1px solid rgba(240,165,0,0.35)" }}>🖨 PDF</button>
            {!driveConnected
              ? <button onClick={connectDrive} disabled={connectingDrive} style={{ padding:"5px 12px", borderRadius:8, fontSize:"0.7rem", fontWeight:700, cursor:"pointer", background:"linear-gradient(135deg,#4285f4,#34a853)", color:"#fff", border:"none" }}>{connectingDrive?"Connecting…":"☁️ Drive"}</button>
              : <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:"0.62rem", color:"var(--green)", background:"rgba(0,200,100,0.1)", border:"1px solid rgba(0,200,100,0.25)", borderRadius:20, padding:"3px 8px", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>☁️ {driveEmail||"Connected"}</span>
                  <button onClick={disconnectDrive} style={{ padding:"3px 7px", borderRadius:6, fontSize:"0.6rem", cursor:"pointer", background:"none", color:"var(--text3)", border:"1px solid rgba(255,255,255,0.1)" }}>✕</button>
                </div>
            }
          </div>
        </div>
      </div>

      {/* Phase tabs */}
      <div style={{ display:"flex", gap:3, marginBottom:"1.2rem", overflowX:"auto", paddingBottom:4, scrollbarWidth:"none" }}>
        {PHASES.map(p => (
          <button key={p.id} onClick={() => setPhase(p.id)}
            style={{ flexShrink:0, padding:"7px 13px", borderRadius:9, border:"none", cursor:"pointer",
              background:phase===p.id?"linear-gradient(135deg,var(--cyan),var(--blue))":"rgba(255,255,255,0.05)",
              color:phase===p.id?"#fff":"var(--text2)", fontFamily:phase===p.id?"Orbitron,monospace":"inherit",
              fontSize:"0.68rem", fontWeight:phase===p.id?700:400,
              boxShadow:phase===p.id?"0 0 16px rgba(0,180,216,0.3)":"none", transition:"all 0.2s" }}>
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {phase==="dashboard" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:"1.2rem" }}>
            <StatBox label="Joining Readiness" value={`${joiningPct}%`}  color={joiningPct>=80?"var(--green)":joiningPct>=50?"var(--gold)":"#ff4757"} />
            <StatBox label="Contract Progress" value={signOnDate?`${contractPct}%`:"—"} color={contractPct>=80?"#ff6b35":contractPct>=50?"var(--gold)":"var(--cyan)"} />
            <StatBox label="Packing Progress"  value={`${Math.round((packedItems/allPackItems.length)*100)}%`} color="var(--cyan)" />
            <StatBox label="Sign-Off Ready"    value={signOnDate?`${signoffPct}%`:"—"} color={signoffPct>=80?"var(--green)":"var(--gold)"} />
          </div>

          {/* FIX 11: Only show day counters when relevant data exists */}
          {(daysUntilJoining!==null || daysOnboard>0 || daysUntilRelief!==null || criticalMissing.length>0) && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:"1.2rem" }}>
              {daysUntilJoining!==null && daysUntilJoining>=0 && daysOnboard===0 && (
                <div style={{ background:"rgba(0,180,216,0.08)", border:"1px solid rgba(0,180,216,0.25)", borderRadius:12, padding:"1rem", textAlign:"center" }}>
                  <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2rem", fontWeight:900, color:"var(--cyan)" }}>{daysUntilJoining}</div>
                  <div style={{ fontSize:"0.65rem", color:"var(--text3)" }}>DAYS UNTIL JOINING</div>
                </div>
              )}
              {daysOnboard>0 && (
                <div style={{ background:"rgba(0,200,150,0.07)", border:"1px solid rgba(0,200,150,0.25)", borderRadius:12, padding:"1rem", textAlign:"center" }}>
                  <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2rem", fontWeight:900, color:"var(--green)" }}>{daysOnboard}</div>
                  <div style={{ fontSize:"0.65rem", color:"var(--text3)" }}>DAYS ONBOARD</div>
                </div>
              )}
              {daysUntilRelief!==null && daysOnboard>0 && (
                <div style={{ background:"rgba(240,165,0,0.07)", border:"1px solid rgba(240,165,0,0.25)", borderRadius:12, padding:"1rem", textAlign:"center" }}>
                  <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2rem", fontWeight:900, color:"var(--gold)" }}>{daysUntilRelief}</div>
                  <div style={{ fontSize:"0.65rem", color:"var(--text3)" }}>DAYS UNTIL RELIEF</div>
                </div>
              )}
              <div style={{ background:`rgba(255,71,87,${criticalMissing.length?"0.1":"0.04"})`, border:`1px solid rgba(255,71,87,${criticalMissing.length?"0.4":"0.15"})`, borderRadius:12, padding:"1rem", textAlign:"center" }}>
                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2rem", fontWeight:900, color:criticalMissing.length?"#ff4757":"var(--green)" }}>{criticalMissing.length}</div>
                <div style={{ fontSize:"0.65rem", color:"var(--text3)" }}>CRITICAL DOCS MISSING</div>
              </div>
            </div>
          )}

          {/* FIX 11: No contract prompt */}
          {!signOnDate && (
            <div style={{ background:"rgba(0,180,216,0.06)", border:"1px solid rgba(0,180,216,0.2)", borderRadius:12, padding:"1rem", marginBottom:"1rem", textAlign:"center" }}>
              <div style={{ fontSize:"0.84rem", color:"var(--text2)", marginBottom:8 }}>📋 No contract set yet</div>
              <div style={{ fontSize:"0.72rem", color:"var(--text3)", marginBottom:10 }}>Set your Sign-On Date in Pre-Join → Contract Setup to unlock full tracking.</div>
              <button onClick={() => setPhase("prejoin")} style={{ padding:"6px 14px", borderRadius:8, cursor:"pointer", background:"rgba(0,180,216,0.12)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.35)", fontSize:"0.76rem" }}>→ Set Up Contract</button>
            </div>
          )}

          {signOnDate && (
            <SectionCard title="CONTRACT TIMELINE" icon="📅" color="var(--gold)">
              <div style={{ marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:"var(--text2)", marginBottom:4 }}><span>Day {daysOnboard} of {contractDays}</span><span style={{ color:"var(--gold)", fontWeight:700 }}>{contractPct}%</span></div>
                <ProgressBar pct={contractPct} color={contractPct>80?"#ff6b35":"var(--gold)"} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.7rem", color:"var(--text3)" }}>
                <span>Sign-On: <strong style={{ color:"var(--cyan)" }}>{contract.signOnDate}</strong></span>
                <span>Relief: <strong style={{ color:"var(--gold)" }}>{reliefDate||"Not set"}</strong></span>
              </div>
            </SectionCard>
          )}

          {criticalMissing.length>0 && (
            <div style={{ background:"rgba(255,71,87,0.08)", border:"1px solid rgba(255,71,87,0.35)", borderRadius:12, padding:"1rem", marginBottom:"1rem" }}>
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.72rem", color:"#ff4757", marginBottom:8 }}>🚨 CRITICAL DOCUMENTS NOT PACKED</div>
              {criticalMissing.map(d => <div key={d.id} style={{ fontSize:"0.76rem", color:"var(--text2)", padding:"2px 0" }}>⛔ {d.name}</div>)}
              <button onClick={() => setPhase("prejoin")} style={{ marginTop:8, padding:"5px 12px", borderRadius:7, fontSize:"0.7rem", cursor:"pointer", background:"rgba(255,71,87,0.15)", color:"#ff4757", border:"1px solid rgba(255,71,87,0.4)", fontWeight:700 }}>→ Go to Documents</button>
            </div>
          )}

          {needPurchase.length>0 && (
            <SectionCard title="SHOPPING LIST" icon="🛒" color="var(--gold)" collapsible defaultOpen={false}>
              {needPurchase.map(item => (
                <div key={item.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.04)", fontSize:"0.78rem" }}>
                  <span style={{ color:"var(--text2)" }}>{item.name}</span>
                  <span style={{ color:"var(--gold)" }}>×{packStatus[item.id]?.customQty??calcQty(item.base,contractMonths)} {item.unit}</span>
                </div>
              ))}
            </SectionCard>
          )}

          {onboardDocs.filter(d=>d.submitted&&!d.returned).length>0 && (
            <div style={{ background:"rgba(240,165,0,0.07)", border:"1px solid rgba(240,165,0,0.3)", borderRadius:12, padding:"1rem", marginBottom:"1rem" }}>
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.72rem", color:"var(--gold)", marginBottom:6 }}>⚠️ DOCUMENTS PENDING RETURN FROM MASTER</div>
              {onboardDocs.filter(d=>d.submitted&&!d.returned).map(d => <div key={d.id} style={{ fontSize:"0.76rem", color:"var(--text2)", padding:"2px 0" }}>📌 {d.name}</div>)}
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginTop:"0.5rem" }}>
            {PHASES.filter(p=>p.id!=="dashboard").map(p => (
              <button key={p.id} onClick={() => setPhase(p.id)}
                style={{ padding:"12px", borderRadius:10, border:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)", cursor:"pointer", textAlign:"left", transition:"all 0.2s" }}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(0,180,216,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                <div style={{ fontSize:"1.3rem", marginBottom:4 }}>{p.icon}</div>
                <div style={{ fontSize:"0.76rem", fontWeight:700, color:"var(--text)" }}>{p.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ══ PRE-JOIN ══ */}
      {phase==="prejoin" && (
        <div>
          <SectionCard title="CONTRACT SETUP" icon="📝" color="var(--cyan)">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[["rank","Rank","sr"],["vesselName","Vessel Name","text"],["vesselType","Vessel Type","sv"],["company","Company Name","text"],["joiningPort","Joining Port","text"],["joiningCountry","Joining Country","text"],["signOnDate","Sign-On Date","date"],["contractMonths","Duration (months)","number"],["reliefDate","Relief Date","date"],["flightDate","Flight Date","date"],["airline","Airline","text"],["flightNo","Flight Number","text"]].map(([field,label,type]) => (
                <div key={field} className="ff" style={{ margin:0, gridColumn:field==="company"||field==="joiningCountry"?"span 2":"span 1" }}>
                  <label className="fl">{label}</label>
                  {type==="sr" ? <select className="fi" value={contract[field]} onChange={e=>setContract(p=>({...p,[field]:e.target.value}))}><option value="">— Select —</option>{MARITIME_RANKS.map(r=><option key={r} value={r}>{r}</option>)}</select>
                  : type==="sv" ? <select className="fi" value={contract[field]} onChange={e=>setContract(p=>({...p,[field]:e.target.value}))}><option value="">— Select —</option>{VESSEL_TYPES.map(v=><option key={v} value={v}>{v}</option>)}</select>
                  : <input className="fi" type={type==="text"?"text":type} value={contract[field]} min={type==="number"?1:undefined} max={type==="number"?24:undefined} onChange={e=>setContract(p=>({...p,[field]:type==="number"?parseInt(e.target.value)||1:e.target.value}))} />}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="DOCUMENT CHECKLIST" icon="📋" color="var(--gold)">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:"0.72rem", color:"var(--text3)" }}>{docsPacked}/{docsTotal} packed</span>
              <span style={{ fontSize:"0.72rem", color:docsPacked===docsTotal?"var(--green)":"var(--gold)", fontWeight:700 }}>{Math.round((docsPacked/docsTotal)*100)}%</span>
            </div>
            <ProgressBar pct={(docsPacked/docsTotal)*100} color="var(--gold)" />
            <div style={{ marginTop:14 }}>
              {DOCUMENT_CHECKLIST.map(d => (
                <div key={d.id} style={{ marginBottom:10 }}>
                  <CheckItem label={d.name} checked={!!docStatus[d.id]?.packed} critical={d.critical} onChange={val => { const u={...docStatus,[d.id]:{...docStatus[d.id],packed:val}}; setDocStatus(u); saveChecks({docStatus:u}); }} />
                  <div style={{ display:"flex", gap:6, paddingLeft:30, marginTop:-2, flexWrap:"wrap" }}>
                    <input type="date" value={docStatus[d.id]?.expiryDate||""} onChange={e=>setDocStatus(p=>({...p,[d.id]:{...p[d.id],expiryDate:e.target.value}}))} style={{ flex:1, minWidth:110, padding:"4px 8px", borderRadius:6, background:"var(--bg2)", border:"1px solid var(--border)", color:"var(--text)", fontSize:"0.7rem" }} />
                    <input placeholder="Notes…" value={docStatus[d.id]?.notes||""} onChange={e=>setDocStatus(p=>({...p,[d.id]:{...p[d.id],notes:e.target.value}}))} style={{ flex:2, minWidth:100, padding:"4px 8px", borderRadius:6, background:"var(--bg2)", border:"1px solid var(--border)", color:"var(--text)", fontSize:"0.7rem" }} />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* FIX 6: Collapsible packing categories */}
          <SectionCard title="BAGGAGE & PACKING MANAGER" icon="🎒" color="var(--purple)" collapsible>
            <div style={{ background:"rgba(124,58,237,0.06)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:"0.72rem", color:"var(--text3)" }}>
              📦 Smart quantities for <strong style={{ color:"var(--cyan)" }}>{contractMonths} month</strong> contract. Tap category to expand.
            </div>
            {Object.entries(DEFAULT_PACKING).map(([category, items]) => {
              const catPacked = items.filter(i=>packStatus[i.id]?.status==="packed").length;
              const isOpen    = packCatOpen[category];
              return (
                <div key={category} style={{ marginBottom:8 }}>
                  <div onClick={() => setPackCatOpen(p=>({...p,[category]:!p[category]}))}
                    style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:8, background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.2)", cursor:"pointer", marginBottom:isOpen?8:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontFamily:"Orbitron,monospace", fontSize:"0.68rem", color:"var(--purple)" }}>{category}</span>
                      <span style={{ fontSize:"0.62rem", background:catPacked===items.length?"rgba(0,200,150,0.15)":"rgba(124,58,237,0.12)", color:catPacked===items.length?"var(--green)":"var(--purple)", borderRadius:10, padding:"1px 7px" }}>{catPacked}/{items.length}</span>
                    </div>
                    <span style={{ color:"var(--text3)", fontSize:"0.8rem" }}>{isOpen?"▾":"▸"}</span>
                  </div>
                  {isOpen && items.map(item => {
                    const s   = packStatus[item.id]||{};
                    const qty = s.customQty??calcQty(item.base,contractMonths);
                    return (
                      <div key={item.id} style={{ background:s.status==="packed"?"rgba(0,200,150,0.05)":s.status==="need_purchase"?"rgba(240,165,0,0.05)":"rgba(255,255,255,0.02)", border:`1px solid ${s.status==="packed"?"rgba(0,200,150,0.2)":s.status==="need_purchase"?"rgba(240,165,0,0.2)":"rgba(255,255,255,0.06)"}`, borderRadius:8, padding:"8px 10px", marginBottom:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
                          <span style={{ flex:1, fontSize:"0.78rem", color:"var(--text)", fontWeight:500 }}>{item.name}</span>
                          <input type="number" min={0} value={qty} onChange={e=>setPackStatus(p=>({...p,[item.id]:{...p[item.id],customQty:parseInt(e.target.value)||0}}))} style={{ width:50, padding:"3px 6px", borderRadius:6, background:"var(--bg2)", border:"1px solid var(--border)", color:"var(--cyan)", fontSize:"0.76rem", textAlign:"center" }} />
                          <span style={{ fontSize:"0.62rem", color:"var(--text3)", minWidth:28 }}>{item.unit}</span>
                        </div>
                        <div style={{ display:"flex", gap:5 }}>
                          {[["packed","✅ Packed","var(--green)"],["need_purchase","🛒 Buy","var(--gold)"],["not_packed","⬜ Skip","var(--text3)"]].map(([val,lbl,col]) => (
                            <button key={val} onClick={() => { const u={...packStatus,[item.id]:{...s,status:val}}; setPackStatus(u); saveChecks({packStatus:u}); }} style={{ flex:1, padding:"4px 0", borderRadius:6, fontSize:"0.62rem", fontWeight:s.status===val?700:400, cursor:"pointer", background:s.status===val?`${col}22`:"transparent", color:s.status===val?col:"var(--text3)", border:`1px solid ${s.status===val?col+"55":"rgba(255,255,255,0.08)"}`, transition:"all 0.15s" }}>{lbl}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </SectionCard>

          {/* FIX 9: Cash planner with estimated label */}
          <SectionCard title="JOINING CASH PLANNER" icon="💵" color="var(--green)" collapsible>
            {(() => { const country=contract.joiningCountry; const info=CASH_INFO[country]||CASH_INFO["Other"]; return (
              <div>
                <div style={{ marginBottom:8, fontSize:"0.74rem", color:"var(--text3)" }}>Country: <strong style={{ color:"var(--cyan)" }}>{country||"Not set"}</strong></div>
                <div style={{ background:"rgba(0,180,216,0.05)", border:"1px solid rgba(0,180,216,0.15)", borderRadius:7, padding:"5px 10px", marginBottom:10, fontSize:"0.66rem", color:"var(--text3)" }}>
                  ℹ️ All figures are <strong style={{ color:"var(--cyan)" }}>estimates in {info.currency}</strong>. Actual costs vary.
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
                  {[["Minimum",info.min,"var(--green)"],["Recommended",info.rec,"var(--cyan)"],["Emergency",info.emg,"#ff4757"]].map(([l,v,c]) => (
                    <div key={l} style={{ background:`${c}11`, border:`1px solid ${c}33`, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.95rem", fontWeight:900, color:c }}>{v.toLocaleString()}</div>
                      <div style={{ fontSize:"0.58rem", color:"var(--text3)", marginTop:2 }}>{l.toUpperCase()}</div>
                      <div style={{ fontSize:"0.58rem", color:c, fontWeight:700 }}>{info.currency} (est.)</div>
                    </div>
                  ))}
                </div>
                {[[info.atm?"✅":"❌","ATM",info.atm?"Available":"Limited — plan ahead"],[info.card?"✅":"⚠️","Cards",info.card?"Widely accepted":"Mostly cash"],["📱","SIM Card",`~${info.sim.toLocaleString()} ${info.currency} (est.)`],["🚕","Taxi",`~${info.taxi.toLocaleString()} ${info.currency} (est.)`],["ℹ️","Local Tip",info.note]].map(([icon,label,val],i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"7px 10px", background:"rgba(255,255,255,0.02)", borderRadius:7, border:"1px solid rgba(255,255,255,0.05)", marginBottom:5 }}>
                    <span style={{ fontSize:"0.76rem", color:"var(--text2)" }}>{icon} {label}</span>
                    <span style={{ fontSize:"0.7rem", color:"var(--green)", fontWeight:500, textAlign:"right", maxWidth:"58%", lineHeight:1.4 }}>{val}</span>
                  </div>
                ))}
              </div>
            ); })()}
          </SectionCard>

          {/* Power plug */}
          <SectionCard title="POWER PLUG GUIDE" icon="🔌" color="var(--gold)" collapsible>
            {(() => { const country=contract.joiningCountry; const plug=POWER_PLUGS[country]||POWER_PLUGS["Other"]; return (
              <div>
                <div style={{ marginBottom:8, fontSize:"0.74rem", color:"var(--text3)" }}>Country: <strong style={{ color:"var(--cyan)" }}>{country||"Not set"}</strong></div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                  {[["Plug Type",plug.type,"var(--gold)"],["Voltage",plug.voltage,"#ff6b35"],["Frequency",plug.freq,"var(--cyan)"]].map(([l,v,c]) => (
                    <div key={l} style={{ background:`${c}11`, border:`1px solid ${c}33`, borderRadius:8, padding:"10px", textAlign:"center" }}>
                      <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.9rem", fontWeight:900, color:c }}>{v}</div>
                      <div style={{ fontSize:"0.62rem", color:"var(--text3)", marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:8, padding:"10px", marginBottom:8 }}><div style={{ fontSize:"0.76rem", color:"var(--text2)" }}>ℹ️ {plug.note}</div></div>
                <div style={{ background:"rgba(240,165,0,0.08)", border:"1px solid rgba(240,165,0,0.3)", borderRadius:8, padding:"10px 12px", fontSize:"0.76rem", color:"var(--gold)", fontWeight:700 }}>🌍 Always carry a Universal Travel Adapter</div>
              </div>
            ); })()}
          </SectionCard>

          {/* FIX 14: Weather via wttr.in */}
          <SectionCard title="JOINING PORT WEATHER" icon="🌤" color="var(--cyan)" collapsible>
            {!contract.joiningPort
              ? <div style={{ fontSize:"0.76rem", color:"var(--text3)" }}>Set Joining Port in Contract Setup to see weather.</div>
              : weatherLoading
              ? <div className="loading"><div className="spin"/><span>Fetching weather for {contract.joiningPort}…</span></div>
              : weather
              ? <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                    <div><div style={{ fontSize:"0.88rem", fontWeight:700, color:"var(--text)" }}>{weather.areaName}{weather.country?`, ${weather.country}`:""}</div><div style={{ fontSize:"0.74rem", color:"var(--text3)", marginTop:2 }}>{weather.desc}</div></div>
                    <button onClick={() => fetchWeather(contract.joiningPort)} style={{ padding:"4px 10px", borderRadius:6, fontSize:"0.66rem", cursor:"pointer", background:"rgba(0,180,216,0.1)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.3)" }}>🔄</button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:10 }}>
                    {[["🌡 Temperature",`${weather.temp_c}°C (Feels ${weather.feels_like}°C)`,"var(--gold)"],["💧 Humidity",`${weather.humidity}%`,"var(--cyan)"],["💨 Wind",`${weather.wind_kmph} km/h ${weather.wind_dir}`,"#a29bfe"],["👁 Visibility",`${weather.visibility} km`,"var(--green)"]].map(([l,v,c]) => (
                      <div key={l} style={{ background:`${c}11`, border:`1px solid ${c}22`, borderRadius:8, padding:"8px 10px" }}>
                        <div style={{ fontSize:"0.68rem", color:"var(--text3)", marginBottom:3 }}>{l}</div>
                        <div style={{ fontSize:"0.82rem", fontWeight:700, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {(() => { const t=parseInt(weather.temp_c); let sug="",sc="var(--cyan)"; if(t<=5){sug="🧥 Very cold — heavy jacket, thermals, gloves";sc="#a29bfe";}else if(t<=15){sug="🧣 Cool — bring jacket and warm layers";sc="var(--cyan)";}else if(t<=25){sug="👕 Mild — light jacket for evenings";sc="var(--green)";}else{sug="☀️ Hot — light clothing, sunscreen essential";sc="var(--gold)";} return <div style={{ background:`${sc}11`, border:`1px solid ${sc}33`, borderRadius:8, padding:"8px 12px", fontSize:"0.76rem", color:sc, fontWeight:600 }}>{sug}</div>; })()}
                  <div style={{ fontSize:"0.62rem", color:"var(--text3)", marginTop:6 }}>Powered by wttr.in</div>
                </div>
              : <div><div style={{ fontSize:"0.74rem", color:"var(--text3)", marginBottom:8 }}>Could not load weather for <strong>{contract.joiningPort}</strong>.</div><button onClick={() => fetchWeather(contract.joiningPort)} style={{ padding:"5px 12px", borderRadius:7, fontSize:"0.72rem", cursor:"pointer", background:"rgba(0,180,216,0.1)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.3)" }}>🔄 Try Again</button></div>
            }
          </SectionCard>

          {/* FIX 5: World clock with friendly labels */}
          <SectionCard title="WORLD CLOCK" icon="🕐" color="var(--cyan)">
            <div style={{ display:"grid", gap:8, marginBottom:10 }}>
              {savedClocks.map((tz,i) => (
                <div key={tz} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(0,180,216,0.05)", border:"1px solid rgba(0,180,216,0.15)", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"0.62rem", color:"var(--text3)", marginBottom:2 }}>{TZ_MAP[tz]||tz}</div>
                    <div style={{ fontFamily:"Orbitron,monospace", fontSize:"1.05rem", fontWeight:900, color:i===0?"var(--green)":i===1?"var(--gold)":"var(--cyan)" }}>{clockTick>=0&&getTimeInZone(tz)}</div>
                    <div style={{ fontSize:"0.65rem", color:"var(--text3)" }}>{clockTick>=0&&getDateInZone(tz)}</div>
                  </div>
                  <div style={{ display:"flex", gap:4 }}>
                    {i===0&&<span style={{ fontSize:"0.58rem", background:"rgba(0,200,150,0.15)", color:"var(--green)", borderRadius:10, padding:"2px 7px", border:"1px solid rgba(0,200,150,0.3)" }}>HOME</span>}
                    {i===1&&<span style={{ fontSize:"0.58rem", background:"rgba(240,165,0,0.15)", color:"var(--gold)", borderRadius:10, padding:"2px 7px", border:"1px solid rgba(240,165,0,0.3)" }}>SHIP</span>}
                    <button onClick={() => { const c=[...savedClocks]; c.splice(i,1); setSavedClocks(c); saveChecks({savedClocks:c}); }} style={{ background:"none", border:"none", color:"var(--text3)", cursor:"pointer", fontSize:"0.8rem" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
            {addingClock
              ? <div style={{ display:"flex", gap:6 }}>
                  <select value={newClockZone} onChange={e=>setNewClockZone(e.target.value)} className="fi" style={{ flex:1, margin:0 }}>
                    <option value="">— Select timezone —</option>
                    {TZ_LIST.map(t => <option key={t.tz} value={t.tz}>{t.label}</option>)}
                  </select>
                  <button onClick={() => { if(!newClockZone)return; const u=[...savedClocks,newClockZone]; setSavedClocks(u); saveChecks({savedClocks:u}); setAddingClock(false); setNewClockZone(""); }} style={{ padding:"6px 14px", borderRadius:7, cursor:"pointer", background:"rgba(0,180,216,0.15)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.4)", fontSize:"0.74rem", fontWeight:700 }}>Add</button>
                  <button onClick={() => setAddingClock(false)} style={{ padding:"6px 10px", borderRadius:7, cursor:"pointer", background:"none", color:"var(--text3)", border:"1px solid rgba(255,255,255,0.1)", fontSize:"0.74rem" }}>Cancel</button>
                </div>
              : <button onClick={() => setAddingClock(true)} style={{ padding:"6px 14px", borderRadius:7, cursor:"pointer", background:"rgba(0,180,216,0.08)", color:"var(--cyan)", border:"1px dashed rgba(0,180,216,0.35)", fontSize:"0.74rem", width:"100%" }}>+ Add Clock</button>
            }
          </SectionCard>
        </div>
      )}

      {/* ══ TRAVEL ══ */}
      {phase==="travel" && (
        <div>
          <SectionCard title="BAGGAGE WEIGHT PLANNER" icon="⚖️" color="var(--cyan)">
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
              <div className="ff" style={{ margin:0 }}><label className="fl">Airline</label><input className="fi" value={baggage.airline} onChange={e=>setBaggage(p=>({...p,airline:e.target.value}))} placeholder="e.g. Emirates" /></div>
              <div className="ff" style={{ margin:0 }}><label className="fl">Cabin Limit (kg)</label><input className="fi" type="number" value={baggage.cabinLimit} onChange={e=>setBaggage(p=>({...p,cabinLimit:parseFloat(e.target.value)||7}))} /></div>
              <div className="ff" style={{ margin:0 }}><label className="fl">Checked Bag (kg)</label><input className="fi" type="number" value={baggage.checkedLimit} onChange={e=>setBaggage(p=>({...p,checkedLimit:parseFloat(e.target.value)||23}))} /></div>
              <div className="ff" style={{ margin:0 }}><label className="fl">Extra Bag?</label><select className="fi" value={baggage.extraBag?"yes":"no"} onChange={e=>setBaggage(p=>({...p,extraBag:e.target.value==="yes"}))}><option value="no">No</option><option value="yes">Yes</option></select></div>
            </div>
            {(() => { const totalKg=parseFloat(totalWeight.toFixed(1)); const allowance=baggage.checkedLimit+(baggage.extraBag?baggage.checkedLimit:0); const rem=allowance-totalKg; const over=rem<0; return (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10 }}>
                  <StatBox label="Est. Total"  value={`${totalKg}kg`}              color={over?"#ff4757":"var(--cyan)"} />
                  <StatBox label="Allowance"   value={`${allowance}kg`}            color="var(--green)" />
                  <StatBox label={over?"Overweight":"Remaining"} value={`${Math.abs(rem).toFixed(1)}kg`} color={over?"#ff4757":"var(--green)"} />
                </div>
                {over && <div style={{ background:"rgba(255,71,87,0.1)", border:"1px solid rgba(255,71,87,0.4)", borderRadius:8, padding:"8px 12px", fontSize:"0.76rem", color:"#ff4757", fontWeight:700 }}>⚠️ OVERWEIGHT by {Math.abs(rem).toFixed(1)}kg — reduce quantities in Packing Manager</div>}
                <div style={{ marginTop:8, fontSize:"0.68rem", color:"var(--text3)" }}>💡 Weights based on smart defaults. Fine-tune per item in Packing Manager.</div>
              </div>
            ); })()}
          </SectionCard>

          <SectionCard title="LAST-MINUTE REMINDERS" icon="⏰" color="#ff6b35">
            {!contract.flightDate ? <div style={{ fontSize:"0.76rem", color:"var(--text3)" }}>Set Flight Date in Contract Setup.</div>
            : (() => { const hrs=Math.round((new Date(contract.flightDate)-new Date())/3600000); return (
              <div>
                <div style={{ marginBottom:10, fontSize:"0.76rem" }}>Flight: <strong style={{ color:"var(--cyan)" }}>{contract.flightDate}</strong>{contract.airline&&` · ${contract.airline}`}{contract.flightNo&&` ${contract.flightNo}`}</div>
                <div style={{ marginBottom:12, fontSize:"0.72rem", color:hrs>0?"var(--text3)":"#ff4757" }}>{hrs>0?`⏳ ${hrs} hours until flight`:"✈️ Flight time passed"}</div>
                {[{h:48,label:"48 Hours Before",color:"var(--gold)"},{h:24,label:"24 Hours Before",color:"#ff9f43"},{h:12,label:"12 Hours Before",color:"#ff6b35"},{h:6,label:"6 Hours Before",color:"#ff4757"}].map(a => (
                  <div key={a.h} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:8, background:hrs<=a.h&&hrs>0?`${a.color}18`:"rgba(255,255,255,0.02)", border:`1px solid ${hrs<=a.h&&hrs>0?a.color+"55":"rgba(255,255,255,0.06)"}`, marginBottom:5 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:hrs<=a.h&&hrs>0?a.color:"var(--border2)", flexShrink:0 }} />
                    <span style={{ fontSize:"0.78rem", color:hrs<=a.h&&hrs>0?a.color:"var(--text3)", fontWeight:hrs<=a.h&&hrs>0?700:400 }}>{a.label}</span>
                    {hrs<=a.h&&hrs>0&&<span style={{ marginLeft:"auto", fontSize:"0.62rem", background:`${a.color}22`, color:a.color, borderRadius:10, padding:"1px 7px", border:`1px solid ${a.color}44`, fontWeight:700 }}>ACTIVE</span>}
                  </div>
                ))}
                <div style={{ marginTop:12 }}>
                  <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.68rem", color:"#ff4757", marginBottom:8 }}>🚨 CRITICAL ITEMS</div>
                  {criticalMissing.length===0
                    ? <div style={{ fontSize:"0.76rem", color:"var(--green)" }}>✅ All critical documents packed!</div>
                    : criticalMissing.map(d => <div key={d.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 8px", background:"rgba(255,71,87,0.08)", borderRadius:7, marginBottom:4, border:"1px solid rgba(255,71,87,0.25)" }}><span style={{ color:"#ff4757" }}>⛔</span><span style={{ fontSize:"0.78rem", color:"#ff4757", fontWeight:700 }}>{d.name}</span></div>)
                  }
                </div>
              </div>
            ); })()}
          </SectionCard>

          <SectionCard title="ARRIVAL & PORT TRANSFER" icon="🛬" color="var(--green)">
            <ProgressBar pct={(Object.values(arrivalChecks).filter(Boolean).length/ARRIVAL_CHECKLIST.length)*100} color="var(--green)" />
            <div style={{ marginTop:12 }}>{ARRIVAL_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!arrivalChecks[item.id]} onChange={() => toggleCheck(setArrivalChecks, item.id, "arrivalChecks")} />)}</div>
          </SectionCard>
        </div>
      )}

      {/* ══ ONBOARD ══ */}
      {phase==="onboard" && (
        <div>
          <SectionCard title="JOINING DAY CHECKLIST" icon="🚢" color="var(--cyan)">
            <ProgressBar pct={(Object.values(joiningChecks).filter(Boolean).length/JOINING_CHECKLIST.length)*100} color="var(--cyan)" />
            <div style={{ marginTop:12 }}>{JOINING_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!joiningChecks[item.id]} onChange={() => toggleCheck(setJoiningChecks, item.id, "joiningChecks")} />)}</div>
          </SectionCard>

          <SectionCard title="CABIN INSPECTION" icon="🛏️" color="var(--gold)" collapsible>
            <ProgressBar pct={(Object.values(cabinChecks).filter(Boolean).length/CABIN_CHECKLIST.length)*100} color="var(--gold)" />
            <div style={{ marginTop:12 }}>{CABIN_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!cabinChecks[item.id]} onChange={() => toggleCheck(setCabinChecks, item.id, "cabinChecks")} />)}</div>
          </SectionCard>

          <SectionCard title="LSA / FFA FAMILIARIZATION" icon="🆘" color="#ff4757" collapsible>
            <ProgressBar pct={(Object.values(lsaChecks).filter(Boolean).length/LSA_CHECKLIST.length)*100} color="#ff4757" />
            <div style={{ marginTop:12 }}>{LSA_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!lsaChecks[item.id]} critical onChange={() => toggleCheck(setLsaChecks, item.id, "lsaChecks")} />)}</div>
          </SectionCard>

          <SectionCard title="MUSTER LIST & DUTIES" icon="📋" color="var(--purple)" collapsible>
            <div style={{ display:"grid", gap:8 }}>
              {[["fire_duty","Fire Duty Station"],["boat_duty","Boat Duty Station"],["security_duty","Security Duty"],["pollution_duty","Pollution Duty"],["emergency_role","Emergency Role"]].map(([f,l]) => (
                <div key={f} className="ff" style={{ margin:0 }}><label className="fl">{l}</label><input className="fi" value={muster[f]} onChange={e=>setMuster(p=>({...p,[f]:e.target.value}))} /></div>
              ))}
              <div className="ff" style={{ margin:0 }}><label className="fl">Notes</label><textarea className="fi" value={muster.notes} onChange={e=>setMuster(p=>({...p,notes:e.target.value}))} style={{ minHeight:60, resize:"vertical", fontFamily:"inherit", fontSize:"inherit" }} /></div>
            </div>
          </SectionCard>

          <SectionCard title="FIRST 24 HOURS ONBOARD" icon="⏱" color="var(--green)" collapsible>
            <ProgressBar pct={(Object.values(first24h).filter(Boolean).length/FIRST_24H.length)*100} color="var(--green)" />
            <div style={{ marginTop:12 }}>{FIRST_24H.map(item => <CheckItem key={item.id} label={item.label} checked={!!first24h[item.id]} onChange={() => toggleCheck(setFirst24h, item.id, "first24h")} />)}</div>
          </SectionCard>

          <SectionCard title="FIRST WEEK ONBOARD" icon="📅" color="var(--cyan)" collapsible>
            <ProgressBar pct={(Object.values(firstWeek).filter(Boolean).length/FIRST_WEEK.length)*100} color="var(--cyan)" />
            <div style={{ marginTop:12 }}>{FIRST_WEEK.map(item => <CheckItem key={item.id} label={item.label} checked={!!firstWeek[item.id]} onChange={() => toggleCheck(setFirstWeek, item.id, "firstWeek")} />)}</div>
          </SectionCard>

          {/* FIX 4: Delete for all docs including custom */}
          <SectionCard title="DOCUMENTS SUBMITTED TO MASTER" icon="📁" color="var(--gold)">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
              <StatBox label="Submitted" value={onboardDocs.filter(d=>d.submitted).length}            color="var(--cyan)"  />
              <StatBox label="Returned"  value={onboardDocs.filter(d=>d.returned).length}             color="var(--green)" />
              <StatBox label="Pending"   value={onboardDocs.filter(d=>d.submitted&&!d.returned).length} color="#ff6b35"    />
            </div>
            {onboardDocs.map((docItem,idx) => (
              <div key={docItem.id} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${docItem.returned?"rgba(0,200,150,0.2)":docItem.submitted?"rgba(240,165,0,0.2)":"rgba(255,255,255,0.07)"}`, borderRadius:9, padding:"10px 12px", marginBottom:8 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:"0.82rem", fontWeight:700, color:"var(--text)" }}>{docItem.name}</span>
                  <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                    <span style={{ fontSize:"0.62rem", background:docItem.returned?"rgba(0,200,150,0.15)":docItem.submitted?"rgba(240,165,0,0.15)":"rgba(255,255,255,0.06)", color:docItem.returned?"var(--green)":docItem.submitted?"var(--gold)":"var(--text3)", borderRadius:10, padding:"2px 8px", border:`1px solid ${docItem.returned?"rgba(0,200,150,0.3)":docItem.submitted?"rgba(240,165,0,0.3)":"rgba(255,255,255,0.1)"}` }}>
                      {docItem.returned?"✅ Returned":docItem.submitted?"📌 Submitted":"⬜ Not Submitted"}
                    </span>
                    {/* FIX 4: Delete button for every doc */}
                    <button onClick={() => { if(!window.confirm(`Remove "${docItem.name}"?`))return; const u=onboardDocs.filter((_,i)=>i!==idx); setOnboardDocs(u); saveChecks({onboardDocs:u}); }} style={{ background:"none", border:"1px solid rgba(255,71,87,0.25)", borderRadius:5, color:"#ff4757", cursor:"pointer", fontSize:"0.62rem", padding:"2px 6px" }}>🗑</button>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  <button onClick={() => { const u=onboardDocs.map((d,i)=>i===idx?{...d,submitted:!d.submitted,dateSubmitted:!d.submitted?new Date().toISOString().split("T")[0]:""}:d); setOnboardDocs(u); saveChecks({onboardDocs:u}); }} style={{ padding:"4px 10px", borderRadius:6, fontSize:"0.68rem", cursor:"pointer", background:docItem.submitted?"rgba(240,165,0,0.1)":"rgba(0,180,216,0.1)", color:docItem.submitted?"var(--gold)":"var(--cyan)", border:`1px solid ${docItem.submitted?"rgba(240,165,0,0.3)":"rgba(0,180,216,0.3)"}`, fontWeight:600 }}>{docItem.submitted?"✓ Submitted":"Mark Submitted"}</button>
                  {docItem.submitted && <button onClick={() => { const u=onboardDocs.map((d,i)=>i===idx?{...d,returned:!d.returned,dateReturned:!d.returned?new Date().toISOString().split("T")[0]:""}:d); setOnboardDocs(u); saveChecks({onboardDocs:u}); }} style={{ padding:"4px 10px", borderRadius:6, fontSize:"0.68rem", cursor:"pointer", background:docItem.returned?"rgba(0,200,150,0.12)":"rgba(255,255,255,0.05)", color:docItem.returned?"var(--green)":"var(--text3)", border:`1px solid ${docItem.returned?"rgba(0,200,150,0.3)":"rgba(255,255,255,0.1)"}`, fontWeight:600 }}>{docItem.returned?"✓ Returned":"Mark Returned"}</button>}
                </div>
                {(docItem.dateSubmitted||docItem.dateReturned)&&<div style={{ marginTop:5, fontSize:"0.66rem", color:"var(--text3)" }}>{docItem.dateSubmitted&&`Submitted: ${docItem.dateSubmitted} `}{docItem.dateReturned&&`| Returned: ${docItem.dateReturned}`}</div>}
              </div>
            ))}
            <div style={{ display:"flex", gap:6, marginTop:4 }}>
              <input className="fi" style={{ flex:1, margin:0 }} placeholder="Add custom document…" value={customOnboardDoc} onChange={e=>setCustomOnboardDoc(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&customOnboardDoc.trim()){ const nd={id:`custom_${Date.now()}`,name:customOnboardDoc.trim(),submittedTo:"Master",submitted:false,returned:false,dateSubmitted:"",dateReturned:"",notes:""}; const u=[...onboardDocs,nd]; setOnboardDocs(u); saveChecks({onboardDocs:u}); setCustomOnboardDoc(""); } }} />
              <button onClick={() => { if(!customOnboardDoc.trim())return; const nd={id:`custom_${Date.now()}`,name:customOnboardDoc.trim(),submittedTo:"Master",submitted:false,returned:false,dateSubmitted:"",dateReturned:"",notes:""}; const u=[...onboardDocs,nd]; setOnboardDocs(u); saveChecks({onboardDocs:u}); setCustomOnboardDoc(""); }} style={{ padding:"6px 14px", borderRadius:7, cursor:"pointer", background:"rgba(0,180,216,0.12)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.35)", fontSize:"0.74rem", fontWeight:700, whiteSpace:"nowrap" }}>+ Add</button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══ CONTRACT ══ */}
      {phase==="contract" && (
        <div>
          <SectionCard title="CONTRACT TRACKER" icon="📊" color="var(--gold)">
            {signOnDate ? (
              <div>
                <div style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:"0.72rem", color:"var(--text2)", marginBottom:4 }}><span>Day {daysOnboard} of {contractDays}</span><span style={{ color:"var(--gold)", fontWeight:700 }}>{contractPct}%</span></div>
                  <ProgressBar pct={contractPct} color={contractPct>85?"#ff6b35":"var(--gold)"} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginTop:12 }}>
                  {[["Days Onboard",daysOnboard,"var(--cyan)"],["Days Remaining",daysRemaining,daysRemaining<30?"#ff4757":daysRemaining<60?"var(--gold)":"var(--green)"],["Contract Start",contract.signOnDate,"var(--text2)"],["Relief Date",reliefDate||"TBD","var(--gold)"],["Vessel",contract.vesselName||"—","var(--text2)"],["Company",contract.company||"—","var(--text2)"]].map(([l,v,c]) => (
                    <div key={l} style={{ background:"rgba(255,255,255,0.02)", borderRadius:8, padding:"8px 10px", border:"1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize:"0.6rem", color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{l}</div>
                      <div style={{ fontFamily:typeof v==="number"?"Orbitron,monospace":"inherit", fontSize:typeof v==="number"?"1.1rem":"0.82rem", fontWeight:700, color:c, marginTop:2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"1rem 0" }}>
                <div style={{ fontSize:"0.78rem", color:"var(--text3)", marginBottom:10 }}>Set Sign-On Date in Pre-Join → Contract Setup.</div>
                <button onClick={() => setPhase("prejoin")} style={{ padding:"6px 14px", borderRadius:8, cursor:"pointer", background:"rgba(0,180,216,0.12)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.35)", fontSize:"0.76rem" }}>→ Contract Setup</button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="FAMILY EMERGENCY CARD" icon="👨‍👩‍👧" color="var(--green)" collapsible defaultOpen={false}>
            <div style={{ background:"rgba(0,200,150,0.05)", border:"1px solid rgba(0,200,150,0.15)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:"0.7rem", color:"var(--text3)" }}>🔒 Stored locally — accessible offline.</div>
            <div style={{ display:"grid", gap:8 }}>
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.66rem", color:"var(--green)" }}>PRIMARY CONTACT</div>
              {[["primary_name","Full Name"],["primary_rel","Relationship"],["primary_phone","Phone"],["primary_whatsapp","WhatsApp"],["primary_email","Email"]].map(([f,l]) => (
                <div key={f} className="ff" style={{ margin:0 }}><label className="fl">{l}</label><input className="fi" value={familyCard[f]} onChange={e=>setFamilyCard(p=>({...p,[f]:e.target.value}))} /></div>
              ))}
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.66rem", color:"var(--cyan)", marginTop:6 }}>SECONDARY CONTACT</div>
              {[["secondary_name","Full Name"],["secondary_rel","Relationship"],["secondary_phone","Phone"],["secondary_email","Email"]].map(([f,l]) => (
                <div key={f} className="ff" style={{ margin:0 }}><label className="fl">{l}</label><input className="fi" value={familyCard[f]} onChange={e=>setFamilyCard(p=>({...p,[f]:e.target.value}))} /></div>
              ))}
              <div className="ff" style={{ margin:0 }}><label className="fl">Home Address</label><textarea className="fi" value={familyCard.home_address} onChange={e=>setFamilyCard(p=>({...p,home_address:e.target.value}))} style={{ minHeight:55, resize:"vertical", fontFamily:"inherit", fontSize:"inherit" }} /></div>
            </div>
          </SectionCard>

          <SectionCard title="MEDICAL INFORMATION CARD" icon="🏥" color="#ff4757" collapsible defaultOpen={false}>
            <div style={{ background:"rgba(255,71,87,0.05)", border:"1px solid rgba(255,71,87,0.15)", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:"0.7rem", color:"var(--text3)" }}>🔒 Stored locally. Share with ship's doctor in emergencies.</div>
            <div style={{ display:"grid", gap:8 }}>
              {[["blood_group","Blood Group",false],["allergies","Allergies",true],["conditions","Medical Conditions",true],["medications","Current Medications",true],["insurance_co","Insurance Company",false],["insurance_no","Policy Number",false],["emergency_contact","Emergency Contact",false]].map(([f,l,ta]) => (
                <div key={f} className="ff" style={{ margin:0 }}><label className="fl">{l}</label>
                  {ta?<textarea className="fi" value={medCard[f]} onChange={e=>setMedCard(p=>({...p,[f]:e.target.value}))} style={{ minHeight:50, resize:"vertical", fontFamily:"inherit", fontSize:"inherit" }} />
                     :<input className="fi" value={medCard[f]} onChange={e=>setMedCard(p=>({...p,[f]:e.target.value}))} />}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="PERSONAL VALUABLES TRACKER" icon="💼" color="var(--purple)" collapsible defaultOpen={false}>
            <div style={{ display:"grid", gap:8, marginBottom:12 }}>
              {inventory.map((item,idx) => (
                <div key={item.id} style={{ background:"rgba(124,58,237,0.05)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontSize:"0.84rem", fontWeight:700, color:"var(--text)" }}>{item.name}</span>
                    <div style={{ display:"flex", gap:4 }}>
                      {driveConnected&&(<><input id={`inv-${item.id}`} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{if(e.target.files?.[0])uploadPhoto(item.id,e.target.files[0]);e.target.value="";}} /><label htmlFor={`inv-${item.id}`} style={{ padding:"3px 8px", borderRadius:6, cursor:"pointer", fontSize:"0.62rem", background:item.driveFileId?"rgba(0,200,100,0.1)":"rgba(124,58,237,0.1)", color:item.driveFileId?"var(--green)":"var(--purple)", border:`1px solid ${item.driveFileId?"rgba(0,200,100,0.3)":"rgba(124,58,237,0.3)"}` }}>{uploadingId===item.id?"…":item.driveFileId?"✅ Photo":"📸"}</label></>)}
                      {item.driveFileId&&<a href={`https://drive.google.com/file/d/${item.driveFileId}/view`} target="_blank" rel="noreferrer" style={{ padding:"3px 8px", borderRadius:6, fontSize:"0.62rem", background:"rgba(0,180,216,0.1)", color:"var(--cyan)", border:"1px solid rgba(0,180,216,0.3)", textDecoration:"none" }}>👁</a>}
                      <button onClick={() => { const u=inventory.filter((_,i)=>i!==idx); setInventory(u); saveChecks({inventory:u}); }} style={{ padding:"3px 7px", borderRadius:6, cursor:"pointer", fontSize:"0.62rem", background:"none", color:"#ff4757", border:"1px solid rgba(255,71,87,0.3)" }}>🗑</button>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {[["brand","Brand / Model"],["serial","Serial No."],["notes","Notes"]].map(([f,l]) => <input key={f} className="fi" style={{ margin:0, padding:"5px 8px", fontSize:"0.72rem", gridColumn:f==="notes"?"1/-1":"auto" }} placeholder={l} value={item[f]} onChange={e=>setInventory(p=>p.map((it,i)=>i===idx?{...it,[f]:e.target.value}:it))} />)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(124,58,237,0.2)", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.65rem", color:"var(--purple)", marginBottom:8 }}>ADD ITEM</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                {[["name","Item Name *"],["brand","Brand"],["serial","Serial No."],["notes","Notes"]].map(([f,l]) => <input key={f} className="fi" style={{ margin:0, padding:"5px 8px", fontSize:"0.72rem", gridColumn:f==="notes"||f==="name"?"1/-1":"auto" }} placeholder={l} value={newInvItem[f]} onChange={e=>setNewInvItem(p=>({...p,[f]:e.target.value}))} />)}
              </div>
              <button onClick={() => { if(!newInvItem.name.trim())return; const item={id:`inv_${Date.now()}`,...newInvItem,driveFileId:null}; const u=[...inventory,item]; setInventory(u); saveChecks({inventory:u}); setNewInvItem({name:"",brand:"",serial:"",notes:""}); }} style={{ marginTop:8, padding:"6px 14px", borderRadius:7, cursor:"pointer", background:"rgba(124,58,237,0.15)", color:"var(--purple)", border:"1px solid rgba(124,58,237,0.4)", fontSize:"0.74rem", fontWeight:700 }}>+ Add Item</button>
            </div>
          </SectionCard>
        </div>
      )}

      {/* ══ SIGN-OFF ══ */}
      {phase==="signoff" && (
        <div>
          {daysUntilRelief!==null&&(
            <div style={{ background:daysUntilRelief<30?"rgba(255,71,87,0.08)":"rgba(0,180,216,0.06)", border:`1px solid ${daysUntilRelief<30?"rgba(255,71,87,0.35)":"rgba(0,180,216,0.25)"}`, borderRadius:14, padding:"1.2rem", marginBottom:"1rem", textAlign:"center" }}>
              <div style={{ fontFamily:"Orbitron,monospace", fontSize:"2.5rem", fontWeight:900, color:daysUntilRelief<30?"#ff4757":daysUntilRelief<60?"var(--gold)":"var(--green)" }}>{daysUntilRelief}</div>
              <div style={{ fontSize:"0.76rem", color:"var(--text3)", marginTop:4 }}>DAYS UNTIL RELIEF</div>
              {reliefDate&&<div style={{ fontSize:"0.72rem", color:"var(--text2)", marginTop:4 }}>Relief: <strong style={{ color:"var(--gold)" }}>{reliefDate}</strong></div>}
            </div>
          )}

          <SectionCard title="PRE SIGN-OFF CHECKLIST (30 Days)" icon="📋" color="var(--gold)">
            <ProgressBar pct={(Object.values(presignoffChecks).filter(Boolean).length/PRESIGNOFF_CHECKLIST.length)*100} color="var(--gold)" />
            <div style={{ marginTop:12 }}>{PRESIGNOFF_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!presignoffChecks[item.id]} onChange={() => toggleCheck(setPresignoffChecks, item.id, "presignoffChecks")} />)}</div>
          </SectionCard>

          <SectionCard title="SIGN-OFF DAY CHECKLIST" icon="🏁" color="var(--green)">
            <ProgressBar pct={(Object.values(signoffChecks).filter(Boolean).length/SIGNOFF_CHECKLIST.length)*100} color="var(--green)" />
            <div style={{ marginTop:12 }}>{SIGNOFF_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!signoffChecks[item.id]} critical onChange={() => toggleCheck(setSignoffChecks, item.id, "signoffChecks")} />)}</div>
          </SectionCard>

          <SectionCard title="CONTRACT COMPLETION AUDIT" icon="✅" color="var(--cyan)" collapsible>
            <ProgressBar pct={(Object.values(auditChecks).filter(Boolean).length/AUDIT_CHECKLIST.length)*100} color="var(--cyan)" />
            <div style={{ marginTop:12 }}>{AUDIT_CHECKLIST.map(item => <CheckItem key={item.id} label={item.label} checked={!!auditChecks[item.id]} critical onChange={() => toggleCheck(setAuditChecks, item.id, "auditChecks")} />)}</div>
            {Object.values(auditChecks).filter(Boolean).length===AUDIT_CHECKLIST.length&&(
              <div style={{ marginTop:12, background:"rgba(0,200,150,0.08)", border:"1px solid rgba(0,200,150,0.3)", borderRadius:10, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:"1.5rem", marginBottom:4 }}>🎉</div>
                <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.78rem", color:"var(--green)", fontWeight:700 }}>CONTRACT AUDIT COMPLETE</div>
                <div style={{ fontSize:"0.72rem", color:"var(--text3)", marginTop:4 }}>Safe journey home!</div>
                <button onClick={exportPDF} style={{ marginTop:10, padding:"7px 18px", borderRadius:8, cursor:"pointer", background:"rgba(0,200,150,0.15)", color:"var(--green)", border:"1px solid rgba(0,200,150,0.4)", fontSize:"0.76rem", fontWeight:700 }}>🖨 Generate Completion Report</button>
              </div>
            )}
          </SectionCard>

          {/* FIX 7 + FIX 8: History with delete and confirmation */}
          <SectionCard title="CONTRACT HISTORY" icon="📖" color="var(--purple)" collapsible defaultOpen={false}>
            {history.length===0
              ? <div style={{ textAlign:"center", padding:"1rem 0", fontSize:"0.76rem", color:"var(--text3)" }}>No completed contracts saved yet.</div>
              : history.map((h,i) => (
                <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:10, padding:"10px 12px", marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                    <div><span style={{ fontSize:"0.84rem", fontWeight:700, color:"var(--text)" }}>{h.vesselName||"Vessel"}</span><span style={{ fontSize:"0.68rem", color:"var(--purple)", marginLeft:8 }}>{h.months} months</span></div>
                    {/* FIX 7: Delete history entry */}
                    <button onClick={() => { if(!window.confirm("Remove this contract from history?"))return; const u=history.filter((_,j)=>j!==i); setHistory(u); saveChecks({history:u}); }} style={{ background:"none", border:"1px solid rgba(255,71,87,0.25)", borderRadius:5, color:"#ff4757", cursor:"pointer", fontSize:"0.62rem", padding:"2px 6px" }}>🗑</button>
                  </div>
                  <div style={{ fontSize:"0.72rem", color:"var(--text3)" }}>{h.signOn} → {h.signOff}</div>
                  <div style={{ fontSize:"0.70rem", color:"var(--text3)" }}>{h.company} · {h.rank}</div>
                </div>
              ))
            }
            {contract.signOnDate&&(
              // FIX 8: Confirmation before saving
              <button onClick={() => { if(!window.confirm(`Save current contract (${contract.vesselName||"Vessel"}, ${contractMonths} months) to history?`))return; const entry={vesselName:contract.vesselName,company:contract.company,vesselType:contract.vesselType,signOn:contract.signOnDate,signOff:new Date().toISOString().split("T")[0],months:contractMonths,daysOnboard,rank:contract.rank,savedAt:new Date().toISOString()}; const u=[...history,entry]; setHistory(u); saveChecks({history:u}); notify("Contract saved to history","success"); }} style={{ marginTop:8, padding:"6px 14px", borderRadius:7, cursor:"pointer", background:"rgba(124,58,237,0.12)", color:"var(--purple)", border:"1px solid rgba(124,58,237,0.35)", fontSize:"0.74rem", fontWeight:700, width:"100%" }}>
                + Save Current Contract to History
              </button>
            )}
          </SectionCard>

          <div style={{ background:"var(--card)", border:"1px solid rgba(240,165,0,0.25)", borderRadius:14, padding:"1.2rem" }}>
            <div style={{ fontFamily:"Orbitron,monospace", fontSize:"0.76rem", color:"var(--gold)", marginBottom:8 }}>🖨 EXPORT FULL REPORT</div>
            <div style={{ fontSize:"0.74rem", color:"var(--text3)", marginBottom:12, lineHeight:1.5 }}>Full PDF — contract, documents, checklists, history — color coded by status.</div>
            <button onClick={exportPDF} style={{ padding:"8px 20px", borderRadius:8, cursor:"pointer", background:"rgba(240,165,0,0.15)", color:"var(--gold)", border:"1px solid rgba(240,165,0,0.4)", fontSize:"0.76rem", fontWeight:700 }}>🖨 Generate Full PDF Report</button>
          </div>
        </div>
      )}

      <div className="info-box" style={{ marginTop:"1.5rem", fontSize:"0.7rem" }}>
        ⚓ Crew Journey Manager — Checklist ticks synced to cloud. Form data stored locally. Drive stays connected across sessions.
      </div>
    </div>
  );
}

export default CrewJourneyPage;
