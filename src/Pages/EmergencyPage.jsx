import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────
// STATIC DATA
// ─────────────────────────────────────────────

const MRCC_DIRECTORY = [
  { region: "Asia Pacific", country: "Singapore", name: "MRCC Singapore", callsign: "SINGAPORE RADIO", vhf: "16", phone: "+65 6325 2562", email: "mrcc@mpa.gov.sg" },
  { region: "Asia Pacific", country: "Japan", name: "MRCC Tokyo", callsign: "TOKYO COAST GUARD", vhf: "16", phone: "+81 3 3591 9999", email: "mrcc.tokyo@kaiho.mlit.go.jp" },
  { region: "Asia Pacific", country: "Australia", name: "AMSA JRCC Australia", callsign: "AUSTRALIA RESCUE", vhf: "16", phone: "+61 2 6230 6811", email: "rccaus@amsa.gov.au" },
  { region: "Asia Pacific", country: "China", name: "MRCC Shanghai", callsign: "SHANGHAI RESCUE", vhf: "16", phone: "+86 21 65323600", email: "mrcc@msa.gov.cn" },
  { region: "Asia Pacific", country: "South Korea", name: "MRCC Busan", callsign: "BUSAN COAST GUARD", vhf: "16", phone: "+82 51 999 0115", email: "mrcc@kcg.go.kr" },
  { region: "Asia Pacific", country: "Philippines", name: "MRCC Manila", callsign: "MANILA RADIO", vhf: "16", phone: "+63 2 527 3867", email: "opcen@marina.gov.ph" },
  { region: "Asia Pacific", country: "India", name: "MRCC Mumbai", callsign: "MUMBAI COAST GUARD", vhf: "16", phone: "+91 22 2204 0203", email: "mrcc-mumbai@indiancoastguard.gov.in" },
  { region: "Asia Pacific", country: "Indonesia", name: "MRCC Jakarta", callsign: "JAKARTA RADIO", vhf: "16", phone: "+62 21 3860714", email: "mrcc@hubla.dephub.go.id" },
  { region: "Asia Pacific", country: "Malaysia", name: "MRCC Subang", callsign: "MALAYSIA RESCUE", vhf: "16", phone: "+60 3 7846 1600", email: "mrcc@apmm.gov.my" },
  { region: "Europe", country: "United Kingdom", name: "MRCC Falmouth", callsign: "FALMOUTH COASTGUARD", vhf: "16", phone: "+44 1326 317575", email: "falmouth.mrcc@mcga.gov.uk" },
  { region: "Europe", country: "Norway", name: "JRCC Norway", callsign: "BODØ RADIO", vhf: "16", phone: "+47 51 51 70 00", email: "jrcc.north@hovedredningssentralen.no" },
  { region: "Europe", country: "France", name: "MRCC Cherbourg", callsign: "CROSS CORSEN", vhf: "16", phone: "+33 2 96 55 35 35", email: "cross-corsen@equipement.gouv.fr" },
  { region: "Europe", country: "Germany", name: "MRCC Bremen", callsign: "BREMEN RESCUE RADIO", vhf: "16", phone: "+49 421 53687 0", email: "mrcc-bremen@wsv.bund.de" },
  { region: "Europe", country: "Greece", name: "JRCC Piraeus", callsign: "PIRAEUS RADIO", vhf: "16", phone: "+30 210 4121888", email: "jrcc@hcg.gr" },
  { region: "Americas", country: "USA", name: "MRCC Norfolk", callsign: "US COAST GUARD", vhf: "16", phone: "+1 757 398 6390", email: "mrcc.norfolk@uscg.mil" },
  { region: "Americas", country: "USA", name: "MRCC Miami", callsign: "US COAST GUARD MIAMI", vhf: "16", phone: "+1 305 415 6800", email: "mrcc.miami@uscg.mil" },
  { region: "Americas", country: "Canada", name: "JRCC Halifax", callsign: "HALIFAX RESCUE", vhf: "16", phone: "+1 902 427 8200", email: "mrsc.halifax@forces.gc.ca" },
  { region: "Middle East & Africa", country: "UAE", name: "MRCC Dubai", callsign: "DUBAI COAST GUARD", vhf: "16", phone: "+971 4 345 0520", email: "mrcc@coastguard.ae" },
  { region: "Middle East & Africa", country: "South Africa", name: "MRCC Cape Town", callsign: "CAPE TOWN RADIO", vhf: "16", phone: "+27 21 938 3300", email: "mrcc@transport.gov.za" },
];

const TMAS_DIRECTORY = [
  { region: "Norway / North Sea", name: "TMAS Norway (Haukeland)", phone: "+47 55 97 69 31", available: "24/7", coverage: "Global (primary NW Europe)", email: "tmas@helse-bergen.no", notes: "IMO-recognized, serves North Sea vessels" },
  { region: "Mediterranean", name: "CIRM Italy (Rome)", phone: "+39 06 5921 4201", available: "24/7", coverage: "Mediterranean, global", email: "cirm@cirm.it", notes: "Centro Internazionale Radio Medico" },
  { region: "North America", name: "TMAS USA (Maryland)", phone: "+1 800 SEA 6789", available: "24/7", coverage: "Americas, Atlantic", email: "tmas@medevac.uscg.mil", notes: "USCG-linked telemedical service" },
  { region: "France / Atlantic", name: "CCMM Toulouse", phone: "+33 5 61 30 36 09", available: "24/7", coverage: "Atlantic, Indian Ocean", email: "ccmm@chu-toulouse.fr", notes: "Centre de Consultations Médicales Maritimes" },
  { region: "Australia / Pacific", name: "TMAS Australia", phone: "+61 1800 022 000", available: "24/7", coverage: "Pacific, Indian Ocean", email: "tmas@amsa.gov.au", notes: "AMSA telemedical, English-speaking" },
  { region: "Singapore / SE Asia", name: "TMAS Singapore", phone: "+65 6226 5452", available: "24/7", coverage: "SE Asia, Malacca Strait", email: "tmas@mpa.gov.sg", notes: "MPA Singapore" },
];

const ITF_INSPECTORS = [
  { country: "Singapore", port: "Singapore", name: "ITF Singapore Office", phone: "+65 6221 3970", email: "singapore@itf.org.uk", address: "79 Anson Road, #17-01, Singapore 079906" },
  { country: "Japan", port: "Tokyo / Yokohama", name: "ITF Japan (JSU)", phone: "+81 3 3492 6302", email: "jsu@jsu.or.jp", address: "JSU Building, 1-4-9 Shimbashi, Tokyo" },
  { country: "Australia", port: "Sydney / Melbourne", name: "ITF Australia (MUA)", phone: "+61 2 9267 9134", email: "mua@mua.org.au", address: "365-375 Sussex St, Sydney NSW 2000" },
  { country: "United Kingdom", port: "London / Tilbury", name: "ITF UK (Nautilus)", phone: "+44 20 7780 0900", email: "helen.dalli@itf.org.uk", address: "ITF House, 49-60 Borough Rd, London SE1" },
  { country: "USA", port: "New York / New Jersey", name: "ITF USA (ILA)", phone: "+1 212 425 1200", email: "usa@itf.org.uk", address: "17 Battery Place, New York, NY 10004" },
  { country: "Netherlands", port: "Rotterdam", name: "ITF Netherlands (FNV)", phone: "+31 10 267 4500", email: "rotterdam@itf.org.uk", address: "Boompjes 40, 3011 XB Rotterdam" },
  { country: "India", port: "Mumbai / Chennai", name: "ITF India (NUSI)", phone: "+91 22 2342 1357", email: "nusi@nusi.org.in", address: "174-178 NSS Marg, Mumbai 400 009" },
  { country: "Philippines", port: "Manila", name: "ITF Philippines (AMOSUP)", phone: "+63 2 527 8910", email: "amosup@amosup.org", address: "811 EDSA, Valenzuela, Manila" },
];

const FLAG_STATES = [
  { flag: "Panama", authority: "Panama Maritime Authority (AMP)", phone: "+507 501 5000", email: "amp@amp.gob.pa", website: "www.amp.gob.pa", emergency: "+507 501 5100" },
  { flag: "Marshall Islands", authority: "RMI Registry", phone: "+1 703 620 4880", email: "mro@register-iri.com", website: "www.register-iri.com", emergency: "+1 703 620 4880" },
  { flag: "Liberia", authority: "LISCR", phone: "+1 703 490 1900", email: "info@liscr.com", website: "www.liscr.com", emergency: "+1 703 490 1900" },
  { flag: "Hong Kong", authority: "Hong Kong Marine Dept.", phone: "+852 2542 3711", email: "mardep@mardep.gov.hk", website: "www.mardep.gov.hk", emergency: "+852 2233 7999" },
  { flag: "Singapore", authority: "Maritime & Port Authority (MPA)", phone: "+65 6375 1600", email: "onedesk@mpa.gov.sg", website: "www.mpa.gov.sg", emergency: "+65 6325 2562" },
  { flag: "Bahamas", authority: "Bahamas Maritime Authority", phone: "+1 242 356 5483", email: "info@bahamasmaritime.com", website: "www.bahamasmaritime.com", emergency: "+1 242 356 5483" },
  { flag: "Malta", authority: "Transport Malta", phone: "+356 2125 0360", email: "merchant.shipping@transport.gov.mt", website: "www.transport.gov.mt", emergency: "+356 2122 4202" },
  { flag: "Cyprus", authority: "Dept. of Merchant Shipping", phone: "+357 25 848100", email: "dms@dms.mcw.gov.cy", website: "www.dms.mcw.gov.cy", emergency: "+357 25 848100" },
  { flag: "Greece", authority: "Hellenic Coast Guard", phone: "+30 210 4191000", email: "flagstate@hcg.gr", website: "www.hcg.gr", emergency: "+30 210 4121888" },
  { flag: "Norway (NIS)", authority: "Norwegian Maritime Authority", phone: "+47 52 74 50 00", email: "postmottak@sdir.no", website: "www.sdir.no", emergency: "+47 51 89 00 00" },
];

// PSC deficiency data by flag
const PSC_DEFICIENCIES = [
  { flag: "Panama", topDeficiencies: ["Fire-fighting appliances", "Life-saving appliances", "ISM Code", "STCW certificates", "Fire dampers/doors"], psrRating: "Medium", memoranda: "Tokyo MOU / Paris MOU", notes: "High volume flag — ensure ISM SMS is fully updated" },
  { flag: "Marshall Islands", topDeficiencies: ["Safety of Navigation", "MARPOL Annex I", "Fire-fighting appliances", "Crew familiarization", "Certificates validity"], psrRating: "Low", memoranda: "Tokyo MOU / Paris MOU / USCG", notes: "Generally well-regarded. USCG focuses on SMS and drill records" },
  { flag: "Liberia", topDeficiencies: ["ISM Code", "LSA maintenance records", "ISPS compliance", "Working hours records", "Medical certificates"], psrRating: "Low-Medium", memoranda: "Paris MOU / Tokyo MOU", notes: "Strong flag state control. Ensure medical fitness certs current" },
  { flag: "Hong Kong", topDeficiencies: ["Fire detection systems", "Navigation equipment", "Crew documents", "Garbage management plan", "MLC compliance"], psrRating: "Low", memoranda: "Tokyo MOU", notes: "Strict MLC enforcement in Australian and European ports" },
  { flag: "Singapore", topDeficiencies: ["Fire-fighting systems", "ECDIS type approval", "Pilot ladder", "MLC rest hours", "Lifeboat release gear"], psrRating: "Low", memoranda: "Tokyo MOU / Paris MOU", notes: "ECDIS type approval and pilot ladder are frequent PSC targets" },
  { flag: "Bahamas", topDeficiencies: ["ISM non-conformities", "STCW endorsements", "Emergency lighting", "Lifeboat servicing", "Ballast water records"], psrRating: "Medium", memoranda: "Paris MOU / Tokyo MOU / USCG", notes: "Ensure lifeboat annual service records are onboard" },
  { flag: "Malta", topDeficiencies: ["Fire-fighting appliances", "Radio installations", "Life-saving appliances", "Certificates", "ISM Code"], psrRating: "Medium", memoranda: "Paris MOU", notes: "Paris MOU frequently inspects Malta-flagged vessels" },
  { flag: "Cyprus", topDeficiencies: ["MARPOL compliance", "Oil record book", "Fire detection", "Safety drills records", "MLC"], psrRating: "Medium", memoranda: "Paris MOU", notes: "ORB and garbage record accuracy are common findings" },
];

const GMDSS_FREQUENCIES = [
  { band: "VHF", freq: "Ch. 16 — 156.8 MHz", use: "International Distress, Safety & Calling", type: "distress", notes: "Watch mandatory on all GMDSS vessels at all times" },
  { band: "VHF", freq: "Ch. 70 — 156.525 MHz", use: "DSC Distress Alerting (VHF)", type: "distress", notes: "Press red button ≥5 sec for distress alert" },
  { band: "VHF", freq: "Ch. 13 — 156.650 MHz", use: "Bridge-to-Bridge / Collision Avoidance", type: "safety", notes: "Required for large vessels in US waters" },
  { band: "MF", freq: "2182 kHz", use: "MF Distress & Calling (voice)", type: "distress", notes: "Silence periods: :00–:03 and :30–:33 each hour" },
  { band: "MF", freq: "2187.5 kHz", use: "MF DSC Distress Alerting", type: "distress", notes: "DSC controller auto-selects on distress button" },
  { band: "HF", freq: "4125 kHz", use: "HF Distress & Safety (voice)", type: "distress", notes: "4 MHz band — medium range" },
  { band: "HF", freq: "6215 kHz", use: "HF Distress & Safety (voice)", type: "distress", notes: "6 MHz band" },
  { band: "HF", freq: "8291 kHz", use: "HF Distress & Safety (voice)", type: "distress", notes: "8 MHz band — most commonly used HF distress freq" },
  { band: "HF", freq: "12290 kHz", use: "HF Distress & Safety (voice)", type: "distress", notes: "12 MHz band" },
  { band: "HF", freq: "16420 kHz", use: "HF Distress & Safety (voice)", type: "distress", notes: "16 MHz band — long range" },
  { band: "HF DSC", freq: "4207.5 kHz", use: "HF DSC Distress Alert", type: "distress", notes: "DSC distress for 4 MHz band" },
  { band: "HF DSC", freq: "6312 kHz", use: "HF DSC Distress Alert", type: "distress", notes: "DSC distress for 6 MHz band" },
  { band: "HF DSC", freq: "8414.5 kHz", use: "HF DSC Distress Alert", type: "distress", notes: "Primary HF DSC distress frequency" },
  { band: "NAVTEX", freq: "518 kHz", use: "NAVTEX International (English)", type: "safety", notes: "Automated MSI broadcasts — keep receiver on" },
  { band: "NAVTEX", freq: "490 kHz", use: "NAVTEX National", type: "safety", notes: "National language broadcasts" },
  { band: "SAT", freq: "406 MHz", use: "EPIRB / COSPAS-SARSAT", type: "distress", notes: "Global coverage via satellite — activates automatically on immersion" },
  { band: "SAT", freq: "1.6 GHz", use: "Inmarsat (GMDSS)", type: "safety", notes: "Inmarsat C for EGC SafetyNET MSI" },
  { band: "RADAR", freq: "9 GHz (3cm)", use: "SART Search & Rescue Transponder", type: "safety", notes: "Visible as 12 blips on radar screen — 8nm range" },
];

const EMERGENCY_CHECKLISTS = [
  {
    id: "fire", icon: "🔥", label: "Fire", color: "#dc2626",
    steps: [
      "Sound the alarm — 7 short + 1 long blast / ship's bell",
      "Report to bridge: location, size, type of fire",
      "Close all watertight/fire doors in affected area",
      "Stop ventilation fans in affected area",
      "Muster crew at assembly station — take muster list",
      "Don SCBA and protective clothing before approaching fire",
      "Attack fire with appropriate extinguisher (CO2/Foam/Dry powder)",
      "Activate fixed firefighting system if needed (CO2 room flood — evacuate first)",
      "Prepare fire hoses and boundary cooling",
      "Send MAYDAY or PAN PAN as appropriate",
      "Prepare for abandon ship if fire uncontrolled",
    ],
  },
  {
    id: "flooding", icon: "🌊", label: "Flooding", color: "#2563eb",
    steps: [
      "Sound general alarm",
      "Identify and locate source of flooding",
      "Close watertight doors and hatches in area",
      "Start bilge pumps — maximum capacity",
      "Deploy portable submersible pump if available",
      "Use wooden plugs/collision mat to reduce ingress",
      "Shift ballast to correct list — keep vessel upright",
      "Muster all crew — take roll call",
      "Assess stability — consult damage stability booklet",
      "Send MAYDAY if flooding uncontrollable",
      "Prepare lifeboats and liferafts for launching",
    ],
  },
  {
    id: "mob", icon: "🧑‍🦯", label: "Man Overboard", color: "#7c3aed",
    steps: [
      "Shout 'MAN OVERBOARD' — throw life ring immediately",
      "Press MOB button on GPS/ECDIS — mark position",
      "Post lookout — maintain visual contact, NEVER lose sight",
      "Helm to Williamson Turn: hard over same side as MOB",
      "Sound 3 long blasts on horn",
      "Broadcast PAN PAN on VHF Ch.16 with MOB position",
      "Activate SART/AIS-SART if available — throw to MOB",
      "Muster rescue team — ready rescue boat or scramble net",
      "Approach from downwind/downsea side",
      "Recover casualty — initiate first aid / hypothermia protocol",
      "Report to flag state and company DPA",
    ],
  },
  {
    id: "abandon", icon: "🆘", label: "Abandon Ship", color: "#b45309",
    steps: [
      "Sound abandon ship signal: 7 short + 1 long blast (repeated)",
      "Don lifejacket and immersion suit — all crew",
      "Collect GMDSS EPIRB, SART, portable VHF radio",
      "Take grab bag: water, flares, food, first aid, documents",
      "Muster all crew — account for every person",
      "Send MAYDAY with position, POB, nature of distress",
      "Activate EPIRB if not already auto-activated",
      "Lower lifeboats on lee side — check release gear",
      "Board lifeboat in orderly manner — Master last",
      "Clear vessel by at least 100m before stopping engine",
      "Remain together — activate SART and flares for SAR aircraft",
    ],
  },
  {
    id: "medical", icon: "🏥", label: "Medical Emergency", color: "#059669",
    steps: [
      "Ensure scene safety — assess danger before approaching",
      "Check response: tap shoulders, shout 'Are you OK?'",
      "Call for help — assign someone to contact TMAS",
      "Open airway: head tilt-chin lift",
      "Check breathing for no more than 10 seconds",
      "If not breathing: start CPR — 30 compressions : 2 breaths",
      "Attach AED as soon as available — follow prompts",
      "Control bleeding: direct pressure, elevation",
      "Treat for shock: keep warm, lay flat, elevate legs (if no spinal injury)",
      "Contact TMAS for medical advice (refer to TMAS directory)",
      "Prepare patient for MEDEVAC if required",
      "Document all actions with timestamps",
    ],
  },
  {
    id: "collision", icon: "💥", label: "Collision / Grounding", color: "#9a3412",
    steps: [
      "Stop engines immediately",
      "Sound general alarm",
      "Assess damage — check all compartments for flooding",
      "Close all watertight doors",
      "Sound bilges — measure water ingress rate",
      "If grounded: do NOT attempt to back off without stability assessment",
      "Muster crew — account for all persons / injuries",
      "Send MAYDAY or PAN PAN as appropriate",
      "Mark position on chart — note tide, depth, weather",
      "Assess structural integrity before any movement",
      "Contact flag state, company DPA, and port authority",
      "Preserve evidence — do not alter logbook or VDR",
    ],
  },
];

const MEDICAL_TRIAGE = [
  {
    category: "CPR (Adult)",
    color: "#dc2626",
    icon: "❤️",
    steps: [
      "Ensure scene is safe",
      "Check responsiveness — tap and shout",
      "Call for help / assign person to call TMAS",
      "Open airway: head tilt-chin lift",
      "Check for normal breathing (≤10 seconds)",
      "30 chest compressions — hard & fast (5–6 cm depth, 100–120/min)",
      "2 rescue breaths (1 second each, chest rise)",
      "Continue 30:2 until AED arrives or patient recovers",
      "Attach AED — follow voice prompts",
      "Minimize interruptions to compressions",
    ],
    notes: "Rate: 100-120/min. Depth: 5-6cm. Allow full chest recoil. Switch compressor every 2 min to avoid fatigue.",
  },
  {
    category: "Burns Assessment (Rule of Nines)",
    color: "#d97706",
    icon: "🔥",
    steps: [
      "Remove from heat source — ensure own safety first",
      "Cool burn: cool running water 20 min (NOT ice)",
      "Assess burn depth: superficial / partial / full thickness",
      "Estimate burn area using Rule of Nines",
      "Head & neck = 9%, Each arm = 9%, Chest = 18%, Abdomen = 18%, Each leg = 18%, Genitalia = 1%",
      "Cover with cling film or clean non-fluffy dressing",
      "Keep patient warm — prevent hypothermia",
      "Establish IV access for >15% TBSA burns",
      "Contact TMAS for burns >10% TBSA or any full thickness",
      "Arrange MEDEVAC for major burns",
    ],
    notes: "Do NOT burst blisters. Do NOT apply butter/oils/toothpaste. Burns >15% TBSA require IV fluid resuscitation.",
  },
  {
    category: "Choking (Conscious Adult)",
    color: "#7c3aed",
    icon: "🫁",
    steps: [
      "Encourage patient to cough forcefully",
      "If ineffective: lean patient forward",
      "Give 5 firm back blows between shoulder blades (heel of hand)",
      "Check mouth after each blow — remove any visible obstruction",
      "If still blocked: 5 abdominal thrusts (Heimlich manoeuvre)",
      "Stand behind, arms around waist, hands above navel",
      "Firm inward-upward thrust",
      "Alternate 5 back blows + 5 abdominal thrusts",
      "If unconscious: lower to floor, start CPR",
      "Call TMAS for guidance on any complication",
    ],
    notes: "For pregnant or obese patients: chest thrusts instead of abdominal thrusts. Always seek medical follow-up after Heimlich.",
  },
  {
    category: "Shock Management",
    color: "#0369a1",
    icon: "💉",
    steps: [
      "Identify and treat the cause (stop bleeding, immobilize fractures)",
      "Lay patient flat — elevate legs 30cm unless head/spinal injury",
      "Keep patient warm — prevent heat loss",
      "Loosen tight clothing around neck/chest/waist",
      "Do NOT give food or drink",
      "Establish IV access if trained — administer normal saline",
      "Monitor vital signs every 5 minutes: BP, pulse, RR, SpO2",
      "Administer O2 via mask at 10–15 L/min",
      "Reassure patient — keep calm",
      "Contact TMAS immediately for fluid resuscitation guidance",
    ],
    notes: "Signs of shock: pale/cold/clammy skin, rapid weak pulse, low BP, confusion, rapid breathing. Time-critical — act fast.",
  },
  {
    category: "Fractures / Musculoskeletal",
    color: "#065f46",
    icon: "🦴",
    steps: [
      "Do not move patient if spinal fracture suspected",
      "Immobilize the fracture — splint in position found",
      "Apply splint extending beyond joint above and below fracture",
      "Check circulation distal to fracture: pulse, sensation, movement",
      "Control bleeding: direct pressure for open fractures",
      "Cover open fractures with clean/sterile dressing",
      "Apply ice pack wrapped in cloth (20 min on, 20 min off)",
      "Elevate injured limb if possible",
      "Pain relief: paracetamol or as per Ship Captain's Medical Guide",
      "Contact TMAS for all suspected long bone or spinal fractures",
    ],
    notes: "Never attempt to straighten an angulated fracture. Femur fracture can cause 1-2L internal blood loss — treat for shock.",
  },
];

const HIGH_RISK_AREAS = [
  { name: "Gulf of Aden / Arabian Sea", latMin: 10, latMax: 25, lonMin: 42, lonMax: 65, risk: "HIGH", threat: "Piracy / Armed Robbery", guidance: "BMP6 — Transit armed, citadel prepared, speed ≥18kts", color: "#dc2626", org: "IMB / EU NAVFOR" },
  { name: "Gulf of Guinea (West Africa)", latMin: -5, latMax: 10, lonMin: -5, lonMax: 10, risk: "HIGH", threat: "Piracy / Crew Kidnapping", guidance: "BMP West Africa — citadel, razor wire, MDAT-GOG reporting", color: "#dc2626", org: "IMB / MDAT-GOG" },
  { name: "Malacca & Singapore Strait", latMin: 1, latMax: 6, lonMin: 99, lonMax: 104, risk: "MEDIUM", threat: "Petty theft / Robbery at anchor", guidance: "Anti-piracy watch. Report to ReCAAP ISC Singapore", color: "#d97706", org: "ReCAAP ISC" },
  { name: "Sulu / Celebes Sea (Philippines)", latMin: 3, latMax: 10, lonMin: 118, lonMax: 127, risk: "HIGH", threat: "Kidnapping for ransom", guidance: "Avoid if possible. If transiting: speed, citadel, report to MDAT", color: "#dc2626", org: "IMB / ReCAAP" },
  { name: "Bangladesh (Chittagong Anchorage)", latMin: 21, latMax: 24, lonMin: 90, lonMax: 93, risk: "MEDIUM", threat: "Theft at anchor", guidance: "Anchor watch, good lighting, gangway control", color: "#d97706", org: "ReCAAP ISC" },
  { name: "Red Sea (Houthi Threat Zone)", latMin: 12, latMax: 28, lonMin: 32, lonMax: 44, risk: "CRITICAL", threat: "Drone / Missile attacks (Houthi)", guidance: "UKMTO registration mandatory. Consider Cape of Good Hope deviation", color: "#7f1d1d", org: "UKMTO / EUNAVFOR" },
  { name: "Black Sea (War Risk Zone)", latMin: 40, latMax: 48, lonMin: 27, lonMax: 42, risk: "HIGH", threat: "War risk / Mines", guidance: "Check JWC war risk areas. War risk insurance required", color: "#dc2626", org: "JWC / Flag State" },
  { name: "Eastern Mediterranean", latMin: 30, latMax: 38, lonMin: 25, lonMax: 38, risk: "MEDIUM", threat: "Regional tensions / SAR incidents", guidance: "Stay updated on NAVAREA warnings. UKMTO voluntary reporting", color: "#d97706", org: "UKMTO" },
];

const FALLBACK_PORTS = [
  { name: "Singapore", lat: 1.264, lon: 103.820 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Rotterdam", lat: 51.92, lon: 4.48 },
  { name: "Busan", lat: 35.10, lon: 129.04 },
  { name: "Dubai (Jebel Ali)", lat: 24.98, lon: 55.06 },
  { name: "Hong Kong", lat: 22.31, lon: 114.17 },
  { name: "Los Angeles", lat: 33.74, lon: -118.27 },
  { name: "Hamburg", lat: 53.55, lon: 9.99 },
  { name: "Mumbai", lat: 18.93, lon: 72.83 },
  { name: "Sydney", lat: -33.86, lon: 151.21 },
  { name: "Cape Town", lat: -33.92, lon: 18.42 },
  { name: "Colombo", lat: 6.93, lon: 79.85 },
  { name: "Yokohama", lat: 35.44, lon: 139.64 },
  { name: "New York", lat: 40.67, lon: -74.00 },
  { name: "Piraeus", lat: 37.94, lon: 23.63 },
  { name: "Manila", lat: 14.58, lon: 120.97 },
  { name: "Lagos", lat: 6.45, lon: 3.40 },
  { name: "Port Klang", lat: 3.00, lon: 101.39 },
];

const DISTRESS_TEMPLATES = {
  MAYDAY: {
    label: "MAYDAY — Grave & Imminent Danger", color: "#dc2626",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "Position (LAT/LON)", placeholder: "01°22'N 103°45'E" },
      { id: "nature", label: "Nature of Distress", placeholder: "Fire in engine room" },
      { id: "pob", label: "Persons on Board", placeholder: "22" },
      { id: "info", label: "Any Other Information", placeholder: "Listing 15° to starboard..." },
    ],
    template: (f) => `MAYDAY MAYDAY MAYDAY\nThis is ${f.vesselName||"[VESSEL NAME]"} ${f.vesselName||"[VESSEL NAME]"} ${f.vesselName||"[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign||"[CALLSIGN]"}\nMAYDAY ${f.vesselName||"[VESSEL NAME]"}\nPosition: ${f.position||"[POSITION]"}\nWe are ${f.nature||"[NATURE OF DISTRESS]"}\nRequire immediate assistance\nPersons on board: ${f.pob||"[NUMBER]"}\n${f.info?f.info+"\n":""}Over.`,
  },
  PAN_PAN: {
    label: "PAN PAN — Urgent", color: "#d97706",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "Position", placeholder: "01°22'N 103°45'E" },
      { id: "nature", label: "Nature of Urgency", placeholder: "Medical emergency" },
      { id: "pob", label: "Persons on Board", placeholder: "22" },
      { id: "info", label: "Assistance Required", placeholder: "Medical advice / towing" },
    ],
    template: (f) => `PAN PAN PAN PAN PAN PAN\nAll stations all stations all stations\nThis is ${f.vesselName||"[VESSEL NAME]"} ${f.vesselName||"[VESSEL NAME]"} ${f.vesselName||"[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign||"[CALLSIGN]"}\nPosition: ${f.position||"[POSITION]"}\nUrgency: ${f.nature||"[NATURE]"}\nPersons on board: ${f.pob||"[NUMBER]"}\nAssistance required: ${f.info||"[ASSISTANCE]"}\nOver.`,
  },
  SECURITE: {
    label: "SÉCURITÉ — Safety Warning", color: "#2563eb",
    fields: [
      { id: "vesselName", label: "Vessel Name", placeholder: "MV EXAMPLE" },
      { id: "callsign", label: "MMSI / Callsign", placeholder: "123456789" },
      { id: "position", label: "Position", placeholder: "01°22'N 103°45'E" },
      { id: "nature", label: "Hazard / Warning", placeholder: "Unlit vessel / debris at..." },
    ],
    template: (f) => `SÉCURITÉ SÉCURITÉ SÉCURITÉ\nAll stations all stations all stations\nThis is ${f.vesselName||"[VESSEL NAME]"} ${f.vesselName||"[VESSEL NAME]"} ${f.vesselName||"[VESSEL NAME]"}\nMMSI/Callsign: ${f.callsign||"[CALLSIGN]"}\nPosition: ${f.position||"[POSITION]"}\nNavigational warning: ${f.nature||"[HAZARD]"}\nOut.`,
  },
};

const EMERGENCY_SIGNALS = [
  { category: "Visual Day", signals: [
    { name: "Orange Smoke", description: "Continuous orange smoke — distress signal", icon: "🟠", regulation: "SOLAS Reg. III/6" },
    { name: "Flames on Vessel", description: "Flames on board (burning tar barrel)", icon: "🔥", regulation: "SOLAS Annex IV" },
    { name: "Square Flag + Ball", description: "Square flag with ball above/below", icon: "🚩", regulation: "COLREGS Annex IV" },
    { name: "Arms Raised & Lowered", description: "Slowly raising and lowering outstretched arms", icon: "🙋", regulation: "COLREGS Annex IV" },
  ]},
  { category: "Visual Night", signals: [
    { name: "Red Parachute Flare", description: "Red parachute flare — visible 40+ seconds", icon: "🔴", regulation: "SOLAS Reg. III/6" },
    { name: "Red Hand Flare", description: "Red hand flare — burning time ≥1 min", icon: "🔴", regulation: "SOLAS Reg. III/6" },
    { name: "Searchlight SOS", description: "SOS in morse code by searchlight", icon: "🔦", regulation: "COLREGS Annex IV" },
  ]},
  { category: "Sound & Electronic", signals: [
    { name: "DSC Distress Alert", description: "VHF Ch.70 — press red button 5 sec", icon: "📻", regulation: "SOLAS Reg. IV/9" },
    { name: "EPIRB Activation", description: "406 MHz — global Cospas-Sarsat coverage", icon: "📡", regulation: "SOLAS Reg. IV/7" },
    { name: "SART Activation", description: "9 GHz radar transponder — 8nm range", icon: "📶", regulation: "SOLAS Reg. III/6" },
    { name: "VHF Ch.16 MAYDAY", description: "Voice MAYDAY — international distress freq", icon: "🎙️", regulation: "ITU Radio Regulations" },
  ]},
];

const PHRASEBOOK = [
  { category: "Distress & Urgency", phrases: [
    { phrase: "MAYDAY MAYDAY MAYDAY", use: "Grave and imminent danger" },
    { phrase: "PAN PAN PAN PAN PAN PAN", use: "Urgent — not immediately life-threatening" },
    { phrase: "SÉCURITÉ SÉCURITÉ SÉCURITÉ", use: "Safety / navigational hazard warning" },
    { phrase: "I am in distress and require immediate assistance.", use: "Plain language distress" },
    { phrase: "Man overboard. My position is...", use: "Person in the water" },
    { phrase: "I am abandoning ship. My position is...", use: "Crew abandoning vessel" },
  ]},
  { category: "Fire & Flooding", phrases: [
    { phrase: "I have fire on board and require immediate assistance.", use: "Fire emergency" },
    { phrase: "My vessel is flooding. I require pumping assistance.", use: "Flooding" },
    { phrase: "The fire is out of control.", use: "Escalating fire" },
    { phrase: "My vessel has an uncontrolled list of ___ degrees.", use: "Stability emergency" },
  ]},
  { category: "Medical", phrases: [
    { phrase: "I have a seriously ill/injured crew member.", use: "Requesting medical advice" },
    { phrase: "I require medical evacuation (MEDEVAC).", use: "Requesting evacuation" },
    { phrase: "The patient is unconscious / not breathing.", use: "Critical status" },
    { phrase: "I require helicopter assistance.", use: "Air medevac request" },
  ]},
  { category: "SAR Co-ordination", phrases: [
    { phrase: "I am proceeding to your assistance.", use: "Responding vessel" },
    { phrase: "I have sighted a survivor / life raft at position...", use: "Reporting survivor" },
    { phrase: "I have rescued ___ survivors.", use: "Reporting rescued persons" },
    { phrase: "Cancel my distress alert — emergency resolved.", use: "Cancelling distress" },
  ]},
];

const REGIONS = ["All Regions", ...Array.from(new Set(MRCC_DIRECTORY.map(m => m.region)))];

// ── SURVIVAL TIME TABLE (SOLAS/IMO based) ──
const SURVIVAL_DATA = [
  { tempC: 0,  tempF: 32, coldShockMin: "0.5-1", exhaustionHrs: "0.25-0.5", survivalHrs: "< 1",  risk: "CRITICAL" },
  { tempC: 2,  tempF: 36, coldShockMin: "0.5-1", exhaustionHrs: "0.5-1",   survivalHrs: "< 1.5", risk: "CRITICAL" },
  { tempC: 5,  tempF: 41, coldShockMin: "1-2",   exhaustionHrs: "1-2",     survivalHrs: "1-2",   risk: "CRITICAL" },
  { tempC: 10, tempF: 50, coldShockMin: "2-3",   exhaustionHrs: "2-4",     survivalHrs: "1-4",   risk: "HIGH" },
  { tempC: 15, tempF: 59, coldShockMin: "3-5",   exhaustionHrs: "4-8",     survivalHrs: "6-12",  risk: "HIGH" },
  { tempC: 20, tempF: 68, coldShockMin: "5-10",  exhaustionHrs: "12-24",   survivalHrs: "12+",   risk: "MEDIUM" },
  { tempC: 25, tempF: 77, coldShockMin: "10-20", exhaustionHrs: "24+",     survivalHrs: "24+",   risk: "LOW" },
  { tempC: 30, tempF: 86, coldShockMin: "20+",   exhaustionHrs: "48+",     survivalHrs: "48+",   risk: "LOW" },
];

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
function kmToNm(km) { return (km / 1.852).toFixed(1); }
function bearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180) - Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}
function detectRegion(lat, lon) {
  if (lat >= -50 && lat <= 50 && lon >= 60 && lon <= 180) return "Asia Pacific";
  if (lat >= 35 && lat <= 75 && lon >= -30 && lon <= 45) return "Europe";
  if (lat >= -60 && lat <= 75 && lon >= -170 && lon <= -30) return "Americas";
  return "Middle East & Africa";
}
function useCopyToClipboard() {
  const [copiedId, setCopiedId] = useState(null);
  const copy = (text, id) => { navigator.clipboard.writeText(text).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); }); };
  return { copy, copiedId };
}

// ─────────────────────────────────────────────
// SHARED MINI COMPONENTS
// ─────────────────────────────────────────────
const TAG = ({ children, color = "#dc2626", bg }) => (
  <span style={{ display:"inline-block", background: bg || color+"22", border:`1px solid ${color}66`, color, borderRadius:4, padding:"1px 7px", fontSize:10, fontWeight:700, marginRight:6, marginBottom:4 }}>{children}</span>
);
function CopyBtn({ text, id, copy, copiedId, small }) {
  return (
    <button onClick={() => copy(text, id)} style={{ background:"#1f2937", border:"1px solid #333", borderRadius:5, padding: small?"3px 8px":"5px 11px", color: copiedId===id?"#4ade80":"#94a3b8", fontFamily:"'IBM Plex Mono',monospace", fontSize:10, cursor:"pointer", flexShrink:0 }}>
      {copiedId===id ? "✓ COPIED" : "COPY"}
    </button>
  );
}
function Card({ children, style = {} }) {
  return <div style={{ background:"#111", border:"1px solid #1f1f1f", borderRadius:8, padding:"14px 16px", marginBottom:10, ...style }}>{children}</div>;
}
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20, paddingBottom:10, borderBottom:"1px solid #1f1f1f" }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <div>
        <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:2, textTransform:"uppercase" }}>{title}</div>
        {subtitle && <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{subtitle}</div>}
      </div>
    </div>
  );
}
const Input = ({ style={}, ...props }) => (
  <input style={{ width:"100%", background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:6, padding:"8px 12px", color:"#e5e5e5", fontFamily:"'IBM Plex Mono',monospace", fontSize:12, boxSizing:"border-box", outline:"none", ...style }} {...props} />
);
const Select = ({ style={}, ...props }) => (
  <select style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:6, padding:"7px 12px", color:"#e5e5e5", fontFamily:"'IBM Plex Mono',monospace", fontSize:12, outline:"none", cursor:"pointer", ...style }} {...props} />
);
function Btn({ children, onClick, color="#dc2626", style={} }) {
  return <button onClick={onClick} style={{ background:color, color:"#fff", border:"none", borderRadius:6, padding:"8px 16px", fontFamily:"'IBM Plex Mono',monospace", fontSize:11, fontWeight:700, letterSpacing:1, cursor:"pointer", ...style }}>{children}</button>;
}

// ─────────────────────────────────────────────
// SECTION: GPS CONTACTS + NEAREST PORT + WEATHER + PIRACY
// ─────────────────────────────────────────────
const OWM_API_KEY = "bd5e378503939ddaee76f12ad7a97608"; // free public demo key

function GpsSection({ portsDb }) {
  const [gpsStatus, setGpsStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [manualRegion, setManualRegion] = useState("All Regions");
  const [nearestPorts, setNearestPorts] = useState([]);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [piracyAlert, setPiracyAlert] = useState(null);
  const { copy, copiedId } = useCopyToClipboard();

  const activeRegion = coords ? detectRegion(coords.lat, coords.lon) : manualRegion;
  const filtered = activeRegion === "All Regions" ? MRCC_DIRECTORY.slice(0,6) : MRCC_DIRECTORY.filter(m => m.region === activeRegion).slice(0,6);

  const findNearestPorts = (lat, lon) => {
    const source = portsDb?.length > 0 ? portsDb.filter(p => p.lat && p.lon) : FALLBACK_PORTS;
    const withDist = source.map(p => ({
      name: p.name, lat: parseFloat(p.lat), lon: parseFloat(p.lon),
      distKm: haversineKm(lat, lon, parseFloat(p.lat), parseFloat(p.lon)),
    })).filter(p => !isNaN(p.distKm));
    withDist.sort((a, b) => a.distKm - b.distKm);
    setNearestPorts(withDist.slice(0, 5));
  };

  const checkPiracy = (lat, lon) => {
    const found = HIGH_RISK_AREAS.filter(a => lat >= a.latMin && lat <= a.latMax && lon >= a.lonMin && lon <= a.lonMax);
    setPiracyAlert(found.length > 0 ? found : null);
  };

  const fetchWeather = async (lat, lon) => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OWM_API_KEY}&units=metric`);
      const data = await res.json();
      if (data.cod === 200) setWeather(data);
      else setWeather({ error: data.message || "Weather unavailable" });
    } catch { setWeather({ error: "Network error" }); }
    setWeatherLoading(false);
  };

  const getGPS = () => {
    if (!navigator.geolocation) { setGpsStatus("error"); return; }
    setGpsStatus("loading");
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      setCoords({ lat, lon });
      setGpsStatus("success");
      findNearestPorts(lat, lon);
      fetchWeather(lat, lon);
      checkPiracy(lat, lon);
    }, () => setGpsStatus("error"));
  };

  const windDir = (deg) => {
    const dirs = ["N","NE","E","SE","S","SW","W","NW"];
    return dirs[Math.round(deg/45)%8];
  };

  return (
    <div>
      {/* Piracy Banner */}
      {piracyAlert && piracyAlert.map((a, i) => (
        <div key={i} style={{ background:"#1a0000", border:`2px solid ${a.color}`, borderRadius:8, padding:"12px 16px", marginBottom:12, display:"flex", gap:12, alignItems:"flex-start" }}>
          <span style={{ fontSize:22 }}>⚠️</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:a.color, marginBottom:4 }}>PIRACY / SECURITY ALERT — {a.name}</div>
            <div style={{ fontSize:11, color:"#ccc", marginBottom:4 }}>Risk: <strong style={{color:a.color}}>{a.risk}</strong> | Threat: {a.threat}</div>
            <div style={{ fontSize:11, color:"#888" }}>📋 {a.guidance}</div>
            <div style={{ fontSize:10, color:"#555", marginTop:4 }}>Source: {a.org}</div>
          </div>
        </div>
      ))}

      {/* GPS Controls */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <Btn onClick={getGPS} style={{ opacity: gpsStatus==="loading"?0.6:1 }}>
          {gpsStatus==="loading" ? "⌛ LOCATING..." : "📍 AUTO-DETECT POSITION"}
        </Btn>
        <span style={{ fontSize:11, color:"#555" }}>or select region:</span>
        <Select value={manualRegion} onChange={e => { setManualRegion(e.target.value); setCoords(null); }}>
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </Select>
      </div>

      {gpsStatus === "success" && coords && (
        <Card style={{ borderColor:"#16a34a", marginBottom:16 }}>
          <TAG color="#16a34a">✓ GPS</TAG>
          <span style={{ fontSize:12, color:"#4ade80" }}>
            {coords.lat.toFixed(4)}°, {coords.lon.toFixed(4)}° — Region: <strong>{detectRegion(coords.lat, coords.lon)}</strong>
          </span>
        </Card>
      )}
      {gpsStatus === "error" && (
        <Card style={{ borderColor:"#d97706", marginBottom:16 }}>
          <span style={{ fontSize:11, color:"#d97706" }}>⚠ GPS unavailable — select region manually.</span>
        </Card>
      )}

      {/* Weather Card */}
      {(weatherLoading || weather) && (
        <Card style={{ borderColor:"#0369a1", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#60a5fa", marginBottom:8, letterSpacing:1 }}>🌤 WEATHER AT POSITION</div>
          {weatherLoading ? (
            <div style={{ fontSize:11, color:"#555" }}>Fetching weather...</div>
          ) : weather?.error ? (
            <div style={{ fontSize:11, color:"#d97706" }}>⚠ {weather.error} — check API key</div>
          ) : weather && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:8 }}>
              {[
                { label:"Condition", val: weather.weather?.[0]?.description?.toUpperCase() },
                { label:"Temp", val: `${Math.round(weather.main?.temp)}°C` },
                { label:"Wind", val: `${Math.round(weather.wind?.speed * 1.944)} kts ${windDir(weather.wind?.deg)}` },
                { label:"Visibility", val: `${((weather.visibility||0)/1000).toFixed(1)} km` },
                { label:"Humidity", val: `${weather.main?.humidity}%` },
                { label:"Pressure", val: `${weather.main?.pressure} hPa` },
              ].map(({ label, val }) => (
                <div key={label} style={{ background:"#0a0a0a", borderRadius:6, padding:"8px 10px" }}>
                  <div style={{ fontSize:9, color:"#555", letterSpacing:1, marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#60a5fa" }}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Nearest Ports */}
      {nearestPorts.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#d97706", letterSpacing:1, marginBottom:10 }}>⚓ NEAREST PORTS / PLACE OF REFUGE</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
            {nearestPorts.map((p, i) => (
              <Card key={i} style={{ borderColor:"#2a1a00", padding:"10px 14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>#{i+1} {p.name}</div>
                    <div style={{ fontSize:11, color:"#d97706", marginTop:2 }}>{kmToNm(p.distKm)} nm</div>
                  </div>
                  <div style={{ fontSize:11, color:"#555", textAlign:"right" }}>
                    {bearing(coords.lat, coords.lon, p.lat, p.lon).toFixed(0)}° T
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* MRCC Cards */}
      <div style={{ fontSize:12, fontWeight:700, color:"#ef4444", letterSpacing:1, marginBottom:10 }}>🗼 NEAREST MRCC STATIONS</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
        {filtered.map((m, i) => (
          <Card key={i}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div><TAG>{m.country}</TAG><div style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"4px 0" }}>{m.name}</div></div>
              <CopyBtn text={`${m.name}\nPhone: ${m.phone}\nVHF: Ch.${m.vhf}\nEmail: ${m.email}`} id={`gps-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={{ fontSize:11, color:"#888", lineHeight:1.8 }}>
              <div>📻 VHF Ch.<strong style={{color:"#ef4444"}}>{m.vhf}</strong> | {m.callsign}</div>
              <div>📞 {m.phone}</div>
              <div>✉ {m.email}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: MRCC FULL DIRECTORY
// ─────────────────────────────────────────────
function MrccSection() {
  const [filter, setFilter] = useState("All Regions");
  const [search, setSearch] = useState("");
  const { copy, copiedId } = useCopyToClipboard();
  const filtered = MRCC_DIRECTORY.filter(m => {
    const r = filter === "All Regions" || m.region === filter;
    const s = !search || m.country.toLowerCase().includes(search.toLowerCase()) || m.name.toLowerCase().includes(search.toLowerCase());
    return r && s;
  });
  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
        <Input placeholder="Search country / name..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:200 }} />
        <Select value={filter} onChange={e => setFilter(e.target.value)}>
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </Select>
        <span style={{ fontSize:11, color:"#555", alignSelf:"center" }}>{filtered.length} stations</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
        {filtered.map((m, i) => (
          <Card key={i}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div><TAG>{m.region}</TAG><TAG color="#2563eb">{m.country}</TAG><div style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"4px 0" }}>{m.name}</div></div>
              <CopyBtn text={`${m.name}\nPhone: ${m.phone}\nVHF: Ch.${m.vhf}\nEmail: ${m.email}`} id={`mrcc-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={{ fontSize:11, color:"#888", lineHeight:1.8 }}>
              <div>📻 VHF Ch.<strong style={{color:"#ef4444"}}>{m.vhf}</strong> | {m.callsign}</div>
              <div>📞 {m.phone}</div>
              <div>✉ {m.email}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: TMAS + SURVIVAL TIME + MEDICAL TRIAGE
// ─────────────────────────────────────────────
function TmasSection() {
  const [subTab, setSubTab] = useState("tmas");
  const [waterTemp, setWaterTemp] = useState("");
  const [unit, setUnit] = useState("C");
  const [checkedMedical, setCheckedMedical] = useState({});
  const { copy, copiedId } = useCopyToClipboard();

  const tempC = unit === "C" ? parseFloat(waterTemp) : (parseFloat(waterTemp) - 32) * 5/9;
  const survivalRow = SURVIVAL_DATA.reduce((best, row) => Math.abs(row.tempC - tempC) < Math.abs(best.tempC - tempC) ? row : best, SURVIVAL_DATA[0]);
  const riskColor = { CRITICAL:"#dc2626", HIGH:"#d97706", MEDIUM:"#ca8a04", LOW:"#16a34a" }[survivalRow?.risk] || "#888";

  const toggleMedical = (catIdx, stepIdx) => {
    const k = `${catIdx}-${stepIdx}`;
    setCheckedMedical(p => ({ ...p, [k]: !p[k] }));
  };

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["tmas","🏥 TMAS Directory"],["survival","🌊 Survival Time"],["triage","🩺 Medical Triage"]].map(([k,l]) => (
          <Btn key={k} onClick={() => setSubTab(k)} color={subTab===k?"#dc2626":"#1f1f1f"} style={{ border:`1px solid ${subTab===k?"#ef4444":"#333"}`, fontSize:11 }}>{l}</Btn>
        ))}
      </div>

      {subTab === "tmas" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
          {TMAS_DIRECTORY.map((t, i) => (
            <Card key={i} style={{ borderColor:"#1f2f1f" }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div><TAG color="#16a34a">TMAS</TAG><TAG color="#2563eb">{t.region}</TAG><div style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"4px 0" }}>{t.name}</div></div>
                <CopyBtn text={`${t.name}\nPhone: ${t.phone}\nCoverage: ${t.coverage}`} id={`tmas-${i}`} copy={copy} copiedId={copiedId} />
              </div>
              <div style={{ fontSize:11, color:"#888", lineHeight:1.8 }}>
                <div>📞 <strong style={{color:"#4ade80"}}>{t.phone}</strong> — {t.available}</div>
                <div>🌐 {t.coverage}</div>
                <div>✉ {t.email}</div>
                <div style={{ color:"#555", marginTop:4 }}>ℹ {t.notes}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab === "survival" && (
        <div>
          <Card style={{ borderColor:"#1a0000", marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#ef4444", fontWeight:700, marginBottom:12, letterSpacing:1 }}>🌡 WATER TEMPERATURE INPUT</div>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <Input placeholder="Enter water temperature..." value={waterTemp} onChange={e => setWaterTemp(e.target.value)} style={{ width:200 }} type="number" />
              <Select value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="C">°C</option>
                <option value="F">°F</option>
              </Select>
            </div>
            {waterTemp && !isNaN(tempC) && (
              <div style={{ marginTop:16, background:"#0a0a0a", borderRadius:8, padding:16, borderLeft:`4px solid ${riskColor}` }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:8 }}>ESTIMATED SURVIVAL DATA FOR {tempC.toFixed(1)}°C ({(tempC*9/5+32).toFixed(0)}°F)</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                  {[
                    { label:"Risk Level", val: survivalRow.risk, color: riskColor },
                    { label:"Cold Shock Phase", val: `${survivalRow.coldShockMin} min` },
                    { label:"Swimming Failure", val: `${survivalRow.exhaustionHrs} hrs` },
                    { label:"Est. Survival Time", val: survivalRow.survivalHrs, color:"#ef4444" },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ background:"#111", borderRadius:6, padding:"10px 12px" }}>
                      <div style={{ fontSize:9, color:"#555", letterSpacing:1, marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:700, color: color||"#e5e5e5" }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:10, color:"#555", marginTop:12, lineHeight:1.7 }}>
                  ⚠ These are average estimates for average adults without immersion suit. <strong style={{color:"#d97706"}}>Immersion suit extends survival 3-5x.</strong> Children, elderly, low body fat = shorter times. Activate SART and flares immediately.
                </div>
              </div>
            )}
          </Card>

          {/* Full reference table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid #1f1f1f" }}>
                  {["Temp °C","Temp °F","Cold Shock","Swim Failure","Est. Survival","Risk"].map(h => (
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:"#555", fontSize:10, letterSpacing:1, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SURVIVAL_DATA.map((row, i) => {
                  const rc = { CRITICAL:"#dc2626", HIGH:"#d97706", MEDIUM:"#ca8a04", LOW:"#16a34a" }[row.risk];
                  return (
                    <tr key={i} style={{ borderBottom:"1px solid #111" }}>
                      <td style={{ padding:"8px 12px", color:"#60a5fa", fontWeight:700 }}>{row.tempC}°C</td>
                      <td style={{ padding:"8px 12px", color:"#888" }}>{row.tempF}°F</td>
                      <td style={{ padding:"8px 12px", color:"#e5e5e5" }}>{row.coldShockMin} min</td>
                      <td style={{ padding:"8px 12px", color:"#e5e5e5" }}>{row.exhaustionHrs} hrs</td>
                      <td style={{ padding:"8px 12px", color:"#ef4444", fontWeight:700 }}>{row.survivalHrs}</td>
                      <td style={{ padding:"8px 12px" }}><TAG color={rc}>{row.risk}</TAG></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === "triage" && (
        <div>
          {MEDICAL_TRIAGE.map((cat, ci) => (
            <Card key={ci} style={{ borderColor: cat.color+"44", marginBottom:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <span style={{ fontSize:22 }}>{cat.icon}</span>
                <div style={{ fontSize:13, fontWeight:700, color:cat.color, letterSpacing:1 }}>{cat.category.toUpperCase()}</div>
              </div>
              {cat.steps.map((step, si) => {
                const k = `${ci}-${si}`;
                const done = !!checkedMedical[k];
                return (
                  <div key={si} onClick={() => toggleMedical(ci, si)} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"7px 0", borderBottom:"1px solid #161616", cursor:"pointer", opacity: done ? 0.5 : 1 }}>
                    <div style={{ width:18, height:18, borderRadius:3, border:`1.5px solid ${done?"#16a34a":cat.color}`, background: done?"#16a34a":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                      {done && <span style={{ fontSize:10, color:"#fff" }}>✓</span>}
                    </div>
                    <div style={{ fontSize:11, color: done?"#555":"#ccc", textDecoration: done?"line-through":"none", lineHeight:1.5 }}>{step}</div>
                  </div>
                );
              })}
              {cat.notes && <div style={{ fontSize:10, color:"#555", marginTop:10, padding:"8px 10px", background:"#0a0a0a", borderRadius:6, lineHeight:1.7 }}>💡 {cat.notes}</div>}
              <Btn onClick={() => { const newC = {...checkedMedical}; cat.steps.forEach((_, si) => { delete newC[`${ci}-${si}`]; }); setCheckedMedical(newC); }} color="#1f1f1f" style={{ border:"1px solid #333", fontSize:10, marginTop:10, padding:"5px 12px" }}>RESET</Btn>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: DPA + MUSTER LIST
// ─────────────────────────────────────────────
function DpaSection() {
  const [subTab, setSubTab] = useState("dpa");
  const { copy, copiedId } = useCopyToClipboard();

  // DPA contacts
  const loadDpa = () => { try { return JSON.parse(localStorage.getItem("emergency_dpa_contacts")) || []; } catch { return []; } };
  const [contacts, setContacts] = useState(loadDpa);
  const [form, setForm] = useState({ company:"", name:"", role:"DPA", phone:"", mobile:"", email:"", notes:"" });
  const [editing, setEditing] = useState(null);
  const saveDpa = (list) => { setContacts(list); localStorage.setItem("emergency_dpa_contacts", JSON.stringify(list)); };
  const handleAdd = () => {
    if (!form.company || !form.phone) return;
    if (editing !== null) { saveDpa(contacts.map((c,i) => i===editing ? form : c)); setEditing(null); }
    else saveDpa([...contacts, form]);
    setForm({ company:"", name:"", role:"DPA", phone:"", mobile:"", email:"", notes:"" });
  };

  // Muster list
  const loadMuster = () => { try { return JSON.parse(localStorage.getItem("emergency_muster")) || { station:"", lifeboat:"", duties:"", immSuit:"", flareLocation:"", epirb:"", additionalNotes:"" }; } catch { return { station:"", lifeboat:"", duties:"", immSuit:"", flareLocation:"", epirb:"", additionalNotes:"" }; } };
  const [muster, setMuster] = useState(loadMuster);
  const saveMuster = (m) => { setMuster(m); localStorage.setItem("emergency_muster", JSON.stringify(m)); };

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["dpa","🏢 DPA Contacts"],["muster","📋 Muster List"]].map(([k,l]) => (
          <Btn key={k} onClick={() => setSubTab(k)} color={subTab===k?"#dc2626":"#1f1f1f"} style={{ border:`1px solid ${subTab===k?"#ef4444":"#333"}`, fontSize:11 }}>{l}</Btn>
        ))}
      </div>

      {subTab === "dpa" && (
        <div>
          <div style={{ background:"#0d0d0d", border:"1px dashed #333", borderRadius:8, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#ef4444", marginBottom:12, letterSpacing:1 }}>{editing!==null?"✏ EDIT CONTACT":"+ ADD DPA / COMPANY CONTACT"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
              {[
                { k:"company", l:"COMPANY NAME *", ph:"Shipping Co. Ltd" },
                { k:"name", l:"CONTACT NAME", ph:"Capt. John Smith" },
                { k:"phone", l:"OFFICE PHONE *", ph:"+65 XXXX XXXX" },
                { k:"mobile", l:"MOBILE / 24H", ph:"+65 9XXX XXXX" },
                { k:"email", l:"EMAIL", ph:"dpa@company.com" },
                { k:"notes", l:"NOTES", ph:"After-hours, backup..." },
              ].map(f => (
                <div key={f.k}>
                  <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>{f.l}</div>
                  <Input value={form[f.k]} onChange={e => setForm({...form, [f.k]:e.target.value})} placeholder={f.ph} />
                </div>
              ))}
              <div>
                <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>ROLE</div>
                <Select value={form.role} onChange={e => setForm({...form, role:e.target.value})} style={{ width:"100%" }}>
                  {["DPA","Deputy DPA","Fleet Manager","Technical Superintendent","Operations Manager","Emergency Coordinator","Other"].map(r => <option key={r}>{r}</option>)}
                </Select>
              </div>
            </div>
            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <Btn onClick={handleAdd}>{editing!==null?"UPDATE":"SAVE CONTACT"}</Btn>
              {editing!==null && <Btn onClick={() => { setEditing(null); setForm({ company:"",name:"",role:"DPA",phone:"",mobile:"",email:"",notes:"" }); }} color="#374151">CANCEL</Btn>}
            </div>
          </div>
          {contacts.length === 0 ? (
            <div style={{ textAlign:"center", color:"#444", fontSize:12, padding:30 }}>No company contacts saved. Add your DPA above.</div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
              {contacts.map((c, i) => (
                <Card key={i} style={{ borderColor:"#2a1a00" }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <div><TAG color="#d97706">{c.role}</TAG><div style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"4px 0" }}>{c.company}</div>{c.name && <div style={{ fontSize:11, color:"#aaa" }}>{c.name}</div>}</div>
                    <CopyBtn text={`${c.company}\n${c.name}\nPhone: ${c.phone}\nMobile: ${c.mobile}\nEmail: ${c.email}`} id={`dpa-${i}`} copy={copy} copiedId={copiedId} />
                  </div>
                  <div style={{ fontSize:11, color:"#888", lineHeight:1.8, marginTop:8 }}>
                    {c.phone && <div>📞 {c.phone}</div>}
                    {c.mobile && <div>📱 <strong style={{color:"#d97706"}}>{c.mobile}</strong> (24h)</div>}
                    {c.email && <div>✉ {c.email}</div>}
                    {c.notes && <div style={{ color:"#555" }}>ℹ {c.notes}</div>}
                  </div>
                  <div style={{ marginTop:8, display:"flex", gap:6 }}>
                    <Btn onClick={() => { setForm(c); setEditing(i); setSubTab("dpa"); }} color="#1f2937" style={{ fontSize:10, padding:"4px 10px" }}>EDIT</Btn>
                    <Btn onClick={() => { if(window.confirm("Delete?")) saveDpa(contacts.filter((_,idx)=>idx!==i)); }} color="#1f0000" style={{ color:"#ef4444", fontSize:10, padding:"4px 10px" }}>DELETE</Btn>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === "muster" && (
        <div>
          <Card style={{ borderColor:"#1a2a1a", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#4ade80", marginBottom:16, letterSpacing:1 }}>📋 MY MUSTER STATION & DUTIES</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 }}>
              {[
                { k:"station", l:"MUSTER STATION", ph:"Lifeboat Station No. 1 — Port Side" },
                { k:"lifeboat", l:"LIFEBOAT / RAFT NUMBER", ph:"Lifeboat No. 1 / LifeRaft No. 3" },
                { k:"immSuit", l:"IMMERSION SUIT LOCATION", ph:"Cabin C-12 / Muster Station locker" },
                { k:"flareLocation", l:"PYROTECHNICS LOCATION", ph:"Lifeboat No.1 equipment bag" },
                { k:"epirb", l:"EPIRB LOCATION", ph:"Bridge wing — port side bracket" },
              ].map(f => (
                <div key={f.k}>
                  <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>{f.l}</div>
                  <Input value={muster[f.k]||""} onChange={e => saveMuster({...muster, [f.k]:e.target.value})} placeholder={f.ph} />
                </div>
              ))}
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>MY EMERGENCY DUTIES</div>
                <textarea value={muster.duties||""} onChange={e => saveMuster({...muster, duties:e.target.value})}
                  placeholder="e.g. Headcount at muster, launch lifeboat, operate EPIRB..."
                  style={{ width:"100%", background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:6, padding:"8px 12px", color:"#e5e5e5", fontFamily:"'IBM Plex Mono',monospace", fontSize:12, minHeight:80, resize:"vertical", outline:"none", boxSizing:"border-box" }} />
              </div>
              <div style={{ gridColumn:"1/-1" }}>
                <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>ADDITIONAL NOTES</div>
                <textarea value={muster.additionalNotes||""} onChange={e => saveMuster({...muster, additionalNotes:e.target.value})}
                  placeholder="e.g. Special equipment I'm responsible for, medical conditions, etc."
                  style={{ width:"100%", background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:6, padding:"8px 12px", color:"#e5e5e5", fontFamily:"'IBM Plex Mono',monospace", fontSize:12, minHeight:60, resize:"vertical", outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <CopyBtn text={`MUSTER CARD\nStation: ${muster.station}\nLifeboat: ${muster.lifeboat}\nImmersion Suit: ${muster.immSuit}\nDuties: ${muster.duties}\nEPIRB: ${muster.epirb}`} id="muster-copy" copy={copy} copiedId={copiedId} />
              <span style={{ fontSize:10, color:"#555", alignSelf:"center" }}>Auto-saved to device</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: ITF DIRECTORY
// ─────────────────────────────────────────────
function ItfSection() {
  const [country, setCountry] = useState("All Countries");
  const [search, setSearch] = useState("");
  const { copy, copiedId } = useCopyToClipboard();
  const countries = ["All Countries", ...Array.from(new Set(ITF_INSPECTORS.map(i => i.country))).sort()];
  const filtered = ITF_INSPECTORS.filter(i => {
    const cm = country === "All Countries" || i.country === country;
    const sm = !search || i.port.toLowerCase().includes(search.toLowerCase()) || i.country.toLowerCase().includes(search.toLowerCase());
    return cm && sm;
  });
  return (
    <div>
      <Card style={{ borderColor:"#1a2a3a", marginBottom:16 }}>
        <div style={{ fontSize:11, color:"#60a5fa", fontWeight:700, marginBottom:4 }}>ℹ ITF INFORMATION</div>
        <div style={{ fontSize:11, color:"#666", lineHeight:1.7 }}>If you are a seafarer experiencing wage theft, unsafe conditions, abandonment, or document withholding — contact the nearest ITF inspector. Inspections are free and confidential.</div>
      </Card>
      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:16 }}>
        <Input placeholder="Search port / country..." value={search} onChange={e => setSearch(e.target.value)} style={{ width:200 }} />
        <Select value={country} onChange={e => setCountry(e.target.value)}>
          {countries.map(c => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
        {filtered.map((itf, i) => (
          <Card key={i} style={{ borderColor:"#001a2f" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div><TAG color="#2563eb">{itf.country}</TAG><div style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"4px 0" }}>{itf.name}</div><div style={{ fontSize:11, color:"#666" }}>⚓ {itf.port}</div></div>
              <CopyBtn text={`${itf.name}\n${itf.phone}\n${itf.email}`} id={`itf-${i}`} copy={copy} copiedId={copiedId} />
            </div>
            <div style={{ fontSize:11, color:"#888", lineHeight:1.8, marginTop:8 }}>
              <div>📞 {itf.phone}</div><div>✉ {itf.email}</div><div style={{color:"#555"}}>📍 {itf.address}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: FLAG STATE + PSC REQUIREMENTS
// ─────────────────────────────────────────────
function FlagSection() {
  const [subTab, setSubTab] = useState("contacts");
  const [search, setSearch] = useState("");
  const { copy, copiedId } = useCopyToClipboard();
  const filteredFlags = FLAG_STATES.filter(f => !search || f.flag.toLowerCase().includes(search.toLowerCase()));
  const filteredPsc = PSC_DEFICIENCIES.filter(f => !search || f.flag.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        {[["contacts","🏴 Flag Contacts"],["psc","🔍 PSC Requirements"]].map(([k,l]) => (
          <Btn key={k} onClick={() => setSubTab(k)} color={subTab===k?"#dc2626":"#1f1f1f"} style={{ border:`1px solid ${subTab===k?"#ef4444":"#333"}`, fontSize:11 }}>{l}</Btn>
        ))}
      </div>
      <Input placeholder="Search flag state..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:280, marginBottom:16 }} />

      {subTab === "contacts" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:10 }}>
          {filteredFlags.map((f, i) => (
            <Card key={i}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div><TAG>🏴 {f.flag}</TAG><div style={{ fontSize:13, fontWeight:700, color:"#fff", margin:"4px 0" }}>{f.authority}</div></div>
                <CopyBtn text={`${f.flag}\n${f.authority}\nPhone: ${f.phone}\nEmergency: ${f.emergency}\nEmail: ${f.email}`} id={`flag-${i}`} copy={copy} copiedId={copiedId} />
              </div>
              <div style={{ fontSize:11, color:"#888", lineHeight:1.8, marginTop:4 }}>
                <div>📞 {f.phone}</div>
                <div>🚨 Emergency: <strong style={{color:"#ef4444"}}>{f.emergency}</strong></div>
                <div>✉ {f.email}</div>
                <div>🌐 {f.website}</div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {subTab === "psc" && (
        <div>
          <Card style={{ borderColor:"#1a2a3a", marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#60a5fa", fontWeight:700, marginBottom:4 }}>ℹ PSC INSPECTION READINESS</div>
            <div style={{ fontSize:11, color:"#666", lineHeight:1.7 }}>Common PSC deficiency areas by flag state. Use this to prepare before port entry. Always verify with current Tokyo/Paris MOU databases.</div>
          </Card>
          {filteredPsc.map((p, i) => {
            const ratingColor = { Low:"#16a34a", "Low-Medium":"#ca8a04", Medium:"#d97706", High:"#dc2626" }[p.psrRating] || "#888";
            return (
              <Card key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <TAG>🏴 {p.flag}</TAG>
                    <TAG color={ratingColor}>PSR: {p.psrRating}</TAG>
                    <TAG color="#555">{p.memoranda}</TAG>
                  </div>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color:"#888", marginBottom:8, letterSpacing:1 }}>TOP DEFICIENCY AREAS</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                  {p.topDeficiencies.map((d, di) => (
                    <div key={di} style={{ background:"#1a0000", border:"1px solid #dc262633", borderRadius:4, padding:"3px 10px", fontSize:11, color:"#ef4444" }}>⚠ {d}</div>
                  ))}
                </div>
                <div style={{ fontSize:11, color:"#555", padding:"8px 10px", background:"#0a0a0a", borderRadius:6 }}>💡 {p.notes}</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: DISTRESS + GMDSS FREQUENCIES
// ─────────────────────────────────────────────
function DistressSection() {
  const [subTab, setSubTab] = useState("messages");
  const [active, setActive] = useState("MAYDAY");
  const [fields, setFields] = useState({});
  const { copy, copiedId } = useCopyToClipboard();
  const tmpl = DISTRESS_TEMPLATES[active];
  const generated = tmpl.template(fields[active] || {});
  const setField = (key, val) => setFields(f => ({...f, [active]: {...(f[active]||{}), [key]:val}}));

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["messages","📡 Distress Messages"],["gmdss","📻 GMDSS Frequencies"]].map(([k,l]) => (
          <Btn key={k} onClick={() => setSubTab(k)} color={subTab===k?"#dc2626":"#1f1f1f"} style={{ border:`1px solid ${subTab===k?"#ef4444":"#333"}`, fontSize:11 }}>{l}</Btn>
        ))}
      </div>

      {subTab === "messages" && (
        <div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
            {Object.entries(DISTRESS_TEMPLATES).map(([key, t]) => (
              <Btn key={key} onClick={() => setActive(key)} color={active===key ? t.color : "#1f1f1f"} style={{ border:`1px solid ${active===key?t.color:"#333"}`, fontSize:11 }}>{key.replace("_"," ")}</Btn>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:16 }}>
            <div>
              <div style={{ fontSize:11, color:"#666", marginBottom:12, letterSpacing:1 }}>FILL IN VESSEL DETAILS</div>
              {tmpl.fields.map(f => (
                <div key={f.id}>
                  <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4, marginTop:8 }}>{f.label}</div>
                  <Input placeholder={f.placeholder} value={(fields[active]||{})[f.id]||""} onChange={e => setField(f.id, e.target.value)} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <div style={{ fontSize:11, color:"#666", letterSpacing:1 }}>GENERATED MESSAGE</div>
                <CopyBtn text={generated} id="distress-msg" copy={copy} copiedId={copiedId} />
              </div>
              <textarea readOnly value={generated} style={{ width:"100%", background:"#050505", border:"1px solid #dc2626", borderRadius:6, padding:14, color:"#ef4444", fontFamily:"'IBM Plex Mono',monospace", fontSize:12, lineHeight:1.8, resize:"vertical", minHeight:180, outline:"none", boxSizing:"border-box" }} />
              <div style={{ fontSize:10, color:"#555", marginTop:6 }}>⚠ Reference template only. Always use correct vessel info. Transmit on VHF Ch.16 / DSC.</div>
            </div>
          </div>
        </div>
      )}

      {subTab === "gmdss" && (
        <div>
          <Card style={{ borderColor:"#1a1a00", marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#d97706", fontWeight:700, marginBottom:4 }}>⚠ GMDSS WATCHKEEPING REMINDER</div>
            <div style={{ fontSize:11, color:"#666", lineHeight:1.7 }}>Maintain continuous watch on VHF Ch.16 and DSC Ch.70 at all times. MF 2182 kHz silence periods: :00-:03 and :30-:33 of each hour. NAVTEX receiver must be on and operational.</div>
          </Card>
          {["VHF","MF","HF","HF DSC","NAVTEX","SAT","RADAR"].map(band => {
            const freqs = GMDSS_FREQUENCIES.filter(f => f.band === band);
            if (!freqs.length) return null;
            return (
              <div key={band} style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#ef4444", letterSpacing:2, marginBottom:10, paddingBottom:6, borderBottom:"1px solid #1f1f1f" }}>{band} BAND</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:8 }}>
                  {freqs.map((f, i) => (
                    <Card key={i} style={{ borderColor: f.type==="distress"?"#dc262633":"#16a34a33", padding:"10px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <TAG color={f.type==="distress"?"#dc2626":"#16a34a"}>{f.type.toUpperCase()}</TAG>
                          <div style={{ fontSize:13, fontWeight:700, color: f.type==="distress"?"#ef4444":"#4ade80", margin:"4px 0" }}>{f.freq}</div>
                          <div style={{ fontSize:11, color:"#aaa" }}>{f.use}</div>
                        </div>
                        <CopyBtn text={`${f.freq}\n${f.use}`} id={`gmdss-${i}`} copy={copy} copiedId={copiedId} small />
                      </div>
                      <div style={{ fontSize:10, color:"#555", marginTop:6 }}>ℹ {f.notes}</div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: SIGNALS + CHECKLISTS + TIMERS
// ─────────────────────────────────────────────
function SignalsSection() {
  const [subTab, setSubTab] = useState("checklist");
  const [activeChecklist, setActiveChecklist] = useState("fire");
  const [checked, setChecked] = useState({});
  const [timers, setTimers] = useState({});
  const intervalRefs = useRef({});

  const toggleStep = (clId, stepIdx) => {
    const k = `${clId}-${stepIdx}`;
    setChecked(p => ({...p, [k]: !p[k]}));
  };
  const resetChecklist = (clId) => {
    const newC = {...checked};
    EMERGENCY_CHECKLISTS.find(c=>c.id===clId)?.steps.forEach((_,i)=>{ delete newC[`${clId}-${i}`]; });
    setChecked(newC);
  };
  const completedCount = (clId) => EMERGENCY_CHECKLISTS.find(c=>c.id===clId)?.steps.filter((_,i)=>checked[`${clId}-${i}`]).length || 0;

  // Timer logic
  const startTimer = (id) => {
    if (intervalRefs.current[id]) return;
    setTimers(p => ({...p, [id]: { running:true, elapsed: p[id]?.elapsed||0 }}));
    const startTime = Date.now() - ((timers[id]?.elapsed||0)*1000);
    intervalRefs.current[id] = setInterval(() => {
      setTimers(p => ({...p, [id]: { running:true, elapsed: Math.floor((Date.now()-startTime)/1000) }}));
    }, 1000);
  };
  const stopTimer = (id) => {
    clearInterval(intervalRefs.current[id]); delete intervalRefs.current[id];
    setTimers(p => ({...p, [id]: {...p[id], running:false}}));
  };
  const resetTimer = (id) => {
    clearInterval(intervalRefs.current[id]); delete intervalRefs.current[id];
    setTimers(p => ({...p, [id]: { running:false, elapsed:0 }}));
  };
  const fmtTime = (secs) => {
    const h = Math.floor(secs/3600), m = Math.floor((secs%3600)/60), s = secs%60;
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };
  useEffect(() => () => Object.values(intervalRefs.current).forEach(clearInterval), []);

  const EMERGENCY_TIMERS = [
    { id:"mob", label:"MOB TIMER", icon:"🧑‍🦯", color:"#7c3aed", desc:"Time since person entered water — critical for survival estimate" },
    { id:"fire", label:"FIRE RESPONSE", icon:"🔥", color:"#dc2626", desc:"Time since fire detected — track response duration" },
    { id:"abandon", label:"ABANDON SHIP", icon:"🆘", color:"#b45309", desc:"Time since abandon ship signal — track evacuation duration" },
    { id:"medical", label:"MEDICAL RESPONSE", icon:"🏥", color:"#059669", desc:"Time since medical emergency onset — critical for MEDEVAC ETA" },
  ];

  const currentCl = EMERGENCY_CHECKLISTS.find(c => c.id === activeChecklist);

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["checklist","✅ Emergency Checklists"],["timers","⏱ Emergency Timers"],["signals","🚨 Signal Reference"]].map(([k,l]) => (
          <Btn key={k} onClick={() => setSubTab(k)} color={subTab===k?"#dc2626":"#1f1f1f"} style={{ border:`1px solid ${subTab===k?"#ef4444":"#333"}`, fontSize:11 }}>{l}</Btn>
        ))}
      </div>

      {subTab === "checklist" && (
        <div>
          {/* Checklist type selector */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
            {EMERGENCY_CHECKLISTS.map(cl => {
              const done = completedCount(cl.id);
              const total = cl.steps.length;
              return (
                <button key={cl.id} onClick={() => setActiveChecklist(cl.id)} style={{ background: activeChecklist===cl.id ? cl.color+"22" : "#111", border:`1.5px solid ${activeChecklist===cl.id ? cl.color : "#333"}`, borderRadius:8, padding:"8px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:16 }}>{cl.icon}</span>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:11, fontWeight:700, color: activeChecklist===cl.id ? cl.color : "#aaa" }}>{cl.label}</div>
                    <div style={{ fontSize:10, color:"#555" }}>{done}/{total} steps</div>
                  </div>
                </button>
              );
            })}
          </div>

          {currentCl && (
            <div>
              {/* Progress bar */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:currentCl.color, letterSpacing:1 }}>{currentCl.icon} {currentCl.label.toUpperCase()} CHECKLIST</div>
                  <div style={{ fontSize:11, color:"#555" }}>{completedCount(currentCl.id)}/{currentCl.steps.length}</div>
                </div>
                <div style={{ height:4, background:"#1f1f1f", borderRadius:4, overflow:"hidden" }}>
                  <div style={{ height:"100%", background:currentCl.color, borderRadius:4, width:`${(completedCount(currentCl.id)/currentCl.steps.length)*100}%`, transition:"width 0.3s" }} />
                </div>
              </div>

              {currentCl.steps.map((step, si) => {
                const k = `${currentCl.id}-${si}`;
                const done = !!checked[k];
                return (
                  <div key={si} onClick={() => toggleStep(currentCl.id, si)} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 12px", background: done?"#0a0a0a":"#111", borderRadius:7, marginBottom:6, cursor:"pointer", border:`1px solid ${done?"#1f1f1f":"#1a1a1a"}`, transition:"all 0.15s", opacity: done?0.6:1 }}>
                    <div style={{ width:22, height:22, borderRadius:4, border:`2px solid ${done?"#16a34a":currentCl.color}`, background:done?"#16a34a":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      {done && <span style={{ fontSize:12, color:"#fff", fontWeight:700 }}>✓</span>}
                      {!done && <span style={{ fontSize:10, color:currentCl.color, fontWeight:700 }}>{si+1}</span>}
                    </div>
                    <div style={{ fontSize:12, color: done?"#555":"#e5e5e5", textDecoration: done?"line-through":"none", lineHeight:1.6, flex:1 }}>{step}</div>
                  </div>
                );
              })}
              <Btn onClick={() => resetChecklist(currentCl.id)} color="#1f2937" style={{ marginTop:12, border:"1px solid #333", fontSize:11 }}>🔄 RESET CHECKLIST</Btn>
            </div>
          )}
        </div>
      )}

      {subTab === "timers" && (
        <div>
          <Card style={{ borderColor:"#1a1a00", marginBottom:16 }}>
            <div style={{ fontSize:11, color:"#d97706", fontWeight:700, marginBottom:4 }}>⚠ IMPORTANT</div>
            <div style={{ fontSize:11, color:"#666", lineHeight:1.7 }}>These timers help track response duration. For MOB: cross-reference with Survival Time Calculator in TMAS section to estimate remaining survival window based on water temperature.</div>
          </Card>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:12 }}>
            {EMERGENCY_TIMERS.map(t => {
              const tState = timers[t.id] || { running:false, elapsed:0 };
              return (
                <Card key={t.id} style={{ borderColor: t.color+"44" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:20 }}>{t.icon}</span>
                    <div style={{ fontSize:12, fontWeight:700, color:t.color, letterSpacing:1 }}>{t.label}</div>
                  </div>
                  <div style={{ fontSize:11, color:"#555", marginBottom:14, lineHeight:1.5 }}>{t.desc}</div>
                  <div style={{ textAlign:"center", fontSize:36, fontWeight:900, color: tState.running ? t.color : "#333", fontFamily:"'IBM Plex Mono',monospace", marginBottom:14, letterSpacing:4 }}>
                    {fmtTime(tState.elapsed)}
                  </div>
                  <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                    {!tState.running ? (
                      <Btn onClick={() => startTimer(t.id)} color={t.color} style={{ fontSize:12 }}>▶ START</Btn>
                    ) : (
                      <Btn onClick={() => stopTimer(t.id)} color="#374151" style={{ fontSize:12 }}>⏸ PAUSE</Btn>
                    )}
                    <Btn onClick={() => resetTimer(t.id)} color="#1f1f1f" style={{ border:"1px solid #333", fontSize:12 }}>↺ RESET</Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "signals" && (
        <div>
          {EMERGENCY_SIGNALS.map(cat => (
            <div key={cat.category} style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#ef4444", letterSpacing:2, marginBottom:10, paddingBottom:6, borderBottom:"1px solid #1f1f1f" }}>{cat.category.toUpperCase()}</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:8 }}>
                {cat.signals.map((sig, i) => (
                  <Card key={i} style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                    <span style={{ fontSize:26, flexShrink:0 }}>{sig.icon}</span>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:4 }}>{sig.name}</div>
                      <div style={{ fontSize:11, color:"#888", lineHeight:1.5, marginBottom:4 }}>{sig.description}</div>
                      <TAG color="#2563eb" style={{ fontSize:9 }}>{sig.regulation}</TAG>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION: PHRASEBOOK + INCIDENT LOG
// ─────────────────────────────────────────────
function PhrasebookSection() {
  const [subTab, setSubTab] = useState("phrases");
  const [activeCategory, setActiveCategory] = useState(PHRASEBOOK[0].category);
  const { copy, copiedId } = useCopyToClipboard();

  // Incident log
  const loadLog = () => { try { return JSON.parse(localStorage.getItem("emergency_incident_log")) || []; } catch { return []; } };
  const [log, setLog] = useState(loadLog);
  const [logEntry, setLogEntry] = useState("");
  const [incidentName, setIncidentName] = useState("");
  const saveLog = (l) => { setLog(l); localStorage.setItem("emergency_incident_log", JSON.stringify(l)); };

  const addEntry = () => {
    if (!logEntry.trim()) return;
    const now = new Date();
    const utcStr = now.toISOString().replace("T", " ").substring(0, 19) + " UTC";
    const entry = { id: Date.now(), time: utcStr, local: now.toLocaleTimeString(), text: logEntry.trim(), incident: incidentName || "General" };
    saveLog([entry, ...log]);
    setLogEntry("");
  };

  const exportLog = () => {
    const txt = `INCIDENT LOG — ${incidentName || "General"}\nGenerated: ${new Date().toISOString()}\n\n` + log.map(e => `[${e.time}] ${e.incident} | ${e.text}`).join("\n");
    const blob = new Blob([txt], { type:"text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "incident_log.txt"; a.click();
  };

  const current = PHRASEBOOK.find(p => p.category === activeCategory);

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["phrases","💬 Phrasebook"],["log","📝 Incident Log"]].map(([k,l]) => (
          <Btn key={k} onClick={() => setSubTab(k)} color={subTab===k?"#dc2626":"#1f1f1f"} style={{ border:`1px solid ${subTab===k?"#ef4444":"#333"}`, fontSize:11 }}>{l}</Btn>
        ))}
      </div>

      {subTab === "phrases" && (
        <div>
          <div style={{ display:"flex", overflowX:"auto", gap:6, marginBottom:20, paddingBottom:4 }}>
            {PHRASEBOOK.map(p => (
              <Btn key={p.category} onClick={() => setActiveCategory(p.category)} color={activeCategory===p.category?"#dc2626":"#1f1f1f"} style={{ flexShrink:0, border:`1px solid ${activeCategory===p.category?"#ef4444":"#333"}`, fontSize:10 }}>{p.category.toUpperCase()}</Btn>
            ))}
          </div>
          {current?.phrases.map((ph, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", borderBottom:"1px solid #161616" }}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, color:"#ef4444", fontWeight:600, marginBottom:3 }}>"{ph.phrase}"</div>
                <div style={{ fontSize:11, color:"#666", lineHeight:1.5 }}>{ph.use}</div>
              </div>
              <CopyBtn text={ph.phrase} id={`phrase-${i}`} copy={copy} copiedId={copiedId} small />
            </div>
          ))}
        </div>
      )}

      {subTab === "log" && (
        <div>
          <Card style={{ borderColor:"#1a2a1a", marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#4ade80", marginBottom:12, letterSpacing:1 }}>📝 INCIDENT RECORDER</div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>INCIDENT NAME / TYPE</div>
              <Input value={incidentName} onChange={e => setIncidentName(e.target.value)} placeholder="e.g. Fire in ER, MOB, Flooding..." />
            </div>
            <div style={{ marginBottom:10 }}>
              <div style={{ fontSize:10, color:"#666", letterSpacing:1, marginBottom:4 }}>LOG ENTRY</div>
              <Input value={logEntry} onChange={e => setLogEntry(e.target.value)} placeholder="e.g. MAYDAY transmitted on VHF Ch.16..." onKeyDown={e => e.key==="Enter" && addEntry()} />
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <Btn onClick={addEntry} color="#16a34a">+ ADD ENTRY</Btn>
              {log.length > 0 && <Btn onClick={exportLog} color="#1f2937" style={{ border:"1px solid #333" }}>⬇ EXPORT TXT</Btn>}
              {log.length > 0 && <Btn onClick={() => { if(window.confirm("Clear entire log?")) saveLog([]); }} color="#1f0000" style={{ color:"#ef4444", fontSize:10 }}>CLEAR LOG</Btn>}
              <span style={{ fontSize:10, color:"#555" }}>{log.length} entries</span>
            </div>
          </Card>

          {log.length === 0 ? (
            <div style={{ textAlign:"center", color:"#444", fontSize:12, padding:30 }}>No log entries yet. Add your first entry above.</div>
          ) : (
            <div>
              {log.map((entry, i) => (
                <div key={entry.id} style={{ display:"flex", gap:12, padding:"10px 12px", background:"#111", borderRadius:7, marginBottom:6, borderLeft:`3px solid #16a34a` }}>
                  <div style={{ flexShrink:0, textAlign:"right" }}>
                    <div style={{ fontSize:11, fontFamily:"'IBM Plex Mono',monospace", color:"#4ade80", fontWeight:700 }}>{entry.local}</div>
                    <div style={{ fontSize:9, color:"#333" }}>{entry.time.substring(0,10)}</div>
                  </div>
                  <div style={{ flex:1 }}>
                    <TAG color="#d97706" style={{ marginBottom:4 }}>{entry.incident}</TAG>
                    <div style={{ fontSize:12, color:"#e5e5e5", lineHeight:1.5 }}>{entry.text}</div>
                  </div>
                  <button onClick={() => saveLog(log.filter(e => e.id !== entry.id))} style={{ background:"none", border:"none", color:"#333", cursor:"pointer", fontSize:14, flexShrink:0, alignSelf:"center" }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TABS CONFIG
// ─────────────────────────────────────────────
const TABS = [
  { id:"gps",      label:"📍 GPS & Weather",    icon:"📍", subtitle:"Nearest MRCC · Ports · Weather · Piracy" },
  { id:"mrcc",     label:"🗼 MRCC",             icon:"🗼", subtitle:"Maritime Rescue Coordination Centres worldwide" },
  { id:"tmas",     label:"🏥 Medical",          icon:"🏥", subtitle:"TMAS · Survival Time · Medical Triage" },
  { id:"dpa",      label:"🏢 Company",          icon:"🏢", subtitle:"DPA Contacts · Muster List" },
  { id:"itf",      label:"⚓ ITF",              icon:"⚓", subtitle:"Inspector Finder — seafarer rights" },
  { id:"flag",     label:"🏴 Flag State",       icon:"🏴", subtitle:"Flag Contacts · PSC Requirements" },
  { id:"distress", label:"📡 Distress",         icon:"📡", subtitle:"Messages · GMDSS Frequencies" },
  { id:"signals",  label:"🚨 Response",         icon:"🚨", subtitle:"Checklists · Timers · Signal Reference" },
  { id:"phrases",  label:"💬 Phrases & Log",    icon:"💬", subtitle:"Phrasebook · Incident Recorder" },
];

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function EmergencyPage({ portsDb = [] }) {
  const [activeTab, setActiveTab] = useState("gps");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sectionRefs = useRef({});

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const scrollTo = (id) => { sectionRefs.current[id]?.scrollIntoView({ behavior:"smooth", block:"start" }); };

  const renderSection = (id) => {
    const tab = TABS.find(t => t.id === id);
    const content = {
      gps:      <GpsSection portsDb={portsDb} />,
      mrcc:     <MrccSection />,
      tmas:     <TmasSection />,
      dpa:      <DpaSection />,
      itf:      <ItfSection />,
      flag:     <FlagSection />,
      distress: <DistressSection />,
      signals:  <SignalsSection />,
      phrases:  <PhrasebookSection />,
    }[id];
    return (
      <div key={id} ref={el => sectionRefs.current[id] = el} style={{ padding:"28px 20px", borderBottom:"1px solid #1a1a1a", maxWidth:1100, margin:"0 auto" }}>
        <SectionHeader icon={tab.icon} title={tab.label.replace(/^.\s/,"")} subtitle={tab.subtitle} />
        {content}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e5e5e5", fontFamily:"'IBM Plex Mono','Courier New',monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        @keyframes sosPulse { 0%,100%{box-shadow:0 0 18px #dc262680,0 0 4px #dc262640;} 50%{box-shadow:0 0 32px #dc2626cc,0 0 12px #ef444466;} }
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-track{background:#0a0a0a;} ::-webkit-scrollbar-thumb{background:#1f1f1f;border-radius:4px;}
        .em-tab-bar::-webkit-scrollbar{display:none;}
        input:focus,select:focus,textarea:focus{border-color:#dc2626 !important;}
        @media(max-width:767px){.em-desktop{display:none!important;}.em-mobile{display:block!important;}}
        @media(min-width:768px){.em-desktop{display:block!important;}.em-mobile{display:none!important;}.em-tab-bar{display:none!important;}}
      `}</style>

      {/* SOS Banner */}
      <div style={{ background:"linear-gradient(135deg,#1a0000,#2d0000,#1a0000)", borderBottom:"2px solid #dc2626", padding:"14px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12, position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ background:"#dc2626", color:"#fff", border:"2px solid #ef4444", borderRadius:8, padding:"10px 22px", fontFamily:"'IBM Plex Mono',monospace", fontSize:18, fontWeight:700, letterSpacing:4, cursor:"default", userSelect:"none", animation:"sosPulse 1.8s ease-in-out infinite" }}>
            🆘 SOS
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:700, color:"#fff", letterSpacing:2 }}>EMERGENCY REFERENCE</div>
            <div style={{ fontSize:10, color:"#ef4444", marginTop:2, letterSpacing:1 }}>MRCC · TMAS · DPA · ITF · GMDSS · CHECKLISTS · TIMERS · LOG</div>
          </div>
        </div>
        <div style={{ background:"#111", border:"1px solid #333", borderRadius:6, padding:"6px 12px", fontSize:11, color:"#94a3b8", display:"flex", alignItems:"center", gap:6 }}>
          <span>🛰</span><span>VHF Ch.16 — Global Distress Frequency</span>
        </div>
      </div>

      {/* Tab bar — mobile only */}
      <div className="em-tab-bar" style={{ display:"flex", overflowX:"auto", background:"#111", borderBottom:"1px solid #222", scrollbarWidth:"none", padding:"0 4px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flexShrink:0, padding:"10px 13px", fontSize:10, fontWeight: activeTab===t.id?700:400, color: activeTab===t.id?"#ef4444":"#666", borderBottom: activeTab===t.id?"2px solid #ef4444":"2px solid transparent", cursor:"pointer", whiteSpace:"nowrap", background:"none", border:"none", borderBottom: activeTab===t.id?"2px solid #ef4444":"2px solid transparent", fontFamily:"'IBM Plex Mono',monospace", transition:"color 0.2s" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop — all sections */}
      <div className="em-desktop">{TABS.map(t => renderSection(t.id))}</div>

      {/* Mobile — active section only */}
      <div className="em-mobile" style={{ display:"none" }}>{renderSection(activeTab)}</div>
    </div>
  );
}
